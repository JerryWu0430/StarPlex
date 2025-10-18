"use client";

import { useState, useEffect, useRef } from "react";
import AudienceMap from "@/components/AudienceMap";
import { FieldSwitch } from "@/components/fieldSwitch";
import { InputGroup, InputGroupButton, InputGroupAddon, InputGroupText, InputGroupTextarea, InputGroupInput } from "@/components/ui/input-group";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ArrowUpIcon, LoaderIcon, PlusIcon, CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import { findCompetitors, findVCs, findCofounders, getAudienceMap, sendChatMessage, type CompetitorResponse, type VCResponse, type CofounderResponse, type ChatMessage } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Feature } from "geojson";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

type LoadingStatus = "competitors" | "vcs" | "cofounders" | "demographics" | null;
type AlertType = { type: "success" | "error"; message: string } | null;

interface AppPageProps {
  initialQuery?: string;
  onGeneratePitchDeck?: () => void;
  isGeneratingPitchDeck?: boolean;
}

export default function AppPage({ initialQuery, onGeneratePitchDeck, isGeneratingPitchDeck = false }: AppPageProps) {
  // all data is shown by default
  const [showVCs, setShowVCs] = useState(true);
  const [showCompetitors, setShowCompetitors] = useState(true);
  const [showDemographics, setShowDemographics] = useState(true);
  const [showCofounders, setShowCofounders] = useState(true);

  // Cached data
  const [competitorsData, setCompetitorsData] = useState<CompetitorResponse | null>(null);
  const [vcsData, setVCsData] = useState<VCResponse | null>(null);
  const [cofoundersData, setCofoundersData] = useState<CofounderResponse | null>(null);
  const [demographicsData, setDemographicsData] = useState<any | null>(null);

  // Loading and alert states
  const [currentLoading, setCurrentLoading] = useState<LoadingStatus>(null);
  const [alert, setAlert] = useState<AlertType>(null);

  // Sidebar state for heatmap details
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [selectedHeatmapFeature, setSelectedHeatmapFeature] = useState<Feature | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const startupIdea = initialQuery?.trim() || "";

  // Helper function to add delay between API calls
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Handle chat message send
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isSendingChat || !startupIdea) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: chatInput.trim(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsChatExpanded(true);
    setIsSendingChat(true);

    try {
      const response = await sendChatMessage(startupIdea, userMessage.content, {
        vcs: vcsData?.vcs,
        cofounders: cofoundersData?.cofounders,
        competitors: competitorsData?.competitors,
        demographics: demographicsData,
      });

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.response,
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error sending chat message:", error);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Sorry, I encountered an error processing your message. Please try again.",
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Handle Enter key to send message
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-scroll to bottom when new messages arrive and chat is expanded
  useEffect(() => {
    if (isChatExpanded && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isChatExpanded]);


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
      default:
        return null;
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
        <FieldSwitch
          title="Customer Demographics"
          description="Where's the market?"
          checked={showDemographics}
          onCheckedChange={setShowDemographics}
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
      </div>
      

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-xl opacity-95">
        {/* Collapsed chat indicator */}
        {!isChatExpanded && chatMessages.length > 0 && (
          <div className="mb-2 flex justify-center animate-in fade-in duration-200">
            <button
              onClick={() => setIsChatExpanded(true)}
              className="px-4 py-2 bg-card/95 backdrop-blur-md rounded-full shadow-lg border border-border/50 hover:bg-card transition-all duration-200 flex items-center gap-2 hover:scale-105"
            >
              <span className="text-xs font-medium">
                {chatMessages.length} message{chatMessages.length !== 1 ? 's' : ''}
              </span>
              <ChevronDown className="h-3 w-3 rotate-180" />
            </button>
          </div>
        )}
        
        {/* Chat messages - expand upward */}
        {isChatExpanded && chatMessages.length > 0 && (
          <div className="mb-2 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="relative bg-card/98 backdrop-blur-md rounded-lg shadow-2xl border border-border/50">
              {/* Collapse button */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
                <span className="text-xs text-muted-foreground font-medium">
                  Chat Messages
                </span>
                <button
                  onClick={() => setIsChatExpanded(false)}
                  className="p-1 hover:bg-muted rounded-md transition-colors"
                  aria-label="Collapse chat"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              
              {/* Messages container */}
              <div
                ref={chatContainerRef}
                className="max-h-96 overflow-y-auto p-4 flex flex-col-reverse custom-scrollbar"
              >
                {/* Messages in reverse order so newest is at bottom */}
                {[...chatMessages].reverse().map((msg, idx) => (
                  <div
                    key={chatMessages.length - 1 - idx}
                    className={`mb-3 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <MarkdownRenderer content={msg.content} />
                      ) : (
                        <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <InputGroup>
          <InputGroupTextarea
            placeholder="Ask, Search or Chat..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSendingChat}
          />
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
              onClick={handleSendMessage}
              disabled={isSendingChat || !chatInput.trim()}
            >
              {isSendingChat ? (
                <LoaderIcon className="animate-spin" />
              ) : (
                <ArrowUpIcon />
              )}
              <span className="sr-only">Send</span>
            </InputGroupButton>
          </InputGroupAddon>
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

