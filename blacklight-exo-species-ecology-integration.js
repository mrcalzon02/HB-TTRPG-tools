(() => {
  'use strict';

  const SOURCE_KEY = 'blacklight-exo-selected-world-v1';
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const controls = {
    generate:$('exo-species-generate'),
    seed:$('exo-species-seed'),
    state:$('exo-species-system-state'),
    life:$('exo-species-life-status'),
    environment:$('exo-species-environment')
  };
  if (!controls.generate || !controls.life) return;

  function addOption(value,label,beforeValue='occupied') {
    if (controls.life.querySelector(`option[value="${value}"]`)) return;
    const option=document.createElement('option');option.value=value;option.textContent=label;
    const before=controls.life.querySelector(`option[value="${beforeValue}"]`);controls.life.insertBefore(option,before||null);
  }

  function addNavLink() {
    const nav=document.querySelector('.bli-nav');if(!nav||nav.querySelector('a[href="blacklight-exo-alien-ecology.html"]'))return;
    const link=document.createElement('a');link.href='blacklight-exo-alien-ecology.html';link.textContent='Alien Ecology';
    const archive=nav.querySelector('a[href="blacklight-systems-black.html"]');nav.insertBefore(link,archive||null);
  }

  function readContext() {
    const params=new URLSearchParams(location.search);if(params.get('source')!=='solar')return null;
    try {
      const stored=JSON.parse(localStorage.getItem(SOURCE_KEY)||'null');
      if(!stored||stored.version!==1||!stored.system||!stored.selectedWorld)return null;
      if(params.get('systemSeed')&&params.get('systemSeed')!==stored.systemSeed)return null;
      if(params.get('worldId')&&params.get('worldId')!==stored.selectedWorld.id)return null;
      const ecology=stored.ecology||stored.selectedWorld.ecology||null;
      return ecology?{stored,ecology}:null;
    } catch(error) {
      console.warn('[Blacklight EXO] Unable to read ecology-aware dossier handoff.',error);return null;
    }
  }

  function applyEcologyControls(context) {
    const classification=context.ecology.classification||{};
    const native=classification.nativeClass||'barren';
    const overlay=classification.overlay||'unpopulated';
    if(overlay==='ruined'){
      controls.state.value='ruin';controls.life.value='extinct';
    }else if(overlay==='populated'){
      controls.state.value='settled';controls.life.value='living';
    }else if(native==='living'){
      controls.state.value='survey';controls.life.value='biosphere';
    }else if(native==='pseudo'){
      controls.state.value='survey';controls.life.value='pseudo';
    }else if(native==='chemical'){
      controls.state.value='resource';controls.life.value='chemical';
    }else{
      controls.state.value='pristine';controls.life.value='none';
    }
    const environment=context.stored.environment;
    if(environment&&[...controls.environment.options].some(option=>option.value===environment))controls.environment.value=environment;
  }

  function card(label,title,text) {
    const article=document.createElement('article'),small=document.createElement('small'),heading=document.createElement('h3'),paragraph=document.createElement('p');
    article.className='exo-dossier-card';small.textContent=label;heading.textContent=title;paragraph.textContent=text;article.append(small,heading,paragraph);return article;
  }

  function patchRenderedDossier(context) {
    const profile=context.ecology,classification=profile.classification||{};
    const native=classification.nativeClass||'barren',overlay=classification.overlay||'unpopulated';
    const noSapientSpecies=overlay==='unpopulated';
    const sourceBody=$('exo-source-body');
    if(sourceBody)sourceBody.textContent=`This dossier preserves the selected ${context.stored.selectedWorld.kind}, its physical environment, ecology classification (${classification.finalLabel}), native foundation (${classification.nativeLabel}), population or ruin overlay, system seed ${context.stored.systemSeed}, moons, belts, resources, and provenance.`;

    if(noSapientSpecies){
      const biology=$('exo-biology-grid');
      if(biology){
        const profiles={
          living:['Complex non-sapient biosphere',`${profile.complexity.stage}. Native ecological networks are present without evidence of sapient development.`],
          pseudo:['Pseudo-life ecology',`${profile.complexity.stage}. Self-organizing replicators exist but are not treated as conventional organisms or civilization.`],
          chemical:['Chemically active world',`${profile.chemistry.foundation}; persistent complex chemistry exists without confirmed self-replication.`],
          barren:['No persistent ecology','Physical and chemical processes do not sustain a stable self-propagating ecological network.']
        };
        const [title,text]=profiles[native]||profiles.barren;
        biology.replaceChildren(
          card('Ecology record',title,text),
          card('Environment',profile.environment.label,`${profile.environment.pressure}; ${profile.environment.solvents.join(', ')}.`),
          card('Complexity',`${profile.complexity.index}/100`,`${profile.complexity.diversity} diversity; ${profile.complexity.biomass} biomass.`),
          card('Contamination rule','Preserve the native baseline',profile.operationalProtocols[0]||'Use sealed survey systems and prevent uncontrolled biological transfer.')
        );
      }
      const formSummary=$('exo-species-form-summary');if(formSummary)formSummary.textContent=`${classification.finalLabel}. No sapient species dossier applies; the imported ecology remains the authoritative biological record.`;
      const badges=$('exo-species-badges');
      if(badges){const values=[...badges.querySelectorAll('span')];const lifeBadge=values.find(node=>['biosphere','pseudo','chemical','none'].includes(node.textContent));if(lifeBadge)lifeBadge.textContent=classification.nativeLabel;}
    }

    const systemGrid=$('exo-system-state-grid');
    if(systemGrid&&!systemGrid.querySelector('[data-imported-ecology]')){
      const ecologyCard=card('Imported ecology',classification.finalLabel,`${profile.summary} ${profile.hazards.length} primary ecological hazards and ${profile.organisms.length} representative organism or pseudo-organism records are attached.`);
      ecologyCard.dataset.importedEcology='true';systemGrid.append(ecologyCard);
    }
  }

  function defaultsForType(type) {
    const value=String(type||'').toLowerCase();
    if(/gas giant|ice giant/.test(value))return{temperature:155,gravity:2.1,atmosphere:'Hydrogen, helium, and trace volatile clouds',hydrosphere:0,habitability:12};
    if(/ocean/.test(value))return{temperature:278,gravity:1.08,atmosphere:'Dense nitrogen and water-vapor atmosphere',hydrosphere:94,habitability:74};
    if(/frozen|ice|cryogenic/.test(value))return{temperature:132,gravity:.55,atmosphere:'Trace nitrogen, methane, and cryovolcanic vapor',hydrosphere:58,habitability:20};
    if(/volcanic/.test(value))return{temperature:635,gravity:1.2,atmosphere:'Dense sulfur dioxide atmosphere',hydrosphere:0,habitability:4};
    if(/temperate|super-earth/.test(value))return{temperature:286,gravity:1.05,atmosphere:'Nitrogen-bearing atmosphere',hydrosphere:48,habitability:76};
    if(/metal|airless|barren/.test(value))return{temperature:225,gravity:.68,atmosphere:'Thin or absent atmosphere',hydrosphere:0,habitability:6};
    return{temperature:250,gravity:.9,atmosphere:'Thin or unknown atmosphere',hydrosphere:8,habitability:18};
  }

  function findStoredWorld(context,name) {
    if(!context?.stored?.system)return null;
    for(const planet of context.stored.system.planets||[]){
      if(planet.name===name)return clone(planet);
      const moon=(planet.moons||[]).find(item=>item.name===name);if(moon)return clone(moon);
    }
    if(context.stored.selectedWorld?.name===name)return clone(context.stored.selectedWorld);
    return null;
  }

  function inferredBiosphere(life,ruined) {
    if(ruined)return'Historical native biosphere';
    if(['living','native','multispecies','biosphere'].includes(life))return'Confirmed native biosphere';
    if(life==='microbial')return'Microbial biosphere';
    if(life==='pseudo')return'Pseudo-life signature';
    if(life==='chemical')return'Complex abiotic chemistry';
    return'No confirmed biosphere';
  }

  function openWorldEcology(card,context) {
    const label=card.querySelector('small')?.textContent.trim()||'';
    const name=card.querySelector('h3')?.textContent.trim()||'Generated world';
    const text=card.querySelector('p')?.textContent.trim()||'';
    const split=label.split(' · '),status=(split[0]||'unknown').toLowerCase(),type=split.slice(1).join(' · ')||'generated world';
    const role=(text.split(';')[0]||'unoccupied reserve').trim();
    const stateKey=controls.state.value==='random'?'survey':controls.state.value;
    const ruined=/ruin|abandoned|nonfunctional|extinct|sterilized/.test(`${status} ${role.toLowerCase()} ${stateKey}`);
    const residentMatch=text.match(/([\d,.]+(?:\s+(?:thousand|million|billion|trillion))?) residents/i);
    const populated=Boolean(residentMatch)||/inhabited|capital|colony|fortress|agricultural/.test(role.toLowerCase());
    const life=controls.life.value;
    const government=$('exo-species-summary-government')?.textContent.trim()||'Unknown authority';
    const speciesName=$('exo-species-name')?.textContent.trim()||'Designated population';
    const base=findStoredWorld(context,name)||{id:`dossier-${name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,kind:'planet',name,type,resources:['silicates','metals','volatile compounds'],...defaultsForType(type)};
    const habitability=text.match(/Habitability\s+(\d+)%/i);if(habitability)base.habitability=Number(habitability[1]);
    base.role=role;base.status=status;base.biosphere=inferredBiosphere(life,ruined);
    base.civilization=ruined?`Extinct civilization record: ${speciesName}`:populated?`Designated civilization: ${speciesName}; ${government}`:'No confirmed civilization';
    const systemSeed=controls.seed.value.trim()||'EXO-DOSSIER';
    const system=context?.stored?.system?clone(context.stored.system):{seed:systemSeed,name:$('exo-species-summary-name')?.textContent.trim()||'Generated dossier system',sourceMode:'procedural',planets:[base],belts:[]};
    const payload={version:1,systemSeed,dossierSeed:`${systemSeed}:ecology:${base.id}`,environment:controls.environment.value==='random'?'temperate terrestrial':controls.environment.value,system,selectedWorld:base,systemState:stateKey,stateKey,worldRole:role,source:'system-dossier'};
    localStorage.setItem(SOURCE_KEY,JSON.stringify(payload));
    location.href=`blacklight-exo-alien-ecology.html?source=solar&systemSeed=${encodeURIComponent(systemSeed)}&worldId=${encodeURIComponent(base.id)}`;
  }

  function decorateWorldCards(context) {
    const grid=$('exo-system-state-grid');if(!grid)return;
    for(const worldCard of grid.querySelectorAll('.exo-dossier-card')){
      const label=worldCard.querySelector('small')?.textContent||'';
      if(!label.includes(' · ')||worldCard.dataset.importedEcology==='true'||worldCard.querySelector('[data-develop-ecology]'))continue;
      const actions=document.createElement('div');actions.className='bli-actions';actions.dataset.developEcology='true';
      const button=document.createElement('button');button.type='button';button.className='bli-action';button.textContent='Develop World Ecology';button.addEventListener('click',()=>openWorldEcology(worldCard,context));
      actions.append(button);worldCard.append(actions);
    }
  }

  addOption('chemical','Complex abiotic chemistry');
  addOption('pseudo','Pseudo-life ecology');
  addOption('biosphere','Non-sapient native biosphere');
  addNavLink();
  const context=readContext();
  if(context)applyEcologyControls(context);
  const afterRender=()=>queueMicrotask(()=>{if(context)patchRenderedDossier(context);decorateWorldCards(context);});
  controls.generate.addEventListener('click',afterRender);
  controls.seed?.addEventListener('keydown',event=>{if(event.key==='Enter')afterRender();});
  if(context)controls.generate.click();
  else afterRender();
})();