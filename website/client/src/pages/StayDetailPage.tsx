import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveRefresh } from '../lib/live';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  BedDouble,
  Calendar,
  Check,
  Clock,
  Compass,
  Footprints,
  Heart,
  ImagePlus,
  MapPin,
  Minus,
  Moon,
  PenLine,
  Plus,
  Share2,
  ShieldCheck,
  Star,
  ThumbsUp,
  Trash2,
  Waves,
  X,
} from 'lucide-react';
import type { Homestay, Review, ReviewSummary, User } from '../types';
import { api } from '../services/api';
import { CoastalMapView } from '../components/CoastalMapView';
import { ColorfulIcon } from '../components/ColorfulIcon';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Reveal } from '../components/ui/Reveal';
import { MagneticButton } from '../components/ui/MagneticButton';
import { SpotlightCard } from '../components/ui/SpotlightCard';
import { Rating } from '../components/ui/Rating';
import { DateRangePicker } from '../components/ui/DateRangePicker';
import { cn } from '../lib/cn';

interface StayDetailPageProps {
  homestay?: Homestay | null;
  currentUser?: User | null;
  onBack?: () => void;
  onBook?: (stay?: Homestay) => void;
  onNavigateRoute?: () => void;
  onRequireAuth?: () => void;
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80';

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/bmp', 'image/avif', 'image/tiff'];
const MAX_REVIEW_PHOTO_BYTES = 5 * 1024 * 1024;

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

function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-elevated p-4">
      <div className="flex items-center gap-2 text-tide">
        {icon}
        <span className="overline !text-ink-3">{label}</span>
      </div>
      <div className="mt-2 font-display text-2xl font-semibold text-ink">{value}</div>
    </div>
  );
}

function SectionTitle({ index, title }: { index: string; title: string }) {
  return (
    <div className="mb-5">
      <p className="overline mb-1.5">{index}</p>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h2>
    </div>
  );
}

function GoodToKnow({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-line bg-elevated p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-tide-glow/15 text-tide">{icon}</div>
      <h4 className="mt-3 text-sm font-semibold text-ink">{title}</h4>
      <p className="mt-1 text-xs leading-relaxed text-ink-2">{body}</p>
    </div>
  );
}

