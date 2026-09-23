import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@iconify/react';
import { api } from '../services/api';
import type { Homestay } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { SearchField } from '../components/ui/Input';
import { Dialog } from '../components/ui/Dialog';
import { useLiveRefresh } from '../lib/live';
import { cn } from '../lib/cn';

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

type StatusFilter = 'all' | 'live' | 'paused' | 'draft';
type View = 'grid' | 'table';

const STATUS_META: Record<'live' | 'paused' | 'draft', { label: string; cls: string; dot: string }> = {
  live: { label: 'Live', cls: 'bg-ok/15 text-ok border-ok/40', dot: 'bg-ok' },
  paused: { label: 'Paused', cls: 'bg-warn/15 text-warn border-warn/40', dot: 'bg-warn' },
  draft: { label: 'Draft', cls: 'bg-ink-3/15 text-ink-2 border-ink-3/40', dot: 'bg-ink-3' },
};

export function AdminStaysPage() {
  const navigate = useNavigate();
  const [stays, setStays] = useState<Homestay[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [loc, setLoc] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [view, setView] = useState<View>('grid');
  const [menu, setMenu] = useState<{ stay: Homestay; x: number; y: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Homestay | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .getAllStays()
      .then(setStays)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useLiveRefresh(() => {
    api
      .getAllStays()
      .then(setStays)
      .catch((err) => console.error(err));
  }, 20000);

  useEffect(() => {
    if (!menu) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenu(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu]);

  const locations = useMemo(
    () => Array.from(new Set(stays.map((s) => s.location_display).filter(Boolean))).sort(),
    [stays],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = stays;
    if (q) {
      out = out.filter((s) =>
        [s.title, s.location_display, s.host_name].filter(Boolean).join(' ').toLowerCase().includes(q),
      );
    }
    if (loc !== 'all') out = out.filter((s) => s.location_display === loc);
    if (statusFilter !== 'all') out = out.filter((s) => (s.status ?? 'live') === statusFilter);
    return out;
  }, [stays, query, loc, statusFilter]);

  const stats = useMemo(() => {
    const totalRooms = stays.reduce((a, s) => a + (s.total_rooms || 0), 0);
    const occupied = stays.reduce((a, s) => a + (s.bookedTonight || 0), 0);
    const avg = stays.length
      ? Math.round(stays.reduce((a, s) => a + (s.price_per_night || 0), 0) / stays.length)
      : 0;
    return { totalRooms, occupied, avg, live: stays.filter((s) => (s.status ?? 'live') === 'live').length };
  }, [stays]);

  async function updateStay(s: Homestay, patch: Partial<Homestay>) {
    setBusy(true);
    try {
      const updated = await api.updateStay(s.id, patch);
      setStays((list) => list.map((x) => (x.id === s.id ? updated : x)));
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
      setMenu(null);
    }
  }

  async function removeStay(s: Homestay) {
    setBusy(true);
    try {
      await api.deleteStay(s.id);
      setStays((list) => list.filter((x) => x.id !== s.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const header = ['Title', 'Location', 'Host', 'Price', 'Rooms', 'Bookings', 'Blocked dates', 'Rating', 'Reviews', 'Status'];
    const rows = filtered.map((s) => [
      s.title,
      s.location_display,
      s.host_name,
      String(s.price_per_night),
      String(s.total_rooms),
      String(s.bookingsCount ?? 0),
      String(s.blockedDates.length),
      String(s.rating),
      String(s.reviews_count),
      s.status ?? 'live',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coastal-trails-stays.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function openMenu(e: React.MouseEvent, s: Homestay) {
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ stay: s, x: r.right - 8, y: r.bottom + 6 });
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="overline">Network stays</p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">All homestays</h1>
          <p className="mt-2 text-sm text-ink-2">{stays.length} stays registered across the network.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={exportCsv} className="gap-1.5">
            <Icon icon="lucide:download" className="h-4 w-4" />
            Export CSV
          </Button>
          <div className="flex items-center gap-1 rounded-full border border-line bg-paper-2 p-1">
            <button
              onClick={() => setView('grid')}
              aria-label="Grid view"
              className={cn('flex h-7 w-9 items-center justify-center rounded-full transition-colors', view === 'grid' ? 'bg-tide text-white' : 'text-ink-2 hover:text-ink')}
            >
              <Icon icon="lucide:layout-grid" className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView('table')}
              aria-label="Table view"
              className={cn('flex h-7 w-9 items-center justify-center rounded-full transition-colors', view === 'table' ? 'bg-tide text-white' : 'text-ink-2 hover:text-ink')}
            >
              <Icon icon="lucide:list" className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button onClick={() => navigate('/stays/new')} className="gap-1.5">
            <Icon icon="lucide:plus" className="h-4 w-4" />
            Register a homestay
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-elevated px-3.5 py-2.5">
          <p className="font-mono text-[9px] uppercase tracking-wider text-ink-3">Total rooms</p>
          <p className="mt-0.5 font-mono-data text-lg font-bold text-ink">{stats.totalRooms}</p>
        </div>
        <div className="rounded-xl border border-line bg-elevated px-3.5 py-2.5">
          <p className="font-mono text-[9px] uppercase tracking-wider text-ink-3">Live listings</p>
          <p className="mt-0.5 font-mono-data text-lg font-bold text-ok">{stats.live}</p>
        </div>
        <div className="rounded-xl border border-line bg-elevated px-3.5 py-2.5">
          <p className="font-mono text-[9px] uppercase tracking-wider text-ink-3">Occupied tonight</p>
          <p className="mt-0.5 font-mono-data text-lg font-bold text-tide">{stats.occupied}</p>
        </div>
        <div className="rounded-xl border border-line bg-elevated px-3.5 py-2.5">
          <p className="font-mono text-[9px] uppercase tracking-wider text-ink-3">Avg base price</p>
          <p className="mt-0.5 font-mono-data text-lg font-bold text-gold">₹{fmtMoney(stats.avg)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-elevated p-3">
        <SearchField
          placeholder="Search homestay, host, or area…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-80"
        />
        <select
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          aria-label="Filter by location"
          className="h-9 rounded-lg border border-line-2 bg-elevated px-2.5 font-mono text-[11px] font-semibold text-ink transition-colors focus:border-tide focus:outline-none"
        >
          <option value="all">All locations</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'live', label: 'Live' },
              { key: 'paused', label: 'Paused' },
              { key: 'draft', label: 'Draft' },
            ] as { key: StatusFilter; label: string }[]
          ).map((c) => (
            <button
              key={c.key}
              onClick={() => setStatusFilter(c.key)}
              className={cn(
                'rounded-full px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors',
                statusFilter === c.key ? 'bg-tide text-white' : 'text-ink-2 hover:bg-paper-2 hover:text-ink',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-2 bg-paper-2 p-12 text-center">
          <Icon icon="lucide:search" className="mx-auto h-6 w-6 text-ink-3" />
          <p className="mt-3 text-sm font-semibold text-ink">No homestays match your filters</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => {
            const st = s.status ?? 'live';
            const meta = STATUS_META[st];
            return (
              <div key={s.id} className="group overflow-hidden rounded-2xl border border-line bg-elevated transition-all hover:-translate-y-0.5 hover:border-tide/50 hover:shadow-lg">
                <div className="relative h-44 overflow-hidden bg-paper-2">
                  <img
                    src={s.imageUrls[0]}
                    alt={s.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <span
                    className={cn(
                      'absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider backdrop-blur-md',
                      meta.cls,
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                    {meta.label}
                  </span>
                  <button
                    type="button"
                    aria-label="Stay actions"
                    onClick={(e) => openMenu(e, s)}
                    className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60"
                  >
                    <Icon icon="lucide:more-horizontal" className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-lg font-semibold text-ink">{s.title}</h3>
                      <p className="truncate text-xs text-ink-2">
                        {s.location_display} · {s.host_name}
                      </p>
                    </div>
                    <div className="shrink-0 text-right" title="Base price per night">
                      <p className="font-mono-data text-base font-bold text-ink">₹{fmtMoney(s.price_per_night)}</p>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-ink-3">/ night</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold',
                        (s.bookingsCount ?? 0) > 0 ? 'border-ok/40 bg-ok/10 text-ok' : 'border-line-2 bg-paper-2 text-ink-3',
                      )}
                    >
                      {s.bookingsCount ?? 0} booking{(s.bookingsCount ?? 0) === 1 ? '' : 's'}
                    </span>
                    <span className="rounded-full border border-line-2 bg-paper-2 px-2.5 py-1 font-mono text-[10px] font-semibold text-ink-2">
                      {s.blockedDates.length} date{s.blockedDates.length === 1 ? '' : 's'} blocked
                    </span>
                    <span className="rounded-full border border-line-2 bg-paper-2 px-2.5 py-1 font-mono text-[10px] font-semibold text-gold">
                      ★ {s.rating} ({s.reviews_count})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 border-t border-line pt-3">
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/stays/${s.id}/rooms`)} className="gap-1.5">
                      <Icon icon="lucide:calendar-days" className="h-3.5 w-3.5" />
                      Calendar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/stays/${s.id}/edit`)} className="gap-1.5">
                      <Icon icon="lucide:pencil" className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <span className="ml-auto flex items-center gap-1 font-mono text-[9px] font-semibold text-ink-3">
                      <Icon icon="lucide:moon" className="h-3 w-3" />
                      {s.bookedTonight ?? 0} tonight
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-elevated">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-line bg-paper-2 font-mono text-[9px] uppercase tracking-wider text-ink-3">
                  <th className="px-4 py-3">Stay</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Rooms</th>
                  <th className="px-4 py-3">Bookings</th>
                  <th className="px-4 py-3">Tonight</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((s) => {
                  const st = s.status ?? 'live';
                  const meta = STATUS_META[st];
                  return (
                    <tr key={s.id} className="transition-colors hover:bg-paper-2/60">
                      <td className="px-4 py-3">
                        <p className="max-w-[260px] truncate text-sm font-semibold text-ink">{s.title}</p>
                        <p className="font-mono text-[10px] text-ink-3">{s.host_name}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-2">{s.location_display}</td>
                      <td className="px-4 py-3 font-mono-data text-sm font-semibold text-ink">₹{fmtMoney(s.price_per_night)}</td>
                      <td className="px-4 py-3 font-mono-data text-sm text-ink">{s.total_rooms}</td>
                      <td className="px-4 py-3 font-mono-data text-sm text-ink">{s.bookingsCount ?? 0}</td>
                      <td className="px-4 py-3 font-mono-data text-sm text-tide">{s.bookedTonight ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={cn('flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider', meta.cls)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          aria-label="Stay actions"
                          onClick={(e) => openMenu(e, s)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-paper-2 text-ink-2 transition-colors hover:border-tide hover:text-tide"
                        >
                          <Icon icon="lucide:more-horizontal" className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {createPortal(
        <AnimatePresence>
          {menu && (
            <>
              {(() => {
                const st = (menu.stay.status ?? 'live') as 'live' | 'paused' | 'draft';
                return (
                  <>
                    <button type="button" aria-label="Close menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setMenu(null)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.14 }}
                      style={{ left: Math.min(menu.x, window.innerWidth - 240), top: Math.min(menu.y, window.innerHeight - 300) }}
                      className="fixed z-50 w-56 rounded-xl border border-line bg-elevated p-1.5 shadow-2xl"
                    >
                      <p className="px-2.5 pb-1 pt-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                        {menu.stay.title}
                      </p>
                      <MenuItem
                        icon="lucide:calendar-days"
                        label="Calendar / pricing rules"
                        onClick={() => {
                          setMenu(null);
                          navigate(`/stays/${menu.stay.id}/rooms`);
                        }}
                      />
                      <MenuItem
                        icon="lucide:external-link"
                        label="Preview public listing"
                        onClick={() => {
                          setMenu(null);
                          window.open(`http://127.0.0.1:4173/stay/${menu.stay.id}`, '_blank');
                        }}
                      />
                      <MenuItem
                        icon="lucide:zap"
                        label={`Instant booking: ${menu.stay.instant_booking ? 'On' : 'Off'}`}
                        onClick={() => updateStay(menu.stay, { instant_booking: menu.stay.instant_booking ? 0 : 1 })}
                      />
                      <MenuItem
                        icon={st === 'live' ? 'lucide:pause' : 'lucide:play'}
                        label={st === 'live' ? 'Pause listing' : 'Resume listing'}
                        onClick={() => updateStay(menu.stay, { status: st === 'live' ? 'paused' : 'live' })}
                      />
                      <div className="my-1 border-t border-line" />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setMenu(null);
                          setDeleteTarget(menu.stay);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-err transition-colors hover:bg-err/10"
                      >
                        <Icon icon="lucide:trash-2" className="h-3.5 w-3.5" />
                        Remove stay
                      </button>
                    </motion.div>
                  </>
                );
              })()}
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove homestay?">
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-ink-2">
              <span className="font-semibold text-ink">{deleteTarget.title}</span> will be permanently removed from the network along
              with its images, amenities and blocked dates. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 gap-1.5 bg-err hover:bg-err/90"
                disabled={busy}
                onClick={() => removeStay(deleteTarget)}
              >
                <Icon icon="lucide:trash-2" className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-ink transition-colors hover:bg-paper-2"
    >
      <Icon icon={icon} className="h-3.5 w-3.5 text-tide" />
      {label}
    </button>
  );
}
