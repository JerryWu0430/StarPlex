import pytest
from unittest.mock import Mock, AsyncMock, patch
from filters import MapFilters


class TestMapFilters:
    """Test cases for MapFilters class"""
    
    def setup_method(self):
        """Set up test fixtures before each test method"""
        with patch('filters.PerplexityAudienceAnalyzer'), \
             patch('filters.InternationalGeocoder'), \
             patch('filters.GeoJSONPipeline'):
            self.filters = MapFilters()
    
    @pytest.mark.asyncio
    async def test_get_audience_map_success(self):
        """Test successful audience map retrieval"""
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
        
        # Mock the pipeline's generate_audience_map method
        self.filters.pipeline.generate_audience_map = AsyncMock(return_value=mock_geojson)
        
        result = await self.filters.get_audience_map(
            startup_idea="A fitness app for young professionals",
            target_audience="Health-conscious millennials",
            region="global",
            country="UK"
        )
        
        # Verify the result
        assert result == mock_geojson
        assert result["type"] == "FeatureCollection"
        assert len(result["features"]) == 1
        
        # Verify that generate_audience_map was called with correct parameters
        self.filters.pipeline.generate_audience_map.assert_called_once()
        call_args = self.filters.pipeline.generate_audience_map.call_args[0][0]
        assert call_args["startup_idea"] == "A fitness app for young professionals"
        assert call_args["target_description"] == "Health-conscious millennials"
        assert call_args["region"] == "global"
        assert call_args["country"] == "UK"
    
    @pytest.mark.asyncio
    async def test_get_audience_map_default_parameters(self):
        """Test audience map retrieval with default parameters"""
        mock_geojson = {
            "type": "FeatureCollection",
            "features": [],
            "metadata": {"total_locations": 0}
        }
        
        self.filters.pipeline.generate_audience_map = AsyncMock(return_value=mock_geojson)
        
        result = await self.filters.get_audience_map(
            startup_idea="Test business",
            target_audience="Test audience"
        )
        
        # Verify default parameters
        call_args = self.filters.pipeline.generate_audience_map.call_args[0][0]
        assert call_args["startup_idea"] == "Test business"
        assert call_args["target_description"] == "Test audience"
        assert call_args["region"] == "global"
        assert call_args["country"] is None
    
    @pytest.mark.asyncio
    async def test_get_audience_map_with_region(self):
        """Test audience map retrieval with specific region"""
        mock_geojson = {
            "type": "FeatureCollection",
            "features": [],
            "metadata": {"total_locations": 0}
        }
        
        self.filters.pipeline.generate_audience_map = AsyncMock(return_value=mock_geojson)
        
        result = await self.filters.get_audience_map(
            startup_idea="Test business",
            target_audience="Test audience",
            region="london",
            country="UK"
        )
        
        # Verify region parameter
        call_args = self.filters.pipeline.generate_audience_map.call_args[0][0]
        assert call_args["region"] == "london"
        assert call_args["country"] == "UK"
    
    @pytest.mark.asyncio
    async def test_get_audience_map_pipeline_error(self):
        """Test audience map retrieval when pipeline fails"""
        # Mock pipeline to raise an exception
        self.filters.pipeline.generate_audience_map = AsyncMock(side_effect=Exception("Pipeline error"))
        
        with pytest.raises(Exception, match="Pipeline error"):
            await self.filters.get_audience_map(
                startup_idea="Test business",
                target_audience="Test audience"
            )
    
    @pytest.mark.asyncio
    async def test_get_audience_map_empty_result(self):
        """Test audience map retrieval with empty result"""
        empty_geojson = {
            "type": "FeatureCollection",
            "features": [],
            "metadata": {
                "total_locations": 0,
                "error": "No locations found"
            }
        }
        
        self.filters.pipeline.generate_audience_map = AsyncMock(return_value=empty_geojson)
        
        result = await self.filters.get_audience_map(
            startup_idea="Test business",
            target_audience="Test audience"
        )
        
        assert result["type"] == "FeatureCollection"
        assert len(result["features"]) == 0
        assert result["metadata"]["total_locations"] == 0
        assert "error" in result["metadata"]
    
    def test_init(self):
        """Test MapFilters initialization"""
        with patch('filters.PerplexityAudienceAnalyzer') as mock_perplexity, \
             patch('filters.InternationalGeocoder') as mock_geocoder, \
             patch('filters.GeoJSONPipeline') as mock_pipeline:
            
            filters = MapFilters()
            
            # Verify that all components are initialized
            assert hasattr(filters, 'perplexity')
            assert hasattr(filters, 'geocoder')
            assert hasattr(filters, 'pipeline')
            
            # Verify that GeoJSONPipeline was called with the right arguments
            mock_pipeline.assert_called_once_with(mock_perplexity.return_value, mock_geocoder.return_value)
    
    @pytest.mark.asyncio
    async def test_get_audience_map_parameter_passing(self):
        """Test that all parameters are correctly passed to the pipeline"""
        mock_geojson = {
            "type": "FeatureCollection",
            "features": [],
            "metadata": {"total_locations": 0}
        }
        
        self.filters.pipeline.generate_audience_map = AsyncMock(return_value=mock_geojson)
        
        # Test with all parameters
        await self.filters.get_audience_map(
            startup_idea="Custom startup idea",
            target_audience="Custom target audience",
            region="custom_region",
            country="US"
        )
        
        # Verify all parameters were passed correctly
        call_args = self.filters.pipeline.generate_audience_map.call_args[0][0]
        expected_params = {
            "startup_idea": "Custom startup idea",
            "target_description": "Custom target audience",
            "region": "custom_region",
            "country": "US"
        }
        
        for key, value in expected_params.items():
            assert call_args[key] == value
    
    @pytest.mark.asyncio
    async def test_get_audience_map_string_parameters(self):
        """Test that string parameters are handled correctly"""
        mock_geojson = {
            "type": "FeatureCollection",
            "features": [],
            "metadata": {"total_locations": 0}
        }
        
        self.filters.pipeline.generate_audience_map = AsyncMock(return_value=mock_geojson)
        
        # Test with string parameters that might have special characters
        await self.filters.get_audience_map(
            startup_idea="A startup with special chars: @#$%",
            target_audience="Target with unicode: ñáéíóú",
            region="region-with-dashes",
            country="US"
        )
        
        call_args = self.filters.pipeline.generate_audience_map.call_args[0][0]
        assert call_args["startup_idea"] == "A startup with special chars: @#$%"
        assert call_args["target_description"] == "Target with unicode: ñáéíóú"
        assert call_args["region"] == "region-with-dashes"
        assert call_args["country"] == "US"
    
    @pytest.mark.asyncio
    async def test_get_audience_map_none_parameters(self):
        """Test handling of None parameters"""
        mock_geojson = {
            "type": "FeatureCollection",
            "features": [],
            "metadata": {"total_locations": 0}
        }
        
        self.filters.pipeline.generate_audience_map = AsyncMock(return_value=mock_geojson)
        
        # Test with None for optional parameters
        await self.filters.get_audience_map(
            startup_idea="Test business",
            target_audience="Test audience",
            region=None,
            country=None
        )
        
        call_args = self.filters.pipeline.generate_audience_map.call_args[0][0]
        assert call_args["startup_idea"] == "Test business"
        assert call_args["target_description"] == "Test audience"
        assert call_args["region"] is None
        assert call_args["country"] is None
