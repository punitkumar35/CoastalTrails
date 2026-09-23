import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { api, type AdminStats, type TrendPoint } from '../services/api';
import type { Booking } from '../types';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { Reveal } from '../components/ui/Reveal';
import { useLiveRefresh } from '../lib/live';
import { cn } from '../lib/cn';

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

function fmtShort(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const STATUS_DOT: Record<string, string> = {
  pending_payment: 'bg-warn',
  awaiting_host: 'bg-warn',
  confirmed: 'bg-ok',
  checked_in: 'bg-tide',
  completed: 'bg-ok',
  declined: 'bg-err',
  cancelled: 'bg-ink-3',
  expired: 'bg-ink-3',
};

const STATUS_ICON: Record<string, string> = {
  pending_payment: 'lucide:wallet',
  awaiting_host: 'lucide:clock',
  confirmed: 'lucide:check',
  checked_in: 'lucide:log-in',
  completed: 'lucide:flag',
  declined: 'lucide:x',
  cancelled: 'lucide:ban',
  expired: 'lucide:timer-off',
};

const STATUS_TONE: Record<string, string> = {
  pending_payment: 'text-warn',
  awaiting_host: 'text-warn',
  confirmed: 'text-ok',
  checked_in: 'text-tide',
  completed: 'text-ok',
  declined: 'text-err',
  cancelled: 'text-ink-3',
  expired: 'text-ink-3',
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Payment pending',
  awaiting_host: 'Awaiting',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  completed: 'Completed',
  declined: 'Declined',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

function TrendChart({ data }: { data: TrendPoint[] }) {
  const w = 640;
  const h = 190;
  const pl = 8;
  const pr = 8;
  const pt = 16;
  const pb = 24;
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const maxAmt = Math.max(...data.map((d) => d.amount), 1);
  const slot = (w - pl - pr) / data.length;
  const bw = Math.min(22, slot * 0.6);
  const barMaxH = h - pt - pb;
  const pts = data.map((d, i) => {
    const x = pl + slot * i + slot / 2;
    return { x, y: pt + barMaxH - (d.amount / maxAmt) * barMaxH };
  });
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${h - pb} L${pts[0].x},${h - pb} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Bookings and holds trend, last 14 days">
      <defs>
        <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--c-tide)" />
          <stop offset="100%" stopColor="color-mix(in oklab, var(--c-tide) 30%, transparent)" />
        </linearGradient>
        <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--c-gold)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--c-gold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.5, 1].map((f) => (
        <line key={f} x1={pl} x2={w - pr} y1={pt + barMaxH * f} y2={pt + barMaxH * f} stroke="var(--c-line)" strokeDasharray="3 4" />
      ))}
      {data.map((d, i) => {
        const x = pl + slot * i + slot / 2;
        const barH = (d.count / maxCount) * barMaxH;
        return (
          <rect key={d.date} x={x - bw / 2} y={pt + barMaxH - barH} width={bw} height={barH} rx={3} fill="url(#barGrad)">
            <title>{`${d.date}: ${d.count} bookings · ₹${fmt(d.amount)} holds`}</title>
          </rect>
        );
      })}
      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke="var(--c-gold)" strokeWidth="2" strokeLinejoin="round" />
      <text x={pl + slot / 2} y={h - 8} textAnchor="middle" fontSize="9" fontFamily="monospace" fill="var(--c-ink-3)">
        {fmtShort(data[0].date).split(' ')[0]}
      </text>
      <text x={w - pr - slot / 2} y={h - 8} textAnchor="middle" fontSize="9" fontFamily="monospace" fill="var(--c-ink-3)">
        {fmtShort(data[data.length - 1].date).split(' ')[0]}
      </text>
    </svg>
  );
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [s, b] = await Promise.all([api.getStats(), api.getAllBookings()]);
      setStats(s);
      setBookings(b);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLiveRefresh(() => load(true), 15000);

  const funnel = useMemo(() => {
    const entries = Object.entries(stats?.statusBreakdown ?? {});
    const total = entries.reduce((a, [, c]) => a + c, 0);
    return { total, entries };
  }, [stats]);

  const bookedTonight = (stats?.topStays ?? []).reduce((a, s) => a + s.bookedTonight, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-72" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  const cards = [
    { label: 'Homestays', value: fmt(stats?.stayCount ?? 0), sub: `${stats?.enclaves.length ?? 0} enclaves`, icon: 'lucide:waves', tone: 'text-tide' },
    { label: 'Bookings', value: fmt(stats?.bookingCount ?? 0), sub: `${stats?.upcoming ?? 0} upcoming`, icon: 'lucide:book-open', tone: 'text-ember' },
    { label: 'Hosts', value: fmt(stats?.hostCount ?? 0), sub: 'active partners', icon: 'lucide:users', tone: 'text-gold' },
    { label: 'Holds collected', value: `₹${fmt(stats?.holdsPaid ?? 0)}`, sub: 'advance held', icon: 'lucide:indian-rupee', tone: 'text-ok' },
  ] as const;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="overline">Coastal Trails desk</p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Network overview</h1>
          <p className="mt-2 text-sm text-ink-2">
            <span className="font-mono-data font-semibold text-ink">{stats?.arrivalsToday ?? 0} arrivals</span> ·{' '}
            <span className="font-mono-data font-semibold text-ink">{stats?.departuresToday ?? 0} departures</span> today ·{' '}
            <span className="font-mono-data font-semibold text-ink">{bookedTonight}</span> rooms booked tonight
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate('/bookings/new')}
            className={cn('gap-1.5', (stats?.statusBreakdown?.awaiting_host ?? 0) > 0 && 'border border-warn/40 bg-warn/10 text-warn hover:bg-warn/15')}
            variant={(stats?.statusBreakdown?.awaiting_host ?? 0) > 0 ? 'ghost' : 'secondary'}
          >
            <Icon icon="lucide:inbox" className="h-3.5 w-3.5" />
            New bookings
            {(stats?.statusBreakdown?.awaiting_host ?? 0) > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warn px-1 font-mono-data text-[10px] font-bold text-white">
                {stats?.statusBreakdown?.awaiting_host ?? 0}
              </span>
            )}
          </Button>
          <Button size="sm" onClick={() => navigate('/stays/new')} className="gap-1.5">
            <Icon icon="lucide:plus" className="h-3.5 w-3.5" />
            New stay
          </Button>
          <Button size="sm" variant="secondary" onClick={() => navigate('/bookings')}>
            Bookings
          </Button>
          <Button size="sm" variant="ghost" onClick={() => navigate('/hosts')}>
            Hosts
          </Button>
        </div>
      </div>

      <Reveal>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-line bg-elevated p-4 transition-colors hover:border-line-2">
              <div className="flex items-center gap-2">
                <Icon icon={c.icon} className={cn('h-4 w-4', c.tone)} />
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-3">{c.label}</p>
              </div>
              <p className="mt-2 font-display text-2xl font-semibold leading-7 text-ink">{c.value}</p>
              <p className="mt-0.5 font-mono text-[10px] text-ink-3">{c.sub}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Reveal>
            <div className="rounded-2xl border border-line bg-elevated p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="overline">Demand — last 14 days</p>
                <span className="font-mono text-[10px] text-ink-3">
                  {(stats?.trend ?? []).reduce((a, d) => a + d.count, 0)} bookings · ₹
                  {fmt((stats?.trend ?? []).reduce((a, d) => a + d.amount, 0))} holds
                </span>
              </div>
              <div className="mt-4">
                <TrendChart data={stats?.trend ?? []} />
              </div>
              <div className="mt-3 flex items-center gap-4 border-t border-line pt-3 font-mono text-[10px] text-ink-3">
                <span className="flex items-center gap-1.5">
                  <Icon icon="lucide:book-open" className="h-3 w-3 text-tide" />
                  bookings / day
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon icon="lucide:indian-rupee" className="h-3 w-3 text-gold" />
                  holds ₹ / day
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="rounded-2xl border border-line bg-elevated p-5">
              <div className="flex items-center justify-between">
                <p className="overline">Recent bookings</p>
                <button
                  onClick={() => navigate('/bookings')}
                  className="flex items-center gap-1 font-mono text-[10px] font-semibold text-ink-3 transition-colors hover:text-tide"
                >
                  view all <Icon icon="lucide:arrow-up-right" className="h-3 w-3" />
                </button>
              </div>
              <div className="mt-3 divide-y divide-line">
                {bookings.slice(0, 5).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => navigate('/bookings')}
                    className="group flex w-full items-center gap-3 py-2.5 text-left"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-tide to-tide-2 text-xs font-semibold text-white">
                      {b.user_name[0] ?? '?'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink group-hover:text-tide">{b.user_name}</span>
                      <span className="block truncate font-mono text-[10px] text-ink-3">
                        {b.reference_code} · {b.homestay_title} · {fmtShort(b.check_in)} → {fmtShort(b.check_out)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-mono-data text-xs font-semibold text-ink">₹{fmt(b.advance_paid)}</span>
                      <span className="flex items-center gap-1 font-mono text-[10px] text-ink-3">
                        <Icon icon={STATUS_ICON[b.status]} className={cn('h-3 w-3', STATUS_TONE[b.status])} />
                        {STATUS_LABEL[b.status]}
                      </span>
                    </span>
                  </button>
                ))}
                {bookings.length === 0 && <p className="py-6 text-center text-sm text-ink-2">No bookings yet.</p>}
              </div>
            </div>
          </Reveal>
        </div>

        <div className="space-y-6">
          <Reveal delay={0.04}>
            <div className="rounded-2xl border border-line bg-elevated p-5">
              <div className="flex items-center justify-between">
                <p className="overline">Tonight</p>
                <button
                  onClick={() => navigate('/hosts')}
                  className="flex items-center gap-1 font-mono text-[10px] font-semibold text-ink-3 transition-colors hover:text-tide"
                >
                  rooms <Icon icon="lucide:arrow-up-right" className="h-3 w-3" />
                </button>
              </div>
              <div className="mt-3 space-y-1">
                {(stats?.topStays ?? []).slice(0, 5).map((s) => {
                  const pct = s.total_rooms ? Math.min(1, s.bookedTonight / s.total_rooms) : 0;
                  return (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/stays/${s.id}/rooms`)}
                      className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-paper-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink group-hover:text-tide">{s.title}</span>
                        <span className="block truncate font-mono text-[10px] text-ink-3">{s.location}</span>
                      </span>
                      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-paper-2">
                        <span
                          className={cn('block h-full rounded-full', pct >= 0.8 ? 'bg-err' : pct >= 0.5 ? 'bg-gold' : 'bg-ok')}
                          style={{ width: `${Math.max(pct * 100, 4)}%` }}
                        />
                      </span>
                      <span className="w-12 text-right font-mono-data text-xs font-semibold text-ink">
                        {s.bookedTonight}/{s.total_rooms}
                      </span>
                      <Icon icon="lucide:chevron-right" className="h-3.5 w-3.5 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-tide" />
                    </button>
                  );
                })}
                {(stats?.topStays ?? []).length === 0 && <p className="py-6 text-center text-sm text-ink-2">No stays yet.</p>}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="rounded-2xl border border-line bg-elevated p-5">
              <p className="overline">Booking pulse</p>
              <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full">
                {funnel.entries.map(([key, count]) =>
                  count > 0 ? (
                    <div
                      key={key}
                      className={cn('h-full', STATUS_DOT[key])}
                      style={{ width: `${(count / Math.max(funnel.total, 1)) * 100}%` }}
                    />
                  ) : null,
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                {funnel.entries.map(([key, count]) => (
                  <span key={key} className="flex items-center gap-1.5 font-mono text-[10px] text-ink-2">
                    <Icon icon={STATUS_ICON[key]} className={cn('h-3 w-3', STATUS_TONE[key])} />
                    {STATUS_LABEL[key]}
                    <span className="font-mono-data font-semibold text-ink">{count}</span>
                  </span>
                ))}
              </div>
              <div className="mt-4 border-t border-line pt-3">
                <div className="flex flex-wrap gap-1.5">
                  {(stats?.enclaves ?? []).map((e) => (
                    <span key={e.label} className="rounded-full border border-line bg-paper-2 px-2.5 py-1 font-mono text-[10px] text-ink-2">
                      {e.label} <span className="font-semibold text-tide">{e.c}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
