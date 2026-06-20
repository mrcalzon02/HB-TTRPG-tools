import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const root = process.cwd();
const outputPath = path.resolve(root, process.argv[2] || 'artifacts/barotrauma-primer-browser-verification.json');
const host = '127.0.0.1';
const port = 4174;
const baseUrl = `http://${host}:${port}`;
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8']
]);

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', baseUrl).pathname);
    const filePath = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!filePath.startsWith(root)) throw new Error('Forbidden');
    const data = await fs.readFile(filePath);
    response.writeHead(200, {
      'content-type': mime.get(path.extname(filePath)) || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    response.end(data);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500);
    response.end(error.message);
  }
});

const listen = () => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(port, host, resolve);
});
const close = () => new Promise(resolve => server.close(resolve));

const pageScript = await fs.readFile(path.resolve(root, 'barotrauma-primer-page.js'), 'utf8');
const attachedEntryFiles = [...pageScript.matchAll(/'data\/barotrauma\/wiki\/entries\/[^']+\.md'/g)];
const expectedCount = attachedEntryFiles.length;
if (!expectedCount) throw new Error('No Primer wiki entries are attached in barotrauma-primer-page.js.');

let browser;
try {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  await page.goto(`${baseUrl}/barotrauma-primer.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#primer-nav a');

  const wikiCount = await page.locator('#primer-nav a').count();
  if (wikiCount !== expectedCount) throw new Error(`Wiki displayed ${wikiCount} entries instead of ${expectedCount}.`);

  const firstTitle = await page.locator('#primer-article h2').textContent();
  if (firstTitle !== 'FOREWORD') throw new Error(`Wiki opened on ${firstTitle || 'nothing'} instead of FOREWORD.`);

  if (expectedCount >= 2) {
    await page.locator('#primer-nav a').nth(1).click();
    const secondTitle = await page.locator('#primer-article h2').textContent();
    if (secondTitle !== 'REGARD EVERY CONTROL AS LOADED') {
      throw new Error(`Second wiki entry opened as ${secondTitle || 'nothing'} instead of REGARD EVERY CONTROL AS LOADED.`);
    }
  }

  const sourceButtonCount = await page.locator('#primer-source-tab').count();
  if (sourceButtonCount !== 0) throw new Error('Obsolete Source Document Viewer button is still present.');

  await fs.writeFile(outputPath, `${JSON.stringify({ result: 'passed', expectedCount, wikiCount, firstTitle }, null, 2)}\n`);
  console.log(`Crewman's Primer verification passed for ${expectedCount} attached wiki ${expectedCount === 1 ? 'entry' : 'entries'}.`);
} finally {
  if (browser) await browser.close();
  if (server.listening) await close();
}
