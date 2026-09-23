import express from 'express';
import { all, get, run } from '../db/index.js';
import { expireStaleHolds, getRoomsLeftMap, eachNight, localTodayISO, localDateTime, pickRoomForStay } from '../db/availability.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  sendAdminNewBookingAlert,
  sendBookingStatusEmail,
  sendHoldCreatedEmail,
} from '../services/mail.js';

const router = express.Router();

const HOLD_HOURS = 24;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function notifyBookingCreated(booking, stay, userEmail) {
  try {
    const imageRow = await get(
      'SELECT image_url FROM homestay_images WHERE homestay_id = ? ORDER BY sort_order ASC LIMIT 1',
      [booking.homestay_id]
    );
    const stayImage = imageRow?.image_url || '';
    const to = userEmail || booking.user_email;
    if (to) {
      await sendHoldCreatedEmail({
        to,
        booking,
        stayTitle: stay?.title || 'Your stay',
        location: stay?.location_display || '',
        hostName: stay?.host_name || '',
        stayImage,
        guestName: booking.user_name,
        rating: stay?.rating,
        reviews: stay?.reviews_count,
      });
    }
    const adminEmail = process.env.MAIL_ADMIN || process.env.SMTP_USER;
    if (adminEmail) {
      await sendAdminNewBookingAlert({
        to: adminEmail,
        booking,
        stayTitle: stay?.title || 'Stay',
        location: stay?.location_display || '',
        hostName: stay?.host_name || '',
        stayImage,
        guestName: booking.user_name,
        rating: stay?.rating,
        reviews: stay?.reviews_count,
      });
    }
  } catch (err) {
    console.error('[mail] booking create notify failed:', err.message);
  }
}

async function notifyStatusChange(booking, status) {
  if (!['confirmed', 'declined', 'cancelled'].includes(status)) return;
  try {
    const user = await get('SELECT email FROM users WHERE id = ? OR phone = ?', [booking.user_id, booking.user_phone]);
    const stay = await get(
      `SELECT h.title, h.location_display, h.host_name, h.host_whatsapp, h.rating, h.reviews_count,
              (SELECT image_url FROM homestay_images i WHERE i.homestay_id = h.id ORDER BY i.sort_order ASC LIMIT 1) AS image
       FROM homestays h WHERE h.id = ?`,
      [booking.homestay_id]
    );
    const to = user?.email || booking.user_email;
    if (!to) return;
    await sendBookingStatusEmail({
      to,
      booking,
      stayTitle: stay?.title || 'Your stay',
      location: stay?.location_display || '',
      hostName: stay?.host_name || '',
      stayImage: stay?.image || '',
      status,
      guestName: booking.user_name,
      rating: stay?.rating,
      reviews: stay?.reviews_count,
    });
  } catch (err) {
    console.error('[mail] status notify failed:', err.message);
  }
}

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
    res.json(bookings);
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
    res.json(booking);
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

    // Generate pre-filled WhatsApp link for direct host pinging
    const hostWhatsAppDigits = homestay.host_whatsapp.replace(/\D/g, '');
    const waText = encodeURIComponent(
      `Namaskara ${homestay.host_name}! New stay request from Coastal Trails:\n` +
      `• Ref: ${reference_code}\n` +
      `• Guest: ${user_name} (${user_phone})\n` +
      `• Dates: ${check_in} to ${check_out} (${nights} night(s))\n` +
      `• Advance Paid: ₹${advance_paid} (20% hold)\n` +
      `• Balance Due on Arrival: ₹${balance_payable_at_property}\n` +
      `Please reply 1 to CONFIRM or 2 to DECLINE.`
    );
    const whatsappLink = `https://wa.me/${hostWhatsAppDigits}?text=${waText}`;

    const created = await get('SELECT * FROM bookings WHERE id = ?', [id]);
    void (async () => {
      try {
        const user = await get('SELECT email FROM users WHERE id = ?', [req.user.id]);
        await notifyBookingCreated(created, homestay, user?.email || created.user_email);
      } catch (err) {
        console.error('[mail] create notify failed:', err.message);
      }
    })();
    res.status(201).json({
      ...created,
      nights,
      homestay_title: homestay.title,
      host_name: homestay.host_name,
      host_whatsapp: homestay.host_whatsapp,
      whatsapp_link: whatsappLink
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
    void notifyStatusChange(updated, status);
    res.json(updated);
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
    void notifyStatusChange(updated, 'cancelled');
    res.json({
      ...updated,
      refund_note: wasPaid ? 'Your 20% hold will be returned to the original payment method.' : 'No payment was captured.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not cancel the booking right now. Please try again.' });
  }
});

export default router;
