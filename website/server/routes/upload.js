import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { run } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    cb(null, `stay-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const router = express.Router();

router.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'photo is required' });
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

// POST /api/upload/avatar - the logged-in customer's profile picture
router.post('/upload/avatar', requireAuth, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'photo is required' });
  try {
    const url = `/uploads/${req.file.filename}`;
    await run('UPDATE users SET profile_image = ? WHERE id = ?', [url, req.user.id]);
    res.status(201).json({ url });
  } catch (err) {
    res.status(500).json({ error: 'Could not save your profile picture right now.' });
  }
});

export default router;
