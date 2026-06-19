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
const fallbackLabel = 'rebuilt from tracked source';
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.b64', 'text/plain; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml']
]);

function safePathname(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, baseUrl).pathname);
  const resolved = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
}

async function serveFile(request, response) {
  const filePath = safePathname(request.url || '/');
  if (!filePath) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }
  try {
    const stat = await fs.stat(filePath);
    const resolved = stat.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': mimeTypes.get(path.extname(resolved).toLowerCase()) || 'application/octet-stream'
    });
    response.end(await fs.readFile(resolved));
  } catch (error) {
    response.writeHead(error?.code === 'ENOENT' ? 404 : 500);
    response.end(error.message);
  }
}

const server = http.createServer((request, response) => {
  serveFile(request, response).catch(error => {
    response.writeHead(500);
    response.end(error.message);
  });
});
const listen = () => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(port, host, resolve);
});
const close = () => new Promise(resolve => server.close(resolve));
const expectText = async (locator, expected, label) => {
  const value = (await locator.textContent()) || '';
  if (!value.includes(expected)) throw new Error(`${label} did not contain ${expected}`);
};

async function forceMissingGeneratedJson(page) {
  await page.route('**/data/barotrauma/wiki/crewmans-primer-source.json', async route => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ error: 'Generated Primer JSON fallback verification' })
    });
  });
}

let browser;
let page;
const pageErrors = [];
const consoleErrors = [];
const consoleWarnings = [];

