import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const root = process.cwd();
const outputPath = path.resolve(root, process.argv[2] || 'data/kaysender/receipts/p1-island-browser.json');
const failurePath = path.resolve(root, process.argv[3] || 'data/kaysender/receipts/p1-island-browser-failure.json');
const screenshotPath = path.resolve(root, process.argv[4] || 'artifacts/p1-island-browser-failure.png');
const host = '127.0.0.1';
const port = Number(process.env.P1_ISLAND_BROWSER_PORT || 4174);
const baseUrl = `http://${host}:${port}`;

const scriptOrder = [
  'kaysender-surface-grid-editor.js',
  'kaysender-surface-grid-brushes.js',
  'kaysender-surface-cell-inspector.js',
  'kaysender-surface-grid-toolbar.js',
  'kaysender-surface-grid-resize.js',
  'kaysender-island-v3-schema-validator.js',
  'kaysender-island-v3-domain.js',
  'kaysender-island-v3-transformers.js',
  'kaysender-island-v3-consumer-builders.js',
  'kaysender-island-v3-profile-model.js',
  'kaysender-island-v3-panels.js',
  'kaysender-island-v3-panels-lifecycle.js',
  'kaysender-island-v3-panels-atomic.js',
  'kaysender-island-surface-grid-controller.js'
];

const styleOrder = [
  'kaysender-surface-grid-editor.css',
  'kaysender-surface-grid-resize.css',
  'kaysender-island-v3-panels.css'
];

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8']
]);

function safePathname(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, baseUrl).pathname);
  const resolved = path.resolve(root, `.${pathname}`);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) return null;
  return resolved;
}

