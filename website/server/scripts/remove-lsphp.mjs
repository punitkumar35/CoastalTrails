import { CPanelClient } from './cpanel-client.mjs';

async function main() {
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();
  console.log('Logged into cPanel.');

  const htRes = await cp.getFile('public_html', '.htaccess');
  let content = htRes?.data?.content || '';

  // Remove the lsphp handler block
  content = content.replace(/# php -- BEGIN cPanel-generated handler[\s\S]*?# php -- END cPanel-generated handler/g, '');
  content = content.replace(/AddHandler application\/x-httpd-ea-php8[0-9]___lsphp[^\n]*/g, '');

  await cp.saveFile('public_html', '.htaccess', content);
  console.log('Removed lsphp handler from .htaccess');
}

main().catch(console.error);
