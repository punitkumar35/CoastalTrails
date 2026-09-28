import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, MapPin, Users } from 'lucide-react';
import { useStayImages } from '../../components/profile/useStayImages';
import {
  bookingIsCancelled,
  bookingIsUpcoming,
  bookingStatusMeta,
  canCancelBooking,
  formatDate,
  formatINR,
  nightsBetween,
  paymentStatusMeta,
} from '../../components/profile/status';
import { api } from '../../services/api';
import type { Booking } from '../../types';

const TABS = [
  { id: 'all' as const, label: 'All Bookings' },
  { id: 'upcoming' as const, label: 'Upcoming' },
  { id: 'completed' as const, label: 'Completed' },
  { id: 'cancelled' as const, label: 'Cancelled' },
];

export function ProfileBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cancellingId, setCancellingId] = useState('');
  const images = useStayImages();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBookings(await api.getBookings());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const list = bookings.filter((b) => {
      if (tab === 'upcoming') return bookingIsUpcoming(b.status);
      if (tab === 'completed') return b.status === 'completed';
      if (tab === 'cancelled') return bookingIsCancelled(b.status);
      return true;
    });
    return list.sort((a, b) =>
      tab === 'upcoming' ? a.check_in.localeCompare(b.check_in) : b.created_at.localeCompare(a.created_at),
    );
  }, [bookings, tab]);

  async function handleCancel(booking: Booking) {
    const confirmed = window.confirm(
      `Cancel booking ${booking.reference_code}? This cannot be undone. Any refund of your 20% hold is processed to the original payment method.`,
    );
    if (!confirmed) return;
    setCancellingId(booking.id);
    setNotice('');
    try {
      const updated = await api.cancelBooking(booking.id);
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)));
      setNotice(
        updated.refund_note ||
          `Booking ${booking.reference_code} cancelled. If a payment was captured, the refund returns to the original payment method.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel the booking right now.');
    } finally {
      setCancellingId('');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-tide">Reservations</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">My Bookings</h1>
        <p className="mt-1 text-sm text-ink-2">Every reservation linked to your account, newest first.</p>
      </div>

      <div className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-paper-2 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              'rounded-full px-4 py-1.5 text-xs font-semibold transition-all ' +
              (tab === t.id ? 'bg-tide text-white shadow-sm' : 'text-ink-2 hover:text-ink')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {notice ? (
        <p className="rounded-xl border border-tide/30 bg-tide/10 px-4 py-3 text-sm font-medium text-ink">{notice}</p>
      ) : null}
      {error ? <p className="text-sm font-medium text-err">{error}</p> : null}

      {loading ? (
        <div className="space-y-3">
          <div className="h-28 animate-pulse rounded-3xl border border-line bg-paper-2" />
          <div className="h-28 animate-pulse rounded-3xl border border-line bg-paper-2" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-line bg-elevated px-6 py-14 text-center">
          <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-tide-glow/15 blur-3xl" />
          <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-tide/10 text-tide">
            <CalendarCheck className="h-6 w-6" />
          </span>
          <h3 className="relative mt-4 font-display text-lg font-semibold text-ink">Nothing here yet</h3>
          <p className="relative mx-auto mt-1.5 max-w-sm text-sm text-ink-2">
            {tab === 'all'
              ? 'When you reserve a stay it will appear here with its travel dates, payment state and status.'
              : 'No bookings in this view right now. Try another tab or explore new stays.'}
          </p>
          <Link
            to="/"
            className="relative mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-tide px-6 text-sm font-semibold text-white transition-colors hover:bg-tide-2"
          >
            Explore stays
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((booking) => {
            const status = bookingStatusMeta(booking.status);
            const payment = paymentStatusMeta(booking.payment_status);
            const nights = nightsBetween(booking.check_in, booking.check_out);
            const cancellable = canCancelBooking(booking);
            return (
              <article
                key={booking.id}
                className="group overflow-hidden rounded-3xl border border-line bg-elevated shadow-[0_1px_2px_rgba(22,34,46,0.04),0_18px_40px_-30px_rgba(22,34,46,0.3)] transition-all duration-micro hover:border-tide/30"
              >
                <div className="flex flex-col sm:flex-row">
                  {images[booking.homestay_id] ? (
                    <img
                      src={images[booking.homestay_id]}
                      alt={booking.homestay_title || 'Stay'}
                      className="h-36 w-full object-cover sm:h-auto sm:w-44"
                    />
                  ) : (
                    <div className="flex h-36 w-full items-center justify-center bg-paper-2 sm:h-auto sm:w-44">
                      <MapPin className="h-6 w-6 text-ink-3" />
                    </div>
                  )}

                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-lg font-semibold text-ink">
                          {booking.homestay_title || 'Gokarna stay'}
                        </h3>
                        <p className="text-xs text-ink-3">
                          {booking.reference_code} · {booking.location_display || 'Gokarna, Karnataka'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${status.className}`}
                        >
                          {status.label}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${payment.className}`}
                        >
                          {payment.label}
                        </span>
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                      <div>
                        <dt className="font-mono uppercase tracking-wide text-ink-3">Travel date</dt>
                        <dd className="mt-0.5 font-semibold text-ink">
                          {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-mono uppercase tracking-wide text-ink-3">Guests</dt>
                        <dd className="mt-0.5 inline-flex items-center gap-1 font-semibold text-ink">
                          <Users className="h-3.5 w-3.5 text-ink-3" />
                          {booking.guests_count} · {nights} {nights === 1 ? 'night' : 'nights'}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-mono uppercase tracking-wide text-ink-3">Booked on</dt>
                        <dd className="mt-0.5 font-semibold text-ink">{formatDate(booking.created_at)}</dd>
                      </div>
                      <div>
                        <dt className="font-mono uppercase tracking-wide text-ink-3">Total</dt>
                        <dd className="mt-0.5 font-semibold text-ink">{formatINR(booking.total_amount)}</dd>
                      </div>
                    </dl>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                      <p className="text-xs text-ink-3">
                        <span className="font-semibold text-ok">{formatINR(booking.advance_paid)}</span> paid
                        {booking.balance_payable_at_property > 0 ? (
                          <>
                            {' '}
                            · <span className="font-semibold text-warn">{formatINR(booking.balance_payable_at_property)}</span>{' '}
                            at property
                          </>
                        ) : null}
                      </p>
                      <div className="flex items-center gap-2">
                        {cancellable ? (
                          <button
                            type="button"
                            onClick={() => handleCancel(booking)}
                            disabled={cancellingId === booking.id}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-err/40 bg-err/10 px-3.5 text-xs font-semibold text-err transition-colors hover:bg-err/20 disabled:opacity-60"
                          >
                            {cancellingId === booking.id ? 'Cancelling…' : 'Cancel Booking'}
                          </button>
                        ) : null}
                        <Link
                          to={`/profile/bookings/${booking.reference_code}`}
                          className="inline-flex h-9 items-center justify-center rounded-lg bg-tide px-4 text-xs font-semibold text-white transition-colors hover:bg-tide-2"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
