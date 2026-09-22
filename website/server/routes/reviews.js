import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { all, get, run } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reviewUploadsDir = path.resolve(__dirname, '..', 'uploads', 'reviews');

const DATA_URL_RE = /^data:(image\/(?:png|jpe?g|webp|gif|bmp|avif|tiff));base64,([a-zA-Z0-9+/=]+)$/;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_MEDIA_ITEMS = 3;
const EXT_BY_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/avif': 'avif',
  'image/tiff': 'tiff',
};

function saveMediaItem(item, homestayId) {
  const dataUrl = typeof item === 'string' ? item : item?.dataUrl;
  const match = typeof dataUrl === 'string' ? dataUrl.match(DATA_URL_RE) : null;
  if (!match) {
    return { error: 'Only photos are allowed (JPG, PNG, WEBP, GIF, BMP, AVIF or TIFF).' };
  }

  const mime = match[1];
  const buffer = Buffer.from(match[2], 'base64');

  if (buffer.length === 0) return { error: 'One of the photos is empty.' };
  if (buffer.length > MAX_IMAGE_BYTES) {
    return { error: 'Each photo must be under 5 MB. Please choose a smaller image.' };
  }

  const filename = `${homestayId}-${crypto.randomBytes(8).toString('hex')}.${EXT_BY_MIME[mime] || 'bin'}`;
  fs.mkdirSync(reviewUploadsDir, { recursive: true });
  fs.writeFileSync(path.join(reviewUploadsDir, filename), buffer);
  return { url: `/uploads/reviews/${filename}`, type: 'image' };
}

// Aspect keyword groups used for Amazon-style review topic chips
const TOPIC_PATTERNS = {
  Cleanliness: /clean|spotless|tidy|hygien|fresh/i,
  'Host hospitality': /host|family|warm|welcom|hospital|care|kind/i,
  'Location & view': /location|beach|cliff|view|shore|sunset|sea/i,
  'Value for money': /value|price|worth|afford|budget|money/i,
  'Food & breakfast': /breakfast|food|coffee|meal|dosa|tea/i,
  Comfort: /comfort|bed|quiet|calm|sleep|peaceful|relax/i,
  WiFi: /wifi|internet|network/i,
};

function buildSummary(reviews, homestay) {
  if (reviews.length === 0) return null;

  const total = reviews.length;
  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / total;

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of reviews) {
    const key = Math.max(1, Math.min(5, Math.round(r.rating)));
    distribution[key] += 1;
  }

  const topics = Object.entries(TOPIC_PATTERNS)
    .map(([label, pattern]) => ({
      label,
      count: reviews.filter((r) => pattern.test(`${r.title} ${r.body}`)).length,
    }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);

  const top = topics.slice(0, 3).map((t) => t.label.toLowerCase());
  let summaryText = `Guests rate ${homestay ? homestay.title : 'this stay'} ${average.toFixed(1)} out of 5 across ${total} ${
    total === 1 ? 'review' : 'reviews'
  }.`;
  if (top.length >= 2) {
    summaryText += ` Visitors consistently praise the ${top.slice(0, -1).join(', ')} and ${top[top.length - 1]}.`;
  } else if (top.length === 1) {
    summaryText += ` Visitors consistently praise the ${top[0]}.`;
  }

  return {
    count: total,
    average: Number(average.toFixed(2)),
    distribution,
    topics,
    text: summaryText,
  };
}

