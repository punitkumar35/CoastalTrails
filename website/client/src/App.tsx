import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { AssistantChat } from './components/AssistantChat';
import { Button } from './components/ui/Button';
import type { CommandItem } from './components/ui/CommandPalette';
import { TideLine } from './components/ui/TideLine';
import { GrainOverlay } from './components/ui/GrainOverlay';
import { ClickSpark } from './components/ui/ClickSpark';
import { Skeleton } from './components/ui/Skeleton';
import { easeOut } from './lib/motion';
import type { Homestay, User } from './types';
import { api } from './services/api';
import { useLiveRefresh } from './lib/live';

const ExplorePage = lazy(() => import('./pages/ExplorePage').then((m) => ({ default: m.ExplorePage })));
const StayDetailPage = lazy(() => import('./pages/StayDetailPage').then((m) => ({ default: m.StayDetailPage })));
const StayReviewsPage = lazy(() => import('./pages/StayReviewsPage').then((m) => ({ default: m.StayReviewsPage })));
const RouteNavigatorPage = lazy(() => import('./pages/RouteNavigatorPage').then((m) => ({ default: m.RouteNavigatorPage })));
const ReservationStatusPage = lazy(() => import('./pages/ReservationStatusPage').then((m) => ({ default: m.ReservationStatusPage })));
const DatabaseStudioPage = lazy(() => import('./pages/DatabaseStudioPage').then((m) => ({ default: m.DatabaseStudioPage })));
const SurveyWorkspacePage = lazy(() => import('./survey/SurveyWorkspacePage').then((m) => ({ default: m.SurveyWorkspacePage })));
const BookingPage = lazy(() => import('./pages/BookingPage').then((m) => ({ default: m.BookingPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const CommandPalette = lazy(() => import('./components/ui/CommandPalette').then((m) => ({ default: m.CommandPalette })));

function PageFallback() {
  return (
    <div className="min-h-[calc(100dvh-10rem)] space-y-6">
      <Skeleton className="h-72 w-full rounded-3xl" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}

function RequireAuth({
  user,
  authReady,
  onRequireAuth,
  onExplore,
  children,
}: {
  user: User | null;
  authReady: boolean;
  onRequireAuth: () => void;
  onExplore: () => void;
  children: ReactNode;
}) {
  const requested = useRef(false);
  useEffect(() => {
    // Wait until the saved session has been restored before deciding to prompt
    if (authReady && !user && !requested.current) {
      requested.current = true;
      onRequireAuth();
    }
  }, [authReady, user, onRequireAuth]);

  if (user) return <>{children}</>;
  if (!authReady) return <PageFallback />;
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-line bg-elevated px-8 py-16 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-tide-glow/15 text-tide">
        <Lock className="h-6 w-6" />
      </div>
      <p className="overline mb-2">Members only</p>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Sign in to view bookings</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-2">Your reservations, vouchers and holds are visible only after you sign in.</p>
      <Button className="mt-6" onClick={onRequireAuth}>
        Sign in to continue
      </Button>
      <button onClick={onExplore} className="mt-3 text-xs font-semibold text-tide hover:underline">
        Explore stays instead
      </button>
    </div>
  );
}

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [selectedStay, setSelectedStay] = useState<Homestay | null>(null);
  const [recentRefCode, setRecentRefCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  const lastFilters = useRef<{ beach?: string; search?: string; checkIn?: string; checkOut?: string }>({});

  const fetchStays = async (beach?: string, search?: string, checkIn?: string, checkOut?: string, silent = false) => {
    lastFilters.current = { beach, search, checkIn, checkOut };
    try {
      if (!silent) setLoading(true);
      const data = await api.getHomestays({ location: beach, search, checkIn, checkOut });
      setHomestays(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStays();
    try {
      const savedUser = localStorage.getItem('gokarna_traveler_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser) as User;
        if (parsed && parsed.id && (parsed.phone || parsed.email)) {
          setCurrentUser(parsed);
        } else {
          localStorage.removeItem('gokarna_traveler_user');
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved user:', e);
      localStorage.removeItem('gokarna_traveler_user');
    } finally {
      // Session restore finished — protected routes can now safely decide
      // whether the visitor really needs to sign in.
      setAuthReady(true);
    }
  }, []);

  useLiveRefresh(() => {
    const f = lastFilters.current;
    fetchStays(f.beach, f.search, f.checkIn, f.checkOut, true);
  }, 25000);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen((p) => !p);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Every page opens at the top instead of inheriting the previous scroll position
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  const commandItems = useMemo<CommandItem[]>(
    () => [
      { id: 'home', label: 'Explore homestays', onSelect: () => navigate('/') },
      { id: 'trails', label: 'Trails & Culture', onSelect: () => navigate('/trails') },
      { id: 'bookings', label: 'Track bookings', onSelect: () => navigate('/bookings') },
    ],
    [navigate],
  );

  const handleSelectStay = (stay: Homestay) => {
    setSelectedStay(stay);
    navigate(`/stay/${stay.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookStay = (stay: Homestay) => {
    navigate(`/book/${stay.id}`);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <TideLine />
      <GrainOverlay />
      <ClickSpark />

      <Navbar
        currentUser={currentUser}
        onOpenAuth={(mode = 'signin') => {
          setAuthMode(mode);
          setIsAuthOpen(true);
        }}
        onSignOut={() => {
          api.logout();
          localStorage.removeItem('gokarna_traveler_user');
          setCurrentUser(null);
        }}
        onOpenPalette={() => setIsPaletteOpen(true)}
      />

      <main className="w-full flex-1 px-4 pb-6 pt-20 sm:px-8 sm:pt-24 lg:px-10">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: easeOut }}
        >
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route
              path="/"
              element={
                <ExplorePage
                  homestays={homestays}
                  loading={loading}
                  onSelectStay={handleSelectStay}
                  onBookStay={handleBookStay}
                  onFilterChange={(beach, search, checkIn, checkOut) => fetchStays(beach, search, checkIn, checkOut)}
                />
              }
            />
            <Route
              path="/homestays"
              element={
                <ExplorePage
                  homestays={homestays}
                  loading={loading}
                  onSelectStay={handleSelectStay}
                  onBookStay={handleBookStay}
                  onFilterChange={(beach, search, checkIn, checkOut) => fetchStays(beach, search, checkIn, checkOut)}
                />
              }
            />

            <Route
              path="/stay/:id/reviews"
              element={
                <StayReviewsPage />
              }
            />

            <Route
              path="/stay/:id"
              element={
                <StayDetailPage
                  homestay={selectedStay}
                  currentUser={currentUser}
                  onBack={() => navigate('/')}
                  onBook={(stay) => handleBookStay(stay || selectedStay!)}
                  onNavigateRoute={() => navigate('/trails')}
                  onRequireAuth={() => {
                    setAuthMode('signin');
                    setIsAuthOpen(true);
                  }}
                />
              }
            />

            <Route path="/trails" element={<RouteNavigatorPage />} />
            <Route path="/route" element={<Navigate to="/trails" replace />} />

            <Route
              path="/bookings"
              element={
                <RequireAuth
                  user={currentUser}
                  authReady={authReady}
                  onRequireAuth={() => {
                    setAuthMode('signin');
                    setIsAuthOpen(true);
                  }}
                  onExplore={() => navigate('/')}
                >
                  <ReservationStatusPage currentUser={currentUser} initialRefCode={recentRefCode} onExploreStays={() => navigate('/')} />
                </RequireAuth>
              }
            />
            <Route
              path="/reservation/:refCode"
              element={
                <RequireAuth
                  user={currentUser}
                  authReady={authReady}
                  onRequireAuth={() => {
                    setAuthMode('signin');
                    setIsAuthOpen(true);
                  }}
                  onExplore={() => navigate('/')}
                >
                  <ReservationStatusPage currentUser={currentUser} onExploreStays={() => navigate('/')} />
                </RequireAuth>
              }
            />

            <Route
              path="/book/:id"
              element={
                <RequireAuth
                  user={currentUser}
                  authReady={authReady}
                  onRequireAuth={() => {
                    setAuthMode('signin');
                    setIsAuthOpen(true);
                  }}
                  onExplore={() => navigate('/')}
                >
                  <BookingPage currentUser={currentUser} />
                </RequireAuth>
              }
            />
            <Route path="/database" element={<DatabaseStudioPage />} />
            <Route path="/survey" element={<SurveyWorkspacePage />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </motion.div>
      </main>

      <Footer
        onNavigate={navigate}
        onFilterStay={(location) => {
          fetchStays(location);
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authMode}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          const path = location.pathname;
          // Continue where the user already was when they deliberately opened
          // the bookings area or started a booking; otherwise land on the homestay page.
          const keepContext =
            path.startsWith('/bookings') || path.startsWith('/reservation') || path.startsWith('/book/');
          if (!keepContext) navigate('/homestays');
        }}
      />

      <Suspense fallback={null}>
        <CommandPalette open={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} items={commandItems} />
      </Suspense>

      <AssistantChat />
    </div>
  );
}

export default App;
