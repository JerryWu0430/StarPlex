const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Helper function to retry API calls with exponential backoff
async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxRetries: number = 2,
  initialDelay: number = 2000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error (429)
      const isRateLimit = error?.message?.includes("429") ||
        error?.message?.includes("rate limit") ||
        error?.message?.includes("Rate limit");

      // If it's the last attempt or not a rate limit error, throw
      if (attempt === maxRetries || !isRateLimit) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`Rate limit hit, retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${maxRetries + 1})`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

export interface Competitor {
  company_name: string;
  location: string;
  links: string[];
  date_founded: string;
  coordinates?: { latitude: number; longitude: number };
  threat_score: number;
}

export interface VC {
  name: string;
  firm: string;
  location: string;
  links: string[];
  coordinates?: { latitude: number; longitude: number };
  match_score: number;
}

export interface Cofounder {
  name: string;
  location: string;
  links: string[];
  coordinates?: { latitude: number; longitude: number };
  match_score: number;
}

export interface CompetitorResponse {
  success: boolean;
  domain: string;
  total_found: number;
  competitors: Competitor[];
  timestamp: string;
  summary: any;
}

export interface VCResponse {
  success: boolean;
  domain: string;
  stage: string;
  total_found: number;
  vcs: VC[];
  timestamp: string;
  summary: any;
}

export interface CofounderResponse {
  success: boolean;
  domain: string;
  total_found: number;
  cofounders: Cofounder[];
  timestamp: string;
  summary: any;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  conversation_history: ChatMessage[];
}

export async function findCompetitors(idea: string, maxResults: number = 20): Promise<CompetitorResponse> {
  return fetchWithRetry(async () => {
    const response = await fetch(`${API_BASE_URL}/find-competitors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idea,
        max_results: maxResults,
        include_coordinates: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Failed to find competitors: ${errorData.detail || response.statusText}`);
    }

    return response.json();
  });
}

export async function findVCs(idea: string, maxResults: number = 20): Promise<VCResponse> {
  return fetchWithRetry(async () => {
    const response = await fetch(`${API_BASE_URL}/find-vcs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idea,
        max_results: maxResults,
        include_coordinates: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Failed to find VCs: ${errorData.detail || response.statusText}`);
    }

    return response.json();
  });
}

export async function findCofounders(idea: string, maxResults: number = 20): Promise<CofounderResponse> {
  return fetchWithRetry(async () => {
    const response = await fetch(`${API_BASE_URL}/find-cofounders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idea,
        max_results: maxResults,
        include_coordinates: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Failed to find cofounders: ${errorData.detail || response.statusText}`);
    }

    return response.json();
  });
}

export async function getAudienceMap(startupIdea: string) {
  console.log("Getting audience map for:", startupIdea);
  return fetchWithRetry(async () => {
    const response = await fetch(`${API_BASE_URL}/audience-map`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startup_idea: startupIdea,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Failed to get audience map: ${errorData.detail || response.statusText}`);
    }

    return response.json();
  });
}

// New API interfaces
export interface KeywordExtractionResponse {
  success: boolean;
  user_prompt: string;
  industry_keywords_extracted: string[];
  market_analysis?: {
    how_AI_proof_it_is: number;
    market_cap_estimation: number;
  };
  timestamp: string;
}

export interface TrendsAnalysisResponse {
  success: boolean;
  region: string;
  keywords: string[];
  google_trends_data: {
    trends_data: Array<{
      year: number;
      [key: string]: any; // For query_sum fields like "healthcare_sum", "medical_sum", etc.
    }>;
    queries_analyzed: string[];
    error?: string;
  };
  timestamp: string;
}

// Legacy interface for backward compatibility
export interface ComprehensiveMarketAnalysisResponse {
  success: boolean;
  user_prompt: string;
  region: string;
  industry_keywords_extracted: string[];
  google_trends_data: {
    trends_data: Array<{
      year: number;
      [key: string]: any; // For query_sum fields like "healthcare_sum", "medical_sum", etc.
    }>;
    queries_analyzed: string[];
    error?: string;
  };
  comprehensive_analysis: any;
  timestamp: string;
  analysis_type: string;
}

// New API functions
export async function extractKeywords(userPrompt: string): Promise<KeywordExtractionResponse> {
  return fetchWithRetry(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch(`${API_BASE_URL}/extract-keywords`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_prompt: userPrompt,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(`Failed to extract keywords: ${errorData.detail || response.statusText}`);
      }

      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    }
  });
}

export async function analyzeTrends(keywords: string[], region: string): Promise<TrendsAnalysisResponse> {
  return fetchWithRetry(async () => {
    const response = await fetch(`${API_BASE_URL}/analyze-trends`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keywords: keywords,
        region: region,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Failed to analyze trends: ${errorData.detail || response.statusText}`);
    }

    return response.json();
  });
}

// Legacy function for backward compatibility
export async function getComprehensiveMarketAnalysis(
  userPrompt: string,
  region: string = ""
): Promise<ComprehensiveMarketAnalysisResponse> {
  return fetchWithRetry(async () => {
    const response = await fetch(`${API_BASE_URL}/comprehensive-market-analysis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_prompt: userPrompt,
        region: region,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Failed to get comprehensive market analysis: ${errorData.detail || response.statusText}`);
    }

    return response.json();
  });
}

export async function sendChatMessage(
  businessIdea: string,
  message: string,
  context?: {
    vcs?: any[];
    cofounders?: any[];
    competitors?: any[];
    demographics?: any;
  }
): Promise<ChatResponse> {
  return fetchWithRetry(async () => {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        business_idea: businessIdea,
        message: message,
        vcs: context?.vcs,
        cofounders: context?.cofounders,
        competitors: context?.competitors,
        demographics: context?.demographics,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Failed to send chat message: ${errorData.detail || response.statusText}`);
    }

    return response.json();
  });
}

