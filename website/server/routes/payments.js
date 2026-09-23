import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { all, get, run } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { sendPaymentFailedEmail, sendPaymentSuccessEmail } from '../services/mail.js';
import { sendPaymentWhatsApp, sendBookingWhatsApp, sendPaymentFailedWhatsApp } from '../utils/whatsapp.js';

const router = express.Router();

const ADVANCE_RATE = 0.2;

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

function canAccess(req, booking) {
  return booking.user_id === req.user.id || req.user.role === 'admin';
}

function verifySignature(orderId, paymentId, signature) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}

async function markBookingPaid(booking, payment, paymentId) {
  await run("UPDATE payments SET status = 'paid', provider_ref = ?, paid_at = NOW() WHERE id = ?", [
    paymentId,
    payment.id,
  ]);
  const paidRun = await run(
    `UPDATE bookings
     SET payment_status = 'paid', payment_id = ?, paid_at = NOW(),
         advance_paid = ?, balance_payable_at_property = ?,
         status = CASE WHEN status = 'pending_payment' THEN 'awaiting_host' ELSE status END
     WHERE id = ? AND payment_status != 'paid'`,
    [paymentId, payment.amount, Number(booking.total_amount) - Number(payment.amount), booking.id]
  );
  const updated = await get('SELECT * FROM bookings WHERE id = ?', [booking.id]);
  if (paidRun.changes > 0) void notifyBookingPaid(updated);
  return updated;
}

async function notifyBookingPaid(booking) {
  let stay = null;
  try {
    stay = await get(
      `SELECT h.title, h.location_display, h.host_name, h.host_whatsapp, h.rating, h.reviews_count,
              (SELECT image_url FROM homestay_images i WHERE i.homestay_id = h.id ORDER BY i.sort_order ASC LIMIT 1) AS image
       FROM homestays h WHERE h.id = ?`,
      [booking.homestay_id]
    );
  } catch (err) {
    console.error('[whatsapp] stay lookup failed:', err.message);
  }

  const bookingWhatsapp = await sendBookingWhatsApp(booking, stay);
  console.log(
    bookingWhatsapp.sent
      ? `WhatsApp booking confirmation sent to ${booking.user_phone} (${bookingWhatsapp.provider})`
      : `WhatsApp booking send failed for ${booking.user_phone}: ${bookingWhatsapp.reason}`
  );

  const paymentWhatsapp = await sendPaymentWhatsApp(booking, stay);
  console.log(
    paymentWhatsapp.sent
      ? `WhatsApp payment receipt sent to ${booking.user_phone} (${paymentWhatsapp.provider})`
      : `WhatsApp payment send failed for ${booking.user_phone}: ${paymentWhatsapp.reason}`
  );

  try {
    const user = await get('SELECT email FROM users WHERE id = ? OR phone = ?', [booking.user_id, booking.user_phone]);
    const to = user?.email || booking.user_email;
    if (!to) {
      console.log(`[mail] No email on file for booking ${booking.reference_code} — skipped.`);
      return;
    }
    await sendPaymentSuccessEmail({
      to,
      booking,
      stayTitle: stay?.title || 'Your stay',
      location: stay?.location_display || '',
      hostName: stay?.host_name || '',
      hostWhatsapp: stay?.host_whatsapp || '',
      stayImage: stay?.image || '',
      guestName: booking.user_name,
      rating: stay?.rating,
      reviews: stay?.reviews_count,
    });
  } catch (err) {
    console.error('[mail] Failed to send payment email:', err.message);
  }
}

async function markPaymentFailed(booking, payment) {
  await run("UPDATE payments SET status = 'failed' WHERE id = ?", [payment.id]);
  await run("UPDATE bookings SET payment_status = 'failed' WHERE id = ? AND payment_status = 'pending'", [booking.id]);
}

