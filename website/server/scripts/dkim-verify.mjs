import 'dotenv/config';
import nodemailer from 'nodemailer';

const t = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE ?? 'true') === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

const info = await t.sendMail({
  from: `"Coastal Trails" <${process.env.SMTP_USER}>`,
  to: 'pankajnaik070@gmail.com',
  bcc: 'booking@coastaltrails.in',
  subject: 'Coastal Trails — DKIM/SPF verification test',
  text: 'Final delivery test after publishing SPF, DKIM and DMARC for coastaltrails.in.',
});
console.log('sent:', info.messageId, 'accepted:', info.accepted.join(','));
