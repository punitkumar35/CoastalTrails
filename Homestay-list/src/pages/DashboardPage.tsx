import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, IndianRupee, Plus, Waves, BookOpen } from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { Reveal } from '../components/ui/Reveal';
import type { Booking, Owner, OwnerStats } from '../types';

export function DashboardPage({ owner }: { owner: Owner }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getOwnerStats(owner.phone), api.getOwnerBookings(owner.phone)])
      .then(([s, b]) => {
        if (cancelled) return;
        setStats(s);
        setBookings(b);
      })
      .catch((err) => console.error(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [owner.phone]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-10">
      <div>
        <p className="overline">Namaskara, host</p>
        <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {owner.name.split(' ')[0]}'s dashboard
        </h1>
        <p className="mt-2 text-sm text-ink-2">Your stays, bookings and holds in one calm view.</p>
      </div>

      <Reveal>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'My stays', value: String(stats?.stayCount ?? 0), icon: Waves },
          { label: 'Upcoming bookings', value: String(stats?.upcoming ?? 0), icon: CalendarDays },
          { label: 'Total bookings', value: String(stats?.bookingCount ?? 0), icon: BookOpen },
          { label: 'Holds received', value: `₹${(stats?.holdsPaid ?? 0).toLocaleString('en-IN')}`, icon: IndianRupee },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-elevated p-4">
            <s.icon className="h-4 w-4 text-tide" />
            <p className="mt-2 font-display text-2xl font-semibold text-ink">{s.value}</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">{s.label}</p>
          </div>
        ))}
        </div>
      </Reveal>

      <Reveal delay={0.1}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-3">
          <p className="overline">Recent bookings</p>
          {bookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-2 bg-paper-2 p-8 text-center text-sm text-ink-2">
              No bookings yet — they appear here the moment a guest holds a date.
            </div>
          ) : (
            bookings.slice(0, 5).map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-elevated p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{b.homestay_title}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-3">
                    {b.reference_code} · {b.user_name} · {b.check_in} → {b.check_out}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono-data text-sm font-semibold text-tide">₹{b.advance_paid}</span>
                  <Badge variant={b.status === 'confirmed' ? 'dot' : 'warm'}>
                    {b.status === 'confirmed' ? 'Confirmed' : b.status === 'declined' ? 'Declined' : 'Awaiting'}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="h-fit space-y-3 rounded-3xl border border-line bg-paper-2 p-5">
          <p className="overline">Quick actions</p>
          <Button onClick={() => navigate('/stays')} className="w-full gap-2">
            <Waves className="h-4 w-4" />
            Manage my stays
          </Button>
          <Button variant="secondary" onClick={() => navigate('/bookings')} className="w-full gap-2">
            <BookOpen className="h-4 w-4" />
            Review bookings
          </Button>
          <Button variant="ghost" onClick={() => navigate('/stays')} className="w-full gap-2">
            <CalendarDays className="h-4 w-4" />
            Block availability
          </Button>
          <p className="flex items-center justify-center gap-1 pt-2 text-center font-mono text-[10px] uppercase tracking-wider text-ink-3">
            <Plus className="h-3 w-3" />
            New stays via the stays page
          </p>
        </div>
      </div>
      </Reveal>
    </div>
  );
}
