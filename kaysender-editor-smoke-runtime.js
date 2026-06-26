(() => {
  'use strict';

  const Kernel = window.KaysenderEditorKernel;
  const Repository = window.KaysenderEditorRepository;
  const Production = () => window.KaysenderMainlineEditorProduction;
  const RECEIPT_SCHEMA_VERSION = '1.0.0';
  const RECEIPT_STAGE = 'P0';
  const RECEIPT_STAGE_ID = 'shared-editor-kernel';
  const RECEIPT_STORAGE_KEY = 'hb-ttrpg-tools:p0-live-smoke:last-pass';
  const EDITOR_CHAIN = ['floating-island-editor', 'settlement-editor', 'airship-editor'];
  const results = [];
  let lastReport = null;

  const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

  async function waitFor(selector, timeoutMs = 8000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const element = document.querySelector(selector);
      if (element) return element;
      await wait(50);
    }
    throw new Error(`Timed out waiting for ${selector}.`);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function renderResults() {
    const target = document.getElementById('p0-live-smoke-results');
    if (!target) return;
    target.innerHTML = results.length
      ? results.map(result => `<li class="${result.ok ? 'editor-diagnostic-info' : 'editor-diagnostic-error'}"><strong>${escapeHtml(result.stage)}</strong>: ${escapeHtml(result.message)}</li>`).join('')
      : '<li>No live smoke test has run in this browser session.</li>';
  }

  function addResult(stage, ok, message) {
    results.push({ stage, ok, message });
    renderResults();
  }

  function renderReceipt() {
    const textarea = document.getElementById('p0-live-smoke-receipt');
    const copyButton = document.getElementById('p0-live-smoke-copy');
    const downloadButton = document.getElementById('p0-live-smoke-download');
    if (textarea) textarea.value = lastReport ? JSON.stringify(lastReport, null, 2) : '';
    if (copyButton) copyButton.disabled = !lastReport;
    if (downloadButton) downloadButton.disabled = !lastReport;
  }

  function profileReceipt(editorId, envelope) {
    return {
      editorId,
      profileId: envelope.profileId,
      profileType: envelope.profileType,
      revision: envelope.revision,
      inheritance: clone(envelope.inheritance || [])
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
      value && value.schemaVersion === RECEIPT_SCHEMA_VERSION &&
      value.stage === RECEIPT_STAGE && value.stageId === RECEIPT_STAGE_ID &&
      value.result === 'passed' && Array.isArray(value.editorChain) &&
      value.editorChain.join('|') === EDITOR_CHAIN.join('|') &&
      Array.isArray(value.stageResults) && value.stageResults.length >= 4 &&
      value.stageResults.every(item => item?.ok === true) &&
      Array.isArray(value.profiles) && value.profiles.length === 3
    );
  }

  function saveSessionReport(report) {
    lastReport = report;
    renderReceipt();
    try { window.sessionStorage?.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(report)); }
    catch (error) { addResult('Session report', true, `Verification passed; optional browser storage declined the receipt: ${error.message}`); }
  }

  function restoreSessionReport() {
    try {
      const stored = window.sessionStorage?.getItem(RECEIPT_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      if (isReceipt(parsed)) lastReport = parsed;
    } catch { lastReport = null; }
  }

  function clearSessionReport() {
    lastReport = null;
    renderReceipt();
    try { window.sessionStorage?.removeItem(RECEIPT_STORAGE_KEY); } catch { /* optional */ }
  }

  async function copyReceipt() {
    if (!lastReport) return;
    const text = JSON.stringify(lastReport, null, 2);
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      if (!document.execCommand('copy')) throw new Error('Browser copy command was rejected.');
      textarea.remove();
    }
    addResult('Receipt', true, 'Verification receipt copied to the clipboard.');
  }

  function downloadReceipt() {
    if (!lastReport) return;
    const blob = new Blob([JSON.stringify(lastReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kaysender-p0-browser-verification-${lastReport.testedAt.replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    addResult('Receipt', true, 'Verification receipt downloaded.');
  }

  function saveAndReload(envelope, temporaryProfileIds) {
    const saved = Repository.save(envelope);
    if (!saved.ok) throw new Error(saved.message);
    temporaryProfileIds.push(envelope.profileId);
    const loaded = Repository.load(envelope.profileId);
    if (!loaded.ok) throw new Error(loaded.message);
    return loaded.envelope;
  }

  function requireReference(envelope, profileId, revision, label) {
    const reference = envelope.inheritance?.find(item => item.profileId === profileId);
    if (!reference) throw new Error(`${label} did not retain parent ${profileId}.`);
    if (reference.revision !== revision) throw new Error(`${label} changed parent ${profileId} from revision ${revision} to ${reference.revision}.`);
    if (reference.policy !== 'pinned-revision') throw new Error(`${label} did not retain pinned-revision inheritance for ${profileId}.`);
  }

  async function rebuildActive(expectedType, label) {
    Production().rebuildActive();
    await wait(260);
    const envelope = Production().getActiveEnvelope();
    if (!envelope) throw new Error(`${label} did not produce an active canonical envelope.`);
    if (envelope.profileType !== expectedType) throw new Error(`${label} produced ${envelope.profileType} instead of ${expectedType}.`);
    const errors = Kernel.validateEnvelope(envelope, [expectedType]).filter(item => item.severity === 'error');
    if (errors.length) throw new Error(errors.map(item => item.message).join('; '));
    return envelope;
  }

  async function importParent(panel, textareaId, buttonId, envelope, datasetEnvelopeKey) {
    const textarea = panel.querySelector(`#${textareaId}`);
    const button = panel.querySelector(`#${buttonId}`);
    if (!textarea || !button) throw new Error(`Missing parent import controls ${textareaId}/${buttonId}.`);
    textarea.value = JSON.stringify(envelope, null, 2);
    button.click();
    await wait(220);
    if (!panel.dataset[datasetEnvelopeKey]) throw new Error(`Canonical parent provenance was not stored in ${datasetEnvelopeKey}.`);
  }

  async function reopenActiveRecord(editorAlias, envelope) {
    await Production().launch(editorAlias);
    const imported = Production().importIntoActive(envelope);
    if (!imported) throw new Error(`Could not reopen ${envelope.profileId} in ${editorAlias}.`);
    await wait(300);
    const active = Production().getActiveEnvelope();
    if (!active) throw new Error(`No active envelope was available after reopening ${envelope.profileId}.`);
    if (active.profileId !== envelope.profileId) throw new Error(`Reopening ${envelope.profileId} changed its stable profile ID to ${active.profileId}.`);
    if (active.revision !== envelope.revision) throw new Error(`Reopening ${envelope.profileId} changed revision ${envelope.revision} to ${active.revision}.`);
    return active;
  }

  async function runSmokeTest() {
    if (!Kernel || !Repository || !Production()) {
      addResult('Kernel', false, 'Shared kernel, repository, or production shell is unavailable.');
      return;
    }
    if (!window.confirm('Run the P0 live smoke test? Temporary verification records will be created and removed.')) return;

    const temporaryProfileIds = [];
    results.length = 0;
    clearSessionReport();
    addResult('Start', true, 'Beginning Island → Settlement → Airship browser-path smoke test with persistent reopen checks.');
    const runButton = document.getElementById('p0-live-smoke-run');
    if (runButton) runButton.disabled = true;

    try {
      await Production().launchIsland();
      const islandEnvelope = await rebuildActive('floating-island-foundation-profile', 'Island');
      if (islandEnvelope.profileSchemaVersion !== '3.0.0') throw new Error(`Island production envelope used schema ${islandEnvelope.profileSchemaVersion} instead of 3.0.0.`);
      const storedIsland = saveAndReload(islandEnvelope, temporaryProfileIds);
      addResult('Island', true, `Built, saved, and reloaded ${storedIsland.name} as ${storedIsland.profileId} schema ${storedIsland.profileSchemaVersion}.`);

      await Production().launchSettlement();
      const settlementPanel = await waitFor('#kaysender-settlement-editor-panel');
      await importParent(settlementPanel, 'settlement-island-import', 'settlement-load-island', storedIsland, 'sourceIslandEnvelope');
      const settlementEnvelope = await rebuildActive('settlement-profile', 'Settlement');
      requireReference(settlementEnvelope, storedIsland.profileId, storedIsland.revision, 'Settlement');
      const storedSettlement = saveAndReload(settlementEnvelope, temporaryProfileIds);
      addResult('Settlement', true, `Built, saved, and reloaded ${storedSettlement.name} with pinned island inheritance.`);

      const reopenedSettlement = await reopenActiveRecord('settlement', storedSettlement);
      requireReference(reopenedSettlement, storedIsland.profileId, storedIsland.revision, 'Reopened Settlement');
      addResult('Settlement reopen', true, `Reopened ${reopenedSettlement.profileId} without changing its own revision or pinned island identity.`);

      await Production().launchAirship();
      const airshipPanel = await waitFor('#kaysender-airship-editor-panel');
      await importParent(airshipPanel, 'airship-island-import', 'airship-load-island', storedIsland, 'sourceIslandEnvelope');
      await importParent(airshipPanel, 'airship-settlement-import', 'airship-load-settlement', storedSettlement, 'sourceSettlementEnvelope');
      const airshipEnvelope = await rebuildActive('airship-profile', 'Airship');
      requireReference(airshipEnvelope, storedIsland.profileId, storedIsland.revision, 'Airship');
      requireReference(airshipEnvelope, storedSettlement.profileId, storedSettlement.revision, 'Airship');
      const storedAirship = saveAndReload(airshipEnvelope, temporaryProfileIds);
      addResult('Airship', true, `Built, saved, and reloaded ${storedAirship.name} with both pinned parents.`);

      let reopenedAirship = await reopenActiveRecord('airship', storedAirship);
      requireReference(reopenedAirship, storedIsland.profileId, storedIsland.revision, 'Reopened Airship');
      requireReference(reopenedAirship, storedSettlement.profileId, storedSettlement.revision, 'Reopened Airship');
      addResult('Airship reopen', true, `Reopened ${reopenedAirship.profileId} without changing its revision or pinned parent identities.`);

      const settlementTextarea = airshipPanel.querySelector('#airship-settlement-import');
      airshipPanel.dataset.sourceSettlement = '';
      airshipPanel.dataset.sourceSettlementEnvelope = '';
      if (settlementTextarea) settlementTextarea.value = '';
      const clearedAirship = await rebuildActive('airship-profile', 'Airship after parent clear');
      if (clearedAirship.inheritance.some(item => item.profileId === storedSettlement.profileId)) throw new Error('Clearing the settlement parent did not remove it from the canonical Airship inheritance ledger.');
      requireReference(clearedAirship, storedIsland.profileId, storedIsland.revision, 'Airship after parent clear');
      addResult('Inheritance clear', true, 'Cleared the Settlement parent from active context and the canonical Airship ledger.');

      await importParent(airshipPanel, 'airship-settlement-import', 'airship-load-settlement', storedSettlement, 'sourceSettlementEnvelope');
      reopenedAirship = await rebuildActive('airship-profile', 'Airship after parent restore');
      requireReference(reopenedAirship, storedIsland.profileId, storedIsland.revision, 'Airship after restore');
      requireReference(reopenedAirship, storedSettlement.profileId, storedSettlement.revision, 'Airship after restore');
      addResult('Inheritance restore', true, 'Restored the saved Settlement parent deliberately and recovered both pinned references.');

      addResult('P0 live smoke', true, 'Shared shell, persistent records, exact revisions, pinned reopen behavior, inheritance clearing, and parent restoration all passed.');
      saveSessionReport(createReceipt([
        profileReceipt('floating-island-editor', storedIsland),
        profileReceipt('settlement-editor', reopenedSettlement),
        profileReceipt('airship-editor', reopenedAirship)
      ]));
    } catch (error) {
      addResult('P0 live smoke', false, error.message);
    } finally {
      temporaryProfileIds.forEach(profileId => Repository.remove(profileId, true));
      if (runButton) runButton.disabled = false;
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
      <p>Internal verification for persistent Island, Settlement, and Airship records, pinned inheritance, reopen behavior, and cleanup.</p>
      <div class="editor-action-row">
        <button id="p0-live-smoke-run" class="secondary-action" type="button">Run P0 Live Smoke Test</button>
        <button id="p0-live-smoke-copy" class="secondary-action" type="button" disabled>Copy Verification Receipt</button>
        <button id="p0-live-smoke-download" class="secondary-action" type="button" disabled>Download Verification Receipt</button>
      </div>
      <ul id="p0-live-smoke-results"><li>No live smoke test has run in this browser session.</li></ul>
      <label for="p0-live-smoke-receipt">Last successful verification receipt</label>
      <textarea id="p0-live-smoke-receipt" class="json-export" rows="12" readonly></textarea>`;
    status.insertAdjacentElement('afterend', card);
    card.querySelector('#p0-live-smoke-run').addEventListener('click', runSmokeTest);
    card.querySelector('#p0-live-smoke-copy').addEventListener('click', () => copyReceipt().catch(error => addResult('Receipt', false, error.message)));
    card.querySelector('#p0-live-smoke-download').addEventListener('click', downloadReceipt);
    restoreSessionReport();
    renderReceipt();
  }

  window.runKaysenderEditorSmokeTest = runSmokeTest;
  window.getKaysenderEditorSmokeReceipt = () => lastReport ? clone(lastReport) : null;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
