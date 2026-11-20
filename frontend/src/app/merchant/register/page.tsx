"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { authApi, merchantApi } from "@/lib/api";
import { Store, AlertCircle, ArrowRight, Lock, Mail, User, Building2, MapPin, RefreshCw } from "lucide-react";

const StoreLocationMapPicker = dynamic(
  () => import("@/components/StoreLocationMapPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[260px] rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 text-xs gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
        Loading Storefront Location Map...
      </div>
    ),
  }
);

export default function MerchantRegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Initial shop details
  const [shopName, setShopName] = useState("");
  const [category, setCategory] = useState("Restaurant");
  const [city, setCity] = useState("Springfield");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [licenseNumber, setLicenseNumber] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Register User Account
      await authApi.register(email, password, fullName, "merchant");

      // 2. Register Initial Shop Profile
      if (shopName) {
        await merchantApi.registerBusiness({
          name: shopName,
          category,
          city,
          address: address || `${city} Center`,
          latitude: lat !== null ? lat : undefined,
          longitude: lng !== null ? lng : undefined,
          tax_or_license_number: licenseNumber || undefined,
        });
      }

      router.push("/merchant");
    } catch (err: any) {
      setError(err.message || "Failed to register merchant account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mb-4">
          <Store className="w-9 h-9" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Register Your Business
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Join LocalLens to reach nearby shoppers with verified real-time deals
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Owner Full Name
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                    placeholder="e.g. John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                    placeholder="john@store.com"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-3">
                Initial Shop Details
              </span>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Business / Store Name
                  </label>
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                    placeholder="e.g. Blue Ridge Artisan Bakery"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Business Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs cursor-pointer"
                    >
                      <option value="Restaurant">Restaurant & Cafe</option>
                      <option value="Retail">Retail & Fashion</option>
                      <option value="Services">Services & Beauty</option>
                      <option value="Health">Health & Fitness</option>
                      <option value="Electronics">Electronics & Hardware</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                      placeholder="e.g. Springfield"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Store Address
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                    placeholder="e.g. 100 Main Street, Suite 2"
                  />
                </div>

                {/* Map Location Picker */}
                <StoreLocationMapPicker
                  lat={lat}
                  lng={lng}
                  address={address}
                  city={city}
                  onLocationChange={(coords) => {
                    setLat(coords.lat);
                    setLng(coords.lng);
                    if (coords.address) {
                      setAddress(coords.address);
                    }
                    if (coords.city) {
                      setCity(coords.city);
                    }
                  }}
                  label="Locate Shop on Map (GPS Pin for Customers)"
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tax ID / Trade License Number (Optional for fast signup)
                  </label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-mono"
                    placeholder="e.g. GST-12345 or TRADE-LICENSE-990"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Registering Shop..." : "Create Merchant Account"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already have a merchant account?{" "}
            <Link href="/merchant/login" className="text-indigo-400 hover:text-indigo-300 font-semibold">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
