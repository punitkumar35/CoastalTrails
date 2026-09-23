import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, ShieldCheck, Star, ThumbsUp, Waves, X } from 'lucide-react';
import type { Homestay, Review } from '../types';
import { api } from '../services/api';
import { cn } from '../lib/cn';

const PAGE_SIZE = 10;

function timeAgo(value: string): string {
  const then = new Date(String(value).replace(' ', 'T')).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

export function StayReviewsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [homestay, setHomestay] = useState<Homestay | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [helpfulReviewIds, setHelpfulReviewIds] = useState<number[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([api.getHomestay(id), api.getReviews(id, PAGE_SIZE, 0)])
      .then(([stay, reviewData]) => {
        if (cancelled) return;
        setHomestay(stay);
        setReviews(reviewData.reviews);
        setTotal(reviewData.total);
      })
      .catch((err) => console.error('Failed to load reviews page:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadMore = async () => {
    if (!id || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await api.getReviews(id, PAGE_SIZE, reviews.length);
      setReviews((prev) => [...prev, ...data.reviews]);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load more reviews:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleHelpful = async (reviewId: number) => {
    if (helpfulReviewIds.includes(reviewId)) return;
    try {
      const updated = await api.markReviewHelpful(reviewId);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, helpful_count: updated.helpful_count } : r)));
      setHelpfulReviewIds((prev) => [...prev, reviewId]);
    } catch (err) {
      console.error('Failed to mark review helpful:', err);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 py-10">
        <div className="h-8 w-52 animate-pulse rounded-xl bg-paper-2" />
        <div className="h-64 w-full animate-pulse rounded-3xl bg-paper-2" />
      </div>
    );
  }

  if (!homestay) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-line bg-elevated px-8 py-16 text-center">
        <Waves className="mx-auto mb-4 h-6 w-6 text-tide" />
        <h1 className="font-display text-2xl font-semibold text-ink">Stay not found</h1>
        <button onClick={() => navigate('/')} className="mt-4 text-xs font-semibold text-tide hover:underline">
          Explore stays instead
        </button>
      </div>
    );
  }

  const hasMore = reviews.length < total;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-24">
      <button
        type="button"
        onClick={() => navigate(`/stay/${homestay.id}`)}
        className="inline-flex items-center gap-2 rounded-xl border border-line bg-elevated px-3.5 py-2 text-xs font-semibold text-ink-2 transition-all hover:border-tide hover:text-tide active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to stay
      </button>

      <div className="rounded-3xl border border-line bg-elevated p-6 sm:p-8">
        <p className="overline">Guest reviews</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{homestay.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {homestay.reviews_count > 0 ? (
            <>
              <span className="font-display text-4xl font-semibold text-ember">{homestay.rating}</span>
              <div>
                <div className="flex gap-0.5 text-gold" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className={cn('h-4 w-4', i < Math.round(homestay.rating) ? 'fill-current' : 'fill-none opacity-40')} />
                  ))}
                </div>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                  {total} {total === 1 ? 'review' : 'reviews'}
                </p>
              </div>
            </>
          ) : (
            <span className="rounded-full border border-line-2 bg-paper-2 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-ink-3">
              No reviews yet
            </span>
          )}
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-3xl border border-line bg-elevated px-8 py-14 text-center">
          <p className="text-sm text-ink-2">This stay hasn't been reviewed yet. Be the first to share your experience.</p>
          <button
            type="button"
            onClick={() => navigate(`/stay/${homestay.id}`)}
            className="mt-4 rounded-full bg-tide px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-tide-2"
          >
            Write a review
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <article key={r.id} className="rounded-2xl border border-line bg-elevated p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tide/15 font-display text-sm font-semibold text-tide">
                    {r.guest_name.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{r.guest_name}</p>
                    {r.stay_details ? <p className="truncate text-[11px] text-ink-3">{r.stay_details}</p> : null}
                  </div>
                </div>
                {r.verified ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-ok/30 bg-ok/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ok">
                    <ShieldCheck className="h-3 w-3" />
                    Verified stay
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <span className="flex gap-0.5 text-gold" aria-label={`${r.rating} out of 5 stars`}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className={cn('h-3.5 w-3.5', i < r.rating ? 'fill-current' : 'fill-none opacity-40')} />
                  ))}
                </span>
                <span className="text-sm font-semibold text-ink">{r.title}</span>
              </div>

              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">
                {timeAgo(r.created_at)}
                {r.updated_at && String(r.updated_at) !== String(r.created_at) ? ' · edited' : ''}
              </p>

              <p className="mt-2.5 text-sm leading-relaxed text-ink-2">{r.body}</p>

              {r.media && r.media.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.media.map((m, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightbox(m.url)}
                      aria-label="Open guest photo"
                      className="h-24 w-32 overflow-hidden rounded-xl border border-line transition-transform hover:scale-[1.02]"
                    >
                      <img src={m.url} alt="Guest photo" loading="lazy" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleHelpful(r.id)}
                  disabled={helpfulReviewIds.includes(r.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold transition-colors',
                    helpfulReviewIds.includes(r.id)
                      ? 'cursor-default border-ok/40 bg-ok/10 text-ok'
                      : 'border-line-2 text-ink-2 hover:border-tide hover:text-tide',
                  )}
                >
                  <ThumbsUp className="h-3 w-3" />
                  {helpfulReviewIds.includes(r.id) ? 'Marked helpful' : 'Helpful'}
                </button>
                <span className="text-ink-3">
                  {r.helpful_count} {r.helpful_count === 1 ? 'person' : 'people'} found this helpful
                </span>
              </div>
            </article>
          ))}

          {hasMore ? (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-line-2 bg-elevated py-3 text-xs font-semibold text-ink-2 transition-colors hover:border-tide hover:text-tide disabled:opacity-60"
            >
              {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loadingMore ? 'Loading…' : `Load more reviews (${total - reviews.length} left)`}
            </button>
          ) : (
            <p className="pt-1 text-center font-mono text-[10px] uppercase tracking-wider text-ink-3">
              Showing all {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
            </p>
          )}
        </div>
      )}

      {lightbox ? (
        <div
          className="fixed inset-0 z-palette flex items-center justify-center bg-ink/85 p-6 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-label="Guest photo"
        >
          <img
            src={lightbox}
            alt="Guest photo enlarged"
            className="max-h-[85vh] max-w-full rounded-2xl border border-white/20 object-contain"
          />
          <button
            type="button"
            aria-label="Close photo"
            onClick={() => setLightbox(null)}
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
