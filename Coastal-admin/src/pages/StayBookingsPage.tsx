import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { api } from '../services/api';
import type { Booking } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { SearchField } from '../components/ui/Input';
import { BookingFileDrawer, BookingStatusBadge } from '../components/BookingFileDrawer';
import { useLiveRefresh } from '../lib/live';
import { cn } from '../lib/cn';

function fmtShort(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

function nights(b: Booking): number {
  const a = new Date(`${b.check_in}T00:00:00`).getTime();
  const c = new Date(`${b.check_out}T00:00:00`).getTime();
  return Math.max(0, Math.round((c - a) / 86400000));
}

const STATUS_ICON: Record<string, string> = {
  awaiting_host: 'lucide:clock',
  confirmed: 'lucide:check',
  declined: 'lucide:x',
  cancelled: 'lucide:ban',
};

const STATUS_TONE: Record<string, string> = {
  awaiting_host: 'text-warn',
  confirmed: 'text-ok',
  declined: 'text-err',
  cancelled: 'text-ink-3',
};

export default function StayBookingsPage() {
  const { stayId = '' } = useParams();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api
      .getAllBookings()
      .then(setBookings)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useLiveRefresh(() => {
    api
      .getAllBookings()
      .then((list) => {
        setBookings(list);
        setSelected((prev) => (prev ? list.find((b) => b.id === prev.id) ?? prev : prev));
      })
      .catch((err) => console.error(err));
  }, 15000);

  const stay = useMemo(() => bookings.find((b) => b.homestay_id === stayId), [bookings, stayId]);
  const stayBookings = useMemo(() => bookings.filter((b) => b.homestay_id === stayId), [bookings, stayId]);

  const visibleBookings = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stayBookings;
    return stayBookings.filter((b) =>
      [b.reference_code, b.user_name, b.user_phone, b.user_email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [stayBookings, query]);

  async function setStatus(b: Booking, status: Booking['status']) {
    setBusy(true);
    try {
      const updated = await api.setBookingStatus(b.id, status);
      setBookings((list) => list.map((x) => (x.id === b.id ? updated : x)));
      setSelected(updated.status === 'awaiting_host' ? updated : null);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  if (!stay) {
    return (
      <div className="rounded-2xl border border-dashed border-line-2 bg-paper-2 p-12 text-center">
        <p className="text-sm font-semibold text-err">This homestay has no bookings.</p>
        <Button className="mt-4" onClick={() => navigate('/bookings')} variant="secondary">
          Back to bookings
        </Button>
      </div>
    );
  }

  const chips = [
    { label: 'Total', value: String(stayBookings.length) },
    { label: 'Awaiting', value: String(stayBookings.filter((b) => b.status === 'awaiting_host').length) },
    { label: 'Confirmed', value: String(stayBookings.filter((b) => b.status === 'confirmed').length) },
    { label: 'Holds', value: `₹${fmtMoney(stayBookings.reduce((a, b) => a + b.advance_paid, 0))}` },
  ];

  return (
    <div className="w-full space-y-5">
      <button
        onClick={() => navigate('/bookings')}
        className="flex items-center gap-1.5 text-xs font-semibold text-ink-2 transition-colors hover:text-tide"
      >
        <Icon icon="lucide:arrow-left" className="h-3.5 w-3.5" />
        All bookings
      </button>

      <div className="rounded-3xl border border-line bg-elevated p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="overline flex items-center gap-2">
              <Icon icon="lucide:book-open" className="h-3.5 w-3.5 text-tide" />
              Stay bookings
            </p>
            <h1 className="mt-1 truncate font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {stay.homestay_title}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-3">
              <span className="flex items-center gap-1">
                <Icon icon="lucide:map-pin" className="h-3 w-3" />
                {stay.location_display}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Icon icon="lucide:user" className="h-3 w-3" />
                host {stay.host_name}
              </span>
            </p>
          </div>
          <SearchField
            placeholder="Search guest, code, phone, email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-80"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          {chips.map((c) => (
            <div key={c.label} className="rounded-xl border border-line bg-paper-2 px-3.5 py-2 text-center">
              <p className="font-mono-data text-lg font-semibold leading-5 text-ink">{c.value}</p>
              <p className="font-mono text-[9px] uppercase tracking-wider text-ink-3">{c.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {visibleBookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-2 bg-paper-2 p-12 text-center">
            <Icon icon="lucide:search" className="mx-auto h-6 w-6 text-ink-3" />
            <p className="mt-3 text-sm font-semibold text-ink">No bookings match "{query}"</p>
            <p className="mt-1 text-xs text-ink-2">Try a guest name, reference code, phone or email.</p>
          </div>
        ) : (
          visibleBookings.map((b) => (
            <div
              key={b.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(b)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setSelected(b);
              }}
              className="group cursor-pointer rounded-2xl border border-line bg-elevated p-4 transition-all hover:border-tide/50 hover:shadow-md"
            >
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-tide to-tide-2 font-display text-base font-semibold text-white">
                  {b.user_name[0] ?? '?'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">{b.reference_code}</span>
                    <BookingStatusBadge status={b.status} />
                  </div>
                  <p className="mt-0.5 truncate text-sm font-semibold text-ink">{b.user_name}</p>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] text-ink-3">
                    <span className="flex items-center gap-0.5">
                      <Icon icon="lucide:phone" className="h-2.5 w-2.5" />
                      {b.user_phone}
                    </span>
                    {b.user_email && (
                      <span className="flex items-center gap-0.5">
                        <Icon icon="lucide:mail" className="h-2.5 w-2.5" />
                        {b.user_email}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-4 font-mono text-[10px] text-ink-3">
                  <span className="flex items-center gap-1">
                    <Icon icon="lucide:calendar-days" className="h-3 w-3 text-tide" />
                    {fmtShort(b.check_in)} → {fmtShort(b.check_out)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon icon="lucide:users" className="h-3 w-3 text-tide" />
                    {b.guests_count}
                  </span>
                  <span>
                    {nights(b)} night{nights(b) === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-mono-data text-base font-semibold text-ink">₹{fmtMoney(b.total_amount)}</p>
                  <p className="font-mono text-[9px] text-ink-3">
                    hold ₹{fmtMoney(b.advance_paid)} · bal ₹{fmtMoney(b.balance_payable_at_property)}
                  </p>
                  {b.roomSummary && (
                    <p className="mt-1 flex items-center justify-end gap-1.5 font-mono text-[9px] text-ink-3" title="Room status across the stay window">
                      <span className="flex items-center gap-0.5">
                        <Icon icon="lucide:circle-check" className="h-2.5 w-2.5 text-ok" />
                        {b.roomSummary.free}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Icon icon="lucide:calendar-check" className="h-2.5 w-2.5 text-tide" />
                        {b.roomSummary.booked}
                      </span>
                      {b.roomSummary.blocked > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Icon icon="lucide:ban" className="h-2.5 w-2.5 text-err" />
                          {b.roomSummary.blocked}
                        </span>
                      )}
                      {b.roomSummary.maint > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Icon icon="lucide:wrench" className="h-2.5 w-2.5 text-ember" />
                          {b.roomSummary.maint}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {b.status === 'awaiting_host' ? (
                    <>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatus(b, 'confirmed');
                        }}
                        className="gap-1.5"
                      >
                        <Icon icon="lucide:check" className="h-3.5 w-3.5" />
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatus(b, 'declined');
                        }}
                        className="gap-1.5"
                      >
                        <Icon icon="lucide:x" className="h-3.5 w-3.5" />
                        Decline
                      </Button>
                    </>
                  ) : (
                    <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-ink-3">
                      <Icon icon={STATUS_ICON[b.status]} className={cn('h-3.5 w-3.5', STATUS_TONE[b.status])} />
                      Settled
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label="Full file"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(b);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-paper-2 text-ink-2 transition-colors hover:border-tide hover:text-tide"
                  >
                    <Icon icon="lucide:arrow-up-right" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <BookingFileDrawer
        booking={selected}
        busy={busy}
        onClose={() => setSelected(null)}
        onStatusChange={(b, status) => setStatus(b, status)}
      />
    </div>
  );
}
