import express from 'express';
import { all, get, run } from '../db/index.js';
import { expireStaleHolds, getRoomsLeftMap, getAggregateRoomsLeft, isoDate } from '../db/availability.js';

const router = express.Router();

// Helper to attach child collections (images, amenities, badges, blocked_dates)
async function attachDetails(stay, checkIn, checkOut) {
  const images = await all('SELECT image_url, category FROM homestay_images WHERE homestay_id = ? ORDER BY sort_order ASC', [stay.id]);
  const amenities = await all('SELECT amenity FROM homestay_amenities WHERE homestay_id = ?', [stay.id]);
  const badges = await all('SELECT badge FROM homestay_badges WHERE homestay_id = ?', [stay.id]);
  const blockedDates = await all('SELECT blocked_date, reason FROM room_unavailability WHERE homestay_id = ?', [stay.id]);

  stay.imageUrls = images.map(r => r.image_url);
  stay.imageCategories = images.map(r => r.category);
  stay.amenities = amenities.map(r => r.amenity);
  stay.verifiedBadges = badges.map(r => r.badge);
  stay.blockedDates = blockedDates.map(r => r.blocked_date);

  // Calculate advance deposit & check-in balance
  stay.advanceDeposit = stay.price_per_night * 0.20;
  stay.balanceAtCheckIn = stay.price_per_night * 0.80;

  // Check availability for requested range
  if (checkIn && checkOut) {
    const isConflict = stay.blockedDates.some(d => d >= checkIn && d < checkOut);
    stay.isAvailable = !isConflict;
    stay.availableRooms = isConflict ? 0 : Math.max(1, stay.total_rooms - 1);
  } else {
    stay.isAvailable = true;
    stay.availableRooms = stay.total_rooms;
  }

  return stay;
}

