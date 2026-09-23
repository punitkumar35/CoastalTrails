import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Search,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Printer,
  ArrowLeft,
  MapPin,
  Waves,
  XCircle,
  CalendarDays,
  LogOut,
  MessageCircle,
  Moon,
  Wallet,
  X,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Booking, User } from '../types';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Reveal } from '../components/ui/Reveal';
import { Tabs } from '../components/ui/Tabs';
import { Dialog } from '../components/ui/Dialog';
import { cn } from '../lib/cn';
import { useLiveRefresh } from '../lib/live';
import QRCode from 'qrcode';
import { openRazorpayCheckout } from '../lib/razorpay';

interface ReservationStatusPageProps {
  currentUser: User | null;
  initialRefCode?: string;
  onExploreStays?: () => void;
}

function useCountdown(target?: string) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    if (!target) return;
    const t = new Date(target).getTime();
    const tick = () => {
      const diff = t - Date.now();
      if (diff <= 0) {
        setLeft('expired');
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLeft(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return left;
}

function StatusPill({ status }: { status: Booking['status'] }) {
  const map = {
    pending_payment: { label: 'Payment pending', icon: Clock, cls: 'border-warn/40 bg-warn/10 text-warn' },
    confirmed: { label: 'Confirmed', icon: CheckCircle2, cls: 'border-ok/30 bg-ok/10 text-ok' },
    checked_in: { label: 'Checked in', icon: CheckCircle2, cls: 'border-tide/30 bg-tide/10 text-tide' },
    completed: { label: 'Completed', icon: CheckCircle2, cls: 'border-ok/30 bg-ok/10 text-ok' },
    declined: { label: 'Declined', icon: XCircle, cls: 'border-err/30 bg-err/10 text-err' },
    cancelled: { label: 'Cancelled', icon: XCircle, cls: 'border-ink-3/30 bg-paper-2 text-ink-3' },
    expired: { label: 'Expired', icon: XCircle, cls: 'border-ink-3/30 bg-paper-2 text-ink-3' },
    awaiting_host: { label: 'Awaiting host', icon: Clock, cls: 'border-warn/30 bg-warn/10 text-warn' },
  } as const;
  const m = map[status] ?? map.awaiting_host;
  const Icon = m.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider', m.cls)}>
      <Icon className="h-3 w-3" />
      {m.label}
    </span>
  );
}

function PaymentBadge({ booking }: { booking: Booking }) {
  const status = booking.payment_status ?? (booking.advance_paid > 0 ? 'paid' : 'pending');
  const map: Record<string, string> = {
    paid: 'border-ok/30 bg-ok/10 text-ok',
    refunded: 'border-tide/30 bg-tide/10 text-tide',
    failed: 'border-err/30 bg-err/10 text-err',
    partially_paid: 'border-warn/30 bg-warn/10 text-warn',
    pending: 'border-warn/30 bg-warn/10 text-warn',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider', map[status] || map.pending)}>
      <Wallet className="h-3 w-3" />
      {status === 'partially_paid' ? 'Part paid' : status}
    </span>
  );
}

export function ReservationStatusPage({ currentUser, initialRefCode: propRefCode = '', onExploreStays }: ReservationStatusPageProps) {
  const { refCode: urlRefCode } = useParams<{ refCode?: string }>();
  const navigate = useNavigate();
  const activeInitialCode = urlRefCode || propRefCode;
  const [searchQuery, setSearchQuery] = useState(activeInitialCode);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [matchingBookings, setMatchingBookings] = useState<Booking[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'awaiting_host'>('all');
  const [notice, setNotice] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [payMethod, setPayMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [payingHold, setPayingHold] = useState(false);
  const syncingRef = useRef(false);
  const [payResult, setPayResult] = useState<{ kind: 'success' | 'failed'; message?: string } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const fetchBookings = async (silent = false) => {
    if (!currentUser) {
      setAllBookings([]);
      setMatchingBookings([]);
      return;
    }
    try {
      if (!silent) setLoading(true);
      const data = await api.getBookings();
      setAllBookings(data);
      if (searchQuery.trim()) {
        filterResults(searchQuery.trim(), data);
      } else {
        setMatchingBookings(data);
        if (activeInitialCode) {
          const match = data.find((b) => b.reference_code.toLowerCase() === activeInitialCode.toLowerCase());
          if (match) setSelectedBooking(match);
        }
      }
      setSelectedBooking((prev) => {
        if (!prev) return prev;
        const fresh = data.find((b) => b.id === prev.id);
        return fresh ?? prev;
      });

      // Auto-reconcile bookings whose payment may have completed while the
      // checkout handler was interrupted (network drop, closed tab, etc.)
      if (silent && !syncingRef.current) {
        const stuck = data.filter(
          (b) => b.payment_status === 'pending' && (b.status === 'pending_payment' || b.status === 'awaiting_host'),
        );
        if (stuck.length > 0) {
          syncingRef.current = true;
          Promise.all(stuck.slice(0, 3).map((b) => api.syncPayment(b.id).catch(() => null)))
            .then((results) => {
              if (results.some((r) => r && r.synced !== 'pending')) {
                return fetchBookings(true);
              }
              return undefined;
            })
            .finally(() => {
              syncingRef.current = false;
            });
        }
      }
    } catch (err) {
      console.error('Failed to load bookings', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlRefCode, currentUser?.phone]);

  useEffect(() => {
    if (!selectedBooking) {
      setQrDataUrl('');
      return;
    }
    let alive = true;
    QRCode.toDataURL(
      `${window.location.origin}/reservation/${selectedBooking.reference_code}`,
      { width: 236, margin: 1, color: { dark: '#16222E', light: '#FFFFFF' } },
    )
      .then((url) => {
        if (alive) setQrDataUrl(url);
      })
      .catch(() => {
        if (alive) setQrDataUrl('');
      });
    return () => {
      alive = false;
    };
  }, [selectedBooking]);

  useLiveRefresh(() => fetchBookings(true), 15000);

  // Status notices dismiss themselves after a few seconds
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const refreshBooking = async (id: string) => {
    const fresh = await api.getBookings();
    setAllBookings(fresh);
    setMatchingBookings(fresh);
    const updated = fresh.find((b) => b.id === id);
    if (updated) setSelectedBooking(updated);
    return updated;
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    setConfirmCancel(true);
  };

  const doCancelBooking = async () => {
    if (!selectedBooking) return;
    setCancelling(true);
    try {
      await api.cancelBooking(selectedBooking.id);
      await refreshBooking(selectedBooking.id);
      setNotice('Booking cancelled — any paid hold will be refunded.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not cancel the booking.');
    } finally {
      setCancelling(false);
      setConfirmCancel(false);
    }
  };

  const handleCompletePayment = async () => {
    if (!selectedBooking) return;
    setPayingHold(true);
    try {
      const init = await api.initiatePayment(selectedBooking.id, payMethod);
      await openRazorpayCheckout({
        key: init.key_id,
        orderId: init.order_id,
        amountPaise: init.amount_paise,
        method: payMethod as 'upi' | 'card' | 'netbanking',
        description: `20% hold · ${init.booking_reference}`,
        prefill: { name: init.customer.name, contact: init.customer.phone },
        onSuccess: async (r) => {
          try {
            await api.confirmPayment(selectedBooking.id, {
              razorpay_order_id: init.order_id,
              razorpay_payment_id: r.razorpay_payment_id,
              razorpay_signature: r.razorpay_signature,
            });
          } catch {
            await api.syncPayment(selectedBooking.id).catch(() => {});
          }
          await refreshBooking(selectedBooking.id);
          setPayResult({ kind: 'success' });
        },
        onFail: async (message) => {
          await api.failPayment(selectedBooking.id).catch(() => {});
          setPayResult({ kind: 'failed', message });
        },
        onCancel: async () => {
          const synced = await api.syncPayment(selectedBooking.id).catch(() => null);
          if (synced && synced.booking.payment_status === 'paid') {
            await refreshBooking(selectedBooking.id);
            setPayResult({ kind: 'success' });
          } else {
            await api.failPayment(selectedBooking.id).catch(() => {});
            setPayResult({
              kind: 'failed',
              message: 'Payment window closed before completing. Nothing was charged — retry when ready.',
            });
          }
        },
      });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not complete the payment.');
    } finally {
      setPayingHold(false);
    }
  };

  const handleExplore = () => {
    if (onExploreStays) onExploreStays();
    navigate('/');
  };

  const filterResults = (query: string, list = allBookings) => {
    const q = query.toLowerCase().trim();
    if (!q) {
      setMatchingBookings(list);
      return;
    }
    const filtered = list.filter(
      (b) =>
        b.reference_code.toLowerCase().includes(q) ||
        b.user_phone.toLowerCase().includes(q) ||
        b.user_name.toLowerCase().includes(q) ||
        (b.homestay_title && b.homestay_title.toLowerCase().includes(q)),
    );
    setMatchingBookings(filtered);
    setHasSearched(true);
    if (filtered.length === 1 && filtered[0].reference_code.toLowerCase() === q) {
      setSelectedBooking(filtered[0]);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    filterResults(searchQuery);
  };

  const handleCopyRef = (ref: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2500);
  };

  const formatCardDate = (dateStr?: string) => {
    if (!dateStr) return 'Upcoming';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const getMonthGroup = (dateStr?: string) => {
    if (!dateStr) return 'Upcoming Stays';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Upcoming Stays';
      return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    } catch {
      return 'Upcoming Stays';
    }
  };

  const visibleBookings =
    statusFilter === 'all' ? matchingBookings : matchingBookings.filter((b) => b.status === statusFilter);

  const groupedBookings = visibleBookings.reduce<Record<string, Booking[]>>((acc, booking) => {
    const group = getMonthGroup(booking.check_in);
    if (!acc[group]) acc[group] = [];
    acc[group].push(booking);
    return acc;
  }, {});

  const todayISO = new Date().toISOString().split('T')[0];
  const upcomingCount = matchingBookings.filter((b) => b.check_in >= todayISO).length;
  const totalNights = matchingBookings.reduce((sum, b) => {
    const n =
      b.nights || Math.max(1, Math.ceil((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000));
    return sum + n;
  }, 0);
  const holdsPaid = matchingBookings.reduce((sum, b) => sum + (b.advance_paid || 0), 0);

  const countdown = useCountdown(selectedBooking?.hold_expires_at);

  const cancelDialog = (
    <Dialog open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel this booking?">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-warn/40 bg-warn/10 p-3">
          <XCircle className="h-5 w-5 shrink-0 text-warn" />
          <p className="text-sm leading-relaxed text-ink-2">
            {selectedBooking?.payment_status === 'paid' ? (
              <>
                Your paid hold of <span className="font-semibold text-ink">₹{selectedBooking.advance_paid}</span> will be
                refunded to the original payment method. This cannot be undone.
              </>
            ) : (
              <>This booking will be cancelled immediately. This cannot be undone.</>
            )}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirmCancel(false)} disabled={cancelling}>
            No, keep booking
          </Button>
          <Button className="flex-1 gap-1.5 bg-err hover:bg-err/90" onClick={doCancelBooking} disabled={cancelling}>
            {cancelling ? 'Cancelling…' : 'Yes, cancel it'}
          </Button>
        </div>
      </div>
    </Dialog>
  );

  if (selectedBooking) {
    const isConfirmed = ['confirmed', 'checked_in', 'completed'].includes(selectedBooking.status);
    const isDeclined = ['declined', 'cancelled', 'expired'].includes(selectedBooking.status);
    const isAwaiting = !isConfirmed && !isDeclined;
    const nights =
      selectedBooking.nights ||
      Math.max(1, Math.ceil((new Date(selectedBooking.check_out).getTime() - new Date(selectedBooking.check_in).getTime()) / 86400000));

    const steps = [
      { label: 'Hold secured', state: 'done' as const },
      { label: 'Host review', state: isAwaiting ? ('active' as const) : ('done' as const) },
      {
        label: isDeclined ? 'Declined' : 'Confirmed',
        state: isDeclined ? ('declined' as const) : isAwaiting ? ('todo' as const) : ('done' as const),
      },
    ];

    return (
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <button
            type="button"
            onClick={() => setSelectedBooking(null)}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-elevated px-3.5 py-2 text-xs font-semibold text-ink-2 transition-all hover:border-tide hover:text-tide active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>All bookings</span>
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            {['pending_payment', 'awaiting_host', 'confirmed'].includes(selectedBooking.status) ? (
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="inline-flex items-center gap-1.5 rounded-xl border border-err/30 bg-err/5 px-3.5 py-2 text-xs font-semibold text-err transition-colors hover:bg-err/10 disabled:opacity-60"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>{cancelling ? 'Cancelling…' : 'Cancel booking'}</span>
              </button>
            ) : null}
            {selectedBooking.guest_whatsapp_link ? (
              <a
                href={selectedBooking.guest_whatsapp_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-ok/40 bg-ok/10 px-3.5 py-2 text-xs font-semibold text-ok transition-colors hover:bg-ok/20"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>WhatsApp details</span>
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-elevated px-3.5 py-2 text-xs font-semibold text-ink-2 transition-colors hover:bg-paper-2"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print voucher</span>
            </button>
            <PaymentBadge booking={selectedBooking} />
            <StatusPill status={selectedBooking.status} />
          </div>
        </div>

        {notice ? (
          <div className="flex items-center justify-between gap-2.5 rounded-xl border border-tide/30 bg-tide/5 p-3 text-xs font-semibold text-tide">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {notice}
            </span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss message"
              className="shrink-0 rounded-full p-0.5 text-tide/70 transition-colors hover:bg-tide/10 hover:text-tide"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        {selectedBooking.status === 'pending_payment' ? (
          <div className="rounded-3xl border border-warn/40 bg-warn/5 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="font-display text-lg font-semibold text-ink">Finish your 20% hold</p>
                  <p className="text-xs text-ink-2">
                    ₹{Math.round(selectedBooking.total_amount * 0.2)} due now · ₹
                    {selectedBooking.total_amount - Math.round(selectedBooking.total_amount * 0.2)} payable at the property. Your
                    rooms stay held for 24 hours.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(['upi', 'card', 'netbanking'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethod(m)}
                      className={cn(
                        'rounded-xl border px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors',
                        payMethod === m
                          ? 'border-tide bg-tide/10 text-tide'
                          : 'border-line-2 bg-elevated text-ink-2 hover:border-tide hover:text-tide',
                      )}
                    >
                      {m === 'upi' ? 'UPI' : m === 'card' ? 'Card' : 'Netbanking'}
                    </button>
                  ))}
                  <Button size="sm" onClick={handleCompletePayment} disabled={payingHold}>
                    {payingHold ? 'Verifying…' : `Pay ₹${Math.round(selectedBooking.total_amount * 0.2)} now`}
                  </Button>
                </div>
                <p className="text-[11px] text-ink-3">
                  Simulated gateway — the server verifies the payment before the booking moves to the host.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <Reveal>
          <div className="print-voucher relative overflow-hidden rounded-3xl border border-line bg-elevated">
            <span
              className="pointer-events-none absolute -right-4 top-24 hidden rotate-[-8deg] select-none font-display text-[120px] font-bold leading-none text-ink/[0.04] md:block"
              aria-hidden="true"
            >
              {isConfirmed ? 'CONFIRMED' : isDeclined ? 'DECLINED' : 'ON HOLD'}
            </span>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper-2 px-6 py-4 sm:px-8">
              <div className="flex items-center gap-3">
                <span className="overline">E-voucher</span>
                <span className="flex items-center gap-2 rounded-lg border border-line bg-elevated px-3 py-1">
                  <span className="font-mono-data text-base font-semibold text-ink">{selectedBooking.reference_code}</span>
                  <button
                    type="button"
                    onClick={(e) => handleCopyRef(selectedBooking.reference_code, e)}
                    className="text-ink-3 transition-colors hover:text-tide"
                    aria-label="Copy reference"
                  >
                    {copiedRef === selectedBooking.reference_code ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />}
                  </button>
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs text-ink-3">
                  Booked on{' '}
                  {new Date(selectedBooking.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span
                  className={cn(
                    'inline-block rotate-6 rounded-md border-2 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest',
                    isConfirmed ? 'border-ok/60 text-ok' : isDeclined ? 'border-err/60 text-err' : 'border-warn/60 text-warn',
                  )}
                >
                  {selectedBooking.status === 'cancelled'
                    ? 'Cancelled'
                    : selectedBooking.status === 'expired'
                      ? 'Expired'
                      : isConfirmed
                        ? 'Confirmed ✓'
                        : isDeclined
                          ? 'Declined'
                          : 'Awaiting host'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0 space-y-7 p-6 sm:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="h-36 w-full shrink-0 overflow-hidden rounded-2xl border border-line sm:w-56">
                    <img
                      src="https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=700&q=80"
                      alt={selectedBooking.homestay_title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Badge variant="dot">Family stewarded</Badge>
                    <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                      {selectedBooking.homestay_title}
                    </h2>
                    <p className="flex items-center gap-1.5 text-xs text-ink-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-tide" />
                      {selectedBooking.location_display} • Gokarna, Karnataka
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-paper-2 p-5">
                  <p className="overline mb-6">Itinerary</p>
                  <div className="relative flex items-start justify-between">
                    <div className="absolute left-9 right-9 top-3.5 h-px bg-line" aria-hidden="true" />
                    <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-tide bg-elevated">
                        <CalendarDays className="h-3.5 w-3.5 text-tide" />
                      </span>
                      <div>
                        <p className="font-mono-data text-xs font-semibold text-ink">{selectedBooking.check_in}</p>
                        <p className="text-[10px] text-ink-3">Check-in · after 12:00</p>
                      </div>
                    </div>
                    <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-line-2 bg-elevated">
                        <Moon className="h-3.5 w-3.5 text-ember" />
                      </span>
                      <div>
                        <p className="font-mono-data text-xs font-semibold text-ink">
                          {nights} night{nights > 1 ? 's' : ''}
                        </p>
                        <p className="text-[10px] text-ink-3">
                          {selectedBooking.guests_count || 2} guest{(selectedBooking.guests_count || 2) > 1 ? 's' : ''} · 1 room
                        </p>
                      </div>
                    </div>
                    <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-tide bg-elevated">
                        <LogOut className="h-3.5 w-3.5 text-tide" />
                      </span>
                      <div>
                        <p className="font-mono-data text-xs font-semibold text-ink">{selectedBooking.check_out}</p>
                        <p className="text-[10px] text-ink-3">Check-out · before 11:00</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="overline">Reservation progress</p>
                  <div className="flex items-center">
                    {steps.map((step, i) => (
                      <div key={step.label} className={cn('flex items-center', i < steps.length - 1 && 'flex-1')}>
                        <div className="flex flex-col items-center gap-1.5">
                          <span
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold',
                              step.state === 'done' && 'border-tide bg-tide text-white',
                              step.state === 'active' && 'border-tide bg-tide/10 text-tide',
                              step.state === 'declined' && 'border-err bg-err text-white',
                              step.state === 'todo' && 'border-line-2 bg-paper-2 text-ink-3',
                            )}
                          >
                            {step.state === 'done' && !isDeclined ? <Check className="h-4 w-4" /> : i + 1}
                          </span>
                          <span className="whitespace-nowrap font-mono text-[9px] uppercase tracking-wider text-ink-3">{step.label}</span>
                        </div>
                        {i < steps.length - 1 ? (
                          <div className={cn('mx-2 h-0.5 flex-1 rounded-full', steps[i].state === 'done' ? 'bg-tide' : 'bg-line')} />
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {isAwaiting && countdown && countdown !== 'expired' ? (
                    <p className="font-mono text-[11px] text-warn">Hold expires in {countdown}</p>
                  ) : null}
                </div>

                <div className="flex items-start gap-2 rounded-xl border border-line bg-paper-2 p-3 text-[11px] text-ink-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-tide" />
                  <span>Your dates are locked. Our concierge coordinates your arrival — no middleman contact needed.</span>
                </div>
              </div>

              <div className="relative flex flex-col justify-between border-t border-dashed border-line-2 p-6 lg:border-l lg:border-t-0">
                <span className="absolute -top-2.5 left-8 h-5 w-5 rounded-full bg-paper lg:hidden" aria-hidden="true" />
                <span className="absolute -top-2.5 right-8 h-5 w-5 rounded-full bg-paper lg:hidden" aria-hidden="true" />
                <span className="absolute -left-2.5 -top-2.5 hidden h-5 w-5 rounded-full bg-paper lg:block" aria-hidden="true" />
                <span className="absolute -left-2.5 -bottom-2.5 hidden h-5 w-5 rounded-full bg-paper lg:block" aria-hidden="true" />

                <div className="space-y-2.5 text-xs">
                  <p className="overline mb-3">Fare receipt</p>
                  <div className="flex justify-between border-b border-dashed border-line-2 pb-2 text-ink-2">
                    <span>Total stay tariff</span>
                    <span className="font-mono-data font-semibold text-ink">₹{selectedBooking.total_amount}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-tide">
                    <span>20% hold paid online</span>
                    <span className="font-mono-data">₹{selectedBooking.advance_paid}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-line-2 pb-2">
                    <span className="font-semibold text-ink">80% balance at property</span>
                    <span className="font-mono-data font-semibold text-ink">₹{selectedBooking.balance_payable_at_property}</span>
                  </div>
                  <div className="flex justify-between text-ink-3">
                    <span>Convenience fee</span>
                    <span className="font-semibold text-ok">₹0</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-col items-center gap-4 border-t border-dashed border-line-2 pt-5">
                  {qrDataUrl ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <img
                        src={qrDataUrl}
                        alt="Booking QR code"
                        className="h-24 w-24 rounded-lg border border-line bg-white p-1.5"
                      />
                      <span className="font-mono text-[9px] uppercase tracking-widest text-ink-3">Scan to verify</span>
                    </div>
                  ) : null}
                  <div className="flex w-full flex-col items-center gap-2">
                    <div className="flex h-12 items-stretch gap-[2px]" aria-hidden="true">
                      {Array.from({ length: 42 }).map((_, i) => (
                        <span
                          key={i}
                          className="w-[2px] bg-ink"
                          style={{ height: `${[55, 100, 80, 100, 65, 90, 100][i % 7]}%` }}
                        />
                      ))}
                    </div>
                    <span className="font-mono-data text-sm font-semibold tracking-[0.25em] text-ink">{selectedBooking.reference_code}</span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-ok">Valid for check-in</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleExplore}>Explore more stays</Button>
          <button
            type="button"
            onClick={() => setSelectedBooking(null)}
            className="rounded-xl border border-line bg-elevated px-4 py-2.5 text-xs font-semibold text-ink-2 transition-colors hover:bg-paper-2"
          >
            Back to all bookings
          </button>
        </div>
        {cancelDialog}
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {notice ? (
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2.5 rounded-xl border border-tide/30 bg-tide/5 p-3 text-xs font-semibold text-tide">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {notice}
          </span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss message"
            className="shrink-0 rounded-full p-0.5 text-tide/70 transition-colors hover:bg-tide/10 hover:text-tide"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      <div className="mx-auto max-w-xl space-y-3 text-center">
        <p className="overline">Reservation desk</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Your bookings</h1>
        <p className="text-sm text-ink-2">
          {currentUser ? (
            <>
              Signed in as <span className="font-semibold text-ink">{currentUser.name}</span> — only your own reservations appear here.
            </>
          ) : (
            'Verify your 20% commitment hold, watch host approval, and open any reservation for the full voucher.'
          )}
        </p>
      </div>

      <form onSubmit={handleSearchSubmit} className="mx-auto max-w-2xl">
        <div className="glass flex items-center rounded-2xl p-2">
          <Search className="ml-3 h-4 w-4 shrink-0 text-ink-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              filterResults(e.target.value);
            }}
            placeholder="Search your bookings by reference (e.g. GK-782941)"
            aria-label="Search bookings"
            className="w-full bg-transparent px-3.5 py-2 text-sm font-medium text-ink placeholder:text-ink-3 focus:outline-none"
          />
          <Button type="submit" size="sm" className="shrink-0">
            Search
          </Button>
        </div>
      </form>

      {!loading && matchingBookings.length > 0 ? (
        <>
          <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-3">
            <div className="rounded-2xl border border-line bg-elevated p-4 text-center">
              <p className="font-display text-2xl font-semibold text-ink">{upcomingCount}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-3">Upcoming stays</p>
            </div>
            <div className="rounded-2xl border border-line bg-elevated p-4 text-center">
              <p className="font-display text-2xl font-semibold text-ink">{totalNights}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-3">Total nights</p>
            </div>
            <div className="rounded-2xl border border-line bg-elevated p-4 text-center">
              <p className="font-display text-2xl font-semibold text-ink">₹{holdsPaid.toLocaleString('en-IN')}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-3">Holds paid</p>
            </div>
          </div>

          <div className="flex justify-center">
            <Tabs
              items={[
                { id: 'all', label: 'All' },
                { id: 'confirmed', label: 'Confirmed' },
                { id: 'awaiting_host', label: 'Awaiting host' },
              ]}
              active={statusFilter}
              onChange={(id) => setStatusFilter(id as 'all' | 'confirmed' | 'awaiting_host')}
            />
          </div>
        </>
      ) : null}

      {loading ? (
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : matchingBookings.length === 0 && hasSearched ? (
        <EmptyState
          icon={<AlertCircle className="h-6 w-6" />}
          overline="No results"
          title="No reservation located"
          description={`We couldn't find a booking for "${searchQuery}" in your account. Check the reference code and try again.`}
          action={{ label: 'Explore sanctuaries', onClick: handleExplore }}
          className="mx-auto max-w-xl"
        />
      ) : !hasSearched && allBookings.length === 0 ? (
        <EmptyState
          icon={<Waves className="h-6 w-6" />}
          overline="No bookings yet"
          title="Your reservations will appear here"
          description="You haven't booked a stay yet. Explore our family-stewarded sanctuaries and secure your first 20% hold."
          action={{ label: 'Explore sanctuaries', onClick: handleExplore }}
          className="mx-auto max-w-xl"
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedBookings).map(([monthGroup, bookings]) => (
            <div key={monthGroup} className="space-y-3">
              <p className="overline pl-1">{monthGroup}</p>
              <div className="space-y-3">
                {bookings.map((b) => {
                  const nights =
                    b.nights ||
                    Math.max(1, Math.ceil((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000));
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBooking(b)}
                      className="group cursor-pointer rounded-2xl border border-line bg-elevated p-5 transition-all hover:-translate-y-0.5 hover:border-tide"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-tide-glow/15 text-tide">
                              <Waves className="h-4 w-4" />
                            </span>
                            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{b.reference_code}</span>
                            <StatusPill status={b.status} />
                            {b.payment_status && b.payment_status !== 'paid' ? (
                              <span className="font-mono text-[10px] uppercase tracking-wider text-warn">payment {b.payment_status}</span>
                            ) : null}
                          </div>
                          <h3 className="truncate font-display text-lg font-semibold text-ink">{b.homestay_title || 'Coastal Sanctuary'}</h3>
                          <p className="flex items-center gap-1.5 text-xs text-ink-2">
                            <MapPin className="h-3 w-3 text-tide" />
                            {b.location_display || 'Gokarna'} • {b.guests_count || 2} guests • {nights} night{nights > 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono-data text-sm font-semibold text-ink">{formatCardDate(b.check_in)}</p>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-3">
                            {nights} night{nights > 1 ? 's' : ''} · ₹{b.advance_paid} hold
                          </p>
                          <p className="mt-0.5 text-xs font-semibold text-tide transition-transform group-hover:translate-x-0.5">
                            View details →
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {createPortal(
        <AnimatePresence>
          {payResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                className="w-full max-w-md rounded-3xl border border-line bg-elevated p-8 text-center shadow-2xl"
              >
                {payResult.kind === 'success' ? (
                  <motion.svg viewBox="0 0 52 52" className="mx-auto h-20 w-20">
                    <motion.circle
                      cx="26"
                      cy="26"
                      r="24"
                      fill="none"
                      stroke="var(--c-ok)"
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                    <motion.path
                      d="M14 27 L22 35 L38 17"
                      fill="none"
                      stroke="var(--c-ok)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, delay: 0.55, ease: 'easeOut' }}
                    />
                  </motion.svg>
                ) : (
                  <motion.svg viewBox="0 0 52 52" className="mx-auto h-20 w-20">
                    <motion.circle
                      cx="26"
                      cy="26"
                      r="24"
                      fill="none"
                      stroke="var(--c-err)"
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                    <motion.path
                      d="M18 18 L34 34 M34 18 L18 34"
                      fill="none"
                      stroke="var(--c-err)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, delay: 0.55, ease: 'easeOut' }}
                    />
                  </motion.svg>
                )}

                <p className={cn('overline mt-6', payResult.kind === 'failed' && '!text-err')}>
                  {payResult.kind === 'success' ? 'Payment successful' : 'Payment failed'}
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
                  {payResult.kind === 'success'
                    ? 'Your stay is booked'
                    : "We couldn't complete your payment"}
                </h2>
                <p className="mt-2 text-sm text-ink-2">
                  {payResult.kind === 'success'
                    ? 'The 20% hold is paid — your booking has been sent to the host for confirmation.'
                    : payResult.message || 'Your payment was declined. Nothing was charged — your dates are still held.'}
                </p>

                <div className="mt-4 flex items-end justify-center gap-0.5" aria-hidden="true">
                  {[8, 14, 20, 26, 20, 14, 8].map((h, i) => (
                    <motion.span
                      key={i}
                      initial={{ height: 4, opacity: 0 }}
                      animate={{ height: h, opacity: 1 }}
                      transition={{ delay: 0.5 + i * 0.06, type: 'spring', stiffness: 300, damping: 18 }}
                      className={cn('w-1 rounded-full', payResult.kind === 'success' ? 'bg-tide-glow' : 'bg-err/50')}
                    />
                  ))}
                </div>

                <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
                  {payResult.kind === 'success' ? (
                    <Button className="flex-1" onClick={() => setPayResult(null)}>
                      View my booking
                    </Button>
                  ) : (
                    <>
                      <Button
                        className="flex-1"
                        disabled={payingHold}
                        onClick={() => {
                          setPayResult(null);
                          void handleCompletePayment();
                        }}
                      >
                        {payingHold ? 'Retrying…' : 'Retry payment'}
                      </Button>
                      <Button variant="secondary" className="flex-1" onClick={() => setPayResult(null)}>
                        Pay later
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <Dialog open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel this booking?">
        <div className="space-y-4">          <div className="flex items-start gap-3 rounded-xl border border-warn/40 bg-warn/10 p-3">
            <XCircle className="h-5 w-5 shrink-0 text-warn" />
            <p className="text-sm leading-relaxed text-ink-2">
              {selectedBooking?.payment_status === 'paid' ? (
                <>
                  Your paid hold of <span className="font-semibold text-ink">₹{selectedBooking.advance_paid}</span> will be
                  refunded to the original payment method. This cannot be undone.
                </>
              ) : (
                <>This booking will be cancelled immediately. This cannot be undone.</>
              )}
            </p>
          </div>
          <div className="flex gap-2.5">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmCancel(false)} disabled={cancelling}>
              No, keep booking
            </Button>
            <Button className="flex-1 gap-1.5 bg-err hover:bg-err/90" onClick={doCancelBooking} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Yes, cancel it'}
            </Button>
          </div>
        </div>
      </Dialog>
      {cancelDialog}
    </div>
  );
}
