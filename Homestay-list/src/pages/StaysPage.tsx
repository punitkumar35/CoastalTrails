import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Pencil, Plus, Waves } from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import type { Homestay, Owner } from '../types';

export function StaysPage({ owner }: { owner: Owner }) {
  const navigate = useNavigate();
  const [stays, setStays] = useState<Homestay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getOwnerStays(owner.phone)
      .then(setStays)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [owner.phone]);

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="overline">Your portfolio</p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">My stays</h1>
          <p className="mt-2 text-sm text-ink-2">
            {stays.length} stay{stays.length === 1 ? '' : 's'} listed under {owner.name}.
          </p>
        </div>
        <Button onClick={() => navigate('/stays/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          Add a stay
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      ) : stays.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-2 bg-paper-2 p-12 text-center">
          <Waves className="mx-auto h-8 w-8 text-ink-3" />
          <p className="mt-3 text-sm font-semibold text-ink">No stays listed yet</p>
          <p className="mt-1 text-xs text-ink-2">Your stays will appear here once added to the network.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stays.map((s) => (
            <div key={s.id} className="group overflow-hidden rounded-2xl border border-line bg-elevated transition-all hover:-translate-y-0.5 hover:border-tide">
              <div className="aspect-[16/10] overflow-hidden bg-paper-2">
                <img
                  src={s.imageUrls[0]}
                  alt={s.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-lg font-semibold text-ink">{s.title}</h3>
                    <p className="truncate text-xs text-ink-2">{s.location_display}</p>
                  </div>
                  <span className="shrink-0 font-mono-data text-sm font-semibold text-ink">₹{s.price_per_night}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="dot">
                    {s.bookingsCount ?? 0} booking{(s.bookingsCount ?? 0) === 1 ? '' : 's'}
                  </Badge>
                  <Badge variant="warm">
                    {s.blockedDates.length} date{s.blockedDates.length === 1 ? '' : 's'} blocked
                  </Badge>
                  <Badge variant="outline">★ {s.rating}</Badge>
                </div>
                <div className="flex items-center gap-2 border-t border-line pt-3">
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/stays/${s.id}/edit`)} className="flex-1 gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/stays/${s.id}/availability`)} className="flex-1 gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Dates
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