export function StayDetailPage({ homestay: propHomestay, currentUser = null, onBack, onBook, onNavigateRoute, onRequireAuth }: StayDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [homestay, setHomestay] = useState<Homestay | null>(propHomestay || null);
  const [loading, setLoading] = useState<boolean>(!propHomestay);
  const [activeImage, setActiveImage] = useState(0);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [wishlisted, setWishlisted] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (propHomestay) {
      setHomestay(propHomestay);
      setLoading(false);
      return;
    }
    if (id) {
      setLoading(true);
      api
        .getHomestay(id)
        .then(setHomestay)
        .catch((err) => console.error('Failed to fetch homestay details:', err))
        .finally(() => setLoading(false));
    }
  }, [id, propHomestay]);

  useLiveRefresh(() => {
    if (!id) return;
    api
      .getHomestay(id)
      .then(setHomestay)
      .catch((err) => console.error('Failed to refresh homestay details:', err));
  }, 20000);

  useEffect(() => {
    if (!homestay) return;
    try {
      setWishlisted(JSON.parse(localStorage.getItem('coastal_wishlist') || '[]').includes(homestay.id));
      const search = JSON.parse(localStorage.getItem('gokarna_search_dates') || 'null');
      if (search?.checkIn && search?.checkOut) {
        setCheckIn(search.checkIn);
        setCheckOut(search.checkOut);
      }
    } catch {
      setWishlisted(false);
    }
  }, [homestay]);

  const [stayAvailability, setStayAvailability] = useState<Record<string, number>>({});
  const [stayBlockedDates, setStayBlockedDates] = useState<Record<string, number>>({});
  const [availabilityListed, setAvailabilityListed] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [helpfulReviewIds, setHelpfulReviewIds] = useState<number[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', body: '' });
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMedia, setReviewMedia] = useState<{ dataUrl: string; type: 'image' }[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);

  // Signing out closes any open review form and hides owner actions immediately
  useEffect(() => {
    if (!currentUser) {
      setShowReviewForm(false);
      setEditingReviewId(null);
      setReviewMedia([]);
    }
  }, [currentUser]);

  const myReview = currentUser ? reviews.find((r) => r.user_id && String(r.user_id) === currentUser.id) || null : null;

  const openReviewForm = (existing?: Review) => {
    setReviewError(null);
    if (existing) {
      setReviewForm({ rating: existing.rating, title: existing.title, body: existing.body });
      setEditingReviewId(existing.id);
    } else {
      setReviewForm({ rating: 5, title: '', body: '' });
      setEditingReviewId(null);
      setReviewMedia([]);
    }
    setShowReviewForm(true);
  };

  const closeReviewForm = () => {
    setShowReviewForm(false);
    setEditingReviewId(null);
    setReviewError(null);
    setReviewMedia([]);
  };

  // Review flash messages dismiss themselves after a few seconds
  useEffect(() => {
    if (!reviewError && !reviewSuccess) return;
    const timer = window.setTimeout(() => {
      setReviewError(null);
      setReviewSuccess(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [reviewError, reviewSuccess]);

  useEffect(() => {
    if (!homestay) return;
    api
      .getReviews(homestay.id, 3, 0)
      .then((res) => {
        setReviews(res.reviews);
        setReviewTotal(res.total);
        setReviewSummary(res.summary);
      })
      .catch((err) => console.error('Failed to load reviews:', err));
  }, [homestay]);

  const handleHelpful = async (id: number) => {
    if (helpfulReviewIds.includes(id)) return;
    try {
      const updated = await api.markReviewHelpful(id);
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, helpful_count: updated.helpful_count } : r)));
      setHelpfulReviewIds((prev) => [...prev, id]);
    } catch (err) {
      console.error('Failed to mark review helpful:', err);
    }
  };

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const remaining = 3 - reviewMedia.length;
    if (remaining <= 0) {
      setReviewError('You can attach up to 3 photos.');
      return;
    }

    const accepted: { dataUrl: string; type: 'image' }[] = [];
    for (const file of files.slice(0, remaining)) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setReviewError('Only photos are supported (JPG, PNG, WEBP, GIF, BMP, AVIF or TIFF).');
        continue;
      }
      if (file.size > MAX_REVIEW_PHOTO_BYTES) {
        setReviewError(`"${file.name}" is over 5 MB — please choose a smaller photo (max 5 MB).`);
        continue;
      }
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('read failed'));
          reader.readAsDataURL(file);
        });
        accepted.push({ dataUrl, type: 'image' });
      } catch {
        setReviewError(`"${file.name}" could not be read. Please try another photo.`);
      }
    }
    if (accepted.length) {
      setReviewSuccess(null);
      setReviewMedia((prev) => [...prev, ...accepted].slice(0, 3));
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homestay) return;
    setReviewError(null);
    setReviewSuccess(null);

    if (!currentUser) {
      setReviewError('Please sign in to write a review.');
      return;
    }
    if (reviewForm.title.trim().length < 3) {
      setReviewError('Please add a short title for your review.');
      return;
    }
    if (reviewForm.body.trim().length < 10) {
      setReviewError('Please write at least 10 characters in your review.');
      return;
    }

    setReviewSubmitting(true);
    try {
      if (editingReviewId) {
        await api.updateReview(editingReviewId, {
          rating: reviewForm.rating,
          title: reviewForm.title.trim(),
          body: reviewForm.body.trim(),
        });
      } else {
        await api.addReview({
          homestay_id: homestay.id,
          rating: reviewForm.rating,
          title: reviewForm.title.trim(),
          body: reviewForm.body.trim(),
          media: reviewMedia,
        });
      }

      const fresh = await api.getReviews(homestay.id, 3, 0);
      setReviews(fresh.reviews);
      setReviewTotal(fresh.total);
      setReviewSummary(fresh.summary);
      setShowReviewForm(false);
      setEditingReviewId(null);
      setReviewForm((f) => ({ ...f, rating: 5, title: '', body: '' }));
      setReviewMedia([]);
      setReviewSuccess(editingReviewId ? 'Your review was updated.' : 'Thank you! Your review is now live.');
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Could not save your review. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteReview = async (review: Review) => {
    if (!homestay) return;
    if (!window.confirm('Delete your review? This cannot be undone.')) return;
    setReviewError(null);
    setReviewSuccess(null);
    try {
      await api.deleteReview(review.id);
      const fresh = await api.getReviews(homestay.id, 3, 0);
      setReviews(fresh.reviews);
      setReviewTotal(fresh.total);
      setReviewSummary(fresh.summary);
      if (editingReviewId === review.id) closeReviewForm();
      setReviewSuccess('Your review was deleted.');
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Could not delete your review. Please try again.');
    }
  };

  useEffect(() => {
    if (!homestay) return;
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const from = t.toISOString().split('T')[0];
    const toD = new Date(t);
    toD.setDate(toD.getDate() + 120);
    api
      .getHomestayAvailability(homestay.id, from, toD.toISOString().split('T')[0])
      .then((res) => {
        setStayAvailability(res.dates);
        setStayBlockedDates(res.blocked);
        setAvailabilityListed(res.listed);
      })
      .catch((err) => console.error('Failed to load stay availability:', err));
  }, [homestay]);

  const handleBack = () => {
    if (onBack) onBack();
    navigate('/');
  };

  const handleRoute = () => {
    if (onNavigateRoute) onNavigateRoute();
    navigate('/trails');
  };

  const handleBook = () => {
    if (!homestay || !availabilityListed) return;
    try {
      localStorage.setItem(
        'gokarna_booking_draft',
        JSON.stringify({ homestay_id: homestay.id, check_in: checkIn, check_out: checkOut, guests }),
      );
    } catch {
      /* storage unavailable */
    }
    if (onBook) onBook(homestay);
  };

  function toggleWishlist() {
    if (!homestay) return;
    setWishlisted((w) => {
      const next = !w;
      try {
        const list: string[] = JSON.parse(localStorage.getItem('coastal_wishlist') || '[]');
        const updated = next ? [...new Set([...list, homestay.id])] : list.filter((x) => x !== homestay.id);
        localStorage.setItem('coastal_wishlist', JSON.stringify(updated));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }

  async function shareStay() {
    if (!homestay) return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: homestay.title, text: `${homestay.title} — ${homestay.location_display}, Gokarna`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      /* share cancelled */
    }
  }

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-[46vh] min-h-[340px] w-full rounded-3xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!homestay) {
    return (
      <EmptyState
        icon={<Waves className="h-6 w-6" />}
        overline="Not found"
        title="Sanctuary not found"
        description="The stay you are looking for might have been moved or removed."
        action={{ label: 'Return to Homestays', onClick: () => navigate('/') }}
        className="mx-auto max-w-xl"
      />
    );
  }

  const images = homestay.imageUrls && homestay.imageUrls.length > 0 ? homestay.imageUrls : [FALLBACK_IMAGE];
  const EXTRA_GUEST_CHARGE = 400;
  const nights =
    checkIn && checkOut
      ? Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
      : 0;
  const extraGuests = Math.max(0, guests - 2);
  const totalAmount = nights > 0 ? (homestay.price_per_night + extraGuests * EXTRA_GUEST_CHARGE) * nights : null;
  const advance = totalAmount ? Math.round(totalAmount * 0.2) : Math.round(homestay.price_per_night * 0.2);
  const ratingRows = [
    { label: 'Location & shoreline', value: Math.min(5, homestay.rating + 0.05) },
    { label: 'Host hospitality', value: Math.min(5, homestay.rating + 0.1) },
    { label: 'Cleanliness & comfort', value: Math.max(4, Math.min(5, homestay.rating - 0.05)) },
  ];

  return (
    <div className="w-full pb-32 lg:pb-12">
      <div className="relative">
        <div className="relative h-[46vh] max-h-[520px] min-h-[340px] overflow-hidden rounded-3xl border border-line">
          <img src={images[activeImage]} alt={homestay.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/15" />

          <button
            onClick={handleBack}
            className="glass absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-ink transition-transform active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>

          <div className="absolute right-4 top-4 flex items-center gap-2">
            <div className="glass flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-ink">
              <Star className="h-3.5 w-3.5 fill-gold text-gold" />
              <span>{homestay.reviews_count > 0 ? homestay.rating : 'New'}</span>
            </div>
            <button
              onClick={shareStay}
              aria-label="Share this stay"
              className="glass flex h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-ink transition-transform active:scale-95"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{shared ? 'Copied' : 'Share'}</span>
            </button>
            <button
              onClick={toggleWishlist}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
              className="glass flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90"
            >
              <Heart className={cn('h-4 w-4', wishlisted ? 'fill-ember text-ember' : 'text-ink')} />
            </button>
          </div>

          {images.length > 1 ? (
            <div className="glass absolute bottom-5 right-4 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold text-ink">
              {activeImage + 1} / {images.length}
            </div>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                <MapPin className="h-3 w-3 text-tide-glow" />
                {homestay.location_display}
              </span>
              {homestay.is_host_verified ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                  <ShieldCheck className="h-3 w-3 text-tide-glow" />
                  Family host
                </span>
              ) : null}
            </div>
            <h1 className="line-clamp-2 font-display text-2xl font-semibold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-5xl">
              {homestay.title}
            </h1>
            <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-relaxed text-white/75">{homestay.subtitle}</p>
          </div>
        </div>

        {images.length > 1 ? (
          <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1">
            {images.map((url, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(idx)}
                aria-label={`View photo ${idx + 1} of ${images.length}`}
                className={`relative h-16 w-24 shrink-0 snap-start overflow-hidden rounded-xl border-2 transition-all ${
                  activeImage === idx ? 'border-tide' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={<Footprints className="h-4 w-4" />} label="Beach walk" value={`${homestay.walking_minutes_to_beach} min`} />
        <StatTile icon={<BedDouble className="h-4 w-4" />} label="Rooms" value={`${homestay.total_rooms || '—'}`} />
        <StatTile
          icon={<Star className="h-4 w-4" />}
          label="Rating"
          value={homestay.reviews_count > 0 ? `${homestay.rating}★` : 'New'}
        />
        <StatTile icon={<ShieldCheck className="h-4 w-4" />} label="Reserve hold" value="20%" />
      </div>

      <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-14">
          <Reveal>
            <section>
              <SectionTitle index="01 · About" title="A quiet Karavali retreat" />
              <p className="max-w-prose text-base font-light leading-relaxed text-ink-2">{homestay.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {homestay.verifiedBadges?.map((badge) => (
                  <Badge key={badge} variant="outline">
                    {badge}
                  </Badge>
                ))}
              </div>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <SectionTitle index="02 · Amenities" title="What the home offers" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {homestay.amenities?.map((a) => (
                  <SpotlightCard key={a} className="rounded-2xl border border-line bg-elevated">
                    <div className="flex items-center gap-3 p-3.5">
                      <ColorfulIcon type={a} size="xs" className="shrink-0 rounded-lg" />
                      <span className="text-sm font-semibold text-ink">{a}</span>
                    </div>
                  </SpotlightCard>
                ))}
              </div>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <SectionTitle index="03 · Rating" title="Travelers love this stay" />
              <div className="rounded-3xl border border-line bg-elevated p-6 sm:p-8">
                {homestay.reviews_count > 0 ? (
                  <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
                    <div className="text-center sm:text-left">
                      <div className="font-display text-6xl font-semibold text-ember">{homestay.rating}</div>
                      <div className="mt-2 flex justify-center gap-0.5 text-gold sm:justify-start" aria-hidden="true">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <Star key={i} className={cn('h-3.5 w-3.5', i < Math.round(homestay.rating) ? 'fill-current' : 'fill-none opacity-40')} />
                        ))}
                      </div>
                      <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                        {homestay.reviews_count} {homestay.reviews_count === 1 ? 'guest review' : 'guest reviews'}
                      </p>
                    </div>
                    <div className="flex-1 space-y-3">
                      {ratingRows.map((row) => (
                        <div key={row.label} className="flex items-center gap-3">
                          <span className="w-36 shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-3">
                            {row.label}
                          </span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-tide to-tide-glow"
                              style={{ width: `${(row.value / 5) * 100}%` }}
                            />
                          </div>
                          <span className="w-8 text-right font-mono text-xs text-ink">{row.value.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-tide/10 text-tide">
                      <Star className="h-5 w-5" />
                    </span>
                    <p className="font-display text-xl font-semibold text-ink">No reviews yet</p>
                    <p className="max-w-sm text-xs text-ink-2">
                      This stay is new on Coastal Trails — be the first guest to review it.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-4">
                  <div className="rounded-3xl border border-line bg-paper-2 p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="overline">{reviewSummary ? 'Travelers say' : 'Reviews'}</p>
                        <span className="mt-1 block font-mono text-[9px] uppercase tracking-wider text-ink-3">
                          {reviewSummary ? 'Generated from guest reviews' : 'Be the first to share your experience'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (showReviewForm) {
                            closeReviewForm();
                          } else if (!currentUser) {
                            if (onRequireAuth) onRequireAuth();
                            else setReviewError('Please sign in to write a review.');
                          } else {
                            openReviewForm(myReview || undefined);
                          }
                        }}
                        className={cn(
                          'inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all active:scale-95',
                          showReviewForm
                            ? 'border border-line-2 bg-elevated text-ink-2 hover:text-ink'
                            : 'bg-tide text-white shadow-md shadow-tide/30 hover:bg-tide-2',
                        )}
                      >
                        <PenLine className="h-3.5 w-3.5" />
                        {showReviewForm ? 'Cancel' : !currentUser ? 'Sign in to review' : myReview ? 'Edit your review' : 'Write a review'}
                      </button>
                    </div>
                    {reviewSummary ? (
                      <>
                        <p className="mt-2 text-sm leading-relaxed text-ink-2">{reviewSummary.text}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {reviewSummary.topics.map((t) => (
                            <span
                              key={t.label}
                              className="rounded-full border border-line-2 bg-elevated px-3 py-1 text-[11px] font-semibold text-ink-2"
                            >
                              {t.label} <span className="font-mono text-ink-3">({t.count})</span>
                            </span>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>

                  {reviewSuccess ? (
                    <div className="flex items-center justify-between gap-2.5 rounded-xl border border-ok/30 bg-ok/10 p-3 text-xs font-semibold text-ok">
                      <span className="flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0" />
                        {reviewSuccess}
                      </span>
                      <button
                        type="button"
                        onClick={() => setReviewSuccess(null)}
                        aria-label="Dismiss message"
                        className="shrink-0 rounded-full p-0.5 text-ok/70 transition-colors hover:bg-ok/10 hover:text-ok"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}

                  {reviewError ? (
                    <div className="flex items-center justify-between gap-2.5 rounded-xl border border-err/30 bg-err/10 p-3 text-xs font-semibold text-err">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {reviewError}
                      </span>
                      <button
                        type="button"
                        onClick={() => setReviewError(null)}
                        aria-label="Dismiss message"
                        className="shrink-0 rounded-full p-0.5 text-err/70 transition-colors hover:bg-err/10 hover:text-err"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}

                  {showReviewForm ? (
                    <form onSubmit={handleReviewSubmit} className="space-y-4 rounded-3xl border border-tide/40 bg-elevated p-5 sm:p-6">
                      <p className="overline">{editingReviewId ? 'Edit your review' : 'Your review'}</p>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setReviewForm((f) => ({ ...f, rating: n }))}
                            aria-label={`${n} star${n > 1 ? 's' : ''}`}
                            className="transition-transform active:scale-90"
                          >
                            <Star
                              className={cn('h-5 w-5', n <= reviewForm.rating ? 'fill-gold text-gold' : 'fill-none text-ink-3')}
                            />
                          </button>
                        ))}
                        <span className="ml-2 font-mono text-xs font-semibold text-ink-2">{reviewForm.rating} / 5</span>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-xs text-ink-2">
                          Reviewing as <span className="font-semibold text-ink">{currentUser?.name}</span>
                        </p>
                        <input
                          type="text"
                          value={reviewForm.title}
                          onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))}
                          placeholder="Review title (e.g. Beautiful sunset stay)"
                          className="h-10 w-full rounded-xl border border-line-2 bg-paper-2 px-3.5 text-sm text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                          required
                        />
                      </div>

                      <textarea
                        value={reviewForm.body}
                        onChange={(e) => setReviewForm((f) => ({ ...f, body: e.target.value }))}
                        placeholder="Share what you loved — cleanliness, host hospitality, food, the view…"
                        rows={4}
                        className="w-full rounded-xl border border-line-2 bg-paper-2 p-3.5 text-sm text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                        required
                      />

                      {!editingReviewId ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-line-2 bg-paper-2 px-3.5 py-2 text-xs font-semibold text-ink-2 transition-colors hover:border-tide hover:text-tide">
                            <ImagePlus className="h-3.5 w-3.5" />
                            Add photos
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={handleMediaSelect}
                            />
                          </label>
                          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
                            {reviewMedia.length}/3 attached · each photo ≤ 5 MB
                          </span>
                        </div>

                        {reviewMedia.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {reviewMedia.map((m, i) => (
                              <div key={i} className="relative h-20 w-24 overflow-hidden rounded-xl border border-line-2">
                                <img src={m.dataUrl} alt="" className="h-full w-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => setReviewMedia((prev) => prev.filter((_, idx) => idx !== i))}
                                  aria-label="Remove attachment"
                                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-white transition-colors hover:bg-ink"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      ) : null}

                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={closeReviewForm}
                          className="rounded-xl border border-line-2 px-4 py-2 text-xs font-semibold text-ink-2 transition-colors hover:bg-paper-2"
                        >
                          Cancel
                        </button>
                        <Button type="submit" disabled={reviewSubmitting} size="sm">
                          {reviewSubmitting ? 'Saving…' : editingReviewId ? 'Save changes' : 'Post review'}
                        </Button>
                      </div>
                    </form>
                  ) : null}

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
                              <Star
                                key={i}
                                className={cn('h-3.5 w-3.5', i < r.rating ? 'fill-current' : 'fill-none opacity-40')}
                              />
                            ))}
                          </span>
                          <span className="text-sm font-semibold text-ink">{r.title}</span>
                        </div>

                        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">
                          {timeAgo(r.created_at)}
                          {r.updated_at && String(r.updated_at) !== String(r.created_at) ? ' · edited' : ''}
                          {' · '}
                          {new Date(String(r.created_at).replace(' ', 'T')).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
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

                          {currentUser && r.user_id && String(r.user_id) === currentUser.id ? (
                            <span className="ml-auto flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => openReviewForm(r)}
                                className="inline-flex items-center gap-1 font-semibold text-tide transition-colors hover:text-tide-2"
                              >
                                <PenLine className="h-3 w-3" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteReview(r)}
                                className="inline-flex items-center gap-1 font-semibold text-err transition-opacity hover:opacity-80"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </button>
                            </span>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>

                  {reviewTotal > 3 ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/stay/${homestay.id}/reviews`)}
                      className="w-full rounded-xl border border-line-2 bg-elevated py-2.5 text-xs font-semibold text-ink-2 transition-colors hover:border-tide hover:text-tide"
                    >
                      See all {reviewTotal} reviews
                    </button>
                  ) : null}
                </div>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <SectionTitle index="04 · Location" title="On the shoreline" />
              <p className="mb-4 max-w-prose text-sm text-ink-2">
                {homestay.walking_minutes_to_beach} min cliff-walk to the beach — satellite view below shows the coves and trailheads.
              </p>
              <div className="overflow-hidden rounded-2xl border border-line">
                <CoastalMapView homestays={[homestay]} selectedStayId={homestay.id} showTrailOverlay={true} height="340px" />
              </div>
              <button
                onClick={handleRoute}
                className="group mt-4 flex w-full items-center justify-between rounded-2xl border border-line bg-gradient-to-r from-paper-2 to-elevated p-5 text-left transition-colors hover:border-tide"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-tide text-white transition-transform group-hover:scale-105">
                    <Compass className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-ink">Cliff Trail & Transit Guide</h4>
                    <p className="text-xs text-ink-2">Scooter, auto & ferry routes to every beach</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-tide transition-transform group-hover:translate-x-1">
                  <span>View route</span>
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </button>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <SectionTitle index="05 · Good to know" title="Before you arrive" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <GoodToKnow icon={<Clock className="h-4 w-4" />} title="Check-in" body="12:00 noon onward with flexible host dispatch via WhatsApp." />
                <GoodToKnow icon={<Moon className="h-4 w-4" />} title="House rules" body="Quiet hours after 10 pm. No outside guests without host consent." />
                <GoodToKnow icon={<Check className="h-4 w-4" />} title="Cancellation" body="Free cancellation up to 48 hours before check-in." />
              </div>
            </section>
          </Reveal>
        </div>

        <aside className="hidden lg:block">
          <div className="glass sticky top-24 space-y-4 rounded-3xl p-6">
            <div className="flex items-baseline justify-between">
              <div className="font-display text-3xl font-semibold text-ink">
                ₹{homestay.price_per_night}
                <span className="font-sans text-xs font-normal text-ink-2"> / night</span>
              </div>
              <Rating value={homestay.rating} />
            </div>

            {availabilityListed ? (
              <DateRangePicker
                checkIn={checkIn}
                checkOut={checkOut}
                availability={stayAvailability}
                blockedDates={stayBlockedDates}
                fewLeftThreshold={3}
                onChange={(ci, co) => {
                  setCheckIn(ci);
                  setCheckOut(co);
                }}
              />
            ) : (
              <div className="flex items-start gap-2.5 rounded-2xl border border-warn/30 bg-warn/5 p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-ink">Availability not published</p>
                  <p className="text-ink-2">
                    The host hasn't listed room availability for this stay yet. Please check back soon or explore other stays.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl border border-line-2 bg-elevated px-3.5 py-2.5">
              <span className="text-sm font-semibold text-ink">Guests</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setGuests((g) => Math.max(1, g - 1))}
                  aria-label="Fewer guests"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-line-2 text-ink-2 transition-colors hover:border-tide hover:text-tide"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center font-mono text-sm font-semibold text-ink">{guests}</span>
                <button
                  type="button"
                  onClick={() => setGuests((g) => Math.min(8, g + 1))}
                  aria-label="More guests"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-line-2 text-ink-2 transition-colors hover:border-tide hover:text-tide"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-line bg-paper-2 p-4 text-xs">
              {totalAmount !== null ? (
                <>
                  <div className="flex justify-between text-ink-2">
                    <span>
                      ₹{homestay.price_per_night} × {nights} night{nights > 1 ? 's' : ''}
                    </span>
                    <span className="font-mono-data font-semibold text-ink">₹{homestay.price_per_night * nights}</span>
                  </div>
                  {extraGuests > 0 ? (
                    <div className="flex justify-between text-ink-2">
                      <span>
                        + ₹{EXTRA_GUEST_CHARGE} × {extraGuests} extra guest{extraGuests > 1 ? 's' : ''} × {nights} night
                        {nights > 1 ? 's' : ''}
                      </span>
                      <span className="font-mono-data font-semibold text-ink">
                        ₹{extraGuests * EXTRA_GUEST_CHARGE * nights}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between border-t border-line pt-2 font-semibold text-ink">
                    <span>Total</span>
                    <span className="font-mono-data text-sm">₹{totalAmount}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-tide">
                    <span>Commitment hold (20%)</span>
                    <span className="font-mono-data text-sm">₹{advance}</span>
                  </div>
                  <div className="flex justify-between text-ink-2">
                    <span>Due to host on check-in</span>
                    <span className="font-mono-data text-sm">₹{totalAmount - advance}</span>
                  </div>
                </>
              ) : (
                <p className="text-ink-3">Select dates to see the live total</p>
              )}
              <div className="border-t border-line pt-2 text-[10px] font-medium text-tide">
                Free cancellation up to 48 hours before check-in
              </div>
            </div>

            <MagneticButton className="w-full">
              <Button onClick={handleBook} disabled={!availabilityListed} className="w-full py-4 text-sm font-semibold">
                <Calendar className="h-4 w-4" />
                <span>{availabilityListed ? 'Initiate 20% Reservation' : 'Availability not published'}</span>
              </Button>
            </MagneticButton>

            <p className="text-center text-[11px] text-ink-2">Instant host confirmation via WhatsApp</p>
          </div>
        </aside>
      </div>

      <div className="glass fixed inset-x-3 bottom-16 z-chrome flex items-center justify-between gap-3 border border-line p-3 lg:hidden">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1 font-display text-lg font-semibold text-ink">
            ₹{homestay.price_per_night}
            <span className="font-sans text-[10px] font-normal text-ink-2">/ night</span>
          </div>
          <span className="block truncate text-[10px] font-semibold text-tide">
            {checkIn && checkOut
              ? `${new Date(checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · 20% hold ₹${advance}`
              : `20% hold: ₹${advance}`}
          </span>
        </div>
        <Button onClick={handleBook} disabled={!availabilityListed} size="sm" className="shrink-0 gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span>{availabilityListed ? 'Reserve' : 'Unavailable'}</span>
        </Button>
      </div>

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
