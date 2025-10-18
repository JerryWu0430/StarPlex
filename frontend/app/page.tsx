"use client";

import { useState, useEffect } from "react";
import AppPage from "./appPage";
import InitPage from "./initPage";
import type { Feature, Point } from "geojson";
import { StartupProvider, useStartup } from "@/contexts/StartupContext";
import { useBackgroundAPI } from "@/hooks/useBackgroundAPI";

type AudienceProps = {
  name: string;
  area_code?: string;
  borough?: string;
  country?: string;
  description?: string;
  target_fit?: string;
  weight?: number;
  display_name?: string;
};

type AudienceFeature = Feature<Point, AudienceProps>;

function AppContent() {
  const { startupIdea, setStartupIdea } = useStartup();
  
  // Start background API calls when startup idea is available
  useBackgroundAPI(startupIdea);

  const [showApp, setShowApp] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hideInit, setHideInit] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<AudienceFeature | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isGeneratingPitchDeck, setIsGeneratingPitchDeck] = useState(false);

  const handleEnter = (value: string) => {
    setInitialQuery(value);
    setStartupIdea(value.trim()); // Set startup idea in context to trigger background API calls
    setIsTransitioning(true);
    setTimeout(() => {
      setShowApp(true);
    }, 600);
    setTimeout(() => {
      setHideInit(true);
    }, 1400); // Hide after transition completes
  };

  const handleHeatmapClick = (feature: AudienceFeature | null) => {
    if (feature) {
      // Clicking on a POI - show sidebar
      setSelectedFeature(feature);
      setSidebarVisible(true);
    } else {
      // Clicking on empty area - hide sidebar
      setSelectedFeature(null);
      setSidebarVisible(false);
    }
  };

  // Handle escape key to close sidebar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && sidebarVisible) {
        setSidebarVisible(false);
        setSelectedFeature(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [sidebarVisible]);
  const handleGeneratePitchDeck = async () => {
    setIsGeneratingPitchDeck(true);

    try {
      const response = await fetch("http://localhost:8000/generate-pitch-deck", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idea: initialQuery || "AI for legal technology",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate pitch deck: ${response.status}`);
      }

      const data = await response.json();
      console.log("Pitch deck generated:", data);

      // Download the PowerPoint file if available
      if (data.pptx_file) {
        const downloadUrl = `http://localhost:8000/download-pitch-deck/${data.pptx_file}`;

        // Create a temporary anchor element to trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = data.pptx_file;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Error generating pitch deck:", error);
    } finally {
      setIsGeneratingPitchDeck(false);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {!hideInit && (
        <div
          className={`absolute inset-0 transition-all duration-1000 ease-in-out ${isTransitioning
              ? "opacity-0 blur-xl scale-105"
              : "opacity-100 blur-0 scale-100"
            }`}
          style={{ pointerEvents: isTransitioning ? "none" : "auto" }}
        >
          <InitPage onEnter={handleEnter} />
        </div>
      )}

      {showApp && (
        <div
          className={`absolute inset-0 transition-all duration-1000 ease-in-out ${showApp
              ? "opacity-100 blur-0 scale-100"
              : "opacity-0 blur-xl scale-95"
            }`}
        >
          <AppPage 
            initialQuery={initialQuery}
            onGeneratePitchDeck={handleGeneratePitchDeck}
            isGeneratingPitchDeck={isGeneratingPitchDeck}
          />
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <StartupProvider>
      <AppContent />
    </StartupProvider>
  );
}
