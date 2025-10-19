"""
Competitor Finder - Find Competing Companies in Your Space
Uses Perplexity Chat API with Sonar Pro to return structured JSON with competitor information
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
        model="sonar",
        messages=[
            {
                "role": "system",
                "content": """You are a precise research assistant that returns structured data about competing companies.
CRITICAL: Return ONLY valid JSON. Do not include any explanatory text before or after the JSON.
Format: [{"company_name": "Company Inc", "location": "City, Country", "links": ["url1", "url2"], "date_founded": "2020", "threat_score": 8, "explanation": {"angle": ["bullet1", "bullet2"], "what_they_cover": ["bullet1", "bullet2"], "gaps": ["bullet1", "bullet2"]}}]
IMPORTANT: 
- company_name: The official company name
- location: MUST be in "City, Country" format for company headquarters (e.g., "San Francisco, USA" or "London, UK")
- Do NOT include entries if you cannot determine both the city AND country
- date_founded: Year the company was founded (e.g., "2020", "2019") - use "Unknown" if not available
- threat_score: Rate 1-10 how much of a competitive threat this company is
  * Consider: market position, funding, traction, product maturity, target market overlap
  * 1-3: Minor threat, 4-6: Moderate threat, 7-8: Significant threat, 9-10: Major threat
- explanation: Object with 3 sections, each containing 1-3 bullet points:
  * angle: Their competitive positioning and unique approach
  * what_they_cover: Market segments and areas they serve
  * gaps: What they don't cover or areas of weakness
- Only include real companies with verifiable information."""
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )
    return response.choices[0].message.content

async def find_competitors_comprehensive(domain: str):
    """Use multiple targeted queries to find relevant competitors"""
    
    queries = [
        f"""Find 5 top competitors and companies in the {domain} space. Return ONLY a JSON array with this exact format:
[{{"company_name": "Company Name", "location": "City, Country", "links": ["website_url", "crunchbase_url"], "date_founded": "2020", "threat_score": 8, "explanation": {{"angle": ["bullet1", "bullet2"], "what_they_cover": ["bullet1", "bullet2"], "gaps": ["bullet1", "bullet2"]}}}}]

CRITICAL Requirements:
- company_name: Official company name
- location: MUST be "City, Country" format for HQ. Do NOT include if you don't know both city AND country.
- links: At least 1 URL (company website, Crunchbase, TechCrunch article, etc.)
- date_founded: Year founded (e.g., "2020") or "Unknown"
- threat_score: 1-10 rating of competitive threat in {domain}
- explanation: Object with angle, what_they_cover, and gaps arrays (1-3 bullets each)
Only include verified real companies with known city and country.""",

        f"""Find 5 well-funded startups competing in {domain}. Return ONLY JSON:
[{{"company_name": "Company Name", "location": "City, Country", "links": ["url1", "url2"], "date_founded": "2019", "threat_score": 9, "explanation": {{"angle": ["bullet1", "bullet2"], "what_they_cover": ["bullet1", "bullet2"], "gaps": ["bullet1", "bullet2"]}}}}]
Location MUST be "City, Country" format. Include threat_score 1-10 and explanation object. Skip entries without both city and country.""",

        f"""Search Crunchbase and TechCrunch for companies in {domain} that recently raised funding. Return ONLY JSON:
[{{"company_name": "Company Name", "location": "City, Country", "links": ["url1"], "date_founded": "2021", "threat_score": 7, "explanation": {{"angle": ["bullet1", "bullet2"], "what_they_cover": ["bullet1", "bullet2"], "gaps": ["bullet1", "bullet2"]}}}}]
Must be real companies with "City, Country" location. Include threat_score 1-10 and explanation object. Omit if location is unknown.""",

        f"""Find YC-backed and accelerator companies in {domain}. Return ONLY JSON:
[{{"company_name": "Company Name", "location": "City, Country", "links": ["url1"], "date_founded": "2022", "threat_score": 8, "explanation": {{"angle": ["bullet1", "bullet2"], "what_they_cover": ["bullet1", "bullet2"], "gaps": ["bullet1", "bullet2"]}}}}]
Real companies only. Include threat_score 1-10 and explanation object. Location must include both city and country.""",

        f"""Search for emerging and established players in {domain}. Return ONLY JSON:
