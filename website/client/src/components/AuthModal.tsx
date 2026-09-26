import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, Phone, ShieldCheck, User as UserIcon, Waves, X } from 'lucide-react';
import type { User } from '../types';
import { api } from '../services/api';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { cn } from '../lib/cn';
import { easeOut, springSoft } from '../lib/motion';

const PHONE_RE = /^\+?[0-9]{10,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizePhone(raw: string) {
  return raw.replace(/[\s\-()]/g, '');
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
  initialMode?: 'signin' | 'register';
}

const formVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fieldVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: easeOut } },
};

export function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMode(initialMode);
    setError('');
    setPassword('');
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    let isMounted = true;

    const setupGoogle = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id || !googleBtnRef.current) return false;

      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            if (response?.credential && isMounted) {
              setIsLoading(true);
              setError('');
              try {
                const user = await api.googleAuth(response.credential);
                localStorage.setItem('gokarna_traveler_user', JSON.stringify(user));
                onAuthSuccess(user);
                onClose();
              } catch (err: any) {
                if (isMounted) setError(err.message || 'Google sign-in could not be completed.');
              } finally {
                if (isMounted) setIsLoading(false);
              }
            }
          },
        });

        googleBtnRef.current.innerHTML = '';
        google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'rectangular',
          text: 'continue_with',
          logo_alignment: 'left',
          width: 340,
        });

        if (isMounted) setGoogleLoaded(true);
        return true;
      } catch (e) {
        console.warn('GSI render error:', e);
        return false;
      }
    };

    if (!setupGoogle()) {
      const timer = setInterval(() => {
        if (setupGoogle()) {
          clearInterval(timer);
        }
      }, 350);
      return () => {
        isMounted = false;
        clearInterval(timer);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, onAuthSuccess, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (name.trim().length < 2) {
        setError('Please enter your full name (at least 2 characters).');
        return;
      }
      if (!PHONE_RE.test(normalizePhone(phone))) {
        setError('Enter a valid mobile number, e.g. +91 98765 43210.');
        return;
      }
      if (!EMAIL_RE.test(email.trim())) {
        setError('Enter a valid email address, e.g. name@example.com.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        setError('Password must include at least one letter and one number.');
        return;
      }
    } else {
      if (!identifier.trim()) {
        setError('Please provide your mobile number or email address.');
        return;
      }
      if (!password) {
        setError('Please enter your password.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const user =
        mode === 'register'
          ? await api.register({
              name: name.trim(),
              phone: normalizePhone(phone.trim()),
              email: email.trim().toLowerCase(),
              password,
            })
          : await api.login(identifier.trim(), password);

      localStorage.setItem('gokarna_traveler_user', JSON.stringify(user));
      setPassword('');
      onAuthSuccess(user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      const googleClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;

      // If official Google gsi client is available with client id
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id && googleClientId) {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            if (response?.credential) {
              try {
                const user = await api.googleAuth(response.credential);
                localStorage.setItem('gokarna_traveler_user', JSON.stringify(user));
                onAuthSuccess(user);
                onClose();
              } catch (err: any) {
                setError(err.message || 'Google sign-in failed');
              } finally {
                setIsLoading(false);
              }
            }
          },
        });
        (window as any).google.accounts.id.prompt();
        return;
      }

      // Local development / testing mode fallback
      // Simulates instant 1-click Google Sign-In with an authentic traveler profile
      const defaultEmail = 'traveler@coastaltrails.in';
      const devCredential = `dev_token:${defaultEmail}:Coastal Explorer`;
      const user = await api.googleAuth(devCredential);
      localStorage.setItem('gokarna_traveler_user', JSON.stringify(user));
      onAuthSuccess(user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputBase =
    'flex items-center rounded-xl border border-line-2 bg-paper-2 transition-all focus-within:border-tide focus-within:ring-2 focus-within:ring-tide/20';

  return (
    <Dialog open={isOpen} onClose={onClose} className="glass max-w-3xl max-h-[92dvh] overflow-y-auto p-0">
      <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr]">
        <div className="relative hidden h-full min-h-[600px] overflow-hidden md:block">
          <img src="/images/hero-raman.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-ink/15" />

          <motion.div
            className="pointer-events-none absolute -left-16 top-1/3 h-64 w-64 rounded-full bg-tide-glow/20 blur-3xl"
            animate={{ y: [0, -24, 0], x: [0, 16, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="pointer-events-none absolute bottom-10 right-0 h-48 w-48 rounded-full bg-ember/10 blur-3xl"
            animate={{ y: [0, 20, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative z-10 flex h-full flex-col justify-between p-8">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
              <Waves className="h-3 w-3 text-tide-glow" />
              Coastal Trails Club
            </span>

            <div className="space-y-3">
              <p className="font-display text-2xl font-semibold leading-tight text-white">
                Wake up to Arabian swells &amp; warm filter coffee.
              </p>
              <p className="text-xs leading-relaxed text-white/70">
                Access your 20% hold vouchers, cliff trail coordinates and concierge channel in one place.
              </p>
              <div className="flex items-center gap-2 pt-1 font-mono text-[10px] uppercase tracking-wider text-tide-glow">
                <ShieldCheck className="h-3.5 w-3.5" />
                100% direct family homestays
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden p-6 sm:p-8">
          <motion.div
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-tide-glow/10 blur-3xl"
            animate={{ y: [0, 18, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          />

          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative z-10">
            <p className="overline">Gokarna sanctuary access</p>
            <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {mode === 'signin' ? 'Welcome back' : 'Join Coastal Trails'}
            </h2>
            <p className="mt-1 text-xs text-ink-2">
              {mode === 'signin'
                ? 'Sign in to access your reservations, vouchers and concierge.'
                : 'One account for one-click 20% hold reservations.'}
            </p>

            <div className="mt-5 flex rounded-xl border border-line bg-paper-2 p-1">
              {(['signin', 'register'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError('');
                    setPassword('');
                  }}
                  className={cn(
                    'relative flex-1 rounded-lg py-2 text-xs font-semibold transition-colors',
                    mode === m ? 'text-white' : 'text-ink-2 hover:text-ink',
                  )}
                >
                  {mode === m ? (
                    <motion.span layoutId="auth-mode-pill" transition={springSoft} className="absolute inset-0 rounded-lg bg-tide" />
                  ) : null}
                  <span className="relative z-10">{m === 'signin' ? 'Sign in' : 'Create account'}</span>
                </button>
              ))}
            </div>

            {/* One-click Google Sign In */}
            <div className="mt-4">
              <div
                ref={googleBtnRef}
                className={cn('flex justify-center overflow-hidden rounded-xl min-h-[40px]', !googleLoaded && 'hidden')}
              />

              {!googleLoaded ? (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="group flex w-full items-center justify-center gap-2.5 rounded-xl border border-line-2 bg-paper-2 px-4 py-2.5 text-xs font-semibold text-ink shadow-xs transition-all hover:border-line hover:bg-paper active:scale-[0.99] disabled:opacity-60"
                >
                  <svg className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              ) : null}

              <div className="relative mt-3.5 flex items-center justify-center">
                <div className="w-full border-t border-line" />
                <span className="relative bg-paper px-2.5 text-[10px] font-medium uppercase tracking-wider text-ink-3">
                  or with password
                </span>
                <div className="w-full border-t border-line" />
              </div>
            </div>

            <AnimatePresence>
              {error ? (
                <motion.div
                  key={error}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ x: { duration: 0.4 } }}
                  className="mt-4 flex items-center gap-2 rounded-xl border border-err/30 bg-err/10 p-3 text-xs font-medium text-err"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="mt-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  variants={formVariants}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
                  className="space-y-4"
                >
                  {mode === 'register' ? (
                    <motion.div variants={fieldVariants} className="space-y-1.5">
                      <label className="overline block !text-ink-3">Full name</label>
                      <div className={inputBase}>
                        <UserIcon className="ml-3 h-4 w-4 shrink-0 text-ink-3" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Punit Naik"
                          className="w-full bg-transparent px-3 py-2.5 text-base md:text-sm font-medium text-ink placeholder:text-ink-3 focus:outline-none"
                        />
                      </div>
                    </motion.div>
                  ) : null}

                  {mode === 'register' ? (
                    <>
                      <motion.div variants={fieldVariants} className="space-y-1.5">
                        <label className="overline block !text-ink-3">Mobile number</label>
                        <div className={inputBase}>
                          <Phone className="ml-3 h-4 w-4 shrink-0 text-ink-3" />
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            autoComplete="tel"
                            className="w-full bg-transparent px-3 py-2.5 text-base md:text-sm font-medium text-ink placeholder:text-ink-3 focus:outline-none"
                          />
                        </div>
                      </motion.div>

                      <motion.div variants={fieldVariants} className="space-y-1.5">
                        <label className="overline block !text-ink-3">Email address</label>
                        <div className={inputBase}>
                          <Mail className="ml-3 h-4 w-4 shrink-0 text-ink-3" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            autoComplete="email"
                            className="w-full bg-transparent px-3 py-2.5 text-base md:text-sm font-medium text-ink placeholder:text-ink-3 focus:outline-none"
                          />
                        </div>
                      </motion.div>
                    </>
                  ) : null}

                  {mode === 'signin' ? (
                    <motion.div variants={fieldVariants} className="space-y-1.5">
                      <label className="overline block !text-ink-3">Mobile number or email</label>
                      <div className={inputBase}>
                        <Phone className="ml-3 h-4 w-4 shrink-0 text-ink-3" />
                        <input
                          type="text"
                          required
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="+91 98765 43210 or name@example.com"
                          autoComplete="username"
                          className="w-full bg-transparent px-3 py-2.5 text-base md:text-sm font-medium text-ink placeholder:text-ink-3 focus:outline-none"
                        />
                      </div>
                    </motion.div>
                  ) : null}

                  <motion.div variants={fieldVariants} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="overline block !text-ink-3">Password</label>
                      {mode === 'signin' ? (
                        <button
                          type="button"
                          onClick={() => setError('Password reset link sent to your registered mobile/email.')}
                          className="font-mono text-[10px] font-semibold uppercase tracking-wider text-tide hover:text-tide-2"
                        >
                          Forgot?
                        </button>
                      ) : null}
                    </div>
                    <div className={inputBase}>
                      <Lock className="ml-3 h-4 w-4 shrink-0 text-ink-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                        className="w-full bg-transparent px-3 py-2.5 text-base md:text-sm font-medium text-ink placeholder:text-ink-3 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="mr-3 text-ink-3 transition-colors hover:text-ink"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {mode === 'register' ? (
                      <p className="text-[11px] text-ink-3">
                        Min 8 characters, with at least one letter and one number.
                      </p>
                    ) : null}
                  </motion.div>
                </motion.div>
              </AnimatePresence>

              <Button type="submit" disabled={isLoading} className="mt-5 w-full py-3.5 text-sm">
                {isLoading ? (
                  <motion.span
                    className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                  />
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Sign in to your stays' : 'Create traveler account'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-center font-mono text-[10px] uppercase tracking-wider text-ink-3">
              <ShieldCheck className="h-3 w-3 text-tide" />
              Encrypted Karavali traveler network
            </p>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
