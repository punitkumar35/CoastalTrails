import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
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
  Calendar,
  CreditCard,
  RefreshCw,
  Home,
  Compass,
  UserCheck,
  Lock,
  FileText,
  User as UserIcon,
} from 'lucide-react';
import { api } from '../services/api';
import { cn } from '../lib/cn';
import type { Booking, SupportTicket, SupportTicketMessage, TicketCategory, TicketPriority, User } from '../types';

interface TopicCard {
  id: TicketCategory;
  title: string;
  desc: string;
  icon: typeof Calendar;
  color: string;
}

const TOPICS: TopicCard[] = [
  {
    id: 'booking',
    title: 'Reservation & Dates',
    desc: 'Modify dates, vouchers, guest counts, or booking confirmation',
    icon: Calendar,
    color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  {
    id: 'payment',
    title: 'Payment & 20% Hold',
    desc: 'Hold transaction receipts, online checkout, and balance at check-in',
    icon: CreditCard,
    color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300',
  },
  {
    id: 'cancellation',
    title: 'Cancellation & Refunds',
    desc: 'Free 48h cancellation rules, refund timelines, and policies',
    icon: RefreshCw,
    color: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300',
  },
  {
    id: 'property_host',
    title: 'Stay & Host Coordination',
    desc: 'Arrival timing, luggage drop, property amenities, and host WhatsApp',
    icon: Home,
    color: 'text-sky-700 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300',
  },
  {
    id: 'trail_transit',
    title: 'Trails & Ferry Transit',
    desc: '5-beach cliff trek route, fisherman boats to Half Moon & Paradise',
    icon: Compass,
    color: 'text-teal-700 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300',
  },
  {
    id: 'account',
    title: 'Account, Safety & Privacy',
    desc: 'Sign in help, password resets, verified profile, and data security',
    icon: ShieldCheck,
    color: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300',
  },
];

const FAQS: { category: TicketCategory | 'all'; q: string; a: string }[] = [
  {
    category: 'payment',
    q: 'How does the 20% commitment hold work?',
    a: 'You pay 20% online to lock your dates directly with the host. The remaining 80% balance is payable upon arrival at the property via cash, UPI, or card. We charge zero platform convenience fees.',
  },
  {
    category: 'cancellation',
    q: 'What is the cancellation and refund policy?',
    a: 'Cancellations are 100% free with a full refund of your 20% hold if cancelled at least 48 hours prior to check-in. Within 48 hours, the hold is retained as a reservation commitment for the host.',
  },
  {
    category: 'property_host',
    q: 'How do I contact my host directly before check-in?',
    a: 'Once your reservation is confirmed, your voucher provides the host’s direct phone and WhatsApp contact with a one-tap message button. You can also view it anytime from My Bookings.',
  },
  {
    category: 'trail_transit',
    q: 'How do I reach secluded beaches like Half Moon or Paradise?',
    a: 'Half Moon and Paradise Beach are vehicle-free zones. You can reach them via scenic coastal cliff trails starting from Om Beach or Kudle Beach, or via licensed ferry boats operating from Om Beach and Tadadi Jetty.',
  },
  {
    category: 'booking',
    q: 'Where can I access my digital booking voucher?',
    a: 'Your digital pass and fare voucher are accessible anytime under My Bookings &bull; View Voucher. A copy is also emailed to you immediately after your 20% hold is captured.',
  },
  {
    category: 'account',
    q: 'How do I reset my account password or update my phone number?',
    a: 'Go to Profile &bull; Security to change your password or click "Forgot Password" on the sign-in modal to receive a single-use encrypted reset link. Profile details can be updated under Profile &bull; Edit.',
  },
];

export function ContactSupportPage({ currentUser }: { currentUser?: User | null }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlTicket = searchParams.get('ticket') || '';
  const urlBooking = searchParams.get('booking') || '';

  const [activeTab, setActiveTab] = useState<'create' | 'track' | 'my-tickets'>(
    urlTicket ? 'track' : 'create'
  );

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<TicketCategory | 'all'>('all');

  // Bookings list for active reservation banner
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

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
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Load user profile & recent bookings
  useEffect(() => {
    if (currentUser) {
      if (!name) setName(currentUser.name);
      if (!email && currentUser.email) setEmail(currentUser.email);
      if (!phone && currentUser.phone) setPhone(currentUser.phone);
      if (!trackEmail && currentUser.email) setTrackEmail(currentUser.email);

      api
        .getBookings()
        .then((b) => {
          setRecentBookings(b || []);
          if (b && b.length > 0) {
            setSelectedBooking(b[0]);
            if (!bookingRef) setBookingRef(b[0].reference_code);
          }
        })
        .catch(() => {});
    }
  }, [currentUser]);

  // Handle URL ticket parameter
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

  function openTideChatWithCategory(cat: TicketCategory) {
    setCategory(cat);
    setActiveTab('create');
    const el = document.getElementById('ticket-form-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  const filteredFaqs = useMemo(() => {
    return FAQS.filter((f) => {
      const matchTopic = selectedTopic === 'all' || f.category === selectedTopic;
      const matchQuery =
        !searchQuery.trim() ||
        f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.a.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTopic && matchQuery;
    });
  }, [selectedTopic, searchQuery]);

  function getStatusBadge(status: string) {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Open &bull; Concierge Reviewing
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800 dark:border-sky-700/50 dark:bg-sky-950/40 dark:text-sky-300">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            In Progress &bull; Working on Solution
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Resolved
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper-2 px-2.5 py-0.5 text-[11px] font-semibold text-ink-3">
            Closed
          </span>
        );
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen pb-24 pt-4 md:pb-16 space-y-10">
      {/* 1. Airbnb-Style Clean Hero Header */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-[radial-gradient(130%_140%_at_50%_0%,oklch(0.28_0.07_255)_0%,oklch(0.18_0.03_262)_65%,oklch(0.12_0.025_265)_100%)] px-6 py-12 text-white sm:px-12 sm:py-16 shadow-2xl">
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-tide-glow backdrop-blur-xs">
            <LifeBuoy className="h-3.5 w-3.5" />
            Coastal Trails Help Center
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            {currentUser ? `Hi ${currentUser.name.split(' ')[0]}, how can we help?` : 'How can we help you?'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base max-w-xl mx-auto">
            Search our coastal knowledge base, manage your reservation, or connect directly with our Gokarna concierge desk.
          </p>

          {/* Search Bar */}
          <div className="mt-8 relative max-w-2xl mx-auto">
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-ink-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search issues, 20% hold, cancellations, or enter ticket code (CT-XXXXXX)..."
                className="w-full rounded-2xl border border-white/20 bg-elevated/95 pl-12 pr-28 py-3.5 text-sm text-ink placeholder:text-ink-3 shadow-xl backdrop-blur-md focus:border-tide focus:outline-none focus:ring-2 focus:ring-tide/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-24 text-xs text-ink-3 hover:text-ink"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => {
                  if (searchQuery.toUpperCase().startsWith('CT-')) {
                    setTrackNumber(searchQuery.toUpperCase());
                    setActiveTab('track');
                    handleTrackTicket(searchQuery.toUpperCase());
                  }
                }}
                className="absolute right-2 rounded-xl bg-tide px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-tide-2"
              >
                Search
              </button>
            </div>

            {/* Quick Keyword Pills */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
              <span className="text-slate-400">Popular:</span>
              {[
                { label: '20% Hold Policy', query: '20% hold' },
                { label: 'Free Cancellation', query: 'cancellation' },
                { label: 'Host Contact', query: 'host' },
                { label: 'Half Moon Trek', query: 'half moon' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => setSearchQuery(chip.query)}
                  className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-slate-200 transition-colors hover:bg-white/15 hover:text-white"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Active Reservation Card (Airbnb / MakeMyTrip Special) */}
      {selectedBooking ? (
        <section className="w-full">
          <div className="rounded-3xl border border-line bg-elevated p-6 shadow-sm sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-tide/10 text-tide">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-tide">{selectedBooking.reference_code}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Confirmed Stay
                    </span>
                  </div>
                  <h3 className="mt-1 font-display text-lg font-semibold text-ink sm:text-xl">
                    {selectedBooking.homestay_title || 'Your Gokarna Stay'}
                  </h3>
                  <p className="mt-0.5 text-xs text-ink-3">
                    Check-in: <strong>{selectedBooking.check_in}</strong> &bull; Check-out: <strong>{selectedBooking.check_out}</strong> &bull;{' '}
                    {selectedBooking.guests_count} Guests
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                {selectedBooking.whatsapp_link && (
                  <a
                    href={selectedBooking.whatsapp_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-ok px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-90"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Host WhatsApp
                  </a>
                )}
                <Link
                  to="/bookings"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-paper-2 px-4 py-2.5 text-xs font-semibold text-ink transition-colors hover:bg-paper"
                >
                  <FileText className="h-4 w-4" />
                  View Voucher
                </Link>
                <button
                  onClick={() => {
                    setBookingRef(selectedBooking.reference_code);
                    setCategory('booking');
                    setActiveTab('create');
                    const el = document.getElementById('ticket-form-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-tide px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-tide-2"
                >
                  <LifeBuoy className="h-4 w-4" />
                  Raise Stay Issue
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* 3. Explore Help by Category (Airbnb-Style 6 Topics Grid) */}
      <section className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-line pb-4">
          <div>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-tide">Browse by Category</span>
            <h2 className="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">Explore Help Topics</h2>
          </div>
          <span className="text-xs text-ink-3">Select a topic to view instant guides or raise a direct inquiry</span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {TOPICS.map((topic) => {
            const Icon = topic.icon;
            const isSelected = selectedTopic === topic.id;
            return (
              <button
                key={topic.id}
                onClick={() => {
                  setSelectedTopic(isSelected ? 'all' : topic.id);
                  openTideChatWithCategory(topic.id);
                }}
                className={cn(
                  'group flex flex-col text-left rounded-3xl border p-6 transition-all hover:shadow-lg',
                  isSelected
                    ? 'border-tide bg-tide/5 ring-2 ring-tide/20 shadow-md'
                    : 'border-line bg-elevated hover:border-tide/40'
                )}
              >
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-105', topic.color)}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-ink group-hover:text-tide transition-colors">
                  {topic.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-2 flex-1">
                  {topic.desc}
                </p>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-tide">
                  <span>Get help with this</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Support Desk & Ticket Portal (MakeMyTrip Multi-Service Hub) */}
      <section id="ticket-form-section" className="w-full pt-4">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-tide">Concierge Ticket Desk</span>
            <h2 className="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">Track or Raise Support Tickets</h2>
          </div>

          <div className="inline-flex rounded-2xl border border-line bg-paper-2 p-1.5 shadow-xs">
            <button
              onClick={() => setActiveTab('create')}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all',
                activeTab === 'create' ? 'bg-tide text-white shadow-xs' : 'text-ink-2 hover:text-ink'
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Raise Ticket
            </button>
            <button
              onClick={() => setActiveTab('track')}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all',
                activeTab === 'track' ? 'bg-tide text-white shadow-xs' : 'text-ink-2 hover:text-ink'
              )}
            >
              <Search className="h-3.5 w-3.5" />
              Live Tracker
            </button>
            {currentUser && (
              <button
                onClick={() => setActiveTab('my-tickets')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all',
                  activeTab === 'my-tickets' ? 'bg-tide text-white shadow-xs' : 'text-ink-2 hover:text-ink'
                )}
              >
                <LifeBuoy className="h-3.5 w-3.5" />
                My Tickets
              </button>
            )}
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="mt-8">
          <AnimatePresence mode="wait">
            {activeTab === 'create' && (
              <motion.div
                key="create"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="rounded-3xl border border-line bg-elevated p-6 shadow-xl shadow-ink/5 sm:p-10"
              >
                {createdTicket ? (
                  <div className="rounded-3xl border border-ok/30 bg-ok/5 p-8 text-center shadow-lg">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok/20 text-ok">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h2 className="mt-4 font-display text-2xl font-semibold text-ink">Ticket Logged Successfully!</h2>
                    <p className="mx-auto mt-2 max-w-lg text-sm text-ink-2">
                      Your ticket has been assigned to our concierge desk in Gokarna. A confirmation email has been dispatched to{' '}
                      <strong>{createdTicket.email}</strong>.
                    </p>

                    <div className="mx-auto mt-6 flex max-w-sm items-center justify-between rounded-2xl border border-line bg-elevated p-3.5 shadow-xs">
                      <div className="text-left">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">Ticket Reference</span>
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
                        Track Ticket Online
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
                  <form onSubmit={handleCreateTicket} className="space-y-6 max-w-3xl mx-auto">
                    <div>
                      <h3 className="font-display text-xl font-semibold text-ink">Submit a Concierge Request</h3>
                      <p className="mt-1 text-xs text-ink-2">
                        Our dedicated hospitality team reviews requests within <strong>2–4 hours</strong> during desk hours (9 AM – 9 PM IST).
                      </p>
                    </div>

                    {/* Category Selection */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-ink-2">
                        1. Select Issue Category *
                      </label>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {TOPICS.map((t) => (
                          <button
                            type="button"
                            key={t.id}
                            onClick={() => setCategory(t.id)}
                            className={cn(
                              'flex flex-col text-left rounded-2xl border p-3 transition-all',
                              category === t.id
                                ? 'border-tide bg-tide/5 text-ink shadow-xs ring-1 ring-tide'
                                : 'border-line bg-paper-2 text-ink-2 hover:border-line-2 hover:text-ink'
                            )}
                          >
                            <span className="text-xs font-semibold text-ink">{t.title}</span>
                            <span className="mt-0.5 text-[10px] text-ink-3 truncate">{t.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Booking Reference */}
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
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Full Name *"
                          className="w-full rounded-xl border border-line-2 bg-paper-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                        />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email Address *"
                          className="w-full rounded-xl border border-line-2 bg-paper-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                        />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Phone / WhatsApp"
                          className="w-full rounded-xl border border-line-2 bg-paper-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:border-tide focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Urgency */}
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
                  </form>
                )}
              </motion.div>
            )}

            {activeTab === 'track' && (
              <motion.div
                key="track"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl mx-auto space-y-6"
              >
                <div className="rounded-3xl border border-line bg-elevated p-6 shadow-xl shadow-ink/5 sm:p-8">
                  <h3 className="font-display text-xl font-semibold text-ink">Track Your Ticket Status</h3>
                  <p className="mt-1 text-xs text-ink-2">
                    Enter your ticket code (e.g. <strong>CT-123456</strong>) and email to view progress and reply to the concierge.
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
                        Registered Email
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

                {/* Tracked Ticket View */}
                {trackedTicket && (
                  <div className="rounded-3xl border border-line bg-elevated p-6 shadow-xl shadow-ink/5 sm:p-8 space-y-6">
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

                    {/* Stepper */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Resolution Progress</p>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex flex-col items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ok text-white shadow-xs">
                            <Check className="h-4 w-4" />
                          </div>
                          <span className="mt-2 text-[11px] font-semibold text-ink">Logged</span>
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

                    {/* Conversation */}
                    <div className="border-t border-line pt-6">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-3">Messages &amp; Notes</h4>
                      <div className="mt-4 space-y-3">
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
                              <div className="flex items-center justify-between gap-4 border-b border-ink/10 pb-1.5 mb-2 text-[10px]">
                                <span className="font-semibold text-tide">
                                  {isTraveler ? 'You (Traveler)' : `${m.sender_name} (Concierge)`}
                                </span>
                                <span className="text-ink-3">
                                  {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap">{m.message}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Reply box */}
                      {isVerified ? (
                        <form onSubmit={handleSendReply} className="mt-6 border-t border-line pt-4">
                          <label className="block text-xs font-semibold text-ink">Post a reply or follow-up note:</label>
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
                                  Reply
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="mt-6 rounded-xl border border-line bg-paper-2 p-4 text-center text-xs text-ink-2">
                          Enter the email address used when logging this ticket above to access full conversation history and reply.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'my-tickets' && (
              <motion.div
                key="my-tickets"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl mx-auto rounded-3xl border border-line bg-elevated p-6 shadow-xl shadow-ink/5 sm:p-8"
              >
                <div className="flex items-center justify-between border-b border-line pb-6">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-ink">My Support Tickets</h3>
                    <p className="mt-1 text-xs text-ink-2">All tickets registered under your profile.</p>
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
                          View Status &rarr;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* 5. 24x7 Direct Assistance Channels (MakeMyTrip Contact Bar) */}
      <section className="w-full">
        <div className="border-b border-line pb-4">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-tide">Direct Contact</span>
          <h2 className="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">Still Need Help? Reach Our Team</h2>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Channel 1: Tide Chat */}
          <div className="rounded-3xl border border-line bg-elevated p-6 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-tide/10 text-tide">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-ink">Live Tide Concierge</h3>
              <p className="mt-1 text-xs text-ink-2">Instant answers to stays, availability, prices, and booking vouchers.</p>
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-tide-chat'))}
              className="mt-5 flex items-center justify-center gap-1.5 rounded-xl bg-tide py-2.5 text-xs font-semibold text-white transition-colors hover:bg-tide-2"
            >
              <MessageCircle className="h-4 w-4" />
              Chat with Tide
            </button>
          </div>

          {/* Channel 2: WhatsApp */}
          <div className="rounded-3xl border border-line bg-elevated p-6 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ok/10 text-ok">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-ink">WhatsApp Desk</h3>
              <p className="mt-1 text-xs text-ink-2">Direct messaging for on-road guidance, check-in arrival, and boat pickups.</p>
            </div>
            <a
              href="https://wa.me/918050000000?text=Hello%20Coastal%20Trails%20Concierge%2C%20I%20need%20help%20with%20my%20stay"
              target="_blank"
              rel="noreferrer"
              className="mt-5 flex items-center justify-center gap-1.5 rounded-xl bg-ok py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              <MessageCircle className="h-4 w-4" />
              Message WhatsApp
            </a>
          </div>

          {/* Channel 3: Email */}
          <div className="rounded-3xl border border-line bg-elevated p-6 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600">
                <Mail className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-ink">Guest Email Support</h3>
              <p className="mt-1 text-xs text-ink-2">Detailed inquiries, formal receipts, and booking adjustments.</p>
            </div>
            <a
              href="mailto:support@coastaltrails.in?subject=Coastal%20Trails%20Guest%20Support"
              className="mt-5 flex items-center justify-center gap-1.5 rounded-xl border border-line bg-paper-2 py-2.5 text-xs font-semibold text-ink transition-colors hover:bg-paper"
            >
              <Mail className="h-4 w-4" />
              support@coastaltrails.in
            </a>
          </div>

          {/* Channel 4: Local Outpost */}
          <div className="rounded-3xl border border-line bg-elevated p-6 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-ink">Operating Hours</h3>
              <p className="mt-1 text-xs text-ink-2">Concierge active <strong>9:00 AM – 9:00 PM IST</strong> every day across Gokarna.</p>
            </div>
            <div className="mt-5 flex items-center justify-center gap-1.5 rounded-xl border border-line bg-paper-2 py-2.5 text-xs font-medium text-ink-2">
              <MapPin className="h-4 w-4 text-ember" />
              Gokarna Heritage Town
            </div>
          </div>
        </div>
      </section>

      {/* 6. Filterable FAQs Accordion */}
      <section className="w-full max-w-5xl mx-auto border-t border-line pt-12">
        <div className="text-center">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-tide">Self Service</span>
          <h2 className="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">Frequently Asked Questions</h2>
          <p className="mt-2 text-xs text-ink-2">Quick answers to standard questions about visiting Gokarna and booking stays.</p>
        </div>

        <div className="mt-8 space-y-3">
          {filteredFaqs.map((faq, index) => {
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

      {/* 7. Airbnb-Style "CoastalCover" Guarantee Strip */}
      <section className="w-full">
        <div className="rounded-3xl border border-line bg-elevated p-8 sm:p-10 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-tide text-white">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-ink">Coastal Trails Traveler Protection</h3>
                <p className="text-xs text-ink-2">Every booking includes our complete guest peace-of-mind guarantee.</p>
              </div>
            </div>
            <span className="font-mono text-[11px] font-semibold text-tide uppercase tracking-wider">
              100% Direct Fair-Host Model
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div>
              <p className="font-semibold text-ink">Verified Family Homestays</p>
              <p className="mt-1 text-ink-2 leading-relaxed">
                Every property and host is personally vetted on-ground in Kudle, Om, and Main Beach.
              </p>
            </div>
            <div>
              <p className="font-semibold text-ink">20% Fair Hold Rate</p>
              <p className="mt-1 text-ink-2 leading-relaxed">
                Pay only 20% online to hold your dates. Pay the remaining 80% directly to the host on arrival.
              </p>
            </div>
            <div>
              <p className="font-semibold text-ink">Free 48h Cancellation</p>
              <p className="mt-1 text-ink-2 leading-relaxed">
                Cancel up to 48 hours prior to check-in for a full, automatic return of your commitment hold.
              </p>
            </div>
            <div>
              <p className="font-semibold text-ink">On-Ground Concierge</p>
              <p className="mt-1 text-ink-2 leading-relaxed">
                Real hospitality specialists in Gokarna ready to guide your cliff treks, boats, and stay comfort.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
