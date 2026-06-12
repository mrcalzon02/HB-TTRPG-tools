(() => {
  const VOCAB_SCRIPT = 'spell-creator-vocabulary.js';
  const MECHANICS_SCRIPT = 'spell-creator-mechanics.js';
  const SPELL_SCRIPT = 'module-spell-creator.js';

  function loadScriptOnce(src){
    if(document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=src;
      script.defer=true;
      script.onload=resolve;
      script.onerror=()=>reject(new Error(`Could not load ${src}`));
      document.body.appendChild(script);
    });
  }

  function ensureGeneratorRoot(){
    const generators=document.getElementById('generators');
    if(!generators) return null;
    let host=document.getElementById('spell-creator-generator-host');
    if(!host){
      host=document.createElement('section');
      host.id='spell-creator-generator-host';
      host.className='registry-section no-print';
      host.innerHTML='<div class="section-heading"><p class="eyebrow">General generator</p><h2>Spell Creator</h2><p>Create spells by theme, level, alignment, class, school, competence, complexity, moral tone, role, delivery shape, condition, damage type, and component burden. This generator is independent from module maps.</p></div><div id="spell-creator-root"></div>';
      generators.appendChild(host);
    }
    return host.querySelector('#spell-creator-root');
  }

  async function init(){
    const root=ensureGeneratorRoot();
    if(!root) return;
    try{
      await loadScriptOnce(VOCAB_SCRIPT);
      await loadScriptOnce(MECHANICS_SCRIPT);
      await loadScriptOnce(SPELL_SCRIPT);
      window.initStandaloneSpellCreator?.();
    }catch(error){
      root.innerHTML=`<p class="helper-note">Spell Creator failed to load: ${error.message}</p>`;
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
