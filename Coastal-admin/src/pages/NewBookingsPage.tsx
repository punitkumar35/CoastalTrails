import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { api } from '../services/api';
import type { Booking } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { SearchField } from '../components/ui/Input';
import { BookingFileDrawer } from '../components/BookingFileDrawer';
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

export default function NewBookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Booking | null>(null);

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
      .then(setBookings)
      .catch((err) => console.error(err));
  }, 10000);

  const pending = useMemo(() => bookings.filter((b) => b.status === 'awaiting_host'), [bookings]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pending;
    return pending.filter((b) =>
      [b.reference_code, b.user_name, b.user_phone, b.user_email, b.homestay_title, b.location_display]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [pending, query]);

  async function setStatus(b: Booking, status: Booking['status']) {
    setBusyId(b.id);
    try {
      const updated = await api.setBookingStatus(b.id, status);
      setBookings((list) => list.map((x) => (x.id === b.id ? updated : x)));
      setSelected(updated.status === 'awaiting_host' ? updated : null);
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="overline flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              <Icon icon="lucide:inbox" className="h-3.5 w-3.5 text-warn" />
              Review requests
            </span>
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">New bookings</h1>
          <p className="mt-2 text-sm text-ink-2">
            <span className="font-mono-data font-semibold text-ink">{pending.length}</span> booking{pending.length === 1 ? '' : 's'} waiting for host confirmation
          </p>
        </div>
        <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:items-end">
          <SearchField
            placeholder="Search guest, code, stay…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-80"
          />
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl border border-line bg-elevated px-3.5 py-2 text-center">
              <p className="font-mono-data text-lg font-semibold leading-5 text-ink">{pending.length}</p>
              <p className="font-mono text-[9px] uppercase tracking-wider text-ink-3">Awaiting</p>
            </div>
            <div className="rounded-xl border border-line bg-elevated px-3.5 py-2 text-center">
              <p className="font-mono-data text-lg font-semibold leading-5 text-gold">
                ₹{fmtMoney(pending.reduce((a, b) => a + b.advance_paid, 0))}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-wider text-ink-3">Holds on the line</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : pending.length === 0 ? (
        <EmptyState
          icon={<Icon icon="lucide:inbox" className="h-6 w-6" />}
          overline="All clear"
          title="No new bookings"
          description="Every hold has been reviewed. New requests will land here the moment travelers book."
        />
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-2 bg-paper-2 p-12 text-center">
          <Icon icon="lucide:search" className="mx-auto h-6 w-6 text-ink-3" />
          <p className="mt-3 text-sm font-semibold text-ink">No new bookings match "{query}"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((b) => (
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
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-warn to-[color-mix(in_oklab,var(--c-warn)_55%,var(--c-ink))] font-display text-base font-semibold text-white">
                  {b.user_name[0] ?? '?'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">{b.reference_code}</span>
                    <Badge variant="solid">Awaiting host</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-sm font-semibold text-ink">{b.user_name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] text-ink-3">
                    <span className="flex items-center gap-1">
                      <Icon icon="lucide:waves" className="h-2.5 w-2.5 text-tide" />
                      {b.homestay_title}
                    </span>
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
                  <p className="font-mono text-[9px] text-ink-3">hold ₹{fmtMoney(b.advance_paid)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === b.id}
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
                    disabled={busyId === b.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStatus(b, 'declined');
                    }}
                    className={cn('gap-1.5', busyId !== b.id && 'text-err hover:border-err hover:text-err')}
                  >
                    <Icon icon="lucide:x" className="h-3.5 w-3.5" />
                    Decline
                  </Button>
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
          ))}
        </div>
      )}

      <BookingFileDrawer
        booking={selected}
        busy={busyId !== ''}
        onClose={() => setSelected(null)}
        onStatusChange={(b, status) => setStatus(b, status)}
      />

      <button
        onClick={() => navigate('/bookings')}
        className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-ink-3 transition-colors hover:text-tide"
      >
        <Icon icon="lucide:arrow-left" className="h-3.5 w-3.5" />
        All bookings
      </button>
    </div>
  );
}
