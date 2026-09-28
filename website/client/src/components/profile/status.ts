export interface StatusMeta {
  label: string;
  className: string;
}

const tones = {
  neutral: 'border-line-2 bg-paper-2 text-ink-3',
  tide: 'border-tide/30 bg-tide/10 text-tide',
  ok: 'border-ok/30 bg-ok/10 text-ok',
  warn: 'border-warn/30 bg-warn/10 text-warn',
  gold: 'border-gold/30 bg-gold/10 text-gold',
  err: 'border-err/30 bg-err/10 text-err',
};

export function bookingStatusMeta(status: string): StatusMeta {
  switch (status) {
    case 'pending_payment':
      return { label: 'Pending payment', className: tones.warn };
    case 'awaiting_host':
      return { label: 'Awaiting host', className: tones.gold };
    case 'confirmed':
      return { label: 'Confirmed', className: tones.ok };
    case 'checked_in':
      return { label: 'Checked in', className: tones.tide };
    case 'completed':
      return { label: 'Completed', className: tones.neutral };
    case 'declined':
      return { label: 'Declined', className: tones.err };
    case 'cancelled':
      return { label: 'Cancelled', className: tones.err };
    case 'expired':
      return { label: 'Expired', className: tones.err };
    default:
      return { label: status, className: tones.neutral };
  }
}

export function paymentStatusMeta(status?: string | null): StatusMeta {
  switch (status) {
    case 'paid':
      return { label: 'Paid', className: tones.ok };
    case 'partially_paid':
      return { label: 'Partially paid', className: tones.gold };
    case 'pending':
      return { label: 'Payment pending', className: tones.warn };
    case 'failed':
      return { label: 'Failed', className: tones.err };
    case 'refunded':
      return { label: 'Refunded', className: tones.tide };
    default:
      return { label: status || 'Payment pending', className: tones.neutral };
  }
}

export function paymentRecordStatusMeta(status: string): StatusMeta {
  switch (status) {
    case 'paid':
      return { label: 'Paid', className: tones.ok };
    case 'pending':
      return { label: 'Pending', className: tones.warn };
    case 'failed':
      return { label: 'Failed', className: tones.err };
    case 'refunded':
      return { label: 'Refunded', className: tones.tide };
    default:
      return { label: status, className: tones.neutral };
  }
}

export function bookingIsUpcoming(status: string) {
  return ['awaiting_host', 'confirmed', 'checked_in'].includes(status);
}

export function bookingIsCancelled(status: string) {
  return ['cancelled', 'declined', 'expired'].includes(status);
}

export function canCancelBooking(booking: { status: string; check_in: string }) {
  if (!bookingIsUpcoming(booking.status)) return false;
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return booking.check_in > iso;
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(String(value).slice(0, 10).replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatINR(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

export function nightsBetween(checkIn: string, checkOut: string) {
  const a = new Date(`${checkIn}T00:00:00`);
  const b = new Date(`${checkOut}T00:00:00`);
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}
