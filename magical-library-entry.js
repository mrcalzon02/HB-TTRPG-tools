(() => {
  function openGenerator() {
    window.open('magical-syllabus-library.html','_blank','noopener');
  }

  function buildCard() {
    const generators = document.getElementById('generators');
    if (!generators || document.getElementById('magical-library-generator-card')) return;
    const grid = document.getElementById('kaysender-generators-grid');
    const card = document.createElement('article');
    card.id = 'magical-library-generator-card';
    card.className = 'module-card';
    card.innerHTML = `<div class="module-meta"><span class="badge section-generators">generator</span><span class="badge status-active">active</span><span class="badge">publication profiles</span></div><h3>Magical Syllabus Library Generator</h3><p>Builds complete light-and-dark publication profiles from every Arcane and Malefic discipline, ranging from student-made pamphlets and loose-leaf study guides to priced, scented, rated, fully described devotional tomes and monumental concordances.</p><h4>Module capabilities</h4><div class="chip-list"><span class="chip">32 disciplines</span><span class="chip">320-profile default</span><span class="chip">author origins</span><span class="chip">prices and materials</span><span class="chip">seven ratings</span><span class="chip">JSON 2.0 export</span></div><button type="button" class="primary-action" id="open-magical-library-generator">Open Magical Syllabus Library</button>`;
    card.querySelector('#open-magical-library-generator').addEventListener('click',openGenerator);
    if (grid) grid.insertAdjacentElement('beforebegin',card);
    else generators.appendChild(card);
  }

  const observer = new MutationObserver(buildCard);
  observer.observe(document.documentElement,{ childList:true, subtree:true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',buildCard);
  else buildCard();
})();
