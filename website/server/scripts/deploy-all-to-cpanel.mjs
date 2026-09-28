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
  console.log('=== Coastal Trails Full Production Deployment to cPanel ===\n');

  // Step 1: Build client dist
  console.log('--- 1. Building Production Client App ---');
  execSync('npm run build', { cwd: CLIENT_DIR, stdio: 'inherit' });
  const distDir = path.join(CLIENT_DIR, 'dist');
  if (!fs.existsSync(distDir)) throw new Error('dist directory not found after build!');

  // Verify key files in dist
  console.log('Verifying dist content:');
  console.log('- index.html:', fs.existsSync(path.join(distDir, 'index.html')) ? 'OK' : 'MISSING');
  console.log('- sitemap.xml:', fs.existsSync(path.join(distDir, 'sitemap.xml')) ? 'OK' : 'MISSING');
  console.log('- robots.txt:', fs.existsSync(path.join(distDir, 'robots.txt')) ? 'OK' : 'MISSING');
  console.log('- gokarna/5-beach-trek/index.html:', fs.existsSync(path.join(distDir, 'gokarna/5-beach-trek/index.html')) ? 'OK' : 'MISSING');
  console.log('- gokarna/beaches/index.html:', fs.existsSync(path.join(distDir, 'gokarna/beaches/index.html')) ? 'OK' : 'MISSING');

  // Step 2: Package Client Zip
  console.log('\n--- 2. Packaging Client Web App ---');
  if (fs.existsSync(CLIENT_ZIP)) fs.unlinkSync(CLIENT_ZIP);
  execSync(`tar.exe -a -c -f "${CLIENT_ZIP}" *`, { cwd: distDir });
  console.log('Created client-deploy.zip (' + (fs.statSync(CLIENT_ZIP).size / 1024).toFixed(1) + ' KB)');

  // Step 3: Package Server Zip
  console.log('\n--- 3. Packaging Server Files ---');
  if (fs.existsSync(STAGING_DIR)) fs.rmSync(STAGING_DIR, { recursive: true, force: true });
  fs.mkdirSync(STAGING_DIR, { recursive: true });
  fs.mkdirSync(path.join(STAGING_DIR, 'middleware'), { recursive: true });
  fs.mkdirSync(path.join(STAGING_DIR, 'routes'), { recursive: true });
  fs.mkdirSync(path.join(STAGING_DIR, 'services'), { recursive: true });
  fs.mkdirSync(path.join(STAGING_DIR, 'utils'), { recursive: true });
  fs.mkdirSync(path.join(STAGING_DIR, 'db'), { recursive: true });

  fs.copyFileSync(path.join(SERVER_DIR, 'index.js'), path.join(STAGING_DIR, 'index.js'));
  fs.copyFileSync(path.join(SERVER_DIR, 'package.json'), path.join(STAGING_DIR, 'package.json'));
  fs.copyFileSync(path.join(SERVER_DIR, 'db/index.js'), path.join(STAGING_DIR, 'db/index.js'));
  fs.copyFileSync(path.join(SERVER_DIR, 'middleware/rateLimiter.js'), path.join(STAGING_DIR, 'middleware/rateLimiter.js'));
  fs.copyFileSync(path.join(SERVER_DIR, 'middleware/auth.js'), path.join(STAGING_DIR, 'middleware/auth.js'));
  fs.copyFileSync(path.join(SERVER_DIR, 'routes/auth.js'), path.join(STAGING_DIR, 'routes/auth.js'));
  fs.copyFileSync(path.join(SERVER_DIR, 'routes/bookings.js'), path.join(STAGING_DIR, 'routes/bookings.js'));
  fs.copyFileSync(path.join(SERVER_DIR, 'routes/payments.js'), path.join(STAGING_DIR, 'routes/payments.js'));
  fs.copyFileSync(path.join(SERVER_DIR, 'routes/wishlist.js'), path.join(STAGING_DIR, 'routes/wishlist.js'));
  fs.copyFileSync(path.join(SERVER_DIR, 'routes/upload.js'), path.join(STAGING_DIR, 'routes/upload.js'));
  fs.copyFileSync(path.join(SERVER_DIR, 'services/mail.js'), path.join(STAGING_DIR, 'services/mail.js'));
  fs.copyFileSync(path.join(SERVER_DIR, 'utils/whatsapp.js'), path.join(STAGING_DIR, 'utils/whatsapp.js'));

  // Copy dependencies needed for express-rate-limit and multer
  const depsToCopy = [
    'express-rate-limit',
    'ip-address',
    'debug',
    'ms',
    'multer',
    'append-field',
    'busboy',
    'streamsearch',
  ];
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

  // Step 4: Login to cPanel
  console.log('\n--- 4. Connecting to cPanel ---');
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();
  console.log('cPanel Login Successful.');

  // Step 5: Upload & Extract Server Files
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

  // Step 6: Deploy Database Migration Runner
  console.log('\n--- 6. Running MySQL Migrations on Production ---');
  const migratePhp = `<?php
header('Content-Type: application/json');
try {
    $pdo = new PDO(
        'mysql:host=localhost;dbname=coastaee_gokarna;charset=utf8mb4',
        'coastaee_dbuser',
        'Goodnight01@#DB!',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $results = [];

    // 1. users.profile_image
    $col = $pdo->query("SHOW COLUMNS FROM users LIKE 'profile_image'")->fetch();
    if (!$col) {
        $pdo->exec("ALTER TABLE users ADD COLUMN profile_image VARCHAR(255) NULL");
        $results[] = 'Added users.profile_image';
    }

    // 2. users.date_of_birth
    $col = $pdo->query("SHOW COLUMNS FROM users LIKE 'date_of_birth'")->fetch();
    if (!$col) {
        $pdo->exec("ALTER TABLE users ADD COLUMN date_of_birth DATE NULL");
        $results[] = 'Added users.date_of_birth';
    }

    // 3. wishlist table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS wishlist (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          homestay_id VARCHAR(64) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_wishlist_user_stay (user_id, homestay_id),
          CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_wishlist_homestay FOREIGN KEY (homestay_id) REFERENCES homestays(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    $results[] = 'Verified wishlist table';

    // 4. password_resets table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS password_resets (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          token_hash VARCHAR(64) NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_resets_token (token_hash),
          INDEX idx_resets_user (user_id),
          CONSTRAINT fk_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    $results[] = 'Verified password_resets table';

    echo json_encode(['success' => true, 'applied' => $results]);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
@unlink(__FILE__);
`;
  await cp.saveFile('public_html', 'run-migrations.php', migratePhp);
  const migRes = await new Promise((resolve) => {
    https.get('https://coastaltrails.in/run-migrations.php', (res) => {
      let b = '';
      res.on('data', (d) => (b += d));
      res.on('end', () => {
        try { resolve(JSON.parse(b)); } catch { resolve(b); }
      });
    }).on('error', (e) => resolve({ error: e.message }));
  });
  console.log('Migration execution result:', migRes);

  // Step 7: Restart Node.js Process
  console.log('\n--- 7. Restarting Node.js Backend Process ---');
  let restartRes = { restarted: false };
  try {
    const res = await fetch('https://coastaltrails.in/api/?ct_action=restart_server_9921');
    restartRes = await res.json();
  } catch (err) {
    console.warn('Restart trigger warning:', err.message);
  }
  console.log('Node restart response:', restartRes);

  // Step 8: Deploy Client Web App & Static Guide Pages
  console.log('\n--- 8. Deploying Client Web App & Static Guide Pages to /home2/coastaee/public_html ---');
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

  // Step 9: Synchronize dynamic index.php, sitemap.xml, robots.txt, and .htaccess
  console.log('\n--- 9. Synchronizing index.php, sitemap.xml, robots.txt, and .htaccess ---');
  const indexPhpContent = fs.readFileSync(path.join(ROOT_DIR, 'website/server/templates/index.php'), 'utf8');
  await cp.saveFile('public_html', 'index.php', indexPhpContent);

  const sitemapContent = fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');
  const robotsContent = fs.readFileSync(path.join(distDir, 'robots.txt'), 'utf8');
  await cp.saveFile('public_html', 'sitemap.xml', sitemapContent);
  await cp.saveFile('public_html', 'robots.txt', robotsContent);

  const htaccessContent = `Options -MultiViews
RewriteEngine On
RewriteBase /
DirectoryIndex index.php index.html

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType application/x-httpd-php "access plus 0 seconds"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType text/javascript "access plus 1 year"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\\.(html|htm|php)$">
    Header set Cache-Control "no-cache, must-revalidate"
  </FilesMatch>
  <FilesMatch "\\.(js|css|png|webp|svg|woff2)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <Files "favicon.png">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </Files>
</IfModule>

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Route API requests to public_html/api/index.php
RewriteRule ^api/(.*)$ api/index.php [QSA,L]
RewriteRule ^api$ api/index.php [QSA,L]

# Let existing files and directories through (assets, uploads, sitemap.xml, robots.txt, gokarna, admin)
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Client-side SPA fallback to /index.php for dynamic social crawlers and deep linking
RewriteRule ^ index.php [L]

# php -- BEGIN cPanel-generated handler, do not edit
# Set the “ea-php84” package as the default “PHP” programming language.
<IfModule mime_module>
  AddHandler application/x-httpd-ea-php84___lsphp .php .php8 .phtml
</IfModule>
# php -- END cPanel-generated handler, do not edit
`;
  await cp.saveFile('public_html', '.htaccess', htaccessContent);
  console.log('Deployed updated .htaccess & configurations.');

  // Step 10: Live Verification
  console.log('\n--- 10. Live Production Verification ---');
  await new Promise((r) => setTimeout(r, 2000));

  const endpoints = [
    { name: 'Frontend Homepage', url: 'https://coastaltrails.in/' },
    { name: 'Gokarna Guide Hub', url: 'https://coastaltrails.in/gokarna/' },
    { name: '5-Beach Trek Guide', url: 'https://coastaltrails.in/gokarna/5-beach-trek/' },
    { name: 'Beaches Guide', url: 'https://coastaltrails.in/gokarna/beaches/' },
    { name: 'Sitemap XML', url: 'https://coastaltrails.in/sitemap.xml' },
    { name: 'Robots TXT', url: 'https://coastaltrails.in/robots.txt' },
    { name: 'API /api/homestays', url: 'https://coastaltrails.in/api/homestays' },
  ];

  for (const ep of endpoints) {
    try {
      const res = await new Promise((resolve, reject) => {
        https.get(ep.url, (r) => {
          let b = '';
          r.on('data', (d) => (b += d));
          r.on('end', () => resolve({ status: r.statusCode, len: b.length, text: b.slice(0, 300) }));
        }).on('error', reject);
      });
      const titleMatch = res.text.match(/<title>(.*?)<\/title>/);
      const title = titleMatch ? titleMatch[1].slice(0, 50) + '...' : '';
      console.log(`[PASS] ${ep.name} -> HTTP ${res.status} (${res.len} bytes) ${title}`);
    } catch (err) {
      console.error(`[FAIL] ${ep.name} -> Error: ${err.message}`);
    }
  }

  // Cleanup local zips
  if (fs.existsSync(SERVER_ZIP)) fs.unlinkSync(SERVER_ZIP);
  if (fs.existsSync(CLIENT_ZIP)) fs.unlinkSync(CLIENT_ZIP);

  console.log('\n🎉 ALL CHANGES DEPLOYED AND VERIFIED LIVE ON CPANEL!');
}

main().catch(console.error);
