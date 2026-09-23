import nodemailer from 'nodemailer';

// Lazily created so the API can boot without SMTP credentials configured.
let transporter = null;

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE ?? 'true') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });
}

export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function getTransporter() {
  if (!emailConfigured()) return null;
  if (!transporter) transporter = createTransporter();
  return transporter;
}

// Verifies host/port/credentials without sending anything.
export async function verifyEmailConnection() {
  const t = getTransporter();
  if (!t) return { ok: false, reason: 'SMTP not configured' };
  try {
    await t.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

// Sends an email through cPanel SMTP. Returns the nodemailer info object.
export async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    throw new Error('SMTP is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in .env).');
  }
  const info = await t.sendMail({
    from: `"Coastal Trails" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text,
  });
  console.log(`[email] sent "${subject}" to ${to} (${info.messageId})`);
  return info;
}
