(() => {
  'use strict';

  function labelFor(value) {
    return String(value || '')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, character => character.toUpperCase());
  }

  function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function createButton(label, className, handler, pressed) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    if (pressed !== undefined) button.setAttribute('aria-pressed', String(Boolean(pressed)));
    button.addEventListener('click', handler);
    return button;
  }

  function renderScalar(value) {
    const span = document.createElement('span');
    span.className = 'npc-value';
    span.textContent = value === null || value === undefined || value === '' ? 'None' : String(value);
    return span;
  }

  function renderValue(value) {
    if (Array.isArray(value)) {
      if (!value.length) return renderScalar('None');
      const list = document.createElement('ul');
      list.className = 'npc-value-list';
      value.forEach(entry => {
        const item = document.createElement('li');
        item.appendChild(renderValue(entry));
        list.appendChild(item);
      });
      return list;
    }

    if (isObject(value)) {
      if ('state' in value) {
        const wrapper = document.createElement('span');
        wrapper.className = 'npc-stateful-value';
        const state = document.createElement('span');
        state.className = `npc-state npc-state-${String(value.state).replace(/[^a-z0-9-]/gi, '-')}`;
        state.textContent = labelFor(value.state);
        wrapper.appendChild(state);
        if ('value' in value) wrapper.append(' · ', renderValue(value.value));
        if (value.reason) wrapper.append(' · ', renderScalar(value.reason));
        return wrapper;
      }

      const list = document.createElement('dl');
      list.className = 'npc-nested-data';
      Object.entries(value).forEach(([key, entry]) => {
        const term = document.createElement('dt');
        term.textContent = labelFor(key);
        const description = document.createElement('dd');
        description.appendChild(renderValue(entry));
        list.append(term, description);
      });
      return list;
    }

    return renderScalar(value);
  }

  function lockButton(pointer, locks, onToggleLock, compact = false) {
    const locked = locks.has(pointer);
    return createButton(
      locked ? 'Unlock' : 'Lock',
      compact ? 'npc-mini-action' : 'secondary-action npc-section-action',
      () => onToggleLock(pointer),
      locked
    );
  }

  function renderDataFields(container, data, pointer, options) {
    const { locks, onToggleLock } = options;
    const list = document.createElement('dl');
    list.className = 'npc-profile-data';

    Object.entries(data || {}).forEach(([key, value]) => {
      const row = document.createElement('div');
      row.className = 'npc-profile-field';
      const term = document.createElement('dt');
      term.textContent = labelFor(key);
      const description = document.createElement('dd');
      description.appendChild(renderValue(value));
      const controls = document.createElement('div');
      controls.className = 'npc-field-controls no-print';
      controls.appendChild(lockButton(`${pointer}/data/${key}`, locks, onToggleLock, true));
      row.append(term, description, controls);
      list.appendChild(row);
    });

    if (!Object.keys(data || {}).length) {
      const empty = document.createElement('p');
      empty.className = 'npc-empty-value';
      empty.textContent = 'No detailed fields were generated for this section.';
      container.appendChild(empty);
      return;
    }

    container.appendChild(list);
  }

  function renderSection(sectionId, envelope, pointer, options) {
    const article = document.createElement('article');
    article.className = 'npc-profile-section';
    article.dataset.sectionId = sectionId;

    const header = document.createElement('header');
    header.className = 'npc-section-header';
    const titleWrap = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = labelFor(sectionId);
    const state = document.createElement('span');
    state.className = `npc-state npc-state-${String(envelope?.state || 'unknown').replace(/[^a-z0-9-]/gi, '-')}`;
    state.textContent = labelFor(envelope?.state || 'unknown');
    titleWrap.append(title, state);

    const actions = document.createElement('div');
    actions.className = 'npc-section-actions no-print';
    actions.append(
      createButton('Reroll section', 'secondary-action npc-section-action', () => options.onReroll(sectionId)),
      lockButton(pointer, options.locks, options.onToggleLock)
    );
    header.append(titleWrap, actions);
    article.appendChild(header);

    if (envelope?.reason) {
      const reason = document.createElement('p');
      reason.className = 'npc-section-reason';
      reason.textContent = envelope.reason;
      article.appendChild(reason);
    }
    if (envelope?.substituteSection) {
      const substitution = document.createElement('p');
      substitution.className = 'npc-substitution-note';
      substitution.textContent = `Replaced by ${labelFor(envelope.substituteSection)}.`;
      article.appendChild(substitution);
    }
    if (envelope?.state === 'present') renderDataFields(article, envelope.data || {}, pointer, options);
    return article;
  }

  function renderIdentity(identity, options) {
    return renderSection('identity', { state: 'present', data: identity || {} }, '/identity', options);
  }

  function renderDiagnostics(container, diagnostics) {
    container.innerHTML = '';
    const items = diagnostics || [];
    if (!items.length) {
      container.className = 'npc-diagnostics npc-diagnostics-clear';
      container.textContent = 'No generator diagnostics.';
      return;
    }

    container.className = 'npc-diagnostics';
    const heading = document.createElement('h3');
    heading.textContent = `Diagnostics (${items.length})`;
    const list = document.createElement('ul');
    items.forEach(item => {
      const row = document.createElement('li');
      row.className = `npc-diagnostic npc-diagnostic-${item.severity || 'info'}`;
      const code = document.createElement('code');
      code.textContent = item.code || 'GENERATOR_MESSAGE';
      row.append(code, document.createTextNode(` — ${item.message || 'No message supplied.'}`));
      if (item.path) {
        const path = document.createElement('small');
        path.textContent = item.path;
        row.appendChild(path);
      }
      list.appendChild(row);
    });
    container.append(heading, list);
  }

  function renderProfile(container, profile, options) {
    container.innerHTML = '';
    if (!profile) {
      const empty = document.createElement('div');
      empty.className = 'npc-profile-empty';
      empty.textContent = 'Generate an NPC to populate the profile workspace.';
      container.appendChild(empty);
      return;
    }

    const banner = document.createElement('header');
    banner.className = 'npc-profile-banner';
    const title = document.createElement('h2');
    title.textContent = profile.identity?.fullName || 'Unnamed NPC';
    const subtitle = document.createElement('p');
    subtitle.textContent = `${profile.archetype?.label || labelFor(profile.archetype?.id)} · ${labelFor(profile.identity?.ancestryId)} · ${labelFor(profile.identity?.ageBand)}`;
    const receipt = document.createElement('p');
    receipt.className = 'npc-profile-receipt';
    receipt.textContent = `Seed ${profile.generator?.seed || 'unknown'} · Pack ${profile.generator?.packId || 'unknown'} ${profile.generator?.packVersion || ''} · Profile ${profile.profileId || 'unassigned'}`;
    banner.append(title, subtitle, receipt);
    container.appendChild(banner);

    const grid = document.createElement('div');
    grid.className = 'npc-profile-grid';
    grid.appendChild(renderIdentity(profile.identity, options));

    Object.entries(profile.sections || {}).forEach(([sectionId, envelope]) => {
      if (sectionId === 'extensions') return;
      grid.appendChild(renderSection(sectionId, envelope, `/sections/${sectionId}`, options));
    });
    Object.entries(profile.sections?.extensions || {}).forEach(([sectionId, envelope]) => {
      grid.appendChild(renderSection(
        sectionId,
        envelope,
        `/sections/extensions/${sectionId}`,
        { ...options, onReroll: () => options.onReroll(`extension:${sectionId}`) }
      ));
    });
    container.appendChild(grid);
  }

  globalThis.NpcProfileGeneratorRenderer = Object.freeze({
    labelFor,
    renderValue,
    renderDiagnostics,
    renderProfile
  });
})();