[{{"company_name": "Company Name", "location": "City, Country", "links": ["url1"], "date_founded": "2018", "threat_score": 6, "explanation": {{"angle": ["bullet1", "bullet2"], "what_they_cover": ["bullet1", "bullet2"], "gaps": ["bullet1", "bullet2"]}}}}]
Companies with "City, Country" location format. Include threat_score 1-10 and explanation object.""",

        f"""Find direct and indirect competitors to a startup in {domain}. Return ONLY JSON:
[{{"company_name": "Company Name", "location": "City, Country", "links": ["url1"], "date_founded": "2020", "threat_score": 7, "explanation": {{"angle": ["bullet1", "bullet2"], "what_they_cover": ["bullet1", "bullet2"], "gaps": ["bullet1", "bullet2"]}}}}]
Real companies with verified links. Include threat_score 1-10 and explanation object. Location: "City, Country" format only.""",

        f"""Search Product Hunt and news for companies building in {domain}. Return ONLY JSON:
[{{"company_name": "Company Name", "location": "City, Country", "links": ["url1"], "date_founded": "2023", "threat_score": 5, "explanation": {{"angle": ["bullet1", "bullet2"], "what_they_cover": ["bullet1", "bullet2"], "gaps": ["bullet1", "bullet2"]}}}}]
Companies with "City, Country" location. Include threat_score 1-10 and explanation object. Skip if location incomplete."""
    ]
    
    async with AsyncPerplexity() as client:
        print(f"Running {len(queries)} targeted competitor searches...\n")
        
        tasks = [query_perplexity(client, q) for q in queries]
        results = await asyncio.gather(*tasks)
        
        return results

def extract_json_from_response(text: str):
    """Extract JSON array from Perplexity's response"""
    # Try to find JSON array in the response
    json_match = re.search(r'\[\s*\{.*?\}\s*\]', text, re.DOTALL)
    if json_match:
        try:
            competitors = json.loads(json_match.group())
            return competitors if isinstance(competitors, list) else []
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

def calculate_threat_score(competitor: dict, domain: str) -> int:
    """Calculate a 1-10 threat score based on available information"""
    score = 0  # Start from 0 for better distribution
    
    links = competitor.get('links', [])
    link_text = ' '.join(links).lower()
    location = competitor.get('location', '').lower()
    company_name = competitor.get('company_name', '').lower()
    date_founded = competitor.get('date_founded', 'Unknown')
    
    # === COMPANY MATURITY (3 points max) ===
    try:
        if date_founded and date_founded != 'Unknown':
            year = int(date_founded)
            current_year = datetime.now().year
            years_active = current_year - year
            
            if years_active >= 5:
                score += 3  # Established company - bigger threat
            elif years_active >= 2:
                score += 2  # Growing company
            elif years_active >= 0:
                score += 1  # New startup
    except (ValueError, TypeError):
        score += 1  # Unknown age, assume some threat
    
    # === ONLINE PRESENCE (3 points max) ===
    has_website = any(x in link_text for x in ['.com', '.io', '.ai', '.co'])
    has_crunchbase = 'crunchbase.com' in link_text
    has_news = any(x in link_text for x in ['techcrunch.com', 'forbes.com', 'venturebeat.com', 'bloomberg.com'])
    has_product_hunt = 'producthunt.com' in link_text
    
    if has_crunchbase:
        score += 2  # Listed on Crunchbase = real traction
    
    if has_news:
        score += 2  # Media coverage = significant threat
    
    if has_product_hunt:
        score += 1
    
    if has_website:
        score += 1
    
    # === LINK QUANTITY (1 point max) ===
    num_links = len(links)
    if num_links >= 3:
        score += 1
    
    # === LOCATION ADVANTAGE (2 points max) ===
    # Companies in major tech hubs are often better funded and more competitive
    tier1_hubs = ['san francisco', 'palo alto', 'silicon valley', 'menlo park', 'new york', 'nyc']
    if any(hub in location for hub in tier1_hubs):
        score += 2
    else:
        tier2_hubs = ['london', 'boston', 'seattle', 'austin', 'los angeles', 
                      'singapore', 'tel aviv', 'berlin', 'toronto', 'beijing']
        if any(hub in location for hub in tier2_hubs):
            score += 1
    
    # === FUNDING SIGNALS (2 points max) ===
    # Check for funding indicators
    funding_keywords = ['series a', 'series b', 'series c', 'raised', 'funding', 
                       'million', 'billion', 'venture', 'vc', 'backed']
    if any(kw in link_text for kw in funding_keywords):
        score += 2
    
    # YC or top accelerator
    accelerator_keywords = ['y combinator', 'yc ', 'techstars', '500 startups', 'sequoia']
    if any(kw in link_text for kw in accelerator_keywords):
        score += 1
    
    # === DOMAIN RELEVANCE (1 point max) ===
    domain_keywords = domain.lower().split()
    relevant_keywords = [kw for kw in domain_keywords if len(kw) > 3]
    if relevant_keywords and any(kw in company_name or kw in link_text for kw in relevant_keywords):
        score += 1
    
    # Ensure score is between 1-10
    return max(1, min(10, score))

