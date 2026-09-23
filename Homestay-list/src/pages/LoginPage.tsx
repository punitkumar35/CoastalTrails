import { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ShieldCheck, Lock, Mail, Phone, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TwinkleSparkle } from '../components/ui/Sparkle';
import { api } from '../services/api';
import { easeEmphasis, springSoft } from '../lib/motion';
import { cn } from '../lib/cn';
import type { Owner } from '../types';

const OWNER_KEY = 'homestaylist_owner';

const GREETING = ['Namaskara,', 'host.'];

function FieldRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="overline flex items-center gap-1.5 !text-ink-3">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

export function LoginPage({ onLogin }: { onLogin: (owner: Owner) => void }) {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function signIn(owner: Owner) {
    localStorage.setItem(OWNER_KEY, JSON.stringify(owner));
    onLogin(owner);
  }

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Enter a valid 10-digit WhatsApp number.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    signIn({ name: name.trim() || 'Host', phone: phone.trim() });
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Enter a valid 10-digit WhatsApp number.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await api.registerOwner({ name: name.trim(), phone: phone.trim(), email: email.trim() || undefined });
      signIn({ name: name.trim(), phone: phone.trim() });
    } catch (err: any) {
      setError(err.message || 'Could not create your host account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-[82vh] items-center justify-center overflow-hidden rounded-3xl border border-line-2 p-6 sm:p-10">
      <img src="/owner-hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/55 to-ink/35" />
      <TwinkleSparkle className="absolute left-10 top-12 h-5 w-5" delay={0.6} />
      <TwinkleSparkle className="absolute right-14 top-20 h-4 w-4 !text-tide-glow" delay={1} />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 animate-blob bg-tide-glow/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
            className="mx-auto flex w-fit items-center justify-center"
          >
            <img src="/coastal-trails-logo.svg" alt="Coastal Trails" className="h-20 w-auto object-contain" />
          </motion.div>

          <p className="overline mt-5">Homestay list</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {GREETING.map((word, i) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.3, duration: 0.6, ease: easeEmphasis }}
                className={i === 1 ? 'ml-3 inline-block font-light italic text-tide-glow' : 'inline-block'}
              >
                {word}
              </motion.span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.6 }}
            className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/70"
          >
            {mode === 'signin'
              ? 'Sign in to manage your stays, block dates, and greet guests.'
              : 'Create your host account — then list your stays from your dashboard.'}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.5, ease: easeEmphasis }}
          className="glass mt-8 rounded-3xl p-6"
        >
          <div className="mb-5 flex rounded-xl border border-line bg-paper-2 p-1">
            {(['signin', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError('');
                }}
                className={cn(
                  'relative flex-1 rounded-lg py-2 text-xs font-semibold transition-colors',
                  mode === m ? 'text-white' : 'text-ink-2 hover:text-ink',
                )}
              >
                {mode === m ? (
                  <motion.span layoutId="owner-auth-pill" transition={springSoft} className="absolute inset-0 rounded-lg bg-tide" />
                ) : null}
                <span className="relative z-10">{m === 'signin' ? 'Sign in' : 'Create account'}</span>
              </button>
            ))}
          </div>

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <FieldRow icon={<Phone className="h-3 w-3 text-tide" />} label="WhatsApp number">
                <Input type="tel" placeholder="+91 98451 23091" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </FieldRow>
              <FieldRow icon={<Lock className="h-3 w-3 text-tide" />} label="Password">
                <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </FieldRow>
              {error ? <p className="text-xs font-semibold text-err">{error}</p> : null}
              <Button type="submit" className="w-full py-3">
                Sign in to your stays
              </Button>

              <div className="border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => signIn({ name: 'Manjunath Hegde', phone: '+919845123091' })}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-warn/30 bg-warn/5 py-2.5 text-xs font-semibold text-warn transition-colors hover:bg-warn/10"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Instant demo owner login — Manjunath Hegde (3 stays)
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <FieldRow icon={<User className="h-3 w-3 text-tide" />} label="Full name">
                <Input placeholder="e.g. Manjunath Hegde" value={name} onChange={(e) => setName(e.target.value)} />
              </FieldRow>
              <FieldRow icon={<Mail className="h-3 w-3 text-tide" />} label="Email (optional)">
                <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </FieldRow>
              <FieldRow icon={<Phone className="h-3 w-3 text-tide" />} label="WhatsApp number">
                <Input type="tel" placeholder="+91 98451 23091" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </FieldRow>
              <div className="grid grid-cols-2 gap-3">
                <FieldRow icon={<Lock className="h-3 w-3 text-tide" />} label="Password">
                  <Input type="password" placeholder="Min 6 chars" value={password} onChange={(e) => setPassword(e.target.value)} />
                </FieldRow>
                <FieldRow icon={<Lock className="h-3 w-3 text-tide" />} label="Confirm">
                  <Input type="password" placeholder="Repeat" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </FieldRow>
              </div>
              {error ? <p className="text-xs font-semibold text-err">{error}</p> : null}
              <Button type="submit" disabled={busy} className="w-full py-3">
                {busy ? 'Creating your account…' : 'Create host account'}
              </Button>
              <p className="text-center text-[11px] text-ink-3">You'll add your stays right after sign-up.</p>
            </form>
          )}

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center font-mono text-[10px] uppercase tracking-wider text-ink-3">
            <ShieldCheck className="h-3 w-3 text-tide" />
            10% fair host model · ₹0 convenience fee
          </p>
        </motion.div>
      </div>
    </div>
  );
}
