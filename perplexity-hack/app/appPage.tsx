"use client";

import { useState, useEffect, useRef } from "react";
import AudienceMap from "@/components/AudienceMap";
import { FieldSwitch } from "@/components/fieldSwitch";
import { InputGroup, InputGroupButton, InputGroupAddon, InputGroupText, InputGroupTextarea, InputGroupInput } from "@/components/ui/input-group";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ArrowUpIcon, LoaderIcon, PlusIcon, CheckCircle2, XCircle } from "lucide-react";
import { findCompetitors, findVCs, findCofounders, getAudienceMap, type CompetitorResponse, type VCResponse, type CofounderResponse } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";

type LoadingStatus = "competitors" | "vcs" | "cofounders" | "demographics" | null;
type AlertType = { type: "success" | "error"; message: string } | null;

export default function AppPage({ initialQuery }: { initialQuery?: string }) {
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

  const startupIdea = initialQuery || "";

  // Fetch ALL data sequentially - one at a time
  useEffect(() => {
    if (!startupIdea) return;

    const fetchDataSequentially = async () => {
      // 1. Fetch competitors
      setCurrentLoading("competitors");
      try {
        console.log("Fetching competitors for:", startupIdea);
        const competitorsResult = await findCompetitors(startupIdea);
        setCompetitorsData(competitorsResult);
        setAlert({ type: "success", message: `Found ${competitorsResult.total_found} competitors` });
        setTimeout(() => setAlert(null), 3000);
      } catch (err) {
        console.error("Error fetching competitors:", err);
        setAlert({ type: "error", message: "Failed to fetch competitors" });
        setTimeout(() => setAlert(null), 3000);
      }
      setCurrentLoading(null);

      // 2. Fetch VCs
      setCurrentLoading("vcs");
      try {
        console.log("Fetching VCs for:", startupIdea);
        const vcsResult = await findVCs(startupIdea);
        setVCsData(vcsResult);
        setAlert({ type: "success", message: `Found ${vcsResult.total_found} VCs` });
        setTimeout(() => setAlert(null), 3000);
      } catch (err) {
        console.error("Error fetching VCs:", err);
        setAlert({ type: "error", message: "Failed to fetch VCs" });
        setTimeout(() => setAlert(null), 3000);
      }
      setCurrentLoading(null);

      // 3. Fetch cofounders
      setCurrentLoading("cofounders");
      try {
        console.log("Fetching cofounders for:", startupIdea);
        const cofoundersResult = await findCofounders(startupIdea);
        setCofoundersData(cofoundersResult);
        setAlert({ type: "success", message: `Found ${cofoundersResult.total_found} cofounders` });
        setTimeout(() => setAlert(null), 3000);
      } catch (err) {
        console.error("Error fetching cofounders:", err);
        setAlert({ type: "error", message: "Failed to fetch cofounders" });
        setTimeout(() => setAlert(null), 3000);
      }
      setCurrentLoading(null);

      // 4. Fetch demographics
      setCurrentLoading("demographics");
      try {
        console.log("Fetching demographics for:", startupIdea);
        const demographicsResult = await getAudienceMap(startupIdea);
        setDemographicsData(demographicsResult);
        setAlert({ type: "success", message: "Customer demographics loaded" });
        setTimeout(() => setAlert(null), 3000);
      } catch (err) {
        console.error("Error fetching demographics:", err);
        setAlert({ type: "error", message: "Failed to fetch demographics" });
        setTimeout(() => setAlert(null), 3000);
      }
      setCurrentLoading(null);
    };

    fetchDataSequentially();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

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
      </div>
      <InputGroup data-disabled>
        <InputGroupInput placeholder="Refreshing data..." disabled />
        <InputGroupAddon>
          <LoaderIcon className="animate-spin" />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <InputGroupText className="text-muted-foreground">
            Please wait...
          </InputGroupText>
        </InputGroupAddon>
      </InputGroup>

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

