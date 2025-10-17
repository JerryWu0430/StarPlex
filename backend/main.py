from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from perplexity_client import PerplexityAudienceAnalyzer
from geocoding import InternationalGeocoder
from geojson_generator import GeoJSONPipeline

# Load environment variables
load_dotenv()

app = FastAPI(title="Startup Sonar API", version="1.0.0")

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

perplexity_client = PerplexityAudienceAnalyzer()
geocoder = InternationalGeocoder()
pipeline = GeoJSONPipeline(perplexity_client, geocoder)

@app.get("/")
async def root():
    return {"message": "Startup Sonar API", "version": "1.0.0"}

@app.get("/audience-map")
async def get_audience_map(
    startup_idea: str = Query(
        default="An app that helps you find the best lunch deals in your area depending on your dietary restrictions and fitness goals",
        description="Description of your startup idea"
    ),
    target_description: str = Query(
        default="A fitness-conscious young professional who is looking for a healthy lunch deal near their workplace. They probably want something high protein and low carb.",
        description="Description of your target audience"
    ),
    country: str = Query(
        default=None,
        description="Country code to limit search (e.g., 'US', 'UK', 'CA')"
    )
):
    """
    Generate GeoJSON heatmap of locations with target audience
    
    Returns a GeoJSON FeatureCollection with locations that match your target audience,
    including demographic insights and fitness scores for visualization.
    """
    try:
        query_params = {
            "startup_idea": startup_idea,
            "target_description": target_description,
            "country": country
        }
        
        geojson = await pipeline.generate_audience_map(query_params)
        return geojson
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating audience map: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)