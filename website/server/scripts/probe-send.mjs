import 'dotenv/config';
import { sendEmail } from '../utils/email.js';
const info = await sendEmail({
  to: 'coastaltestmucdqra0@uberip.com',
  subject: 'Coastal Trails delivery probe',
  html: '<p>Delivery probe from the Coastal Trails booking server.</p>',
  text: 'Delivery probe from the Coastal Trails booking server.',
});
console.log('sent:', info.messageId, 'accepted:', (info.accepted || []).join(','));
