import rateLimit from 'express-rate-limit';

export function getClientIp(req) {
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) return String(cfIp).trim();
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    return String(xff).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

export function isHumanVerified(req) {
  const token = req.headers['x-captcha-token'] || req.body?.captchaToken || req.query?.captchaToken;
  if (!token || typeof token !== 'string') return false;
  if (!token.startsWith('CT_CAPTCHA_')) return false;
  const parts = token.split('_');
  const timestamp = parseInt(parts[2], 10);
  if (isNaN(timestamp)) return false;
  // Token valid for 15 minutes
  return Date.now() - timestamp < 15 * 60 * 1000;
}

/**
 * General API Limiter: 200 requests per minute per IP across /api/*
 */
export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isHumanVerified(req),
  keyGenerator: (req) => getClientIp(req),
  handler: (req, res) => {
    const retrySec = req.rateLimit?.resetTime
      ? Math.max(1, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000))
      : 60;
    res.status(429).json({
      error: 'Too many requests or unusual traffic detected. Security verification required.',
      code: 'RATE_LIMIT_EXCEEDED',
      requiresCaptcha: true,
      retryAfterSeconds: retrySec,
    });
  },
});

/**
 * Strict Auth Limiter: 15 attempts per 15 minutes per IP on login & register
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isHumanVerified(req),
  keyGenerator: (req) => getClientIp(req),
  handler: (req, res) => {
    const retrySec = req.rateLimit?.resetTime
      ? Math.max(1, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000))
      : 900;
    res.status(429).json({
      error: 'Multiple authentication attempts detected. Please complete human verification to continue.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      requiresCaptcha: true,
      retryAfterSeconds: retrySec,
    });
  },
});

/**
 * Booking Limiter: 15 booking requests per minute per IP
 */
export const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isHumanVerified(req),
  keyGenerator: (req) => getClientIp(req),
  handler: (req, res) => {
    const retrySec = req.rateLimit?.resetTime
      ? Math.max(1, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000))
      : 60;
    res.status(429).json({
      error: 'High booking activity detected. Please complete human verification to continue.',
      code: 'BOOKING_RATE_LIMIT_EXCEEDED',
      requiresCaptcha: true,
      retryAfterSeconds: retrySec,
    });
  },
});
