"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, ExternalLink, MapPin, Building2, Users, TrendingUp, Calendar, Star, AlertTriangle, Link as LinkIcon } from "lucide-react";

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
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-black/50 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4">
          <PinContent pinData={pinData} />
          <GraphSupportPlaceholder pinType={pinData.type} />
        </div>

        {/* Footer indicator */}
        <div className="p-2 border-t border-gray-700/50 bg-gray-700/30">
          <div className="flex items-center justify-center">
            <div className={`
              w-2 h-2 rounded-full
              ${isPinned ? "bg-blue-500" : "bg-gray-500"}
              transition-colors duration-200
            `} />
            <span className="ml-2 text-xs text-gray-400">
              {isPinned ? "Pinned" : "Hover to expand"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
