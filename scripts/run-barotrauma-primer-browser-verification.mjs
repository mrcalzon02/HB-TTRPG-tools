import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const root = process.cwd();
const outputPath = path.resolve(root, process.argv[2] || 'artifacts/barotrauma-primer-browser-verification.json');
const screenshotPath = path.resolve(root, process.argv[3] || 'artifacts/barotrauma-primer-browser-verification-failure.png');
const failurePath = path.resolve(root, process.argv[4] || 'artifacts/barotrauma-primer-browser-verification-failure.json');
const host = '127.0.0.1';
const port = Number(process.env.BAROTRAUMA_PRIMER_BROWSER_PORT || 4174);
const baseUrl = `http://${host}:${port}`;

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp']
]);

function safePathname(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, baseUrl).pathname);
  const requested = pathname === '/' ? '/index.html' : pathname;
  const resolved = path.resolve(root, `.${requested}`);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) return null;
  return resolved;
}

async function serveFile(request, response) {
  const filePath = safePathname(request.url || '/');
  if (!filePath) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }
  try {
    const stat = await fs.stat(filePath);
    const resolvedFile = stat.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    const content = await fs.readFile(resolvedFile);
    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': mimeTypes.get(path.extname(resolvedFile).toLowerCase()) || 'application/octet-stream'
    });
    response.end(content);
  } catch (error) {
    response.writeHead(error?.code === 'ENOENT' ? 404 : 500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(error?.code === 'ENOENT' ? 'Not found' : `Server error: ${error.message}`);
  }
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
}

async function close(server) {
  if (!server.listening) return;
  await new Promise(resolve => server.close(() => resolve()));
}

async function removeIfPresent(filePath) {
  await fs.rm(filePath, { force: true }).catch(() => undefined);
}

async function expectText(locator, expected, label) {
  const text = (await locator.textContent()) || '';
  if (!text.includes(expected)) throw new Error(`${label} did not contain expected text: ${expected}`);
  return text.trim();
}

const server = http.createServer((request, response) => {
  serveFile(request, response).catch(error => {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(`Server error: ${error.message}`);
  });
});

let browser;
let page;
const pageErrors = [];
const consoleErrors = [];

try {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.mkdir(path.dirname(failurePath), { recursive: true });
  await removeIfPresent(outputPath);
  await removeIfPresent(failurePath);
  await removeIfPresent(screenshotPath);
  await listen(server);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: 'reduce'
  });
  page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('.nav-button[data-view="barotrauma"]').click();
  await page.waitForSelector('#barotrauma.view.active', { timeout: 10000 });

  const card = page.locator('[data-module-id="barotrauma-crewmans-primer"]');
  await card.waitFor({ state: 'visible', timeout: 10000 });
  await expectText(card, '21-section', 'Primer registry card');
  await card.getByRole('button', { name: "Open Crewman's Primer Wiki" }).click();

  const primer = page.locator('#barotrauma-primer-browser');
  await primer.waitFor({ state: 'visible', timeout: 10000 });
  await expectText(primer.locator('#primer-browser-title'), "THE EUROPAN CREWMAN'S PRIMER", 'Primer title');
  await expectText(primer.locator('.primer-edition'), '21 sections', 'Primer edition summary');

  const initialSectionCount = await primer.locator('#primer-list button').count();
  if (initialSectionCount !== 21) throw new Error(`Expected 21 visible Primer sections, found ${initialSectionCount}.`);

  const search = primer.locator('#primer-search');
  await search.fill('occupied space');
  await page.waitForTimeout(50);
  const weaponMatches = await primer.locator('#primer-list button').count();
  if (weaponMatches !== 1) throw new Error(`Expected one line-of-fire search result, found ${weaponMatches}.`);
  await primer.locator('#primer-list button').click();
  await expectText(primer.locator('#primer-entry h3'), 'Weapons and the Line-of-Fire Doctrine', 'Weapons section title');
  await expectText(primer.locator('#primer-entry'), "Never fire through a crew member's occupied space.", 'Strict line-of-fire doctrine');

  await search.fill('assistant and the clown question');
  await page.waitForTimeout(50);
  await primer.locator('#primer-list button').first().click();
  await expectText(primer.locator('#primer-entry h3'), 'The Assistant and the Clown Question', 'Assistant and clown section title');
  await expectText(primer.locator('#primer-entry'), 'On the two organized responses to the deep', 'Assistant and clown footnote');

  const cultLink = primer.getByRole('button', { name: 'XIX. The Two Calls Below the Ice' });
  await cultLink.click();
  await expectText(primer.locator('#primer-entry h3'), 'The Two Calls Below the Ice', 'Cult comparison section title');
  await expectText(primer.locator('#primer-entry'), 'Children of the Honkmother', 'Honkmother reference');
  await expectText(primer.locator('#primer-entry'), 'Church of the Husk', 'Church of the Husk reference');

  const engineeringFilter = primer.getByRole('button', { name: 'Engineering', exact: true });
  await engineeringFilter.click();
  const engineeringCount = await primer.locator('#primer-list button').count();
  if (engineeringCount !== 2) throw new Error(`Expected two Engineering sections, found ${engineeringCount}.`);

  if (pageErrors.length) throw new Error(`Uncaught page errors: ${pageErrors.join(' | ')}`);

  const receipt = {
    schemaVersion: '1.0.0',
    workspace: 'barotrauma',
    moduleId: 'barotrauma-crewmans-primer',
    verifiedAt: new Date().toISOString(),
    result: 'passed',
    checks: {
      registryCard: 'passed',
      primerLaunch: 'passed',
      sectionCount: initialSectionCount,
      lineOfFireSearchResults: weaponMatches,
      strictLineOfFireDoctrine: 'passed',
      assistantClownFootnote: 'passed',
      cultCrossLink: 'passed',
      engineeringCategoryCount: engineeringCount,
      pageErrors: pageErrors.length,
      consoleErrors: consoleErrors.length
    }
  };

  await fs.writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(`Barotrauma Crewman's Primer browser verification passed with ${initialSectionCount} sections.`);
  console.log(`Receipt written to ${path.relative(root, outputPath)}.`);
  if (consoleErrors.length) console.warn(`Non-fatal browser console errors: ${consoleErrors.join(' | ')}`);
} catch (error) {
  let pageUrl = '';
  if (page) {
    pageUrl = page.url();
    try {
      await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } catch (screenshotError) {
      console.error(`Could not capture failure screenshot: ${screenshotError.message}`);
    }
  }
  const failure = {
    schemaVersion: '1.0.0',
    workspace: 'barotrauma',
    moduleId: 'barotrauma-crewmans-primer',
    failedAt: new Date().toISOString(),
    result: 'failed',
    message: error.message,
    url: pageUrl,
    pageErrors,
    consoleErrors
  };
  await fs.writeFile(failurePath, `${JSON.stringify(failure, null, 2)}\n`, 'utf8').catch(writeError => {
    console.error(`Could not write browser failure report: ${writeError.message}`);
  });
  if (pageErrors.length) console.error(`Page errors: ${pageErrors.join(' | ')}`);
  if (consoleErrors.length) console.error(`Console errors: ${consoleErrors.join(' | ')}`);
  console.error(`Barotrauma Crewman's Primer browser verification failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await close(server);
}
