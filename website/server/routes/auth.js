import express from 'express';
import bcrypt from 'bcryptjs';
import { get, run } from '../db/index.js';
import { requireAuth, startSession, endSession } from '../middleware/auth.js';
import { sendSignupWhatsApp } from '../utils/whatsapp.js';

const router = express.Router();

const BCRYPT_COST = 10;
const PHONE_RE = /^\+?[0-9]{10,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 8;

const failedAttempts = new Map();

function normalizePhone(raw) {
  return String(raw || '').replace(/[\s\-()]/g, '');
}

function sanitizeUser(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || undefined,
    email: row.email || undefined,
    role: row.role,
  };
}

function validateRegistration({ name, phone, email, password }) {
  const errors = [];
  const cleanName = String(name || '').trim();
  const cleanPhone = normalizePhone(phone);
  const cleanEmail = String(email || '').trim();

  if (cleanName.length < 2 || cleanName.length > 60) {
    errors.push('Name must be between 2 and 60 characters.');
  }
  if (!cleanPhone) {
    errors.push('Mobile number is required.');
  } else if (!PHONE_RE.test(cleanPhone)) {
    errors.push('Enter a valid mobile number (10-15 digits, optional +country code).');
  }
  if (!cleanEmail) {
    errors.push('Email address is required.');
  } else if (!EMAIL_RE.test(cleanEmail)) {
    errors.push('Enter a valid email address.');
  }
  if (!password) {
    errors.push('Password is required.');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    errors.push('Password must include at least one letter and one number.');
  }
  return errors;
}

function rateLimitKey(req, identifier) {
  return `${req.ip}:${String(identifier || '').toLowerCase()}`;
}

function isRateLimited(key) {
  const entry = failedAttempts.get(key);
  if (!entry || Date.now() - entry.start > RATE_WINDOW_MS) return false;
  return entry.count >= MAX_FAILED_ATTEMPTS;
}

function recordFailedAttempt(key) {
  const entry = failedAttempts.get(key);
  if (!entry || Date.now() - entry.start > RATE_WINDOW_MS) {
    failedAttempts.set(key, { start: Date.now(), count: 1 });
  } else {
    entry.count += 1;
  }
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, phone, email, password } = req.body || {};
    const errors = validateRegistration({ name, phone, email, password });
    if (errors.length) {
      return res.status(400).json({ error: errors[0], details: errors });
    }

    const cleanPhone = normalizePhone(phone);
    const cleanEmail = String(email).trim().toLowerCase();

    const phoneTaken = await get('SELECT id FROM users WHERE phone = ?', [cleanPhone]);
    if (phoneTaken) {
      return res.status(409).json({ error: 'An account with this mobile number already exists. Try signing in instead.' });
    }

    const emailTaken = await get('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (emailTaken) {
      return res.status(409).json({ error: 'An account with this email already exists. Try signing in instead.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const id = 'usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    await run(
      'INSERT INTO users (id, phone, name, email, role, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [id, cleanPhone, String(name).trim(), cleanEmail, 'traveler', passwordHash]
    );

    const created = await get('SELECT * FROM users WHERE id = ?', [id]);
    const token = await startSession(created.id);

    const whatsapp = await sendSignupWhatsApp(created);
    console.log(
      whatsapp.sent
        ? `WhatsApp welcome sent to ${created.phone} (${whatsapp.provider})`
        : `WhatsApp welcome send failed for ${created.phone}: ${whatsapp.reason}`
    );

    return res.status(201).json({ ...sanitizeUser(created), token, whatsapp_notification: whatsapp });
  } catch (err) {
    console.error('Register error:', err.message);
    return res.status(500).json({ error: 'Could not create your account right now. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    const cleanIdentifier = String(identifier || '').trim();

    if (!cleanIdentifier || !password) {
      return res.status(400).json({ error: 'Mobile number/email and password are required.' });
    }

    const key = rateLimitKey(req, cleanIdentifier);
    if (isRateLimited(key)) {
      return res.status(429).json({ error: 'Too many failed attempts. Please wait 15 minutes and try again.' });
    }

    const user = await get(
      'SELECT * FROM users WHERE phone = ? OR LOWER(email) = ?',
      [normalizePhone(cleanIdentifier), cleanIdentifier.toLowerCase()]
    );

    if (!user || !user.password_hash) {
      recordFailedAttempt(key);
      return res.status(401).json({ error: 'Invalid mobile number/email or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      recordFailedAttempt(key);
      return res.status(401).json({ error: 'Invalid mobile number/email or password.' });
    }

    failedAttempts.delete(key);
    const token = await startSession(user.id);
    return res.json({ ...sanitizeUser(user), token });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Could not sign you in right now. Please try again.' });
  }
});

// POST /api/auth/logout - end the current session
router.post('/logout', requireAuth, async (req, res) => {
  try {
    await endSession(req.authToken);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Could not sign you out right now.' });
  }
});

export default router;
