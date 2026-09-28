import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, MapPin, Star, Trash2 } from 'lucide-react';
import { formatINR } from '../../components/profile/status';
import { useStayImages } from '../../components/profile/useStayImages';
import { api } from '../../services/api';
import type { WishlistStay } from '../../types';

export function ProfileWishlistPage() {
  const [saved, setSaved] = useState<WishlistStay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const images = useStayImages();

  useEffect(() => {
    api
      .getWishlist()
      .then(setSaved)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your wishlist.'))
      .finally(() => setLoading(false));
  }, []);

  async function remove(homestayId: string) {
    setBusyId(homestayId);
    try {
      await api.removeFromWishlist(homestayId);
      setSaved((prev) => prev.filter((s) => s.id !== homestayId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove this stay.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-tide">Saved</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Wishlist</h1>
        <p className="mt-1 text-sm text-ink-2">Stays you saved while browsing. Open one to check dates and book.</p>
      </div>

      {error ? <p className="text-sm font-medium text-err">{error}</p> : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-72 animate-pulse rounded-3xl border border-line bg-paper-2" />
          <div className="h-72 animate-pulse rounded-3xl border border-line bg-paper-2" />
        </div>
      ) : saved.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-line bg-elevated px-6 py-14 text-center">
          <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-tide-glow/15 blur-3xl" />
          <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-tide/10 text-tide">
            <Heart className="h-6 w-6" />
          </span>
          <h3 className="relative mt-4 font-display text-lg font-semibold text-ink">Nothing saved yet</h3>
          <p className="relative mx-auto mt-1.5 max-w-sm text-sm text-ink-2">
            Tap the heart on any stay to keep it here for later planning.
          </p>
          <Link
            to="/"
            className="relative mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-tide px-6 text-sm font-semibold text-white transition-colors hover:bg-tide-2"
          >
            Browse stays
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {saved.map((stay) => (
            <article
              key={stay.id}
              className="group overflow-hidden rounded-3xl border border-line bg-elevated shadow-[0_1px_2px_rgba(22,34,46,0.04),0_20px_44px_-30px_rgba(22,34,46,0.3)] transition-all duration-micro hover:-translate-y-0.5 hover:border-tide/30"
            >
              <div className="relative h-44 overflow-hidden">
                <Link to={`/stay/${stay.id}`} className="block h-full">
                  {images[stay.id] ? (
                    <img
                      src={images[stay.id]}
                      alt={stay.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-paper-2">
                      <MapPin className="h-6 w-6 text-ink-3" />
                    </div>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={() => remove(stay.id)}
                  disabled={busyId === stay.id}
                  aria-label={`Remove ${stay.title} from wishlist`}
                  title="Remove from wishlist"
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-ink/40 text-white backdrop-blur transition-colors hover:bg-err disabled:opacity-60"
                >
                  <Heart className="h-4 w-4 fill-current" />
                </button>
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/30 bg-ink/40 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                  <Star className="h-3 w-3 fill-gold text-gold" />
                  {Number(stay.rating || 0).toFixed(1)} · {stay.reviews_count} reviews
                </span>
              </div>

              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/stay/${stay.id}`}
                      className="font-display text-lg font-semibold text-ink transition-colors hover:text-tide"
                    >
                      {stay.title}
                    </Link>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-3">
                      <MapPin className="h-3.5 w-3.5" />
                      {stay.location_display}
                    </p>
                  </div>
                  <p className="shrink-0 text-right">
                    <span className="font-display text-lg font-semibold text-ink">{formatINR(stay.price_per_night)}</span>
                    <span className="block text-[11px] text-ink-3">per night</span>
                  </p>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-ink-2">{stay.subtitle || stay.description}</p>
                <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                  <button
                    type="button"
                    onClick={() => remove(stay.id)}
                    disabled={busyId === stay.id}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-ink-3 transition-colors hover:text-err disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                  <Link
                    to={`/stay/${stay.id}`}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-tide px-4 text-xs font-semibold text-white transition-colors hover:bg-tide-2"
                  >
                    View Details
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
