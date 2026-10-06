(() => {
  'use strict';

  function removeOpenClass(entry) {
    if (!entry?.className) return;
    const target = entry.target === 'html' ? document.documentElement : document.body;
    target.classList.remove(entry.className);
  }

  function promoteToPage(shell, config) {
    const root = document.getElementById('scientific-lab-runtime-root');
    if (!root || !shell) throw new Error('Dedicated laboratory page root is unavailable.');
    shell.hidden = false;
    shell.classList.add('scientific-lab-page-shell');
    shell.removeAttribute('role');
    shell.removeAttribute('aria-modal');
    const panel = config.panelSelector ? shell.querySelector(config.panelSelector) : null;
    if (panel) {
      panel.removeAttribute('role');
      panel.removeAttribute('aria-modal');
      panel.setAttribute('role', 'region');
    }
    for (const selector of config.removeSelectors || []) shell.querySelectorAll(selector).forEach(node => node.remove());
    for (const entry of config.openClasses || []) removeOpenClass(entry);
    root.replaceChildren(shell);
    document.body.classList.add('scientific-lab-page-ready');
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    return shell;
  }

  async function boot() {
    const config = window.ScientificLaboratoryPageConfig || {};
    const fallback = document.querySelector('[data-scientific-lab-fallback]');
    try {
      const api = window[config.apiName];
      if (!api) throw new Error(`${config.apiName || 'Laboratory API'} did not load.`);
      const method = config.openMethod || 'openPanel';
      if (typeof api[method] !== 'function') throw new Error(`${config.apiName}.${method} is unavailable.`);
      const shell = await api[method](config.options || {});
      promoteToPage(shell || document.getElementById(config.shellId), config);
    } catch (error) {
      console.error('Dedicated scientific laboratory page failed to initialize.', error);
      if (fallback) {
        fallback.hidden = false;
        const status = fallback.querySelector('[data-scientific-lab-status]');
        if (status) status.textContent = `Laboratory could not initialize: ${error.message}`;
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void boot(), { once: true });
  else void boot();
})();
