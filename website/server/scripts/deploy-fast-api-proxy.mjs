import { CPanelClient } from './cpanel-client.mjs';

async function main() {
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();
  console.log('Logged into cPanel.');

  const robustProxy = `<?php
// ============================================================================
// Fast, Non-Blocking API Reverse Proxy for Coastal Trails (Node.js on 127.0.0.1:3458)
// ============================================================================
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

// If backend is not responding, trigger the watchdog runner in the background
if (!isBackendReady($port)) {
    @exec("/bin/bash /home2/coastaee/run_node.sh >/dev/null 2>&1 &");
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
curl_setopt($ch, CURLOPT_TIMEOUT, 6); // Max 6 seconds — prevents Cloudflare 524 timeouts!

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
    // Backend still starting up — return instant 503 instead of hanging
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

  await cp.saveFile('public_html/api', 'index.php', robustProxy);
  console.log('Saved ultra-fast, timeout-protected public_html/api/index.php');
}

main().catch(console.error);