// GET /api/homestays - Filter by location, dates, or search
router.get('/', async (req, res) => {
  try {
    const { location, search, checkIn, checkOut } = req.query;
    let query = 'SELECT * FROM homestays WHERE 1=1';
    const params = [];

    if (location && location !== 'all') {
      query += ' AND location = ?';
      params.push(location);
    }

    if (search) {
      query += ' AND (title LIKE ? OR subtitle LIKE ? OR description LIKE ? OR location_display LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY rating DESC';

    const stays = await all(query, params);
    const enriched = await Promise.all(stays.map(stay => attachDetails(stay, checkIn, checkOut)));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/availability - aggregate per-date availability straight from the database
router.get('/availability', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to dates are required' });
    await expireStaleHolds();
    const { total, dates } = await getAggregateRoomsLeft(from, to);
    res.json({ from, to, total, dates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/homestays/:id/availability - rooms left per night for one stay
router.get('/:id/availability', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to dates are required' });
    await expireStaleHolds();
    const map = await getRoomsLeftMap(req.params.id, from, to);
    if (!map) return res.status(404).json({ error: 'Homestay not found' });
    res.json({
      homestay_id: req.params.id,
      from: isoDate(from),
      to: isoDate(to),
      listed: map.listed,
      total_rooms: map.total_rooms,
      dates: map.dates,
      blocked: map.blockedByHost,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/homestays/:id
router.get('/:id', async (req, res) => {
  try {
    const { checkIn, checkOut } = req.query;
    const stay = await get('SELECT * FROM homestays WHERE id = ?', [req.params.id]);
    if (!stay) {
      return res.status(404).json({ error: 'Homestay not found' });
    }
    const enriched = await attachDetails(stay, checkIn, checkOut);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/homestays - Add stay (via Studio / Admin)
router.post('/', async (req, res) => {
  try {
    const {
      id = `gokarna-${Date.now()}`,
      title,
      subtitle = '',
      location,
      location_display,
      price_per_night,
      rating = 5.0,
      reviews_count = 0,
      host_name,
      host_whatsapp,
      is_host_verified = 1,
      walking_minutes_to_beach = 3,
      total_rooms = 3,
      description = '',
      availability_listed = 0,
      images = [],
      amenities = [],
      badges = []
    } = req.body;

    if (!title || !location || !price_per_night || !host_name || !host_whatsapp) {
      return res.status(400).json({ error: 'Missing required homestay fields' });
    }

    const roomCount = Number(total_rooms);
    if (!Number.isInteger(roomCount) || roomCount < 1 || roomCount > 100) {
      return res.status(400).json({ error: 'Rooms available must be a whole number between 1 and 100.' });
    }

    await run(
      `INSERT INTO homestays (id, title, subtitle, location, location_display, price_per_night, rating, reviews_count, host_name, host_whatsapp, is_host_verified, walking_minutes_to_beach, total_rooms, availability_listed, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, subtitle, location, location_display || location, price_per_night, rating, reviews_count, host_name, host_whatsapp, is_host_verified ? 1 : 0, walking_minutes_to_beach, roomCount, availability_listed ? 1 : 0, description]
    );

    // Images
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const url = typeof img === 'string' ? img : img.url;
      const category = typeof img === 'string' ? 'general' : img.category || 'general';
      await run('INSERT INTO homestay_images (homestay_id, image_url, sort_order, category) VALUES (?, ?, ?, ?)', [id, url, i, category]);
    }
    // Amenities
    for (const a of amenities) {
      await run('INSERT INTO homestay_amenities (homestay_id, amenity) VALUES (?, ?)', [id, a]);
    }
    // Badges
    for (const b of badges) {
      await run('INSERT INTO homestay_badges (homestay_id, badge) VALUES (?, ?)', [id, b]);
    }

    const created = await get('SELECT * FROM homestays WHERE id = ?', [id]);
    res.status(201).json(await attachDetails(created));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/homestays/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      subtitle,
      location,
      location_display,
      price_per_night,
      host_name,
      host_whatsapp,
      walking_minutes_to_beach,
      total_rooms,
      availability_listed,
      description,
      status,
      instant_booking
    } = req.body;

    let roomCountUpdate = total_rooms;
    if (total_rooms !== undefined && total_rooms !== null) {
      const parsed = Number(total_rooms);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
        return res.status(400).json({ error: 'Rooms available must be a whole number between 1 and 100.' });
      }
      roomCountUpdate = parsed;
    }

    await run(
      `UPDATE homestays SET 
        title = COALESCE(?, title),
        subtitle = COALESCE(?, subtitle),
        location = COALESCE(?, location),
        location_display = COALESCE(?, location_display),
        price_per_night = COALESCE(?, price_per_night),
        host_name = COALESCE(?, host_name),
        host_whatsapp = COALESCE(?, host_whatsapp),
        walking_minutes_to_beach = COALESCE(?, walking_minutes_to_beach),
        total_rooms = COALESCE(?, total_rooms),
        availability_listed = COALESCE(?, availability_listed),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        instant_booking = COALESCE(?, instant_booking)
       WHERE id = ?`,
      [title, subtitle, location, location_display, price_per_night, host_name, host_whatsapp, walking_minutes_to_beach, roomCountUpdate, availability_listed, description, status ?? null, instant_booking ?? null, id]
    );

    if (Array.isArray(req.body.amenities)) {
      await run('DELETE FROM homestay_amenities WHERE homestay_id = ?', [id]);
      for (const a of req.body.amenities) {
        await run('INSERT INTO homestay_amenities (homestay_id, amenity) VALUES (?, ?)', [id, a]);
      }
    }

    const updated = await get('SELECT * FROM homestays WHERE id = ?', [id]);
    res.json(await attachDetails(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/homestays/:id
router.delete('/:id', async (req, res) => {
  try {
    await run('DELETE FROM homestays WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: `Homestay ${req.params.id} deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/homestays/:id/block-date
router.post('/:id/block-date', async (req, res) => {
  try {
    const { date, reason = 'host_hold' } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required (YYYY-MM-DD)' });
    await run('INSERT IGNORE INTO room_unavailability (homestay_id, blocked_date, reason) VALUES (?, ?, ?)', [req.params.id, date, reason]);
    // Managing dates means the admin has published availability for this stay
    await run('UPDATE homestays SET availability_listed = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true, homestay_id: req.params.id, blocked_date: date });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/homestays/:id/block-date
router.delete('/:id/block-date', async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required (YYYY-MM-DD)' });
    await run('DELETE FROM room_unavailability WHERE homestay_id = ? AND blocked_date = ?', [req.params.id, date]);
    res.json({ success: true, homestay_id: req.params.id, blocked_date: date });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
