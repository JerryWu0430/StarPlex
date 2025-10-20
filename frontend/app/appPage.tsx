"use client";

import { useState, useEffect, useRef } from "react";
import AudienceMap from "@/components/AudienceMap";
import { FieldSwitch } from "@/components/fieldSwitch";
import { InputGroup, InputGroupButton, InputGroupAddon, InputGroupText, InputGroupTextarea, InputGroupInput } from "@/components/ui/input-group";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ArrowUpIcon, LoaderIcon, PlusIcon, CheckCircle2, XCircle, ChevronDown, Settings, X } from "lucide-react";
import { findCompetitors, findVCs, findCofounders, getAudienceMap, sendChatMessage, type CompetitorResponse, type VCResponse, type CofounderResponse, type ChatMessage } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useStartup } from "@/contexts/StartupContext";

type LoadingStatus = "competitors" | "vcs" | "cofounders" | "demographics" | null;
type AlertType = { type: "success" | "error"; message: string } | null;

interface AppPageProps {
  initialQuery?: string;
  onGeneratePitchDeck?: () => void;
  isGeneratingPitchDeck?: boolean;
}

export default function AppPage({ initialQuery, onGeneratePitchDeck, isGeneratingPitchDeck = false }: AppPageProps) {
  const { startupIdea } = useStartup();

  // all data is shown by default
  const [showVCs, setShowVCs] = useState(true);
  const [showCompetitors, setShowCompetitors] = useState(true);
  const [showDemographics, setShowDemographics] = useState(true);
  const [showCofounders, setShowCofounders] = useState(true);

  // Cached data
  const [competitorsData, setCompetitorsData] = useState<CompetitorResponse | null>(null);
  const [vcsData, setVCsData] = useState<VCResponse | null>(null);
  const [cofoundersData, setCofoundersData] = useState<CofounderResponse | null>(null);
  const [demographicsData, setDemographicsData] = useState<unknown | null>(null);

  // Loading and alert states
  const [currentLoading, setCurrentLoading] = useState<LoadingStatus>(null);
  const [alert, setAlert] = useState<AlertType>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Use startupIdea from context, fallback to initialQuery prop for backward compatibility
  const currentStartupIdea = startupIdea || initialQuery?.trim() || "";

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
      const response = await sendChatMessage(currentStartupIdea, userMessage.content, {
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
    } catch (error) {
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



  // Fetch ALL data sequentially - one at a time with delays to avoid rate limits
  useEffect(() => {
    if (!currentStartupIdea || currentStartupIdea.length < 3) {
      console.warn("Skipping data fetch: startup idea is empty or too short");
      return;
    }

    const fetchDataSequentially = async () => {
      // Clear old cached data when starting new fetch
      setDemographicsData(null);
      setCompetitorsData(null);
      setCofoundersData(null);
      setDemographicsData(null);

      // 1. Fetch demographics
      setCurrentLoading("demographics");
      try {
        console.log("Fetching demographics for:", startupIdea);
        const demographicsResult = await getAudienceMap(startupIdea);
        console.log("Demographics result:", demographicsResult);
        setDemographicsData(demographicsResult);
        setAlert({ type: "success", message: "Customer demographics loaded" });
        setTimeout(() => setAlert(null), 3000);
      } catch (err) {
        console.error("Error fetching demographics:", err);
        const errorMsg = (err instanceof Error && err.message?.includes("429")) ? "Rate limit - waiting..." : "Failed to fetch demographics";
        setAlert({ type: "error", message: errorMsg });
        setTimeout(() => setAlert(null), 3000);
      }
      setCurrentLoading(null);

      // Wait 3 seconds before next API call to avoid rate limits
      await sleep(3000);

      // 2. Fetch competitors
      setCurrentLoading("competitors");
      try {
        console.log("Fetching competitors for:", currentStartupIdea);
        const competitorsResult = await findCompetitors(currentStartupIdea);
        setCompetitorsData(competitorsResult);
        setAlert({ type: "success", message: `Found ${competitorsResult.total_found} competitors` });
        setTimeout(() => setAlert(null), 3000);
      } catch (err) {
        console.error("Error fetching competitors:", err);
        const errorMsg = (err instanceof Error && err.message?.includes("429")) ? "Rate limit - waiting..." : "Failed to fetch competitors";
        setAlert({ type: "error", message: errorMsg });
        setTimeout(() => setAlert(null), 3000);
      }
      setCurrentLoading(null);

      // Wait 3 seconds before next API call
      await sleep(3000);

      // 3. Fetch cofounders
      setCurrentLoading("cofounders");
      try {
        console.log("Fetching cofounders for:", currentStartupIdea);
        const cofoundersResult = await findCofounders(currentStartupIdea);
        setCofoundersData(cofoundersResult);
        setAlert({ type: "success", message: `Found ${cofoundersResult.total_found} cofounders` });
        setTimeout(() => setAlert(null), 3000);
      } catch (err) {
        console.error("Error fetching cofounders:", err);
        const errorMsg = (err instanceof Error && err.message?.includes("429")) ? "Rate limit - waiting..." : "Failed to fetch cofounders";
        setAlert({ type: "error", message: errorMsg });
        setTimeout(() => setAlert(null), 3000);
      }
      setCurrentLoading(null);

      // Wait 3 seconds before next API call
      await sleep(3000);

      // 4. Fetch VCs
      setCurrentLoading("vcs");
      try {
        console.log("Fetching VCs for:", currentStartupIdea);
        const vcsResult = await findVCs(currentStartupIdea);
        setVCsData(vcsResult);
        setAlert({ type: "success", message: `Found ${vcsResult.total_found} VCs` });
        setTimeout(() => setAlert(null), 3000);
      } catch (err) {
        console.error("Error fetching VCs:", err);
        const errorMsg = (err instanceof Error && err.message?.includes("429")) ? "Rate limit - waiting..." : "Failed to fetch VCs";
        setAlert({ type: "error", message: errorMsg });
        setTimeout(() => setAlert(null), 3000);
      }
      setCurrentLoading(null);
    };

    fetchDataSequentially();
  }, [currentStartupIdea, startupIdea]); // Re-fetch when startup idea changes

  const getLoadingMessage = () => {
    switch (currentLoading) {
      case "competitors":
        return "Finding your competitors...";
      case "vcs":
        return "Loading VCs and investors...";
      case "cofounders":
        return "Loading potential cofounders...";
      case "demographics":
        return "Locating your target audience...";
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full">
      {/* Loading indicator */}
      {currentLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[calc(100vw-2rem)] sm:w-96 max-w-full px-2 sm:px-0">
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
        <div className="absolute top-4 left-2 right-2 sm:left-4 sm:right-auto z-20 max-w-[calc(100vw-1rem)] sm:max-w-md">
          <Alert variant={alert.type === "error" ? "destructive" : "default"} className="bg-card/90">
            {alert.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription className="text-xs sm:text-sm">{alert.message}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Mobile FAB */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="sm:hidden fixed top-4 right-4 z-30 w-12 h-12 bg-card/95 backdrop-blur-md rounded-full shadow-lg border border-border/50 flex items-center justify-center hover:bg-card transition-all duration-200 hover:scale-105"
        aria-label="Open menu"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute top-0 right-0 w-full max-w-xs h-full bg-card/98 backdrop-blur-md border-l border-border/50 animate-in slide-in-from-right duration-300">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/30">
                <h2 className="text-lg font-semibold">Display Options</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <FieldSwitch
                  title="Customer Demographics"
                  description="Where's the market?"
                  checked={showDemographics}
                  onCheckedChange={setShowDemographics}
                />
                <FieldSwitch
                  title="Market Competitors"
                  description="Who's copying your genius idea?"
                  checked={showCompetitors}
                  onCheckedChange={setShowCompetitors}
                />
                <FieldSwitch
                  title="Co-ballers"
                  description="Who's willing to scale a B2B AI SaaS startup?"
                  checked={showCofounders}
                  onCheckedChange={setShowCofounders}
                />
                <FieldSwitch
                  title="VC Victims"
                  description="Who is willing to throw you money?"
                  checked={showVCs}
                  onCheckedChange={setShowVCs}
                />
                {onGeneratePitchDeck && (
                  <>
                    <div className="w-full max-w-xs">
                      <button
                        onClick={() => {
                          onGeneratePitchDeck();
                          setIsMobileMenuOpen(false);
                        }}
                        disabled={isGeneratingPitchDeck}
                        className="w-full border p-3 shadow-sm bg-card opacity-90 rounded-lg transition-all duration-200 hover:opacity-100 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                      >
                        <div className="flex-1 flex flex-col gap-1.5 leading-snug text-left">
                          <div className="text-xs sm:text-sm font-medium leading-snug">
                            {isGeneratingPitchDeck ? "Generating Pitch Deck..." : "Generate Pitch Deck"}
                          </div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground leading-normal font-normal">
                            {isGeneratingPitchDeck
                              ? "AI is creating your presentation..."
                              : "Create investor-ready slides with AI"}
                          </div>
                        </div>
                        {isGeneratingPitchDeck ? (
                          <svg className="animate-spin h-5 w-5 text-primary flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-muted-foreground flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    
                    {/* Comet & Perplexity Links */}
                    <div className="w-full max-w-xs space-y-2 pt-1">
                      <a
                        href="https://pplx.ai/jerry-wu"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full border p-2.5 shadow-sm bg-[#22B8CD]/10 border-[#22B8CD]/30 hover:border-[#22B8CD]/50 rounded-lg transition-all duration-200 hover:shadow-md flex items-center gap-2.5 group"
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.55)]">
                          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                            <path d="M19.785 0v7.272H22.5V17.62h-2.935V24l-7.037-6.194v6.145h-1.091v-6.152L4.392 24v-6.465H1.5V7.188h2.884V0l7.053 6.494V.19h1.09v6.49L19.786 0zm-7.257 9.044v7.319l5.946 5.234V14.44l-5.946-5.397zm-1.099-.08l-5.946 5.398v7.235l5.946-5.234V8.965zm8.136 7.58h1.844V8.349H13.46l6.105 5.54v2.655zm-8.982-8.28H2.59v8.195h1.8v-2.576l6.192-5.62zM5.475 2.476v4.71h5.115l-5.115-4.71zm13.219 0l-5.115 4.71h5.115v-4.71z" fill="#22B8CD" fillRule="nonzero" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium leading-tight group-hover:text-[#22B8CD] transition-colors">
                            Perplexity Pro
                          </div>
                          <div className="text-[10px] text-muted-foreground leading-tight">
                            12 months free for students
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-muted-foreground group-hover:text-[#22B8CD] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>

                      <a
                        href="https://pplx.ai/jerrywu0430"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full border p-2.5 shadow-sm bg-[#22B8CD]/10 border-[#22B8CD]/30 hover:border-[#22B8CD]/50 rounded-lg transition-all duration-200 hover:shadow-md flex items-center gap-2.5 group"
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.55)]">
                          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                            <path d="M19.785 0v7.272H22.5V17.62h-2.935V24l-7.037-6.194v6.145h-1.091v-6.152L4.392 24v-6.465H1.5V7.188h2.884V0l7.053 6.494V.19h1.09v6.49L19.786 0zm-7.257 9.044v7.319l5.946 5.234V14.44l-5.946-5.397zm-1.099-.08l-5.946 5.398v7.235l5.946-5.234V8.965zm8.136 7.58h1.844V8.349H13.46l6.105 5.54v2.655zm-8.982-8.28H2.59v8.195h1.8v-2.576l6.192-5.62zM5.475 2.476v4.71h5.115l-5.115-4.71zm13.219 0l-5.115 4.71h5.115v-4.71z" fill="#22B8CD" fillRule="nonzero" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium leading-tight group-hover:text-[#22B8CD] transition-colors">
                            Perplexity Pro
                          </div>
                          <div className="text-[10px] text-muted-foreground leading-tight">
                            1 month free for anyone
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-muted-foreground group-hover:text-[#22B8CD] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Switches - hidden on mobile */}
      <div className="hidden sm:flex absolute top-4 right-4 z-10 flex-col gap-2">
        <FieldSwitch
          title="Customer Demographics"
          description="Where's the market?"
          checked={showDemographics}
          onCheckedChange={setShowDemographics}
        />
        <FieldSwitch
          title="Market Competitors"
          description="Who's copying your genius idea?"
          checked={showCompetitors}
          onCheckedChange={setShowCompetitors}
        />
        <FieldSwitch
          title="Co-ballers"
          description="Who's willing to scale a B2B AI SaaS startup?"
          checked={showCofounders}
          onCheckedChange={setShowCofounders}
        />
        <FieldSwitch
          title="VC Victims"
          description="Who is willing to throw you money?"
          checked={showVCs}
          onCheckedChange={setShowVCs}
        />
        {onGeneratePitchDeck && (
          <>
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
            
            {/* Comet & Perplexity Links */}
            <div className="w-full max-w-xs space-y-2 pt-1">
              <a
                href="https://pplx.ai/jerry-wu"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full border p-3 shadow-sm bg-[#22B8CD]/10 border-[#22B8CD]/30 hover:border-[#22B8CD]/50 rounded-lg transition-all duration-200 hover:opacity-100 hover:shadow-md flex items-center gap-3 group"
              >
                <div className="flex-shrink-0 w-9 h-9 bg-black rounded-lg flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.55)]">
                  <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
                    <path d="M19.785 0v7.272H22.5V17.62h-2.935V24l-7.037-6.194v6.145h-1.091v-6.152L4.392 24v-6.465H1.5V7.188h2.884V0l7.053 6.494V.19h1.09v6.49L19.786 0zm-7.257 9.044v7.319l5.946 5.234V14.44l-5.946-5.397zm-1.099-.08l-5.946 5.398v7.235l5.946-5.234V8.965zm8.136 7.58h1.844V8.349H13.46l6.105 5.54v2.655zm-8.982-8.28H2.59v8.195h1.8v-2.576l6.192-5.62zM5.475 2.476v4.71h5.115l-5.115-4.71zm13.219 0l-5.115 4.71h5.115v-4.71z" fill="#22B8CD" fillRule="nonzero" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-tight group-hover:text-[#22B8CD] transition-colors">
                    Perplexity Pro
                  </div>
                  <div className="text-xs text-muted-foreground leading-tight">
                    12 months free for students
                  </div>
                </div>
                <svg className="w-4 h-4 text-muted-foreground group-hover:text-[#22B8CD] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              <a
                href="https://pplx.ai/jerrywu0430"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full border p-3 shadow-sm bg-[#22B8CD]/10 border-[#22B8CD]/30 hover:border-[#22B8CD]/50 rounded-lg transition-all duration-200 hover:opacity-100 hover:shadow-md flex items-center gap-3 group"
              >
                <div className="flex-shrink-0 w-9 h-9 bg-black rounded-lg flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.55)]">
                  <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
                    <path d="M19.785 0v7.272H22.5V17.62h-2.935V24l-7.037-6.194v6.145h-1.091v-6.152L4.392 24v-6.465H1.5V7.188h2.884V0l7.053 6.494V.19h1.09v6.49L19.786 0zm-7.257 9.044v7.319l5.946 5.234V14.44l-5.946-5.397zm-1.099-.08l-5.946 5.398v7.235l5.946-5.234V8.965zm8.136 7.58h1.844V8.349H13.46l6.105 5.54v2.655zm-8.982-8.28H2.59v8.195h1.8v-2.576l6.192-5.62zM5.475 2.476v4.71h5.115l-5.115-4.71zm13.219 0l-5.115 4.71h5.115v-4.71z" fill="#22B8CD" fillRule="nonzero" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-tight group-hover:text-[#22B8CD] transition-colors">
                    Perplexity Pro
                  </div>
                  <div className="text-xs text-muted-foreground leading-tight">
                    1 month free for anyone
                  </div>
                </div>
                <svg className="w-4 h-4 text-muted-foreground group-hover:text-[#22B8CD] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </>
        )}
      </div>


      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[calc(100vw-2rem)] sm:w-full sm:max-w-xl opacity-95 px-2 sm:px-0">
        {/* Collapsed chat indicator */}
        {!isChatExpanded && chatMessages.length > 0 && (
          <div className="mb-2 flex justify-center animate-in fade-in duration-200">
            <button
              onClick={() => setIsChatExpanded(true)}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-card/95 backdrop-blur-md rounded-full shadow-lg border border-border/50 hover:bg-card transition-all duration-200 flex items-center gap-2 hover:scale-105"
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
              <div className="flex items-center justify-between px-3 py-2 sm:px-4 border-b border-border/30">
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
                className="max-h-60 sm:max-h-96 overflow-y-auto p-2 sm:p-4 flex flex-col-reverse custom-scrollbar"
              >
                {/* Messages in reverse order so newest is at bottom */}
                {[...chatMessages].reverse().map((msg, idx) => (
                  <div
                    key={chatMessages.length - 1 - idx}
                    className={`mb-2 sm:mb-3 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-2 sm:p-3 ${msg.role === "user"
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
        />
      </div>
    </div>
  );
}

