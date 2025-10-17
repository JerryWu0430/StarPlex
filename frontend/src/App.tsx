import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import './App.css';

import 'mapbox-gl/dist/mapbox-gl.css';

interface LocationFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
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
    if (!data) return;

    mapboxgl.accessToken = 'pk.eyJ1IjoiYWR3aXRoYW5zIiwiYSI6ImNtZ3Y0ejF1ajBna3gya3NlOGxlM2dvaHQifQ.Nm-Nyqb3OLpB1cpZCzvTIw';

    // Clean up existing map if it exists
    if (mapRef.current) {
      mapRef.current.remove();
    }

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current!,
      style: 'mapbox://styles/mapbox/standard',
      config: {
        basemap: {
          theme: 'monochrome',
          lightPreset: 'night'
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

      // Remove existing layers if they exist
      if (mapRef.current.getLayer('audience-heatmap')) {
        mapRef.current.removeLayer('audience-heatmap');
      }
      if (mapRef.current.getLayer('audience-points')) {
        mapRef.current.removeLayer('audience-points');
      }

      // Add heatmap layer - only visible when zoomed in
      mapRef.current.addLayer({
        id: 'audience-heatmap',
        type: 'heatmap',
        source: 'audience-data',
        minzoom: 8, // Only show heatmap when zoomed in
        maxzoom: 15,
        paint: {
          // Increase the heatmap weight based on the weight property
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'weight'],
            0,
            0,
            5,
            1
          ],
          // Increase the heatmap color weight weight by zoom level - larger intensity
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8,
            2,
            15,
            5
          ],
          // Color ramp for heatmap
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(33,102,172,0)',
            0.2,
            'rgb(103,169,207)',
            0.4,
            'rgb(209,229,240)',
            0.6,
            'rgb(253,219,199)',
            0.8,
            'rgb(239,138,98)',
            1,
            'rgb(178,24,43)'
          ],
          // Adjust the heatmap radius by zoom level - much larger halo
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 20, 15, 100],
          // Show heatmap when zoomed in
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0, 9, 1, 15, 1]
        },
        slot: 'top'
      });

      // Add circle layer for individual points - visible when zoomed out
      mapRef.current.addLayer({
        id: 'audience-points',
        type: 'circle',
        source: 'audience-data',
        minzoom: 3,
        maxzoom: 8, // Hide points when zoomed in (heatmap takes over)
        paint: {
          // Size circle radius by weight and zoom level - larger points when zoomed out
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3,
            ['interpolate', ['linear'], ['get', 'weight'], 1, 8, 5, 16],
            7,
            ['interpolate', ['linear'], ['get', 'weight'], 1, 6, 5, 12],
            8,
            ['interpolate', ['linear'], ['get', 'weight'], 1, 4, 5, 8]
          ],
          'circle-emissive-strength': 0.75,
          // Color circle by weight
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'weight'],
            1,
            'rgba(33,102,172,0.8)',
            2,
            'rgb(103,169,207)',
            3,
            'rgb(209,229,240)',
            4,
            'rgb(253,219,199)',
            5,
            'rgb(239,138,98)'
          ],
          'circle-stroke-color': 'white',
          'circle-stroke-width': 2,
          // Show points when zoomed out, hide when zoomed in
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 3, 1, 7, 1, 8, 0]
        },
        slot: 'top'
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

      // Add hover events for points
      mapRef.current.on('mouseenter', 'audience-points', (e) => {
        if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = 'pointer';
        }
      });

      mapRef.current.on('mousemove', 'audience-points', (e) => {
        const properties = e.features?.[0]?.properties;
        if (properties && hoverCardRef.current) {
          hoverCardRef.current.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 4px;">${properties.name}</div>
            <div style="color: #a0a0a0; font-size: 12px; margin-bottom: 8px;">${properties.borough}, ${properties.country}</div>
            <div style="font-size: 12px; line-height: 1.4;">
              <div><strong>Score:</strong> ${properties.weight.toFixed(1)}/5</div>
            </div>
          `;
          hoverCardRef.current.style.opacity = '1';
        }
      });

      mapRef.current.on('mouseleave', 'audience-points', () => {
        if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = '';
        }
        if (hoverCardRef.current) {
          hoverCardRef.current.style.opacity = '0';
        }
      });

      // Add hover events for heatmap
      mapRef.current.on('mouseenter', 'audience-heatmap', (e) => {
        if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = 'pointer';
        }
      });

      mapRef.current.on('mousemove', 'audience-heatmap', (e) => {
        const features = e.features;
        if (features && features.length > 0) {
          // Get the primary feature (first one with is_primary: true)
          const primaryFeature = features.find(f => f.properties?.is_primary) || features[0];
          const properties = primaryFeature?.properties;

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
        }
      });

      mapRef.current.on('mouseleave', 'audience-heatmap', () => {
        if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = '';
        }
        if (hoverCardRef.current) {
          hoverCardRef.current.style.opacity = '0';
        }
      });

      // Add click event for popups (only on primary points)
      mapRef.current.on('click', 'audience-points', (e) => {
        if (!mapRef.current) return;

        const coordinates = e.lngLat;
        const properties = e.features?.[0]?.properties;

        if (properties && properties.is_primary) {
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
      });
    });

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
      // Clean up hover card and event listeners
      if (hoverCardRef.current && hoverCardRef.current.parentNode) {
        hoverCardRef.current.parentNode.removeChild(hoverCardRef.current);
        hoverCardRef.current = null;
      }
      const updateHoverCardPosition = (mapRef.current as any)?._updateHoverCardPosition;
      if (updateHoverCardPosition) {
        document.removeEventListener('mousemove', updateHoverCardPosition);
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
      <MapboxExample />
    </div>
  );
}

export default App;
