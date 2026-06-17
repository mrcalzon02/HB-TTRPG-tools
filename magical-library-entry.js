(() => {
  function openGenerator() {
    window.open('magical-syllabus-library.html', '_blank', 'noopener');
  }

  function buildCard() {
    const generators = document.getElementById('generators');
    if (!generators || document.getElementById('magical-library-generator-card')) return;
    const grid = document.getElementById('kaysender-generators-grid');
    const card = document.createElement('article');
    card.id = 'magical-library-generator-card';
    card.className = 'module-card';
    card.innerHTML = `<div class="module-meta"><span class="badge section-generators">generator</span><span class="badge status-active">active</span><span class="badge">light and dark scholarship</span></div><h3>Magical Syllabus Library Generator</h3><p>Builds complete bibliographic shelves from every Arcane and Malefic Academic Studies discipline, from disposable ritual pamphlets to six-hundred-page devotional tomes and oversized concordances.</p><h4>Module capabilities</h4><div class="chip-list"><span class="chip">32 disciplines</span><span class="chip">320-title default</span><span class="chip">course-linked books</span><span class="chip">fictional publishers</span><span class="chip">page counts</span><span class="chip">JSON export</span></div><button type="button" class="primary-action" id="open-magical-library-generator">Open Magical Syllabus Library</button>`;
    card.querySelector('#open-magical-library-generator').addEventListener('click', openGenerator);
    if (grid) grid.insertAdjacentElement('beforebegin', card);
    else generators.appendChild(card);
  }

  const observer = new MutationObserver(buildCard);
  observer.observe(document.documentElement, { childList:true, subtree:true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildCard);
  else buildCard();
})();
