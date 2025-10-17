import pytest
from unittest.mock import Mock, AsyncMock
from perplexity_client import Location


@pytest.fixture
def mock_location_data():
    """Fixture providing mock location data for testing"""
    return [
        {
            "name": "Shoreditch",
            "area_code": "E1",
            "borough": "Hackney",
            "country": "UK",
            "description": "Trendy tech hub with young professionals and startups",
            "target_audience_fit": "High concentration of tech workers and entrepreneurs",
            "fitness_score": 8.5
        },
        {
            "name": "Williamsburg",
            "area_code": "11211",
            "borough": "Brooklyn",
            "country": "US",
            "description": "Hip neighborhood with young professionals and creatives",
            "target_audience_fit": "Dense population of young urban professionals",
            "fitness_score": 8.0
        },
        {
            "name": "Islington",
            "area_code": "N1",
            "borough": "Islington",
            "country": "UK",
            "description": "Trendy neighbourhood with young professionals and cafes",
            "target_audience_fit": "High concentration of health-conscious young professionals",
            "fitness_score": 8.5
        }
    ]


@pytest.fixture
def mock_locations(mock_location_data):
    """Fixture providing Location objects for testing"""
    return [
        Location(
            name=loc["name"],
            area_code=loc["area_code"],
            borough=loc["borough"],
            country=loc["country"],
            description=loc["description"],
            target_audience_fit=loc["target_audience_fit"],
            fitness_score=loc["fitness_score"]
        )
        for loc in mock_location_data
    ]


@pytest.fixture
def mock_geocoded_results():
    """Fixture providing mock geocoding results"""
    return [
        {
            "lat": 51.5074,
            "lng": -0.1278,
            "display_name": "Shoreditch, London, UK",
            "address": {
                "city": "London",
                "country": "United Kingdom"
            },
            "success": True
        },
        {
            "lat": 40.7128,
            "lng": -74.0060,
            "display_name": "Williamsburg, Brooklyn, NY, USA",
            "address": {
                "city": "New York",
                "country": "United States"
            },
            "success": True
        },
        {
            "lat": 51.5074,
            "lng": -0.1278,
            "display_name": "Islington, London, UK",
            "address": {
                "city": "London",
                "country": "United Kingdom"
            },
            "success": True
        }
    ]


