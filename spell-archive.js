(() => {
  const INDEX_URL = 'data/kaysender/spells/spell-archive-index.json';
  const STORAGE_PREFIX = 'hb-ttrpg-spell-archive-v1-';
  let seededIndex = null;

  function injectStyles() {
    if (document.getElementById('spell-archive-style')) return;
    const style = document.createElement('style');
    style.id = 'spell-archive-style';
    style.textContent = `
      .spell-archive-shell { margin-top: 20px; border-top: 1px solid var(--line); padding-top: 16px; }
      .spell-archive-heading { display: flex; justify-content: space-between; align-items: end; gap: 12px; flex-wrap: wrap; }
      .spell-archive-heading h3 { margin: 0; color: var(--accent); }
      .spell-archive-heading p { margin: 4px 0 0; color: var(--muted); }
      .spell-archive-index { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-top: 12px; }
      .spell-archive-entry { border: 1px solid rgba(200,138,53,.28); background: rgba(255,255,255,.035); border-radius: 16px; padding: 13px; }
      .spell-archive-entry h4 { margin: 0 0 6px; color: var(--ink); }
      .spell-archive-meta { color: var(--muted); font-size: .76rem; margin-bottom: 10px; }
      .spell-archive-actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .spell-archive-actions button { width: auto; padding: 7px 10px; }
      .spell-archive-detail { margin-top: 14px; border: 1px solid var(--line); border-radius: 16px; padding: 15px; background: rgba(0,0,0,.2); }
      .spell-archive-detail h3 { color: var(--accent); margin-top: 0; }
      .spell-archive-detail-grid { display: grid; gap: 8px; }
      .spell-archive-detail-row { display: grid; grid-template-columns: minmax(130px,.35fr) minmax(0,1fr); gap: 12px; border-bottom: 1px solid rgba(255,255,255,.06); padding-bottom: 7px; }
      .spell-archive-detail-row strong { color: var(--ink); }
      .spell-archive-detail-row span { color: var(--muted); white-space: pre-wrap; }
      .spell-archive-toolbar { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0 4px; }
      .spell-archive-toolbar button { width: auto; }
      @media (max-width: 700px) { .spell-archive-detail-row { grid-template-columns: 1fr; gap: 3px; } }
    `;
    document.head.appendChild(style);
  }

  async function loadSeededIndex() {
    if (seededIndex) return seededIndex;
    try {
      const response = await fetch(INDEX_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Spell archive request failed: ${response.status}`);
      seededIndex = await response.json();
    } catch (_) {
      seededIndex = { archives: { normal: [], eccentric: [] } };
    }
    return seededIndex;
  }

  function detectArchiveType(panel) {
    if (panel.querySelector('#normal-spell-level')) return 'normal';
    if (panel.querySelector('#eccentric-oddity')) return 'eccentric';
    return null;
  }

  async function enhancePanel(panel) {
    const type = detectArchiveType(panel);
    if (!type) return;
    injectStyles();

    let toolbar = panel.querySelector('.spell-archive-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.className = 'spell-archive-toolbar';
      const archiveButton = document.createElement('button');
      archiveButton.type = 'button';
      archiveButton.className = 'secondary-action';
      archiveButton.textContent = 'Archive Current Spell';
      archiveButton.addEventListener('click', () => archiveCurrentSpell(panel, type));
      toolbar.appendChild(archiveButton);
      const output = panel.querySelector('.alpha-output');
      if (output) output.insertAdjacentElement('beforebegin', toolbar);
      else panel.appendChild(toolbar);
    }

    let shell = panel.querySelector('.spell-archive-shell');
    if (!shell) {
      shell = document.createElement('section');
      shell.className = 'spell-archive-shell';
      shell.innerHTML = `
        <div class="spell-archive-heading">
          <div><h3>${type === 'normal' ? 'Archived Functional Spells' : 'Archived Eccentric Spells'}</h3><p>Built-in samples and spells saved in this browser.</p></div>
        </div>
        <div class="spell-archive-index"></div>
        <div class="spell-archive-detail" hidden></div>
      `;
      panel.appendChild(shell);
    }

    await renderIndex(panel, type);
  }

  function readLocal(type) {
    try {
      const value = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${type}`) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function writeLocal(type, entries) {
    localStorage.setItem(`${STORAGE_PREFIX}${type}`, JSON.stringify(entries));
  }

  function archiveCurrentSpell(panel, type) {
    const card = panel.querySelector('.alpha-output .alpha-result-card');
    if (!card) {
      alert('Generate or open a spell before archiving it.');
      return;
    }

    const title = card.querySelector('h4')?.textContent?.trim() || 'Untitled Spell';
    const rows = Array.from(card.querySelectorAll('.alpha-kv')).map(row => ({
      label: row.querySelector('strong')?.textContent?.trim() || 'Detail',
      value: row.querySelector('span')?.textContent?.trim() || ''
    }));

    const entries = readLocal(type);
    entries.unshift({
      id: `local-${type}-${Date.now()}`,
      title,
      archiveType: type,
      status: 'browser archive',
      archivedAt: new Date().toISOString(),
      rows
    });
    writeLocal(type, entries.slice(0, 100));
    renderIndex(panel, type);
  }

  async function renderIndex(panel, type) {
    const shell = panel.querySelector('.spell-archive-shell');
    if (!shell) return;
    const indexNode = shell.querySelector('.spell-archive-index');
    const index = await loadSeededIndex();
    const seeded = index.archives?.[type] || [];
    const local = readLocal(type);
    const entries = [...seeded, ...local];

    indexNode.innerHTML = '';
    if (!entries.length) {
      indexNode.innerHTML = '<p class="spell-generator-note">No archived spells yet.</p>';
      return;
    }

    entries.forEach(entry => {
      const article = document.createElement('article');
      article.className = 'spell-archive-entry';
      const variant = entry.coreVariantOf ? `Variant of ${entry.coreVariantOf}` : entry.school || entry.style || 'Generated spell';
      article.innerHTML = `<h4>${escapeHtml(entry.title)}</h4><div class="spell-archive-meta">${escapeHtml(entry.status || 'archive')} · ${escapeHtml(variant)}</div>`;
      const actions = document.createElement('div');
      actions.className = 'spell-archive-actions';

      const openButton = document.createElement('button');
      openButton.type = 'button';
      openButton.className = 'secondary-action';
      openButton.textContent = 'Open';
      openButton.addEventListener('click', () => openEntry(panel, type, entry));
      actions.appendChild(openButton);

      if (String(entry.id).startsWith('local-')) {
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'secondary-action';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => {
          writeLocal(type, readLocal(type).filter(item => item.id !== entry.id));
          renderIndex(panel, type);
          const detail = shell.querySelector('.spell-archive-detail');
          detail.hidden = true;
        });
        actions.appendChild(deleteButton);
      }

      article.appendChild(actions);
      indexNode.appendChild(article);
    });
  }

  function openEntry(panel, type, entry) {
    const shell = panel.querySelector('.spell-archive-shell');
    const detail = shell?.querySelector('.spell-archive-detail');
    if (!detail) return;
    const rows = entry.rows || (type === 'normal' ? normalRows(entry) : eccentricRows(entry));
    detail.hidden = false;
    detail.innerHTML = `<h3>${escapeHtml(entry.title)}</h3><div class="spell-archive-detail-grid">${rows.map(row => detailRow(row.label, row.value)).join('')}</div>`;
    detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function normalRows(entry) {
    const effect = entry.effect || {};
    const composition = entry.composition || {};
    const scaling = entry.levelScaling || {};
    return [
      { label: 'School', value: entry.school },
      { label: 'Classes', value: objectPairs(entry.classes) },
      { label: 'Descriptors', value: (entry.descriptors || []).join(', ') },
      { label: 'Alignment / element', value: `${entry.alignment}; ${entry.element}` },
      { label: 'Components', value: `${entry.components}. ${entry.materialComponent || ''}` },
      { label: 'Casting time', value: entry.castingTime },
      { label: 'Range', value: entry.range },
      { label: 'Target', value: entry.target },
      { label: 'Duration', value: entry.duration },
      { label: 'Saving throw', value: entry.savingThrow },
      { label: 'Spell resistance', value: entry.spellResistance },
      { label: 'Attack type', value: entry.attackType },
      { label: 'Summoned composition', value: `${composition.summonedCreature} Size ${composition.size}; space ${composition.space}; mass ${composition.weightEquivalent}. ${composition.substance}` },
      { label: 'Creature agency', value: `${composition.sentience} ${composition.disposition}` },
      { label: 'Effect', value: effect.summary },
      { label: 'Primary damage', value: effect.primaryDamage },
      { label: 'Huge-size impact', value: effect.sizeImpactDamage },
      { label: 'Damage progression', value: `${effect.minimumDamage} ${effect.maximumDamage}` },
      { label: 'Damage type', value: effect.damageType },
      { label: 'Objects and barriers', value: `${effect.objectDamage} ${effect.trajectory}` },
      { label: 'Secondary collision', value: effect.secondaryCollision },
      { label: 'Knockdown', value: effect.knockdown },
      { label: 'Empty-square targeting', value: effect.missOrEmptySquare },
      { label: 'Level scaling', value: Object.values(scaling).join(' ') },
      { label: 'Balance notes', value: (entry.balanceNotes || []).join(' ') }
    ];
  }

  function eccentricRows(entry) {
    return [
      { label: 'Core variant', value: entry.coreVariantOf },
      { label: 'Creator', value: entry.creator },
      { label: 'Oddity', value: entry.oddity },
      { label: 'Style', value: entry.style },
      { label: 'Required nonsense', value: entry.requiredNonsense },
      { label: 'Manifestation', value: entry.manifestation },
      { label: 'Mechanical posture', value: entry.mechanicalPosture },
      { label: 'Side effect', value: entry.sideEffect },
      { label: 'Rumored origin', value: entry.rumoredOrigin },
      { label: 'GM use', value: entry.gmUse }
    ];
  }

  function objectPairs(value) {
    return Object.entries(value || {}).map(([key, item]) => `${key} ${item}`).join(', ');
  }

  function detailRow(label, value) {
    return `<div class="spell-archive-detail-row"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(String(value ?? ''))}</span></div>`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character]));
  }

  function scan() {
    const panel = document.getElementById('kaysender-alpha-panel');
    if (panel) enhancePanel(panel);
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', scan);
  setInterval(scan, 1200);
})();