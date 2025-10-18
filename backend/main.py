from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
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
# Import market analyzer
# Import comprehensive market analyzer
from comprehensive_market_analyzer import analyze_market_comprehensive_api
# Import competitor finder function
from competitors import find_competitors_api
# Import pitch deck generator function
from pitch_deck import generate_pitch_deck_api

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

# Pydantic models for competitor endpoint
class CompetitorRequest(BaseModel):
    idea: str
    max_results: Optional[int] = 20
    include_coordinates: Optional[bool] = True

class Competitor(BaseModel):
    company_name: str
    location: str
    links: List[str]
    date_founded: str
    coordinates: Optional[Coordinates] = None
    threat_score: int

class CompetitorResponse(BaseModel):
    success: bool
    domain: str
    total_found: int
    competitors: List[Competitor]
    timestamp: str
    summary: Dict

# Pydantic models for pitch deck endpoint
class PitchDeckRequest(BaseModel):
    idea: str

class PitchDeckSlide(BaseModel):
    title: str
    bullets: List[str]

class PitchDeckResponse(BaseModel):
    success: bool
    company_name: str
    tagline: str
    slides: List[PitchDeckSlide]
    json_file: str
    pptx_file: Optional[str] = None
    timestamp: str

@app.get("/")
async def root():
    return {
        "message": "Startup Sonar API", 
        "version": "1.0.0",
        "endpoints": {
            "/audience-map": "Generate GeoJSON heatmap of target audience locations",
            "/find-cofounders": "Find potential cofounders for your startup idea",
            "/find-vcs": "Find venture capitalists and investors for your startup",
            "/find-competitors": "Find competing companies in your market space",
            "/comprehensive-market-analysis": "Comprehensive market analysis with search trends and detailed insights",
            "/generate-pitch-deck": "Generate investor pitch deck for your startup idea"
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

@app.post("/find-competitors", response_model=CompetitorResponse)
async def find_competitors(request: CompetitorRequest):
    """
    Find competing companies based on startup domain/idea
    
    Parameters:
    - idea: Your startup domain or idea (e.g., "AI for legal technology")
    - max_results: Maximum number of results to return (default: 20)
    - include_coordinates: Whether to geocode locations (default: true)
    
    Returns:
    - JSON with list of competitors, sorted by threat score
    """
    try:
        domain = request.idea.strip()
        if not domain:
            raise HTTPException(status_code=400, detail="Idea/domain cannot be empty")
        
        # Call the competitor finder
        result = await find_competitors_api(
            domain=domain,
            max_results=request.max_results,
            include_coordinates=request.include_coordinates
        )
        
        return CompetitorResponse(
            success=True,
            domain=domain,
            total_found=result["total_found"],
            competitors=result["competitors"],
            timestamp=datetime.now().isoformat(),
            summary=result["summary"]
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding competitors: {str(e)}")


# Pydantic models for comprehensive market analysis endpoint
class ComprehensiveMarketAnalysisRequest(BaseModel):
    user_prompt: str
    region: Optional[str] = ""

class ComprehensiveMarketAnalysisResponse(BaseModel):
    success: bool
    user_prompt: str
    region: str
    industry_keywords_extracted: List[str]
    google_trends_data: Dict
    comprehensive_analysis: Dict
    timestamp: str
    analysis_type: str


@app.post("/comprehensive-market-analysis", response_model=ComprehensiveMarketAnalysisResponse)
async def comprehensive_market_analysis(request: ComprehensiveMarketAnalysisRequest):
    """
    Comprehensive market analysis with search trends and detailed insights
    
    Parameters:
    - user_prompt: Your startup idea (e.g., "I am making a healthcare startup")
    - region: Optional region code (e.g., "US", "UK", "CA") for localized trends
    
    Returns:
    - JSON with comprehensive market analysis including search trends, market overview, competitive landscape, etc.
    """
    try:
        if not request.user_prompt.strip():
            raise HTTPException(status_code=400, detail="user_prompt cannot be empty")
        
        # Call the comprehensive market analyzer
        result = await analyze_market_comprehensive_api(request.user_prompt, request.region)
        
        return ComprehensiveMarketAnalysisResponse(
            success=True,
            user_prompt=result["user_prompt"],
            region=result["region"],
            industry_keywords_extracted=result["industry_keywords_extracted"],
            google_trends_data=result["google_trends_data"],
            comprehensive_analysis=result["comprehensive_analysis"],
            timestamp=result["timestamp"],
            analysis_type=result["analysis_type"]
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in comprehensive market analysis: {str(e)}")
@app.post("/generate-pitch-deck", response_model=PitchDeckResponse)
async def generate_pitch_deck_endpoint(request: PitchDeckRequest):
    """
    Generate a complete pitch deck PowerPoint presentation based on startup idea
    
    Parameters:
    - idea: Your startup domain or idea (e.g., "AI-powered legal technology platform")
    
    Returns:
    - JSON with pitch deck content, company name, tagline, and file paths
    """
    try:
        idea = request.idea.strip()
        if not idea:
            raise HTTPException(status_code=400, detail="Idea cannot be empty")
        
        # Call the pitch deck generator
        result = await generate_pitch_deck_api(startup_idea=idea)
        
        if not result.get('success'):
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to generate pitch deck: {result.get('error', 'Unknown error')}"
            )
        
        pitch_data = result.get('pitch_data', {})
        
        return PitchDeckResponse(
            success=True,
            company_name=pitch_data.get('company_name', 'Startup'),
            tagline=pitch_data.get('tagline', ''),
            slides=pitch_data.get('slides', []),
            json_file=result.get('json_file', ''),
            pptx_file=result.get('pptx_file'),
            timestamp=datetime.now().isoformat()
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating pitch deck: {str(e)}")

@app.get("/download-pitch-deck/{filename}")
async def download_pitch_deck(filename: str):
    """
    Download a generated pitch deck PowerPoint file
    
    Parameters:
    - filename: Name of the pitch deck file to download
    
    Returns:
    - PowerPoint file as a downloadable attachment
    """
    try:
        # Security: only allow downloading .pptx files from current directory
        if not filename.endswith('.pptx'):
            raise HTTPException(status_code=400, detail="Invalid file type")
        
        if '..' in filename or '/' in filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
        
        file_path = os.path.join(os.path.dirname(__file__), filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type='application/vnd.openxmlformats-officedocument.presentationml.presentation'
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading file: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)