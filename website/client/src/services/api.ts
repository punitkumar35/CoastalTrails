import { Homestay, Booking, TransitRoute, DatabaseTableInfo, User, Review, ReviewSummary } from '../types';

const API_BASE = '/api';

function getAuthToken(): string | null {
  try {
    return JSON.parse(localStorage.getItem('gokarna_traveler_user') || 'null')?.token || null;
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleAuthError(res: Response, errData?: any) {
  if (res.status === 401) {
    try {
      localStorage.removeItem('gokarna_traveler_user');
    } catch {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('auth:expired', {
          detail: { message: errData?.error || 'Your session has expired. Please sign in again.' },
        })
      );
    }
  }
}

async function authRequest(path: string, body: Record<string, unknown>, retry = 1): Promise<User> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    if (retry > 0) {
      await new Promise((r) => setTimeout(r, 1000));
      return authRequest(path, body, retry - 1);
    }
    throw new Error('Unable to reach the server. Check your connection and try again.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if ((res.status === 502 || res.status === 503 || res.status === 504) && retry > 0) {
      await new Promise((r) => setTimeout(r, 1200));
      return authRequest(path, body, retry - 1);
    }
    throw new Error(data?.error || 'Something went wrong. Please try again.');
  }
  return {
    id: String(data.id),
    name: data.name,
    phone: data.phone || '',
    email: data.email || undefined,
    avatar: data.avatar_url || data.avatar || undefined,
    token: data.token,
  };
}

