import express from 'express';
import { all, get, run } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { guestWhatsAppLink, sendBookingWhatsApp } from '../utils/whatsapp.js';

const router = express.Router();

// Every admin console route requires a valid session with the admin role
router.use(requireAdmin);

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

async function enrich(stay) {
  const images = await all('SELECT image_url, category FROM homestay_images WHERE homestay_id = ? ORDER BY sort_order ASC', [stay.id]);
  const amenities = await all('SELECT amenity FROM homestay_amenities WHERE homestay_id = ?', [stay.id]);
  const badges = await all('SELECT badge FROM homestay_badges WHERE homestay_id = ?', [stay.id]);
  const blocked = await all('SELECT blocked_date, reason FROM room_unavailability WHERE homestay_id = ? ORDER BY blocked_date ASC', [stay.id]);
  const bookings = await get('SELECT COUNT(*) AS c FROM bookings WHERE homestay_id = ?', [stay.id]);
  stay.imageUrls = images.map((r) => r.image_url);
  stay.imageCategories = images.map((r) => r.category);
  stay.amenities = amenities.map((r) => r.amenity);
  stay.verifiedBadges = badges.map((r) => r.badge);
  stay.blockedDates = blocked.map((r) => r.blocked_date);
  stay.blockedReasons = blocked.map((r) => r.reason);
  stay.bookingsCount = bookings?.c || 0;
  return stay;
}

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [stays, bookings, hosts, holds, upcoming, statusRows, arrivals, departures] = await Promise.all([
      get('SELECT COUNT(*) AS c FROM homestays'),
      get('SELECT COUNT(*) AS c FROM bookings'),
      get('SELECT COUNT(DISTINCT host_whatsapp) AS c FROM homestays'),
      get('SELECT COALESCE(SUM(advance_paid), 0) AS s FROM bookings'),
      get(`SELECT COUNT(*) AS c FROM bookings WHERE check_in >= CURDATE() AND status NOT IN ('declined', 'cancelled')`),
      all('SELECT status, COUNT(*) AS c FROM bookings GROUP BY status'),
      get(`SELECT COUNT(*) AS c FROM bookings WHERE check_in = ? AND status NOT IN ('declined', 'cancelled')`, [toISO(new Date())]),
      get(`SELECT COUNT(*) AS c FROM bookings WHERE check_out = ? AND status NOT IN ('declined', 'cancelled')`, [toISO(new Date())]),
    ]);

    const today = toISO(new Date());
    const since = addDays(today, -13);
    const trendRows = await all(
      `SELECT date(created_at) AS d, COUNT(*) AS c, COALESCE(SUM(advance_paid), 0) AS amt
       FROM bookings WHERE date(created_at) >= ? GROUP BY date(created_at) ORDER BY d`,
      [since]
    );
    const trend = [];
    for (let i = 0; i < 14; i += 1) {
      const d = addDays(since, i);
      const row = trendRows.find((r) => r.d === d);
      trend.push({ date: d, count: row?.c || 0, amount: row?.amt || 0 });
    }

    const stayRows = await all('SELECT id, title, location_display, total_rooms, price_per_night FROM homestays');
    const topStays = (
      await Promise.all(
        stayRows.map(async (s) => {
          const [active, blocks, total] = await Promise.all([
            get(
              `SELECT COUNT(*) AS c FROM bookings WHERE homestay_id = ? AND status IN ('awaiting_host', 'confirmed') AND check_in <= ? AND check_out > ?`,
              [s.id, today, today]
            ),
            get('SELECT COUNT(*) AS c FROM room_unavailability WHERE homestay_id = ? AND blocked_date >= ?', [s.id, today]),
            get('SELECT COUNT(*) AS c FROM bookings WHERE homestay_id = ?', [s.id]),
          ]);
          return {
            id: s.id,
            title: s.title,
            location: s.location_display,
            total_rooms: s.total_rooms,
            price: s.price_per_night,
            bookedTonight: active?.c || 0,
            upcomingBlocks: blocks?.c || 0,
            totalBookings: total?.c || 0,
          };
        })
      )
    ).sort((a, b) => b.bookedTonight - a.bookedTonight);

    const enclaves = await all('SELECT location_display AS label, COUNT(*) AS c FROM homestays GROUP BY location_display ORDER BY c DESC');

    res.json({
      stayCount: stays?.c || 0,
      bookingCount: bookings?.c || 0,
      hostCount: hosts?.c || 0,
      holdsPaid: holds?.s || 0,
      upcoming: upcoming?.c || 0,
      statusBreakdown: Object.fromEntries(statusRows.map((r) => [r.status, r.c])),
      arrivalsToday: arrivals?.c || 0,
      departuresToday: departures?.c || 0,
      trend,
      topStays: topStays.slice(0, 6),
      enclaves,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/homestays
router.get('/homestays', async (req, res) => {
  try {
    const stays = await all('SELECT * FROM homestays ORDER BY rating DESC');
    res.json(await Promise.all(stays.map(enrich)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/bookings
router.get('/bookings', async (req, res) => {
  try {
    const rows = await all(
      `SELECT b.*, h.title AS homestay_title, h.location_display, h.host_name, h.host_whatsapp, h.subtitle, h.total_rooms,
              u.email AS user_email, u.name AS user_profile_name,
              (SELECT image_url FROM homestay_images i WHERE i.homestay_id = h.id ORDER BY i.sort_order ASC LIMIT 1) AS stay_image
       FROM bookings b
       JOIN homestays h ON h.id = b.homestay_id
       LEFT JOIN users u ON u.phone = b.user_phone
       ORDER BY b.created_at DESC`
    );
    const enriched = await Promise.all(
      rows.map(async (b) => {
        b.roomSummary = await roomSummaryFor(b.homestay_id, b.total_rooms || 1, b.check_in, b.check_out);
        return b;
      })
    );
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function roomSummaryFor(stayId, totalRooms, start, end) {
  const dates = [];
  let d = start;
  while (d < end) {
    dates.push(d);
    d = addDays(d, 1);
  }
  const [blocks, overrides, bks] = await Promise.all([
    all('SELECT blocked_date FROM room_unavailability WHERE homestay_id = ? AND blocked_date >= ? AND blocked_date < ?', [stayId, start, end]),
    all('SELECT room_number, date, status FROM room_status WHERE homestay_id = ? AND date >= ? AND date < ?', [stayId, start, end]),
    all(
      "SELECT check_in, check_out FROM bookings WHERE homestay_id = ? AND status IN ('awaiting_host', 'confirmed') AND check_out > ? AND check_in < ?",
      [stayId, start, end]
    ),
  ]);
  const blockSet = new Set(blocks.map((b) => b.blocked_date));
  const overrideMap = new Map(overrides.map((o) => [`${o.room_number}:${o.date}`, o.status]));
  let free = 0;
  let booked = 0;
  let blocked = 0;
  let maint = 0;
  for (const date of dates) {
    const busy = bks.filter((b) => b.check_in <= date && b.check_out > date).length;
    for (let r = 1; r <= totalRooms; r += 1) {
      if (blockSet.has(date)) blocked += 1;
      else if (busy >= r) booked += 1;
      else if (overrideMap.get(`${r}:${date}`) === 'blocked') blocked += 1;
      else if (overrideMap.get(`${r}:${date}`) === 'maintenance') maint += 1;
      else free += 1;
    }
  }
  return { free, booked, blocked, maint };
}

// GET /api/admin/hosts
router.get('/hosts', async (req, res) => {
  try {
    const rows = await all(
      `SELECT host_name, host_whatsapp, COUNT(*) AS stay_count, SUM(total_rooms) AS rooms
       FROM homestays
       GROUP BY host_whatsapp, host_name
       ORDER BY stay_count DESC`
    );
    const enriched = await Promise.all(
      rows.map(async (h) => {
        const stays = await all('SELECT * FROM homestays WHERE host_whatsapp = ? ORDER BY rating DESC', [h.host_whatsapp]);
        h.stays = await Promise.all(stays.map(enrich));
        const ids = stays.map((s) => s.id);
        let holds = 0;
        let upcoming = 0;
        if (ids.length) {
          const placeholders = ids.map(() => '?').join(',');
          const bks = await all(`SELECT advance_paid, check_in, status FROM bookings WHERE homestay_id IN (${placeholders})`, ids);
          holds = bks.reduce((sum, b) => sum + (b.advance_paid || 0), 0);
          const today = new Date().toISOString().split('T')[0];
          upcoming = bks.filter((b) => b.check_in >= today && b.status !== 'declined' && b.status !== 'cancelled').length;
        }
        h.holdsPaid = holds;
        h.upcoming = upcoming;
        return h;
      })
    );
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function mergeSegments(segs) {
  segs.sort((a, b) => a.start.localeCompare(b.start) || (a.type === 'booking' ? -1 : 1));
  const out = [];
  for (const s of segs) {
    const last = out[out.length - 1];
    if (last && last.type === s.type && (last.reason ?? '') === (s.reason ?? '') && last.end === s.start && last.type !== 'booking') {
      last.end = s.end;
    } else {
      out.push({ ...s });
    }
  }
  return out;
}

// GET /api/admin/stays/:id/room-status?start=YYYY-MM-DD&days=14
router.get('/stays/:id/room-status', async (req, res) => {
  try {
    const { id } = req.params;
    const stay = await get('SELECT * FROM homestays WHERE id = ?', [id]);
    if (!stay) return res.status(404).json({ error: 'Stay not found' });
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 1), 31);
    const start = /^\d{4}-\d{2}-\d{2}$/.test(req.query.start || '') ? req.query.start : toISO(new Date());
    const end = addDays(start, days);
    const totalRooms = stay.total_rooms || 1;

    const [blocks, overrides, bks, roomStates, settings] = await Promise.all([
      all('SELECT blocked_date, reason FROM room_unavailability WHERE homestay_id = ? AND blocked_date >= ? AND blocked_date < ?', [id, start, end]),
      all('SELECT room_number, date, status, reason FROM room_status WHERE homestay_id = ? AND date >= ? AND date < ?', [id, start, end]),
      all(
        `SELECT id, reference_code, channel, user_name, user_phone, check_in, check_out, guests_count, total_amount, advance_paid, status, room_number
         FROM bookings WHERE homestay_id = ? AND status IN ('awaiting_host', 'confirmed') AND check_out > ? AND check_in < ?`,
        [id, start, end]
      ),
      all('SELECT * FROM room_state WHERE homestay_id = ?', [id]),
      get('SELECT * FROM stay_settings WHERE homestay_id = ?', [id]),
    ]);

    const dates = [];
    for (let i = 0; i < days; i += 1) dates.push(addDays(start, i));
    const blockMap = new Map(blocks.map((b) => [b.blocked_date, b.reason]));
    const overrideMap = new Map(overrides.map((o) => [`${o.room_number}:${o.date}`, { status: o.status, reason: o.reason }]));
    const bookedPerDate = new Map(dates.map((d) => [d, bks.filter((b) => b.check_in <= d && b.check_out > d).length]));

    const sortedBks = [...bks].sort((a, b) => a.check_in.localeCompare(b.check_in));
    const roomAssign = new Map();
    let autoCursor = 0;
    for (const b of sortedBks) {
      const pinned = Number(b.room_number) || 0;
      if (pinned >= 1 && pinned <= totalRooms) {
        roomAssign.set(b.id, pinned);
      } else {
        roomAssign.set(b.id, (autoCursor % totalRooms) + 1);
        autoCursor += 1;
      }
    }

    const rooms = Array.from({ length: totalRooms }, (_, i) => {
      const number = i + 1;
      const st = roomStates.find((r) => r.room_number === number) || {};
      const segs = [];
      for (const b of sortedBks) {
        if (roomAssign.get(b.id) !== number) continue;
        segs.push({
          type: 'booking',
          start: b.check_in,
          end: b.check_out,
          id: b.id,
          guest: b.user_name,
          phone: b.user_phone,
          channel: b.channel || 'Direct website',
          ref: b.reference_code,
          guests: b.guests_count,
          amount: b.total_amount,
          advance: b.advance_paid,
          status: b.status,
        });
      }
      for (const b of blocks) segs.push({ type: 'blocked', start: b.blocked_date, end: addDays(b.blocked_date, 1), reason: b.reason || 'blocked' });
      for (const o of overrides) {
        if (o.room_number !== number) continue;
        segs.push({ type: o.status === 'maintenance' ? 'maintenance' : 'blocked', start: o.date, end: addDays(o.date, 1), reason: o.reason || (o.status === 'maintenance' ? 'Maintenance' : 'Admin block') });
      }

      return {
        number,
        name: st.name || `Room ${number}`,
        bed_type: st.bed_type || 'King Bed',
        capacity: st.capacity || 2,
        housekeeping: st.housekeeping || 'clean',
        photo: st.photo || null,
        segments: mergeSegments(segs),
        days: dates.map((d) => {
          const stayBlock = blockMap.get(d);
          let status = 'available';
          let source = 'system';
          if (stayBlock !== undefined) {
            status = 'blocked';
            source = 'stay';
          } else if ((bookedPerDate.get(d) || 0) >= number) {
            status = 'booked';
            source = 'booking';
          } else {
            const ov = overrideMap.get(`${number}:${d}`);
            if (ov) {
              status = ov.status;
              source = 'admin';
            }
          }
          return { date: d, status, source, stayReason: stayBlock ?? null };
        }),
      };
    });

    res.json({
      stay: {
        id: stay.id,
        title: stay.title,
        total_rooms: totalRooms,
        host_name: stay.host_name,
        price_per_night: stay.price_per_night,
        location_display: stay.location_display,
      },
      settings: {
        min_stay: settings?.min_stay ?? 1,
        price_override: settings?.price_override ?? null,
      },
      start,
      days,
      rooms,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/room-status { homestay_id, room_number, date, status, reason? }
router.put('/room-status', async (req, res) => {
  try {
    const { homestay_id, room_number, date, status, reason } = req.body || {};
    if (!homestay_id || !room_number || !date || !['available', 'maintenance', 'blocked'].includes(status)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    if (status === 'available') {
      await run('DELETE FROM room_status WHERE homestay_id = ? AND room_number = ? AND date = ?', [homestay_id, room_number, date]);
    } else {
      await run(
        `INSERT INTO room_status (homestay_id, room_number, date, status, reason) VALUES (?, ?, ?, ?, ?) AS new
         ON DUPLICATE KEY UPDATE status = new.status, reason = new.reason, updated_at = CURRENT_TIMESTAMP`,
        [homestay_id, room_number, date, status, reason ?? null]
      );
    }
    // Managing room availability publishes the stay to travelers
    await run('UPDATE homestays SET availability_listed = 1 WHERE id = ?', [homestay_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/room-state { homestay_id, room_number, name?, bed_type?, capacity?, housekeeping?, photo? }
router.put('/room-state', async (req, res) => {
  try {
    const { homestay_id, room_number, name, bed_type, capacity, housekeeping, photo } = req.body || {};
    if (!homestay_id || !room_number) return res.status(400).json({ error: 'Invalid payload' });
    await run(
      `INSERT INTO room_state (homestay_id, room_number, name, bed_type, capacity, housekeeping, photo)
       VALUES (?, ?, ?, ?, ?, ?, ?) AS new
       ON DUPLICATE KEY UPDATE
         name = COALESCE(new.name, room_state.name),
         bed_type = COALESCE(new.bed_type, room_state.bed_type),
         capacity = COALESCE(new.capacity, room_state.capacity),
         housekeeping = COALESCE(new.housekeeping, room_state.housekeeping),
         photo = COALESCE(new.photo, room_state.photo),
         updated_at = CURRENT_TIMESTAMP`,
      [homestay_id, room_number, name ?? null, bed_type ?? null, capacity ?? null, housekeeping ?? null, photo ?? null]
    );
    await run('UPDATE homestays SET availability_listed = 1 WHERE id = ?', [homestay_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/stay-settings { homestay_id, min_stay?, price_override? }
router.put('/stay-settings', async (req, res) => {
  try {
    const { homestay_id, min_stay, price_override } = req.body || {};
    if (!homestay_id) return res.status(400).json({ error: 'Invalid payload' });
    await run(
      `INSERT INTO stay_settings (homestay_id, min_stay, price_override) VALUES (?, ?, ?) AS new
       ON DUPLICATE KEY UPDATE
         min_stay = COALESCE(new.min_stay, stay_settings.min_stay),
         price_override = COALESCE(new.price_override, stay_settings.price_override),
         updated_at = CURRENT_TIMESTAMP`,
      [homestay_id, min_stay ?? null, price_override ?? null]
    );
    await run('UPDATE homestays SET availability_listed = 1 WHERE id = ?', [homestay_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/bookings - walk-in / phone booking taken at the desk
router.post('/bookings', async (req, res) => {
  try {
    const { homestay_id, room_number, user_name, user_phone, check_in, check_out, guests_count = 2, channel = 'Walk-in' } =
      req.body || {};

    if (!homestay_id || !user_name || !user_phone || !check_in || !check_out) {
      return res.status(400).json({ error: 'Guest name, phone and dates are required.' });
    }
    const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoPattern.test(check_in) || !isoPattern.test(check_out)) {
      return res.status(400).json({ error: 'Dates must use the YYYY-MM-DD format.' });
    }
    if (check_out <= check_in) {
      return res.status(400).json({ error: 'Check-out must be after check-in.' });
    }

    const stay = await get('SELECT id, title, price_per_night, total_rooms, availability_listed FROM homestays WHERE id = ?', [homestay_id]);
    if (!stay) return res.status(404).json({ error: 'Homestay not found' });

    // Link the walk-in to a registered account when the phone matches
    const matchedUser = await get('SELECT id FROM users WHERE phone = ?', [String(user_phone).replace(/[\s\-()]/g, '')]);
    const userId = matchedUser?.id || null;

    const roomNum = Number(room_number) || null;
    if (roomNum !== null && (roomNum < 1 || roomNum > Number(stay.total_rooms || 1))) {
      return res.status(400).json({ error: `Room number must be between 1 and ${stay.total_rooms || 1}.` });
    }

    const start = new Date(`${check_in}T00:00:00`);
    const end = new Date(`${check_out}T00:00:00`);
    const nights = Math.max(1, Math.round((end - start) / 86400000));
    const guests = Math.max(1, Number(guests_count) || 1);
    const extraGuests = Math.max(0, guests - 2);
    const total_amount = (Number(stay.price_per_night) + extraGuests * 400) * nights;
    const advance_paid = 0; // paid directly at the property for walk-ins
    const balance_payable_at_property = total_amount;

    const id = `bk-${Date.now()}`;
    const reference_code = `GK-${Math.floor(100000 + Math.random() * 900000)}`;

    await run(
      `INSERT INTO bookings (id, reference_code, homestay_id, user_id, user_name, user_phone, check_in, check_out, guests_count,
                             total_amount, advance_paid, balance_payable_at_property, status, channel, room_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
      [id, reference_code, homestay_id, userId, user_name, user_phone, check_in, check_out, guests, total_amount, advance_paid, balance_payable_at_property, channel, roomNum]
    );

    // Taking a booking means the stay is live for travelers too
    await run('UPDATE homestays SET availability_listed = 1 WHERE id = ?', [homestay_id]);

    // Desk bookings are collected in cash at the property — record the payment
    const deskRef = `DESK-${Date.now().toString(36).toUpperCase()}`;
    await run(
      "UPDATE bookings SET payment_status = 'paid', payment_id = ?, paid_at = NOW() WHERE id = ?",
      [deskRef, id]
    );
    await run(
      `INSERT INTO payments (id, booking_id, amount, method, status, provider, provider_ref, paid_at)
       VALUES (?, ?, ?, 'cash', 'paid', 'desk', ?, NOW())`,
      [`pay-${Date.now()}-desk`, id, total_amount, deskRef]
    );

    const created = await get('SELECT * FROM bookings WHERE id = ?', [id]);
    const stayForMessage = { title: stay.title, location_display: stay.location_display, host_name: stay.host_name, host_whatsapp: stay.host_whatsapp };

    // The desk guest gets the booking details on WhatsApp as well
    const deskWhatsapp = await sendBookingWhatsApp(created, stayForMessage);
    console.log(
      deskWhatsapp.sent
        ? `WhatsApp desk confirmation sent to ${created.user_phone} (${deskWhatsapp.provider})`
        : `WhatsApp desk confirmation failed for ${created.user_phone}: ${deskWhatsapp.reason}`
    );

    res.status(201).json({ ...created, nights, guest_whatsapp_link: guestWhatsAppLink(created, stayForMessage) });
  } catch (err) {
    res.status(500).json({ error: 'Could not create the booking right now. Please try again.' });
  }
});

// PATCH /api/admin/bookings/:id/extend { check_out }
router.patch('/bookings/:id/extend', async (req, res) => {
  try {
    const { check_out } = req.body || {};
    if (!check_out) return res.status(400).json({ error: 'Missing check_out' });
    await run('UPDATE bookings SET check_out = ? WHERE id = ?', [check_out, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