@pytest.fixture
def mock_geojson():
    """Fixture providing mock GeoJSON data"""
    return {
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


@pytest.fixture
def mock_empty_geojson():
    """Fixture providing empty GeoJSON data"""
    return {
        "type": "FeatureCollection",
        "features": [],
        "metadata": {
            "total_locations": 0,
            "error": "No locations found or error occurred"
        }
    }


@pytest.fixture
def mock_perplexity_response():
    """Fixture providing mock Perplexity API response"""
    return {
        "choices": [
            {
                "message": {
                    "content": """
                    Here are some locations that match your criteria:
                    
                    [
                        {
                            "name": "Shoreditch",
                            "area_code": "E1",
                            "borough": "Hackney",
                            "country": "UK",
                            "description": "Trendy tech hub with young professionals and startups",
                            "target_audience_fit": "High concentration of tech workers and entrepreneurs",
                            "fitness_score": 8.5
                        },
                        {
                            "name": "Williamsburg",
                            "area_code": "11211",
                            "borough": "Brooklyn",
                            "country": "US",
                            "description": "Hip neighborhood with young professionals and creatives",
                            "target_audience_fit": "Dense population of young urban professionals",
                            "fitness_score": 8.0
                        }
                    ]
                    
                    These locations have high concentrations of your target audience.
                    """
                }
            }
        ]
    }


@pytest.fixture
def mock_geocoding_response():
    """Fixture providing mock geocoding API response"""
    return [
        {
            "lat": "51.5074",
            "lon": "-0.1278",
            "display_name": "Shoreditch, London, Greater London, England, United Kingdom",
            "address": {
                "city": "London",
                "country": "United Kingdom"
            }
        },
        {
            "lat": "40.7128",
            "lon": "-74.0060",
            "display_name": "Williamsburg, Brooklyn, New York, NY, USA",
            "address": {
                "city": "New York",
                "country": "United States"
            }
        }
    ]


@pytest.fixture
def mock_perplexity_client():
    """Fixture providing a mock PerplexityAudienceAnalyzer"""
    mock_client = Mock()
    mock_client.find_target_locations = AsyncMock()
    return mock_client


@pytest.fixture
def mock_geocoder():
    """Fixture providing a mock InternationalGeocoder"""
    mock_geocoder = Mock()
    mock_geocoder.geocode_location = AsyncMock()
    mock_geocoder.geocode_multiple = AsyncMock()
    return mock_geocoder


@pytest.fixture
def mock_pipeline():
    """Fixture providing a mock GeoJSONPipeline"""
    mock_pipeline = Mock()
    mock_pipeline.generate_audience_map = AsyncMock()
    mock_pipeline.generate_heatmap_data = AsyncMock()
    return mock_pipeline


@pytest.fixture
def sample_query_params():
    """Fixture providing sample query parameters"""
    return {
        "startup_idea": "A fitness app for young professionals",
        "target_description": "Health-conscious millennials who work out regularly",
        "region": "global",
        "country": None
    }


@pytest.fixture
def sample_query_params_with_country():
    """Fixture providing sample query parameters with country filter"""
    return {
        "startup_idea": "A fitness app for young professionals",
        "target_description": "Health-conscious millennials who work out regularly",
        "region": "global",
        "country": "UK"
    }


@pytest.fixture
def fallback_coordinates():
    """Fixture providing fallback coordinates for different countries"""
    return {
        "US": {"lat": 40.7128, "lng": -74.0060, "display_name": "New York, NY, USA"},
        "UK": {"lat": 51.5074, "lng": -0.1278, "display_name": "London, UK"},
        "CA": {"lat": 43.6532, "lng": -79.3832, "display_name": "Toronto, ON, Canada"},
        "AU": {"lat": -33.8688, "lng": 151.2093, "display_name": "Sydney, NSW, Australia"},
        "DE": {"lat": 52.5200, "lng": 13.4050, "display_name": "Berlin, Germany"},
        "FR": {"lat": 48.8566, "lng": 2.3522, "display_name": "Paris, France"},
        "JP": {"lat": 35.6762, "lng": 139.6503, "display_name": "Tokyo, Japan"},
        "IN": {"lat": 19.0760, "lng": 72.8777, "display_name": "Mumbai, India"},
        "BR": {"lat": -23.5505, "lng": -46.6333, "display_name": "São Paulo, Brazil"}
    }


@pytest.fixture
def mock_httpx_response():
    """Fixture providing mock httpx response"""
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = [
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
    return mock_response


@pytest.fixture
def mock_httpx_error_response():
    """Fixture providing mock httpx error response"""
    mock_response = Mock()
    mock_response.status_code = 500
    mock_response.json.return_value = {"error": "Internal server error"}
    return mock_response


@pytest.fixture
def mock_httpx_empty_response():
    """Fixture providing mock httpx empty response"""
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = []
    return mock_response


@pytest.fixture
def test_startup_ideas():
    """Fixture providing various test startup ideas"""
    return [
        "A fitness app for young professionals",
        "An AI-powered meal planning service",
        "A sustainable fashion marketplace",
        "A mental health support platform",
        "A remote work productivity tool",
        "A language learning app for travelers",
        "A pet care service marketplace",
        "A home automation platform",
        "A financial planning app for millennials",
        "A social networking platform for professionals"
    ]


@pytest.fixture
def test_target_audiences():
    """Fixture providing various test target audiences"""
    return [
        "Health-conscious millennials who work out regularly",
        "Busy professionals who want convenient meal solutions",
        "Environmentally conscious consumers aged 25-40",
        "People struggling with mental health issues",
        "Remote workers and digital nomads",
        "Travelers and language learners",
        "Pet owners who need reliable care services",
        "Tech-savvy homeowners",
        "Young adults looking to build wealth",
        "Business professionals seeking networking opportunities"
    ]


@pytest.fixture
def test_countries():
    """Fixture providing test country codes"""
    return ["US", "UK", "CA", "AU", "DE", "FR", "JP", "IN", "BR", "ES", "IT", "NL"]


@pytest.fixture
def test_regions():
    """Fixture providing test regions"""
    return ["global", "london", "new_york", "san_francisco", "berlin", "paris", "tokyo"]


@pytest.fixture
def mock_api_error():
    """Fixture providing mock API error"""
    return Exception("API request failed")


@pytest.fixture
def mock_network_error():
    """Fixture providing mock network error"""
    import httpx
    return httpx.RequestError("Network connection failed")


@pytest.fixture
def mock_timeout_error():
    """Fixture providing mock timeout error"""
    import httpx
    return httpx.TimeoutException("Request timeout")
