import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, LifeBuoy, Mail, MessageCircle, Send } from 'lucide-react';
import { formatDate } from '../../components/profile/status';
import { api } from '../../services/api';
import type { Booking } from '../../types';

const FAQS = [
  {
    q: 'How does the 20% online hold work?',
    a: 'You pay 20% online to confirm the reservation and pay the remaining 80% directly at the property when you check in.',
  },
  {
    q: 'Can I cancel a booking?',
    a: 'Yes, before the check-in date from My Bookings → View Details → Cancel Booking. If a hold payment was captured, the refund returns to the original payment method as per the gateway timeline.',
  },
  {
    q: 'When is the balance due?',
    a: 'The balance is payable at the property on arrival. The exact amount is shown on each booking under "Balance at property".',
  },
  {
    q: 'How do I change my dates or guests?',
    a: 'Message your host on WhatsApp with your booking ID, or email us. Date changes are subject to availability.',
  },
  {
    q: 'I did not get a confirmation email. What now?',
    a: 'Check spam first, then email bookings@coastaltrails.in with your booking ID and we will resend the voucher.',
  },
];

export function ProfileSupportPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refCode, setRefCode] = useState('');
  const [detail, setDetail] = useState<Booking | null>(null);

  useEffect(() => {
    api
      .getBookings()
      .then(setBookings)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!refCode) {
      setDetail(null);
      return;
    }
    let active = true;
    api
      .getBooking(refCode)
      .then((b) => {
        if (active) setDetail(b);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [refCode]);

  const selected = bookings.find((b) => b.reference_code === refCode) || null;
  const subject = refCode ? `Support request — booking ${refCode}` : 'Support request — Coastal Trails';
  const body = refCode
    ? `Hello Coastal Trails team,\n\nBooking ID: ${refCode}\nStay: ${selected?.homestay_title || ''}\nTravel dates: ${
        selected ? `${formatDate(selected.check_in)} to ${formatDate(selected.check_out)}` : ''
      }\n\nMy issue: `
    : 'Hello Coastal Trails team,\n\nMy issue: ';
  const mailto = `mailto:bookings@coastaltrails.in?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const hostWhatsApp = detail?.whatsapp_link || '';

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-tide">We're here to help</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Help &amp; Support
        </h1>
        <p className="mt-1 text-sm text-ink-2">Booking questions, host coordination and account help.</p>
      </div>

      {/* Online Support Portal Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-tide/30 bg-tide/5 p-6 shadow-sm">
        <div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-tide">Official Helpdesk</span>
          <h2 className="mt-1 font-display text-lg font-semibold text-ink">Coastal Support Ticket System</h2>
          <p className="mt-1 text-xs text-ink-2">
            File tracked tickets for booking disputes, refunds, host coordination, and get responses within 2–4 hours.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/support"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-tide px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-tide-2"
          >
            Raise a Ticket
          </Link>
          <Link
            to="/support?ticket="
            className="inline-flex h-10 items-center justify-center rounded-xl border border-line bg-elevated px-4 text-xs font-semibold text-ink transition-colors hover:bg-paper-2"
          >
            Track Tickets
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-line bg-elevated p-6 shadow-[0_1px_2px_rgba(22,34,46,0.04),0_20px_44px_-30px_rgba(22,34,46,0.3)]">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-tide/10 text-tide">
            <Mail className="h-5 w-5" />
          </span>
          <h2 className="mt-4 font-display text-lg font-semibold text-ink">Email support</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            For bookings, refunds and account issues. We reply from the booking inbox with your booking ID as reference.
          </p>
          <a
            href={mailto}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-tide px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-tide-2"
          >
            <Send className="h-4 w-4" />
            bookings@coastaltrails.in
          </a>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-ink-3">
            <Clock className="h-3 w-3" />
            Typical reply within a few hours, 9 AM – 9 PM IST
          </p>
        </div>

        <div className="rounded-3xl border border-line bg-elevated p-6 shadow-[0_1px_2px_rgba(22,34,46,0.04),0_20px_44px_-30px_rgba(22,34,46,0.3)]">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ok/10 text-ok">
            <MessageCircle className="h-5 w-5" />
          </span>
          <h2 className="mt-4 font-display text-lg font-semibold text-ink">WhatsApp your host</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            Fastest for arrival timing, directions and on-stay requests. Pick a booking to open the chat with its host.
          </p>
          {bookings.length > 0 ? (
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-ink">
                Booking
                <select
                  value={refCode}
                  onChange={(e) => setRefCode(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-line-2 bg-elevated px-3 text-sm text-ink focus:border-tide focus:outline-none"
                >
                  <option value="">Select a booking…</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.reference_code}>
                      {b.reference_code} · {b.homestay_title || 'Stay'} · {formatDate(b.check_in)}
                    </option>
                  ))}
                </select>
              </label>
              {hostWhatsApp ? (
                <a
                  href={hostWhatsApp}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ok px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <MessageCircle className="h-4 w-4" />
                  Open WhatsApp chat
                </a>
              ) : refCode ? (
                <p className="text-xs text-ink-3">Loading host contact…</p>
              ) : (
                <p className="text-xs text-ink-3">Your host's WhatsApp opens once a booking is selected.</p>
              )}
            </div>
          ) : (
            <p className="mt-4 text-xs text-ink-3">
              You have no bookings yet — the host chat appears here after your first reservation.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-elevated p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/10 text-gold">
            <LifeBuoy className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Frequently asked questions</h2>
            <p className="text-xs text-ink-3">Quick answers before you write in.</p>
          </div>
        </div>
        <div className="mt-5 divide-y divide-line">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base font-semibold text-ink">
                {faq.q}
                <span className="text-tide transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="rounded-xl border border-line bg-paper-2 px-4 py-3 text-xs text-ink-2">
        Looking for travel advice instead? Browse the{' '}
        <Link to="/gokarna/" className="font-semibold text-tide">
          Gokarna guide
        </Link>{' '}
        or the{' '}
        <Link to="/trails" className="font-semibold text-tide">
          Coastal Trails journal
        </Link>
        .
      </p>
    </div>
  );
}
