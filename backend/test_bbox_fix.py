#!/usr/bin/env python3
"""
Test script to verify that bbox polygon generation creates appropriately sized areas
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from geojson_generator import GeoJSONPipeline
from geocoding import InternationalGeocoder
from perplexity_client import PerplexityAudienceAnalyzer, Location
import asyncio

async def test_bbox_sizing():
    """Test that bbox polygons are appropriately sized"""
    
    # Create mock geocoder and perplexity client
    geocoder = InternationalGeocoder()
    perplexity = PerplexityAudienceAnalyzer("test-key")
    pipeline = GeoJSONPipeline(perplexity, geocoder)
    
    # Test with a location that should have a bbox (Palo Alto)
    test_locations = [
        Location(
            name="Palo Alto",
            area_code="94301",
            borough="Santa Clara County",
            country="USA",
            description="Test location for bbox sizing",
            target_audience_fit="Test fit",
            fitness_score=4.5
        )
    ]
    
    # Mock the perplexity client to return our test location
    async def mock_find_target_locations(business_type, target_audience, region):
        return test_locations
    
    pipeline.perplexity.find_target_locations = mock_find_target_locations
    
    # Test the pipeline
    query_params = {
        "startup_idea": "Test startup",
        "target_description": "Test audience",
        "region": "global"
    }
    
    result = await pipeline.generate_audience_map(query_params)
    
    print("Generated GeoJSON features:")
    for i, feature in enumerate(result.get("features", [])):
        if feature.get("properties", {}).get("feature_type") == "polygon":
            coords = feature["geometry"]["coordinates"][0]
            print(f"Feature {i}: {feature['properties']['name']}")
            print(f"  Polygon coordinates: {coords}")
            
            # Calculate the bounding box of the generated polygon
            lats = [coord[1] for coord in coords]
            lons = [coord[0] for coord in coords]
            min_lat, max_lat = min(lats), max(lats)
            min_lon, max_lon = min(lons), max(lons)
            
            lat_range = max_lat - min_lat
            lon_range = max_lon - min_lon
            
            print(f"  Generated bbox size: {lat_range:.6f} x {lon_range:.6f} degrees")
            print(f"  This is approximately {lat_range * 111:.1f}km x {lon_range * 111:.1f}km")
            print()

if __name__ == "__main__":
    asyncio.run(test_bbox_sizing())
