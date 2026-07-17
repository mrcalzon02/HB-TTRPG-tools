(() => {
  'use strict';

  const SOURCE_KEY = 'blacklight-exo-selected-world-v1';
  const $ = id => document.getElementById(id);
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
    if(environment&&controls.environment.querySelector(`option[value="${CSS.escape(environment)}"]`))controls.environment.value=environment;
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

  addOption('chemical','Complex abiotic chemistry');
  addOption('pseudo','Pseudo-life ecology');
  addOption('biosphere','Non-sapient native biosphere');
  addNavLink();
  const context=readContext();
  if(!context)return;
  applyEcologyControls(context);
  controls.generate.addEventListener('click',()=>queueMicrotask(()=>patchRenderedDossier(context)));
  controls.seed?.addEventListener('keydown',event=>{if(event.key==='Enter')queueMicrotask(()=>patchRenderedDossier(context));});
  controls.generate.click();
  queueMicrotask(()=>patchRenderedDossier(context));
})();