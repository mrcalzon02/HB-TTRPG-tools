(() => {
  function openGenerator() {
    window.open('arcane-academic-studies.html', '_blank', 'noopener');
  }

  function buildCard() {
    const generators = document.getElementById('generators');
    if (!generators || document.getElementById('arcane-academic-generator-card')) return;
    const grid = document.getElementById('kaysender-generators-grid');
    const card = document.createElement('article');
    card.id = 'arcane-academic-generator-card';
    card.className = 'module-card';
    card.innerHTML = `<div class="module-meta"><span class="badge section-generators">generator</span><span class="badge status-active">active</span><span class="badge">worldbuilding</span></div><h3>Arcane Academic Studies Generator</h3><p>Creates magical universities, departments, credentials, term sequences, course catalogues, syllabi, laboratories, assignments, examinations, required texts, hazards, and capstone requirements.</p><h4>Module capabilities</h4><div class="chip-list"><span class="chip">course titles</span><span class="chip">complete curricula</span><span class="chip">tests and practicals</span><span class="chip">study materials</span><span class="chip">academic hazards</span><span class="chip">JSON export</span></div><button type="button" class="primary-action" id="open-arcane-academic-generator">Open Arcane Academic Studies</button>`;
    card.querySelector('#open-arcane-academic-generator').addEventListener('click', openGenerator);
    if (grid) grid.insertAdjacentElement('beforebegin', card);
    else generators.appendChild(card);
  }

  const observer = new MutationObserver(buildCard);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildCard);
  else buildCard();
})();
