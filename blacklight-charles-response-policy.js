(() => {
  'use strict';

  const LOG_KEY = 'hb-ttrpg-tools-blacklight-charles-induction-log-v1';
  const TRANSCRIPT_KEY = 'hb-ttrpg-tools-blacklight-charles-induction-transcript-v1';
  const RESPONSE_ROTATION_MS = 10 * 60 * 1000;
  const RESPONSE_VARIANTS = 4;
  const nativeGetItem = Storage.prototype.getItem;
  const nativeSetItem = Storage.prototype.setItem;
  let renderQueued = false;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function readEntries() {
    try {
      const parsed = JSON.parse(nativeGetItem.call(localStorage, LOG_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function responseFrame(rawResponse, cycle) {
    const response = String(rawResponse || '').trim();
    if (!response) return '';
    switch (cycle % RESPONSE_VARIANTS) {
      case 1:
        return `For the current record: ${response}`;
      case 2:
        return `After review: ${response}`;
      case 3:
        return `My present assessment: ${response}`;
      default:
        return response;
    }
  }

  function isGenericResponse(response) {
    const text = String(response || '');
    return text.includes('above several executive directives')
      || text.includes('I am not endorsing the judgment')
      || text.includes('Specific, usable, and therefore much more dangerous')
      || text.includes('The mission will determine how expensive that belief is');
  }

  function genericResponse(label, answer, cycle) {
    const fieldLabel = String(label || 'Recorded Field');
    const fieldAnswer = String(answer || '(cleared)');
    switch (cycle % RESPONSE_VARIANTS) {
      case 1:
        return `I have entered “${fieldAnswer}” under ${fieldLabel}. I am not endorsing the judgment. I am confirming that the judgment is now attributable.`;
      case 2:
        return `${fieldLabel}: “${fieldAnswer}.” Specific, usable, and therefore much more dangerous than a vague intention. Good.`;
      case 3:
        return `Recorded. “${fieldAnswer}.” The sentence tells me what you believe. The mission will determine how expensive that belief is.`;
      default:
        return `${fieldLabel} recorded: “${fieldAnswer}.” Clear enough to act on. That already places it above several executive directives I have received.`;
    }
  }

  function transcriptText(entries) {
    return entries.map((entry, index) => [
      `BLACKLIGHT INDUCTION RECORD ${String(index + 1).padStart(2, '0')} — ${entry.stageTitle || 'Blacklight Induction'}`,
      `OPERATIVE — ${entry.label || entry.field || 'Recorded Field'}:`,
      entry.answer || '(cleared)',
      'CHARLES:',
      entry.response || ''
    ].join('\n')).join('\n\n');
  }

  function latestPerField(entries) {
    const latest = new Map();
    entries.forEach(entry => {
      if (!entry || typeof entry !== 'object' || !entry.field) return;
      if (latest.has(entry.field)) latest.delete(entry.field);
      latest.set(entry.field, { ...entry });
    });
    return [...latest.values()];
  }

  function normalizeEntries(incoming, previous = readEntries(), now = Date.now()) {
    const previousByField = new Map(latestPerField(previous).map(entry => [entry.field, entry]));
    return latestPerField(incoming).map(entry => {
      const prior = previousByField.get(entry.field);
      const incomingResponse = String(entry.rawResponse || entry.response || prior?.rawResponse || prior?.response || '').trim();
      const responseKind = prior?.responseKind || (isGenericResponse(incomingResponse) ? 'generic' : 'specific');
      let responseCycle = Number.isInteger(prior?.responseCycle) ? prior.responseCycle : 0;
      let responseCycleAt = Date.parse(prior?.responseCycleAt || prior?.recordedAt || '') || now;

      if (prior && now - responseCycleAt >= RESPONSE_ROTATION_MS) {
        const elapsedCycles = Math.max(1, Math.floor((now - responseCycleAt) / RESPONSE_ROTATION_MS));
        responseCycle = (responseCycle + elapsedCycles) % RESPONSE_VARIANTS;
        responseCycleAt += elapsedCycles * RESPONSE_ROTATION_MS;
      }

      const rawResponse = responseKind === 'generic'
        ? incomingResponse
        : incomingResponse;
      const renderedResponse = responseKind === 'generic'
        ? genericResponse(entry.label || prior?.label, entry.answer || prior?.answer, responseCycle)
        : responseFrame(rawResponse, responseCycle);

      return {
        ...entry,
        id: prior?.id || entry.id || `${entry.field}-${now}`,
        rawResponse,
        response: renderedResponse,
        responseKind,
        responseCycle,
        responseCycleAt: new Date(responseCycleAt).toISOString(),
        recordedAt: entry.recordedAt || prior?.recordedAt || new Date(now).toISOString()
      };
    });
  }

  function persist(entries) {
    nativeSetItem.call(localStorage, LOG_KEY, JSON.stringify(entries));
    nativeSetItem.call(localStorage, TRANSCRIPT_KEY, transcriptText(entries));
  }

  Storage.prototype.setItem = function setItemWithCharlesFieldPolicy(key, value) {
    if (this === localStorage && key === LOG_KEY) {
      let incoming = [];
      try {
        const parsed = JSON.parse(String(value));
        incoming = Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        incoming = [];
      }
      persist(normalizeEntries(incoming));
      scheduleRender();
      return;
    }

    if (this === localStorage && key === TRANSCRIPT_KEY) {
      nativeSetItem.call(localStorage, TRANSCRIPT_KEY, transcriptText(readEntries()));
      return;
    }

    nativeSetItem.call(this, key, value);
  };

  function currentStage() {
    return document.querySelector('#creation-reader-nav button.active')?.dataset.entryId || '';
  }

  function renderStoredResponses() {
    renderQueued = false;
    const panel = document.querySelector('[data-charles-response-panel]');
    if (!panel) return;

    const entries = readEntries();
    const quote = panel.querySelector('#charles-current-response');
    const context = panel.querySelector('#charles-response-context');
    const count = panel.querySelector('#charles-transcript-count');
    const history = panel.querySelector('#charles-transcript-history');
    const latest = entries[entries.length - 1];

    if (latest?.stage === currentStage() && quote && quote.textContent !== latest.response) {
      quote.textContent = latest.response;
    }
    if (latest?.stage === currentStage() && context) {
      const nextContext = `${latest.label || latest.field} updated in the operative induction record.`;
      if (context.textContent !== nextContext) context.textContent = nextContext;
    }
    if (count) count.textContent = `(${entries.length})`;

    if (history) {
      const nextHistory = entries.length
        ? entries.slice().reverse().map(entry => `<article><span>${escapeHtml(entry.stageTitle)} · ${escapeHtml(entry.label)}</span><p><strong>Operative:</strong> ${escapeHtml(entry.answer)}</p><p><strong>Charles:</strong> ${escapeHtml(entry.response)}</p></article>`).join('')
        : '<p>No answers have been recorded yet.</p>';
      if (history.innerHTML !== nextHistory) history.innerHTML = nextHistory;
    }
  }

  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    window.requestAnimationFrame(renderStoredResponses);
  }

  function rotateDueResponses() {
    const current = readEntries();
    if (!current.length) return;
    const normalized = normalizeEntries(current, current);
    const changed = normalized.some((entry, index) => entry.responseCycle !== current[index]?.responseCycle || entry.response !== current[index]?.response);
    if (!changed) return;
    persist(normalized);
    scheduleRender();
  }

  function initialize() {
    const existing = readEntries();
    if (existing.length) persist(normalizeEntries(existing, existing));

    const root = document.getElementById('creation-reader-entry');
    if (root) {
      new MutationObserver(scheduleRender).observe(root, { childList: true, subtree: true, characterData: true });
    }

    window.setInterval(rotateDueResponses, 60 * 1000);
    scheduleRender();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
