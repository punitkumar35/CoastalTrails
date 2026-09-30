import { CPanelClient } from './cpanel-client.mjs';

async function main() {
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();

  const debugPhp = `<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "STEP 1: SCRIPT START\\n";
$indexPath = __DIR__ . '/index.html';
echo "STEP 2: file_exists index.html: " . (file_exists($indexPath) ? 'YES' : 'NO') . "\\n";

$html = file_get_contents($indexPath);
echo "STEP 3: html length: " . strlen($html) . "\\n";

$path = '/';
echo "STEP 4: Testing PDO connection\\n";
try {
    $pdo = new PDO(
        'mysql:host=localhost;dbname=coastaee_gokarna;charset=utf8mb4',
        'coastaee_dbuser',
        'Goodnight01@#DB!',
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 2,
        ]
    );
    echo "STEP 5: PDO connection successful\\n";
} catch (Throwable $e) {
    echo "STEP 5: PDO failed: " . $e->getMessage() . "\\n";
}

echo "STEP 6: COMPLETE\\n";
`;

  await cp.saveFile('public_html', 'test_debug.php', debugPhp);
  console.log('Saved test_debug.php to cPanel.');
}

main().catch(console.error);
