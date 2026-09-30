import { CPanelClient } from './cpanel-client.mjs';

async function main() {
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();

  // Read app.log last lines
  const res = await cp.getFile('app', 'app.log');
  const lines = (res?.data?.content || '').split('\n');
  console.log('=== APP.LOG LAST 25 LINES ===');
  console.log(lines.slice(-25).join('\n'));
}

main().catch(console.error);
