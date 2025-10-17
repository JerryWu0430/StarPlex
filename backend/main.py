from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
from datetime import datetime
from dotenv import load_dotenv
from perplexity_client import PerplexityAudienceAnalyzer
from geocoding import InternationalGeocoder
from geojson_generator import GeoJSONPipeline

# Import cofounder finder function
from cofounder import find_cofounders_api
# Import VC finder function
from vc import find_vcs_api

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

# Pydantic models for cofounder endpoint
class CofounderRequest(BaseModel):
    idea: str
    max_results: Optional[int] = 20
    include_coordinates: Optional[bool] = True

class Coordinates(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class Founder(BaseModel):
    name: str
    location: str
    links: List[str]
    coordinates: Optional[Coordinates] = None
    match_score: int

class CofounderResponse(BaseModel):
    success: bool
    domain: str
    total_found: int
    cofounders: List[Founder]
    timestamp: str
    summary: Dict

# Pydantic models for VC endpoint
class VCRequest(BaseModel):
    idea: str
    max_results: Optional[int] = 20
    include_coordinates: Optional[bool] = True

class VC(BaseModel):
    name: str
    firm: str
    location: str
    links: List[str]
    coordinates: Optional[Coordinates] = None
    match_score: int

class VCResponse(BaseModel):
    success: bool
    domain: str
    stage: str
    total_found: int
    vcs: List[VC]
    timestamp: str
    summary: Dict

@app.get("/")
async def root():
    return {
        "message": "Startup Sonar API", 
        "version": "1.0.0",
        "endpoints": {
            "/audience-map": "Generate GeoJSON heatmap of target audience locations",
            "/find-cofounders": "Find potential cofounders for your startup idea",
            "/find-vcs": "Find venture capitalists and investors for your startup"
        }
    }

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

@app.post("/find-cofounders", response_model=CofounderResponse)
async def find_cofounders(request: CofounderRequest):
    """
    Find potential cofounders based on startup domain/idea
    
    Parameters:
    - idea: Your startup domain or idea (e.g., "AI for legal technology")
    - max_results: Maximum number of results to return (default: 20)
    - include_coordinates: Whether to geocode locations (default: true)
    
    Returns:
    - JSON with list of cofounders, sorted by match score
    """
    try:
        domain = request.idea.strip()
        if not domain:
            raise HTTPException(status_code=400, detail="Idea/domain cannot be empty")
        
        # Call the cofounder finder
        result = await find_cofounders_api(
            domain=domain,
            max_results=request.max_results,
            include_coordinates=request.include_coordinates
        )
        
        return CofounderResponse(
            success=True,
            domain=domain,
            total_found=result["total_found"],
            cofounders=result["cofounders"],
            timestamp=datetime.now().isoformat(),
            summary=result["summary"]
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding cofounders: {str(e)}")

@app.post("/find-vcs", response_model=VCResponse)
async def find_vcs(request: VCRequest):
    """
    Find venture capitalists and investors based on startup domain/idea (seed stage only)
    
    Parameters:
    - idea: Your startup domain or idea (e.g., "AI for legal technology")
    - max_results: Maximum number of results to return (default: 20)
    - include_coordinates: Whether to geocode locations (default: true)
    
    Returns:
    - JSON with list of seed-stage VCs, sorted by match score
    """
    try:
        domain = request.idea.strip()
        if not domain:
            raise HTTPException(status_code=400, detail="Idea/domain cannot be empty")
        
        # Fixed to seed stage only
        stage = "seed"
        
        # Call the VC finder
        result = await find_vcs_api(
            domain=domain,
            stage=stage,
            max_results=request.max_results,
            include_coordinates=request.include_coordinates
        )
        
        return VCResponse(
            success=True,
            domain=domain,
            stage=result["stage"],
            total_found=result["total_found"],
            vcs=result["vcs"],
            timestamp=datetime.now().isoformat(),
            summary=result["summary"]
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding VCs: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)