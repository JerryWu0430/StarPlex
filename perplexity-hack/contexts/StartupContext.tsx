"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface StartupContextType {
  startupIdea: string;
  setStartupIdea: (idea: string) => void;
  keywords: string[];
  setKeywords: (keywords: string[]) => void;
  marketAnalysis: {
    how_AI_proof_it_is: number;
    market_cap_estimation: number;
  } | null;
  setMarketAnalysis: (analysis: { how_AI_proof_it_is: number; market_cap_estimation: number } | null) => void;
}

const StartupContext = createContext<StartupContextType | undefined>(undefined);

export function StartupProvider({ children }: { children: ReactNode }) {
  const [startupIdea, setStartupIdea] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [marketAnalysis, setMarketAnalysis] = useState<{
    how_AI_proof_it_is: number;
    market_cap_estimation: number;
  } | null>(null);

  return (
    <StartupContext.Provider value={{ 
      startupIdea, 
      setStartupIdea, 
      keywords, 
      setKeywords, 
      marketAnalysis, 
      setMarketAnalysis 
    }}>
      {children}
    </StartupContext.Provider>
  );
}

export function useStartup() {
  const context = useContext(StartupContext);
  if (context === undefined) {
    throw new Error('useStartup must be used within a StartupProvider');
  }
  return context;
}
