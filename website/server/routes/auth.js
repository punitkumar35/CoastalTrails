import crypto from 'crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import { get, run } from '../db/index.js';
import { requireAuth, startSession, endSession } from '../middleware/auth.js';
import { sendSignupWhatsApp } from '../utils/whatsapp.js';
import { authLimiter, isHumanVerified, getClientIp } from '../middleware/rateLimiter.js';
import { sendPasswordResetEmail } from '../services/mail.js';

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
    avatar_url: row.avatar_url || undefined,
    role: row.role,
    profile_image: row.profile_image || undefined,
    date_of_birth: row.date_of_birth || undefined,
  };
}

async function verifyGoogleToken(credential) {
  if (!credential) return null;

  // 1. Dev / test mode token
  if (process.env.NODE_ENV !== 'production' && credential.startsWith('dev_')) {
    const parts = credential.split(':');
    const email = (parts[1] || 'traveler@coastaltrails.in').toLowerCase();
    const name = parts[2] || 'Trail Explorer';
    return {
      googleId: 'dev_gid_' + Buffer.from(email).toString('hex').slice(0, 16),
      email,
      name,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80',
    };
  }

  // Determine token structure:
  // - JWT ID Tokens have exactly 3 dot-separated base64url segments (header.payload.sig)
  // - Google OAuth2 Access Tokens begin with 'ya29.' or are non-JWT strings
  const isJwt = credential.split('.').length === 3;

  const verifyUserInfo = async () => {
    try {
      const uiUrl = 'https://www.googleapis.com/oauth2/v3/userinfo';
      const uiRes = await fetch(uiUrl, {
        headers: { Authorization: `Bearer ${credential}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      });
      if (uiRes.ok) {
        const data = await uiRes.json();
        if (data && data.sub && data.email) {
          return {
            googleId: data.sub,
            email: data.email.toLowerCase(),
            name: data.name || data.email.split('@')[0],
            avatarUrl: data.picture || null,
          };
        }
      }
    } catch (err) {
      console.warn('Google userinfo verification error:', err.message);
    }
    return null;
  };

  const verifyTokenInfo = async () => {
    try {
      const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.sub && data.email) {
          if (!process.env.GOOGLE_CLIENT_ID || data.aud === process.env.GOOGLE_CLIENT_ID) {
            return {
              googleId: data.sub,
              email: data.email.toLowerCase(),
              name: data.name || data.email.split('@')[0],
              avatarUrl: data.picture || null,
            };
          }
        }
      }
    } catch (err) {
      console.warn('Google tokeninfo verification error:', err.message);
    }
    return null;
  };

  // Fast direct path based on token format: avoids the 2-4 second penalty of failing tokeninfo on access tokens
  if (isJwt) {
    const verified = await verifyTokenInfo();
    if (verified) return verified;
    return await verifyUserInfo();
  } else {
    const verified = await verifyUserInfo();
    if (verified) return verified;
    return await verifyTokenInfo();
  }
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
  const ip = getClientIp(req);
  return `${ip}:${String(identifier || '').toLowerCase()}`;
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

const forgotAttempts = new Map();
const resetAttempts = new Map();
const MAX_FORGOT_REQUESTS = 5;
const MAX_RESET_ATTEMPTS = 10;

function isLimited(map, key, max) {
  const entry = map.get(key);
  if (!entry || Date.now() - entry.start > RATE_WINDOW_MS) return false;
  return entry.count >= max;
}

function bumpLimit(map, key) {
  const entry = map.get(key);
  if (!entry || Date.now() - entry.start > RATE_WINDOW_MS) {
    map.set(key, { start: Date.now(), count: 1 });
  } else {
    entry.count += 1;
  }
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
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

// POST /api/auth/verify-captcha
router.post('/verify-captcha', (req, res) => {
  if (isHumanVerified(req)) {
    return res.json({ verified: true, message: 'Human verification confirmed.' });
  }
  return res.status(400).json({ verified: false, error: 'Invalid or expired captcha token.' });
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    const cleanIdentifier = String(identifier || '').trim();

    if (!cleanIdentifier || !password) {
      return res.status(400).json({ error: 'Mobile number/email and password are required.' });
    }

    const key = rateLimitKey(req, cleanIdentifier);
    const humanVerified = isHumanVerified(req);

    if (humanVerified) {
      // The user solved the coastal jigsaw puzzle, relieve failed attempts lock!
      failedAttempts.delete(key);
    } else {
      const entry = failedAttempts.get(key);
      const recentAttempts = entry && Date.now() - entry.start <= RATE_WINDOW_MS ? entry.count : 0;
      if (recentAttempts >= 5 || isRateLimited(key)) {
        return res.status(429).json({
          error: 'Multiple failed attempts detected. Please complete security verification to continue.',
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
          requiresCaptcha: true,
        });
      }
    }

    const user = await get(
      'SELECT * FROM users WHERE phone = ? OR LOWER(email) = ?',
      [normalizePhone(cleanIdentifier), cleanIdentifier.toLowerCase()]
    );

    if (!user || !user.password_hash) {
      recordFailedAttempt(key);
      const entry = failedAttempts.get(key);
      const count = entry ? entry.count : 1;
      const requiresCaptcha = count >= 5;
      return res.status(requiresCaptcha ? 429 : 401).json({
        error: requiresCaptcha
          ? 'Multiple failed attempts detected. Please complete security verification to continue.'
          : 'Invalid mobile number/email or password.',
        code: requiresCaptcha ? 'AUTH_RATE_LIMIT_EXCEEDED' : 'INVALID_CREDENTIALS',
        requiresCaptcha,
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      recordFailedAttempt(key);
      const entry = failedAttempts.get(key);
      const count = entry ? entry.count : 1;
      const requiresCaptcha = count >= 5;
      return res.status(requiresCaptcha ? 429 : 401).json({
        error: requiresCaptcha
          ? 'Multiple failed attempts detected. Please complete security verification to continue.'
          : 'Invalid mobile number/email or password.',
        code: requiresCaptcha ? 'AUTH_RATE_LIMIT_EXCEEDED' : 'INVALID_CREDENTIALS',
        requiresCaptcha,
      });
    }

    failedAttempts.delete(key);
    const token = await startSession(user.id);
    return res.json({ ...sanitizeUser(user), token });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Could not sign you in right now. Please try again.' });
  }
});

// POST /api/auth/google - One-click Google Sign-In & Registration
router.post('/google', authLimiter, async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required.' });
    }

    const payload = await verifyGoogleToken(credential);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid Google sign-in credential. Please try again.' });
    }

    const { googleId, email, name, avatarUrl } = payload;

    // 1. Match by google_id
    let user = await get('SELECT * FROM users WHERE google_id = ?', [googleId]);

    // 2. If not matched by google_id, match by email
    if (!user) {
      user = await get('SELECT * FROM users WHERE LOWER(email) = ?', [email]);
      if (user) {
        await run(
          'UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?',
          [googleId, avatarUrl, user.id]
        );
        user = await get('SELECT * FROM users WHERE id = ?', [user.id]);
      } else {
        const id = 'usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        await run(
          'INSERT INTO users (id, name, email, google_id, avatar_url, role) VALUES (?, ?, ?, ?, ?, ?)',
          [id, name, email, googleId, avatarUrl, 'traveler']
        );
        user = await get('SELECT * FROM users WHERE id = ?', [id]);
      }
    } else if (avatarUrl && !user.avatar_url) {
      await run('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, user.id]);
      user.avatar_url = avatarUrl;
    }

    const token = await startSession(user.id);
    return res.json({ ...sanitizeUser(user), token });
  } catch (err) {
    console.error('Google auth error:', err.message);
    return res.status(500).json({ error: 'Google sign-in could not be completed. Please try again.' });
  }
});

// GET /api/auth/me - validates current session and returns sanitized user
router.get('/me', requireAuth, (req, res) => {
  return res.json({ ...sanitizeUser(req.user), token: req.authToken });
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

// GET /api/auth/profile - account details with booking stats
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const row = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const totals = await get(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status IN ('awaiting_host','confirmed','checked_in') THEN 1 ELSE 0 END) AS upcoming,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
       FROM bookings WHERE user_id = ?`,
      [req.user.id]
    );
    return res.json({
      ...sanitizeUser(row || req.user),
      member_since: row?.created_at || null,
      bookings_count: Number(totals?.total || 0),
      upcoming_count: Number(totals?.upcoming || 0),
      completed_count: Number(totals?.completed || 0),
    });
  } catch (err) {
    console.error('Profile fetch error:', err.message);
    return res.status(500).json({ error: 'Could not load your profile right now.' });
  }
});

// PUT /api/auth/profile - update name and date of birth only
// Mobile number and email are the account identity and can only be changed by support.
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, date_of_birth } = req.body || {};
    const cleanName = String(name || '').trim();

    if (cleanName.length < 2 || cleanName.length > 60) {
      return res.status(400).json({ error: 'Name must be between 2 and 60 characters.' });
    }

    let cleanDob = null;
    if (date_of_birth) {
      const raw = String(date_of_birth).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return res.status(400).json({ error: 'Date of birth must use the YYYY-MM-DD format.' });
      }
      const parsed = new Date(`${raw}T00:00:00`);
      if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
        return res.status(400).json({ error: 'Enter a valid date of birth in the past.' });
      }
      cleanDob = raw;
    }

    await run('UPDATE users SET name = ?, date_of_birth = ? WHERE id = ?', [cleanName, cleanDob, req.user.id]);
    const updated = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    return res.json(sanitizeUser(updated));
  } catch (err) {
    console.error('Profile update error:', err.message);
    return res.status(500).json({ error: 'Could not save your profile right now.' });
  }
});

