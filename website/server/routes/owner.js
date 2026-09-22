import express from 'express';
import { all, get, run } from '../db/index.js';

const router = express.Router();

function digits(s) {
  return String(s || '').replace(/\D/g, '');
}

async function enrich(stay) {
  const images = await all('SELECT image_url FROM homestay_images WHERE homestay_id = ? ORDER BY sort_order ASC', [stay.id]);
  const amenities = await all('SELECT amenity FROM homestay_amenities WHERE homestay_id = ?', [stay.id]);
  const badges = await all('SELECT badge FROM homestay_badges WHERE homestay_id = ?', [stay.id]);
  const blocked = await all('SELECT blocked_date, reason FROM room_unavailability WHERE homestay_id = ? ORDER BY blocked_date ASC', [stay.id]);
  const bookings = await get('SELECT COUNT(*) AS c FROM bookings WHERE homestay_id = ?', [stay.id]);
  stay.imageUrls = images.map((r) => r.image_url);
  stay.amenities = amenities.map((r) => r.amenity);
  stay.verifiedBadges = badges.map((r) => r.badge);
  stay.blockedDates = blocked.map((r) => r.blocked_date);
  stay.blockedReasons = blocked.map((r) => r.reason);
  stay.bookingsCount = bookings?.c || 0;
  return stay;
}

// GET /api/owner/stays?phone=...
router.get('/stays', async (req, res) => {
  try {
    const phone = digits(req.query.phone);
    if (!phone) return res.status(400).json({ error: 'phone is required' });
    const stays = await all(
      `SELECT * FROM homestays
       WHERE REPLACE(REPLACE(REPLACE(host_whatsapp, '+', ''), '-', ''), ' ', '') LIKE ?
       ORDER BY rating DESC`,
      [`%${phone}%`]
    );
    res.json(await Promise.all(stays.map(enrich)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/owner/bookings?phone=...
router.get('/bookings', async (req, res) => {
  try {
    const phone = digits(req.query.phone);
    if (!phone) return res.status(400).json({ error: 'phone is required' });
    const rows = await all(
      `SELECT b.*, h.title AS homestay_title, h.location_display, h.host_name
       FROM bookings b
       JOIN homestays h ON h.id = b.homestay_id
       WHERE REPLACE(REPLACE(REPLACE(h.host_whatsapp, '+', ''), '-', ''), ' ', '') LIKE ?
       ORDER BY b.check_in DESC`,
      [`%${phone}%`]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/owner/register
router.post('/register', async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'name and phone are required' });
    const id = `host-${Date.now()}`;
    await run('INSERT IGNORE INTO users (id, phone, name, email, role) VALUES (?, ?, ?, ?, ?)', [
      id,
      phone,
      name,
      email || null,
      'host',
    ]);
    res.status(201).json({ id, name, phone, email: email || null, role: 'host' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/owner/stats?phone=...
router.get('/stats', async (req, res) => {
  try {
    const phone = digits(req.query.phone);
    if (!phone) return res.status(400).json({ error: 'phone is required' });
    const stays = await all(
      `SELECT id, price_per_night, total_rooms FROM homestays
       WHERE REPLACE(REPLACE(REPLACE(host_whatsapp, '+', ''), '-', ''), ' ', '') LIKE ?`,
      [`%${phone}%`]
    );
    const ids = stays.map((s) => s.id);
    let bookings = [];
    let holds = 0;
    let upcoming = 0;
    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',');
      bookings = await all(`SELECT * FROM bookings WHERE homestay_id IN (${placeholders})`, ids);
      holds = bookings.reduce((sum, b) => sum + (b.advance_paid || 0), 0);
      const today = new Date().toISOString().split('T')[0];
      upcoming = bookings.filter((b) => b.check_in >= today && b.status !== 'declined' && b.status !== 'cancelled').length;
    }
    res.json({ stayCount: stays.length, bookingCount: bookings.length, upcoming, holdsPaid: holds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
