(() => {
  'use strict';

  const Kernel = window.KaysenderEditorKernel;
  const Repository = window.KaysenderEditorRepository;
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

  function saveAndReload(envelope, temporaryProfileIds) {
    const saveResult = Repository.save(envelope);
    if (!saveResult.ok) throw new Error(saveResult.message);
    temporaryProfileIds.push(envelope.profileId);
    const loadResult = Repository.load(envelope.profileId);
    if (!loadResult.ok) throw new Error(loadResult.message);
    return loadResult.envelope;
  }

  function requireReference(envelope, profileId, revision, label) {
    const reference = envelope.inheritance?.find(item => item.profileId === profileId);
    if (!reference) throw new Error(`${label} did not retain parent ${profileId}.`);
    if (reference.revision !== revision) throw new Error(`${label} changed parent ${profileId} from revision ${revision} to ${reference.revision}.`);
    if (reference.policy !== 'pinned-revision') throw new Error(`${label} did not retain pinned-revision inheritance for ${profileId}.`);
  }

  async function reopenActiveRecord(editorAlias, envelope) {
    await Production().launch(editorAlias);
    const imported = Production().importIntoActive(envelope);
    if (!imported) throw new Error(`Could not reopen ${envelope.profileId} in ${editorAlias}.`);
    await wait(180);
    const active = Production().getActiveEnvelope();
    if (!active) throw new Error(`No active envelope was available after reopening ${envelope.profileId}.`);
    if (active.profileId !== envelope.profileId) throw new Error(`Reopening ${envelope.profileId} changed its stable profile ID to ${active.profileId}.`);
    return active;
  }

  async function runSmokeTest() {
    if (!Kernel || !Repository || !Production()) {
      addResult('Kernel', false, 'Shared kernel, repository, or production shell is unavailable.');
      return;
    }
    const confirmed = window.confirm('Run the P0 live smoke test? This opens all three alpha editors and replaces unsaved form values with generated defaults. Save a local draft first if needed.');
    if (!confirmed) return;

    const temporaryProfileIds = [];
    results.length = 0;
    clearSessionReport();
    addResult('Start', true, 'Beginning Island → Settlement → Airship browser-path smoke test with persistent reopen checks.');
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
      const storedIsland = saveAndReload(islandEnvelope, temporaryProfileIds);
      addResult('Island', true, `Built, saved, and reloaded ${storedIsland.name} as ${storedIsland.profileId}.`);

      await Production().launchSettlement();
      const settlementPanel = await waitFor('#kaysender-settlement-editor-panel');
      await importParent(settlementPanel, 'settlement-island-import', 'settlement-load-island', storedIsland, 'sourceIslandEnvelope');
      const settlementRaw = await buildAndRead('kaysender-settlement-editor-panel', 'settlement-build-profile', 'settlement-editor-output');
      const settlementEnvelope = Kernel.createEnvelope(settlementRaw, {
        editorId: 'settlement-editor',
        moduleId: 'settlement-generator',
        inheritance: [Kernel.inheritanceReference(storedIsland, 'parent-island')]
      });
      const settlementDiagnostics = Kernel.validateEnvelope(settlementEnvelope, ['settlement-profile']);
      if (settlementDiagnostics.some(item => item.severity === 'error')) throw new Error(settlementDiagnostics.map(item => item.message).join('; '));
      requireReference(settlementEnvelope, storedIsland.profileId, storedIsland.revision, 'Settlement');
      const storedSettlement = saveAndReload(settlementEnvelope, temporaryProfileIds);
      addResult('Settlement', true, `Built, saved, and reloaded ${storedSettlement.name} with pinned island inheritance.`);

      const reopenedSettlement = await reopenActiveRecord('settlement', storedSettlement);
      requireReference(reopenedSettlement, storedIsland.profileId, storedIsland.revision, 'Reopened Settlement');
      addResult('Settlement reopen', true, `Reopened ${reopenedSettlement.profileId} without changing its pinned island identity or revision.`);

      await Production().launchAirship();
      const airshipPanel = await waitFor('#kaysender-airship-editor-panel');
      await importParent(airshipPanel, 'airship-island-import', 'airship-load-island', storedIsland, 'sourceIslandEnvelope');
      await importParent(airshipPanel, 'airship-settlement-import', 'airship-load-settlement', storedSettlement, 'sourceSettlementEnvelope');
      const airshipRaw = await buildAndRead('kaysender-airship-editor-panel', 'airship-build-profile', 'airship-editor-output');
      const airshipEnvelope = Kernel.createEnvelope(airshipRaw, {
        editorId: 'airship-editor',
        moduleId: 'airship-vessel-generator',
        inheritance: [
          Kernel.inheritanceReference(storedIsland, 'parent-island'),
          Kernel.inheritanceReference(storedSettlement, 'parent-settlement')
        ]
      });
      const airshipDiagnostics = Kernel.validateEnvelope(airshipEnvelope, ['airship-profile']);
      if (airshipDiagnostics.some(item => item.severity === 'error')) throw new Error(airshipDiagnostics.map(item => item.message).join('; '));
      requireReference(airshipEnvelope, storedIsland.profileId, storedIsland.revision, 'Airship');
      requireReference(airshipEnvelope, storedSettlement.profileId, storedSettlement.revision, 'Airship');
      const storedAirship = saveAndReload(airshipEnvelope, temporaryProfileIds);
      addResult('Airship', true, `Built, saved, and reloaded ${storedAirship.name} with both pinned parents.`);

      let reopenedAirship = await reopenActiveRecord('airship', storedAirship);
      requireReference(reopenedAirship, storedIsland.profileId, storedIsland.revision, 'Reopened Airship');
      requireReference(reopenedAirship, storedSettlement.profileId, storedSettlement.revision, 'Reopened Airship');
      addResult('Airship reopen', true, `Reopened ${reopenedAirship.profileId} without replacing either pinned parent identity.`);

      const settlementTextarea = airshipPanel.querySelector('#airship-settlement-import');
      airshipPanel.dataset.sourceSettlement = '';
      airshipPanel.dataset.sourceSettlementEnvelope = '';
      if (settlementTextarea) settlementTextarea.value = '';
      Production().rebuildActive();
      await wait(140);
      const clearedAirship = Production().getActiveEnvelope();
      if (clearedAirship.inheritance.some(item => item.profileId === storedSettlement.profileId)) {
        throw new Error('Clearing the settlement parent did not remove it from the canonical Airship inheritance ledger.');
      }
      requireReference(clearedAirship, storedIsland.profileId, storedIsland.revision, 'Airship after parent clear');
      addResult('Inheritance clear', true, 'Cleared the Settlement parent from both active context and the canonical Airship ledger.');

      await importParent(airshipPanel, 'airship-settlement-import', 'airship-load-settlement', storedSettlement, 'sourceSettlementEnvelope');
      Production().rebuildActive();
      await wait(140);
      reopenedAirship = Production().getActiveEnvelope();
      requireReference(reopenedAirship, storedIsland.profileId, storedIsland.revision, 'Airship after restore');
      requireReference(reopenedAirship, storedSettlement.profileId, storedSettlement.revision, 'Airship after restore');
      addResult('Inheritance restore', true, 'Restored the saved Settlement parent deliberately and recovered both pinned references.');

      addResult('P0 live smoke', true, 'Shared shell, persistent records, pinned reopen behavior, inheritance clearing, and parent restoration all passed.');
      const report = createReceipt([
        profileReceipt('floating-island-editor', storedIsland),
        profileReceipt('settlement-editor', reopenedSettlement),
        profileReceipt('airship-editor', reopenedAirship)
      ]);
      saveSessionReport(report);
    } catch (error) {
      addResult('P0 live smoke', false, error.message);
    } finally {
      temporaryProfileIds.forEach(profileId => Repository.remove(profileId, true));
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
      <p>Runs the real browser path through Floating Island, Settlement, and Airship, including persistent save/load, child-record reopen, pinned parent identity, inheritance clearing, and deliberate parent restoration. A successful run produces a schema-versioned verification receipt but does not promote P1 automatically.</p>
      <div class="editor-action-row">
        <button id="p0-live-smoke-run" class="secondary-action" type="button">Run P0 Live Smoke Test</button>
        <button id="p0-live-smoke-copy" class="secondary-action" type="button" disabled>Copy Verification Receipt</button>
        <button id="p0-live-smoke-download" class="secondary-action" type="button" disabled>Download Verification Receipt</button>
      </div>
      <ul id="p0-live-smoke-results"><li>No live smoke test has run in this browser session.</li></ul>
      <label for="p0-live-smoke-receipt">Last successful verification receipt</label>
      <textarea id="p0-live-smoke-receipt" class="json-export" rows="12" readonly aria-describedby="p0-live-smoke-receipt-help"></textarea>
      <p id="p0-live-smoke-receipt-help" class="field-help">The receipt records the browser, editor chain, stage results, stable profile IDs, revisions, and pinned inheritance references needed to verify the P0 exit gate.</p>`;
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
