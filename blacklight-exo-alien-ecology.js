(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const SOURCE_KEY = 'blacklight-exo-selected-world-v1';
  const ECOLOGY_KEY = 'blacklight-exo-ecology-handoff-v1';
  const COLLAPSE_KEY = 'blacklight-exo-collapse-context-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const controls = {
    generate:$('exo-ecology-generate'),export:$('exo-ecology-export'),continue:$('exo-ecology-continue'),seed:$('exo-ecology-seed'),
    classification:$('exo-ecology-classification'),occupancy:$('exo-ecology-occupancy'),environment:$('exo-ecology-environment'),chemistry:$('exo-ecology-chemistry'),complexity:$('exo-ecology-complexity')
  };
  if (!controls.generate || !globalThis.BlacklightExoEcology) return;

  const ui = {
    summaryWorld:$('exo-ecology-summary-world'),summaryState:$('exo-ecology-summary-state'),summaryNative:$('exo-ecology-summary-native'),summaryComplexity:$('exo-ecology-summary-complexity'),
    source:$('exo-ecology-source'),sourceTitle:$('exo-ecology-source-title'),sourceBody:$('exo-ecology-source-body'),name:$('exo-ecology-name'),summary:$('exo-ecology-summary'),
    stateStack:$('exo-ecology-state-stack'),badges:$('exo-ecology-badges'),rating:$('exo-ecology-rating'),ratingSummary:$('exo-ecology-rating-summary'),meter:$('exo-ecology-meter-fill'),data:$('exo-ecology-data'),
    chemistryGrid:$('exo-ecology-chemistry-grid'),nicheGrid:$('exo-ecology-niche-grid'),organismGrid:$('exo-ecology-organism-grid'),foodWeb:$('exo-ecology-food-web'),symbioses:$('exo-ecology-symbioses'),history:$('exo-ecology-history'),hazards:$('exo-ecology-hazards'),protocols:$('exo-ecology-protocols'),basis:$('exo-ecology-basis')
  };

  let sourceContext = null;
  let ecology = null;

  function randomSeed() {
    if (globalThis.crypto?.getRandomValues) {
      const values = new Uint32Array(2); globalThis.crypto.getRandomValues(values);
      return `${values[0].toString(36)}-${values[1].toString(36)}`;
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function loadSource() {
    const params = new URLSearchParams(location.search);
    if (params.get('source') !== 'solar') return null;
    try {
      const stored = JSON.parse(localStorage.getItem(SOURCE_KEY) || 'null');
      if (!stored || stored.version !== 1 || !stored.system || !stored.selectedWorld) return null;
      if (params.get('systemSeed') && params.get('systemSeed') !== stored.systemSeed) return null;
      if (params.get('worldId') && params.get('worldId') !== stored.selectedWorld.id) return null;
      return stored;
    } catch (error) {
      console.warn('[Blacklight EXO Ecology] Unable to read solar handoff.', error);
      return null;
    }
  }

  function loadCollapseContext() {
    try {
      const record=JSON.parse(sessionStorage.getItem(COLLAPSE_KEY)||'null');
      if(!record||record.version!==1||!sourceContext?.selectedWorld)return null;
      if(record.worldName&&record.worldName!==sourceContext.selectedWorld.name)return null;
      if(record.systemSeed&&sourceContext.systemSeed&&record.systemSeed!==sourceContext.systemSeed)return null;
      return record;
    } catch(error) {
      console.warn('[Blacklight EXO Ecology] Unable to read collapse-history handoff.',error);return null;
    }
  }

  function syntheticContext(seed) {
    const types = [
      {type:'Barren terrestrial',temperature:210,gravity:.72,atmosphere:'Thin carbon dioxide atmosphere',hydrosphere:0,habitability:8},
      {type:'Temperate terrestrial',temperature:286,gravity:1.03,atmosphere:'Nitrogen-bearing atmosphere',hydrosphere:54,habitability:78},
      {type:'Ocean world',temperature:274,gravity:1.18,atmosphere:'Dense nitrogen and water-vapor atmosphere',hydrosphere:96,habitability:72},
      {type:'Icebound cryosphere',temperature:126,gravity:.43,atmosphere:'Trace nitrogen and methane',hydrosphere:64,habitability:22},
      {type:'Volcanic world',temperature:640,gravity:1.31,atmosphere:'Dense sulfur dioxide atmosphere',hydrosphere:0,habitability:4},
      {type:'Gas giant',temperature:162,gravity:2.15,atmosphere:'Hydrogen, helium, ammonia, and water clouds',hydrosphere:0,habitability:18}
    ];
    const index = [...String(seed)].reduce((sum,char)=>sum+char.charCodeAt(0),0) % types.length;
    const base = types[index];
    const world = {id:'standalone-world',kind:'planet',name:`Ecology Test World ${index+1}`,resources:['silicates','metals','complex chemical feedstock'],biosphere:'No confirmed biosphere',civilization:'No confirmed civilization',...base};
    return {version:1,systemSeed:`ECOLOGY-STANDALONE:${seed}`,dossierSeed:`${seed}:dossier`,environment:'temperate terrestrial',system:{seed:`ECOLOGY-STANDALONE:${seed}`,name:'Standalone Ecology Simulation',sourceMode:'procedural',planets:[world],belts:[]},selectedWorld:world};
  }

  function mapEnvironmentForDossier(profile) {
    const key = profile.environment.key;
    if (key === 'global-ocean') return 'global ocean';
    if (key === 'arid-desert' || key === 'airless-surface') return 'arid desert';
    if (key === 'icebound' || key === 'hydrocarbon') return 'icebound cryosphere';
    if (key === 'high-gravity') return 'high-gravity terrestrial';
    if (key === 'toxic-atmosphere' || key === 'volcanic') return 'toxic-atmosphere world';
    if (key === 'gas-cloud' || key === 'plasma-magnetosphere') return 'gas-giant aerostat ecology';
    if (key === 'artificial') return 'artificial habitat network';
    if (key === 'tidal-twilight') return 'temperate terrestrial';
    return 'temperate terrestrial';
  }

  function synchronizeSelectedWorld() {
    if (!sourceContext?.system || !sourceContext.selectedWorld) return;
    const replacement=clone(sourceContext.selectedWorld);
    for (const planet of sourceContext.system.planets || []) {
      if (planet.id===replacement.id) { Object.assign(planet,replacement); return; }
      const moon=(planet.moons||[]).find(item=>item.id===replacement.id);
      if (moon) { Object.assign(moon,replacement); return; }
    }
  }

  function card(label,title,text) {
    const article=document.createElement('article'),small=document.createElement('small'),heading=document.createElement('h3'),paragraph=document.createElement('p');
    article.className='exo-ecology-card';small.textContent=label;heading.textContent=title;paragraph.textContent=text;article.append(small,heading,paragraph);return article;
  }
  function addData(label,value) { const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=String(value);ui.data.append(dt,dd); }
  function renderList(container,items,emptyText) {
    container.replaceChildren();
    const values = items?.length ? items : [emptyText];
    for (const text of values) { const li=document.createElement('li');li.textContent=text;container.append(li); }
  }

  function render() {
    const profile = ecology;
    const world = sourceContext.selectedWorld;
    ui.summaryWorld.textContent=world.name;ui.summaryState.textContent=profile.classification.finalLabel;ui.summaryNative.textContent=profile.classification.nativeLabel;ui.summaryComplexity.textContent=`${profile.complexity.index}/100`;
    ui.name.textContent=`${world.name} · ${profile.classification.finalLabel}`;ui.summary.textContent=profile.summary;
    ui.stateStack.replaceChildren();
    for (const [className,axis,title,text] of [
      ['native','NATIVE ECOLOGY',profile.classification.nativeLabel,profile.complexity.stage],
      ['overlay','CIVILIZATION',profile.classification.overlayLabel,profile.populationContext.lockedBySource?'Preserved from an existing source record.':'Generated only where no prior population or ruin decision existed.']
    ]) { const article=document.createElement('article');article.className=`exo-ecology-state-card ${className}`;article.dataset.axis=axis;const strong=document.createElement('strong'),span=document.createElement('span');strong.textContent=title;span.textContent=text;article.append(strong,span);ui.stateStack.append(article); }
    ui.badges.replaceChildren();
    for (const text of [profile.environment.label,profile.chemistry.foundation,`${profile.complexity.trophicLevels} trophic levels`,`${profile.classification.confidence}% confidence`]) { const span=document.createElement('span');span.textContent=text;ui.badges.append(span); }
    const risk=Math.min(100,Math.round(profile.complexity.index*.45+profile.hazards.length*7+(profile.classification.overlay==='ruined'?20:profile.classification.overlay==='populated'?12:0)));
    ui.rating.textContent=risk>=78?'Severe ecological control requirements':risk>=55?'High ecological control requirements':risk>=30?'Moderate ecological control requirements':'Low ecological control requirements';
    ui.ratingSummary.textContent=profile.hazards[0]||'No unusual ecological hazard generated.';ui.meter.style.width=`${risk}%`;
    ui.data.replaceChildren();addData('Final classification',profile.classification.finalLabel);addData('Native foundation',profile.classification.nativeLabel);addData('Population overlay',profile.classification.overlayLabel);addData('Environment',profile.environment.label);addData('Complexity',`${profile.complexity.index}/100`);addData('Biomass',profile.complexity.biomass);addData('Diversity',profile.complexity.diversity);addData('Confidence',`${profile.classification.confidence}%`);
    ui.chemistryGrid.replaceChildren(
      card('Chemical foundation',profile.chemistry.foundation,`${profile.chemistry.solvent}; ${profile.chemistry.heredity}.`),
      card('Primary energy',profile.energy.primary,profile.energy.secondary.length?`Secondary inputs: ${profile.energy.secondary.join(', ')}.`:'No stable secondary ecological input.'),
      card('Metabolism or cycling',profile.chemistry.metabolism,profile.energy.processes.join(' · ')),
      card('Physical environment',profile.environment.label,`${profile.environment.pressure}; ${profile.environment.solvents.join(', ')}.`),
      card('Ecological stage',profile.complexity.stage,`${profile.complexity.trophicLevels} broad trophic levels; ${profile.complexity.biomass} biomass.`),
      card('Civilizational effect',profile.classification.overlayLabel,profile.classification.overlay==='populated'?'Settlement, ecological management, agriculture, extraction, or introduced species alter native cycles.':profile.classification.overlay==='ruined'?'Collapse residues and surviving engineered ecologies remain part of the modern environment.':'No permanent population is included in the ecological model.')
    );
    ui.nicheGrid.replaceChildren(...profile.niches.map(item=>card(item.productivity,item.domain,`${item.activity}; dominant process: ${item.dominantProcess}.`)));
    ui.organismGrid.replaceChildren();
    if (!profile.organisms.length) { const div=document.createElement('div');div.className='exo-ecology-empty';div.textContent=profile.classification.nativeClass==='chemical'?'No organisms generated. This world supports complex abiotic reaction networks rather than confirmed life.':'No persistent organisms or self-propagating analogues were generated.';ui.organismGrid.append(div); }
    for (const organism of profile.organisms) {
      const article=document.createElement('article');article.className='exo-ecology-organism';const heading=document.createElement('h3'),summary=document.createElement('p'),dl=document.createElement('dl');heading.textContent=organism.name;summary.textContent=`${organism.scale} ${organism.form}; ${organism.role}.`;
      for (const [label,value] of [['Domains',organism.domains.join(', ')],['Metabolism',organism.metabolism],['Defense',organism.defense],['Behavior',organism.behavior],['Status',organism.status]]) { const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd); }
      article.append(heading,summary,dl);ui.organismGrid.append(article);
    }
    renderList(ui.foodWeb,profile.foodWeb,'No trophic web exists; only physical or chemical cycling is present.');renderList(ui.symbioses,profile.symbioses,'No biological symbioses apply.');renderList(ui.history,profile.history,'No ecological history generated.');renderList(ui.hazards,profile.hazards,'No extraordinary hazards beyond ordinary planetary exposure.');renderList(ui.protocols,profile.operationalProtocols,'Use standard EXO contamination controls.');renderList(ui.basis,profile.classification.basis,'Classification basis unavailable.');
  }

  function generate() {
    const seed=controls.seed.value.trim()||randomSeed();controls.seed.value=seed;
    if (!sourceContext) sourceContext=syntheticContext(seed);
    ecology=globalThis.BlacklightExoEcology.generate({seed,world:sourceContext.selectedWorld,system:sourceContext.system,context:{systemState:sourceContext.systemState,stateKey:sourceContext.stateKey,worldRole:sourceContext.worldRole},overrides:{classification:controls.classification.value,occupancy:controls.occupancy.value,environment:controls.environment.value,chemistry:controls.chemistry.value,complexity:controls.complexity.value}});
    const collapse=loadCollapseContext();
    if(collapse&&ecology.classification.overlay==='ruined'){
      ecology.collapse=clone(collapse);
      ecology.history.unshift(`${collapse.cause}: ${collapse.mechanism}`);
      if(collapse.aftermath)ecology.history.push(`Recorded aftermath: ${collapse.aftermath}`);
      if(collapse.hazard&&!ecology.hazards.includes(collapse.hazard))ecology.hazards.unshift(collapse.hazard);
      sourceContext.selectedWorld.collapse=clone(collapse);
    }
    sourceContext.selectedWorld.ecology=clone(ecology);sourceContext.selectedWorld.ecologyClass=ecology.classification.finalState;sourceContext.selectedWorld.ecologySummary=ecology.summary;
    if (ecology.classification.nativeClass==='living') sourceContext.selectedWorld.biosphere='Generated native biosphere';
    else if (ecology.classification.nativeClass==='pseudo') sourceContext.selectedWorld.biosphere='Generated pseudo-life signature';
    else if (ecology.classification.nativeClass==='chemical') sourceContext.selectedWorld.biosphere='Complex abiotic chemistry';
    else sourceContext.selectedWorld.biosphere='No persistent biosphere';
    if (ecology.classification.overlay==='populated' && /^No|^Unknown|^None/i.test(String(sourceContext.selectedWorld.civilization||''))) sourceContext.selectedWorld.civilization='Generated populated-world designation';
    if (ecology.classification.overlay==='ruined') sourceContext.selectedWorld.civilization='Extinct or ruined civilization record';
    sourceContext.environment=mapEnvironmentForDossier(ecology);sourceContext.dossierSeed=`${seed}:system-dossier`;sourceContext.ecology=clone(ecology);
    synchronizeSelectedWorld();
    render();
  }

  function exportJson() {
    if (!ecology) return;const blob=new Blob([JSON.stringify({system:sourceContext.system,world:sourceContext.selectedWorld,ecology},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${sourceContext.selectedWorld.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-ecology.json`;document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
  }

  function continueToDossier() {
    if (!ecology) generate();
    synchronizeSelectedWorld();
    const payload={version:1,systemSeed:sourceContext.systemSeed||sourceContext.system.seed,dossierSeed:sourceContext.dossierSeed,environment:sourceContext.environment,system:clone(sourceContext.system),selectedWorld:clone(sourceContext.selectedWorld),ecology:clone(ecology),source:'ecology'};
    localStorage.setItem(SOURCE_KEY,JSON.stringify(payload));localStorage.setItem(ECOLOGY_KEY,JSON.stringify(payload));
    location.href=`blacklight-exo-species-civilization.html?source=solar&systemSeed=${encodeURIComponent(payload.systemSeed)}&worldId=${encodeURIComponent(payload.selectedWorld.id)}&seed=${encodeURIComponent(payload.dossierSeed)}`;
  }

  controls.generate.addEventListener('click',generate);controls.export.addEventListener('click',exportJson);controls.continue.addEventListener('click',continueToDossier);controls.seed.addEventListener('keydown',event=>{if(event.key==='Enter')generate();});
  sourceContext=loadSource();
  if (sourceContext) {
    ui.source.hidden=false;ui.sourceTitle.textContent=`Imported world: ${sourceContext.system.name} · ${sourceContext.selectedWorld.name}`;ui.sourceBody.textContent=`The physical ${sourceContext.selectedWorld.kind}, atmosphere, temperature, gravity, hydrosphere, habitability, biosphere, civilization, resource, moon, and provenance records remain attached. Any existing population or ruin designation overrides conflicting random controls.`;
    controls.seed.value=sourceContext.dossierSeed||`${sourceContext.systemSeed}:ecology:${sourceContext.selectedWorld.id}`;
    if (sourceContext.selectedWorld.ecology?.classification) { const prior=sourceContext.selectedWorld.ecology.classification;controls.classification.value=prior.finalState; }
  }
  generate();
})();