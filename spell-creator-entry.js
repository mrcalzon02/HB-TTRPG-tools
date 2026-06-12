(() => {
  const PAGE_URL='spell-creator.html';

  function openSpellCreator(){
    window.open(PAGE_URL,'_blank','noopener');
  }

  function buildModuleCard(){
    const generators=document.getElementById('generators');
    if(!generators||document.getElementById('spell-creator-generator-card')) return;

    const registryGrid=document.getElementById('kaysender-generators-grid');
    const card=document.createElement('article');
    card.id='spell-creator-generator-card';
    card.className='module-card';
    card.innerHTML=`
      <div class="module-meta">
        <span class="badge section-generators">generator</span>
        <span class="badge status-active">active</span>
        <span class="badge">standalone module</span>
      </div>
      <h3>Spell Creator</h3>
      <p>Create mechanically structured spells using expanded theme, class, effect, competence, complexity, morality, targeting, condition, component, and balance controls.</p>
      <h4>Module capabilities</h4>
      <div class="chip-list">
        <span class="chip">70+ entry modulation pools</span>
        <span class="chip">mechanics engine</span>
        <span class="chip">balance validator</span>
        <span class="chip">JSON export</span>
      </div>
      <button type="button" class="primary-action" id="open-spell-creator-module">Open Spell Creator</button>
    `;
    card.querySelector('#open-spell-creator-module').addEventListener('click',openSpellCreator);

    if(registryGrid) registryGrid.insertAdjacentElement('beforebegin',card);
    else generators.appendChild(card);
  }

  function removeEmbeddedCreator(){
    document.getElementById('spell-creator-generator-host')?.remove();
    document.getElementById('module-spell-creator-root')?.remove();
    document.getElementById('spell-creator-root')?.remove();
  }

  function init(){
    removeEmbeddedCreator();
    buildModuleCard();
  }

  const observer=new MutationObserver(()=>{
    removeEmbeddedCreator();
    buildModuleCard();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
