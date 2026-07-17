(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const chapters = globalThis.BlacklightExoFTLDossierChapters || {};

  function sectionKey(section) {
    const ids = [...section.querySelectorAll('[id]')].map(node => node.id);
    return ids.find(id => chapters[id]) || ids[0] || '';
  }

  function readableTitle(section) {
    return section.querySelector('.bli-section-head h2')?.textContent?.trim() || 'Technical record';
  }

  function ensureSectionId(section, index) {
    if (section.id) return section.id;
    const key = sectionKey(section) || `chapter-${index + 1}`;
    section.id = `charles-${key}`;
    return section.id;
  }

  function setCollapsed(section, collapsed) {
    section.classList.toggle('charles-collapsed', collapsed);
    const button = section.querySelector(':scope > .bli-section-head .charles-chapter-toggle');
    if (button) {
      button.setAttribute('aria-expanded', String(!collapsed));
      button.textContent = collapsed ? 'Open full record' : 'Collapse chapter';
    }
  }

  function decorate(section, index) {
    if (!section.querySelector(':scope > .bli-section-head')) return;
    const key = sectionKey(section);
    const chapter = chapters[key] || {
      eyebrow: 'Charles // retained technical record',
      title: readableTitle(section),
      brief: 'I have retained this material in full. Its placement and summary may change as the dossier is edited, but the underlying evidence, calculations, and engineering consequences remain available for review.',
      confidence: 'modeled'
    };
    const head = section.querySelector(':scope > .bli-section-head');
    const heading = head.querySelector('h2');
    const eyebrow = head.querySelector('.bli-eyebrow');
    if (heading && chapter.title) heading.textContent = chapter.title;
    if (eyebrow && chapter.eyebrow) eyebrow.textContent = chapter.eyebrow;

    section.classList.add('charles-dossier-section', `charles-confidence-${chapter.confidence || 'modeled'}`);
    ensureSectionId(section, index);

    let meta = head.querySelector('.charles-section-meta');
    if (!meta) {
      meta = document.createElement('div');
      meta.className = 'charles-section-meta';
      head.prepend(meta);
    }
    meta.replaceChildren();
    const chapterNumber = document.createElement('span');
    chapterNumber.textContent = `Chapter ${String(index + 1).padStart(2, '0')}`;
    const confidence = document.createElement('span');
    confidence.textContent = `${chapter.confidence || 'modeled'} record`;
    meta.append(chapterNumber, confidence);

    let brief = head.querySelector('.charles-section-brief');
    if (!brief) {
      brief = document.createElement('p');
      brief.className = 'charles-section-brief';
      head.append(brief);
    }
    brief.textContent = chapter.brief;

    let button = head.querySelector('.charles-chapter-toggle');
    if (!button) {
      button = document.createElement('button');
      button.className = 'charles-chapter-toggle';
      button.type = 'button';
      button.addEventListener('click', () => setCollapsed(section, !section.classList.contains('charles-collapsed')));
      head.append(button);
    }
    if (!section.dataset.charlesInitialState) {
      section.dataset.charlesInitialState = 'set';
      setCollapsed(section, Boolean(chapter.collapsed));
    } else {
      setCollapsed(section, section.classList.contains('charles-collapsed'));
    }
  }

  function allReportSections() {
    return [...document.querySelectorAll('main > .bli-section, main > section.bli-section')].filter(section => !section.hidden);
  }

  function buildIndex(sections) {
    const container = $('exo-ftl-dossier-index-links');
    if (!container) return;
    container.replaceChildren();
    sections.forEach((section, index) => {
      const link = document.createElement('a');
      link.href = `#${section.id}`;
      link.textContent = `${String(index + 1).padStart(2, '0')} · ${readableTitle(section)}`;
      container.append(link);
    });
  }

  function refresh() {
    const sections = allReportSections();
    sections.forEach(decorate);
    buildIndex(sections);
  }

  function setAll(open, annexesOnly = false) {
    for (const section of allReportSections()) {
      const key = sectionKey(section);
      if (annexesOnly && !chapters[key]?.collapsed) continue;
      setCollapsed(section, !open);
    }
  }

  $('exo-ftl-dossier-open-all')?.addEventListener('click', () => setAll(true));
  $('exo-ftl-dossier-close-annexes')?.addEventListener('click', () => setAll(false, true));
  document.addEventListener('blacklight:exo-ftl-generated', () => queueMicrotask(refresh));
  queueMicrotask(refresh);
})();
