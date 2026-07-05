(() => {
  'use strict';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function injectStyles() {
    if (document.getElementById('blacklight-archive-classification-style')) return;
    const style = document.createElement('style');
    style.id = 'blacklight-archive-classification-style';
    style.textContent = `
      .blacklight-record-classification{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:9px;margin:14px 0 18px}
      .blacklight-record-classification div{border:1px solid rgba(217,168,79,.25);border-radius:12px;background:rgba(217,168,79,.07);padding:9px 10px;color:var(--muted);line-height:1.42}
      .blacklight-record-classification strong{display:block;color:var(--accent);font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px}
    `;
    document.head.appendChild(style);
  }

  function relabelArchiveHeadings(target) {
    if (!target) return;
    target.querySelectorAll('h4').forEach(heading => {
      if (heading.textContent === 'Player-Facing Information') heading.textContent = 'Employee-Facing Briefing Notes';
      if (heading.textContent === 'Game Moderator Notes') heading.textContent = 'Archive Custodian Notes';
    });
  }

  async function annotateCurrentEntry() {
    const target = document.querySelector('#blacklight-browser #blacklight-entry');
    const id = target?.dataset.entryId;
    relabelArchiveHeadings(target);
    if (!target || !id || target.dataset.classificationRenderedFor === id) return;
    const loader = window.BlacklightContinuumWorkspace?.loadWiki;
    if (typeof loader !== 'function') return;

    try {
      const data = await loader();
      const entry = (data.entries || []).find(item => item.id === id);
      if (!entry) return;
      target.querySelector('[data-blacklight-record-classification]')?.remove();
      const fields = [
        ['Clearance', entry.clearance],
        ['Information Rating', entry.informationRating],
        ['Source Credibility', entry.sourceCredibility],
        ['Record Status', entry.recordStatus],
        ['Maintained By', entry.maintainedBy]
      ].filter(([, value]) => value);
      if (!fields.length) {
        target.dataset.classificationRenderedFor = id;
        return;
      }

      const panel = document.createElement('section');
      panel.dataset.blacklightRecordClassification = 'true';
      panel.className = 'blacklight-record-classification';
      panel.innerHTML = fields.map(([label, value]) => `<div><strong>${escapeHtml(label)}</strong>${escapeHtml(value)}</div>`).join('');

      const summary = target.querySelector('h3')?.nextElementSibling;
      if (summary) summary.insertAdjacentElement('afterend', panel);
      else target.prepend(panel);
      target.dataset.classificationRenderedFor = id;
    } catch (error) {
      console.warn('Blacklight archive classification metadata could not be displayed.', error);
    }
  }

  function install() {
    injectStyles();
    void annotateCurrentEntry();
    const observer = new MutationObserver(() => void annotateCurrentEntry());
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  install();
})();
