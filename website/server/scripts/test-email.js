// Built-in SMTP diagnostics: verifies the connection and sends one test email.
//
//   Set SMTP_* values in website/server/.env, then:
//     npm run email:test                    → sends to SMTP_USER (self)
//     npm run email:test -- you@gmail.com   → sends to another address

import 'dotenv/config';
import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 465);
const secure = String(process.env.SMTP_SECURE ?? 'true') === 'true';
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASSWORD;
const to = process.argv[2] || user;

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

if (!host || !user) {
  fail('SMTP is not configured. Add SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD / SMTP_SECURE to website/server/.env');
}
if (!pass) {
  fail('SMTP_PASSWORD is empty in website/server/.env — add the mailbox password for ' + user + ' and run this again.');
}
if (!to) {
  fail('No recipient. Pass one: npm run email:test -- you@gmail.com');
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
});

console.log(`\nConnecting to ${host}:${port} (secure=${secure}) as ${user}…`);

try {
  await transporter.verify();
  console.log('✔ SMTP connection + authentication OK');
} catch (err) {
  fail(`SMTP check failed: ${err.message}`);
}

try {
  const info = await transporter.sendMail({
    from: `"Coastal Trails" <${user}>`,
    to,
    subject: 'Coastal Trails — SMTP test',
    text: 'SMTP is working. This is the test email sent from the Coastal Trails booking server.',
    html: `
      <div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#0d47a1;margin-bottom:4px">Coastal Trails — SMTP test</h2>
        <p style="color:#5f6b7a;margin-top:0">Sent from the booking server via cPanel SMTP.</p>
        <p>If you are reading this, email delivery is configured correctly and booking
        confirmations can be enabled next.</p>
        <p style="font-size:12px;color:#5f6b7a">— Coastal Trails · booking@coastaltrails.in</p>
      </div>
    `,
  });
  console.log(`✔ Test email sent to ${to}`);
  console.log(`  messageId: ${info.messageId}`);
  console.log(`  server:    ${info.envelope?.from} → ${(info.accepted || []).join(', ')}\n`);
  process.exit(0);
} catch (err) {
  fail(`Sending failed: ${err.message}`);
}
