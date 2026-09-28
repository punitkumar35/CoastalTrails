import { Link } from 'react-router-dom';
import { ArrowRight, Clock, IndianRupee, LifeBuoy, ShieldCheck, Sparkles, Wallet } from 'lucide-react';

const planned = [
  {
    Icon: IndianRupee,
    title: 'Refund credits',
    text: 'Cancelled booking refunds land in your wallet instantly instead of waiting on the gateway timeline.',
  },
  {
    Icon: Sparkles,
    title: 'One-tap holds',
    text: 'Use your balance to pay the 20% online hold without re-entering payment details.',
  },
  {
    Icon: ShieldCheck,
    title: 'Transparent ledger',
    text: 'Every credit and debit is itemised and linked to the booking it came from.',
  },
];

export function ProfileWalletPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="overline mb-1">Account</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Wallet</h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/40 bg-warn/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-warn">
            <Clock className="h-3 w-3" />
            Coming soon
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-2">
          A prepaid Coastal Trails balance for refunds and faster checkout. This section is under development.
        </p>
      </div>

      <section className="rounded-2xl border border-line bg-elevated p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-tide-glow/15 text-tide">
              <Wallet className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-3">Available balance</p>
              <p className="mt-1 font-display text-3xl font-semibold text-ink-3">₹—</p>
              <p className="mt-0.5 text-xs text-ink-3">Activates when the wallet launches</p>
            </div>
          </div>
          <button
            type="button"
            disabled
            className="inline-flex h-11 cursor-not-allowed items-center justify-center rounded-xl bg-tide/40 px-5 text-sm font-semibold text-white"
          >
            Add money
          </button>
        </div>

        <p className="mt-6 rounded-xl border border-line bg-paper-2 px-4 py-3 text-xs text-ink-2">
          Until then, refunds for cancelled bookings are processed back to your original payment method — you can track
          them in{' '}
          <Link to="/profile/payments" className="font-semibold text-tide hover:underline">
            Payment History
          </Link>
          . No wallet balance is stored on your account today.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-elevated p-6 sm:p-8">
        <h2 className="font-display text-lg font-semibold text-ink">What the wallet will do</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {planned.map((item) => (
            <div key={item.title} className="rounded-xl border border-line bg-paper-2 p-5">
              <item.Icon className="h-4 w-4 text-tide" />
              <h3 className="mt-3 font-display text-base font-semibold text-ink">{item.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-2">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-paper-2 p-6">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">Need a refund update now?</h2>
          <p className="text-xs text-ink-2">Share your booking ID and we will check the status with the payment gateway.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/profile/payments"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line-2 bg-elevated px-4 text-sm font-semibold text-ink transition-colors hover:border-tide hover:text-tide"
          >
            <IndianRupee className="h-4 w-4" />
            Payment History
          </Link>
          <Link
            to="/profile/support"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-tide px-4 text-sm font-semibold text-white transition-colors hover:bg-tide-2"
          >
            <LifeBuoy className="h-4 w-4" />
            Contact support
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
