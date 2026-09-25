import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Send, Waves, X } from 'lucide-react';
import { api } from '../services/api';
import { cn } from '../lib/cn';
import { springSoft } from '../lib/motion';

interface Msg {
  role: 'user' | 'bot';
  text: string;
}

const GREETING =
  'Namaskara! I\u2019m Tide, your coastal concierge. Ask me about stays, prices, the 20% hold, trails, or tracking your booking.';

const QUICK = [
  'How does the 20% hold work?',
  'Best stays under ₹1,500',
  'Track my booking GK-782941',
  'How do I cancel?',
];

async function botAnswer(input: string): Promise<string> {
  const q = input.toLowerCase();
  const refMatch = input.match(/GK-?\s?(\d{6})/i);

  if (/(track|booking|reservation|voucher|\bref\b|status)/.test(q) || refMatch) {
    try {
      const bookings = await api.getBookings();
      const code = refMatch ? `GK-${refMatch[1]}` : null;
      const target = code
        ? bookings.find((b) => b.reference_code.toLowerCase() === code.toLowerCase())
        : bookings[0];
      if (target) {
        const status =
          target.status === 'confirmed' ? 'confirmed ✓' : target.status === 'declined' ? 'declined ✕' : 'awaiting host confirmation';
        return `${target.homestay_title} — ${target.reference_code}\nStatus: ${status}\nCheck-in ${target.check_in} → Check-out ${target.check_out} · ${target.guests_count} guests\nTotal ₹${target.total_amount} · Hold paid ₹${target.advance_paid} · Balance at property ₹${target.balance_payable_at_property}\n\nOpen the Bookings page for your full voucher.`;
      }
      return code
        ? `I couldn't find booking ${code}. Double-check the reference code or the registered phone number.`
        : 'No bookings found for this traveler yet.';
    } catch {
      return 'Booking tracking needs your account — please sign in from the top bar, then ask me again.';
    }
  }

  if (/(price|cost|pay|hold|20%|tariff|charge|fee|rate)/.test(q)) {
    return `Our fare model:\n• 20% commitment hold is paid online to lock your dates.\n• 80% balance is payable to the host at check-in.\n• Base rate covers 2 guests; each extra guest adds ₹400/night.\n• Convenience fee: ₹0 — direct fair-host model.\n• Free cancellation up to 48 hours before check-in.`;
  }

  if (/(cancel|refund|reschedule|change|extend)/.test(q)) {
    return `Cancellation is free up to 48 hours before check-in — your 20% hold is returned in full. Inside 48 hours, the hold may be retained by the host. Head to the Bookings page to review your voucher.`;
  }

  if (/(trail|ferry|scooter|auto|boat|route|transit|reach|trek)/.test(q)) {
    try {
      const routes = await api.getRoutes();
      if (routes.length) {
        const lines = routes.map(
          (r) => `${r.start_point} → ${r.destination} · ${r.distance_km} km · best by ${r.active_mode}`,
        );
        return `Mapped coastal routes:\n${lines.join('\n')}\n\nOpen the Trails page for timing and directions.`;
      }
    } catch {
      /* fall through to static answer */
    }
    return 'Ferry and scooter routes live on the Trails page — the Kudle→Om cliff trail, the Om→Half Moon fishing boat, and auto routes to Paradise Beach.';
  }

  if (/(availability|available|blocked|sold|calendar|dates)/.test(q)) {
    return `Availability shows right inside the date picker: dates with an ember dot have few rooms left, and struck-through dates are sold out. Pick dates on any stay page to see the live total update.`;
  }

  if (/(stay|homestay|cottage|shack|pod|cabin|beach|kudle|om|half moon|paradise|main beach|recommend|best|budget|cheap|luxury|family|surf|wifi|quiet)/.test(q)) {
    try {
      const stays = await api.getHomestays();
      let list = [...stays];
      if (/(under|budget|cheap)/.test(q)) list = list.filter((s) => s.price_per_night < 1500);
      if (/(luxury|premium)/.test(q)) list = list.filter((s) => s.price_per_night > 2200);
      if (/(family)/.test(q)) list = list.filter((s) => (s.verifiedBadges || []).some((b) => b.toLowerCase().includes('family')));
      if (/(wifi)/.test(q)) list = list.filter((s) => (s.amenities || []).some((a) => a.toLowerCase().includes('wifi')));
      const loc = q.match(/kudle|om beach|half moon|paradise|main beach|town/);
      if (loc) list = list.filter((s) => (s.location_display || '').toLowerCase().includes(loc[0]));
      const top = list.slice(0, 3);
      if (!top.length) return 'Nothing matches that yet — try widening your filters on the homepage.';
      return `A few picks for you:\n${top
        .map((s) => `• ${s.title} — ₹${s.price_per_night}/night · ★${s.rating} · ${s.walking_minutes_to_beach} min to beach`)
        .join('\n')}\n\nClick any stay card to see its calendar and live hold.`;
    } catch {
      return 'I could not load the stay list right now — please try again shortly.';
    }
  }

  if (/(hi|hello|hey|help|namaskara|namaste)/.test(q)) {
    return `Namaskara! I can help with:\n• Stays & prices across Gokarna's beaches\n• The 20% hold & cancellation policy\n• Tracking your booking\n• Trails, ferries & transit\n\nAsk me anything about your trip.`;
  }

  return `I'm still learning that one. I can help with stays, prices, the 20% hold, cancellations, trails and tracking bookings — try one of the quick questions below.`;
}

