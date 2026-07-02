(() => {
  'use strict';

  const REPOSITORY = 'mrcalzon02/HB-TTRPG-tools';
  const SAFE_PREFILL_URL_LENGTH = 6000;
  const originalOpen = window.open.bind(window);
  const SUBMISSION_TYPES = Object.freeze({
    '<!-- WOD_POI_REGISTRY_PATCH -->': {
      label: 'World of Darkness POI registry entry',
      workflow: 'ingest-wod-poi.yml'
    },
    '<!-- WOD_LOCATION_PACKAGE_PATCH -->': {
      label: 'World of Darkness location package',
      workflow: 'ingest-wod-location-package.yml'
    },
    '<!-- SHADOWRUN_SPRAWL_LOCATION_PATCH -->': {
      label: 'Shadowrun sprawl location',
      workflow: 'ingest-shadowrun-sprawl-location.yml'
    }
  });

  let activeSubmission = null;
  let restoreTimer = 0;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  function submissionType(body) {
    return Object.entries(SUBMISSION_TYPES).find(([marker]) => String(body || '').includes(marker)) || null;
  }

  function issueUrl(title, body) {
    const url = new URL(`https://github.com/${REPOSITORY}/issues/new`);
    url.searchParams.set('title', title);
    if (body) url.searchParams.set('body', body);
    return url.toString();
  }

  function workflowUrl(workflow) {
    return `https://github.com/${REPOSITORY}/actions/workflows/${encodeURIComponent(workflow)}`;
  }

  function shortBody(marker, label) {
    return `${marker}\n\nThe complete ${label} payload was too large for a reliable prefilled URL and has been copied to the clipboard. Replace this entire message by pasting the copied payload before creating the issue.\n`;
  }

  function ensureStyles() {
    if (document.getElementById('hb-spatial-submission-style')) return;
    const style = document.createElement('style');
    style.id = 'hb-spatial-submission-style';
    style.textContent = `
      .hb-submission-dialog{width:min(920px,calc(100vw - 28px));max-height:calc(100vh - 40px);padding:0;border:1px solid var(--line);border-radius:16px;background:#10131a;color:var(--ink);box-shadow:0 24px 80px #000c}
      .hb-submission-dialog::backdrop{background:#000a}
      .hb-submission-shell{display:grid;grid-template-rows:auto auto minmax(180px,1fr) auto;max-height:calc(100vh - 42px)}
      .hb-submission-header{display:flex;justify-content:space-between;gap:16px;padding:16px 18px;border-bottom:1px solid var(--line);background:#151923}
      .hb-submission-header h3{margin:.1rem 0 .35rem}.hb-submission-header p{margin:0;color:var(--muted);font-size:.82rem}
      .hb-submission-close{align-self:start}
      .hb-submission-status{margin:12px 18px 0;padding:10px;border:1px solid var(--line);border-radius:9px;background:#0c1016;color:var(--muted);font-size:.82rem;line-height:1.4}
      .hb-submission-status.success{border-color:#2d8f71;color:#a9f1da}.hb-submission-status.error{border-color:#8b0000;color:#ffb3b3}
      .hb-submission-payload{margin:12px 18px;width:calc(100% - 36px);min-height:220px;box-sizing:border-box;resize:vertical;background:#0a0d12;color:#dbe8e2;border:1px solid var(--line);border-radius:9px;padding:11px;font:12px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace}
      .hb-submission-actions{display:flex;flex-wrap:wrap;gap:8px;padding:0 18px 18px}
      .hb-submission-actions a{text-decoration:none}
      .hb-submission-toast{position:fixed;right:14px;bottom:14px;z-index:10050;max-width:min(460px,calc(100vw - 28px));padding:11px 13px;border:1px solid var(--line);border-radius:10px;background:#10131a;color:var(--ink);box-shadow:0 8px 28px #0009;font-size:.82rem;line-height:1.4}
      .hb-submission-toast.success{border-color:#2d8f71;color:#a9f1da}.hb-submission-toast.error{border-color:#8b0000;color:#ffb3b3}
      .hb-global-workflow-note{margin:8px 0 0;color:var(--muted);font-size:.76rem;line-height:1.4}
    `;
    document.head.appendChild(style);
  }

  function ensureDialog() {
    ensureStyles();
    let dialog = document.getElementById('hb-spatial-submission-dialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'hb-spatial-submission-dialog';
    dialog.className = 'hb-submission-dialog';
    dialog.innerHTML = `
      <div class="hb-submission-shell">
        <header class="hb-submission-header">
          <div><p class="eyebrow">Global registry handoff</p><h3 id="hb-submission-title">Prepare Global Submission</h3><p id="hb-submission-description"></p></div>
          <button type="button" class="secondary-action hb-submission-close" data-hb-submission-close>Close</button>
        </header>
        <div id="hb-submission-status" class="hb-submission-status" role="status" aria-live="polite"></div>
        <textarea id="hb-submission-payload" class="hb-submission-payload" readonly spellcheck="false" aria-label="Complete GitHub issue body"></textarea>
        <div class="hb-submission-actions">
          <button type="button" class="primary-action" data-hb-copy-submission>Copy Complete Issue Body</button>
          <button type="button" class="secondary-action" data-hb-open-issue>Open GitHub Issue</button>
          <a class="secondary-action" target="_blank" rel="noopener" data-hb-open-workflow>Open Ingestion Workflow</a>
          <button type="button" class="secondary-action" data-hb-download-submission>Download Payload</button>
        </div>
      </div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('[data-hb-submission-close]').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-hb-copy-submission]').addEventListener('click', () => void copyActiveSubmission());
    dialog.querySelector('[data-hb-open-issue]').addEventListener('click', () => openActiveIssue());
    dialog.querySelector('[data-hb-download-submission]').addEventListener('click', downloadActiveSubmission);
    return dialog;
  }

  function showToast(message, type = '') {
    ensureStyles();
    let toast = document.getElementById('hb-spatial-submission-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'hb-spatial-submission-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    window.clearTimeout(restoreTimer);
    toast.className = `hb-submission-toast ${type}`.trim();
    toast.textContent = message;
    toast.hidden = false;
    restoreTimer = window.setTimeout(() => { toast.hidden = true; }, 7000);
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = ensureDialog().querySelector('#hb-submission-payload');
    textarea.focus();
    textarea.select();
    return document.execCommand?.('copy') === true;
  }

  async function copyActiveSubmission() {
    if (!activeSubmission) return false;
    try {
      const copied = await copyText(activeSubmission.body);
      setDialogStatus(copied ? 'The complete issue body is copied. Paste it into the GitHub issue before submitting.' : 'Automatic clipboard access was unavailable. Select and copy the payload manually.', copied ? 'success' : 'error');
      showToast(copied ? 'Global submission payload copied.' : 'Clipboard unavailable; copy the visible payload manually.', copied ? 'success' : 'error');
      return copied;
    } catch (error) {
      setDialogStatus(`Clipboard copy failed: ${error.message}. Select and copy the payload manually.`, 'error');
      showToast('Clipboard copy failed; the complete payload remains visible.', 'error');
      return false;
    }
  }

  function setDialogStatus(message, type = '') {
    const target = document.getElementById('hb-submission-status');
    if (!target) return;
    target.className = `hb-submission-status ${type}`.trim();
    target.textContent = message;
  }

  function issueLaunchUrl(submission) {
    const full = issueUrl(submission.title, submission.body);
    if (full.length <= SAFE_PREFILL_URL_LENGTH) return { url: full, fullPayload: true };
    return { url: issueUrl(submission.title, shortBody(submission.marker, submission.config.label)), fullPayload: false };
  }

  function openIssueFor(submission) {
    const launch = issueLaunchUrl(submission);
    originalOpen(launch.url, '_blank', 'noopener');
    submission.fullPayloadPrefilled = launch.fullPayload;
    return launch;
  }

  function openActiveIssue() {
    if (!activeSubmission) return;
    const launch = openIssueFor(activeSubmission);
    setDialogStatus(launch.fullPayload
      ? 'GitHub opened with the complete issue body prefilled. Review it, create the issue, then run the linked ingestion workflow with the new issue number.'
      : 'The payload is too large for a reliable prefilled URL. GitHub opened with paste instructions; paste the copied complete body over those instructions before creating the issue.', 'success');
  }

  function downloadActiveSubmission() {
    if (!activeSubmission) return;
    const blob = new Blob([activeSubmission.body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activeSubmission.slug || 'global-submission'}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function renderSubmission(submission, launch) {
    const dialog = ensureDialog();
    dialog.querySelector('#hb-submission-title').textContent = `Submit ${submission.config.label}`;
    dialog.querySelector('#hb-submission-description').textContent = 'Global publication uses a GitHub issue plus an owner-run validation workflow. Nothing is silently committed from the browser.';
    dialog.querySelector('#hb-submission-payload').value = submission.body;
    dialog.querySelector('[data-hb-open-workflow]').href = workflowUrl(submission.config.workflow);
    setDialogStatus(launch.fullPayload
      ? 'GitHub was opened with the complete payload prefilled. The payload is also shown here as a recoverable copy.'
      : 'This payload is too large for a dependable issue URL. GitHub was opened with paste instructions, and the complete payload is shown here and is being copied.', 'success');
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function prepareSubmission({ title, body, workflow, slug } = {}) {
    const type = submissionType(body);
    if (!type) throw new Error('The submission body does not contain a recognized registry marker.');
    const [marker, defaultConfig] = type;
    const submission = {
      title: String(title || defaultConfig.label),
      body: String(body || ''),
      marker,
      config: { ...defaultConfig, workflow: workflow || defaultConfig.workflow },
      slug: String(slug || defaultConfig.label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    };
    activeSubmission = submission;
    const launch = openIssueFor(submission);
    renderSubmission(submission, launch);
    void copyActiveSubmission();
    return submission;
  }

  function parseGitHubIssueUrl(url) {
    try {
      const parsed = new URL(String(url), location.href);
      if (parsed.hostname !== 'github.com') return null;
      if (parsed.pathname !== `/${REPOSITORY}/issues/new`) return null;
      const title = parsed.searchParams.get('title') || '';
      const body = parsed.searchParams.get('body') || '';
      return submissionType(body) ? { title, body } : null;
    } catch (_) {
      return null;
    }
  }

  window.open = function patchedOpen(url, target, features) {
    const parsed = parseGitHubIssueUrl(url);
    if (!parsed) return originalOpen(url, target, features);
    prepareSubmission(parsed);
    return null;
  };

  function installWorkflowNotes() {
    const notes = [
      ['wod-submit-location-package-global', 'Global publication opens a recoverable GitHub handoff, copies the complete payload, and links to the owner-run ingestion workflow.'],
      ['wod-submit-central-registry', 'Central publication opens a recoverable GitHub handoff, copies the complete payload, and links to the owner-run ingestion workflow.'],
      ['sr-spatial-registry-submit-global', 'Global publication opens a recoverable GitHub handoff, copies the complete payload, and links to the owner-run ingestion workflow.']
    ];
    for (const [buttonId, text] of notes) {
      const button = document.getElementById(buttonId);
      if (!button || button.dataset.hbWorkflowNote === 'true') continue;
      button.dataset.hbWorkflowNote = 'true';
      button.title = text;
      const note = document.createElement('p');
      note.className = 'hb-global-workflow-note';
      note.textContent = text;
      button.closest('.wod-package-actions,.wod-fast-actions,.sr-fast-actions,.sr-registry-actions')?.insertAdjacentElement('afterend', note);
    }
  }

  function parseStorage(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); }
    catch (_) { return null; }
  }

  function verifySave(button, statusText) {
    if (button.id === 'wod-save-location-package-local') {
      const packageKey = String(statusText || '').match(/wodpkg-[0-9a-f]{8}/)?.[0];
      const registry = parseStorage('hb-wod-generated-location-packages-v2');
      const found = packageKey && Object.values(registry?.worlds || {}).some(world => Boolean(world?.packages?.[packageKey]));
      return found
        ? { message: `Verified browser round-trip for ${packageKey}.`, error: false }
        : { message: packageKey ? `The interface reported ${packageKey}, but it was not found when browser storage was read back.` : statusText, error: true };
    }
    if (button.id === 'wod-save-local-claim') {
      const key = document.querySelector('#wod-display-matrix .wod-fast-token')?.textContent?.trim();
      const found = /^gmaps-[0-9a-f]{8}$/.test(key || '') && Boolean(parseStorage(`hb-wod-poi-v2:${key}`));
      return found
        ? { message: `Verified local World of Darkness override ${key}.`, error: false }
        : { message: 'The World of Darkness override was not found when browser storage was read back.', error: true };
    }
    if (button.id === 'sr-spatial-save-override') {
      const key = window.ShadowrunSprawlDiscovery?.getSelectedSite?.()?.entryKey;
      const found = /^srpoi-[0-9a-f]{8}$/.test(key || '') && Boolean(parseStorage(`hb-shadowrun-spatial-poi-v2:${key}`));
      return found
        ? { message: `Verified local Shadowrun override ${key}.`, error: false }
        : { message: 'The Shadowrun override was not found when browser storage was read back.', error: true };
    }
    const error = /failed|could not|unavailable|no confirmation|error/i.test(statusText || '');
    return { message: statusText, error };
  }

  function installSaveFeedback() {
    if (document.documentElement.dataset.hbSaveFeedback === 'true') return;
    document.documentElement.dataset.hbSaveFeedback = 'true';
    document.addEventListener('click', event => {
      const button = event.target.closest('#wod-save-location-package-local,#wod-save-local-claim,#sr-spatial-save-override,#sr-spatial-registry-save-local,#sr-spatial-registry-delete-local');
      if (!button) return;
      const before = [
        document.getElementById('wod-package-location-status')?.textContent,
        document.getElementById('wod-visible-business-status')?.textContent,
        document.getElementById('sr-spatial-status')?.textContent,
        document.getElementById('sr-spatial-registry-status')?.textContent
      ].filter(Boolean).join(' | ');
      window.setTimeout(() => {
        const after = [
          document.getElementById('wod-package-location-status')?.textContent,
          document.getElementById('wod-visible-business-status')?.textContent,
          document.getElementById('sr-spatial-status')?.textContent,
          document.getElementById('sr-spatial-registry-status')?.textContent
        ].filter(Boolean).join(' | ');
        const statusText = after && after !== before ? after : 'The save control produced no confirmation. Browser storage may be unavailable or the selected record may not be ready.';
        const verification = verifySave(button, statusText);
        showToast(verification.message, verification.error ? 'error' : 'success');
      }, 120);
    }, true);
  }

  const observer = new MutationObserver(() => installWorkflowNotes());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  ensureStyles();
  installSaveFeedback();
  installWorkflowNotes();

  window.HBSpatialSubmissionHandoff = Object.freeze({
    prepare: prepareSubmission,
    copyCurrent: copyActiveSubmission,
    getCurrent: () => activeSubmission,
    showToast
  });
})();
