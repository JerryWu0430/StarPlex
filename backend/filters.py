from perplexity_client import PerplexityAudienceAnalyzer
from geocoding import InternationalGeocoder
from geojson_generator import GeoJSONPipeline

class MapFilters:
    def __init__(self):
        self.perplexity = PerplexityAudienceAnalyzer()
        self.geocoder = InternationalGeocoder()
        self.pipeline = GeoJSONPipeline(self.perplexity, self.geocoder)
    
    async def get_audience_map(self, startup_idea: str, target_audience: str, region: str = "global", country: str = None):
        """Get audience map using the complete pipeline"""
        query_params = {
            "startup_idea": startup_idea,
            "target_description": target_audience,
            "region": region,
            "country": country
        }
        return await self.pipeline.generate_audience_map(query_params)