import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@iconify/react';
import { api, type HostRow } from '../services/api';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { Reveal } from '../components/ui/Reveal';
import { SearchField } from '../components/ui/Input';
import { useLiveRefresh } from '../lib/live';
import { cn } from '../lib/cn';

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

type Chip = 'all' | 'active' | 'awaiting' | 'top';
type Sort = 'holds' | 'active' | 'alpha';

interface MenuState {
  host: HostRow;
  x: number;
  y: number;
}

const CHIPS: { key: Chip; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'awaiting', label: 'Awaiting review' },
  { key: 'top', label: 'Top rated' },
];

export function AdminHostsPage() {
  const navigate = useNavigate();
  const [hosts, setHosts] = useState<HostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<Chip>('all');
  const [sort, setSort] = useState<Sort>('holds');
  const [selected, setSelected] = useState<HostRow | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    api
      .getHosts()
      .then(setHosts)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useLiveRefresh(() => {
    api
      .getHosts()
      .then((list) => {
        setHosts(list);
        setSelected((prev) => (prev ? list.find((h) => h.host_whatsapp === prev.host_whatsapp) ?? prev : prev));
      })
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

  const topHostWhatsapp = useMemo(
    () => [...hosts].sort((a, b) => (b.holdsPaid ?? 0) - (a.holdsPaid ?? 0))[0]?.host_whatsapp ?? null,
    [hosts],
  );

  const list = useMemo(() => {
    let out = hosts;
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (h) => h.host_name.toLowerCase().includes(q) || h.host_whatsapp.toLowerCase().includes(q),
      );
    }
    if (chip === 'active') out = out.filter((h) => (h.upcoming ?? 0) > 0);
    if (chip === 'awaiting') out = out.filter((h) => (h.awaiting ?? 0) > 0);
    if (chip === 'top') out = out.filter((h) => (h.rating ?? 0) >= 4.7);
    const sorted = [...out];
    if (sort === 'holds') sorted.sort((a, b) => (b.holdsPaid ?? 0) - (a.holdsPaid ?? 0));
    if (sort === 'active') sorted.sort((a, b) => (b.upcoming ?? 0) - (a.upcoming ?? 0));
    if (sort === 'alpha') sorted.sort((a, b) => a.host_name.localeCompare(b.host_name));
    return sorted;
  }, [hosts, query, chip, sort]);

  function copyPhone(h: HostRow) {
    navigator.clipboard.writeText(h.host_whatsapp);
    setCopied(h.host_whatsapp);
    window.setTimeout(() => setCopied(null), 2000);
  }

  function openMenu(e: React.MouseEvent, h: HostRow) {
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ host: h, x: r.right - 8, y: r.bottom + 6 });
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  if (selected) {
    return (
      <div className="w-full space-y-8">
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-ink-2 transition-colors hover:text-tide"
        >
          <Icon icon="lucide:arrow-left" className="h-4 w-4" />
          Back to all hosts
        </button>

        <div className="flex flex-wrap items-center gap-5 rounded-3xl border border-line bg-elevated p-6">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-tide to-tide-2 font-display text-2xl font-semibold text-white">
            {selected.host_name[0]}
          </span>
          <div className="min-w-0">
            <p className="overline">Host profile</p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{selected.host_name}</h1>
            <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-ink-2">
              <Icon icon="lucide:phone" className="h-3 w-3 text-tide" />
              {selected.host_whatsapp}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Badge variant="dot">
              {selected.stay_count} stay{selected.stay_count === 1 ? '' : 's'}
            </Badge>
            <Badge variant="outline">{selected.rooms} rooms</Badge>
            <Badge variant="warm">₹{fmt(selected.holdsPaid ?? 0)} escrow</Badge>
          </div>
        </div>

        <div className="space-y-3">
          <p className="overline">Their stays</p>
          {(selected.stays || []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-2 bg-paper-2 p-8 text-center text-sm text-ink-2">
              No stays listed under this host yet.
            </div>
          ) : (
            selected.stays!.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-elevated p-4">
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-line">
                  <img src={s.imageUrls[0]} alt={s.title} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-base font-semibold text-ink">{s.title}</h3>
                  <p className="truncate text-xs text-ink-2">
                    {s.location_display} · ★ {s.rating} · {s.total_rooms} rooms · {s.walking_minutes_to_beach} min to beach
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge variant="dot">
                      {s.bookingsCount ?? 0} booking{(s.bookingsCount ?? 0) === 1 ? '' : 's'}
                    </Badge>
                    <Badge variant="warm">{s.blockedDates.length} blocked</Badge>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/stays/${s.id}/rooms`)}
                    className="gap-1.5"
                  >
                    <Icon icon="lucide:layout-grid" className="h-3.5 w-3.5" />
                    Rooms
                  </Button>
                  <span className="font-mono-data text-sm font-semibold text-ink">₹{s.price_per_night}</span>
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/stays/${s.id}/edit`)} className="gap-1.5">
                    <Icon icon="lucide:pencil" className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="overline">Host network</p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Hosts</h1>
          <p className="mt-2 text-sm text-ink-2">
            {hosts.length} host{hosts.length === 1 ? '' : 's'} on the network — escrow held on guest advances.
          </p>
        </div>
        <Button onClick={() => navigate('/stays/new')} className="gap-1.5">
          <Icon icon="lucide:user-plus" className="h-4 w-4" />
          Invite host
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-elevated p-3">
        <SearchField
          placeholder="Search host or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-72"
        />
        <div className="flex items-center gap-1">
          {CHIPS.map((c) => (
            <button
              key={c.key}
              onClick={() => setChip(c.key)}
              className={cn(
                'rounded-full px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors',
                chip === c.key ? 'bg-tide text-white' : 'text-ink-2 hover:bg-paper-2 hover:text-ink',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="Sort hosts"
          className="ml-auto h-9 rounded-lg border border-line-2 bg-elevated px-2.5 font-mono text-[11px] font-semibold text-ink transition-colors focus:border-tide focus:outline-none"
        >
          <option value="holds">Sort: Escrow held</option>
          <option value="active">Sort: Active bookings</option>
          <option value="alpha">Sort: A–Z</option>
        </select>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-2 bg-paper-2 p-12 text-center">
          <Icon icon="lucide:search" className="mx-auto h-6 w-6 text-ink-3" />
          <p className="mt-3 text-sm font-semibold text-ink">No hosts match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((h, i) => {
            const isTop = h.host_whatsapp === topHostWhatsapp && (h.holdsPaid ?? 0) > 0;
            const cover = (h.stays || [])[0]?.imageUrls[0];
            const extraStays = Math.max(0, h.stay_count - 1);
            const active = (h.upcoming ?? 0) > 0;
            return (
              <Reveal key={h.host_whatsapp} delay={Math.min(i * 0.04, 0.3)}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(h)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setSelected(h);
                  }}
                  className={cn(
                    'group relative flex h-full cursor-pointer flex-col gap-3.5 rounded-2xl border bg-elevated p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg',
                    isTop ? 'border-gold/60 ring-1 ring-gold/40' : 'border-line hover:border-tide/50',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-tide to-tide-2 font-display text-lg font-semibold text-white">
                      {h.host_name[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h2 className="truncate font-display text-base font-semibold text-ink">{h.host_name}</h2>
                        {isTop && (
                          <Badge variant="solid" className="border border-gold/50 bg-gold/15 !text-gold">
                            Top host
                          </Badge>
                        )}
                        <Badge variant={h.verified === false ? 'outline' : 'dot'}>
                          {h.verified === false ? 'Unverified' : 'Verified'}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <a
                          href={`tel:${h.host_whatsapp}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-xs font-medium text-ink-2 transition-colors hover:text-tide"
                        >
                          {h.host_whatsapp}
                        </a>
                        <a
                          href={`https://wa.me/${h.host_whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="WhatsApp host"
                          className="text-ink-3 transition-colors hover:text-ok"
                        >
                          <Icon icon="lucide:message-circle" className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          aria-label="Copy phone"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyPhone(h);
                          }}
                          className="text-ink-3 transition-colors hover:text-tide"
                        >
                          <Icon icon={copied === h.host_whatsapp ? 'lucide:check' : 'lucide:copy'} className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Host actions"
                      onClick={(e) => openMenu(e, h)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-paper-2 text-ink-2 transition-colors hover:border-tide hover:text-tide"
                    >
                      <Icon icon="lucide:more-horizontal" className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-line bg-paper-2/60 px-3 py-2">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-ink-3">Inventory</p>
                      <p className="mt-0.5 font-mono-data text-sm font-semibold text-ink">
                        {h.stay_count} stay{h.stay_count === 1 ? '' : 's'} · {h.rooms} rooms
                      </p>
                    </div>
                    <div className="rounded-xl border border-line bg-paper-2/60 px-3 py-2">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-ink-3">Activity</p>
                      <p className="mt-0.5 font-mono-data text-sm font-semibold text-ink">
                        {h.upcoming ?? 0} active
                        {h.awaiting ? (
                          <span className="text-warn"> · {h.awaiting} awaiting</span>
                        ) : null}
                      </p>
                    </div>
                    <div
                      className="rounded-xl border border-line bg-paper-2/60 px-3 py-2"
                      title="20% advance collected from guests online; the balance is paid directly at the property"
                    >
                      <p className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-ink-3">
                        Escrow held
                        <Icon icon="lucide:info" className="h-2.5 w-2.5" />
                      </p>
                      <p className="mt-0.5 font-mono-data text-sm font-semibold text-gold">₹{fmt(h.holdsPaid ?? 0)}</p>
                    </div>
                    <div className="rounded-xl border border-line bg-paper-2/60 px-3 py-2">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-ink-3">Rating</p>
                      <p className="mt-0.5 font-mono-data text-sm font-semibold text-ink">★ {h.rating ?? 0}</p>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center gap-2.5 border-t border-line pt-3">
                    {cover ? (
                      <div className="relative shrink-0">
                        <img src={cover} alt="" loading="lazy" className="h-11 w-16 rounded-lg border border-line object-cover" />
                        {extraStays > 0 && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-tide px-1 font-mono-data text-[9px] font-bold text-white ring-2 ring-elevated">
                            +{extraStays}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg border border-line bg-paper-2">
                        <Icon icon="lucide:waves" className="h-4 w-4 text-ink-3" />
                      </span>
                    )}
                    <span
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider',
                        active ? 'border-ok/40 bg-ok/10 text-ok' : 'border-line-2 bg-paper-2 text-ink-3',
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-ok' : 'bg-ink-3')} />
                      {active ? 'Active' : 'Idle'}
                    </span>
                    <span className="ml-auto flex items-center gap-1 font-mono text-[10px] font-semibold text-ink-3 transition-colors group-hover:text-tide">
                      view profile
                      <Icon icon="lucide:arrow-right" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      )}

      {createPortal(
        <AnimatePresence>
          {menu && (
            <>
              <button
                type="button"
                aria-label="Close menu"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setMenu(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.14 }}
                style={{ left: Math.min(menu.x, window.innerWidth - 220), top: Math.min(menu.y, window.innerHeight - 260) }}
                className="fixed z-50 w-52 rounded-xl border border-line bg-elevated p-1.5 shadow-2xl"
              >
                <p className="px-2.5 pb-1 pt-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                  {menu.host.host_name}
                </p>
                <MenuItem
                  icon="lucide:book-open"
                  label="View bookings"
                  onClick={() => {
                    setMenu(null);
                    const stays = menu.host.stays ?? [];
                    navigate(stays.length === 1 ? `/bookings/${stays[0].id}` : '/bookings');
                  }}
                />
                <MenuItem
                  icon="lucide:send"
                  label="Initiate payout"
                  onClick={() => {
                    setMenu(null);
                    const msg = `Namaskara ${menu.host.host_name}! Payout summary: ₹${fmt(menu.host.holdsPaid ?? 0)} escrow held across ${menu.host.stay_count} stay(s).`;
                    window.open(`https://wa.me/${menu.host.host_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                />
                <MenuItem
                  icon="lucide:pencil"
                  label="Edit stay details"
                  onClick={() => {
                    setMenu(null);
                    const stays = menu.host.stays ?? [];
                    navigate(stays.length === 1 ? `/stays/${stays[0].id}/edit` : '/stays');
                  }}
                />
                <div className="my-1 border-t border-line" />
                <MenuItem
                  icon="lucide:phone"
                  label="Call host"
                  onClick={() => {
                    setMenu(null);
                    window.open(`tel:${menu.host.host_whatsapp}`);
                  }}
                />
                <MenuItem
                  icon="lucide:message-circle"
                  label="WhatsApp host"
                  onClick={() => {
                    setMenu(null);
                    window.open(`https://wa.me/${menu.host.host_whatsapp.replace(/\D/g, '')}`, '_blank');
                  }}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
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
