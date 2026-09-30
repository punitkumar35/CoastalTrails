import { CPanelClient } from './cpanel-client.mjs';

async function main() {
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();
  console.log('cPanel logged in.');

  // 1. Check vhost PHP version
  const phpVer = await cp.uapi('LangPHP', 'php_get_vhost_versions');
  console.log('PHP vhost version:', JSON.stringify(phpVer?.data));

  // 2. Read app.log last lines
  const logRes = await cp.getFile('app', 'app.log');
  console.log('=== APP.LOG LAST 30 LINES ===');
  const lines = (logRes?.data?.content || '').split('\n');
  console.log(lines.slice(-30).join('\n'));

  // 3. Check if supervisor/node is running
  const envRes = await cp.getFile('app', '.env');
  console.log('PORT in .env:', (envRes?.data?.content || '').match(/PORT=.*/)?.[0]);
}

main().catch(console.error);
