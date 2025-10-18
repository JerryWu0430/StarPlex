"use client";

import { useState } from "react";
import AudienceMap from "@/components/AudienceMap";
import DockAnimation from "@/components/DockAnimation";
import InitPage from "./initPage";
import { FieldSwitch } from "@/components/fieldSwitch";
import { InputGroup, InputGroupButton, InputGroupAddon, InputGroupText, InputGroupTextarea } from "@/components/ui/input-group";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ArrowUpIcon, PlusIcon } from "lucide-react";

export default function Home() {
  const [showVCs, setShowVCs] = useState(false);
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [showDemographics, setShowDemographics] = useState(false);
  const [showCofounders, setShowCofounders] = useState(false);
  const [isGeneratingPitchDeck, setIsGeneratingPitchDeck] = useState(false);

  const handleGeneratePitchDeck = async () => {
    setIsGeneratingPitchDeck(true);
    
    try {
      const response = await fetch("http://localhost:8000/generate-pitch-deck", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idea: "AI for legal technology",
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
    <div className="relative min-h-screen">
      <div className="absolute top-4 right-4 z-10 grid grid-cols-1 gap-2">
        <FieldSwitch 
          title="Market Competitors" 
          description="Who's copying your genius idea?" 
          checked={showCompetitors}
          onCheckedChange={setShowCompetitors}
        />
        <FieldSwitch 
          title="Customer Demographics" 
          description="Where's the market?" 
          checked={showDemographics}
          onCheckedChange={setShowDemographics}
        />
        <FieldSwitch 
          title="VC Victims" 
          description="Who is willing to throw you money?" 
          checked={showVCs}
          onCheckedChange={setShowVCs}
        />
        <FieldSwitch 
          title="Co-ballers" 
          description="Who's willing to scale a B2B AI SaaS startup?" 
          checked={showCofounders}
          onCheckedChange={setShowCofounders}
        />
        <div className="w-full max-w-xs">
          <button
            onClick={handleGeneratePitchDeck}
            disabled={isGeneratingPitchDeck}
            className="w-full border p-3 shadow-sm bg-card opacity-90 rounded-lg transition-all duration-200 hover:opacity-100 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-left flex-1">
                <div className="text-sm font-medium leading-snug">
                  {isGeneratingPitchDeck ? "Generating Pitch Deck..." : "Generate Pitch Deck"}
                </div>
                <div className="text-xs text-muted-foreground leading-normal font-normal">
                  {isGeneratingPitchDeck 
                    ? "AI is creating your presentation..." 
                    : "Create investor-ready slides with AI"}
                </div>
              </div>
              {isGeneratingPitchDeck ? (
                <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </div>
          </button>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-xl opacity-95">
      <InputGroup>
          <InputGroupTextarea placeholder="Ask, Search or Chat..." />
          <InputGroupAddon align="block-end">
            <InputGroupButton
              variant="outline"
              className="rounded-full"
              size="icon-xs"
            >
              <PlusIcon />
            </InputGroupButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <InputGroupButton variant="ghost">Competitor Analysis</InputGroupButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="[--radius:0.95rem]"
              >
                <DropdownMenuItem>Competitors Analysis</DropdownMenuItem>
                <DropdownMenuItem>Customer Demographics</DropdownMenuItem>
                <DropdownMenuItem>VC Victims</DropdownMenuItem>
                <DropdownMenuItem>Co-ballers</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <InputGroupText className="ml-auto"></InputGroupText> 
            <Separator orientation="vertical" className="!h-4" />
            <InputGroupButton
              variant="default"
              className="rounded-full"
              size="icon-xs"
              disabled
            >
              <ArrowUpIcon />
              <span className="sr-only">Send</span>
            </InputGroupButton>
          </InputGroupAddon>
      </InputGroup>   
      </div>
      <AudienceMap 
        showVCs={showVCs}
        showCompetitors={showCompetitors}
        showDemographics={showDemographics}
        showCofounders={showCofounders}
      />
    </div>
  );
}