// GET /api/reviews?homestay_id=...&limit=6&offset=0
router.get('/', async (req, res) => {
  try {
    const { homestay_id: homestayId, limit, offset } = req.query;
    if (!homestayId) return res.status(400).json({ error: 'homestay_id is required' });

    const homestay = await get('SELECT id, title, rating, reviews_count FROM homestays WHERE id = ?', [homestayId]);
    if (!homestay) return res.status(404).json({ error: 'Homestay not found' });

    const max = Math.min(50, Math.max(1, Number(limit) || 6));
    const skip = Math.max(0, Number(offset) || 0);
    const rows = await all(
      `SELECT r.id, r.user_id, COALESCE(u.name, r.guest_name) AS guest_name, r.rating, r.title, r.body,
              r.stay_details, r.verified, r.helpful_count, r.created_at, r.updated_at
       FROM reviews r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.homestay_id = ?
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT ${max} OFFSET ${skip}`,
      [homestayId]
    );
    const allRows = await all('SELECT rating, title, body FROM reviews WHERE homestay_id = ?', [homestayId]);

    const mediaRows = rows.length
      ? await all(
          `SELECT review_id, media_url, media_type FROM review_media WHERE review_id IN (${rows.map(() => '?').join(',')})`,
          rows.map((r) => r.id)
        )
      : [];
    const mediaByReview = {};
    for (const m of mediaRows) {
      (mediaByReview[m.review_id] ||= []).push({ url: m.media_url, type: m.media_type });
    }

    res.json({
      reviews: rows.map((r) => ({ ...r, media: mediaByReview[r.id] || [] })),
      total: allRows.length,
      summary: buildSummary(allRows, homestay),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews - the logged-in user writes a review (author comes from the session)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { homestay_id, rating, title, body, stay_details } = req.body || {};

    if (!homestay_id || !title || !body) {
      return res.status(400).json({ error: 'Please provide a title and your review text.' });
    }

    const ratingNum = Number(rating);
    if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5 stars.' });
    }

    const cleanTitle = String(title).trim().slice(0, 190);
    const cleanBody = String(body).trim().slice(0, 4000);
    const cleanDetails = stay_details ? String(stay_details).trim().slice(0, 190) : null;

    if (cleanTitle.length < 3) return res.status(400).json({ error: 'Please add a short title (at least 3 characters).' });
    if (cleanBody.length < 10) return res.status(400).json({ error: 'Please write at least 10 characters in your review.' });

    const homestay = await get('SELECT id, rating, reviews_count FROM homestays WHERE id = ?', [homestay_id]);
    if (!homestay) return res.status(404).json({ error: 'Homestay not found' });

    // One review per user per stay — edit the existing one instead
    const existing = await get('SELECT id FROM reviews WHERE homestay_id = ? AND user_id = ?', [homestay_id, req.user.id]);
    if (existing) {
      return res.status(409).json({ error: 'You have already reviewed this stay. Edit your existing review instead.' });
    }

    // Reviews are earned by a *completed* stay, not just by being signed in
    const completedStay = await get(
      `SELECT id FROM bookings
       WHERE homestay_id = ? AND user_id = ?
         AND (status = 'completed' OR (status = 'confirmed' AND check_out <= CURDATE()))
       ORDER BY check_out DESC LIMIT 1`,
      [homestay_id, req.user.id]
    );
    if (!completedStay) {
      return res.status(403).json({
        error: 'You can review this stay once your booking is completed (host confirmed and the check-out date has passed).',
      });
    }

    // Save up to 3 guest photos alongside the review
    const rawMedia = Array.isArray(req.body?.media) ? req.body.media.slice(0, MAX_MEDIA_ITEMS) : [];
    const savedMedia = [];
    for (const item of rawMedia) {
      const saved = saveMediaItem(item, homestay_id);
      if (saved.error) return res.status(400).json({ error: saved.error });
      savedMedia.push(saved);
    }

    const result = await run(
      `INSERT INTO reviews (homestay_id, user_id, booking_id, guest_name, rating, title, body, stay_details, verified, helpful_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
      [homestay_id, req.user.id, completedStay.id, req.user.name, Math.round(ratingNum), cleanTitle, cleanBody, cleanDetails]
    );

    for (const media of savedMedia) {
      await run('INSERT INTO review_media (review_id, media_url, media_type) VALUES (?, ?, ?)', [
        result.lastID,
        media.url,
        media.type,
      ]);
    }

    // Blend the new star rating into the stay's public rating without wiping historic averages
    const reviewCount = Number(homestay.reviews_count) || 0;
    const blended = reviewCount > 0 ? (Number(homestay.rating) * reviewCount + ratingNum) / (reviewCount + 1) : ratingNum;
    await run('UPDATE homestays SET rating = ?, reviews_count = reviews_count + 1 WHERE id = ?', [
      Number(blended.toFixed(2)),
      homestay_id,
    ]);

    const created = await get('SELECT * FROM reviews WHERE id = ?', [result.lastID]);
    res.status(201).json({ ...created, media: savedMedia });
  } catch (err) {
    res.status(500).json({ error: 'Could not post your review right now. Please try again.' });
  }
});

// PATCH /api/reviews/:id - the owner edits their review
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid review id' });

    const review = await get('SELECT * FROM reviews WHERE id = ?', [id]);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (!review.user_id || review.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own review.' });
    }

    const { rating, title, body } = req.body || {};
    const ratingNum = Number(rating);
    if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5 stars.' });
    }

    const cleanTitle = String(title || '').trim().slice(0, 190);
    const cleanBody = String(body || '').trim().slice(0, 4000);
    if (cleanTitle.length < 3) return res.status(400).json({ error: 'Please add a short title (at least 3 characters).' });
    if (cleanBody.length < 10) return res.status(400).json({ error: 'Please write at least 10 characters in your review.' });

    await run('UPDATE reviews SET rating = ?, title = ?, body = ? WHERE id = ?', [
      Math.round(ratingNum),
      cleanTitle,
      cleanBody,
      id,
    ]);

    // Keep the stay's public rating in sync when the star rating changes
    const homestay = await get('SELECT id, rating, reviews_count FROM homestays WHERE id = ?', [review.homestay_id]);
    if (homestay) {
      const count = Math.max(1, Number(homestay.reviews_count) || 1);
      const adjusted = (Number(homestay.rating) * count - review.rating + ratingNum) / count;
      await run('UPDATE homestays SET rating = ? WHERE id = ?', [Number(adjusted.toFixed(2)), review.homestay_id]);
    }

    const updated = await get('SELECT * FROM reviews WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Could not update your review right now. Please try again.' });
  }
});

// DELETE /api/reviews/:id - the owner deletes their review
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid review id' });

    const review = await get('SELECT * FROM reviews WHERE id = ?', [id]);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (!review.user_id || review.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own review.' });
    }

    // Remove any uploaded photo/video files from disk
    const media = await all('SELECT media_url FROM review_media WHERE review_id = ?', [id]);
    for (const m of media) {
      if (String(m.media_url).startsWith('/uploads/reviews/')) {
        try {
          const file = path.join(reviewUploadsDir, path.basename(m.media_url));
          if (fs.existsSync(file)) fs.unlinkSync(file);
        } catch {
          /* file already gone */
        }
      }
    }

    await run('DELETE FROM reviews WHERE id = ?', [id]); // media rows cascade

    // Remove this rating from the stay's aggregate
    const homestay = await get('SELECT id, rating, reviews_count FROM homestays WHERE id = ?', [review.homestay_id]);
    if (homestay) {
      const count = Number(homestay.reviews_count) || 0;
      const newCount = Math.max(0, count - 1);
      const adjusted = newCount > 0 ? (Number(homestay.rating) * count - review.rating) / newCount : Number(homestay.rating);
      await run('UPDATE homestays SET rating = ?, reviews_count = ? WHERE id = ?', [
        Number(adjusted.toFixed(2)),
        newCount,
        review.homestay_id,
      ]);
    }

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete your review right now. Please try again.' });
  }
});

// POST /api/reviews/:id/helpful - mark a review as helpful
router.post('/:id/helpful', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid review id' });

    const review = await get('SELECT id FROM reviews WHERE id = ?', [id]);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    await run('UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ?', [id]);
    const updated = await get('SELECT id, helpful_count FROM reviews WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
