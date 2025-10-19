"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl, { Map, Marker, LngLatBounds, FillExtrusionLayer } from "mapbox-gl";
import type { FeatureCollection, Feature, Point } from "geojson";
import "mapbox-gl/dist/mapbox-gl.css";
import UnifiedPinSidebar, { transformMarketAnalysisToStats } from "./UnifiedPinSidebar";

/** ---------- Types ---------- */
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
type AudienceCollection = FeatureCollection<Point, AudienceProps>;

type AudienceMapProps = {
  /** Optional Mapbox token override (else fallback below) */
  token?: string;
  /** Initial Mapbox style URL (defaults to LIGHT_STYLE = "standard" globe) */
  initialStyle?: string;
  /** Show the light/dark toggle button */
  enableThemeToggle?: boolean;
  /** Container style/class */
  style?: React.CSSProperties;
  className?: string;
  /** Toggle flags for different overlays */
  showVCs?: boolean;
  showCompetitors?: boolean;
  showDemographics?: boolean;
  showCofounders?: boolean;
  /** Data from API calls */
  competitorsData?: unknown;
  vcsData?: unknown;
  cofoundersData?: unknown;
  demographicsData?: unknown;
  marketAnalysisData?: unknown;
};

/** ---------- Styles ---------- */
/** Light = original globe look */
const LIGHT_STYLE = "mapbox://styles/mapbox/standard";
/** Dark theme you like */
const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

/** Default initial style */
const DEFAULT_STYLE = DARK_STYLE;

/** Dev token fallback — replace with your env if you prefer */
const envToken =
  "pk.eyJ1IjoiYWR3aXRoYW5zIiwiYSI6ImNtZ3Y0ejF1ajBna3gya3NlOGxlM2dvaHQifQ.Nm-Nyqb3OLpB1cpZCzvTIw";

/** =======================================================================
 * AudienceMap
 * ======================================================================= */
