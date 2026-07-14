(() => {
  'use strict';

  const SOL_SEED = 'EXAMPLE:system:1';
  const $ = id => document.getElementById(id);
  let reapplyQueued = false;
  let syncQueued = false;

  function isSol() {
    return $('exo-seed-input')?.value.trim().toUpperCase() === SOL_SEED.toUpperCase();
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function requestPublishedRenderer() {
    if (reapplyQueued || !isSol()) return;
    reapplyQueued = true;
    setTimeout(() => {
      reapplyQueued = false;
      $('exo-seed-input')?.dispatchEvent(new Event('change', {bubbles:true}));
    }, 0);
  }

  function publishedTableIsActive() {
    const first = document.querySelector('#exo-orbital-table-body tr');
    return first?.dataset.objectId === 'planet-1' &&
      first.cells?.[1]?.textContent.trim().replace(/^↳\s*/, '') === 'Mercury';
  }

  function labelPublishedPlanets() {
    for (const target of document.querySelectorAll('#exo-orbit-objects .exo-planet-target')) {
      const name = target.getAttribute('aria-label')?.replace(/^Select\s+/i, '').trim();
      const label = target.querySelector('.exo-object-label');
      if (name && label) setText(label, name);
    }
    const star = document.querySelector('#exo-orbit-objects .exo-star-target');
    star?.setAttribute('aria-label', 'Select the Sun');
  }

  function forceConsumersToRebuild() {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(() => {
      syncQueued = false;
      const table = $('exo-orbital-table-body');
      if (!table || !isSol() || !publishedTableIsActive()) return;
      const marker = document.createComment('published-sol-authority-sync');
      table.append(marker);
      marker.remove();
      document.dispatchEvent(new CustomEvent('blacklight:sol-authority-synchronized'));
    });
  }

  function applyPresentation() {
    if (!isSol()) return;
    document.body.classList.add('exo-published-sol');
    setText($('exo-summary-name'), 'Sol System');
    setText($('exo-summary-star'), 'Sun · G2V yellow dwarf');
    setText($('exo-summary-planets'), '8');
    setText($('exo-summary-seed'), SOL_SEED);
    setText($('exo-orbit-title'), 'Sol System orbital projection');

    const selection = $('exo-selection-name');
    const inspector = $('exo-inspector-title');
    if (/^Aster\b/i.test(selection?.textContent || '') || /^Aster\b/i.test(inspector?.textContent || '')) {
      document.querySelector('#exo-orbit-objects .exo-star-target')
        ?.dispatchEvent(new MouseEvent('click', {bubbles:true}));
    }

    if (!publishedTableIsActive()) {
      requestPublishedRenderer();
      return;
    }
    labelPublishedPlanets();
    forceConsumersToRebuild();
  }

  function initialize() {
    const table = $('exo-orbital-table-body');
    const title = $('exo-orbit-title');
    const seed = $('exo-seed-input');
    if (!table || !title || !seed) {
      requestAnimationFrame(initialize);
      return;
    }

    document.addEventListener('blacklight:published-sol-rendered', () => {
      applyPresentation();
      requestAnimationFrame(applyPresentation);
    });
    $('exo-generate-system')?.addEventListener('click', () => setTimeout(applyPresentation, 0));
    seed.addEventListener('change', () => setTimeout(applyPresentation, 0));

    new MutationObserver(() => {
      if (!isSol()) return;
      if (!publishedTableIsActive()) requestPublishedRenderer();
      else {
        labelPublishedPlanets();
        forceConsumersToRebuild();
      }
    }).observe(table, {childList:true});

    new MutationObserver(() => {
      if (isSol()) {
        setText(title, 'Sol System orbital projection');
        setText($('exo-summary-name'), 'Sol System');
      }
    }).observe(title, {childList:true, characterData:true, subtree:true});

    applyPresentation();
  }

  initialize();
})();
