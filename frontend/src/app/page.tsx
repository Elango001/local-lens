import Link from "next/link";
import { ShieldCheck, Store, Compass, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
            LL
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">LocalLens</h1>
            <p className="text-xs text-slate-400">Hyperlocal Deals & Business Discovery</p>
          </div>
        </div>

        <nav className="flex items-center gap-2.5">
          <Link
            href="/explore"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/20"
          >
            <Compass className="w-3.5 h-3.5" />
            Explore Deals
          </Link>
          <Link
            href="/merchant"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
          >
            <Store className="w-3.5 h-3.5 text-indigo-400" />
            Merchant Portal
          </Link>
          <Link
            href="/login"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
          >
            Sign Up
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 py-16 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Full Hyperlocal Platform Live
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white">
            Real-time shop offers, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-indigo-400 to-cyan-400">
              verified and hyper-local.
            </span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
            Discover ongoing discounts updated directly by local business owners, verified by administrators to eliminate expired and fake promotions.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-xl shadow-indigo-600/30"
            >
              <Compass className="w-4 h-4" />
              Browse Nearby Deals & Map
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/merchant/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              <Store className="w-4 h-4 text-indigo-400" />
              Register Store & Post Offers
            </Link>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Customer Discovery */}
          <div className="p-8 rounded-2xl bg-slate-900/90 border border-emerald-500/40 relative group hover:border-emerald-500 transition-all shadow-xl shadow-emerald-950/20">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-6">
              <Compass className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-bold text-white">Customer Discovery</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Live & Active
              </span>
            </div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Explore nearby active offers by map & radius, filter by dining, electronics, salon, and fashion, and report inaccurate promotions.
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 group-hover:text-emerald-300 transition-colors"
            >
              Explore Local Deals <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Card 2: Merchant */}
          <div className="p-8 rounded-2xl bg-slate-900/90 border border-indigo-500/40 relative group hover:border-indigo-500 transition-all shadow-xl shadow-indigo-950/20">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mb-6">
              <Store className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-bold text-white">Merchant Dashboard</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Live & Active
              </span>
            </div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Shop profile manager, 1-minute offer creation studio, instant pause/resume toggles, and 24-hour customer report resolution.
            </p>
            <Link
              href="/merchant"
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors"
            >
              Open Merchant Portal <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Card 3: Admin */}
          <div className="p-8 rounded-2xl bg-slate-900/90 border border-indigo-500/40 relative group hover:border-indigo-500 transition-all shadow-xl shadow-indigo-950/20">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-bold text-white">Platform Admin</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                SuperAdmin
              </span>
            </div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Explore registered businesses on the web, verify licenses & trade permits, and handle customer inaccuracy reports with automatic offer takedown.
            </p>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors"
            >
              Open Admin Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 px-8 py-6 text-center text-xs text-slate-600">
        LocalLens Platform • Built with FastAPI + Next.js
      </footer>
    </div>
  );
}
