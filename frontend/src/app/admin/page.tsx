"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminApi,
  clearToken,
  getToken,
  AdminStats,
  Business,
  Report,
} from "@/lib/api";
import {
  ShieldCheck,
  Building2,
  Store,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ExternalLink,
  LogOut,
  RefreshCw,
  ChevronRight,
  MapPin,
  Mail,
  Phone,
  FileText,
  Layers,
  Globe,
  Ban,
  Timer,
  RotateCcw,
  User as UserIcon,
  ShieldAlert,
} from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  // Navigation tabs:
  // "overview" | "pending" | "accepted" | "rejected" | "reports"
  const [activeTab, setActiveTab] = useState<"overview" | "pending" | "accepted" | "rejected" | "reports">("overview");

  // Sub-section for Customer Reports: unresolved vs resolved
  const [reportSection, setReportSection] = useState<"unresolved" | "resolved">("unresolved");

  // Searches & Filters per tab
  const [pendingSearch, setPendingSearch] = useState<string>("");
  const [acceptedSearch, setAcceptedSearch] = useState<string>("");
  const [rejectedSearch, setRejectedSearch] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Modals & Action States
  const [selectedVerifyBiz, setSelectedVerifyBiz] = useState<Business | null>(null);
  const [selectedDetailBiz, setSelectedDetailBiz] = useState<Business | null>(null);
  const [verifyNotes, setVerifyNotes] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportNotes, setReportNotes] = useState("");

  const [adminUser, setAdminUser] = useState<any>(null);

  // Helper for countdown timer
  const getRemainingTimeText = (createdAtStr: string, graceHours = 24) => {
    const created = new Date(createdAtStr).getTime();
    const deadline = created + graceHours * 60 * 60 * 1000;
    const now = Date.now();
    const diff = deadline - now;

    if (diff <= 0) {
      return { expired: true, text: "24h Window Expired (Auto-Paused)" };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { expired: false, text: `${hours}h ${mins}m left to reflect/resolve` };
  };

  // Determine which status to fetch for the current tab
  const getTabStatus = () => {
    if (activeTab === "pending") return "pending";
    if (activeTab === "accepted") return "verified";
    if (activeTab === "rejected") return "rejected";
    return undefined;
  };

  const getTabSearch = () => {
    if (activeTab === "pending") return pendingSearch;
    if (activeTab === "accepted") return acceptedSearch;
    if (activeTab === "rejected") return rejectedSearch;
    return undefined;
  };

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, bizData, reportsData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getBusinesses({
          status: getTabStatus(),
          search: getTabSearch() || undefined,
          category: activeTab === "accepted" && categoryFilter !== "all" ? categoryFilter : undefined,
        }),
        adminApi.getReports(),
      ]);
      setStats(statsData);
      setBusinesses(bizData);
      setReports(reportsData);
      setAccessDenied(false);
    } catch (err: any) {
      console.error("Error loading admin data:", err);
      if (err.message?.includes("403") || err.message?.includes("forbidden") || err.message?.includes("Admin privilege")) {
        setAccessDenied(true);
      } else if (err.message?.includes("401") || err.message?.includes("credentials")) {
        clearToken();
        router.push("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/admin/login");
      return;
    }

    const cachedUser = localStorage.getItem("locallens_user");
    if (cachedUser) {
      try {
        const u = JSON.parse(cachedUser);
        setAdminUser(u);
        if (u.role !== "admin") {
          setAccessDenied(true);
          setLoading(false);
          return;
        } else {
          setAccessDenied(false);
        }
      } catch (e) {}
    }

    loadData();
  }, [activeTab, categoryFilter]);

  // Business Verification Handler
  const handleVerifyBusiness = async (status: "verified" | "rejected") => {
    if (!selectedVerifyBiz) return;
    setSubmittingAction(true);
    try {
      await adminApi.verifyBusiness(selectedVerifyBiz.id, status, verifyNotes);
      setSelectedVerifyBiz(null);
      setVerifyNotes("");
      await loadData();
    } catch (err: any) {
      alert("Failed to update business verification: " + err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Report Resolution Handler
  const handleResolveReport = async (
    status: "pending" | "merchant_resolved" | "merchant_takedown" | "auto_taken_down" | "dismissed",
    takeDownOffer = false,
    restoreOffer = false
  ) => {
    if (!selectedReport) return;
    setSubmittingAction(true);
    try {
      await adminApi.resolveReport(selectedReport.id, status, reportNotes, takeDownOffer, restoreOffer);
      setSelectedReport(null);
      setReportNotes("");
      await loadData();
    } catch (err: any) {
      alert("Failed to resolve report: " + err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    router.push("/admin/login");
  };

  if (accessDenied && adminUser?.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center font-sans">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Access Restricted</h2>
        <p className="text-sm text-slate-400 max-w-md mt-2 mb-6">
          You are currently signed in as <strong className="text-slate-200">{adminUser?.email || "non-admin user"}</strong> ({adminUser?.role || "user"}). The Platform Admin area is strictly restricted to SuperAdmins.
        </p>
        <div className="flex items-center gap-3">
          {adminUser?.role === "merchant" && (
            <button
              onClick={() => router.push("/merchant")}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
            >
              Go to Merchant Portal
            </button>
          )}
          <button
            onClick={() => {
              clearToken();
              router.push("/admin/login");
            }}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700"
          >
            Sign in as Admin
          </button>
        </div>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3 font-sans">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-xs text-slate-500">Loading SuperAdmin Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              LocalLens <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">SuperAdmin</span>
            </h1>
            <p className="text-xs text-slate-400">Business Lifecycle & Customer Protection Management</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <div className="h-4 w-[1px] bg-slate-800" />
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-200">{adminUser?.full_name || "Admin"}</div>
            <div className="text-[11px] text-slate-400">{adminUser?.email || "admin@locallens.com"}</div>
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

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/50 p-4 space-y-1 flex-shrink-0">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
            Navigation
          </div>

          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "overview"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4" />
              Overview
            </div>
          </button>

          <div className="pt-3 pb-1 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Business Management
          </div>

          {/* 1. PENDING APPLICATIONS */}
          <button
            onClick={() => setActiveTab("pending")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "pending"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-400" />
              Pending Review
            </div>
            {stats && stats.pending_verifications > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                {stats.pending_verifications}
              </span>
            )}
          </button>

          {/* 2. ACCEPTED BUSINESSES */}
          <button
            onClick={() => setActiveTab("accepted")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "accepted"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Accepted Businesses
            </div>
            {stats && (
              <span className="text-xs text-slate-400 font-mono">
                {stats.verified_businesses}
              </span>
            )}
          </button>

          {/* 3. REJECTED BUSINESSES */}
          <button
            onClick={() => setActiveTab("rejected")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "rejected"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <XCircle className="w-4 h-4 text-rose-400" />
              Rejected Submissions
            </div>
            {stats && stats.rejected_businesses > 0 && (
              <span className="text-xs text-rose-400 font-mono">
                {stats.rejected_businesses}
              </span>
            )}
          </button>

          <div className="pt-3 pb-1 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Consumer Safety
          </div>

          {/* 4. CUSTOMER REPORTS */}
          <button
            onClick={() => setActiveTab("reports")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "reports"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Customer Reports
            </div>
            {stats && stats.pending_reports > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                {stats.pending_reports}
              </span>
            )}
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-8 max-w-7xl">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">System & Business Registry Status</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Manage merchant registration lifecycles and consumer inaccuracy protections.
                </p>
              </div>

              {/* Stats Cards: Split into Pending, Accepted, Rejected, and Reports */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Card 1: Pending */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">Pending Review</span>
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-amber-400">{stats?.pending_verifications ?? "..."}</span>
                    <span className="text-xs text-slate-400">new requests</span>
                  </div>
                  <button
                    onClick={() => setActiveTab("pending")}
                    className="mt-3 inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                  >
                    Open Review Inbox <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Card 2: Accepted */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/30 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Accepted Businesses</span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-emerald-400">{stats?.verified_businesses ?? "..."}</span>
                    <span className="text-xs text-slate-400">active on web</span>
                  </div>
                  <button
                    onClick={() => setActiveTab("accepted")}
                    className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                  >
                    Browse Accepted Directory <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Card 3: Rejected */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rejected Submissions</span>
                    <XCircle className="w-5 h-5 text-rose-400" />
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-rose-400">{stats?.rejected_businesses ?? "..."}</span>
                    <span className="text-xs text-slate-400">declined</span>
                  </div>
                  <button
                    onClick={() => setActiveTab("rejected")}
                    className="mt-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300 font-medium cursor-pointer"
                  >
                    View Rejection Archive <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Card 4: Reports */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-rose-500/30 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-rose-300">Customer Reports</span>
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-rose-400">{stats?.pending_reports ?? "..."}</span>
                    <span className="text-xs text-slate-400">24h Grace Active</span>
                  </div>
                  <button
                    onClick={() => setActiveTab("reports")}
                    className="mt-3 inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                  >
                    Manage Reports <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Categories & Cities Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
                    Active Categories on the Web
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {stats?.categories_breakdown &&
                      Object.entries(stats.categories_breakdown).map(([category, count]) => (
                        <div
                          key={category}
                          className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-2"
                        >
                          <span className="text-xs font-medium text-slate-200">{category}</span>
                          <span className="px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {count}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
                    City Footprint
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {stats?.cities_breakdown &&
                      Object.entries(stats.cities_breakdown).map(([city, count]) => (
                        <div
                          key={city}
                          className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-2"
                        >
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-medium text-slate-200">{city}</span>
                          <span className="px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-700 text-slate-300">
                            {count}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PENDING REVIEW INBOX (Strictly new requests awaiting decision) */}
          {activeTab === "pending" && (
            <div className="space-y-6 max-w-7xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    Pending Verification Inbox
                    <span className="px-2.5 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      New Applications Only
                    </span>
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Review incoming registrations. Approving moves the store to Accepted Businesses; rejecting moves it to Rejected Submissions.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search pending requests..."
                      value={pendingSearch}
                      onChange={(e) => setPendingSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && loadData()}
                      className="pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-60"
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-800">
                      <tr>
                        <th className="px-6 py-4">New Business</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Owner Info</th>
                        <th className="px-6 py-4">License / Documents</th>
                        <th className="px-6 py-4">Application Status</th>
                        <th className="px-6 py-4 text-right">Review Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {businesses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-14 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div className="font-semibold text-slate-200 text-base">Inbox Clear</div>
                            <p className="text-xs text-slate-500 mt-1">
                              All submitted applications have been reviewed. No pending requests.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        businesses.map((biz) => (
                          <tr key={biz.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-white">{biz.name}</div>
                              <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                {biz.address}, {biz.city}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 border border-slate-700 text-slate-200">
                                {biz.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs">
                              <div className="text-slate-300 font-medium">{biz.owner?.full_name || "Merchant"}</div>
                              <div className="text-slate-500">{biz.owner?.email || biz.email}</div>
                              {biz.phone && <div className="text-slate-500">{biz.phone}</div>}
                            </td>
                            <td className="px-6 py-4 text-xs">
                              <div className="font-mono text-indigo-300">{biz.tax_or_license_number || "Not provided"}</div>
                              {biz.verification_documents && (
                                <a
                                  href={biz.verification_documents}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 mt-1"
                                >
                                  <FileText className="w-3 h-3" /> View Doc
                                </a>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Clock className="w-3.5 h-3.5" /> Pending Decision
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedVerifyBiz(biz);
                                  setVerifyNotes(biz.verification_notes || "");
                                }}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shadow-sm"
                              >
                                Review & Decide
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACCEPTED BUSINESSES (Active & Verified on the web) */}
          {activeTab === "accepted" && (
            <div className="space-y-6 max-w-7xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    Accepted & Verified Businesses
                    <span className="px-2.5 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Live on Web
                    </span>
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Verified businesses authorized to post offers and appear in customer discovery.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search accepted business, city..."
                      value={acceptedSearch}
                      onChange={(e) => setAcceptedSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && loadData()}
                      className="pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-56"
                    />
                  </div>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    <option value="Restaurant">Restaurants & Cafes</option>
                    <option value="Retail">Retail & Fashion</option>
                    <option value="Services">Services & Beauty</option>
                    <option value="Health">Health & Fitness</option>
                  </select>
                </div>
              </div>

              {/* Directory Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {businesses.length === 0 ? (
                  <div className="col-span-full p-12 text-center text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                    No accepted businesses found matching your filters.
                  </div>
                ) : (
                  businesses.map((biz) => (
                    <div
                      key={biz.id}
                      className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between shadow-sm"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-white text-base leading-snug">{biz.name}</h3>
                            <span className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                              {biz.category}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Verified
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2">
                          {biz.description || "No description provided."}
                        </p>

                        <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                            <span className="text-slate-300 font-medium">
                              {biz.owner?.full_name || "Merchant"}
                              <span className="text-slate-500 font-normal ml-1">({biz.owner?.email || biz.email})</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                            <span className="truncate">{biz.address}, {biz.city}</span>
                          </div>
                          {biz.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                              <span>{biz.phone}</span>
                            </div>
                          )}
                          {biz.website && (
                            <div className="flex items-center gap-2">
                              <Globe className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                              <a
                                href={biz.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 truncate"
                              >
                                {biz.website.replace("https://", "")}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-mono">
                          ID #{biz.id} • {biz.tax_or_license_number || "Unlicensed"}
                        </span>
                        <button
                          onClick={() => setSelectedDetailBiz(biz)}
                          className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                        >
                          View Details →
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: REJECTED BUSINESSES (Declined Submissions Archive) */}
          {activeTab === "rejected" && (
            <div className="space-y-6 max-w-7xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    Rejected Business Applications
                    <span className="px-2.5 py-0.5 text-xs rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Declined
                    </span>
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Archive of rejected applications and the recorded rejection feedback. Admins can re-evaluate if updated permits are submitted.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search rejected submissions..."
                      value={rejectedSearch}
                      onChange={(e) => setRejectedSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && loadData()}
                      className="pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-60"
                    />
                  </div>
                </div>
              </div>

              {/* Rejected List */}
              <div className="grid grid-cols-1 gap-5">
                {businesses.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                    No rejected applications recorded.
                  </div>
                ) : (
                  businesses.map((biz) => (
                    <div
                      key={biz.id}
                      className="p-6 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6"
                    >
                      <div className="space-y-3 max-w-3xl flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Rejected Application
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            License: {biz.tax_or_license_number || "None"}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-white">{biz.name}</h3>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5" /> {biz.address}, {biz.city} • Category: {biz.category}
                          </div>
                        </div>

                        {/* Rejection Feedback Note */}
                        <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 text-xs text-rose-200">
                          <strong className="text-rose-300 block mb-1">Reason for Rejection:</strong>
                          "{biz.verification_notes || "Documentation did not meet verification standards."}"
                        </div>

                        <div className="text-xs text-slate-400 flex flex-wrap items-center gap-4">
                          <span>Owner: <strong className="text-slate-200">{biz.owner?.full_name || "Merchant"}</strong> <span className="text-slate-500">({biz.owner?.email || biz.email})</span></span>
                          {biz.phone && <span>Phone: <strong className="text-slate-300">{biz.phone}</strong></span>}
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <button
                          onClick={() => {
                            setSelectedVerifyBiz(biz);
                            setVerifyNotes(biz.verification_notes || "");
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer border border-slate-700 flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Re-evaluate Application
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: CUSTOMER REPORTS (Unresolved vs Resolved Sections) */}
          {activeTab === "reports" && (() => {
            const unresolvedReports = reports.filter(
              (r) => r.status === "pending" || r.status === "auto_taken_down"
            );
            const resolvedReports = reports.filter(
              (r) => r.status === "merchant_resolved" || r.status === "merchant_takedown" || r.status === "dismissed"
            );

            return (
              <div className="space-y-6 max-w-7xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                      Customer Inaccuracy Reports
                      <span className="px-2.5 py-0.5 text-xs rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        24h Grace Protection
                      </span>
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                      Reports give merchants 24 hours to clarify, update, or take down an offer. If ignored, the offer is automatically taken down.
                    </p>
                  </div>

                  {/* Section Switcher: Unresolved vs Resolved */}
                  <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
                    <button
                      onClick={() => setReportSection("unresolved")}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        reportSection === "unresolved"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span>Unresolved Reports</span>
                      {unresolvedReports.length > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          reportSection === "unresolved" ? "bg-white/20 text-white" : "bg-rose-500/20 text-rose-300"
                        }`}>
                          {unresolvedReports.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setReportSection("resolved")}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        reportSection === "resolved"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span>Resolved History</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        reportSection === "resolved" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                      }`}>
                        {resolvedReports.length}
                      </span>
                    </button>
                  </div>
                </div>

                {/* SECTION 1: UNRESOLVED REPORTS */}
                {reportSection === "unresolved" && (
                  <div className="grid grid-cols-1 gap-5">
                    {unresolvedReports.length === 0 ? (
                      <div className="p-14 text-center bg-slate-900 rounded-2xl border border-slate-800">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="font-semibold text-slate-200 text-base">No Active Unresolved Reports</div>
                        <p className="text-xs text-slate-500 mt-1">
                          All customer complaints have been resolved or dismissed. Check the Resolved History tab to review past cases.
                        </p>
                      </div>
                    ) : (
                      unresolvedReports.map((report) => {
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
                                  Reason: {report.reason.replace("_", " ")}
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

                                {report.merchant_notified && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                    Merchant Notified
                                  </span>
                                )}
                              </div>

                              {/* Store & Offer */}
                              <div className="text-white font-medium text-base flex flex-wrap items-center gap-2">
                                <span>Reported Offer:</span>
                                <span className="text-indigo-400 font-semibold">{report.offer?.title || `Offer #${report.offer_id}`}</span>
                                <span className="text-slate-500 text-sm">at</span>
                                <span className="text-slate-200 font-semibold">{report.business?.name || "Store"}</span>
                                <span className="text-xs text-slate-400">({report.business?.city})</span>
                              </div>

                              {/* Customer Statement */}
                              <div className="text-sm text-slate-200 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                                <div className="text-xs text-slate-400 font-medium mb-1">Customer Statement:</div>
                                "{report.description || "No comment provided."}"
                              </div>

                              {/* Merchant Note if present */}
                              {report.merchant_response && (
                                <div className="text-xs text-indigo-300 bg-indigo-950/30 p-3 rounded-xl border border-indigo-900/50">
                                  <strong className="text-indigo-200 block mb-0.5">Merchant's Feedback to Customer:</strong>
                                  "{report.merchant_response}"
                                </div>
                              )}

                              {/* Contact */}
                              <div className="text-xs text-slate-400 flex flex-wrap items-center gap-4 pt-1">
                                <span>Reporter: <strong className="text-slate-300">{report.reporter_email || "Anonymous"}</strong></span>
                                <span>Reported on: <strong className="text-slate-300">{new Date(report.created_at).toLocaleString()}</strong></span>
                                {report.business?.phone && (
                                  <a
                                    href={`tel:${report.business.phone}`}
                                    className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-medium"
                                  >
                                    <Phone className="w-3 h-3" /> Call Merchant ({report.business.phone})
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Takedown / Decision Controls (ONLY in Unresolved Section!) */}
                            <div className="flex-shrink-0 flex flex-col gap-2">
                              <button
                                onClick={() => {
                                  setSelectedReport(report);
                                  setReportNotes(report.admin_notes || "");
                                }}
                                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
                              >
                                Takedown / Decision Controls
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* SECTION 2: RESOLVED REPORTS (ARCHIVED HISTORY - NO TAKEDOWN BUTTONS) */}
                {reportSection === "resolved" && (
                  <div className="grid grid-cols-1 gap-5">
                    {resolvedReports.length === 0 ? (
                      <div className="p-14 text-center bg-slate-900 rounded-2xl border border-slate-800">
                        <div className="font-semibold text-slate-200 text-base">No Resolved Reports Yet</div>
                        <p className="text-xs text-slate-500 mt-1">
                          Settled or dismissed customer reports will appear here as permanent audit records.
                        </p>
                      </div>
                    ) : (
                      resolvedReports.map((report) => (
                        <div
                          key={report.id}
                          className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-3">
                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-2.5">
                              {report.status === "merchant_resolved" && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolved by Merchant
                                </span>
                              )}
                              {report.status === "merchant_takedown" && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                  <Ban className="w-3.5 h-3.5" /> Merchant Took Down Offer
                                </span>
                              )}
                              {report.status === "dismissed" && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                  Dismissed as False Alarm
                                </span>
                              )}

                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-400">
                                Reason: {report.reason.replace("_", " ")}
                              </span>

                              {report.resolved_at && (
                                <span className="text-xs text-slate-500">
                                  Resolved on {new Date(report.resolved_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            {/* Store & Offer */}
                            <div className="text-white font-medium text-base">
                              Offer: <span className="text-indigo-400 font-semibold">{report.offer?.title || `Offer #${report.offer_id}`}</span>
                              <span className="text-slate-500 text-sm mx-2">at</span>
                              <span className="text-slate-300 font-semibold">{report.business?.name || "Store"}</span>
                            </div>

                            {/* Customer Statement */}
                            <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                              <span className="text-slate-500 block mb-0.5 font-medium">Customer Statement:</span>
                              "{report.description || "No comment provided."}"
                            </div>

                            {/* Merchant Resolution Feedback */}
                            {report.merchant_response && (
                              <div className="text-xs text-emerald-300 bg-emerald-950/20 p-3 rounded-xl border border-emerald-900/40">
                                <span className="text-emerald-400 block mb-0.5 font-semibold">Merchant's Resolution:</span>
                                "{report.merchant_response}"
                              </div>
                            )}

                            {/* Admin Resolution Note */}
                            {report.admin_notes && (
                              <div className="text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                                <span className="text-slate-500 font-medium mr-1.5">Admin Note:</span>
                                {report.admin_notes}
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                            <span>Reporter: {report.reporter_email || "Anonymous"}</span>
                            <span>Report #{report.id} • Settled</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </main>
      </div>

      {/* MODAL 1: BUSINESS VERIFICATION REVIEW & DECIDE */}
      {selectedVerifyBiz && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Review Business Application</h3>
                <p className="text-xs text-slate-400 mt-0.5">Authorize or reject merchant registration</p>
              </div>
              <button
                onClick={() => setSelectedVerifyBiz(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Business Name:</span>
                <span className="font-semibold text-white">{selectedVerifyBiz.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category:</span>
                <span>{selectedVerifyBiz.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Address:</span>
                <span>{selectedVerifyBiz.address}, {selectedVerifyBiz.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Owner Contact:</span>
                <span>{selectedVerifyBiz.owner?.email || selectedVerifyBiz.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tax / License #:</span>
                <span className="font-mono text-indigo-400">{selectedVerifyBiz.tax_or_license_number || "Not provided"}</span>
              </div>
              {selectedVerifyBiz.verification_documents && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Submitted Document:</span>
                  <a
                    href={selectedVerifyBiz.verification_documents}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 underline flex items-center gap-1"
                  >
                    View Document <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Verification Feedback / Notes (Sent to Merchant)
              </label>
              <textarea
                rows={3}
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder="e.g. GST and trade license verified against municipal registry."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedVerifyBiz(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={() => handleVerifyBusiness("rejected")}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30 transition-colors cursor-pointer"
              >
                Reject Registration
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={() => handleVerifyBusiness("verified")}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                Approve & Accept Business
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BUSINESS DETAILS DIRECTORY MODAL */}
      {selectedDetailBiz && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedDetailBiz.name}</h3>
                <p className="text-xs text-indigo-400 font-medium">{selectedDetailBiz.category}</p>
              </div>
              <button
                onClick={() => setSelectedDetailBiz(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p className="text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                {selectedDetailBiz.description || "No description provided."}
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-500 block">Business Owner:</span>
                  <span className="font-medium text-slate-200">{selectedDetailBiz.owner?.full_name || "Merchant"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Owner Email:</span>
                  <span className="font-medium text-slate-200">{selectedDetailBiz.owner?.email || selectedDetailBiz.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Address:</span>
                  <span className="font-medium text-slate-200">{selectedDetailBiz.address}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">City:</span>
                  <span className="font-medium text-slate-200">{selectedDetailBiz.city}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Phone:</span>
                  <span className="font-medium text-slate-200">{selectedDetailBiz.phone || "None"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Store Email:</span>
                  <span className="font-medium text-slate-200">{selectedDetailBiz.email || "Same as owner"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">License / Tax ID:</span>
                  <span className="font-mono text-indigo-400">{selectedDetailBiz.tax_or_license_number || "None"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Verification Status:</span>
                  <span className="capitalize font-semibold text-emerald-400">{selectedDetailBiz.status}</span>
                </div>
              </div>

              {selectedDetailBiz.verification_notes && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 mt-2">
                  <span className="text-slate-400 block font-medium mb-0.5">Admin Verification Note:</span>
                  <span className="text-slate-300">{selectedDetailBiz.verification_notes}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedDetailBiz(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RESOLVE REPORT & 24H TAKEDOWN CONTROL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Report & Takedown Decision Controls</h3>
                <p className="text-xs text-slate-400 mt-0.5">Balance merchant rights & customer protection</p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-500 mb-1">Customer Complaint:</div>
                <div className="text-slate-200">"{selectedReport.description}"</div>
              </div>

              {selectedReport.merchant_response && (
                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-900/60">
                  <div className="text-indigo-400 mb-1 font-medium">Merchant's Feedback to Customer:</div>
                  <div className="text-slate-200">"{selectedReport.merchant_response}"</div>
                </div>
              )}

              {selectedReport.business?.phone && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Direct Merchant Contact:</span>
                  <a
                    href={`tel:${selectedReport.business.phone}`}
                    className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5" /> {selectedReport.business.phone}
                  </a>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Admin Resolution Notes
              </label>
              <textarea
                rows={3}
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                placeholder="e.g. Complaint confirmed with customer; or store verified terms updated."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={() => handleResolveReport("dismissed", false, false)}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Dismiss False Alarm
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={() => handleResolveReport("merchant_resolved", false, true)}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors cursor-pointer"
              >
                Mark Resolved & Restore Offer
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={() => handleResolveReport("auto_taken_down", true, false)}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-lg shadow-rose-600/20"
              >
                Immediate Takedown (Pause Offer)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