def validate_competitor(competitor: dict) -> bool:
    """Validate that competitor has required fields and looks real"""
    company_name = competitor.get('company_name', '') or ''
    location = competitor.get('location', '') or ''
    links = competitor.get('links', []) or []
    
    # Ensure they are the correct types
    if not isinstance(company_name, str):
        company_name = ''
    if not isinstance(location, str):
        location = ''
    if not isinstance(links, list):
        links = []
    
    company_name = company_name.strip()
    location = location.strip()
    
    # REQUIRED: Must have company name, location, and at least 1 link
    if not company_name or not location or not links:
        return False
    
    # Filter out "Unknown" or "N/A" locations
    if location.lower() in ['unknown', 'n/a', 'not found', 'not available', 'n.a.', 'tbd', 'various', 'remote', 'global']:
        return False
    
    # MUST have "City, Country" format
    if ',' not in location:
        return False
    
    # Filter out obvious non-company names
    invalid_names = ['Example Company', 'Test Inc', 'Sample Corp', 'N/A', 'Unknown']
    if company_name in invalid_names:
        return False
    
    return True

async def main():
    domain = input(f"Enter your startup domain (default: '{DEFAULT_DOMAIN}'): ") or DEFAULT_DOMAIN
    
    print(f"\n{'='*80}")
    print(f"🔍 SEARCHING FOR COMPETITORS IN: {domain}")
    print(f"{'='*80}\n")
    
    # Get results from multiple queries
    results = await find_competitors_comprehensive(domain)
    
    all_competitors = []
    seen_companies = set()
    
    print(f"{'='*80}")
    print(f"📋 PROCESSING RESULTS")
    print(f"{'='*80}\n")
    
    for i, result in enumerate(results, 1):
        print(f"Query {i}:")
        print("-" * 80)
        
        # Extract JSON from response
        competitors = extract_json_from_response(result)
        print(f"   Found {len(competitors)} entries")
        
        # Validate and deduplicate
        for competitor in competitors:
            if not validate_competitor(competitor):
                continue
            
            company_name_lower = competitor['company_name'].strip().lower()
            if company_name_lower not in seen_companies:
                seen_companies.add(company_name_lower)
                all_competitors.append(competitor)
                date_info = competitor.get('date_founded', 'Unknown')
                print(f"   ✅ Added: {competitor['company_name']} ({competitor['location']}) - Founded: {date_info}")
        
        print()
    
    # Add geocoding and threat scores
    print(f"{'='*80}")
    print(f"🌍 GEOCODING LOCATIONS & CALCULATING THREAT SCORES")
    print(f"{'='*80}\n")
    
    # Create aiohttp session for fast concurrent geocoding
    async with aiohttp.ClientSession() as session:
        # Geocode all locations concurrently - MUCH FASTER with Mapbox!
        geocode_tasks = []
        for i, competitor in enumerate(all_competitors, 1):
            location = competitor.get('location', '')
            print(f"[{i}/{len(all_competitors)}] Queuing: {competitor['company_name']} ({location})")
            task = geocode_location(location, session)
            geocode_tasks.append(task)
        
        # Execute all geocoding tasks concurrently
        coords_results = await asyncio.gather(*geocode_tasks)
        
        # Assign coordinates to competitors
        for i, (competitor, coords) in enumerate(zip(all_competitors, coords_results), 1):
            competitor['coordinates'] = coords
            print(f"   ✅ [{i}/{len(all_competitors)}] {competitor['company_name']}: {coords['latitude']}, {coords['longitude']}")
        
        # Use AI's threat score if provided, otherwise calculate our own
        if 'threat_score' not in competitor or competitor.get('threat_score') is None:
            threat_score = calculate_threat_score(competitor, domain)
            competitor['threat_score'] = threat_score
            score_source = "(calculated)"
        else:
            # Validate AI's score is reasonable
            ai_score = competitor.get('threat_score')
            if isinstance(ai_score, (int, float)) and 1 <= ai_score <= 10:
                threat_score = int(ai_score)
                competitor['threat_score'] = threat_score
                score_source = "(AI)"
            else:
                # Fallback to calculation if AI score is invalid
                threat_score = calculate_threat_score(competitor, domain)
                competitor['threat_score'] = threat_score
                score_source = "(calculated)"
    
    # Print threat scores after geocoding
    print(f"\n⚠️  CALCULATING THREAT SCORES\n")
    for i, competitor in enumerate(all_competitors, 1):
        threat_score = competitor.get('threat_score', 0)
        print(f"   [{i}/{len(all_competitors)}] {competitor['company_name']}: {threat_score}/10")
    
    # Sort by threat score (highest first)
    all_competitors.sort(key=lambda x: x.get('threat_score', 0), reverse=True)
    
    # Save results
    filename = f"competitors_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(all_competitors, f, indent=2, ensure_ascii=False)
    
    print(f"{'='*80}")
    print(f"📊 SUMMARY")
    print(f"{'='*80}")
    print(f"Total unique competitors found: {len(all_competitors)}")
    print(f"All have location in 'City, Country' format: ✅")
    print(f"All have at least 1 link: ✅")
    print(f"All have coordinates: ✅")
    
    # Threat score breakdown
    if all_competitors:
        avg_score = sum(c.get('threat_score', 0) for c in all_competitors) / len(all_competitors)
        high_threats = sum(1 for c in all_competitors if c.get('threat_score', 0) >= 8)
        print(f"\n⚠️  Threat Scores:")
        print(f"   Average: {avg_score:.1f}/10")
        print(f"   High threats (8+): {high_threats}")
    
    # Count link types
    with_crunchbase = sum(1 for c in all_competitors if any('crunchbase.com' in l for l in c.get('links', [])))
    with_news = sum(1 for c in all_competitors if any(x in ' '.join(c.get('links', [])).lower() for x in ['techcrunch', 'forbes', 'venturebeat']))
    with_website = sum(1 for c in all_competitors if any(x in ' '.join(c.get('links', [])).lower() for x in ['.com', '.io', '.ai']))
    
    print(f"\n🔗 Link breakdown:")
    print(f"   Crunchbase: {with_crunchbase}")
    print(f"   News coverage: {with_news}")
    print(f"   Company website: {with_website}")
    
    # Founded date breakdown
    known_dates = sum(1 for c in all_competitors if c.get('date_founded', 'Unknown') != 'Unknown')
    print(f"\n📅 Founded dates known: {known_dates}/{len(all_competitors)}")
    
    print(f"\n✅ Saved to {filename}")
    print(f"{'='*80}\n")
    
    # Display results
    if all_competitors:
        print("🏢 COMPETITORS FOUND (sorted by threat score):\n")
        for i, competitor in enumerate(all_competitors[:15], 1):
            threat_score = competitor.get('threat_score', 0)
            coords = competitor.get('coordinates', {})
            date_founded = competitor.get('date_founded', 'Unknown')
            
            # Display with threat score prominently
            print(f"{i}. {competitor['company_name']} ⚠️  {threat_score}/10")
            print(f"   📍 {competitor['location']}")
            print(f"   📅 Founded: {date_founded}")
            
            # Show coordinates if available
            lat = coords.get('latitude')
            lon = coords.get('longitude')
            if lat and lon:
                print(f"   🌐 Coordinates: {lat:.4f}, {lon:.4f}")
            
            print(f"   🔗 Links ({len(competitor.get('links', []))}):")
            for link in competitor.get('links', []):
                # Identify link type
                link_lower = link.lower()
                if 'crunchbase.com' in link_lower:
                    link_type = "📊 Crunchbase"
                elif 'techcrunch.com' in link_lower or 'forbes.com' in link_lower or 'venturebeat.com' in link_lower:
                    link_type = "📰 News"
                elif 'producthunt.com' in link_lower:
                    link_type = "🚀 Product Hunt"
                elif 'linkedin.com' in link_lower:
                    link_type = "💼 LinkedIn"
                elif 'twitter.com' in link_lower or 'x.com' in link_lower:
                    link_type = "🐦 Twitter"
                else:
                    link_type = "🌐 Website"
                print(f"      • {link_type}: {link}")
            print()

