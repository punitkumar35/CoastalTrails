import { CPanelClient } from './cpanel-client.mjs';

async function main() {
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();
  console.log('Logged into cPanel.');

  const optimizedApiIndex = `<?php
$port = 3458;
$targetBase = "http://127.0.0.1:$port";
$appDir = '/home2/coastaee/app';
$nodeBin = '/home2/coastaee/nodejs/bin/node';

function isBackendReady($port) {
    $sock = @stream_socket_client("tcp://127.0.0.1:$port", $errno, $errstr, 0.2);
    if (is_resource($sock)) {
        fclose($sock);
        return true;
    }
    return false;
}

function reviveBackend($appDir, $nodeBin, $port) {
    // Non-blocking safe process cleanup for user coastaee
    @shell_exec("/usr/bin/pkill -9 -u coastaee -f 'node.*index.js' 2>/dev/null");
    usleep(100000);

    $cmd = "cd $appDir && /usr/bin/nohup $nodeBin index.js </dev/null >> $appDir/app.log 2>&1 &";
    @pclose(@popen($cmd, "r"));

    for ($i = 0; $i < 20; $i++) {
        usleep(100000);
        if (isBackendReady($port)) {
            return true;
        }
    }
    return false;
}

if (isset($_GET['ct_action']) && $_GET['ct_action'] === 'restart_server_9921') {
    $ready = reviveBackend($appDir, $nodeBin, $port);
    header('Content-Type: application/json');
    echo json_encode(['restarted' => true, 'ready' => $ready]);
    exit;
}

if (!isBackendReady($port)) {
    reviveBackend($appDir, $nodeBin, $port);
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
$headers = [
    'Expect:',
    'Accept-Encoding: identity',
];

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

function executeCurl($targetUrl, $method, $headers, $body) {
    $ch = curl_init($targetUrl);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    if ($method !== 'GET' && $method !== 'HEAD' && strlen($body) > 0) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }

    $response = curl_exec($ch);
    $errno = curl_errno($ch);
    $error = curl_error($ch);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [$response, $errno, $error, $headerSize, $httpCode];
}

list($response, $errno, $error, $headerSize, $httpCode) = executeCurl($targetUrl, $method, $headers, $body);

if ($errno !== 0) {
    reviveBackend($appDir, $nodeBin, $port);
    list($response, $errno, $error, $headerSize, $httpCode) = executeCurl($targetUrl, $method, $headers, $body);
}

if ($errno !== 0) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'API backend offline or starting up', 'detail' => $error]);
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

  await cp.saveFile('public_html/api', 'index.php', optimizedApiIndex);
  console.log('Saved optimized public_html/api/index.php');
}

main().catch(console.error);
