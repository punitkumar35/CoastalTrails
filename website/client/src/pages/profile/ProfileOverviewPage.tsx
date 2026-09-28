import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarCheck,
  Compass,
  IndianRupee,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react';
import { useStayImages } from '../../components/profile/useStayImages';
import {
  bookingIsUpcoming,
  bookingStatusMeta,
  formatDate,
  formatINR,
  nightsBetween,
  paymentStatusMeta,
} from '../../components/profile/status';
import { api } from '../../services/api';
import type { Booking } from '../../types';

export function ProfileOverviewPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const images = useStayImages();

  useEffect(() => {
    api
      .getBookings()
      .then(setBookings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const upcoming = useMemo(
    () =>
      bookings
        .filter((b) => bookingIsUpcoming(b.status))
        .sort((a, b) => a.check_in.localeCompare(b.check_in)),
    [bookings],
  );
  const completed = useMemo(() => bookings.filter((b) => b.status === 'completed'), [bookings]);
  const totalSpent = useMemo(
    () => bookings.reduce((sum, b) => sum + (Number(b.advance_paid) || 0), 0),
    [bookings],
  );
  const recent = useMemo(
    () => [...bookings].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
    [bookings],
  );

  const stats = [
    { label: 'Total bookings', value: String(bookings.length), Icon: CalendarCheck, to: '/profile/bookings' },
    { label: 'Upcoming trips', value: String(upcoming.length), Icon: Compass, to: '/profile/bookings' },
    { label: 'Completed trips', value: String(completed.length), Icon: BadgeCheck, to: '/profile/bookings' },
    { label: 'Total spent', value: formatINR(totalSpent), Icon: IndianRupee, to: '/profile/payments' },
  ];

  return (
    <div className="space-y-10">
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.to}
            className="group rounded-2xl border border-line bg-elevated p-4 shadow-[0_1px_2px_rgba(22,34,46,0.04),0_16px_32px_-24px_rgba(22,34,46,0.25)] transition-all duration-micro hover:-translate-y-0.5 hover:border-tide/40 sm:p-5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tide/10 text-tide">
              <stat.Icon className="h-4 w-4" />
            </span>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
              {stat.value}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-ink-3">
              {stat.label}
              <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </p>
          </Link>
        ))}
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-tide">Coming up</p>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              Your upcoming trips
            </h2>
          </div>
          <Link to="/profile/bookings" className="shrink-0 text-xs font-semibold text-tide hover:underline">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="mt-5 h-40 animate-pulse rounded-3xl border border-line bg-paper-2" />
        ) : upcoming.length === 0 ? (
          <div className="relative mt-5 overflow-hidden rounded-3xl border border-line bg-elevated px-6 py-14 text-center">
            <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-tide-glow/15 blur-3xl" />
            <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-tide/10 text-tide">
              <Compass className="h-6 w-6" />
            </span>
            <h3 className="relative mt-4 font-display text-lg font-semibold text-ink">No upcoming trips yet</h3>
            <p className="relative mx-auto mt-1.5 max-w-sm text-sm text-ink-2">
              Gokarna's cliff coves are waiting. Browse family-run stays and lock your dates with a 20% hold.
            </p>
            <Link
              to="/"
              className="relative mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-tide px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-tide-2"
            >
              <Sparkles className="h-4 w-4" />
              Explore destinations
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {upcoming.map((booking) => {
              const status = bookingStatusMeta(booking.status);
              const payment = paymentStatusMeta(booking.payment_status);
              const nights = nightsBetween(booking.check_in, booking.check_out);
              return (
                <article
                  key={booking.id}
                  className="group overflow-hidden rounded-3xl border border-line bg-elevated shadow-[0_1px_2px_rgba(22,34,46,0.04),0_20px_44px_-30px_rgba(22,34,46,0.35)] transition-all duration-micro hover:-translate-y-0.5 hover:border-tide/30"
                >
                  <div className="relative h-44 overflow-hidden">
                    {images[booking.homestay_id] ? (
                      <img
                        src={images[booking.homestay_id]}
                        alt={booking.homestay_title || 'Stay'}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-paper-2">
                        <MapPin className="h-6 w-6 text-ink-3" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" />
                    <span
                      className={`absolute left-4 top-4 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur ${status.className}`}
                    >
                      {status.label}
                    </span>
                    <div className="absolute inset-x-4 bottom-3 text-white">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/70">
                        {booking.reference_code}
                      </p>
                      <h3 className="mt-0.5 truncate font-display text-lg font-semibold">
                        {booking.homestay_title || 'Gokarna stay'}
                      </h3>
                      <p className="text-xs text-white/75">{booking.location_display || 'Gokarna, Karnataka'}</p>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:grid-cols-3">
                      <div>
                        <dt className="font-mono uppercase tracking-wide text-ink-3">Check-in</dt>
                        <dd className="mt-0.5 font-semibold text-ink">{formatDate(booking.check_in)}</dd>
                      </div>
                      <div>
                        <dt className="font-mono uppercase tracking-wide text-ink-3">Check-out</dt>
                        <dd className="mt-0.5 font-semibold text-ink">{formatDate(booking.check_out)}</dd>
                      </div>
                      <div>
                        <dt className="font-mono uppercase tracking-wide text-ink-3">Guests</dt>
                        <dd className="mt-0.5 inline-flex items-center gap-1 font-semibold text-ink">
                          <Users className="h-3.5 w-3.5 text-ink-3" />
                          {booking.guests_count} · {nights} {nights === 1 ? 'night' : 'nights'}
                        </dd>
                      </div>
                    </dl>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                      <div className="text-xs text-ink-3">
                        <span className="font-semibold text-ink">{formatINR(booking.total_amount)}</span> total ·{' '}
                        <span className="font-semibold text-ok">{formatINR(booking.advance_paid)}</span> paid
                        {booking.balance_payable_at_property > 0 ? (
                          <>
                            {' '}
                            · <span className="font-semibold text-warn">{formatINR(booking.balance_payable_at_property)}</span>{' '}
                            at property
                          </>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${payment.className}`}
                        >
                          {payment.label}
                        </span>
                        <Link
                          to={`/profile/bookings/${booking.reference_code}`}
                          className="inline-flex h-9 items-center justify-center rounded-lg bg-tide px-4 text-xs font-semibold text-white transition-colors hover:bg-tide-2"
                        >
                          View booking
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-tide">Activity</p>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              Recent booking activity
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="mt-5 h-24 animate-pulse rounded-2xl border border-line bg-paper-2" />
        ) : recent.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-line-2 bg-paper-2 px-5 py-8 text-center text-sm text-ink-3">
            Your booking activity will appear here after your first reservation.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-elevated">
            {recent.map((booking) => {
              const status = bookingStatusMeta(booking.status);
              return (
                <li key={booking.id}>
                  <Link
                    to={`/profile/bookings/${booking.reference_code}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-paper-2"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${status.className}`}
                    >
                      {booking.status === 'completed' ? '✓' : booking.status === 'cancelled' ? '✕' : '•'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {booking.homestay_title || 'Gokarna stay'}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-3">
                        {booking.reference_code} · Booked {formatDate(booking.created_at)} ·{' '}
                        {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-sm font-semibold text-ink">{formatINR(booking.total_amount)}</p>
                      <p className="text-[11px] text-ink-3">{status.label}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-3" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
