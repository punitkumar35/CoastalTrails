import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Send,
  Waves,
  X,
  LifeBuoy,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Check,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { cn } from '../lib/cn';
import { springSoft } from '../lib/motion';
import type { SupportTicket, TicketCategory } from '../types';

interface Msg {
  role: 'user' | 'bot';
  text: string;
  type?: 'text' | 'ticket-prompt' | 'ticket-created' | 'ticket-status';
  ticket?: SupportTicket;
}

const GREETING =
  'Namaskara! I\u2019m Tide, your coastal concierge. Ask me about stays, prices, the 20% hold, trails, or raise a support ticket directly.';

const QUICK = [
  '🎫 Raise a Support Ticket',
  'How does the 20% hold work?',
  'Best stays under ₹1,500',
  'Track my booking GK-782941',
  'How do I cancel?',
];

const CATEGORIES: { id: TicketCategory; label: string }[] = [
  { id: 'booking', label: 'Booking Inquiry' },
  { id: 'payment', label: 'Payment / 20% Hold' },
  { id: 'cancellation', label: 'Cancellation / Refund' },
  { id: 'property_host', label: 'Stay & Host Issue' },
  { id: 'general', label: 'General Assistance' },
];

export function AssistantChat() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Ticket Modal/Drawer State
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketCategory, setTicketCategory] = useState<TicketCategory>('booking');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketBookingRef, setTicketBookingRef] = useState('');
  const [ticketName, setTicketName] = useState('');
  const [ticketEmail, setTicketEmail] = useState('');
  const [ticketPhone, setTicketPhone] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  // Pre-fill user data if available
  useEffect(() => {
    try {
      const savedUser = JSON.parse(localStorage.getItem('gokarna_traveler_user') || 'null');
      if (savedUser) {
        if (savedUser.name) setTicketName(savedUser.name);
        if (savedUser.email) setTicketEmail(savedUser.email);
        if (savedUser.phone) setTicketPhone(savedUser.phone);
      }
    } catch {}
  }, [open]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, typing, open, showTicketForm]);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener('open-tide-chat', onOpen);
    return () => window.removeEventListener('open-tide-chat', onOpen);
  }, []);

  async function botAnswer(input: string): Promise<Msg> {
    const q = input.toLowerCase();

    // Check for Ticket Tracking code e.g. CT-123456
    const ticketMatch = input.match(/CT-?\s?(\d{6})/i);
    if (ticketMatch) {
      const code = `CT-${ticketMatch[1]}`;
      try {
        const res = await api.trackSupportTicket(code);
        if (res.ticket) {
          const t = res.ticket;
          return {
            role: 'bot',
            type: 'ticket-status',
            text: `Here is the current status of Ticket ${t.ticket_number}:\n• Status: ${t.status.toUpperCase()}\n• Category: ${t.category}\n• Subject: ${t.subject}\n• Created: ${new Date(t.created_at).toLocaleDateString('en-IN')}`,
            ticket: t,
          };
        }
      } catch {
        return {
          role: 'bot',
          type: 'text',
          text: `I couldn't locate support ticket ${code}. Double check the 6-digit number or check the Support page.`,
        };
      }
    }

    // Check for Ticket Intent / Human Support
    if (
      /(ticket|complaint|dispute|human support|agent|representative|raise a ticket|file a ticket|talk to human|talk to someone|issue with stay)/i.test(
        q
      )
    ) {
      return {
        role: 'bot',
        type: 'ticket-prompt',
        text: `I can help you log an official support ticket directly with our Gokarna concierge desk.\n\nOur hospitality team replies within 2–4 hours during desk hours (9 AM – 9 PM IST). Would you like to raise a ticket now?`,
      };
    }

    // Booking tracking
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
            target.status === 'confirmed'
              ? 'confirmed ✓'
              : target.status === 'declined'
              ? 'declined ✕'
              : 'awaiting host confirmation';
          return {
            role: 'bot',
            type: 'text',
            text: `${target.homestay_title} — ${target.reference_code}\nStatus: ${status}\nCheck-in ${target.check_in} → Check-out ${target.check_out} · ${target.guests_count} guests\nTotal ₹${target.total_amount} · Hold paid ₹${target.advance_paid} · Balance at property ₹${target.balance_payable_at_property}\n\nOpen the Bookings page for your full voucher.`,
          };
        }
        return {
          role: 'bot',
          type: 'text',
          text: code
            ? `I couldn't find booking ${code}. Double-check the reference code or the registered phone number.`
            : 'No bookings found for this traveler yet.',
        };
      } catch {
        return {
          role: 'bot',
          type: 'text',
          text: 'Booking tracking needs your account — please sign in from the top bar, then ask me again.',
        };
      }
    }

    if (/(price|cost|pay|hold|20%|tariff|charge|fee|rate)/.test(q)) {
      return {
        role: 'bot',
        type: 'text',
        text: `Our fare model:\n• 20% commitment hold is paid online to lock your dates.\n• 80% balance is payable to the host at check-in.\n• Base rate covers 2 guests; each extra guest adds ₹400/night.\n• Convenience fee: ₹0 — direct fair-host model.\n• Free cancellation up to 48 hours before check-in.`,
      };
    }

    if (/(cancel|refund|reschedule|change|extend)/.test(q)) {
      return {
        role: 'bot',
        type: 'text',
        text: `Cancellation is free up to 48 hours before check-in — your 20% hold is returned in full. Inside 48 hours, the hold may be retained by the host. Head to the Bookings page to review your voucher.`,
      };
    }

    if (/(trail|ferry|scooter|auto|boat|route|transit|reach|trek)/.test(q)) {
      try {
        const routes = await api.getRoutes();
        if (routes.length) {
          const lines = routes.map(
            (r) => `${r.start_point} → ${r.destination} · ${r.distance_km} km · best by ${r.active_mode}`
          );
          return {
            role: 'bot',
            type: 'text',
            text: `Mapped coastal routes:\n${lines.join('\n')}\n\nOpen the Trails page for timing and directions.`,
          };
        }
      } catch {
        /* fall through to static answer */
      }
      return {
        role: 'bot',
        type: 'text',
        text: 'Ferry and scooter routes live on the Trails page — the Kudle→Om cliff trail, the Om→Half Moon fishing boat, and auto routes to Paradise Beach.',
      };
    }

    if (/(availability|available|blocked|sold|calendar|dates)/.test(q)) {
      return {
        role: 'bot',
        type: 'text',
        text: `Availability shows right inside the date picker: dates with an ember dot have few rooms left, and struck-through dates are sold out. Pick dates on any stay page to see the live total update.`,
      };
    }

    if (
      /(stay|homestay|cottage|shack|pod|cabin|beach|kudle|om|half moon|paradise|main beach|recommend|best|budget|cheap|luxury|family|surf|wifi|quiet)/.test(
        q
      )
    ) {
      try {
        const stays = await api.getHomestays();
        let list = [...stays];
        if (/(under|budget|cheap)/.test(q)) list = list.filter((s) => s.price_per_night < 1500);
        if (/(luxury|premium)/.test(q)) list = list.filter((s) => s.price_per_night > 2200);
        if (/(family)/.test(q))
          list = list.filter((s) => (s.verifiedBadges || []).some((b) => b.toLowerCase().includes('family')));
        if (/(wifi)/.test(q))
          list = list.filter((s) => (s.amenities || []).some((a) => a.toLowerCase().includes('wifi')));
        const loc = q.match(/kudle|om beach|half moon|paradise|main beach|town/);
        if (loc) list = list.filter((s) => (s.location_display || '').toLowerCase().includes(loc[0]));
        const top = list.slice(0, 3);
        if (!top.length)
          return { role: 'bot', type: 'text', text: 'Nothing matches that yet — try widening your filters on the homepage.' };
        return {
          role: 'bot',
          type: 'text',
          text: `A few picks for you:\n${top
            .map(
              (s) => `• ${s.title} — ₹${s.price_per_night}/night · ★${s.rating} · ${s.walking_minutes_to_beach} min to beach`
            )
            .join('\n')}\n\nClick any stay card to see its calendar and live hold.`,
        };
      } catch {
        return {
          role: 'bot',
          type: 'text',
          text: 'I could not load the stay list right now — please try again shortly.',
        };
      }
    }

    if (/(hi|hello|hey|help|namaskara|namaste)/.test(q)) {
      return {
        role: 'bot',
        type: 'text',
        text: `Namaskara! I can help with:\n• Stays & prices across Gokarna's beaches\n• The 20% hold & cancellation policy\n• Tracking your booking or support ticket\n• Trails, ferries & transit\n\nAsk me anything about your trip.`,
      };
    }

    return {
      role: 'bot',
      type: 'text',
      text: `I can help with stays, prices, the 20% hold, cancellations, trails, or raising a support ticket with our concierge team. Choose an option below or type your question.`,
    };
  }

  async function send(text: string) {
    const t = text.trim();
    if (!t || typing) return;

    if (t === '🎫 Raise a Support Ticket') {
      setShowTicketForm(true);
      return;
    }

    setInput('');
    setMsgs((m) => [...m, { role: 'user', text: t }]);
    setTyping(true);
    const reply = await botAnswer(t);
    setTyping(false);
    setMsgs((m) => [...m, reply]);
  }

  async function handleSubmitTicket(e: React.FormEvent) {
    e.preventDefault();
    setTicketError(null);

    if (!ticketName.trim()) {
      setTicketError('Please provide your name.');
      return;
    }
    if (!ticketEmail.trim() || !ticketEmail.includes('@')) {
      setTicketError('Please provide a valid email address.');
      return;
    }
    if (!ticketSubject.trim()) {
      setTicketError('Please provide a subject for your ticket.');
      return;
    }
    if (!ticketDesc.trim() || ticketDesc.trim().length < 10) {
      setTicketError('Please describe your issue in at least 10 characters.');
      return;
    }

    setSubmittingTicket(true);
    try {
      const res = await api.createSupportTicket({
        name: ticketName.trim(),
        email: ticketEmail.trim(),
        phone: ticketPhone.trim() || undefined,
        booking_reference: ticketBookingRef.trim().toUpperCase() || undefined,
        category: ticketCategory,
        subject: ticketSubject.trim(),
        description: ticketDesc.trim(),
      });

      setShowTicketForm(false);
      setTicketSubject('');
      setTicketDesc('');
      setTicketBookingRef('');

      setMsgs((m) => [
        ...m,
        {
          role: 'bot',
          type: 'ticket-created',
          text: `Your ticket has been logged successfully!`,
          ticket: res.ticket,
        },
      ]);
    } catch (err: any) {
      setTicketError(err?.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setSubmittingTicket(false);
    }
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close assistant' : 'Open coastal assistant'}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-20 right-3 z-30 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border border-line bg-paper p-2 shadow-xl shadow-ink/15 transition-transform hover:scale-105 md:bottom-6 md:right-6"
      >
        <span className="absolute inset-0 rounded-full bg-ember/20 animate-ping" style={{ animationDuration: '2.8s' }} />
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="x"
              initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
              transition={springSoft}
              className="relative flex items-center justify-center text-ink"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </motion.span>
          ) : (
            <motion.span
              key="icon"
              initial={{ scale: 0.6, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.6, opacity: 0, rotate: 15 }}
              transition={springSoft}
              className="relative flex h-full w-full items-center justify-center"
            >
              <img
                src="/chatbot-icon.png"
                alt="Coastal Concierge"
                className="h-full w-full select-none object-contain drop-shadow-xs"
              />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={springSoft}
            className="glass fixed bottom-36 right-3 z-30 flex max-h-[72vh] w-[calc(100vw-1.5rem)] max-w-[390px] flex-col overflow-hidden rounded-3xl md:bottom-24 md:right-6 shadow-2xl"
            role="dialog"
            aria-label="Coastal assistant"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-paper-2/70 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper p-1 shadow-xs">
                  <img src="/chatbot-icon.png" alt="Tide" className="h-full w-full object-contain" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Tide</p>
                  <p className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-ok">
                    <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                    Coastal concierge &amp; helpdesk
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate('/support');
                  }}
                  title="Open Support Center"
                  className="rounded-full p-1.5 text-ink-2 transition-colors hover:bg-paper hover:text-tide"
                  aria-label="Open support page"
                >
                  <LifeBuoy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close assistant"
                  className="rounded-full p-1.5 text-ink-2 transition-colors hover:bg-paper hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto p-4 relative">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-paper p-0.5">
                  <img src="/chatbot-icon.png" alt="Tide" className="h-full w-full object-contain" />
                </span>
                <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-line bg-paper-2 px-3.5 py-2.5 text-xs leading-relaxed text-ink shadow-xs">
                  {GREETING}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {msgs.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start items-start gap-2')}
                  >
                    {m.role === 'bot' && (
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-paper p-0.5">
                        <img src="/chatbot-icon.png" alt="Tide" className="h-full w-full object-contain" />
                      </span>
                    )}

                    {m.type === 'ticket-created' && m.ticket ? (
                      <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-ok/30 bg-ok/5 p-3.5 text-xs text-ink shadow-sm space-y-2.5">
                        <div className="flex items-center gap-1.5 font-bold text-ok">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>Ticket #{m.ticket.ticket_number} Created</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-ink-2">
                          Your ticket has been dispatched to our concierge team in Gokarna. Expected response time is within{' '}
                          <strong>2–4 hours</strong> (9:00 AM – 9:00 PM IST).
                        </p>
                        <div className="rounded-xl border border-line bg-paper-2 p-2 text-[11px] text-ink-3">
                          <p>
                            <span className="font-semibold text-ink">Subject:</span> {m.ticket.subject}
                          </p>
                          <p>
                            <span className="font-semibold text-ink">Confirmation sent to:</span> {m.ticket.email}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            navigate(`/support?ticket=${m.ticket?.ticket_number}`);
                          }}
                          className="flex w-full items-center justify-center gap-1 rounded-xl bg-tide py-2 text-xs font-semibold text-white transition-colors hover:bg-tide-2"
                        >
                          Track Ticket Online &rarr;
                        </button>
                      </div>
                    ) : m.type === 'ticket-status' && m.ticket ? (
                      <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-line bg-paper-2 p-3.5 text-xs text-ink shadow-sm space-y-2">
                        <div className="flex items-center justify-between border-b border-line pb-1.5">
                          <span className="font-mono font-bold text-tide">{m.ticket.ticket_number}</span>
                          <span className="rounded-full bg-tide/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-tide font-semibold">
                            {m.ticket.status}
                          </span>
                        </div>
                        <p className="font-semibold text-ink">{m.ticket.subject}</p>
                        <p className="text-[11px] text-ink-3">
                          Category: <span className="capitalize">{m.ticket.category}</span> &bull; Logged:{' '}
                          {new Date(m.ticket.created_at).toLocaleDateString('en-IN')}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            navigate(`/support?ticket=${m.ticket?.ticket_number}`);
                          }}
                          className="mt-1 flex w-full items-center justify-center gap-1 rounded-xl border border-line bg-elevated py-1.5 text-xs font-medium text-ink transition-colors hover:bg-paper"
                        >
                          View Full Conversation &rarr;
                        </button>
                      </div>
                    ) : m.type === 'ticket-prompt' ? (
                      <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-tide/30 bg-tide/5 p-3.5 text-xs text-ink shadow-sm space-y-3">
                        <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                        <button
                          type="button"
                          onClick={() => setShowTicketForm(true)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-tide py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-tide-2"
                        >
                          <LifeBuoy className="h-3.5 w-3.5" />
                          Raise a Support Ticket Now
                        </button>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          'max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed',
                          m.role === 'user'
                            ? 'rounded-tr-md bg-tide text-white shadow-xs'
                            : 'rounded-tl-md border border-line bg-paper-2 text-ink shadow-xs'
                        )}
                      >
                        {m.text}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {typing ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-paper p-0.5">
                    <img src="/chatbot-icon.png" alt="Tide" className="h-full w-full object-contain" />
                  </span>
                  <div className="flex w-fit items-center gap-1 rounded-2xl rounded-tl-md border border-line bg-paper-2 px-4 py-3 shadow-xs">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-tide"
                        animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : null}

              {/* Inline Ticket Form Sheet */}
              <AnimatePresence>
                {showTicketForm && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="rounded-2xl border border-line bg-elevated p-3.5 shadow-xl space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-line pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                        <LifeBuoy className="h-4 w-4 text-tide" />
                        <span>Log Support Ticket</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTicketForm(false)}
                        className="rounded-full p-1 text-ink-3 hover:text-ink"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <form onSubmit={handleSubmitTicket} className="space-y-2.5 text-xs">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-3">Category</label>
                        <select
                          value={ticketCategory}
                          onChange={(e) => setTicketCategory(e.target.value as TicketCategory)}
                          className="mt-1 w-full rounded-xl border border-line-2 bg-paper-2 px-2.5 py-1.5 text-xs text-ink focus:border-tide focus:outline-none"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                          Booking Ref (optional)
                        </label>
                        <input
                          type="text"
                          value={ticketBookingRef}
                          onChange={(e) => setTicketBookingRef(e.target.value.toUpperCase())}
                          placeholder="e.g. GK-782941"
                          className="mt-1 w-full rounded-xl border border-line-2 bg-paper-2 px-2.5 py-1.5 font-mono text-xs uppercase text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-3">Subject *</label>
                        <input
                          type="text"
                          required
                          value={ticketSubject}
                          onChange={(e) => setTicketSubject(e.target.value)}
                          placeholder="Brief summary of your inquiry"
                          className="mt-1 w-full rounded-xl border border-line-2 bg-paper-2 px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-3">Details *</label>
                        <textarea
                          required
                          rows={2}
                          value={ticketDesc}
                          onChange={(e) => setTicketDesc(e.target.value)}
                          placeholder="How can our concierge team assist you?"
                          className="mt-1 w-full rounded-xl border border-line-2 bg-paper-2 px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-3">Name *</label>
                          <input
                            type="text"
                            required
                            value={ticketName}
                            onChange={(e) => setTicketName(e.target.value)}
                            placeholder="Your Name"
                            className="mt-1 w-full rounded-xl border border-line-2 bg-paper-2 px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-3">Email *</label>
                          <input
                            type="email"
                            required
                            value={ticketEmail}
                            onChange={(e) => setTicketEmail(e.target.value)}
                            placeholder="Your Email"
                            className="mt-1 w-full rounded-xl border border-line-2 bg-paper-2 px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                          />
                        </div>
                      </div>

                      {ticketError && (
                        <div className="text-[11px] font-medium text-err">{ticketError}</div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowTicketForm(false)}
                          className="flex-1 rounded-xl border border-line bg-paper-2 py-1.5 text-xs font-semibold text-ink-2 hover:bg-paper"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingTicket}
                          className="flex-1 rounded-xl bg-tide py-1.5 text-xs font-semibold text-white transition-colors hover:bg-tide-2 disabled:opacity-50"
                        >
                          {submittingTicket ? 'Submitting...' : 'Submit Ticket'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {msgs.length === 0 && !showTicketForm ? (
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

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-line p-3 bg-paper-2/70 backdrop-blur-md"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question or raise a ticket…"
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
