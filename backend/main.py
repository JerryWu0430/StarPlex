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
# Import chatbot assistant
from chatbot import chat_with_assistant

# Load environment variables
load_dotenv()

app = FastAPI(title="Startup Sonar API", version="1.0.0")

# CORS for React frontend
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://localhost:4000",
    "http://localhost:5173",
]

# Add production frontend URL if set
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)
    if frontend_url.endswith('/'):
        allowed_origins.append(frontend_url.rstrip('/'))
    else:
        allowed_origins.append(frontend_url + '/')

# Allow all Vercel preview and production deployments
allowed_origins.extend([
    "https://*.vercel.app",
    "https://starplex.vercel.app",
    "https://starplex-*.vercel.app",
])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=r"https://.*\.vercel\.app",
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

class FounderExplanation(BaseModel):
    why_good_match: Optional[List[str]] = []
    expertise: Optional[List[str]] = []
    unique_value: Optional[List[str]] = []

class Founder(BaseModel):
    name: str
    location: str
    links: List[str]
    coordinates: Optional[Coordinates] = None
    match_score: int
    explanation: Optional[FounderExplanation] = None

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

class VCExplanation(BaseModel):
    recent_investments: Optional[List[str]] = []
    investment_thesis: Optional[List[str]] = []
    how_to_pitch: Optional[List[str]] = []

class VC(BaseModel):
    name: str
    firm: str
    location: str
    links: List[str]
    coordinates: Optional[Coordinates] = None
    match_score: int
    explanation: Optional[VCExplanation] = None

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

class CompetitorExplanation(BaseModel):
    angle: Optional[List[str]] = []
    what_they_cover: Optional[List[str]] = []
    gaps: Optional[List[str]] = []

class Competitor(BaseModel):
    company_name: str
    location: str
    links: List[str]
    date_founded: str
    coordinates: Optional[Coordinates] = None
    threat_score: int
    explanation: Optional[CompetitorExplanation] = None

class CompetitorResponse(BaseModel):
    success: bool
    domain: str
    total_found: int
    competitors: List[Competitor]
    timestamp: str
    summary: Dict

# Pydantic models for audience map endpoint
class AudienceMapRequest(BaseModel):
    startup_idea: str

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

# Pydantic models for chatbot endpoint
class ChatRequest(BaseModel):
    business_idea: str
    message: str
    vcs: Optional[List[Dict]] = None
    cofounders: Optional[List[Dict]] = None
    competitors: Optional[List[Dict]] = None
    demographics: Optional[Dict] = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatResponse(BaseModel):
    success: bool
    response: str
    conversation_history: List[ChatMessage]

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
            "/extract-keywords": "Extract industry keywords and market analysis from startup idea",
            "/analyze-trends": "Analyze Google Trends for specific keywords and region",
            "/comprehensive-market-analysis": "Comprehensive market analysis with search trends and detailed insights",
            "/generate-pitch-deck": "Generate investor pitch deck for your startup idea",
            "/chat": "Chat with AI assistant about your startup idea"
        }
    }

@app.post("/audience-map")
async def get_audience_map(request: AudienceMapRequest):
    """
    Generate GeoJSON heatmap of locations with target audience
    
    Returns a GeoJSON FeatureCollection with locations that match your target audience,
    including demographic insights and fitness scores for visualization.
    """
    try:
        query_params = {
            "startup_idea": request.startup_idea,
            "target_description": f"Target audience for: {request.startup_idea}",
            "country": None
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


# Pydantic models for keyword extraction endpoint
class KeywordExtractionRequest(BaseModel):
    user_prompt: str

class KeywordExtractionResponse(BaseModel):
    success: bool
    user_prompt: str
    industry_keywords_extracted: List[str]
    market_analysis: Optional[Dict] = None
    timestamp: str

# Pydantic models for trends analysis endpoint
class TrendsAnalysisRequest(BaseModel):
    keywords: List[str]
    region: str

class TrendsAnalysisResponse(BaseModel):
    success: bool
    region: str
    keywords: List[str]
    google_trends_data: Dict
    timestamp: str

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


@app.post("/extract-keywords", response_model=KeywordExtractionResponse)
async def extract_keywords(request: KeywordExtractionRequest):
    """
    Extract industry keywords from startup idea using Perplexity
    
    Parameters:
    - user_prompt: Your startup idea (e.g., "I am making a healthcare startup")
    
    Returns:
    - JSON with extracted industry keywords and market analysis for Google Trends analysis
    """
    try:
        if not request.user_prompt.strip():
            raise HTTPException(status_code=400, detail="user_prompt cannot be empty")
        
        # Import the analyzer
        from comprehensive_market_analyzer import ComprehensiveMarketAnalyzer
        
        # Extract keywords and get market analysis
        analyzer = ComprehensiveMarketAnalyzer()
        async with analyzer:
            keywords = await analyzer.extract_industry_keywords(request.user_prompt)
            
            # Get market analysis (AI-proof score and market cap) - done once per industry
            market_analysis = await analyzer.get_comprehensive_market_analysis(
                request.user_prompt, 
                [],  # Empty trends data for initial analysis
                keywords
            )
        
        return KeywordExtractionResponse(
            success=True,
            user_prompt=request.user_prompt,
            industry_keywords_extracted=keywords,
            market_analysis=market_analysis,
            timestamp=datetime.now().isoformat()
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting keywords: {str(e)}")

@app.post("/analyze-trends", response_model=TrendsAnalysisResponse)
async def analyze_trends(request: TrendsAnalysisRequest):
    """
    Analyze Google Trends for specific keywords and region
    
    Parameters:
    - keywords: List of industry keywords to analyze
    - region: Region code (e.g., "US", "UK", "CA")
    
    Returns:
    - JSON with Google Trends data for the specified keywords and region
    """
    try:
        if not request.keywords or len(request.keywords) == 0:
            raise HTTPException(status_code=400, detail="keywords cannot be empty")
        
        if not request.region.strip():
            raise HTTPException(status_code=400, detail="region cannot be empty")
        
        # Import the analyzer
        from comprehensive_market_analyzer import ComprehensiveMarketAnalyzer
        
        # Get trends data only (fast Google Trends API call)
        analyzer = ComprehensiveMarketAnalyzer()
        async with analyzer:
            trends_result = analyzer.get_google_trends_data(request.keywords, request.region)
        
        return TrendsAnalysisResponse(
            success=True,
            region=request.region,
            keywords=request.keywords,
            google_trends_data=trends_result,
            timestamp=datetime.now().isoformat()
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing trends: {str(e)}")

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

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Chat with AI assistant about your startup idea with market research context
    
    Parameters:
    - business_idea: Your startup idea (provides context for the conversation)
    - message: Your question or message to the assistant
    - vcs: Optional list of VC data from market research
    - cofounders: Optional list of cofounder data from market research
    - competitors: Optional list of competitor data from market research
    - demographics: Optional demographics data from market research
    
    Returns:
    - JSON with AI response (markdown formatted) and conversation history
    """
    try:
        business_idea = request.business_idea.strip()
        message = request.message.strip()
        
        if not message:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        result = await chat_with_assistant(
            business_idea=business_idea,
            message=message,
            vcs=request.vcs,
            cofounders=request.cofounders,
            competitors=request.competitors,
            demographics=request.demographics
        )
        
        return ChatResponse(
            success=True,
            response=result["response"],
            conversation_history=result["conversation_history"]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)