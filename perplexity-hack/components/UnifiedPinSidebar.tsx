"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, ExternalLink, MapPin, Building2, Users, TrendingUp, Calendar, Star, AlertTriangle, Link as LinkIcon, BarChart3, DollarSign, Brain, Target, Search } from "lucide-react";

// Types for different pin data
interface VCPinData {
  type: 'vc';
  name: string;
  firm: string;
  location: string;
  match_score: number;
  links: string[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
  explanation?: {
    recent_investments: string[];
    investment_thesis: string[];
    how_to_pitch: string[];
  };
}

interface CompetitorPinData {
  type: 'competitor';
  company_name: string;
  location: string;
  date_founded: string;
  threat_score: number;
  links: string[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
  explanation?: {
    angle: string[];
    what_they_cover: string[];
    gaps: string[];
  };
}

interface CofounderPinData {
  type: 'cofounder';
  name: string;
  location: string;
  match_score: number;
  links: string[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
  explanation?: {
    why_good_match: string[];
    expertise: string[];
    unique_value: string[];
  };
}

interface AudiencePinData {
  type: 'audience';
  name: string;
  location: string;
  description?: string;
  target_fit?: string;
  weight: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  marketStats?: {
    marketCap: number;
    aiProofScore: number;
    trendData: Array<{ period: string; value: number }>;
    industryKeywords: string[];
  };
}

type PinData = VCPinData | CompetitorPinData | CofounderPinData | AudiencePinData;

interface UnifiedPinSidebarProps {
  /** Pin data to display */
  pinData: PinData | null;
  /** Whether the sidebar is visible */
  isVisible: boolean;
  /** Callback when sidebar should be closed */
  onClose: () => void;
  /** Position of the sidebar */
  position?: "left" | "right";
  /** Width of the sidebar */
  width?: string;
  /** Custom className for styling */
  className?: string;
}

// Helper function to get link icon and label
const getLinkInfo = (url: string) => {
  if (url.includes('linkedin')) return { icon: '💼', label: 'LinkedIn' };
  if (url.includes('twitter') || url.includes('x.com')) return { icon: '🐦', label: 'Twitter' };
  if (url.includes('crunchbase')) return { icon: '📊', label: 'Crunchbase' };
  if (url.includes('github')) return { icon: '💻', label: 'GitHub' };
  if (url.includes('angellist')) return { icon: '👼', label: 'AngelList' };
  if (url.includes('techcrunch')) return { icon: '📰', label: 'TechCrunch' };
  if (url.includes('producthunt')) return { icon: '🚀', label: 'Product Hunt' };
  return { icon: '🔗', label: 'Website' };
};

// Helper function to generate Perplexity search query from pin data
const generatePerplexityQuery = (pinData: PinData): string => {
  switch (pinData.type) {
    case 'vc':
      return `${pinData.name} ${pinData.firm} venture capital investment thesis portfolio companies`;
    case 'competitor':
      return `${pinData.company_name} company business model products services market position`;
    case 'cofounder':
      return `${pinData.name} background expertise experience startups`;
    case 'audience':
      return `${pinData.name} demographics market analysis customer profile`;
    default:
      return '';
  }
};

// Component for rendering links with sleek styling
const LinkDisplay: React.FC<{ links: string[] }> = ({ links }) => {
  if (!links || links.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
        <LinkIcon className="w-4 h-4" />
        <span>Links</span>
      </div>
      <div className="space-y-1.5">
        {links.map((link, index) => {
          const { icon, label } = getLinkInfo(link);
          return (
            <a
              key={index}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-all duration-200 hover:scale-[1.02]"
            >
              <span className="text-lg">{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">
                  {label}
                </div>
                <div className="text-xs text-gray-400 truncate">
                  {link}
                </div>
              </div>
              <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-blue-300 transition-colors opacity-0 group-hover:opacity-100" />
            </a>
          );
        })}
      </div>
    </div>
  );
};

// Component for rendering explanation sections with icons and headers
const ExplanationSection: React.FC<{
  title: string;
  items: string[];
  icon: React.ReactNode;
}> = ({ title, items, icon }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
        {icon}
        <span>{title}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, idx) => (
          <li key={idx} className="text-sm text-gray-400 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-blue-400">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

// Component for rendering score with visual indicator
const ScoreDisplay: React.FC<{ score: number; maxScore?: number; label: string; type: 'positive' | 'negative' }> = ({
  score,
  maxScore = 10,
  label,
  type
}) => {
  const percentage = (score / maxScore) * 100;
  const colorClass = type === 'positive'
    ? (percentage >= 80 ? 'text-green-400' : percentage >= 60 ? 'text-yellow-400' : 'text-red-400')
    : (percentage >= 80 ? 'text-red-400' : percentage >= 60 ? 'text-yellow-400' : 'text-green-400');

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-300">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${type === 'positive'
              ? (percentage >= 80 ? 'bg-green-400' : percentage >= 60 ? 'bg-yellow-400' : 'bg-red-400')
              : (percentage >= 80 ? 'bg-red-400' : percentage >= 60 ? 'bg-yellow-400' : 'bg-green-400')
              }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={`text-sm font-medium ${colorClass}`}>
          {score}/{maxScore}
        </span>
      </div>
    </div>
  );
};

// Utility function to transform API response to market stats format
export const transformMarketAnalysisToStats = (marketAnalysis: any) => {
  if (!marketAnalysis) return null;

  const comprehensive = marketAnalysis.comprehensive_analysis || {};
  const trendsData = marketAnalysis.google_trends_data?.trends_data || [];

  // Transform trend data to the format expected by StatisticsSection
  const trendData = trendsData.map((item: any) => ({
    period: `${item.year}`,
    value: Object.values(item).find(val => typeof val === 'number') as number || 0
  })).slice(-10); // Get last 10 data points

  return {
    marketCap: comprehensive.market_cap_estimation || 0,
    aiProofScore: comprehensive.how_AI_proof_it_is || 5,
    trendData: trendData,
    industryKeywords: marketAnalysis.industry_keywords_extracted || []
  };
};

// Sample data for demonstration
export const sampleMarketStats = {
  marketCap: 2500000000, // $2.5B
  aiProofScore: 7,
  trendData: [
    { period: "2020", value: 45 },
    { period: "2021", value: 52 },
    { period: "2022", value: 58 },
    { period: "2023", value: 67 },
    { period: "2024", value: 78 }
  ],
  industryKeywords: ["healthcare", "medical", "health", "pharma", "biotech"]
};

// Component for displaying market statistics
const StatisticsSection: React.FC<{ marketStats: any }> = ({ marketStats }) => {
  if (!marketStats) return null;

  const formatMarketCap = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const getAIProofColor = (score: number) => {
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getAIProofLabel = (score: number) => {
    if (score >= 8) return 'AI Resilient';
    if (score >= 6) return 'Moderate Risk';
    return 'High AI Risk';
  };

  return (
    <div className="space-y-4 pt-4 border-t border-gray-700/50">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
        <BarChart3 className="w-4 h-4" />
        <span>Market Statistics</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Market Cap */}
        <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-xs font-medium text-gray-300">Market Size</span>
          </div>
          <div className="text-lg font-bold text-green-400">
            {formatMarketCap(marketStats.marketCap)}
          </div>
          <div className="text-xs text-gray-400">TAM</div>
        </div>

        {/* AI Proof Score */}
        <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-medium text-gray-300">AI Risk</span>
          </div>
          <div className={`text-lg font-bold ${getAIProofColor(marketStats.aiProofScore)}`}>
            {marketStats.aiProofScore}/10
          </div>
          <div className="text-xs text-gray-400">{getAIProofLabel(marketStats.aiProofScore)}</div>
        </div>
      </div>

      {/* Trend Chart */}
      {marketStats.trendData && marketStats.trendData.length > 0 && (
        <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium text-gray-300">Market Trends</span>
          </div>
          <div className="space-y-2">
            {marketStats.trendData.slice(-3).map((point: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{point.period}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-400 transition-all duration-500"
                      style={{ width: `${Math.min((point.value / 100) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-purple-400">{point.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Industry Keywords */}
      {marketStats.industryKeywords && marketStats.industryKeywords.length > 0 && (
        <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-medium text-gray-300">Industry Focus</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {marketStats.industryKeywords.slice(0, 4).map((keyword: string, index: number) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-orange-500/20 text-orange-300 rounded-full border border-orange-500/30"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Component for rendering pin type specific content
const PinContent: React.FC<{ pinData: PinData }> = ({ pinData }) => {
  switch (pinData.type) {
    case 'vc':
      return (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate">{pinData.name}</h3>
              <p className="text-sm text-gray-400 truncate">{pinData.firm}</p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <MapPin className="w-4 h-4" />
            <span>{pinData.location}</span>
          </div>

          {/* Match Score */}
          <ScoreDisplay
            score={pinData.match_score}
            label="Match Score"
            type="positive"
          />

          {/* Explanation Sections */}
          {pinData.explanation && (
            <div className="space-y-4 pt-2 border-t border-gray-700/50">
              <ExplanationSection
                title="Recent Investments"
                items={pinData.explanation.recent_investments}
                icon={<TrendingUp className="w-4 h-4" />}
              />
              <ExplanationSection
                title="Investment Thesis"
                items={pinData.explanation.investment_thesis}
                icon={<Star className="w-4 h-4" />}
              />
              <ExplanationSection
                title="How to Pitch"
                items={pinData.explanation.how_to_pitch}
                icon={<Building2 className="w-4 h-4" />}
              />
            </div>
          )}

          {/* Links */}
          <LinkDisplay links={pinData.links} />
        </div>
      );

    case 'competitor':
      return (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate">{pinData.company_name}</h3>
              <p className="text-sm text-gray-400">Competitor</p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <MapPin className="w-4 h-4" />
            <span>{pinData.location}</span>
          </div>

          {/* Founded Date */}
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Calendar className="w-4 h-4" />
            <span>Founded: {pinData.date_founded}</span>
          </div>

          {/* Threat Score */}
          <ScoreDisplay
            score={pinData.threat_score}
            label="Threat Score"
            type="negative"
          />

          {/* Explanation Sections */}
          {pinData.explanation && (
            <div className="space-y-4 pt-2 border-t border-gray-700/50">
              <ExplanationSection
                title="Their Angle"
                items={pinData.explanation.angle}
                icon={<TrendingUp className="w-4 h-4" />}
              />
              <ExplanationSection
                title="What They Cover"
                items={pinData.explanation.what_they_cover}
                icon={<Building2 className="w-4 h-4" />}
              />
              <ExplanationSection
                title="Gaps & Opportunities"
                items={pinData.explanation.gaps}
                icon={<AlertTriangle className="w-4 h-4" />}
              />
            </div>
          )}

          {/* Links */}
          <LinkDisplay links={pinData.links} />
        </div>
      );

    case 'cofounder':
      return (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate">{pinData.name}</h3>
              <p className="text-sm text-gray-400">Potential Cofounder</p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <MapPin className="w-4 h-4" />
            <span>{pinData.location}</span>
          </div>

          {/* Match Score */}
          <ScoreDisplay
            score={pinData.match_score}
            label="Match Score"
            type="positive"
          />

          {/* Explanation Sections */}
          {pinData.explanation && (
            <div className="space-y-4 pt-2 border-t border-gray-700/50">
              <ExplanationSection
                title="Why It's a Good Match"
                items={pinData.explanation.why_good_match}
                icon={<Star className="w-4 h-4" />}
              />
              <ExplanationSection
                title="Their Expertise"
                items={pinData.explanation.expertise}
                icon={<Users className="w-4 h-4" />}
              />
              <ExplanationSection
                title="Their Unique Value"
                items={pinData.explanation.unique_value}
                icon={<TrendingUp className="w-4 h-4" />}
              />
            </div>
          )}

          {/* Links */}
          <LinkDisplay links={pinData.links} />
        </div>
      );

    case 'audience':
      return (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate">{pinData.name}</h3>
              <p className="text-sm text-gray-400">Audience Member</p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <MapPin className="w-4 h-4" />
            <span>{pinData.location}</span>
          </div>

          {/* Description */}
          {pinData.description && (
            <div className="text-sm text-gray-300">
              <p className="font-medium mb-1">Description:</p>
              <p>{pinData.description}</p>
            </div>
          )}

          {/* Target Fit */}
          {pinData.target_fit && (
            <div className="text-sm text-gray-300">
              <p className="font-medium mb-1">Target Fit:</p>
              <p>{pinData.target_fit}</p>
            </div>
          )}

          {/* Weight */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Audience Weight</span>
            <span className="text-sm font-medium text-blue-400">
              {pinData.weight}
            </span>
          </div>

          {/* Market Statistics */}
          {pinData.marketStats && (
            <StatisticsSection marketStats={pinData.marketStats} />
          )}
        </div>
      );

    default:
      return null;
  }
};

// Placeholder for future graph support
const GraphSupportPlaceholder: React.FC<{ pinType: string }> = ({ pinType }) => {
  if (pinType === 'competitor') {
    return (
      <div className="mt-6 pt-4 border-t border-gray-700/50">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
          <TrendingUp className="w-4 h-4" />
          <span>Competitor Analysis</span>
        </div>
        <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
          <p className="text-xs text-gray-400 mb-2">Graph visualization coming soon</p>
          <div className="h-20 bg-gray-800/50 rounded flex items-center justify-center">
            <span className="text-xs text-gray-500">📊 Interactive Graph</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function UnifiedPinSidebar({
  pinData,
  isVisible,
  onClose,
  position = "right",
  width = "360px",
  className = "",
}: UnifiedPinSidebarProps) {
  const [isPinned, setIsPinned] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Handle Escape key to close sidebar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        onClose();
        setIsPinned(false);
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, onClose]);

  // Handle click to pin/unpin
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPinned(!isPinned);
  };

  // Handle close button
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    setIsPinned(false);
  };

  // Handle Perplexity search
  const handlePerplexitySearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!pinData) return;
    const query = generatePerplexityQuery(pinData);
    const searchUrl = `https://www.perplexity.ai/search?q=${encodeURIComponent(query)}`;
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };

  const positionClasses = position === "left" ? "left-4" : "right-4";
  const transformClasses = position === "left"
    ? (isVisible ? "translate-x-0" : "-translate-x-full")
    : (isVisible ? "translate-x-0" : "translate-x-full");

  if (!pinData) return null;

  return (
    <div
      ref={sidebarRef}
      className={`
        fixed top-4 ${positionClasses} z-20
        transition-all duration-300 linear
        ${transformClasses}
        ${className}
      `}
      style={{ width: isVisible ? width : "0px" }}
      onClick={handleClick}
    >
      <div
        className={`
          bg-black/95 backdrop-blur-sm
          border border-black/50
          rounded-xl shadow-lg
          overflow-hidden
          h-[calc(100vh-2rem)]
          flex flex-col
          ${isPinned ? "ring-2 ring-blue-500/20" : ""}
        `}
        style={{
          minWidth: isVisible ? width : "0px",
          maxWidth: isVisible ? width : "0px"
        }}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b border-black/50 bg-black/50">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${pinData.type === 'vc' ? 'bg-green-400' :
              pinData.type === 'competitor' ? 'bg-red-400' :
                pinData.type === 'cofounder' ? 'bg-purple-400' :
                  'bg-blue-400'
              }`} />
            <h3 className="text-sm font-semibold text-white capitalize">
              {pinData.type === 'vc' ? 'Venture Capital' :
                pinData.type === 'competitor' ? 'Competitor' :
                  pinData.type === 'cofounder' ? 'Cofounder' : 'Audience'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePerplexitySearch}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all group ${pinData.type === 'vc'
                ? 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 hover:border-green-500/60'
                : pinData.type === 'competitor'
                  ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 hover:border-red-500/60'
                  : pinData.type === 'cofounder'
                    ? 'bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 hover:border-purple-500/60'
                    : 'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 hover:border-blue-500/60'
                }`}
              aria-label="Search in Perplexity"
              title="Deep dive in Perplexity"
            >
              <Search className={`w-3.5 h-3.5 ${pinData.type === 'vc'
                ? 'text-green-400 group-hover:text-green-300'
                : pinData.type === 'competitor'
                  ? 'text-red-400 group-hover:text-red-300'
                  : pinData.type === 'cofounder'
                    ? 'text-purple-400 group-hover:text-purple-300'
                    : 'text-blue-400 group-hover:text-blue-300'
                }`} />
              <span className={`text-xs font-medium ${pinData.type === 'vc'
                ? 'text-green-300 group-hover:text-green-200'
                : pinData.type === 'competitor'
                  ? 'text-red-300 group-hover:text-red-200'
                  : pinData.type === 'cofounder'
                    ? 'text-purple-300 group-hover:text-purple-200'
                    : 'text-blue-300 group-hover:text-blue-200'
                }`}>Perplexity</span>
            </button>
            <button
              onClick={handleClose}
              className="p-1 rounded-full hover:bg-black/50 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          <PinContent pinData={pinData} />
          <GraphSupportPlaceholder pinType={pinData.type} />
        </div>

        {/* Footer indicator - removed as it's not needed */}
      </div>
    </div>
  );
}
