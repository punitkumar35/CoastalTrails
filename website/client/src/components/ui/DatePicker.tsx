import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { easeOut } from '../../lib/motion';
import { toISO, parseISO, startOfDay } from '../../lib/dates';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const PANEL_W = 320;

interface DatePickerProps {
  value: string;
  onChange: (iso: string) => void;
  maxDate?: string;
  minDate?: string;
  label?: string;
  placeholder?: string;
  hint?: string;
  className?: string;
}

interface PanelPos {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  up: boolean;
}

function fmtLong(iso: string) {
  const d = parseISO(iso);
  return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

export function DatePicker({
  value,
  onChange,
  maxDate,
  minDate,
  label = 'Date',
  placeholder = 'Add date',
  hint,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => startOfDay(parseISO(value) || new Date()));
  const [pos, setPos] = useState<PanelPos | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const todayISO = toISO(startOfDay(new Date()));
  const maxISO = maxDate || todayISO;
  const minISO = minDate || '1900-01-01';

  useEffect(() => {
    if (!open) return;
    setMonth(startOfDay(parseISO(value) || new Date()));

    function update() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const up = spaceBelow < 420 && r.top > 420;
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
  }, [open, value]);

  const gridDays = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(year, m, 1);
    const offset = (first.getDay() + 6) % 7;
    const count = new Date(year, m + 1, 0).getDate();
    const prevMonthDays = new Date(year, m, 0).getDate();

    const cells: { date: Date; isCurrentMonth: boolean }[] = [];
    for (let i = offset - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, m - 1, prevMonthDays - i), isCurrentMonth: false });
    }
    for (let d = 1; d <= count; d++) {
      cells.push({ date: new Date(year, m, d), isCurrentMonth: true });
    }
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      for (let d = 1; d <= 7 - remainder; d++) {
        cells.push({ date: new Date(year, m + 1, d), isCurrentMonth: false });
      }
    }
    return cells;
  }, [month]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const out: number[] = [];
    for (let y = currentYear; y >= 1900; y--) out.push(y);
    return out;
  }, []);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'flex h-11 w-full items-center gap-2.5 rounded-xl border bg-elevated px-3.5 text-left transition-all',
          open ? 'border-tide ring-2 ring-tide/20' : 'border-line-2 hover:border-tide',
        )}
      >
        <Calendar className="h-4 w-4 shrink-0 text-tide" />
        <span className={cn('flex-1 text-sm font-medium', value ? 'text-ink' : 'text-ink-3')}>
          {value ? fmtLong(value) : placeholder}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear date"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onChange('');
              }
            }}
            className="rounded-full p-1 text-ink-3 transition-colors hover:bg-paper-2 hover:text-err"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && pos ? (
            <motion.div
              key="date-picker-panel"
              ref={panelRef}
              initial={{ opacity: 0, y: pos.up ? 8 : -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: pos.up ? 6 : -6, scale: 0.98 }}
              transition={{ duration: 0.22, ease: easeOut }}
              role="dialog"
              aria-label={`Choose ${label.toLowerCase()}`}
              style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}
              className="z-palette rounded-2xl border border-line bg-elevated p-4 shadow-2xl"
            >
              <div className="mb-2 flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  aria-label="Previous month"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex flex-1 items-center justify-center gap-1.5">
                  <select
                    value={month.getMonth()}
                    onChange={(e) => setMonth((m) => new Date(m.getFullYear(), Number(e.target.value), 1))}
                    aria-label="Month"
                    className="h-8 rounded-lg border border-line-2 bg-elevated px-2 font-display text-sm text-ink focus:border-tide focus:outline-none"
                  >
                    {MONTHS.map((name, i) => (
                      <option key={name} value={i}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={month.getFullYear()}
                    onChange={(e) => setMonth((m) => new Date(Number(e.target.value), m.getMonth(), 1))}
                    aria-label="Year"
                    className="h-8 rounded-lg border border-line-2 bg-elevated px-2 font-display text-sm text-ink focus:border-tide focus:outline-none"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  aria-label="Next month"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
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
                {gridDays.map((cell) => {
                  const iso = toISO(cell.date);
                  const isFuture = iso > maxISO;
                  const isTooEarly = iso < minISO;
                  const disabled = isFuture || isTooEarly;
                  const isSelected = iso === value;
                  const isToday = iso === todayISO;
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        onChange(iso);
                        setOpen(false);
                      }}
                      title={disabled ? (isFuture ? 'Future date' : 'Too far back') : undefined}
                      className={cn(
                        'relative mx-auto flex h-9 w-9 items-center justify-center rounded-full font-display text-sm transition-all duration-micro',
                        disabled && (cell.isCurrentMonth ? 'cursor-not-allowed text-ink-3/30' : 'cursor-not-allowed text-ink-3/15'),
                        !disabled &&
                          !isSelected &&
                          (cell.isCurrentMonth
                            ? 'text-ink hover:bg-paper-2'
                            : 'text-ink-3/40 hover:bg-paper-2 hover:text-ink'),
                        isToday && !isSelected && 'ring-1 ring-inset ring-tide',
                        isSelected && 'bg-tide font-semibold text-white shadow-sm',
                      )}
                    >
                      {cell.date.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <span className="font-mono text-[11px] text-ink-3">{value ? fmtLong(value) : 'No date selected'}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onChange('');
                      setOpen(false);
                    }}
                    className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-3 transition-colors hover:text-err"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-tide px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-tide-2"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
