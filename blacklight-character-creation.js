(() => {
  'use strict';

  const GUIDE_URL = 'data/blacklight-continuum/wiki/character-creation-guide.json';
  let entries = [];
  let activeId = '';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function renderTables(tables) {
    if (!Array.isArray(tables) || !tables.length) return '';
    return tables.map(table => `
      <h3>${escapeHtml(table.title || 'Reference')}</h3>
      <div class="creation-table-wrap">
        <table class="creation-table">
          <thead><tr>${(table.columns || []).map(column => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>
          <tbody>${(table.rows || []).map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>`).join('');
  }

  function renderEntry(entryId, options = {}) {
    const target = document.getElementById('creation-reader-entry');
    const entry = entries.find(item => item.id === entryId) || entries[0];
    if (!target || !entry) return;

    activeId = entry.id;
    target.innerHTML = `
      <div class="creation-reader-meta">${escapeHtml(entry.category || 'Character Creation')}</div>
      <h2>${escapeHtml(entry.title)}</h2>
      <p class="creation-reader-summary">${escapeHtml(entry.summary || '')}</p>
      ${(entry.body || []).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      ${renderTables(entry.tables)}
      ${entry.tags?.length ? `<p><strong>Tags:</strong> ${entry.tags.map(escapeHtml).join(' · ')}</p>` : ''}`;

    document.querySelectorAll('#creation-reader-nav button').forEach(button => {
      button.classList.toggle('active', button.dataset.entryId === activeId);
    });

    const previous = document.getElementById('creation-reader-previous');
    const next = document.getElementById('creation-reader-next');
    const index = entries.findIndex(item => item.id === entry.id);
    if (previous) previous.disabled = index <= 0;
    if (next) next.disabled = index < 0 || index >= entries.length - 1;
    if (!options.preserveScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function move(direction) {
    const index = entries.findIndex(entry => entry.id === activeId);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= entries.length) return;
    renderEntry(entries[nextIndex].id);
  }

  function renderNavigation() {
    const target = document.getElementById('creation-reader-nav');
    if (!target) return;
    target.innerHTML = '';
    entries.forEach((entry, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.entryId = entry.id;
      button.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.category || 'Character Creation')}</small>`;
      button.addEventListener('click', () => renderEntry(entry.id));
      target.appendChild(button);
    });
  }

  async function initialize() {
    document.getElementById('creation-reader-print')?.addEventListener('click', () => window.print());
    document.getElementById('creation-reader-previous')?.addEventListener('click', () => move(-1));
    document.getElementById('creation-reader-next')?.addEventListener('click', () => move(1));

    try {
      const response = await fetch(GUIDE_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Character creation guide request failed with status ${response.status}.`);
      const data = await response.json();
      entries = data.entries || [];
      if (!entries.length) throw new Error('Character creation guide contains no entries.');
      renderNavigation();
      renderEntry(entries[0].id, { preserveScroll: true });
    } catch (error) {
      console.error(error);
      const nav = document.getElementById('creation-reader-nav');
      const target = document.getElementById('creation-reader-entry');
      if (nav) nav.innerHTML = '<p class="creation-reader-status">The induction index could not be loaded.</p>';
      if (target) target.innerHTML = '<p class="creation-reader-status">Serve the project through GitHub Pages or a local web server to load the character creation guide.</p>';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else void initialize();
})();
