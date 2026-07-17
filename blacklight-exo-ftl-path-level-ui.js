(() => {
  'use strict';

  const $=id=>document.getElementById(id);
  const FTL=globalThis.BlacklightExoFTL;

  function makeSection(id,eyebrow,title,anchorId){
    let container=$(id);
    if(container)return container;
    const anchor=$(anchorId)?.closest('.bli-section');
    if(!anchor)return null;
    const section=document.createElement('section');
    section.className='bli-section exo-ftl-path-section';
    const head=document.createElement('div');head.className='bli-section-head';
    const small=document.createElement('p');small.className='bli-eyebrow';small.textContent=eyebrow;
    const heading=document.createElement('h2');heading.textContent=title;
    container=document.createElement('div');container.id=id;container.className='exo-ftl-grid';
    head.append(small,heading);section.append(head,container);anchor.after(section);
    return container;
  }

  function makeHierarchy(){
    let container=$('exo-ftl-path-hierarchy');
    if(container)return container;
    const anchor=$('exo-ftl-hierarchy')?.closest('.bli-section');
    if(!anchor)return null;
    const section=document.createElement('section');
    section.className='bli-section exo-ftl-path-section';
    const head=document.createElement('div');head.className='bli-section-head';
    const small=document.createElement('p');small.className='bli-eyebrow';small.textContent='Drive-family development path';
    const heading=document.createElement('h2');heading.textContent='Progress from monumental precursor machinery to the mature form of this specific transit technology.';
    container=document.createElement('div');container.id='exo-ftl-path-hierarchy';container.className='exo-ftl-hierarchy';
    head.append(small,heading);section.append(head,container);anchor.after(section);
    return container;
  }

  function card(label,title,text,state=''){
    const article=document.createElement('article');article.className='exo-ftl-card';
    if(state)article.dataset.pathState=state;
    const small=document.createElement('small'),heading=document.createElement('h3'),paragraph=document.createElement('p');
    small.textContent=label;heading.textContent=title;paragraph.textContent=text;
    article.append(small,heading,paragraph);return article;
  }

  function renderCards(container,rows){
    if(!container)return;
    container.replaceChildren(...rows.map(row=>card(...row)));
  }

  function formatC(range){
    return range[1]<1
      ?`${(range[0]*100).toFixed(4)}–${(range[1]*100).toFixed(3)}% c`
      :`${range[0].toLocaleString()}–${range[1].toLocaleString()}c`;
  }

  function addBadge(text){
    const badges=$('exo-ftl-badges');if(!badges)return;
    const old=[...badges.children].find(node=>node.dataset.pathLevelBadge==='true');
    old?.remove();
    const span=document.createElement('span');span.dataset.pathLevelBadge='true';span.textContent=text;badges.append(span);
  }

  function addRating(label,value){
    const data=$('exo-ftl-rating-data');if(!data)return;
    data.querySelectorAll('[data-path-rating="true"]').forEach(node=>node.remove());
    const dt=document.createElement('dt'),dd=document.createElement('dd');
    dt.dataset.pathRating='true';dd.dataset.pathRating='true';dt.textContent=label;dd.textContent=value;data.append(dt,dd);
  }

  function renderHierarchy(rating){
    const container=makeHierarchy();if(!container)return;
    container.replaceChildren();
    for(const level of rating.pathHierarchy){
      const article=document.createElement('article');
      article.className='exo-ftl-tier-card';
      article.dataset.status=level.status;
      article.dataset.pathStatus=level.status;
      const small=document.createElement('small'),heading=document.createElement('h3'),paragraph=document.createElement('p');
      small.textContent=`Path ${level.rank} · ${level.status}`;
      heading.textContent=level.name;
      paragraph.textContent=`${level.label}. Speed ${level.speedRange}; range ${level.range}; charge ${level.spool}. Installation: ${level.installation}. Energy: ${level.energyMultiplier}, typically ${level.recommendedEnergy}. Breakthrough: ${level.breakthrough} Utility: ${level.utility} Limitation: ${level.limitation}`;
      article.append(small,heading,paragraph);container.append(article);
    }
  }

  function render(rating){
    if(!rating?.pathLevel||!rating.pathHierarchy)return;
    const level=rating.pathLevel;
    addBadge(`Path ${level.rank} · ${level.label}`);
    addRating('Drive-path level',`Path ${level.rank} · ${level.architectureName}`);

    const overview=makeSection('exo-ftl-path-overview','Current path maturity','The selected drive family at its present technological level, including the apparatus required to make it useful.','exo-ftl-performance');
    renderCards(overview,[
      ['Distinct technology path',level.pathLabel,`${rating.identity.family} is being evaluated as its own technological lineage rather than as a cosmetic variant of the shared FTL tier.`],
      ['Current path architecture',`Path ${level.rank} · ${level.architectureName}`,`${level.label}. Development installation: ${level.developmentInstallation}.`],
      ['Development apparatus mass',level.facilityMassText,'This is the field plant, launch structure, gatework, containment system, metrology array, or supporting machinery—not necessarily the transported payload mass.'],
      ['Path speed envelope',formatC(level.speedRangeC),`Generated practical rating ${rating.performance.cStatus.label}; ${rating.performance.practicalAuPerHour.toLocaleString(undefined,{maximumFractionDigits:5})} AU/hour under the selected route conditions.`],
      ['Path range envelope',`${FTL.format.distanceText(level.rangeAU[0])} to ${FTL.format.distanceText(level.rangeAU[1])}`,`Current certified single-transit range ${rating.range.certifiedText}.`],
      ['Charge and recovery burden',level.chargeWindow,`Expected recovery window ${level.recoveryWindow}; current generated spool ${rating.performance.spoolText} and cooldown ${rating.performance.cooldownText}.`],
      ['Recommended energy progression',level.recommendedEnergy,`Generated installation currently uses ${rating.identity.energySystem}; path maturity applies a ${rating.energyBudget.pathEnergyMultiplier.toFixed(3)}× energy burden.`],
      ['Principal breakthrough',level.breakthrough,level.utility],
      ['Persistent limitation',level.limitation,level.commonLimit]
    ]);

    const utility=makeSection('exo-ftl-path-utility','Minimum useful capability','Even the crude precursor must justify its existence against an ordinary chemical-propulsion mission.','exo-ftl-path-overview');
    const comparison=level.chemicalComparison;
    renderCards(utility,[
      ['Chemical comparison standard',`${comparison.benchmarkKmPerSecond} km/s cruise-equivalent`,`Compared over ${comparison.benchmarkDistanceText}. Chemical mission time ${comparison.chemicalMissionText}; path-level complete mission ${comparison.pathMissionText}.`],
      ['Mission advantage',`${comparison.missionAdvantage.toFixed(2)}× chemical mission rate`,comparison.conclusion,comparison.missionAdvantage>1?'useful':'limited'],
      ['Cruise or route-equivalent advantage',`${comparison.cruiseVelocityAdvantage.toLocaleString(undefined,{maximumFractionDigits:2})}× chemical benchmark`,`This compares the generated route-equivalent velocity before charge and recovery overhead.`],
      ['Minimum economical route',`${comparison.minimumEconomicAU} AU`,`Below this distance, a monolithic or slowly charging precursor may lose to conventional propulsion even though it dominates long-distance movement.`],
      ['Operational reason to build it','Strategic usefulness',`${level.utility} ${level.commonUtility}`]
    ]);

    renderHierarchy(rating);
  }

  document.addEventListener('blacklight:exo-ftl-generated',event=>render(event.detail?.rating));
  queueMicrotask(()=>render(globalThis.BlacklightExoGetActiveFTL?.()));
})();
