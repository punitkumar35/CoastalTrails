import { all, get, run } from './index.js';

// Local (not UTC) YYYY-MM-DD so validation matches the browser's date picker
export function localTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Local MySQL DATETIME string ('YYYY-MM-DD HH:MM:SS') for NOW() comparisons
export function localDateTime(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function isoDate(value) {
  return String(value ?? '').slice(0, 10);
}

// Every date in [from, to) — checkout day itself is free for the next guest
export function eachNight(from, to) {
  const dates = [];
  const start = new Date(`${isoDate(from)}T00:00:00`);
  const end = new Date(`${isoDate(to)}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return dates;
  for (const d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    dates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
  }
  return dates;
}

// Pending holds past their expiry stop blocking rooms automatically.
// Unpaid holds expire; unpaid host-approval holds are cancelled.
export async function expireStaleHolds() {
  const expired = await run(
    `UPDATE bookings
     SET status = 'expired'
     WHERE status = 'pending_payment' AND hold_expires_at IS NOT NULL AND hold_expires_at < NOW()`
  );
  const cancelled = await run(
    `UPDATE bookings
     SET status = 'cancelled'
     WHERE status = 'awaiting_host' AND hold_expires_at IS NOT NULL AND hold_expires_at < NOW()`
  );
  return (expired.changes || 0) + (cancelled.changes || 0);
}

// Rooms left per night for one homestay.
// A room_unavailability row (host hold / maintenance) blocks the whole property that night;
// each active booking (confirmed, or awaiting host within its hold window) occupies one room.
export async function getRoomsLeftMap(homestayId, from, to) {
  const stay = await get('SELECT id, total_rooms, availability_listed FROM homestays WHERE id = ?', [homestayId]);
  if (!stay) return null;

  const dates = eachNight(from, to);
  const roomsLeft = {};
  for (const d of dates) roomsLeft[d] = stay.total_rooms;

  const hostBlocks = await all(
    'SELECT blocked_date FROM room_unavailability WHERE homestay_id = ? AND blocked_date >= ? AND blocked_date < ?',
    [homestayId, isoDate(from), isoDate(to)]
  );
  const fullyBlocked = new Set(hostBlocks.map((b) => isoDate(b.blocked_date)));

  const activeBookings = await all(
    `SELECT check_in, check_out, status, hold_expires_at FROM bookings
     WHERE homestay_id = ?
       AND status IN ('pending_payment', 'awaiting_host', 'confirmed', 'checked_in')
       AND (status IN ('confirmed', 'checked_in') OR hold_expires_at IS NULL OR hold_expires_at > NOW())
       AND check_in < ? AND check_out > ?`,
    [homestayId, isoDate(to), isoDate(from)]
  );

  for (const b of activeBookings) {
    for (const d of eachNight(b.check_in, b.check_out)) {
      if (roomsLeft[d] !== undefined) roomsLeft[d] = Math.max(0, roomsLeft[d] - 1);
    }
  }

  // Admin room blocks (maintenance / private use / channel sync) close those rooms to travelers
  const blockedByHost = {};
  const roomOverrides = await all(
    `SELECT date, COUNT(*) AS blocked_rooms FROM room_status
     WHERE homestay_id = ? AND date >= ? AND date < ? AND status IN ('blocked', 'maintenance')
     GROUP BY date`,
    [homestayId, isoDate(from), isoDate(to)]
  );
  for (const o of roomOverrides) {
    const d = isoDate(o.date);
    if (roomsLeft[d] !== undefined) {
      const blockedCount = Number(o.blocked_rooms || 0);
      roomsLeft[d] = Math.max(0, roomsLeft[d] - blockedCount);
      blockedByHost[d] = blockedCount;
    }
  }

  for (const d of fullyBlocked) {
    if (roomsLeft[d] !== undefined) {
      roomsLeft[d] = 0;
      blockedByHost[d] = stay.total_rooms;
    }
  }

  return { total_rooms: stay.total_rooms, listed: !!stay.availability_listed, dates: roomsLeft, blockedByHost };
}

// Pick a single room number that is free for every night of the stay.
// Returns null when the stay has no room free across the whole range
// (the admin board then falls back to its automatic visual allocation).
export async function pickRoomForStay(homestayId, from, to, totalRooms) {
  const nights = eachNight(from, to);
  if (!nights.length || !totalRooms || totalRooms < 1) return null;

  const hostBlocks = await all(
    'SELECT blocked_date FROM room_unavailability WHERE homestay_id = ? AND blocked_date >= ? AND blocked_date < ?',
    [homestayId, isoDate(from), isoDate(to)]
  );
  if (hostBlocks.length > 0) return null; // whole property blocked

  const overrides = await all(
    `SELECT room_number, date FROM room_status
     WHERE homestay_id = ? AND date >= ? AND date < ? AND status IN ('blocked', 'maintenance')`,
    [homestayId, isoDate(from), isoDate(to)]
  );
  const unavailable = new Set(overrides.map((o) => `${o.room_number}:${isoDate(o.date)}`));

  const activeBookings = await all(
    `SELECT room_number, check_in, check_out FROM bookings
     WHERE homestay_id = ?
       AND status IN ('pending_payment', 'awaiting_host', 'confirmed', 'checked_in')
       AND (status IN ('confirmed', 'checked_in') OR hold_expires_at IS NULL OR hold_expires_at > NOW())
       AND check_in < ? AND check_out > ?`,
    [homestayId, isoDate(to), isoDate(from)]
  );
  for (const b of activeBookings) {
    if (!b.room_number) continue;
    for (const d of eachNight(b.check_in, b.check_out)) {
      unavailable.add(`${b.room_number}:${d}`);
    }
  }

  for (let room = 1; room <= totalRooms; room += 1) {
    const freeAllNights = nights.every((d) => !unavailable.has(`${room}:${d}`));
    if (freeAllNights) return room;
  }
  return null;
}

// Rooms left per night across every published homestay (used by the explore date picker)
export async function getAggregateRoomsLeft(from, to) {
  const stays = await all('SELECT id FROM homestays WHERE availability_listed = 1');
  const dates = eachNight(from, to);
  const totals = {};
  for (const d of dates) totals[d] = 0;

  let totalRooms = 0;
  for (const s of stays) {
    const map = await getRoomsLeftMap(s.id, from, to);
    if (!map) continue;
    totalRooms += map.total_rooms;
    for (const d of dates) totals[d] += map.dates[d] ?? 0;
  }

  return { total: totalRooms, dates: totals };
}
