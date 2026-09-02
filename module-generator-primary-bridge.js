(() => {
  'use strict';

  const REFERENCE_PRESETS=[
    ['medium','Medium examples · 51 × 51',51,51],
    ['forsaken','Forsaken Prison · 51 × 65',51,65],
    ['veteck','Veteck family · 73 × 65',73,65],
    ['gargantuan','Lyran Research · 91 × 91',91,91]
  ];

  function enhancePresets(donjon){
    const select=donjon.querySelector('#mdg-preset');
    const width=donjon.querySelector('#mdg-width');
    const height=donjon.querySelector('#mdg-height');
    if(!select||!width||!height||select.dataset.referenceCorpusPresets==='true') return;
    for(const [value,label] of REFERENCE_PRESETS){
      if(select.querySelector(`option[value="${value}"]`)) continue;
      const option=document.createElement('option'); option.value=value; option.textContent=label; select.insertBefore(option,select.querySelector('option[value="custom"]'));
    }
    select.addEventListener('change',()=>{
      const preset=REFERENCE_PRESETS.find(([value])=>value===select.value);
      if(!preset) return;
      width.value=preset[2]; height.value=preset[3];
      const min=donjon.querySelector('#mdg-room-min'); const max=donjon.querySelector('#mdg-room-max');
      if(min) min.value=3; if(max) max.value=preset[2]>=73?11:9;
    });
    select.dataset.referenceCorpusPresets='true';
  }

  function integrate(){
    const host=document.getElementById('module-generator-root');
    const donjon=document.getElementById('module-random-dungeon-generator-root');
    if(!host||!donjon) return false;
    enhancePresets(donjon);
    if(donjon.dataset.primaryModuleGenerator==='true') return true;

    const legacy=[...host.children].filter(node=>node!==donjon);
    const details=document.createElement('details');
    details.id='module-specialized-generator-variants';
    details.className='no-print';
    details.innerHTML='<summary>Specialized semantic generator variants</summary><div class="module-specialized-generator-body"></div>';
    const body=details.querySelector('.module-specialized-generator-body');
    legacy.forEach(node=>body.appendChild(node));

    host.innerHTML='';
    donjon.dataset.primaryModuleGenerator='true';
    donjon.classList.remove('no-print');
    donjon.style.marginTop='0';
    host.appendChild(donjon);
    if(legacy.length) host.appendChild(details);

    const title=donjon.querySelector('.section-heading h2');
    if(title) title.textContent='Random Module Generator — Donjon Topology';
    const intro=donjon.querySelector('.section-heading p:not(.eyebrow)');
    if(intro) intro.textContent='Generate the primary module layout using the Donjon room, opening, corridor, stair, dead-end cleanup, and validation sequence. Reference-corpus size presets reproduce the working scales represented in the library. Specialized site, alien-vessel, and Kaysender semantic variants remain available below inside this Generator authority.';

    document.dispatchEvent(new CustomEvent('module-primary-generator-integrated',{detail:{generator:'donjon-informed-topology'}}));
    return true;
  }

  const observer=new MutationObserver(()=>integrate());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',integrate); else integrate();
})();
