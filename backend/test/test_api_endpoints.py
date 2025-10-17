import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, AsyncMock, patch
from main import app


class TestAPIEndpoints:
    """Test cases for FastAPI endpoints"""
    
    def setup_method(self):
        """Set up test fixtures before each test method"""
        self.client = TestClient(app)
    
    def test_root_endpoint(self):
        """Test the root endpoint"""
        response = self.client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Startup Sonar API"
        assert data["version"] == "1.0.0"
    
    @patch('main.pipeline.generate_audience_map')
    def test_audience_map_endpoint_default_params(self, mock_generate):
        """Test audience map endpoint with default parameters"""
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
                        "weight": 8.5
                    }
                }
            ],
            "metadata": {
                "total_locations": 1
            }
        }
        
        mock_generate.return_value = mock_geojson
        
        response = self.client.get("/audience-map")
        
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) == 1
        
        # Verify default parameters were used
        mock_generate.assert_called_once()
        call_args = mock_generate.call_args[0][0]
        assert "An app that helps you find the best lunch deals" in call_args["startup_idea"]
        assert "fitness-conscious young professional" in call_args["target_description"]
        assert call_args["country"] is None
    
    @patch('main.pipeline.generate_audience_map')
    def test_audience_map_endpoint_custom_params(self, mock_generate):
        """Test audience map endpoint with custom parameters"""
        mock_geojson = {
            "type": "FeatureCollection",
            "features": [],
            "metadata": {"total_locations": 0}
        }
        
        mock_generate.return_value = mock_geojson
        
        response = self.client.get("/audience-map", params={
            "startup_idea": "A fitness tracking app for athletes",
            "target_description": "Professional athletes and fitness enthusiasts",
            "country": "US"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "FeatureCollection"
        
        # Verify custom parameters were used
        mock_generate.assert_called_once()
        call_args = mock_generate.call_args[0][0]
        assert call_args["startup_idea"] == "A fitness tracking app for athletes"
        assert call_args["target_description"] == "Professional athletes and fitness enthusiasts"
        assert call_args["country"] == "US"
    
    @patch('main.pipeline.generate_audience_map')
    def test_audience_map_endpoint_with_country_filter(self, mock_generate):
        """Test audience map endpoint with country filter"""
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
                        "weight": 8.0
                    }
                }
            ],
            "metadata": {"total_locations": 1}
        }
        
        mock_generate.return_value = mock_geojson
        
        response = self.client.get("/audience-map", params={
            "startup_idea": "A tech startup",
            "target_description": "Tech professionals",
            "country": "UK"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) == 1
        
        # Verify country parameter was passed
        call_args = mock_generate.call_args[0][0]
        assert call_args["country"] == "UK"
    
    @patch('main.pipeline.generate_audience_map')
    def test_audience_map_endpoint_empty_result(self, mock_generate):
        """Test audience map endpoint with empty result"""
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
    
    @patch('main.pipeline.generate_audience_map')
    def test_audience_map_endpoint_pipeline_error(self, mock_generate):
        """Test audience map endpoint when pipeline raises an error"""
        mock_generate.side_effect = Exception("Pipeline error")
        
        response = self.client.get("/audience-map")
        
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
        assert "Error generating audience map" in data["detail"]
        assert "Pipeline error" in data["detail"]
    
    @patch('main.pipeline.generate_audience_map')
    def test_audience_map_endpoint_unicode_params(self, mock_generate):
        """Test audience map endpoint with unicode parameters"""
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
    def test_audience_map_endpoint_special_characters(self, mock_generate):
        """Test audience map endpoint with special characters"""
        mock_geojson = {
            "type": "FeatureCollection",
            "features": [],
            "metadata": {"total_locations": 0}
        }
        
        mock_generate.return_value = mock_geojson
        
        response = self.client.get("/audience-map", params={
            "startup_idea": "A startup with special chars: @#$%^&*()",
            "target_description": "Target with symbols: !@#$%^&*()",
            "country": "US"
        })
        
        assert response.status_code == 200
        
        # Verify special characters were handled correctly
        call_args = mock_generate.call_args[0][0]
        assert call_args["startup_idea"] == "A startup with special chars: @#$%^&*()"
        assert call_args["target_description"] == "Target with symbols: !@#$%^&*()"
        assert call_args["country"] == "US"
    
    @patch('main.pipeline.generate_audience_map')
    def test_audience_map_endpoint_long_strings(self, mock_generate):
        """Test audience map endpoint with very long strings"""
        mock_geojson = {
            "type": "FeatureCollection",
            "features": [],
            "metadata": {"total_locations": 0}
        }
        
        mock_generate.return_value = mock_geojson
        
        long_startup_idea = "A" * 1000  # 1000 character string
        long_target_description = "B" * 1000  # 1000 character string
        
        response = self.client.get("/audience-map", params={
            "startup_idea": long_startup_idea,
            "target_description": long_target_description,
            "country": "US"
        })
        
        assert response.status_code == 200
        
        # Verify long strings were passed correctly
        call_args = mock_generate.call_args[0][0]
        assert len(call_args["startup_idea"]) == 1000
        assert len(call_args["target_description"]) == 1000
        assert call_args["country"] == "US"
    
    def test_audience_map_endpoint_missing_params(self):
        """Test audience map endpoint with missing optional parameters"""
        with patch('main.pipeline.generate_audience_map') as mock_generate:
            mock_geojson = {
                "type": "FeatureCollection",
                "features": [],
                "metadata": {"total_locations": 0}
            }
            mock_generate.return_value = mock_geojson
            
            # Test with only required parameters (using defaults)
            response = self.client.get("/audience-map")
            
            assert response.status_code == 200
            
            # Verify that defaults were used
            call_args = mock_generate.call_args[0][0]
            assert "startup_idea" in call_args
            assert "target_description" in call_args
            assert call_args["country"] is None
    
    @patch('main.pipeline.generate_audience_map')
    def test_audience_map_endpoint_response_structure(self, mock_generate):
        """Test that the response has the correct GeoJSON structure"""
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
                    "startup_idea": "Test idea",
                    "target_description": "Test audience"
                }
            }
        }
        
        mock_generate.return_value = mock_geojson
        
        response = self.client.get("/audience-map")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify GeoJSON structure
        assert data["type"] == "FeatureCollection"
        assert "features" in data
        assert "metadata" in data
        
        # Verify feature structure
        feature = data["features"][0]
        assert feature["type"] == "Feature"
        assert "geometry" in feature
        assert "properties" in feature
        
        # Verify geometry structure
        geometry = feature["geometry"]
        assert geometry["type"] == "Point"
        assert "coordinates" in geometry
        assert len(geometry["coordinates"]) == 2
        
        # Verify properties structure
        properties = feature["properties"]
        assert "name" in properties
        assert "weight" in properties