// PUT /api/auth/password - change the account password
// Verifies the current password with bcrypt, validates the new one and keeps
// the current device signed in while ending every other session.
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body || {};
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }
    if (confirm_password !== undefined && new_password !== confirm_password) {
      return res.status(400).json({ error: 'New password and confirmation do not match.' });
    }
    if (new_password.length < 8 || !/[A-Za-z]/.test(new_password) || !/[0-9]/.test(new_password)) {
      return res.status(400).json({ error: 'New password must be at least 8 characters and include a letter and a number.' });
    }
    if (new_password === current_password) {
      return res.status(400).json({ error: 'Your new password must be different from the current one.' });
    }

    const row = await get('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!row || !row.password_hash) {
      return res.status(400).json({ error: 'This account does not have a password set.' });
    }

    const matches = await bcrypt.compare(current_password, row.password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'Your current password is incorrect.' });
    }

    const hash = await bcrypt.hash(new_password, BCRYPT_COST);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    await run('DELETE FROM sessions WHERE user_id = ? AND token <> ?', [req.user.id, req.authToken]);
    return res.json({ success: true, other_sessions_signed_out: true });
  } catch (err) {
    console.error('Password change error:', err.message);
    return res.status(500).json({ error: 'Could not change your password right now.' });
  }
});

