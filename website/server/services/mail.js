import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';

const SITE_URL = process.env.SITE_URL || 'https://coastaltrails.in';
const HOLD_RATE = 0.2;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, '../assets/brand-logo.png');
const WORDMARK_PATH = path.resolve(__dirname, '../assets/wordmark.png');
const ICON_DIR = path.resolve(__dirname, '../assets/icons');

const ICON_NAMES = [
  'star', 'leaf', 'map-pin', 'sun', 'calendar', 'clock', 'moon', 'users',
  'smartphone', 'receipt', 'id-card', 'check-circle-2', 'check-circle',
  'calendar-days', 'log-out', 'shield-check', 'credit-card', 'message-circle',
  'bell', 'lock', 'x-circle',
];

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtMoney(n) {
  return new Intl.NumberFormat('en-IN').format(Number(n) || 0);
}

function toDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && value) return new Date(`${value}T00:00:00`);
  return null;
}

function fmtDate(iso, opts) {
  const d = toDate(iso);
  if (!d || Number.isNaN(d.getTime())) return '—';
  if (opts?.long) {
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (opts?.short) {
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function nights(booking) {
  const a = toDate(booking.check_in)?.getTime();
  const b = toDate(booking.check_out)?.getTime();
  if (!a || !b || Number.isNaN(a) || Number.isNaN(b)) return 1;
  return Math.max(1, Math.round((b - a) / 86400000));
}

const icon = (name, size, extra = '') =>
  `<img src="cid:icon-${name}" width="${size}" height="${size}" alt="" style="display:inline-block;vertical-align:middle;border:0;${extra}">`;

function pill(label, color, bg, border) {
  return `<span style="display:inline-block;background-color:${bg};border:1px solid ${border};color:${color};padding:4px 10px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;white-space:nowrap;">&bull; ${label}</span>`;
}

const PILLS = {
  awaiting: () => pill('Awaiting Host', '#b45309', '#fef8ec', '#f6d8a3'),
  confirmed: () => pill('Confirmed', '#047857', '#ecfdf5', '#a7f3d0'),
  declined: () => pill('Declined', '#b91c1c', '#fef2f2', '#fecaca'),
  cancelled: () => pill('Cancelled', '#64748b', '#f8fafc', '#e2e8f0'),
  pending: () => pill('Payment Pending', '#b45309', '#fef8ec', '#f6d8a3'),
  failed: () => pill('Payment Failed', '#b91c1c', '#fef2f2', '#fecaca'),
  newrequest: () => pill('New Request', '#0f3d35', '#e4f2ee', '#bfe0d7'),
};

function receiptRows(booking, paymentState) {
  const holdLabel =
    paymentState === 'paid'
      ? '20% hold paid online'
      : paymentState === 'failed'
        ? '20% hold &mdash; payment failed'
        : paymentState === 'refunded'
          ? '20% hold &mdash; refunded'
          : '20% hold due online';
  const holdColor = paymentState === 'paid' ? '#059669' : paymentState === 'failed' ? '#dc2626' : '#b45309';
  const holdIcon = paymentState === 'paid' ? 'check-circle-2' : 'clock';
  const payableLabel = paymentState === 'paid' ? '80% balance due at stay' : '80% balance at property';
  return `
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:22px;">
                      <tr>
                        <td style="color:#64748b;padding:4px 0;">Total stay tariff (${nights(booking)} night${nights(booking) === 1 ? '' : 's'})</td>
                        <td align="right" style="font-weight:600;color:#1e293b;padding:4px 0;font-family:'Courier New',monospace;">&#8377;${fmtMoney(booking.total_amount)}</td>
                      </tr>
                      <tr>
                        <td style="color:${holdColor};font-weight:600;padding:4px 0;">
                          ${icon(holdIcon, 12, 'margin-right:3px;')}
                          ${holdLabel}
                        </td>
                        <td align="right" style="font-weight:700;color:${holdColor};padding:4px 0;font-family:'Courier New',monospace;">&#8377;${fmtMoney(booking.advance_paid)}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;padding:4px 0;">${payableLabel}</td>
                        <td align="right" style="font-weight:600;color:#1e293b;padding:4px 0;font-family:'Courier New',monospace;">&#8377;${fmtMoney(booking.balance_payable_at_property)}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;padding:4px 0;">Platform &amp; Concierge fee</td>
                        <td align="right" style="font-weight:600;color:#059669;padding:4px 0;">Waived</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;padding:4px 0;">Coastal Tourism &amp; Green Cess</td>
                        <td align="right" style="font-weight:600;color:#64748b;padding:4px 0;">Included</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top:6px;border-bottom:1px solid #f1f5f9;"></td>
                      </tr>
                      <tr>
                        <td style="font-weight:800;font-size:14px;color:#0f3d35;padding-top:8px;">Payable at Property</td>
                        <td align="right" style="font-weight:800;font-size:17px;color:#0f3d35;padding-top:8px;font-family:'Courier New',monospace;">&#8377;${fmtMoney(booking.balance_payable_at_property)}</td>
                      </tr>
                    </table>`;
}

function cancelledReceipt(booking, paymentState) {
  const refunded = paymentState === 'refunded' || booking.payment_status === 'refunded';
  const charged = refunded || Number(booking.advance_paid) > 0;
  const holdAmount = Number(booking.advance_paid) > 0
    ? Number(booking.advance_paid)
    : Math.round(Number(booking.total_amount) * HOLD_RATE);
  return `
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:22px;">
                      <tr>
                        <td style="color:#64748b;padding:4px 0;">Booking ref</td>
                        <td align="right" style="font-weight:700;color:#1e293b;padding:4px 0;font-family:'Courier New',monospace;">${escapeHtml(booking.reference_code)}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;padding:4px 0;">Cancelled on</td>
                        <td align="right" style="font-weight:600;color:#1e293b;padding:4px 0;">${escapeHtml(fmtDate(new Date()))}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;padding:4px 0;">Hold amount (20%)</td>
                        <td align="right" style="font-weight:800;color:${refunded ? '#059669' : '#0f3d35'};padding:4px 0;font-family:'Courier New',monospace;">&#8377;${fmtMoney(holdAmount)}${charged ? '' : ' (not charged)'}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top:6px;border-bottom:1px solid #f1f5f9;"></td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top:8px;font-size:12px;color:#334155;line-height:18px;">
                          ${refunded ? icon('check-circle-2', 14, 'margin-right:4px;') : icon('clock', 14, 'margin-right:4px;')}
                          ${refunded ? 'Refund initiated &mdash; this amount will be returned to your original payment method (5&ndash;7 business days).' : 'No payment was captured for this booking.'}
                        </td>
                      </tr>
                    </table>`;
}

function voucher({ booking, stay, paymentState, statusPill, cta, guestName, cancelled }) {
  const n = nights(booking);
  const roomLabel = booking.room_number ? `Room ${booking.room_number}` : 'Private Chalet';
  return `
        <table role="presentation" class="email-container" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.05);">

          <tr>
            <td class="mobile-padding" style="padding:16px 22px;background-color:#ffffff;border-bottom:1px solid #edf2f7;">
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="56" valign="middle" style="padding-right:10px;">
                    <img src="cid:coastallogo" alt="Coastal Trails" width="50" style="display:block;width:50px;height:auto;border:0;background:transparent;">
                  </td>
                  <td valign="middle">
                    <div>
                      <span style="background-color:#e4f2ee;color:#0f3d35;font-size:9px;font-weight:800;letter-spacing:0.8px;padding:3px 6px;border-radius:4px;text-transform:uppercase;">Digital Pass 2026</span>
                    </div>
                    <div style="font-family:'Courier New',monospace;font-size:15px;font-weight:800;color:#0f3d35;letter-spacing:0.5px;margin-top:3px;">${escapeHtml(booking.reference_code)}</div>
                    ${guestName ? `<div style="font-size:10px;color:#697471;margin-top:2px;letter-spacing:0.2px;">Guest: ${escapeHtml(guestName)}</div>` : ''}
                  </td>
                  <td align="right" valign="middle">
                    ${statusPill}
                    <div style="font-size:10px;color:#697471;margin-top:3px;">${escapeHtml(fmtDate(booking.created_at))}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="mobile-padding" style="padding:24px 22px 18px 22px;text-align:center;">
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <img src="cid:wordmark" alt="Coastal Trails" width="240" style="width:240px;max-width:80%;height:auto;display:block;margin:0 auto;border:0;">
                  </td>
                </tr>
              </table>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 10px auto;">
                <tr>
                  ${stay.rating ? `
                  <td style="background-color:#fffbeb;border:1px solid #fde68a;padding:3px 9px;border-radius:6px;font-size:11px;font-weight:700;color:#b45309;">
                    ${icon('star', 12, 'margin-right:3px;')}
                    ${escapeHtml(stay.rating)} <span style="color:#92400e;font-weight:500;">(${escapeHtml(stay.reviews || 0)} reviews)</span>
                  </td>
                  <td width="8"></td>` : ''}
                  <td style="background-color:#ecfdf5;border:1px solid #a7f3d0;padding:3px 9px;border-radius:6px;font-size:11px;font-weight:700;color:#047857;">
                    ${icon('leaf', 12, 'margin-right:3px;')}
                    Eco-Certified
                  </td>
                </tr>
              </table>

              <h2 style="margin:0 0 6px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;line-height:28px;color:#0f3d35;font-weight:800;letter-spacing:-0.3px;text-align:center;">
                ${escapeHtml(stay.title)}
              </h2>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
                <tr>
                  <td valign="middle" style="padding-right:5px;">${icon('map-pin', 14)}</td>
                  <td valign="middle" style="font-size:13px;color:#4a5568;line-height:17px;">${escapeHtml(stay.location)} &bull; Gokarna, Karnataka</td>
                </tr>
              </table>

              <div style="margin-top:16px;padding-top:12px;border-top:1px solid #f1f5f9;">
                <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" valign="middle" style="font-size:12px;color:#64748b;line-height:18px;">
                      ${icon('sun', 14, 'margin-right:5px;')}
                      <strong style="color:#1e293b;">Coastal Forecast:</strong> 28&deg;C Clear &bull; Arabian Sea Sunset at 6:18 PM &bull; Clifftop Breeze
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <tr>
            <td class="mobile-padding" style="padding:12px 22px 18px 22px;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;">
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td colspan="2" style="padding-bottom:8px;">
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="left">
                          <span style="font-size:11px;font-weight:700;color:#0f3d35;display:inline-block;">
                            ${icon('moon', 12, 'margin-right:3px;')}
                            ${n} Night Stay &bull; ${booking.guests_count} Guest${booking.guests_count > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td align="right" style="font-size:11px;color:#64748b;font-weight:600;">${escapeHtml(roomLabel)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td width="50%" valign="top" class="itinerary-half" style="padding-top:8px;padding-right:12px;">
                    <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Check-In</div>
                    <div style="font-size:16px;font-weight:800;color:#0f172a;margin:2px 0;">${escapeHtml(fmtDate(booking.check_in, { short: true }))}</div>
                    <div style="font-size:11px;color:#64748b;">From 12:00 PM</div>
                  </td>
                  <td width="50%" align="right" valign="top" class="itinerary-half" style="padding-top:8px;padding-left:12px;border-left:1px dashed #e2e8f0;">
                    <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Check-Out</div>
                    <div style="font-size:16px;font-weight:800;color:#0f172a;margin:2px 0;">${escapeHtml(fmtDate(booking.check_out, { short: true }))}</div>
                    <div style="font-size:11px;color:#64748b;">Before 11:00 AM</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="mobile-padding" style="padding:20px 22px;">
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="220" align="center" valign="top" class="mobile-stack mobile-border-bottom mobile-no-padding-right" style="padding-right:24px;text-align:center;">
                    <div style="font-size:11px;font-weight:800;color:#0f3d35;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Fast-Track Pass</div>
                    <img src="cid:qrcode" alt="Check-in QR Code ${escapeHtml(booking.reference_code)}" width="140" height="140" style="display:block;margin:0 auto;">
                    <div style="font-family:'Courier New',monospace;font-size:15px;font-weight:800;letter-spacing:1px;color:#0f3d35;margin-top:8px;background-color:#ecfdf5;padding:4px 14px;border-radius:6px;display:inline-block;">${escapeHtml(booking.reference_code)}</div>
                    <div style="font-size:10px;color:#94a3b8;margin-top:6px;text-transform:uppercase;letter-spacing:0.5px;">Encrypted Pass &bull; Scan on Arrival</div>
                    <div style="margin-top:8px;font-size:11px;font-weight:600;color:#0f3d35;">
                      ${icon('smartphone', 12, 'margin-right:2px;')}
                      Apple &bull; Google Wallet Ready
                    </div>
                  </td>
                  <td valign="top" class="mobile-stack">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                      <tr>
                        <td valign="middle" style="padding-right:5px;">${cancelled ? icon('x-circle', 13) : icon('receipt', 13)}</td>
                        <td valign="middle" style="font-size:11px;font-weight:800;color:#0f3d35;text-transform:uppercase;letter-spacing:0.8px;">${cancelled ? 'Cancellation Details' : 'Fare Receipt'}</td>
                      </tr>
                    </table>
                    ${cancelled ? cancelledReceipt(booking, paymentState) : receiptRows(booking, paymentState)}
                    ${!cancelled ? `
                    <div style="margin-top:10px;font-size:11px;color:#64748b;line-height:16px;">Accepted: UPI (GPay/PhonePe), Card tap, or Cash.</div>` : ''}
                    ${cta ? `
                    <div style="margin-top:16px;text-align:center;">
                      <a href="${cta.href}" style="display:inline-block;background-color:#0f3d35;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 28px;border-radius:10px;">${cta.label}</a>
                    </div>` : ''}
                    ${cancelled && !cta ? `
                    <div style="margin-top:16px;text-align:center;">
                      <a href="${SITE_URL}" style="display:inline-block;background-color:#0f3d35;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 28px;border-radius:10px;">Book another stay</a>
                    </div>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="mobile-padding" style="padding:0 22px 18px 22px;">
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top:1px solid #f1f5f9;padding-top:12px;font-size:11px;color:#64748b;line-height:17px;">
                <tr>
                  <td valign="top" width="50%" class="mobile-stack" style="padding-right:8px;">
                    ${icon('id-card', 13, 'margin-right:3px;')}
                    <strong>Digital ID:</strong> Govt photo ID (Aadhaar/Passport) requested at check-in.
                  </td>
                  <td valign="top" width="50%" class="mobile-stack" style="padding-top:6px;">
                    ${icon('leaf', 13, 'margin-right:3px;')}
                    <strong>Eco Zone:</strong> Quiet hours after 10:30 PM &bull; Comfortable trail footwear.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="mobile-padding" style="background-color:#ffffff;border-top:1px solid #f0eee3;padding:18px 22px;text-align:center;">
              <p style="margin:0 0 5px 0;font-size:11px;color:#43504d;font-weight:600;">Have questions about your booking or need trail directions?</p>
              <p style="margin:0 0 8px 0;font-size:12px;color:#626f6b;">Our team is ready to assist at <a href="mailto:support@coastaltrails.in" style="color:#0f3d35;font-weight:800;text-decoration:underline;">support@coastaltrails.in</a></p>
              <p style="margin:0;font-size:10px;color:#8e9794;letter-spacing:0.3px;">&copy; 2026 Coastal Trails Hospitality Network &bull; Gokarna, Karnataka. All rights reserved.</p>
            </td>
          </tr>
        </table>`;
}

function emailShell({ title, inner }) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a202c; -webkit-font-smoothing: antialiased; }
    @media only screen and (max-width: 620px) {
      .outer-cell { padding: 8px 6px !important; }
      .email-container { width: 100% !important; max-width: 100% !important; margin: 0 auto !important; border-radius: 12px !important; }
      .mobile-padding { padding-left: 14px !important; padding-right: 14px !important; }
      .mobile-stack { display: block !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }
      .mobile-no-padding-right { padding-right: 0 !important; }
      .mobile-hero-img { width: 100% !important; height: 175px !important; object-fit: cover !important; }
      .mobile-hero-pad { padding-top: 12px !important; }
      .mobile-border-bottom { border-bottom: 1px solid #edf2f7 !important; padding-bottom: 18px !important; margin-bottom: 18px !important; }
      .itinerary-half { width: 50% !important; display: table-cell !important; }
    }
    @media print {
      body { background-color: #ffffff !important; padding: 0 !important; }
      .no-print { display: none !important; }
      .email-container { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:16px 0;background-color:#ffffff;color:#1a202c;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#ffffff">
    <tr>
      <td align="center" class="outer-cell" style="padding:0 12px;">
        ${inner}
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr><td height="20" style="font-size:1px;line-height:1px;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function send({ to, subject, html, label, qrText }) {
  const transporter = getTransporter();
  if (!transporter || !to) {
    console.log(`[mail] SMTP not configured — skipping ${label} (to: ${to})`);
    return { skipped: true };
  }
  const qrBuffer = qrText
    ? await QRCode.toBuffer(qrText, { width: 280, margin: 1, color: { dark: '#0f3d35', light: '#ffffff' } })
    : null;
  const usedIcons = ICON_NAMES.filter((name) => html.includes(`cid:icon-${name}"`));
  await transporter.sendMail({
    from: `"Coastal Trails" <${process.env.SMTP_USER}>`,
    replyTo: process.env.MAIL_REPLY_TO || 'support@coastaltrails.in',
    to,
    subject,
    html,
    attachments: [
      { filename: 'brand-logo.png', path: LOGO_PATH, cid: 'coastallogo' },
      { filename: 'wordmark.png', path: WORDMARK_PATH, cid: 'wordmark' },
      ...usedIcons.map((name) => ({
        filename: `${name}.png`,
        path: path.join(ICON_DIR, `${name}.png`),
        cid: `icon-${name}`,
      })),
      ...(qrBuffer && html.includes('cid:qrcode') ? [{ filename: 'qr.png', content: qrBuffer, cid: 'qrcode' }] : []),
    ],
  });
  console.log(`[mail] ${label} sent → ${to} (${usedIcons.length} icons)`);
  return { sent: true };
}

function qrTextFor(booking) {
  return `${SITE_URL}/pass/${booking.reference_code}`;
}

export async function sendPaymentSuccessEmail({ to, booking, stayTitle, location, hostName, hostWhatsapp, guestName, rating, reviews }) {
  const stay = { title: stayTitle, location, rating, reviews };
  const statusPill =
    booking.status === 'confirmed' || booking.status === 'checked_in' || booking.status === 'completed'
      ? PILLS.confirmed()
      : PILLS.awaiting();
  const html = emailShell({
    title: `Official Booking Voucher & Pass - ${stayTitle} | Coastal Trails`,
    inner: voucher({ booking, stay, paymentState: 'paid', statusPill, guestName }),
  });
  return send({ to, subject: `Payment received · ${booking.reference_code} — ${stayTitle}`, html, label: `payment email for ${booking.reference_code}`, qrText: qrTextFor(booking) });
}

export async function sendPaymentFailedEmail({ to, booking, stayTitle, location, hostName, guestName, rating, reviews }) {
  const stay = { title: stayTitle, location, rating, reviews };
  const html = emailShell({
    title: `Payment failed - Retry your hold | Coastal Trails`,
    inner: voucher({
      booking,
      stay,
      paymentState: 'failed',
      statusPill: PILLS.failed(),
      cta: { label: 'Retry payment', href: `${SITE_URL}/bookings` },
      guestName,
    }),
  });
  return send({ to, subject: `Payment failed · ${booking.reference_code} — retry your 20% hold`, html, label: `payment failed email for ${booking.reference_code}`, qrText: qrTextFor(booking) });
}

export async function sendHoldCreatedEmail({ to, booking, stayTitle, location, hostName, guestName, rating, reviews }) {
  const stay = { title: stayTitle, location, rating, reviews };
  const html = emailShell({
    title: `Booking Voucher & Pass - ${stayTitle} | Coastal Trails`,
    inner: voucher({
      booking,
      stay,
      paymentState: 'pending',
      statusPill: PILLS.pending(),
      cta: { label: 'Pay 20% hold now', href: `${SITE_URL}/bookings` },
      guestName,
    }),
  });
  return send({ to, subject: `Hold created · ${booking.reference_code} — complete your payment`, html, label: `hold email for ${booking.reference_code}`, qrText: qrTextFor(booking) });
}

export async function sendBookingStatusEmail({ to, booking, stayTitle, location, hostName, status, guestName, rating, reviews }) {
  const stay = { title: stayTitle, location, rating, reviews };
  const statusPill =
    status === 'confirmed' || status === 'checked_in' || status === 'completed'
      ? PILLS.confirmed()
      : status === 'declined'
        ? PILLS.declined()
        : PILLS.cancelled();
  const paymentState = booking.payment_status === 'paid' ? 'paid' : booking.payment_status === 'refunded' ? 'refunded' : 'pending';
  const html = emailShell({
    title: `Booking Update - ${stayTitle} | Coastal Trails`,
    inner: voucher({ booking, stay, paymentState, statusPill, guestName, cancelled: status === 'cancelled' }),
  });
  return send({ to, subject: `Booking update · ${booking.reference_code} — ${status}`, html, label: `status email (${status}) for ${booking.reference_code}`, qrText: qrTextFor(booking) });
}

export async function sendAdminNewBookingAlert({ to, booking, stayTitle, location, hostName, guestName, rating, reviews }) {
  const stay = { title: stayTitle, location, rating, reviews };
  const paymentState = booking.payment_status === 'paid' ? 'paid' : 'pending';
  const html = emailShell({
    title: `New Booking - ${booking.reference_code} | Coastal Trails`,
    inner: voucher({ booking, stay, paymentState, statusPill: PILLS.newrequest(), guestName }),
  });
  return send({ to, subject: `New booking · ${booking.reference_code} — ${guestName}`, html, label: `admin alert for ${booking.reference_code}`, qrText: qrTextFor(booking) });
}