// POST /api/payments/:bookingId/initiate
// Creates a Razorpay Order for the 20% advance hold.
router.post('/:bookingId/initiate', requireAuth, async (req, res) => {
  try {
    const booking = await get('SELECT * FROM bookings WHERE id = ? OR reference_code = ?', [
      req.params.bookingId,
      req.params.bookingId,
    ]);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!canAccess(req, booking)) return res.status(403).json({ error: 'You can only pay for your own booking.' });
    if (booking.payment_status === 'paid') return res.status(409).json({ error: 'This booking is already paid.' });
    if (!['pending_payment', 'awaiting_host'].includes(booking.status)) {
      return res.status(409).json({ error: `This booking cannot be paid (status: ${booking.status}).` });
    }

    const amount = Math.round(Number(booking.total_amount) * ADVANCE_RATE);
    const amountPaise = amount * 100;

    let payment = await get(
      "SELECT * FROM payments WHERE booking_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
      [booking.id]
    );

    let orderId = payment?.provider_ref ?? null;
    if (!payment || !orderId) {
      const order = await rzp.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: booking.reference_code,
        notes: { booking_id: booking.id, homestay_id: booking.homestay_id, guest: booking.user_name },
      });
      orderId = order.id;
    }

    if (!payment) {
      const paymentId = `pay-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      await run(
        `INSERT INTO payments (id, booking_id, amount, method, status, provider, provider_ref)
         VALUES (?, ?, ?, 'razorpay', 'pending', 'razorpay', ?)`,
        [paymentId, booking.id, amount, orderId]
      );
      payment = await get('SELECT * FROM payments WHERE id = ?', [paymentId]);
    } else if (Number(payment.amount) !== amount) {
      await run('UPDATE payments SET amount = ? WHERE id = ?', [amount, payment.id]);
      payment = await get('SELECT * FROM payments WHERE id = ?', [payment.id]);
    }

    res.status(201).json({
      ...payment,
      order_id: orderId,
      key_id: process.env.RAZORPAY_KEY_ID,
      amount_paise: amountPaise,
      booking_reference: booking.reference_code,
      customer: { name: booking.user_name, phone: booking.user_phone },
    });
  } catch (err) {
    console.error('Razorpay initiate error:', err?.error?.description || err.message);
    res.status(500).json({ error: 'Could not start the payment. Please try again.' });
  }
});

// POST /api/payments/:bookingId/confirm
// Verifies signature + captured payment, capturing 'authorized' payments first.
router.post('/:bookingId/confirm', requireAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing Razorpay verification fields.' });
    }

    const booking = await get('SELECT * FROM bookings WHERE id = ? OR reference_code = ?', [
      req.params.bookingId,
      req.params.bookingId,
    ]);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!canAccess(req, booking)) return res.status(403).json({ error: 'You can only pay for your own booking.' });
    if (booking.payment_status === 'paid') {
      return res.json({ booking, payment: null, already_paid: true });
    }

    const payment = await get(
      "SELECT * FROM payments WHERE booking_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
      [booking.id]
    );
    if (!payment) return res.status(409).json({ error: 'Please start the payment before confirming it.' });

    if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      await markPaymentFailed(booking, payment);
      return res.status(400).json({ error: 'Payment signature verification failed.' });
    }

    let rzpPayment = await rzp.payments.fetch(razorpay_payment_id);

    // Some live payment methods arrive as 'authorized' (auto-capture off).
    // Capture them now so the hold is actually charged.
    if (rzpPayment.status === 'authorized') {
      rzpPayment = await rzp.payments.capture(razorpay_payment_id, rzpPayment.amount);
    }

    if (rzpPayment.status !== 'captured') {
      return res.status(400).json({ error: `Payment is not captured (status: ${rzpPayment.status}).` });
    }
    if (Number(rzpPayment.amount) !== Math.round(Number(payment.amount) * 100)) {
      return res.status(400).json({ error: 'Payment amount mismatch.' });
    }

    const updated = await markBookingPaid(booking, payment, razorpay_payment_id);
    res.json({ booking: updated, payment: { ...payment, status: 'paid', provider_ref: razorpay_payment_id } });
  } catch (err) {
    console.error('Razorpay confirm error:', err?.error?.description || err.message);
    res.status(500).json({ error: 'Could not verify the payment. Please try again.' });
  }
});

// POST /api/payments/:bookingId/sync
// Reconciles a pending booking against Razorpay — used when the browser
// flow died mid-payment or the traveler closed the checkout.
router.post('/:bookingId/sync', requireAuth, async (req, res) => {
  try {
    const booking = await get('SELECT * FROM bookings WHERE id = ? OR reference_code = ?', [
      req.params.bookingId,
      req.params.bookingId,
    ]);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!canAccess(req, booking)) return res.status(403).json({ error: 'You can only sync your own booking.' });
    if (booking.payment_status === 'paid') return res.json({ booking, synced: 'paid', already_paid: true });

    const payment = await get(
      "SELECT * FROM payments WHERE booking_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
      [booking.id]
    );
    if (!payment || !payment.provider_ref) return res.json({ booking, synced: 'pending' });

    const orderPayments = await rzp.orders.fetchPayments(payment.provider_ref);
    const items = orderPayments?.items || [];
    const captured = items.find((p) => p.status === 'captured');
    if (captured) {
      const updated = await markBookingPaid(booking, payment, captured.id);
      return res.json({ booking: updated, synced: 'paid' });
    }
    const failed = items.find((p) => p.status === 'failed');
    if (failed) {
      await markPaymentFailed(booking, payment);
      const updated = await get('SELECT * FROM bookings WHERE id = ?', [booking.id]);
      return res.json({ booking: updated, synced: 'failed' });
    }
    return res.json({ booking, synced: 'pending' });
  } catch (err) {
    console.error('Razorpay sync error:', err?.error?.description || err.message);
    res.status(500).json({ error: 'Could not sync the payment right now.' });
  }
});

// POST /api/payments/:bookingId/fail
// Traveler explicitly abandoned or the gateway declined.
router.post('/:bookingId/fail', requireAuth, async (req, res) => {
  try {
    const booking = await get('SELECT * FROM bookings WHERE id = ? OR reference_code = ?', [
      req.params.bookingId,
      req.params.bookingId,
    ]);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!canAccess(req, booking)) return res.status(403).json({ error: 'You can only manage your own booking.' });

    const payment = await get(
      "SELECT * FROM payments WHERE booking_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
      [booking.id]
    );
    if (payment) await markPaymentFailed(booking, payment);

    const updated = await get('SELECT * FROM bookings WHERE id = ?', [booking.id]);
    void (async () => {
      let stay = null;
      try {
        stay = await get(
          `SELECT h.title, h.location_display, h.host_name, h.rating, h.reviews_count,
                  (SELECT image_url FROM homestay_images i WHERE i.homestay_id = h.id ORDER BY i.sort_order ASC LIMIT 1) AS image
           FROM homestays h WHERE h.id = ?`,
          [booking.homestay_id]
        );
      } catch (err) {
        console.error('[whatsapp] stay lookup failed:', err.message);
      }

      const failedWhatsapp = await sendPaymentFailedWhatsApp(updated, stay);
      console.log(
        failedWhatsapp.sent
          ? `WhatsApp payment-pending notice sent to ${updated.user_phone} (${failedWhatsapp.provider})`
          : `WhatsApp payment-pending send failed for ${updated.user_phone}: ${failedWhatsapp.reason}`
      );

      try {
        const user = await get('SELECT email FROM users WHERE id = ? OR phone = ?', [booking.user_id, booking.user_phone]);
        const to = user?.email || booking.user_email;
        if (to) {
          await sendPaymentFailedEmail({
            to,
            booking: updated,
            stayTitle: stay?.title || 'Your stay',
            location: stay?.location_display || '',
            hostName: stay?.host_name || '',
            stayImage: stay?.image || '',
            guestName: updated.user_name,
            rating: stay?.rating,
            reviews: stay?.reviews_count,
          });
        }
      } catch (err) {
        console.error('[mail] failed-payment notify error:', err.message);
      }
    })();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Could not update the payment right now.' });
  }
});

// GET /api/payments/:bookingId - payment history for a booking (owner or admin)
router.get('/:bookingId', requireAuth, async (req, res) => {
  try {
    const booking = await get('SELECT id, user_id FROM bookings WHERE id = ? OR reference_code = ?', [
      req.params.bookingId,
      req.params.bookingId,
    ]);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!canAccess(req, booking)) return res.status(403).json({ error: 'You can only view your own payments.' });

    const payments = await all('SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC', [booking.id]);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/razorpay-webhook
// Server-side truth: Razorpay pushes payment.captured / payment.failed events.
// Configure this URL in the Razorpay dashboard (requires a public HTTPS URL).
router.post('/razorpay-webhook', async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const raw = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
    if (!secret) return res.status(400).json({ error: 'Webhook secret not configured.' });
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    if (!signature || signature !== expected) {
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const entity = event?.payload?.payment?.entity || {};
    const orderId = entity.order_id;
    if (!orderId) return res.json({ ok: true });

    const payment = await get("SELECT * FROM payments WHERE provider_ref = ? AND status = 'pending' LIMIT 1", [orderId]);
    if (!payment) return res.json({ ok: true });
    const booking = await get('SELECT * FROM bookings WHERE id = ?', [payment.booking_id]);
    if (!booking) return res.json({ ok: true });

    if (event.event === 'payment.captured') {
      if (booking.payment_status !== 'paid') {
        await markBookingPaid(booking, payment, entity.id);
        console.log(`Webhook: booking ${booking.reference_code} marked paid.`);
      }
    } else if (event.event === 'payment.failed') {
      await markPaymentFailed(booking, payment);
      console.log(`Webhook: booking ${booking.reference_code} payment failed.`);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
