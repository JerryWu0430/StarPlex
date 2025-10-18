const API_BASE_URL = "http://localhost:8000";

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

export async function findCompetitors(idea: string, maxResults: number = 20): Promise<CompetitorResponse> {
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
}

export async function findVCs(idea: string, maxResults: number = 20): Promise<VCResponse> {
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
}

export async function findCofounders(idea: string, maxResults: number = 20): Promise<CofounderResponse> {
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
}

export async function getAudienceMap(
  startupIdea: string,
  targetDescription: string = "Target audience for this startup",
  country?: string
) {
  const params = new URLSearchParams({
    startup_idea: startupIdea,
    target_description: targetDescription,
  });

  if (country) {
    params.append("country", country);
  }

  const response = await fetch(`${API_BASE_URL}/audience-map?${params.toString()}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(`Failed to get audience map: ${errorData.detail || response.statusText}`);
  }

  return response.json();
}

