const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: "admin" | "merchant" | "customer";
  is_active: boolean;
  created_at: string;
}

export interface AdminStats {
  total_registered_businesses: number;
  pending_verifications: number;
  verified_businesses: number;
  rejected_businesses: number;
  pending_reports: number;
  auto_takedowns_count: number;
  total_reports: number;
  categories_breakdown: Record<string, number>;
  cities_breakdown: Record<string, number>;
}

export interface Business {
  id: number;
  owner_id: number;
  name: string;
  category: string;
  description: string | null;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  status: "pending" | "verified" | "rejected";
  tax_or_license_number: string | null;
  verification_documents: string | null;
  verification_notes: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  owner?: { id: number; email: string; full_name: string | null };
  offers_count?: number;
}

export interface Offer {
  id: number;
  business_id: number;
  title: string;
  description: string;
  discount_type: "percentage" | "flat" | "bogo" | "custom";
  discount_value: string;
  terms_and_conditions: string | null;
  start_date: string;
  end_date: string;
  is_paused: boolean;
  status: "active" | "paused" | "expired" | "flagged";
  created_at: string;
  updated_at: string;
  business?: { id: number; name: string; category: string; city: string };
  reports_count?: number;
}

export interface Report {
  id: number;
  offer_id: number;
  business_id: number | null;
  reporter_email: string | null;
  reason: "expired" | "fake_discount" | "shop_closed" | "refused_offer" | "inaccurate_info" | "other";
  description: string | null;
  grace_period_hours: number;
  deadline?: string;
  is_grace_period_expired?: boolean;
  auto_taken_down: boolean;
  merchant_notified: boolean;
  merchant_response: string | null;
  status: "pending" | "merchant_resolved" | "merchant_takedown" | "auto_taken_down" | "dismissed";
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  offer?: {
    id: number;
    title: string;
    discount_value: string;
    status: string;
    business_id: number;
    is_paused: boolean;
  };
  business?: {
    id: number;
    name: string;
    category: string;
    city: string;
    phone?: string;
    email?: string;
  };
}

// Token helper
export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("locallens_token");
};

export const setToken = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("locallens_token", token);
  }
};

export const clearToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("locallens_token");
    localStorage.removeItem("locallens_user");
  }
};

// Request helper
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `API Error ${res.status}: ${res.statusText}`;
    try {
      const errorData = await res.json();
      if (errorData.detail) {
        errorMsg = typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail);
      }
    } catch {
      // Ignore json parse error
    }
    throw new Error(errorMsg);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

