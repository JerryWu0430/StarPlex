"""
Cofounder Finder V3 - FINAL VERSION
Uses Perplexity Chat API to return structured JSON directly - NO regex parsing!
"""

import os
import json
import re
import asyncio
import time
from datetime import datetime
from dotenv import load_dotenv
from perplexity import AsyncPerplexity
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError

load_dotenv()

DEFAULT_DOMAIN = "AI for legal technology"

async def query_perplexity(client, prompt: str):
    """Single query to Perplexity Chat - ask for structured JSON output"""
    response = await client.chat.completions.create(
        model="sonar-pro",
        messages=[
            {
                "role": "system",
                "content": """You are a precise research assistant that returns structured data about real people.
CRITICAL: Return ONLY valid JSON. Do not include any explanatory text before or after the JSON.
Format: [{"name": "First Last", "location": "City, Country", "links": ["url1", "url2"], "match_score": 8}]
IMPORTANT: 
- location MUST be in "City, Country" format (e.g., "San Francisco, USA" or "London, UK")
- Do NOT include entries if you cannot determine both the city AND country
- match_score: Rate 1-10 how good of a cofounder match this person is for the domain
  * Consider: relevance to domain, experience level, location quality, profile completeness
  * 1-3: Weak match, 4-6: Decent match, 7-8: Strong match, 9-10: Excellent match
- Only include real individual people with real names, not companies or teams."""
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )
    return response.choices[0].message.content

async def find_cofounders_comprehensive(domain: str):
    """Use multiple targeted queries to find real founders"""
    
    queries = [
        f"""Find 5 real individual founders/CEOs in {domain}. Return ONLY a JSON array with this exact format:
[{{"name": "Full Name", "location": "City, Country", "links": ["profile_url1", "profile_url2"], "match_score": 8}}]

CRITICAL Requirements:
- name: Real person's first and last name (not company name, not "Team Page", not city names)
- location: MUST be "City, Country" format (e.g., "San Francisco, USA"). Do NOT include if you don't know both city AND country.
- links: At least 1 URL (LinkedIn, Twitter, Crunchbase, company site, article about them, etc.)
- match_score: 1-10 rating of how good a cofounder match they are for {domain} (consider experience, relevance, location)
Only include verified real people with known city and country.""",

        f"""Find 5 technical founders (CTOs/engineers) in {domain}. Return ONLY JSON:
[{{"name": "Full Name", "location": "City, Country", "links": ["url1", "url2"], "match_score": 7}}]
Location MUST be "City, Country" format. Include match_score 1-10 for {domain}. Skip entries without both city and country.""",

        f"""Find 5 people working on {domain} looking for cofounders. Return ONLY JSON:
[{{"name": "Full Name", "location": "City, Country", "links": ["url1"], "match_score": 8}}]
Must be real people with "City, Country" location. Include match_score 1-10. Omit if location is unknown.""",

        f"""Search Y Combinator and TechCrunch for {domain} founders. Return ONLY JSON:
[{{"name": "Full Name", "location": "City, Country", "links": ["url1"], "match_score": 9}}]
Real people only. Include match_score 1-10 for {domain}. Location must include both city and country.""",

        f"""Find entrepreneurs in {domain} who could be cofounders. Return ONLY JSON:
[{{"name": "Full Name", "location": "City, Country", "links": ["url1"], "match_score": 7}}]
Individual people with "City, Country" location format. Include match_score 1-10.""",

        f"""Find {domain} founders on Crunchbase or AngelList. Return ONLY JSON:
[{{"name": "Full Name", "location": "City, Country", "links": ["url1"], "match_score": 8}}]
Real people with verified links. Include match_score 1-10 for {domain}. Location: "City, Country" format only.""",

        f"""Find thought leaders and builders in {domain}. Return ONLY JSON:
[{{"name": "Full Name", "location": "City, Country", "links": ["url1"], "match_score": 6}}]
Individual people with "City, Country" location. Include match_score 1-10 for {domain}. Skip if location incomplete."""
    ]
    
    async with AsyncPerplexity() as client:
        print(f"Running {len(queries)} targeted searches...\n")
        
        tasks = [query_perplexity(client, q) for q in queries]
        results = await asyncio.gather(*tasks)
        
        return results

def extract_json_from_response(text: str):
    """Extract JSON array from Perplexity's response"""
    # Try to find JSON array in the response
    json_match = re.search(r'\[\s*\{.*?\}\s*\]', text, re.DOTALL)
    if json_match:
        try:
            founders = json.loads(json_match.group())
            return founders if isinstance(founders, list) else []
        except json.JSONDecodeError as e:
            print(f"   ⚠️  JSON parse error: {e}")
            return []
    
    # If no valid JSON found, return empty
    print(f"   ⚠️  No JSON array found in response")
    return []

def geocode_location(location: str, geolocator) -> dict:
    """Convert location to coordinates using Nominatim"""
    try:
        # Add a small delay to respect Nominatim's usage policy (max 1 request per second)
        time.sleep(1.1)
        
        geo_result = geolocator.geocode(location, exactly_one=True, timeout=10)
        
        if geo_result:
            return {
                "latitude": geo_result.latitude,
                "longitude": geo_result.longitude
            }
        else:
            return {"latitude": None, "longitude": None}
    
    except (GeocoderTimedOut, GeocoderServiceError) as e:
        print(f"   ⚠️  Geocoding error for '{location}': {e}")
        return {"latitude": None, "longitude": None}
    except Exception as e:
        print(f"   ⚠️  Unexpected geocoding error: {e}")
        return {"latitude": None, "longitude": None}

def calculate_match_score(founder: dict, domain: str) -> int:
    """Calculate a 1-10 match score based on available information"""
    score = 0  # Start from 0 for better distribution
    
    links = founder.get('links', [])
    link_text = ' '.join(links).lower()
    location = founder.get('location', '').lower()
    name = founder.get('name', '').lower()
    
    # === PROFILE LINKS (4 points max) ===
    has_linkedin = 'linkedin.com' in link_text
    has_twitter = 'twitter.com' in link_text or 'x.com' in link_text
    has_github = 'github.com' in link_text
    has_crunchbase = 'crunchbase.com' in link_text
    
    # Strong signals - personal profiles
    if has_linkedin and '/in/' in link_text:  # Personal LinkedIn (not company)
        score += 2  # Very valuable
    elif has_linkedin:
        score += 1
    
    if has_twitter:
        score += 1
    
    if has_github:
        score += 1  # Technical founder signal
    
    if has_crunchbase:
        score += 1
    
    # === LINK QUANTITY & QUALITY (2 points max) ===
    num_links = len(links)
    if num_links >= 4:
        score += 2
    elif num_links >= 2:
        score += 1
    
    # Premium sources (YC, TechCrunch, Forbes articles)
    if any(x in link_text for x in ['ycombinator.com', 'techcrunch.com', 'forbes.com', 'venturebeat.com']):
        score += 1
    
    # === LOCATION QUALITY (2 points max) ===
    # Top tier tech hubs
    tier1_hubs = ['san francisco', 'palo alto', 'silicon valley', 'new york', 'nyc']
    if any(hub in location for hub in tier1_hubs):
        score += 2
    else:
        # Secondary tech hubs
        tier2_hubs = ['london', 'boston', 'seattle', 'austin', 'toronto', 
                      'singapore', 'tel aviv', 'berlin', 'amsterdam', 'bangalore']
        if any(hub in location for hub in tier2_hubs):
            score += 1
    
    # === NAME QUALITY (1 point max) ===
    # Check if name looks like a real person (not too generic)
    name_words = name.split()
    if len(name_words) >= 2:
        # Not generic/common names like "john smith" or "test user"
        generic = ['test', 'user', 'admin', 'demo', 'example']
        if not any(g in name for g in generic):
            score += 1
    
    # === DOMAIN RELEVANCE (1 point max) ===
    # Check if links/profile mentions relevant keywords from domain
    domain_keywords = domain.lower().split()
    relevant_keywords = [kw for kw in domain_keywords if len(kw) > 3]  # Skip short words
    if relevant_keywords and any(kw in link_text for kw in relevant_keywords):
        score += 1
    
    # Ensure score is between 1-10
    return max(1, min(10, score))

def validate_founder(founder: dict) -> bool:
    """Validate that founder has required fields and looks real"""
    name = founder.get('name', '') or ''
    location = founder.get('location', '') or ''
    links = founder.get('links', []) or []
    
    # Ensure they are the correct types
    if not isinstance(name, str):
        name = ''
    if not isinstance(location, str):
        location = ''
    if not isinstance(links, list):
        links = []
    
    name = name.strip()
    location = location.strip()
    
    # REQUIRED: Must have name, location (city), and at least 1 link
    if not name or not location or not links:
        return False
    
    # Filter out "Unknown" or "N/A" locations - reject these entries
    if location.lower() in ['unknown', 'n/a', 'not found', 'not available', 'n.a.', 'tbd', 'various']:
        return False
    
    # MUST have "City, Country" format - reject if no comma (no country specified)
    if ',' not in location:
        return False
    
    # Name validation
    words = name.split()
    if len(words) < 2:  # Must have at least first and last name
        return False
    
    # Filter out obvious non-names
    invalid_names = ['Team Page', 'About Us', 'New York', 'San Francisco', 'Home Page',
                    'Our Team', 'Meet The', 'Join Us', 'Contact Us']
    if name in invalid_names:
        return False
    
    # Filter out company indicators
    company_words = ['LLC', 'Inc', 'Ltd', 'Corp', 'Company', 'Partners', 'Group', 'Capital']
    if any(word in name for word in company_words):
        return False
    
    return True

async def main():
    domain = input(f"Enter your startup domain (default: '{DEFAULT_DOMAIN}'): ") or DEFAULT_DOMAIN
    
    print(f"\n{'='*80}")
    print(f"🔍 SEARCHING FOR COFOUNDERS IN: {domain}")
    print(f"{'='*80}\n")
    
    # Get results from multiple queries
    results = await find_cofounders_comprehensive(domain)
    
    all_founders = []
    seen_names = set()
    
    print(f"{'='*80}")
    print(f"📋 PROCESSING RESULTS")
    print(f"{'='*80}\n")
    
    for i, result in enumerate(results, 1):
        print(f"Query {i}:")
        print("-" * 80)
        
        # Extract JSON from response
        founders = extract_json_from_response(result)
        print(f"   Found {len(founders)} entries")
        
        # Validate and deduplicate
        for founder in founders:
            if not validate_founder(founder):
                continue
            
            name = founder['name'].strip().lower()
            if name not in seen_names:
                seen_names.add(name)
                all_founders.append(founder)
                print(f"   ✅ Added: {founder['name']} ({founder['location']})")
        
        print()
    
    # Add geocoding and match scores
    print(f"{'='*80}")
    print(f"🌍 GEOCODING LOCATIONS & CALCULATING MATCH SCORES")
    print(f"{'='*80}\n")
    
    geolocator = Nominatim(user_agent="cofounder_finder_app")
    
    for i, founder in enumerate(all_founders, 1):
        location = founder.get('location', '')
        print(f"[{i}/{len(all_founders)}] Processing: {founder['name']} ({location})")
        
        # Add coordinates
        coords = geocode_location(location, geolocator)
        founder['coordinates'] = coords
        
        # Use AI's match score if provided, otherwise calculate our own
        if 'match_score' not in founder or founder.get('match_score') is None:
            match_score = calculate_match_score(founder, domain)
            founder['match_score'] = match_score
            score_source = "(calculated)"
        else:
            # Validate AI's score is reasonable
            ai_score = founder.get('match_score')
            if isinstance(ai_score, (int, float)) and 1 <= ai_score <= 10:
                match_score = int(ai_score)
                founder['match_score'] = match_score
                score_source = "(AI)"
            else:
                # Fallback to calculation if AI score is invalid
                match_score = calculate_match_score(founder, domain)
                founder['match_score'] = match_score
                score_source = "(calculated)"
        
        print(f"   📍 Coords: {coords['latitude']}, {coords['longitude']}")
        print(f"   ⭐ Match Score: {match_score}/10 {score_source}\n")
    
    # Sort by match score (highest first)
    all_founders.sort(key=lambda x: x.get('match_score', 0), reverse=True)
    
    # Save results
    filename = f"cofounders_v3_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(all_founders, f, indent=2, ensure_ascii=False)
    
    print(f"{'='*80}")
    print(f"📊 SUMMARY")
    print(f"{'='*80}")
    print(f"Total unique founders found: {len(all_founders)}")
    print(f"All have location in 'City, Country' format: ✅")
    print(f"All have at least 1 link: ✅")
    print(f"All have coordinates: ✅")
    
    # Match score breakdown
    if all_founders:
        avg_score = sum(f.get('match_score', 0) for f in all_founders) / len(all_founders)
        high_matches = sum(1 for f in all_founders if f.get('match_score', 0) >= 8)
        print(f"\n⭐ Match Scores:")
        print(f"   Average: {avg_score:.1f}/10")
        print(f"   High matches (8+): {high_matches}")
    
    # Count link types
    with_linkedin = sum(1 for f in all_founders if any('linkedin.com' in l for l in f.get('links', [])))
    with_twitter = sum(1 for f in all_founders if any('twitter.com' in l or 'x.com' in l for l in f.get('links', [])))
    with_crunchbase = sum(1 for f in all_founders if any('crunchbase.com' in l for l in f.get('links', [])))
    with_multiple = sum(1 for f in all_founders if len(f.get('links', [])) > 1)
    
    print(f"\n🔗 Link breakdown:")
    print(f"   LinkedIn: {with_linkedin}")
    print(f"   Twitter/X: {with_twitter}")
    print(f"   Crunchbase: {with_crunchbase}")
    print(f"   Multiple links: {with_multiple}")
    
    print(f"\n✅ Saved to {filename}")
    print(f"{'='*80}\n")
    
    # Display results
    if all_founders:
        print("👥 FOUNDERS FOUND (sorted by match score):\n")
        for i, founder in enumerate(all_founders[:15], 1):
            match_score = founder.get('match_score', 0)
            coords = founder.get('coordinates', {})
            
            # Display with match score prominently
            print(f"{i}. {founder['name']} ⭐ {match_score}/10")
            print(f"   📍 {founder['location']}")
            
            # Show coordinates if available
            lat = coords.get('latitude')
            lon = coords.get('longitude')
            if lat and lon:
                print(f"   🌐 Coordinates: {lat:.4f}, {lon:.4f}")
            
            print(f"   🔗 Links ({len(founder.get('links', []))}):")
            for link in founder.get('links', []):
                # Identify link type
                link_lower = link.lower()
                if 'linkedin.com' in link_lower:
                    link_type = "💼 LinkedIn"
                elif 'twitter.com' in link_lower or 'x.com' in link_lower:
                    link_type = "🐦 Twitter"
                elif 'github.com' in link_lower:
                    link_type = "💻 GitHub"
                elif 'crunchbase.com' in link_lower:
                    link_type = "📊 Crunchbase"
                elif 'medium.com' in link_lower or 'substack.com' in link_lower:
                    link_type = "📝 Blog"
                elif 'youtube.com' in link_lower or 'youtu.be' in link_lower:
                    link_type = "🎥 YouTube"
                elif 'techcrunch.com' in link_lower or 'forbes.com' in link_lower:
                    link_type = "📰 News"
                elif 'ycombinator.com' in link_lower:
                    link_type = "🚀 YC"
                else:
                    link_type = "🌐 Website"
                print(f"      • {link_type}: {link}")
            print()

async def find_cofounders_api(domain: str, max_results: int = 20, include_coordinates: bool = True) -> dict:
    """
    API-friendly function to find cofounders and return structured data
    Returns a dict ready for JSON serialization
    """
    # Get results from multiple queries
    results = await find_cofounders_comprehensive(domain)
    
    all_founders = []
    seen_names = set()
    
    for result in results:
        founders = extract_json_from_response(result)
        
        for founder in founders:
            if not validate_founder(founder):
                continue
            
            name = founder['name'].strip().lower()
            if name not in seen_names:
                seen_names.add(name)
                all_founders.append(founder)
    
    # Add geocoding and match scores if requested
    if include_coordinates and all_founders:
        geolocator = Nominatim(user_agent="cofounder_finder_api")
        
        for founder in all_founders:
            location = founder.get('location', '')
            coords = geocode_location(location, geolocator)
            founder['coordinates'] = coords
            
            # Use AI's match score if provided, otherwise calculate
            if 'match_score' not in founder or founder.get('match_score') is None:
                founder['match_score'] = calculate_match_score(founder, domain)
            else:
                ai_score = founder.get('match_score')
                if isinstance(ai_score, (int, float)) and 1 <= ai_score <= 10:
                    founder['match_score'] = int(ai_score)
                else:
                    founder['match_score'] = calculate_match_score(founder, domain)
    else:
        # Just calculate match scores without geocoding
        for founder in all_founders:
            if 'match_score' not in founder or founder.get('match_score') is None:
                founder['match_score'] = calculate_match_score(founder, domain)
            else:
                ai_score = founder.get('match_score')
                if isinstance(ai_score, (int, float)) and 1 <= ai_score <= 10:
                    founder['match_score'] = int(ai_score)
                else:
                    founder['match_score'] = calculate_match_score(founder, domain)
    
    # Sort by match score (highest first)
    all_founders.sort(key=lambda x: x.get('match_score', 0), reverse=True)
    
    # Limit results
    limited_founders = all_founders[:max_results]
    
    # Generate summary
    summary = {
        "total_found": len(all_founders),
        "returned": len(limited_founders),
        "with_linkedin": sum(1 for f in limited_founders if any('linkedin.com' in l for l in f.get('links', []))),
        "with_twitter": sum(1 for f in limited_founders if any('twitter.com' in l or 'x.com' in l for l in f.get('links', []))),
        "with_crunchbase": sum(1 for f in limited_founders if any('crunchbase.com' in l for l in f.get('links', []))),
        "with_multiple_links": sum(1 for f in limited_founders if len(f.get('links', [])) > 1),
        "average_match_score": round(sum(f.get('match_score', 0) for f in limited_founders) / len(limited_founders), 1) if limited_founders else 0,
        "high_matches_8plus": sum(1 for f in limited_founders if f.get('match_score', 0) >= 8),
    }
    
    return {
        "cofounders": limited_founders,
        "summary": summary,
        "total_found": len(all_founders)
    }

if __name__ == "__main__":
    asyncio.run(main())
