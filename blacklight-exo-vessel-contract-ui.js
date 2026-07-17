(() => {
  'use strict';
  const C=globalThis.BlacklightExoVesselContracts;
  if(!C)return;
  const $=id=>document.getElementById(id);
  const node=(tag,className='',text='')=>{const item=document.createElement(tag);if(className)item.className=className;if(text)item.textContent=text;return item;};
  const fmt=(value,digits=2)=>Number(value||0).toLocaleString(undefined,{maximumFractionDigits:digits});

  function ensureConditionControl(){
    const grid=document.querySelector('.exo-vessel-control-grid');
    if(!grid||$('exo-vessel-condition'))return;
    const label=node('label');
    const caption=node('span','','Initial lifecycle condition');
    const select=node('select');select.id='exo-vessel-condition';
    for(const key of Object.keys(C.conditionTemplates))select.add(new Option(key.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,char=>char.toUpperCase()),key));
    select.value='OPERATIONAL';
    label.append(caption,select);grid.append(label);
    select.addEventListener('change',()=>$('exo-vessel-generate')?.click());
  }

  function ensureSection(){
    if($('exo-vessel-contract-section'))return;
    const section=node('section','bli-section');section.id='exo-vessel-contract-section';
    const head=node('div','bli-section-head');
    head.append(node('p','bli-eyebrow','Charles // canonical vessel contract'),node('h2','','Stable identifiers, technology discipline, condition axes, and migration provenance.'),node('p','','This envelope preserves the complete engineering record while giving later manufacturer, module, voxel, combat, and damage phases one versioned source of truth.'));
    const grid=node('div','exo-vessel-grid');grid.id='exo-vessel-contract-grid';
    const wrap=node('div','exo-vessel-table-wrap');
    const table=node('table','exo-vessel-table');
    const thead=node('thead'),header=node('tr');
    for(const text of ['Subsystem','Principal band','Variant','Offset','Heritage','Basis'])header.append(node('th','',text));
    thead.append(header);
    const body=node('tbody');body.id='exo-vessel-technology-body';
    table.append(thead,body);wrap.append(table);section.append(head,grid,wrap);
    const overview=document.querySelector('.exo-vessel-overview');
    if(overview)overview.insertAdjacentElement('afterend',section);
    else document.querySelector('main')?.prepend(section);
  }

  function card(label,title,body){
    const article=node('article','exo-vessel-card');
    article.append(node('small','',label),node('h3','',title),node('p','',body));
    return article;
  }

  function render(vessel){
    if(!vessel?.contract)return;
    ensureSection();
    const contract=vessel.contract,ids=contract.identifiers,technology=contract.technology,condition=contract.condition;
    const grid=$('exo-vessel-contract-grid');
    grid?.replaceChildren(
      card('Schema authority',`${contract.recordType} · ${contract.schemaVersion}`,`Contract version ${contract.contractVersion}, revision ${contract.revision}. Migration uses ${contract.migration.history[0]?.strategy||'the registered policy'} and preserves unknown fields.`),
      card('Vessel instance',ids.vesselInstanceId,`Hull family ${ids.hullFamilyId}; manufacturer ${ids.manufacturerId}.`),
      card('Origin records',ids.speciesId,`Organization ${ids.organizationId}. These identifiers are deterministic products of the complete seed hierarchy rather than display names alone.`),
      card('Technology discipline',technology.principalBand,`${technology.subsystemVariants.length} subsystem variants; allowed offset ${technology.allowedOffsetMinimum} to +${technology.allowedOffsetMaximum}. Validation ${technology.validation.valid?'passed':'failed'}.`),
      card('Lifecycle record',condition.template.replaceAll('_',' '),`${condition.serviceDoctrine} doctrine; readiness ${fmt(condition.axes.operationalReadinessPercent)}%, destruction ${fmt(condition.axes.destructionPercent)}%, coherent vessel graph ${condition.coherentVesselGraph?'retained':'not retained'}. Condition is ${condition.applicationStatus}.`),
      card('Seed lineage',contract.seeds.vesselInstanceSeed,`Manufacturer seed ${contract.seeds.manufacturerSeed}; layout, equipment, condition, and history have independent deterministic child seeds.`),
      card('Derived layers',`${contract.derivedLayers.filter(layer=>layer.status==='generated').length} generated`,`${contract.derivedLayers.filter(layer=>layer.status==='planned').length} later layers are reserved by contract and may not redefine the existing source fields.`),
      card('Contract validation',contract.validation.valid?'Valid':'Invalid',contract.validation.valid?'Identifiers, technology offsets, condition axes, derived layers, and mass closure passed.':contract.validation.violations.join(' '))
    );
    const body=$('exo-vessel-technology-body');if(!body)return;body.replaceChildren();
    for(const item of technology.subsystemVariants){
      const row=node('tr');
      row.append(node('td','',item.label),node('td','',item.principalBand),node('td','',item.variant),node('td','',`${item.offset>=0?'+':''}${fmt(item.offset,2)}`),node('td','',item.heritageBand),node('td','',item.rationale));
      body.append(row);
    }
  }

  ensureConditionControl();
  ensureSection();
  document.addEventListener('blacklight:exo-vessel-generated',event=>render(event.detail?.vessel));
  queueMicrotask(()=>render(globalThis.BlacklightExoGetActiveVessel?.()));
})();