export const api = {
  // Homestays
  async getHomestays(params?: { location?: string; search?: string; checkIn?: string; checkOut?: string }): Promise<Homestay[]> {
    const q = new URLSearchParams();
    if (params?.location && params.location !== 'all') q.set('location', params.location);
    if (params?.search) q.set('search', params.search);
    if (params?.checkIn) q.set('checkIn', params.checkIn);
    if (params?.checkOut) q.set('checkOut', params.checkOut);

    const res = await fetch(`${API_BASE}/homestays?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch homestays');
    return res.json();
  },

  async getHomestay(id: string, checkIn?: string, checkOut?: string): Promise<Homestay> {
    const q = new URLSearchParams();
    if (checkIn) q.set('checkIn', checkIn);
    if (checkOut) q.set('checkOut', checkOut);

    const res = await fetch(`${API_BASE}/homestays/${id}?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch homestay details');
    return res.json();
  },

  async getAvailability(from: string, to: string): Promise<Record<string, number>> {
    const q = new URLSearchParams({ from, to });
    const res = await fetch(`${API_BASE}/homestays/availability?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch availability');
    const data = await res.json();
    return data.dates || {};
  },

  async getHomestayAvailability(
    id: string,
    from: string,
    to: string,
  ): Promise<{ listed: boolean; dates: Record<string, number>; blocked: Record<string, number> }> {
    const q = new URLSearchParams({ from, to });
    const res = await fetch(`${API_BASE}/homestays/${id}/availability?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch stay availability');
    const data = await res.json();
    return { listed: data.listed !== false, dates: data.dates || {}, blocked: data.blocked || {} };
  },

  async createHomestay(data: Partial<Homestay>): Promise<Homestay> {
    const res = await fetch(`${API_BASE}/homestays`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create homestay');
    }
    return res.json();
  },

  async deleteHomestay(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/homestays/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete homestay');
  },

  // Bookings — the server authorises by session token and derives the guest
  // identity from the logged-in user.
  async getBookings(): Promise<Booking[]> {
    const res = await fetch(`${API_BASE}/bookings`, { headers: { ...authHeaders() } });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      handleAuthError(res, err);
      throw new Error(err?.error || 'Failed to fetch bookings');
    }
    return res.json();
  },

  async createBooking(booking: {
    homestay_id: string;
    check_in: string;
    check_out: string;
    guests_count: number;
    user_name?: string;
    user_phone?: string;
  }): Promise<Booking> {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(booking),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      handleAuthError(res, err);
      throw new Error(err?.error || 'Failed to create booking');
    }
    return res.json();
  },

  async updateBookingStatus(id: string, status: string): Promise<Booking> {
    const res = await fetch(`${API_BASE}/bookings/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      handleAuthError(res, err);
      throw new Error(err?.error || 'Failed to update booking status');
    }
    return res.json();
  },

  async cancelBooking(id: string): Promise<Booking> {
    const res = await fetch(`${API_BASE}/bookings/${id}/cancel`, {
      method: 'POST',
      headers: { ...authHeaders() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      handleAuthError(res, err);
      throw new Error(err?.error || 'Failed to cancel the booking');
    }
    return res.json();
  },

  // Payments (Razorpay: initiate creates an order, confirm verifies signature)
  async initiatePayment(
    bookingId: string,
    method: string,
  ): Promise<{
    id: string;
    amount: number;
    status: string;
    order_id: string;
    key_id: string;
    amount_paise: number;
    booking_reference: string;
    customer: { name: string; phone: string };
  }> {
    const res = await fetch(`${API_BASE}/payments/${bookingId}/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ method }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      handleAuthError(res, err);
      throw new Error(err?.error || 'Could not start the payment');
    }
    return res.json();
  },

  async confirmPayment(
    bookingId: string,
    payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
  ): Promise<{ booking: Booking }> {
    const res = await fetch(`${API_BASE}/payments/${bookingId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      handleAuthError(res, err);
      throw new Error(err?.error || 'Could not verify the payment');
    }
    return res.json();
  },

  async failPayment(bookingId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/payments/${bookingId}/fail`, {
      method: 'POST',
      headers: { ...authHeaders() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      handleAuthError(res, err);
      throw new Error(err?.error || 'Could not update the payment');
    }
  },

  async syncPayment(bookingId: string): Promise<{
    booking: Booking;
    synced: 'paid' | 'failed' | 'pending';
    already_paid?: boolean;
  }> {
    const res = await fetch(`${API_BASE}/payments/${bookingId}/sync`, {
      method: 'POST',
      headers: { ...authHeaders() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      handleAuthError(res, err);
      throw new Error(err?.error || 'Could not sync the payment');
    }
    return res.json();
  },

  // Routes
  async getRoutes(): Promise<TransitRoute[]> {
    const res = await fetch(`${API_BASE}/routes`);
    if (!res.ok) throw new Error('Failed to fetch routes');
    return res.json();
  },

  // Auth
  async getMe(): Promise<User | null> {
    const token = getAuthToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { ...authHeaders() },
      });
      if (!res.ok) {
        if (res.status === 401) {
          try {
            localStorage.removeItem('gokarna_traveler_user');
          } catch {}
        }
        return null;
      }
      const data = await res.json();
      return data;
    } catch {
      return null;
    }
  },

  async register(data: { name: string; phone: string; email: string; password: string }): Promise<User> {
    return authRequest('/auth/register', data);
  },

  async login(identifier: string, password: string): Promise<User> {
    return authRequest('/auth/login', { identifier, password });
  },

  async googleAuth(credential: string): Promise<User> {
    return authRequest('/auth/google', { credential });
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: { ...authHeaders() } });
    } catch {
      /* signing out locally is enough */
    } finally {
      try {
        localStorage.removeItem('gokarna_traveler_user');
      } catch {}
    }
  },

  // Reviews
  async getReviews(
    homestayId: string,
    limit = 6,
    offset = 0,
  ): Promise<{ reviews: Review[]; total: number; summary: ReviewSummary | null }> {
    const q = new URLSearchParams({ homestay_id: homestayId, limit: String(limit), offset: String(offset) });
    const res = await fetch(`${API_BASE}/reviews?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  },

  async markReviewHelpful(id: number): Promise<{ id: number; helpful_count: number }> {
    const res = await fetch(`${API_BASE}/reviews/${id}/helpful`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to mark review helpful');
    return res.json();
  },

  async addReview(data: {
    homestay_id: string;
    rating: number;
    title: string;
    body: string;
    stay_details?: string;
    media?: { dataUrl: string; type: 'image' }[];
  }): Promise<Review> {
    const res = await fetch(`${API_BASE}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || 'Failed to post your review');
    }
    return res.json();
  },

  async updateReview(
    id: number,
    data: { rating: number; title: string; body: string },
  ): Promise<Review> {
    const res = await fetch(`${API_BASE}/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || 'Failed to update your review');
    }
    return res.json();
  },

  async deleteReview(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/reviews/${id}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || 'Failed to delete your review');
    }
  },

  // Database Studio
  async getDbStats(): Promise<{ homestays: number; bookings: number; users: number; blockedDates: number }> {
    const res = await fetch(`${API_BASE}/db/stats`);
    if (!res.ok) throw new Error('Failed to fetch db stats');
    return res.json();
  },

  async getDbTables(): Promise<DatabaseTableInfo[]> {
    const res = await fetch(`${API_BASE}/db/tables`);
    if (!res.ok) throw new Error('Failed to fetch db tables');
    return res.json();
  },

  async getTableRows(name: string): Promise<{ table: string; columns: any[]; rows: any[] }> {
    const res = await fetch(`${API_BASE}/db/table/${name}`);
    if (!res.ok) throw new Error(`Failed to fetch rows for table ${name}`);
    return res.json();
  },

  async runCustomQuery(query: string): Promise<any> {
    const res = await fetch(`${API_BASE}/db/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'SQL query execution failed');
    return data;
  },

  async resetDatabase(): Promise<void> {
    const res = await fetch(`${API_BASE}/db/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset database');
  }
};
