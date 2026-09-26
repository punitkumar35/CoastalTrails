import { CPanelClient } from './cpanel-client.mjs';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';

const ROOT_DIR = 'y:/Gokarna/Gokarna-Connect';
const SERVER_DIR = path.join(ROOT_DIR, 'website/server');
const CLIENT_DIR = path.join(ROOT_DIR, 'website/client');
const STAGING_DIR = path.join(ROOT_DIR, 'website/server-staging');
const SERVER_ZIP = path.join(ROOT_DIR, 'website/server-update.zip');
const CLIENT_ZIP = path.join(ROOT_DIR, 'website/client-deploy.zip');

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

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

async function prepareServerZip() {
  console.log('--- 1. Packaging Server Updates ---');
  if (fs.existsSync(STAGING_DIR)) fs.rmSync(STAGING_DIR, { recursive: true, force: true });
  fs.mkdirSync(STAGING_DIR, { recursive: true });
  fs.mkdirSync(path.join(STAGING_DIR, 'middleware'), { recursive: true });
  fs.mkdirSync(path.join(STAGING_DIR, 'routes'), { recursive: true });
  fs.mkdirSync(path.join(STAGING_DIR, 'db'), { recursive: true });

  // Copy files
  fs.copyFileSync(path.join(SERVER_DIR, 'index.js'), path.join(STAGING_DIR, 'index.js'));
  fs.copyFileSync(path.join(SERVER_DIR, 'package.json'), path.join(STAGING_DIR, 'package.json'));
  fs.copyFileSync(path.join(SERVER_DIR, 'middleware/rateLimiter.js'), path.join(STAGING_DIR, 'middleware/rateLimiter.js'));
  fs.copyFileSync(path.join(SERVER_DIR, 'middleware/auth.js'), path.join(STAGING_DIR, 'middleware/auth.js'));
  fs.copyFileSync(path.join(SERVER_DIR, 'routes/auth.js'), path.join(STAGING_DIR, 'routes/auth.js'));
  fs.copyFileSync(path.join(SERVER_DIR, 'routes/bookings.js'), path.join(STAGING_DIR, 'routes/bookings.js'));
  fs.copyFileSync(path.join(SERVER_DIR, 'db/index.js'), path.join(STAGING_DIR, 'db/index.js'));

  // Copy dependencies needed for express-rate-limit
  const depsToCopy = ['express-rate-limit', 'ip-address', 'debug', 'ms'];
  for (const dep of depsToCopy) {
    const srcDir = path.join(SERVER_DIR, 'node_modules', dep);
    if (fs.existsSync(srcDir)) {
      copyRecursiveSync(srcDir, path.join(STAGING_DIR, 'node_modules', dep));
    }
  }

  if (fs.existsSync(SERVER_ZIP)) fs.unlinkSync(SERVER_ZIP);
  execSync(`tar.exe -a -c -f "${SERVER_ZIP}" *`, { cwd: STAGING_DIR });
  console.log('Created server-update.zip (' + (fs.statSync(SERVER_ZIP).size / 1024).toFixed(1) + ' KB)');
  fs.rmSync(STAGING_DIR, { recursive: true, force: true });
}

async function prepareClientZip() {
  console.log('\n--- 2. Packaging Client Web App ---');
  if (fs.existsSync(CLIENT_ZIP)) fs.unlinkSync(CLIENT_ZIP);
  const distDir = path.join(CLIENT_DIR, 'dist');
  execSync(`tar.exe -a -c -f "${CLIENT_ZIP}" *`, { cwd: distDir });
  console.log('Created client-deploy.zip (' + (fs.statSync(CLIENT_ZIP).size / 1024).toFixed(1) + ' KB)');
}

