import { CPanelClient } from './cpanel-client.mjs';

async function main() {
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();
  console.log('Logged into cPanel.');

  // Fetch current .htaccess
  const htRes = await cp.getFile('public_html', '.htaccess');
  let content = htRes?.data?.content || '';

  // Change DirectoryIndex to index.html index.php
  content = content.replace('DirectoryIndex index.php index.html', 'DirectoryIndex index.html index.php');

  await cp.saveFile('public_html', '.htaccess', content);
  console.log('Updated DirectoryIndex to index.html index.php');
}

main().catch(console.error);
