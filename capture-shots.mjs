import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const puppeteerPath = '/home/hatch/workspace/makefun/shot-tools/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
const puppeteer = await import(pathToFileURL(puppeteerPath).href);

const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}`;
const SHOTS_JSON = 'shots.json';
const OUTPUT_DIR = 'screenshots';

async function main() {
  if (!fs.existsSync(SHOTS_JSON)) {
    console.error(`Missing ${SHOTS_JSON}`);
    process.exit(1);
  }
  const shots = JSON.parse(fs.readFileSync(SHOTS_JSON, 'utf8'));
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  } else {
    for (const f of fs.readdirSync(OUTPUT_DIR)) {
      if (f.endsWith('.jpg') || f.endsWith('.png')) {
        fs.unlinkSync(path.join(OUTPUT_DIR, f));
      }
    }
  }

  console.log(`Launching browser...`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });

  for (const shot of shots) {
    const url = `${BASE_URL}/index.html${shot.query}`;
    console.log(`Capturing ${shot.name} from ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });

    try {
      await page.waitForFunction('window.__shotReady === true', { timeout: 10000 });
    } catch (e) {
      console.warn(`Warning: timeout waiting for __shotReady on ${shot.name}`);
    }

    await new Promise(r => setTimeout(r, 600));

    const outPath = path.join(OUTPUT_DIR, shot.name);
    await page.screenshot({
      path: outPath,
      type: 'jpeg',
      quality: 85
    });

    const stats = fs.statSync(outPath);
    console.log(`Saved ${shot.name} (${stats.size} bytes)`);
    if (stats.size > 262144) {
      console.warn(`WARNING: ${shot.name} exceeds 256 KiB (${stats.size} bytes)!`);
    }
  }

  await browser.close();
  console.log('All screenshots captured successfully.');
}

main().catch(err => {
  console.error('Error capturing shots:', err);
  process.exit(1);
});
