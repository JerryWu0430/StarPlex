from typing import Dict, List
from perplexity_client import PerplexityAudienceAnalyzer, Location
from geocoding import InternationalGeocoder
import asyncio

class GeoJSONPipeline:
    def __init__(self, perplexity_client: PerplexityAudienceAnalyzer, geocoder: InternationalGeocoder):
        self.perplexity = perplexity_client
        self.geocoder = geocoder

    async def generate_audience_map(self, query_params: dict) -> dict:
        """
        1. Query Perplexity for target locations
        2. Geocode all locations in parallel
        3. Build GeoJSON FeatureCollection
        4. Add heatmap weight properties
        """
        try:
            # Step 1: Get locations from Perplexity
            locations = await self.perplexity.find_target_locations(
                business_type=query_params.get("startup_idea", ""),
                target_audience=query_params.get("target_description", ""),
                region=query_params.get("region", "global")
            )
            
            if not locations:
                return self._create_empty_geojson()
            
            # Step 2: Geocode all locations in parallel
            location_queries = []
            for location in locations:
                # Create a search query combining name, borough, and country
                query = f"{location.name}, {location.borough}, {location.country}"
                location_queries.append(query)
            
            geocoded_results = await self.geocoder.geocode_multiple(
                location_queries,
                country_code=query_params.get("country")
            )
            
            # Step 3: Build GeoJSON FeatureCollection with bounding boxes
            features = []
            for i, location in enumerate(locations):
                if i < len(geocoded_results):
                    geocoded = geocoded_results[i]
                    
                    if geocoded.get("success", False) or geocoded.get("lat") is not None:
                        # Create point feature for heatmap visualization
                        point_feature = {
                            "type": "Feature",
                            "geometry": {
                                "type": "Point",
                                "coordinates": [geocoded["lng"], geocoded["lat"]]
                            },
                            "properties": {
                                "name": location.name,
                                "area_code": location.area_code,
                                "borough": location.borough,
                                "country": location.country,
                                "description": location.description,
                                "target_fit": location.target_audience_fit,
                                "weight": location.fitness_score,
                                "display_name": geocoded.get("display_name", location.name),
                                "bbox": geocoded.get("bbox"),
                                "center_lat": geocoded["lat"],
                                "center_lng": geocoded["lng"],
                                "feature_type": "point"
                            }
                        }
                        features.append(point_feature)
            
            return {
                "type": "FeatureCollection",
                "features": features,
                "metadata": {
                    "total_locations": len(features),
                    "query_params": query_params,
                    "generated_at": "2024-01-01T00:00:00Z"  # You could use datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            print(f"Error generating audience map: {e}")
            return self._create_empty_geojson()
    
    def _create_empty_geojson(self) -> dict:
        """Return empty GeoJSON when no locations are found"""
        return {
            "type": "FeatureCollection",
            "features": [],
            "metadata": {
                "total_locations": 0,
                "error": "No locations found or error occurred"
            }
        }
    
    async def generate_heatmap_data(self, geojson: dict) -> dict:
        """Convert GeoJSON to heatmap format for Mapbox"""
        if not geojson.get("features"):
            return {"type": "FeatureCollection", "features": []}
        
        heatmap_features = []
        for feature in geojson["features"]:
            properties = feature.get("properties", {})
            weight = properties.get("weight", 5.0)
            
            # Create heatmap point with weight
            heatmap_feature = {
                "type": "Feature",
                "geometry": feature["geometry"],
                "properties": {
                    "weight": weight,
                    "name": properties.get("name", ""),
                    "description": properties.get("description", "")
                }
            }
            heatmap_features.append(heatmap_feature)
        
        return {
            "type": "FeatureCollection",
            "features": heatmap_features
        }
