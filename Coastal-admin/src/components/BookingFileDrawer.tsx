import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@iconify/react';
import { api, type RoomStatusResponse } from '../services/api';
import type { Booking, BookingStatus } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Skeleton } from './ui/Skeleton';
import { cn } from '../lib/cn';

function fmt(d: string | undefined | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

function nights(b: Booking): number {
  const a = new Date(`${b.check_in}T00:00:00`).getTime();
  const c = new Date(`${b.check_out}T00:00:00`).getTime();
  return Math.max(0, Math.round((c - a) / 86400000));
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  if (status === 'confirmed') return <Badge variant="dot">Confirmed</Badge>;
  if (status === 'declined') return <Badge variant="warm">Declined</Badge>;
  if (status === 'cancelled') return <Badge variant="outline">Cancelled</Badge>;
  return <Badge variant="solid">Awaiting host</Badge>;
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-paper-2/60 px-3 py-2.5">
      <Icon icon={icon} className="h-4 w-4 shrink-0 text-tide" />
      <div className="min-w-0">
        <p className="font-mono text-[9px] uppercase tracking-wider text-ink-3">{label}</p>
        <p className="truncate text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

export function BookingFileDrawer({
  booking,
  busy,
  onClose,
  onStatusChange,
}: {
  booking: Booking | null;
  busy: boolean;
  onClose: () => void;
  onStatusChange: (b: Booking, status: BookingStatus) => void;
}) {
  const [rooms, setRooms] = useState<RoomStatusResponse | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(false);

  useEffect(() => {
    if (!booking) {
      setRooms(null);
      return;
    }
    let alive = true;
    setRoomsLoading(true);
    setRooms(null);
    const windowDays = Math.min(Math.max(nights(booking) + 1, 1), 31);
    api
      .getRoomStatus(booking.homestay_id, booking.check_in, windowDays)
      .then((r) => {
        if (alive) setRooms(r);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (alive) setRoomsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [booking]);

  useEffect(() => {
    if (!booking) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [booking, onClose]);

  return createPortal(
    <AnimatePresence>
      {booking && (
        <>
          <motion.button
            type="button"
            aria-label="Close booking details"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 cursor-default bg-ink/40 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto border-l border-line bg-paper shadow-2xl"
          >
            <div className="sticky top-0 z-10 border-b border-line bg-paper/90 p-5 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="overline">Booking file</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-3">{booking.reference_code}</p>
                </div>
                <div className="flex items-center gap-2">
                  <BookingStatusBadge status={booking.status} />
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-elevated text-ink-2 transition-colors hover:text-ink"
                  >
                    <Icon icon="lucide:x" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <section>
                <p className="overline flex items-center gap-1.5">
                  <Icon icon="lucide:users" className="h-3.5 w-3.5 text-tide" />
                  Guest
                </p>
                <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <DetailRow icon="lucide:user" label="Name" value={booking.user_profile_name || booking.user_name} />
                  <DetailRow icon="lucide:phone" label="Phone" value={booking.user_phone} />
                  <DetailRow icon="lucide:mail" label="Email" value={booking.user_email || 'Not on file'} />
                  <DetailRow icon="lucide:users" label="Guests" value={`${booking.guests_count} guest${booking.guests_count === 1 ? '' : 's'}`} />
                </div>
              </section>

              <section>
                <p className="overline flex items-center gap-1.5">
                  <Icon icon="lucide:waves" className="h-3.5 w-3.5 text-tide" />
                  Stay
                </p>
                <div className="mt-2.5 space-y-2">
                  <DetailRow icon="lucide:waves" label="Homestay" value={booking.homestay_title ?? '—'} />
                  <DetailRow icon="lucide:map-pin" label="Location" value={booking.location_display ?? '—'} />
                  <DetailRow icon="lucide:user" label="Host" value={`${booking.host_name ?? '—'} · ${booking.host_whatsapp ?? '—'}`} />
                  <DetailRow icon="lucide:globe" label="Channel" value={booking.channel || 'Direct website'} />
                </div>
              </section>

              <section>
                <p className="overline flex items-center gap-1.5">
                  <Icon icon="lucide:calendar-days" className="h-3.5 w-3.5 text-tide" />
                  Dates
                </p>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <DetailRow icon="lucide:calendar-days" label="Check-in" value={fmt(booking.check_in)} />
                  <DetailRow icon="lucide:calendar-days" label="Check-out" value={fmt(booking.check_out)} />
                  <DetailRow icon="lucide:clock" label="Booked on" value={fmt(booking.created_at)} />
                  <DetailRow icon="lucide:clock" label="Hold expires" value={fmt(booking.hold_expires_at)} />
                </div>
              </section>

              <section>
                <p className="overline flex items-center gap-1.5">
                  <Icon icon="lucide:layout-grid" className="h-3.5 w-3.5 text-tide" />
                  Room status during stay
                </p>
                {roomsLoading ? (
                  <Skeleton className="mt-2.5 h-28 w-full rounded-xl" />
                ) : rooms ? (
                  <>
                    <div className="mt-2.5 overflow-x-auto rounded-xl border border-line">
                      <div className="min-w-[280px]">
                        <div
                          className="grid border-b border-line bg-paper-2"
                          style={{ gridTemplateColumns: `72px repeat(${rooms.rooms[0].days.length}, minmax(34px, 1fr))` }}
                        >
                          <div className="px-2 py-2 font-mono text-[9px] uppercase tracking-wider text-ink-3">Room</div>
                          {rooms.rooms[0].days.map((d) => (
                            <div key={d.date} className="px-0.5 py-2 text-center">
                              <p className="font-mono text-[8px] uppercase text-ink-3">
                                {new Date(`${d.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })}
                              </p>
                              <p className="font-mono-data text-[10px] font-semibold text-ink">{Number(d.date.slice(8))}</p>
                            </div>
                          ))}
                        </div>
                        {rooms.rooms.map((r) => (
                          <div
                            key={r.number}
                            className="grid border-b border-line last:border-b-0"
                            style={{ gridTemplateColumns: `72px repeat(${rooms.rooms[0].days.length}, minmax(34px, 1fr))` }}
                          >
                            <div className="flex items-center px-2 py-1.5 font-mono text-[9px] font-semibold text-ink">R{r.number}</div>
                            {r.days.map((d) => {
                              const cls =
                                d.status === 'available'
                                  ? 'bg-ok/15 text-ok'
                                  : d.status === 'booked'
                                    ? 'bg-tide text-white'
                                    : d.status === 'blocked'
                                      ? 'bg-err/15 text-err'
                                      : 'bg-ember/15 text-ember';
                              const label = d.status === 'available' ? 'F' : d.status === 'booked' ? 'B' : d.status === 'blocked' ? 'X' : 'M';
                              return (
                                <div key={d.date} className="flex items-center justify-center px-0.5 py-1">
                                  <span
                                    title={`Room ${r.number} · ${d.date}: ${d.status}`}
                                    className={cn('flex h-6 w-full items-center justify-center rounded font-mono text-[9px] font-semibold', cls)}
                                  >
                                    {label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px] text-ink-3">
                      <span className="flex items-center gap-1">
                        <Icon icon="lucide:circle-check" className="h-3 w-3 text-ok" />
                        F free
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon icon="lucide:calendar-check" className="h-3 w-3 text-tide" />
                        B booked
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon icon="lucide:ban" className="h-3 w-3 text-err" />
                        X blocked
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon icon="lucide:wrench" className="h-3 w-3 text-ember" />
                        M maint
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-ink-3">Room status unavailable.</p>
                )}
              </section>

              <section className="rounded-2xl border border-line bg-paper-2/60 p-4">
                <p className="overline flex items-center gap-1.5">
                  <Icon icon="lucide:indian-rupee" className="h-3.5 w-3.5 text-gold" />
                  Payment
                </p>
                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-ink-2">Total amount</span>
                    <span className="font-mono-data text-base font-semibold text-ink">₹{fmtMoney(booking.total_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-ink-2">Advance paid (20%)</span>
                    <span className="font-mono-data text-sm font-semibold text-ok">₹{fmtMoney(booking.advance_paid)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-ink-2">Balance at property</span>
                    <span className="font-mono-data text-sm font-semibold text-ember">₹{fmtMoney(booking.balance_payable_at_property)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-paper-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-ok to-tide transition-all"
                      style={{ width: `${booking.total_amount ? Math.min(100, (booking.advance_paid / booking.total_amount) * 100) : 0}%` }}
                    />
                  </div>
                  <p className="font-mono text-[10px] text-ink-3">
                    {booking.total_amount ? Math.round((booking.advance_paid / booking.total_amount) * 100) : 0}% collected upfront
                  </p>
                </div>
              </section>

              {booking.status === 'awaiting_host' ? (
                <div className="flex gap-2">
                  <Button className="flex-1 gap-1.5" disabled={busy} onClick={() => onStatusChange(booking, 'confirmed')}>
                    <Icon icon="lucide:check" className="h-4 w-4" />
                    Confirm
                  </Button>
                  <Button variant="secondary" className="flex-1 gap-1.5" disabled={busy} onClick={() => onStatusChange(booking, 'declined')}>
                    <Icon icon="lucide:x" className="h-4 w-4" />
                    Decline
                  </Button>
                </div>
              ) : booking.status === 'confirmed' ? (
                <div className="flex gap-2">
                  <Button className="flex-1 gap-1.5" disabled={busy} onClick={() => onStatusChange(booking, 'checked_in')}>
                    <Icon icon="lucide:log-in" className="h-4 w-4" />
                    Check in
                  </Button>
                  <Button variant="secondary" className="flex-1 gap-1.5" disabled={busy} onClick={() => onStatusChange(booking, 'cancelled')}>
                    <Icon icon="lucide:ban" className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              ) : booking.status === 'checked_in' ? (
                <Button className="w-full gap-1.5" disabled={busy} onClick={() => onStatusChange(booking, 'completed')}>
                  <Icon icon="lucide:flag" className="h-4 w-4" />
                  Complete stay
                </Button>
              ) : (
                <p className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-2 bg-paper-2 py-3 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                  <Icon icon="lucide:clock" className="h-3.5 w-3.5" />
                  {booking.status === 'pending_payment' ? 'Awaiting payment' : 'Settled'}
                </p>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
