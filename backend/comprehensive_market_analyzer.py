"""
Comprehensive Market Analysis API
Workflow:
1. Take user prompt (e.g., "I am making a healthcare startup")
2. Use Perplexity to generate 5 similar search queries
3. Get Google Trends data for those queries
4. Run in-depth market analysis with Perplexity Pro
5. Return comprehensive market insights
"""

import os
import json
import re
import asyncio
import collections
from datetime import datetime, timezone
from typing import List, Dict, Any
from dotenv import load_dotenv
from perplexity import AsyncPerplexity
import requests

load_dotenv()

class ComprehensiveMarketAnalyzer:
    def __init__(self):
        self.client = None

    async def __aenter__(self):
        api_key = (os.getenv("PERPLEXITY_API_KEY") or "").strip()
        if not api_key:
            raise RuntimeError("PERPLEXITY_API_KEY missing or empty")
        self.client = AsyncPerplexity(api_key=api_key)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.close()

    async def query_perplexity(self, prompt: str, model: str = "sonar-pro") -> str:
        """Single query to Perplexity Chat"""
        response = await self.client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": """You are a precise market research analyst that returns structured data.
CRITICAL: Return ONLY valid JSON. Do not include any explanatory text before or after the JSON.
IMPORTANT: 
- NO markdown, NO explanations, ONLY the JSON object"""
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3
        )
        return response.choices[0].message.content

    async def extract_industry_keywords(self, user_prompt: str) -> List[str]:
        """Extract 5 industry-related keywords from startup prompt"""
        
        prompt = f"""Identify the industry and extract 5 key industry-related search terms from this startup idea: "{user_prompt}"

Focus on the specific industry, sector, or market this startup operates in.

CRITICAL: Return ONLY this exact JSON format (no other text):
{{"industry_keywords": ["industry1", "industry2", "industry3", "industry4", "industry5"]}}

