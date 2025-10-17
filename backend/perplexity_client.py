from perplexity import Perplexity
from pydantic import BaseModel
from typing import List
import json

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

    async def find_target_locations(self, business_type: str, target_audience: str, region: str = "global") -> List[Location]:
        """Query Perplexity for locations with target demographic"""
        
        # Check cache first
        cache_key = f"{business_type}_{target_audience}_{region}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        
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
        
        try:
            response = self.client.chat.completions.create(
                model="sonar",
                messages=[{"role": "user", "content": prompt}],
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
                return locations
            else:
                # Fallback: return some default locations
                return self._get_fallback_locations(region)
                
        except Exception as e:
            print(f"Perplexity API error: {e}")
            error_result = {"error": str(e)}
            self._cache[cache_key] = error_result
            return error_result
    
    #def _get_fallback_locations(self, region: str) -> List[Location]:
    #    """Return fallback locations when Perplexity API fails"""
    #    fallback_locations = {
    #        "global": [
    #            Location(
    #                name="Shoreditch",  
    #                area_code="E1",
    #                borough="Hackney",
    #                country="UK",
    #                description="Trendy tech hub with young professionals and startups",
    #                target_audience_fit="High concentration of tech workers and entrepreneurs",
    #                fitness_score=8.5
    #            ),
    #            Location(
    #                name="Williamsburg",
    #                area_code="11211",
    #                borough="Brooklyn",
    #                country="US",
    #                description="Hip neighborhood with young professionals and creatives",
    #                target_audience_fit="Dense population of young urban professionals",
    #                fitness_score=8.0
    #            )
    #        ],
    #        "london": [
    #            Location(
    #                name="Islington",
    #                area_code="N1",
    #                borough="Islington",
    #                country="UK",
    #                description="Trendy neighbourhood with young professionals and cafes",
    #                target_audience_fit="High concentration of health-conscious young professionals",
    #                fitness_score=8.5
    #            ),
    #            Location(
    #                name="Camden",
    #                area_code="NW1",
    #                borough="Camden",
    #                country="UK",
    #                description="Vibrant area with diverse young population",
    #                target_audience_fit="Creative professionals and health-conscious millennials",
    #                fitness_score=7.5
    #            )
    #        ]
    #    }
        
    #    region_key = region.lower() if region.lower() in fallback_locations else "global"
    #    return fallback_locations[region_key]
