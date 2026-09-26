import { CPanelClient } from './cpanel-client.mjs';

async function updateHtaccess() {
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();
  console.log('Logged into cPanel successfully.');

  const htaccessContent = `Options -MultiViews
RewriteEngine On
RewriteBase /

# ----------------------------------------------------------------------
# Cache-Control & Expires policies for Vite React SPA & Cloudflare Edge
# ----------------------------------------------------------------------
<IfModule mod_expires.c>
  ExpiresActive On

  # HTML: do not cache (always revalidate for instant deployment pickup)
  ExpiresByType text/html "access plus 0 seconds"

  # Static assets: 1 year
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType text/javascript "access plus 1 year"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

<IfModule mod_headers.c>
  # HTML: no-cache so new deploys show up immediately
  <FilesMatch "\\.(html|htm)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>

  # Hashed assets (js, css, png, svg, woff2)
  <FilesMatch "\\.(js|css|png|svg|woff2)$">
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

# Let existing files and directories through (assets, uploads, admin)
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Client-side SPA fallback to /index.html
RewriteRule ^ index.html [L]

# php -- BEGIN cPanel-generated handler, do not edit
# Set the “ea-php84” package as the default “PHP” programming language.
<IfModule mime_module>
  AddHandler application/x-httpd-ea-php84___lsphp .php .php8 .phtml
</IfModule>
# php -- END cPanel-generated handler, do not edit
`;

  const res = await cp.saveFile('public_html', '.htaccess', htaccessContent);
  console.log('Saved .htaccess:', res.status === 1 ? 'SUCCESS' : JSON.stringify(res));
}

updateHtaccess().catch(console.error);
