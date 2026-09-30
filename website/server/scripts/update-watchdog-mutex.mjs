import { CPanelClient } from './cpanel-client.mjs';

async function main() {
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();

  // 1. Update run_node.sh with flock mutex
  const runNodeContent = `#!/bin/bash
export PATH="/home2/coastaee/nodejs/bin:/usr/local/bin:/usr/bin:/bin"
export PORT=3458
export NODE_ENV=production

LOCK_FILE="/home2/coastaee/app/.watchdog.lock"
exec 200>"$LOCK_FILE"
flock -n 200 || exit 0

cd /home2/coastaee/app

# Keep log under 2MB
if [ -f /home2/coastaee/app/app.log ]; then
    log_size=$(wc -c /home2/coastaee/app/app.log 2>/dev/null | awk '{print $1}')
    if [ "$log_size" -gt 2097152 ]; then
        tail -n 2000 /home2/coastaee/app/app.log > /home2/coastaee/app/app.log.tmp 2>/dev/null
        mv /home2/coastaee/app/app.log.tmp /home2/coastaee/app/app.log 2>/dev/null
    fi
fi

# Check if port 3458 is responding
if ! /usr/bin/curl -s -m 2 http://127.0.0.1:3458/api/health > /dev/null 2>&1; then
    echo "[$(date -u)] Port 3458 offline, restarting node..." >> /home2/coastaee/app/cron.log
    /usr/bin/pkill -9 -u coastaee -f "node.*index.js" 2>/dev/null
    sleep 1
    nohup /home2/coastaee/nodejs/bin/node --max-old-space-size=256 index.js </dev/null >> /home2/coastaee/app/app.log 2>&1 &
    sleep 2
fi
`;

  await cp.saveFile('', 'run_node.sh', runNodeContent);
  console.log('Successfully updated /home2/coastaee/run_node.sh with flock protection');

  // 2. Update public_html/api/index.php with 15-second debounce cooldown
  const apiProxyContent = `<?php
// Fast, Non-Blocking API Reverse Proxy for Coastal Trails (Node.js on 127.0.0.1:3458)
$port = 3458;
$targetBase = "http://127.0.0.1:$port";

function isBackendReady($port) {
    $sock = @stream_socket_client("tcp://127.0.0.1:$port", $errno, $errstr, 0.2);
    if (is_resource($sock)) {
        fclose($sock);
        return true;
    }
    return false;
}

// If backend is not responding, trigger the watchdog runner with a 15-second debounce
$lockFile = '/home2/coastaee/app/.restart_cooldown';
if (!isBackendReady($port)) {
    $lastRestart = @filemtime($lockFile);
    if (!$lastRestart || (time() - $lastRestart > 15)) {
        @touch($lockFile);
        @exec("/bin/bash /home2/coastaee/run_node.sh >/dev/null 2>&1 &");
    }
    // Wait up to 1.5s for fast recovery
    for ($i = 0; $i < 15; $i++) {
        usleep(100000);
        if (isBackendReady($port)) break;
    }
}

$requestUri = $_SERVER['REQUEST_URI'];
$parts = explode('?', $requestUri, 2);
$path = $parts[0];
$query = isset($parts[1]) ? '?' . $parts[1] : '';

if (!str_starts_with($path, '/api')) {
    $path = '/api' . $path;
}
$targetUrl = $targetBase . $path . $query;

$method = $_SERVER['REQUEST_METHOD'];
$headers = ['Expect:'];

if (function_exists('getallheaders')) {
    foreach (getallheaders() as $k => $v) {
        $lower = strtolower($k);
        if (in_array($lower, ['host', 'content-length', 'connection', 'expect', 'accept-encoding'])) continue;
        $headers[] = "$k: $v";
    }
}
if (isset($_SERVER['CONTENT_TYPE']) && !empty($_SERVER['CONTENT_TYPE'])) {
    $headers[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
}

$body = file_get_contents('php://input');

$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
curl_setopt($ch, CURLOPT_TIMEOUT, 6); // Max 6 seconds

if ($method !== 'GET' && $method !== 'HEAD' && strlen($body) > 0) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
$errno = curl_errno($ch);
$error = curl_error($ch);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($errno !== 0 || empty($response)) {
    http_response_code(503);
    header('Content-Type: application/json');
    header('Retry-After: 3');
    echo json_encode([
        'status' => 'starting',
        'error' => 'API service is initializing. Please retry in 3 seconds.',
        'retryAfter' => 3
    ]);
    exit;
}

http_response_code($httpCode);

$headerLines = preg_split('/\\r?\\n/', substr($response, 0, $headerSize));
foreach ($headerLines as $line) {
    $line = trim($line);
    if (empty($line)) continue;
    $lower = strtolower($line);
    if (str_starts_with($lower, 'http/')) continue;
    if (str_starts_with($lower, 'transfer-encoding:')) continue;
    if (str_starts_with($lower, 'connection:')) continue;
    if (str_starts_with($lower, 'content-length:')) continue;
    if (str_starts_with($lower, 'content-encoding:')) continue;
    header($line, false);
}

echo substr($response, $headerSize);
`;

  await cp.saveFile('public_html/api', 'index.php', apiProxyContent);
  console.log('Successfully updated /home2/coastaee/public_html/api/index.php with 15s debounce cooldown');
}

main().catch(console.error);
