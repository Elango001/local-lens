"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { Store, AlertCircle, ArrowRight, Lock, Mail, CheckCircle2 } from "lucide-react";

export default function MerchantLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner.raj@techhaven.com");
  const [password, setPassword] = useState("merchant123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await authApi.login(email, password);
      if (res.role !== "merchant" && res.role !== "admin") {
        setError("Access restricted. Please sign in with a Merchant business account.");
        setLoading(false);
        return;
      }
      window.location.href = "/merchant";
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("merchant123");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mb-4">
          <Store className="w-9 h-9" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Merchant Business Portal
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Publish real-time store offers and manage your shop profile
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Merchant Email
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="owner@yourshop.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Authenticating..." : "Sign in to Merchant Portal"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="text-xs text-slate-400 mb-3 text-center">
              Quick 1-Click Demo Accounts:
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleDemoLogin("owner.raj@techhaven.com")}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-left text-xs transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-slate-200">Rajesh Kumar (TechHaven)</div>
                  <div className="text-slate-500 text-[11px]">Verified Store • Active Offers & Reports</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  Verified
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin("owner.sarah@harvestkitchen.com")}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-left text-xs transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-slate-200">Sarah Jenkins (Harvest Bakery)</div>
                  <div className="text-slate-500 text-[11px]">Bakery & Cafe • Under Review</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                  Pending
                </span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-400">
            Don't have a business account?{" "}
            <Link href="/merchant/register" className="text-indigo-400 hover:text-indigo-300 font-semibold">
              Register your shop
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
