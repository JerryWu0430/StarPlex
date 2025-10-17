"use client";

import React, { useEffect, useRef, useState } from "react";
import mapboxgl, { Map, Marker, LngLatBounds, FillExtrusionLayer } from "mapbox-gl";
import type { FeatureCollection, Feature, Point } from "geojson";
import "mapbox-gl/dist/mapbox-gl.css";

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
};

/** ---------- Styles ---------- */
/** Light = original globe look */
const LIGHT_STYLE = "mapbox://styles/mapbox/standard";
/** Dark theme you like */
const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

/** Default initial style */
const DEFAULT_STYLE = LIGHT_STYLE;

/** Dev token fallback — replace with your env if you prefer */
const envToken =
  "pk.eyJ1IjoiYWR3aXRoYW5zIiwiYSI6ImNtZ3Y0ejF1ajBna3gya3NlOGxlM2dvaHQifQ.Nm-Nyqb3OLpB1cpZCzvTIw";

/** =======================================================================
 * AudienceMap
 * ======================================================================= */
export default function AudienceMap({
  endpoint = "/audience-map",
  token,
  initialStyle = DEFAULT_STYLE,
  enableThemeToggle = true,
  style,
  className,
}: AudienceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [styleUrl, setStyleUrl] = useState<string>(initialStyle);

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
    });

    /** First-time data load */
    map.on("load", async () => {
      try {
        ensureGlobeProjection(); // make sure initial style starts as globe too

        const resp = await fetch(endpoint);
        if (!resp.ok) throw new Error(`Fetch failed: ${resp.status} ${resp.statusText}`);
        const data: AudienceCollection = await resp.json();

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

        // Add markers + popups
        data.features.forEach((feature: AudienceFeature) => {
          const { coordinates } = feature.geometry;
          const props = feature.properties ?? {};

          const popupHtml = `
            <div style="min-width:200px">
              <h3 style="margin:0 0 6px 0">${props.name ?? ""}</h3>
              ${props.description ? `<p>${props.description}</p>` : ""}
              ${props.target_fit ? `<p><strong>Target fit:</strong> ${props.target_fit}</p>` : ""}
              ${props.display_name ? `<p style="font-size:0.8em;color:#555">${props.display_name}</p>` : ""}
            </div>`;

          const popup = new mapboxgl.Popup({ offset: 25, closeButton: true }).setHTML(popupHtml);

          const marker = new mapboxgl.Marker({ draggable: false })
            .setLngLat(coordinates as [number, number])
            .setPopup(popup)
            .addTo(map);

          markersRef.current.push(marker);
        });
      } catch (err) {
        console.error("Error fetching audience map:", err);
      }
    });

    /** Cleanup on unmount */
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // init once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    </div>
  );
}
