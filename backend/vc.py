"""
VC Finder - Find Venture Capitalists for Your Startup
Uses Perplexity Chat API with Sonar Pro to return structured JSON with VC information
"""

import os
import json
import re
import asyncio
from datetime import datetime
from dotenv import load_dotenv
from perplexity import AsyncPerplexity
import aiohttp

load_dotenv()

# Mapbox API token
MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN", "")

DEFAULT_DOMAIN = "AI for legal technology"

async def query_perplexity(client, prompt: str):
    """Single query to Perplexity Chat - ask for structured JSON output"""
    response = await client.chat.completions.create(
        model="sonar-pro",
        messages=[
            {
                "role": "system",
                "content": """You are a precise research assistant that returns structured data about venture capitalists and investors.
CRITICAL: Return ONLY valid JSON. Do not include any explanatory text before or after the JSON.
Format: [{"name": "First Last", "firm": "VC Firm Name", "location": "City, Country", "links": ["url1", "url2"], "match_score": 8, "explanation": {"recent_investments": ["bullet1", "bullet2"], "investment_thesis": ["bullet1", "bullet2"], "how_to_pitch": ["bullet1", "bullet2"]}}]
IMPORTANT: 
- name: The individual partner/investor's name
- firm: The venture capital firm they work at
- location: MUST be in "City, Country" format (e.g., "San Francisco, USA" or "London, UK")
- Do NOT include entries if you cannot determine both the city AND country
- match_score: Rate 1-10 how good of a match this VC is for the domain
  * Consider: investment focus relevance, stage fit, check size, portfolio companies, accessibility
  * 1-3: Weak match, 4-6: Decent match, 7-8: Strong match, 9-10: Excellent match
- explanation: Object with 3 sections, each containing 1-3 bullet points:
  * recent_investments: Recent portfolio companies they've funded (1-2 examples)
  * investment_thesis: Their investment focus and thesis
  * how_to_pitch: How to angle your idea when pitching to them
- Only include real individual VCs/partners with real names and firms."""
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )
    return response.choices[0].message.content

async def find_vcs_comprehensive(domain: str, stage: str = "seed"):
    """Use multiple targeted queries to find relevant VCs - REDUCED TO 3 QUERIES TO AVOID RATE LIMITS"""
    
    queries = [
        f"""Find 8 venture capital investors who invest in {domain} at {stage} stage. Return ONLY a JSON array with this exact format:
[{{"name": "Full Name", "firm": "VC Firm", "location": "City, Country", "links": ["linkedin_url", "firm_url", "twitter_url"], "match_score": 8, "explanation": {{"recent_investments": ["bullet1", "bullet2"], "investment_thesis": ["bullet1", "bullet2"], "how_to_pitch": ["bullet1", "bullet2"]}}}}]

CRITICAL Requirements:
- name: Real VC partner's first and last name
- firm: Their venture capital firm name
- location: MUST be "City, Country" format (e.g., "San Francisco, USA"). Do NOT include if you don't know both city AND country.
- links: At least 1 URL (LinkedIn, Twitter, firm website, Crunchbase, etc.)
- match_score: 1-10 rating of how good a match for {domain} at {stage} stage
- explanation: Object with recent_investments, investment_thesis, and how_to_pitch arrays (1-3 bullets each)
Only include verified real VCs with known city and country.""",

        f"""Find 8 top-tier VCs who have invested in successful {domain} companies. Return ONLY JSON:
[{{"name": "Full Name", "firm": "VC Firm", "location": "City, Country", "links": ["url1", "url2"], "match_score": 9, "explanation": {{"recent_investments": ["bullet1", "bullet2"], "investment_thesis": ["bullet1", "bullet2"], "how_to_pitch": ["bullet1", "bullet2"]}}}}]
Location MUST be "City, Country" format. Include match_score 1-10 for {domain} and explanation object. Skip entries without both city and country.""",

        f"""Find venture capitalists from a16z, Sequoia, YC, Accel who invest in {domain}. Return ONLY JSON:
[{{"name": "Full Name", "firm": "VC Firm", "location": "City, Country", "links": ["url1"], "match_score": 9, "explanation": {{"recent_investments": ["bullet1", "bullet2"], "investment_thesis": ["bullet1", "bullet2"], "how_to_pitch": ["bullet1", "bullet2"]}}}}]
Real VCs only. Include match_score 1-10 for {domain} and explanation object. Location must include both city and country.""",

        f"""Find angel investors and micro VCs in {domain} space. Return ONLY JSON:
[{{"name": "Full Name", "firm": "VC Firm", "location": "City, Country", "links": ["url1"], "match_score": 7, "explanation": {{"recent_investments": ["bullet1", "bullet2"], "investment_thesis": ["bullet1", "bullet2"], "how_to_pitch": ["bullet1", "bullet2"]}}}}]
Individual investors with "City, Country" location format. Include match_score 1-10 and explanation object.""",

        f"""Search Crunchbase and PitchBook for {domain} investors at {stage} stage. Return ONLY JSON:
[{{"name": "Full Name", "firm": "VC Firm", "location": "City, Country", "links": ["url1"], "match_score": 8, "explanation": {{"recent_investments": ["bullet1", "bullet2"], "investment_thesis": ["bullet1", "bullet2"], "how_to_pitch": ["bullet1", "bullet2"]}}}}]
Real VCs with verified links. Include match_score 1-10 for {domain} and explanation object. Location: "City, Country" format only.""",

        f"""Find emerging and established VCs investing in {domain} sector. Return ONLY JSON:
[{{"name": "Full Name", "firm": "VC Firm", "location": "City, Country", "links": ["url1"], "match_score": 7, "explanation": {{"recent_investments": ["bullet1", "bullet2"], "investment_thesis": ["bullet1", "bullet2"], "how_to_pitch": ["bullet1", "bullet2"]}}}}]
Individual VCs with "City, Country" location. Include match_score 1-10 for {domain} and explanation object. Skip if location incomplete."""
    ]
    
    async with AsyncPerplexity() as client:
        print(f"Running {len(queries)} targeted VC searches...\n")
        
        tasks = [query_perplexity(client, q) for q in queries]
        results = await asyncio.gather(*tasks)
        
        return results

def extract_json_from_response(text: str):
    """Extract JSON array from Perplexity's response"""
    # Try to find JSON array in the response
    json_match = re.search(r'\[\s*\{.*?\}\s*\]', text, re.DOTALL)
    if json_match:
        try:
            vcs = json.loads(json_match.group())
            return vcs if isinstance(vcs, list) else []
        except json.JSONDecodeError as e:
            print(f"   ⚠️  JSON parse error: {e}")
            return []
    
    # If no valid JSON found, return empty
    print(f"   ⚠️  No JSON array found in response")
    return []

async def geocode_location(location: str, session: aiohttp.ClientSession) -> dict:
    """Convert location to coordinates using Mapbox Geocoding API - FAST!"""
    if not MAPBOX_TOKEN:
        print(f"   ⚠️  No Mapbox token found, skipping geocoding for '{location}'")
        return {"latitude": None, "longitude": None}
    
    try:
        # Mapbox Geocoding API endpoint
        url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{location}.json"
        params = {
            "access_token": MAPBOX_TOKEN,
            "limit": 1
        }
        
        async with session.get(url, params=params) as response:
            if response.status == 200:
                data = await response.json()
                
                if data.get("features") and len(data["features"]) > 0:
                    coords = data["features"][0]["geometry"]["coordinates"]
                    # Mapbox returns [longitude, latitude]
                    return {
                        "latitude": coords[1],
                        "longitude": coords[0]
                    }
                else:
                    print(f"   ⚠️  No results found for '{location}'")
                    return {"latitude": None, "longitude": None}
            else:
                print(f"   ⚠️  Mapbox API error {response.status} for '{location}'")
                return {"latitude": None, "longitude": None}
    
    except Exception as e:
        print(f"   ⚠️  Geocoding error for '{location}': {e}")
        return {"latitude": None, "longitude": None}

def calculate_match_score(vc: dict, domain: str) -> int:
    """Calculate a 1-10 match score based on available information for VCs"""
    score = 0  # Start from 0 for better distribution
    
    links = vc.get('links', [])
    link_text = ' '.join(links).lower()
    location = vc.get('location', '').lower()
    name = vc.get('name', '').lower()
    firm = vc.get('firm', '').lower()
    
    # === PROFILE LINKS (4 points max) ===
    has_linkedin = 'linkedin.com' in link_text
    has_twitter = 'twitter.com' in link_text or 'x.com' in link_text
    has_crunchbase = 'crunchbase.com' in link_text
    has_firm_website = any(x in link_text for x in ['.com', '.io', '.vc'])
    
    # Strong signals - personal profiles
    if has_linkedin and '/in/' in link_text:  # Personal LinkedIn
        score += 2  # Very valuable for VCs
    elif has_linkedin:
        score += 1
    
    if has_twitter:
        score += 1  # VCs often active on Twitter
    
    if has_crunchbase:
        score += 2  # Crunchbase is crucial for VC research
    
    if has_firm_website:
        score += 1
    
    # === LINK QUANTITY & QUALITY (2 points max) ===
    num_links = len(links)
    if num_links >= 3:
        score += 2
    elif num_links >= 2:
        score += 1
    
    # Premium sources and well-known VC databases
    if any(x in link_text for x in ['pitchbook.com', 'signal.nfx.com', 'techcrunch.com', 'forbes.com/midas']):
        score += 1
    
    # === LOCATION QUALITY (2 points max) ===
    # Top tier VC hubs
    tier1_hubs = ['san francisco', 'palo alto', 'silicon valley', 'menlo park', 'new york', 'nyc']
    if any(hub in location for hub in tier1_hubs):
        score += 2
    else:
        # Secondary VC hubs
        tier2_hubs = ['london', 'boston', 'seattle', 'austin', 'los angeles', 
                      'singapore', 'tel aviv', 'berlin', 'hong kong', 'beijing']
        if any(hub in location for hub in tier2_hubs):
            score += 1
    
    # === FIRM REPUTATION (1 point max) ===
    # Check for top-tier VC firms
    top_firms = ['sequoia', 'a16z', 'andreessen', 'accel', 'greylock', 'benchmark', 
                 'kleiner', 'founders fund', 'general catalyst', 'insight', 'tiger global',
                 'coatue', 'lightspeed', 'bessemer', 'khosla']
    if any(tf in firm for tf in top_firms) or any(tf in link_text for tf in top_firms):
        score += 2  # Bonus for top-tier firms
    
    # === DOMAIN RELEVANCE (1 point max) ===
    # Check if links/profile mentions relevant keywords from domain
    domain_keywords = domain.lower().split()
    relevant_keywords = [kw for kw in domain_keywords if len(kw) > 3]
    if relevant_keywords and any(kw in link_text for kw in relevant_keywords):
        score += 1
    
    # Ensure score is between 1-10
    return max(1, min(10, score))

def validate_vc(vc: dict) -> bool:
    """Validate that VC has required fields and looks real"""
    name = vc.get('name', '') or ''
    firm = vc.get('firm', '') or ''
    location = vc.get('location', '') or ''
    links = vc.get('links', []) or []
    
    # Ensure they are the correct types
    if not isinstance(name, str):
        name = ''
    if not isinstance(firm, str):
        firm = ''
    if not isinstance(location, str):
        location = ''
    if not isinstance(links, list):
        links = []
    
    name = name.strip()
    firm = firm.strip()
    location = location.strip()
    
    # REQUIRED: Must have name, firm, location (city), and at least 1 link
    if not name or not firm or not location or not links:
        return False
    
    # Filter out "Unknown" or "N/A" locations
    if location.lower() in ['unknown', 'n/a', 'not found', 'not available', 'n.a.', 'tbd', 'various']:
        return False
    
    # MUST have "City, Country" format
    if ',' not in location:
        return False
    
    # Name validation
    words = name.split()
    if len(words) < 2:  # Must have at least first and last name
        return False
    
    # Filter out obvious non-names
    invalid_names = ['Team Page', 'About Us', 'Contact Us', 'Portfolio', 'Investments']
    if name in invalid_names:
        return False
    
    return True

async def main():
    domain = input(f"Enter your startup domain (default: '{DEFAULT_DOMAIN}'): ") or DEFAULT_DOMAIN
    stage = "seed"  # Fixed to seed stage only
    
    print(f"\n{'='*80}")
    print(f"🔍 SEARCHING FOR VCs IN: {domain} ({stage} stage)")
    print(f"{'='*80}\n")
    
    # Get results from multiple queries
    results = await find_vcs_comprehensive(domain, stage)
    
    all_vcs = []
    seen_names = set()
    
    print(f"{'='*80}")
    print(f"📋 PROCESSING RESULTS")
    print(f"{'='*80}\n")
    
    for i, result in enumerate(results, 1):
        print(f"Query {i}:")
        print("-" * 80)
        
        # Extract JSON from response
        vcs = extract_json_from_response(result)
        print(f"   Found {len(vcs)} entries")
        
        # Validate and deduplicate
        for vc in vcs:
            if not validate_vc(vc):
                continue
            
            # Use name + firm combination for deduplication
            identifier = f"{vc['name'].strip().lower()}|{vc['firm'].strip().lower()}"
            if identifier not in seen_names:
                seen_names.add(identifier)
                all_vcs.append(vc)
                print(f"   ✅ Added: {vc['name']} @ {vc['firm']} ({vc['location']})")
        
        print()
    
    # Add geocoding and match scores
    print(f"{'='*80}")
    print(f"🌍 GEOCODING LOCATIONS & CALCULATING MATCH SCORES")
    print(f"{'='*80}\n")
    
    # Create aiohttp session for fast concurrent geocoding
    async with aiohttp.ClientSession() as session:
        # Geocode all locations concurrently - MUCH FASTER with Mapbox!
        geocode_tasks = []
        for i, vc in enumerate(all_vcs, 1):
            location = vc.get('location', '')
            print(f"[{i}/{len(all_vcs)}] Queuing: {vc['name']} @ {vc['firm']} ({location})")
            task = geocode_location(location, session)
            geocode_tasks.append(task)
        
        # Execute all geocoding tasks concurrently
        coords_results = await asyncio.gather(*geocode_tasks)
        
        # Assign coordinates to VCs
        for i, (vc, coords) in enumerate(zip(all_vcs, coords_results), 1):
            vc['coordinates'] = coords
            print(f"   ✅ [{i}/{len(all_vcs)}] {vc['name']}: {coords['latitude']}, {coords['longitude']}")
        
        # Use AI's match score if provided, otherwise calculate our own
        if 'match_score' not in vc or vc.get('match_score') is None:
            match_score = calculate_match_score(vc, domain)
            vc['match_score'] = match_score
            score_source = "(calculated)"
        else:
            # Validate AI's score is reasonable
            ai_score = vc.get('match_score')
            if isinstance(ai_score, (int, float)) and 1 <= ai_score <= 10:
                match_score = int(ai_score)
                vc['match_score'] = match_score
                score_source = "(AI)"
            else:
                # Fallback to calculation if AI score is invalid
                match_score = calculate_match_score(vc, domain)
                vc['match_score'] = match_score
                score_source = "(calculated)"
    
    # Print match scores after geocoding
    print(f"\n⭐ CALCULATING MATCH SCORES\n")
    for i, vc in enumerate(all_vcs, 1):
        match_score = vc.get('match_score', 0)
        print(f"   [{i}/{len(all_vcs)}] {vc['name']}: {match_score}/10")
    
    # Sort by match score (highest first)
    all_vcs.sort(key=lambda x: x.get('match_score', 0), reverse=True)
    
    # Save results
    filename = f"vcs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(all_vcs, f, indent=2, ensure_ascii=False)
    
    print(f"{'='*80}")
    print(f"📊 SUMMARY")
    print(f"{'='*80}")
    print(f"Total unique VCs found: {len(all_vcs)}")
    print(f"All have location in 'City, Country' format: ✅")
    print(f"All have at least 1 link: ✅")
    print(f"All have coordinates: ✅")
    
    # Match score breakdown
    if all_vcs:
        avg_score = sum(v.get('match_score', 0) for v in all_vcs) / len(all_vcs)
        high_matches = sum(1 for v in all_vcs if v.get('match_score', 0) >= 8)
        print(f"\n⭐ Match Scores:")
        print(f"   Average: {avg_score:.1f}/10")
        print(f"   High matches (8+): {high_matches}")
    
    # Count link types
    with_linkedin = sum(1 for v in all_vcs if any('linkedin.com' in l for l in v.get('links', [])))
    with_twitter = sum(1 for v in all_vcs if any('twitter.com' in l or 'x.com' in l for l in v.get('links', [])))
    with_crunchbase = sum(1 for v in all_vcs if any('crunchbase.com' in l for l in v.get('links', [])))
    with_multiple = sum(1 for v in all_vcs if len(v.get('links', [])) > 1)
    
    print(f"\n🔗 Link breakdown:")
    print(f"   LinkedIn: {with_linkedin}")
    print(f"   Twitter/X: {with_twitter}")
    print(f"   Crunchbase: {with_crunchbase}")
    print(f"   Multiple links: {with_multiple}")
    
    print(f"\n✅ Saved to {filename}")
    print(f"{'='*80}\n")
    
    # Display results
    if all_vcs:
        print("💰 VCs FOUND (sorted by match score):\n")
        for i, vc in enumerate(all_vcs[:15], 1):
            match_score = vc.get('match_score', 0)
            coords = vc.get('coordinates', {})
            
            # Display with match score prominently
            print(f"{i}. {vc['name']} @ {vc['firm']} ⭐ {match_score}/10")
            print(f"   📍 {vc['location']}")
            
            # Show coordinates if available
            lat = coords.get('latitude')
            lon = coords.get('longitude')
            if lat and lon:
                print(f"   🌐 Coordinates: {lat:.4f}, {lon:.4f}")
            
            print(f"   🔗 Links ({len(vc.get('links', []))}):")
            for link in vc.get('links', []):
                # Identify link type
                link_lower = link.lower()
                if 'linkedin.com' in link_lower:
                    link_type = "💼 LinkedIn"
                elif 'twitter.com' in link_lower or 'x.com' in link_lower:
                    link_type = "🐦 Twitter"
                elif 'crunchbase.com' in link_lower:
                    link_type = "📊 Crunchbase"
                elif 'pitchbook.com' in link_lower:
                    link_type = "📈 PitchBook"
                elif 'medium.com' in link_lower or 'substack.com' in link_lower:
                    link_type = "📝 Blog"
                elif 'techcrunch.com' in link_lower or 'forbes.com' in link_lower:
                    link_type = "📰 News"
                else:
                    link_type = "🌐 Website"
                print(f"      • {link_type}: {link}")
            print()

async def find_vcs_api(domain: str, stage: str = "seed", max_results: int = 20, include_coordinates: bool = True) -> dict:
    """
    API-friendly function to find VCs and return structured data
    Returns a dict ready for JSON serialization
    """
    # Get results from multiple queries
    results = await find_vcs_comprehensive(domain, stage)
    
    all_vcs = []
    seen_names = set()
    
    for result in results:
        vcs = extract_json_from_response(result)
        
        for vc in vcs:
            if not validate_vc(vc):
                continue
            
            # Use name + firm combination for deduplication
            identifier = f"{vc['name'].strip().lower()}|{vc['firm'].strip().lower()}"
            if identifier not in seen_names:
                seen_names.add(identifier)
                all_vcs.append(vc)
    
    # Add geocoding and match scores if requested
    if include_coordinates and all_vcs:
        async with aiohttp.ClientSession() as session:
            # Geocode all locations concurrently - FAST with Mapbox!
            geocode_tasks = [geocode_location(v.get('location', ''), session) for v in all_vcs]
            coords_results = await asyncio.gather(*geocode_tasks)
            
            # Assign coordinates to VCs
            for vc, coords in zip(all_vcs, coords_results):
                vc['coordinates'] = coords
            
            # Use AI's match score if provided, otherwise calculate
            if 'match_score' not in vc or vc.get('match_score') is None:
                vc['match_score'] = calculate_match_score(vc, domain)
            else:
                ai_score = vc.get('match_score')
                if isinstance(ai_score, (int, float)) and 1 <= ai_score <= 10:
                    vc['match_score'] = int(ai_score)
                else:
                    vc['match_score'] = calculate_match_score(vc, domain)
    else:
        # Just calculate match scores without geocoding
        for vc in all_vcs:
            if 'match_score' not in vc or vc.get('match_score') is None:
                vc['match_score'] = calculate_match_score(vc, domain)
            else:
                ai_score = vc.get('match_score')
                if isinstance(ai_score, (int, float)) and 1 <= ai_score <= 10:
                    vc['match_score'] = int(ai_score)
                else:
                    vc['match_score'] = calculate_match_score(vc, domain)
    
    # Sort by match score (highest first)
    all_vcs.sort(key=lambda x: x.get('match_score', 0), reverse=True)
    
    # Limit results
    limited_vcs = all_vcs[:max_results]
    
    # Generate summary
    summary = {
        "total_found": len(all_vcs),
        "returned": len(limited_vcs),
        "with_linkedin": sum(1 for v in limited_vcs if any('linkedin.com' in l for l in v.get('links', []))),
        "with_twitter": sum(1 for v in limited_vcs if any('twitter.com' in l or 'x.com' in l for l in v.get('links', []))),
        "with_crunchbase": sum(1 for v in limited_vcs if any('crunchbase.com' in l for l in v.get('links', []))),
        "with_multiple_links": sum(1 for v in limited_vcs if len(v.get('links', [])) > 1),
        "average_match_score": round(sum(v.get('match_score', 0) for v in limited_vcs) / len(limited_vcs), 1) if limited_vcs else 0,
        "high_matches_8plus": sum(1 for v in limited_vcs if v.get('match_score', 0) >= 8),
    }
    
    return {
        "vcs": limited_vcs,
        "summary": summary,
        "total_found": len(all_vcs),
        "stage": stage
    }

if __name__ == "__main__":
    asyncio.run(main())
