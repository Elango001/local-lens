"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  MapPin,
  Navigation,
  Search,
  CheckCircle2,
  X,
  Compass,
  Sliders,
  Target,
} from "lucide-react";

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: { lat: number; lng: number } | null;
  currentRadius: number | null;
  onConfirm: (location: { lat: number; lng: number; name: string }, radius: number | null) => void;
}

// Preset local landmark shortcuts for instant one-click selection
const PRESET_LOCATIONS = [
  { name: "Springfield Downtown", lat: 37.7749, lng: -122.4194 },
  { name: "Union Square, San Francisco", lat: 37.7879, lng: -122.4075 },
  { name: "Bayview Parkway, Oakland", lat: 37.7550, lng: -122.3900 },
  { name: "Downtown Oakland Center", lat: 37.8044, lng: -122.2712 },
];

export default function LocationPickerModal({
  isOpen,
  onClose,
  currentLocation,
  currentRadius,
  onConfirm,
}: LocationPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Selected State
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>(
    currentLocation || { lat: 37.7749, lng: -122.4194 }
  );
  const [selectedName, setSelectedName] = useState<string>("Springfield Downtown");
  const [isLocationConfirmed, setIsLocationConfirmed] = useState<boolean>(false);

  // Radius state: predefined or custom
  const [radiusKm, setRadiusKm] = useState<number | null>(currentRadius || 10);
  const [customRadiusInput, setCustomRadiusInput] = useState<string>(
    currentRadius ? String(currentRadius) : "10"
  );
  const [isCustomRadius, setIsCustomRadius] = useState<boolean>(false);

  // Search input
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);

  // Initialize or re-render map when modal opens
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [selectedCoords.lat, selectedCoords.lng],
        zoom: 13,
      });

      // Official OpenStreetMap tile layer (100% free, no API key, detailed street names)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom Center Pin Icon
      const pinIcon = L.divIcon({
        className: "custom-picker-pin",
        html: `
          <div style="cursor: grab; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
            <div style="background: #4f46e5; color: white; font-weight: 700; font-size: 10px; padding: 2px 8px; border-radius: 9999px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); white-space: nowrap; margin-bottom: 2px;">
              Your Center
            </div>
            <div style="width: 32px; height: 32px; border-radius: 9999px; background: #4f46e5; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 14px rgba(79,70,229,0.5);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
              </svg>
            </div>
            <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #4f46e5;"></div>
          </div>
        `,
        iconSize: [32, 54],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([selectedCoords.lat, selectedCoords.lng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);

      // Handle marker drag
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setSelectedCoords({ lat: pos.lat, lng: pos.lng });
        setSelectedName(`Custom Pin (${pos.lat.toFixed(3)}, ${pos.lng.toFixed(3)})`);
        setIsLocationConfirmed(false);
      });

      // Handle map click
      map.on("click", (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        setSelectedCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        setSelectedName(`Dropped Pin (${e.latlng.lat.toFixed(3)}, ${e.latlng.lng.toFixed(3)})`);
        setIsLocationConfirmed(false);
      });

      markerRef.current = marker;
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.invalidateSize();
      mapInstanceRef.current.setView([selectedCoords.lat, selectedCoords.lng], 13);
      if (markerRef.current) {
        markerRef.current.setLatLng([selectedCoords.lat, selectedCoords.lng]);
      }
    }

    return () => {
      // Keep instance alive during modal or clean on destroy
    };
  }, [isOpen]);

  // Update visual radius circle on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }

    if (radiusKm && radiusKm > 0) {
      circleRef.current = L.circle([selectedCoords.lat, selectedCoords.lng], {
        radius: radiusKm * 1000,
        color: "#4f46e5",
        fillColor: "#6366f1",
        fillOpacity: 0.15,
        weight: 2,
        dashArray: "4, 6",
      }).addTo(map);

      if (mapInstanceRef.current && circleRef.current) {
        map.fitBounds(circleRef.current.getBounds(), { padding: [30, 30], maxZoom: 14 });
      }
    }
  }, [selectedCoords, radiusKm]);

  // Geocode address search
  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    // Check preset match first
    const matchedPreset = PRESET_LOCATIONS.find((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (matchedPreset) {
      updateMapLocation(matchedPreset.lat, matchedPreset.lng, matchedPreset.name);
      setSearching(false);
      return;
    }

    // Free OpenStreetMap Nominatim Geocoding
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`
      );
      const data = await resp.json();
      if (data && data.length > 0) {
        const item = data[0];
        updateMapLocation(parseFloat(item.lat), parseFloat(item.lon), item.display_name.split(",")[0]);
      } else {
        alert("Location not found. Try searching a major city or click directly on the map.");
      }
    } catch (err) {
      console.warn("Geocoding service unavailable, searching local presets.");
      alert("Could not reach geocoder. Please click directly on the map to drop your pin.");
    } finally {
      setSearching(false);
    }
  };

  // Browser Geolocation
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateMapLocation(
          pos.coords.latitude,
          pos.coords.longitude,
          `My Current Location (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`
        );
        setDetectingGps(false);
      },
      (err) => {
        alert("Unable to retrieve your location. Please type an address or click on the map.");
        setDetectingGps(false);
      },
      { timeout: 8000 }
    );
  };

  const updateMapLocation = (lat: number, lng: number, name: string) => {
    setSelectedCoords({ lat, lng });
    setSelectedName(name);
    setIsLocationConfirmed(false);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 14);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
    }
  };

  // Radius selection handlers
  const handleSelectPredefinedRadius = (km: number | null) => {
    setRadiusKm(km);
    setIsCustomRadius(false);
    setCustomRadiusInput(km ? String(km) : "");
  };

  const handleCustomRadiusChange = (val: string) => {
    setCustomRadiusInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) {
      setRadiusKm(parsed);
      setIsCustomRadius(true);
    } else if (val === "") {
      setRadiusKm(null);
    }
  };

  const handleApplyFinal = () => {
    onConfirm(
      {
        lat: selectedCoords.lat,
        lng: selectedCoords.lng,
        name: selectedName,
      },
      radiusKm
    );
    onClose();
  };

  if (!isOpen) return null;

  const predefinedRadii = [3, 5, 10, 25, 50];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Choose Location & Search Radius</h3>
              <p className="text-xs text-slate-400">
                Set your discovery center to view deals within your preferred radius.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Location Input & GPS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">1. Select Center Location</span>
            <span className="text-slate-500">Search address, use GPS, or click on map</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            {/* Address Search */}
            <form onSubmit={handleSearchLocation} className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Enter city, street, or landmark (e.g. Springfield)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-20 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={searching}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
              >
                {searching ? "Finding..." : "Find"}
              </button>
            </form>

            {/* GPS Button */}
            <button
              type="button"
              onClick={handleUseGps}
              disabled={detectingGps}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
            >
              <Navigation className={`w-3.5 h-3.5 text-indigo-400 ${detectingGps ? "animate-spin" : ""}`} />
              <span>{detectingGps ? "Locating..." : "Use My GPS"}</span>
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <span className="text-slate-500 flex-shrink-0">Quick presets:</span>
            {PRESET_LOCATIONS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => updateMapLocation(preset.lat, preset.lng, preset.name)}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 whitespace-nowrap transition-colors cursor-pointer"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Interactive Map Preview */}
        <div className="space-y-2">
          <div className="relative w-full h-[230px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
            <div ref={mapContainerRef} className="w-full h-full z-10" />
            <div className="absolute top-2 left-2 z-20 bg-slate-900/90 backdrop-blur px-2.5 py-1 rounded-md border border-slate-800 text-[10px] text-slate-300 shadow">
              💡 Drag pin or click map to move center
            </div>
          </div>

          {/* Confirmation Box (The "Click Yes" Step) */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-slate-400">Selected Center Location:</div>
                <div className="font-bold text-white text-xs truncate">{selectedName}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsLocationConfirmed(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                isLocationConfirmed
                  ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isLocationConfirmed ? "Confirmed ✓" : "Yes, Use This Location"}</span>
            </button>
          </div>
        </div>

        {/* Step 3: Radius (Predefined or Custom in km) */}
        <div className="space-y-2.5 pt-1 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-400" />
              2. Search Radius (in Kilometers)
            </span>
            <span className="text-indigo-400 font-semibold">
              {radiusKm ? `${radiusKm} km radius` : "All Distances"}
            </span>
          </div>

          {/* Predefined radius pills */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {predefinedRadii.map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => handleSelectPredefinedRadius(km)}
                className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                  radiusKm === km && !isCustomRadius
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
                    : "bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800"
                }`}
              >
                {km} km
              </button>
            ))}

            <button
              type="button"
              onClick={() => handleSelectPredefinedRadius(null)}
              className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                radiusKm === null
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
                  : "bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800"
              }`}
            >
              Any km
            </button>
          </div>

          {/* Custom Radius input */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 flex-shrink-0">Or type custom radius:</span>
            <div className="relative flex-1 max-w-[150px]">
              <input
                type="number"
                min="0.5"
                step="0.5"
                max="200"
                placeholder="e.g. 7.5"
                value={customRadiusInput}
                onChange={(e) => handleCustomRadiusChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 pr-8"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                km
              </span>
            </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Blue dashed circle on map updates live with your radius
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApplyFinal}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Apply & Discover Top 10 Deals</span>
          </button>
        </div>
      </div>
    </div>
  );
}