async function serve(request, response) {
  const pathname = new URL(request.url || '/', baseUrl).pathname;
  if (pathname === '/__p1_island_harness__') {
    response.writeHead(200, { 'cache-control': 'no-store', 'content-type': 'text/html; charset=utf-8' });
    response.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>P1 Island Verification</title></head><body><main><ol id="results"></ol><div id="production"></div><div id="toolbar"></div><div id="grid"></div><div id="inspector"></div><div id="resize"></div></main></body></html>`);
    return;
  }
  const filePath = safePathname(request.url || '/');
  if (!filePath) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }
  try {
    const content = await fs.readFile(filePath);
    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': mimeTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream'
    });
    response.end(content);
  } catch (error) {
    response.writeHead(error?.code === 'ENOENT' ? 404 : 500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(error?.code === 'ENOENT' ? 'Not found' : error.message);
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
  await new Promise(resolve => server.close(resolve));
}

const fixture = JSON.parse(await fs.readFile(path.join(root, 'data/kaysender/editors/fixtures/p1-floating-island-production-valid.json'), 'utf8'));
const server = http.createServer((request, response) => serve(request, response).catch(error => {
  response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
  response.end(error.message);
}));

let browser;
let page;
const pageErrors = [];
const consoleErrors = [];

try {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.mkdir(path.dirname(failurePath), { recursive: true });
  await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
  await fs.rm(outputPath, { force: true });
  await fs.rm(failurePath, { force: true });
  await fs.rm(screenshotPath, { force: true });
  await listen(server);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(`${baseUrl}/__p1_island_harness__`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(() => {
    window.__p1DirtyTransitions = [];
    window.__p1Injected = false;
    window.KaysenderEditorLifecycle = Object.freeze({
      markDirty(editorId, message) {
        window.__p1DirtyTransitions.push({ editorId, message });
      }
    });
  });

  for (const stylesheet of styleOrder) await page.addStyleTag({ url: `${baseUrl}/${stylesheet}` });
  for (const script of scriptOrder) await page.addScriptTag({ url: `${baseUrl}/${script}` });

  const receipt = await page.evaluate(async sourceFixture => {
    const checks = [];
    const diagnostics = [];
    const record = (id, condition, detail) => {
      const check = { id, status: condition ? 'passed' : 'failed', detail };
      checks.push(check);
      const item = document.createElement('li');
      item.dataset.checkId = id;
      item.className = condition ? 'passed' : 'failed';
      item.textContent = `${condition ? 'PASS' : 'FAIL'} — ${id}: ${detail}`;
      document.getElementById('results').appendChild(item);
      if (!condition) throw new Error(`${id}: ${detail}`);
    };
    const tick = () => new Promise(resolve => setTimeout(resolve, 0));
    const clone = value => JSON.parse(JSON.stringify(value));
    let locks = [];

    const productionRoot = document.getElementById('production');
    const toolbarRoot = document.getElementById('toolbar');
    const gridRoot = document.getElementById('grid');
    const inspectorRoot = document.getElementById('inspector');
    const resizeRoot = document.getElementById('resize');

    const production = new window.KaysenderIslandV3Panels.IslandProductionController({
      editorId: 'floating-island-editor',
      root: productionRoot,
      profile: clone(sourceFixture),
      getLocks: () => locks,
      onDiagnostics: items => diagnostics.push(...clone(items || []))
    });

    const surface = new window.KaysenderIslandSurfaceGridController.IslandSurfaceGridController({
      editorId: 'floating-island-editor',
      gridRoot,
      toolbarRoot,
      inspectorRoot,
      resizeRoot,
      profile: clone(sourceFixture),
      getLocks: () => locks,
      onDiagnostics: items => diagnostics.push(...clone(items || [])),
      onProfileChange: payload => {
        const next = production.getProfile();
        next.map = clone(payload.map);
        production.replaceProfile(next);
      }
    });

    record('controllers-mounted', Boolean(productionRoot.querySelector('.island-production-panel')) && Boolean(gridRoot.querySelector('.kaysender-surface-cell')), 'Structured production panels and the reusable surface grid mounted in the same browser document.');
    record('prepared-runtime-unregistered', !window.KaysenderEditorAdapters && !window.KaysenderMainlineEditorProduction, 'The test harness loaded prepared components without registering or activating the production adapter.');

    const identityForm = productionRoot.querySelector('[data-panel-id="identity"] form');
    const nameInput = identityForm.elements.namedItem('name');
    const useInput = identityForm.elements.namedItem('classification.currentUse');
    nameInput.value = '<img src=x onerror="window.__p1Injected=true">';
    useInput.value = 'structured browser verification';
    identityForm.requestSubmit();
    await tick();
    production.flush();
    const afterScalar = production.getProfile();
    record('atomic-scalar-edit', afterScalar.classification.currentUse === 'structured browser verification' && window.__p1DirtyTransitions.length === 1, 'One structured scalar submission changed multiple values through one dirty transition.');
    record('safe-text-rendering', afterScalar.name.startsWith('<img') && !productionRoot.querySelector('img') && window.__p1Injected === false, 'Imported-looking markup remained literal text and never became an element or event handler.');

    const waterPanel = productionRoot.querySelector('[data-panel-id="waterSources"]');
    const waterCountBefore = production.model.listRecords('waterSources').length;
    waterPanel.querySelector('.island-production-add-record').click();
    await tick();
    const addedWater = production.model.listRecords('waterSources').find(item => !sourceFixture.hydrology.sources.some(source => source.id === item.id));
    record('stable-record-add', Boolean(addedWater) && addedWater.id === 'water-water-source', 'The Water Sources panel created a deterministic stable ID.');

    const addedCard = productionRoot.querySelector(`[data-panel-id="waterSources"] [data-record-id="${addedWater.id}"]`);
    const addedForm = addedCard.querySelector('form');
    addedForm.elements.namedItem('mapCellId').value = 'cell-western-port';
    addedForm.elements.namedItem('type').value = 'verification spring';
    addedForm.elements.namedItem('averageDailyLiters').value = '250';
    addedForm.elements.namedItem('status').value = 'active';
    addedForm.requestSubmit();
    await tick();
    const editedWater = production.model.listRecords('waterSources').find(item => item.id === addedWater.id);
    record('stable-record-update', editedWater.id === addedWater.id && editedWater.mapCellId === 'cell-western-port' && editedWater.averageDailyLiters === 250, 'Record editing preserved identity while normalizing typed values.');

    const editedCard = productionRoot.querySelector(`[data-panel-id="waterSources"] [data-record-id="${addedWater.id}"]`);
    [...editedCard.querySelectorAll('button')].find(button => button.textContent === 'Remove Record').click();
    await tick();
    record('unreferenced-record-remove', production.model.listRecords('waterSources').length === waterCountBefore, 'An unreferenced test record was removed through the rendered collection panel.');

    const dirtyBeforeBlockedRemove = window.__p1DirtyTransitions.length;
    const resourceCard = productionRoot.querySelector('[data-panel-id="resourceNodes"] [data-record-id="resource-central-iron"]');
    [...resourceCard.querySelectorAll('button')].find(button => button.textContent === 'Remove Record').click();
    await tick();
    record('referenced-record-protection', production.model.listRecords('resourceNodes').some(item => item.id === 'resource-central-iron') && diagnostics.some(item => item.code === 'island-record-still-referenced') && window.__p1DirtyTransitions.length === dirtyBeforeBlockedRemove, 'A referenced resource remained intact and produced actionable reference diagnostics without dirtying the profile.');

    locks = ['classification.currentUse'];
    production.replaceProfile(production.getProfile());
    await tick();
    const lockedIdentity = productionRoot.querySelector('[data-panel-id="identity"] form');
    record('precise-field-lock', lockedIdentity.elements.namedItem('classification.currentUse').disabled && !lockedIdentity.elements.namedItem('name').disabled, 'A child field lock disabled only its own control.');
    locks = [];
    production.replaceProfile(production.getProfile());
    await tick();

    const dirtyBeforeSurface = window.__p1DirtyTransitions.length;
    toolbarRoot.querySelector('[data-brush-id="terrain-forest"]').click();
    gridRoot.querySelector('[data-surface-x="0"][data-surface-y="0"]').click();
    await tick();
    const surfaceCell = surface.getMap().cells.find(cell => cell.x === 0 && cell.y === 0);
    const productionCell = production.getProfile().map.cells.find(cell => cell.id === surfaceCell.id);
    record('deliberate-surface-edit', surfaceCell.terrainType === 'forest' && productionCell.terrainType === 'forest' && window.__p1DirtyTransitions.length === dirtyBeforeSurface + 1, 'A real toolbar and cell click changed terrain and synchronized the map with one shared dirty transition.');

    const dirtyBeforePreview = window.__p1DirtyTransitions.length;
    const destructivePlan = surface.previewResize(1, 1, { preserve: true });
    const refusedResize = surface.applyResizePlan(destructivePlan);
    record('destructive-resize-preview', destructivePlan.requiresConfirmation && refusedResize.reason === 'confirmation-required' && surface.getMap().columns === 2 && window.__p1DirtyTransitions.length === dirtyBeforePreview, 'Destructive resize preview required explicit confirmation without mutating or dirtying the map.');

    const dirtyBeforeExpansion = window.__p1DirtyTransitions.length;
    const expansion = surface.resize(3, 3, { preserve: true, confirmed: true });
    await tick();
    record('non-destructive-expansion', expansion.applied === true && surface.getMap().columns === 3 && surface.getMap().rows === 3 && production.getProfile().map.columns === 3 && window.__p1DirtyTransitions.length === dirtyBeforeExpansion + 1, 'Non-destructive expansion preserved existing cells and synchronized the larger map.');

    const canonical = production.buildCanonical({
      domain: window.KaysenderIslandV3Domain,
      transformers: window.KaysenderIslandV3Transformers
    });
    const schemaErrors = window.KaysenderIslandV3Schema.validate(canonical).filter(item => item.severity === 'error');
    const domainErrors = window.KaysenderIslandV3Domain.validate(canonical).filter(item => item.severity === 'error');
    record('canonical-validation', schemaErrors.length === 0 && domainErrors.length === 0, 'The browser-edited profile passed the closed schema and semantic domain validators.');

    const consumerKeys = Object.keys(canonical.outputs.downstreamExports || {}).sort();
    record('downstream-consumers', ['ecology', 'population', 'route', 'settlement'].every(key => consumerKeys.includes(key)), 'Canonical browser output included the required standard downstream consumer payloads.');

    const roundTrip = JSON.parse(JSON.stringify(canonical));
    record('lossless-round-trip', roundTrip.name === canonical.name && roundTrip.map.columns === 3 && roundTrip.map.cells.some(cell => cell.terrainType === 'forest') && roundTrip.resources.nodes.some(item => item.id === 'resource-central-iron'), 'Canonical JSON round-trip retained deliberate fields, map edits, and stable record IDs.');

    const receipt = {
      schemaVersion: '1.0.0',
      stage: 'P1',
      stageId: 'floating-island-production-editor',
      result: 'passed',
      completedAt: new Date().toISOString(),
      checks,
      dirtyTransitions: clone(window.__p1DirtyTransitions),
      diagnostics,
      canonicalSummary: {
        profileType: canonical.profileType,
        schemaVersion: canonical.schemaVersion,
        mapDimensions: `${canonical.map.columns}x${canonical.map.rows}`,
        mapCellCount: canonical.map.cells.length,
        downstreamConsumers: consumerKeys
      }
    };

    surface.destroy();
    production.destroy();
    return receipt;
  }, fixture);

  if (pageErrors.length) throw new Error(`Uncaught page errors: ${pageErrors.join(' | ')}`);
  if (consoleErrors.length) throw new Error(`Browser console errors: ${consoleErrors.join(' | ')}`);
  if (!receipt || receipt.result !== 'passed' || receipt.checks.some(check => check.status !== 'passed')) {
    throw new Error('P1 Island browser harness completed without a fully passing receipt.');
  }

  await fs.writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log('P1 Island browser verification passed in Chromium.');
  console.log(`Receipt written to ${path.relative(root, outputPath)}.`);
} catch (error) {
  const failure = {
    schemaVersion: '1.0.0',
    stage: 'P1',
    stageId: 'floating-island-production-editor',
    result: 'failed',
    failedAt: new Date().toISOString(),
    message: error.message,
    url: page?.url() || '',
    checks: page ? await page.locator('#results li').allTextContents().catch(() => []) : [],
    pageErrors,
    consoleErrors
  };
  await fs.writeFile(failurePath, `${JSON.stringify(failure, null, 2)}\n`, 'utf8').catch(() => undefined);
  if (page) await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  console.error(`P1 Island browser verification failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await close(server);
}
