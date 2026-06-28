import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const root = process.cwd();
const outputPath = path.resolve(root, process.argv[2] || 'artifacts/shadowrun-binary-cube-browser-verification.json');
const failureScreenshotPath = path.resolve(root, process.argv[3] || 'artifacts/shadowrun-binary-cube-browser-verification-failure.png');
const host = '127.0.0.1';
const port = 4176;
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
  receiptType: 'shadowrunBinaryCubeBrowserVerification',
  schemaVersion: '0.2.0',
  authenticatedEnvelopeSchemaVersion: '0.1.0',
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
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  assert(await page.locator('script[src="shadowrun-binary-cube-engine.js"]').count() === 0, 'Binary Cube engine loaded before the Shadowrun tool was opened.');
  assert(await page.locator('script[src="shadowrun-binary-cube-auth.js"]').count() === 0, 'Authenticated-envelope engine loaded before the Shadowrun tool was opened.');
  checks.push('binary-cube-components-are-lazy-before-workspace-use');

  await page.locator('[data-view="shadowrun"]').first().click();
  await page.waitForSelector('#shadowrun.active');
  await page.waitForSelector('[data-shadowrun-module="shadowrun-binary-cube-encryption"]');
  const moduleCountText = await page.locator('#shadowrun-count').textContent();
  const moduleMatch = String(moduleCountText || '').match(/(\d+) of (\d+)/);
  assert(moduleMatch && Number(moduleMatch[1]) === Number(moduleMatch[2]) && Number(moduleMatch[2]) >= 19, `Shadowrun module count was unexpected: ${moduleCountText || 'missing'}.`);
  checks.push('shadowrun-workspace-loads-with-binary-cube-module');

  assert(await page.locator('script[src="shadowrun-binary-cube-engine.js"]').count() === 0, 'Binary Cube engine loaded before the laboratory launcher was used.');
  await page.locator('[data-shadowrun-open="shadowrun-binary-cube-encryption"]').click();
  await page.waitForSelector('#shadowrun-binary-cube-lab:not([hidden])');
  await page.waitForSelector('#cube-auth-envelope-section');
  await page.waitForFunction(() => Boolean(
    window.ShadowrunBinaryCubeEngine
    && window.ShadowrunBinaryCubeAuth
    && window.ShadowrunBinaryCubeEncryption
    && window.ShadowrunBinaryCubeAuthUI
  ));
  checks.push('engine-interface-and-authentication-load-on-demand');

  const scriptCounts = {
    engine: await page.locator('script[src="shadowrun-binary-cube-engine.js"]').count(),
    auth: await page.locator('script[src="shadowrun-binary-cube-auth.js"]').count(),
    interface: await page.locator('script[src="shadowrun-binary-cube-encryption.js"]').count(),
    authInterface: await page.locator('script[src="shadowrun-binary-cube-auth-ui.js"]').count()
  };
  assert(Object.values(scriptCounts).every(count => count === 1), `Expected exactly one of each Binary Cube script: ${JSON.stringify(scriptCounts)}.`);
  checks.push('single-script-instance-per-component');

  const plaintext = '010010000110100100101101001011011';
  await page.locator('#cube-input').fill(plaintext);
  await page.locator('#cube-size').selectOption('4');
  await page.locator('#cube-seed').fill('browser-verification-seed');
  await page.locator('#cube-input-face').selectOption('top');
  await page.locator('#cube-output-face').selectOption('front');
  await page.locator('#cube-input-turns').selectOption('3');
  await page.locator('#cube-output-turns').selectOption('1');
  await page.locator('#cube-mask-density').selectOption('0.75');
  await page.locator('[data-cube-generate]').click();

  const generatedKey = JSON.parse(await page.locator('#cube-key').inputValue());
  assert(generatedKey.schemaVersion === '0.2.0', 'Generated key did not use schema 0.2.0.');
  assert(generatedKey.mask.filter(Boolean).length === 12, 'A 75% mask on a 4x4 face did not contain 12 payload cells.');
  checks.push('deterministic-key-generation-and-mask');

  await page.locator('[data-cube-encrypt]').click();
  const encryptedPackage = JSON.parse(await page.locator('#cube-package').inputValue());
  assert(encryptedPackage.originalBitLength === plaintext.length, 'Encrypted package did not preserve the original bit length.');
  assert(encryptedPackage.blockCount === 3, `Expected three blocks but received ${encryptedPackage.blockCount}.`);
  assert(encryptedPackage.ciphertext.length === 48, 'Three 4x4 blocks did not produce 48 ciphertext bits.');
  assert(encryptedPackage.checksumType === 'fnv1a32-corruption-detection-only', 'Encrypted package did not declare the expected checksum type.');
  checks.push('multi-block-encryption-and-framing');

  const diagnosticText = await page.locator('#cube-diagnostics').textContent();
  assert(diagnosticText?.includes('collision-free points'), 'Diagnostics did not report a collision-free point field.');
  assert(await page.locator('#cube-preview-row .cube-preview').count() === 6, 'The laboratory did not render all six face projections.');
  checks.push('six-face-diagnostics');

  await page.locator('[data-cube-decrypt]').click();
  const decrypted = await page.locator('#cube-decrypted').inputValue();
  assert(decrypted === plaintext, 'Browser round-trip did not recover the original binary input.');
  checks.push('browser-round-trip');

  await page.locator('[data-cube-validate]').click();
  const validStatus = await page.locator('#cube-status').textContent();
  assert(validStatus?.includes('structurally valid'), `Validate Pair did not report success: ${validStatus || 'missing'}.`);
  checks.push('validate-pair-success');

  const passphrase = 'browser verification passphrase 2049';
  await page.locator('#cube-auth-passphrase').fill(passphrase);
  await page.locator('[data-cube-auth-seal]').click();
  await page.waitForFunction(() => document.querySelector('#cube-status')?.textContent.includes('sealed in an authenticated AES-GCM envelope'));
  const authenticatedEnvelope = JSON.parse(await page.locator('#cube-auth-envelope').inputValue());
  assert(authenticatedEnvelope.schemaVersion === '0.1.0', 'Authenticated envelope did not use schema 0.1.0.');
  assert(authenticatedEnvelope.cipher?.name === 'AES-GCM', 'Authenticated envelope did not use AES-GCM.');
  assert(authenticatedEnvelope.kdf?.name === 'PBKDF2' && authenticatedEnvelope.kdf?.hash === 'SHA-256', 'Authenticated envelope did not use PBKDF2-SHA-256.');
  assert(authenticatedEnvelope.cubeKeyId === generatedKey.keyId, 'Authenticated envelope did not preserve the Binary Cube key identifier.');
  const serializedEnvelope = JSON.stringify(authenticatedEnvelope);
  assert(!serializedEnvelope.includes(passphrase), 'Authenticated envelope serialized the passphrase.');
  assert(!serializedEnvelope.includes(encryptedPackage.ciphertext), 'Authenticated envelope exposed the unwrapped Binary Cube ciphertext.');
  checks.push('aes-gcm-authenticated-envelope-sealing');

  await page.locator('#cube-package').fill('');
  await page.locator('[data-cube-auth-open]').click();
  await page.waitForFunction(() => document.querySelector('#cube-status')?.textContent.includes('Authenticated envelope opened'));
  const reopenedPackage = JSON.parse(await page.locator('#cube-package').inputValue());
  assert(JSON.stringify(reopenedPackage) === JSON.stringify(encryptedPackage), 'Authenticated envelope did not recover the exact Binary Cube package.');
  checks.push('authenticated-envelope-opening');

  await page.locator('#cube-auth-passphrase').fill('incorrect browser passphrase 2049');
  await page.locator('[data-cube-auth-open]').click();
  await page.waitForFunction(() => document.querySelector('#cube-status')?.textContent.includes('Authenticated envelope verification failed'));
  checks.push('wrong-envelope-passphrase-rejection');

  const tamperedEnvelope = structuredClone(authenticatedEnvelope);
  tamperedEnvelope.cubeKeyId = 'tampered-key-id';
  await page.locator('#cube-auth-envelope').fill(JSON.stringify(tamperedEnvelope, null, 2));
  await page.locator('#cube-auth-passphrase').fill(passphrase);
  await page.locator('[data-cube-auth-open]').click();
  await page.waitForFunction(() => document.querySelector('#cube-status')?.textContent.includes('Authenticated envelope verification failed'));
  checks.push('authenticated-envelope-metadata-tamper-rejection');

  await page.locator('#cube-auth-envelope').fill(JSON.stringify(authenticatedEnvelope, null, 2));
  await page.locator('#cube-package').fill(JSON.stringify(encryptedPackage, null, 2));
  const tampered = structuredClone(encryptedPackage);
  tampered.ciphertext = `${tampered.ciphertext[0] === '0' ? '1' : '0'}${tampered.ciphertext.slice(1)}`;
  await page.locator('#cube-package').fill(JSON.stringify(tampered, null, 2));
  await page.locator('[data-cube-validate]').click();
  const tamperStatus = await page.locator('#cube-status').textContent();
  assert(tamperStatus?.includes('checksum validation failed'), `Tampered package was not rejected: ${tamperStatus || 'missing'}.`);
  checks.push('package-corruption-detection');

  await page.locator('#cube-package').fill(JSON.stringify(encryptedPackage, null, 2));
  await page.locator('#cube-output-face').selectOption('bottom');
  await page.locator('[data-cube-generate]').click();
  const oppositeStatus = await page.locator('#cube-status').textContent();
  assert(oppositeStatus?.includes('opposite face'), `Opposite output face was not rejected: ${oppositeStatus || 'missing'}.`);
  checks.push('opposite-face-rejection');

  const transferControlCount = await page.locator('[data-cube-copy-key], [data-cube-copy-package], [data-cube-download-key], [data-cube-download-package], #cube-import-key, #cube-import-package').count();
  assert(transferControlCount === 6, `Expected six Binary Cube import, export, and copy controls but found ${transferControlCount}.`);
  const authControlCount = await page.locator('[data-cube-auth-seal], [data-cube-auth-open], [data-cube-auth-inspect], [data-cube-auth-copy], [data-cube-auth-download], #cube-auth-import, [data-cube-auth-clear]').count();
  assert(authControlCount === 7, `Expected seven authenticated-envelope controls but found ${authControlCount}.`);
  checks.push('package-key-and-envelope-transfer-controls');

  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('[data-view="shadowrun"]').first().click();
  await page.waitForSelector('#shadowrun.active');
  await page.locator('[data-shadowrun-open="shadowrun-binary-cube-encryption"]').click();
  await page.waitForSelector('#shadowrun-binary-cube-lab:not([hidden])');
  await page.waitForSelector('#cube-auth-envelope-section');
  const restoredSeed = await page.locator('#cube-seed').inputValue();
  const restoredKey = await page.locator('#cube-key').inputValue();
  const restoredEnvelope = await page.locator('#cube-auth-envelope').inputValue();
  const restoredPassphrase = await page.locator('#cube-auth-passphrase').inputValue();
  assert(restoredSeed === 'browser-verification-seed' && restoredKey.includes(generatedKey.keyId), 'Laboratory state did not survive a browser reload.');
  assert(restoredEnvelope.includes(generatedKey.keyId), 'Authenticated envelope did not survive a browser reload.');
  assert(restoredPassphrase === '', 'Authenticated-envelope passphrase was persisted across a browser reload.');
  checks.push('state-restoration-without-passphrase-storage');

  assert(browserErrors.length === 0, `Browser page errors were recorded: ${browserErrors.join(' | ')}`);
  assert(consoleErrors.length === 0, `Browser console errors were recorded: ${consoleErrors.join(' | ')}`);
  checks.push('no-browser-or-console-errors');

  result.result = 'passed';
  result.keyId = generatedKey.keyId;
  result.originalBitLength = plaintext.length;
  result.blockCount = encryptedPackage.blockCount;
  result.ciphertextBitLength = encryptedPackage.ciphertext.length;
  result.checksum = encryptedPackage.checksum;
  result.authenticatedEnvelope = {
    schemaVersion: authenticatedEnvelope.schemaVersion,
    kdf: `${authenticatedEnvelope.kdf.name}-${authenticatedEnvelope.kdf.hash}`,
    iterations: authenticatedEnvelope.kdf.iterations,
    cipher: authenticatedEnvelope.cipher.name,
    keyLength: authenticatedEnvelope.cipher.keyLength,
    tagLength: authenticatedEnvelope.cipher.tagLength
  };
  await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Shadowrun Binary Cube browser verification passed with ${checks.length} checks.`);
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
