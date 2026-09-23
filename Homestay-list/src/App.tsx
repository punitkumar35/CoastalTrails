import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Moon, Sun, Waves, LogOut, Home, BookOpen } from 'lucide-react';
import { useTheme } from './lib/theme';
import { cn } from './lib/cn';
import { easeOut } from './lib/motion';
import { TideLine } from './components/ui/TideLine';
import { GrainOverlay } from './components/ui/GrainOverlay';
import { ClickSpark } from './components/ui/ClickSpark';
import type { Owner } from './types';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { StaysPage } from './pages/StaysPage';
import { AddStayPage } from './pages/AddStayPage';
import { StayEditorPage } from './pages/StayEditorPage';
import { AvailabilityPage } from './pages/AvailabilityPage';
import { BookingsPage } from './pages/BookingsPage';

const OWNER_KEY = 'homestaylist_owner';

export function loadOwner(): Owner | null {
  try {
    const raw = localStorage.getItem(OWNER_KEY);
    return raw ? (JSON.parse(raw) as Owner) : null;
  } catch {
    return null;
  }
}

function WelcomeOverlay({ name, onDone }: { name: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2300);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="fixed inset-0 z-palette flex items-center justify-center bg-[radial-gradient(130%_150%_at_50%_-10%,oklch(0.30_0.06_255)_0%,oklch(0.17_0.03_262)_55%,oklch(0.12_0.025_265)_100%)]"
    >
      <div className="text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="overline !text-tide-glow"
        >
          Owner portal
        </motion.p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white sm:text-6xl">
          {['Namaskara,', name.split(' ')[0]].map((word, i) => (
            <motion.span
              key={word}
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.25, duration: 0.6, ease: easeOut }}
              className={i === 1 ? 'ml-4 inline-block font-light italic text-tide-glow' : 'inline-block'}
            >
              {word}
            </motion.span>
          ))}
        </h1>
        <div className="mt-6 flex items-end justify-center gap-0.5" aria-hidden="true">
          {[8, 14, 20, 26, 20, 14, 8].map((h, i) => (
            <motion.span
              key={i}
              initial={{ height: 4, opacity: 0 }}
              animate={{ height: h, opacity: 1 }}
              transition={{ delay: 0.9 + i * 0.07, type: 'spring', stiffness: 300, damping: 18 }}
              className="w-1 rounded-full bg-tide-glow"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const [owner, setOwner] = useState<Owner | null>(loadOwner);
  const [greeting, setGreeting] = useState(false);

  useEffect(() => {
    if (!owner) navigate('/login', { replace: true });
  }, [owner, navigate]);

  const nav = [
    { label: 'Dashboard', icon: Home, path: '/dashboard' },
    { label: 'My stays', icon: Waves, path: '/stays' },
    { label: 'Bookings', icon: BookOpen, path: '/bookings' },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <TideLine />
      <GrainOverlay />
      <ClickSpark />

      <header className="glass fixed inset-x-0 top-0 z-chrome border-b border-line">
        <div className="relative flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-8 lg:px-10">
          <button onClick={() => navigate('/dashboard')} aria-label="Homestay List home" className="flex shrink-0 items-center">
            <img src="/coastal-trails-logo.svg" alt="Coastal Trails" className="h-10 w-auto object-contain" />
          </button>

          <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-line bg-paper-2 p-1 md:flex">
            {nav.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-micro',
                  location.pathname === item.path ? 'bg-tide text-white' : 'text-ink-2 hover:text-ink',
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-elevated text-ink-2 transition-colors hover:text-ink"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {owner ? (
              <div className="flex items-center gap-2">
                <span className="hidden text-xs font-semibold text-ink-2 sm:inline">{owner.name}</span>
                <button
                  onClick={() => {
                    localStorage.removeItem(OWNER_KEY);
                    setOwner(null);
                  }}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-elevated px-3.5 text-xs font-semibold text-ink-2 transition-colors hover:text-err"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="w-full flex-1 px-4 pb-10 pt-24 sm:px-8 lg:px-10">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: easeOut }}
        >
          {owner ? (
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage owner={owner} />} />
              <Route path="/stays" element={<StaysPage owner={owner} />} />
              <Route path="/stays/new" element={<AddStayPage owner={owner} />} />
              <Route path="/stays/:id/edit" element={<StayEditorPage owner={owner} />} />
              <Route path="/stays/:id/availability" element={<AvailabilityPage owner={owner} />} />
              <Route path="/bookings" element={<BookingsPage owner={owner} />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          ) : (
            <Routes>
              <Route
                path="/login"
                element={
                  <LoginPage
                    onLogin={(o) => {
                      setOwner(o);
                      setGreeting(true);
                    }}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          )}
        </motion.div>
      </main>

      <AnimatePresence>
        {greeting && owner ? (
          <WelcomeOverlay
            key="welcome"
            name={owner.name}
            onDone={() => setGreeting(false)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
