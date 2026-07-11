(() => {
  'use strict';

  const DOWNLOAD_PAGE = 'binary-cube-desktop.html';
  const TOOL_ID = 'shadowrun-binary-cube-encryption';

  function createLink(className = 'link-button') {
    const link = document.createElement('a');
    link.href = DOWNLOAD_PAGE;
    link.className = className;
    link.dataset.binaryCubeDesktopLink = 'true';
    link.textContent = 'Desktop Version';
    link.style.textDecoration = 'none';
    return link;
  }

  function enhanceModuleCard() {
    const card = document.querySelector(`[data-shadowrun-module="${TOOL_ID}"]`);
    if (!card || card.querySelector('[data-binary-cube-desktop-link]')) return;
    const action = card.querySelector(`[data-shadowrun-open="${TOOL_ID}"]`);
    const link = createLink(action?.className || 'link-button shadowrun-module-action');
    if (action) action.insertAdjacentElement('afterend', link);
    else card.appendChild(link);
  }

  function enhanceLaboratory() {
    const panel = document.getElementById('shadowrun-binary-cube-lab');
    const header = panel?.querySelector('.cube-lab-header');
    if (!header || header.querySelector('[data-binary-cube-desktop-link]')) return;
    const link = createLink('layout-button');
    link.textContent = 'Desktop Download';
    header.appendChild(link);
  }

  function enhance() {
    enhanceModuleCard();
    enhanceLaboratory();
  }

  const observer = new MutationObserver(enhance);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', enhance, { once: true }) : enhance();
})();
