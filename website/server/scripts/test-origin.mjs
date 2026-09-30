import { CPanelClient } from './cpanel-client.mjs';

async function main() {
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();
  console.log('cPanel logged in.');
  const testPhp = '<?php echo "PHP_EXECUTION_SUCCESSFUL_" . time(); ?>';
  await cp.saveFile('public_html', 'test_php.php', testPhp);
  console.log('Saved test_php.php to public_html');
}

main().catch(console.error);
