(() => {
  const SPELL_SCRIPT = 'module-spell-creator.js';
  const VIEW_ID = 'spells';

  function switchToSpellView(){
    document.querySelectorAll('.view').forEach(view=>view.classList.toggle('active',view.id===VIEW_ID));
    document.querySelectorAll('.nav-button').forEach(button=>button.classList.toggle('active',button.dataset.view===VIEW_ID));
    document.getElementById('spell-creator-root')?.scrollIntoView({block:'start'});
  }

  function addNavigation(){
    const nav=document.querySelector('.top-nav');
    if(nav&&!nav.querySelector('[data-view="spells"]')){
      const button=document.createElement('button');
      button.className='nav-button';
      button.dataset.view=VIEW_ID;
      button.textContent='Spell Creator';
      button.type='button';
      button.addEventListener('click',switchToSpellView);
      const modulesButton=nav.querySelector('[data-view="modules"]');
      if(modulesButton) modulesButton.insertAdjacentElement('afterend',button); else nav.appendChild(button);
    }

    const toolGrid=document.querySelector('#tools .menu-grid');
    if(toolGrid&&!toolGrid.querySelector('[data-view="spells"]')){
      const card=document.createElement('article');
      card.className='menu-card';
      card.innerHTML='<h3>Spell Creator</h3><p>Create serious, incompetent, overengineered, saintly, sinister, and cartoonishly evil spells with class, level, alignment, school, and theme controls.</p><button class="link-button" data-view="spells" type="button">Open Spell Creator</button>';
      card.querySelector('button').addEventListener('click',switchToSpellView);
      toolGrid.appendChild(card);
    }
  }

  function addView(){
    const main=document.querySelector('main');
    if(!main||document.getElementById(VIEW_ID)) return;
    const section=document.createElement('section');
    section.id=VIEW_ID;
    section.className='view';
    section.setAttribute('aria-labelledby','spells-title');
    section.innerHTML='<div class="hero-card no-print"><p class="eyebrow">Standalone generator module</p><h2 id="spells-title">Spell Creator</h2><p>Create and export spells independently from module maps, PDF extraction, dungeon generation, and map editing.</p></div><div id="spell-creator-root"></div>';
    const modules=document.getElementById('modules');
    if(modules) modules.insertAdjacentElement('afterend',section); else main.appendChild(section);
  }

  function loadSpellCreator(){
    if(document.querySelector(`script[src="${SPELL_SCRIPT}"]`)) return;
    const script=document.createElement('script');
    script.src=SPELL_SCRIPT;
    script.defer=true;
    document.body.appendChild(script);
  }

  function relocateSpellCreator(){
    const destination=document.getElementById('spell-creator-root');
    const creator=document.getElementById('module-spell-creator-root');
    if(destination&&creator&&creator.parentElement!==destination){
      creator.classList.remove('no-print');
      destination.appendChild(creator);
    }
  }

  function init(){
    addNavigation();
    addView();
    loadSpellCreator();
    relocateSpellCreator();
  }

  const observer=new MutationObserver(()=>{
    addNavigation();
    addView();
    relocateSpellCreator();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
