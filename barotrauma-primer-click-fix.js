(() => {
  const moduleSelector = '[data-module-id="barotrauma-crewmans-primer"]';
  const links = [
    {
      label: "Open Crewman's Primer Wiki",
      href: 'barotrauma-primer.html?mode=wiki',
      className: 'primary-action'
    },
    {
      label: 'Open Source Document Viewer',
      href: 'barotrauma-primer.html?mode=source',
      className: 'secondary-action'
    }
  ];

  function upgradePrimerControls() {
    const card = document.querySelector(moduleSelector);
    if (!card) return false;
    const actions = card.querySelector('.module-actions') || card;

    links.forEach(definition => {
      const existingLink = [...actions.querySelectorAll('a')].find(link => link.textContent.trim() === definition.label);
      if (existingLink) return;

      const oldButton = [...actions.querySelectorAll('button')].find(button => button.textContent.trim() === definition.label);
      const link = document.createElement('a');
      link.href = definition.href;
      link.className = definition.className;
      link.textContent = definition.label;
      link.setAttribute('data-primer-native-link', definition.href.includes('mode=source') ? 'source' : 'wiki');
      link.style.display = 'inline-flex';
      link.style.alignItems = 'center';
      link.style.justifyContent = 'center';
      link.style.textDecoration = 'none';

      if (oldButton) oldButton.replaceWith(link);
      else actions.appendChild(link);
    });

    return true;
  }

  const observer = new MutationObserver(() => upgradePrimerControls());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', upgradePrimerControls, { once: true });
  window.setTimeout(upgradePrimerControls, 0);
  window.setTimeout(upgradePrimerControls, 100);
  window.setTimeout(upgradePrimerControls, 500);
})();
