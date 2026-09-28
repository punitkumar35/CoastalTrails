import { CPanelClient } from './cpanel-client.mjs';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';

const ROOT_DIR = 'y:/Gokarna/Gokarna-Connect';
const CLIENT_DIR = path.join(ROOT_DIR, 'website/client');
const CLIENT_ZIP = path.join(ROOT_DIR, 'website/client-seo-deploy.zip');

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
  console.log('Created client-seo-deploy.zip (' + (fs.statSync(CLIENT_ZIP).size / 1024).toFixed(1) + ' KB)');

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
$target = '/home2/coastaee/public_html/client-seo-deploy.zip';
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
  await cp.saveFile('public_html', 'unzip-seo.php', unzipPhp);
  const extClient = await new Promise((resolve) => {
    https.get('https://coastaltrails.in/unzip-seo.php', (res) => {
      let b = '';
      res.on('data', (d) => (b += d));
      res.on('end', () => {
        try { resolve(JSON.parse(b)); } catch { resolve(b); }
      });
    }).on('error', (e) => resolve({ error: e.message }));
  });
  console.log('Extract result:', extClient);

  // Directly save sitemap.xml and robots.txt to ensure they are 100% updated in public_html
  console.log('\n--- 5. Synchronizing sitemap.xml and robots.txt ---');
  const sitemapContent = fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');
  const robotsContent = fs.readFileSync(path.join(distDir, 'robots.txt'), 'utf8');
  await cp.saveFile('public_html', 'sitemap.xml', sitemapContent);
  await cp.saveFile('public_html', 'robots.txt', robotsContent);
  console.log('Synchronized sitemap.xml & robots.txt directly.');

  console.log('\n--- 6. Deploying Dynamic Social Preview index.php & .htaccess ---');
  const indexPhpContent = fs.readFileSync(path.join(ROOT_DIR, 'website/server/templates/index.php'), 'utf8');
  await cp.saveFile('public_html', 'index.php', indexPhpContent);
  console.log('Deployed index.php to public_html.');

  const htaccessContent = `Options -MultiViews
RewriteEngine On
RewriteBase /
DirectoryIndex index.php index.html

# ----------------------------------------------------------------------
# Cache-Control & Expires policies for Vite React SPA & Cloudflare Edge
# ----------------------------------------------------------------------
<IfModule mod_expires.c>
  ExpiresActive On

  # HTML & PHP: do not cache (always revalidate for instant dynamic metadata)
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType application/x-httpd-php "access plus 0 seconds"

  # Static assets: 1 year
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType text/javascript "access plus 1 year"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

<IfModule mod_headers.c>
  # HTML & PHP: no-cache so new deploys and dynamic social previews show up immediately
  <FilesMatch "\\.(html|htm|php)$">
    Header set Cache-Control "no-cache, must-revalidate"
  </FilesMatch>

  # Hashed assets (js, css, png, webp, svg, woff2)
  <FilesMatch "\\.(js|css|png|webp|svg|woff2)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>

  # Favicon immutable policy
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

# Let existing files and directories through (assets, uploads, sitemap.xml, robots.txt, admin)
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
  console.log('Deployed updated .htaccess to public_html.');

  if (fs.existsSync(CLIENT_ZIP)) fs.unlinkSync(CLIENT_ZIP);
  console.log('\n🎉 SEO & Social Crawler deployment completed!');
}

main().catch(console.error);
