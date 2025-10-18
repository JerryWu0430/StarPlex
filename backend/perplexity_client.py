from perplexity import Perplexity
from pydantic import BaseModel
from typing import List
import json
import hashlib

class Location(BaseModel):
    name: str
    area_code: str  # Postal code or area identifier
    borough: str  # Neighborhood/district
    country: str
    description: str  # "Islington is a trendy neighbourhood..."
    target_audience_fit: str  # Explain why the target audience is here
    fitness_score: float  # 0-10 score for heatmap weight

class PerplexityAudienceAnalyzer:
    def __init__(self):
        self.client = Perplexity()
        # Simple cache for API results
        self._cache = {}
    
    def clear_cache(self):
        """Clear the cache to force fresh API calls"""
        self._cache = {}

    async def find_target_locations(self, business_type: str, target_audience: str, region: str = "global") -> List[Location]:
        """Query Perplexity for locations with target demographic"""
        
        # Check cache first - create a more specific cache key that includes all parameters
        # Use hash to handle special characters and make cache key more reliable
        cache_input = f"{business_type.strip()}|{target_audience.strip()}|{region.strip()}"
        cache_key = hashlib.md5(cache_input.encode()).hexdigest()
        print(f"Looking for cache key: {cache_key}")
        print(f"Cache input: {cache_input}")
        print(f"Available cache keys: {list(self._cache.keys())}")
        
        if cache_key in self._cache:
            print(f"Cache hit for key: {cache_key}")
            return self._cache[cache_key]
        
        print(f"Cache miss - making API call for: {business_type}")
        
        prompt = f"""
        I'm building a startup that is: {business_type}
        
        My target audience is: {target_audience}
        
        I need to find specific neighborhoods, districts, or areas in {region} where this target audience is highly concentrated.
        
        For each location, provide:
        1. The neighborhood/district name
        2. Area code or postal code
        3. Borough or larger administrative area
        4. Country
        5. A description of the neighborhood character
        6. Why this target audience is concentrated here
        7. A score from 0-10 for how well this location matches the target audience
        
        Return the results as a JSON array with this exact structure:
        [
            {{
                "name": "Neighborhood Name",
                "area_code": "Postal Code",
                "borough": "Borough/District",
                "country": "Country",
                "description": "Neighborhood description...",
                "target_audience_fit": "Why target audience is here...",
                "score": 8.5
            }}
        ]
        
        Focus on areas with high concentrations of the target demographic. Include at least 5-10 locations.
        """
        
        system_prompt = """
        You are a helpful assistant that finds locations that match a given target audience. You must return a JSON array of locations with the following structure:

        [
            {
                "name": "Neighborhood Name",
                "area_code": "Postal Code",
                "borough": "Borough/District",
                "country": "Country",
                "description": "Neighborhood description...",
                "target_audience_fit": "Why target audience is here...",
                "score": 8.5
            }
        ]

        All fields are required. You must make sure that the name, area_code, borough, country are able to be geocoded using the OpenStreetMap Nominatim API.
        """
        try:
            response = self.client.chat.completions.create(
                model="sonar",
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}],
                temperature=0.7,
                stream=False
            )
            
            content = response.choices[0].message.content
            
            # Extract JSON from the response
            json_start = content.find('[')
            json_end = content.rfind(']') + 1
            
            if json_start != -1 and json_end != -1:
                json_str = content[json_start:json_end]
                locations_data = json.loads(json_str)
                
                # Convert to Location objects
                locations = []
                for loc_data in locations_data:
                    try:
                        location = Location(
                            name=loc_data.get("name", ""),
                            area_code=loc_data.get("area_code", ""),
                            borough=loc_data.get("borough", ""),
                            country=loc_data.get("country", ""),
                            description=loc_data.get("description", ""),
                            target_audience_fit=loc_data.get("target_audience_fit", ""),
                            fitness_score=float(loc_data.get("fitness_score", 5.0))
                        )
                        locations.append(location)
                    except Exception as e:
                        print(f"Error parsing location: {e}")
                        continue
                
                # Cache the result
                self._cache[cache_key] = locations
                print(f"Cached result for key: {cache_key}")
                return locations
            else:
                # Fallback: return some default locations
                return self._get_fallback_locations(region)
                
        except Exception as e:
            print(f"Perplexity API error: {e}")
            error_result = {"error": str(e)}
            self._cache[cache_key] = error_result
            return error_result
    
    def _get_fallback_locations(self, region: str = "global") -> List[Location]:
        """Return fallback locations when API fails"""
        fallback_locations = [
            Location(
                name="Silicon Valley",
                area_code="94000",
                borough="Santa Clara County",
                country="United States",
                description="Tech hub with high concentration of startups and tech professionals",
                target_audience_fit="High concentration of tech-savvy professionals and entrepreneurs",
                fitness_score=8.0
            ),
            Location(
                name="Shoreditch",
                area_code="E1",
                borough="Hackney",
                country="United Kingdom",
                description="Trendy tech district in London with many startups and creative professionals",
                target_audience_fit="Young professionals and tech workers in creative industries",
                fitness_score=7.5
            )
        ]
        return fallback_locations