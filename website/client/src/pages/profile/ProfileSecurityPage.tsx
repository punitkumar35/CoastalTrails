import { useEffect, useState, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle2, KeyRound, MonitorSmartphone, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import {
  PasswordInput,
  PasswordRules,
  passwordSegmentActive,
  passwordStrength,
} from '../../components/ui/PasswordField';
import { Field } from '../../components/ui/Input';
import type { ProfileContextValue } from '../../components/profile/ProfileLayout';
import { easeOut } from '../../lib/motion';
import { api } from '../../services/api';

export function ProfileSecurityPage() {
  const { onSignOut } = useOutletContext<ProfileContextValue>();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 4200);
    return () => clearTimeout(timer);
  }, [flash]);

  const strength = passwordStrength(newPassword);
  const formValid =
    currentPassword.length > 0 && newPassword.length >= 8 && /[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword) && newPassword === confirmPassword;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!formValid) {
      setFlash({ tone: 'err', text: 'Please fix the highlighted password rules before continuing.' });
      return;
    }
    setSaving(true);
    setFlash(null);
    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFlash({ tone: 'ok', text: 'Password updated. Other devices have been signed out.' });
    } catch (err) {
      setFlash({ tone: 'err', text: err instanceof Error ? err.message : 'Could not change your password.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-tide">Account security</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Security</h1>
        <p className="mt-1 text-sm text-ink-2">Update your password to keep your account and bookings safe.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-line bg-elevated p-6 shadow-[0_1px_2px_rgba(22,34,46,0.04),0_20px_44px_-30px_rgba(22,34,46,0.3)] sm:p-8"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-tide/10 text-tide">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Change password</h2>
              <p className="text-xs text-ink-3">Use at least 8 characters with a letter and a number.</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <Field label="Current password">
              <PasswordInput
                id="current-password"
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                placeholder="Enter your current password"
              />
            </Field>

            <Field label="New password">
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                placeholder="Create a new password"
              />
            </Field>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-ink-3">Password strength</span>
                <span className={`text-xs font-semibold ${strength.textColor}`}>{strength.label}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={
                      'h-1.5 rounded-full transition-colors duration-300 ' +
                      (passwordSegmentActive(strength.score, i) ? strength.color : 'bg-line')
                    }
                  />
                ))}
              </div>
            </div>

            <Field label="Confirm new password">
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                placeholder="Repeat the new password"
              />
            </Field>

            <PasswordRules password={newPassword} confirm={confirmPassword} />

            {flash && flash.tone === 'err' ? (
              <p className="flex items-center gap-2 rounded-xl border border-err/40 bg-err/10 px-4 py-3 text-sm font-medium text-err">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {flash.text}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
              <Button type="submit" disabled={saving || !formValid}>
                <ShieldCheck className="h-4 w-4" />
                {saving ? 'Updating…' : 'Update Password'}
              </Button>
              <button
                type="button"
                onClick={onSignOut}
                className="text-xs font-semibold text-ink-3 transition-colors hover:text-err"
              >
                Sign out instead
              </button>
            </div>
          </div>
        </form>

        <aside className="space-y-4 lg:self-start">
          <div className="rounded-3xl border border-line bg-elevated p-6 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 text-gold">
              <MonitorSmartphone className="h-5 w-5" />
            </span>
            <h2 className="mt-3 font-display text-base font-semibold text-ink">Sessions</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-2">
              Changing your password signs out every other device. This device stays signed in so you can continue
              managing your bookings.
            </p>
          </div>
          <div className="rounded-3xl border border-line bg-paper-2 p-6">
            <h2 className="font-display text-base font-semibold text-ink">Password tips</h2>
            <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-ink-2">
              <li>Mix upper and lower case letters.</li>
              <li>Add a symbol for extra strength.</li>
              <li>Avoid names, birthdays and booking IDs.</li>
              <li>Never share your password over WhatsApp or email.</li>
            </ul>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {flash && flash.tone === 'ok' ? (
          <motion.div
            key="security-flash"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: easeOut }}
            className="pointer-events-none fixed inset-x-0 top-20 z-palette flex justify-center px-4"
          >
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-auto flex items-center gap-2 rounded-xl border border-ok/40 bg-elevated px-4 py-3 text-sm font-semibold text-ok shadow-2xl"
            >
              <CheckCircle2 className="h-4 w-4" />
              {flash.text}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
