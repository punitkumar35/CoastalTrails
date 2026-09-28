import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Mail, Send } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Input';
import { api } from '../services/api';
import { useSEO } from '../lib/seo';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useSEO({
    title: 'Account Recovery | Coastal Trails Gokarna',
    noindex: true,
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError('');
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset link.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md py-8 sm:py-14">
      <div className="overflow-hidden rounded-[28px] border border-line bg-elevated shadow-[0_1px_2px_rgba(22,34,46,0.04),0_28px_60px_-36px_rgba(22,34,46,0.4)]">
        <div className="relative overflow-hidden bg-[radial-gradient(120%_140%_at_15%_0%,oklch(0.34_0.07_205)_0%,oklch(0.23_0.045_235)_45%,oklch(0.16_0.03_258)_100%)] px-7 py-7 text-white">
          <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
          <p className="relative font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-tide-glow">
            Account recovery
          </p>
          <h1 className="relative mt-1.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {sent ? 'Check your inbox' : 'Forgot password?'}
          </h1>
          <p className="relative mt-1.5 text-sm text-white/70">
            {sent
              ? 'We have processed your request.'
              : 'Enter the email on your Coastal Trails account and we will send you a secure reset link.'}
          </p>
        </div>

        <div className="p-7">
          {sent ? (
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok/10 text-ok">
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <p className="mt-4 text-sm leading-relaxed text-ink-2">
                If an account exists for <span className="font-semibold text-ink">{email}</span>, a password reset link is
                on its way. The link expires in 15 minutes and can only be used once.
              </p>
              <p className="mt-3 text-xs text-ink-3">
                Didn't get it? Check spam, or try again with another email address.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3">
                <Button variant="secondary" onClick={() => setSent(false)}>
                  <ArrowLeft className="h-4 w-4" />
                  Try another email
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Email address">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </Field>

              {error ? (
                <p className="flex items-center gap-2 rounded-xl border border-err/40 bg-err/10 px-4 py-3 text-sm font-medium text-err">
                  <Mail className="h-4 w-4 shrink-0" />
                  {error}
                </p>
              ) : null}

              <Button type="submit" className="w-full" disabled={sending}>
                <Send className="h-4 w-4" />
                {sending ? 'Sending…' : 'Send Reset Link'}
              </Button>
              <p className="text-center text-[11px] leading-relaxed text-ink-3">
                For your security, we show the same confirmation whether or not that email is registered.
              </p>
            </form>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-ink-3">
        Remembered it?{' '}
        <Link to="/?auth=signin" className="font-semibold text-tide hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
