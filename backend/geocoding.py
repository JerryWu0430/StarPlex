from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
from urllib.parse import quote
from typing import Optional, Dict, List
import asyncio
import logging

# Set up logging
logger = logging.getLogger(__name__)

class InternationalGeocoder:
    def __init__(self):
        # Initialize Nominatim with proper user agent
        self.geolocator = Nominatim(user_agent="StartupSonar-Geocoding/1.0")
        # Add rate limiting to respect Nominatim's terms of service
        self.geocode = RateLimiter(self.geolocator.geocode, min_delay_seconds=1.1)
        # Simple in-memory cache
        self._cache = {}

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
        """Geocode any location worldwide using Nominatim with rate limiting"""
        # Check cache first
        cache_key = f"{location_query}:{country_code or 'None'}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        # Get alternative queries to try
        alternative_queries = self._get_alternative_queries(location_query)
        
        try:
            for query_variant in alternative_queries:
                try:
                    # URL encode the query to handle special characters
                    encoded_query = quote(query_variant)
                    
                    # Use the rate-limited geocoder
                    location = await asyncio.get_event_loop().run_in_executor(
                        None, self.geocode, query_variant
                    )
                    
                    if location:
                        # Parse the result
                        geocoded_result = {
                            "lat": location.latitude,
                            "lng": location.longitude,
                            "display_name": location.address,
                            "address": location.raw.get("address", {}),
                            "success": True,
                            "bbox": None,  # Will be populated if available
                            "boundingbox": location.raw.get("boundingbox", []),
                            "place_id": location.raw.get("place_id"),
                            "osm_type": location.raw.get("osm_type"),
                            "osm_id": location.raw.get("osm_id"),
                            "importance": location.raw.get("importance"),
                            "class": location.raw.get("class"),
                            "type": location.raw.get("type")
                        }
                        
                        # Parse bounding box if available
                        if "boundingbox" in location.raw:
                            bbox_list = location.raw["boundingbox"]
                            if len(bbox_list) == 4:
                                geocoded_result["bbox"] = {
                                    "min_lat": float(bbox_list[0]),
                                    "max_lat": float(bbox_list[1]),
                                    "min_lon": float(bbox_list[2]),
                                    "max_lon": float(bbox_list[3])
                                }
                        
                        # Cache the result
                        self._cache[cache_key] = geocoded_result
                        logger.info(f"Successfully geocoded: '{query_variant}' -> {location.address}")
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
        """Geocode an area (city, state, country) and get its bounding box"""
        cache_key = f"area:{area_query}:{country_code or 'None'}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        # Simplify the query for better results
        simplified_query = self._simplify_query(area_query)
        
        try:
            # URL encode the query
            encoded_query = quote(simplified_query)
            
            # Use the rate-limited geocoder
            location = await asyncio.get_event_loop().run_in_executor(
                None, self.geocode, simplified_query
            )
            
            if location:
                # Parse bounding box
                bbox = None
                if "boundingbox" in location.raw:
                    bbox_list = location.raw["boundingbox"]
                    if len(bbox_list) == 4:
                        bbox = {
                            "min_lat": float(bbox_list[0]),
                            "max_lat": float(bbox_list[1]),
                            "min_lon": float(bbox_list[2]),
                            "max_lon": float(bbox_list[3])
                        }
                
                area_result = {
                    "lat": location.latitude,
                    "lng": location.longitude,
                    "display_name": location.address,
                    "address": location.raw.get("address", {}),
                    "success": True,
                    "bbox": bbox,
                    "boundingbox": location.raw.get("boundingbox", []),
                    "place_id": location.raw.get("place_id"),
                    "osm_type": location.raw.get("osm_type"),
                    "osm_id": location.raw.get("osm_id"),
                    "importance": location.raw.get("importance"),
                    "class": location.raw.get("class"),
                    "type": location.raw.get("type"),
                    "geojson": location.raw.get("geojson")  # GeoJSON polygon if available
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