import express from 'express';
import { all, get, run } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/wishlist - saved stays for the logged-in customer
router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await all(
      `SELECT w.id AS wishlist_id, w.created_at AS saved_at,
              h.id, h.title, h.subtitle, h.location, h.location_display, h.price_per_night,
              h.rating, h.reviews_count, h.host_name, h.description, h.availability_listed
       FROM wishlist w
       JOIN homestays h ON h.id = w.homestay_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wishlist/:homestayId - save a stay (duplicates are ignored)
router.post('/:homestayId', requireAuth, async (req, res) => {
  try {
    const stay = await get('SELECT id FROM homestays WHERE id = ?', [req.params.homestayId]);
    if (!stay) return res.status(404).json({ error: 'That stay no longer exists.' });
    await run('INSERT IGNORE INTO wishlist (id, user_id, homestay_id) VALUES (?, ?, ?)', [
      'wsh_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      req.user.id,
      stay.id,
    ]);
    res.status(201).json({ saved: true, homestay_id: stay.id });
  } catch (err) {
    res.status(500).json({ error: 'Could not save this stay right now.' });
  }
});

// DELETE /api/wishlist/:homestayId - remove a saved stay
router.delete('/:homestayId', requireAuth, async (req, res) => {
  try {
    await run('DELETE FROM wishlist WHERE user_id = ? AND homestay_id = ?', [req.user.id, req.params.homestayId]);
    res.json({ saved: false, homestay_id: req.params.homestayId });
  } catch (err) {
    res.status(500).json({ error: 'Could not remove this stay right now.' });
  }
});

export default router;
