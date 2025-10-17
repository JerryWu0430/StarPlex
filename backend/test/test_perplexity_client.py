import pytest
import json
from unittest.mock import Mock, patch, AsyncMock
from perplexity_client import PerplexityAudienceAnalyzer, Location


class TestPerplexityAudienceAnalyzer:
    """Test cases for PerplexityAudienceAnalyzer class"""
    
    def setup_method(self):
        """Set up test fixtures before each test method"""
        self.analyzer = PerplexityAudienceAnalyzer()
    
    def test_init(self):
        """Test PerplexityAudienceAnalyzer initialization"""
        assert hasattr(self.analyzer, 'client')
        assert self.analyzer.client is not None
    
    @pytest.mark.asyncio
    async def test_find_target_locations_success(self):
        """Test successful location finding with valid JSON response"""
        # Mock response data
        mock_locations_data = [
            {
                "name": "Shoreditch",
                "area_code": "E1",
                "borough": "Hackney",
                "country": "UK",
                "description": "Trendy tech hub with young professionals",
                "target_audience_fit": "High concentration of tech workers",
                "fitness_score": 8.5
            },
            {
                "name": "Williamsburg",
                "area_code": "11211",
                "borough": "Brooklyn",
                "country": "US",
                "description": "Hip neighborhood with young professionals",
                "target_audience_fit": "Dense population of young urban professionals",
                "fitness_score": 8.0
            }
        ]
        
        mock_response_content = f"""
        Here are some locations that match your criteria:
        
        {json.dumps(mock_locations_data)}
        
        These locations have high concentrations of your target audience.
        """
        
        # Mock the Perplexity client response
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = mock_response_content
        
        with patch.object(self.analyzer.client.chat.completions, 'create', return_value=mock_response):
            result = await self.analyzer.find_target_locations(
                business_type="A fitness app for young professionals",
                target_audience="Health-conscious millennials",
                region="global"
            )
        
        # Assertions
        assert isinstance(result, list)
        assert len(result) == 2
        assert all(isinstance(loc, Location) for loc in result)
        
        # Check first location
        first_loc = result[0]
        assert first_loc.name == "Shoreditch"
        assert first_loc.area_code == "E1"
        assert first_loc.borough == "Hackney"
        assert first_loc.country == "UK"
        assert first_loc.fitness_score == 8.5
    
    @pytest.mark.asyncio
    async def test_find_target_locations_invalid_json(self):
        """Test handling of invalid JSON response"""
        mock_response_content = "This is not valid JSON content"
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = mock_response_content
        
        with patch.object(self.analyzer.client.chat.completions, 'create', return_value=mock_response):
            result = await self.analyzer.find_target_locations(
                business_type="Test business",
                target_audience="Test audience",
                region="global"
            )
        
        # Should return error dict when JSON parsing fails
        assert isinstance(result, dict)
        assert "error" in result
    
    @pytest.mark.asyncio
    async def test_find_target_locations_api_error(self):
        """Test handling of API errors"""
        with patch.object(self.analyzer.client.chat.completions, 'create', side_effect=Exception("API Error")):
            result = await self.analyzer.find_target_locations(
                business_type="Test business",
                target_audience="Test audience",
                region="global"
            )
        
        # Should return error dict when API fails
        assert isinstance(result, dict)
        assert "error" in result
    
    @pytest.mark.asyncio
    async def test_find_target_locations_malformed_data(self):
        """Test handling of malformed location data"""
        mock_locations_data = [
            {
                "name": "Valid Location",
                "area_code": "12345",
                "borough": "Test Borough",
                "country": "US",
                "description": "A test location",
                "target_audience_fit": "Good fit",
                "fitness_score": 7.5
            },
            {
                # Missing required fields
                "name": "Invalid Location",
                "fitness_score": "not_a_number"  # Invalid type
            }
        ]
        
        mock_response_content = json.dumps(mock_locations_data)
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = mock_response_content
        
        with patch.object(self.analyzer.client.chat.completions, 'create', return_value=mock_response):
            result = await self.analyzer.find_target_locations(
                business_type="Test business",
                target_audience="Test audience",
                region="global"
            )
        
        # Should return only valid locations
        assert isinstance(result, list)
        assert len(result) == 1  # Only the valid location should be included
        assert result[0].name == "Valid Location"
    
    def test_location_model_validation(self):
        """Test Location model validation"""
        # Valid location
        valid_location = Location(
            name="Test Location",
            area_code="12345",
            borough="Test Borough",
            country="US",
            description="A test location",
            target_audience_fit="Good fit for target audience",
            fitness_score=8.5
        )
        
        assert valid_location.name == "Test Location"
        assert valid_location.fitness_score == 8.5
        
        # Test with invalid fitness score
        with pytest.raises(ValueError):
            Location(
                name="Test Location",
                area_code="12345",
                borough="Test Borough",
                country="US",
                description="A test location",
                target_audience_fit="Good fit for target audience",
                fitness_score="not_a_number"
            )
    
    @pytest.mark.asyncio
    async def test_caching_behavior(self):
        """Test that results are cached using lru_cache"""
        mock_locations_data = [
            {
                "name": "Cached Location",
                "area_code": "12345",
                "borough": "Test Borough",
                "country": "US",
                "description": "A cached test location",
                "target_audience_fit": "Good fit",
                "fitness_score": 8.0
            }
        ]
        
        mock_response_content = json.dumps(mock_locations_data)
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = mock_response_content
        
        with patch.object(self.analyzer.client.chat.completions, 'create', return_value=mock_response) as mock_create:
            # First call
            result1 = await self.analyzer.find_target_locations(
                business_type="Test business",
                target_audience="Test audience",
                region="global"
            )
            
            # Second call with same parameters
            result2 = await self.analyzer.find_target_locations(
                business_type="Test business",
                target_audience="Test audience",
                region="global"
            )
            
            # Should only call API once due to caching
            assert mock_create.call_count == 1
            assert result1 == result2
