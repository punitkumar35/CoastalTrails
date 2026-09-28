import { chromium, devices } from 'playwright';
import path from 'path';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices['iPhone 13'],
  });
  const page = await context.newPage();
  
  // Set localStorage user so the avatar button is visible just like user screenshot
  await page.addInitScript(() => {
    localStorage.setItem('gokarna_traveler_user', JSON.stringify({
      id: 'traveler-1',
      name: 'Punith Naik',
      phone: '+919845012345',
      token: 'mock-token'
    }));
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const outPath = path.resolve('C:/Users/punit/.gemini/antigravity/brain/672d964d-941b-4527-8f53-83a1d4adf0c4/mobile_preview.png');
  await page.screenshot({ path: outPath });
  console.log('Saved screenshot to:', outPath);

  await browser.close();
}

main().catch(console.error);
