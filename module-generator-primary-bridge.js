(() => {
  'use strict';

  function integrate(){
    const host=document.getElementById('module-generator-root');
    const donjon=document.getElementById('module-random-dungeon-generator-root');
    if(!host||!donjon||donjon.dataset.primaryModuleGenerator==='true') return false;

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
    if(intro) intro.textContent='Generate the primary module layout using the Donjon-informed room, opening, corridor, stair, dead-end cleanup, and validation pipeline. Specialized site, alien-vessel, and Kaysender semantic variants remain available below as options inside this Generator authority.';

    document.dispatchEvent(new CustomEvent('module-primary-generator-integrated',{detail:{generator:'donjon-informed-topology'}}));
    return true;
  }

  const observer=new MutationObserver(()=>integrate());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',integrate); else integrate();
})();
