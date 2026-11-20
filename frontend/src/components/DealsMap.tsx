"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { DiscoveryOffer } from "@/lib/api";

interface DealsMapProps {
  offers: DiscoveryOffer[];
  userLocation: { lat: number; lng: number } | null;
  onSelectOffer: (offer: DiscoveryOffer) => void;
  selectedOfferId?: number | null;
}

// Sanitize user-generated content against stored XSS before Leaflet HTML interpolation
function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function DealsMap({
  offers,
  userLocation,
  onSelectOffer,
  selectedOfferId,
}: DealsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center map on user location or Springfield default (37.7749, -122.4194)
    const initialLat = userLocation?.lat || 37.7749;
    const initialLng = userLocation?.lng || -122.4194;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 13,
      zoomControl: true,
    });

    // Official OpenStreetMap tile layer (100% free, no API key, detailed street names)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when offers or userLocation change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const bounds = L.latLngBounds([]);

    // 1. User Location Pin (Blue pulsing beacon)
    if (userLocation) {
      const userIcon = L.divIcon({
        className: "user-loc-pin",
        html: `
          <div style="position: relative; width: 24px; height: 24px;">
            <div style="position: absolute; width: 24px; height: 24px; border-radius: 9999px; background: rgba(99, 102, 241, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; border-radius: 9999px; background: #4f46e5; border: 2.5px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .bindPopup("<b>Your Current Location</b><br><span style='font-size: 11px; color: #64748b;'>Scanning offers around you</span>");
      
      layer.addLayer(userMarker);
      bounds.extend([userLocation.lat, userLocation.lng]);
    }

    // 2. Offer Store Pins
    offers.forEach((offer) => {
      const lat = offer.business.latitude;
      const lng = offer.business.longitude;
      if (!lat || !lng) return;

      const isSelected = selectedOfferId === offer.id;
      const pinColor = isSelected ? "#4f46e5" : "#0f172a";
      const tagBg = isSelected ? "#4f46e5" : "#10b981";

      const storeIcon = L.divIcon({
        className: "offer-map-pin",
        html: `
          <div style="cursor: pointer; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
            <div style="background: ${tagBg}; color: white; font-weight: 700; font-size: 11px; padding: 2px 7px; border-radius: 9999px; box-shadow: 0 4px 10px rgba(0,0,0,0.25); white-space: nowrap; margin-bottom: 2px;">
              ${escapeHtml(offer.discount_value)}
            </div>
            <div style="width: 28px; height: 28px; border-radius: 9999px; background: ${pinColor}; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 12px rgba(0,0,0,0.35);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
                <path d="M2 7h20"/>
              </svg>
            </div>
            <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid ${pinColor};"></div>
          </div>
        `,
        iconSize: [30, 48],
        iconAnchor: [0, 0],
      });

      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

      const popupHtml = `
        <div style="font-family: inherit; min-width: 210px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 700; background: #e0e7ff; color: #4338ca; padding: 1px 6px; border-radius: 4px;">
              ${escapeHtml(offer.business.category)}
            </span>
            ${
              offer.distance_km !== null
                ? `<span style="font-size: 11px; font-weight: 600; color: #059669;">${Number(offer.distance_km).toFixed(1)} km away</span>`
                : ""
            }
          </div>
          <h4 style="font-size: 13px; font-weight: 700; margin: 4px 0 2px 0; color: #0f172a;">${escapeHtml(offer.business.name)}</h4>
          <p style="font-size: 12px; font-weight: 600; color: #4f46e5; margin: 0 0 4px 0;">${escapeHtml(offer.title)}</p>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
            ${escapeHtml(offer.business.address)}, ${escapeHtml(offer.business.city)}
          </div>
          <button id="view-offer-btn-${offer.id}" style="width: 100%; background: #4f46e5; color: white; border: none; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; margin-bottom: 6px;">
            View Offer Details & Conditions →
          </button>
          <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 5px; width: 100%; background: #059669; color: white; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-decoration: none; box-sizing: border-box;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            <span>Get Directions (Google Maps) ↗</span>
          </a>
        </div>
      `;

      const marker = L.marker([lat, lng], { icon: storeIcon }).bindPopup(popupHtml);

      marker.on("popupopen", () => {
        const btn = document.getElementById(`view-offer-btn-${offer.id}`);
        if (btn) {
          btn.onclick = () => onSelectOffer(offer);
        }
      });

      layer.addLayer(marker);
      bounds.extend([lat, lng]);
    });

    // Auto-fit bounds if markers exist
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [offers, userLocation, selectedOfferId]);

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-900">
      <div ref={mapContainerRef} className="w-full h-full z-10" />
      <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 shadow-lg flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Verified Deals ({offers.length})</span>
        </div>
        {userLocation && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <span>You</span>
          </div>
        )}
      </div>
    </div>
  );
}
