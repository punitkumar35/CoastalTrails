import { CPanelClient } from './cpanel-client.mjs';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';

const ROOT_DIR = 'y:/Gokarna/Gokarna-Connect';
const CLIENT_DIR = path.join(ROOT_DIR, 'website/client');
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
  console.log('--- 1. Packaging Client Dist ---');
  if (fs.existsSync(CLIENT_ZIP)) fs.unlinkSync(CLIENT_ZIP);
  const distDir = path.join(CLIENT_DIR, 'dist');
  execSync(`tar.exe -a -c -f "${CLIENT_ZIP}" *`, { cwd: distDir });
  console.log('Created client-dist.zip (' + (fs.statSync(CLIENT_ZIP).size / 1024).toFixed(1) + ' KB)');

  console.log('\n--- 2. Connecting to cPanel ---');
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();
  console.log('Logged into cPanel.');

  console.log('\n--- 3. Uploading to public_html ---');
  const uploadRes = await uploadFileToCpanel(cp, 'public_html', CLIENT_ZIP);
  console.log('Upload result:', uploadRes.status === 1 ? 'OK' : uploadRes);

  console.log('\n--- 4. Extracting on Server ---');
  const unzipPhp = `<?php
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
  await cp.saveFile('public_html', 'unzip-client.php', unzipPhp);
  const extClient = await new Promise((resolve) => {
    https.get('https://coastaltrails.in/unzip-client.php', (res) => {
      let b = '';
      res.on('data', (d) => (b += d));
      res.on('end', () => {
        try { resolve(JSON.parse(b)); } catch { resolve(b); }
      });
    }).on('error', (e) => resolve({ error: e.message }));
  });
  console.log('Extract result:', extClient);

  // Clean local zip
  if (fs.existsSync(CLIENT_ZIP)) fs.unlinkSync(CLIENT_ZIP);
  console.log('\n--- Client Deploy Complete ---');
}

main().catch(console.error);
