import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { ChevronRight, LogOut, Moon, ShieldCheck, Sun } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { ProfileContextValue } from '../../components/profile/ProfileLayout';
import { useTheme } from '../../lib/theme';

export function ProfileSettingsPage() {
  const { onSignOut } = useOutletContext<ProfileContextValue>();
  const { theme, toggle } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-tide">Preferences</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-ink-2">Appearance, security and session controls.</p>
      </div>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-line bg-elevated p-6 shadow-sm">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Appearance</h2>
          <p className="text-xs text-ink-2">Currently using the {theme} theme.</p>
        </div>
        <Button variant="secondary" onClick={toggle}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          Switch to {theme === 'dark' ? 'light' : 'dark'}
        </Button>
      </section>

      <Link
        to="/profile/security"
        className="group flex items-center justify-between gap-4 rounded-3xl border border-line bg-elevated p-6 shadow-sm transition-all duration-micro hover:-translate-y-0.5 hover:border-tide/40"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-tide/10 text-tide">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Password &amp; sessions</h2>
            <p className="text-xs text-ink-2">Change your password and sign out other devices.</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
      </Link>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-line bg-paper-2 p-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Session</h2>
          <p className="text-xs text-ink-2">Sign out of Coastal Trails on this device.</p>
        </div>
        <Button variant="secondary" onClick={onSignOut} className="text-err hover:text-err">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </section>
    </div>
  );
}
