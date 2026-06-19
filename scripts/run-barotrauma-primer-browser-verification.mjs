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
  ['.css', 'text/css; charset=utf-8']
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

let browser;
try {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  await page.goto(`${baseUrl}/barotrauma-primer.html?mode=wiki`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#primer-nav button');
  const wikiCount = await page.locator('#primer-nav button').count();
  if (wikiCount !== 198) throw new Error(`Wiki displayed ${wikiCount} entries instead of 198.`);
  if ((await page.locator('#primer-article h2').textContent()) !== 'FOREWORD') throw new Error('Wiki did not open on FOREWORD.');

  await page.goto(`${baseUrl}/barotrauma-primer.html?mode=source`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.primer-document-section');
  const sourceCount = await page.locator('.primer-document-section').count();
  if (sourceCount !== 198) throw new Error(`Source viewer displayed ${sourceCount} sections instead of 198.`);
  const first = await page.locator('.primer-document-section').first().locator('h2,h3,h4').textContent();
  const last = await page.locator('.primer-document-section').last().locator('h2,h3,h4').textContent();
  if (first !== 'FOREWORD' || last !== 'FINAL CAUTION') throw new Error(`Source order is wrong: ${first} ... ${last}.`);

  await fs.writeFile(outputPath, `${JSON.stringify({ result: 'passed', wikiCount, sourceCount, first, last }, null, 2)}\n`);
  console.log('Crewman\'s Primer plain-file browser verification passed.');
} finally {
  if (browser) await browser.close();
  if (server.listening) await close();
}
