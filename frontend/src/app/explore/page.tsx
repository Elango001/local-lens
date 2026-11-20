"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  discoveryApi,
  DiscoveryOffer,
  clearToken,
} from "@/lib/api";
import {
  Compass,
  MapPin,
  Search,
  Tag,
  Clock,
  ShieldCheck,
  Store,
  Phone,
  Globe,
  AlertTriangle,
  CheckCircle2,
  X,
  Navigation,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Grid,
  Map as MapIcon,
  RefreshCw,
  ExternalLink,
  Target,
  SlidersHorizontal,
} from "lucide-react";

// Dynamically import DealsMap (SSR disabled for Leaflet)
const DealsMap = dynamic(() => import("@/components/DealsMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-500 gap-3">
      <RefreshCw className="w-7 h-7 animate-spin text-indigo-500" />
      <span className="text-xs">Loading Interactive Local Deals Map...</span>
    </div>
  ),
});

// Dynamically import LocationPickerModal (SSR disabled for Leaflet)
const LocationPickerModal = dynamic(() => import("@/components/LocationPickerModal"), {
  ssr: false,
});

export default function CustomerExplorePage() {
  // State: Paginated Deals
  const [offers, setOffers] = useState<DiscoveryOffer[]>([]);
  const [totalOffers, setTotalOffers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [sortBy, setSortBy] = useState<"distance" | "expiring_soon" | "newest">("distance");

  // Location & Radius State
  // Default demo coordinates: Springfield (37.7749, -122.4194)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>({
    lat: 37.7749,
    lng: -122.4194,
  });
  const [locationName, setLocationName] = useState("Springfield Downtown");
  const [radiusKm, setRadiusKm] = useState<number | null>(10);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // View Mode: Grid or Map
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  // Offer Detail Modal
  const [selectedOffer, setSelectedOffer] = useState<DiscoveryOffer | null>(null);

  // Current logged in customer
  const [currentUser, setCurrentUser] = useState<{ email: string; full_name?: string } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("locallens_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.email) {
          setCurrentUser(parsed);
          setReportEmail(parsed.email);
        }
      }
    } catch {}
  }, []);

  // Report Modal
  const [reportingOffer, setReportingOffer] = useState<DiscoveryOffer | null>(null);
  const [reportReason, setReportReason] = useState("refused_offer");
  const [reportEmail, setReportEmail] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Auto-corrected typo query
  const [correctedQuery, setCorrectedQuery] = useState<string | null>(null);

  // Fetch offers with 10-per-page pagination
  const fetchOffers = async (page = currentPage) => {
    try {
      setLoading(true);
      const res = await discoveryApi.getOffers({
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        city: selectedCity !== "all" ? selectedCity : undefined,
        search: searchTerm || undefined,
        lat: userLocation?.lat,
        lng: userLocation?.lng,
        radius_km: radiusKm || undefined,
        sort_by: sortBy,
        page: page,
        page_size: 10, // Strictly 10 per page
      });

      setOffers(res.items);
      setTotalOffers(res.total);
      setCurrentPage(res.page);
      setTotalPages(res.total_pages);
      setCorrectedQuery(res.corrected_query || null);
    } catch (err) {
      console.error("Error fetching deals:", err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch on filter or location changes (reset to page 1)
  useEffect(() => {
    setCurrentPage(1);
    fetchOffers(1);
  }, [selectedCategory, selectedCity, radiusKm, sortBy, userLocation]);

  // Handle Search Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchOffers(1);
  };

  // Page Change Handler
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    fetchOffers(newPage);
    window.scrollTo({ top: 380, behavior: "smooth" });
  };

  // Location Modal Confirmation
  const handleConfirmLocation = (
    loc: { lat: number; lng: number; name: string },
    newRadius: number | null
  ) => {
    setUserLocation({ lat: loc.lat, lng: loc.lng });
    setLocationName(loc.name);
    setRadiusKm(newRadius);
  };

  // Submit Inaccuracy Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingOffer) return;
    setSubmittingReport(true);

    try {
      await discoveryApi.reportOffer({
        offer_id: reportingOffer.id,
        reporter_email: reportEmail || undefined,
        reason: reportReason,
        description: reportNotes || undefined,
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setReportingOffer(null);
        setReportNotes("");
      }, 3000);
    } catch (err: any) {
      alert("Failed to submit report: " + err.message);
    } finally {
      setSubmittingReport(false);
    }
  };

  // Expiry text helper
  const getExpiryText = (endDateStr: string) => {
    const end = new Date(endDateStr).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return { label: "Expired", isUrgent: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days === 0) return { label: `Ends in ${hours} hours!`, isUrgent: true };
    if (days <= 3) return { label: `Ends in ${days} days (${hours}h)`, isUrgent: true };
    return { label: `Valid for ${days} days`, isUrgent: false };
  };

  // Google Maps turn-by-turn directions helper
  const getGoogleMapsDirectionsUrl = (business: DiscoveryOffer["business"]) => {
    if (
      business.latitude !== null &&
      business.latitude !== undefined &&
      business.longitude !== null &&
      business.longitude !== undefined &&
      !isNaN(Number(business.latitude)) &&
      !isNaN(Number(business.longitude))
    ) {
      return `https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`;
    }
    const destinationQuery = encodeURIComponent(
      [business.name, business.address, business.city].filter(Boolean).join(", ")
    );
    return `https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}`;
  };

  const categories = [
    { id: "all", label: "All Categories" },
    { id: "Restaurant & Cafe", label: "Dining & Cafes" },
    { id: "Electronics & Retail", label: "Electronics & Tech" },
    { id: "Retail & Fashion", label: "Fashion & Retail" },
    { id: "Services & Beauty", label: "Salon & Services" },
    { id: "Health & Fitness", label: "Fitness & Wellness" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Customer Header (NO merchant or admin buttons) */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
            <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">LocalLens</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Live Deals
              </span>
            </div>
            <p className="text-xs text-slate-400">Hyperlocal Verified Offers & Stores</p>
          </div>
        </Link>

        <div className="flex items-center gap-2.5">
          {/* Location & Radius Trigger Pill (Click to open map & radius picker) */}
          <button
            onClick={() => setShowLocationPicker(true)}
            className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-indigo-500/50 transition-all cursor-pointer shadow-sm group"
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-[10px] text-slate-400 font-normal">Location & Radius:</div>
              <div className="text-xs text-white font-bold max-w-[130px] md:max-w-[200px] truncate">
                {locationName} • <span className="text-indigo-400">{radiusKm ? `${radiusKm} km` : "All Distances"}</span>
              </div>
            </div>
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 ml-0.5" />
          </button>

          {/* Customer Auth Actions */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right hidden md:block">
                <div className="text-xs font-bold text-white truncate max-w-[110px]">
                  {currentUser.full_name || currentUser.email.split("@")[0]}
                </div>
                <div className="text-[10px] text-emerald-400">Signed In</div>
              </div>
              <button
                onClick={() => {
                  clearToken();
                  setCurrentUser(null);
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Search Section */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900/60 to-slate-950 border-b border-slate-800/80 px-6 pt-10 pb-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5" /> Top 10 Verified Local Offers
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Real discounts around you, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">
                within your chosen radius.
              </span>
            </h1>
            <p className="text-sm text-slate-400">
              Pick your location on the map, set your distance in km, and discover genuine deals from verified local merchants.
            </p>
          </div>

          {/* Search Bar & Radius Trigger */}
          <form
            onSubmit={handleSearchSubmit}
            className="bg-slate-900/90 border border-slate-700/80 p-2.5 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-2.5 max-w-4xl mx-auto backdrop-blur"
          >
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search deals (e.g. 50% Off, massage, battery, denim, brunch)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Change Location Button inside search bar */}
            <button
              type="button"
              onClick={() => setShowLocationPicker(true)}
              className="w-full md:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
            >
              <Target className="w-3.5 h-3.5 text-indigo-400" />
              <span className="truncate max-w-[140px]">{radiusKm ? `Radius: ${radiusKm} km` : "Radius: Any"}</span>
            </button>

            <button
              type="submit"
              className="w-full md:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 flex-shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>Search Top 10</span>
            </button>
          </form>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-4xl mx-auto scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  selectedCategory === cat.id
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Deals Feed */}
      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* Results Bar: View Toggle & Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Top 10 Local Deals
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-indigo-400 border border-slate-700">
                {totalOffers} found
              </span>
            </h2>
            {radiusKm && (
              <span className="text-xs text-slate-400">
                within <strong className="text-slate-200">{radiusKm} km</strong> of {locationName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="distance">📍 Distance: Closest First</option>
                <option value="expiring_soon">⏳ Expiring Soonest</option>
                <option value="newest">✨ Newest Deals</option>
              </select>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Grid View (Top 10)"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>

              <button
                onClick={() => setViewMode("map")}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === "map"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Interactive Map View"
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Map</span>
              </button>
            </div>
          </div>
        </div>

        {/* Typo Correction Banner */}
        {correctedQuery && (
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
            <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>
              Showing deals for <strong className="text-white font-bold underline">"{correctedQuery}"</strong> (auto-corrected from "{searchTerm}")
            </span>
          </div>
        )}

        {/* MAP VIEW */}
        {viewMode === "map" && (
          <div className="space-y-4">
            <DealsMap
              offers={offers}
              userLocation={userLocation}
              onSelectOffer={(offer) => setSelectedOffer(offer)}
              selectedOfferId={selectedOffer?.id}
            />
            <p className="text-xs text-slate-500 text-center">
              💡 Map displays the top 10 verified promotions matching your location and radius. Click any tag to see full conditions.
            </p>
          </div>
        )}

        {/* GRID VIEW (TOP 10 SEARCHES) */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <span className="text-xs">Fetching top 10 verified deals in your radius...</span>
          </div>
        ) : offers.length === 0 ? (
          <div className="p-16 text-center bg-slate-900/60 rounded-3xl border border-slate-800 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">No Offers Found in Your Radius</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Try expanding your radius, choosing another location on the map, or clearing category filters.
            </p>
            <button
              onClick={() => setShowLocationPicker(true)}
              className="mt-2 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors cursor-pointer"
            >
              Adjust Location & Radius
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top 10 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {offers.map((offer) => {
                const expiry = getExpiryText(offer.end_date);

                return (
                  <div
                    key={offer.id}
                    className="bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between shadow-lg shadow-black/20 group overflow-hidden"
                  >
                    <div className="p-5 space-y-3.5">
                      {/* Top Row: Discount Value & Distance */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <Tag className="w-3.5 h-3.5" />
                          <span>{offer.discount_value}</span>
                        </div>

                        {offer.distance_km !== null && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                            <Navigation className="w-3 h-3 text-indigo-400" />
                            {offer.distance_km} km away
                          </span>
                        )}
                      </div>

                      {/* Offer Title & Store Header */}
                      <div>
                        <h3 className="font-bold text-white text-base leading-snug group-hover:text-indigo-300 transition-colors">
                          {offer.title}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                          <Store className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-semibold text-slate-300">{offer.business.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-0.5">
                            <ShieldCheck className="w-3 h-3" /> Verified
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {offer.description}
                      </p>

                      {/* Expiry & Location Details */}
                      <div className="space-y-1.5 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">{offer.business.category}</span>
                          <span
                            className={`text-[11px] font-semibold flex items-center gap-1 ${
                              expiry.isUrgent ? "text-amber-400" : "text-slate-400"
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {expiry.label}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-1.5 text-slate-400 text-[11px] pt-0.5">
                          <div className="flex items-center gap-1.5 truncate pr-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                            <span className="truncate">{offer.business.address}, {offer.business.city}</span>
                          </div>
                          <a
                            href={getGoogleMapsDirectionsUrl(offer.business)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex-shrink-0 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/20"
                            title="Get directions to store in Google Maps"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>Directions</span>
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-5 py-3.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between">
                      <button
                        onClick={() => setReportingOffer(offer)}
                        className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Report if inaccurate or expired"
                      >
                        <AlertTriangle className="w-3 h-3" /> Report Issue
                      </button>

                      <div className="flex items-center gap-2">
                        <a
                          href={getGoogleMapsDirectionsUrl(offer.business)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
                          title="Get store directions in Google Maps"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>Map</span>
                        </a>

                        <button
                          onClick={() => setSelectedOffer(offer)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer shadow-md shadow-indigo-600/20"
                        >
                          <span>View Deal</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls (Fetch 10 per page) */}
            {totalPages > 1 && (
              <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-400">
                  Showing{" "}
                  <strong className="text-slate-200">
                    {(currentPage - 1) * 10 + 1}-{Math.min(currentPage * 10, totalOffers)}
                  </strong>{" "}
                  of <strong className="text-slate-200">{totalOffers}</strong> deals
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage <= 1 || loading}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          currentPage === pageNum
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                            : "bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <button
                    disabled={currentPage >= totalPages || loading}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: LOCATION & RADIUS PICKER WITH MAP CONFIRMATION */}
      <LocationPickerModal
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        currentLocation={userLocation}
        currentRadius={radiusKm}
        onConfirm={handleConfirmLocation}
      />

      {/* MODAL 2: DETAILED OFFER VIEW */}
      {selectedOffer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mb-2">
                  <Tag className="w-3.5 h-3.5" />
                  <span>{selectedOffer.discount_value}</span>
                </div>
                <h3 className="text-xl font-bold text-white">{selectedOffer.title}</h3>
                <p className="text-xs text-indigo-400 mt-0.5">{selectedOffer.business.category}</p>
              </div>

              <button
                onClick={() => setSelectedOffer(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 leading-relaxed text-slate-200">
                {selectedOffer.description}
              </div>

              {/* Validity Details */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                <div>
                  <span className="text-slate-500 block mb-0.5">Offer Starts:</span>
                  <span className="font-semibold text-slate-200">
                    {new Date(selectedOffer.start_date).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Offer Ends:</span>
                  <span className="font-semibold text-amber-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(selectedOffer.end_date).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-slate-400 font-semibold block">Conditions & Redemptions:</span>
                <p className="text-slate-300 italic">
                  "{selectedOffer.terms_and_conditions || "Standard store terms apply. Valid for in-store purchases while supplies last."}"
                </p>
              </div>

              {/* Branch Information */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-indigo-400" />
                    Applicable Store Branch
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Verified Merchant
                  </span>
                </div>

                <div className="text-white font-bold text-sm">
                  {selectedOffer.business.name}
                </div>

                <div className="space-y-1.5 text-slate-300 text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{selectedOffer.business.address}, {selectedOffer.business.city}</span>
                    {selectedOffer.distance_km !== null && (
                      <span className="text-emerald-400 font-semibold">({selectedOffer.distance_km} km away)</span>
                    )}
                  </div>

                  {selectedOffer.business.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <a href={`tel:${selectedOffer.business.phone}`} className="text-indigo-400 hover:underline">
                        {selectedOffer.business.phone}
                      </a>
                    </div>
                  )}

                  {selectedOffer.business.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-slate-500" />
                      <a
                        href={selectedOffer.business.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline inline-flex items-center gap-1"
                      >
                        {selectedOffer.business.website} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Store Location & Directions CTA */}
                <div className="pt-2 border-t border-slate-800/80">
                  <a
                    href={getGoogleMapsDirectionsUrl(selectedOffer.business)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-600/25 group cursor-pointer"
                  >
                    <Navigation className="w-4 h-4 transition-transform group-hover:scale-110" />
                    <span>Get Directions in Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setReportingOffer(selectedOffer);
                  setSelectedOffer(null);
                }}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1.5 cursor-pointer order-2 sm:order-1"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Report Inaccurate Offer
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto order-1 sm:order-2">
                <a
                  href={getGoogleMapsDirectionsUrl(selectedOffer.business)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Get Directions</span>
                </a>

                <button
                  onClick={() => setSelectedOffer(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REPORT INACCURATE OFFER MODAL */}
      {reportingOffer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Report Inaccurate Offer
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Protects other local shoppers & triggers a 24h merchant review window.
                </p>
              </div>
              <button
                onClick={() => setReportingOffer(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success Notification */}
            {reportSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">Report Successfully Submitted!</h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  The merchant has been notified and granted a <strong>24-hour grace period</strong> to clarify or take down this offer. If unresolved, our platform automatically takes it down.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-4 text-xs">
                {/* Target Offer Summary */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[11px]">Reporting Deal:</span>
                  <div className="font-bold text-white text-sm">{reportingOffer.title}</div>
                  <div className="text-slate-400 text-xs">
                    Store: <strong className="text-slate-300">{reportingOffer.business.name}</strong> • {reportingOffer.business.city}
                  </div>
                </div>

                {/* Reason Selection */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    What is inaccurate with this deal? *
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="refused_offer">Store refused to honor this discount in person</option>
                    <option value="expired">Offer is already expired but still shows active</option>
                    <option value="fake_discount">Misleading pricing or fake discount value</option>
                    <option value="shop_closed">Physical store location is permanently closed</option>
                    <option value="inaccurate_info">Inaccurate terms, address, or phone details</option>
                    <option value="other">Other issue with this promotion</option>
                  </select>
                </div>

                {/* Optional Reporter Email */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Your Contact Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. yourname@gmail.com"
                    value={reportEmail}
                    onChange={(e) => setReportEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    We will notify you if the merchant resolves or clarifies the terms.
                  </span>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Additional Details / Experience
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe what occurred when you visited or attempted to claim this deal..."
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                  🛡️ <strong>24-Hour Consumer Protection:</strong> Submitting notifies the merchant and platform admins immediately. If the shop owner does not resolve it within 24 hours, the offer is auto-paused.
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportingOffer(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
                  >
                    {submittingReport ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Filing Report...</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Submit Inaccuracy Report</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Customer Clean Footer (NO merchant or admin buttons) */}
      <footer className="border-t border-slate-900 bg-slate-950 px-8 py-8 text-center text-xs text-slate-500 space-y-2">
        <p className="font-semibold text-slate-400">
          LocalLens • Real-Time Hyperlocal Deals & Business Discovery
        </p>
        <p className="text-slate-600 text-[11px]">
          Verified Local Discounts Updated Directly by Stores & Monitored in Real Time
        </p>
      </footer>
    </div>
  );
}
