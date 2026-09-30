import { CPanelClient } from './cpanel-client.mjs';

async function main() {
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();
  console.log('Logged into cPanel.');

  // Set vhost version to ea-php82
  const res = await cp.uapi('LangPHP', 'php_set_vhost_versions', {
    vhost: 'coastaltrails.in',
    version: 'ea-php82'
  });
  console.log('php_set_vhost_versions ea-php82:', JSON.stringify(res));

  // Check what was written into .htaccess
  const htRes = await cp.getFile('public_html', '.htaccess');
  const match = (htRes?.data?.content || '').match(/# php -- BEGIN[\s\S]*?# php -- END[^\n]*/);
  console.log('Generated .htaccess block:', match ? match[0] : 'None');
}

main().catch(console.error);
