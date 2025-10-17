import pytest
import httpx
from unittest.mock import Mock, patch, AsyncMock
from geocoding import InternationalGeocoder


class TestInternationalGeocoder:
    """Test cases for InternationalGeocoder class"""
    
    def setup_method(self):
        """Set up test fixtures before each test method"""
        self.geocoder = InternationalGeocoder()
    
    def test_init(self):
        """Test InternationalGeocoder initialization"""
        assert self.geocoder.base_url == "https://nominatim.openstreetmap.org"
        assert "User-Agent" in self.geocoder.headers
        assert self.geocoder.headers["User-Agent"] == "StartupSonar/1.0"
    
    @pytest.mark.asyncio
    async def test_geocode_location_success(self):
        """Test successful geocoding of a location"""
        mock_response_data = [
            {
                "lat": "51.5074",
                "lon": "-0.1278",
                "display_name": "London, Greater London, England, United Kingdom",
                "address": {
                    "city": "London",
                    "country": "United Kingdom"
                }
            }
        ]
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.get.return_value = mock_response
            
            result = await self.geocoder.geocode_location("London, UK")
        
        assert result["success"] is True
        assert result["lat"] == 51.5074
        assert result["lng"] == -0.1278
        assert "London" in result["display_name"]
        assert "address" in result
    
    @pytest.mark.asyncio
    async def test_geocode_location_with_country_code(self):
        """Test geocoding with country code filter"""
        mock_response_data = [
            {
                "lat": "40.7128",
                "lon": "-74.0060",
                "display_name": "New York, NY, USA",
                "address": {
                    "city": "New York",
                    "country": "United States"
                }
            }
        ]
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.get.return_value = mock_response
            
            result = await self.geocoder.geocode_location("New York", country_code="US")
        
        assert result["success"] is True
        assert result["lat"] == 40.7128
        assert result["lng"] == -74.0060
    
    @pytest.mark.asyncio
    async def test_geocode_location_no_results(self):
        """Test geocoding when no results are found"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = []
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.get.return_value = mock_response
            
            result = await self.geocoder.geocode_location("Nonexistent City")
        
        # Should return fallback coordinates
        assert result["success"] is False
        assert "lat" in result
        assert "lng" in result
        assert "display_name" in result
    
    @pytest.mark.asyncio
    async def test_geocode_location_api_error(self):
        """Test geocoding when API returns error"""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.get.side_effect = httpx.RequestError("Network error")
            
            result = await self.geocoder.geocode_location("Test Location")
        
        # Should return fallback coordinates
        assert result["success"] is False
        assert "lat" in result
        assert "lng" in result
    
    @pytest.mark.asyncio
    async def test_geocode_location_timeout(self):
        """Test geocoding with timeout"""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.get.side_effect = httpx.TimeoutException("Request timeout")
            
            result = await self.geocoder.geocode_location("Test Location")
        
        # Should return fallback coordinates
        assert result["success"] is False
    
    def test_get_fallback_coordinates_with_country(self):
        """Test fallback coordinates for specific countries"""
        # Test US fallback
        us_fallback = self.geocoder._get_fallback_coordinates("US")
        assert us_fallback["lat"] == 40.7128
        assert us_fallback["lng"] == -74.0060
        assert "New York" in us_fallback["display_name"]
        assert us_fallback["success"] is False
        
        # Test UK fallback
        uk_fallback = self.geocoder._get_fallback_coordinates("UK")
        assert uk_fallback["lat"] == 51.5074
        assert uk_fallback["lng"] == -0.1278
        assert "London" in uk_fallback["display_name"]
        assert uk_fallback["success"] is False
        
        # Test unknown country
        unknown_fallback = self.geocoder._get_fallback_coordinates("XX")
        assert unknown_fallback["lat"] == 51.5074  # Default to London
        assert unknown_fallback["lng"] == -0.1278
        assert "London" in unknown_fallback["display_name"]
        assert unknown_fallback["success"] is False
    
    def test_get_fallback_coordinates_no_country(self):
        """Test fallback coordinates when no country specified"""
        fallback = self.geocoder._get_fallback_coordinates()
        assert fallback["lat"] == 51.5074  # Default to London
        assert fallback["lng"] == -0.1278
        assert "London" in fallback["display_name"]
        assert fallback["success"] is False
    
    @pytest.mark.asyncio
    async def test_geocode_multiple_locations(self):
        """Test geocoding multiple locations in parallel"""
        # Create different responses for different locations
        def mock_get_response(*args, **kwargs):
            mock_response = Mock()
            mock_response.status_code = 200
            
            # Check the query parameter to return different results
            params = kwargs.get('params', {})
            query = params.get('q', '')
            
            if 'London' in query:
                mock_response.json.return_value = [{
                    "lat": "51.5074",
                    "lon": "-0.1278",
                    "display_name": "London, UK",
                    "address": {"city": "London"}
                }]
            elif 'New York' in query:
                mock_response.json.return_value = [{
                    "lat": "40.7128",
                    "lon": "-74.0060",
                    "display_name": "New York, NY, USA",
                    "address": {"city": "New York"}
                }]
            else:
                mock_response.json.return_value = []
            
            return mock_response
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.get.side_effect = mock_get_response
            
            locations = ["London, UK", "New York, USA"]
            results = await self.geocoder.geocode_multiple(locations)
        
        assert len(results) == 2
        assert results[0]["lat"] == 51.5074
        assert results[1]["lat"] == 40.7128
    
    @pytest.mark.asyncio
    async def test_geocode_multiple_with_country_code(self):
        """Test geocoding multiple locations with country code"""
        mock_response_data = [
            {
                "lat": "40.7128",
                "lon": "-74.0060",
                "display_name": "New York, NY, USA",
                "address": {"city": "New York"}
            }
        ]
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.get.return_value = mock_response
            
            locations = ["New York", "Los Angeles"]
            results = await self.geocoder.geocode_multiple(locations, country_code="US")
        
        assert len(results) == 2
        # Both should return the same result due to mocking
        assert results[0]["lat"] == 40.7128
        assert results[1]["lat"] == 40.7128
    
    @pytest.mark.asyncio
    async def test_caching_behavior(self):
        """Test that geocoding results are cached"""
        mock_response_data = [
            {
                "lat": "51.5074",
                "lon": "-0.1278",
                "display_name": "London, UK",
                "address": {"city": "London"}
            }
        ]
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.get.return_value = mock_response
            
            # First call
            result1 = await self.geocoder.geocode_location("London, UK")
            
            # Second call with same parameters
            result2 = await self.geocoder.geocode_location("London, UK")
            
            # Should only call API once due to caching
            assert mock_client.get.call_count == 1
            assert result1 == result2
    
    def test_fallback_coordinates_all_countries(self):
        """Test fallback coordinates for all supported countries"""
        countries = ["US", "UK", "CA", "AU", "DE", "FR", "JP", "IN", "BR"]
        
        for country in countries:
            fallback = self.geocoder._get_fallback_coordinates(country)
            assert "lat" in fallback
            assert "lng" in fallback
            assert "display_name" in fallback
            assert fallback["success"] is False
            assert isinstance(fallback["lat"], float)
            assert isinstance(fallback["lng"], float)
