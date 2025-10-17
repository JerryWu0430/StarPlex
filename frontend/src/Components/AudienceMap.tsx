import React, { useEffect, useRef, useState } from 'react';
import mapboxgl, { Map, Marker, LngLatBounds, FillExtrusionLayer } from 'mapbox-gl';
import type { FeatureCollection, Feature, Point } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';

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
  /** FastAPI endpoint returning the GeoJSON data */
  endpoint?: string;
  /** Optional token override; otherwise uses Vite env var */
  token?: string;
  /** Initial Mapbox style URL */
  initialStyle?: string;
  /** Show the light/dark toggle button */
  enableThemeToggle?: boolean;
  /** Optional styles or class for the map container */
  style?: React.CSSProperties;
  className?: string;
};

const DEFAULT_STYLE = 'mapbox://styles/mapbox/standard';

const envToken = "pk.eyJ1IjoiYWR3aXRoYW5zIiwiYSI6ImNtZ3Y0ejF1ajBna3gya3NlOGxlM2dvaHQifQ.Nm-Nyqb3OLpB1cpZCzvTIw";

export default function AudienceMap({
  endpoint = '/audience-map',
  token,
  initialStyle = DEFAULT_STYLE,
  enableThemeToggle = true,
  style,
  className,
}: AudienceMapProps)  {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [styleUrl, setStyleUrl] = useState<string>(initialStyle);

  useEffect(() => {
    const MAPBOX_TOKEN = token ?? envToken ?? '';
    if (!MAPBOX_TOKEN) {
      console.error('Mapbox token missing. Set VITE_MAPBOX_ACCESS_TOKEN or pass token prop.');
      return;
    }
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: [0, 20],
      zoom: 1.5,
      pitch: 45,
      bearing: -17.6,
      antialias: true,
    });
    mapRef.current = map;

    const add3dBuildings = () => {
      const layers = map.getStyle()?.layers ?? [];
      const labelLayerId =
        layers.find((layer: any) => layer.type === 'symbol' && layer.layout?.['text-field'])
          ?.id ?? undefined;

      const extrusionLayer: FillExtrusionLayer = {
        id: 'add-3d-buildings',
        type: 'fill-extrusion',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        minzoom: 15,
        paint: {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'height'],
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'min_height'],
          ],
          'fill-extrusion-opacity': 0.6,
        },
      };

      map.addLayer(extrusionLayer, labelLayerId);
    };

    map.on('style.load', () => {
      add3dBuildings();
      // Reattach markers after a style swap
      markersRef.current.forEach((m) => m.addTo(map));
    });

    map.on('load', async () => {
      try {
        const resp = await fetch(endpoint);
        const data: AudienceCollection = await resp.json();

        const coords = data.features.map((f) => f.geometry.coordinates);
        if (coords.length > 1) {
          const bounds = new LngLatBounds(
            coords[0] as [number, number],
            coords[0] as [number, number]
          );
          coords.forEach((c) => bounds.extend(c as [number, number]));
          map.fitBounds(bounds, { padding: 100, duration: 1200 });
        } else if (coords.length === 1) {
          map.setCenter(coords[0] as [number, number]);
          map.setZoom(10);
        }

        // Clear any previous markers
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        // Create markers + popups
        data.features.forEach((feature: AudienceFeature) => {
          const { coordinates } = feature.geometry;
          const props = feature.properties ?? {};

          const popupHtml = `
            <div style="min-width:200px">
              <h3 style="margin:0 0 6px 0">${props.name ?? ''}</h3>
              ${props.description ? `<p>${props.description}</p>` : ''}
              ${
                props.target_fit
                  ? `<p><strong>Target fit:</strong> ${props.target_fit}</p>`
                  : ''
              }
              ${
                props.display_name
                  ? `<p style="font-size:0.8em;color:#555">${props.display_name}</p>`
                  : ''
              }
            </div>`;

          const popup = new mapboxgl.Popup({ offset: 25, closeButton: true }).setHTML(popupHtml);

          const marker = new mapboxgl.Marker({ draggable: false })
            .setLngLat(coordinates as [number, number])
            .setPopup(popup)
            .addTo(map);

          markersRef.current.push(marker);
        });
      } catch (err) {
        console.error('Error fetching audience map:', err);
      }
    });

    return () => {
      // Cleanup
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [styleUrl, endpoint, token]);

  const handleToggleTheme = () => {
    setStyleUrl((prev) => {
      if (prev.includes('light-v11') || prev === DEFAULT_STYLE) {
        return 'mapbox://styles/mapbox/dark-v11';
      }
      return 'mapbox://styles/mapbox/light-v11';
    });
  };

  return (
    <div style={{ position: 'relative', height: '100%', ...style }} className={className}>
      {enableThemeToggle && (
        <div
          style={{
            position: 'absolute',
            zIndex: 1,
            top: 10,
            left: 10,
            background: 'white',
            borderRadius: 8,
            padding: '6px 10px',
            boxShadow: '0 4px 16px rgba(0,0,0,.12)',
          }}
        >
          <button onClick={handleToggleTheme}>Toggle Light/Dark</button>
        </div>
      )}
      <div ref={mapContainerRef} style={{ position: 'absolute', inset: 0 }} />
    </div>
  );
}
