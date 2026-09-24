import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowUp,
  Check,
  Instagram,
  Mail,
  MapPin,
  Send,
  ShieldCheck,
  Sparkles,
  Waves,
  Youtube,
  Twitter,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Marquee } from './ui/Marquee';
import { TwinkleSparkle } from './ui/Sparkle';
import { cn } from '../lib/cn';
import { useTheme } from '../lib/theme';

const enclaves: { label: string; location: string }[] = [
  { label: 'Kudle Beach Clifftops', location: 'kudle' },
  { label: 'Om Beach Rock Shacks', location: 'om' },
  { label: 'Half Moon Secluded Cove', location: 'halfMoon' },
  { label: 'Paradise Beach Eco Pods', location: 'paradise' },
  { label: 'Main Beach Heritage', location: 'mainBeach' },
];

const planLinks: { label: string; path: string }[] = [
  { label: 'Trails & Culture', path: '/trails' },
  { label: 'Track Bookings', path: '/bookings' },
  { label: 'Reservation Desk', path: '/bookings' },
];

function FooterLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative inline-block w-fit text-xs font-medium text-ink-2 transition-colors hover:text-tide"
    >
      {label}
      <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-tide transition-transform duration-300 group-hover:scale-x-100" />
    </button>
  );
}

export function Footer({
  onNavigate,
  onFilterStay,
}: {
  onNavigate: (path: string) => void;
  onFilterStay?: (location: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const { theme } = useTheme();

  function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;
    setSubscribed(true);
  }

  return (
    <footer className="relative mt-20 border-t border-line bg-paper-2 pb-24 md:pb-10">
      <svg
        viewBox="0 0 1440 56"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute -top-10 left-0 h-12 w-full text-paper-2"
      >
        <path fill="currentColor" d="M0 28 C 240 56, 480 0, 720 28 C 960 56, 1200 0, 1440 28 L 1440 56 L 0 56 Z" />
      </svg>

      <div className="w-full px-4 sm:px-8 lg:px-10">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-[radial-gradient(120%_140%_at_50%_0%,oklch(0.30_0.06_255)_0%,oklch(0.17_0.03_262)_55%,oklch(0.12_0.025_265)_100%)] px-8 py-14 text-center sm:py-16">
          <TwinkleSparkle className="absolute left-10 top-10 h-5 w-5" delay={0.3} />
          <TwinkleSparkle className="absolute right-12 top-16 h-4 w-4 !text-tide-glow" delay={0.7} />
          <div className="pointer-events-none absolute -bottom-20 left-1/2 h-56 w-56 -translate-x-1/2 animate-blob bg-tide-glow/10 blur-3xl" />

          <p className="overline">Plan your escape</p>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            The coast is <span className="italic font-light text-tide-glow">calling.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70">
            Twelve family-stewarded stays across six enclaves, with a 20% hold and ₹0 convenience fee.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button onClick={() => onNavigate('/')} className="gap-2 px-6">
              <Waves className="h-4 w-4" />
              Explore stays
            </Button>
            <button
              onClick={() => window.dispatchEvent(new Event('open-tide-chat'))}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/15"
            >
              <Sparkles className="h-4 w-4 text-tide-glow" />
              Ask Tide
            </button>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-4">
            <div className="flex items-center gap-3">
              <img
                src={theme === 'dark' ? '/coastal-trails-logo-dark.svg' : '/coastal-trails-logo.svg'}
                alt="Coastal Trails"
                className="h-12 w-auto object-contain"
              />
              <span className="font-display text-xl font-semibold text-ink">Coastal Trails</span>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-ink-2">
              Curated coastal living and authentic family-run homestays across Gokarna, Karnataka. Sustaining local
              stewardship through a direct 10% fair aggregation.
            </p>
            <div className="flex items-center gap-2 text-xs font-medium text-tide">
              <ShieldCheck className="h-4 w-4" />
              <span>10% Fair Host Model</span>
            </div>
            <div className="flex items-center gap-2">
              {[
                { Icon: Instagram, label: 'Instagram' },
                { Icon: Youtube, label: 'YouTube' },
                { Icon: Twitter, label: 'Twitter' },
                { Icon: Mail, label: 'Email' },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href={label === 'Email' ? 'mailto:concierge@coastaltrails.in' : `https://${label.toLowerCase()}.com/coastaltrails`}
                  target={label === 'Email' ? undefined : '_blank'}
                  rel="noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-elevated text-ink-2 transition-all hover:-translate-y-0.5 hover:border-tide hover:text-tide"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-3 lg:col-span-3">
            <h4 className="overline">Coastal enclaves</h4>
            <ul className="space-y-2.5">
              {enclaves.map((e) => (
                <li key={e.location}>
                  <FooterLink
                    label={e.label}
                    onClick={() => {
                      onFilterStay?.(e.location);
                      onNavigate('/');
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 lg:col-span-2">
            <h4 className="overline">Plan</h4>
            <ul className="space-y-2.5">
              {planLinks.map((p) => (
                <li key={p.label}>
                  <FooterLink label={p.label} onClick={() => onNavigate(p.path)} />
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 lg:col-span-3">
            <h4 className="overline">Tide letters</h4>
            <p className="text-xs leading-relaxed text-ink-2">
              One calm email a month — new stays, tide charts and trail notes. No noise.
            </p>
            {subscribed ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 rounded-xl border border-ok/30 bg-ok/10 px-4 py-3 text-xs font-semibold text-ok"
              >
                <Check className="h-4 w-4" />
                You're on the tide list.
              </motion.div>
            ) : (
              <form onSubmit={subscribe} className="flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email for tide letters"
                  className="w-full rounded-xl border border-line-2 bg-elevated px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tide text-white transition-colors hover:bg-tide-2"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            )}
            <div className="flex items-center gap-2 text-[10px] text-ink-3">
              <MapPin className="h-3 w-3 text-ember" />
              <span className="font-mono">14.042° N · 74.314° E — Gokarna, Karnataka</span>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-line pt-6">
          <Marquee speed="38s" className="text-ink-3">
            {enclaves.map((e) => (
              <span key={e.location} className="flex items-center gap-6 font-display text-sm italic text-ink-3">
                {e.label}
                <span className="not-italic text-tide-glow">·</span>
              </span>
            ))}
          </Marquee>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-line pt-6 text-[11px] text-ink-3 sm:flex-row">
          <div>© 2026 Coastal Trails. Registered under Karnataka Coastal Tourism Initiative.</div>
          <div className="flex items-center gap-6">
            <button onClick={() => onNavigate('/bookings')} className="font-medium transition-colors hover:text-ink">
              Track Bookings
            </button>
            <button className="font-medium transition-colors hover:text-ink">Privacy</button>
            <button className="font-medium transition-colors hover:text-ink">Terms</button>
          </div>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={cn(
              'flex items-center gap-1.5 rounded-full border border-line bg-elevated px-3.5 py-2 font-medium text-ink-2 transition-all hover:-translate-y-0.5 hover:border-tide hover:text-tide',
            )}
          >
            <ArrowUp className="h-3.5 w-3.5" />
            Top
          </button>
        </div>
      </div>
    </footer>
  );
}
