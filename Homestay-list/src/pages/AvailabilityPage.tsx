import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { cn } from '../lib/cn';
import type { Homestay, Owner } from '../types';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function AvailabilityPage({ owner }: { owner: Owner }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stay, setStay] = useState<Homestay | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getOwnerStays(owner.phone)
      .then((stays) => {
        const match = stays.find((s) => s.id === id);
        if (match) setStay(match);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id, owner.phone]);

  const blocked = useMemo(() => new Set(stay?.blockedDates || []), [stay]);
  const todayISO = toISO(new Date());

  const grid = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: { date: Date }[] = [];
    for (let i = 0; i < offset; i++) cells.push({ date: new Date(0) });
    for (let d = 1; d <= count; d++) cells.push({ date: new Date(month.getFullYear(), month.getMonth(), d) });
    return cells;
  }, [month]);

  async function toggle(date: Date) {
    if (!stay) return;
    const iso = toISO(date);
    const isBlocked = blocked.has(iso);
    setBusy(true);
    try {
      if (isBlocked) {
        await api.unblockDate(stay.id, iso);
      } else {
        await api.blockDate(stay.id, iso);
      }
      setStay((s) =>
        s
          ? {
              ...s,
              blockedDates: isBlocked ? s.blockedDates.filter((d) => d !== iso) : [...s.blockedDates, iso],
            }
          : s,
      );
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function unblock(iso: string) {
    if (!stay) return;
    setBusy(true);
    try {
      await api.unblockDate(stay.id, iso);
      setStay((s) => (s ? { ...s, blockedDates: s.blockedDates.filter((d) => d !== iso) } : s));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  if (!stay) {
    return <p className="text-sm text-ink-2">Stay not found under your account.</p>;
  }

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => navigate('/stays')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-ink-2 transition-colors hover:text-tide"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to my stays
        </button>
        <Badge variant="dot">{stay.blockedDates.length} date{stay.blockedDates.length === 1 ? '' : 's'} blocked</Badge>
      </div>

      <div>
        <p className="overline">Availability manager</p>
        <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink">{stay.title}</h1>
        <p className="mt-2 text-sm text-ink-2">
          Click any future date to block it (hatched = reserved by you). Click again to reopen.
        </p>
      </div>

      <div className="rounded-3xl border border-line bg-elevated p-6">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-display text-base font-semibold text-ink">
            {month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7">
          {WEEKDAYS.map((d) => (
            <span key={d} className="text-center font-mono text-[10px] uppercase tracking-wider text-ink-3">
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {grid.map((cell, i) => {
            if (cell.date.getFullYear() < 1970) return <div key={i} />;
            const iso = toISO(cell.date);
            const isPast = iso < todayISO;
            const isBlocked = blocked.has(iso);
            return (
              <button
                key={iso}
                type="button"
                disabled={isPast || busy}
                onClick={() => toggle(cell.date)}
                title={isPast ? 'Past date' : isBlocked ? 'Blocked — click to reopen' : 'Free — click to block'}
                className={cn(
                  'relative mx-auto flex h-10 w-10 items-center justify-center rounded-full font-display text-sm transition-all duration-micro',
                  isPast && 'cursor-not-allowed text-ink-3/30',
                  !isPast && !isBlocked && 'text-ink hover:bg-paper-2',
                  isBlocked &&
                    'cursor-pointer text-ink-3/70',
                )}
                style={
                  isBlocked
                    ? { backgroundImage: 'repeating-linear-gradient(45deg, var(--c-line) 0 2px, transparent 2px 6px)' }
                    : undefined
                }
              >
                {cell.date.getDate()}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-4 border-t border-line pt-4 font-mono text-[10px] text-ink-3">
          <span className="flex items-center gap-1.5">
            <span
              className="h-3.5 w-3.5 rounded-full border border-line"
              style={{ backgroundImage: 'repeating-linear-gradient(45deg, var(--c-line) 0 2px, transparent 2px 6px)' }}
              aria-hidden="true"
            />
            Blocked
          </span>
          <span>Tap a day to toggle</span>
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-elevated p-6">
        <p className="overline mb-4">Blocked dates</p>
        {stay.blockedDates.length === 0 ? (
          <p className="text-sm text-ink-2">No blocked dates — every future night is open for bookings.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {[...stay.blockedDates].sort().map((iso) => (
              <span
                key={iso}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-2 bg-paper-2 px-2.5 py-1 font-mono-data text-xs text-ink"
              >
                {iso}
                <button
                  onClick={() => unblock(iso)}
                  aria-label={`Unblock ${iso}`}
                  className="text-ink-3 transition-colors hover:text-err"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={() => navigate('/stays')} className="gap-1.5">
          <Trash2 className="h-3.5 w-3.5" />
          Done
        </Button>
      </div>
    </div>
  );
}
