(() => {
  'use strict';

  const Kernel = window.KaysenderEditorKernel;
  const Production = () => window.KaysenderMainlineEditorProduction;
  const RECEIPT_SCHEMA_VERSION = '1.0.0';
  const RECEIPT_STAGE = 'P0';
  const RECEIPT_STAGE_ID = 'shared-editor-kernel';
  const RECEIPT_STORAGE_KEY = 'hb-ttrpg-tools:p0-live-smoke:last-pass';
  const EDITOR_CHAIN = [
    'floating-island-editor',
    'settlement-editor',
    'airship-editor'
  ];
  const results = [];
  let lastReport = null;

  function wait(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }

  async function waitFor(selector, timeoutMs = 6000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const element = document.querySelector(selector);
      if (element) return element;
      await wait(50);
    }
    throw new Error(`Timed out waiting for ${selector}.`);
  }

  function readFullProfile(outputId) {
    const output = document.getElementById(outputId);
    const textareas = output ? Array.from(output.querySelectorAll('textarea.json-export')) : [];
    const textarea = textareas.at(-1);
    if (!textarea?.value?.trim()) throw new Error(`No full profile JSON was rendered in ${outputId}.`);
    return JSON.parse(textarea.value);
  }

  function addResult(stage, ok, message) {
    results.push({ stage, ok, message });
    renderResults();
  }

  function renderResults() {
    const target = document.getElementById('p0-live-smoke-results');
    if (!target) return;
    if (!results.length) {
      target.innerHTML = '<li>No live smoke test has run in this browser session.</li>';
      return;
    }
    target.innerHTML = results.map(result => `
      <li class="${result.ok ? 'editor-diagnostic-info' : 'editor-diagnostic-error'}">
        <strong>${escapeHtml(result.stage)}</strong>: ${escapeHtml(result.message)}
      </li>`).join('');
  }

  function renderReceipt() {
    const textarea = document.getElementById('p0-live-smoke-receipt');
    const copyButton = document.getElementById('p0-live-smoke-copy');
    const downloadButton = document.getElementById('p0-live-smoke-download');
    const hasReport = Boolean(lastReport);
    if (textarea) textarea.value = hasReport ? JSON.stringify(lastReport, null, 2) : '';
    if (copyButton) copyButton.disabled = !hasReport;
    if (downloadButton) downloadButton.disabled = !hasReport;
  }

  async function buildAndRead(panelId, buildButtonId, outputId) {
    const panel = await waitFor(`#${panelId}`);
    const buildButton = panel.querySelector(`#${buildButtonId}`);
    if (!buildButton) throw new Error(`Missing build action ${buildButtonId}.`);
    buildButton.click();
    await wait(100);
    return readFullProfile(outputId);
  }

  async function importParent(panel, textareaId, buttonId, envelope, datasetEnvelopeKey) {
    const textarea = panel.querySelector(`#${textareaId}`);
    const button = panel.querySelector(`#${buttonId}`);
    if (!textarea || !button) throw new Error(`Missing parent import controls ${textareaId}/${buttonId}.`);
    textarea.value = JSON.stringify(envelope, null, 2);
    button.click();
    await wait(120);
    if (!panel.dataset[datasetEnvelopeKey]) throw new Error(`Canonical parent provenance was not stored in ${datasetEnvelopeKey}.`);
  }

  function profileReceipt(editorId, envelope) {
    return {
      editorId,
      profileId: envelope.profileId,
      profileType: envelope.profileType,
      revision: envelope.revision,
      inheritance: envelope.inheritance
    };
  }

  function createReceipt(profiles) {
    return {
      schemaVersion: RECEIPT_SCHEMA_VERSION,
      stage: RECEIPT_STAGE,
      stageId: RECEIPT_STAGE_ID,
      testedAt: new Date().toISOString(),
      browser: navigator.userAgent,
      result: 'passed',
      editorChain: [...EDITOR_CHAIN],
      stageResults: results.map(result => ({ ...result })),
      profiles
    };
  }

  function isReceipt(value) {
    return Boolean(
      value &&
      value.schemaVersion === RECEIPT_SCHEMA_VERSION &&
      value.stage === RECEIPT_STAGE &&
      value.stageId === RECEIPT_STAGE_ID &&
      value.result === 'passed' &&
      Array.isArray(value.editorChain) &&
      value.editorChain.join('|') === EDITOR_CHAIN.join('|') &&
      Array.isArray(value.stageResults) &&
      value.stageResults.length >= 4 &&
      value.stageResults.every(item => item?.ok === true) &&
      Array.isArray(value.profiles) &&
      value.profiles.length === 3
    );
  }

  function saveSessionReport(report) {
    lastReport = report;
    renderReceipt();
    try {
      window.sessionStorage?.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(report));
      return true;
    } catch (error) {
      addResult('Session report', true, `Verification passed; browser storage declined the optional report: ${error.message}`);
      return false;
    }
  }

  function restoreSessionReport() {
    try {
      const stored = window.sessionStorage?.getItem(RECEIPT_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (isReceipt(parsed)) lastReport = parsed;
    } catch {
      lastReport = null;
    }
  }

  function clearSessionReport() {
    lastReport = null;
    renderReceipt();
    try {
      window.sessionStorage?.removeItem(RECEIPT_STORAGE_KEY);
    } catch {
      // Browser storage is optional; a fresh receipt will still render in the page.
    }
  }

  async function copyReceipt() {
    if (!lastReport) return;
    const text = JSON.stringify(lastReport, null, 2);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const temporary = document.createElement('textarea');
        temporary.value = text;
        temporary.setAttribute('readonly', '');
        temporary.style.position = 'fixed';
        temporary.style.opacity = '0';
        document.body.appendChild(temporary);
        temporary.select();
        if (!document.execCommand('copy')) throw new Error('Browser copy command was rejected.');
        temporary.remove();
      }
      addResult('Receipt', true, 'Verification receipt copied to the clipboard.');
    } catch (error) {
      addResult('Receipt', false, `Could not copy the verification receipt: ${error.message}`);
    }
  }

  function downloadReceipt() {
    if (!lastReport) return;
    const blob = new Blob([JSON.stringify(lastReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kaysender-${RECEIPT_STAGE.toLowerCase()}-browser-verification-${lastReport.testedAt.replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    addResult('Receipt', true, 'Verification receipt downloaded.');
  }

  async function runSmokeTest() {
    if (!Kernel || !Production()) {
      addResult('Kernel', false, 'Shared kernel or production shell is unavailable.');
      return;
    }
    const confirmed = window.confirm('Run the P0 live smoke test? This opens all three alpha editors and replaces unsaved form values with generated defaults. Save a local draft first if needed.');
    if (!confirmed) return;

    results.length = 0;
    clearSessionReport();
    addResult('Start', true, 'Beginning Island → Settlement → Airship browser-path smoke test.');
    const button = document.getElementById('p0-live-smoke-run');
    if (button) button.disabled = true;

    try {
      await Production().launchIsland();
      const islandRaw = await buildAndRead('kaysender-editor-panel', 'island-build-profile', 'floating-island-editor-output');
      const islandEnvelope = Kernel.createEnvelope(islandRaw, {
        editorId: 'floating-island-editor',
        moduleId: 'floating-island-generator'
      });
      const islandDiagnostics = Kernel.validateEnvelope(islandEnvelope, ['floating-island-foundation-profile']);
      if (islandDiagnostics.some(item => item.severity === 'error')) throw new Error(islandDiagnostics.map(item => item.message).join('; '));
      addResult('Island', true, `Built ${islandEnvelope.name} as ${islandEnvelope.profileId}.`);

      await Production().launchSettlement();
      const settlementPanel = await waitFor('#kaysender-settlement-editor-panel');
      await importParent(settlementPanel, 'settlement-island-import', 'settlement-load-island', islandEnvelope, 'sourceIslandEnvelope');
      const settlementRaw = await buildAndRead('kaysender-settlement-editor-panel', 'settlement-build-profile', 'settlement-editor-output');
      const settlementEnvelope = Kernel.createEnvelope(settlementRaw, {
        editorId: 'settlement-editor',
        moduleId: 'settlement-generator',
        inheritance: [Kernel.inheritanceReference(islandEnvelope, 'parent-island')]
      });
      const settlementDiagnostics = Kernel.validateEnvelope(settlementEnvelope, ['settlement-profile']);
      if (settlementDiagnostics.some(item => item.severity === 'error')) throw new Error(settlementDiagnostics.map(item => item.message).join('; '));
      if (!settlementEnvelope.inheritance.some(item => item.profileId === islandEnvelope.profileId)) throw new Error('Settlement inheritance ledger did not retain the island profile ID.');
      addResult('Settlement', true, `Built ${settlementEnvelope.name} with island inheritance.`);

      await Production().launchAirship();
      const airshipPanel = await waitFor('#kaysender-airship-editor-panel');
      await importParent(airshipPanel, 'airship-island-import', 'airship-load-island', islandEnvelope, 'sourceIslandEnvelope');
      await importParent(airshipPanel, 'airship-settlement-import', 'airship-load-settlement', settlementEnvelope, 'sourceSettlementEnvelope');
      const airshipRaw = await buildAndRead('kaysender-airship-editor-panel', 'airship-build-profile', 'airship-editor-output');
      const airshipEnvelope = Kernel.createEnvelope(airshipRaw, {
        editorId: 'airship-editor',
        moduleId: 'airship-vessel-generator',
        inheritance: [
          Kernel.inheritanceReference(islandEnvelope, 'parent-island'),
          Kernel.inheritanceReference(settlementEnvelope, 'parent-settlement')
        ]
      });
      const airshipDiagnostics = Kernel.validateEnvelope(airshipEnvelope, ['airship-profile']);
      if (airshipDiagnostics.some(item => item.severity === 'error')) throw new Error(airshipDiagnostics.map(item => item.message).join('; '));
      if (airshipEnvelope.inheritance.length !== 2) throw new Error('Airship inheritance ledger did not retain both parent profiles.');
      addResult('Airship', true, `Built ${airshipEnvelope.name} with island and settlement inheritance.`);

      addResult('P0 live smoke', true, 'All three editors opened through the shared shell and completed the inherited profile chain.');
      const report = createReceipt([
        profileReceipt('floating-island-editor', islandEnvelope),
        profileReceipt('settlement-editor', settlementEnvelope),
        profileReceipt('airship-editor', airshipEnvelope)
      ]);
      saveSessionReport(report);
    } catch (error) {
      addResult('P0 live smoke', false, error.message);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function install() {
    const status = document.getElementById('kaysender-status');
    if (!status || document.getElementById('p0-live-smoke-card')) return;
    const card = document.createElement('article');
    card.id = 'p0-live-smoke-card';
    card.className = 'editor-card no-print';
    card.innerHTML = `
      <h3>P0 Shared Editor Live Smoke</h3>
      <p>Runs the real browser path through Floating Island, Settlement, and Airship, including canonical parent imports and inheritance IDs. A successful run produces a schema-versioned verification receipt but does not promote P1 automatically.</p>
      <div class="editor-action-row">
        <button id="p0-live-smoke-run" class="secondary-action" type="button">Run P0 Live Smoke Test</button>
        <button id="p0-live-smoke-copy" class="secondary-action" type="button" disabled>Copy Verification Receipt</button>
        <button id="p0-live-smoke-download" class="secondary-action" type="button" disabled>Download Verification Receipt</button>
      </div>
      <ul id="p0-live-smoke-results"><li>No live smoke test has run in this browser session.</li></ul>
      <label for="p0-live-smoke-receipt">Last successful verification receipt</label>
      <textarea id="p0-live-smoke-receipt" class="json-export" rows="12" readonly aria-describedby="p0-live-smoke-receipt-help"></textarea>
      <p id="p0-live-smoke-receipt-help" class="field-help">The receipt records the browser, editor chain, stage results, stable profile IDs, revisions, and inheritance references needed to verify the P0 exit gate.</p>`;
    status.insertAdjacentElement('afterend', card);
    card.querySelector('#p0-live-smoke-run').addEventListener('click', runSmokeTest);
    card.querySelector('#p0-live-smoke-copy').addEventListener('click', copyReceipt);
    card.querySelector('#p0-live-smoke-download').addEventListener('click', downloadReceipt);
    restoreSessionReport();
    renderReceipt();
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  window.runKaysenderEditorSmokeTest = runSmokeTest;
  window.getKaysenderEditorSmokeReceipt = () => lastReport ? JSON.parse(JSON.stringify(lastReport)) : null;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
