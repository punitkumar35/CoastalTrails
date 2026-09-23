import crypto from 'crypto';
import { get, run } from '../db/index.js';

const SESSION_DAYS = 30;

export function createSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function sessionExpiry() {
  const d = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export async function startSession(userId) {
  await run('DELETE FROM sessions WHERE expires_at < NOW()');
  const token = createSessionToken();
  await run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', [token, userId, sessionExpiry()]);
  return token;
}

export async function endSession(token) {
  if (token) await run('DELETE FROM sessions WHERE token = ?', [token]);
}

// Resolves the logged-in user from the Bearer token — the server decides the
// author of a review, never the browser.
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    if (!token) {
      return res.status(401).json({ error: 'Please sign in to continue.' });
    }

    const session = await get(
      `SELECT s.token, s.expires_at, u.id, u.name, u.phone, u.email, u.role
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`,
      [token]
    );

    if (!session) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }

    if (new Date(String(session.expires_at).replace(' ', 'T')) < new Date()) {
      await endSession(token);
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }

    req.user = { id: session.id, name: session.name, phone: session.phone, email: session.email, role: session.role };
    req.authToken = token;
    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Could not verify your session. Please try again.' });
  }
}

// Admin console routes: valid session AND the admin role
export function requireAdmin(req, res, next) {
  return requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    return next();
  });
}

// Optional auth: resolves the user when a token is present, but never rejects
export async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    if (!token) return next();
    const session = await get(
      `SELECT s.expires_at, u.id, u.name, u.phone, u.email, u.role
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`,
      [token]
    );
    if (session && new Date(String(session.expires_at).replace(' ', 'T')) >= new Date()) {
      req.user = { id: session.id, name: session.name, phone: session.phone, email: session.email, role: session.role };
      req.authToken = token;
    }
    return next();
  } catch {
    return next();
  }
}
