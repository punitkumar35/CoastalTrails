import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@iconify/react';
import { useTheme } from './lib/theme';
import { cn } from './lib/cn';
import { easeOut } from './lib/motion';
import { adminLogout } from './services/api';
import { TideLine } from './components/ui/TideLine';
import { GrainOverlay } from './components/ui/GrainOverlay';
import { ClickSpark } from './components/ui/ClickSpark';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminStaysPage } from './pages/AdminStaysPage';
import { AdminStayFormPage } from './pages/AdminStayFormPage';
import { AdminBookingsPage } from './pages/AdminBookingsPage';
import StayBookingsPage from './pages/StayBookingsPage';
import NewBookingsPage from './pages/NewBookingsPage';
import { AdminHostsPage } from './pages/AdminHostsPage';
import StayRoomsPage from './pages/StayRoomsPage';

const ADMIN_KEY = 'coastal_admin';

export function loadAdmin(): { name: string; phone: string } | null {
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function WelcomeOverlay({ name, onDone }: { name: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
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
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="overline !text-tide-glow">
          Admin console
        </motion.p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white sm:text-6xl">
          {['Welcome,', name.split(' ')[0]].map((word, i) => (
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
  const [admin, setAdmin] = useState<{ name: string; phone: string } | null>(loadAdmin);
  const [greeting, setGreeting] = useState(false);

  useEffect(() => {
    if (!admin) navigate('/login', { replace: true });
  }, [admin, navigate]);

  const nav = [
    { label: 'Dashboard', icon: 'lucide:layout-dashboard', path: '/dashboard' },
    { label: 'Stays', icon: 'lucide:waves', path: '/stays' },
    { label: 'Bookings', icon: 'lucide:book-open', path: '/bookings' },
    { label: 'Hosts', icon: 'lucide:users', path: '/hosts' },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <TideLine />
      <GrainOverlay />
      <ClickSpark />

      <header className="glass fixed inset-x-0 top-0 z-chrome border-b border-line">
        <div className="relative flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-8 lg:px-10">
          <button onClick={() => navigate('/dashboard')} aria-label="Admin home" className="flex shrink-0 items-center">
            <img src="/coastal-trails-logo.svg" alt="Coastal Trails" className="h-10 w-auto object-contain" />
          </button>

          <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-line bg-paper-2 p-1 md:flex">
            {nav.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-micro',
                  location.pathname.startsWith(item.path) ? 'bg-tide text-white' : 'text-ink-2 hover:text-ink',
                )}
              >
                <Icon icon={item.icon} className="h-3.5 w-3.5" />
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
              {theme === 'dark' ? <Icon icon="lucide:sun" className="h-4 w-4" /> : <Icon icon="lucide:moon" className="h-4 w-4" />}
            </button>
            {admin ? (
              <div className="flex items-center gap-2">
                <span className="hidden text-xs font-semibold text-ink-2 sm:inline">{admin.name}</span>
                <span className="hidden sm:inline-flex">
                  <Icon icon="lucide:chevron-down" className="h-3.5 w-3.5 text-ink-3" />
                </span>
                <button
                  onClick={() => {
                    adminLogout();
                    localStorage.removeItem(ADMIN_KEY);
                    setAdmin(null);
                  }}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-elevated px-3.5 text-xs font-semibold text-ink-2 transition-colors hover:text-err"
                >
                  <Icon icon="lucide:log-out" className="h-3.5 w-3.5" />
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
          {admin ? (
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<AdminDashboardPage />} />
              <Route path="/stays" element={<AdminStaysPage />} />
              <Route path="/stays/new" element={<AdminStayFormPage />} />
              <Route path="/stays/:id/edit" element={<AdminStayFormPage />} />
              <Route path="/bookings" element={<AdminBookingsPage />} />
              <Route path="/bookings/new" element={<NewBookingsPage />} />
              <Route path="/bookings/:stayId" element={<StayBookingsPage />} />
              <Route path="/hosts" element={<AdminHostsPage />} />
              <Route path="/stays/:id/rooms" element={<StayRoomsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          ) : (
            <Routes>
              <Route
                path="/login"
                element={
                  <AdminLoginPage
                    onLogin={(a) => {
                      setAdmin(a);
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
        {greeting && admin ? <WelcomeOverlay key="welcome" name={admin.name} onDone={() => setGreeting(false)} /> : null}
      </AnimatePresence>
    </div>
  );
}
