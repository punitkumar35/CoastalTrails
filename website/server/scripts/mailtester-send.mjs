import 'dotenv/config';
import { sendEmail } from '../utils/email.js';
const info = await sendEmail({
  to: 'test-l939wrzw9@srv1.mail-tester.com',
  subject: 'Coastal Trails booking confirmation test',
  html: `<div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:520px;margin:auto">
    <h2 style="color:#0d47a1">Your Coastal Trails booking is confirmed</h2>
    <p> Hi Pankaj, your stay at Gokarna is confirmed for 12-14 Oct 2026. </p>
    <p style="font-size:12px;color:#5f6b7a">Coastal Trails · booking@coastaltrails.in</p>
  </div>`,
  text: 'Your Coastal Trails booking is confirmed.',
});
console.log('sent:', info.messageId);
