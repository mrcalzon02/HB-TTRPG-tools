import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const root = process.cwd();
const outputPath = path.resolve(root, process.argv[2] || 'artifacts/shadowrun-sprawl-discovery-browser-verification.json');
const failureScreenshotPath = path.resolve(root, process.argv[3] || 'artifacts/shadowrun-sprawl-discovery-browser-verification-failure.png');
const host = '127.0.0.1';
const port = 4182;
const baseUrl = `http://${host}:${port}`;
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg']
]);

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', baseUrl).pathname);
    const filePath = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!filePath.startsWith(root)) throw new Error('Forbidden');
    const data = await fs.readFile(filePath);
    response.writeHead(200, {
      'content-type': mime.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream',
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

let browser;
let page;
const browserErrors = [];
const consoleErrors = [];
const checks = [];
const result = {
  receiptType: 'shadowrunSprawlDiscoveryBrowserVerification',
  schemaVersion: '1.0.0',
  result: 'failed',
  checks,
  browserErrors,
  consoleErrors
};

try {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.mkdir(path.dirname(failureScreenshotPath), { recursive: true });
  await listen();
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(baseUrl)) return route.continue();
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><title>external map stub</title>' });
  });
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  assert(await page.locator('script[src="shadowrun-sprawl-discovery-engine.js"]').count() === 0, 'Sprawl Discovery engine loaded before the Shadowrun tool was opened.');
  assert(await page.locator('script[src="shadowrun-sprawl-discovery.js"]').count() === 0, 'Sprawl Discovery panel loaded before the Shadowrun tool was opened.');
  checks.push('sprawl-discovery-components-are-lazy-before-workspace-use');

  await page.locator('[data-view="shadowrun"]').first().click();
  await page.waitForSelector('#shadowrun.active');
  await page.waitForSelector('[data-shadowrun-module="shadowrun-sprawl-discovery"]');
  const moduleCountText = await page.locator('#shadowrun-count').textContent();
  const moduleMatch = String(moduleCountText || '').match(/(\d+) of (\d+)/);
  assert(moduleMatch && Number(moduleMatch[1]) === Number(moduleMatch[2]) && Number(moduleMatch[2]) >= 20, `Shadowrun module count was unexpected: ${moduleCountText || 'missing'}.`);
  assert(await page.locator('script[src="shadowrun-sprawl-discovery-engine.js"]').count() === 0, 'Sprawl Discovery engine loaded before the discovery launcher was used.');
  checks.push('shadowrun-workspace-loads-with-discovery-module');

  await page.locator('[data-shadowrun-open="shadowrun-sprawl-discovery"]').click();
  await page.waitForSelector('#shadowrun-sprawl-discovery-panel:not([hidden])');
  await page.waitForFunction(() => Boolean(window.ShadowrunSprawlDiscoveryEngine && window.ShadowrunSprawlDiscovery));
  const scriptCounts = {
    engine: await page.locator('script[src="shadowrun-sprawl-discovery-engine.js"]').count(),
    panel: await page.locator('script[src="shadowrun-sprawl-discovery.js"]').count()
  };
  assert(scriptCounts.engine === 1 && scriptCounts.panel === 1, `Expected one discovery engine and panel script: ${JSON.stringify(scriptCounts)}.`);
  checks.push('discovery-engine-and-panel-load-on-demand-once');

  await page.locator('#sr-discovery-url').fill('https://www.google.com/maps/@47.620001,-122.340002,3a,75y');
  await page.locator('[data-sr-discovery-read-link]').click();
  assert(await page.locator('#sr-discovery-lat').inputValue() === '47.620001', 'Coordinate reader did not fill latitude.');
  assert(await page.locator('#sr-discovery-lng').inputValue() === '-122.340002', 'Coordinate reader did not fill longitude.');
  checks.push('street-view-coordinate-reader');

  await page.locator('#sr-discovery-seed').fill('browser-sprawl-stage-1');
  await page.locator('#sr-discovery-label').fill('Browser Verification Origin');
  await page.locator('#sr-discovery-radius').fill('750');
  await page.locator('#sr-discovery-count').fill('7');
  await page.locator('#sr-discovery-focus').selectOption('security');
  await page.locator('#sr-discovery-threat').selectOption('prime');
  await page.locator('[data-sr-discovery-generate]').click();
  await page.waitForFunction(() => window.ShadowrunSprawlDiscovery?.getCurrentPackage?.()?.sites?.length === 7);
  assert(await page.locator('.sr-discovery-card').count() === 7, 'The browser did not render seven discovery site cards.');
  checks.push('browser-generation-renders-requested-nearby-sites');

  const discoveryPackage = await page.evaluate(() => window.ShadowrunSprawlDiscovery.getCurrentPackage());
  const packageValidation = await page.evaluate(() => window.ShadowrunSprawlDiscoveryEngine.validateDiscoveryPackage(window.ShadowrunSprawlDiscovery.getCurrentPackage()));
  assert(packageValidation.valid, `Browser package did not validate: ${packageValidation.failures.join(', ')}`);
  assert(discoveryPackage.focus === 'security' && discoveryPackage.threat === 'prime', 'Browser package did not preserve selected focus and threat.');
  assert(discoveryPackage.sites.every(site => site.streetViewUrl.includes('map_action=pano')), 'A browser-generated site lacked a Street View link.');
  checks.push('browser-package-validates-and-preserves-controls');

  const firstSelected = await page.evaluate(() => window.ShadowrunSprawlDiscovery.getSelectedSite().siteKey);
  await page.locator('.sr-discovery-card').nth(1).click();
  const secondSelected = await page.evaluate(() => window.ShadowrunSprawlDiscovery.getSelectedSite().siteKey);
  assert(firstSelected !== secondSelected, 'Clicking a site card did not update the selected site.');
  const detailText = await page.locator('#sr-discovery-detail').textContent();
  assert(detailText?.includes('Security posture') && detailText?.includes('Related nearby sites'), 'Selected-site detail panel did not render operational fields.');
  assert(await page.locator('#sr-discovery-detail a[href*="map_action=pano"]').count() === 1, 'Selected-site detail did not expose one Street View link.');
  checks.push('site-selection-detail-and-street-view-link');

  for (const selector of [
    '[data-sr-discovery-copy]',
    '[data-sr-discovery-download-json]',
    '[data-sr-discovery-download-geojson]',
    '[data-sr-discovery-download-kml]'
  ]) {
    assert(!(await page.locator(selector).isDisabled()), `${selector} remained disabled after generation.`);
  }
  checks.push('copy-and-export-controls-enabled');

  assert(browserErrors.length === 0, `Browser page errors were recorded: ${browserErrors.join(' | ')}`);
  assert(consoleErrors.length === 0, `Browser console errors were recorded: ${consoleErrors.join(' | ')}`);
  checks.push('no-browser-or-console-errors');

  result.result = 'passed';
  result.packageKey = discoveryPackage.packageKey;
  result.siteCount = discoveryPackage.sites.length;
  result.focus = discoveryPackage.focus;
  result.threat = discoveryPackage.threat;
  result.selectedSiteKey = secondSelected;
  await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Shadowrun Sprawl Discovery browser verification passed with ${checks.length} checks.`);
} catch (error) {
  result.error = error.message;
  try {
    if (page) await page.screenshot({ path: failureScreenshotPath, fullPage: true });
  } catch (_) {
    // Failure evidence is best-effort.
  }
  await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  throw error;
} finally {
  if (browser) await browser.close();
  if (server.listening) await close();
}
