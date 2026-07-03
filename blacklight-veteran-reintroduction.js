(() => {
  'use strict';

  const DATA_URL = 'data/blacklight-continuum/wiki/veteran-reintroduction.json';
  const DRAFT_KEY = 'hb-ttrpg-tools-blacklight-veteran-reorientation-v1';
  const RECORD_KEY = 'hb-ttrpg-tools-blacklight-veteran-reorientation-record-v1';
  const SHEET_KEY = 'hb-ttrpg-tools-blacklight-basic-character-v1';

  const state = {
    source: null,
    entries: [],
    activeId: '',
    draft: null,
    errors: []
  };

  const ui = {};

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function clean(value) {
    if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
    return String(value ?? '').trim();
  }

  function answerText(value) {
    if (Array.isArray(value)) return value.join(', ');
    if (value === true) return 'Acknowledged';
    if (value === false) return 'Not acknowledged';
    return String(value ?? '').trim();
  }

  function clipped(value, limit = 240) {
    const text = answerText(value).replace(/\s+/g, ' ').trim();
    return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
  }

  function stablePick(seed, options) {
    let hash = 0;
    for (const character of String(seed)) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
    return options[Math.abs(hash) % options.length];
  }

  function defaultDraft() {
    return {
      schemaVersion: '1.0.0',
      activeId: 'returning-operative',
      answers: {},
      responses: {},
      visited: [],
      savedAt: null
    };
  }

  function readJson(key, fallback = null) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function mergeDraft(saved) {
    const base = defaultDraft();
    if (!saved || typeof saved !== 'object') return base;
    return {
      ...base,
      ...saved,
      answers: saved.answers && typeof saved.answers === 'object' ? saved.answers : {},
      responses: saved.responses && typeof saved.responses === 'object' ? saved.responses : {},
      visited: Array.isArray(saved.visited) ? [...new Set(saved.visited)] : []
    };
  }

  function saveDraft() {
    state.draft.activeId = state.activeId;
    state.draft.savedAt = new Date().toISOString();
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(state.draft));
    } catch (_) {
      // The reader remains usable without browser persistence.
    }
  }

  function activeIndex() {
    return Math.max(0, state.entries.findIndex(entry => entry.id === state.activeId));
  }

  function getEntry(id = state.activeId) {
    return state.entries.find(entry => entry.id === id) || state.entries[0] || null;
  }

  function getPrompt(promptId) {
    for (const entry of state.entries) {
      const prompt = (entry.prompts || []).find(item => item.id === promptId);
      if (prompt) return { entry, prompt };
    }
    return null;
  }

  function promptComplete(prompt) {
    const value = state.draft.answers[prompt.id];
    if (!prompt.required) return true;
    if (prompt.type === 'acknowledge') return value === true;
    if (prompt.type === 'checkboxes') return Array.isArray(value) && value.length > 0;
    return Boolean(String(value ?? '').trim());
  }

  function entryComplete(entry) {
    const prompts = entry.prompts || [];
    return prompts.every(promptComplete);
  }

  function completedCount() {
    return state.entries.filter(entryComplete).length;
  }

  function markVisited(id = state.activeId) {
    if (!state.draft.visited.includes(id)) state.draft.visited.push(id);
  }

  function responseFor(prompt, value) {
    const normalized = value === true ? 'true' : value === false ? 'false' : answerText(value);
    if (prompt.responsesByValue && prompt.responsesByValue[normalized]) return prompt.responsesByValue[normalized];
    const context = prompt.responseContext || 'This answer is now part of the operative continuity record.';
    const answer = clipped(value);
    return stablePick(`${prompt.id}:${answer}`, [
      `Recorded. ${context} I will resist the temptation to reinterpret “${answer}” later as something more operationally convenient.`,
      `${context} Your answer—“${answer}”—is specific enough to be attributable, which is the point of this exercise.`,
      `I have entered “${answer}.” ${context} This does not mean I agree. It means the disagreement can no longer pretend it was never stated.`,
      `Continuity record updated: “${answer}.” ${context} Vague intentions are cheaper. They are also considerably less useful when the mission changes.`
    ]);
  }

  function commitResponse(prompt) {
    const value = state.draft.answers[prompt.id];
    const text = answerText(value);
    if (!text || (prompt.type === 'checkboxes' && !value.length) || (prompt.type === 'acknowledge' && value !== true)) {
      delete state.draft.responses[prompt.id];
      saveDraft();
      return;
    }
    const entry = getPrompt(prompt.id)?.entry;
    state.draft.responses[prompt.id] = {
      promptId: prompt.id,
      stageId: entry?.id || state.activeId,
      stageTitle: entry?.title || '',
      label: prompt.label,
      answer: value,
      response: responseFor(prompt, value),
      updatedAt: new Date().toISOString()
    };
    saveDraft();
  }

  function renderTables(tables) {
    if (!Array.isArray(tables) || !tables.length) return '';
    return tables.map(table => `
      <h3>${escapeHtml(table.title || 'Reference')}</h3>
      <div class="veteran-table-wrap"><table class="veteran-table">
        <thead><tr>${(table.columns || []).map(column => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>
        <tbody>${(table.rows || []).map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>`).join('');
  }

  function renderPrompt(prompt) {
    const value = state.draft.answers[prompt.id];
    const required = prompt.required ? '<em>Required continuity field</em>' : '<em>Optional continuity field</em>';
    const heading = `<span>${escapeHtml(prompt.label)}</span>${required}`;

    if (prompt.type === 'textarea') {
      return `<label class="veteran-prompt">${heading}<textarea data-answer-id="${escapeHtml(prompt.id)}" rows="4" placeholder="${escapeHtml(prompt.placeholder || '')}">${escapeHtml(value || '')}</textarea></label>`;
    }
    if (prompt.type === 'text') {
      return `<label class="veteran-prompt">${heading}<input data-answer-id="${escapeHtml(prompt.id)}" type="text" value="${escapeHtml(value || '')}" placeholder="${escapeHtml(prompt.placeholder || '')}"></label>`;
    }
    if (prompt.type === 'radio') {
      return `<section class="veteran-prompt">${heading}<div class="veteran-choice-grid">${(prompt.options || []).map(option => `
        <label class="veteran-choice"><input type="radio" name="prompt-${escapeHtml(prompt.id)}" data-radio-id="${escapeHtml(prompt.id)}" value="${escapeHtml(option)}" ${value === option ? 'checked' : ''}><span>${escapeHtml(option)}</span></label>`).join('')}</div></section>`;
    }
    if (prompt.type === 'checkboxes') {
      const selected = Array.isArray(value) ? value : [];
      return `<section class="veteran-prompt">${heading}<div class="veteran-choice-grid">${(prompt.options || []).map(option => `
        <label class="veteran-choice"><input type="checkbox" data-checkbox-id="${escapeHtml(prompt.id)}" value="${escapeHtml(option)}" ${selected.includes(option) ? 'checked' : ''}><span>${escapeHtml(option)}</span></label>`).join('')}</div></section>`;
    }
    if (prompt.type === 'acknowledge') {
      return `<section class="veteran-prompt veteran-acknowledge"><label class="veteran-choice"><input type="checkbox" data-acknowledge-id="${escapeHtml(prompt.id)}" ${value === true ? 'checked' : ''}><span>${escapeHtml(prompt.label)}</span></label>${required}</section>`;
    }
    return '';
  }

  function orderedResponses() {
    const result = [];
    state.entries.forEach(entry => {
      (entry.prompts || []).forEach(prompt => {
        const record = state.draft.responses[prompt.id];
        if (record) result.push(record);
      });
    });
    return result;
  }

  function renderCharles(entry) {
    const current = (entry.prompts || []).map(prompt => state.draft.responses[prompt.id]).filter(Boolean);
    const transcript = orderedResponses();
    return `<section class="veteran-charles">
      <header class="veteran-charles-header"><div><span>BLACKLIGHT STRATEGIC INTELLIGENCE</span><strong>CHARLES // CONTINUITY REORIENTATION</strong></div><small>One current response per field · changed answers replace prior responses</small></header>
      <blockquote>${escapeHtml(entry.charlesPrompt || 'Continue the record.')}</blockquote>
      ${current.length ? `<div class="veteran-response-list">${current.map(record => `<article><span>${escapeHtml(record.label)}</span><p><strong>Operative:</strong> ${escapeHtml(answerText(record.answer))}</p><p><strong>Charles:</strong> ${escapeHtml(record.response)}</p></article>`).join('')}</div>` : '<p class="veteran-status">Charles will respond after a field is committed by leaving it, changing a selection, or acknowledging the term.</p>'}
      <details class="veteran-transcript"><summary>Review current continuity transcript (${transcript.length})</summary><div>${transcript.map(record => `<article><span>${escapeHtml(record.stageTitle)}</span><p><strong>${escapeHtml(record.label)}</strong><br>Operative: ${escapeHtml(answerText(record.answer))}<br>Charles: ${escapeHtml(record.response)}</p></article>`).join('') || '<p class="veteran-status">No committed responses yet.</p>'}</div></details>
    </section>`;
  }

  function renderErrors() {
    if (!state.errors.length) return '';
    return `<section class="veteran-errors"><strong>Complete the required continuity fields before continuing.</strong><ul>${state.errors.map(error => `<li>${escapeHtml(error)}</li>`).join('')}</ul></section>`;
  }

  function summaryValue(id, fallback = 'Not yet recorded') {
    const value = state.draft.answers[id];
    return answerText(value) || fallback;
  }

  function renderFinal() {
    if (state.activeId !== 'new-arrangement') return '';
    const complete = state.entries.every(entryComplete);
    return `<section class="veteran-final">
      <h2>Veteran Continuity Record</h2>
      <div class="veteran-final-grid">
        <article><span>Company Status</span><p>${escapeHtml(summaryValue('companyStatus'))}</p></article>
        <article><span>Company Function</span><p>${escapeHtml(summaryValue('companyFunction'))}</p></article>
        <article><span>Minimum Briefing</span><p>${escapeHtml(summaryValue('minimumInformation'))}</p></article>
        <article><span>Command Boundary</span><p>${escapeHtml(summaryValue('authorityBoundary'))}</p></article>
        <article><span>Personhood Claim</span><p>${escapeHtml(summaryValue('continuityClaim'))}</p></article>
        <article><span>Support Requirement</span><p>${escapeHtml(summaryValue('companySupportNeed'))}</p></article>
        <article><span>Legacy Capability</span><p>${escapeHtml(summaryValue('legacyCapability'))}</p></article>
        <article><span>Legacy Cost</span><p>${escapeHtml(summaryValue('legacyCost'))}</p></article>
        <article><span>Charles's Remaining Authority</span><p>${escapeHtml(summaryValue('charlesAuthorityNow'))}</p></article>
        <article><span>Reason to Continue</span><p>${escapeHtml(summaryValue('reasonToContinue'))}</p></article>
      </div>
      <p class="veteran-status">${complete ? 'All twenty-four stages are complete. The continuity record is ready to export or attach to the Basic Character Sheet.' : `${completedCount()} of ${state.entries.length} stages are complete. The record can be saved now, but missing required fields remain visible in the stage navigation.`}</p>
      <div class="veteran-final-actions no-print">
        <button id="veteran-attach" class="primary-action" type="button">Attach to Existing Character Sheet</button>
        <button id="veteran-export" class="secondary-action" type="button">Export Continuity JSON</button>
        <button id="veteran-print-record" class="secondary-action" type="button">Print Continuity Record</button>
      </div>
    </section>`;
  }

  function renderEntry() {
    const entry = getEntry();
    if (!entry) return;
    const index = activeIndex();
    ui.entry.innerHTML = `
      <p class="veteran-meta">${escapeHtml(entry.category || 'Veteran Reorientation')} · Stage ${index + 1} of ${state.entries.length}</p>
      <h2>${escapeHtml(entry.title)}</h2>
      <p class="veteran-summary">${escapeHtml(entry.summary || '')}</p>
      ${(entry.body || []).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      ${renderTables(entry.tables)}
      <section class="veteran-builder">
        <header class="veteran-builder-heading"><p class="veteran-meta">Returning operative record</p><h2>Record What Remains True</h2><p>Answers are saved locally. Charles records one response per field; editing a field replaces that response rather than creating duplicate transcript entries.</p></header>
        ${renderErrors()}
        ${(entry.prompts || []).map(renderPrompt).join('') || '<p class="veteran-status">This stage contains no required continuity fields.</p>'}
      </section>
      ${renderCharles(entry)}
      ${renderFinal()}`;

    attachEntryListeners(entry);
    ui.previous.disabled = index === 0;
    ui.next.disabled = index === state.entries.length - 1;
    ui.next.textContent = index === state.entries.length - 2 ? 'Save and Open Final Arrangement' : 'Save and Continue';
    updateNav();
    updateProgress();
  }

  function attachEntryListeners(entry) {
    ui.entry.querySelectorAll('[data-answer-id]').forEach(field => {
      field.addEventListener('input', () => {
        state.draft.answers[field.dataset.answerId] = field.value;
        saveDraft();
      });
      field.addEventListener('change', () => {
        const prompt = (entry.prompts || []).find(item => item.id === field.dataset.answerId);
        if (prompt) commitResponse(prompt);
        renderEntry();
      });
      field.addEventListener('blur', () => {
        const prompt = (entry.prompts || []).find(item => item.id === field.dataset.answerId);
        if (prompt) commitResponse(prompt);
        renderEntry();
      }, { once: true });
    });

    ui.entry.querySelectorAll('[data-radio-id]').forEach(field => field.addEventListener('change', () => {
      state.draft.answers[field.dataset.radioId] = field.value;
      const prompt = (entry.prompts || []).find(item => item.id === field.dataset.radioId);
      if (prompt) commitResponse(prompt);
      state.errors = [];
      renderEntry();
    }));

    ui.entry.querySelectorAll('[data-checkbox-id]').forEach(field => field.addEventListener('change', () => {
      const id = field.dataset.checkboxId;
      const selected = [...ui.entry.querySelectorAll(`[data-checkbox-id="${CSS.escape(id)}"]:checked`)].map(input => input.value);
      state.draft.answers[id] = selected;
      const prompt = (entry.prompts || []).find(item => item.id === id);
      if (prompt) commitResponse(prompt);
      state.errors = [];
      renderEntry();
    }));

    ui.entry.querySelectorAll('[data-acknowledge-id]').forEach(field => field.addEventListener('change', () => {
      state.draft.answers[field.dataset.acknowledgeId] = field.checked;
      const prompt = (entry.prompts || []).find(item => item.id === field.dataset.acknowledgeId);
      if (prompt) commitResponse(prompt);
      state.errors = [];
      renderEntry();
    }));

    document.getElementById('veteran-attach')?.addEventListener('click', attachToSheet);
    document.getElementById('veteran-export')?.addEventListener('click', exportRecord);
    document.getElementById('veteran-print-record')?.addEventListener('click', () => window.print());
  }

  function renderNav() {
    ui.nav.innerHTML = state.entries.map((entry, index) => `<button type="button" data-entry-id="${escapeHtml(entry.id)}" class="${entry.id === state.activeId ? 'active' : ''} ${entryComplete(entry) ? 'complete' : ''}"><span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(entry.title.replace(/^Reorientation\s+[^:]+:\s*/i, ''))}</strong><small>${escapeHtml(entry.category || '')}</small><b>${entryComplete(entry) ? '✓' : ''}</b></button>`).join('');
    ui.nav.querySelectorAll('[data-entry-id]').forEach(button => button.addEventListener('click', () => {
      markVisited();
      state.activeId = button.dataset.entryId;
      state.errors = [];
      saveDraft();
      renderEntry();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }));
  }

  function updateNav() {
    ui.nav.querySelectorAll('[data-entry-id]').forEach(button => {
      const entry = getEntry(button.dataset.entryId);
      button.classList.toggle('active', button.dataset.entryId === state.activeId);
      button.classList.toggle('complete', Boolean(entry && entryComplete(entry)));
      const mark = button.querySelector('b');
      if (mark) mark.textContent = entry && entryComplete(entry) ? '✓' : '';
    });
  }

  function updateProgress() {
    const completed = completedCount();
    const percentage = state.entries.length ? Math.round((completed / state.entries.length) * 100) : 0;
    ui.progressBar.style.width = `${percentage}%`;
    ui.progressText.textContent = `${completed} of ${state.entries.length} continuity stages complete · ${percentage}%`;
  }

  function validateEntry(entry) {
    return (entry.prompts || []).filter(prompt => !promptComplete(prompt)).map(prompt => prompt.label);
  }

  function move(direction) {
    const entry = getEntry();
    if (direction > 0) {
      const missing = validateEntry(entry);
      if (missing.length) {
        state.errors = missing;
        renderEntry();
        return;
      }
    }
    markVisited();
    const targetIndex = Math.max(0, Math.min(state.entries.length - 1, activeIndex() + direction));
    state.activeId = state.entries[targetIndex].id;
    state.errors = [];
    saveDraft();
    renderEntry();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function buildPlainRecord() {
    const lines = [
      state.source.title,
      `Saved: ${new Date().toISOString()}`,
      `Completed stages: ${completedCount()} / ${state.entries.length}`,
      ''
    ];
    state.entries.forEach(entry => {
      lines.push(entry.title);
      (entry.prompts || []).forEach(prompt => {
        const value = state.draft.answers[prompt.id];
        if (!answerText(value)) return;
        lines.push(`${prompt.label}\nOperative: ${answerText(value)}`);
        const response = state.draft.responses[prompt.id]?.response;
        if (response) lines.push(`Charles: ${response}`);
        lines.push('');
      });
    });
    return lines.join('\n');
  }

  function buildRecord() {
    return {
      schema: 'blacklight-veteran-reorientation',
      schemaVersion: '1.0.0',
      savedAt: new Date().toISOString(),
      title: state.source.title,
      completedStages: completedCount(),
      totalStages: state.entries.length,
      answers: state.draft.answers,
      responses: state.draft.responses,
      plainText: buildPlainRecord()
    };
  }

  function appendField(existing, addition, heading = '') {
    const first = String(existing || '').trim();
    const second = String(addition || '').trim();
    if (!second) return first;
    const formatted = heading ? `${heading}: ${second}` : second;
    if (!first) return formatted;
    if (first.includes(formatted)) return first;
    return `${first}\n\n${formatted}`;
  }

  function attachToSheet() {
    const record = buildRecord();
    localStorage.setItem(RECORD_KEY, JSON.stringify(record));
    const existing = readJson(SHEET_KEY, null);
    const sheet = existing && typeof existing === 'object' ? existing : {
      schema: 'blacklight-continuum-basic-character',
      schemaVersion: '0.1.0',
      savedAt: new Date().toISOString(),
      selectedPowers: [],
      fields: {}
    };
    sheet.fields = sheet.fields && typeof sheet.fields === 'object' ? sheet.fields : {};
    const answers = state.draft.answers;
    sheet.fields.affiliation = appendField(sheet.fields.affiliation, `BlackLight Company — ${summaryValue('companyStatus')}`);
    if (!String(sheet.fields.currentFunction || '').trim()) sheet.fields.currentFunction = summaryValue('companyFunction', '');
    sheet.fields.professionalObligation = appendField(sheet.fields.professionalObligation, answers.arrangementToDefend, 'Company principle I will defend');
    sheet.fields.personalBoundary = appendField(sheet.fields.personalBoundary, answers.authorityBoundary, 'Order I will refuse');
    sheet.fields.charlesSavedMe = appendField(sheet.fields.charlesSavedMe, answers.charlesSavedMe);
    sheet.fields.charlesNeverAnswered = appendField(sheet.fields.charlesNeverAnswered, answers.charlesNeverAnswered);
    sheet.fields.contacts = appendField(sheet.fields.contacts, answers.reportingRoute, 'Independent reporting route');
    sheet.fields.characterNotes = appendField(sheet.fields.characterNotes, `Veteran reorientation completed. Company status: ${summaryValue('companyStatus')}. Reason to continue: ${summaryValue('reasonToContinue')}. Legacy capability: ${summaryValue('legacyCapability')}. Legacy cost: ${summaryValue('legacyCost')}.`, 'BlackLight continuity summary');
    sheet.fields.veteranContinuityRecord = record.plainText;
    sheet.savedAt = new Date().toISOString();
    localStorage.setItem(SHEET_KEY, JSON.stringify(sheet));
    location.href = 'blacklight-character-sheet.html?from=veteran';
  }

  function exportRecord() {
    const record = buildRecord();
    localStorage.setItem(RECORD_KEY, JSON.stringify(record));
    const status = String(state.draft.answers.companyStatus || 'operative');
    const filename = `blacklight-${status.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'operative'}-continuity.json`;
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function resetReorientation() {
    if (!confirm('Clear the veteran reorientation, its answers, and Charles response record? The existing character sheet will not be deleted.')) return;
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(RECORD_KEY);
    state.draft = defaultDraft();
    state.activeId = state.entries[0]?.id || '';
    state.errors = [];
    renderNav();
    renderEntry();
  }

  async function initialize() {
    ui.nav = document.getElementById('veteran-nav');
    ui.entry = document.getElementById('veteran-entry');
    ui.previous = document.getElementById('veteran-previous');
    ui.next = document.getElementById('veteran-next');
    ui.progressBar = document.getElementById('veteran-progress-bar');
    ui.progressText = document.getElementById('veteran-progress-text');

    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Reorientation request failed with status ${response.status}.`);
      state.source = await response.json();
      state.entries = Array.isArray(state.source.entries) ? state.source.entries : [];
      if (!state.entries.length) throw new Error('The reorientation contains no stages.');
      state.draft = mergeDraft(readJson(DRAFT_KEY, null));
      state.activeId = state.entries.some(entry => entry.id === state.draft.activeId) ? state.draft.activeId : state.entries[0].id;

      renderNav();
      renderEntry();
      ui.previous.addEventListener('click', () => move(-1));
      ui.next.addEventListener('click', () => move(1));
      document.getElementById('veteran-reset')?.addEventListener('click', resetReorientation);
      document.getElementById('veteran-print-stage')?.addEventListener('click', () => window.print());
    } catch (error) {
      ui.nav.innerHTML = '<p class="veteran-status">The continuity index could not be loaded.</p>';
      ui.entry.innerHTML = `<p class="veteran-status">The veteran reorientation could not be loaded: ${escapeHtml(error.message)}</p>`;
      ui.previous.disabled = true;
      ui.next.disabled = true;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
