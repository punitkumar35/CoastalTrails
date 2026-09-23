import type { Booking, BookingStatus, Homestay } from '../types';

const BASE = '/api';
const TOKEN_KEY = 'coastal_admin_token';

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export interface AdminSession {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  token: string;
}

// Admin console sign-in: uses the same session API as travelers, then
// requires the admin role before granting access.
export async function adminLogin(identifier: string, password: string): Promise<AdminSession> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Sign in failed.');
  if (data?.role !== 'admin') throw new Error('This account does not have admin access.');
  setAdminToken(data.token);
  return data;
}

export async function adminLogout(): Promise<void> {
  const token = getAdminToken();
  if (token) {
    try {
      await fetch(`${BASE}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch {
      /* signing out locally is enough */
    }
  }
  setAdminToken(null);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAdminToken();
  const headers = new Headers(init?.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    setAdminToken(null);
    try {
      localStorage.removeItem('coastal_admin');
    } catch {
      /* storage unavailable */
    }
    if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
    throw new Error('Your session has expired. Please sign in again.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Request failed');
  }
  return res.json();
}

export interface TrendPoint {
  date: string;
  count: number;
  amount: number;
}

export interface TopStay {
  id: string;
  title: string;
  location: string;
  total_rooms: number;
  price: number;
  bookedTonight: number;
  upcomingBlocks: number;
  totalBookings: number;
}

export interface AdminStats {
  stayCount: number;
  bookingCount: number;
  hostCount: number;
  holdsPaid: number;
  upcoming: number;
  statusBreakdown: Record<string, number>;
  arrivalsToday: number;
  departuresToday: number;
  trend: TrendPoint[];
  topStays: TopStay[];
  enclaves: { label: string; c: number }[];
}

export interface HostRow {
  host_name: string;
  host_whatsapp: string;
  stay_count: number;
  rooms: number;
  stays?: Homestay[];
  holdsPaid?: number;
  upcoming?: number;
  awaiting?: number;
  verified?: boolean;
  rating?: number;
}

export interface Enclave {
  id: string;
  label: string;
  sort_order: number;
}

export interface RoomDay {
  date: string;
  status: 'available' | 'booked' | 'blocked' | 'maintenance';
  source: 'system' | 'booking' | 'stay' | 'admin';
  stayReason: string | null;
}

export interface RoomSegment {
  type: 'booking' | 'blocked' | 'maintenance';
  start: string;
  end: string;
  reason?: string;
  id?: string;
  guest?: string;
  phone?: string;
  channel?: string;
  ref?: string;
  guests?: number;
  amount?: number;
  advance?: number;
  status?: string;
}

export interface RoomRow {
  number: number;
  name: string;
  bed_type: string;
  capacity: number;
  housekeeping: 'clean' | 'dirty' | 'inspecting';
  photo: string | null;
  segments: RoomSegment[];
  days: RoomDay[];
}

export interface StaySettings {
  min_stay: number;
  price_override: number | null;
}

export interface RoomStatusResponse {
  stay: {
    id: string;
    title: string;
    total_rooms: number;
    host_name: string;
    price_per_night: number;
    location_display: string;
  };
  settings: StaySettings;
  start: string;
  days: number;
  rooms: RoomRow[];
}

export const api = {
  getEnclaves(): Promise<Enclave[]> {
    return request('/enclaves');
  },
  createEnclave(label: string): Promise<Enclave> {
    return request('/enclaves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    });
  },
  uploadPhoto(file: File): Promise<{ url: string }> {
    const form = new FormData();
    form.append('photo', file);
    return request('/upload', { method: 'POST', body: form });
  },
  getStats(): Promise<AdminStats> {
    return request('/admin/stats');
  },
  getAllStays(): Promise<Homestay[]> {
    return request('/admin/homestays');
  },
  getAllBookings(): Promise<Booking[]> {
    return request('/admin/bookings');
  },
  getHosts(): Promise<HostRow[]> {
    return request('/admin/hosts');
  },
  createStay(
    data: Partial<Homestay> & { images?: ({ url: string; category: string } | string)[]; badges?: string[] },
  ): Promise<Homestay> {
    return request('/homestays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
  updateStay(id: string, data: Partial<Homestay> & { badges?: string[] }): Promise<Homestay> {
    return request(`/homestays/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
  deleteStay(id: string): Promise<{ success: boolean }> {
    return request(`/homestays/${id}`, { method: 'DELETE' });
  },
  setBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
    return request(`/bookings/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  },
  blockDate(id: string, date: string): Promise<{ success: boolean }> {
    return request(`/homestays/${id}/block-date`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });
  },
  unblockDate(id: string, date: string): Promise<{ success: boolean }> {
    return request(`/homestays/${id}/block-date`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });
  },
  getRoomStatus(id: string, start: string, days: number): Promise<RoomStatusResponse> {
    return request(`/admin/stays/${id}/room-status?start=${start}&days=${days}`);
  },
  setRoomStatus(payload: {
    homestay_id: string;
    room_number: number;
    date: string;
    status: 'available' | 'maintenance' | 'blocked';
    reason?: string;
  }): Promise<{ success: boolean }> {
    return request('/admin/room-status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
  setRoomState(payload: {
    homestay_id: string;
    room_number: number;
    name?: string;
    bed_type?: string;
    capacity?: number;
    housekeeping?: 'clean' | 'dirty' | 'inspecting';
    photo?: string | null;
  }): Promise<{ success: boolean }> {
    return request('/admin/room-state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
  setStaySettings(payload: {
    homestay_id: string;
    min_stay?: number;
    price_override?: number | null;
  }): Promise<{ success: boolean }> {
    return request('/admin/stay-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
  extendBooking(id: string, check_out: string): Promise<{ success: boolean }> {
    return request(`/admin/bookings/${id}/extend`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ check_out }),
    });
  },
  createAdminBooking(payload: {
    homestay_id: string;
    room_number?: number;
    user_name: string;
    user_phone: string;
    check_in: string;
    check_out: string;
    guests_count?: number;
    channel?: string;
  }): Promise<Booking> {
    return request('/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
};
