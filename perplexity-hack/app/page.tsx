"use client";

import { useState } from "react";
import AppPage from "./appPage";
import InitPage from "./initPage";

export default function Home() {
  const [showApp, setShowApp] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleEnter = (value: string) => {
    setInitialQuery(value);
    setIsTransitioning(true);
    setTimeout(() => {
      setShowApp(true);
    }, 600);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div
        className={`absolute inset-0 transition-all duration-700 ease-in-out ${
          isTransitioning 
            ? "opacity-0 blur-xl scale-105" 
            : "opacity-100 blur-0 scale-100"
        }`}
        style={{ pointerEvents: isTransitioning ? "none" : "auto" }}
      >
        {!showApp && <InitPage onEnter={handleEnter} />}
      </div>

      <div
        className={`absolute inset-0 transition-all duration-700 ease-in-out ${
          showApp 
            ? "opacity-100 blur-0 scale-100" 
            : "opacity-0 blur-xl scale-95"
        }`}
        style={{ pointerEvents: showApp ? "auto" : "none" }}
      >
        {showApp && <AppPage initialQuery={initialQuery} />}
      </div>
    </div>
  );
}
