from urllib.parse import quote
from typing import Optional, Dict, List
import asyncio
import logging
import aiohttp
import os
from dotenv import load_dotenv

load_dotenv()

# Set up logging
logger = logging.getLogger(__name__)

# Mapbox API token
MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN", "")

class InternationalGeocoder:
    def __init__(self):
        # Simple in-memory cache
        self._cache = {}
        self._session = None

    async def _get_session(self):
        """Get or create aiohttp session"""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session
    
    async def close(self):
        """Close the aiohttp session"""
        if self._session and not self._session.closed:
            await self._session.close()

    def _simplify_query(self, location_query: str) -> str:
        """Simplify location query to improve geocoding success"""
        query = location_query.strip()
        
        # If query is too specific, try to simplify it
        parts = query.split(',')
        if len(parts) > 3:
            # Take the last 3 parts (usually city, state, country)
            query = ','.join(parts[-3:])
        
        return query.strip()
    
    def _get_alternative_queries(self, location_query: str) -> List[str]:
        """Generate alternative queries for better geocoding success"""
        alternatives = [location_query]
        
        # Try removing "District" from queries
        if "District" in location_query:
            alt_query = location_query.replace("District", "").replace("  ", " ").strip()
            if alt_query != location_query:
                alternatives.append(alt_query)
        
        # Try removing the first part if it's a specific area name
        parts = location_query.split(',')
        if len(parts) > 2:
            # Try without the first part (e.g., "Marina District, Dubai Marina, UAE" -> "Dubai Marina, UAE")
            alt_query = ','.join(parts[1:]).strip()
            alternatives.append(alt_query)
        
        return alternatives

    async def geocode_location(self, location_query: str, country_code: str = None) -> Dict:
        """Geocode any location worldwide using Mapbox - FAST!"""
        # Check cache first
        cache_key = f"{location_query}:{country_code or 'None'}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        if not MAPBOX_TOKEN:
            logger.warning(f"No Mapbox token found, returning fallback for '{location_query}'")
            fallback_result = self._get_fallback_coordinates(country_code)
            self._cache[cache_key] = fallback_result
            return fallback_result
        
        # Get alternative queries to try
        alternative_queries = self._get_alternative_queries(location_query)
        
        session = await self._get_session()
        
        try:
            for query_variant in alternative_queries:
                try:
                    # Mapbox Geocoding API endpoint
                    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{quote(query_variant)}.json"
                    params = {
                        "access_token": MAPBOX_TOKEN,
                        "limit": 1
                    }
                    
                    async with session.get(url, params=params) as response:
                        if response.status == 200:
                            data = await response.json()
                            
                            # Check if we got results
                            if data.get("features") and len(data["features"]) > 0:
                                feature = data["features"][0]
                                coords = feature["geometry"]["coordinates"]
                                
                                # Mapbox returns [longitude, latitude]
                                geocoded_result = {
                                    "lat": coords[1],
                                    "lng": coords[0],
                                    "display_name": feature.get("place_name", location_query),
                                    "address": feature.get("properties", {}),
                                    "success": True,
                                    "bbox": None,
                                    "boundingbox": feature.get("bbox", []),
                                    "place_id": feature.get("id"),
                                }
                                
                                # Parse bounding box if available
                                if "bbox" in feature and len(feature["bbox"]) == 4:
                                    bbox = feature["bbox"]
                                    geocoded_result["bbox"] = {
                                        "min_lon": bbox[0],
                                        "min_lat": bbox[1],
                                        "max_lon": bbox[2],
                                        "max_lat": bbox[3]
                                    }
                                
                                # Cache the result
                                self._cache[cache_key] = geocoded_result
                                logger.info(f"Successfully geocoded: '{query_variant}' -> {feature.get('place_name')}")
                                return geocoded_result
                        
                except Exception as e:
                    logger.debug(f"Geocoding failed for '{query_variant}': {e}")
                    continue
            
            # If no variant worked, return fallback
            logger.warning(f"No geocoding results found for any variant of '{location_query}'")
            fallback_result = self._get_fallback_coordinates(country_code)
            self._cache[cache_key] = fallback_result
            return fallback_result
                
        except Exception as e:
            logger.error(f"Geocoding error for '{location_query}': {e}")
            fallback_result = self._get_fallback_coordinates(country_code)
            self._cache[cache_key] = fallback_result
            return fallback_result
    
    def _get_fallback_coordinates(self, country_code: str = None) -> Dict:
        """Return fallback coordinates for major cities by country"""
        fallback_coords = {
            "US": {"lat": 40.7128, "lng": -74.0060, "display_name": "New York, NY, USA"},
            "UK": {"lat": 51.5074, "lng": -0.1278, "display_name": "London, UK"},
            "CA": {"lat": 43.6532, "lng": -79.3832, "display_name": "Toronto, ON, Canada"},
            "AU": {"lat": -33.8688, "lng": 151.2093, "display_name": "Sydney, NSW, Australia"},
            "DE": {"lat": 52.5200, "lng": 13.4050, "display_name": "Berlin, Germany"},
            "FR": {"lat": 48.8566, "lng": 2.3522, "display_name": "Paris, France"},
            "JP": {"lat": 35.6762, "lng": 139.6503, "display_name": "Tokyo, Japan"},
            "IN": {"lat": 19.0760, "lng": 72.8777, "display_name": "Mumbai, India"},
            "BR": {"lat": -23.5505, "lng": -46.6333, "display_name": "São Paulo, Brazil"},
        }
        
        if country_code and country_code.upper() in fallback_coords:
            coords = fallback_coords[country_code.upper()]
            return {
                "lat": coords["lat"],
                "lng": coords["lng"],
                "display_name": coords["display_name"],
                "address": {},
                "success": False
            }
        
        # Default to London if no country specified
        return {
            "lat": 51.5074,
            "lng": -0.1278,
            "display_name": "London, UK",
            "address": {},
            "success": False
        }

    async def geocode_area_with_bbox(self, area_query: str, country_code: str = None) -> Dict:
        """Geocode an area (city, state, country) and get its bounding box using Mapbox"""
        cache_key = f"area:{area_query}:{country_code or 'None'}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        if not MAPBOX_TOKEN:
            logger.warning(f"No Mapbox token found, returning fallback for '{area_query}'")
            fallback_result = self._get_fallback_coordinates(country_code)
            self._cache[cache_key] = fallback_result
            return fallback_result
        
        # Simplify the query for better results
        simplified_query = self._simplify_query(area_query)
        
        session = await self._get_session()
        
        try:
            # Mapbox Geocoding API endpoint
            url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{quote(simplified_query)}.json"
            params = {
                "access_token": MAPBOX_TOKEN,
                "limit": 1
            }
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    if data.get("features") and len(data["features"]) > 0:
                        feature = data["features"][0]
                        coords = feature["geometry"]["coordinates"]
                        
                        # Parse bounding box
                        bbox = None
                        if "bbox" in feature and len(feature["bbox"]) == 4:
                            bbox_list = feature["bbox"]
                            bbox = {
                                "min_lon": bbox_list[0],
                                "min_lat": bbox_list[1],
                                "max_lon": bbox_list[2],
                                "max_lat": bbox_list[3]
                            }
                        
                        area_result = {
                            "lat": coords[1],
                            "lng": coords[0],
                            "display_name": feature.get("place_name", area_query),
                            "address": feature.get("properties", {}),
                            "success": True,
                            "bbox": bbox,
                            "boundingbox": feature.get("bbox", []),
                            "place_id": feature.get("id"),
                            "geojson": feature.get("geometry")
                        }
                        
                        self._cache[cache_key] = area_result
                        return area_result
            
            # Fallback
            fallback_result = self._get_fallback_coordinates(country_code)
            self._cache[cache_key] = fallback_result
            return fallback_result
                
        except Exception as e:
            logger.error(f"Area geocoding error for '{area_query}': {e}")
            fallback_result = self._get_fallback_coordinates(country_code)
            self._cache[cache_key] = fallback_result
            return fallback_result

    async def geocode_multiple(self, locations: List[str], country_code: str = None) -> List[Dict]:
        """Geocode multiple locations in parallel with proper error handling"""
        async def geocode_single(location: str) -> Dict:
            try:
                return await self.geocode_location(location, country_code)
            except Exception as e:
                logger.error(f"Error geocoding '{location}': {e}")
                # Return fallback for this specific location
                return self._get_fallback_coordinates(country_code)
        
        # Use asyncio.gather with return_exceptions=True to ensure all locations are processed
        tasks = [geocode_single(loc) for loc in locations]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions that occurred
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Exception for location '{locations[i]}': {result}")
                processed_results.append(self._get_fallback_coordinates(country_code))
            else:
                processed_results.append(result)
        
        return processed_results