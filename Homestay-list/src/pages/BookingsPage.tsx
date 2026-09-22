import { useEffect, useState } from 'react';
import { Check, Clock, Phone, X } from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { BookOpen } from 'lucide-react';
import type { Booking, Owner } from '../types';

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function BookingsPage({ owner }: { owner: Owner }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getOwnerBookings(owner.phone)
      .then(setBookings)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [owner.phone]);

  async function setStatus(b: Booking, status: Booking['status']) {
    try {
      await api.setBookingStatus(b.id, status);
      setBookings((list) => list.map((x) => (x.id === b.id ? { ...x, status } : x)));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <p className="overline">Guest requests</p>
        <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Bookings</h1>
        <p className="mt-2 text-sm text-ink-2">Confirm or decline guest holds for your stays.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          overline="Quiet for now"
          title="No bookings yet"
          description="Guest holds on your stays will appear here for confirmation."
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="rounded-2xl border border-line bg-elevated p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{b.reference_code}</span>
                    <Badge variant={b.status === 'confirmed' ? 'dot' : b.status === 'declined' ? 'warm' : 'solid'}>
                      {b.status === 'confirmed' ? 'Confirmed' : b.status === 'declined' ? 'Declined' : 'Awaiting host'}
                    </Badge>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-ink">{b.homestay_title}</h3>
                  <p className="text-xs text-ink-2">
                    {fmt(b.check_in)} → {fmt(b.check_out)} · {b.guests_count} guest{b.guests_count > 1 ? 's' : ''}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-ink-2">
                    <Phone className="h-3 w-3 text-tide" />
                    {b.user_name} · {b.user_phone}
                  </p>
                </div>

                <div className="shrink-0 space-y-2 text-right">
                  <div>
                    <p className="font-mono-data text-sm font-semibold text-ink">₹{b.total_amount}</p>
                    <p className="text-[10px] text-ink-3">hold ₹{b.advance_paid} · balance ₹{b.balance_payable_at_property}</p>
                  </div>
                  {b.status === 'awaiting_host' ? (
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" onClick={() => setStatus(b, 'confirmed')} className="gap-1">
                        <Check className="h-3.5 w-3.5" />
                        Confirm
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setStatus(b, 'declined')} className="gap-1">
                        <X className="h-3.5 w-3.5" />
                        Decline
                      </Button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-ink-3">
                      <Clock className="h-3 w-3" />
                      Settled
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
