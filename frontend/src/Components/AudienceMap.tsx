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
  /** Optional Mapbox token override (else env hardcoded fallback below) */
  token?: string;
  /** Initial Mapbox style URL */
  initialStyle?: string;
  /** Show the light/dark toggle button */
  enableThemeToggle?: boolean;
  /** Container style/class */
  style?: React.CSSProperties;
  className?: string;
};

/** ---------- Config ---------- */
const DEFAULT_STYLE = "mapbox://styles/mapbox/streets-v12"; // <-- has 'composite' + 'building'
const LIGHT_STYLE = "mapbox://styles/mapbox/light-v11";
const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

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
      center: [0, 20],
      zoom: 1.5,
      pitch: 45,
      bearing: -17.6,
      antialias: true,
    });
    mapRef.current = map;

    /** Safely add 3D buildings if the style supports 'composite'/'building' */
    const add3dBuildings = () => {
      const style = map.getStyle();
      const hasComposite = !!style?.sources?.["composite"];
      if (!hasComposite) return;

      const labelLayerId = (style.layers || []).find(
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

    /** When the style is fully loaded, add optional layers again */
    map.on("style.load", () => {
      add3dBuildings();
      // Markers survive style changes, but add back if needed:
      markersRef.current.forEach((m) => m.addTo(map));
    });

    /** First-time data load */
    map.on("load", async () => {
      try {
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
    // IMPORTANT: init once; do NOT depend on styleUrl or endpoint here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Toggle styles using setStyle (no re-initialization) */
  const handleToggleTheme = () => {
    const map = mapRef.current;
    if (!map) return;

    const next =
      styleUrl.includes("light-v11") || styleUrl.includes("streets-v12")
        ? DARK_STYLE
        : LIGHT_STYLE;

    setStyleUrl(next);
    map.setStyle(next); // triggers 'style.load' where we re-add the 3D layer
  };

  return (
    <div
      style={{
        position: "relative",
        // Ensure the map has a real height. Change as needed or override via prop.
        height: 500,
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
          <button onClick={handleToggleTheme}>Toggle Light/Dark</button>
        </div>
      )}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}
