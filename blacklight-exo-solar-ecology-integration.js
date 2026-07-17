(() => {
  'use strict';

  const HANDOFF_KEY = 'blacklight-exo-selected-world-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const core = globalThis.BlacklightExoEcology;
  if (!core) return;

  const cache = globalThis.BlacklightExoEcologyClusterCache instanceof Map ? globalThis.BlacklightExoEcologyClusterCache : new Map();
  globalThis.BlacklightExoEcologyClusterCache = cache;

  function objectById(system,id) {
    if (!system) return null;
    if (id === 'star') return system.star;
    for (const body of system.planets || []) {
      if (body.id === id) return body;
      const moon=(body.moons||[]).find(item=>item.id===id);if(moon)return moon;
    }
    return [...(system.belts||[]),...(system.facilities||[])].find(item=>item.id===id)||null;
  }

  function currentSelectedId() {
    return document.querySelector('#exo-orbital-table-body tr[aria-selected="true"]')?.dataset.objectId || document.querySelector('.exo-selected')?.dataset.objectId || 'star';
  }

  function addNavLink() {
    const nav=document.querySelector('.bli-nav');if(!nav||nav.querySelector('a[href="blacklight-exo-alien-ecology.html"]'))return;
    const link=document.createElement('a');link.href='blacklight-exo-alien-ecology.html';link.textContent='Alien Ecology';nav.insertBefore(link,nav.lastElementChild);
  }

  function updateResourceIndex(system) {
    const grid=document.getElementById('exo-resource-index');if(!grid||!system?.ecologySummary)return;
    let card=grid.querySelector('[data-ecology-resource]');
    if(!card){card=document.createElement('div');card.className='exo-resource-item';card.dataset.ecologyResource='true';card.innerHTML='<strong>0</strong><span>Ecology-bearing worlds</span>';grid.append(card);}
    card.querySelector('strong').textContent=String(system.ecologySummary.activeEcology||0);
  }

  function updateButton(system,selectedId=currentSelectedId()) {
    const button=document.getElementById('exo-develop-world');if(!button)return;
    const object=objectById(system,selectedId);const eligible=Boolean(object&&['planet','dwarf-planet','moon'].includes(object.kind));
    button.textContent='Develop Selected World Ecology';button.hidden=!eligible;
    const note=button.parentElement?.querySelector('p');if(note)note.textContent='Available for every planet, dwarf planet, and moon. Physical provenance, existing biosphere evidence, population, species, and ruin records remain attached during ecology generation.';
  }

  function decorateInspector(system,id=currentSelectedId()) {
    const object=objectById(system,id);const data=document.getElementById('exo-inspector-data');if(!object||!data)return;
    data.querySelectorAll('[data-ecology-row]').forEach(node=>node.remove());
    const badges=document.getElementById('exo-inspector-badges');
    let ecologyBadge=badges?.querySelector('[data-ecology-badge]');
    const profile=object.ecology;
    if(!profile){ecologyBadge?.remove();return;}
    for(const [label,value] of [
      ['Ecological state',profile.classification.finalLabel],['Native ecology',profile.classification.nativeLabel],['Civilizational overlay',profile.classification.overlayLabel],['Ecological complexity',`${profile.complexity.index}/100 · ${profile.complexity.stage}`],['Dominant environment',profile.environment.label]
    ]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.dataset.ecologyRow='true';dd.dataset.ecologyRow='true';dt.textContent=label;dd.textContent=value;data.append(dt,dd);}
    if(badges&&!ecologyBadge){ecologyBadge=document.createElement('span');ecologyBadge.dataset.ecologyBadge='true';badges.append(ecologyBadge);}
    if(ecologyBadge)ecologyBadge.textContent=profile.classification.finalLabel;
  }

  function enrichActiveSystem() {
    const system=globalThis.BlacklightExoGetActiveSystem?.();if(!system)return null;
    core.enrichSystem(system,{seed:system.seed});
    system.resourceTotals.biospheres=(system.ecologySummary.living||0)+(system.ecologySummary.pseudo||0);
    cache.set(system.seed,clone(system.ecologySummary));
    updateResourceIndex(system);updateButton(system);decorateInspector(system);
    document.dispatchEvent(new CustomEvent('blacklight:ecology-system-enriched',{detail:{seed:system.seed,summary:clone(system.ecologySummary)}}));
    return system;
  }

  function openEcology(event) {
    const button=event.target.closest?.('#exo-develop-world');if(!button)return;
    const system=globalThis.BlacklightExoGetActiveSystem?.();const selectedId=currentSelectedId();const object=objectById(system,selectedId);
    if(!object||!['planet','dwarf-planet','moon'].includes(object.kind))return;
    event.preventDefault();event.stopImmediatePropagation();
    const ecology=object.ecology||core.generate({seed:`${system.seed}:ecology:${object.id}`,world:object,system});
    object.ecology=ecology;
    const payload={version:1,systemSeed:system.seed,dossierSeed:`${system.seed}:ecology:${object.id}`,environment:'temperate terrestrial',system:clone(system),selectedWorld:clone(object),ecology:clone(ecology),source:'solar'};
    localStorage.setItem(HANDOFF_KEY,JSON.stringify(payload));
    location.href=`blacklight-exo-alien-ecology.html?source=solar&systemSeed=${encodeURIComponent(system.seed)}&worldId=${encodeURIComponent(object.id)}`;
  }

  document.addEventListener('click',openEcology,true);
  document.addEventListener('blacklight:system-rendered',enrichActiveSystem);
  document.addEventListener('blacklight:object-selected',event=>queueMicrotask(()=>{const system=globalThis.BlacklightExoGetActiveSystem?.();updateButton(system,event.detail?.id);decorateInspector(system,event.detail?.id);}));
  addNavLink();enrichActiveSystem();
})();