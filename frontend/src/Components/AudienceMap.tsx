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
const DEFAULT_STYLE = DARK_STYLE;

/** Dev token fallback — replace with your env if you prefer */
const envToken =
  "pk.eyJ1IjoiYWR3aXRoYW5zIiwiYSI6ImNtZ3Y0ejF1ajBna3gya3NlOGxlM2dvaHQifQ.Nm-Nyqb3OLpB1cpZCzvTIw";

/** =======================================================================
 * AudienceMap
 * ======================================================================= */
export default function AudienceMap({
  endpoint = "http://localhost:8000/audience-map",
  token,
  initialStyle = DEFAULT_STYLE,
  enableThemeToggle = true,
  style,
  className,
}: AudienceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const hoverCardRef = useRef<HTMLDivElement | null>(null);
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

    /** Add heatmap layers - always present on load */
    const addHeatmapLayers = () => {
      // Add empty data source for heatmap (will be populated when data loads)
      if (!map.getSource('audience-data')) {
        map.addSource('audience-data', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });
      }

      // Add background source for blue baseline
      if (!map.getSource('audience-background')) {
        map.addSource('audience-background', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  [-180, -90],
                  [180, -90],
                  [180, 90],
                  [-180, 90],
                  [-180, -90]
                ]]
              },
              properties: {}
            }]
          }
        });
      }

      // Remove existing layers if they exist
      if (map.getLayer('audience-heatmap')) {
        map.removeLayer('audience-heatmap');
      }
      if (map.getLayer('audience-background')) {
        map.removeLayer('audience-background');
      }

      // Add blue background layer for baseline
      map.addLayer({
        id: 'audience-background',
        type: 'fill',
        source: 'audience-background',
        paint: {
          'fill-color': 'rgba(0, 0, 0, 0.4)', // Very black baseline
          'fill-opacity': 0.9
        }
      });

      // Add Mapbox native heatmap layer for all features
      map.addLayer({
        id: 'audience-heatmap',
        type: 'heatmap',
        source: 'audience-data',
        paint: {
          // Weight based on the score (1-5) for polygon areas only
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'weight'],
            1, 0.2,
            2, 0.4,
            3, 0.6,
            4, 0.8,
            5, 1.0
          ],
          // Higher intensity at low zoom levels to ensure visibility
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 3,    // High intensity at global view
            3, 2,    // Medium intensity at country level
            6, 1.5,  // Lower intensity at city level
            10, 1    // Normal intensity when zoomed in
          ],
          // Color gradient from blue (low) to red (high) with proper blue baseline
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0, 0, 255, 0)',       // Transparent for zero density (shows background)
            0.05, 'rgba(0, 100, 255, 0.3)', // Blue for very low density
            0.1, 'rgba(0, 150, 255, 0.5)',  // Blue for low density
            0.2, 'rgba(0, 255, 255, 0.7)',  // Cyan
            0.4, 'rgba(0, 255, 0, 0.8)',   // Green
            0.6, 'rgba(255, 255, 0, 0.9)',  // Yellow
            1, 'rgba(255, 0, 0, 1)'         // Red for high density
          ],
          // Large radius that stays consistent across zoom levels
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 100,    // Large radius at global view
            2, 100,    // Large at continent level
            4, 100,    // Large at country level
            6, 100,    // Large at city level
            8, 100,    // Large when zoomed in
            10, 100,   // Large even when very zoomed in
            12, 100,   // Large at street level
            14, 100    // Large at building level
          ],
          // Higher opacity for better visibility, especially at global zoom
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1.0,   // Full opacity at global view
            3, 0.9,   // High opacity at continent level
            6, 0.8,   // Medium opacity at country level
            10, 0.7   // Lower opacity when zoomed in
          ]
        }
      });
    };

    /** Set up interactive features for heatmap */
    const setupHeatmapInteractions = () => {
      // Create a floating hover card element
      const hoverCard = document.createElement('div');
      hoverCard.className = 'hover-card';
      hoverCard.style.cssText = `
        position: absolute;
        background: #2f4f4f;
        border: 1px solid #4a6b6b;
        border-radius: 8px;
        padding: 12px;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        max-width: 300px;
        pointer-events: none;
        z-index: 1000;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        opacity: 0;
        transition: opacity 0.2s ease;
      `;
      document.body.appendChild(hoverCard);
      hoverCardRef.current = hoverCard;

      // Update hover card position on mouse move
      const updateHoverCardPosition = (e: MouseEvent) => {
        if (hoverCardRef.current) {
          hoverCardRef.current.style.left = (e.clientX + 10) + 'px';
          hoverCardRef.current.style.top = (e.clientY - 10) + 'px';
        }
      };

      document.addEventListener('mousemove', updateHoverCardPosition);

      // Store the function reference for cleanup
      (map as any)._updateHoverCardPosition = updateHoverCardPosition;

      // Add hover events for heatmap layer
      const handleMouseEnter = (e: any) => {
        if (map) {
          map.getCanvas().style.cursor = 'pointer';
        }
      };

      const handleMouseMove = (e: any) => {
        const properties = e.features?.[0]?.properties;
        if (properties && hoverCardRef.current) {
          hoverCardRef.current.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 4px;">${properties.name}</div>
            <div style="color: #a0a0a0; font-size: 12px; margin-bottom: 8px;">${properties.borough || ''}, ${properties.country || ''}</div>
            <div style="font-size: 12px; line-height: 1.4;">
              <div><strong>Score:</strong> ${properties.weight?.toFixed(1) || 'N/A'}/5</div>
              <div style="margin-top: 4px;"><strong>Description:</strong> ${properties.description?.substring(0, 100) || ''}${properties.description?.length > 100 ? '...' : ''}</div>
            </div>
          `;
          hoverCardRef.current.style.opacity = '1';
        }
      };

      const handleMouseLeave = () => {
        if (map) {
          map.getCanvas().style.cursor = '';
        }
        if (hoverCardRef.current) {
          hoverCardRef.current.style.opacity = '0';
        }
      };

      // Add hover events for heatmap layer (works at all zoom levels)
      map.on('mouseenter', 'audience-heatmap', handleMouseEnter);
      map.on('mousemove', 'audience-heatmap', handleMouseMove);
      map.on('mouseleave', 'audience-heatmap', handleMouseLeave);

      // Add click event for popups on heatmap
      const handleClick = (e: any) => {
        if (!map) return;

        const coordinates = e.lngLat;
        const properties = e.features?.[0]?.properties;

        if (properties) {
          new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(`
              <div class="popup-content">
                <h3 class="popup-title">${properties.name || ''}</h3>
                <p class="popup-location">${properties.borough || ''}, ${properties.country || ''}</p>
                <div class="popup-description">
                  <p><strong>Description:</strong> ${properties.description || ''}</p>
                  <p><strong>Target Fit:</strong> ${properties.target_fit || ''}</p>
                  <p><strong>Score:</strong> ${properties.weight?.toFixed(1) || 'N/A'}/5</p>
                </div>
              </div>
            `)
            .addTo(map);
        }
      };

      // Add click events for heatmap layer
      map.on('click', 'audience-heatmap', handleClick);
    };

    /** When a style is (re)loaded, keep globe + optional 3D buildings, and reattach markers */
    map.on("style.load", () => {
      ensureGlobeProjection();       // <- keep the globe look
      add3dBuildingsIfAvailable();   // <- only adds on styles that support it
      markersRef.current.forEach((m) => m.addTo(map));

      // Re-add heatmap layers after style change
      addHeatmapLayers();
    });

    /** First-time data load */
    map.on("load", async () => {
      try {
        ensureGlobeProjection(); // make sure initial style starts as globe too

        // Add heatmap layers immediately (always present)
        addHeatmapLayers();

        // Set up interactive features
        setupHeatmapInteractions();

        const resp = await fetch(endpoint);
        if (!resp.ok) throw new Error(`Fetch failed: ${resp.status} ${resp.statusText}`);
        const data: AudienceCollection = await resp.json();

        // Update the data source with fetched data
        const source = map.getSource('audience-data') as mapboxgl.GeoJSONSource;
        source.setData(data);

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

        // Add markers + popups (keeping existing marker functionality)
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
      // Clean up hover card and event listeners first
      if (hoverCardRef.current && hoverCardRef.current.parentNode) {
        hoverCardRef.current.parentNode.removeChild(hoverCardRef.current);
        hoverCardRef.current = null;
      }

      // Clean up event listeners
      const updateHoverCardPosition = (map as any)?._updateHoverCardPosition;
      if (updateHoverCardPosition) {
        document.removeEventListener('mousemove', updateHoverCardPosition);
      }

      // Clean up markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // Clean up map last
      if (map) {
        try {
          map.remove();
        } catch (error) {
          console.warn('Error removing map:', error);
        }
        mapRef.current = null;
      }
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
        height: "100vh",     // Full viewport height
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
            {styleUrl === DARK_STYLE ? "Light mode" : "Dark (Globe)"}
          </button>
        </div>
      )}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}
