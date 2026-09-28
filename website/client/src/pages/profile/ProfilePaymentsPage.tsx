import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IndianRupee, Receipt, RotateCcw } from 'lucide-react';
import { formatDateTime, formatINR, paymentRecordStatusMeta } from '../../components/profile/status';
import { api } from '../../services/api';
import type { BookingPayment } from '../../types';

export function ProfilePaymentsPage() {
  const [payments, setPayments] = useState<BookingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getMyPayments()
      .then(setPayments)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your payments.'))
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => {
    let paid = 0;
    let refunded = 0;
    for (const p of payments) {
      if (p.status === 'paid') paid += Number(p.amount) || 0;
      if (p.status === 'refunded') refunded += Number(p.amount) || 0;
    }
    return { paid, refunded };
  }, [payments]);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-tide">Transactions</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Payment History
        </h1>
        <p className="mt-1 text-sm text-ink-2">
          Gateway records linked to your bookings. Refunds show only once processed.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-elevated p-5 shadow-[0_1px_2px_rgba(22,34,46,0.04),0_16px_32px_-24px_rgba(22,34,46,0.25)]">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ok/10 text-ok">
            <IndianRupee className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-3">Total spent</p>
            <p className="mt-0.5 font-display text-2xl font-semibold text-ink">{formatINR(totals.paid)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-elevated p-5 shadow-[0_1px_2px_rgba(22,34,46,0.04),0_16px_32px_-24px_rgba(22,34,46,0.25)]">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-tide/10 text-tide">
            <RotateCcw className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-3">Total refunded</p>
            <p className="mt-0.5 font-display text-2xl font-semibold text-ink">{formatINR(totals.refunded)}</p>
          </div>
        </div>
      </section>

      {error ? <p className="text-sm font-medium text-err">{error}</p> : null}

      {loading ? (
        <div className="h-40 animate-pulse rounded-3xl border border-line bg-paper-2" />
      ) : payments.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-line bg-elevated px-6 py-14 text-center">
          <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-tide-glow/15 blur-3xl" />
          <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-tide/10 text-tide">
            <Receipt className="h-6 w-6" />
          </span>
          <h3 className="relative mt-4 font-display text-lg font-semibold text-ink">No payments yet</h3>
          <p className="relative mx-auto mt-1.5 max-w-sm text-sm text-ink-2">
            When you pay a booking hold online, the transaction will appear here with its status and refund details.
          </p>
          <Link
            to="/"
            className="relative mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-tide px-6 text-sm font-semibold text-white transition-colors hover:bg-tide-2"
          >
            Explore stays
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-3xl border border-line bg-elevated shadow-sm md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-2 text-left">
                  <th className="px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                    Booking
                  </th>
                  <th className="px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                    Destination
                  </th>
                  <th className="px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                    Date
                  </th>
                  <th className="px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                    Method
                  </th>
                  <th className="px-5 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {payments.map((p) => {
                  const status = paymentRecordStatusMeta(p.status);
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-paper-2/60">
                      <td className="px-5 py-4">
                        {p.reference_code ? (
                          <Link
                            to={`/profile/bookings/${p.reference_code}`}
                            className="font-semibold text-tide hover:underline"
                          >
                            {p.reference_code}
                          </Link>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                        <p className="mt-0.5 font-mono text-[10px] text-ink-3">{p.id}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-ink">{p.homestay_title || 'Stay'}</p>
                        <p className="text-xs text-ink-3">{p.location_display || 'Gokarna'}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-ink-2">
                        {formatDateTime(p.created_at)}
                        {p.refunded_at ? (
                          <p className="mt-0.5 text-[11px] text-tide">Refunded {formatDateTime(p.refunded_at)}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-xs font-medium uppercase text-ink-2">
                        {p.method || '—'}
                        {p.provider_ref ? <p className="mt-0.5 text-[10px] normal-case text-ink-3">{p.provider_ref}</p> : null}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-ink">{formatINR(p.amount)}</td>
                      <td className="px-5 py-4 text-right">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {payments.map((p) => {
              const status = paymentRecordStatusMeta(p.status);
              return (
                <article key={p.id} className="rounded-2xl border border-line bg-elevated p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-lg font-semibold text-ink">{formatINR(p.amount)}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-3">
                        {p.homestay_title || 'Stay'}
                        {p.location_display ? ` · ${p.location_display}` : ''}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-ink-3">
                    {p.method ? `${p.method.toUpperCase()} · ` : ''}
                    {formatDateTime(p.created_at)}
                    {p.refunded_at ? ` · Refunded ${formatDateTime(p.refunded_at)}` : ''}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-ink-3">Payment ID {p.id}</p>
                  {p.reference_code ? (
                    <Link
                      to={`/profile/bookings/${p.reference_code}`}
                      className="mt-3 inline-flex h-9 items-center justify-center rounded-lg border border-line-2 bg-elevated px-3.5 text-xs font-semibold text-ink transition-colors hover:border-tide hover:text-tide"
                    >
                      View booking {p.reference_code}
                    </Link>
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      )}

      <p className="rounded-xl border border-line bg-paper-2 px-4 py-3 text-xs text-ink-2">
        Invoices: your booking confirmation email includes the reservation summary. For a formal invoice, contact{' '}
        <a className="font-semibold text-tide" href="mailto:bookings@coastaltrails.in">
          bookings@coastaltrails.in
        </a>{' '}
        with your booking ID.
      </p>
    </div>
  );
}