export default function AudienceMap({
  token,
  competitorsData,
  vcsData,
  cofoundersData,
  demographicsData,
  marketAnalysisData,
  initialStyle = DEFAULT_STYLE,
  enableThemeToggle = false,
  style,
  className,
  showVCs = true,
  showCompetitors = true,
  showDemographics = true,
  showCofounders = true,
}: AudienceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const vcMarkersRef = useRef<Marker[]>([]);
  const competitorMarkersRef = useRef<Marker[]>([]);
  const cofounderMarkersRef = useRef<Marker[]>([]);
  const [styleUrl, setStyleUrl] = useState<string>(initialStyle);
  const [heatmapData, setHeatmapData] = useState<AudienceCollection | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedPinData, setSelectedPinData] = useState<unknown>(null);

  /** Handle pin click to show sidebar */
  const handlePinClick = useCallback((pinData: unknown) => {
    setSelectedPinData(pinData);
    setSidebarVisible(true);
  }, []);

  /** Handle sidebar close */
  const handleSidebarClose = useCallback(() => {
    setSidebarVisible(false);
    setSelectedPinData(null);
  }, []);

  /** Offset coordinates to prevent overlapping markers with different patterns for each type */
  const offsetDuplicateCoordinates = (lat: number, lng: number, markerType: 'vc' | 'competitor' | 'cofounder' = 'vc') => {
    const BASE_OFFSET = 0.03; // Base offset in degrees (~33 meters)

    // Different offset patterns for each marker type to ensure they don't overlap
    const offsetPatterns = {
      vc: { lat: 0, lng: 0 }, // VCs stay at original position
      competitor: { lat: BASE_OFFSET, lng: BASE_OFFSET }, // Competitors offset northeast
      cofounder: { lat: -BASE_OFFSET, lng: BASE_OFFSET }, // Cofounders offset northwest
    };

    const pattern = offsetPatterns[markerType];

    // Add a small random variation to prevent exact overlaps within same type
    const randomVariation = (Math.random() - 0.5) * (BASE_OFFSET * 0.3);

    return [
      lng + pattern.lng + randomVariation,
      lat + pattern.lat + randomVariation
    ];
  };

  /** Load demographics data and update map */
  const loadDemographicsData = useCallback((data: AudienceCollection, showDemographicsFlag: boolean, marketAnalysis: unknown, handlePinClickFn: (pinData: unknown) => void) => {
    const map = mapRef.current;
    if (!map) return;

    // Store data for heatmap
    setHeatmapData(data);

    // Fit bounds / center
    const coords = data.features.map((f) => f.geometry.coordinates);
    if (coords.length > 1) {
      const bounds = new LngLatBounds(coords[0] as [number, number], coords[0] as [number, number]);
      coords.forEach((c) => bounds.extend(c as [number, number]));
      map.fitBounds(bounds, { padding: 100, duration: 1200 });
    } else if (coords.length === 1) {
      map.setCenter(coords[0] as [number, number]);
      map.setZoom(10);
    }

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add heatmap if demographics enabled
    if (showDemographicsFlag) {
      // Remove existing heatmap first
      if (map.getLayer("audience-heatmap-layer")) {
        map.removeLayer("audience-heatmap-layer");
      }
      if (map.getSource("audience-heatmap")) {
        map.removeSource("audience-heatmap");
      }

      // Add heatmap source
      map.addSource("audience-heatmap", {
        type: "geojson",
        data: data,
      });

      // Add heatmap layer
      if (!map.getLayer("audience-heatmap-layer")) {
        map.addLayer({
          id: "audience-heatmap-layer",
          type: "heatmap",
          source: "audience-heatmap",
          maxzoom: 15,
          paint: {
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["get", "weight"],
              0,
              0,
              1,
              1,
            ],
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              1,
              15,
              3,
            ],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(0, 0, 255, 0)",
              0.1,
              "rgb(0, 0, 255)",
              0.3,
              "rgb(0, 255, 0)",
              0.5,
              "rgb(255, 255, 0)",
              0.7,
              "rgb(255, 165, 0)",
              1,
              "rgb(255, 0, 0)",
            ],
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              20,
              15,
              60,
            ],
            "heatmap-opacity": 0.6,
          },
        });

        // Add cursor pointer for clickable heatmap
        map.getCanvas().style.cursor = "pointer";

        // Add click interactions for heatmap
        map.on("click", "audience-heatmap-layer", (e) => {
          e.preventDefault();
          e.originalEvent.stopPropagation();
          if (e.features && e.features.length > 0) {
            const feature = e.features[0] as unknown as AudienceFeature;
            // Convert heatmap feature to pin data format
            const heatmapPinData = {
              type: 'audience',
              name: feature.properties?.name || 'Audience Member',
              location: feature.properties?.display_name || feature.properties?.area_code || 'Unknown Location',
              description: feature.properties?.description,
              target_fit: feature.properties?.target_fit,
              weight: feature.properties?.weight || 1,
              coordinates: {
                latitude: feature.geometry.coordinates[1],
                longitude: feature.geometry.coordinates[0]
              },
              marketStats: marketAnalysis ? transformMarketAnalysisToStats(marketAnalysis) : undefined
            };
            handlePinClickFn(heatmapPinData);
          }
        });
      }
    }
  }, []);

  /** Add heatmap layer for audience data */
  const addHeatmapLayer = useCallback((marketAnalysis: unknown, handlePinClickFn: (pinData: unknown) => void) => {
    const map = mapRef.current;
    if (!map || !heatmapData || !map.getSource("audience-heatmap")) return;

    if (!map.getLayer("audience-heatmap-layer")) {
      map.addLayer({
        id: "audience-heatmap-layer",
        type: "heatmap",
        source: "audience-heatmap",
        maxzoom: 15,
        paint: {
          "heatmap-weight": [
            "interpolate",
            ["linear"],
            ["get", "weight"],
            0,
            0,
            1,
            1,
          ],
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            1,
            15,
            3,
          ],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(0, 0, 255, 0)",
            0.1,
            "rgb(0, 0, 255)",
            0.3,
            "rgb(0, 255, 0)",
            0.5,
            "rgb(255, 255, 0)",
            0.7,
            "rgb(255, 165, 0)",
            1,
            "rgb(255, 0, 0)",
          ],
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            20,
            15,
            60,
          ],
          "heatmap-opacity": 0.6,
        },
      });

      // Add cursor pointer for clickable heatmap
      map.getCanvas().style.cursor = "pointer";

      // Add click interactions for heatmap
      map.on("click", "audience-heatmap-layer", (e) => {
        e.preventDefault();
        e.originalEvent.stopPropagation();
        if (e.features && e.features.length > 0) {
          const feature = e.features[0] as unknown as AudienceFeature;
          // Convert heatmap feature to pin data format
          const heatmapPinData = {
            type: 'audience',
            name: feature.properties?.name || 'Audience Member',
            location: feature.properties?.display_name || feature.properties?.area_code || 'Unknown Location',
            description: feature.properties?.description,
            target_fit: feature.properties?.target_fit,
            weight: feature.properties?.weight || 1,
            coordinates: {
              latitude: feature.geometry.coordinates[1],
              longitude: feature.geometry.coordinates[0]
            },
            marketStats: marketAnalysis ? transformMarketAnalysisToStats(marketAnalysis) : undefined
          };
          handlePinClickFn(heatmapPinData);
        }
      });
    }
  }, [heatmapData]);

  /** Remove heatmap layer */
  const removeHeatmapLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.getLayer("audience-heatmap-layer")) {
      map.removeLayer("audience-heatmap-layer");
    }
    if (map.getSource("audience-heatmap")) {
      map.removeSource("audience-heatmap");
    }
  }, []);

  /** Initialize the map ONCE */
  useEffect(() => {
    const MAPBOX_TOKEN = token ?? envToken ?? "";
    if (!MAPBOX_TOKEN) {
      console.error("Mapbox token missing. Pass the 'token' prop.");
      return;
    }
    if (!containerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [0, 15],
      zoom: 1.2,
      pitch: 0,
      bearing: 0,
      antialias: true,
      attributionControl: false,
      logoPosition: 'bottom-right',
      trackResize: true,
      collectResourceTiming: false, 
    });
    mapRef.current = map;

    /** Keep globe projection whenever styles load/swap */
    const ensureGlobeProjection = () => {
      // If you want globe for both light and dark, keep 'globe' always:
      map.setProjection("globe");
    };

    /** Safely add 3D buildings only for styles that expose 'composite' (e.g., light/dark/streets) */
    const add3dBuildingsIfAvailable = () => {
      const styleObj = map.getStyle();
      const hasComposite = !!styleObj?.sources?.["composite"];
      if (!hasComposite) return; // Mapbox "standard" doesn't expose 'composite'; skip to avoid errors

      const labelLayerId = (styleObj.layers || []).find(
        (l: { type?: string; layout?: Record<string, unknown> }) => l.type === "symbol" && l.layout?.["text-field"]
      )?.id;

      if (!map.getLayer("add-3d-buildings")) {
        const extrusionLayer: FillExtrusionLayer = {
          id: "add-3d-buildings",
          type: "fill-extrusion",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          minzoom: 15,
          paint: {
            "fill-extrusion-color": "#aaa",
            "fill-extrusion-height": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              0,
              15.05,
              ["get", "height"],
            ],
            "fill-extrusion-base": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              0,
              15.05,
              ["get", "min_height"],
            ],
            "fill-extrusion-opacity": 0.6,
          },
        };
        map.addLayer(extrusionLayer, labelLayerId);
      }
    };


    /** When a style is (re)loaded, keep globe + optional 3D buildings, and reattach markers */
    map.on("style.load", () => {
      ensureGlobeProjection();       // <- keep the globe look
      add3dBuildingsIfAvailable();   // <- only adds on styles that support it
      markersRef.current.forEach((m) => m.addTo(map));
      // Re-add heatmap if demographics enabled and data exists
      if (showDemographics && heatmapData) {
        addHeatmapLayer(marketAnalysisData, handlePinClick);
      }
    });

    /** First-time data load */
    map.on("load", async () => {
      try {
        ensureGlobeProjection(); // make sure initial style starts as globe too

        // If demographics data is available, load it immediately
        if (demographicsData) {
          loadDemographicsData(demographicsData as AudienceCollection, showDemographics, marketAnalysisData, handlePinClick);
        }
      } catch (err) {
        console.error("Error in map load:", err);
      }
    });

    /** Cleanup on unmount */
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      vcMarkersRef.current.forEach((m) => m.remove());
      vcMarkersRef.current = [];
      competitorMarkersRef.current.forEach((m) => m.remove());
      competitorMarkersRef.current = [];
      cofounderMarkersRef.current.forEach((m) => m.remove());
      cofounderMarkersRef.current = [];
      removeHeatmapLayer();
      map.remove();
      mapRef.current = null;
    };
    // init once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Handle VC toggle - display VCs as pins */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing VC markers
    vcMarkersRef.current.forEach((m) => m.remove());
    vcMarkersRef.current = [];

    if (!showVCs || !vcsData) return;

    // Use data from props
    const data = vcsData;
    console.log("Displaying VCs on map:", data);

    try {

      // Add VC markers to the map
      (data as { vcs: Array<{ coordinates?: { latitude: number; longitude: number }; name: string; firm: string; location: string; links: string[]; match_score: number; explanation?: unknown }> }).vcs.forEach((vc) => {
        const { coordinates, name, firm, location, links, match_score } = vc;

        if (!coordinates?.latitude || !coordinates?.longitude) return;

        // Prepare VC data for sidebar
        const vcData = {
          type: 'vc',
          name,
          firm,
          location,
          match_score,
          links,
          coordinates,
          explanation: vc.explanation
        };

        // Create a custom VC marker element (different color to distinguish from audience)
        const el = document.createElement("div");
        el.className = "vc-marker";
        el.style.cssText = `
            background-color: #10b981;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          `;
        el.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" x2="12" y1="2" y2="22"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        `;

        const [lng, lat] = offsetDuplicateCoordinates(
          coordinates.latitude,
          coordinates.longitude,
          'vc'
        );

        const marker = new mapboxgl.Marker({ element: el, draggable: false })
          .setLngLat([lng, lat])
          .addTo(map);

        // Add click handler for sidebar
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          handlePinClick(vcData);
        });

        vcMarkersRef.current.push(marker);
      });
    } catch (error) {
      console.error("Error displaying VCs:", error);
    }
  }, [showVCs, vcsData, handlePinClick]);

  /** Handle Competitor toggle - display competitors as pins */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing competitor markers
    competitorMarkersRef.current.forEach((m) => m.remove());
    competitorMarkersRef.current = [];

    if (!showCompetitors || !competitorsData) return;

    // Use data from props
    const data = competitorsData;
    console.log("Displaying competitors on map:", data);

    try {
      // Add competitor markers to the map
      (data as { competitors: Array<{ coordinates?: { latitude: number; longitude: number }; company_name: string; location: string; links: string[]; date_founded: string; threat_score: number; explanation?: unknown }> }).competitors.forEach((competitor) => {
        const { coordinates, company_name, location, links, date_founded, threat_score } = competitor;

        if (!coordinates?.latitude || !coordinates?.longitude) return;

        // Prepare competitor data for sidebar
        const competitorData = {
          type: 'competitor',
          company_name,
          location,
          date_founded,
          threat_score,
          links,
          coordinates,
          explanation: competitor.explanation
        };

        // Create a custom competitor marker element (red color to distinguish)
        const el = document.createElement("div");
        el.className = "competitor-marker";
        el.style.cssText = `
            background-color: #ef4444;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          `;
        el.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polyline>
            <line x1="13" x2="19" y1="19" y2="13"></line>
            <line x1="16" x2="20" y1="16" y2="20"></line>
            <line x1="19" x2="21" y1="21" y2="19"></line>
            <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"></polyline>
            <line x1="5" x2="9" y1="14" y2="18"></line>
            <line x1="7" x2="4" y1="17" y2="20"></line>
            <line x1="3" x2="5" y1="19" y2="21"></line>
          </svg>
        `;

        const [lng, lat] = offsetDuplicateCoordinates(
          coordinates.latitude,
          coordinates.longitude,
          'competitor'
        );

        const marker = new mapboxgl.Marker({ element: el, draggable: false })
          .setLngLat([lng, lat])
          .addTo(map);

        // Add click handler for sidebar
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          handlePinClick(competitorData);
        });

        competitorMarkersRef.current.push(marker);
      });
    } catch (error) {
      console.error("Error displaying competitors:", error);
    }
  }, [showCompetitors, competitorsData, handlePinClick]);

  /** Handle Cofounder toggle - display cofounders as pins */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing cofounder markers
    cofounderMarkersRef.current.forEach((m) => m.remove());
    cofounderMarkersRef.current = [];

    if (!showCofounders || !cofoundersData) return;

    // Use data from props
    const data = cofoundersData;
    console.log("Displaying cofounders on map:", data);

    try {

      // Add cofounder markers to the map
      (data as { cofounders: Array<{ coordinates?: { latitude: number; longitude: number }; name: string; location: string; links: string[]; match_score: number; explanation?: unknown }> }).cofounders.forEach((cofounder) => {
        const { coordinates, name, location, links, match_score } = cofounder;

        if (!coordinates?.latitude || !coordinates?.longitude) return;

        // Prepare cofounder data for sidebar
        const cofounderData = {
          type: 'cofounder',
          name,
          location,
          match_score,
          links,
          coordinates,
          explanation: cofounder.explanation
        };

        // Create a custom cofounder marker element (purple color to distinguish)
        const el = document.createElement("div");
        el.className = "cofounder-marker";
        el.style.cssText = `
            background-color: #8b5cf6;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          `;
        el.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        `;

        const [lng, lat] = offsetDuplicateCoordinates(
          coordinates.latitude,
          coordinates.longitude,
          'cofounder'
        );

        const marker = new mapboxgl.Marker({ element: el, draggable: false })
          .setLngLat([lng, lat])
          .addTo(map);

        // Add click handler for sidebar
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          handlePinClick(cofounderData);
        });

        cofounderMarkersRef.current.push(marker);
      });
    } catch (error) {
      console.error("Error displaying cofounders:", error);
    }
  }, [showCofounders, cofoundersData, handlePinClick]);

  /** Handle demographics data changes */
  useEffect(() => {
    if (demographicsData && mapRef.current) {
      console.log("Demographics data received, loading into map:", demographicsData);
      loadDemographicsData(demographicsData as AudienceCollection, showDemographics, marketAnalysisData, handlePinClick);
    }
  }, [demographicsData, showDemographics, marketAnalysisData, handlePinClick, loadDemographicsData]);

  /** Handle demographics toggle - show heatmap when demographics is enabled */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (showDemographics && heatmapData) {
      // Clear any existing markers when demographics is enabled
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // Remove existing heatmap first
      removeHeatmapLayer();

      // Add heatmap source
      map.addSource("audience-heatmap", {
        type: "geojson",
        data: heatmapData,
      });

      // Add heatmap layer
      addHeatmapLayer(marketAnalysisData, handlePinClick);
    } else {
      // When demographics is disabled, remove heatmap and clear all markers
      removeHeatmapLayer();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    }
  }, [showDemographics, heatmapData, addHeatmapLayer, removeHeatmapLayer, marketAnalysisData, handlePinClick]);

  /** Toggle styles using setStyle (no re-init) and preserve globe */
  const handleToggleTheme = () => {
    const map = mapRef.current;
    if (!map) return;

    const next = styleUrl === LIGHT_STYLE ? DARK_STYLE : LIGHT_STYLE;
    setStyleUrl(next);
    map.setStyle(next); // 'style.load' handler will re-apply globe + optional 3D layer
  };

  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        width: "100%",
        ...style,
      }}
      className={className}
    >
      {enableThemeToggle && (
        <div
          style={{
            position: "absolute",
            zIndex: 1,
            top: 10,
            left: 10,
            background: "white",
            borderRadius: 8,
            padding: "6px 10px",
            boxShadow: "0 4px 16px rgba(0,0,0,.12)",
          }}
        >
          <button onClick={handleToggleTheme}>
            {styleUrl === LIGHT_STYLE ? "Dark mode" : "Light (Globe)"}
          </button>
        </div>
      )}

      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {/* Unified Pin Sidebar */}
      <UnifiedPinSidebar
        pinData={selectedPinData as never}
        isVisible={sidebarVisible}
        onClose={handleSidebarClose}
        position="left"
        width="480px"
      />
    </div>
  );
}
