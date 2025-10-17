import pytest
from unittest.mock import Mock, AsyncMock, patch
from geojson_generator import GeoJSONPipeline
from perplexity_client import Location


class TestGeoJSONPipeline:
    """Test cases for GeoJSONPipeline class"""
    
    def setup_method(self):
        """Set up test fixtures before each test method"""
        self.mock_perplexity = Mock()
        self.mock_geocoder = Mock()
        self.pipeline = GeoJSONPipeline(self.mock_perplexity, self.mock_geocoder)
    
    @pytest.mark.asyncio
    async def test_generate_audience_map_success(self):
        """Test successful audience map generation"""
        # Mock locations from Perplexity
        mock_locations = [
            Location(
                name="Shoreditch",
                area_code="E1",
                borough="Hackney",
                country="UK",
                description="Trendy tech hub",
                target_audience_fit="High concentration of tech workers",
                fitness_score=8.5
            ),
            Location(
                name="Williamsburg",
                area_code="11211",
                borough="Brooklyn",
                country="US",
                description="Hip neighborhood",
                target_audience_fit="Young professionals",
                fitness_score=8.0
            )
        ]
        
        # Mock geocoding results
        mock_geocoded_results = [
            {
                "lat": 51.5074,
                "lng": -0.1278,
                "display_name": "Shoreditch, London, UK",
                "address": {"city": "London"},
                "success": True
            },
            {
                "lat": 40.7128,
                "lng": -74.0060,
                "display_name": "Williamsburg, Brooklyn, NY, USA",
                "address": {"city": "New York"},
                "success": True
            }
        ]
        
        # Configure mocks
        self.mock_perplexity.find_target_locations = AsyncMock(return_value=mock_locations)
        self.mock_geocoder.geocode_multiple = AsyncMock(return_value=mock_geocoded_results)
        
        query_params = {
            "startup_idea": "A fitness app for young professionals",
            "target_description": "Health-conscious millennials",
            "region": "global",
            "country": None
        }
        
        result = await self.pipeline.generate_audience_map(query_params)
        
        # Assertions
        assert result["type"] == "FeatureCollection"
        assert len(result["features"]) == 2
        assert "metadata" in result
        
        # Check first feature
        first_feature = result["features"][0]
        assert first_feature["type"] == "Feature"
        assert first_feature["geometry"]["type"] == "Point"
        assert first_feature["geometry"]["coordinates"] == [-0.1278, 51.5074]
        assert first_feature["properties"]["name"] == "Shoreditch"
        assert first_feature["properties"]["weight"] == 8.5
        
        # Check metadata
        metadata = result["metadata"]
        assert metadata["total_locations"] == 2
        assert metadata["query_params"] == query_params
    
    @pytest.mark.asyncio
    async def test_generate_audience_map_no_locations(self):
        """Test audience map generation when no locations are found"""
        self.mock_perplexity.find_target_locations = AsyncMock(return_value=[])
        
        query_params = {
            "startup_idea": "Test business",
            "target_description": "Test audience",
            "region": "global"
        }
        
        result = await self.pipeline.generate_audience_map(query_params)
        
        # Should return empty GeoJSON
        assert result["type"] == "FeatureCollection"
        assert len(result["features"]) == 0
        assert result["metadata"]["total_locations"] == 0
        assert "error" in result["metadata"]
    
    @pytest.mark.asyncio
    async def test_generate_audience_map_geocoding_failure(self):
        """Test audience map generation when geocoding fails"""
        mock_locations = [
            Location(
                name="Test Location",
                area_code="12345",
                borough="Test Borough",
                country="US",
                description="Test description",
                target_audience_fit="Test fit",
                fitness_score=7.5
            )
        ]
        
        # Mock geocoding failure
        mock_geocoded_results = [
            {
                "lat": 0.0,
                "lng": 0.0,
                "display_name": "Unknown Location",
                "success": False
            }
        ]
        
        self.mock_perplexity.find_target_locations = AsyncMock(return_value=mock_locations)
        self.mock_geocoder.geocode_multiple = AsyncMock(return_value=mock_geocoded_results)
        
        query_params = {
            "startup_idea": "Test business",
            "target_description": "Test audience",
            "region": "global"
        }
        
        result = await self.pipeline.generate_audience_map(query_params)
        
        # Should still include the location even if geocoding failed
        assert result["type"] == "FeatureCollection"
        assert len(result["features"]) == 1
        assert result["features"][0]["geometry"]["coordinates"] == [0.0, 0.0]
    
    @pytest.mark.asyncio
    async def test_generate_audience_map_perplexity_error(self):
        """Test audience map generation when Perplexity API fails"""
        self.mock_perplexity.find_target_locations = AsyncMock(return_value=None)
        
        query_params = {
            "startup_idea": "Test business",
            "target_description": "Test audience",
            "region": "global"
        }
        
        result = await self.pipeline.generate_audience_map(query_params)
        
        # Should return empty GeoJSON
        assert result["type"] == "FeatureCollection"
        assert len(result["features"]) == 0
        assert result["metadata"]["total_locations"] == 0
    
    @pytest.mark.asyncio
    async def test_generate_audience_map_exception_handling(self):
        """Test audience map generation with exception handling"""
        self.mock_perplexity.find_target_locations = AsyncMock(side_effect=Exception("API Error"))
        
        query_params = {
            "startup_idea": "Test business",
            "target_description": "Test audience",
            "region": "global"
        }
        
        result = await self.pipeline.generate_audience_map(query_params)
        
        # Should return empty GeoJSON on exception
        assert result["type"] == "FeatureCollection"
        assert len(result["features"]) == 0
        assert result["metadata"]["total_locations"] == 0
    
    def test_create_empty_geojson(self):
        """Test creation of empty GeoJSON"""
        result = self.pipeline._create_empty_geojson()
        
        assert result["type"] == "FeatureCollection"
        assert len(result["features"]) == 0
        assert result["metadata"]["total_locations"] == 0
        assert "error" in result["metadata"]
    
    @pytest.mark.asyncio
    async def test_generate_heatmap_data(self):
        """Test heatmap data generation from GeoJSON"""
        geojson = {
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
                        "weight": 8.5,
                        "description": "Tech hub"
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
                        "weight": 7.0,
                        "description": "Hip neighborhood"
                    }
                }
            ]
        }
        
        result = await self.pipeline.generate_heatmap_data(geojson)
        
        assert result["type"] == "FeatureCollection"
        assert len(result["features"]) == 2
        
        # Check first heatmap feature
        first_feature = result["features"][0]
        assert first_feature["type"] == "Feature"
        assert first_feature["geometry"]["coordinates"] == [-0.1278, 51.5074]
        assert first_feature["properties"]["weight"] == 8.5
        assert first_feature["properties"]["name"] == "Shoreditch"
        assert first_feature["properties"]["description"] == "Tech hub"
    
    @pytest.mark.asyncio
    async def test_generate_heatmap_data_empty(self):
        """Test heatmap data generation with empty GeoJSON"""
        empty_geojson = {
            "type": "FeatureCollection",
            "features": []
        }
        
        result = await self.pipeline.generate_heatmap_data(empty_geojson)
        
        assert result["type"] == "FeatureCollection"
        assert len(result["features"]) == 0
    
    @pytest.mark.asyncio
    async def test_generate_heatmap_data_no_features(self):
        """Test heatmap data generation with no features key"""
        geojson_without_features = {
            "type": "FeatureCollection"
        }
        
        result = await self.pipeline.generate_heatmap_data(geojson_without_features)
        
        assert result["type"] == "FeatureCollection"
        assert len(result["features"]) == 0
    
    @pytest.mark.asyncio
    async def test_generate_audience_map_with_country_filter(self):
        """Test audience map generation with country filter"""
        mock_locations = [
            Location(
                name="London Location",
                area_code="SW1",
                borough="Westminster",
                country="UK",
                description="London location",
                target_audience_fit="Good fit",
                fitness_score=8.0
            )
        ]
        
        mock_geocoded_results = [
            {
                "lat": 51.5074,
                "lng": -0.1278,
                "display_name": "London, UK",
                "success": True
            }
        ]
        
        self.mock_perplexity.find_target_locations = AsyncMock(return_value=mock_locations)
        self.mock_geocoder.geocode_multiple = AsyncMock(return_value=mock_geocoded_results)
        
        query_params = {
            "startup_idea": "Test business",
            "target_description": "Test audience",
            "region": "global",
            "country": "UK"
        }
        
        result = await self.pipeline.generate_audience_map(query_params)
        
        # Verify that geocode_multiple was called with country code
        self.mock_geocoder.geocode_multiple.assert_called_once()
        call_args = self.mock_geocoder.geocode_multiple.call_args
        assert call_args.kwargs['country_code'] == "UK"  # country_code parameter
        
        assert result["type"] == "FeatureCollection"
        assert len(result["features"]) == 1
    
    @pytest.mark.asyncio
    async def test_generate_audience_map_mixed_geocoding_results(self):
        """Test audience map generation with mixed geocoding success/failure"""
        mock_locations = [
            Location(
                name="Successful Location",
                area_code="12345",
                borough="Test Borough",
                country="US",
                description="Successfully geocoded",
                target_audience_fit="Good fit",
                fitness_score=8.0
            ),
            Location(
                name="Failed Location",
                area_code="67890",
                borough="Another Borough",
                country="US",
                description="Failed geocoding",
                target_audience_fit="Good fit",
                fitness_score=7.0
            )
        ]
        
        # First location succeeds, second fails
        mock_geocoded_results = [
            {
                "lat": 40.7128,
                "lng": -74.0060,
                "display_name": "New York, NY, USA",
                "success": True
            },
            {
                "lat": 0.0,
                "lng": 0.0,
                "display_name": "Unknown",
                "success": False
            }
        ]
        
        self.mock_perplexity.find_target_locations = AsyncMock(return_value=mock_locations)
        self.mock_geocoder.geocode_multiple = AsyncMock(return_value=mock_geocoded_results)
        
        query_params = {
            "startup_idea": "Test business",
            "target_description": "Test audience",
            "region": "global"
        }
        
        result = await self.pipeline.generate_audience_map(query_params)
        
        # Should include both locations
        assert result["type"] == "FeatureCollection"
        assert len(result["features"]) == 2
        
        # Check that both features have coordinates (even if fallback)
        for feature in result["features"]:
            assert "coordinates" in feature["geometry"]
            assert len(feature["geometry"]["coordinates"]) == 2
