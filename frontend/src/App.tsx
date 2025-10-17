import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import Map from "./Components/AudienceMap";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface LocationFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  } | {
    type: 'Point';
    coordinates: number[];
  };
  properties: {
    name: string;
    area_code: string;
    borough: string;
    country: string;
    description: string;
    target_fit: string;
    weight: number;
    display_name: string;
    bbox?: {
      min_lat: number;
      max_lat: number;
      min_lon: number;
      max_lon: number;
    };
    center_lat: number;
    center_lng: number;
    feature_type: 'polygon' | 'point';
  };
}

interface GeoJSONData {
  type: 'FeatureCollection';
  features: LocationFeature[];
  metadata: {
    total_locations: number;
    query_params: any;
    generated_at: string;
  };
}

const MapboxExample = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const hoverCardRef = useRef<HTMLDivElement | null>(null);
  const [data, setData] = useState<GeoJSONData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch data from the backend
    const fetchAudienceData = async () => {
      try {
        const response = await fetch('http://localhost:8000/audience-map');
        const geojsonData = await response.json();
        setData(geojsonData);
      } catch (error) {
        console.error('Error fetching audience data:', error);
        // Use the sample data you provided as fallback
        //setData({
        //  type: "FeatureCollection",
        //  features: [
        //    {
        //      type: "Feature",
        //      geometry: {
        //        type: "Point",
        //        coordinates: [-73.980359, 40.7653848]
        //      },
        //      properties: {
        //        name: "Midtown Manhattan",
        //        area_code: "10001",
        //        borough: "Manhattan",
        //        country: "USA",
        //        description: "Midtown Manhattan is a bustling area filled with corporate offices, restaurants, and high-end gyms like Sitaras, making it ideal for fitness-conscious professionals.",
        //        target_fit: "High concentration of young professionals with access to upscale gyms and health-focused dining options.",
        //        weight: 5,
        //        display_name: "USA Brooklyn Delicatessen, 200, West 57th Street, Midtown East, Manhattan Community Board 5, Manhattan, New York County, City of New York, New York, 10019, United States"
        //      }
        //    },
        //    {
        //      type: "Feature",
        //      geometry: {
        //        type: "Point",
        //        coordinates: [-74.009271, 40.7076681]
        //      },
        //      properties: {
        //        name: "Financial District",
        //        area_code: "10005",
        //        borough: "Manhattan",
        //        country: "USA",
        //        description: "The Financial District is a hub for professionals with a growing focus on wellness and health.",
        //        target_fit: "Many young professionals work here and prioritize fitness and healthy eating.",
        //        weight: 5,
        //        display_name: "Financial District, Manhattan, New York County, City of New York, New York, 10045, United States"
        //      }
        //    },
        //    {
        //      type: "Feature",
        //      geometry: {
        //        type: "Point",
        //        coordinates: [-0.0798926, 51.5266694]
        //      },
        //      properties: {
        //        name: "Shoreditch",
        //        area_code: "EC1V",
        //        borough: "Hackney",
        //        country: "UK",
        //        description: "Shoreditch is a trendy area in East London known for its vibrant tech scene and health-conscious lifestyle.",
        //        target_fit: "Popular among young professionals who value fitness and healthy dining options.",
        //        weight: 5,
        //        display_name: "Shoreditch, London Borough of Hackney, London, Greater London, England, EC2A 3AR, United Kingdom"
        //      }
        //    },
        //    {
        //      type: "Feature",
        //      geometry: {
        //        type: "Point",
        //        coordinates: [-73.9987505, 40.72288]
        //      },
        //      properties: {
        //        name: "SoHo",
        //        area_code: "10013",
        //        borough: "Manhattan",
        //        country: "USA",
        //        description: "SoHo is a fashionable neighborhood with a mix of upscale boutiques and health-conscious eateries.",
        //        target_fit: "Young professionals living and working here often prioritize fitness and healthy living.",
        //        weight: 5,
        //        display_name: "SoHo, Manhattan, New York County, City of New York, New York, 10012, United States"
        //      }
        //    },
        //    {
        //      type: "Feature",
        //      geometry: {
        //        type: "Point",
        //        coordinates: [-118.4956771, 34.0204568]
        //      },
        //      properties: {
        //        name: "Downtown Los Angeles",
        //        area_code: "90012",
        //        borough: "Los Angeles County",
        //        country: "USA",
        //        description: "Downtown LA is experiencing a resurgence with new gyms and health-focused restaurants emerging.",
        //        target_fit: "Growing hub for young professionals interested in fitness and wellness.",
        //        weight: 5,
        //        display_name: "Soka Gakkai International-USA Head Office, 6th Court, Downtown Santa Monica, Santa Monica, Los Angeles County, California, 90401, United States"
        //      }
        //    },
        //    {
        //      type: "Feature",
        //      geometry: {
        //        type: "Point",
        //        coordinates: [-87.6282334, 41.8830439]
        //      },
        //      properties: {
        //        name: "The Loop",
        //        area_code: "60601",
        //        borough: "Cook County",
        //        country: "USA",
        //        description: "The Loop is Chicago's central business district with a high concentration of young professionals.",
        //        target_fit: "Many fitness-conscious individuals work here and seek healthy dining options.",
        //        weight: 5,
        //        display_name: "Staypineapple, An Iconic Hotel, The Loop, 1, West Washington Street, Theatre District, Loop, Chicago, Cook County, Illinois, 60602, United States"
        //      }
        //    },
        //    {
        //      type: "Feature",
        //      geometry: {
        //        type: "Point",
        //        coordinates: [-0.0190006, 51.5048954]
        //      },
        //      properties: {
        //        name: "Canary Wharf",
        //        area_code: "E14",
        //        borough: "Tower Hamlets",
        //        country: "UK",
        //        description: "Canary Wharf is a major financial hub in London with a growing focus on wellness and fitness.",
        //        target_fit: "Highly concentrated area of young professionals interested in health and fitness.",
        //        weight: 5,
        //        display_name: "Canary Wharf, London Borough of Tower Hamlets, London, Greater London, England, E14 5AB, United Kingdom"
        //      }
        //    },
        //    {
        //      type: "Feature",
        //      geometry: {
        //        type: "Point",
        //        coordinates: [153.0273743, -27.466829]
        //      },
        //      properties: {
        //        name: "Brisbane CBD",
        //        area_code: "4000",
        //        borough: "Brisbane City",
        //        country: "Australia",
        //        description: "The Brisbane CBD is a vibrant area with a strong focus on outdoor activities and health-conscious living.",
        //        target_fit: "Popular among young professionals who prioritize fitness and healthy eating.",
        //        weight: 5,
        //        display_name: "MBE Brisbane CBD, 241, Adelaide Street, Golden Triangle, Brisbane City, Greater Brisbane, Queensland, 4000, Australia"
        //      }
        //    },
        //    {
        //      type: "Feature",
        //      geometry: {
        //        type: "Point",
        //        coordinates: [-0.1278, 51.5074]
        //      },
        //      properties: {
        //        name: "Singapore CBD",
        //        area_code: "048621",
        //        borough: "Central Region",
        //        country: "Singapore",
        //        description: "The Singapore CBD is a bustling area with a high concentration of fitness-conscious professionals.",
        //        target_fit: "Many young professionals work here and seek healthy dining options.",
        //        weight: 5,
        //        display_name: "London, UK"
        //      }
        //    },
        //    {
        //      type: "Feature",
        //      geometry: {
        //        type: "Point",
        //        coordinates: [55.0910742, 24.9775987]
        //      },
        //      properties: {
        //        name: "Dubai Downtown",
        //        area_code: "Downtown Dubai",
        //        borough: "Dubai",
        //        country: "UAE",
        //        description: "Dubai Downtown is a modern and vibrant area with a focus on luxury and wellness.",
        //        target_fit: "High-end gyms like Embody Fitness attract fitness-conscious young professionals.",
        //        weight: 5,
        //        display_name: "مركز الإمارات العربية المتحدة للصرافة, شارع الجاليريا, وسط مدينة جبل علي, جبل علي الصناعية 2, دبي, الإمارات العربية المتحدة"
        //      }
        //    }
        //  ],
        //  metadata: {
        //    total_locations: 10,
        //    query_params: {
        //      startup_idea: "An app that helps you find the best lunch deals in your area depending on your dietary restrictions and fitness goals",
        //      target_description: "A fitness-conscious young professional who is looking for a healthy lunch deal near their workplace. They probably want something high protein and low carb.",
        //      country: null
        //    },
        //    generated_at: "2024-01-01T00:00:00Z"
        //  }
        //});
      } finally {
        setLoading(false);
      }
    };

    fetchAudienceData();
  }, []);

  useEffect(() => {
    if (!data || !mapContainerRef.current) return;

    mapboxgl.accessToken = 'pk.eyJ1IjoiYWR3aXRoYW5zIiwiYSI6ImNtZ3Y0ejF1ajBna3gya3NlOGxlM2dvaHQifQ.Nm-Nyqb3OLpB1cpZCzvTIw';

    // Clean up existing map if it exists
    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (error) {
        console.warn('Error removing existing map:', error);
      }
      mapRef.current = null;
    }

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current!,
      style: 'mapbox://styles/mapbox/standard',
      config: {
        basemap: {
          theme: 'monochrome',
          lightPreset: 'day'
        }
      },
      center: [-120, 50],
      zoom: 2
    });

    mapRef.current.on('load', () => {
      if (!mapRef.current || !data) return;

      // Check if source already exists before adding
      if (!mapRef.current.getSource('audience-data')) {
        // Add the audience data source
        mapRef.current.addSource('audience-data', {
          type: 'geojson',
          data: data
        });
      } else {
        // Update existing source with new data
        const source = mapRef.current.getSource('audience-data') as mapboxgl.GeoJSONSource;
        source.setData(data);
      }

      // Add background source for blue baseline
      if (!mapRef.current.getSource('audience-background')) {
        mapRef.current.addSource('audience-background', {
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
      if (mapRef.current.getLayer('audience-heatmap')) {
        mapRef.current.removeLayer('audience-heatmap');
      }
      if (mapRef.current.getLayer('audience-background')) {
        mapRef.current.removeLayer('audience-background');
      }

      // Add blue background layer for baseline
      mapRef.current.addLayer({
        id: 'audience-background',
        type: 'fill',
        source: 'audience-background',
        paint: {
          'fill-color': 'rgba(0, 100, 255, 0.2)', // Blue baseline
          'fill-opacity': 0.3
        }
      });

      // Add Mapbox native heatmap layer for all features
      mapRef.current.addLayer({
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
          // Smaller radius for better visibility when zoomed out
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 80,     // Smaller radius at global view
            2, 70,     // Smaller at continent level
            4, 60,     // Medium at country level
            6, 50,     // Medium at state level
            8, 40,     // At city level
            10, 30     // When zoomed in
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
      (mapRef.current as any)._updateHoverCardPosition = updateHoverCardPosition;

      // Add hover events for polygons and points
      const handleMouseEnter = (e: any) => {
        if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = 'pointer';
        }
      };

      const handleMouseMove = (e: any) => {
        const properties = e.features?.[0]?.properties;
        if (properties && hoverCardRef.current) {
          hoverCardRef.current.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 4px;">${properties.name}</div>
            <div style="color: #a0a0a0; font-size: 12px; margin-bottom: 8px;">${properties.borough}, ${properties.country}</div>
            <div style="font-size: 12px; line-height: 1.4;">
              <div><strong>Score:</strong> ${properties.weight.toFixed(1)}/5</div>
              <div style="margin-top: 4px;"><strong>Description:</strong> ${properties.description.substring(0, 100)}${properties.description.length > 100 ? '...' : ''}</div>
            </div>
          `;
          hoverCardRef.current.style.opacity = '1';
        }
      };

      const handleMouseLeave = () => {
        if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = '';
        }
        if (hoverCardRef.current) {
          hoverCardRef.current.style.opacity = '0';
        }
      };

      // Add hover events for heatmap layer (works at all zoom levels)
      mapRef.current.on('mouseenter', 'audience-heatmap', handleMouseEnter);
      mapRef.current.on('mousemove', 'audience-heatmap', handleMouseMove);
      mapRef.current.on('mouseleave', 'audience-heatmap', handleMouseLeave);

      // Add click event for popups on polygons
      const handleClick = (e: any) => {
        if (!mapRef.current) return;

        const coordinates = e.lngLat;
        const properties = e.features?.[0]?.properties;

        if (properties) {
          new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(`
              <div class="popup-content">
                <h3 class="popup-title">${properties.name}</h3>
                <p class="popup-location">${properties.borough}, ${properties.country}</p>
                <div class="popup-description">
                  <p><strong>Description:</strong> ${properties.description}</p>
                  <p><strong>Target Fit:</strong> ${properties.target_fit}</p>
                  <p><strong>Score:</strong> ${properties.weight.toFixed(1)}/5</p>
                </div>
              </div>
            `)
            .addTo(mapRef.current);
        }
      };

      // Add click events for heatmap layer
      mapRef.current.on('click', 'audience-heatmap', handleClick);
    });

    // Cleanup function
    return () => {
      // Clean up hover card and event listeners first
      if (hoverCardRef.current && hoverCardRef.current.parentNode) {
        hoverCardRef.current.parentNode.removeChild(hoverCardRef.current);
        hoverCardRef.current = null;
      }

      // Clean up event listeners
      const updateHoverCardPosition = (mapRef.current as any)?._updateHoverCardPosition;
      if (updateHoverCardPosition) {
        document.removeEventListener('mousemove', updateHoverCardPosition);
      }

      // Clean up map last
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (error) {
          console.warn('Error removing map:', error);
        }
        mapRef.current = null;
      }
    };
  }, [data]);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a1a',
        color: 'white',
        fontSize: '18px'
      }}>
        Loading audience data...
      </div>
    );
  }

  return <div id="map" ref={mapContainerRef} style={{ height: '100vh' }}></div>;
};

function App() {
  return (
    <div className="App">
      <Map />
    </div>
  );
}

export default App;
