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
import FloatingDetailSidebar from "@/components/FloatingDetailSidebar";
import type { Feature, Point } from "geojson";

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

export default function Home() {
  const [showVCs, setShowVCs] = useState(false);
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [showDemographics, setShowDemographics] = useState(true);
  const [showCofounders, setShowCofounders] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<AudienceFeature | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const handleHeatmapHover = (feature: AudienceFeature | null) => {
    setHoveredFeature(feature);
    setSidebarVisible(feature !== null);
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
        onHeatmapHover={handleHeatmapHover}
      />

      {/* Floating Detail Sidebar */}
      <FloatingDetailSidebar
        position="right"
        width="400px"
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      >
        {hoveredFeature && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {hoveredFeature.properties.name}
              </h3>
              {hoveredFeature.properties.display_name && (
                <p className="text-sm text-gray-600 mt-1">
                  {hoveredFeature.properties.display_name}
                </p>
              )}
            </div>

            {hoveredFeature.properties.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                <p className="text-sm text-gray-600">{hoveredFeature.properties.description}</p>
              </div>
            )}

            {hoveredFeature.properties.target_fit && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Target Fit</h4>
                <p className="text-sm text-gray-600">{hoveredFeature.properties.target_fit}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              {hoveredFeature.properties.country && (
                <div>
                  <span className="font-medium text-gray-700">Country:</span>
                  <p className="text-gray-600">{hoveredFeature.properties.country}</p>
                </div>
              )}
              {hoveredFeature.properties.borough && (
                <div>
                  <span className="font-medium text-gray-700">Borough:</span>
                  <p className="text-gray-600">{hoveredFeature.properties.borough}</p>
                </div>
              )}
              {hoveredFeature.properties.area_code && (
                <div>
                  <span className="font-medium text-gray-700">Area Code:</span>
                  <p className="text-gray-600">{hoveredFeature.properties.area_code}</p>
                </div>
              )}
              {hoveredFeature.properties.weight && (
                <div>
                  <span className="font-medium text-gray-700">Weight:</span>
                  <p className="text-gray-600">{hoveredFeature.properties.weight}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </FloatingDetailSidebar>
    </div>
  );
}
