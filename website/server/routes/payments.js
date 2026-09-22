import express from 'express';
import crypto from 'crypto';
import { all, get, run } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { guestWhatsAppLink, hostWhatsAppLink, bookingWhatsAppText, sendWhatsApp, whatsAppProviderConfigured } from '../utils/whatsapp.js';

const router = express.Router();

const METHODS = ['upi', 'card', 'netbanking'];
const ADVANCE_RATE = 0.2;

function canAccess(req, booking) {
  return booking.user_id === req.user.id || req.user.role === 'admin';
}

// POST /api/payments/:bookingId/initiate
// Creates (or reuses) a pending payment record for the 20% hold.
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

    const method = METHODS.includes(req.body?.method) ? req.body.method : 'upi';
    const amount = Math.round(booking.total_amount * ADVANCE_RATE);

    let payment = await get(
      "SELECT * FROM payments WHERE booking_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
      [booking.id]
    );

    if (!payment) {
      const paymentId = `pay-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      await run(
        `INSERT INTO payments (id, booking_id, amount, method, status, provider) VALUES (?, ?, ?, ?, 'pending', 'mock')`,
        [paymentId, booking.id, amount, method]
      );
      payment = await get('SELECT * FROM payments WHERE id = ?', [paymentId]);
    } else if (payment.method !== method || Number(payment.amount) !== amount) {
      await run('UPDATE payments SET method = ?, amount = ? WHERE id = ?', [method, amount, payment.id]);
      payment = await get('SELECT * FROM payments WHERE id = ?', [payment.id]);
    }

    res.status(201).json({
      ...payment,
      booking_reference: booking.reference_code,
      note: 'Simulated gateway — confirm the payment so the server can verify it.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not start the payment. Please try again.' });
  }
});

// POST /api/payments/:bookingId/confirm
// Simulated gateway verification. A real gateway would validate a signature or
// webhook here before the server marks money as received.
router.post('/:bookingId/confirm', requireAuth, async (req, res) => {
  try {
    const booking = await get('SELECT * FROM bookings WHERE id = ? OR reference_code = ?', [
      req.params.bookingId,
      req.params.bookingId,
    ]);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!canAccess(req, booking)) return res.status(403).json({ error: 'You can only pay for your own booking.' });
    if (booking.payment_status === 'paid') return res.status(409).json({ error: 'This booking is already paid.' });

    const payment = await get(
      "SELECT * FROM payments WHERE booking_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
      [booking.id]
    );
    if (!payment) return res.status(409).json({ error: 'Please start the payment before confirming it.' });

    const providerRef = `MOCK-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    await run("UPDATE payments SET status = 'paid', provider_ref = ?, paid_at = NOW() WHERE id = ?", [providerRef, payment.id]);
    await run(
      `UPDATE bookings
       SET payment_status = 'paid', payment_id = ?, paid_at = NOW(),
           advance_paid = ?, balance_payable_at_property = ?,
           status = CASE WHEN status = 'pending_payment' THEN 'awaiting_host' ELSE status END
       WHERE id = ?`,
      [providerRef, payment.amount, Number(booking.total_amount) - Number(payment.amount), booking.id]
    );

    const updated = await get('SELECT * FROM bookings WHERE id = ?', [booking.id]);
    const stay = await get('SELECT title, location_display, host_name, host_whatsapp FROM homestays WHERE id = ?', [booking.homestay_id]);

    // Booking is paid and sent to the host — deliver the details to the guest's WhatsApp.
    const message = bookingWhatsAppText(updated, stay);
    let whatsapp = { sent: false, reason: 'provider not configured' };
    if (whatsAppProviderConfigured()) {
      whatsapp = await sendWhatsApp(updated.user_phone, message);
      console.log(
        whatsapp.sent
          ? `WhatsApp booking details sent to ${updated.user_phone}`
          : `WhatsApp send failed for ${updated.user_phone}: ${whatsapp.reason}`
      );
    }

    const guestLink = guestWhatsAppLink(updated, stay);
    const hostLink = hostWhatsAppLink(updated, stay);

    res.json({
      booking: { ...updated, guest_whatsapp_link: guestLink, whatsapp_link: hostLink },
      payment: { ...payment, status: 'paid', provider_ref: providerRef },
      whatsapp,
      guest_whatsapp_link: guestLink,
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not verify the payment. Please try again.' });
  }
});

// POST /api/payments/:bookingId/fail
// The traveler abandoned or the simulated gateway declined the payment.
router.post('/:bookingId/fail', requireAuth, async (req, res) => {
  try {
    const booking = await get('SELECT * FROM bookings WHERE id = ? OR reference_code = ?', [
      req.params.bookingId,
      req.params.bookingId,
    ]);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!canAccess(req, booking)) return res.status(403).json({ error: 'You can only manage your own booking.' });

    await run(
      "UPDATE payments SET status = 'failed' WHERE booking_id = ? AND status = 'pending'",
      [booking.id]
    );
    await run("UPDATE bookings SET payment_status = 'failed' WHERE id = ? AND payment_status = 'pending'", [booking.id]);

    const updated = await get('SELECT * FROM bookings WHERE id = ?', [booking.id]);
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

export default router;
