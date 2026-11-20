"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  MapPin,
  Navigation,
  Search,
  CheckCircle2,
  Store,
  RefreshCw,
  Crosshair,
} from "lucide-react";

interface StoreLocationMapPickerProps {
  lat: number | null;
  lng: number | null;
  address?: string;
  city?: string;
  onLocationChange: (data: { lat: number; lng: number; address?: string; city?: string }) => void;
  label?: string;
}

export default function StoreLocationMapPicker({
  lat,
  lng,
  address,
  city,
  onLocationChange,
  label = "Store Front Location & GPS Pin",
}: StoreLocationMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Default to provided coords or Springfield default (37.7749, -122.4194)
  const defaultLat = lat || 37.7749;
  const defaultLng = lng || -122.4194;

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: defaultLat,
    lng: defaultLng,
  });

  const [hasPinned, setHasPinned] = useState<boolean>(lat !== null && lng !== null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [lastDetected, setLastDetected] = useState<{ address?: string; city?: string } | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = lat || defaultLat;
    const initialLng = lng || defaultLng;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: lat && lng ? 15 : 13,
      scrollWheelZoom: "center",
    });

    // Free OpenStreetMap detailed tiles (no API keys required)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Custom Store Pin Icon
    const storePinIcon = L.divIcon({
      className: "store-picker-pin",
      html: `
        <div style="cursor: grab; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
          <div style="background: #4f46e5; color: white; font-weight: 700; font-size: 10px; padding: 2.5px 8px; border-radius: 9999px; box-shadow: 0 4px 10px rgba(0,0,0,0.35); white-space: nowrap; margin-bottom: 2px; border: 1px solid rgba(255,255,255,0.2);">
            Store Location
          </div>
          <div style="width: 32px; height: 32px; border-radius: 9999px; background: #0f172a; border: 2.5px solid #4f46e5; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 14px rgba(0,0,0,0.5);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
              <path d="M2 7h20"/>
            </svg>
          </div>
          <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #0f172a;"></div>
        </div>
      `,
      iconSize: [32, 54],
      iconAnchor: [0, 0],
    });

    const marker = L.marker([initialLat, initialLng], {
      icon: storePinIcon,
      draggable: true,
    }).addTo(map);

    // Marker Drag Event
    marker.on("dragend", async () => {
      const pos = marker.getLatLng();
      const newLat = Number(pos.lat.toFixed(6));
      const newLng = Number(pos.lng.toFixed(6));
      setCurrentCoords({ lat: newLat, lng: newLng });
      setHasPinned(true);
      onLocationChange({ lat: newLat, lng: newLng });
      await triggerReverseGeocode(newLat, newLng);
    });

    // Map Click Event
    map.on("click", async (e: L.LeafletMouseEvent) => {
      const newLat = Number(e.latlng.lat.toFixed(6));
      const newLng = Number(e.latlng.lng.toFixed(6));
      marker.setLatLng([newLat, newLng]);
      setCurrentCoords({ lat: newLat, lng: newLng });
      setHasPinned(true);
      onLocationChange({ lat: newLat, lng: newLng });
      await triggerReverseGeocode(newLat, newLng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Update marker position if external lat/lng change
  useEffect(() => {
    if (lat && lng && markerRef.current && mapInstanceRef.current) {
      if (currentCoords.lat !== lat || currentCoords.lng !== lng) {
        markerRef.current.setLatLng([lat, lng]);
        mapInstanceRef.current.setView([lat, lng], 15);
        setCurrentCoords({ lat, lng });
        setHasPinned(true);
      }
    }
  }, [lat, lng]);

  // Reverse Geocode using free OpenStreetMap Nominatim
  const triggerReverseGeocode = async (latitude: number, longitude: number) => {
    try {
      setReverseGeocoding(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "en",
          },
        }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.address) {
        const addrObj = data.address;
        const street = [addrObj.house_number, addrObj.road].filter(Boolean).join(" ");
        const locality = addrObj.suburb || addrObj.neighbourhood || addrObj.residential || addrObj.quarter || "";
        const formattedAddress = [street || data.name || "", locality].filter(Boolean).join(", ") 
          || (data.display_name ? data.display_name.split(",").slice(0, 3).join(", ") : "");
          
        const detectedCity =
          addrObj.city ||
          addrObj.town ||
          addrObj.village ||
          addrObj.municipality ||
          addrObj.suburb ||
          addrObj.county ||
          addrObj.state_district ||
          "";

        setLastDetected({
          address: formattedAddress,
          city: detectedCity,
        });

        onLocationChange({
          lat: latitude,
          lng: longitude,
          address: formattedAddress || undefined,
          city: detectedCity || undefined,
        });
      }
    } catch {
      // Ignore geocode error
    } finally {
      setReverseGeocoding(false);
    }
  };

  // Search Address on Map
  const handleSearchAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim() || [address, city].filter(Boolean).join(", ");
    if (!query) return;

    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&addressdetails=1&limit=1`,
        {
          headers: {
            "Accept-Language": "en",
          },
        }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const resultLat = Number(parseFloat(item.lat).toFixed(6));
        const resultLng = Number(parseFloat(item.lon).toFixed(6));

        setCurrentCoords({ lat: resultLat, lng: resultLng });
        setHasPinned(true);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([resultLat, resultLng], 16, { duration: 1.2 });
          markerRef.current.setLatLng([resultLat, resultLng]);
        }

        const addrObj = item.address || {};
        const street = [addrObj.house_number, addrObj.road].filter(Boolean).join(" ");
        const locality = addrObj.suburb || addrObj.neighbourhood || addrObj.residential || addrObj.quarter || "";
        const formattedAddress = [street || item.name || "", locality].filter(Boolean).join(", ") 
          || (item.display_name ? item.display_name.split(",").slice(0, 3).join(", ") : "");
          
        const detectedCity =
          addrObj.city ||
          addrObj.town ||
          addrObj.village ||
          addrObj.municipality ||
          addrObj.suburb ||
          addrObj.county ||
          addrObj.state_district ||
          "";

        setLastDetected({
          address: formattedAddress,
          city: detectedCity,
        });

        onLocationChange({
          lat: resultLat,
          lng: resultLng,
          address: formattedAddress || undefined,
          city: detectedCity || undefined,
        });
      } else {
        alert("Location not found on map. Try searching a major street, area, or city name.");
      }
    } catch {
      alert("Error searching map. Please try clicking directly on the map.");
    } finally {
      setSearching(false);
    }
  };

  // Browser GPS Locate
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const userLat = Number(pos.coords.latitude.toFixed(6));
        const userLng = Number(pos.coords.longitude.toFixed(6));

        setCurrentCoords({ lat: userLat, lng: userLng });
        setHasPinned(true);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([userLat, userLng], 16, { duration: 1.2 });
          markerRef.current.setLatLng([userLat, userLng]);
        }

        onLocationChange({ lat: userLat, lng: userLng });
        await triggerReverseGeocode(userLat, userLng);
        setDetectingGps(false);
      },
      (err) => {
        console.warn("GPS lookup error:", err);
        alert("Could not retrieve current GPS position. You can search or drag the pin manually.");
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            {label}
          </label>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Customers discover your deals by distance. Click the map or drag the pin to your shop entrance.
          </p>
        </div>

        {/* GPS Quick Action */}
        <button
          type="button"
          onClick={handleUseGps}
          disabled={detectingGps}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer shadow-sm w-fit"
        >
          {detectingGps ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Navigation className="w-3.5 h-3.5 text-indigo-400" />
          )}
          {detectingGps ? "Acquiring GPS..." : "Use My Current GPS"}
        </button>
      </div>

      {/* Map Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearchAddress();
              }
            }}
            placeholder="Search street, landmark, area, or postal code to fly to location..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button
          type="button"
          onClick={() => handleSearchAddress()}
          disabled={searching}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0"
        >
          {searching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
          Locate
        </button>
      </div>

      {/* Map Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-inner bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-[280px] z-10" />

        {/* Status Badge overlay */}
        <div className="absolute bottom-2.5 left-2.5 z-20 flex flex-wrap items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-900/90 backdrop-blur border border-slate-800 text-slate-300 flex items-center gap-1.5 shadow-md">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              Lat: <b className="text-white">{currentCoords.lat.toFixed(5)}</b>, Lng:{" "}
              <b className="text-white">{currentCoords.lng.toFixed(5)}</b>
            </span>
          </div>

          {hasPinned && (
            <div className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center gap-1 shadow-md">
              <CheckCircle2 className="w-3 h-3" />
              <span>Location Attached</span>
            </div>
          )}

          {reverseGeocoding && (
            <div className="px-2 py-1 rounded-lg text-[10px] bg-slate-800/90 text-slate-300 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
              <span>Detecting street & city...</span>
            </div>
          )}
        </div>
      </div>

      {/* Auto-detected address preview */}
      {(lastDetected?.address || lastDetected?.city) && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-white block">Address & City Auto-Updated from Map:</span>
            <span>
              {lastDetected.address && <span className="text-emerald-200">{lastDetected.address}</span>}
              {lastDetected.address && lastDetected.city && ", "}
              {lastDetected.city && <span className="text-emerald-200 font-semibold">{lastDetected.city}</span>}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
