import https from 'https';

function testUrl(url, userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)') {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': userAgent, 'Accept': '*/*' } }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const titleMatch = data.match(/<title>(.*?)<\/title>/);
        const ogTitleMatch = data.match(/<meta property="og:title" content="(.*?)"/);
        const ogImageMatch = data.match(/<meta property="og:image" content="(.*?)"/);
        const canonicalMatch = data.match(/<link rel="canonical" href="(.*?)"/);
        const hasSchema = data.includes('LodgingBusiness');

        resolve({
          url,
          statusCode: res.statusCode,
          title: titleMatch ? titleMatch[1] : null,
          ogTitle: ogTitleMatch ? ogTitleMatch[1] : null,
          ogImage: ogImageMatch ? ogImageMatch[1] : null,
          canonical: canonicalMatch ? canonicalMatch[1] : null,
          hasLodgingSchema: hasSchema,
        });
      });
    }).on('error', e => resolve({ url, error: e.message }));
  });
}

async function run() {
  console.log('--- 1. Testing / (Homepage) ---');
  console.log(await testUrl('https://coastaltrails.in/'));

  console.log('\n--- 2. Testing /trails (The Gokarna Journal) ---');
  console.log(await testUrl('https://coastaltrails.in/trails'));

  console.log('\n--- 3. Testing WhatsApp Crawler on /stay/gokarna-1 (Kudle) ---');
  console.log(await testUrl('https://coastaltrails.in/stay/gokarna-1', 'WhatsApp/2.21.12.21 A'));

  console.log('\n--- 4. Testing Telegram Crawler on /stay/gokarna-3 (Half Moon) ---');
  console.log(await testUrl('https://coastaltrails.in/stay/gokarna-3', 'TelegramBot (like TwitterBot)'));

  console.log('\n--- 5. Testing Facebook Crawler on /stay/gokarna-11 (Main Beach) ---');
  console.log(await testUrl('https://coastaltrails.in/stay/gokarna-11', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'));
}

run().catch(console.error);