Requirements:
- Identify the main industry/sector (e.g., "healthcare", "fintech", "edtech", "AI", "e-commerce")
- Extract related industry terms people would search for
- Focus on the business domain, not the product features
- Make them specific industry keywords (1-2 words each)
- NO markdown, NO explanations, ONLY the JSON object"""

        response = await self.query_perplexity(prompt, "sonar-pro")
        data = self.extract_json_from_response(response)
        
        if data and "industry_keywords" in data[0]:
            return data[0]["industry_keywords"][:5]  # Ensure max 5 keywords
        else:
            # Fallback - try to identify industry from common patterns
            prompt_lower = user_prompt.lower()
            if any(word in prompt_lower for word in ["health", "medical", "healthcare", "doctor", "patient"]):
                return ["healthcare", "medical", "health", "pharma", "biotech"]
            elif any(word in prompt_lower for word in ["finance", "fintech", "banking", "payment", "money"]):
                return ["fintech", "finance", "banking", "payments", "fintech"]
            elif any(word in prompt_lower for word in ["education", "edtech", "learning", "school", "student"]):
                return ["edtech", "education", "learning", "e-learning", "edtech"]
            elif any(word in prompt_lower for word in ["ai", "artificial", "machine", "automation", "tech"]):
                return ["AI", "artificial intelligence", "machine learning", "automation", "tech"]
            elif any(word in prompt_lower for word in ["ecommerce", "e-commerce", "retail", "shopping", "marketplace"]):
                return ["ecommerce", "retail", "shopping", "marketplace", "ecommerce"]
            else:
                return ["startup", "business", "market", "industry", "technology"]

    def _parse_location_to_geo(self, location: str) -> str:
        """Parse location string to Google Trends geo code"""
        location_lower = location.lower()
        
        # Handle common city formats
        if "cambridge" in location_lower and "massachusetts" in location_lower:
            return "US-MA"  # Massachusetts
        elif "boston" in location_lower and "massachusetts" in location_lower:
            return "US-MA"
        elif "new york" in location_lower:
            return "US-NY"
        elif "san francisco" in location_lower:
            return "US-CA"
        elif "los angeles" in location_lower:
            return "US-CA"
        elif "chicago" in location_lower:
            return "US-IL"
        elif "london" in location_lower:
            return "GB-ENG"
        elif "paris" in location_lower:
            return "FR-IDF"
        elif "berlin" in location_lower:
            return "DE-BE"
        elif "toronto" in location_lower:
            return "CA-ON"
        elif "sydney" in location_lower:
            return "AU-NSW"
        elif "waterloo" in location_lower and "ontario" in location_lower:
            return "CA-ON"  # Ontario, Canada
        
        return ""

    def _extract_country_code(self, location: str) -> str:
        """Extract country code from location string"""
        location_lower = location.lower()
        
        if "united states" in location_lower or "usa" in location_lower:
            return "US"
        elif "united kingdom" in location_lower or "uk" in location_lower:
            return "GB"
        elif "canada" in location_lower:
            return "CA"
        elif "australia" in location_lower:
            return "AU"
        elif "germany" in location_lower:
            return "DE"
        elif "france" in location_lower:
            return "FR"
        
        return "US"  # Default fallback

    def get_google_trends_data(self, queries: List[str], region: str = "") -> Dict[str, Any]:
        """Get Google Trends data for the queries with optional region"""
        
        params = {
            "engine": "google_trends",
            "q": ",".join(queries),
            "data_type": "TIMESERIES",
            "date": "today 5-y",
            "tz": "-60",  
            "api_key": os.getenv("SERPAPI_KEY")
        }
        
        # Add region if provided - handle both country codes and city names
        if region:
            # If it's a simple country code (US, UK, etc.), use as is
            if len(region) <= 3 and region.isupper():
                params["geo"] = region
            else:
                # For city names like "Cambridge, Massachusetts, United States"
                # Try to extract a more specific geo code
                geo_code = self._parse_location_to_geo(region)
                if geo_code:
                    params["geo"] = geo_code
                else:
                    # Fallback to country-level if we can't parse city
                    country_code = self._extract_country_code(region)
                    if country_code:
                        params["geo"] = country_code
        
        try:
            res = requests.get("https://serpapi.com/search.json", params=params, timeout=60)
            res.raise_for_status()
            j = res.json()
            
            # Process timeline data using the working implementation from google_trends_client.py
            timeline = j.get("interest_over_time", {}).get("timeline_data", [])
            per_year = collections.defaultdict(lambda: collections.defaultdict(list))
            
            for point in timeline:
                # point["timestamp"] is seconds since epoch (string)
                dt = datetime.fromtimestamp(int(point["timestamp"]), timezone.utc)
                year = dt.year
                for v in point["values"]:
                    per_year[year][v["query"]].append(int(v["extracted_value"]))
            
            # Build annual sums (same as working implementation)
            annual_data = []
            for year in sorted(per_year.keys()):
                row = {"year": year}
                for query, vals in per_year[year].items():
                    row[f"{query}_sum"] = sum(vals)
                annual_data.append(row)
            
            return {
                "trends_data": annual_data,
                "queries_analyzed": queries
            }
            
        except Exception as e:
            print(f"Error fetching Google Trends data: {e}")
            return {
                "trends_data": [],
                "queries_analyzed": queries,
                "error": str(e)
            }

    async def get_comprehensive_market_analysis(self, user_prompt: str, trends_data: List[Dict], queries: List[str]) -> Dict[str, Any]:
        """Get simplified market analysis: queries, trends, AI-proof score, and market cap"""
        
        trends_summary = json.dumps(trends_data, indent=2)
        
        prompt = f"""Analyze this startup idea: "{user_prompt}"

SEARCH TRENDS DATA (last 5 years):
{trends_summary}

SEARCH QUERIES ANALYZED:
{', '.join(queries)}

Provide only: queries analyzed, Google trends data, AI-proof score, and market cap estimation.

CRITICAL: Return ONLY this exact JSON format (no other text):
{{
  "queries_analyzed": ["healthcare", "medical", "health", "pharma", "biotech"],
  "google_trends": [
    {{"2020-12": 45}}, {{"2021-06": 52}}, {{"2021-12": 48}}, {{"2022-06": 61}}, {{"2022-12": 58}}, 
    {{"2023-06": 67}}, {{"2023-12": 72}}, {{"2024-06": 78}}, {{"2024-12": 85}}, {{"2025-06": 89}}
  ],
  "how_AI_proof_it_is": 7,
  "market_cap_estimation": 1250000000.5
}}

