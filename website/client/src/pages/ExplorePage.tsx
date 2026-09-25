import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, MapPin, ShieldCheck, Sparkles, Waves, Compass, HeartHandshake, Sun, Eye, Calendar, ChevronRight, ChevronLeft, Zap, Heart, LayoutGrid, Grid, List, Bookmark, MessageCircle, Wifi, Utensils, Coffee, SlidersHorizontal, Filter, X, ArrowUpDown, Check, Layers } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Homestay } from '../types';
import { ColorfulIcon } from '../components/ColorfulIcon';
import { Marquee } from '../components/ui/Marquee';
import { DateRangePicker } from '../components/ui/DateRangePicker';
import { InkUnderline } from '../components/ui/InkUnderline';
import { TwinkleSparkle } from '../components/ui/Sparkle';
import { api } from '../services/api';
import { easeOut } from '../lib/motion';
import { useLiveRefresh } from '../lib/live';
import { getSavedOrInitialDates } from '../lib/dates';

interface ExplorePageProps {
  homestays: Homestay[];
  loading: boolean;
  onSelectStay?: (stay: Homestay) => void;
  onBookStay: (stay: Homestay) => void;
  onFilterChange: (beach: string, search: string, checkIn?: string, checkOut?: string) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  homestays,
  loading,
  onSelectStay,
  onBookStay,
  onFilterChange,
}) => {
  const navigate = useNavigate();

  const handleCardClick = (stay: Homestay) => {
    if (onSelectStay) onSelectStay(stay);
    navigate(`/stay/${stay.id}`);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [checkIn, setCheckIn] = useState<string>(() => getSavedOrInitialDates().checkIn);
  const [checkOut, setCheckOut] = useState<string>(() => getSavedOrInitialDates().checkOut);
  const [viewMode, setViewMode] = useState<'auto' | 'grid' | 'list'>('auto');
  const [sortBy, setSortBy] = useState<'recommended' | 'rating' | 'price_asc' | 'price_desc' | 'beach'>('recommended');
  const [selectedBeach, setSelectedBeach] = useState<string>('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState<'all' | 'budget' | 'mid' | 'luxury'>('all');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [quickFilterSearch, setQuickFilterSearch] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const listingsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isFilterExpanded) return;
    function onDown(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setIsFilterExpanded(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsFilterExpanded(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isFilterExpanded]);
  const [activeCardImage, setActiveCardImage] = useState<{ [stayId: string]: number }>({});
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('coastal_wishlist') || '[]');
    } catch {
      return [];
    }
  });

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlist((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem('coastal_wishlist', JSON.stringify(next));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  };

  const handleNextPhoto = (stayId: string, max: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCardImage((prev) => ({
      ...prev,
      [stayId]: ((prev[stayId] || 0) + 1) % max,
    }));
  };

  const handlePrevPhoto = (stayId: string, max: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCardImage((prev) => ({
      ...prev,
      [stayId]: ((prev[stayId] || 0) - 1 + max) % max,
    }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkIn && checkOut) {
      try {
        localStorage.setItem('gokarna_search_dates', JSON.stringify({ checkIn, checkOut }));
      } catch {
        /* storage unavailable */
      }
    }
    onFilterChange('all', searchTerm, checkIn, checkOut);
    // Bring the user straight to the matching listings instead of leaving them at the hero
    window.setTimeout(() => {
      const el = listingsRef.current;
      if (!el) return;
      const NAV_OFFSET = 96;
      const EXTRA_SCROLL = 150;
      const top = window.scrollY + el.getBoundingClientRect().top - NAV_OFFSET + EXTRA_SCROLL;
      window.scrollTo({ top, behavior: 'smooth' });
    }, 80);
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const clearAllFilters = () => {
    setSelectedBeach('all');
    setSelectedPriceRange('all');
    setSelectedAmenities([]);
    setQuickFilterSearch('');
    setSortBy('recommended');
  };

  const activeFilterCount =
    (selectedBeach !== 'all' ? 1 : 0) +
    (selectedPriceRange !== 'all' ? 1 : 0) +
    selectedAmenities.length +
    (quickFilterSearch.trim() ? 1 : 0);

  const renderAmenityIcon = (text: string) => {
    return <ColorfulIcon type={text} size="xs" className="rounded-md shrink-0" />;
  };

  const [availability, setAvailability] = useState<Record<string, number>>({});

  useEffect(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const from = t.toISOString().split('T')[0];
    const toD = new Date(t);
    toD.setDate(toD.getDate() + 90);
    api
      .getAvailability(from, toD.toISOString().split('T')[0])
      .then(setAvailability)
      .catch((err) => console.error('Failed to load availability:', err));
  }, []);

  useLiveRefresh(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const from = t.toISOString().split('T')[0];
    const toD = new Date(t);
    toD.setDate(toD.getDate() + 90);
    api
      .getAvailability(from, toD.toISOString().split('T')[0])
      .then(setAvailability)
      .catch((err) => console.error('Failed to refresh availability:', err));
  }, 30000);

  // Comprehensive Filtering
  const filteredStays = homestays.filter((stay) => {
    if (checkIn && checkOut && stay.isAvailable === false) return false;

    // 1. Shoreline / Beach
    if (selectedBeach !== 'all') {
      const loc = (stay.location_display || stay.location || '').toLowerCase();
      if (selectedBeach === 'kudle' && !loc.includes('kudle')) return false;
      if (selectedBeach === 'om' && !loc.includes('om')) return false;
      if (selectedBeach === 'halfMoon' && !loc.includes('half') && !loc.includes('moon')) return false;
      if (selectedBeach === 'paradise' && !loc.includes('paradise')) return false;
      if (selectedBeach === 'mainBeach' && !loc.includes('main') && !loc.includes('town')) return false;
    }

    // 2. Price Range
    if (selectedPriceRange === 'budget' && stay.price_per_night > 1500) return false;
    if (selectedPriceRange === 'mid' && (stay.price_per_night < 1500 || stay.price_per_night > 2200)) return false;
    if (selectedPriceRange === 'luxury' && stay.price_per_night < 2200) return false;

    // 3. Amenities
    if (selectedAmenities.length > 0) {
      const allStayAmenities = [
        ...(stay.amenities || []),
        ...(stay.verifiedBadges || []),
        stay.title,
      ].map((a) => a.toLowerCase());

      for (const am of selectedAmenities) {
        if (am === 'verified') {
          if (!stay.is_host_verified) return false;
        } else {
          const match = allStayAmenities.some((a) => a.includes(am));
          if (!match) return false;
        }
      }
    }

    // 4. Quick filter keyword search
    if (quickFilterSearch.trim()) {
      const q = quickFilterSearch.toLowerCase();
      const titleMatch = stay.title.toLowerCase().includes(q);
      const descMatch = (stay.description || '').toLowerCase().includes(q);
      const locMatch = (stay.location_display || '').toLowerCase().includes(q);
      const hostMatch = (stay.host_name || '').toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !locMatch && !hostMatch) return false;
    }

    return true;
  });

  // Comprehensive Sorting
  const sortedStays = [...filteredStays].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'price_asc') return a.price_per_night - b.price_per_night;
    if (sortBy === 'price_desc') return b.price_per_night - a.price_per_night;
    if (sortBy === 'beach') return a.walking_minutes_to_beach - b.walking_minutes_to_beach;
    return 0; // curated default
  });

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-hidden">
      {/* 1. CINEMATIC COASTAL EDITORIAL HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-line-2">
        <div className="relative flex flex-col justify-center overflow-hidden bg-[radial-gradient(140%_120%_at_50%_-10%,oklch(0.32_0.07_250)_0%,oklch(0.18_0.03_262)_50%,oklch(0.12_0.025_265)_100%)] p-5 sm:p-8 lg:min-h-[400px] lg:p-8">
          <img
            src="/images/hero-raman.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/45 to-ink/25" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 animate-blob bg-tide-glow/15 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-tide-glow/15 to-transparent" />

          <div className="relative z-10 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1 font-mono text-[11px] font-semibold text-white/85 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-tide-glow animate-pulse" />
                <span>100% Family Stewarded</span>
                <span className="text-white/30">•</span>
                <span>Direct Host WhatsApp</span>
                <span className="hidden text-white/30 sm:inline">•</span>
                <span className="hidden text-white/60 sm:inline">Gokarna, Karnataka</span>
              </div>
            </div>

            <div className="relative max-w-3xl space-y-2">
              <TwinkleSparkle className="absolute -left-8 -top-6 h-5 w-5" delay={0.4} />
              <TwinkleSparkle className="absolute -right-2 top-1 h-4 w-4 !text-tide-glow" delay={0.9} />
              <TwinkleSparkle className="absolute -bottom-5 left-1/3 h-3.5 w-3.5" delay={1.2} />
              <h1 className="font-display text-2xl font-semibold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-5xl">
                Quiet clifftop cottages,{' '}
                <span className="relative inline-block italic font-light text-tide-glow">
                  Arabian shores.
                  <InkUnderline className="h-2.5" delay={0.6} color="var(--c-tide-glow)" />
                </span>
              </h1>
              <p className="max-w-2xl text-sm font-medium leading-relaxed text-white/70">
                Authentic Karavali family stays with an offline 20% hold and direct host WhatsApp. Zero middleman booking markup.
              </p>
            </div>

          {/* Modern 2026 Floating Concierge Search Bar */}
          <div className="space-y-3">
            <form
              onSubmit={handleSearchSubmit}
              className="bg-white dark:bg-elevated rounded-2xl shadow-lg shadow-slate-900/[0.05] dark:shadow-black/30 border border-slate-200 dark:border-line p-2 sm:p-2.5 text-slate-900 dark:text-ink w-full"
            >
              <div className="flex flex-col md:grid md:grid-cols-12 gap-2">
                {/* 1. Keyword or Shoreline */}
                <div className="md:col-span-5 px-3.5 py-2 bg-slate-50/80 hover:bg-slate-50 dark:bg-paper-2 dark:hover:bg-elevated rounded-xl border border-slate-200/80 dark:border-line focus-within:border-sky-500 dark:focus-within:border-tide focus-within:bg-white dark:focus-within:bg-elevated focus-within:ring-2 focus-within:ring-sky-100 dark:focus-within:ring-tide/20 transition-all">
                  <label className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-ink-3">
                    <MapPin className="w-2.5 h-2.5 text-sky-600 dark:text-tide" />
                    <span>Shoreline or Keyword</span>
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Kudle Cliff, Om Beach, Half Moon, WiFi..."
                    className="w-full text-xs sm:text-sm font-medium bg-transparent focus:outline-none placeholder:text-slate-400 dark:placeholder:text-ink-3 mt-0.5 text-slate-900 dark:text-ink"
                  />
                </div>

                {/* 2. Dates */}
                <div className="md:col-span-4">
                  <DateRangePicker
                    checkIn={checkIn}
                    checkOut={checkOut}
                    availability={availability}
                    onChange={(ci, co) => {
                      setCheckIn(ci);
                      setCheckOut(co);
                      if (ci && co) {
                        try {
                          localStorage.setItem('gokarna_search_dates', JSON.stringify({ checkIn: ci, checkOut: co }));
                        } catch {
                          /* storage unavailable */
                        }
                        onFilterChange('all', searchTerm, ci, co);
                      }
                    }}
                  />
                </div>

                {/* 3. Search & Book CTA Button */}
                <div className="md:col-span-3 flex items-center">
                  <button
                    type="submit"
                    className="relative overflow-hidden w-full h-10 md:h-full bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-sky-600/20 active:scale-98 group cursor-pointer"
                  >
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></span>
                    <Search className="w-3 h-3 text-sky-100" />
                    <span>Explore Stays</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Micro Trust & Reassurance Badges with Colorful 2027 Icons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-1 text-[11px] text-slate-700 dark:text-ink-2 font-medium">
              <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-slate-200/80 shadow-2xs dark:bg-elevated/90 dark:border-line">
                <ColorfulIcon type="hold" size="xs" className="rounded-md" />
                <span>20% Offline Hold</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-slate-200/80 shadow-2xs dark:bg-elevated/90 dark:border-line">
                <ColorfulIcon type="whatsapp" size="xs" className="rounded-md" />
                <span>Direct WhatsApp Hosts</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-slate-200/80 shadow-2xs dark:bg-elevated/90 dark:border-line">
                <ColorfulIcon type="trail" size="xs" className="rounded-md" />
                <span>Verified Trailheads</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-slate-200/80 shadow-2xs dark:bg-elevated/90 dark:border-line">
                <ColorfulIcon type="star" size="xs" className="rounded-md" />
                <span>4.9/5 Guest Experience</span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      <Marquee speed="32s" className="border-y border-line py-3">
        {['Kudle Beach', 'Om Beach', 'Half Moon Cove', 'Paradise Beach', 'Main Beach', 'Cliff Trails', 'Ferry Crossings', 'Family-Hosted Stays'].map(
          (t) => (
            <span
              key={t}
              className="flex items-center gap-8 font-display text-lg font-medium italic text-ink-3 dark:text-ink dark:drop-shadow-[0_0_12px_rgba(95,201,194,0.25)]"
            >
              {t}
              <span className="text-tide-glow not-italic dark:text-tide">·</span>
            </span>
          ),
        )}
      </Marquee>

      {/* 3. 2026 CURATED SANCTUARIES (Responsive: Mobile Studio Cards & Desktop Bento Grid) */}
      <section ref={listingsRef} className="scroll-mt-24 space-y-6">
        {/* Modern 2026 Section Header & Floating Control Bar */}
        <div className="space-y-4 pb-4 border-b border-slate-200/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="overline mb-1.5">2026 Curated Sanctuaries</p>
              <h2 className="relative inline-block font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Handpicked Coastal Living
                <InkUnderline className="w-1/2" delay={0.2} />
              </h2>
              <p className="mt-1.5 max-w-xl text-sm text-ink-2">
                Family-stewarded retreats along Gokarna's shores with direct WhatsApp host coordination and 20% offline hold.
              </p>
            </div>

            {/* Beach filters + Filters button on the same line */}
            <div className="flex w-full items-center gap-2 md:w-auto">
              <div className="relative shrink-0" ref={filterRef}>
                <button
                  type="button"
                  onClick={() => setIsFilterExpanded((prev) => !prev)}
                  aria-expanded={isFilterExpanded}
                  aria-haspopup="dialog"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                    isFilterExpanded || activeFilterCount > 0
                      ? 'bg-tide/10 text-tide border-tide ring-2 ring-tide/20'
                      : 'bg-elevated text-ink-2 border-line-2 hover:bg-paper-2'
                  }`}
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-tide text-[9px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isFilterExpanded && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.22, ease: easeOut }}
                      role="dialog"
                      aria-label="Refine stays"
                      className="glass absolute right-0 top-full z-overlay mt-2 w-[340px] max-w-[calc(100vw-2.5rem)] rounded-2xl p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <p className="overline">Refine stays</p>
                        <button
                          type="button"
                          onClick={() => setIsFilterExpanded(false)}
                          aria-label="Close filters"
                          className="rounded-full p-1 text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-3">Budget per night</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { id: 'all', label: 'Any Tariff' },
                            { id: 'budget', label: '< ₹1,500' },
                            { id: 'mid', label: '₹1,500 – ₹2,200' },
                            { id: 'luxury', label: '> ₹2,200' },
                          ].map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setSelectedPriceRange(p.id as any)}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                                selectedPriceRange === p.id
                                  ? 'border-tide bg-tide text-white'
                                  : 'border-line-2 bg-paper-2 text-ink-2 hover:border-tide hover:text-ink'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-3">Key features</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { id: 'wifi', label: 'Fast WiFi' },
                            { id: 'kitchen', label: 'Kitchen' },
                            { id: 'sunset', label: 'Sunset View' },
                            { id: 'beach', label: 'Beachfront' },
                            { id: 'verified', label: 'Family Host' },
                          ].map((am) => {
                            const isActive = selectedAmenities.includes(am.id);
                            return (
                              <button
                                key={am.id}
                                type="button"
                                onClick={() => toggleAmenity(am.id)}
                                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                                  isActive
                                    ? 'border-tide bg-tide text-white'
                                    : 'border-line-2 bg-paper-2 text-ink-2 hover:border-tide hover:text-ink'
                                }`}
                              >
                                {isActive && <Check className="h-3 w-3" />}
                                <span>{am.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-3">Keyword</span>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
                          <input
                            type="text"
                            value={quickFilterSearch}
                            onChange={(e) => setQuickFilterSearch(e.target.value)}
                            placeholder="e.g. WiFi, cliff, solar…"
                            className="h-9 w-full rounded-xl border border-line-2 bg-paper-2 pl-8 pr-8 text-xs text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                          />
                          {quickFilterSearch && (
                            <button
                              type="button"
                              onClick={() => setQuickFilterSearch('')}
                              aria-label="Clear keyword"
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs">
                        <span className="text-ink-2">
                          <strong className="font-semibold text-ink">{sortedStays.length}</strong> of {homestays.length} stays
                        </span>
                        {activeFilterCount > 0 && (
                          <button
                            type="button"
                            onClick={clearAllFilters}
                            className="font-semibold text-tide underline hover:text-tide-2"
                          >
                            Reset all
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-[28px] p-4 border border-slate-200 animate-pulse shadow-xs h-96"></div>
            ))}
          </div>
        ) : sortedStays.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-serif text-xl font-bold text-slate-900">No sanctuaries match your criteria</h3>
            <p className="text-xs text-slate-500">Try clearing your filters or selecting "All Gokarna".</p>
            <button
              onClick={clearAllFilters}
              className="mt-2 text-xs font-bold text-sky-600 underline hover:text-sky-700 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div>
            {/* =========================================================================
               A. MOBILE STUDIO CARDS (< md)
               Specially formatted Studio layout for phone screens.
               Clean studio photography, direct host attribution, unclipped title,
               and comfortable touch action buttons.
               ========================================================================= */}
            <div className="block md:hidden space-y-4">
              {sortedStays.map((stay) => {
                const advance = Math.round(stay.price_per_night * 0.20);
                const currentPhotoIdx = activeCardImage[stay.id] || 0;
                const imagesList = stay.imageUrls && stay.imageUrls.length > 0 ? stay.imageUrls : ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'];
                const isWishlisted = wishlist.includes(stay.id);
                const hostDigits = stay.host_whatsapp ? stay.host_whatsapp.replace(/\D/g, '') : '919845123091';
                const waLink = `https://wa.me/${hostDigits}?text=${encodeURIComponent(`Namaskara ${stay.host_name}! I am viewing ${stay.title} on Coastal Trails Gokarna.`)}`;

                return (
                  <article
                    key={`mobile-studio-${stay.id}`}
                    className="bg-white rounded-3xl p-3.5 border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-3"
                  >
                    {/* Studio Image Container */}
                    <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-slate-100 select-none">
                      <img
                        src={imagesList[currentPhotoIdx]} loading="lazy"
                        alt={stay.title}
                        className="w-full h-full object-cover cursor-pointer active:scale-98 transition-transform"
                        onClick={() => handleCardClick(stay)}
                      />

                      {/* Top Badges */}
                      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-full text-[10px] font-black shadow-xs tracking-wider">
                            20% OFFLINE HOLD
                          </span>
                          <span className="px-2.5 py-1 bg-white/95 backdrop-blur-md text-slate-800 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs">
                            <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-400" />
                            <span>{stay.reviews_count > 0 ? stay.rating : 'New'}</span>
                            <span className="text-slate-400 font-normal">{stay.reviews_count > 0 ? `(${stay.reviews_count})` : ''}</span>
                          </span>
                        </div>

                        {/* Heart Button */}
                        <button
                          type="button"
                          onClick={(e) => toggleWishlist(stay.id, e)}
                          className="pointer-events-auto w-7 h-7 rounded-full bg-white/90 hover:bg-white backdrop-blur-md flex items-center justify-center transition-transform active:scale-90 shadow-sm cursor-pointer"
                          title="Save stay"
                        >
                          <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`} />
                        </button>
                      </div>

                      {/* Photo Carousel Arrows & Dots */}
                      {imagesList.length > 1 && (
                        <>
                          <button
                            type="button"
                            aria-label="Previous photo"
                            onClick={(e) => handlePrevPhoto(stay.id, imagesList.length, e)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/90 dark:border-white/25 shadow-md flex items-center justify-center active:scale-90 transition-all z-20 cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Next photo"
                            onClick={(e) => handleNextPhoto(stay.id, imagesList.length, e)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/90 dark:border-white/25 shadow-md flex items-center justify-center active:scale-90 transition-all z-20 cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-2.5 inset-x-0 flex justify-center gap-1 z-20 pointer-events-none">
                            {imagesList.map((_, pIdx) => (
                              <span
                                key={pIdx}
                                className={`h-1.5 rounded-full transition-all ${
                                  currentPhotoIdx === pIdx ? 'w-4 bg-white shadow-sm' : 'w-1.5 bg-white/60 dark:bg-white/50'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Studio Content Details */}
                    <div className="px-1 space-y-2">
                      {/* Location & Trail Walk */}
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-1 text-slate-700">
                          <MapPin className="w-3 h-3 text-sky-600 shrink-0" />
                          <span className="font-semibold">{stay.location_display}, Gokarna</span>
                        </div>
                        <span className="text-[11px] text-slate-500">🚶 {stay.walking_minutes_to_beach} min walk</span>
                      </div>

                      {/* Direct Host Attribution */}
                      <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Direct Host: {stay.host_name}</span>
                      </div>

                      {/* Title (Full length, no truncation) */}
                      <h3
                        onClick={() => handleCardClick(stay)}
                        className="font-serif text-lg font-bold text-slate-900 tracking-tight leading-snug cursor-pointer hover:text-sky-600 transition-colors"
                      >
                        {stay.title}
                      </h3>

                      {/* Brief Editorial Description */}
                      {stay.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-light">
                          {stay.description}
                        </p>
                      )}

                      {/* Amenity Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {stay.verifiedBadges?.slice(0, 3).map((b, bIdx) => (
                          <span
                            key={bIdx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] font-medium text-slate-600"
                          >
                            {renderAmenityIcon(b)}
                            <span>{b}</span>
                          </span>
                        ))}
                      </div>

                      {/* Footer: Price + Actions */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="font-sans text-lg font-black text-slate-900">
                              ₹{stay.price_per_night}
                            </span>
                            <span className="text-[11px] text-slate-400">/night</span>
                          </div>
                          <div className="text-[10px] font-semibold text-emerald-600">
                            20% Hold: ₹{advance}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/70 transition-all cursor-pointer"
                            title={`Chat with ${stay.host_name}`}
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCardClick(stay)}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => onBookStay(stay)}
                            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span>Book Now</span>
                            <Calendar className="w-3 h-3 text-sky-200" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* =========================================================================
               B. PC / DESKTOP ARRANGEMENT (>= md)
               Arrangement Option 1: 2026 Bento Editorial Showcase (viewMode === 'auto')
               Arrangement Option 2: Modern 3-Column Grid (viewMode === 'grid')
               Arrangement Option 3: Wide Studio List (viewMode === 'list')
               ========================================================================= */}
            <div className="hidden md:block">
              {/* 1. 2026 BENTO EDITORIAL SHOWCASE (Flagship Arrangement) */}
              {viewMode === 'auto' && (
                <div className="space-y-6">
                  {/* Row 1: Featured Spotlight Bento Stay (2 columns) + Companion Dribbble Card (1 column) */}
                  {sortedStays.length >= 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                      {/* #1 Top Pick Featured Stay in Dark Glassmorphism Luxury Canvas (Matching media_1789798471461.png right card) */}
                      {(() => {
                        const stay = sortedStays[0];
                        const advance = Math.round(stay.price_per_night * 0.20);
                        const currentPhotoIdx = activeCardImage[stay.id] || 0;
                        const imagesList = stay.imageUrls && stay.imageUrls.length > 0 ? stay.imageUrls : ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'];
                        const isWishlisted = wishlist.includes(stay.id);
                        const hostDigits = stay.host_whatsapp ? stay.host_whatsapp.replace(/\D/g, '') : '919845123091';
                        const waLink = `https://wa.me/${hostDigits}?text=${encodeURIComponent(`Namaskara ${stay.host_name}! I am viewing your featured stay ${stay.title} on Coastal Trails Gokarna.`)}`;

                        return (
                          <article
                            key={`bento-hero-${stay.id}`}
                            className="md:col-span-2 group relative rounded-[32px] overflow-hidden bg-slate-900 border border-slate-800 shadow-[0_12px_36px_rgba(0,0,0,0.18)] min-h-[420px] flex flex-col justify-between p-6 sm:p-8 transition-all hover:shadow-[0_20px_48px_rgba(0,0,0,0.25)]"
                          >
                            {/* Cinematic Full-Bleed Background Image */}
                            <div className="absolute inset-0 z-0 select-none overflow-hidden">
                              <img
                                src={imagesList[currentPhotoIdx]} loading="lazy"
                                alt={stay.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                              />
                              {/* Dark Gradient Wash with Frosted Blur at base */}
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/20" />
                            </div>

                            {/* Photo Carousel Arrows */}
                            {imagesList.length > 1 && (
                              <div className="absolute inset-y-0 inset-x-3 flex items-center justify-between pointer-events-none z-10">
                                <button
                                  type="button"
                                  aria-label="Previous photo"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrevPhoto(stay.id, imagesList.length, e);
                                  }}
                                  className="pointer-events-auto w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/40 hover:bg-black/65 text-white border border-white/20 shadow-md backdrop-blur-md flex items-center justify-center transition-all cursor-pointer active:scale-90"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Next photo"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNextPhoto(stay.id, imagesList.length, e);
                                  }}
                                  className="pointer-events-auto w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/40 hover:bg-black/65 text-white border border-white/20 shadow-md backdrop-blur-md flex items-center justify-center transition-all cursor-pointer active:scale-90"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            )}

                            {/* Top Row: Spotlight Badges & Heart Wishlist */}
                            <div className="relative z-10 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-md uppercase tracking-wider">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>#1 Spotlight Choice</span>
                                </span>
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-medium border border-white/20">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>{stay.host_name}</span>
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => toggleWishlist(stay.id, e)}
                                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 flex items-center justify-center transition-transform active:scale-90 text-white cursor-pointer shadow-sm"
                                title="Save to wishlist"
                              >
                                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
                              </button>
                            </div>

                            {/* Bottom Row: Title, Micro-Amenity Glass Pills, Price & Action (Matching 2026 Dark Glass Style) */}
                            <div className="relative z-10 space-y-4 pt-16">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-white/90 text-xs font-medium">
                                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                                  <span>{stay.location_display}, Gokarna</span>
                                  <span>•</span>
                                  <div className="flex items-center gap-1 font-semibold text-amber-300">
                                    <Star className="w-3.5 h-3.5 fill-amber-300" />
                                    <span>{stay.reviews_count > 0 ? stay.rating : 'New'}</span>
                                    <span className="text-white/70 font-normal">
                                      {stay.reviews_count > 0 ? `(${stay.reviews_count} reviews)` : '(no reviews yet)'}
                                    </span>
                                  </div>
                                </div>

                                <h3
                                  onClick={() => handleCardClick(stay)}
                                  className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight cursor-pointer hover:text-amber-200 transition-colors"
                                >
                                  {stay.title}
                                </h3>
                              </div>

                              {/* Glassmorphism Amenity Pills (from media_1789798471461.png right card) */}
                              <div className="flex flex-wrap items-center gap-2">
                                {stay.verifiedBadges?.slice(0, 4).map((badge, bIdx) => (
                                  <span
                                    key={bIdx}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-medium text-white shadow-xs"
                                  >
                                    {renderAmenityIcon(badge)}
                                    <span>{badge}</span>
                                  </span>
                                ))}
                              </div>

                              {/* Reservation Bar */}
                              <div className="pt-4 border-t border-white/20 flex items-center justify-between gap-4">
                                <div>
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="font-sans text-3xl font-black text-white tracking-tight">
                                      ₹{stay.price_per_night}
                                    </span>
                                    <span className="text-xs text-white/70">/night</span>
                                  </div>
                                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                    <span>20% Offline Hold: ₹{advance}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <a
                                    href={waLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs"
                                    title={`Chat with ${stay.host_name}`}
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                    <span className="hidden sm:inline">WhatsApp Host</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleCardClick(stay)}
                                    className="px-6 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold shadow-lg shadow-white/10 active:scale-95 transition-all cursor-pointer"
                                  >
                                    View Details
                                  </button>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })()}

                      {/* Companion Dribbble Card #2 */}
                      {(() => {
                        const stay = sortedStays[1];
                        const advance = Math.round(stay.price_per_night * 0.20);
                        const currentPhotoIdx = activeCardImage[stay.id] || 0;
                        const imagesList = stay.imageUrls && stay.imageUrls.length > 0 ? stay.imageUrls : ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'];
                        const isWishlisted = wishlist.includes(stay.id);
                        const hostDigits = stay.host_whatsapp ? stay.host_whatsapp.replace(/\D/g, '') : '919845123091';
                        const waLink = `https://wa.me/${hostDigits}?text=${encodeURIComponent(`Namaskara ${stay.host_name}! I am looking at ${stay.title} on Coastal Trails Gokarna.`)}`;

                        return (
                          <article
                            key={`bento-comp-${stay.id}`}
                            className="group bg-white p-4 rounded-[32px] border border-slate-150/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                          >
                            <div>
                              <div className="relative aspect-[16/11] rounded-[24px] overflow-hidden bg-slate-100 select-none">
                                <img
                                  src={imagesList[currentPhotoIdx]} loading="lazy"
                                  alt={stay.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out cursor-pointer"
                                  onClick={() => handleCardClick(stay)}
                                />
                                {stay.is_host_verified && (
                                  <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/95 backdrop-blur-md rounded-full text-[10px] font-bold text-slate-800 flex items-center gap-1 shadow-sm">
                                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                    <span>Family Host</span>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => toggleWishlist(stay.id, e)}
                                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white backdrop-blur-md flex items-center justify-center transition-transform active:scale-90 hover:scale-110 shadow-sm cursor-pointer"
                                  title="Save stay"
                                >
                                  <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`} />
                                </button>

                                {imagesList.length > 1 && (
                                  <>
                                    <button
                                      type="button"
                                      aria-label="Previous photo"
                                      onClick={(e) => handlePrevPhoto(stay.id, imagesList.length, e)}
                                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/90 dark:border-white/25 shadow-md backdrop-blur-xs flex items-center justify-center opacity-90 group-hover:opacity-100 transition-all z-20 cursor-pointer active:scale-90"
                                    >
                                      <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      aria-label="Next photo"
                                      onClick={(e) => handleNextPhoto(stay.id, imagesList.length, e)}
                                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/90 dark:border-white/25 shadow-md backdrop-blur-xs flex items-center justify-center opacity-90 group-hover:opacity-100 transition-all z-20 cursor-pointer active:scale-90"
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                    <div className="absolute bottom-2.5 inset-x-0 flex justify-center gap-1 z-20 pointer-events-none">
                                      {imagesList.map((_, pIdx) => (
                                        <span
                                          key={pIdx}
                                          className={`h-1.5 rounded-full transition-all ${
                                            currentPhotoIdx === pIdx ? 'w-4 bg-white shadow-sm' : 'w-1.5 bg-white/60 dark:bg-white/50'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>

                              <div className="px-1 pt-3.5 space-y-2">
                                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-slate-700 font-medium">{stay.location_display}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                                    <span className="font-semibold text-slate-800">{stay.reviews_count > 0 ? stay.rating : 'New'}</span>
                                    <span className="text-slate-400">{stay.reviews_count > 0 ? `(${stay.reviews_count})` : ''}</span>
                                  </div>
                                </div>

                                <h3
                                  onClick={() => handleCardClick(stay)}
                                  className="font-sans text-base font-bold text-slate-900 hover:text-sky-600 transition-colors cursor-pointer line-clamp-1 tracking-tight"
                                >
                                  {stay.title}
                                </h3>

                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  {stay.verifiedBadges?.slice(0, 3).map((b, bIdx) => (
                                    <span
                                      key={bIdx}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-[11px] font-medium text-slate-600"
                                    >
                                      {renderAmenityIcon(b)}
                                      <span>{b}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="px-1 pt-3.5 mt-2 border-t border-slate-100 flex items-center justify-between">
                              <div>
                                <div className="flex items-baseline gap-1">
                                  <span className="font-sans text-xl font-black text-slate-900">
                                    ₹{stay.price_per_night}
                                  </span>
                                  <span className="text-xs text-slate-400">/night</span>
                                </div>
                                <div className="text-[10px] font-semibold text-emerald-600">
                                  20% Hold: ₹{advance}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/70 transition-all cursor-pointer"
                                  title={`WhatsApp Host ${stay.host_name}`}
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleCardClick(stay)}
                                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm active:scale-95 transition-all cursor-pointer"
                                >
                                  View Details
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })()}
                    </div>
                  )}

                  {/* Row 2+: Rhythmic Companion Cards in Modern 3-Column Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {sortedStays.slice(2).map((stay) => {
                      const advance = Math.round(stay.price_per_night * 0.20);
                      const currentPhotoIdx = activeCardImage[stay.id] || 0;
                      const imagesList = stay.imageUrls && stay.imageUrls.length > 0 ? stay.imageUrls : ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'];
                      const isWishlisted = wishlist.includes(stay.id);
                      const hostDigits = stay.host_whatsapp ? stay.host_whatsapp.replace(/\D/g, '') : '919845123091';
                      const waLink = `https://wa.me/${hostDigits}?text=${encodeURIComponent(`Namaskara ${stay.host_name}! I am looking at ${stay.title} on Coastal Trails Gokarna.`)}`;

                      return (
                        <article
                          key={`bento-sub-${stay.id}`}
                          className="group bg-white p-3.5 sm:p-4 rounded-[28px] border border-slate-150/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                        >
                          <div>
                            <div className="relative aspect-[16/11] rounded-[22px] overflow-hidden bg-slate-100 select-none">
                              <img
                                src={imagesList[currentPhotoIdx]} loading="lazy"
                                alt={stay.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out cursor-pointer"
                                onClick={() => handleCardClick(stay)}
                              />
                              {stay.is_host_verified && (
                                <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/95 backdrop-blur-md rounded-full text-[10px] font-bold text-slate-800 flex items-center gap-1 shadow-sm">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                  <span>Family Host</span>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={(e) => toggleWishlist(stay.id, e)}
                                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white backdrop-blur-md flex items-center justify-center transition-transform active:scale-90 hover:scale-110 shadow-sm cursor-pointer"
                                title="Save stay"
                              >
                                <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`} />
                              </button>

                              {imagesList.length > 1 && (
                                <>
                                  <button
                                    type="button"
                                    aria-label="Previous photo"
                                    onClick={(e) => handlePrevPhoto(stay.id, imagesList.length, e)}
                                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/90 dark:border-white/25 shadow-md backdrop-blur-xs flex items-center justify-center opacity-90 group-hover:opacity-100 transition-all z-20 cursor-pointer active:scale-90"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Next photo"
                                    onClick={(e) => handleNextPhoto(stay.id, imagesList.length, e)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/90 dark:border-white/25 shadow-md backdrop-blur-xs flex items-center justify-center opacity-90 group-hover:opacity-100 transition-all z-20 cursor-pointer active:scale-90"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </button>
                                  <div className="absolute bottom-2.5 inset-x-0 flex justify-center gap-1 z-20 pointer-events-none">
                                    {imagesList.map((_, pIdx) => (
                                      <span
                                        key={pIdx}
                                        className={`h-1.5 rounded-full transition-all ${
                                          currentPhotoIdx === pIdx ? 'w-4 bg-white shadow-sm' : 'w-1.5 bg-white/60 dark:bg-white/50'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>

                            <div className="px-1 pt-3.5 space-y-2">
                              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="text-slate-700 font-medium">{stay.location_display}, Gokarna</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                                  <span className="font-semibold text-slate-800">{stay.reviews_count > 0 ? stay.rating : 'New'}</span>
                                  <span className="text-slate-400">{stay.reviews_count > 0 ? `(${stay.reviews_count})` : ''}</span>
                                </div>
                              </div>

                              <h3
                                onClick={() => handleCardClick(stay)}
                                className="font-sans text-base sm:text-lg font-bold text-slate-900 hover:text-sky-600 transition-colors cursor-pointer line-clamp-1 tracking-tight"
                              >
                                {stay.title}
                              </h3>

                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                {stay.verifiedBadges?.slice(0, 4).map((b, bIdx) => (
                                  <span
                                    key={bIdx}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-[11px] font-medium text-slate-600"
                                  >
                                    {renderAmenityIcon(b)}
                                    <span>{b}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="px-1 pt-3.5 mt-2 border-t border-slate-100 flex items-center justify-between">
                            <div>
                              <div className="flex items-baseline gap-1">
                                <span className="font-sans text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                  ₹{stay.price_per_night}
                                </span>
                                <span className="text-xs text-slate-400 font-medium">/night</span>
                              </div>
                              <div className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span>20% Hold: ₹{advance}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/70 transition-all cursor-pointer"
                                title={`WhatsApp Host ${stay.host_name}`}
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCardClick(stay)}
                                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-md shadow-slate-900/10 active:scale-95 transition-all cursor-pointer"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. MODERN 3-COLUMN DRIBBLE GRID (viewMode === 'grid') */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {sortedStays.map((stay) => {
                    const advance = Math.round(stay.price_per_night * 0.20);
                    const currentPhotoIdx = activeCardImage[stay.id] || 0;
                    const imagesList = stay.imageUrls && stay.imageUrls.length > 0 ? stay.imageUrls : ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'];
                    const isWishlisted = wishlist.includes(stay.id);
                    const hostDigits = stay.host_whatsapp ? stay.host_whatsapp.replace(/\D/g, '') : '919845123091';
                    const waLink = `https://wa.me/${hostDigits}?text=${encodeURIComponent(`Namaskara ${stay.host_name}! I am looking at ${stay.title} on Coastal Trails Gokarna.`)}`;

                    return (
                      <article
                        key={`grid-mode-${stay.id}`}
                        className="group bg-white p-3.5 sm:p-4 rounded-[28px] border border-slate-150/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                      >
                        <div>
                          <div className="relative aspect-[16/11] rounded-[22px] overflow-hidden bg-slate-100 select-none">
                            <img
                              src={imagesList[currentPhotoIdx]} loading="lazy"
                              alt={stay.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out cursor-pointer"
                              onClick={() => handleCardClick(stay)}
                            />
                            {stay.is_host_verified && (
                              <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/95 backdrop-blur-md rounded-full text-[10px] font-bold text-slate-800 flex items-center gap-1 shadow-sm">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                <span>Family Host</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => toggleWishlist(stay.id, e)}
                              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white backdrop-blur-md flex items-center justify-center transition-transform active:scale-90 hover:scale-110 shadow-sm cursor-pointer"
                              title="Save stay"
                            >
                              <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`} />
                            </button>

                            {imagesList.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  aria-label="Previous photo"
                                  onClick={(e) => handlePrevPhoto(stay.id, imagesList.length, e)}
                                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/90 dark:border-white/25 shadow-md backdrop-blur-xs flex items-center justify-center opacity-90 group-hover:opacity-100 transition-all z-20 cursor-pointer active:scale-90"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Next photo"
                                  onClick={(e) => handleNextPhoto(stay.id, imagesList.length, e)}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/90 dark:border-white/25 shadow-md backdrop-blur-xs flex items-center justify-center opacity-90 group-hover:opacity-100 transition-all z-20 cursor-pointer active:scale-90"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                                <div className="absolute bottom-2.5 inset-x-0 flex justify-center gap-1 z-20 pointer-events-none">
                                  {imagesList.map((_, pIdx) => (
                                    <span
                                      key={pIdx}
                                      className={`h-1.5 rounded-full transition-all ${
                                        currentPhotoIdx === pIdx ? 'w-4 bg-white shadow-sm' : 'w-1.5 bg-white/60 dark:bg-white/50'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </>
                            )}
                          </div>

                          <div className="px-1 pt-3.5 space-y-2">
                            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-slate-700 font-medium">{stay.location_display}, Gokarna</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                                <span className="font-semibold text-slate-800">{stay.reviews_count > 0 ? stay.rating : 'New'}</span>
                                <span className="text-slate-400">({stay.reviews_count})</span>
                              </div>
                            </div>

                            <h3
                              onClick={() => handleCardClick(stay)}
                              className="font-sans text-base sm:text-lg font-bold text-slate-900 hover:text-sky-600 transition-colors cursor-pointer line-clamp-1 tracking-tight"
                            >
                              {stay.title}
                            </h3>

                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {stay.verifiedBadges?.slice(0, 4).map((b, bIdx) => (
                                <span
                                  key={bIdx}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-[11px] font-medium text-slate-600"
                                >
                                  {renderAmenityIcon(b)}
                                  <span>{b}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="px-1 pt-3.5 mt-2 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <div className="flex items-baseline gap-1">
                              <span className="font-sans text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                ₹{stay.price_per_night}
                              </span>
                              <span className="text-xs text-slate-400 font-medium">/night</span>
                            </div>
                            <div className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>20% Hold: ₹{advance}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/70 transition-all cursor-pointer"
                              title={`WhatsApp Host ${stay.host_name}`}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCardClick(stay)}
                              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-md shadow-slate-900/10 active:scale-95 transition-all cursor-pointer"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* 3. WIDE STUDIO LIST ARRANGEMENT (viewMode === 'list') */}
              {viewMode === 'list' && (
                <div className="space-y-4">
                  {sortedStays.map((stay) => {
                    const advance = Math.round(stay.price_per_night * 0.20);
                    const currentPhotoIdx = activeCardImage[stay.id] || 0;
                    const imagesList = stay.imageUrls && stay.imageUrls.length > 0 ? stay.imageUrls : ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'];
                    const isWishlisted = wishlist.includes(stay.id);
                    const hostDigits = stay.host_whatsapp ? stay.host_whatsapp.replace(/\D/g, '') : '919845123091';
                    const waLink = `https://wa.me/${hostDigits}?text=${encodeURIComponent(`Namaskara ${stay.host_name}! I am viewing ${stay.title} on Coastal Trails Gokarna.`)}`;

                    return (
                      <article
                        key={`studio-list-${stay.id}`}
                        className="group bg-white rounded-3xl p-4 border border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:border-sky-300 transition-all flex flex-col md:flex-row gap-5 items-stretch"
                      >
                        {/* Wide Left Image Container */}
                        <div className="relative w-full md:w-80 aspect-[16/11] shrink-0 rounded-2xl overflow-hidden bg-slate-100 select-none">
                          <img
                            src={imagesList[currentPhotoIdx]} loading="lazy"
                            alt={stay.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out cursor-pointer"
                            onClick={() => handleCardClick(stay)}
                          />
                          <div className="absolute top-3 left-3 px-2.5 py-1 bg-emerald-600 text-white rounded-full text-[10px] font-bold shadow-xs">
                            20% OFFLINE HOLD
                          </div>
                          <button
                            type="button"
                            onClick={(e) => toggleWishlist(stay.id, e)}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white backdrop-blur-md flex items-center justify-center transition-transform active:scale-90 hover:scale-110 shadow-sm cursor-pointer"
                            title="Save stay"
                          >
                            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`} />
                          </button>

                          {imagesList.length > 1 && (
                            <>
                              <button
                                type="button"
                                aria-label="Previous photo"
                                onClick={(e) => handlePrevPhoto(stay.id, imagesList.length, e)}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/90 dark:border-white/25 shadow-md backdrop-blur-xs flex items-center justify-center opacity-90 group-hover:opacity-100 transition-all z-20 cursor-pointer active:scale-90"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                aria-label="Next photo"
                                onClick={(e) => handleNextPhoto(stay.id, imagesList.length, e)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/90 dark:border-white/25 shadow-md backdrop-blur-xs flex items-center justify-center opacity-90 group-hover:opacity-100 transition-all z-20 cursor-pointer active:scale-90"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <div className="absolute bottom-2.5 inset-x-0 flex justify-center gap-1 z-20 pointer-events-none">
                                {imagesList.map((_, pIdx) => (
                                  <span
                                    key={pIdx}
                                    className={`h-1.5 rounded-full transition-all ${
                                      currentPhotoIdx === pIdx ? 'w-4 bg-white shadow-sm' : 'w-1.5 bg-white/60 dark:bg-white/50'
                                    }`}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Right Content Details */}
                        <div className="flex-1 flex flex-col justify-between py-1 space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="font-semibold text-slate-800 flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                                  <span>{stay.reviews_count > 0 ? stay.rating : 'New'}</span>
                                  <span className="text-slate-400 font-normal">
                                    {stay.reviews_count > 0 ? `(${stay.reviews_count} reviews)` : '(no reviews yet)'}
                                  </span>
                                </span>
                                <span>•</span>
                                <span className="text-slate-600">{stay.location_display}, Gokarna</span>
                                <span>•</span>
                                <span className="text-slate-500">🚶 {stay.walking_minutes_to_beach} min to shore</span>
                              </div>

                              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                                Direct Host: {stay.host_name}
                              </span>
                            </div>

                            <h3
                              onClick={() => handleCardClick(stay)}
                              className="font-serif text-xl font-bold text-slate-900 hover:text-sky-600 transition-colors cursor-pointer"
                            >
                              {stay.title}
                            </h3>

                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              {stay.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {stay.verifiedBadges?.map((badge, bIdx) => (
                                <span
                                  key={bIdx}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700"
                                >
                                  {renderAmenityIcon(badge)}
                                  <span>{badge}</span>
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                            <div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-sans text-2xl font-black text-slate-900">
                                  ₹{stay.price_per_night}
                                </span>
                                <span className="text-xs text-slate-400 font-medium">/night</span>
                              </div>
                              <div className="text-xs font-semibold text-emerald-600">
                                20% Offline Hold: ₹{advance}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <MessageCircle className="w-4 h-4 text-emerald-600" />
                                <span>WhatsApp Host</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCardClick(stay)}
                                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
                              >
                                Details
                              </button>
                              <button
                                type="button"
                                onClick={() => onBookStay(stay)}
                                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <span>Book Stay</span>
                                <Calendar className="w-3.5 h-3.5 text-sky-200" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 4. RETRO ANIME ETHICAL TOURISM STANDARDS */}
      <section className="relative overflow-hidden rounded-3xl border-2 border-ink/30 dark:border-line-2 bg-[oklch(0.965_0.03_80)] dark:bg-paper-2 p-8 sm:p-12 transition-colors duration-std">
        <div
          className="pointer-events-none absolute -top-28 left-1/2 h-[420px] w-[420px] -translate-x-1/2 opacity-30 dark:opacity-10"
          style={{ background: 'repeating-conic-gradient(var(--c-gold) 0deg 10deg, transparent 10deg 20deg)' }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-6 left-6 h-36 w-36 opacity-25 dark:opacity-10"
          style={{ backgroundImage: 'radial-gradient(var(--c-ink) 1.5px, transparent 1.5px)', backgroundSize: '9px 9px' }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-8 top-10 h-24 w-24 opacity-25 dark:opacity-10"
          style={{ backgroundImage: 'radial-gradient(var(--c-ink) 1.5px, transparent 1.5px)', backgroundSize: '7px 7px' }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-2xl text-center">
          <span className="inline-block -rotate-3 rounded-lg border-2 border-ink dark:border-amber-400/60 bg-gold px-3.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-950 shadow-[3px_3px_0_0_var(--c-ink)] dark:shadow-[3px_3px_0_0_rgba(0,0,0,0.5)]">
            Direct &amp; Transparent ★
          </span>
          <h2 className="mt-5 font-display text-4xl font-bold uppercase tracking-tight text-ink sm:text-5xl">
            The Coastal Trails{' '}
            <span style={{ WebkitTextStroke: '2px var(--c-ink)', color: 'transparent' }}>Standard</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm font-medium leading-relaxed text-ink/80 dark:text-ink-2">
            Preserving Karavali family homestays through transparency, direct host coordination, and low-impact tourism.
          </p>
        </div>

        <div className="relative mt-12 grid grid-cols-1 gap-7 md:grid-cols-3">
          <div className="relative rotate-1 rounded-2xl border-2 border-ink/40 dark:border-line-2 bg-[oklch(0.99_0.006_95)] dark:bg-elevated p-6 shadow-[6px_6px_0_0_var(--c-ink)] dark:shadow-[6px_6px_0_0_rgba(0,0,0,0.5)] transition-transform duration-300 hover:rotate-0">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink dark:border-line-2 bg-tide-glow text-slate-950">
                <HeartHandshake className="h-5 w-5 text-slate-950" />
              </div>
              <span className="font-mono text-[10px] font-bold tracking-widest text-ink/60 dark:text-ink-3">EP 01</span>
            </div>
            <h3 className="mt-4 font-display text-xl font-bold uppercase leading-tight text-ink">10% Fair Host Model</h3>
            <p className="mt-2 text-xs font-medium leading-relaxed text-ink/80 dark:text-ink-2">
              Unlike corporate aggregators charging 25–30%, we cap fees at 10%, keeping 90% directly with local families.
            </p>
            <span className="mt-4 inline-block rotate-2 border-2 border-ink dark:border-line-2 bg-ember px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white shadow-[3px_3px_0_0_var(--c-ink)] dark:shadow-[3px_3px_0_0_rgba(0,0,0,0.5)]">
              90% to hosts
            </span>
          </div>

          <div className="relative -rotate-1 rounded-2xl border-2 border-ink/40 dark:border-line-2 bg-[oklch(0.99_0.006_95)] dark:bg-elevated p-6 shadow-[6px_6px_0_0_var(--c-ink)] dark:shadow-[6px_6px_0_0_rgba(0,0,0,0.5)] transition-transform duration-300 hover:rotate-0">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink dark:border-line-2 bg-gold text-slate-950">
                <ShieldCheck className="h-5 w-5 text-slate-950" />
              </div>
              <span className="font-mono text-[10px] font-bold tracking-widest text-ink/60 dark:text-ink-3">EP 02</span>
            </div>
            <h3 className="mt-4 font-display text-xl font-bold uppercase leading-tight text-ink">20% Hold Guarantee</h3>
            <p className="mt-2 text-xs font-medium leading-relaxed text-ink/80 dark:text-ink-2">
              Pay 20% online to freeze dates in the database. Settle the remaining 80% with the host upon arrival.
            </p>
            <span className="mt-4 inline-block -rotate-2 border-2 border-ink dark:border-line-2 bg-tide px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white shadow-[3px_3px_0_0_var(--c-ink)] dark:shadow-[3px_3px_0_0_rgba(0,0,0,0.5)]">
              Freeze your dates
            </span>
          </div>

          <div className="relative rotate-1 rounded-2xl border-2 border-ink/40 dark:border-line-2 bg-[oklch(0.99_0.006_95)] dark:bg-elevated p-6 shadow-[6px_6px_0_0_var(--c-ink)] dark:shadow-[6px_6px_0_0_rgba(0,0,0,0.5)] transition-transform duration-300 hover:rotate-0">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink dark:border-line-2 bg-tide/20 dark:bg-tide/40 text-tide dark:text-tide-glow">
                <Compass className="h-5 w-5 text-tide dark:text-tide-glow" />
              </div>
              <span className="font-mono text-[10px] font-bold tracking-widest text-ink/60 dark:text-ink-3">EP 03</span>
            </div>
            <h3 className="mt-4 font-display text-xl font-bold uppercase leading-tight text-ink">Mapped Cliff Trails</h3>
            <p className="mt-2 text-xs font-medium leading-relaxed text-ink/80 dark:text-ink-2">
              Every cottage is mapped with cliff trail walking times, boat ferry schedules, and local auto dispatcher helplines.
            </p>
            <span className="mt-4 inline-block rotate-1 border-2 border-ink dark:border-line-2 bg-gold px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-950 shadow-[3px_3px_0_0_var(--c-ink)] dark:shadow-[3px_3px_0_0_rgba(0,0,0,0.5)]">
              6 enclaves mapped
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
