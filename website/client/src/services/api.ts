import {
  Homestay,
  Booking,
  BookingPayment,
  TransitRoute,
  DatabaseTableInfo,
  User,
  Review,
  ReviewSummary,
  WishlistStay,
} from '../types';

const API_BASE = '/api';

function getAuthToken(): string | null {
  try {
    return JSON.parse(localStorage.getItem('gokarna_traveler_user') || 'null')?.token || null;
  } catch {
    return null;
  }
}

function getCaptchaToken(): string | null {
  try {
    return sessionStorage.getItem('ct_captcha_token') || null;
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  const captcha = getCaptchaToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (captcha) headers['x-captcha-token'] = captcha;
  return headers;
}

function handleRateLimitError(res: Response, errData?: any) {
  if (res.status === 429 || errData?.requiresCaptcha) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('site:ddos_challenge', {
          detail: {
            error: errData?.error || 'Rate limit or unusual traffic detected. Security verification required.',
            code: errData?.code || 'RATE_LIMIT_EXCEEDED',
            requiresCaptcha: true,
            retryAfterSeconds: errData?.retryAfterSeconds,
          },
        })
      );
    }
  }
}

function handleAuthError(res: Response, errData?: any) {
  handleRateLimitError(res, errData);
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
  const captcha = getCaptchaToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (captcha) headers['x-captcha-token'] = captcha;

  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
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
    handleRateLimitError(res, data);
    const err: any = new Error(data?.error || 'Something went wrong. Please try again.');
    err.status = res.status;
    err.code = data?.code;
    err.requiresCaptcha = Boolean(data?.requiresCaptcha || res.status === 429);
    err.retryAfterSeconds = data?.retryAfterSeconds;
    throw err;
  }
  return {
    id: String(data.id),
    name: data.name,
    phone: data.phone || '',
    email: data.email || undefined,
    avatar: data.avatar_url || data.avatar || undefined,
    token: data.token,
    role: data.role,
    profile_image: data.profile_image || undefined,
    date_of_birth: data.date_of_birth || undefined,
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

  async getBooking(id: string): Promise<Booking> {
    const res = await fetch(`${API_BASE}/bookings/${id}`, { headers: { ...authHeaders() } });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      handleAuthError(res, err);
      throw new Error(err?.error || 'Could not load this booking.');
    }
    return res.json();
  },

  async getBookingPayments(bookingId: string): Promise<BookingPayment[]> {
    const res = await fetch(`${API_BASE}/payments/${bookingId}`, { headers: { ...authHeaders() } });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      handleAuthError(res, err);
      throw new Error(err?.error || 'Could not load payment history.');
    }
    return res.json();
  },

  async getMyPayments(): Promise<BookingPayment[]> {
    const res = await fetch(`${API_BASE}/payments`, { headers: { ...authHeaders() } });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      handleAuthError(res, err);
      throw new Error(err?.error || 'Could not load your payments.');
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

  async getProfile(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/profile`, { headers: { ...authHeaders() } });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      handleAuthError(res, data);
      throw new Error(data?.error || 'Could not load your profile.');
    }
    return data;
  },

  async updateProfile(data: { name: string; date_of_birth?: string | null }): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    const out = await res.json().catch(() => null);
    if (!res.ok) {
      handleAuthError(res, out);
      throw new Error(out?.error || 'Could not save your profile.');
    }
    return out;
  },

  async uploadProfilePhoto(file: File): Promise<{ url: string }> {
    const form = new FormData();
    form.append('photo', file);
    const res = await fetch(`${API_BASE}/upload/avatar`, {
      method: 'POST',
      headers: { ...authHeaders() },
      body: form,
    });
    const out = await res.json().catch(() => null);
    if (!res.ok) {
      handleAuthError(res, out);
      throw new Error(out?.error || 'Could not upload your photo.');
    }
    return out;
  },

  // Wishlist (signed-in customers)
  async getWishlist(): Promise<WishlistStay[]> {
    const res = await fetch(`${API_BASE}/wishlist`, { headers: { ...authHeaders() } });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      handleAuthError(res, err);
      throw new Error(err?.error || 'Could not load your wishlist.');
    }
    return res.json();
  },

  async addToWishlist(homestayId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/wishlist/${homestayId}`, {
      method: 'POST',
      headers: { ...authHeaders() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      handleAuthError(res, err);
      throw new Error(err?.error || 'Could not save this stay.');
    }
  },

  async removeFromWishlist(homestayId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/wishlist/${homestayId}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      handleAuthError(res, err);
      throw new Error(err?.error || 'Could not remove this stay.');
    }
  },

  async changePassword(data: {
    current_password: string;
    new_password: string;
    confirm_password?: string;
  }): Promise<{ success: boolean; other_sessions_signed_out?: boolean }> {
    const res = await fetch(`${API_BASE}/auth/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    const out = await res.json().catch(() => null);
    if (!res.ok) {
      handleAuthError(res, out);
      throw new Error(out?.error || 'Could not change your password.');
    }
    return out;
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const out = await res.json().catch(() => null);
    if (!res.ok) throw new Error(out?.error || 'Could not send the reset link.');
    return out;
  },

  async resetPassword(data: {
    token: string;
    new_password: string;
    confirm_password?: string;
  }): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const out = await res.json().catch(() => null);
    if (!res.ok) throw new Error(out?.error || 'Could not reset your password.');
    return out;
  },

  async register(
    data: { name: string; phone: string; email: string; password: string },
    captchaToken?: string
  ): Promise<User> {
    const payload = captchaToken ? { ...data, captchaToken } : data;
    return authRequest('/auth/register', payload);
  },

  async login(identifier: string, password: string, captchaToken?: string): Promise<User> {
    const payload = captchaToken ? { identifier, password, captchaToken } : { identifier, password };
    return authRequest('/auth/login', payload);
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
