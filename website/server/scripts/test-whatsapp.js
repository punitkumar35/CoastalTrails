import 'dotenv/config';

const GRAPH = 'https://graph.facebook.com';
const version = process.env.WHATSAPP_API_VERSION || 'v22.0';
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

function fail(message) {
  console.error(`\n${message}\n`);
  process.exitCode = 1;
}

async function main() {
  if (!phoneNumberId || !accessToken) {
    return fail('WhatsApp Cloud API is not configured. Add WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN to website/server/.env');
  }

  const args = process.argv.slice(2);

  if (args[0] === '--templates') {
    if (!wabaId) return fail('WHATSAPP_BUSINESS_ACCOUNT_ID is missing in website/server/.env');
    const res = await fetch(
      `${GRAPH}/${version}/${wabaId}/message_templates?fields=name,status,category,language,components&limit=200`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) return fail(data?.error?.message || `Template list failed (${res.status})`);
    for (const t of data.data || []) {
      const body = (t.components || []).find((c) => c.type === 'BODY');
      const vars = body ? (body.text.match(/\{\{\d+\}\}/g) || []).length : 0;
      console.log(`${t.name} | ${t.language} | ${t.status} | ${t.category} | vars=${vars}`);
    }
    console.log(`Total: ${(data.data || []).length} template(s)`);
    return;
  }

  const to = String(args[0] || '').replace(/\D/g, '');
  const templateName = args[1] || 'hello_world';
  const language = args[2] || process.env.WHATSAPP_TEMPLATE_LANG || 'en';

  if (!to) {
    console.log('Usage:');
    console.log('  npm run whatsapp:test -- --templates');
    console.log('  npm run whatsapp:test -- 919008046850 hello_world en_US');
    process.exitCode = 1;
    return;
  }

  const res = await fetch(`${GRAPH}/${version}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: templateName, language: { code: language } },
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) return fail(data?.error?.message || `Send failed (${res.status})`);
  console.log(`Sent "${templateName}" (${language}) to ${to}`);
  console.log(`  message id: ${data?.messages?.[0]?.id}`);
}

main();
