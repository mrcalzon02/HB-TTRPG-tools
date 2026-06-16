(() => {
  const SCHOOLS = ['Auto', 'Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];
  const RANDOM_OPTION = '<option value="random">Random</option>';
  const css = `
    .module-spell-creator{border:1px solid var(--line);border-radius:22px;padding:18px;background:rgba(255,255,255,.045);box-shadow:var(--shadow)}
    .msc-controls{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:10px}
    .msc-controls label{display:grid;gap:5px;font-size:.78rem;color:var(--muted)}
    .msc-controls select,.msc-controls input{width:100%;background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:10px;padding:9px}
    .msc-actions{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}
    .msc-actions button{border:1px solid var(--line);background:rgba(0,0,0,.2);color:var(--ink);border-radius:10px;padding:9px 11px;cursor:pointer}
    .msc-section-title{margin:20px 0 9px;color:var(--accent)}
    .msc-card{border:1px solid var(--line);border-radius:16px;padding:19px;background:rgba(0,0,0,.16);margin-top:14px}
    .msc-card h3{color:var(--accent);margin:0 0 8px;font-size:1.45rem}
    .msc-card h4{color:var(--accent);margin:19px 0 6px}
    .msc-card p{color:var(--muted);line-height:1.68;margin:7px 0}
    .msc-tag{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:3px 8px;margin:0 5px 6px 0;color:var(--muted);font-size:.75rem}
    .msc-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0}
    .msc-stat{border:1px solid var(--line);border-radius:10px;padding:9px;background:rgba(0,0,0,.15);color:var(--muted);line-height:1.45}
    .msc-balance{border-left:4px solid var(--accent);padding:10px 12px;background:rgba(200,138,53,.08);border-radius:8px;margin-top:16px;color:var(--muted)}
    .msc-warning{color:#ffb7aa}
    .msc-status{color:var(--muted);font-size:.84rem}
    .msc-audit{white-space:pre-wrap;max-height:280px;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:10px;background:#080a0f;color:var(--muted);font-size:.74rem}
    @media(max-width:980px){.msc-controls{grid-template-columns:1fr 1fr}.msc-stat-grid{grid-template-columns:1fr 1fr}}
    @media(max-width:620px){.msc-controls,.msc-stat-grid{grid-template-columns:1fr}}
  `;

  let results = [];
  const pick = values => values[Math.floor(Math.random() * values.length)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const objectOptions = (object, prefix = '') => prefix + Object.entries(object).map(([id, value]) => `<option value="${id}">${value.label}</option>`).join('');
  const valueOptions = (values, prefix = '') => prefix + values.map(value => `<option value="${value}">${value}</option>`).join('');
  const levelLabel = level => level === 0 ? 'Cantrip' : `Level ${level}`;

  function styleOnce() {
    if (document.getElementById('module-spell-creator-style')) return;
    const style = document.createElement('style');
    style.id = 'module-spell-creator-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function init() {
    const V = window.HBSpellVocabulary;
    const M = window.HBSpellMechanics;
    const host = document.getElementById('spell-creator-root');
    if (!V || !M || !host || document.getElementById('module-spell-creator-root')) return;
    styleOnce();

    const root = document.createElement('section');
    root.id = 'module-spell-creator-root';
    root.className = 'module-spell-creator';
    root.innerHTML = `
      <div class="section-heading">
        <p class="eyebrow">Standard generator</p>
        <h2>Spell Creator</h2>
        <p>Build complete table-ready spells with visible rules, caster-level scaling, damage or healing progression, targets, saves, spell resistance, components, durations, descriptions, tactical use, and balance diagnostics.</p>
      </div>
      <h3 class="msc-section-title">Spell identity</h3>
      <div class="msc-controls">
        <label>Theme<select id="msc-theme">${objectOptions(V.THEMES, RANDOM_OPTION)}</select></label>
        <label>Spell Level<select id="msc-level">${Array.from({ length: 10 }, (_, index) => `<option value="${index}">${levelLabel(index)}</option>`).join('')}</select></label>
        <label>Primary Class<select id="msc-class">${objectOptions(V.CLASSES, RANDOM_OPTION)}</select></label>
        <label>School<select id="msc-school">${valueOptions(SCHOOLS)}</select></label>
        <label>Quantity<input id="msc-quantity" type="number" min="1" max="20" value="1"></label>
      </div>
      <h3 class="msc-section-title">Mechanical package</h3>
      <div class="msc-controls">
        <label>Spell Role<select id="msc-role">${objectOptions(M.ROLES, RANDOM_OPTION)}</select></label>
        <label>Delivery Shape<select id="msc-shape">${objectOptions(M.SHAPES, RANDOM_OPTION)}</select></label>
        <label>Damage / Energy Type<select id="msc-damage">${valueOptions(M.DAMAGE_TYPES, RANDOM_OPTION)}</select></label>
        <label>Save / Attack<select id="msc-save">${valueOptions(M.SAVES)}</select></label>
        <label>Condition<select id="msc-condition">${valueOptions(M.CONDITIONS, RANDOM_OPTION)}</select></label>
        <label>Range<select id="msc-range">${objectOptions(M.RANGE_PROFILES)}</select></label>
        <label>Sustained Concentration<select id="msc-concentration"><option value="auto">Auto</option><option value="yes">Yes</option><option value="no">No</option></select></label>
        <label>Ritual / Long Casting<select id="msc-ritual"><option value="auto">Auto</option><option value="yes">Yes</option><option value="no">No</option></select></label>
        <label>Component Burden<select id="msc-component">${objectOptions(M.COMPONENT_BURDENS)}</select></label>
      </div>
      <div class="msc-actions">
        <button id="msc-generate" type="button">Generate Spells</button>
        <button id="msc-copy" type="button">Copy Full Spell Text</button>
        <button id="msc-export" type="button">Export JSON</button>
        <button id="msc-audit-toggle" type="button">Show Vocabulary Audit</button>
      </div>
      <p id="msc-status" class="msc-status">Ready.</p>
      <pre id="msc-audit" class="msc-audit" hidden></pre>
      <div id="msc-output"></div>
    `;
    host.appendChild(root);
    root.querySelector('#msc-generate').addEventListener('click', () => generate(root, V, M));
    root.querySelector('#msc-copy').addEventListener('click', () => copy(root));
    root.querySelector('#msc-export').addEventListener('click', () => exportJson(root));
    root.querySelector('#msc-audit-toggle').addEventListener('click', () => toggleAudit(root, V));
    generate(root, V, M);
  }

  function selectedId(object, id) {
    return id === 'random' ? pick(Object.keys(object)) : id;
  }

  function readMechanicalOptions(root, level, school, theme) {
    let damageType = root.querySelector('#msc-damage').value;
    if (damageType === 'random' && theme.descriptors?.length) damageType = pick(theme.descriptors);
    return {
      level,
      school,
      role: root.querySelector('#msc-role').value,
      shape: root.querySelector('#msc-shape').value,
      damageType,
      save: root.querySelector('#msc-save').value,
      condition: root.querySelector('#msc-condition').value,
      rangeKey: root.querySelector('#msc-range').value,
      concentration: root.querySelector('#msc-concentration').value,
      ritual: root.querySelector('#msc-ritual').value,
      componentBurden: root.querySelector('#msc-component').value
    };
  }

  function buildName(theme, mechanics) {
    const base = pick(theme.names);
    const roleSuffix = {
      damage: ['Lance', 'Burst', 'Bolt', 'Impact'],
      control: ['Binding', 'Command', 'Lock', 'Restraint'],
      defense: ['Aegis', 'Ward', 'Bulwark', 'Shelter'],
      healing: ['Renewal', 'Restoration', 'Mending', 'Recovery'],
      utility: ['Working', 'Formula', 'Method', 'Service'],
      summoning: ['Calling', 'Gate', 'Convergence', 'Assembly'],
      debuff: ['Curse', 'Weakening', 'Brand', 'Affliction'],
      buff: ['Mantle', 'Empowerment', 'Grace', 'Ascendance'],
      movement: ['Step', 'Passage', 'Stride', 'Transit'],
      divination: ['Sight', 'Revelation', 'Omen', 'Survey']
    }[mechanics.role] || ['Working'];
    return `${base} ${pick(roleSuffix)}`.replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1');
  }

  function makeSpell(V, M, controls) {
    const themeId = selectedId(V.THEMES, controls.themeId);
    const classId = selectedId(V.CLASSES, controls.classId);
    const theme = V.THEMES[themeId];
    const casterClass = V.CLASSES[classId];
    const school = controls.school === 'Auto' ? pick(casterClass.schools) : controls.school;
    const mechanics = M.buildMechanics(readMechanicalOptions(controls.root, controls.level, school, theme));
    const componentProfile = M.COMPONENT_BURDENS[mechanics.componentBurden];
    const materialComponent = mechanics.componentBurden === 'light' ? 'No separate material component is required.' : pick(V.GLOBAL.components);
    const name = buildName(theme, mechanics);
    const manifestation = `${pick(theme.visuals)} ${pick(theme.descriptions)}`;
    const practicalUse = `${pick(V.GLOBAL.practicalUses)} ${pick(casterClass.wording)}`;
    const origin = `${pick(theme.origins)} ${pick(V.GLOBAL.origins)}`;

    return {
      id: `spell-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name,
      theme: { id: themeId, label: theme.label },
      spellLevel: controls.level,
      class: { id: classId, label: casterClass.label },
      school,
      role: { id: mechanics.role, label: M.ROLES[mechanics.role].label },
      shape: { id: mechanics.shape, label: M.SHAPES[mechanics.shape].label },
      descriptors: [mechanics.damageType],
      castingTime: mechanics.castingTime,
      components: componentProfile.components,
      componentBurden: componentProfile.label,
      materialComponent,
      range: mechanics.range,
      target: mechanics.target,
      duration: mechanics.duration,
      savingThrow: mechanics.save,
      spellResistance: mechanics.spellResistance,
      condition: mechanics.condition,
      concentration: mechanics.concentration,
      ritual: mechanics.ritual,
      magnitude: mechanics.magnitude,
      description: { manifestation, practicalUse, origin },
      mechanicalEffect: mechanics.rulesText,
      casterLevelScaling: mechanics.scaling,
      balance: mechanics.balance
    };
  }

  function generate(root, V, M) {
    const controls = {
      root,
      themeId: root.querySelector('#msc-theme').value,
      classId: root.querySelector('#msc-class').value,
      school: root.querySelector('#msc-school').value,
      level: Number(root.querySelector('#msc-level').value),
      quantity: Math.max(1, Math.min(20, Number(root.querySelector('#msc-quantity').value) || 1))
    };
    results = Array.from({ length: controls.quantity }, () => makeSpell(V, M, controls));
    render(root);
    root.querySelector('#msc-status').textContent = `Generated ${controls.quantity} complete standard spell${controls.quantity === 1 ? '' : 's'} with visible mechanics and caster-level scaling.`;
  }

  function render(root) {
    root.querySelector('#msc-output').innerHTML = results.map(spell => {
      const tags = [spell.theme.label, levelLabel(spell.spellLevel), spell.class.label, spell.school, spell.role.label, spell.shape.label, ...spell.descriptors]
        .map(value => `<span class="msc-tag">${esc(value)}</span>`)
        .join('');
      const warnings = spell.balance.warnings.length
        ? `<ul>${spell.balance.warnings.map(warning => `<li class="msc-warning">${esc(warning)}</li>`).join('')}</ul>`
        : '<p>No automatic balance warnings were triggered.</p>';
      return `
        <article class="msc-card">
          <h3>${esc(spell.name)}</h3>
          <div>${tags}</div>
          <div class="msc-stat-grid">
            <div class="msc-stat"><strong>Spell Level</strong><br>${esc(levelLabel(spell.spellLevel))}</div>
            <div class="msc-stat"><strong>Class List</strong><br>${esc(spell.class.label)} ${spell.spellLevel}</div>
            <div class="msc-stat"><strong>School</strong><br>${esc(spell.school)} [${esc(spell.descriptors.join(', '))}]</div>
            <div class="msc-stat"><strong>Casting Time</strong><br>${esc(spell.castingTime)}</div>
            <div class="msc-stat"><strong>Components</strong><br>${esc(spell.components)}</div>
            <div class="msc-stat"><strong>Range</strong><br>${esc(spell.range)}</div>
            <div class="msc-stat"><strong>Target / Area</strong><br>${esc(spell.target)}</div>
            <div class="msc-stat"><strong>Duration</strong><br>${esc(spell.duration)}</div>
            <div class="msc-stat"><strong>Saving Throw</strong><br>${esc(spell.savingThrow)}</div>
            <div class="msc-stat"><strong>Spell Resistance</strong><br>${esc(spell.spellResistance)}</div>
            <div class="msc-stat"><strong>Primary Magnitude</strong><br>${esc(spell.magnitude.dice)} · cap ${esc(spell.magnitude.cap)}</div>
            <div class="msc-stat"><strong>Condition</strong><br>${esc(spell.condition)}</div>
          </div>
          <h4>Description and Manifestation</h4>
          <p>${esc(spell.description.manifestation)}</p>
          <h4>Mechanical Effect</h4>
          <p>${esc(spell.mechanicalEffect)}</p>
          <h4>Caster-Level Scaling</h4>
          <p>${esc(spell.casterLevelScaling)}</p>
          <h4>Components and Procedure</h4>
          <p><strong>${esc(spell.componentBurden)} burden:</strong> ${esc(spell.materialComponent)}</p>
          <h4>Practical Use</h4>
          <p>${esc(spell.description.practicalUse)}</p>
          <h4>Origin</h4>
          <p>${esc(spell.description.origin)}</p>
          <div class="msc-balance">
            <strong>Balance estimate: ${esc(spell.balance.band)}</strong> · score ${spell.balance.score} / expected ${spell.balance.expected}
            ${warnings}
          </div>
        </article>
      `;
    }).join('');
  }

  function spellText(spell) {
    return `${spell.name}
${levelLabel(spell.spellLevel)} ${spell.school} [${spell.descriptors.join(', ')}]
Class List: ${spell.class.label} ${spell.spellLevel}
Role: ${spell.role.label}
Delivery: ${spell.shape.label}
Casting Time: ${spell.castingTime}
Components: ${spell.components}
Range: ${spell.range}
Target / Area: ${spell.target}
Duration: ${spell.duration}
Saving Throw: ${spell.savingThrow}
Spell Resistance: ${spell.spellResistance}
Condition: ${spell.condition}

DESCRIPTION AND MANIFESTATION
${spell.description.manifestation}

MECHANICAL EFFECT
${spell.mechanicalEffect}

CASTER-LEVEL SCALING
${spell.casterLevelScaling}

COMPONENTS AND PROCEDURE
${spell.componentBurden}: ${spell.materialComponent}

PRACTICAL USE
${spell.description.practicalUse}

ORIGIN
${spell.description.origin}

BALANCE
${spell.balance.band} (${spell.balance.score}/${spell.balance.expected})${spell.balance.warnings.length ? `
Warnings: ${spell.balance.warnings.join(' | ')}` : ''}`;
  }

  async function copy(root) {
    try {
      await navigator.clipboard.writeText(results.map(spellText).join('\n\n====================\n\n'));
      root.querySelector('#msc-status').textContent = 'Complete spell text copied.';
    } catch (_) {
      root.querySelector('#msc-status').textContent = 'Clipboard unavailable.';
    }
  }

  function exportJson(root) {
    const blob = new Blob([JSON.stringify({ schemaVersion: '1.0.0', generator: 'standard-spell-creator', spells: results }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'generated-standard-spells.json';
    link.click();
    URL.revokeObjectURL(link.href);
    root.querySelector('#msc-status').textContent = 'Standard spell records exported.';
  }

  function toggleAudit(root, V) {
    const box = root.querySelector('#msc-audit');
    box.hidden = !box.hidden;
    if (!box.hidden) {
      box.textContent = `Vocabulary pools: ${Object.keys(V.counts).length}\n\n${Object.entries(V.counts).sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => `${name}: ${count}`).join('\n')}`;
    }
  }

  window.initStandaloneSpellCreator = init;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
