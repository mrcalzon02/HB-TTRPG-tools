(() => {
  'use strict';
  const G=globalThis.BlacklightExoVesselManufacturerGenerator;
  if(!G||document.getElementById('exo-vessel-manufacturer-section'))return;
  const $=id=>document.getElementById(id);
  const node=(tag,className='',text='')=>{const element=document.createElement(tag);if(className)element.className=className;if(text)element.textContent=text;return element;};
  const fmt=(value,digits=2)=>Number(value||0).toLocaleString(undefined,{maximumFractionDigits:digits});

  function addControls(){
    const grid=document.querySelector('.exo-vessel-control-grid');
    if(grid&&!$('exo-vessel-manufacturer-index')){
      const label=node('label');
      label.append(node('span','','Species-specific manufacturer house'));
      const select=node('select');select.id='exo-vessel-manufacturer-index';
      for(let index=0;index<G.catalogSize;index+=1)select.add(new Option(`Manufacturer house ${index+1}`,String(index)));
      label.append(select);grid.append(label);
      select.addEventListener('change',()=>$('exo-vessel-generate')?.click());
    }
    const archetype=$('exo-vessel-archetype');
    const archetypeLabel=archetype?.closest('label')?.querySelector('span');
    if(archetypeLabel)archetypeLabel.textContent='Cultural architecture family';
    const actions=document.querySelector('.exo-vessel-hero .bli-actions');
    if(actions&&!$('exo-vessel-save-manufacturer')){
      const save=node('button','bli-action','Save Manufacturer');save.id='exo-vessel-save-manufacturer';save.type='button';
      const exportButton=node('button','bli-action','Export Manufacturer JSON');exportButton.id='exo-vessel-export-manufacturer';exportButton.type='button';
      actions.append(save,exportButton);
      save.addEventListener('click',()=>{
        const manufacturer=globalThis.BlacklightExoGetActiveVessel?.()?.manufacturer;
        save.textContent=G.save(manufacturer)?'Manufacturer Saved':'Save Failed';
        setTimeout(()=>{save.textContent='Save Manufacturer';},1800);
      });
      exportButton.addEventListener('click',()=>{
        const manufacturer=globalThis.BlacklightExoGetActiveVessel?.()?.manufacturer;
        if(!manufacturer)return;
        const blob=new Blob([`${JSON.stringify(manufacturer,null,2)}\n`],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');
        anchor.href=url;anchor.download=`${manufacturer.manufacturerId}.json`;anchor.click();URL.revokeObjectURL(url);
      });
    }
  }

  function buildSection(){
    const section=node('section','bli-section');section.id='exo-vessel-manufacturer-section';
    const head=node('div','bli-section-head');
    head.append(node('p','bli-eyebrow','Charles // species-specific manufacturer record'),node('h2','','The builder is now a persistent engineering identity rather than a generic archetype.'),node('p','','Each originating species and organization produces a related catalog of manufacturers. Their common ancestry remains visible, but each house has its own production focus, architecture weighting, topology, materials, equipment-quality distribution, repair doctrine, naming system, and visual grammar.'));
    const grid=node('div','exo-vessel-grid');grid.id='exo-vessel-manufacturer-grid';
    const comparison=node('div','exo-vessel-philosophy-comparison');comparison.id='exo-vessel-manufacturer-comparison';
    const tableWrap=node('div','exo-vessel-table-wrap');
    tableWrap.innerHTML='<table class="exo-vessel-table"><thead><tr><th>Distribution</th><th>Legacy</th><th>Standard</th><th>Refined</th><th>Advanced</th><th>Prototype</th></tr></thead><tbody id="exo-vessel-manufacturer-technology-body"></tbody></table>';
    section.append(head,grid,comparison,tableWrap);
    const designation=$('exo-vessel-designation-section');
    if(designation)designation.insertAdjacentElement('afterend',section);
    else document.querySelector('.exo-vessel-overview')?.insertAdjacentElement('afterend',section);
  }

  function card(label,title,body,state=''){
    const article=node('article','exo-vessel-card');if(state)article.dataset.state=state;
    article.append(node('small','',label),node('h3','',title),node('p','',body));return article;
  }
  function listCard(title,items,className=''){
    const article=node('article',`exo-vessel-philosophy-card ${className}`.trim());
    article.append(node('p','bli-eyebrow',title));
    const list=node('ul');for(const item of items)list.append(node('li','',item));article.append(list);return article;
  }
  function percentages(table){return Object.entries(table).map(([key,value])=>`${key.replaceAll('_',' ')} ${fmt(value*100,1)}%`).join(' · ');}

  function render(event){
    const vessel=event?.detail?.vessel||globalThis.BlacklightExoGetActiveVessel?.(),manufacturer=vessel?.manufacturer;
    if(!manufacturer)return;
    const select=$('exo-vessel-manufacturer-index'),selected=select?.value||'0';
    if(select&&Array.isArray(vessel.manufacturerCatalog)){
      vessel.manufacturerCatalog.forEach((item,index)=>{if(select.options[index])select.options[index].textContent=`${item.name} · ${item.preferredEnvelope}`;});
      select.value=selected;
    }
    document.body.dataset.manufacturerFocus=manufacturer.archetype.focusKey.toLowerCase();
    const a=manufacturer.architecture,p=manufacturer.production;
    $('exo-vessel-manufacturer-grid')?.replaceChildren(
      card('Manufacturer identity',manufacturer.name,`${manufacturer.manufacturerId}. Produced for ${manufacturer.provenance.sourceOrganization} by ${manufacturer.provenance.sourceSpecies}.`,'ok'),
      card('Cultural ancestry',manufacturer.archetype.label,`${manufacturer.archetype.inferenceReason} This house specializes in ${manufacturer.archetype.focusLabel.toLowerCase()}.`),
      card('Architecture bias',`${fmt(a.internalsBias*100,1)}% internal / ${fmt(a.evaBias*100,1)}% EVA`,`Preferred envelope ${a.preferredEnvelope}; allowed module deviation ±${fmt(a.allowedDeviationVariance*100,1)} percentage points.`),
      card('Primary construction',a.primaryStructuralMaterial,manufacturer.materials.join('; ')),
      card('Production system',`${fmt(p.standardization*100,1)}% standardized`,`${fmt(p.modularity*100,1)}% modular, ${fmt(p.automation*100,1)}% automated, ${fmt(p.qualityControl*100,1)}% quality-control index.`),
      card('Planned service life',`${fmt(p.plannedServiceLifeYears,0)} years`,manufacturer.repairDoctrine),
      card('Topology tendencies',a.preferredEnvelope,percentages(manufacturer.topologyWeights)),
      card('Preferred armament families',manufacturer.weaponPreferences.join(' · '),'These are manufacturer integration preferences only; weapon performance and combat balancing remain reserved for later roadmap phases.')
    );
    $('exo-vessel-manufacturer-comparison')?.replaceChildren(
      listCard('RECOGNITION GRAMMAR',manufacturer.signatureTraits,'is-internal'),
      listCard('NAMING AND SERIAL GRAMMAR',[
        `Prefix: ${manufacturer.namingGrammar.designationPrefix}`,
        `Class: ${manufacturer.namingGrammar.classPattern}`,
        `Serial: ${manufacturer.namingGrammar.serialPattern}`,
        `Family roots: ${manufacturer.namingGrammar.familyRoots.join(', ')}`
      ],'is-eva'),
      listCard('VISIBLE CONSTRUCTION LANGUAGE',[
        manufacturer.visualGrammar.silhouette,
        manufacturer.visualGrammar.symmetry,
        manufacturer.visualGrammar.surface,
        manufacturer.visualGrammar.moduleRhythm,
        manufacturer.visualGrammar.sensorPlacement,
        manufacturer.visualGrammar.radiatorPlacement
      ])
    );
    const body=$('exo-vessel-manufacturer-technology-body');
    if(body){
      const row=node('tr');
      row.append(node('td','',manufacturer.name));
      for(const key of ['LEGACY','STANDARD','REFINED','ADVANCED','PROTOTYPE'])row.append(node('td','',`${fmt(manufacturer.technologyVariantWeights[key]*100,2)}%`));
      body.replaceChildren(row);
    }
    G.save(manufacturer);
  }

  addControls();buildSection();
  document.addEventListener('blacklight:exo-vessel-generated',render);
  queueMicrotask(()=>{render();$('exo-vessel-generate')?.click();});
})();