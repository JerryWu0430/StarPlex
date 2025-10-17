import httpx
from typing import Optional, Dict
import asyncio

class InternationalGeocoder:
    def __init__(self):
        self.base_url = "https://nominatim.openstreetmap.org"
        # Nominatim requires User-Agent
        self.headers = {"User-Agent": "StartupSonar/1.0"}
        # Simple in-memory cache for async functions
        self._cache = {}

    async def geocode_location(self, location_query: str, country_code: str = None) -> Dict:
        """Geocode any location worldwide using Nominatim OpenStreetMap API"""
        # Check cache first
        cache_key = f"{location_query}:{country_code or 'None'}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "q": location_query,
                    "format": "jsonv2",  # Use jsonv2 format for better bounding box support
                    "limit": 1,
                    "addressdetails": 1,
                    "extratags": 1,  # Include additional information
                    "namedetails": 1  # Include name details
                }
                
                if country_code:
                    params["countrycodes"] = country_code
                
                response = await client.get(
                    self.base_url + "/search",
                    headers=self.headers,
                    params=params,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data and len(data) > 0:
                        result = data[0]
                        
                        # Parse bounding box from jsonv2 format
                        bbox = None
                        if "boundingbox" in result:
                            bbox_list = result["boundingbox"]
                            if len(bbox_list) == 4:
                                # boundingbox format: [min_lat, max_lat, min_lon, max_lon]
                                bbox = {
                                    "min_lat": float(bbox_list[0]),
                                    "max_lat": float(bbox_list[1]),
                                    "min_lon": float(bbox_list[2]),
                                    "max_lon": float(bbox_list[3])
                                }
                        
                        geocoded_result = {
                            "lat": float(result["lat"]),
                            "lng": float(result["lon"]),
                            "display_name": result["display_name"],
                            "address": result.get("address", {}),
                            "success": True,
                            "bbox": bbox,
                            "boundingbox": result.get("boundingbox", []),  # Raw bounding box array
                            "place_id": result.get("place_id"),
                            "osm_type": result.get("osm_type"),
                            "osm_id": result.get("osm_id"),
                            "importance": result.get("importance"),
                            "class": result.get("class"),
                            "type": result.get("type")
                        }
                        # Cache the result
                        self._cache[cache_key] = geocoded_result
                        return geocoded_result
                
                # Fallback: return default coordinates for the country
                fallback_result = self._get_fallback_coordinates(country_code)
                # Cache the fallback result too
                self._cache[cache_key] = fallback_result
                return fallback_result
                
        except Exception as e:
            print(f"Geocoding error for '{location_query}': {e}")
            fallback_result = self._get_fallback_coordinates(country_code)
            # Cache the fallback result
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
        
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "q": area_query,
                    "format": "jsonv2",
                    "limit": 1,
                    "addressdetails": 1,
                    "extratags": 1,
                    "namedetails": 1,
                    "polygon_geojson": 1,  # Request GeoJSON polygon for areas
                    "polygon_threshold": 0.0  # Get detailed polygon
                }
                
                if country_code:
                    params["countrycodes"] = country_code
                
                response = await client.get(
                    self.base_url + "/search",
                    headers=self.headers,
                    params=params,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data and len(data) > 0:
                        result = data[0]
                        
                        # Parse bounding box
                        bbox = None
                        if "boundingbox" in result:
                            bbox_list = result["boundingbox"]
                            if len(bbox_list) == 4:
                                bbox = {
                                    "min_lat": float(bbox_list[0]),
                                    "max_lat": float(bbox_list[1]),
                                    "min_lon": float(bbox_list[2]),
                                    "max_lon": float(bbox_list[3])
                                }
                        
                        area_result = {
                            "lat": float(result["lat"]),
                            "lng": float(result["lon"]),
                            "display_name": result["display_name"],
                            "address": result.get("address", {}),
                            "success": True,
                            "bbox": bbox,
                            "boundingbox": result.get("boundingbox", []),
                            "place_id": result.get("place_id"),
                            "osm_type": result.get("osm_type"),
                            "osm_id": result.get("osm_id"),
                            "importance": result.get("importance"),
                            "class": result.get("class"),
                            "type": result.get("type"),
                            "geojson": result.get("geojson")  # GeoJSON polygon if available
                        }
                        
                        self._cache[cache_key] = area_result
                        return area_result
                
                # Fallback
                fallback_result = self._get_fallback_coordinates(country_code)
                self._cache[cache_key] = fallback_result
                return fallback_result
                
        except Exception as e:
            print(f"Area geocoding error for '{area_query}': {e}")
            fallback_result = self._get_fallback_coordinates(country_code)
            self._cache[cache_key] = fallback_result
            return fallback_result

    async def geocode_multiple(self, locations: list, country_code: str = None) -> list:
        """Geocode multiple locations in parallel"""
        tasks = [self.geocode_location(loc, country_code) for loc in locations]
        return await asyncio.gather(*tasks)
