import { all } from '../db/index.js';
import fs from 'fs';
import path from 'path';

async function main() {
  const stays = await all(
    'SELECT id, title, location, location_display, price_per_night, description FROM homestays ORDER BY id ASC'
  );
  const images = await all(
    'SELECT homestay_id, image_url, sort_order FROM homestay_images ORDER BY homestay_id, sort_order ASC'
  );

  const stayImgMap = {};
  for (const img of images) {
    if (!stayImgMap[img.homestay_id]) stayImgMap[img.homestay_id] = [];
    stayImgMap[img.homestay_id].push(img.image_url);
  }

  const today = '2026-09-28';

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n\n';

  // 1. Core Homepage
  xml += '  <!-- Core Domain Entrypoints -->\n';
  xml += '  <url>\n';
  xml += '    <loc>https://coastaltrails.in/</loc>\n';
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += '    <changefreq>daily</changefreq>\n';
  xml += '    <priority>1.0</priority>\n';
  xml += '    <image:image>\n';
  xml += '      <image:loc>https://coastaltrails.in/assets/real/gokarna-expedition.webp</image:loc>\n';
  xml += '      <image:title>Coastal Trails Gokarna Homestays &amp; Cliff Trek</image:title>\n';
  xml += '      <image:caption>Scenic coastal cliffs, golden beaches, and authentic homestays in Gokarna, Karnataka</image:caption>\n';
  xml += '    </image:image>\n';
  xml += '    <image:image>\n';
  xml += '      <image:loc>https://coastaltrails.in/assets/real/kudle-beach.webp</image:loc>\n';
  xml += '      <image:title>Kudle Beach Clifftop View</image:title>\n';
  xml += '    </image:image>\n';
  xml += '    <image:image>\n';
  xml += '      <image:loc>https://coastaltrails.in/assets/real/om-beach.webp</image:loc>\n';
  xml += '      <image:title>Om Beach Shoreline</image:title>\n';
  xml += '    </image:image>\n';
  xml += '  </url>\n\n';

  // 2. Homestays Catalog
  xml += '  <url>\n';
  xml += '    <loc>https://coastaltrails.in/homestays</loc>\n';
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += '    <changefreq>daily</changefreq>\n';
  xml += '    <priority>0.9</priority>\n';
  xml += '  </url>\n\n';

  // 3. Beach Clusters
  xml += '  <!-- Targeted Gokarna Beach Cluster Landing Pages -->\n';
  const clusters = [
    { slug: 'kudle-beach', title: 'Kudle Beach Homestays &amp; Clifftop Cottages', img: 'https://coastaltrails.in/assets/real/kudle-beach.webp' },
    { slug: 'om-beach', title: 'Om Beach Seaside Cottages &amp; Shacks', img: 'https://coastaltrails.in/assets/real/om-beach.webp' },
    { slug: 'half-moon-beach', title: 'Half Moon Beach Secluded Rock Cottages', img: 'https://coastaltrails.in/assets/real/halfmoon-beach.webp' },
    { slug: 'paradise-beach', title: 'Paradise Beach Eco Cliff Pods &amp; Stays', img: 'https://coastaltrails.in/assets/real/paradise-beach.webp' },
    { slug: 'main-beach', title: 'Main Beach &amp; Temple Town Homestays', img: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Gokarna_temple_beach.JPG' },
  ];
  for (const c of clusters) {
    xml += '  <url>\n';
    xml += `    <loc>https://coastaltrails.in/homestays/${c.slug}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>0.9</priority>\n';
    xml += '    <image:image>\n';
    xml += `      <image:loc>${c.img}</image:loc>\n`;
    xml += `      <image:title>${c.title}</image:title>\n`;
    xml += '    </image:image>\n';
    xml += '  </url>\n\n';
  }

  // 4. Trails & Culture Journal
  xml += '  <!-- Trails & Culture Journal -->\n';
  xml += '  <url>\n';
  xml += '    <loc>https://coastaltrails.in/trails</loc>\n';
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += '    <changefreq>weekly</changefreq>\n';
  xml += '    <priority>0.9</priority>\n';
  xml += '    <image:image>\n';
  xml += '      <image:loc>https://coastaltrails.in/assets/real/halfmoon-beach.webp</image:loc>\n';
  xml += '      <image:title>Gokarna 5-Beach Cliff Trek Route</image:title>\n';
  xml += '    </image:image>\n';
  xml += '    <image:image>\n';
  xml += '      <image:loc>https://coastaltrails.in/assets/real/paradise-beach.webp</image:loc>\n';
  xml += '      <image:title>Paradise Beach Secluded Trail</image:title>\n';
  xml += '    </image:image>\n';
  xml += '    <image:image>\n';
  xml += '      <image:loc>https://coastaltrails.in/assets/real/yana-caves.webp</image:loc>\n';
  xml += '      <image:title>Yana Caves Geological Formations</image:title>\n';
  xml += '    </image:image>\n';
  xml += '    <image:image>\n';
  xml += '      <image:loc>https://coastaltrails.in/assets/real/mirjan-fort.webp</image:loc>\n';
  xml += '      <image:title>Mirjan Fort Historical Architecture</image:title>\n';
  xml += '    </image:image>\n';
  xml += '  </url>\n\n';

  // 5. All 12 Live Homestays
  xml += '  <!-- All 12 Verified Gokarna Homestay Listings -->\n';
  for (const s of stays) {
    xml += '  <url>\n';
    xml += `    <loc>https://coastaltrails.in/stay/${s.id}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.85</priority>\n';
    const imgs = stayImgMap[s.id] || [];
    for (const imgUrl of imgs.slice(0, 3)) {
      const cleanImg = imgUrl.startsWith('http')
        ? imgUrl
        : 'https://coastaltrails.in' + (imgUrl.startsWith('/') ? '' : '/') + imgUrl;
      xml += '    <image:image>\n';
      xml += `      <image:loc>${cleanImg.replace(/&/g, '&amp;')}</image:loc>\n`;
      xml += `      <image:title>${s.title.replace(/&/g, '&amp;')} in ${s.location_display || 'Gokarna'}</image:title>\n`;
      xml += '    </image:image>\n';
    }
    xml += '  </url>\n\n';
  }

  // 6. All 12 Gokarna Travel Guide Pages
  xml += '  <!-- Curated Gokarna Travel Guide Pages -->\n';
  const guides = [
    { path: '/gokarna/', priority: '0.95', changefreq: 'weekly', title: 'Gokarna Travel Guide Hub' },
    { path: '/gokarna/5-beach-trek/', priority: '0.9', changefreq: 'monthly', title: 'Gokarna 5 Beach Trek Route and Guide' },
    { path: '/gokarna/beaches/', priority: '0.85', changefreq: 'monthly', title: 'All Gokarna Beaches Directory' },
    { path: '/gokarna/tours/', priority: '0.85', changefreq: 'monthly', title: 'Gokarna Boat and Heritage Tours' },
    { path: '/gokarna/camping/', priority: '0.85', changefreq: 'monthly', title: 'Gokarna Beach Camping Guide' },
    { path: '/gokarna/things-to-do/', priority: '0.85', changefreq: 'monthly', title: 'Top Things to Do in Gokarna' },
    { path: '/gokarna/travel-guide/', priority: '0.85', changefreq: 'monthly', title: 'Gokarna Travel Planning Guide' },
    { path: '/gokarna/travel-guide/best-time-to-visit/', priority: '0.8', changefreq: 'monthly', title: 'Best Time to Visit Gokarna Weather Guide' },
    { path: '/gokarna/travel-guide/how-to-reach/', priority: '0.8', changefreq: 'monthly', title: 'How to Reach Gokarna by Train, Flight &amp; Bus' },
    { path: '/gokarna/travel-guide/2-day-itinerary/', priority: '0.8', changefreq: 'monthly', title: 'Gokarna 2-Day Weekend Itinerary' },
    { path: '/gokarna/travel-guide/3-day-itinerary/', priority: '0.8', changefreq: 'monthly', title: 'Gokarna 3-Day Complete Itinerary' },
    { path: '/gokarna/travel-guide/trip-cost/', priority: '0.8', changefreq: 'monthly', title: 'Gokarna Trip Cost &amp; Budget Breakdown' },
  ];
  for (const g of guides) {
    xml += '  <url>\n';
    xml += `    <loc>https://coastaltrails.in${g.path}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${g.changefreq}</changefreq>\n`;
    xml += `    <priority>${g.priority}</priority>\n`;
    xml += '    <image:image>\n';
    xml += '      <image:loc>https://coastaltrails.in/images/gokarna/gokarna-coastline-aerial-hero.jpg</image:loc>\n';
    xml += `      <image:title>${g.title}</image:title>\n`;
    xml += '    </image:image>\n';
    xml += '  </url>\n\n';
  }

  xml += '</urlset>\n';

  const outPath = path.resolve('y:/Gokarna/Gokarna-Connect/website/client/public/sitemap.xml');
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log(`Successfully wrote ${outPath} with all URLs!`);
  process.exit(0);
}

main().catch(console.error);
