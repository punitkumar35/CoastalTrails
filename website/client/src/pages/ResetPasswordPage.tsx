import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Input';
import {
  PasswordInput,
  PasswordRules,
  passwordSegmentActive,
  passwordStrength,
} from '../components/ui/PasswordField';
import { api } from '../services/api';
import { useSEO } from '../lib/seo';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useSEO({
    title: 'Reset Password | Coastal Trails Gokarna',
    noindex: true,
  });

  const strength = passwordStrength(newPassword);
  const formValid =
    token.length > 0 &&
    newPassword.length >= 8 &&
    /[A-Za-z]/.test(newPassword) &&
    /[0-9]/.test(newPassword) &&
    newPassword === confirmPassword;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!formValid) {
      setError('Please fix the password rules below before continuing.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.resetPassword({
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset your password.');
    } finally {
      setSaving(false);
    }
  }

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto w-full max-w-md py-8 sm:py-14">
      <div className="overflow-hidden rounded-[28px] border border-line bg-elevated shadow-[0_1px_2px_rgba(22,34,46,0.04),0_28px_60px_-36px_rgba(22,34,46,0.4)]">
        <div className="relative overflow-hidden bg-[radial-gradient(120%_140%_at_15%_0%,oklch(0.34_0.07_205)_0%,oklch(0.23_0.045_235)_45%,oklch(0.16_0.03_258)_100%)] px-7 py-7 text-white">
          <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-tide-glow/20 blur-3xl" />
          <p className="relative font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-tide-glow">
            Account recovery
          </p>
          <h1 className="relative mt-1.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {done ? 'Password updated' : 'Choose a new password'}
          </h1>
          <p className="relative mt-1.5 text-sm text-white/70">
            {done
              ? 'You can now sign in with your new password.'
              : 'Set a strong password for your Coastal Trails account.'}
          </p>
        </div>
        <div className="p-7">{children}</div>
      </div>
    </div>
  );

  if (!token) {
    return shell(
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-err/10 text-err">
          <AlertCircle className="h-7 w-7" />
        </span>
        <p className="mt-4 text-sm leading-relaxed text-ink-2">
          This reset link is invalid or incomplete. Please request a new reset link and use the button inside the email.
        </p>
        <Link to="/forgot-password" className="mt-6 inline-block">
          <Button>Request a new link</Button>
        </Link>
      </div>,
    );
  }

  if (done) {
    return shell(
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok/10 text-ok">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <p className="mt-4 text-sm leading-relaxed text-ink-2">
          Your password has been reset. For your security, every existing session was signed out — please sign in again
          with your new password.
        </p>
        <Link to="/?auth=signin" className="mt-6 inline-block">
          <Button>
            <ShieldCheck className="h-4 w-4" />
            Sign in
          </Button>
        </Link>
      </div>,
    );
  }

  return shell(
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="New password">
        <PasswordInput
          id="reset-new-password"
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
          id="reset-confirm-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          placeholder="Repeat the new password"
        />
      </Field>

      <PasswordRules password={newPassword} confirm={confirmPassword} />

      {error ? (
        <p className="flex items-center gap-2 rounded-xl border border-err/40 bg-err/10 px-4 py-3 text-sm font-medium text-err">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={saving || !formValid}>
        <KeyRound className="h-4 w-4" />
        {saving ? 'Resetting…' : 'Reset Password'}
      </Button>

      <p className="text-center text-xs text-ink-3">
        Link expired or already used?{' '}
        <Link to="/forgot-password" className="font-semibold text-tide hover:underline">
          Request a new one
        </Link>
      </p>
    </form>,
  );
}