async function main() {
  await prepareServerZip();
  await prepareClientZip();

  console.log('\n--- 3. Connecting to cPanel ---');
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();
  console.log('cPanel Login Successful.');

  // Update production .env
  console.log('\n--- 4. Updating Production .env with GOOGLE_CLIENT_ID ---');
  const prodEnv = [
    'PORT=3458',
    'SITE_URL="https://coastaltrails.in"',
    'GOOGLE_CLIENT_ID="974982463288-6ruuja5kjpojen2f5cnaoai80bk1ced3.apps.googleusercontent.com"',
    'DB_HOST="localhost"',
    'DB_PORT=3306',
    'DB_USER="coastaee_dbuser"',
    'DB_PASSWORD="Goodnight01@#DB!"',
    'DB_NAME="coastaee_gokarna"',
    'RAZORPAY_KEY_ID="rzp_live_TenhZxUlBxIbss"',
    'RAZORPAY_KEY_SECRET="oK2b0vv8PikwsmRZipUokZWa"',
    'RAZORPAY_WEBHOOK_SECRET="21c9f1b64efe2c355d9ed08c701ee7f16c5ffa00c5e121c1757d787912093e22"',
    'SMTP_HOST="smtp.gmail.com"',
    'SMTP_PORT=465',
    'SMTP_SECURE="true"',
    'SMTP_USER="bookings@coastaltrails.in"',
    'SMTP_PASS="edkuszqaikkdyxab"',
    'SMTP_PASSWORD="edkuszqaikkdyxab"',
    'MAIL_ADMIN="punithnaik01@gmail.com"',
    'MAIL_REPLY_TO="support@coastaltrails.in"',
    'WHATSAPP_PHONE_NUMBER_ID="1311727232025760"',
    'WHATSAPP_ACCESS_TOKEN="EAAwA3gMfWxIBSucpITp2XZCz8ZAC8vgX9NDmwoftprM4GIkenFOSxn1v6HS8OV84rmZCLwPH6GMCfOt2V2d9iVI2JF5YI82GWc62XsoJo4E4ZB6lKlfasS1C5mUKuz9zXuz6TlQZASQ5Rn5pCqADzhqekz0ESDEcZCxQOGcHxtumm9H96RHbCCsxbZBkrNLrwZDZD"',
    'WHATSAPP_BUSINESS_ACCOUNT_ID="2253205252186390"',
    'WHATSAPP_API_VERSION="v22.0"',
    'WHATSAPP_TEMPLATE_LANG="en"',
    'WHATSAPP_BOOKING_TEMPLATE="ct_booking_confirmed"',
    'WHATSAPP_PAYMENT_TEMPLATE="ct_payment_receipt"',
    'WHATSAPP_PAYMENT_FAILED_TEMPLATE="ct_payment_pending"',
    'WHATSAPP_SIGNUP_TEMPLATE="ct_welcome"',
    '',
  ].join('\n');
  await cp.saveFile('app', '.env', prodEnv);
  console.log('Updated /home2/coastaee/app/.env');

  // Upload and extract server updates
  console.log('\n--- 5. Deploying Server Files to /home2/coastaee/app ---');
  const upServer = await uploadFileToCpanel(cp, 'app', SERVER_ZIP);
  console.log('Upload server-update.zip:', upServer.status === 1 ? 'OK' : upServer);

  const unzipServerPhp = `<?php
$zip = new ZipArchive;
$target = '/home2/coastaee/app/server-update.zip';
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
  await cp.saveFile('public_html', 'unzip-server.php', unzipServerPhp);
  const extServer = await new Promise((resolve) => {
    https.get('https://coastaltrails.in/unzip-server.php', (res) => {
      let b = '';
      res.on('data', (d) => (b += d));
      res.on('end', () => {
        try { resolve(JSON.parse(b)); } catch { resolve(b); }
      });
    }).on('error', (e) => resolve({ error: e.message }));
  });
  console.log('Extract server-update.zip:', extServer);

  // Restart Node process
  console.log('\n--- 6. Restarting Node.js Backend Process ---');
  let restartRes = { restarted: false };
  try {
    const res = await fetch('https://coastaltrails.in/api/?ct_action=restart_server_9921');
    restartRes = await res.json();
  } catch (err) {
    console.warn('Restart trigger warning:', err.message);
  }
  console.log('Node restart response:', restartRes);

  // Upload and extract client
  console.log('\n--- 7. Deploying Client Web App to /home2/coastaee/public_html ---');
  const upClient = await uploadFileToCpanel(cp, 'public_html', CLIENT_ZIP);
  console.log('Upload client-deploy.zip:', upClient.status === 1 ? 'OK' : upClient);

  const unzipClientPhp = `<?php
$zip = new ZipArchive;
$target = '/home2/coastaee/public_html/client-deploy.zip';
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
  await cp.saveFile('public_html', 'unzip-client.php', unzipClientPhp);
  const extClient = await new Promise((resolve) => {
    https.get('https://coastaltrails.in/unzip-client.php', (res) => {
      let b = '';
      res.on('data', (d) => (b += d));
      res.on('end', () => {
        try { resolve(JSON.parse(b)); } catch { resolve(b); }
      });
    }).on('error', (e) => resolve({ error: e.message }));
  });
  console.log('Extract client-deploy.zip:', extClient);

  // Verification
  console.log('\n--- 8. Verifying Live Site & API ---');
  await new Promise((r) => setTimeout(r, 1500));

  // Check frontend
  const checkLive = await new Promise((resolve, reject) => {
    https.get('https://coastaltrails.in/', (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data, headers: res.headers }));
    }).on('error', reject);
  });
  console.log('Frontend Status:', checkLive.statusCode);
  const bundleMatch = checkLive.body.match(/src="(\/assets\/index-[^"]+\.js)"/);
  console.log('Active Live Bundle:', bundleMatch ? bundleMatch[1] : 'Unknown');

  // Check API homestays with rate limiter headers
  const checkApi = await new Promise((resolve, reject) => {
    https.get('https://coastaltrails.in/api/homestays', (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, len: data.length }));
    }).on('error', reject);
  });
  console.log('API /api/homestays Status:', checkApi.statusCode);
  console.log('RateLimit-Limit Header:', checkApi.headers['ratelimit-limit']);
  console.log('RateLimit-Remaining Header:', checkApi.headers['ratelimit-remaining']);

  // Clean local zips
  if (fs.existsSync(SERVER_ZIP)) fs.unlinkSync(SERVER_ZIP);
  if (fs.existsSync(CLIENT_ZIP)) fs.unlinkSync(CLIENT_ZIP);

  console.log('\n🎉 Deployment to cPanel completed successfully!');
}

main().catch(console.error);
