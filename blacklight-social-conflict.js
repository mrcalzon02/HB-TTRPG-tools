(() => {
  'use strict';

  const MODULE_URL = 'data/blacklight-continuum/wiki/social-conflict-example.json';
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
      <h3>${escapeHtml(table.title || 'Table')}</h3>
      <div class="social-table-wrap">
        <table class="social-table">
          <thead><tr>${(table.columns || []).map(column => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>
          <tbody>${(table.rows || []).map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>`).join('');
  }

  function renderEntry(entryId) {
    const target = document.getElementById('social-reader-entry');
    const entry = entries.find(item => item.id === entryId) || entries[0];
    if (!target || !entry) return;
    activeId = entry.id;
    target.innerHTML = `
      <div class="social-reader-meta">${escapeHtml(entry.category || 'Social Conflict')}</div>
      <h2>${escapeHtml(entry.title)}</h2>
      <p class="social-reader-summary">${escapeHtml(entry.summary || '')}</p>
      ${(entry.body || []).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      ${renderTables(entry.tables)}
      ${entry.tags?.length ? `<p><strong>Tags:</strong> ${entry.tags.map(escapeHtml).join(' · ')}</p>` : ''}`;
    document.querySelectorAll('#social-reader-nav button').forEach(button => {
      button.classList.toggle('active', button.dataset.entryId === activeId);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderNavigation() {
    const target = document.getElementById('social-reader-nav');
    if (!target) return;
    target.innerHTML = '';
    entries.forEach(entry => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.entryId = entry.id;
      button.innerHTML = `<strong>${escapeHtml(entry.title)}</strong><br><small>${escapeHtml(entry.category || 'Social Conflict')}</small>`;
      button.addEventListener('click', () => renderEntry(entry.id));
      target.appendChild(button);
    });
  }

  async function initialize() {
    document.getElementById('social-reader-print')?.addEventListener('click', () => window.print());
    try {
      const response = await fetch(MODULE_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Social conflict module request failed with status ${response.status}.`);
      const data = await response.json();
      entries = data.entries || [];
      if (!entries.length) throw new Error('Social conflict module contains no entries.');
      renderNavigation();
      renderEntry(entries.find(entry => entry.id === 'worked-social-conflict-richard')?.id || entries[0].id);
    } catch (error) {
      console.error(error);
      const nav = document.getElementById('social-reader-nav');
      const target = document.getElementById('social-reader-entry');
      if (nav) nav.innerHTML = '<p class="social-reader-status">The social conflict module could not be loaded.</p>';
      if (target) target.innerHTML = '<p class="social-reader-status">Serve the project through GitHub Pages or a local web server to load the social conflict guide.</p>';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else void initialize();
})();