// Admin API endpoints
export const adminApi = {
  getStats: () => apiRequest<AdminStats>("/admin/stats"),
  
  getBusinesses: (params?: { status?: string; category?: string; city?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status && params.status !== "all") q.append("status", params.status);
    if (params?.category) q.append("category", params.category);
    if (params?.city) q.append("city", params.city);
    if (params?.search) q.append("search", params.search);
    const queryString = q.toString() ? `?${q.toString()}` : "";
    return apiRequest<Business[]>(`/admin/businesses${queryString}`);
  },

  getBusiness: (id: number) => apiRequest<Business>(`/admin/businesses/${id}`),

  verifyBusiness: (id: number, status: "verified" | "rejected", verification_notes?: string) =>
    apiRequest<Business>(`/admin/businesses/${id}/verify`, {
      method: "POST",
      body: JSON.stringify({ status, verification_notes }),
    }),

  getReports: (status?: string) => {
    const q = new URLSearchParams();
    if (status && status !== "all") q.append("status", status);
    const queryString = q.toString() ? `?${q.toString()}` : "";
    return apiRequest<Report[]>(`/admin/reports${queryString}`);
  },

  resolveReport: (
    id: number,
    status: "pending" | "merchant_resolved" | "merchant_takedown" | "auto_taken_down" | "dismissed",
    admin_notes?: string,
    take_down_offer?: boolean,
    restore_offer?: boolean
  ) =>
    apiRequest<Report>(`/admin/reports/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ status, admin_notes, take_down_offer, restore_offer }),
    }),
};

// Merchant API
export const merchantApi = {
  getMyBusinesses: () => apiRequest<Business[]>("/merchant/businesses"),

  registerBusiness: (data: Partial<Business>) =>
    apiRequest<Business>("/merchant/businesses", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateBusiness: (id: number, data: Partial<Business>) =>
    apiRequest<Business>(`/merchant/businesses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getBusinessOffers: (businessId: number) =>
    apiRequest<Offer[]>(`/merchant/businesses/${businessId}/offers`),

  createOffer: (businessId: number, data: any) =>
    apiRequest<Offer>(`/merchant/businesses/${businessId}/offers`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateOffer: (offerId: number, data: any) =>
    apiRequest<Offer>(`/merchant/offers/${offerId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  togglePauseOffer: (offerId: number) =>
    apiRequest<Offer>(`/merchant/offers/${offerId}/toggle-pause`, {
      method: "POST",
    }),

  deleteOffer: (offerId: number) =>
    apiRequest<void>(`/merchant/offers/${offerId}`, {
      method: "DELETE",
    }),

  getBusinessReports: (businessId: number) =>
    apiRequest<Report[]>(`/merchant/businesses/${businessId}/reports`),

  respondToReport: (reportId: number, merchant_response: string, take_down_offer = false) =>
    apiRequest<Report>(`/merchant/reports/${reportId}/respond`, {
      method: "POST",
      body: JSON.stringify({ merchant_response, take_down_offer }),
    }),
};

// Auth API
export const authApi = {
  register: async (email: string, password: string, full_name?: string, role: string = "merchant") => {
    const res = await apiRequest<{
      access_token: string;
      role: string;
      email: string;
      full_name: string | null;
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name, role }),
    });
    setToken(res.access_token);
    if (typeof window !== "undefined") {
      localStorage.setItem("locallens_user", JSON.stringify(res));
    }
    return res;
  },

  login: async (email: string, password: string) => {
    const res = await apiRequest<{
      access_token: string;
      role: string;
      email: string;
      full_name: string | null;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(res.access_token);
    if (typeof window !== "undefined") {
      localStorage.setItem("locallens_user", JSON.stringify(res));
    }
    return res;
  },

  getMe: () => apiRequest<User>("/auth/me"),
};

export interface DiscoveryOffer {
  id: number;
  business_id: number;
  title: string;
  description: string;
  discount_type: "percentage" | "flat" | "bogo" | "custom";
  discount_value: string;
  terms_and_conditions: string | null;
  start_date: string;
  end_date: string;
  is_paused: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  business: {
    id: number;
    name: string;
    category: string;
    description: string | null;
    address: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    status: string;
    active_offers_count?: number;
  };
  distance_km: number | null;
}

export interface PaginatedOffers {
  items: DiscoveryOffer[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  corrected_query?: string | null;
}

// Customer Discovery API
export const discoveryApi = {
  getOffers: (params?: {
    category?: string;
    city?: string;
    search?: string;
    lat?: number;
    lng?: number;
    radius_km?: number;
    sort_by?: "distance" | "expiring_soon" | "newest";
    page?: number;
    page_size?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.category && params.category !== "all") q.append("category", params.category);
    if (params?.city && params.city !== "all") q.append("city", params.city);
    if (params?.search) q.append("search", params.search);
    if (params?.lat !== undefined && params?.lat !== null) q.append("lat", String(params.lat));
    if (params?.lng !== undefined && params?.lng !== null) q.append("lng", String(params.lng));
    if (params?.radius_km) q.append("radius_km", String(params.radius_km));
    if (params?.sort_by) q.append("sort_by", params.sort_by);
    if (params?.page) q.append("page", String(params.page));
    if (params?.page_size) q.append("page_size", String(params.page_size));
    const queryString = q.toString() ? `?${q.toString()}` : "";
    return apiRequest<PaginatedOffers>(`/discovery/offers${queryString}`);
  },

  getOffer: (offerId: number, coords?: { lat?: number; lng?: number }) => {
    const q = new URLSearchParams();
    if (coords?.lat) q.append("lat", String(coords.lat));
    if (coords?.lng) q.append("lng", String(coords.lng));
    const queryString = q.toString() ? `?${q.toString()}` : "";
    return apiRequest<DiscoveryOffer>(`/discovery/offers/${offerId}${queryString}`);
  },

  getBusinesses: (params?: { category?: string; city?: string }) => {
    const q = new URLSearchParams();
    if (params?.category && params.category !== "all") q.append("category", params.category);
    if (params?.city && params.city !== "all") q.append("city", params.city);
    const queryString = q.toString() ? `?${q.toString()}` : "";
    return apiRequest<DiscoveryOffer["business"][]>(`/discovery/businesses${queryString}`);
  },

  reportOffer: (data: {
    offer_id: number;
    reporter_email?: string;
    reason: string;
    description?: string;
  }) =>
    apiRequest<Report>("/discovery/reports", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
