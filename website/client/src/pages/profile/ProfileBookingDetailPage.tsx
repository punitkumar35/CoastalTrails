import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Users } from 'lucide-react';
import { useStayImages } from '../../components/profile/useStayImages';
import {
  bookingStatusMeta,
  canCancelBooking,
  formatDate,
  formatDateTime,
  formatINR,
  nightsBetween,
  paymentRecordStatusMeta,
  paymentStatusMeta,
} from '../../components/profile/status';
import { api } from '../../services/api';
import type { Booking, BookingPayment } from '../../types';

export function ProfileBookingDetailPage() {
  const { refCode } = useParams<{ refCode: string }>();
  const navigate = useNavigate();
  const images = useStayImages();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [payments, setPayments] = useState<BookingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!refCode) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.getBooking(refCode);
      setBooking(data);
      try {
        setPayments(await api.getBookingPayments(refCode));
      } catch {
        setPayments([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this booking.');
    } finally {
      setLoading(false);
    }
  }, [refCode]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCancel() {
    if (!booking) return;
    const confirmed = window.confirm(
      `Cancel booking ${booking.reference_code}? This cannot be undone. Any refund of your 20% hold is processed to the original payment method.`,
    );
    if (!confirmed) return;
    setCancelling(true);
    setNotice('');
    try {
      const updated = await api.cancelBooking(booking.id);
      setBooking(updated);
      setNotice(
        updated.refund_note ||
          'Your booking is cancelled. If a payment was captured, the refund will return to the original payment method.',
      );
      setPayments(await api.getBookingPayments(updated.reference_code).catch(() => []));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not cancel the booking right now.');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-3">Loading booking…</p>;
  }

  if (error || !booking) {
    return (
      <div className="rounded-2xl border border-line bg-elevated px-6 py-12 text-center">
        <h2 className="font-display text-lg font-semibold text-ink">Booking not available</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-2">
          {error || 'This booking does not exist or does not belong to your account.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/profile/bookings')}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-line-2 bg-elevated px-5 text-sm font-semibold text-ink hover:border-tide hover:text-tide"
        >
          Back to my bookings
        </button>
      </div>
    );
  }

  const status = bookingStatusMeta(booking.status);
  const payment = paymentStatusMeta(booking.payment_status);
  const nights = nightsBetween(booking.check_in, booking.check_out);
  const cancellable = canCancelBooking(booking);

  return (
    <div className="space-y-6">
      <Link to="/profile/bookings" className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2 hover:text-tide">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to my bookings
      </Link>

      <div className="overflow-hidden rounded-2xl border border-line bg-elevated">
        <div className="flex flex-col sm:flex-row">
          {images[booking.homestay_id] ? (
            <img
              src={images[booking.homestay_id]}
              alt={booking.homestay_title || 'Stay'}
              className="h-44 w-full object-cover sm:h-auto sm:w-56"
            />
          ) : (
            <div className="flex h-44 w-full items-center justify-center bg-paper-2 sm:h-auto sm:w-56">
              <MapPin className="h-6 w-6 text-ink-3" />
            </div>
          )}
          <div className="flex-1 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-wide text-ink-3">Booking {booking.reference_code}</p>
                <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
                  {booking.homestay_title || 'Gokarna stay'}
                </h1>
                <p className="text-xs text-ink-3">{booking.location_display || 'Gokarna, Karnataka'}</p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${status.className}`}>
                  {status.label}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${payment.className}`}>
                  {payment.label}
                </span>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-ink-3">Check-in</dt>
                <dd className="font-semibold text-ink">{formatDate(booking.check_in)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Check-out</dt>
                <dd className="font-semibold text-ink">{formatDate(booking.check_out)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Nights</dt>
                <dd className="font-semibold text-ink">{nights}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Guests</dt>
                <dd className="inline-flex items-center gap-1 font-semibold text-ink">
                  <Users className="h-3.5 w-3.5 text-ink-3" />
                  {booking.guests_count}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Booked on</dt>
                <dd className="font-semibold text-ink">{formatDateTime(booking.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Guest name</dt>
                <dd className="font-semibold text-ink">{booking.user_name}</dd>
              </div>
              {booking.room_number ? (
                <div>
                  <dt className="text-xs text-ink-3">Room</dt>
                  <dd className="font-semibold text-ink">{booking.room_number}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-line p-6 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-paper-2 p-4">
            <p className="text-xs text-ink-3">Total amount</p>
            <p className="mt-1 font-display text-xl font-semibold text-ink">{formatINR(booking.total_amount)}</p>
          </div>
          <div className="rounded-xl border border-line bg-paper-2 p-4">
            <p className="text-xs text-ink-3">Amount paid</p>
            <p className="mt-1 font-display text-xl font-semibold text-ok">{formatINR(booking.advance_paid)}</p>
          </div>
          <div className="rounded-xl border border-line bg-paper-2 p-4">
            <p className="text-xs text-ink-3">Balance at property</p>
            <p className="mt-1 font-display text-xl font-semibold text-ink">
              {formatINR(booking.balance_payable_at_property)}
            </p>
          </div>
        </div>
      </div>

      {notice ? (
        <p className="rounded-xl border border-tide/30 bg-tide/10 px-4 py-3 text-sm text-ink">{notice}</p>
      ) : null}

      <section className="rounded-2xl border border-line bg-elevated p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Payment history</h2>
        {payments.length === 0 ? (
          <p className="mt-2 text-sm text-ink-2">
            No payment records yet. Payments appear here once a gateway transaction is initiated on this booking.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {payments.map((p) => {
              const pStatus = paymentRecordStatusMeta(p.status);
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{formatINR(p.amount)}</p>
                    <p className="text-xs text-ink-3">
                      {p.method ? p.method.toUpperCase() : 'Payment'} · {formatDateTime(p.created_at)}
                      {p.paid_at ? ` · paid ${formatDateTime(p.paid_at)}` : ''}
                      {p.refunded_at ? ` · refunded ${formatDateTime(p.refunded_at)}` : ''}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${pStatus.className}`}>
                    {pStatus.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {booking.status === 'cancelled' && booking.payment_status === 'refunded' ? (
        <p className="rounded-xl border border-tide/30 bg-tide/10 px-4 py-3 text-sm text-ink">
          This booking was cancelled and the captured hold payment is marked refunded. Refunds reach the original payment
          method as per the gateway timeline.
        </p>
      ) : null}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper-2 p-6">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">Need to change something?</h2>
          <p className="text-xs text-ink-2">
            {cancellable
              ? 'Stays can be cancelled before the check-in date. Your 20% hold is refunded to the original payment method if captured.'
              : 'This booking can no longer be cancelled online. Contact support with your booking ID and we will help.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/profile/support"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-line-2 bg-elevated px-4 text-sm font-semibold text-ink transition-colors hover:border-tide hover:text-tide"
          >
            Get support
          </Link>
          {cancellable ? (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-err/40 bg-err/10 px-4 text-sm font-semibold text-err transition-colors hover:bg-err/20 disabled:opacity-60"
            >
              {cancelling ? 'Cancelling…' : 'Cancel booking'}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
