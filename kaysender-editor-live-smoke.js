(() => {
  'use strict';

  const Kernel = window.KaysenderEditorKernel;
  const Production = () => window.KaysenderMainlineEditorProduction;
  const results = [];

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

  function saveSessionReport(report) {
    try {
      window.sessionStorage?.setItem('hb-ttrpg-tools:p0-live-smoke:last-pass', JSON.stringify(report));
      return true;
    } catch (error) {
      addResult('Session report', true, `Verification passed; browser storage declined the optional report: ${error.message}`);
      return false;
    }
  }

  async function runSmokeTest() {
    if (!Kernel || !Production()) {
      addResult('Kernel', false, 'Shared kernel or production shell is unavailable.');
      return;
    }
    const confirmed = window.confirm('Run the P0 live smoke test? This opens all three alpha editors and replaces unsaved form values with generated defaults. Save a local draft first if needed.');
    if (!confirmed) return;

    results.length = 0;
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

      const report = {
        testedAt: new Date().toISOString(),
        browser: navigator.userAgent,
        result: 'passed',
        profiles: [islandEnvelope, settlementEnvelope, airshipEnvelope].map(envelope => ({
          profileId: envelope.profileId,
          profileType: envelope.profileType,
          revision: envelope.revision,
          inheritance: envelope.inheritance
        }))
      };
      saveSessionReport(report);
      addResult('P0 live smoke', true, 'All three editors opened through the shared shell and completed the inherited profile chain.');
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
      <p>Runs the real browser path through Floating Island, Settlement, and Airship, including canonical parent imports and inheritance IDs. It does not promote P1 automatically.</p>
      <button id="p0-live-smoke-run" class="secondary-action" type="button">Run P0 Live Smoke Test</button>
      <ul id="p0-live-smoke-results"><li>No live smoke test has run in this browser session.</li></ul>`;
    status.insertAdjacentElement('afterend', card);
    card.querySelector('#p0-live-smoke-run').addEventListener('click', runSmokeTest);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  window.runKaysenderEditorSmokeTest = runSmokeTest;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
