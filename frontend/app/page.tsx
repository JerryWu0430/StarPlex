"use client";

import { useState } from "react";
import AppPage from "./appPage";
import InitPage from "./initPage";
import { StartupProvider, useStartup } from "@/contexts/StartupContext";
import { useBackgroundAPI } from "@/hooks/useBackgroundAPI";

function AppContent() {
  const { startupIdea, setStartupIdea } = useStartup();
  
  // Start background API calls when startup idea is available
  useBackgroundAPI(startupIdea);

  const [showApp, setShowApp] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hideInit, setHideInit] = useState(false);
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
