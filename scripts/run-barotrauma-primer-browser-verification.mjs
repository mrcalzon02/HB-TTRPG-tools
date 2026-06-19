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
const mimeTypes = new Map([['.css','text/css; charset=utf-8'],['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.json','application/json; charset=utf-8'],['.png','image/png'],['.svg','image/svg+xml']]);
function safePathname(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, baseUrl).pathname);
  const resolved = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
}
async function serveFile(request, response) {
  const filePath = safePathname(request.url || '/');
  if (!filePath) { response.writeHead(403); response.end('Forbidden'); return; }
  try {
    const stat = await fs.stat(filePath);
    const resolved = stat.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    response.writeHead(200, {'cache-control':'no-store','content-type':mimeTypes.get(path.extname(resolved).toLowerCase()) || 'application/octet-stream'});
    response.end(await fs.readFile(resolved));
  } catch (error) { response.writeHead(error?.code === 'ENOENT' ? 404 : 500); response.end(error.message); }
}
const server = http.createServer((request,response) => serveFile(request,response).catch(error => { response.writeHead(500); response.end(error.message); }));
const listen = () => new Promise((resolve,reject) => { server.once('error',reject); server.listen(port,host,resolve); });
const close = () => new Promise(resolve => server.close(resolve));
const includes = async (locator, expected, label) => { const text = (await locator.textContent()) || ''; if (!text.includes(expected)) throw new Error(`${label} did not contain ${expected}`); };
let browser; let page; const pageErrors=[]; const consoleErrors=[];
try {
  await fs.mkdir(path.dirname(outputPath),{recursive:true});
  await Promise.all([fs.rm(outputPath,{force:true}),fs.rm(screenshotPath,{force:true}),fs.rm(failurePath,{force:true})]);
  await listen();
  browser = await chromium.launch({headless:true});
  page = await (await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'})).newPage();
  page.on('pageerror',error => pageErrors.push(error.message));
  page.on('console',message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto(`${baseUrl}/index.html`,{waitUntil:'networkidle',timeout:30000});
  await page.locator('.nav-button[data-view="barotrauma"]').click();
  await page.waitForSelector('#barotrauma.view.active',{timeout:10000});
  const card = page.locator('[data-module-id="barotrauma-crewmans-primer"]');
  await card.waitFor({state:'visible',timeout:10000});
  await includes(card,'198 titled sections','Primer registry card');
  await card.getByRole('button',{name:"Open Crewman's Primer Wiki"}).click();
  const primer = page.locator('#barotrauma-primer-browser');
  await primer.waitFor({state:'visible',timeout:10000});
  await includes(primer.locator('.primer-edition'),'198 source-titled entries','Primer edition line');
  const allCount = await primer.locator('#primer-list button').count();
  if (allCount !== 198) throw new Error(`Expected 198 source entries, found ${allCount}.`);
  const search = primer.locator('#primer-search');
  await search.fill('THE CROUCHING FALLACY'); await page.waitForTimeout(50);
  if (await primer.locator('#primer-list button').count() !== 1) throw new Error('Crouching Fallacy did not resolve to one source entry.');
  await primer.locator('#primer-list button').click();
  await includes(primer.locator('#primer-entry h3'),'THE CROUCHING FALLACY','Crouching Fallacy title');
  await includes(primer.locator('#primer-entry'),'If a friendly crew member is crouching between you and the target, the line of fire remains obstructed.','Crouching Fallacy full source text');
  await search.fill('THE CHILDREN OF THE HONKMOTHER'); await page.waitForTimeout(50); await primer.locator('#primer-list button').first().click();
  await includes(primer.locator('#primer-entry h3'),'THE CHILDREN OF THE HONKMOTHER','Honkmother title');
  await includes(primer.locator('#primer-entry'),'grease paint','Honkmother source text');
  await search.fill('');
  await primer.getByRole('button',{name:'Union 208 Appendix',exact:true}).click();
  const unionCount = await primer.locator('#primer-list button').count();
  if (unionCount !== 50) throw new Error(`Expected 50 Union 208 entries, found ${unionCount}.`);
  await primer.getByRole('button',{name:'All Source Sections',exact:true}).click();
  const restoredCount = await primer.locator('#primer-list button').count();
  if (restoredCount !== 198) throw new Error(`Expected 198 restored entries, found ${restoredCount}.`);
  if (pageErrors.length) throw new Error(`Uncaught page errors: ${pageErrors.join(' | ')}`);
  const receipt = {schemaVersion:'2.1.0',workspace:'barotrauma',moduleId:'barotrauma-crewmans-primer',verifiedAt:new Date().toISOString(),result:'passed',checks:{sourceEntryCount:allCount,crouchingFallacy:'passed',honkmotherFullText:'passed',unionEntryCount:unionCount,restoredEntryCount:restoredCount,pageErrors:pageErrors.length,consoleErrors:consoleErrors.length}};
  await fs.writeFile(outputPath,`${JSON.stringify(receipt,null,2)}\n`,'utf8');
  console.log(`Barotrauma Crewman's Primer browser verification passed with ${allCount} source-title entries.`);
} catch (error) {
  if (page) { try { await page.screenshot({path:screenshotPath,fullPage:true}); } catch {} }
  await fs.writeFile(failurePath,`${JSON.stringify({schemaVersion:'2.1.0',workspace:'barotrauma',moduleId:'barotrauma-crewmans-primer',failedAt:new Date().toISOString(),result:'failed',message:error.message,url:page?.url() || '',pageErrors,consoleErrors},null,2)}\n`,'utf8').catch(()=>undefined);
  console.error(`Barotrauma Crewman's Primer browser verification failed: ${error.message}`); process.exitCode=1;
} finally { if (browser) await browser.close(); if (server.listening) await close(); }
