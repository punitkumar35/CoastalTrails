import { CPanelClient } from './cpanel-client.mjs';

async function main() {
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();

  const testStartPhp = `<?php
header('Content-Type: application/json');

$nodeBin = '/home2/coastaee/nodejs/bin/node';
$appDir = '/home2/coastaee/app';

// 1. Check if node binary exists and is executable
$nodeExists = file_exists($nodeBin);
$nodeExec = is_executable($nodeBin);

// 2. Check node version
$nodeVersion = @shell_exec("$nodeBin -v 2>&1");

// 3. Test running index.js for 1 second syntax check
$syntaxCheck = @shell_exec("cd $appDir && $nodeBin -c index.js 2>&1");

// 4. Try starting it
$cmd = "cd $appDir && $nodeBin index.js </dev/null >> $appDir/app.log 2>&1 &";
@pclose(@popen($cmd, "r"));

// 5. Check if port is open after 2 seconds
sleep(2);
$sock = @stream_socket_client("tcp://127.0.0.1:3458", $errno, $errstr, 0.5);
$connected = false;
if (is_resource($sock)) {
    $connected = true;
    fclose($sock);
}

echo json_encode([
    'nodeExists' => $nodeExists,
    'nodeExec' => $nodeExec,
    'nodeVersion' => trim($nodeVersion ?: ''),
    'syntaxCheck' => trim($syntaxCheck ?: ''),
    'port3458Connected' => $connected,
    'lastLog' => file_exists("$appDir/app.log") ? substr(file_get_contents("$appDir/app.log"), -600) : ''
]);
`;

  await cp.saveFile('public_html', 'test_start.php', testStartPhp);
  console.log('Saved test_start.php');
}

main().catch(console.error);
