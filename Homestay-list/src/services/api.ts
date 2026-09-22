import type { Booking, BookingStatus, Homestay, OwnerStats } from '../types';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Request failed');
  }
  return res.json();
}

export interface Enclave {
  id: string;
  label: string;
  sort_order: number;
}

export const api = {
  getEnclaves(): Promise<Enclave[]> {
    return request('/enclaves');
  },
  registerOwner(data: { name: string; phone: string; email?: string }): Promise<{ id: string; name: string; phone: string; role: string }> {
    return request('/owner/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
  getOwnerStays(phone: string): Promise<Homestay[]> {
    return request(`/owner/stays?phone=${encodeURIComponent(phone)}`);
  },
  getOwnerBookings(phone: string): Promise<Booking[]> {
    return request(`/owner/bookings?phone=${encodeURIComponent(phone)}`);
  },
  getOwnerStats(phone: string): Promise<OwnerStats> {
    return request(`/owner/stats?phone=${encodeURIComponent(phone)}`);
  },
  updateStay(id: string, data: Partial<Homestay>): Promise<Homestay> {
    return request(`/homestays/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
  createStay(data: Partial<Homestay> & { images?: string[]; badges?: string[] }): Promise<Homestay> {
    return request('/homestays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
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
  setBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
    return request(`/bookings/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  },
  getStayAvailability(id: string, from: string, to: string): Promise<Record<string, number>> {
    return request(`/homestays/${id}/availability?from=${from}&to=${to}`);
  },
};
