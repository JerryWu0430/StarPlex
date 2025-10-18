"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl, { Map, Marker, LngLatBounds, FillExtrusionLayer } from "mapbox-gl";
import type { FeatureCollection, Feature, Point } from "geojson";
import "mapbox-gl/dist/mapbox-gl.css";
import UnifiedPinSidebar from "./UnifiedPinSidebar";

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
  /** FastAPI endpoint returning the GeoJSON (FeatureCollection<Point, AudienceProps>) */
  endpoint?: string;
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
  /** Callback for when a heatmap point is clicked */
  onHeatmapClick?: (feature: AudienceFeature | null) => void;
  /** Data from API calls */
  competitorsData?: any;
  vcsData?: any;
  cofoundersData?: any;
  demographicsData?: any;
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
  endpoint = "/audience-map",
  token,
  competitorsData,
  vcsData,
  cofoundersData,
  demographicsData,
  initialStyle = DEFAULT_STYLE,
  enableThemeToggle = false,
  style,
  className,
  showVCs = false,
  showCompetitors = false,
  showDemographics = false,
  showCofounders = false,
  onHeatmapClick,
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
  const [selectedPinData, setSelectedPinData] = useState<any>(null);

  /** Handle pin click to show sidebar */
  const handlePinClick = useCallback((pinData: any) => {
    setSelectedPinData(pinData);
    setSidebarVisible(true);
  }, []);

  /** Handle sidebar close */
  const handleSidebarClose = useCallback(() => {
    setSidebarVisible(false);
    setSelectedPinData(null);
  }, []);

  /** Load demographics data and update map */
  const loadDemographicsData = useCallback((data: AudienceCollection) => {
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
    if (showDemographics) {
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
              }
            };
            handlePinClick(heatmapPinData);
          }
        });
      }
    }
  }, [showDemographics, handlePinClick]);

  /** Add heatmap layer for audience data */
  const addHeatmapLayer = useCallback(() => {
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
            }
          };
          handlePinClick(heatmapPinData);
        }
      });
    }
  }, [heatmapData, handlePinClick]);

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
        (l: any) => l.type === "symbol" && l.layout?.["text-field"]
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
        addHeatmapLayer();
      }
    });

    /** First-time data load */
    map.on("load", async () => {
      try {
        ensureGlobeProjection(); // make sure initial style starts as globe too

        // If demographics data is available, load it immediately
        if (demographicsData) {
          loadDemographicsData(demographicsData);
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
      data.vcs.forEach((vc: any) => {
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
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        `;

        const marker = new mapboxgl.Marker({ element: el, draggable: false })
          .setLngLat([coordinates.longitude, coordinates.latitude])
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
      data.competitors.forEach((competitor: any) => {
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
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.29 7 12 12 20.71 7"></polyline>
            <line x1="12" y1="22" x2="12" y2="12"></line>
          </svg>
        `;

        const marker = new mapboxgl.Marker({ element: el, draggable: false })
          .setLngLat([coordinates.longitude, coordinates.latitude])
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
      data.cofounders.forEach((cofounder: any) => {
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

        const marker = new mapboxgl.Marker({ element: el, draggable: false })
          .setLngLat([coordinates.longitude, coordinates.latitude])
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
      loadDemographicsData(demographicsData);
    }
  }, [demographicsData, loadDemographicsData]);

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
      addHeatmapLayer();
    } else {
      // When demographics is disabled, remove heatmap and clear all markers
      removeHeatmapLayer();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    }
  }, [showDemographics, heatmapData, addHeatmapLayer, removeHeatmapLayer]);

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
        pinData={selectedPinData}
        isVisible={sidebarVisible}
        onClose={handleSidebarClose}
        position="left"
        width="360px"
      />
    </div>
  );
}
