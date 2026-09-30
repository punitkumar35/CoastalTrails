import { CPanelClient } from './cpanel-client.mjs';

async function main() {
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();
  console.log('Logged into cPanel.');

  const cleanHtaccess = `Options -MultiViews
RewriteEngine On
RewriteBase /
DirectoryIndex index.html index.php

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType application/x-httpd-php "access plus 0 seconds"
  ExpiresByType application/manifest+json "access plus 1 week"
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
# Set the “ea-php83” package as the default “PHP” programming language.
<IfModule mime_module>
  AddHandler application/x-httpd-ea-php83___lsphp .php .php8 .phtml
</IfModule>
# php -- END cPanel-generated handler, do not edit
`;

  await cp.saveFile('public_html', '.htaccess', cleanHtaccess);
  console.log('Cleaned .htaccess without any syntax errors.');
}

main().catch(console.error);
