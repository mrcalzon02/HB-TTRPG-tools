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
    head.append(node('p','bli-eyebrow','Charles // canonical vessel contract'),node('h2','','Stable identifiers, technology discipline, condition axes, and migration provenance.'),node('p','','This envelope preserves the complete engineering record while giving later manufacturer, module, voxel, combat, damage, inertial-control, and gameplay phases one versioned source of truth.'));
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

  function ensureInertialSection(){
    if($('exo-vessel-inertial-section'))return;
    const section=node('section','bli-section');section.id='exo-vessel-inertial-section';
    const head=node('div','bli-section-head');
    head.append(node('p','bli-eyebrow','Charles // inertial-reference control authority'),node('h2','','How the vessel avoids converting its crew into acceleration trauma.'),node('p','','Species may invent different generators, equations, or field ontologies, but certified vessels converge on the same operational result: the occupied internal reference frame must be partially decoupled from hull acceleration. Primary, secondary, compartment, and emergency systems remain separate damageable authorities.'));
    const grid=node('div','exo-vessel-grid');grid.id='exo-vessel-inertial-grid';
    const failures=node('div','exo-vessel-list-grid');failures.innerHTML='<article><h3>Redundancy and safeguards</h3><ul id="exo-vessel-inertial-safeguards"></ul></article><article><h3>Failure modes</h3><ul id="exo-vessel-inertial-failures"></ul></article>';
    section.append(head,grid,failures);
    const contract=$('exo-vessel-contract-section');
    if(contract)contract.insertAdjacentElement('afterend',section);
    else document.querySelector('.exo-vessel-overview')?.insertAdjacentElement('afterend',section);
  }

  function card(label,title,body){
    const article=node('article','exo-vessel-card');
    article.append(node('small','',label),node('h3','',title),node('p','',body));
    return article;
  }

  function renderInertial(vessel){
    const irc=vessel?.inertialControl;if(!irc)return;
    ensureInertialSection();
    const p=irc.performance,i=irc.installation,e=irc.emergency,r=irc.redundancy,power=irc.power;
    $('exo-vessel-inertial-grid')?.replaceChildren(
      card('Common field effect',irc.commonFieldName,`${irc.implementation.mechanism}. ${irc.implementation.principle}`),
      card('Nominal coupling suppression',`${fmt(p.nominalDampeningPercent,3)}%`,`${fmt(p.certifiedExternalAccelerationG,4)} g external hull acceleration produces ${fmt(p.certifiedInternalResidualAccelerationG,5)} g inside the protected frame.`),
      card('Biological acceleration authority',`${fmt(p.uncompensatedCrewLimitG,3)} g unprotected`,`${fmt(p.fieldSupportedCrewLimitG,3)} g mathematical field-supported limit before raw engine and structural limits are applied.`),
      card('Installed reference system',i.totalMassText,`${fmt(i.totalVolumeM3,1)} m³ before distributed hull hardening; ${i.primaryChannels} primary channels, ${i.secondaryChannels} secondary channels, and ${i.distributedCompartmentNodes} local nodes.`),
      card('Field power demand',power.continuousPowerText,`${power.peakPowerText} peak; ${power.emergencyReserveEnergyText} isolated reserve supporting ${fmt(power.emergencyReserveSeconds,1)} seconds of abort authority.`),
      card('Automatic maneuver interlock',e.automaticManeuverInhibit?'Mandatory':'Absent',e.abortRule),
      card('Technology reference',irc.referenceId,`${irc.technologyBand}; ${irc.implementation.convergenceRule}`),
      card('Validation',irc.validation.valid?'Valid':'Invalid',irc.validation.valid?'Mass closure, acceleration reconstruction, biological residual limit, and separate reference authority passed.':irc.validation.violations.join(' '))
    );
    const safeguards=$('exo-vessel-inertial-safeguards'),failures=$('exo-vessel-inertial-failures');
    safeguards?.replaceChildren(...[...irc.safeguards,`Fallback tiers: ${Object.values(r.degradedPerformance).map(item=>`${item.label} ${fmt(item.maximumExternalG,3)} g`).join('; ')}.`].map(text=>node('li','',text)));
    failures?.replaceChildren(...irc.failureModes.map(text=>node('li','',text)));
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
    const body=$('exo-vessel-technology-body');if(body){body.replaceChildren();for(const item of technology.subsystemVariants){const row=node('tr');row.append(node('td','',item.label),node('td','',item.principalBand),node('td','',item.variant),node('td','',`${item.offset>=0?'+':''}${fmt(item.offset,2)}`),node('td','',item.heritageBand),node('td','',item.rationale));body.append(row);}}
    renderInertial(vessel);
  }

  function loadStatCharts(){
    if(globalThis.BlacklightExoStatCharts||document.querySelector('script[src="blacklight-exo-stat-charts.js"]'))return;
    const script=document.createElement('script');script.src='blacklight-exo-stat-charts.js';script.defer=true;document.head.append(script);
  }

  ensureConditionControl();
  ensureSection();
  ensureInertialSection();
  document.addEventListener('blacklight:exo-vessel-generated',event=>render(event.detail?.vessel));
  queueMicrotask(()=>render(globalThis.BlacklightExoGetActiveVessel?.()));
  loadStatCharts();
})();