try {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await Promise.all([
    fs.rm(outputPath, { force: true }),
    fs.rm(screenshotPath, { force: true }),
    fs.rm(failurePath, { force: true })
  ]);
  await listen();

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
    if (message.type() === 'warning') consoleWarnings.push(message.text());
  });
  await forceMissingGeneratedJson(page);

  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('.nav-button[data-view="barotrauma"]').click();
  await page.waitForSelector('#barotrauma.view.active', { timeout: 10000 });

  const card = page.locator('[data-module-id="barotrauma-crewmans-primer"]');
  await card.waitFor({ state: 'visible', timeout: 10000 });
  const wikiLink = card.locator('a[data-primer-native-link="wiki"]');
  const sourceLink = card.locator('a[data-primer-native-link="source"]');
  await wikiLink.waitFor({ state: 'visible', timeout: 10000 });
  await sourceLink.waitFor({ state: 'visible', timeout: 10000 });

  const wikiHref = await wikiLink.getAttribute('href');
  const sourceHref = await sourceLink.getAttribute('href');
  if (wikiHref !== 'barotrauma-primer.html?mode=wiki') throw new Error(`Wiki control has incorrect href: ${wikiHref}`);
  if (sourceHref !== 'barotrauma-primer.html?mode=source') throw new Error(`Source control has incorrect href: ${sourceHref}`);

  await wikiLink.click();
  await page.waitForURL('**/barotrauma-primer.html?mode=wiki', { timeout: 10000 });
  await page.waitForSelector('#primer-root .primer-layout', { timeout: 30000 });
  const wikiEntryCount = await page.locator('#primer-nav button').count();
  if (wikiEntryCount !== 198) throw new Error(`Standalone wiki fallback opened ${wikiEntryCount} entries instead of 198.`);
  await expectText(page.locator('#primer-article h2'), 'FOREWORD', 'Initial standalone wiki entry');
  await expectText(page.locator('#primer-status'), '198 of 198 entries', 'Wiki fallback status');
  if (!await page.locator('#primer-wiki-tab').evaluate(element => element.classList.contains('active'))) {
    throw new Error('Standalone wiki tab was not active.');
  }
  if (!consoleWarnings.some(message => message.includes('Generated Primer JSON unavailable'))) {
    throw new Error('Wiki did not report that it used the tracked source fallback after the forced JSON 404.');
  }

  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('.nav-button[data-view="barotrauma"]').click();
  await page.waitForSelector('#barotrauma.view.active', { timeout: 10000 });
  const sourceDashboardLink = page.locator('[data-module-id="barotrauma-crewmans-primer"] a[data-primer-native-link="source"]');
  await sourceDashboardLink.waitFor({ state: 'visible', timeout: 10000 });
  await sourceDashboardLink.click();
  await page.waitForURL('**/barotrauma-primer.html?mode=source', { timeout: 10000 });
  await page.waitForSelector('#primer-root .primer-layout', { timeout: 30000 });

  const sourceSections = page.locator('.primer-document-section');
  const sourceToc = page.locator('#primer-nav button');
  const sourceCount = await sourceSections.count();
  const tocCount = await sourceToc.count();
  if (sourceCount !== 198) throw new Error(`Expected 198 continuous source sections from fallback, found ${sourceCount}.`);
  if (tocCount !== 198) throw new Error(`Expected 198 source table-of-contents entries from fallback, found ${tocCount}.`);
  await expectText(sourceSections.first().locator('h2,h3,h4'), 'FOREWORD', 'First source title');
  await expectText(sourceSections.last().locator('h2,h3,h4'), 'FINAL CAUTION', 'Last source title');
  await expectText(page.locator('#primer-status'), 'Showing all 198 source sections', 'Source fallback status');
  if (!await page.locator('#primer-source-tab').evaluate(element => element.classList.contains('active'))) {
    throw new Error('Standalone source tab was not active.');
  }

  const sourceSearch = page.locator('#primer-search');
  await sourceSearch.fill('THE CROUCHING FALLACY');
  await page.waitForTimeout(80);
  if (await sourceSections.count() !== 1) throw new Error('Source document search did not reduce to one Crouching Fallacy section.');
  await expectText(sourceSections.first().locator('h2,h3,h4'), 'THE CROUCHING FALLACY', 'Source search title');
  await expectText(
    sourceSections.first(),
    'If a friendly crew member is crouching between you and the target, the line of fire remains obstructed.',
    'Source search full text'
  );
  await expectText(page.locator('#primer-status'), '1 of 198 source sections match', 'Source search status');

  await sourceSearch.fill('THE CHILDREN OF THE HONKMOTHER');
  await page.waitForTimeout(80);
  if (await sourceSections.count() !== 1) throw new Error('Honkmother source search did not reduce to one section.');
  await expectText(sourceSections.first(), 'grease paint', 'Honkmother source section');

  const sourceToWikiHref = await page.locator('#primer-wiki-tab').getAttribute('href');
  if (sourceToWikiHref !== 'barotrauma-primer.html?mode=wiki') throw new Error('Source-to-wiki navigation link is incorrect.');

  if (pageErrors.length) throw new Error(`Uncaught page errors: ${pageErrors.join(' | ')}`);

  const receipt = {
    schemaVersion: '2.5.0',
    workspace: 'barotrauma',
    moduleId: 'barotrauma-crewmans-primer',
    verifiedAt: new Date().toISOString(),
    result: 'passed',
    forcedCondition: 'crewmans-primer-source.json returned 404',
    recoveryMode: fallbackLabel,
    checks: {
      forceMissingGeneratedJson: 'passed',
      nativeWikiLink: wikiHref,
      nativeSourceLink: sourceHref,
      wikiFallbackLaunch: 'passed',
      wikiEntryCount,
      sourceFallbackLaunch: 'passed',
      sourceSectionCount: sourceCount,
      sourceTocCount: tocCount,
      firstSourceTitle: 'FOREWORD',
      lastSourceTitle: 'FINAL CAUTION',
      sourceSearch: 'passed',
      sourceToWikiNavigation: 'passed',
      honkmotherSearch: 'passed',
      pageErrors: pageErrors.length,
      consoleErrors: consoleErrors.length,
      consoleWarnings: consoleWarnings.length
    }
  };
  await fs.writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(`Generated Primer JSON fallback passed: ${wikiEntryCount} wiki entries and ${sourceCount} continuous source sections were ${fallbackLabel}.`);
} catch (error) {
  if (page) {
    try { await page.screenshot({ path: screenshotPath, fullPage: true }); } catch {}
  }
  await fs.writeFile(failurePath, `${JSON.stringify({
    schemaVersion: '2.5.0',
    workspace: 'barotrauma',
    moduleId: 'barotrauma-crewmans-primer',
    failedAt: new Date().toISOString(),
    result: 'failed',
    forcedCondition: 'crewmans-primer-source.json returned 404',
    message: error.message,
    url: page?.url() || '',
    pageErrors,
    consoleErrors,
    consoleWarnings
  }, null, 2)}\n`, 'utf8').catch(() => undefined);
  console.error(`Barotrauma Crewman's Primer fallback verification failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server.listening) await close();
}