export function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, typing, open]);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener('open-tide-chat', onOpen);
    return () => window.removeEventListener('open-tide-chat', onOpen);
  }, []);

  async function send(text: string) {
    const t = text.trim();
    if (!t || typing) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text: t }]);
    setTyping(true);
    const reply = await botAnswer(t);
    setTyping(false);
    setMsgs((m) => [...m, { role: 'bot', text: reply }]);
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close assistant' : 'Open coastal assistant'}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-20 right-3 z-30 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-gradient-to-br from-tide to-tide-2 text-white shadow-lg shadow-tide/30 md:bottom-6 md:right-6"
      >
        <span className="absolute inset-0 rounded-full bg-tide/40 animate-ping" style={{ animationDuration: '2.4s' }} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? 'x' : 'waves'}
            initial={{ scale: 0.5, opacity: 0, rotate: -30 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 30 }}
            transition={springSoft}
            className="relative flex"
          >
            {open ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Waves className="h-5 w-5 sm:h-6 sm:w-6" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={springSoft}
            className="glass fixed bottom-36 right-3 z-30 flex max-h-[65vh] w-[calc(100vw-1.5rem)] max-w-[380px] flex-col overflow-hidden rounded-3xl md:bottom-24 md:right-6"
            role="dialog"
            aria-label="Coastal assistant"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-tide to-tide-2 text-white">
                  <Waves className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Tide</p>
                  <p className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-ok">
                    <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                    Coastal concierge
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="rounded-full p-1.5 text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-line bg-paper-2 px-3.5 py-2.5 text-xs leading-relaxed text-ink">
                {GREETING}
              </div>

              <AnimatePresence initial={false}>
                {msgs.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed',
                        m.role === 'user'
                          ? 'rounded-tr-md bg-tide text-white'
                          : 'rounded-tl-md border border-line bg-paper-2 text-ink',
                      )}
                    >
                      {m.text}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {typing ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex w-fit items-center gap-1 rounded-2xl rounded-tl-md border border-line bg-paper-2 px-4 py-3"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-tide"
                      animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </motion.div>
              ) : null}

              {msgs.length === 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {QUICK.map((qq) => (
                    <button
                      key={qq}
                      onClick={() => send(qq)}
                      className="rounded-full border border-line-2 px-3 py-1.5 text-[11px] font-medium text-ink-2 transition-colors hover:border-tide hover:text-tide"
                    >
                      {qq}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-line p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about stays, trails, bookings…"
                aria-label="Message Tide"
                className="w-full rounded-full border border-line-2 bg-paper-2 px-4 py-2.5 text-xs text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tide text-white transition-transform hover:bg-tide-2 active:scale-90"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