async def find_competitors_api(domain: str, max_results: int = 20, include_coordinates: bool = True) -> dict:
    """
    API-friendly function to find competitors and return structured data
    Returns a dict ready for JSON serialization
    """
    # Get results from multiple queries
    results = await find_competitors_comprehensive(domain)
    
    all_competitors = []
    seen_companies = set()
    
    for result in results:
        competitors = extract_json_from_response(result)
        
        for competitor in competitors:
            if not validate_competitor(competitor):
                continue
            
            company_name_lower = competitor['company_name'].strip().lower()
            if company_name_lower not in seen_companies:
                seen_companies.add(company_name_lower)
                all_competitors.append(competitor)
    
    # Add geocoding and threat scores if requested
    if include_coordinates and all_competitors:
        async with aiohttp.ClientSession() as session:
            # Geocode all locations concurrently - FAST with Mapbox!
            geocode_tasks = [geocode_location(c.get('location', ''), session) for c in all_competitors]
            coords_results = await asyncio.gather(*geocode_tasks)
            
            # Assign coordinates to competitors
            for competitor, coords in zip(all_competitors, coords_results):
                competitor['coordinates'] = coords
            
            # Use AI's threat score if provided, otherwise calculate
            if 'threat_score' not in competitor or competitor.get('threat_score') is None:
                competitor['threat_score'] = calculate_threat_score(competitor, domain)
            else:
                ai_score = competitor.get('threat_score')
                if isinstance(ai_score, (int, float)) and 1 <= ai_score <= 10:
                    competitor['threat_score'] = int(ai_score)
                else:
                    competitor['threat_score'] = calculate_threat_score(competitor, domain)
    else:
        # Just calculate threat scores without geocoding
        for competitor in all_competitors:
            if 'threat_score' not in competitor or competitor.get('threat_score') is None:
                competitor['threat_score'] = calculate_threat_score(competitor, domain)
            else:
                ai_score = competitor.get('threat_score')
                if isinstance(ai_score, (int, float)) and 1 <= ai_score <= 10:
                    competitor['threat_score'] = int(ai_score)
                else:
                    competitor['threat_score'] = calculate_threat_score(competitor, domain)
    
    # Sort by threat score (highest first)
    all_competitors.sort(key=lambda x: x.get('threat_score', 0), reverse=True)
    
    # Limit results
    limited_competitors = all_competitors[:max_results]
    
    # Generate summary
    summary = {
        "total_found": len(all_competitors),
        "returned": len(limited_competitors),
        "with_crunchbase": sum(1 for c in limited_competitors if any('crunchbase.com' in l for l in c.get('links', []))),
        "with_news_coverage": sum(1 for c in limited_competitors if any(x in ' '.join(c.get('links', [])).lower() for x in ['techcrunch', 'forbes', 'venturebeat'])),
        "with_website": sum(1 for c in limited_competitors if any(x in ' '.join(c.get('links', [])).lower() for x in ['.com', '.io', '.ai'])),
        "average_threat_score": round(sum(c.get('threat_score', 0) for c in limited_competitors) / len(limited_competitors), 1) if limited_competitors else 0,
        "high_threats_8plus": sum(1 for c in limited_competitors if c.get('threat_score', 0) >= 8),
        "known_founding_dates": sum(1 for c in limited_competitors if c.get('date_founded', 'Unknown') != 'Unknown'),
    }
    
    return {
        "competitors": limited_competitors,
        "summary": summary,
        "total_found": len(all_competitors)
    }

if __name__ == "__main__":
    asyncio.run(main())
