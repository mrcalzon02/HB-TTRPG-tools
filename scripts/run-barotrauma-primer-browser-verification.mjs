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

let browser;
let page;
const pageErrors = [];
const consoleErrors = [];

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
  });

  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('.nav-button[data-view="barotrauma"]').click();
  await page.waitForSelector('#barotrauma.view.active', { timeout: 10000 });

  const card = page.locator('[data-module-id="barotrauma-crewmans-primer"]');
  await card.waitFor({ state: 'visible', timeout: 10000 });
  await expectText(card, 'source document viewer', 'Primer registry card');
  await card.getByRole('button', { name: 'Open Source Document Viewer' }).click();

  const primer = page.locator('#barotrauma-primer-browser');
  await primer.waitFor({ state: 'visible', timeout: 10000 });
  const sourceTab = primer.getByRole('tab', { name: 'Source Document Viewer' });
  if ((await sourceTab.getAttribute('aria-selected')) !== 'true') throw new Error('Source Document Viewer tab did not open as the active mode.');

  const sourceSections = primer.locator('.primer-source-section');
  const sourceToc = primer.locator('#primer-source-toc button');
  const sourceCount = await sourceSections.count();
  const tocCount = await sourceToc.count();
  if (sourceCount !== 198) throw new Error(`Expected 198 continuous source sections, found ${sourceCount}.`);
  if (tocCount !== 198) throw new Error(`Expected 198 source table-of-contents entries, found ${tocCount}.`);
  await expectText(sourceSections.first().locator('h2,h3,h4'), 'FOREWORD', 'First source title');
  await expectText(sourceSections.last().locator('h2,h3,h4'), 'FINAL CAUTION', 'Last source title');

  const sourceSearch = primer.locator('#primer-source-search');
  await sourceSearch.fill('THE CROUCHING FALLACY');
  await page.waitForTimeout(80);
  if (await sourceSections.count() !== 1) throw new Error('Source document search did not reduce to one Crouching Fallacy section.');
  await expectText(sourceSections.first().locator('h2,h3,h4'), 'THE CROUCHING FALLACY', 'Source search title');
  await expectText(
    sourceSections.first(),
    'If a friendly crew member is crouching between you and the target, the line of fire remains obstructed.',
    'Source search full text'
  );
  await expectText(primer.locator('#primer-source-status'), '1 of 198 source sections match', 'Source search status');

  await sourceSections.first().getByRole('button', { name: 'Open as Wiki Entry' }).click();
  const wikiTab = primer.getByRole('tab', { name: 'Wiki Entries' });
  if ((await wikiTab.getAttribute('aria-selected')) !== 'true') throw new Error('Open as Wiki Entry did not switch to wiki mode.');
  await expectText(primer.locator('#primer-entry h3'), 'THE CROUCHING FALLACY', 'Returned wiki entry title');

  await sourceTab.click();
  await primer.locator('#primer-source-clear').click();
  const restoredSourceCount = await primer.locator('.primer-source-section').count();
  if (restoredSourceCount !== 198) throw new Error(`Expected 198 restored source sections, found ${restoredSourceCount}.`);

  const honkmotherToc = primer.locator('#primer-source-toc button').filter({ hasText: 'THE CHILDREN OF THE HONKMOTHER' });
  if (await honkmotherToc.count() !== 1) throw new Error('Honkmother source section was not present in the document table of contents.');
  await honkmotherToc.click();
  await expectText(primer.locator('#primer-source-the-children-of-the-honkmother'), 'grease paint', 'Honkmother source section');

  if (pageErrors.length) throw new Error(`Uncaught page errors: ${pageErrors.join(' | ')}`);

  const receipt = {
    schemaVersion: '2.2.0',
    workspace: 'barotrauma',
    moduleId: 'barotrauma-crewmans-primer',
    verifiedAt: new Date().toISOString(),
    result: 'passed',
    checks: {
      sourceViewerLaunch: 'passed',
      sourceSectionCount: sourceCount,
      sourceTocCount: tocCount,
      firstSourceTitle: 'FOREWORD',
      lastSourceTitle: 'FINAL CAUTION',
      sourceSearch: 'passed',
      sourceToWikiNavigation: 'passed',
      restoredSourceCount,
      honkmotherTocNavigation: 'passed',
      pageErrors: pageErrors.length,
      consoleErrors: consoleErrors.length
    }
  };
  await fs.writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(`Barotrauma Crewman's Primer source document viewer passed with ${sourceCount} continuous sections.`);
} catch (error) {
  if (page) {
    try { await page.screenshot({ path: screenshotPath, fullPage: true }); } catch {}
  }
  await fs.writeFile(failurePath, `${JSON.stringify({
    schemaVersion: '2.2.0',
    workspace: 'barotrauma',
    moduleId: 'barotrauma-crewmans-primer',
    failedAt: new Date().toISOString(),
    result: 'failed',
    message: error.message,
    url: page?.url() || '',
    pageErrors,
    consoleErrors
  }, null, 2)}\n`, 'utf8').catch(() => undefined);
  console.error(`Barotrauma Crewman's Primer browser verification failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server.listening) await close();
}
