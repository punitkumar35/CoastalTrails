import express from 'express';
import { all, get, run } from '../db/index.js';
import { expireStaleHolds, getRoomsLeftMap, eachNight, localTodayISO, localDateTime, pickRoomForStay } from '../db/availability.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { guestWhatsAppLink, hostWhatsAppLink, bookingWhatsAppText, sendWhatsApp, whatsAppProviderConfigured } from '../utils/whatsapp.js';

const router = express.Router();

const HOLD_HOURS = 24;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function prettyDate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return m >= 1 && m <= 12 ? `${d} ${MONTHS[m - 1]} ${y}` : iso;
}

// Helper to generate readable Gokarna booking reference like GK-839201
function generateRefCode() {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `GK-${num}`;
}

// GET /api/bookings - the logged-in traveler's own bookings only
router.get('/', requireAuth, async (req, res) => {
  try {
    await expireStaleHolds();
    const bookings = await all(
      `SELECT b.*, h.title as homestay_title, h.location_display, h.host_name, h.host_whatsapp
       FROM bookings b
       LEFT JOIN homestays h ON b.homestay_id = h.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(
      bookings.map((b) => ({
        ...b,
        guest_whatsapp_link: guestWhatsAppLink(b, { title: b.homestay_title, location_display: b.location_display, host_name: b.host_name, host_whatsapp: b.host_whatsapp }),
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/:id - owner (or admin) only
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const booking = await get(`
      SELECT b.*, h.title as homestay_title, h.location_display, h.host_name, h.host_whatsapp
      FROM bookings b
      LEFT JOIN homestays h ON b.homestay_id = h.id
      WHERE b.id = ? OR b.reference_code = ?
    `, [req.params.id, req.params.id]);

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only view your own bookings.' });
    }
    res.json({
      ...booking,
      whatsapp_link: hostWhatsAppLink(booking, {
        title: booking.homestay_title,
        location_display: booking.location_display,
        host_name: booking.host_name,
        host_whatsapp: booking.host_whatsapp,
      }),
      guest_whatsapp_link: guestWhatsAppLink(booking, {
        title: booking.homestay_title,
        location_display: booking.location_display,
        host_name: booking.host_name,
        host_whatsapp: booking.host_whatsapp,
      }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings - Create new booking with 20% advance calculation
// The author of the booking is the authenticated user — never the browser payload.
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      homestay_id,
      check_in,
      check_out,
      guests_count = 1,
    } = req.body;

    const user_name = req.user.name;
    const user_phone = req.user.phone;

    if (!homestay_id || !check_in || !check_out) {
      return res.status(400).json({ error: 'Missing required booking details' });
    }

    // Reject malformed or past dates — today is the earliest possible check-in
    const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoPattern.test(check_in) || !isoPattern.test(check_out)) {
      return res.status(400).json({ error: 'Dates must use the YYYY-MM-DD format' });
    }
    const today = localTodayISO();
    if (check_in < today) {
      return res.status(400).json({ error: 'Check-in cannot be in the past. Pick today or a future date.' });
    }
    if (check_out <= check_in) {
      return res.status(400).json({ error: 'Check-out must be after check-in (minimum one night).' });
    }

    const homestay = await get('SELECT * FROM homestays WHERE id = ?', [homestay_id]);
    if (!homestay) {
      return res.status(404).json({ error: 'Homestay does not exist' });
    }

    if (!homestay.availability_listed) {
      return res.status(409).json({
        error: "This stay isn't accepting bookings yet — the host hasn't published room availability.",
      });
    }

    // Live availability: stale holds expire first, then count rooms left per night
    await expireStaleHolds();
    const availability = await getRoomsLeftMap(homestay_id, check_in, check_out);
    const soldOutDates = eachNight(check_in, check_out).filter((d) => (availability.dates[d] ?? 0) <= 0);

    if (soldOutDates.length > 0) {
      return res.status(409).json({
        error: `No rooms left on ${soldOutDates.map(prettyDate).join(', ')}. Please select other dates.`,
        conflicts: soldOutDates,
      });
    }

    // Calculate nights
    const start = new Date(check_in);
    const end = new Date(check_out);
    const diffTime = Math.abs(end - start);
    const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Tariff calculation: 20% online advance, 80% direct to host
    // Base rate covers 2 guests; each extra guest adds 400/night.
    // NOTE: nothing is marked as paid until the payment is verified.
    const extraGuests = Math.max(0, (guests_count || 2) - 2);
    const total_amount = (homestay.price_per_night + extraGuests * 400) * nights;
    const advance_paid = 0;
    const balance_payable_at_property = total_amount;

    const id = `bk-${Date.now()}`;
    const reference_code = generateRefCode();
    // Unconfirmed holds release the rooms automatically after 24 hours
    const hold_expires_at = localDateTime(Date.now() + HOLD_HOURS * 60 * 60 * 1000);

    // Persist the room this booking occupies so the admin board and the
    // traveler availability always agree on the same room mapping.
    const assignedRoom = await pickRoomForStay(homestay_id, check_in, check_out, homestay.total_rooms);

    await run(
      `INSERT INTO bookings 
        (id, reference_code, homestay_id, user_id, user_name, user_phone, check_in, check_out, guests_count, total_amount, advance_paid, balance_payable_at_property, status, payment_status, hold_expires_at, room_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', 'pending', ?, ?)`,
      [
        id,
        reference_code,
        homestay_id,
        req.user.id,
        user_name,
        user_phone,
        check_in,
        check_out,
        guests_count,
        total_amount,
        advance_paid,
        balance_payable_at_property,
        hold_expires_at,
        assignedRoom
      ]
    );

    // Availability is computed live from active bookings, so no static date rows are written.

    const created = await get('SELECT * FROM bookings WHERE id = ?', [id]);
    res.status(201).json({
      ...created,
      nights,
      homestay_title: homestay.title,
      host_name: homestay.host_name,
      host_whatsapp: homestay.host_whatsapp,
      whatsapp_link: hostWhatsAppLink(created, homestay),
      guest_whatsapp_link: guestWhatsAppLink(created, homestay),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/bookings/:id/status - host decisions are made from the admin console
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending_payment', 'awaiting_host', 'confirmed', 'checked_in', 'completed', 'declined', 'cancelled', 'expired'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${valid.join(', ')}` });
    }

    await run('UPDATE bookings SET status = ? WHERE id = ? OR reference_code = ?', [status, req.params.id, req.params.id]);

    // Cancelling or declining a paid booking records a refund
    if (status === 'cancelled' || status === 'declined') {
      const booking = await get('SELECT * FROM bookings WHERE id = ? OR reference_code = ?', [req.params.id, req.params.id]);
      if (booking && booking.payment_status === 'paid') {
        await run("UPDATE bookings SET payment_status = 'refunded' WHERE id = ?", [booking.id]);
        await run(
          "UPDATE payments SET status = 'refunded', refunded_at = NOW() WHERE booking_id = ? AND status = 'paid'",
          [booking.id]
        );
      }
    }

    const updated = await get('SELECT * FROM bookings WHERE id = ? OR reference_code = ?', [req.params.id, req.params.id]);
    const stay = updated ? await get('SELECT title, location_display, host_name, host_whatsapp FROM homestays WHERE id = ?', [updated.homestay_id]) : null;

    // When the host confirms, the traveler gets the full booking details on WhatsApp
    if (updated && status === 'confirmed') {
      const text = bookingWhatsAppText(updated, stay);
      if (whatsAppProviderConfigured()) {
        const result = await sendWhatsApp(updated.user_phone, text);
        console.log(result.sent ? `WhatsApp confirmation sent to ${updated.user_phone}` : `WhatsApp send failed: ${result.reason}`);
      }
    }

    res.json({ ...updated, guest_whatsapp_link: updated ? guestWhatsAppLink(updated, stay) : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings/:id/cancel - the traveler cancels their own booking
router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const booking = await get('SELECT * FROM bookings WHERE id = ? OR reference_code = ?', [req.params.id, req.params.id]);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only cancel your own booking.' });
    }
    if (!['pending_payment', 'awaiting_host', 'confirmed'].includes(booking.status)) {
      return res.status(409).json({ error: `This booking cannot be cancelled (status: ${booking.status}).` });
    }
    if (booking.check_in <= localTodayISO()) {
      return res.status(409).json({ error: 'Stays can only be cancelled before the check-in date. Please contact the host.' });
    }

    const wasPaid = booking.payment_status === 'paid';
    await run(
      `UPDATE bookings SET status = 'cancelled', payment_status = ?, hold_expires_at = NULL WHERE id = ?`,
      [wasPaid ? 'refunded' : booking.payment_status, booking.id]
    );
    if (wasPaid) {
      await run("UPDATE payments SET status = 'refunded', refunded_at = NOW() WHERE booking_id = ? AND status = 'paid'", [
        booking.id,
      ]);
    }

    const updated = await get('SELECT * FROM bookings WHERE id = ?', [booking.id]);
    res.json({
      ...updated,
      refund_note: wasPaid ? 'Your 20% hold will be returned to the original payment method.' : 'No payment was captured.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not cancel the booking right now. Please try again.' });
  }
});

export default router;