// POST /api/auth/forgot-password - email a single-use reset link
// Always answers with the same generic message so account existence is never revealed.
router.post('/forgot-password', async (req, res) => {
  const genericResponse = {
    success: true,
    message: 'If an account exists for that email, a reset link has been sent.',
  };
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }

    const key = rateLimitKey(req, email);
    if (isLimited(forgotAttempts, key, MAX_FORGOT_REQUESTS)) {
      return res.status(429).json({ error: 'Too many reset requests. Please wait 15 minutes and try again.' });
    }
    bumpLimit(forgotAttempts, key);

    const user = await get(
      'SELECT id, name, email FROM users WHERE LOWER(email) = ? AND password_hash IS NOT NULL',
      [email],
    );

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashResetToken(rawToken);
      await run('DELETE FROM password_resets WHERE user_id = ?', [user.id]);
      await run(
        'INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))',
        ['rst_' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex'), user.id, tokenHash],
      );

      const base = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
      const resetUrl = `${base.replace(/\/$/, '')}/reset-password?token=${rawToken}`;
      try {
        await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl, minutes: 15 });
      } catch (mailErr) {
        console.error('[forgot-password] reset email could not be sent:', mailErr.message);
      }
    }

    return res.json(genericResponse);
  } catch (err) {
    console.error('Forgot password error:', err.message);
    return res.status(500).json({ error: 'Could not process the request right now. Please try again.' });
  }
});

// POST /api/auth/reset-password - consume a reset token and set a new password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, new_password, confirm_password } = req.body || {};
    if (!token || !new_password) {
      return res.status(400).json({ error: 'Reset token and new password are required.' });
    }
    if (confirm_password !== undefined && new_password !== confirm_password) {
      return res.status(400).json({ error: 'New password and confirmation do not match.' });
    }
    if (new_password.length < 8 || !/[A-Za-z]/.test(new_password) || !/[0-9]/.test(new_password)) {
      return res.status(400).json({ error: 'New password must be at least 8 characters and include a letter and a number.' });
    }

    const key = `reset:${req.ip}`;
    if (isLimited(resetAttempts, key, MAX_RESET_ATTEMPTS)) {
      return res.status(429).json({ error: 'Too many attempts. Please wait 15 minutes and try again.' });
    }
    bumpLimit(resetAttempts, key);

    const row = await get(
      'SELECT id, user_id, expires_at FROM password_resets WHERE token_hash = ?',
      [hashResetToken(token)],
    );
    if (!row) {
      return res.status(400).json({ error: 'This reset link is invalid or has already been used.' });
    }
    if (new Date(String(row.expires_at).replace(' ', 'T')) < new Date()) {
      await run('DELETE FROM password_resets WHERE id = ?', [row.id]);
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
    }

    const hash = await bcrypt.hash(new_password, BCRYPT_COST);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, row.user_id]);
    await run('DELETE FROM password_resets WHERE user_id = ?', [row.user_id]);
    await run('DELETE FROM sessions WHERE user_id = ?', [row.user_id]);

    return res.json({ success: true, message: 'Your password has been reset. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    return res.status(500).json({ error: 'Could not reset your password right now. Please try again.' });
  }
});

export default router;
