import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { api } from '../services/api';
import type { Booking } from '../types';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { SearchField } from '../components/ui/Input';
import { BookingFileDrawer, BookingStatusBadge } from '../components/BookingFileDrawer';
import { useLiveRefresh } from '../lib/live';
import { cn } from '../lib/cn';

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

function fmtShort(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function nights(b: Booking): number {
  const a = new Date(`${b.check_in}T00:00:00`).getTime();
  const c = new Date(`${b.check_out}T00:00:00`).getTime();
  return Math.max(0, Math.round((c - a) / 86400000));
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

type View = 'stays' | 'table';
type StatusFilter = 'all' | 'awaiting_host' | 'confirmed';
type DateFilter = 'all' | 'weekend' | '7d' | '30d';
type PropChip = 'all' | 'active' | 'attention';

const METRIC_TONES: Record<string, string> = {
  total: 'text-ink',
  awaiting: 'text-warn',
  confirmed: 'text-ok',
  holds: 'text-tide',
};

export function AdminBookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('stays');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [loc, setLoc] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [propChip, setPropChip] = useState<PropChip>('all');
  const [selected, setSelected] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);

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

  const today = toISO(new Date());

  const weekendStart = useMemo(() => {
    const d = new Date();
    let diff = (5 - d.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    const fri = new Date(d);
    fri.setDate(d.getDate() + diff);
    return toISO(fri);
  }, []);

  const locations = useMemo(
    () => Array.from(new Set(bookings.map((b) => b.location_display).filter(Boolean))).sort(),
    [bookings],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = bookings;
    if (q) {
      out = out.filter((b) =>
        [b.reference_code, b.user_name, b.user_phone, b.user_email, b.homestay_title, b.location_display, b.host_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }
    if (status !== 'all') out = out.filter((b) => b.status === status);
    if (loc !== 'all') out = out.filter((b) => b.location_display === loc);
    if (dateFilter === '7d') out = out.filter((b) => b.check_in >= today && b.check_in < addDays(today, 7));
    if (dateFilter === '30d') out = out.filter((b) => b.check_in >= today && b.check_in < addDays(today, 30));
    if (dateFilter === 'weekend') out = out.filter((b) => b.check_in >= weekendStart && b.check_in < addDays(weekendStart, 2));
    return out;
  }, [bookings, query, status, loc, dateFilter, today, weekendStart]);

  const groups = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of filtered) {
      if (!map.has(b.homestay_id)) map.set(b.homestay_id, []);
      map.get(b.homestay_id)!.push(b);
    }
    let out = Array.from(map.entries()).map(([id, list]) => ({
      id,
      title: list[0].homestay_title ?? 'Stay',
      location: list[0].location_display ?? '',
      host: list[0].host_name ?? '',
      image: list[0].stay_image ?? '',
      count: list.length,
      awaiting: list.filter((b) => b.status === 'awaiting_host').length,
      holds: list.reduce((a, b) => a + b.advance_paid, 0),
      active: list.some((b) => b.status !== 'declined' && b.status !== 'cancelled' && b.check_in >= today),
    }));
    if (propChip === 'active') out = out.filter((s) => s.active);
    if (propChip === 'attention') out = out.filter((s) => s.awaiting > 0);
    return out;
  }, [filtered, propChip, today]);

  const tableRows = useMemo(() => [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at)), [filtered]);

  const summary = useMemo(
    () => ({
      total: bookings.length,
      awaiting: bookings.filter((b) => b.status === 'awaiting_host').length,
      confirmed: bookings.filter((b) => b.status === 'confirmed').length,
      holds: bookings.reduce((a, b) => a + b.advance_paid, 0),
    }),
    [bookings],
  );

  async function setStatusFor(b: Booking, statusTo: Booking['status']) {
    setBusy(true);
    try {
      const updated = await api.setBookingStatus(b.id, statusTo);
      setBookings((list) => list.map((x) => (x.id === b.id ? updated : x)));
      setSelected(updated.status === 'awaiting_host' ? updated : null);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  const metricChips = [
    { key: 'all', label: 'Total', value: summary.total, tone: METRIC_TONES.total },
    { key: 'awaiting_host', label: 'Awaiting', value: summary.awaiting, tone: METRIC_TONES.awaiting },
    { key: 'confirmed', label: 'Confirmed', value: summary.confirmed, tone: METRIC_TONES.confirmed },
  ] as const;

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="overline">Network bookings</p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {view === 'stays' ? 'Bookings by property' : 'All bookings'}
          </h1>
          <p className="mt-2 text-sm text-ink-2">
            {view === 'stays'
              ? 'Every hold grouped under its homestay — tap one to open the ledger.'
              : 'A chronological ledger of every booking, newest first.'}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-line bg-paper-2 p-1">
          <button
            onClick={() => setView('stays')}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-semibold transition-colors',
              view === 'stays' ? 'bg-tide text-white shadow' : 'text-ink-2 hover:text-ink',
            )}
          >
            View by stay
          </button>
          <button
            onClick={() => setView('table')}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-semibold transition-colors',
              view === 'table' ? 'bg-tide text-white shadow' : 'text-ink-2 hover:text-ink',
            )}
          >
            All bookings table
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {metricChips.map((m) => (
          <button
            key={m.key}
            onClick={() => setStatus(m.key)}
            className={cn(
              'rounded-xl border px-3.5 py-2 text-left transition-all',
              status === m.key ? 'border-tide bg-tide/5 ring-1 ring-tide/40' : 'border-line bg-elevated hover:border-line-2',
            )}
          >
            <p className={cn('font-mono-data text-lg font-bold leading-5', m.tone)}>{m.value}</p>
            <p className="font-mono text-[9px] uppercase tracking-wider text-ink-3">{m.label}</p>
          </button>
        ))}
        <div
          className="rounded-xl border border-line bg-elevated px-3.5 py-2 text-left"
          title="Total advance escrow collected online from guests (20% holds). The balance is paid directly at the property."
        >
          <p className="flex items-center gap-1 font-mono-data text-lg font-bold leading-5 text-tide">
            ₹{fmtMoney(summary.holds)}
            <Icon icon="lucide:info" className="h-3 w-3 text-ink-3" />
          </p>
          <p className="font-mono text-[9px] uppercase tracking-wider text-ink-3">Escrow held</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-elevated p-3">
        <SearchField
          placeholder="Search guest, code, stay, phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-72"
        />
        <select
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          aria-label="Filter by location"
          className="h-9 rounded-lg border border-line-2 bg-elevated px-2.5 font-mono text-[11px] font-semibold text-ink transition-colors focus:border-tide focus:outline-none"
        >
          <option value="all">All beaches</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          aria-label="Filter by check-in date"
          className="h-9 rounded-lg border border-line-2 bg-elevated px-2.5 font-mono text-[11px] font-semibold text-ink transition-colors focus:border-tide focus:outline-none"
        >
          <option value="all">All dates</option>
          <option value="weekend">This weekend</option>
          <option value="7d">Next 7 days</option>
          <option value="30d">Next 30 days</option>
        </select>
        {view === 'stays' && (
          <div className="flex items-center gap-1">
            {(
              [
                { key: 'all', label: 'All stays' },
                { key: 'active', label: 'Active stays' },
                { key: 'attention', label: 'Needs attention' },
              ] as { key: PropChip; label: string }[]
            ).map((c) => (
              <button
                key={c.key}
                onClick={() => setPropChip(c.key)}
                className={cn(
                  'rounded-full px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors',
                  propChip === c.key ? 'bg-tide text-white' : 'text-ink-2 hover:bg-paper-2 hover:text-ink',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={<Icon icon="lucide:book-open" className="h-6 w-6" />}
          overline="Quiet for now"
          title="No bookings yet"
          description="Guest holds will appear here as travelers reserve stays."
        />
      ) : view === 'stays' ? (
        groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-2 bg-paper-2 p-12 text-center">
            <Icon icon="lucide:search" className="mx-auto h-6 w-6 text-ink-3" />
            <p className="mt-3 text-sm font-semibold text-ink">No homestays match your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate(`/bookings/${s.id}`)}
                className="group overflow-hidden rounded-2xl border border-line bg-elevated text-left transition-all hover:-translate-y-0.5 hover:border-tide/50 hover:shadow-lg"
              >
                <div className="relative h-36 overflow-hidden bg-paper-2">
                  {s.image ? (
                    <img
                      src={s.image}
                      alt={s.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Icon icon="lucide:waves" className="h-8 w-8 text-ink-3" />
                    </div>
                  )}
                  <span className="absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 font-mono text-[10px] font-semibold text-white backdrop-blur-md">
                    <Icon icon="lucide:book-open" className="h-3 w-3" />
                    {s.count} booking{s.count === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="space-y-2.5 p-4">
                  <div>
                    <h2 className="truncate font-display text-lg font-semibold text-ink group-hover:text-tide">{s.title}</h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
                      <Icon icon="lucide:map-pin" className="h-3 w-3 text-tide" />
                      {s.location}
                      <span className="text-ink-3">·</span>
                      host{' '}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/hosts');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.stopPropagation();
                            navigate('/hosts');
                          }
                        }}
                        className="font-semibold text-tide underline-offset-2 hover:underline"
                      >
                        {s.host}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-line pt-3">
                    <div className="flex items-center gap-2">
                      {s.awaiting > 0 && <Badge variant="solid">{s.awaiting} awaiting</Badge>}
                      <div title="Total advance escrow held across this stay's bookings">
                        <p className="font-mono text-[9px] uppercase tracking-wider text-ink-3">Held</p>
                        <p className="font-mono-data text-sm font-semibold text-gold">₹{fmtMoney(s.holds)}</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 font-mono text-[10px] font-semibold text-ink-3 transition-colors group-hover:text-tide">
                      view ledger
                      <Icon icon="lucide:arrow-right" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      ) : tableRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-2 bg-paper-2 p-12 text-center">
          <Icon icon="lucide:search" className="mx-auto h-6 w-6 text-ink-3" />
          <p className="mt-3 text-sm font-semibold text-ink">No bookings match your filters</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-elevated">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-line bg-paper-2 font-mono text-[9px] uppercase tracking-wider text-ink-3">
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Stay</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Guests</th>
                  <th className="px-4 py-3">Advance</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tableRows.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => setSelected(b)}
                    className="cursor-pointer transition-colors hover:bg-paper-2/60"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-ink">{b.user_name}</p>
                      <p className="font-mono text-[10px] text-ink-3">
                        {b.reference_code} · {b.user_phone}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[220px] truncate text-sm font-semibold text-ink">{b.homestay_title}</p>
                      <p className="font-mono text-[10px] text-ink-3">{b.location_display}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-[11px] text-ink">
                        {fmtShort(b.check_in)} → {fmtShort(b.check_out)}
                      </p>
                      <p className="font-mono text-[10px] text-ink-3">{nights(b)} night{nights(b) === 1 ? '' : 's'}</p>
                    </td>
                    <td className="px-4 py-3 font-mono-data text-sm text-ink">{b.guests_count}</td>
                    <td className="px-4 py-3 font-mono-data text-sm font-semibold text-ok">₹{fmtMoney(b.advance_paid)}</td>
                    <td className="px-4 py-3 font-mono-data text-sm font-semibold text-ember">₹{fmtMoney(b.balance_payable_at_property)}</td>
                    <td className="px-4 py-3">
                      <BookingStatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Icon icon="lucide:arrow-up-right" className="h-4 w-4 text-ink-3" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <BookingFileDrawer
        booking={selected}
        busy={busy}
        onClose={() => setSelected(null)}
        onStatusChange={(b, statusTo) => setStatusFor(b, statusTo)}
      />
    </div>
  );
}