Requirements:
- queries_analyzed must be array of the industry keywords used for analysis
- google_trends must have exactly 10 bi-annual data points based on the provided trends data
- how_AI_proof_it_is must be integer 1-10 (1=high AI displacement risk, 10=AI resilient)
- market_cap_estimation must be a float number representing total addressable market in USD (e.g., 1250000000.5 for $1.25B)
- All values must be realistic based on actual market research
- NO markdown, NO explanations, ONLY the JSON object"""

        response = await self.query_perplexity(prompt, "sonar-pro")
        data = self.extract_json_from_response(response)
        
        if data and len(data) > 0:
            return data[0]
        else:
            # Fallback analysis
            return {
                "market_overview": f"Market analysis for {user_prompt} - comprehensive research pending",
                "target_audience": "Target audience analysis pending",
                "competitive_landscape": "Competitive analysis pending",
                "market_opportunities": "Market opportunities analysis pending",
                "challenges_and_risks": "Risk analysis pending",
                "growth_of_market": [{"2020-12": 50}, {"2021-06": 55}, {"2021-12": 52}, {"2022-06": 58}, {"2022-12": 60}, {"2023-06": 65}, {"2023-12": 68}, {"2024-06": 72}, {"2024-12": 75}, {"2025-06": 78}],
                "sentiment_analysis_of_market": "neutral",
                "articles_to_support_the_sentiment": ["Market analysis pending"],
                "how_AI_proof_it_is": 5,
                "market_size_estimate": "Market size analysis pending",
                "revenue_potential": "Revenue analysis pending",
                "regulatory_considerations": "Regulatory analysis pending",
                "technology_trends": "Technology trends analysis pending",
                "investment_landscape": "Investment analysis pending"
            }

    def extract_json_from_response(self, text: str) -> List[Dict]:
        """Extract JSON from Perplexity response"""
        # Try to find JSON object in the response
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group())
                return [data] if isinstance(data, dict) else []
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
                return []
        return []

    async def analyze_market(self, user_prompt: str, region: str = "") -> Dict[str, Any]:
        """Main workflow: Extract industry keywords -> Get trends -> Analyze market"""
        
        print(f"🔍 Analyzing market for: {user_prompt}")
        if region:
            print(f"🌍 Region: {region}")
        
        # Step 1: Extract industry keywords
        print("📝 Extracting industry keywords...")
        industry_keywords = await self.extract_industry_keywords(user_prompt)
        print(f"Industry keywords: {industry_keywords}")
        
        # Step 2: Get Google Trends data
        print("📊 Fetching Google Trends data...")
        trends_result = self.get_google_trends_data(industry_keywords, region)
        trends_data = trends_result.get("trends_data", [])
        print(f"Got trends data for {len(trends_data)} years")
        
        # Step 3: Get comprehensive market analysis
        print("🤖 Running comprehensive market analysis...")
        market_analysis = await self.get_comprehensive_market_analysis(user_prompt, trends_data, industry_keywords)
        
        # Combine results
        result = {
            "user_prompt": user_prompt,
            "region": region,
            "industry_keywords_extracted": industry_keywords,
            "google_trends_data": trends_result,
            "comprehensive_analysis": market_analysis,
            "timestamp": datetime.now().isoformat(),
            "analysis_type": "comprehensive_market_research"
        }
        
        return result

# API function for FastAPI integration
async def analyze_market_comprehensive_api(user_prompt: str, region: str = "") -> Dict[str, Any]:
    """
    API-friendly function for comprehensive market analysis
    """
    analyzer = ComprehensiveMarketAnalyzer()
    async with analyzer:
        return await analyzer.analyze_market(user_prompt, region)


# CLI testing function
async def main():
    """Test the comprehensive market analyzer"""
    prompt = input("Enter your startup idea: ").strip()
    if not prompt:
        prompt = "I am making a healthcare startup"
    
    print(f"\n{'='*80}")
    print(f"🔍 COMPREHENSIVE MARKET ANALYSIS: {prompt}")
    print(f"{'='*80}\n")
    
    try:
        result = await analyze_market_comprehensive_api(prompt)
        
        print("📊 COMPREHENSIVE MARKET ANALYSIS RESULTS:")
        print(json.dumps(result, indent=2))
        
        print(f"\n✅ Analysis complete!")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
