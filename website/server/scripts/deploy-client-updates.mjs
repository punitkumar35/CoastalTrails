import { CPanelClient } from './cpanel-client.mjs';
import fs from 'fs';
import https from 'https';
import path from 'path';

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
  console.log('Connecting to cPanel...');
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();
  console.log('Logged into cPanel successfully.');

  const zipPath = path.resolve('website/client-deploy.zip');
  if (!fs.existsSync(zipPath)) {
    throw new Error('Zip file not found at ' + zipPath);
  }

  console.log('Uploading client-deploy.zip (' + (fs.statSync(zipPath).size / 1024).toFixed(1) + ' KB) to public_html...');
  const uploadRes = await uploadFileToCpanel(cp, 'public_html', zipPath);
  console.log('Upload result:', uploadRes.status === 1 ? 'SUCCESS' : JSON.stringify(uploadRes));

  console.log('Deploying server-side unzipper...');
  const unzipPhp = `<?php
$zip = new ZipArchive;
$target = __DIR__ . '/client-deploy.zip';
if (!file_exists($target)) {
    echo json_encode(['error' => 'zip not found']);
    exit;
}
$res = $zip->open($target);
if ($res === TRUE) {
    $zip->extractTo(__DIR__);
    $zip->close();
    @unlink($target);
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['error' => 'zip open failed', 'code' => $res]);
}
@unlink(__FILE__);
`;

  await cp.saveFile('public_html', 'unzip-client.php', unzipPhp);
  console.log('Saved unzip-client.php in public_html.');

  console.log('Executing extraction via https://coastaltrails.in/unzip-client.php...');
  const execRes = await new Promise((resolve, reject) => {
    https.get('https://coastaltrails.in/unzip-client.php', (res) => {
      let b = '';
      res.on('data', (d) => (b += d));
      res.on('end', () => {
        try {
          resolve(JSON.parse(b));
        } catch {
          resolve(b);
        }
      });
    }).on('error', reject);
  });
  console.log('Extraction response:', execRes);

  console.log('\n--- VERIFYING LIVE SITE ---');
  await new Promise((r) => setTimeout(r, 1000));

  const checkLive = await new Promise((resolve, reject) => {
    https
      .get('https://coastaltrails.in/', (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
      })
      .on('error', reject);
  });

  console.log('Live HTTP status:', checkLive.statusCode);
  const match = checkLive.body.match(/src="(\/assets\/index-[^"]+\.js)"/);
  if (match) {
    console.log('Active live bundle:', match[1]);
  } else {
    console.log('Snippet of live index.html:\n', checkLive.body.slice(0, 300));
  }
}

main().catch(console.error);
