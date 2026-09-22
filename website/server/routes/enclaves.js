import express from 'express';
import { all, get, run } from '../db/index.js';

const router = express.Router();

function slugify(label) {
  const s = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return s || `enclave-${Date.now()}`;
}

router.get('/', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM enclaves ORDER BY sort_order ASC, label ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { label } = req.body;
    if (!label || !String(label).trim()) return res.status(400).json({ error: 'label is required' });
    const id = slugify(label);
    const maxRow = await get('SELECT COALESCE(MAX(sort_order), 0) AS m FROM enclaves');
    await run('REPLACE INTO enclaves (id, label, sort_order) VALUES (?, ?, ?)', [
      id,
      String(label).trim(),
      (maxRow?.m || 0) + 1,
    ]);
    const created = await get('SELECT * FROM enclaves WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await run('DELETE FROM enclaves WHERE id = ?', [req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
