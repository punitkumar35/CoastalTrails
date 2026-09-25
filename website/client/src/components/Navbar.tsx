import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarCheck, Home, Compass, LogOut, Moon, Sun, Search, type LucideIcon } from 'lucide-react';
import { NavbarWeatherBadge } from './NavbarWeatherBadge';
import { useTheme } from '../lib/theme';
import { cn } from '../lib/cn';
import type { User } from '../types';

interface NavbarProps {
  currentTab?: string;
  setCurrentTab?: (tab: string) => void;
  currentUser?: User | null;
  onOpenAuth?: (mode?: 'signin' | 'register') => void;
  onSignOut?: () => void;
  onOpenPalette?: () => void;
}

interface NavItem {
  id: 'homestays' | 'route' | 'bookings';
  label: string;
  icon: LucideIcon;
  active: boolean;
  path: string;
}

export function Navbar({
  currentTab: propTab,
  setCurrentTab: propSetCurrentTab,
  currentUser,
  onOpenAuth,
  onSignOut,
  onOpenPalette,
}: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const isHomestays = location.pathname === '/' || location.pathname === '/homestays' || location.pathname.startsWith('/stay') || propTab === 'homestays';
  const isTrails = location.pathname === '/trails' || location.pathname === '/route' || propTab === 'route';
  const isBookings = location.pathname === '/bookings' || location.pathname.startsWith('/reservation') || propTab === 'bookings';

  const handleNav = (tab: 'homestays' | 'route' | 'bookings', path: string) => {
    if (propSetCurrentTab) propSetCurrentTab(tab);
    navigate(path);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setIsProfileOpen(false);
    }
    if (isProfileOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  const navItems: NavItem[] = [
    { id: 'homestays', label: 'Homestays', icon: Home, active: isHomestays, path: '/' },
    { id: 'route', label: 'Trails & Culture', icon: Compass, active: isTrails, path: '/trails' },
    { id: 'bookings', label: 'Bookings', icon: CalendarCheck, active: isBookings, path: '/bookings' },
  ];

  return (
    <>
      <header className="glass fixed inset-x-0 top-0 z-chrome border-b border-line">
        <div className="relative flex h-16 w-full items-center justify-between gap-1.5 px-3 sm:gap-4 sm:px-6 lg:px-8 xl:px-10">
          <button onClick={() => handleNav('homestays', '/')} aria-label="Coastal Trails home" className="group flex shrink-0 items-center">
            <img
              src={theme === 'dark' ? '/coastal-trails-logo-dark.svg' : '/coastal-trails-logo.svg'}
              alt="Coastal Trails"
              className="h-8 sm:h-9 md:h-10 lg:h-11 w-auto max-w-[125px] sm:max-w-none object-contain"
            />
          </button>

          <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-line bg-paper-2 p-1 lg:flex shadow-xs">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id, item.path)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 lg:px-3 lg:py-1.5 xl:px-3.5 xl:py-1.5 text-xs font-semibold transition-colors duration-micro whitespace-nowrap',
                  item.active ? 'bg-tide text-white' : 'text-ink-2 hover:text-ink',
                )}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <NavbarWeatherBadge />
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-line bg-elevated text-ink-2 transition-colors hover:text-ink"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            </button>
            {onOpenPalette ? (
              <button
                onClick={onOpenPalette}
                className="hidden items-center gap-2 rounded-full border border-line bg-elevated px-3 py-1.5 text-xs text-ink-3 transition-colors hover:text-ink xl:flex"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="font-mono">⌘K</span>
              </button>
            ) : null}
            {currentUser ? (
              <div ref={profileRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen((p) => !p)}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-elevated p-1 sm:py-1 sm:pl-1 sm:pr-3 text-xs font-semibold text-ink transition-colors hover:border-tide/50"
                  aria-label="User menu"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-tide text-xs uppercase text-white shadow-xs">
                    {currentUser.name.charAt(0)}
                  </span>
                  <span className="hidden max-w-[90px] truncate sm:inline">{currentUser.name.split(' ')[0]}</span>
                </button>
                {isProfileOpen ? (
                  <div className="absolute right-0 top-full mt-2 w-48 sm:w-52 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-line bg-elevated p-2 shadow-2xl z-50">
                    <div className="border-b border-line px-3 py-2">
                      <p className="truncate text-xs font-semibold text-ink">{currentUser.name}</p>
                      <p className="truncate text-[10px] text-ink-3">{currentUser.phone || currentUser.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleNav('bookings', '/bookings');
                        setIsProfileOpen(false);
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
                    >
                      <CalendarCheck className="h-3.5 w-3.5 text-tide" />
                      <span>My Bookings</span>
                    </button>
                    {onSignOut ? (
                      <button
                        type="button"
                        onClick={() => {
                          onSignOut();
                          setIsProfileOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-err transition-colors hover:bg-err/10"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth && onOpenAuth('signin')}
                className="flex h-8 sm:h-9 shrink-0 items-center justify-center gap-1 rounded-full bg-tide px-2.5 sm:px-3.5 text-[11px] sm:text-xs font-semibold text-white transition-colors hover:bg-tide-2"
              >
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <nav
        className="glass fixed inset-x-0 bottom-0 z-chrome border-t border-line px-2 py-1.5 lg:hidden"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id, item.path)}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1 transition-all active:scale-95',
                item.active ? 'text-tide font-semibold' : 'text-ink-3 hover:text-ink',
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
