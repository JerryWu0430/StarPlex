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
