// Browser regression checks for the blank, reusable Work Shift Guide.
// Synthetic fixtures stay in temporary browser storage; no user data is needed.
// Run after scripts/build-work-shift-guide.py. Requires Playwright and Chromium.
// --static-only checks release/template contracts when no browser is available.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDirectory = path.join(root, "software/work-shift-guide");
const output = process.env.WORK_SHIFT_GUIDE_TEST_OUTPUT
  ? path.resolve(process.env.WORK_SHIFT_GUIDE_TEST_OUTPUT)
  : fs.mkdtempSync(path.join(os.tmpdir(), "hb-work-shift-validation-"));
fs.mkdirSync(output, { recursive: true });
const databaseName = "WorkShiftGuideBlank-v1";
const legacyMarker = "LEGACY_PRIVATE_SHIFT_SENTINEL_4d77";
const xss = '<img src=x onerror="window.__shiftXss=1">';
const fixture = {
  format: "work-shift-guide.position",
  schemaVersion: 1,
  position: {
    jobTitle: "Archive Coordinator",
    department: "Fixture Collections",
    guideName: "Fixture Position Guide",
    site: "Test Workspace",
    timeZone: "Etc/UTC",
    siteRequirements: "Fixture access rule\nConfirm the intake checklist",
    shelterPlan: "Fixture protective-action note"
  },
  route: [
    { id: "fixture-intake", name: "Fixture intake", summary: ["Register fixture item", xss], details: ["Fixture route guidance"] },
    { id: "fixture-review", name: "Fixture review", summary: ["Verify fixture metadata"], details: [] }
  ],
  references: [{ title: "Fixture reference", body: `Treat entered markup as text: ${xss}`, source: "https://example.org/fixture-reference" }],
  knowledgeCheck: [{ question: "Which entry is the fixture item?", options: ["Fixture item", "Other item"], answer: 0, explanation: "Fixture explanation" }],
  intakeNotes: "Fixture intake notes for the new position"
};
const results = [];
const pageErrors = [];
const dialogs = [];
const diagnostics = [];
let browser, context, page;

async function check(name, operation) {
  try {
    await operation();
    results.push({ name, status: "pass" });
    console.log(`PASS: ${name}`);
  } catch (error) {
    results.push({ name, status: "fail", error: error.message });
    throw error;
  }
}
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain", ".md": "text/plain" };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  if (pathname === "/__validation_blank.html") {
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end("<!doctype html><title>Validation origin</title>");
    return;
  }
  const location = path.resolve(root, `.${pathname.endsWith("/") ? pathname + "index.html" : pathname}`);
  if (!location.startsWith(root + path.sep) || !fs.existsSync(location) || !fs.statSync(location).isFile()) {
    response.writeHead(404); response.end("Not found"); return;
  }
  response.writeHead(200, { "Content-Type": mime[path.extname(location)] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(location).pipe(response);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const appUrl = `${origin}/software/work-shift-guide/`;

function watchPage(target) {
  target.on("pageerror", error => pageErrors.push(error.message));
  target.on("dialog", async dialog => {
    dialogs.push({ type: dialog.type(), message: dialog.message() });
    await dialog.accept();
  });
}
async function ready(target = page) {
  await target.waitForFunction(() => document.documentElement.dataset.ready === "true", null, { timeout: 15000 });
}
async function database(target = page, name = databaseName) {
  return target.evaluate(async name => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const data = {};
    for (const store of [...db.objectStoreNames]) {
      data[store] = await new Promise((resolve, reject) => {
        const request = db.transaction(store, "readonly").objectStore(store).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    db.close();
    return data;
  }, name);
}
async function waitForRouteLength(length) {
  await page.waitForFunction(length => document.querySelectorAll("#routeList .route-card").length === length, length);
}
async function closeIfOpen(id) {
  if (await page.locator(id).isVisible()) await page.locator(id).click();
}
async function openPosition() {
  if (!(await page.locator("#positionDialog").isVisible())) await page.locator("#positionSetupBtn").click();
  await page.locator("#positionDialog").waitFor({ state: "visible" });
}
async function reveal(selector) {
  await page.locator(selector).evaluate(element => {
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) if (ancestor.tagName === "DETAILS") ancestor.open = true;
  });
}
async function downloaded(operation, filename) {
  const pending = page.waitForEvent("download");
  await operation();
  const download = await pending;
  const file = path.join(output, filename || download.suggestedFilename());
  await download.saveAs(file);
  return { file, filename: download.suggestedFilename(), text: fs.readFileSync(file, "utf8") };
}
function assertBlankPosition(value) {
  assert.equal(value.format, "work-shift-guide.position");
  assert.equal(value.schemaVersion, 1);
  for (const field of ["jobTitle", "department", "guideName", "site", "timeZone", "siteRequirements", "shelterPlan"]) {
    assert.equal(value.position[field], "", `Blank template ${field}`);
  }
  for (const field of ["route", "references", "knowledgeCheck"]) assert.deepEqual(value[field], [], `Blank template ${field}`);
  assert.equal(value.intakeNotes, "");
}
async function recordViewportDiagnostic(target, label) {
  const sizes = await target.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    overflowing: [...document.querySelectorAll("body *")].filter(element => {
      const box = element.getBoundingClientRect();
      return box.width && box.right > document.documentElement.clientWidth + 1 && getComputedStyle(element).position !== "fixed";
    }).slice(0, 8).map(element => element.id || element.tagName.toLowerCase())
  }));
  const horizontalOverflow = sizes.document > sizes.viewport + 1 || sizes.body > sizes.viewport + 1;
  diagnostics.push({ label, ...sizes, horizontalOverflow, blocking: false });
  if (horizontalOverflow) console.warn(`WARNING (layout diagnostic only): ${label} horizontal overflow: ${JSON.stringify(sizes)}`);
}

