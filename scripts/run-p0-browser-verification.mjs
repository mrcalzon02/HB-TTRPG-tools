import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const root = process.cwd();
const outputPath = path.resolve(root, process.argv[2] || 'artifacts/p0-browser-verification.json');
const screenshotPath = path.resolve(root, process.argv[3] || 'artifacts/p0-browser-verification-failure.png');
const failurePath = path.resolve(root, process.argv[4] || 'artifacts/p0-browser-verification-failure.json');
const host = '127.0.0.1';
const port = Number(process.env.P0_BROWSER_PORT || 4173);
const smokeTimeoutMs = Number(process.env.P0_BROWSER_SMOKE_TIMEOUT || 60000);
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
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce'
  });
  page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.addInitScript(() => {
    window.confirm = () => true;
    window.alert = () => undefined;
  });

  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => (
    typeof window.runKaysenderEditorSmokeTest === 'function' &&
    typeof window.getKaysenderEditorSmokeReceipt === 'function' &&
    Boolean(window.KaysenderEditorKernel) &&
    Boolean(window.KaysenderEditorRepository) &&
    Boolean(window.KaysenderMainlineEditorProduction)
  ), null, { timeout: 15000 });

  await page.evaluate(async timeoutMs => {
    await Promise.race([
      window.runKaysenderEditorSmokeTest(),
      new Promise((_, reject) => window.setTimeout(() => reject(new Error(`P0 browser smoke exceeded ${timeoutMs} ms.`)), timeoutMs))
    ]);
  }, smokeTimeoutMs);

  const receipt = await page.evaluate(() => window.getKaysenderEditorSmokeReceipt());
  if (!receipt || receipt.result !== 'passed') {
    const diagnostics = await page.locator('#p0-live-smoke-results li').allTextContents().catch(() => []);
    throw new Error(`Browser smoke completed without a passing receipt.${diagnostics.length ? ` ${diagnostics.join(' | ')}` : ''}`);
  }

  const remainingRecords = await page.evaluate(() => window.KaysenderEditorRepository.list());
  if (remainingRecords.length) {
    throw new Error(`Browser smoke left ${remainingRecords.length} temporary saved record${remainingRecords.length === 1 ? '' : 's'} behind: ${remainingRecords.map(item => item.profileId).join(', ')}.`);
  }
  if (pageErrors.length) throw new Error(`Uncaught page errors: ${pageErrors.join(' | ')}`);

  await fs.writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log('P0 browser verification passed in Chromium.');
  console.log(`Receipt written to ${path.relative(root, outputPath)}.`);
  console.log('Temporary persistent records were cleaned up successfully.');
  if (consoleErrors.length) console.warn(`Non-fatal browser console errors: ${consoleErrors.join(' | ')}`);
} catch (error) {
  let diagnostics = [];
  let pageUrl = '';
  let remainingRecords = [];
  if (page) {
    pageUrl = page.url();
    diagnostics = await page.locator('#p0-live-smoke-results li').allTextContents().catch(() => []);
    remainingRecords = await page.evaluate(() => window.KaysenderEditorRepository?.list?.() || []).catch(() => []);
    try {
      await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } catch (screenshotError) {
      console.error(`Could not capture failure screenshot: ${screenshotError.message}`);
    }
  }
  const failure = {
    schemaVersion: '1.0.0',
    stage: 'P0',
    stageId: 'shared-editor-kernel',
    failedAt: new Date().toISOString(),
    result: 'failed',
    message: error.message,
    url: pageUrl,
    diagnostics,
    remainingRecords,
    pageErrors,
    consoleErrors
  };
  await fs.writeFile(failurePath, `${JSON.stringify(failure, null, 2)}\n`, 'utf8').catch(writeError => {
    console.error(`Could not write browser failure report: ${writeError.message}`);
  });
  if (diagnostics.length) console.error(`Browser diagnostics: ${diagnostics.join(' | ')}`);
  if (remainingRecords.length) console.error(`Remaining temporary records: ${remainingRecords.map(item => item.profileId).join(', ')}`);
  if (pageErrors.length) console.error(`Page errors: ${pageErrors.join(' | ')}`);
  if (consoleErrors.length) console.error(`Console errors: ${consoleErrors.join(' | ')}`);
  console.error(`P0 browser verification failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await close(server);
}
