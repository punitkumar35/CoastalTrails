import { CPanelClient } from './cpanel-client.mjs';
import querystring from 'querystring';
import https from 'https';

async function main() {
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();

  const q = querystring.stringify({
    cpanel_jsonapi_module: 'Cron',
    cpanel_jsonapi_func: 'listcron',
    cpanel_jsonapi_apiversion: '2'
  });

  const res = await new Promise(resolve => {
    https.get(`https://${cp.host}:2083${cp.secToken}/json-api/cpanel?${q}`, { rejectUnauthorized: false, headers: { Cookie: cp.cookie } }, r => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => resolve(JSON.parse(b)));
    });
  });

  console.log('Cron API 2 list:', JSON.stringify(res?.cpanelresult?.data, null, 2));
}

main().catch(console.error);
