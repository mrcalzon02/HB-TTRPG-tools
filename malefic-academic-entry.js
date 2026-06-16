(() => {
  function openGenerator() {
    window.open('malefic-academic-studies.html', '_blank', 'noopener');
  }

  function buildCard() {
    const generators = document.getElementById('generators');
    if (!generators || document.getElementById('malefic-academic-generator-card')) return;
    const grid = document.getElementById('kaysender-generators-grid');
    const card = document.createElement('article');
    card.id = 'malefic-academic-generator-card';
    card.className = 'module-card';
    card.innerHTML = `<div class="module-meta"><span class="badge section-generators">generator</span><span class="badge status-active">active</span><span class="badge">evil worldbuilding</span></div><h3>Malefic Academic Studies Generator</h3><p>Creates hidden cult schools, infernal seminaries, abyssal universities, evil credentials, forbidden syllabi, ritual practicals, examinations, patrons, taboos, soul hazards, and Black Doctorates.</p><h4>Module capabilities</h4><div class="chip-list"><span class="chip">cult crash courses</span><span class="chip">demonology degrees</span><span class="chip">occult curricula</span><span class="chip">ritual examinations</span><span class="chip">forbidden texts</span><span class="chip">JSON export</span></div><button type="button" class="primary-action" id="open-malefic-academic-generator">Open Malefic Academic Studies</button>`;
    card.querySelector('#open-malefic-academic-generator').addEventListener('click', openGenerator);
    if (grid) grid.insertAdjacentElement('beforebegin', card);
    else generators.appendChild(card);
  }

  const observer = new MutationObserver(buildCard);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildCard);
  else buildCard();
})();
