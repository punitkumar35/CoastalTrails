import 'dotenv/config';
import { sendEmail } from '../utils/email.js';

const a = await sendEmail({ to: 'check-auth@verifier.port25.com', subject: 'Coastal Trails auth check', text: 'SPF DKIM DMARC test' });
console.log('port25:', a.messageId);
const b = await sendEmail({ to: 'pankajnaik070@gmail.com', subject: 'Coastal Trails — SMTP test (post-DNS fix)', text: 'SMTP test after SPF/DKIM/DMARC fix.' });
console.log('gmail:', b.messageId);
