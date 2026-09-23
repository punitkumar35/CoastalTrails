export interface Homestay {
  id: string;
  title: string;
  subtitle: string;
  location: 'kudle' | 'om' | 'mainBeach' | 'halfMoon' | 'paradise' | 'town';
  location_display: string;
  price_per_night: number;
  rating: number;
  reviews_count: number;
  host_name: string;
  host_whatsapp: string;
  is_host_verified: number | boolean;
  walking_minutes_to_beach: number;
  total_rooms: number;
  availability_listed?: number | boolean;
  description: string;
  imageUrls: string[];
  amenities: string[];
  verifiedBadges: string[];
  blockedDates: string[];
  advanceDeposit: number;
  balanceAtCheckIn: number;
  isAvailable?: boolean;
  availableRooms?: number;
}

export type BookingStatus =
  | 'pending_payment'
  | 'awaiting_host'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'declined'
  | 'cancelled'
  | 'expired';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'partially_paid' | 'refunded';

export interface Booking {
  id: string;
  reference_code: string;
  homestay_id: string;
  homestay_title?: string;
  location_display?: string;
  host_name?: string;
  host_whatsapp?: string;
  user_name: string;
  user_phone: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_amount: number;
  advance_paid: number;
  balance_payable_at_property: number;
  status: BookingStatus;
  payment_status?: PaymentStatus;
  payment_id?: string | null;
  paid_at?: string | null;
  room_number?: number | null;
  created_at: string;
  hold_expires_at?: string;
  nights?: number;
  whatsapp_link?: string;
  guest_whatsapp_link?: string | null;
}

export interface TransitRoute {
  id: string;
  start_point: string;
  start_subtext: string;
  destination: string;
  destination_subtext: string;
  distance_km: number;
  walking_mins: number;
  scooter_mins: number;
  car_mins: number;
  bus_mins: number;
  active_mode: string;
}

export interface DatabaseTableInfo {
  name: string;
  count: number;
  columns: {
    cid: number;
    name: string;
    type: string;
    notnull: boolean;
    dflt_value: any;
    pk: boolean;
  }[];
}

export interface ReviewMedia {
  url: string;
  type: 'image';
}

export interface Review {
  id: number;
  user_id?: string | null;
  guest_name: string;
  rating: number;
  title: string;
  body: string;
  stay_details?: string;
  verified: number | boolean;
  helpful_count: number;
  created_at: string;
  updated_at?: string;
  media?: ReviewMedia[];
}

export interface ReviewSummary {
  count: number;
  average: number;
  distribution: Record<string, number>;
  topics: { label: string; count: number }[];
  text: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  token?: string;
}

export interface CustomMapLocation {
  id: string;
  name: string;
  category: 'viewpoint' | 'cove' | 'cafe' | 'homestay' | 'jetty' | 'trail' | 'shrine';
  lat: number;
  lng: number;
  description?: string;
  tips?: string;
  createdAt?: string;
  isCustom?: boolean;
}

export interface NavigationTarget {
  id: string;
  name: string;
  category?: string;
  coords: [number, number];
  distanceKm?: number;
}
