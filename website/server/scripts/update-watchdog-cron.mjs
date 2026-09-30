import { CPanelClient } from './cpanel-client.mjs';
import querystring from 'querystring';
import https from 'https';

async function main() {
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();
  console.log('Logged into cPanel.');

  // 1. Remove old cron (linekey: 1188120115)
  const rmQ = querystring.stringify({
    cpanel_jsonapi_module: 'Cron',
    cpanel_jsonapi_func: 'remove_line',
    cpanel_jsonapi_apiversion: '2',
    linekey: 1188120115
  });
  const rmRes = await new Promise(resolve => {
    https.get(`https://${cp.host}:2083${cp.secToken}/json-api/cpanel?${rmQ}`, { rejectUnauthorized: false, headers: { Cookie: cp.cookie } }, r => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => resolve(JSON.parse(b)));
    });
  });
  console.log('Removed old cron:', JSON.stringify(rmRes?.cpanelresult?.data));

  // 2. Add new 3-minute watchdog cron
  const addQ = querystring.stringify({
    cpanel_jsonapi_module: 'Cron',
    cpanel_jsonapi_func: 'add_line',
    cpanel_jsonapi_apiversion: '2',
    command: '/bin/bash /home2/coastaee/run_node.sh >/dev/null 2>&1',
    minute: '*/3',
    hour: '*',
    day: '*',
    month: '*',
    weekday: '*'
  });
  const addRes = await new Promise(resolve => {
    https.get(`https://${cp.host}:2083${cp.secToken}/json-api/cpanel?${addQ}`, { rejectUnauthorized: false, headers: { Cookie: cp.cookie } }, r => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => resolve(JSON.parse(b)));
    });
  });
  console.log('Added 3-min watchdog cron:', JSON.stringify(addRes?.cpanelresult?.data));
}

main().catch(console.error);
