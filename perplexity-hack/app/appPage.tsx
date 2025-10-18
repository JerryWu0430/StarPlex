"use client";

import { useState, useEffect, useRef } from "react";
import AudienceMap from "@/components/AudienceMap";
import { FieldSwitch } from "@/components/fieldSwitch";
import { InputGroup, InputGroupButton, InputGroupAddon, InputGroupText, InputGroupTextarea, InputGroupInput } from "@/components/ui/input-group";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ArrowUpIcon, LoaderIcon, PlusIcon, CheckCircle2, XCircle } from "lucide-react";
import { findCompetitors, findVCs, findCofounders, getAudienceMap, sendChatMessage, type CompetitorResponse, type VCResponse, type CofounderResponse, type ChatMessage } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Feature } from "geojson";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

type LoadingStatus = "competitors" | "vcs" | "cofounders" | "demographics" | "chat" | null;
type AlertType = { type: "success" | "error"; message: string } | null;

interface AppPageProps {
  initialQuery?: string;
  onGeneratePitchDeck?: () => void;
  isGeneratingPitchDeck?: boolean;
}

export default function AppPage({ initialQuery, onGeneratePitchDeck, isGeneratingPitchDeck = false }: AppPageProps) {
  const [showVCs, setShowVCs] = useState(false);
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [showDemographics, setShowDemographics] = useState(false);
  const [showCofounders, setShowCofounders] = useState(false);

  // Cached data
  const [competitorsData, setCompetitorsData] = useState<CompetitorResponse | null>(null);
  const [vcsData, setVCsData] = useState<VCResponse | null>(null);
  const [cofoundersData, setCofoundersData] = useState<CofounderResponse | null>(null);
  const [demographicsData, setDemographicsData] = useState<any | null>(null);

  // Loading and alert states
  const [currentLoading, setCurrentLoading] = useState<LoadingStatus>(null);
  const [alert, setAlert] = useState<AlertType>(null);

  // Chatbot states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startupIdea = initialQuery?.trim() || "";

  // Helper function to add delay between API calls
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Handle heatmap click to show sidebar with feature details
  const handleHeatmapClick = (feature: Feature | null) => {
    setSelectedHeatmapFeature(feature);
    setIsSidebarVisible(!!feature);
  };

  // Handle sidebar close
  const handleSidebarClose = () => {
    setIsSidebarVisible(false);
    setSelectedHeatmapFeature(null);
  };

  // Handle Escape key to close sidebar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isSidebarVisible) {
        handleSidebarClose();
      }
    };

    if (isSidebarVisible) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSidebarVisible]);

  // Fetch ALL data sequentially - one at a time with delays to avoid rate limits
  useEffect(() => {
    if (!startupIdea || startupIdea.length < 3) {
      console.warn("Skipping data fetch: startup idea is empty or too short");
      return;
    }

    const fetchDataSequentially = async () => {
      // Clear old cached data when starting new fetch
      setCompetitorsData(null);
      setVCsData(null);
      setCofoundersData(null);
      setDemographicsData(null);

      // 1. Fetch competitors
      setCurrentLoading("competitors");
      try {
        console.log("Fetching competitors for:", startupIdea);
        const competitorsResult = await findCompetitors(startupIdea);
        setCompetitorsData(competitorsResult);
        setAlert({ type: "success", message: `Found ${competitorsResult.total_found} competitors` });
        setTimeout(() => setAlert(null), 3000);
      } catch (err: any) {
        console.error("Error fetching competitors:", err);
        const errorMsg = err?.message?.includes("429") ? "Rate limit - waiting..." : "Failed to fetch competitors";
        setAlert({ type: "error", message: errorMsg });
        setTimeout(() => setAlert(null), 3000);
      }
      setCurrentLoading(null);

      // Wait 3 seconds before next API call to avoid rate limits
      await sleep(3000);

      // 2. Fetch VCs
      setCurrentLoading("vcs");
      try {
        console.log("Fetching VCs for:", startupIdea);
        const vcsResult = await findVCs(startupIdea);
        setVCsData(vcsResult);
        setAlert({ type: "success", message: `Found ${vcsResult.total_found} VCs` });
        setTimeout(() => setAlert(null), 3000);
      } catch (err: any) {
        console.error("Error fetching VCs:", err);
        const errorMsg = err?.message?.includes("429") ? "Rate limit - waiting..." : "Failed to fetch VCs";
        setAlert({ type: "error", message: errorMsg });
        setTimeout(() => setAlert(null), 3000);
      }
      setCurrentLoading(null);

      // Wait 3 seconds before next API call
      await sleep(3000);

      // 3. Fetch cofounders
      setCurrentLoading("cofounders");
      try {
        console.log("Fetching cofounders for:", startupIdea);
        const cofoundersResult = await findCofounders(startupIdea);
        setCofoundersData(cofoundersResult);
        setAlert({ type: "success", message: `Found ${cofoundersResult.total_found} cofounders` });
        setTimeout(() => setAlert(null), 3000);
      } catch (err: any) {
        console.error("Error fetching cofounders:", err);
        const errorMsg = err?.message?.includes("429") ? "Rate limit - waiting..." : "Failed to fetch cofounders";
        setAlert({ type: "error", message: errorMsg });
        setTimeout(() => setAlert(null), 3000);
      }
      setCurrentLoading(null);

      // Wait 3 seconds before next API call
      await sleep(3000);

      // 4. Fetch demographics
      setCurrentLoading("demographics");
      try {
        console.log("Fetching demographics for:", startupIdea);
        const demographicsResult = await getAudienceMap(startupIdea);
        console.log("Demographics result:", demographicsResult);
        setDemographicsData(demographicsResult);
        setAlert({ type: "success", message: "Customer demographics loaded" });
        setTimeout(() => setAlert(null), 3000);
      } catch (err: any) {
        console.error("Error fetching demographics:", err);
        const errorMsg = err?.message?.includes("429") ? "Rate limit - waiting..." : "Failed to fetch demographics";
        setAlert({ type: "error", message: errorMsg });
        setTimeout(() => setAlert(null), 3000);
      }
      setCurrentLoading(null);
    };

    fetchDataSequentially();
  }, [startupIdea]); // Re-fetch when startup idea changes

  const getLoadingMessage = () => {
    switch (currentLoading) {
      case "competitors":
        return "Loading market competitors...";
      case "vcs":
        return "Loading VCs and investors...";
      case "cofounders":
        return "Loading potential cofounders...";
      case "demographics":
        return "Loading customer demographics...";
      case "chat":
        return "Thinking...";
      default:
        return null;
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || currentLoading === "chat") return;

    const userMessage = chatInput.trim();
    setChatInput("");

    // Add user message to chat
    const newUserMessage: ChatMessage = {
      role: "user",
      content: userMessage,
    };
    setChatMessages((prev) => [...prev, newUserMessage]);
    setIsChatExpanded(true);

    // Prepare context from cached data
    const contextData = {
      vcs: vcsData?.vcs,
      cofounders: cofoundersData?.cofounders,
      competitors: competitorsData?.competitors,
      demographics: demographicsData,
    };

    // Send to backend with context
    setCurrentLoading("chat");
    try {
      const response = await sendChatMessage(startupIdea, userMessage, contextData);
      
      // Add assistant response to chat
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.response,
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      setAlert({ type: "error", message: "Failed to get response from AI" });
      setTimeout(() => setAlert(null), 3000);
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setCurrentLoading(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full">
      {/* Loading indicator */}
      {currentLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-96">
          <InputGroup data-disabled>
            <InputGroupInput placeholder={getLoadingMessage() || "Loading..."} disabled />
            <InputGroupAddon>
              <LoaderIcon className="animate-spin" />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <InputGroupText className="text-muted-foreground">
              </InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </div>
      )}

      {/* Success/Error alerts */}
      {alert && (
        <div className="absolute top-4 left-4 z-20">
          <Alert variant={alert.type === "error" ? "destructive" : "default"} className="bg-card/90">
            {alert.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        </div>
      )}

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
        {onGeneratePitchDeck && (
          <div className="w-full max-w-xs">
            <button
              onClick={onGeneratePitchDeck}
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
        )}
        <div className="w-full max-w-xs">
          <button
            className="w-full border p-3 shadow-sm bg-card opacity-90 rounded-lg transition-all duration-200 hover:opacity-100 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-left flex-1">
                <div className="text-sm font-medium leading-snug">
                  Market Analysis
                </div>
                <div className="text-xs text-muted-foreground leading-normal font-normal">
                  Deep dive into market trends & insights
                </div>
              </div>
              <svg className="h-5 w-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </button>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-xl">
        {/* Chat messages - expand upward */}
        {isChatExpanded && chatMessages.length > 0 && (
          <div 
            ref={chatContainerRef}
            className="mb-2 max-h-96 overflow-y-auto flex flex-col-reverse gap-2 px-2"
          >
            {/* Reverse the array so newest messages are at the bottom visually but container scrolls from bottom */}
            {[...chatMessages].reverse().map((msg, idx) => (
              <div
                key={chatMessages.length - 1 - idx}
                className={`p-3 rounded-lg ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground ml-auto max-w-[80%]"
                    : "bg-card border shadow-sm mr-auto max-w-[85%]"
                }`}
              >
                {msg.role === "user" ? (
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                ) : (
                  <MarkdownRenderer content={msg.content} className="text-sm" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Chat input */}
        <InputGroup className="opacity-95">
          <InputGroupTextarea
            ref={textareaRef}
            placeholder="Ask, Search or Chat..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[60px] max-h-32 resize-none"
          />
          <InputGroupAddon align="block-end">
            <InputGroupButton
              variant="outline"
              className="rounded-full"
              size="icon-xs"
              onClick={() => setIsChatExpanded(!isChatExpanded)}
            >
              <PlusIcon />
            </InputGroupButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <InputGroupButton variant="ghost">Quick Actions</InputGroupButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="[--radius:0.95rem]"
              >
                <DropdownMenuItem onClick={() => setChatInput("Tell me about my competitors")}>
                  Competitor Analysis
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setChatInput("Who is my target customer?")}>
                  Customer Demographics
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setChatInput("Which VCs should I target?")}>
                  VC Recommendations
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setChatInput("What skills should I look for in a cofounder?")}>
                  Cofounder Advice
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <InputGroupText className="ml-auto"></InputGroupText>
            <InputGroupText className="ml-auto"></InputGroupText>
            <Separator orientation="vertical" className="!h-4" />
            <InputGroupButton
              variant="default"
              className="rounded-full"
              size="icon-xs"
              onClick={handleSendMessage}
              disabled={!chatInput.trim() || currentLoading === "chat"}
            >
              {currentLoading === "chat" ? (
                <LoaderIcon className="animate-spin" />
              ) : (
                <ArrowUpIcon />
              )}
              <span className="sr-only">Send</span>
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        </InputGroup>
      </div>
      <div className="absolute inset-0 w-full h-full">
        <AudienceMap
          showVCs={showVCs}
          showCompetitors={showCompetitors}
          showDemographics={showDemographics}
          showCofounders={showCofounders}
          competitorsData={competitorsData}
          vcsData={vcsData}
          cofoundersData={cofoundersData}
          demographicsData={demographicsData}
          onHeatmapClick={handleHeatmapClick}
        />
      </div>
    </div>
  );
}

