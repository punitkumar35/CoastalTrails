import { useState } from 'react';
import { motion } from 'motion/react';
import { Icon } from '@iconify/react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { easeEmphasis } from '../lib/motion';
import { adminLogin } from '../services/api';

const ADMIN_KEY = 'coastal_admin';

export function AdminLoginPage({ onLogin }: { onLogin: (a: { name: string; phone: string }) => void }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Enter the admin phone/email and password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const admin = await adminLogin(identifier.trim(), password);
      localStorage.setItem(ADMIN_KEY, JSON.stringify({ name: admin.name, phone: admin.phone }));
      onLogin({ name: admin.name, phone: admin.phone });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-[82vh] items-center justify-center overflow-hidden rounded-3xl border border-line-2 p-6 sm:p-10">
      <img src="/owner-hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/55 to-ink/35" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 animate-blob bg-tide-glow/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
            className="mx-auto flex w-fit items-center justify-center"
          >
            <img src="/coastal-trails-logo.svg" alt="Coastal Trails" className="h-16 w-auto object-contain" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6, ease: easeEmphasis }}
            className="overline mt-6"
          >
            Admin console
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6, ease: easeEmphasis }}
            className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            Coastal Trails desk
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/70"
          >
            Register homestays, oversee every booking, and keep the coast running.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5, ease: easeEmphasis }}
          className="glass mt-8 rounded-3xl p-6"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="overline flex items-center gap-1.5 !text-ink-3">
                <Icon icon="lucide:phone" className="h-3 w-3 text-tide" />
                Admin phone or email
              </label>
              <Input
                type="text"
                placeholder="+91 90000 00000"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="overline flex items-center gap-1.5 !text-ink-3">
                <Icon icon="lucide:lock" className="h-3 w-3 text-tide" />
                Admin password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error ? <p className="text-xs font-semibold text-err">{error}</p> : null}
            <Button type="submit" disabled={busy} className="w-full py-3">
              {busy ? 'Checking access…' : 'Enter console'}
            </Button>
          </form>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center font-mono text-[10px] uppercase tracking-wider text-ink-3">
            <Icon icon="lucide:shield-check" className="h-3 w-3 text-tide" />
            Operator access only — admin role required
          </p>
        </motion.div>
      </div>
    </div>
  );
}
