import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  CalendarCheck,
  Heart,
  IndianRupee,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { api } from '../../services/api';
import type { User } from '../../types';

export interface ProfileContextValue {
  profile: User | null;
  onUserUpdate: (user: User) => void;
  onSignOut: () => void;
}

const navItems: {
  to: string;
  end: boolean;
  label: string;
  short: string;
  Icon: typeof LayoutDashboard;
  badge?: string;
}[] = [
  { to: '/profile', end: true, label: 'Overview', short: 'Overview', Icon: LayoutDashboard },
  { to: '/profile/bookings', end: false, label: 'My Bookings', short: 'Bookings', Icon: CalendarCheck },
  { to: '/profile/payments', end: false, label: 'Payment History', short: 'Payments', Icon: IndianRupee },
  { to: '/profile/wallet', end: false, label: 'Wallet', short: 'Wallet', Icon: Wallet, badge: 'Soon' },
  { to: '/profile/wishlist', end: false, label: 'Wishlist', short: 'Wishlist', Icon: Heart },
  { to: '/profile/edit', end: false, label: 'Personal Information', short: 'Profile', Icon: UserRound },
  { to: '/profile/security', end: false, label: 'Security', short: 'Security', Icon: ShieldCheck },
  { to: '/profile/support', end: false, label: 'Help & Support', short: 'Support', Icon: LifeBuoy },
  { to: '/profile/settings', end: false, label: 'Settings', short: 'Settings', Icon: Settings },
];

export function ProfileLayout({
  currentUser,
  onUserUpdate,
  onSignOut,
}: {
  currentUser: User | null;
  onUserUpdate: (user: User) => void;
  onSignOut: () => void;
}) {
  const [profile, setProfile] = useState<User | null>(currentUser);

  useEffect(() => {
    let active = true;
    api
      .getProfile()
      .then((data) => {
        if (!active) return;
        setProfile((prev) => {
          const base = prev || currentUser;
          return { ...(base || {}), ...data, token: base?.token } as User;
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [currentUser]);

  const display = profile || currentUser;
  const displayName = display?.name || 'Traveller';
  const firstName = displayName.split(' ')[0];
  const roleLabel = display?.role && display.role !== 'traveler' ? display.role : 'Customer';
  const initial = displayName.charAt(0).toUpperCase();
  const memberSince = display?.member_since
    ? new Date(String(display.member_since).replace(' ', 'T')).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="relative overflow-hidden rounded-[28px] border border-line bg-[radial-gradient(120%_140%_at_15%_0%,oklch(0.34_0.07_205)_0%,oklch(0.23_0.045_235)_45%,oklch(0.16_0.03_258)_100%)] px-6 py-7 text-white shadow-[0_24px_60px_-30px_rgba(11,20,30,0.55)] sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gold/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-tide-glow/20 blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            {display?.profile_image ? (
              <img
                src={display.profile_image}
                alt={displayName}
                className="h-16 w-16 shrink-0 rounded-full border-2 border-white/30 object-cover shadow-lg sm:h-20 sm:w-20"
              />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-tide-glow/25 text-2xl font-semibold uppercase text-white shadow-lg sm:h-20 sm:w-20">
                {initial}
              </span>
            )}
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-tide-glow">
                Your Coastal Trails
              </p>
              <h1 className="mt-1 truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                Hello, {firstName}!
              </h1>
              <p className="mt-1 truncate text-xs text-white/70 sm:text-sm">
                {displayName}
                {display?.email ? ` · ${display.email}` : ''}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
                  {roleLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
                  <Sparkles className="h-3 w-3" />
                  Coastal Member
                </span>
                {memberSince ? (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-white/50">
                    Since {memberSince}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <Link
            to="/profile/edit"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20 sm:self-center"
          >
            <UserRound className="h-4 w-4" />
            Edit Profile
          </Link>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-8">
        <nav aria-label="Profile sections" className="lg:hidden">
          <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-4">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors',
                    isActive
                      ? 'border-tide/30 bg-tide/10 text-tide'
                      : 'border-line bg-elevated text-ink-2 hover:border-line-2 hover:text-ink',
                  )
                }
              >
                <item.Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.short}</span>
                {item.badge ? (
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-gold" />
                ) : null}
              </NavLink>
            ))}
          </div>
        </nav>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <nav aria-label="Profile sections" className="rounded-2xl border border-line bg-elevated p-2 shadow-sm">
              {navItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-micro',
                      isActive
                        ? 'bg-tide/10 font-semibold text-tide'
                        : 'text-ink-2 hover:bg-paper-2 hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive ? (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-tide" />
                      ) : null}
                      <item.Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge ? (
                        <span className="rounded-full border border-tide/40 bg-tide/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-tide">
                          {item.badge}
                        </span>
                      ) : null}
                      {isActive ? <span className="h-1.5 w-1.5 rounded-full bg-tide" /> : null}
                    </>
                  )}
                </NavLink>
              ))}
              <div className="my-2 h-px bg-line" />
              <button
                type="button"
                onClick={onSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-err transition-colors duration-micro hover:bg-err/10"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Logout</span>
              </button>
            </nav>

            <div className="rounded-2xl border border-line bg-paper-2 p-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-3">Need a hand?</p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-2">
                Booking help, refunds and host coordination — our team replies from the booking inbox.
              </p>
              <Link
                to="/profile/support"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-tide hover:underline"
              >
                <LifeBuoy className="h-3.5 w-3.5" />
                Contact support
              </Link>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <Outlet context={{ profile: display, onUserUpdate, onSignOut } satisfies ProfileContextValue} />
        </div>
      </div>
    </div>
  );
}
