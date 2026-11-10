(() => {
  'use strict';

  // A content script, not a page script. No API token, network API calls, or
  // background worker: image URLs come from the existing GitHub file links.
  const GALLERY_ID = 'gh-image-gallery';
  const IMAGE_EXT = /\.(?:apng|png|jpe?g|gif|webp|avif|svg|bmp|ico)$/i;
  const ROW_SELECTOR = '[role="row"], tr, .react-directory-row';
  const ROOT_SELECTOR = 'main, #repo-content-pjax-container';
  const SIZE_LABELS = { small: 'Small', medium: 'Medium', large: 'Large' };
  const state = { signature: '', size: 'medium', gallery: null, scheduled: false };

  function isFolderURL() {
    const path = location.pathname.split('/').filter(Boolean);
    return path.length === 2 || (path.length >= 4 && path[2] === 'tree');
  }

  function parseFileLink(anchor) {
    if (!anchor || anchor.closest('#' + GALLERY_ID)) return null;
    if (anchor.closest('article, .markdown-body, #readme, [data-testid="readme"]')) return null;
    const row = anchor.closest(ROW_SELECTOR);
    if (!row) return null; // Exclude links in navigation and README text.

    let url;
    try { url = new URL(anchor.href, location.href); } catch { return null; }
    if (url.origin !== location.origin) return null;

    const segments = url.pathname.split('/').filter(Boolean);
    const fileName = segments.at(-1) || '';
    if (segments.length < 5 || segments[2] !== 'blob' || !IMAGE_EXT.test(fileName)) return null;

    // Keep only repository file links in the directory listing.  A row's link
    // text must be the filename (unlike cross-references in other UI panels).
    let displayName;
    try { displayName = decodeURIComponent(fileName); } catch { displayName = fileName; }
    if (anchor.textContent.trim() !== displayName) return null;
    const current = location.pathname.split('/').filter(Boolean);
    if (segments[0] !== current[0] || segments[1] !== current[1]) return null;

    const table = row.closest('[role="table"], [role="grid"], table, .react-directory-table')
      || row.parentElement?.parentElement;
    if (!table || !table.parentElement) return null;

    // GitHub's /blob/ URL is already resolved to its exact branch or commit;
    // /raw/ serves the bytes without an intermediate file-preview page.
    const raw = new URL(url.href);
    raw.pathname = raw.pathname.replace('/blob/', '/raw/');
    raw.search = '';
    raw.hash = '';
    const fallback = new URL(url.href);
    fallback.hostname = 'raw.githubusercontent.com';
    fallback.pathname = fallback.pathname.replace('/blob/', '/');
    fallback.search = '';
    fallback.hash = '';

    return { name: displayName, href: url.href, src: raw.href, fallback: fallback.href, table };
  }

  function findImages() {
    const root = document.querySelector(ROOT_SELECTOR);
    if (!root) return [];
    const files = [];
    const seen = new Set();
    for (const anchor of root.querySelectorAll('a[href*="/blob/"]')) {
      const item = parseFileLink(anchor);
      if (item && !seen.has(item.href)) {
        files.push(item);
        seen.add(item.href);
      }
    }
    // Guard against an isolated link in a non-directory GitHub component.
    return files;
  }

  function removeGallery() {
    state.gallery?.remove();
    state.gallery = null;
    state.signature = '';
  }

  function makeButton(label, title, onClick, pressed) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ghig-button';
    button.textContent = label;
    if (title) button.title = title;
    if (pressed !== undefined) button.setAttribute('aria-pressed', String(pressed));
    button.addEventListener('click', onClick);
    return button;
  }

  function applySize() {
    if (!state.gallery) return;
    state.gallery.dataset.size = state.size;
    for (const button of state.gallery.querySelectorAll('[data-ghig-size]')) {
      button.setAttribute('aria-pressed', String(button.dataset.ghigSize === state.size));
    }
  }

  function createGallery(items) {
    const outer = document.createElement('section');
    outer.id = GALLERY_ID;
    outer.dataset.size = state.size;
    outer.setAttribute('aria-label', 'GitHub image gallery');

    const bar = document.createElement('div');
    bar.className = 'ghig-toolbar';
    const title = document.createElement('div');
    title.className = 'ghig-heading';
    title.textContent = `Images (${items.length})`;
    bar.append(title);

    const controls = document.createElement('div');
    controls.className = 'ghig-controls';
    const sizeLabel = document.createElement('span');
    sizeLabel.className = 'ghig-control-label';
    sizeLabel.textContent = 'Thumbnails';
    controls.append(sizeLabel);
    for (const [key, label] of Object.entries(SIZE_LABELS)) {
      const button = makeButton(label, `${label} thumbnails`, () => {
        state.size = key;
        applySize();
      }, key === state.size);
      button.dataset.ghigSize = key;
      controls.append(button);
    }
    const collapse = makeButton('Hide gallery', 'Collapse gallery, leaving the original GitHub list intact', () => {
      const hidden = outer.classList.toggle('ghig-collapsed');
      collapse.textContent = hidden ? 'Show gallery' : 'Hide gallery';
      collapse.setAttribute('aria-expanded', String(!hidden));
    });
    collapse.classList.add('ghig-collapse');
    collapse.setAttribute('aria-expanded', 'true');
    controls.append(collapse);
    bar.append(controls);
    outer.append(bar);

    const grid = document.createElement('div');
    grid.className = 'ghig-grid';
    for (const item of items) {
      const card = document.createElement('a');
      card.className = 'ghig-card';
      card.href = item.href;
      card.title = `Open ${item.name} on GitHub`;

      const frame = document.createElement('span');
      frame.className = 'ghig-image-frame';
      const image = document.createElement('img');
      image.alt = item.name;
      image.src = item.src;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.setAttribute('fetchpriority', 'low');
      image.addEventListener('error', () => {
        if (image.dataset.fallback !== 'attempted') {
          image.dataset.fallback = 'attempted';
          image.src = item.fallback;
          return;
        }
        image.hidden = true;
        frame.classList.add('ghig-load-error');
        frame.textContent = 'Image unavailable';
      });
      frame.append(image);
      card.append(frame);

      const filename = document.createElement('span');
      filename.className = 'ghig-filename';
      filename.textContent = item.name;
      card.append(filename);
      grid.append(card);
    }
    outer.append(grid);
    return outer;
  }

  function scan() {
    state.scheduled = false;
    if (!isFolderURL()) {
      removeGallery();
      return;
    }
    const images = findImages();
    if (images.length === 0) {
      removeGallery();
      return;
    }
    const signature = `${location.pathname}|${images.map(x => x.href).join('|')}`;
    const target = images[0].table;
    if (state.signature === signature && state.gallery?.isConnected && state.gallery.nextElementSibling === target) {
      return;
    }
    const gallery = createGallery(images);
    state.gallery?.remove();
    target.before(gallery);
    state.gallery = gallery;
    state.signature = signature;
  }

  function scheduleScan() {
    if (state.scheduled) return;
    state.scheduled = true;
    // GitHub's React/Turbo navigations may replace the file list asynchronously.
    setTimeout(scan, 85);
  }

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('popstate', scheduleScan);
  addEventListener('pageshow', scheduleScan);
  document.addEventListener('turbo:render', scheduleScan);
  document.addEventListener('turbo:load', scheduleScan);
  document.addEventListener('pjax:end', scheduleScan);
  scheduleScan();
})();
