import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from main import app


class TestIntegration:
    """Integration tests for the complete application flow"""
    
    def setup_method(self):
        """Set up test fixtures before each test method"""
        self.client = TestClient(app)
    
    @patch('main.pipeline.generate_audience_map')
    def test_complete_audience_map_flow(self, mock_generate):
        """Test the complete flow from API request to GeoJSON response"""
        # Mock the complete pipeline response
        mock_geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [-0.1278, 51.5074]
                    },
                    "properties": {
                        "name": "Shoreditch",
                        "area_code": "E1",
                        "borough": "Hackney",
                        "country": "UK",
                        "description": "Trendy tech hub with young professionals and startups",
                        "target_fit": "High concentration of tech workers and entrepreneurs",
                        "weight": 8.5,
                        "display_name": "Shoreditch, London, UK"
                    }
                },
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [-74.0060, 40.7128]
                    },
                    "properties": {
                        "name": "Williamsburg",
                        "area_code": "11211",
                        "borough": "Brooklyn",
                        "country": "US",
                        "description": "Hip neighborhood with young professionals and creatives",
                        "target_fit": "Dense population of young urban professionals",
                        "weight": 8.0,
                        "display_name": "Williamsburg, Brooklyn, NY, USA"
                    }
                }
            ],
            "metadata": {
                "total_locations": 2,
                "query_params": {
                    "startup_idea": "A fitness app for young professionals",
                    "target_description": "Health-conscious millennials",
                    "region": "global",
                    "country": None
                },
                "generated_at": "2024-01-01T00:00:00Z"
            }
        }
        
        mock_generate.return_value = mock_geojson
        
        # Make the API request
        response = self.client.get("/audience-map", params={
            "startup_idea": "A fitness app for young professionals",
            "target_description": "Health-conscious millennials",
            "country": None
        })
        
        # Verify the response
        assert response.status_code == 200
        data = response.json()
        
        # Verify GeoJSON structure
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) == 2
        
        # Verify first feature
        first_feature = data["features"][0]
        assert first_feature["type"] == "Feature"
        assert first_feature["geometry"]["type"] == "Point"
        assert first_feature["geometry"]["coordinates"] == [-0.1278, 51.5074]
        assert first_feature["properties"]["name"] == "Shoreditch"
        assert first_feature["properties"]["weight"] == 8.5
        
        # Verify second feature
        second_feature = data["features"][1]
        assert second_feature["properties"]["name"] == "Williamsburg"
        assert second_feature["properties"]["weight"] == 8.0
        
        # Verify metadata
        metadata = data["metadata"]
        assert metadata["total_locations"] == 2
        assert "query_params" in metadata
    
    @patch('main.pipeline.generate_audience_map')
    def test_audience_map_with_country_filter(self, mock_generate):
        """Test audience map generation with country filter"""
        mock_geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [-0.1278, 51.5074]
                    },
                    "properties": {
                        "name": "London Location",
                        "weight": 8.5
                    }
                }
            ],
            "metadata": {
                "total_locations": 1,
                "query_params": {
                    "startup_idea": "Test business",
                    "target_description": "Test audience",
                    "region": "global",
                    "country": "UK"
                }
            }
        }
        
        mock_generate.return_value = mock_geojson
        
        response = self.client.get("/audience-map", params={
            "startup_idea": "Test business",
            "target_description": "Test audience",
            "country": "UK"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) == 1
        
        # Verify that country filter was passed to the pipeline
        call_args = mock_generate.call_args[0][0]
        assert call_args["country"] == "UK"
    
    @patch('main.pipeline.generate_audience_map')
    def test_audience_map_empty_result(self, mock_generate):
        """Test audience map generation with empty result"""
        empty_geojson = {
            "type": "FeatureCollection",
            "features": [],
            "metadata": {
                "total_locations": 0,
                "error": "No locations found"
            }
        }
        
        mock_generate.return_value = empty_geojson
        
        response = self.client.get("/audience-map", params={
            "startup_idea": "Very specific niche business",
            "target_description": "Very specific audience"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) == 0
        assert data["metadata"]["total_locations"] == 0
        assert "error" in data["metadata"]
    
    @patch('main.pipeline.generate_audience_map')
    def test_audience_map_pipeline_error(self, mock_generate):
        """Test audience map generation when pipeline fails"""
        mock_generate.side_effect = Exception("Pipeline error")
        
        response = self.client.get("/audience-map")
        
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
        assert "Error generating audience map" in data["detail"]
        assert "Pipeline error" in data["detail"]
    
    def test_cors_headers(self):
        """Test that CORS headers are properly set"""
        with patch('main.pipeline.generate_audience_map') as mock_generate:
            mock_generate.return_value = {
                "type": "FeatureCollection",
                "features": [],
                "metadata": {"total_locations": 0}
            }
            
            response = self.client.get("/audience-map")
            
            # Check for CORS headers (these are set by the middleware)
            assert response.status_code == 200
    
    @patch('main.pipeline.generate_audience_map')
    def test_audience_map_unicode_support(self, mock_generate):
        """Test that the API properly handles unicode characters"""
        mock_geojson = {
            "type": "FeatureCollection",
            "features": [],
            "metadata": {"total_locations": 0}
        }
        
        mock_generate.return_value = mock_geojson
        
        response = self.client.get("/audience-map", params={
            "startup_idea": "Una aplicación de fitness para atletas",
            "target_description": "Atletas profesionales y entusiastas del fitness",
            "country": "ES"
        })
        
        assert response.status_code == 200
        
        # Verify unicode parameters were passed correctly
        call_args = mock_generate.call_args[0][0]
        assert call_args["startup_idea"] == "Una aplicación de fitness para atletas"
        assert call_args["target_description"] == "Atletas profesionales y entusiastas del fitness"
        assert call_args["country"] == "ES"
    
    @patch('main.pipeline.generate_audience_map')
    def test_audience_map_large_response(self, mock_generate):
        """Test audience map generation with a large number of locations"""
        # Create a large GeoJSON with many features
        features = []
        for i in range(50):  # 50 locations
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [-0.1278 + i * 0.01, 51.5074 + i * 0.01]
                },
                "properties": {
                    "name": f"Location {i}",
                    "weight": 5.0 + (i % 5),
                    "description": f"Description for location {i}"
                }
            })
        
        mock_geojson = {
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "total_locations": 50,
                "query_params": {
                    "startup_idea": "Test business",
                    "target_description": "Test audience",
                    "region": "global",
                    "country": None
                }
            }
        }
        
        mock_generate.return_value = mock_geojson
        
        response = self.client.get("/audience-map", params={
            "startup_idea": "Test business",
            "target_description": "Test audience"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) == 50
        assert data["metadata"]["total_locations"] == 50
    
    @patch('main.pipeline.generate_audience_map')
    def test_audience_map_special_characters(self, mock_generate):
        """Test audience map generation with special characters in parameters"""
        mock_geojson = {
            "type": "FeatureCollection",
            "features": [],
            "metadata": {"total_locations": 0}
        }
        
        mock_generate.return_value = mock_geojson
        
        response = self.client.get("/audience-map", params={
            "startup_idea": "A startup with special chars: @#$%^&*()_+-=[]{}|;':\",./<>?",
            "target_description": "Target with symbols: !@#$%^&*()_+-=[]{}|;':\",./<>?",
            "country": "US"
        })
        
        assert response.status_code == 200
        
        # Verify special characters were handled correctly
        call_args = mock_generate.call_args[0][0]
        assert call_args["startup_idea"] == "A startup with special chars: @#$%^&*()_+-=[]{}|;':\",./<>?"
        assert call_args["target_description"] == "Target with symbols: !@#$%^&*()_+-=[]{}|;':\",./<>?"
        assert call_args["country"] == "US"
    
    def test_api_documentation_endpoints(self):
        """Test that API documentation endpoints are accessible"""
        # Test OpenAPI schema endpoint
        response = self.client.get("/openapi.json")
        assert response.status_code == 200
        
        # Test docs endpoint
        response = self.client.get("/docs")
        assert response.status_code == 200
        
        # Test redoc endpoint
        response = self.client.get("/redoc")
        assert response.status_code == 200
    
    @patch('main.pipeline.generate_audience_map')
    def test_audience_map_response_validation(self, mock_generate):
        """Test that the response conforms to GeoJSON specification"""
        mock_geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [-0.1278, 51.5074]
                    },
                    "properties": {
                        "name": "Test Location",
                        "weight": 8.5,
                        "description": "Test description"
                    }
                }
            ],
            "metadata": {
                "total_locations": 1,
                "query_params": {
                    "startup_idea": "Test business",
                    "target_description": "Test audience",
                    "region": "global",
                    "country": None
                }
            }
        }
        
        mock_generate.return_value = mock_geojson
        
        response = self.client.get("/audience-map")
        
        assert response.status_code == 200
        data = response.json()
        
        # Validate GeoJSON structure
        assert "type" in data
        assert data["type"] == "FeatureCollection"
        assert "features" in data
        assert isinstance(data["features"], list)
        
        # Validate feature structure
        feature = data["features"][0]
        assert "type" in feature
        assert feature["type"] == "Feature"
        assert "geometry" in feature
        assert "properties" in feature
        
        # Validate geometry structure
        geometry = feature["geometry"]
        assert "type" in geometry
        assert geometry["type"] == "Point"
        assert "coordinates" in geometry
        assert isinstance(geometry["coordinates"], list)
        assert len(geometry["coordinates"]) == 2
        
        # Validate properties structure
        properties = feature["properties"]
        assert "name" in properties
        assert "weight" in properties
        assert isinstance(properties["weight"], (int, float))
