# StarPlex

An AI-powered startup intelligence platform that helps entrepreneurs validate their business ideas and find the right resources to succeed. Powered primarily by **Perplexity Sonar Pro**.

## User Experience

StarPlex features an interactive **3D globe interface** as its main UI. Simply enter your startup idea, and watch as the AI engine analyzes and visualizes insights directly on the globe - mapping out competitors, markets, demographics, VCs, and potential co-founders across the world in real-time.

## Features

### TEXT-BASED Analysis
- **Market Validation** - Is there a need for this startup?
- **Market Cap Analysis** - Market capitalization of the input sector
- **Geographic Usage** - Which geographic areas are most active in this market
- **Historical Growth** - Growth trends over the last 5 years in the market
- **Projected Growth** - Future market size projections

### MAP-BASED Filters
- **Competitor Research** - Who's doing a similar startup? (Interactive map filter)
- **Demographic Research** - Where is the market? (Interactive map filter)
- **VC Research** - Who's the best fit VC for your startup? (Interactive map filter)
- **Co-Founder Scanner** - Who could be a potentially good co-founder? (Interactive map filter with matching)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Python 3.8+
- Perplexity API Key

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd perplexity-hack
```

2. Install dependencies:
```bash
npm i
```

3. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

#### Frontend Dependencies
- Next.js 15.5.6 (React 19)
- Cobe (3D Globe visualization)
- **Mapbox GL** (Interactive maps and geospatial data visualization)
- Recharts (Charts and data visualization)
- Radix UI (Component library)
- Framer Motion (Animations)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Set up your environment variables (create a `.env` file):
```bash
PERPLEXITY_API_KEY=your_api_key_here
```

4. Start the backend server:
```bash
python3 main.py
```

The backend API will start running on `http://localhost:8000` and handle all AI-powered analysis requests.

#### Backend Dependencies
- FastAPI (REST API framework)
- perplexityai (Official Perplexity SDK)
- httpx (Async HTTP client)
- geopy (Geocoding and location services)
- pandas (Data processing and analysis)
- pytrends (Google Trends integration for market data)
- python-pptx (Pitch deck generation)

## Perplexity API Integration

StarPlex leverages the **Perplexity API** (primarily **Sonar Pro** model) as its core intelligence engine. Here's how it's integrated:

### Architecture

1. **Perplexity Client** (`backend/perplexity_client.py`): 
   - Centralized client using the official `perplexityai` Python SDK
   - Implements intelligent caching to optimize API usage
   - Structured prompts for consistent JSON responses

2. **Multiple Analysis Modules**:
   - **Market Analyzer** (`comprehensive_market_analyzer.py`): Uses Sonar Pro to analyze market validation, cap, growth trends
   - **Competitor Research** (`competitors.py`): Queries Perplexity for similar startups and competitive landscape
   - **VC Research** (`vc.py`): Finds best-fit venture capital firms using AI-powered matching
   - **Co-Founder Scanner** (`cofounder.py`): Identifies potential co-founders based on skills and location
   - **Demographics** (`perplexity_client.py`): Maps target audience locations globally

### Key Integration Features

- **Streaming Responses**: Real-time data streaming for immediate user feedback
- **Structured Outputs**: JSON-formatted responses for easy parsing and visualization
- **Error Handling**: Graceful fallbacks with cached or default data
- **Rate Limiting**: Smart caching prevents redundant API calls
- **Multi-Model Strategy**: Primarily uses Sonar Pro, with model selection based on query complexity

### Example API Usage

```python
from perplexity import Perplexity

client = Perplexity()
response = client.chat.completions.create(
    model="sonar",
    messages=[
        {"role": "system", "content": "You are a market analysis expert..."},
        {"role": "user", "content": "Analyze the market for [startup idea]"}
    ],
    temperature=0.7
)
```

All geographic data, market insights, competitor intelligence, and demographic analysis are powered by Perplexity's real-time web knowledge, ensuring users get the most current and accurate startup intelligence.

## Technology Stack

- **Frontend**: Next.js, React 19, TypeScript, TailwindCSS
- **Backend**: Python, FastAPI
- **AI Engine**: Perplexity Sonar Pro
- **Mapping & Geospatial**: Mapbox GL (interactive maps), OpenStreetMap Nominatim API (geocoding)
- **Data Visualization & Graphing**: 
  - MapBox (3D interactive globe)
  - Recharts (Market growth charts, trend analysis, pie charts, radar charts)
  - Custom visualizations for market cap, demographic heatmaps, and competitive landscape
- **Market Data**: Google Trends API, Perplexity real-time web data

## Powered By

All features are powered by **Perplexity**, mainly using **Sonar Pro** for advanced AI-driven market intelligence and analysis.
