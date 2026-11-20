"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  merchantApi,
  clearToken,
  getToken,
  Business,
  Offer,
  Report,
} from "@/lib/api";

const StoreLocationMapPicker = dynamic(
  () => import("@/components/StoreLocationMapPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[280px] rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 text-xs gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
        Loading Interactive Storefront Map...
      </div>
    ),
  }
);
import {
  Store,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  PlayCircle,
  PauseCircle,
  Trash2,
  Edit3,
  ExternalLink,
  LogOut,
  RefreshCw,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Timer,
  Ban,
  FileText,
  Calendar,
  Sparkles,
  ChevronDown,
  ShieldAlert,
} from "lucide-react";

export default function MerchantDashboardPage() {
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBiz, setActiveBiz] = useState<Business | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"offers" | "reports" | "profile" | "add_branch">("offers");

  // Offer Creation & Edit Modal
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [offerTitle, setOfferTitle] = useState("");
  const [offerDesc, setOfferDesc] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "flat" | "bogo" | "custom">("percentage");
  const [discountVal, setDiscountVal] = useState("20% Off");
  const [terms, setTerms] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [savingOffer, setSavingOffer] = useState(false);

  // Report Response Modal
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [merchantReply, setMerchantReply] = useState("");
  const [savingReportReply, setSavingReportReply] = useState(false);

  // Shop Profile Edit State
  const [profileName, setProfileName] = useState("");
  const [profileCategory, setProfileCategory] = useState("");
  const [profileDesc, setProfileDesc] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [profileCity, setProfileCity] = useState("");
  const [profileLat, setProfileLat] = useState<number | null>(null);
  const [profileLng, setProfileLng] = useState<number | null>(null);
  const [profilePhone, setProfilePhone] = useState("");
  const [profileWebsite, setProfileWebsite] = useState("");
  const [profileLicense, setProfileLicense] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // New Branch State
  const [branchName, setBranchName] = useState("");
  const [branchCategory, setBranchCategory] = useState("Restaurant");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchCity, setBranchCity] = useState("Springfield");
  const [branchLat, setBranchLat] = useState<number | null>(null);
  const [branchLng, setBranchLng] = useState<number | null>(null);
  const [branchPhone, setBranchPhone] = useState("");
  const [creatingBranch, setCreatingBranch] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);

  // Helper for 24h timer
  const getRemainingTimeText = (createdAtStr: string, graceHours = 24) => {
    const created = new Date(createdAtStr).getTime();
    const deadline = created + graceHours * 60 * 60 * 1000;
    const now = Date.now();
    const diff = deadline - now;

    if (diff <= 0) {
      return { expired: true, text: "24h Window Expired (Offer Auto-Paused)" };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { expired: false, text: `${hours}h ${mins}m left before auto-takedown` };
  };

  // Load Data
  const loadMerchantData = async () => {
    try {
      setLoading(true);
      const bizList = await merchantApi.getMyBusinesses();
      setBusinesses(bizList);

      const targetBiz = activeBiz
        ? bizList.find((b) => b.id === activeBiz.id) || bizList[0]
        : bizList[0];

      setActiveBiz(targetBiz || null);

      if (targetBiz) {
        // Sync profile fields
        setProfileName(targetBiz.name);
        setProfileCategory(targetBiz.category);
        setProfileDesc(targetBiz.description || "");
        setProfileAddress(targetBiz.address);
        setProfileCity(targetBiz.city);
        setProfileLat(targetBiz.latitude ?? null);
        setProfileLng(targetBiz.longitude ?? null);
        setProfilePhone(targetBiz.phone || "");
        setProfileWebsite(targetBiz.website || "");
        setProfileLicense(targetBiz.tax_or_license_number || "");

        // Fetch offers and reports for active business
        const [offersData, reportsData] = await Promise.all([
          merchantApi.getBusinessOffers(targetBiz.id),
          merchantApi.getBusinessReports(targetBiz.id),
        ]);
        setOffers(offersData);
        setReports(reportsData);
      }
      setAccessDenied(false);
    } catch (err: any) {
      console.error("Error loading merchant data:", err);
      if (err.message?.includes("403") || err.message?.includes("forbidden") || err.message?.includes("Merchant privilege")) {
        setAccessDenied(true);
      } else if (err.message?.includes("401") || err.message?.includes("credentials")) {
        clearToken();
        router.push("/merchant/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/merchant/login");
      return;
    }

    const cached = localStorage.getItem("locallens_user");
    if (cached) {
      try {
        const u = JSON.parse(cached);
        setCurrentUser(u);
        if (u.role === "customer") {
          setAccessDenied(true);
          setLoading(false);
          return;
        } else {
          setAccessDenied(false);
        }
      } catch (e) {}
    }

    loadMerchantData();
  }, []);

  // When active shop changes
  const handleSelectShop = async (biz: Business) => {
    setActiveBiz(biz);
    setProfileName(biz.name);
    setProfileCategory(biz.category);
    setProfileDesc(biz.description || "");
    setProfileAddress(biz.address);
    setProfileCity(biz.city);
    setProfileLat(biz.latitude ?? null);
    setProfileLng(biz.longitude ?? null);
    setProfilePhone(biz.phone || "");
    setProfileWebsite(biz.website || "");
    setProfileLicense(biz.tax_or_license_number || "");

    try {
      const [offersData, reportsData] = await Promise.all([
        merchantApi.getBusinessOffers(biz.id),
        merchantApi.getBusinessReports(biz.id),
      ]);
      setOffers(offersData);
      setReports(reportsData);
    } catch (e) {
      console.error(e);
    }
  };

  // Open Offer Modal
  const openNewOfferModal = () => {
    setEditingOffer(null);
    setOfferTitle("");
    setOfferDesc("");
    setDiscountType("percentage");
    setDiscountVal("20% Off");
    setTerms("Valid for in-store purchases only.");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    setShowOfferModal(true);
  };

  const openEditOfferModal = (offer: Offer) => {
    setEditingOffer(offer);
    setOfferTitle(offer.title);
    setOfferDesc(offer.description);
    setDiscountType(offer.discount_type);
    setDiscountVal(offer.discount_value);
    setTerms(offer.terms_and_conditions || "");
    setStartDate(offer.start_date.split("T")[0]);
    setEndDate(offer.end_date.split("T")[0]);
    setShowOfferModal(true);
  };

  // Save Offer Handler
  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBiz) return;
    setSavingOffer(true);

    try {
      const payload = {
        title: offerTitle,
        description: offerDesc,
        discount_type: discountType,
        discount_value: discountVal,
        terms_and_conditions: terms,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate + "T23:59:59").toISOString(),
      };

      if (editingOffer) {
        await merchantApi.updateOffer(editingOffer.id, payload);
      } else {
        await merchantApi.createOffer(activeBiz.id, payload);
      }

      setShowOfferModal(false);
      const updated = await merchantApi.getBusinessOffers(activeBiz.id);
      setOffers(updated);
    } catch (err: any) {
      alert("Failed to save offer: " + err.message);
    } finally {
      setSavingOffer(false);
    }
  };

  // Toggle Pause Offer
  const handleTogglePause = async (offerId: number) => {
    try {
      await merchantApi.togglePauseOffer(offerId);
      if (activeBiz) {
        const updated = await merchantApi.getBusinessOffers(activeBiz.id);
        setOffers(updated);
      }
    } catch (err: any) {
      alert("Failed to toggle offer state: " + err.message);
    }
  };

  // Delete Offer
  const handleDeleteOffer = async (offerId: number) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;
    try {
      await merchantApi.deleteOffer(offerId);
      if (activeBiz) {
        const updated = await merchantApi.getBusinessOffers(activeBiz.id);
        setOffers(updated);
      }
    } catch (err: any) {
      alert("Failed to delete offer: " + err.message);
    }
  };

  // Respond to Report Handler
  const handleRespondReport = async (takeDown = false) => {
    if (!selectedReport || !activeBiz) return;
    setSavingReportReply(true);

    try {
      await merchantApi.respondToReport(
        selectedReport.id,
        merchantReply || (takeDown ? "Offer paused voluntarily by shop manager." : "Issue clarified and honored."),
        takeDown
      );
      setSelectedReport(null);
      setMerchantReply("");
      const [updatedReports, updatedOffers] = await Promise.all([
        merchantApi.getBusinessReports(activeBiz.id),
        merchantApi.getBusinessOffers(activeBiz.id),
      ]);
      setReports(updatedReports);
      setOffers(updatedOffers);
    } catch (err: any) {
      alert("Failed to submit response: " + err.message);
    } finally {
      setSavingReportReply(false);
    }
  };

  // Save Store Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBiz) return;
    setSavingProfile(true);

    try {
      const updated = await merchantApi.updateBusiness(activeBiz.id, {
        name: profileName,
        category: profileCategory,
        description: profileDesc,
        address: profileAddress,
        city: profileCity,
        latitude: profileLat !== null ? profileLat : undefined,
        longitude: profileLng !== null ? profileLng : undefined,
        phone: profilePhone,
        website: profileWebsite,
        tax_or_license_number: profileLicense,
      });
      setActiveBiz(updated);
      alert("Shop profile & map location saved successfully!");
      loadMerchantData();
    } catch (err: any) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // Create New Branch Handler
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingBranch(true);

    try {
      const newBiz = await merchantApi.registerBusiness({
        name: branchName,
        category: branchCategory,
        address: branchAddress,
        city: branchCity,
        latitude: branchLat !== null ? branchLat : undefined,
        longitude: branchLng !== null ? branchLng : undefined,
        phone: branchPhone,
      });
      setBranchName("");
      setBranchAddress("");
      setBranchLat(null);
      setBranchLng(null);
      setBranchPhone("");
      alert("New store registered! It has been submitted for admin verification.");
      setActiveTab("offers");
      loadMerchantData();
    } catch (err: any) {
      alert("Failed to register branch: " + err.message);
    } finally {
      setCreatingBranch(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    router.push("/merchant/login");
  };

  if (accessDenied && currentUser?.role === "customer") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center font-sans">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Access Restricted</h2>
        <p className="text-sm text-slate-400 max-w-md mt-2 mb-6">
          You are currently signed in as a customer (<strong className="text-slate-200">{currentUser?.email}</strong>). The Merchant Portal is reserved for verified business owners and partners.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/explore")}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
          >
            Explore Nearby Deals
          </button>
          <button
            onClick={() => {
              clearToken();
              router.push("/merchant/login");
            }}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700"
          >
            Sign in as Merchant
          </button>
        </div>
      </div>
    );
  }

  if (loading && businesses.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3 font-sans">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-xs text-slate-500">Loading Merchant Workspace...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">LocalLens Merchant</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Shop Portal
              </span>
            </div>
            <div className="text-xs text-slate-400">Real-Time Offers & Local Discovery Manager</div>
          </div>
        </div>

        {/* Store Selector & User Info */}
        <div className="flex items-center gap-4">
          {businesses.length > 1 && (
            <div className="relative">
              <select
                value={activeBiz?.id || ""}
                onChange={(e) => {
                  const b = businesses.find((x) => x.id === Number(e.target.value));
                  if (b) handleSelectShop(b);
                }}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 py-1.5 px-3 rounded-lg focus:outline-none cursor-pointer"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={loadMerchantData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <div className="h-4 w-[1px] bg-slate-800" />

          <div className="text-right">
            <div className="text-xs font-semibold text-slate-200">{currentUser?.full_name || "Merchant"}</div>
            <div className="text-[11px] text-slate-400">{currentUser?.email}</div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/50 p-4 space-y-1 flex-shrink-0">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
            Store Navigation
          </div>

          <button
            onClick={() => setActiveTab("offers")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "offers"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Tag className="w-4 h-4" />
              My Offers & Deals
            </div>
            {offers.length > 0 && (
              <span className="text-xs font-mono text-slate-400">{offers.length}</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "reports"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4" />
              Customer Feedback
            </div>
            {reports.filter((r) => r.status === "pending" || r.status === "auto_taken_down").length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                {reports.filter((r) => r.status === "pending" || r.status === "auto_taken_down").length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "profile"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4" />
              Store Profile & Location
            </div>
          </button>

          <button
            onClick={() => setActiveTab("add_branch")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "add_branch"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Plus className="w-4 h-4" />
              Add Another Store
            </div>
          </button>

          {/* Active Store Widget at bottom of sidebar */}
          {activeBiz && (
            <div className="pt-6 mt-6 border-t border-slate-800 text-xs space-y-2">
              <div className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                Active Store
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="font-semibold text-white truncate">{activeBiz.name}</div>
                <div className="text-slate-400 text-[11px]">{activeBiz.category}</div>
                <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-1 truncate">
                  <MapPin className="w-3 h-3 flex-shrink-0" /> {activeBiz.city}
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* STORE VERIFICATION STATUS BANNER */}
          {activeBiz && (
            <div>
              {activeBiz.status === "verified" && (
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-sm text-emerald-200">
                        {activeBiz.name} is a Verified Business
                      </div>
                      <div className="text-xs text-emerald-400/80">
                        Your active promotional offers are live in customer discovery.
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Status: Active
                  </span>
                </div>
              )}

              {activeBiz.status === "pending" && (
                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-900/40 text-amber-300 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-sm text-amber-200">
                        Verification Pending Admin Review
                      </div>
                      <div className="text-xs text-amber-400/80">
                        Our moderators are verifying your trade documents. You can prepare offers now; they will activate as soon as your business is verified.
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Awaiting Approval
                  </span>
                </div>
              )}

              {activeBiz.status === "rejected" && (
                <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/40 text-rose-300 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-sm text-rose-200">
                        Application Action Required
                      </div>
                      <div className="text-xs text-rose-300/80 mt-0.5">
                        Feedback: "{activeBiz.verification_notes || "Please submit valid trade permits."}"
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("profile")}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer self-start md:self-auto"
                  >
                    Update Store Documents
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: OFFERS & PROMOTIONS STUDIO */}
          {activeTab === "offers" && (
            <div className="space-y-6 max-w-7xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Active Offers & Promotions</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Create 1-minute deals, pause offers during peak rushes, and keep customer offers accurate.
                  </p>
                </div>

                <button
                  onClick={openNewOfferModal}
                  disabled={activeBiz?.status !== "verified"}
                  title={activeBiz?.status !== "verified" ? "Store must be verified to create offers" : ""}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Create New Offer
                </button>
              </div>

              {/* Offers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {offers.length === 0 ? (
                  <div className="col-span-full p-14 text-center bg-slate-900 rounded-2xl border border-slate-800">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 mb-3">
                      <Tag className="w-6 h-6" />
                    </div>
                    <div className="font-semibold text-slate-200 text-base">No Offers Created Yet</div>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto mb-4">
                      Create your first deal to attract footfall from nearby customers browsing LocalLens!
                    </p>
                    {activeBiz?.status === "verified" ? (
                      <button
                        onClick={openNewOfferModal}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                      >
                        Launch 1-Minute Deal
                      </button>
                    ) : (
                      <span className="text-xs text-amber-400">
                        Offers can be created once store is approved.
                      </span>
                    )}
                  </div>
                ) : (
                  offers.map((offer) => {
                    const isExpired = new Date(offer.end_date) < new Date();
                    return (
                      <div
                        key={offer.id}
                        className={`p-5 rounded-2xl border transition-all flex flex-col justify-between shadow-sm ${
                          offer.is_paused || offer.status === "paused"
                            ? "bg-slate-900/50 border-amber-500/30"
                            : isExpired
                            ? "bg-slate-900/30 border-slate-800 opacity-60"
                            : "bg-slate-900 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Top Badges */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {offer.discount_value}
                            </span>

                            {offer.status === "active" && !offer.is_paused && !isExpired && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Active
                              </span>
                            )}

                            {(offer.is_paused || offer.status === "paused") && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Paused
                              </span>
                            )}

                            {isExpired && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                Expired
                              </span>
                            )}

                            {offer.status === "flagged" && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Under Review
                              </span>
                            )}
                          </div>

                          <div>
                            <h3 className="font-bold text-white text-base leading-snug">{offer.title}</h3>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                              {offer.description}
                            </p>
                          </div>

                          {offer.terms_and_conditions && (
                            <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800 italic">
                              Conditions: {offer.terms_and_conditions}
                            </div>
                          )}

                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Valid: {new Date(offer.start_date).toLocaleDateString()} – {new Date(offer.end_date).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Quick Control Actions */}
                        <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                          {/* 1-Click Instant Pause / Resume Toggle */}
                          <button
                            onClick={() => handleTogglePause(offer.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              offer.is_paused || offer.status === "paused"
                                ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30"
                                : "bg-amber-600/20 text-amber-400 border border-amber-500/30 hover:bg-amber-600/30"
                            }`}
                          >
                            {offer.is_paused || offer.status === "paused" ? (
                              <>
                                <PlayCircle className="w-3.5 h-3.5" /> Resume Deal
                              </>
                            ) : (
                              <>
                                <PauseCircle className="w-3.5 h-3.5" /> 1-Click Pause
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditOfferModal(offer)}
                              title="Edit Offer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteOffer(offer.id)}
                              title="Delete Offer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOMER REPORTS & 24H GRACE PERIOD */}
          {activeTab === "reports" && (
            <div className="space-y-6 max-w-7xl">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  Customer Reports & Inaccuracies
                  <span className="px-2.5 py-0.5 text-xs rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    24h Grace Protection
                  </span>
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  When a customer reports an issue with an offer, you have 24 hours to clarify, update, or take down the deal. If ignored, the system will auto-pause it.
                </p>
              </div>

              {/* Reports List */}
              <div className="grid grid-cols-1 gap-5">
                {reports.length === 0 ? (
                  <div className="p-14 text-center bg-slate-900 rounded-2xl border border-slate-800">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="font-semibold text-slate-200 text-base">All Offers Accurate & Clean</div>
                    <p className="text-xs text-slate-500 mt-1">
                      No customer complaints have been filed against your store offers.
                    </p>
                  </div>
                ) : (
                  reports.map((report) => {
                    const timerInfo = getRemainingTimeText(report.created_at, report.grace_period_hours);
                    return (
                      <div
                        key={report.id}
                        className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6"
                      >
                        <div className="space-y-3.5 max-w-3xl flex-1">
                          {/* Badges */}
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              Report Reason: {report.reason.replace("_", " ")}
                            </span>

                            {report.status === "pending" && !timerInfo.expired && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                                <Timer className="w-3.5 h-3.5" />
                                {timerInfo.text}
                              </span>
                            )}

                            {(report.status === "auto_taken_down" || report.auto_taken_down || timerInfo.expired) && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                <Ban className="w-3.5 h-3.5" /> Auto-Taken Down (24h Elapsed)
                              </span>
                            )}

                            {report.status === "merchant_resolved" && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Resolved by You
                              </span>
                            )}
                          </div>

                          <div className="text-white font-medium text-base">
                            Reported Deal: <span className="text-indigo-400 font-semibold">{report.offer?.title || `Offer #${report.offer_id}`}</span>
                          </div>

                          <div className="text-sm text-slate-200 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                            <div className="text-xs text-slate-400 font-medium mb-1">Customer Statement:</div>
                            "{report.description || "No comment provided."}"
                          </div>

                          {report.merchant_response && (
                            <div className="text-xs text-emerald-300 bg-emerald-950/20 p-3 rounded-xl border border-emerald-900/40">
                              <span className="text-emerald-400 font-semibold block mb-0.5">Your Response / Resolution:</span>
                              "{report.merchant_response}"
                            </div>
                          )}

                          <div className="text-xs text-slate-500 flex items-center gap-4">
                            <span>Reporter: {report.reporter_email || "Anonymous Shopper"}</span>
                            <span>Reported on: {new Date(report.created_at).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Action: Respond or Take Down */}
                        {report.status === "pending" || report.status === "auto_taken_down" ? (
                          <div className="flex-shrink-0">
                            <button
                              onClick={() => {
                                setSelectedReport(report);
                                setMerchantReply(report.merchant_response || "");
                              }}
                              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
                            >
                              Respond & Settle Issue
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: STORE PROFILE & LOCATION */}
          {activeTab === "profile" && activeBiz && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Store Profile & Location</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Keep your business information, contact channels, and trade license details up to date.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Store Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Category
                    </label>
                    <select
                      value={profileCategory}
                      onChange={(e) => setProfileCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="Restaurant & Cafe">Restaurant & Cafe</option>
                      <option value="Retail & Fashion">Retail & Fashion</option>
                      <option value="Services & Beauty">Services & Beauty</option>
                      <option value="Health & Fitness">Health & Fitness</option>
                      <option value="Electronics & Retail">Electronics & Retail</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Store Description
                  </label>
                  <textarea
                    rows={3}
                    value={profileDesc}
                    onChange={(e) => setProfileDesc(e.target.value)}
                    placeholder="Short summary of what your shop offers..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Store Address
                    </label>
                    <input
                      type="text"
                      required
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      value={profileCity}
                      onChange={(e) => setProfileCity(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Interactive Store Map Location & Coordinates */}
                <div className="pt-2 border-t border-slate-800">
                  <StoreLocationMapPicker
                    lat={profileLat}
                    lng={profileLng}
                    address={profileAddress}
                    city={profileCity}
                    onLocationChange={(coords) => {
                      setProfileLat(coords.lat);
                      setProfileLng(coords.lng);
                      if (coords.address) {
                        setProfileAddress(coords.address);
                      }
                      if (coords.city) {
                        setProfileCity(coords.city);
                      }
                    }}
                    label="Pin Storefront on Map (Coordinates Saved to Database)"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Phone Number (Direct Contact for Shoppers)
                    </label>
                    <input
                      type="text"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="+1-555-010-1234"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Website / Social Link
                    </label>
                    <input
                      type="text"
                      value={profileWebsite}
                      onChange={(e) => setProfileWebsite(e.target.value)}
                      placeholder="https://yourshop.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Tax ID / Trade License Number
                  </label>
                  <input
                    type="text"
                    value={profileLicense}
                    onChange={(e) => setProfileLicense(e.target.value)}
                    placeholder="e.g. GSTIN or Municipal Trade Permit #"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Updating your license will submit your shop for admin verification.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {savingProfile ? "Saving Profile..." : "Save Store Changes"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: ADD ANOTHER STORE LOCATION */}
          {activeTab === "add_branch" && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Register Another Store Location</h2>
                <p className="text-sm text-slate-400 mt-1">
                  If you have multiple branches or manage multiple businesses, add them under your merchant account.
                </p>
              </div>

              <form onSubmit={handleCreateBranch} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Branch / Store Name
                    </label>
                    <input
                      type="text"
                      required
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="e.g. Harvest Bakery - Westside Branch"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Category
                    </label>
                    <select
                      value={branchCategory}
                      onChange={(e) => setBranchCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="Restaurant & Cafe">Restaurant & Cafe</option>
                      <option value="Retail & Fashion">Retail & Fashion</option>
                      <option value="Services & Beauty">Services & Beauty</option>
                      <option value="Health & Fitness">Health & Fitness</option>
                      <option value="Electronics & Retail">Electronics & Retail</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Address
                    </label>
                    <input
                      type="text"
                      required
                      value={branchAddress}
                      onChange={(e) => setBranchAddress(e.target.value)}
                      placeholder="e.g. 550 Westside Ave"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      value={branchCity}
                      onChange={(e) => setBranchCity(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Store Phone
                  </label>
                  <input
                    type="text"
                    value={branchPhone}
                    onChange={(e) => setBranchPhone(e.target.value)}
                    placeholder="+1-555-019-3333"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Interactive Branch Map Location & GPS Coordinates */}
                <div className="pt-2 border-t border-slate-800">
                  <StoreLocationMapPicker
                    lat={branchLat}
                    lng={branchLng}
                    address={branchAddress}
                    city={branchCity}
                    onLocationChange={(coords) => {
                      setBranchLat(coords.lat);
                      setBranchLng(coords.lng);
                      if (coords.address) {
                        setBranchAddress(coords.address);
                      }
                      if (coords.city) {
                        setBranchCity(coords.city);
                      }
                    }}
                    label="Pin Branch Location on Map (Required for Discovery)"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={creatingBranch}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {creatingBranch ? "Registering..." : "Submit Store for Verification"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: 1-MINUTE OFFER CREATOR / EDITOR */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  {editingOffer ? "Edit Offer" : "1-Minute Offer Studio"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Publish a high-visibility deal for local customers
                </p>
              </div>
              <button
                onClick={() => setShowOfferModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOffer} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Offer Headline / Title
                </label>
                <input
                  type="text"
                  required
                  value={offerTitle}
                  onChange={(e) => setOfferTitle(e.target.value)}
                  placeholder="e.g. Weekend Brunch Buffet: 25% Off"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Discount Type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e: any) => {
                      const val = e.target.value;
                      setDiscountType(val);
                      if (val === "custom" && discountVal.includes("%")) {
                        setDiscountVal("Free Dessert with Entree");
                      } else if (val === "percentage" && !discountVal.includes("%")) {
                        setDiscountVal("20% Off");
                      } else if (val === "bogo") {
                        setDiscountVal("Buy 1 Get 1 Free");
                      } else if (val === "flat" && !discountVal.includes("$") && !discountVal.includes("₹")) {
                        setDiscountVal("$10 Off");
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-medium"
                  >
                    <option value="percentage">Percentage Discount (%)</option>
                    <option value="flat">Flat Cash Discount ($/₹)</option>
                    <option value="bogo">Buy 1 Get 1 (BOGO)</option>
                    <option value="custom">Custom Discount / Deal</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Discount Tag Value (Displayed on Map Pin)
                  </label>
                  <input
                    type="text"
                    required
                    value={discountVal}
                    onChange={(e) => setDiscountVal(e.target.value)}
                    placeholder={
                      discountType === "percentage"
                        ? "e.g. 25% Off"
                        : discountType === "flat"
                        ? "e.g. $15 Off or ₹100 Off"
                        : discountType === "bogo"
                        ? "e.g. Buy 1 Get 1 Free"
                        : "e.g. Free Dessert, Combo $9.99, Special Gift"
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 font-bold text-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {discountType === "custom" && (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Custom Discount Mode:</span>
                    <span>Enter any promotional phrase, combo deal, free gift, or custom perk in the tag value above.</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Offer Description
                </label>
                <textarea
                  rows={2}
                  required
                  value={offerDesc}
                  onChange={(e) => setOfferDesc(e.target.value)}
                  placeholder="Tell shoppers what is included in this offer..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Enhanced Date Picker UI with Calendar & Quick Shortcuts */}
              <div className="space-y-2 pt-1 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold uppercase tracking-wider text-slate-300">
                    Offer Duration & Validity Dates
                  </label>
                  {startDate && endDate && (
                    <span className="text-[11px] text-indigo-400 font-medium">
                      {Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))} days active
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 mb-1 block">Start Date:</span>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                        style={{ colorScheme: "dark" }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 mb-1 block">Expiry Date:</span>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <input
                        type="date"
                        required
                        value={endDate}
                        min={startDate || new Date().toISOString().split("T")[0]}
                        onChange={(e) => setEndDate(e.target.value)}
                        onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                        style={{ colorScheme: "dark" }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Expiry Shortcuts */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-medium">Quick duration:</span>
                  {[
                    { label: "+3 Days", days: 3 },
                    { label: "+7 Days (1 Wk)", days: 7 },
                    { label: "+14 Days (2 Wks)", days: 14 },
                    { label: "+30 Days (1 Mo)", days: 30 },
                    { label: "+60 Days (2 Mos)", days: 60 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        const base = startDate ? new Date(startDate) : new Date();
                        const next = new Date(base.getTime() + preset.days * 24 * 60 * 60 * 1000);
                        setEndDate(next.toISOString().split("T")[0]);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-indigo-500 transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Terms & Conditions
                </label>
                <input
                  type="text"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="e.g. Dine-in only. Min bill $20. Cannot combine with other coupons."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowOfferModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOffer}
                  className="px-5 py-2.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  {savingOffer ? "Publishing..." : editingOffer ? "Update Offer" : "Publish Deal Live"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESOLVE & RESPOND TO REPORT */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Resolve Customer Feedback</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Settle issue within 24 hours to prevent automatic takedown
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-500 font-medium mb-1">Customer Statement:</div>
                <div className="text-slate-200">"{selectedReport.description}"</div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Your Explanation / Resolution Note
              </label>
              <textarea
                rows={3}
                value={merchantReply}
                onChange={(e) => setMerchantReply(e.target.value)}
                placeholder="e.g. Spoke with shift supervisor. Cashier has been instructed to honor the discount for all weekend guests."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingReportReply}
                onClick={() => handleRespondReport(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30 transition-colors cursor-pointer"
              >
                Take Down Offer Voluntarily
              </button>
              <button
                type="button"
                disabled={savingReportReply}
                onClick={() => handleRespondReport(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
              >
                Settle & Keep Offer Live
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
