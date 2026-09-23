import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/cn';
import { easeOut } from '../../lib/motion';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const PANEL_W = 340;

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseISO(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function fmtShort(s: string | null | undefined): string {
  const d = parseISO(s || '');
  return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function upcomingWeekday(target: number): Date {
  const t = startOfDay(new Date());
  let diff = (target - t.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  return addDays(t, diff);
}

const PRESETS: { label: string; get: () => { ci: string; co: string } }[] = [
  { label: 'Tonight', get: () => ({ ci: toISO(startOfDay(new Date())), co: toISO(addDays(startOfDay(new Date()), 1)) }) },
  {
    label: 'This weekend',
    get: () => {
      const fri = upcomingWeekday(5);
      return { ci: toISO(fri), co: toISO(addDays(fri, 2)) };
    },
  },
  {
    label: 'Next week',
    get: () => {
      const mon = upcomingWeekday(1);
      return { ci: toISO(mon), co: toISO(addDays(mon, 6)) };
    },
  },
];

interface DateRangePickerProps {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  availability?: Record<string, number>;
  blockedDates?: Record<string, number>;
  fewLeftThreshold?: number;
  className?: string;
}

interface PanelPos {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  up: boolean;
}

export function DateRangePicker({ checkIn, checkOut, onChange, availability, blockedDates, fewLeftThreshold = 3, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => startOfDay(parseISO(checkIn) || new Date()));
  const [pos, setPos] = useState<PanelPos | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const todayISO = toISO(startOfDay(new Date()));

  const nights = useMemo(() => {
    const ci = parseISO(checkIn);
    const co = parseISO(checkOut);
    if (!ci || !co) return 0;
    return Math.max(0, Math.round((co.getTime() - ci.getTime()) / 86400000));
  }, [checkIn, checkOut]);

  useEffect(() => {
    if (!open) return;
    setMonth(startOfDay(parseISO(checkIn) || new Date()));

    function update() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const up = spaceBelow < 480 && r.top > 480;
      const width = Math.min(PANEL_W, window.innerWidth - 32);
      const left = Math.max(12, Math.min(r.left, window.innerWidth - width - 12));
      setPos(up ? { left, width, bottom: window.innerHeight - r.top + 8, up } : { left, width, top: r.bottom + 8, up });
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }

    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, checkIn]);

  const gridDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: { date: Date }[] = [];
    for (let i = 0; i < offset; i++) cells.push({ date: new Date(0) });
    for (let d = 1; d <= count; d++) cells.push({ date: new Date(month.getFullYear(), month.getMonth(), d) });
    return cells;
  }, [month]);

  const checkoutCandidate = !!checkIn && !checkOut;

  function handleDayClick(iso: string) {
    const soldOut = availability?.[iso] === 0;
    // A sold-out night can still be a valid check-out day (you leave that morning),
    // but it can never start a stay.
    const isCheckoutPick = checkoutCandidate && iso > checkIn;
    if (soldOut && !isCheckoutPick) return;
    if (isCheckoutPick) {
      onChange(checkIn, iso);
    } else {
      // First pick, re-pick, or an earlier day — always start a fresh range
      onChange(iso, '');
    }
  }

  const monthLabel = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const selectedNightsList = useMemo(() => {
    const ci = parseISO(checkIn);
    const co = parseISO(checkOut);
    if (!ci || !co) return [];
    const out: string[] = [];
    for (const d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) out.push(toISO(d));
    return out;
  }, [checkIn, checkOut]);

  const selectedRoomCounts = selectedNightsList
    .map((d) => availability?.[d])
    .filter((v): v is number => typeof v === 'number');
  const minSelectedRooms = selectedRoomCounts.length > 0 ? Math.min(...selectedRoomCounts) : undefined;
  const soldOutNights = selectedNightsList.filter((d) => availability?.[d] === 0);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-label="Choose dates"
        aria-expanded={open}
        className={cn(
          'flex w-full items-stretch overflow-hidden rounded-xl border text-left transition-all',
          open ? 'border-tide bg-elevated ring-2 ring-tide/20' : 'border-line-2 bg-elevated hover:border-tide',
        )}
      >
        <span className="flex flex-1 flex-col px-3.5 py-2">
          <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-3">
            <Calendar className="h-3 w-3 text-tide" />
            <span>Check-in</span>
          </span>
          <span className={cn('mt-0.5 block text-sm font-medium', checkIn ? 'text-ink' : 'text-ink-3')}>
            {checkIn ? fmtShort(checkIn) : 'Add date'}
          </span>
        </span>
        <span className="w-px shrink-0 self-stretch bg-line" aria-hidden="true" />
        <span className="flex flex-1 flex-col px-3.5 py-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-3">Check-out</span>
          <span className={cn('mt-0.5 block text-sm font-medium', checkOut ? 'text-ink' : 'text-ink-3')}>
            {checkOut ? fmtShort(checkOut) : 'Add date'}
          </span>
        </span>
      </button>

      {createPortal(
        <AnimatePresence>
          {open && pos ? (
            <motion.div
              key="daterange-panel"
              ref={panelRef}
              initial={{ opacity: 0, y: pos.up ? 8 : -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: pos.up ? 6 : -6, scale: 0.98 }}
              transition={{ duration: 0.22, ease: easeOut }}
              role="dialog"
              aria-label="Choose dates"
              style={{
                position: 'fixed',
                left: pos.left,
                width: pos.width,
                top: pos.top,
                bottom: pos.bottom,
              }}
              className="z-palette rounded-2xl border border-line bg-elevated p-4 shadow-2xl"
            >
              <div className="mb-3 flex gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      const { ci, co } = p.get();
                      onChange(ci, co);
                      setOpen(false);
                    }}
                    className="rounded-full border border-line-2 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-2 transition-colors hover:border-tide hover:text-tide"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  aria-label="Previous month"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-display text-base font-semibold text-ink">{monthLabel}</span>
                <button
                  type="button"
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

              <div className="grid grid-cols-7 gap-y-0.5">
                {gridDays.map((cell, i) => {
                  if (cell.date.getFullYear() < 1970) return <div key={i} />;
                  const iso = toISO(cell.date);
                  const isPast = iso < todayISO;
                  const isCheckIn = iso === checkIn;
                  const isCheckOut = iso === checkOut;
                  const isToday = iso === todayISO;
                  const inRange = !!checkIn && !!checkOut && iso > checkIn && iso < checkOut;
                  const count = availability ? availability[iso] : undefined;
                  const unavailable = count === 0;
                  const fewLeft = count !== undefined && count > 0 && count <= fewLeftThreshold;
                  const soldOutCheckout = unavailable && checkoutCandidate && iso > checkIn;
                  const hostBlocked = blockedDates ? blockedDates[iso] || 0 : 0;
                  const partiallyBlocked = hostBlocked > 0 && !unavailable;
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={isPast || (unavailable && !soldOutCheckout)}
                      onClick={() => handleDayClick(iso)}
                      title={
                        isPast
                          ? 'Past date'
                          : unavailable
                            ? soldOutCheckout
                              ? 'No rooms this night — can still be your check-out'
                              : hostBlocked > 0
                                ? 'Blocked by host — fully unavailable'
                                : 'Fully booked'
                            : partiallyBlocked
                              ? `${hostBlocked} room${hostBlocked === 1 ? '' : 's'} blocked by host · ${count} left`
                              : count !== undefined && count > 0
                                ? `${count} room${count === 1 ? '' : 's'} left`
                                : undefined
                      }
                      className={cn(
                        'relative mx-auto flex h-9 w-9 items-center justify-center rounded-full font-display text-sm transition-all duration-micro',
                        isPast && !unavailable && 'cursor-not-allowed text-ink-3/30',
                        unavailable && !soldOutCheckout && 'cursor-not-allowed bg-err/10 text-err/80',
                        partiallyBlocked && !isCheckIn && !isCheckOut && 'bg-warn/15 text-ink ring-1 ring-inset ring-warn/50',
                        !isPast && !unavailable && !isCheckIn && !isCheckOut && !inRange && 'text-ink hover:bg-paper-2',
                        isToday && !isCheckIn && !isCheckOut && 'ring-1 ring-inset ring-tide',
                        inRange && 'bg-tide-glow/15 text-tide',
                        (isCheckIn || isCheckOut) && 'bg-tide font-semibold text-white shadow-sm',
                      )}
                      style={
                        unavailable
                          ? { backgroundImage: 'repeating-linear-gradient(45deg, var(--c-err) 0 2px, transparent 2px 6px)' }
                          : undefined
                      }
                    >
                      {cell.date.getDate()}
                      {fewLeft && !isCheckIn && !isCheckOut ? (
                        <span className="absolute bottom-1 h-1 w-1 rounded-full bg-ember" aria-hidden="true" />
                      ) : null}
                      {partiallyBlocked && !isCheckIn && !isCheckOut ? (
                        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-warn" aria-hidden="true" />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 space-y-2 border-t border-line pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-ink-3">
                    {nights > 0 ? `${nights} night${nights > 1 ? 's' : ''}` : 'Select dates'}
                  </span>
                  <div className="flex items-end gap-0.5" aria-hidden="true">
                    {[6, 10, 14, 10, 6].map((h, i) => (
                      <span
                        key={i}
                        className="w-0.5 rounded-full bg-tide-glow"
                        style={{ height: h, animation: `wave-bounce-${i + 1} 1.1s ease-in-out infinite` }}
                      />
                    ))}
                  </div>
                </div>

                {checkIn && checkOut && availability ? (
                  soldOutNights.length > 0 ? (
                    <p className="flex items-start gap-1.5 font-mono text-[10px] font-bold text-err">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        No rooms left on {soldOutNights.map((d) => fmtShort(d)).join(', ')} — pick other dates
                      </span>
                    </p>
                  ) : minSelectedRooms !== undefined ? (
                    <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-ok">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      {minSelectedRooms} room{minSelectedRooms === 1 ? '' : 's'} left for your selected dates
                    </p>
                  ) : null
                ) : null}
                {availability ? (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[10px] text-ink-3">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-ember" aria-hidden="true" />
                      Few rooms left
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-warn" aria-hidden="true" />
                      Host blocked room
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-line"
                        style={{ backgroundImage: 'repeating-linear-gradient(45deg, var(--c-err) 0 2px, transparent 2px 6px)' }}
                        aria-hidden="true"
                      />
                      Blocked / sold out
                    </span>
                  </div>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
