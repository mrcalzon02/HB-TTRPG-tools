(() => {
  'use strict';
  const V=globalThis.BlacklightExoVessel;
  const P=globalThis.BlacklightExoVesselPhilosophyDefinitions;
  if(!V?.philosophyVersion||!P||document.getElementById('exo-vessel-philosophy-section'))return;

  const $=id=>document.getElementById(id);
  const node=(tag,className='',text='')=>{const element=document.createElement(tag);if(className)element.className=className;if(text)element.textContent=text;return element;};
  const fmt=(value,digits=2)=>Number(value||0).toLocaleString(undefined,{maximumFractionDigits:digits});
  const mass=tonnes=>{const value=Math.max(0,Number(tonnes)||0);if(value>=1e9)return`${fmt(value/1e9,3)} billion t`;if(value>=1e6)return`${fmt(value/1e6,3)} million t`;if(value>=1e3)return`${fmt(value/1e3,3)} thousand t`;if(value>=1)return`${fmt(value,3)} t`;return`${fmt(value*1000,3)} kg`;};

  function addControls(){
    const grid=document.querySelector('.exo-vessel-control-grid');if(!grid)return;
    const archetype=node('label');archetype.innerHTML='<span>Originating design archetype</span><select id="exo-vessel-archetype"><option value="inherit">Infer from species, organization, and mission</option></select>';
    const select=archetype.querySelector('select');for(const item of V.manufacturerProfiles)select.add(new Option(`${item.label} · ${Math.round(item.internalsBias*100)}/${Math.round(item.evaBias*100)} internal/EVA`,item.key));
    const envelope=node('label');envelope.innerHTML='<span>Core architecture envelope</span><select id="exo-vessel-envelope"><option value="AUTO">Seed-weighted automatic</option><option value="INTERNAL">Force Internals-first</option><option value="EVA">Force EVA-first</option><option value="HYBRID">Force balanced hybrid</option></select>';
    grid.append(archetype,envelope);
    for(const control of[select,envelope.querySelector('select')])control.addEventListener('change',()=>$('exo-vessel-generate')?.click());
  }

  function section(eyebrow,title,description,id){
    const wrapper=node('section','bli-section exo-vessel-philosophy-section');wrapper.id=id;
    const head=node('div','bli-section-head');head.append(node('p','bli-eyebrow',eyebrow),node('h2','',title),node('p','',description));wrapper.append(head);return wrapper;
  }

  function buildSections(){
    const overview=document.querySelector('.exo-vessel-overview');if(!overview)return;
    const designation=section('Charles // vessel designation and originating doctrine','What the designation says about the builder before it says anything about the mission.','The designation records the originating species or organization, manufacturer archetype, material flag, actual internal-versus-EVA volume ratio, and the architectural philosophy expressed by the completed vessel.','exo-vessel-designation-section');
    const designationGrid=node('div','exo-vessel-grid');designationGrid.id='exo-vessel-designation-grid';designation.append(designationGrid);

    const philosophy=section('Charles // core architecture implications','Internals-first and EVA-first are different survival and maintenance doctrines.','Neither philosophy is automatically superior. Internals-first spends mass and access time to protect a unified inhabited machine; EVA-first accepts exposed machinery and infrared visibility in exchange for modular isolation, replacement speed, and reduced cascading damage.','exo-vessel-philosophy-section');
    const selected=node('div','exo-vessel-grid');selected.id='exo-vessel-selected-philosophy';
    const comparison=node('div','exo-vessel-philosophy-comparison');comparison.id='exo-vessel-philosophy-comparison';philosophy.append(selected,comparison);

    const modules=section('Charles // module germination ledger','How each required subsystem physically entered the hull.','Every subsystem is assigned an INTERNAL or EVA envelope, a concrete physical form, a seed tag, an attachment parent, and the actuarial modifiers applied to its support mass, volume, repair access, protection, damage propagation, and thermal presentation.','exo-vessel-module-philosophy-section');
    const tableWrap=node('div','exo-vessel-table-wrap');tableWrap.innerHTML='<table class="exo-vessel-table exo-vessel-philosophy-table"><thead><tr><th>Subsystem</th><th>Envelope and concrete form</th><th>Required parent / routing</th><th>Baseline → final mass</th><th>Baseline → final volume</th><th>Actuarial effects</th></tr></thead><tbody id="exo-vessel-philosophy-body"></tbody></table>';modules.append(tableWrap);

    const sequence=section('Charles // procedural germination record','The seed must produce structure, routing, modules, and consequences in that order.','This record exposes the logical routing table used by the vessel generator rather than presenting the final silhouette as though it appeared without an engineering process.','exo-vessel-germination-section');
    const sequenceGrid=node('div','exo-vessel-grid');sequenceGrid.id='exo-vessel-germination-grid';sequence.append(sequenceGrid);

    overview.after(designation,philosophy,modules,sequence);
  }

  function card(label,title,text,state=''){
    const article=node('article','exo-vessel-card');if(state)article.dataset.state=state;article.append(node('small','',label),node('h3','',title),node('p','',text));return article;
  }
  function renderCards(target,rows){if(target)target.replaceChildren(...rows.map(row=>card(...row)));}
  function listCard(title,principle,benefits,tradeoffs,className){
    const article=node('article',`exo-vessel-philosophy-card ${className}`);article.append(node('p','bli-eyebrow',title),node('h3','',principle));
    const benefitsTitle=node('h4','','Beneficial tradeoffs');const benefitsList=node('ul');for(const item of benefits)benefitsList.append(node('li','',item));
    const costsTitle=node('h4','','Costs and vulnerabilities');const costsList=node('ul');for(const item of tradeoffs)costsList.append(node('li','',item));
    article.append(benefitsTitle,benefitsList,costsTitle,costsList);return article;
  }

  function render(event){
    const vessel=event?.detail?.vessel||globalThis.BlacklightExoGetActiveVessel?.();if(!vessel?.designPhilosophy)return;
    const d=vessel.designation,p=vessel.designPhilosophy,g=p.globalResults;
    document.body.dataset.vesselEnvelope=p.classification.toLowerCase();
    const badges=$('exo-vessel-badges');if(badges&&!([...badges.children].some(item=>item.textContent===d.code))){badges.append(node('span','',d.code),node('span','',`${p.classification} envelope`),node('span','',p.profile.material));}
    const description=$('exo-vessel-description');if(description)description.textContent=`${d.coreInterpretation} The inherited transit apparatus still establishes the principal mass, power, thermal, navigation, and maintenance constraints.`;

    renderCards($('exo-vessel-designation-grid'),[
      ['Designation code',d.code,`${d.full}. This code records ${d.originArchetype}, the ${p.classification} envelope, and ${fmt(d.internalsPercent,1)}% internal subsystem volume.`,'ok'],
      ['Originating doctrine',d.originArchetype,`${p.inferenceReason} Allowed seeded deviation ±${fmt(d.allowedDeviationVariance*100,1)} percentage points.`],
      ['Origin record',d.originSpecies,`${d.originOrganization}. The generator treats these as the species or organization responsible for the inherited design language.`],
      ['Primary structural material',d.primaryStructuralMaterial,`${fmt(p.pressurizedVolumeM3,1)} m³ pressure-vault volume and ${fmt(p.unpressurizedTrussVolumeM3,1)} m³ vacuum-truss volume.`],
      ['Actual architecture',`${fmt(d.internalsPercent,1)}% internal / ${fmt(d.evaPercent,1)}% EVA`,d.coreInterpretation],
      ['Attachment validation',p.attachmentValidation.valid?'All module parents valid':'Invalid module parents detected',p.attachmentValidation.valid?'Every INTERNAL module descends from an ATMOSPHERE_MANIFOLD parent and every EVA module attaches to a VACUUM_EXPOSED structural hardpoint.':`Invalid modules: ${p.attachmentValidation.invalidModules.join(', ')}` ,p.attachmentValidation.valid?'ok':'warning']
    ]);

    renderCards($('exo-vessel-selected-philosophy'),[
      ['Selected principle',`${p.classification} vessel`,p.selectedImplications.principle],
      ['Mass and volume result',`${fmt(g.massFactor,3)}× mass · ${fmt(g.volumeFactor,3)}× volume`,`The audited baseline hull became ${vessel.hull.totalMassText}; the unmodified baseline remains ${mass(vessel.hull.baselineMassTonnes)}.`],
      ['Protection behavior',`${fmt(g.armorEfficiency,3)}× effective armor index`,`${g.cascadingDamageRisk} cascading-damage risk (${fmt(g.cascadingDamageRiskIndex,3)} index).`],
      ['Maintainability',`${fmt(g.maintainabilityRating,1)}/100 rating`,`${fmt(g.repairTimeMultiplier,3)}× weighted repair-time multiplier after the ${fmt(g.standardizationIndex,2)} standardization index.`],
      ['Thermal presentation',`${fmt(g.thermalSignatureMultiplier,3)}× signature`,`Lower values retain more heat behind the hull; higher values radiate more directly and are easier to detect.`],
      ['Production consequence',`${fmt(g.productionCostFactor,3)}× relative cost`,`Combines modified mass, occupied volume, and manufacturer standardization without changing the qualified transit physics.`]
    ]);

    const compare=$('exo-vessel-philosophy-comparison');if(compare)compare.replaceChildren(
      listCard('INTERNALS-FIRST',p.comparison.INTERNAL.principle,p.comparison.INTERNAL.benefits,p.comparison.INTERNAL.tradeoffs,'is-internal'),
      listCard('EVA-FIRST',p.comparison.EVA.principle,p.comparison.EVA.benefits,p.comparison.EVA.tradeoffs,'is-eva')
    );

    const body=$('exo-vessel-philosophy-body');if(body){body.replaceChildren();
      for(const row of p.moduleAssignments){
        const tr=node('tr');tr.dataset.envelope=row.envelope.toLowerCase();
        const form=`${row.envelope} · ${row.concreteForm}\n${row.germinationTag}`;
        const parent=`${row.attachment.parentId}\nRequires ${row.attachment.requiredProperty}; ${row.utilityRouting}`;
        const massChange=`${mass(row.baselineMassTonnes)} → ${mass(row.finalMassTonnes)}\n${mass(row.physicalInventoryFloorTonnes)} immutable contents`;
        const volumeChange=`${fmt(row.baselineVolumeM3,1)} → ${fmt(row.finalVolumeM3,1)} m³`;
        const modifiers=`Mass ${fmt(row.modifiers.massMultiplier,2)}×; volume ${fmt(row.modifiers.volumeMultiplier,2)}×; armor ${fmt(row.modifiers.armorEfficiency,2)}×; repair ${fmt(row.modifiers.repairTimeMultiplier,2)}×; cascade ${row.modifiers.cascadeRisk}; thermal ${fmt(row.modifiers.thermalSignatureMultiplier,2)}×.`;
        for(const value of[row.label,form,parent,massChange,volumeChange,modifiers])tr.append(node('td','',value));body.append(tr);
      }
    }

    renderCards($('exo-vessel-germination-grid'),p.germinationSequence.map(step=>[`Step ${step.step} · ${step.key}`,step.label,`${step.output} Status: ${step.status}.`,'ok']));
  }

  addControls();buildSections();document.addEventListener('blacklight:exo-vessel-generated',render);$('exo-vessel-generate')?.click();
})();
