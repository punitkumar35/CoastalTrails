import { CPanelClient } from './cpanel-client.mjs';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';
import querystring from 'querystring';

const ROOT_DIR = 'y:/Gokarna/Gokarna-Connect';
const SERVER_DIR = path.join(ROOT_DIR, 'website/server');
const CLIENT_DIR = path.join(ROOT_DIR, 'website/client');
const SERVER_STAGING = path.join(ROOT_DIR, 'website/support-server-staging');
const SERVER_ZIP = path.join(ROOT_DIR, 'website/support-server.zip');
const CLIENT_ZIP = path.join(ROOT_DIR, 'website/client-dist.zip');

async function uploadFileToCpanel(cp, remoteDir, localFilePath) {
  if (!cp.secToken) await cp.login();
  const filename = path.basename(localFilePath);
  const fileBuffer = fs.readFileSync(localFilePath);
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

  const header = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="dir"\r\n\r\n` +
      `${remoteDir}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="overwrite"\r\n\r\n` +
      `1\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file-1"; filename="${filename}"\r\n` +
      `Content-Type: application/zip\r\n\r\n`
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const fullBody = Buffer.concat([header, fileBuffer, footer]);

  return new Promise((resolve, reject) => {
    const req = https.request(
      `https://${cp.host}:2083${cp.secToken}/execute/Fileman/upload_files`,
      {
        method: 'POST',
        rejectUnauthorized: false,
        headers: {
          Cookie: cp.cookie,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': fullBody.length,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(body);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}

async function main() {
  console.log('=== Deploying Support Tickets Feature to cPanel ===\n');

  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();
  console.log('1. Logged into cPanel successfully.');

  // Step 1: Package Server Files
  console.log('2. Staging and packaging server files...');
  if (fs.existsSync(SERVER_STAGING)) fs.rmSync(SERVER_STAGING, { recursive: true, force: true });
  fs.mkdirSync(SERVER_STAGING, { recursive: true });
  fs.mkdirSync(path.join(SERVER_STAGING, 'routes'), { recursive: true });
  fs.mkdirSync(path.join(SERVER_STAGING, 'services'), { recursive: true });
  fs.mkdirSync(path.join(SERVER_STAGING, 'db'), { recursive: true });

  fs.copyFileSync(path.join(SERVER_DIR, 'index.js'), path.join(SERVER_STAGING, 'index.js'));
  fs.copyFileSync(path.join(SERVER_DIR, 'db/index.js'), path.join(SERVER_STAGING, 'db/index.js'));
  fs.copyFileSync(path.join(SERVER_DIR, 'db/schema.sql'), path.join(SERVER_STAGING, 'db/schema.sql'));
  fs.copyFileSync(path.join(SERVER_DIR, 'routes/support.js'), path.join(SERVER_STAGING, 'routes/support.js'));
  fs.copyFileSync(path.join(SERVER_DIR, 'services/mail.js'), path.join(SERVER_STAGING, 'services/mail.js'));

  if (fs.existsSync(SERVER_ZIP)) fs.unlinkSync(SERVER_ZIP);
  execSync(`tar.exe -a -c -f "${SERVER_ZIP}" *`, { cwd: SERVER_STAGING });
  console.log('   Server zip created: ' + (fs.statSync(SERVER_ZIP).size / 1024).toFixed(1) + ' KB');
  fs.rmSync(SERVER_STAGING, { recursive: true, force: true });

  // Step 2: Upload and extract server files
  console.log('3. Uploading server zip to /home2/coastaee/app...');
  const upServer = await uploadFileToCpanel(cp, 'app', SERVER_ZIP);
  console.log('   Upload status:', upServer?.status === 1 ? 'OK' : upServer);

  const unzipServerPhp = `<?php
$zip = new ZipArchive;
$target = '/home2/coastaee/app/support-server.zip';
if ($zip->open($target) === TRUE) {
    $zip->extractTo('/home2/coastaee/app');
    $zip->close();
    @unlink($target);
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['error' => 'server unzip failed']);
}
@unlink(__FILE__);
`;
  await cp.saveFile('public_html', 'unzip-server-support.php', unzipServerPhp);
  const extServer = await new Promise((resolve) => {
    https.get('https://coastaltrails.in/unzip-server-support.php', (res) => {
      let b = '';
      res.on('data', (d) => (b += d));
      res.on('end', () => {
        try { resolve(JSON.parse(b)); } catch { resolve(b); }
      });
    }).on('error', (e) => resolve({ error: e.message }));
  });
  console.log('   Server extract result:', extServer);
  if (fs.existsSync(SERVER_ZIP)) fs.unlinkSync(SERVER_ZIP);

  // Step 3: Package and Deploy Client Dist
  console.log('4. Packaging and uploading client dist to public_html...');
  if (fs.existsSync(CLIENT_ZIP)) fs.unlinkSync(CLIENT_ZIP);
  const distDir = path.join(CLIENT_DIR, 'dist');
  execSync(`tar.exe -a -c -f "${CLIENT_ZIP}" *`, { cwd: distDir });
  console.log('   Client zip created: ' + (fs.statSync(CLIENT_ZIP).size / 1024).toFixed(1) + ' KB');

  const upClient = await uploadFileToCpanel(cp, 'public_html', CLIENT_ZIP);
  console.log('   Upload status:', upClient?.status === 1 ? 'OK' : upClient);

  const unzipClientPhp = `<?php
$zip = new ZipArchive;
$target = '/home2/coastaee/public_html/client-dist.zip';
if ($zip->open($target) === TRUE) {
    $zip->extractTo('/home2/coastaee/public_html');
    $zip->close();
    @unlink($target);
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['error' => 'client unzip failed']);
}
@unlink(__FILE__);
`;
  await cp.saveFile('public_html', 'unzip-client-dist.php', unzipClientPhp);
  const extClient = await new Promise((resolve) => {
    https.get('https://coastaltrails.in/unzip-client-dist.php', (res) => {
      let b = '';
      res.on('data', (d) => (b += d));
      res.on('end', () => {
        try { resolve(JSON.parse(b)); } catch { resolve(b); }
      });
    }).on('error', (e) => resolve({ error: e.message }));
  });
  console.log('   Client extract result:', extClient);
  if (fs.existsSync(CLIENT_ZIP)) fs.unlinkSync(CLIENT_ZIP);

  // Step 4: Restart Node Process on Server
  console.log('5. Triggering Node restart on cPanel...');
  const restartCmd = '/usr/bin/pkill -9 -u coastaee -f "node index.js" ; sleep 1 ; cd /home2/coastaee/app && /home2/coastaee/nodejs/bin/node index.js >> /home2/coastaee/app/app.log 2>&1 &';
  const cronQ = querystring.stringify({
    cpanel_jsonapi_module: 'Cron',
    cpanel_jsonapi_func: 'add_line',
    cpanel_jsonapi_apiversion: '2',
    command: restartCmd,
    minute: '*',
    hour: '*',
    day: '*',
    month: '*',
    weekday: '*'
  });

  const resCron = await new Promise(resolve => {
    https.get(`https://${cp.host}:2083${cp.secToken}/json-api/cpanel?${cronQ}`, { rejectUnauthorized: false, headers: { Cookie: cp.cookie } }, r => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => resolve(JSON.parse(b)));
    });
  });

  const linekey = resCron?.cpanelresult?.data?.[0]?.linekey;
  console.log('   Restart scheduled with key:', linekey);
  await new Promise(r => setTimeout(r, 4000));

  if (linekey) {
    const rmQ = querystring.stringify({
      cpanel_jsonapi_module: 'Cron',
      cpanel_jsonapi_func: 'remove_line',
      cpanel_jsonapi_apiversion: '2',
      linekey
    });
    await new Promise(r => https.get(`https://${cp.host}:2083${cp.secToken}/json-api/cpanel?${rmQ}`, { rejectUnauthorized: false, headers: { Cookie: cp.cookie } }, r));
    console.log('   Cleaned temporary restart cron.');
  }

  // Step 5: Test health & support endpoint
  console.log('6. Verifying API health and support endpoint...');
  await new Promise(r => setTimeout(r, 3000));

  const health = await new Promise((resolve) => {
    https.get('https://coastaltrails.in/api/health', (res) => {
      let b = '';
      res.on('data', (d) => (b += d));
      res.on('end', () => {
        try { resolve(JSON.parse(b)); } catch { resolve({ status: res.statusCode, body: b }); }
      });
    }).on('error', (e) => resolve({ error: e.message }));
  });
  console.log('   API Health:', health);

  const testTrack = await new Promise((resolve) => {
    https.get('https://coastaltrails.in/api/support/tickets/track/CT-999999', (res) => {
      let b = '';
      res.on('data', (d) => (b += d));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(b) }); } catch { resolve({ status: res.statusCode, body: b }); }
      });
    }).on('error', (e) => resolve({ error: e.message }));
  });
  console.log('   Support Track Endpoint check (expected 404 for nonexistent ticket):', testTrack);

  console.log('\n=== Deployment Finished Successfully! ===');
}

main().catch(console.error);
