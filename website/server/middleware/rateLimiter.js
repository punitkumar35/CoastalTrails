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

/**
 * General API Limiter: 200 requests per minute per IP across /api/*
 */
export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  handler: (req, res) => {
    const retrySec = req.rateLimit?.resetTime
      ? Math.max(1, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000))
      : 60;
    res.status(429).json({
      error: 'Too many requests. Please slow down and try again shortly.',
      code: 'RATE_LIMIT_EXCEEDED',
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
  keyGenerator: (req) => getClientIp(req),
  handler: (req, res) => {
    const retrySec = req.rateLimit?.resetTime
      ? Math.max(1, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000))
      : 900;
    res.status(429).json({
      error: 'Too many authentication attempts. Please wait before trying again.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
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
  keyGenerator: (req) => getClientIp(req),
  handler: (req, res) => {
    const retrySec = req.rateLimit?.resetTime
      ? Math.max(1, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000))
      : 60;
    res.status(429).json({
      error: 'Too many booking requests. Please wait a moment before trying again.',
      code: 'BOOKING_RATE_LIMIT_EXCEEDED',
      retryAfterSeconds: retrySec,
    });
  },
});
