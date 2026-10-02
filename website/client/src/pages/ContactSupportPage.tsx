import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LifeBuoy,
  MessageSquare,
  Search,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { cn } from '../lib/cn';
import type { SupportTicket, SupportTicketMessage, TicketCategory, TicketPriority, User } from '../types';

const CATEGORIES: { id: TicketCategory; label: string; desc: string }[] = [
  { id: 'booking', label: 'Booking Inquiry', desc: 'Questions on reservation, dates or dates extension' },
  { id: 'payment', label: 'Payment & 20% Hold', desc: 'Hold payment status, gateway charges, or receipts' },
  { id: 'cancellation', label: 'Cancellation & Refund', desc: 'Free 48h cancellation, refunds, or property credits' },
  { id: 'property_host', label: 'Stay & Host Coordination', desc: 'Reaching host, amenities, check-in time or directions' },
  { id: 'trail_transit', label: 'Trails & Ferry Transit', desc: 'Cliff treks, scooter rental, ferry boats, or auto rates' },
  { id: 'account', label: 'Account & Profile', desc: 'Login, password reset, or traveler profile details' },
  { id: 'general', label: 'Other Concierge Help', desc: 'General questions about visiting Gokarna' },
];

const FAQS = [
  {
    q: 'How does the 20% commitment hold work?',
    a: 'You pay 20% online through our secure gateway to lock in your room and dates directly with the host. The remaining 80% balance is payable in person at the property upon check-in via cash, UPI, or card.',
  },
  {
    q: 'What is the cancellation and refund policy?',
    a: 'Cancellations are 100% free with full refund of the 20% hold if cancelled at least 48 hours before the check-in date. If cancelled inside 48 hours, the hold is retained as a host reservation commitment.',
  },
  {
    q: 'How do I contact my host directly before check-in?',
    a: 'Once your booking is confirmed, your voucher displays your host’s direct phone and WhatsApp contact with a one-tap message button. You can also view it anytime from My Bookings.',
  },
  {
    q: 'How do I reach secluded beaches like Half Moon or Paradise?',
    a: 'Half Moon and Paradise Beach are vehicle-free sanctuaries. You can reach them via scenic coastal cliff treks starting from Om Beach or Kudle Beach, or via the licensed fisherman ferry boats running from Om Beach and Tadadi Jetty.',
  },
  {
    q: 'What should I do if I did not receive a confirmation email?',
    a: 'Check your spam or promotions folder first. You can always download your voucher anytime under My Bookings, or file a quick ticket below and our concierge desk will re-verify and send it to you.',
  },
];

