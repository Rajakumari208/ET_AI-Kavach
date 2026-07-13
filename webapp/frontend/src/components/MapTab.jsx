import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Filter, BarChart3, Database } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Cities, types, and severities present in synthetic data
const ALL_CITIES = ["Hyderabad", "Mumbai", "Bengaluru", "Chennai", "Delhi"];
const ALL_TYPES = ["digital_arrest_scam", "counterfeit_currency", "otp_fraud", "investment_scam"];
const ALL_SEVERITIES = ["low", "medium", "high"];

export default function MapTab() {
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters - default to Hyderabad to keep hotspots concentrated ("only place, not spreaded")
  const [selectedCities, setSelectedCities] = useState(["Hyderabad"]);
  const [selectedTypes, setSelectedTypes] = useState(ALL_TYPES);
  const [selectedSeverities, setSelectedSeverities] = useState(ALL_SEVERITIES);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);

  // Fetch data from FastAPI backend with query filters applied
  const fetchIncidents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      selectedCities.forEach(c => params.append('city', c));
      selectedTypes.forEach(t => params.append('incident_type', t));
      selectedSeverities.forEach(s => params.append('severity', s));

      const response = await fetch(`${API_BASE}/api/map/incidents?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch incidents data");
      }
      const data = await response.json();
      setIncidents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll database every 5 seconds to show newly reported real-time incidents
  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, [selectedCities, selectedTypes, selectedSeverities]);

  // Leaflet Map Initialization and Marker Updates
  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize Leaflet Map if not already initialized
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false // position it manually below
      }).setView([17.3850, 78.4867], 11); // Centered on Hyderabad

      // Elegant dark mode map tiles from CartoDB or standard OSM
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstance.current);

      L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);

      // Create a layer group for markers
      markersLayer.current = L.layerGroup().addTo(mapInstance.current);
    }

    // Clear existing markers
    markersLayer.current.clearLayers();

    // Map severity to color hex codes
    const severityColors = {
      low: '#10b981',    // emerald
      medium: '#f59e0b', // amber
      high: '#ef4444'    // red
    };

    // Plot incident markers
    if (incidents.length > 0) {
      let latSum = 0;
      let lngSum = 0;
      let validCount = 0;

      incidents.forEach(inc => {
        const lat = parseFloat(inc.latitude);
        const lng = parseFloat(inc.longitude);

        if (!isNaN(lat) && !isNaN(lng)) {
          latSum += lat;
          lngSum += lng;
          validCount++;

          const color = severityColors[inc.severity] || '#64748b';

          // Circle marker for modern hotspot representation
          const marker = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: color,
            color: '#ffffff',
            weight: 1.5,
            opacity: 1,
            fillOpacity: 0.8
          });

          // Pretty details popup
          const popupContent = `
            <div style="font-family: sans-serif; color: #1e293b; padding: 4px;">
              <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: bold; text-transform: uppercase; color: ${color};">
                ${inc.incident_id}
              </h4>
              <div style="font-size: 11px; margin-bottom: 2px;">
                <strong>Type:</strong> ${inc.incident_type.replace(/_/g, ' ')}
              </div>
              <div style="font-size: 11px; margin-bottom: 2px;">
                <strong>City:</strong> ${inc.city}
              </div>
              <div style="font-size: 11px; margin-bottom: 2px;">
                <strong>Severity:</strong> <span style="font-weight: bold; text-transform: uppercase;">${inc.severity}</span>
              </div>
              <div style="font-size: 10px; color: #64748b; margin-top: 6px; border-t: 1px solid #e2e8f0; padding-top: 4px;">
                Reported: ${new Date(inc.reported_at).toLocaleString()}
              </div>
            </div>
          `;
          
          marker.bindPopup(popupContent);
          markersLayer.current.addLayer(marker);
        }
      });

      // Recenter map on average coordinates of results if items are found
      if (validCount > 0) {
        mapInstance.current.panTo([latSum / validCount, lngSum / validCount]);
      }
    }
  }, [incidents]);

  // Cleanup map instance on unmount
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Filter handlers
  const toggleFilter = (item, selectedList, setSelectedList) => {
    if (selectedList.includes(item)) {
      setSelectedList(selectedList.filter(x => x !== item));
    } else {
      setSelectedList([...selectedList, item]);
    }
  };

  const highSeverityCount = incidents.filter(i => i.severity === 'high').length;
  const uniqueCitiesCount = new Set(incidents.map(i => i.city)).size;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Sidebar Controls */}
      <div className="lg:col-span-3 bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 shadow-xl flex flex-col gap-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-700/50">
          <Filter className="w-5 h-5 text-teal-400" />
          <h3 className="font-semibold text-slate-200">Incident Filters</h3>
        </div>

        {/* Cities */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase font-mono mb-2.5">City Location</h4>
          <div className="space-y-1.5">
            {ALL_CITIES.map(city => (
              <label key={city} className="flex items-center gap-2.5 text-slate-300 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedCities.includes(city)}
                  onChange={() => toggleFilter(city, selectedCities, setSelectedCities)}
                  className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-500 focus:ring-offset-slate-900 focus:ring-1"
                />
                {city}
              </label>
            ))}
          </div>
        </div>

        {/* Incident Type */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase font-mono mb-2.5">Incident Type</h4>
          <div className="space-y-1.5">
            {ALL_TYPES.map(type => (
              <label key={type} className="flex items-center gap-2.5 text-slate-300 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type)}
                  onChange={() => toggleFilter(type, selectedTypes, setSelectedTypes)}
                  className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-500 focus:ring-offset-slate-900 focus:ring-1"
                />
                <span className="capitalize">{type.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Severity */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase font-mono mb-2.5">Severity</h4>
          <div className="space-y-1.5">
            {ALL_SEVERITIES.map(sev => {
              const colors = { low: 'text-emerald-400', medium: 'text-amber-400', high: 'text-red-400' };
              return (
                <label key={sev} className="flex items-center gap-2.5 text-slate-300 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedSeverities.includes(sev)}
                    onChange={() => toggleFilter(sev, selectedSeverities, setSelectedSeverities)}
                    className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-500"
                  />
                  <span className={`capitalize font-semibold ${colors[sev]}`}>{sev}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Map Display & Stats */}
      <div className="lg:col-span-9 flex flex-col gap-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4 flex items-center gap-4">
            <div className="p-3 bg-teal-950/40 border border-teal-800/40 rounded-lg">
              <Database className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-mono">TOTAL INCIDENTS</div>
              <div className="text-2xl font-bold text-slate-200">{isLoading ? '...' : incidents.length}</div>
            </div>
          </div>

          <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4 flex items-center gap-4">
            <div className="p-3 bg-red-950/40 border border-red-800/40 rounded-lg">
              <MapPin className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-mono">HIGH SEVERITY</div>
              <div className="text-2xl font-bold text-slate-200">{isLoading ? '...' : highSeverityCount}</div>
            </div>
          </div>

          <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-lg">
              <BarChart3 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-mono">CITIES REPRESENTED</div>
              <div className="text-2xl font-bold text-slate-200">{isLoading ? '...' : uniqueCitiesCount}</div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-3 shadow-xl flex-1 flex flex-col min-h-[420px]">
          {error && (
            <div className="p-3 mb-3 bg-red-950/30 border border-red-900/50 text-red-400 rounded-xl text-xs">
              {error}
            </div>
          )}
          <div className="relative flex-1 rounded-xl overflow-hidden min-h-[400px]">
            {isLoading && incidents.length === 0 && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-slate-400 font-medium">Fetching Incident Hotspots...</span>
                </div>
              </div>
            )}
            <div ref={mapRef} className="absolute inset-0 z-0"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