try {
  await check("release files exist and reusable template is genuinely empty", async () => {
    for (const file of ["index.html", "app.js", "position.js", "styles.css", "manifest.webmanifest", "service-worker.js", "position-template.json", "Work-Shift-Guide-Blank.html", "Work-Shift-Guide-Blank-v1.0.0.zip"]) {
      assert.ok(fs.existsSync(path.join(appDirectory, file)), `Missing generated release file ${file}`);
    }
    assertBlankPosition(JSON.parse(fs.readFileSync(path.join(appDirectory, "position-template.json"), "utf8")));
  });
  await check("packaged archive contains only release files and no legacy or test data", async () => {
    const entries = JSON.parse(execFileSync(process.env.PYTHON || "python3", ["-c", "import json,sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as z:\n print(json.dumps([{'path':i.filename,'size':i.file_size,'text':z.read(i).decode('utf-8') if i.filename.endswith(('.html','.js','.css','.json','.webmanifest','.md','.txt','.svg')) else None} for i in z.infolist() if not i.is_dir()]))", path.join(appDirectory, "Work-Shift-Guide-Blank-v1.0.0.zip")], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }));
    const allowed = new Set(["index.html", "app.js", "position.js", "styles.css", "manifest.webmanifest", "service-worker.js", "position-template.json", "README.md", "LICENSE.txt", "Work-Shift-Guide-Blank.html", "icon-192.png", "icon-512.png", "icon.svg", "SHA256SUMS.txt"]);
    const expectedPaths = [...allowed].map(name => `work-shift-guide/${name.startsWith("icon") ? "icons/" : ""}${name}`).sort();
    assert.deepEqual(entries.map(entry => entry.path).sort(), expectedPaths, "ZIP must use the explicit release file allowlist");
    for (const entry of entries) {
      assert.ok(!entry.path.split("/").includes("..") && !entry.path.startsWith("/"), `Unsafe ZIP path ${entry.path}`);
      assert.ok(allowed.has(path.posix.basename(entry.path)), `Unexpected file in release ZIP: ${entry.path}`);
      if (entry.text !== null) assert.doesNotMatch(entry.text, /EVSShiftTracker|EVS[- ]Shift[- ]Guide|LEGACY_PRIVATE_SHIFT_SENTINEL_4d77|Fixture Operator|Fixture Collections|Fixture discrepancy|Archive Coordinator II/i, `Old or test data in ${entry.path}`);
    }
    const template = entries.find(entry => entry.path.endsWith("position-template.json"));
    assert.ok(template); assertBlankPosition(JSON.parse(template.text));
    diagnostics.push({ packageFiles: entries.map(entry => entry.path) });
  });
  if (!process.argv.includes("--static-only")) {
  await check("Chromium browser launches", async () => {
    const executablePath = process.env.CHROMIUM_PATH || ["/usr/bin/chromium", "/usr/bin/google-chrome"].find(candidate => fs.existsSync(candidate));
    browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: ["--no-sandbox"] });
    diagnostics.push({ browserExecutable: executablePath || "Playwright-managed Chromium" });
  });
  context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, serviceWorkers: "block" });
  page = await context.newPage(); watchPage(page);
  await page.goto(`${origin}/__validation_blank.html`);
  await check("legacy database is isolated from fresh blank application", async () => {
    await page.evaluate(async marker => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open("EVSShiftTracker", 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          db.createObjectStore("settings", { keyPath: "key" });
          const shifts = db.createObjectStore("shifts", { keyPath: "id" });
          shifts.createIndex("status", "status"); shifts.createIndex("startedAt", "startedAt");
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(["settings", "shifts"], "readwrite");
        transaction.objectStore("settings").put({ key: "profile", name: marker, site: marker, jobTitle: marker });
        transaction.objectStore("settings").put({ key: "route", route: [{ id: marker, name: marker, summary: [marker], details: [marker] }] });
        transaction.objectStore("shifts").put({ id: marker, status: "active", startedAt: new Date().toISOString(), issues: [], routeSnapshot: [{ name: marker, summary: [marker], details: [] }] });
        transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error);
      });
      db.close();
    }, legacyMarker);
    await page.goto(appUrl); await ready();
    assert.doesNotMatch(await page.locator("body").textContent(), new RegExp(legacyMarker));
    assert.deepEqual((await database()).shifts, []);
    const route = (await database()).settings.find(item => item.key === "route");
    assert.ok(!route || route.route.length === 0);
    assert.equal(await page.locator("#routeList .route-card").count(), 0);
    assert.equal(await page.locator("#startBtn").isDisabled(), true);
    assert.equal(await page.locator("#addIssueBtn").isDisabled(), true);
    assert.equal(await page.locator("#finishBtn").isDisabled(), true);
    assert.equal(await page.locator("#shiftStatus").textContent(), "No active shift");
  });
  await check("blank role, personal details, schedule, and history on first load", async () => {
    await openPosition();
    for (const id of ["positionJobTitle", "positionDepartment", "positionSite", "positionRequirements", "positionShelterPlan", "positionIntakeNotes"]) assert.equal(await page.locator(`#${id}`).inputValue(), "", id);
    await closeIfOpen("#closePosition");
    await page.locator("#settingsBtn").click();
    assert.equal(await page.locator("#settingsName").inputValue(), "");
    assert.equal(await page.locator("#settingsSite").inputValue(), "");
    await page.locator("#closeSettings").click();
    await page.locator("#historyBtn").click();
    await page.locator("#historyDialog").waitFor({ state: "visible" });
    assert.equal(await page.locator("#historyList .history-item").count(), 0);
    await page.locator("#closeHistory").click();
    await page.locator("#plannerBtn").click();
    await page.locator("#plannerDialog").waitFor({ state: "visible" });
    assert.equal(await page.locator("#plannerEntryCount").textContent(), "0 entries");
    for (const id of ["plannerStartHour", "plannerStartMinute", "plannerStartAmPm", "plannerEndHour", "plannerEndMinute", "plannerEndAmPm"]) assert.equal(await page.locator(`#${id}`).inputValue(), "", id);
    await page.locator("#closePlanner").click();
    await page.screenshot({ path: path.join(output, "blank-desktop.png"), fullPage: true });
  });
  await check("invalid position imports preserve stored state", async () => {
    const before = await database();
    await openPosition();
    for (const value of ["{invalid", JSON.stringify({ ...fixture, schemaVersion: 999 }), JSON.stringify({ ...fixture, route: [{ id: "bad", name: "Invalid", summary: "not an array", details: [] }] })]) {
      await page.locator("#importText").fill(value);
      await page.locator("#previewImport").click();
      assert.equal(await page.locator("#applyImport").isDisabled(), true);
      assert.deepEqual(await database(), before);
    }
  });
  await check("import preview is staged until explicit Apply", async () => {
    const before = await database();
    await page.locator("#importText").fill(JSON.stringify(fixture, null, 2));
    await page.locator("#previewImport").click();
    await page.waitForFunction(() => !document.querySelector("#applyImport").disabled);
    assert.deepEqual(await database(), before);
    assert.equal(await page.locator("#routeList .route-card").count(), 0);
    assert.equal(await page.locator("#guideTitle").textContent(), "Work Shift Guide");
    await page.screenshot({ path: path.join(output, "import-preview.png"), fullPage: true });
    await page.locator("#applyImport").click();
    await waitForRouteLength(2);
    await closeIfOpen("#closePosition");
    assert.equal(await page.locator("#guideTitle").textContent(), fixture.position.guideName);
  });
  await check("new role, route, references, and intake notes survive reload; markup is inert", async () => {
    await page.reload(); await ready();
    assert.equal(await page.locator("#guideTitle").textContent(), fixture.position.guideName);
    assert.equal(await page.locator("#routeList .route-card").count(), 2);
    assert.ok((await page.locator("#routeList").textContent()).includes(xss));
    assert.ok((await page.locator("body").textContent()).includes("Fixture reference"));
    assert.equal(await page.evaluate(() => window.__shiftXss), undefined);
    assert.equal(await page.locator('img[src="x"], [onerror]').count(), 0);
    await openPosition();
    for (const [id, value] of [["positionJobTitle", fixture.position.jobTitle], ["positionDepartment", fixture.position.department], ["positionSite", fixture.position.site], ["positionRequirements", fixture.position.siteRequirements], ["positionShelterPlan", fixture.position.shelterPlan], ["positionIntakeNotes", fixture.intakeNotes]]) assert.equal(await page.locator(`#${id}`).inputValue(), value, id);
    await page.locator("#positionJobTitle").fill("Archive Coordinator II");
    await page.locator("#savePosition").click();
    await page.waitForFunction(() => !document.querySelector("#positionDialog").open);
    await page.reload(); await ready();
    await openPosition();
    assert.equal(await page.locator("#positionJobTitle").inputValue(), "Archive Coordinator II");
    await closeIfOpen("#closePosition");
  });
  let expectedIntakeNotes = fixture.intakeNotes;
  await check("plain-text intake is reviewed before applying and persists without changing duties", async () => {
    const fileText = "Fixture role source material.\nReview these source notes before configuring new duties.";
    const pastedText = `${fileText}\nEntered markup must remain text: ${xss}`;
    await openPosition();
    const before = await database();
    await page.locator("#importFile").setInputFiles({ name: "fixture-source.txt", mimeType: "text/plain", buffer: Buffer.from(fileText) });
    await page.waitForFunction(text => document.querySelector("#importText").value === text, fileText);
    assert.equal(await page.locator("#applyImport").isDisabled(), true);
    await page.locator("#previewImport").click();
    await page.waitForFunction(() => !document.querySelector("#applyImport").disabled);
    assert.deepEqual(await database(), before);
    assert.equal(await page.locator("#positionIntakeNotes").inputValue(), expectedIntakeNotes);
    await page.locator("#importText").fill(pastedText);
    assert.equal(await page.locator("#applyImport").isDisabled(), true, "Editing a preview must require another review");
    assert.equal(await page.locator("#importFile").evaluate(input => input.files.length), 0);
    await page.locator("#previewImport").click();
    await page.waitForFunction(() => !document.querySelector("#applyImport").disabled);
    assert.deepEqual(await database(), before);
    await page.locator("#applyImport").click();
    await page.waitForFunction(() => document.querySelector("#importPreview").textContent === "Import applied and saved on this device.");
    expectedIntakeNotes = `${fixture.intakeNotes}\n\n${pastedText}`;
    assert.equal(await page.locator("#positionIntakeNotes").inputValue(), expectedIntakeNotes);
    await closeIfOpen("#closePosition");
    await page.reload(); await ready();
    assert.equal(await page.locator("#intakeNotesView").textContent(), expectedIntakeNotes);
    assert.deepEqual((await database()).settings.find(item => item.key === "route").route, fixture.route);
    assert.equal(await page.evaluate(() => window.__shiftXss), undefined);
    assert.equal(await page.locator('img[src="x"], [onerror]').count(), 0);
  });
  await check("active shift locks route changes and retains a stable snapshot across reload", async () => {
    await page.locator("#startBtn").click();
    await page.waitForFunction(() => document.querySelector("#shiftStatus").textContent === "Shift active");
    assert.equal(await page.locator("#editWorkBtn").isDisabled(), true);
    assert.equal(await page.locator("#positionSetupBtn").isDisabled(), true);
    const shift = (await database()).shifts.find(item => item.status === "active");
    assert.deepEqual(shift.routeSnapshot, fixture.route);
    assert.equal(shift.jobTitle, "Archive Coordinator II");
    await page.locator("#addIssueBtn").click();
    await page.locator("#issueArea").selectOption("Fixture intake");
    await page.locator("#issueType").selectOption("Other");
    await page.locator("#issueNote").fill("Fixture discrepancy recorded");
    await page.locator("#issueImmediateAction").fill("Fixture discrepancy set aside for review");
    await page.locator("#issueContact").check();
    await page.locator("#issueManagement").check();
    await page.locator('#issueForm button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector("#issueDialog").open);
    await page.reload(); await ready();
    assert.equal(await page.locator("#shiftStatus").textContent(), "Shift active");
    assert.ok((await page.locator("#issuesList").textContent()).includes("Fixture discrepancy recorded"));
    const resumed = (await database()).shifts.find(item => item.status === "active");
    assert.equal(resumed.id, shift.id);
    assert.deepEqual(resumed.routeSnapshot, shift.routeSnapshot);
    assert.equal(resumed.issues.length, 1);
    assert.equal(resumed.issues[0].contactNotified, true);
    assert.equal(resumed.issues[0].managementNotified, true);
    assert.equal(await page.locator("#editWorkBtn").isDisabled(), true);
  });
  let record, exportedBackup;
  await check("sign-off produces the new role's TXT, completed history, and automatic calendar entry", async () => {
    await page.locator("#finishBtn").click();
    await page.locator("#signoffName").fill("Fixture Operator");
    await page.locator("#siteName").fill("Test Workspace");
    record = await downloaded(() => page.locator("#completeShift").click(), "fixture-shift-record.txt");
    assert.match(record.filename, /Fixture-Position-Guide-.*\.txt$/);
    for (const text of ["Position: Archive Coordinator II", "Department: Fixture Collections", "Site: Test Workspace", "Completed by: Fixture Operator", "Register fixture item", "Fixture discrepancy recorded", "Fixture discrepancy set aside for review", "Contact / team notified: Yes", "Management notified: Yes"]) assert.ok(record.text.includes(text), `TXT missing ${text}`);
    assert.ok(!record.text.includes(legacyMarker));
    await page.waitForFunction(() => document.querySelector("#shiftStatus").textContent === "No active shift");
    const rows = await database();
    assert.equal(rows.shifts.filter(item => item.status === "complete").length, 1);
    assert.equal(rows.shifts.filter(item => item.status === "active").length, 0);
    await page.locator("#historyBtn").click();
    await page.locator("#historyDialog").waitFor({ state: "visible" });
    assert.equal(await page.locator("#historyList .history-item").count(), 1);
    const history = await downloaded(() => page.locator("#historyList button").click(), "fixture-history-record.txt");
    assert.equal(history.text, record.text);
    await page.locator("#closeHistory").click();
    await page.locator("#plannerBtn").click();
    await page.locator("#plannerDialog").waitFor({ state: "visible" });
    assert.equal(await page.locator("#plannerEntryCount").textContent(), "1 entry");
    const entry = (await database()).settings.find(item => item.key === "plannerEntries").entries[0];
    assert.equal(entry.status, "worked");
    assert.equal(entry.source, "live-shift");
    await page.locator("#closePlanner").click();
  });
  await check("manual calendar handles entered times, unpaid breaks, and persistent notes", async () => {
    await page.locator("#plannerBtn").click();
    await page.locator("#plannerDialog").waitFor({ state: "visible" });
    const date = await page.locator("#plannerDate").inputValue();
    await page.locator("#plannerStatus").selectOption("scheduled");
    await page.locator("#plannerStartHour").selectOption("9");
    await page.locator("#plannerStartMinute").selectOption("0");
    await page.locator("#plannerStartAmPm").selectOption("AM");
    await page.locator("#plannerEndHour").selectOption("5");
    await page.locator("#plannerEndMinute").selectOption("0");
    await page.locator("#plannerEndAmPm").selectOption("PM");
    await page.locator("#plannerBreakMinutes").fill("30");
    await page.locator("#plannerNotes").fill(`Fixture calendar note ${xss}`);
    await page.locator('#plannerEntryForm button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector("#plannerEntryCount").textContent === "2 entries");
    const manual = (await database()).settings.find(item => item.key === "plannerEntries").entries.find(item => item.source === "manual");
    assert.equal(manual.date, date); assert.equal(manual.startMinutes, 540); assert.equal(manual.endMinutes, 1020); assert.equal(manual.breakMinutes, 30);
    const scheduledHours = (await page.locator("#plannerSummary").textContent()).match(/Scheduled\s*([\d.]+)\s*h/);
    assert.ok(scheduledHours, "Scheduled-hour total is visible");
    assert.equal(Number(scheduledHours[1]), 7.5, "Eight hours less a 30-minute unpaid break");
    assert.equal(await page.evaluate(() => window.__shiftXss), undefined);
    await page.locator("#closePlanner").click();
    await page.reload(); await ready();
    await page.locator("#plannerBtn").click();
    await page.locator("#plannerDialog").waitFor({ state: "visible" });
    assert.equal(await page.locator("#plannerEntryCount").textContent(), "2 entries");
    assert.ok((await page.locator("#plannerEntryList").textContent()).includes(xss));
    await page.locator("#closePlanner").click();
  });
  await check("position export omits shift/person/calendar records and blank export resets all position content", async () => {
    await closeIfOpen("#closePosition");
    await reveal("#exportPosition");
    const exported = JSON.parse((await downloaded(() => page.locator("#exportPosition").click(), "fixture-position.json")).text);
    assert.equal(exported.format, fixture.format); assert.equal(exported.position.jobTitle, "Archive Coordinator II");
    assert.deepEqual(exported.route, fixture.route);
    assert.deepEqual(exported.references, fixture.references);
    assert.deepEqual(exported.knowledgeCheck, fixture.knowledgeCheck);
    assert.equal(exported.intakeNotes, expectedIntakeNotes);
    assert.ok(!JSON.stringify(exported).includes("Fixture Operator"));
    for (const key of ["shifts", "records", "plannerEntries", "name"]) assert.ok(!(key in exported));
    const blank = JSON.parse((await downloaded(() => page.locator("#exportBlankTemplate").click(), "blank-template.json")).text);
    assertBlankPosition(blank);
    const before = await database();
    exportedBackup = await downloaded(() => page.locator("#exportBackup").click(), "fixture-backup.json");
    const backup = JSON.parse(exportedBackup.text);
    assert.ok(JSON.stringify(backup).includes("Fixture Operator"), "Explicit backup must preserve the user's records");
    assert.deepEqual(await database(), before);
    await closeIfOpen("#closePosition");
  });
  await check("invalid backup input cannot replace saved records", async () => {
    await reveal("#restoreBackupFile");
    const before = await database();
    await page.locator("#restoreBackupFile").setInputFiles({ name: "invalid-backup.json", mimeType: "application/json", buffer: Buffer.from("{invalid") });
    await page.waitForFunction(() => document.querySelector("#backupPreview").textContent === "The backup is not valid JSON.");
    assert.equal(await page.locator("#applyBackup").isDisabled(), true);
    assert.deepEqual(await database(), before);
    const invalid = { format: "work-shift-guide.backup", schemaVersion: 1, settings: [], shifts: [{ id: "invalid", status: "broken" }] };
    await page.locator("#restoreBackupFile").setInputFiles({ name: "invalid-schema.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(invalid)) });
    await page.waitForFunction(() => document.querySelector("#backupPreview").textContent.includes("invalid shift status or date"));
    assert.equal(await page.locator("#applyBackup").isDisabled(), true);
    assert.deepEqual(await database(), before);
  });
  await check("empty route can be saved and reopened without restoring old duties; signed snapshot stays stable", async () => {
    await page.locator("#editWorkBtn").click();
    await page.locator("#resetWorkRoute").click();
    assert.equal(await page.locator("#workEditorList .work-editor-card").count(), 0);
    await page.locator("#saveWorkRoute").click();
    await page.waitForFunction(() => !document.querySelector("#workEditorDialog").open);
    await page.reload(); await ready();
    assert.equal(await page.locator("#routeList .route-card").count(), 0);
    assert.equal(await page.locator("#startBtn").isDisabled(), true);
    await page.locator("#editWorkBtn").click();
    assert.equal(await page.locator("#workEditorList .work-editor-card").count(), 0);
    await page.locator("#saveWorkRoute").click();
    await page.waitForFunction(() => !document.querySelector("#workEditorDialog").open);
    const stored = await database();
    assert.deepEqual(stored.settings.find(item => item.key === "route").route, []);
    assert.deepEqual(stored.shifts[0].routeSnapshot, fixture.route);
    assert.equal(stored.shifts[0].recordText, record.text);
  });
  await check("reviewed backup restores configuration, signed records, and calendar after reload", async () => {
    const backup = JSON.parse(exportedBackup.text);
    const before = await database();
    await reveal("#restoreBackupFile");
    await page.locator("#restoreBackupFile").setInputFiles(exportedBackup.file);
    await page.waitForFunction(() => !document.querySelector("#applyBackup").disabled);
    assert.match(await page.locator("#backupPreview").textContent(), /1 shift records · 2 planner entries/);
    assert.deepEqual(await database(), before, "Selecting a backup must not restore it before review");
    assert.equal(await page.locator("#routeList .route-card").count(), 0);
    const reloaded = page.waitForNavigation({ waitUntil: "load" });
    await page.locator("#applyBackup").click();
    await reloaded; await ready();
    assert.deepEqual(await database(), { settings: backup.settings, shifts: backup.shifts });
    assert.equal(await page.locator("#guideTitle").textContent(), fixture.position.guideName);
    assert.equal(await page.locator("#routeList .route-card").count(), 2);
    assert.equal(await page.locator("#intakeNotesView").textContent(), expectedIntakeNotes);
    assert.equal(await page.locator("#startBtn").isDisabled(), false);
    await page.locator("#historyBtn").click();
    await page.locator("#historyDialog").waitFor({ state: "visible" });
    assert.equal(await page.locator("#historyList .history-item").count(), 1);
    await page.locator("#closeHistory").click();
    await page.locator("#plannerBtn").click();
    await page.locator("#plannerDialog").waitFor({ state: "visible" });
    assert.equal(await page.locator("#plannerEntryCount").textContent(), "2 entries");
    await page.locator("#closePlanner").click();
  });
  await check("standalone file launches blank without server dependencies", async () => {
    const standaloneContext = await browser.newContext({ acceptDownloads: true, serviceWorkers: "block" });
    const standalone = await standaloneContext.newPage(); watchPage(standalone);
    await standalone.goto(pathToFileURL(path.join(appDirectory, "Work-Shift-Guide-Blank.html")).href); await ready(standalone);
    assert.equal(await standalone.locator("#guideTitle").textContent(), "Work Shift Guide");
    assert.equal(await standalone.locator("#routeList .route-card").count(), 0);
    assert.equal(await standalone.locator("#startBtn").isDisabled(), true);
    assert.deepEqual((await database(standalone)).shifts, []);
    await standalone.screenshot({ path: path.join(output, "blank-standalone.png"), fullPage: true });
    await standaloneContext.close();
  });
  await check("mobile viewport diagnostics recorded (layout is non-blocking)", async () => {
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: "block" });
    const mobile = await mobileContext.newPage(); watchPage(mobile);
    await mobile.goto(appUrl); await ready(mobile);
    await recordViewportDiagnostic(mobile, "390px blank app");
    await mobile.screenshot({ path: path.join(output, "blank-mobile.png"), fullPage: true });
    await mobile.locator("#positionSetupBtn").click();
    await mobile.locator("#positionDialog").waitFor({ state: "visible" });
    await recordViewportDiagnostic(mobile, "390px position setup");
    await mobile.screenshot({ path: path.join(output, "blank-mobile-setup.png"), fullPage: true });
    await mobileContext.close();
  });
  await check("service worker starts the blank app offline and preserves unrelated caches", async () => {
    const offlineContext = await browser.newContext({ serviceWorkers: "allow" });
    const offlinePage = await offlineContext.newPage(); watchPage(offlinePage);
    const unrelatedCache = "unrelated-hb-validation-cache";
    const unrelatedUrl = `${origin}/__validation_keep.txt`;
    const unrelatedContent = "Unrelated cache entry retained";
    try {
      await offlinePage.goto(`${origin}/__validation_blank.html`);
      await offlinePage.evaluate(async ({ name, url, content }) => {
        const cache = await caches.open(name);
        await cache.put(url, new Response(content, { headers: { "Content-Type": "text/plain" } }));
      }, { name: unrelatedCache, url: unrelatedUrl, content: unrelatedContent });
      await offlinePage.goto(appUrl); await ready(offlinePage);
      const registration = await offlinePage.evaluate(async () => {
        const registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((_, reject) => setTimeout(() => reject(new Error("Service worker did not become ready")), 15000))
        ]);
        return { scope: registration.scope, scriptURL: registration.active?.scriptURL };
      });
      assert.equal(registration.scope, appUrl);
      assert.equal(registration.scriptURL, `${appUrl}service-worker.js`);
      await offlinePage.waitForFunction(() => navigator.serviceWorker.controller?.state === "activated", null, { timeout: 15000 });
      await offlineContext.setOffline(true);
      const response = await offlinePage.reload({ waitUntil: "load" });
      await ready(offlinePage);
      assert.ok(response?.fromServiceWorker(), "Offline navigation must be served by the installed service worker");
      assert.equal(await offlinePage.evaluate(() => navigator.onLine), false);
      assert.equal(await offlinePage.locator("#guideTitle").textContent(), "Work Shift Guide");
      assert.equal(await offlinePage.locator("#routeList .route-card").count(), 0);
      assert.equal(await offlinePage.locator("#startBtn").isDisabled(), true);
      assert.deepEqual((await database(offlinePage)).shifts, []);
      const cached = await offlinePage.evaluate(async ({ name, url }) => {
        const names = await caches.keys();
        const entry = names.includes(name) ? await (await caches.open(name)).match(url) : null;
        return { names, unrelatedContent: entry ? await entry.text() : null };
      }, { name: unrelatedCache, url: unrelatedUrl });
      assert.equal(cached.unrelatedContent, unrelatedContent, "Installing or activating this app must preserve unrelated cache contents");
      diagnostics.push({ serviceWorker: registration, offlineReload: true, unrelatedCacheRetained: true, cacheNames: cached.names });
    } finally {
      await offlineContext.close();
    }
  });
  await check("browser runtime raises no uncaught errors", async () => assert.deepEqual(pageErrors, []));
  }
} catch (error) {
  if (page) {
    try { await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }); } catch {}
  }
  console.error(error.stack || error);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(output, "validation-results.json"), JSON.stringify({ mode: process.argv.includes("--static-only") ? "static-only" : "browser", results, pageErrors, dialogs, diagnostics }, null, 2) + "\n");
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
  console.log(`Validation outputs: ${output}`);
  console.log(`${results.filter(item => item.status === "pass").length} passed, ${results.filter(item => item.status === "fail").length} failed`);
}