export function ContactSupportPage({ currentUser }: { currentUser?: User | null }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTicket = searchParams.get('ticket') || '';
  const urlBooking = searchParams.get('booking') || '';

  const [activeTab, setActiveTab] = useState<'create' | 'track' | 'my-tickets'>(
    urlTicket ? 'track' : 'create'
  );

  // Form State
  const [category, setCategory] = useState<TicketCategory>('booking');
  const [bookingRef, setBookingRef] = useState(urlBooking);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('normal');
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<SupportTicket | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Tracker State
  const [trackNumber, setTrackNumber] = useState(urlTicket);
  const [trackEmail, setTrackEmail] = useState(currentUser?.email || '');
  const [loadingTrack, setLoadingTrack] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackedTicket, setTrackedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // My Tickets State
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [loadingMyTickets, setLoadingMyTickets] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Auto-fill user info if currentUser becomes available
  useEffect(() => {
    if (currentUser) {
      if (!name) setName(currentUser.name);
      if (!email && currentUser.email) setEmail(currentUser.email);
      if (!phone && currentUser.phone) setPhone(currentUser.phone);
      if (!trackEmail && currentUser.email) setTrackEmail(currentUser.email);
    }
  }, [currentUser]);

  // Load ticket automatically if url ticket present
  useEffect(() => {
    if (urlTicket) {
      setTrackNumber(urlTicket);
      handleTrackTicket(urlTicket, trackEmail);
    }
  }, [urlTicket]);

  // Load user tickets on tab switch
  useEffect(() => {
    if (activeTab === 'my-tickets' && currentUser) {
      setLoadingMyTickets(true);
      api
        .getMySupportTickets()
        .then((res) => setMyTickets(res))
        .catch((err) => console.warn('Could not load tickets:', err))
        .finally(() => setLoadingMyTickets(false));
    }
  }, [activeTab, currentUser]);

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Please enter your name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!subject.trim()) {
      setFormError('Please enter a subject.');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setFormError('Please describe your request in at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createSupportTicket({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        booking_reference: bookingRef.trim().toUpperCase() || undefined,
        category,
        subject: subject.trim(),
        description: description.trim(),
        priority,
      });

      setCreatedTicket(res.ticket);
      // Reset form fields
      setSubject('');
      setDescription('');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit ticket. Please check your network and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTrackTicket(ticketNumToSearch?: string, emailToVerify?: string) {
    const num = (ticketNumToSearch || trackNumber).trim().toUpperCase();
    const mail = (emailToVerify !== undefined ? emailToVerify : trackEmail).trim();
    if (!num) {
      setTrackError('Please enter your ticket number (e.g. CT-123456).');
      return;
    }

    setLoadingTrack(true);
    setTrackError(null);

    try {
      const res = await api.trackSupportTicket(num, mail || undefined);
      setTrackedTicket(res.ticket);
      setMessages(res.messages || []);
      setIsVerified(res.isVerified);
      if (num !== trackNumber) setTrackNumber(num);
    } catch (err: any) {
      setTrackError(err?.message || `Could not find ticket ${num}. Please check your ticket code.`);
      setTrackedTicket(null);
      setMessages([]);
    } finally {
      setLoadingTrack(false);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || !trackedTicket) return;

    setSendingReply(true);
    try {
      const res = await api.addSupportTicketMessage(
        trackedTicket.ticket_number,
        replyText.trim(),
        trackEmail || currentUser?.email || trackedTicket.email
      );

      setMessages((prev) => [...prev, res.message]);
      setReplyText('');
    } catch (err: any) {
      alert(err?.message || 'Failed to post message. Please try again.');
    } finally {
      setSendingReply(false);
    }
  }

  function copyTicketNumber(num: string) {
    navigator.clipboard.writeText(num);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Open &bull; Awaiting Review
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800 dark:border-sky-700/50 dark:bg-sky-950/40 dark:text-sky-300">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            In Progress &bull; Concierge Working
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Resolved
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper-2 px-2.5 py-0.5 text-xs font-semibold text-ink-3">
            Closed
          </span>
        );
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen pb-24 pt-6 md:pb-16">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-[radial-gradient(120%_140%_at_50%_0%,oklch(0.30_0.06_255)_0%,oklch(0.18_0.03_262)_60%,oklch(0.12_0.025_265)_100%)] px-6 py-12 text-white sm:px-10 sm:py-16">
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-tide-glow backdrop-blur-xs">
            <LifeBuoy className="h-3.5 w-3.5" />
            Coastal Concierge Desk
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            How can we help your coastal journey?
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
            From booking changes and 20% hold questions to cliff trail advice and host coordination — our local team in
            Gokarna is here to assist you promptly.
          </p>
        </div>

        {/* Contact Strip */}
        <div className="relative z-10 mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tide/30 text-white">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Guest Support Email</p>
              <a href="mailto:support@coastaltrails.in" className="text-xs font-semibold text-white hover:underline">
                support@coastaltrails.in
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tide/30 text-white">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Desk Hours</p>
              <p className="text-xs font-semibold text-white">9:00 AM – 9:00 PM IST (Daily)</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tide/30 text-white">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">On-Ground Base</p>
              <p className="text-xs font-semibold text-white">Gokarna Heritage Town, Karnataka</p>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="mt-8 flex items-center justify-center">
        <div className="inline-flex rounded-full border border-line bg-paper-2 p-1.5 shadow-xs">
          <button
            onClick={() => setActiveTab('create')}
            className={cn(
              'flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition-all',
              activeTab === 'create' ? 'bg-tide text-white shadow-xs' : 'text-ink-2 hover:text-ink'
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Raise a Ticket
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={cn(
              'flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition-all',
              activeTab === 'track' ? 'bg-tide text-white shadow-xs' : 'text-ink-2 hover:text-ink'
            )}
          >
            <Search className="h-3.5 w-3.5" />
            Track Ticket Status
          </button>
          {currentUser ? (
            <button
              onClick={() => setActiveTab('my-tickets')}
              className={cn(
                'flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition-all',
                activeTab === 'my-tickets' ? 'bg-tide text-white shadow-xs' : 'text-ink-2 hover:text-ink'
              )}
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              My Tickets
            </button>
          ) : null}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mt-8">
        <AnimatePresence mode="wait">
          {activeTab === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="mx-auto max-w-3xl"
            >
              {createdTicket ? (
                <div className="rounded-3xl border border-ok/30 bg-ok/5 p-8 text-center shadow-lg">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok/20 text-ok">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h2 className="mt-4 font-display text-2xl font-semibold text-ink">Ticket Created Successfully!</h2>
                  <p className="mx-auto mt-2 max-w-lg text-sm text-ink-2">
                    Your request has been logged directly with our concierge team. A confirmation email has been sent to{' '}
                    <strong>{createdTicket.email}</strong>.
                  </p>

                  <div className="mx-auto mt-6 flex max-w-sm items-center justify-between rounded-2xl border border-line bg-elevated p-3.5 shadow-xs">
                    <div className="text-left">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">Your Ticket Number</span>
                      <p className="font-mono text-lg font-bold text-tide">{createdTicket.ticket_number}</p>
                    </div>
                    <button
                      onClick={() => copyTicketNumber(createdTicket.ticket_number)}
                      className="flex items-center gap-1.5 rounded-xl border border-line bg-paper-2 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper"
                    >
                      {copiedCode ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedCode ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        setTrackNumber(createdTicket.ticket_number);
                        setTrackEmail(createdTicket.email);
                        setActiveTab('track');
                        handleTrackTicket(createdTicket.ticket_number, createdTicket.email);
                      }}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-tide px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-tide-2"
                    >
                      Track This Ticket Now
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setCreatedTicket(null)}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-elevated px-6 text-sm font-semibold text-ink transition-colors hover:bg-paper-2"
                    >
                      Raise Another Ticket
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-line bg-elevated p-6 shadow-xl shadow-ink/5 sm:p-10">
                  <div className="border-b border-line pb-6">
                    <h2 className="font-display text-2xl font-semibold text-ink">Raise a Support Ticket</h2>
                    <p className="mt-1 text-sm text-ink-2">
                      Submit your issue or request. Our team typically replies within 2–4 hours during desk hours.
                    </p>
                  </div>

                  <form onSubmit={handleCreateTicket} className="mt-6 space-y-6">
                    {/* Category Selection */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-ink-2">
                        1. Select Category *
                      </label>
                      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {CATEGORIES.map((cat) => (
                          <button
                            type="button"
                            key={cat.id}
                            onClick={() => setCategory(cat.id)}
                            className={cn(
                              'flex flex-col text-left rounded-2xl border p-3.5 transition-all',
                              category === cat.id
                                ? 'border-tide bg-tide/5 text-ink shadow-xs ring-1 ring-tide'
                                : 'border-line bg-paper-2 text-ink-2 hover:border-line-2 hover:text-ink'
                            )}
                          >
                            <span className="text-xs font-semibold text-ink">{cat.label}</span>
                            <span className="mt-1 text-[11px] text-ink-3 leading-snug">{cat.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Booking Reference (Optional) */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-ink-2">
                          2. Booking Reference (Optional)
                        </label>
                        <span className="text-[11px] text-ink-3">e.g. GK-782941</span>
                      </div>
                      <input
                        type="text"
                        value={bookingRef}
                        onChange={(e) => setBookingRef(e.target.value.toUpperCase())}
                        placeholder="GK-XXXXXX"
                        className="mt-2 w-full rounded-xl border border-line-2 bg-paper-2 px-4 py-2.5 font-mono text-sm uppercase text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                      />
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-ink-2">
                        3. Issue Subject *
                      </label>
                      <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Brief summary of your question or issue"
                        className="mt-2 w-full rounded-xl border border-line-2 bg-paper-2 px-4 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-ink-2">
                        4. Detailed Description *
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Please provide details (travel dates, homestay name, or what you need assistance with)..."
                        className="mt-2 w-full rounded-2xl border border-line-2 bg-paper-2 px-4 py-3 text-sm text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                      />
                    </div>

                    {/* Contact Details */}
                    <div className="border-t border-line pt-6">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-ink-2">
                        5. Your Contact Information
                      </label>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Full Name *"
                            className="w-full rounded-xl border border-line-2 bg-paper-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                          />
                        </div>
                        <div>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email Address *"
                            className="w-full rounded-xl border border-line-2 bg-paper-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                          />
                        </div>
                        <div>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Phone / WhatsApp"
                            className="w-full rounded-xl border border-line-2 bg-paper-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Priority */}
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-semibold text-ink-2">Urgency:</span>
                      <button
                        type="button"
                        onClick={() => setPriority('normal')}
                        className={cn(
                          'rounded-full px-3 py-1 font-medium transition-colors',
                          priority === 'normal'
                            ? 'bg-tide text-white'
                            : 'border border-line bg-paper-2 text-ink-2 hover:text-ink'
                        )}
                      >
                        Standard (2–4 hours)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriority('urgent')}
                        className={cn(
                          'rounded-full px-3 py-1 font-medium transition-colors',
                          priority === 'urgent'
                            ? 'bg-err text-white'
                            : 'border border-line bg-paper-2 text-ink-2 hover:text-ink'
                        )}
                      >
                        Urgent (Check-in today)
                      </button>
                    </div>

                    {formError && (
                      <div className="flex items-center gap-2 rounded-xl border border-err/30 bg-err/10 px-4 py-3 text-xs font-medium text-err">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-tide text-sm font-semibold text-white shadow-sm transition-transform hover:bg-tide-2 active:scale-95 disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Logging Ticket with Concierge...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Submit Support Ticket
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'track' && (
            <motion.div
              key="track"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="mx-auto max-w-3xl"
            >
              {/* Tracker Search Box */}
              <div className="rounded-3xl border border-line bg-elevated p-6 shadow-xl shadow-ink/5 sm:p-8">
                <h2 className="font-display text-2xl font-semibold text-ink">Track Support Ticket</h2>
                <p className="mt-1 text-sm text-ink-2">
                  Enter your ticket code (e.g. <strong>CT-123456</strong>) to check live status and follow up with the concierge.
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleTrackTicket();
                  }}
                  className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-5"
                >
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                      Ticket Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={trackNumber}
                      onChange={(e) => setTrackNumber(e.target.value.toUpperCase())}
                      placeholder="CT-XXXXXX"
                      className="mt-1 w-full rounded-xl border border-line-2 bg-paper-2 px-3.5 py-2.5 font-mono text-sm uppercase text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                      Your Email (for full history)
                    </label>
                    <input
                      type="email"
                      value={trackEmail}
                      onChange={(e) => setTrackEmail(e.target.value)}
                      placeholder="Email used when filing"
                      className="mt-1 w-full rounded-xl border border-line-2 bg-paper-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                    />
                  </div>

                  <div className="flex items-end sm:col-span-1">
                    <button
                      type="submit"
                      disabled={loadingTrack}
                      className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-tide text-xs font-semibold text-white transition-colors hover:bg-tide-2 disabled:opacity-50"
                    >
                      {loadingTrack ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <>
                          <Search className="h-4 w-4" />
                          Track
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {trackError && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-err/30 bg-err/10 px-4 py-3 text-xs font-medium text-err">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{trackError}</span>
                  </div>
                )}
              </div>

              {/* Ticket Details & Timeline */}
              {trackedTicket && (
                <div className="mt-6 space-y-6">
                  <div className="rounded-3xl border border-line bg-elevated p-6 shadow-xl shadow-ink/5 sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-bold text-tide">{trackedTicket.ticket_number}</span>
                          {getStatusBadge(trackedTicket.status)}
                        </div>
                        <h3 className="mt-2 font-display text-xl font-semibold text-ink">{trackedTicket.subject}</h3>
                        <p className="mt-1 text-xs text-ink-3">
                          Logged on {new Date(trackedTicket.created_at).toLocaleString('en-IN')} &bull; Category:{' '}
                          <span className="capitalize">{trackedTicket.category.replace('_', ' ')}</span>
                        </p>
                      </div>

                      {trackedTicket.booking_reference && (
                        <div className="rounded-2xl border border-line bg-paper-2 px-4 py-2.5 text-right">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-3">Booking Ref</p>
                          <p className="font-mono text-sm font-bold text-ink">{trackedTicket.booking_reference}</p>
                        </div>
                      )}
                    </div>

                    {/* Timeline Tracker */}
                    <div className="mt-6 border-b border-line pb-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Ticket Progress</p>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex flex-col items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ok text-white shadow-xs">
                            <Check className="h-4 w-4" />
                          </div>
                          <span className="mt-2 text-[11px] font-semibold text-ink">Received</span>
                        </div>
                        <div className={cn('h-1 flex-1 mx-2 rounded-full', trackedTicket.status !== 'open' ? 'bg-ok' : 'bg-line')} />
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs',
                              trackedTicket.status === 'in_progress' || trackedTicket.status === 'resolved' || trackedTicket.status === 'closed'
                                ? 'bg-sky-500 text-white'
                                : 'bg-paper-2 text-ink-3 border border-line'
                            )}
                          >
                            2
                          </div>
                          <span className="mt-2 text-[11px] font-semibold text-ink">In Progress</span>
                        </div>
                        <div className={cn('h-1 flex-1 mx-2 rounded-full', trackedTicket.status === 'resolved' || trackedTicket.status === 'closed' ? 'bg-ok' : 'bg-line')} />
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs',
                              trackedTicket.status === 'resolved' || trackedTicket.status === 'closed'
                                ? 'bg-ok text-white'
                                : 'bg-paper-2 text-ink-3 border border-line'
                            )}
                          >
                            ✓
                          </div>
                          <span className="mt-2 text-[11px] font-semibold text-ink">Resolved</span>
                        </div>
                      </div>
                    </div>

                    {/* Messages Thread */}
                    <div className="mt-6">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-3">Conversation &amp; Notes</h4>
                      <div className="mt-4 space-y-4">
                        {messages.map((m) => {
                          const isTraveler = m.sender_type === 'traveler';
                          return (
                            <div
                              key={m.id}
                              className={cn(
                                'flex flex-col max-w-[88%] rounded-2xl p-4 text-xs leading-relaxed',
                                isTraveler
                                  ? 'ml-auto bg-tide/10 border border-tide/20 text-ink rounded-tr-xs'
                                  : 'mr-auto bg-paper-2 border border-line text-ink rounded-tl-xs'
                              )}
                            >
                              <div className="flex items-center justify-between gap-4 border-b border-ink/10 pb-2 mb-2 text-[10px]">
                                <span className="font-semibold text-tide">
                                  {isTraveler ? 'You (Traveler)' : `${m.sender_name} (Concierge)`}
                                </span>
                                <span className="text-ink-3">{new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="whitespace-pre-wrap">{m.message}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Reply Box if verified */}
                      {isVerified ? (
                        <form onSubmit={handleSendReply} className="mt-6 border-t border-line pt-4">
                          <label className="block text-xs font-semibold text-ink">Send an update or reply:</label>
                          <div className="mt-2 flex gap-2">
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Type your message to the concierge..."
                              className="w-full rounded-xl border border-line-2 bg-paper-2 px-4 py-2.5 text-xs text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                            />
                            <button
                              type="submit"
                              disabled={sendingReply || !replyText.trim()}
                              className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-tide px-4 text-xs font-semibold text-white transition-colors hover:bg-tide-2 disabled:opacity-50"
                            >
                              {sendingReply ? (
                                <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                              ) : (
                                <>
                                  <Send className="h-3.5 w-3.5" />
                                  Send
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="mt-6 rounded-xl border border-line bg-paper-2 p-4 text-center text-xs text-ink-2">
                          To post a reply to this ticket, enter the email address used during submission above and click Track.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'my-tickets' && (
            <motion.div
              key="my-tickets"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="mx-auto max-w-3xl"
            >
              <div className="rounded-3xl border border-line bg-elevated p-6 shadow-xl shadow-ink/5 sm:p-8">
                <div className="flex items-center justify-between border-b border-line pb-6">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-ink">My Support Tickets</h2>
                    <p className="mt-1 text-sm text-ink-2">All tickets registered under your traveler profile.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="flex items-center gap-1.5 rounded-xl bg-tide px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-tide-2"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    New Ticket
                  </button>
                </div>

                {loadingMyTickets ? (
                  <div className="py-12 text-center text-xs text-ink-3">
                    <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-tide border-t-transparent" />
                    <p className="mt-2">Loading your tickets...</p>
                  </div>
                ) : myTickets.length === 0 ? (
                  <div className="py-12 text-center">
                    <LifeBuoy className="mx-auto h-10 w-10 text-ink-3" />
                    <p className="mt-3 text-sm font-semibold text-ink">No tickets found</p>
                    <p className="mt-1 text-xs text-ink-2">You haven&apos;t raised any support tickets yet.</p>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="mt-4 rounded-xl border border-line bg-paper-2 px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-paper"
                    >
                      Raise a Ticket Now
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 space-y-3">
                    {myTickets.map((t) => (
                      <div
                        key={t.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-line bg-paper-2 p-4 transition-all hover:border-tide/40"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-tide">{t.ticket_number}</span>
                            {getStatusBadge(t.status)}
                          </div>
                          <h4 className="mt-1 text-sm font-semibold text-ink">{t.subject}</h4>
                          <p className="mt-1 text-[11px] text-ink-3">
                            {new Date(t.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}{' '}
                            &bull; Category: <span className="capitalize">{t.category.replace('_', ' ')}</span>
                            {t.booking_reference ? ` &bull; Ref: ${t.booking_reference}` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setTrackNumber(t.ticket_number);
                            setTrackEmail(t.email);
                            setActiveTab('track');
                            handleTrackTicket(t.ticket_number, t.email);
                          }}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-elevated px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-paper"
                        >
                          View Details &rarr;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FAQs Section */}
      <section className="mx-auto mt-16 max-w-3xl border-t border-line pt-12">
        <div className="text-center">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-tide">Instant Answers</span>
          <h2 className="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">Frequently Asked Questions</h2>
          <p className="mt-2 text-xs text-ink-2">Answers to common traveler inquiries in Gokarna.</p>
        </div>

        <div className="mt-8 space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-line bg-elevated transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between p-4 text-left text-xs font-semibold text-ink transition-colors hover:text-tide"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={cn('h-4 w-4 shrink-0 text-ink-3 transition-transform duration-200', isOpen && 'rotate-180 text-tide')}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-line/60 bg-paper-2/50 px-4 py-3 text-xs leading-relaxed text-ink-2"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
