(() => {
  function open(){window.open('eccentric-spell-creator.html','_blank','noopener');}
  function build(){
    const generators=document.getElementById('generators');
    if(!generators||document.getElementById('eccentric-spell-generator-card'))return;
    const grid=document.getElementById('kaysender-generators-grid');
    const card=document.createElement('article');
    card.id='eccentric-spell-generator-card';
    card.className='module-card';
    card.innerHTML=`<div class="module-meta"><span class="badge section-generators">generator</span><span class="badge status-active">active</span><span class="badge">thematic module</span></div><h3>Eccentric Spell Generator</h3><p>Creates hilarious flavor-first spells using restored competence, complexity, and moral-tone systems, with oddity severity, suggested levels, secondary effects, knock-on effects, and lingering aftermath.</p><h4>Module capabilities</h4><div class="chip-list"><span class="chip">competence and complexity</span><span class="chip">moral tone</span><span class="chip">oddity severity</span><span class="chip">knock-on effects</span><span class="chip">aftereffects</span><span class="chip">thematic JSON export</span></div><button type="button" class="primary-action" id="open-eccentric-spell-module">Open Eccentric Spell Generator</button>`;
    card.querySelector('#open-eccentric-spell-module').addEventListener('click',open);
    if(grid)grid.insertAdjacentElement('beforebegin',card);else generators.appendChild(card);
  }
  const observer=new MutationObserver(build);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
