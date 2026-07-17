(() => {
  'use strict';
  const V=globalThis.BlacklightExoVessel;
  const D=globalThis.BlacklightExoVesselEngineeringDefinitions;
  if(!V?.engineeringLedgerVersion||!D||document.getElementById('exo-vessel-engineering-section'))return;
  const $=id=>document.getElementById(id);
  const node=(tag,className='',text='')=>{const element=document.createElement(tag);if(className)element.className=className;if(text)element.textContent=text;return element;};
  const fmt=(value,digits=3)=>Number(value||0).toLocaleString(undefined,{maximumFractionDigits:digits});
  const mass=value=>{const tonnes=Math.max(0,Number(value)||0);if(tonnes>=1e9)return`${fmt(tonnes/1e9)} billion t`;if(tonnes>=1e6)return`${fmt(tonnes/1e6)} million t`;if(tonnes>=1e3)return`${fmt(tonnes/1e3)} thousand t`;if(tonnes>=1)return`${fmt(tonnes)} t`;return`${fmt(tonnes*1000)} kg`;};
  const power=value=>{const watts=Math.max(0,Number(value)||0);if(watts>=1e15)return`${fmt(watts/1e15)} PW`;if(watts>=1e12)return`${fmt(watts/1e12)} TW`;if(watts>=1e9)return`${fmt(watts/1e9)} GW`;if(watts>=1e6)return`${fmt(watts/1e6)} MW`;if(watts>=1e3)return`${fmt(watts/1e3)} kW`;return`${fmt(watts)} W`;};

  function addControl(){
    const grid=document.querySelector('.exo-vessel-control-grid');
    if(!grid||$('exo-vessel-combat-fit'))return;
    const label=node('label');label.append(node('span','','Combat systems fit'));
    const select=node('select');select.id='exo-vessel-combat-fit';select.add(new Option('Infer from mission role','AUTO'));
    for(const key of['UNARMED','CIVILIAN','DEFENSIVE','SECURITY','NAVAL'])select.add(new Option(D.combatFits[key].label,key));
    label.append(select);grid.append(label);
    select.addEventListener('change',()=>$('exo-vessel-generate')?.click());
  }
  function section(eyebrow,title,description,id){const wrapper=node('section','bli-section');wrapper.id=id;const head=node('div','bli-section-head');head.append(node('p','bli-eyebrow',eyebrow),node('h2','',title),node('p','',description));wrapper.append(head);return wrapper;}
  function buildSections(){
    const manufacturer=$('exo-vessel-manufacturer-section'),anchor=manufacturer||$('exo-vessel-designation-section')||document.querySelector('.exo-vessel-overview');
    if(!anchor)return;
    const engineering=section('Charles // VESSEL-02 engineering ledger','Conventional maneuver, protection, sensors, and combat support now close against the loaded vessel.','Only conventional reaction mass is added. Armor, active protection, sensors, fire control, electronic warfare, weapon supports, magazines, cooling, and countermeasures are reclassified from the previous broad engineering rows so the ledger cannot quietly count the same mass twice.','exo-vessel-engineering-section');
    const grid=node('div','exo-vessel-grid');grid.id='exo-vessel-engineering-grid';engineering.append(grid);

    const armor=section('Charles // physical protection ledger','Armor is area, areal density, coverage, architecture, and mass.','The passive armor equation is shown directly. Active fields remain a separate hardware mass, and the model records the point at which interception, avoidance, and damage localization matter more than pretending passive armor can absorb arbitrary impact energy.','exo-vessel-armor-section');
    const armorGrid=node('div','exo-vessel-grid');armorGrid.id='exo-vessel-armor-grid';
    const armorTable=node('div','exo-vessel-table-wrap');armorTable.innerHTML='<table class="exo-vessel-table"><thead><tr><th>Layer</th><th>Mass</th><th>Share</th><th>Physical areal density</th><th>Effective areal density</th></tr></thead><tbody id="exo-vessel-armor-body"></tbody></table>';armor.append(armorGrid,armorTable);

    const combat=section('Charles // installed combat systems','A weapon is not merely its barrel or launcher.','Every installed family includes mount structure, recoil or launch paths, power conditioning, handling machinery, finite magazines or replaceable emitter inventory, cooling, and support. Performance, guidance, beam divergence, hit probability, and engagement range are deliberately deferred to the later combat phases.','exo-vessel-combat-section');
    const combatGrid=node('div','exo-vessel-grid');combatGrid.id='exo-vessel-combat-grid';
    const weaponTable=node('div','exo-vessel-table-wrap');weaponTable.innerHTML='<table class="exo-vessel-table"><thead><tr><th>Family</th><th>Total allocation</th><th>Mount</th><th>Support</th><th>Magazine</th><th>Cooling</th><th>Peak power</th><th>Inventory</th></tr></thead><tbody id="exo-vessel-weapon-body"></tbody></table>';
    const counterGrid=node('div','exo-vessel-grid');counterGrid.id='exo-vessel-countermeasure-grid';combat.append(combatGrid,weaponTable,counterGrid);

    anchor.insertAdjacentElement('afterend',engineering);engineering.insertAdjacentElement('afterend',armor);armor.insertAdjacentElement('afterend',combat);
  }
  function card(label,title,body,state=''){const article=node('article','exo-vessel-card');if(state)article.dataset.state=state;article.append(node('small','',label),node('h3','',title),node('p','',body));return article;}
  function renderCards(target,rows){target?.replaceChildren(...rows.map(row=>card(...row)));}

  function render(event){
    const vessel=event?.detail?.vessel||globalThis.BlacklightExoGetActiveVessel?.(),ledger=vessel?.engineeringLedger;
    if(!ledger)return;
    const p=ledger.propulsion,a=ledger.armor,s=ledger.sensors,w=ledger.weapons;
    const badges=$('exo-vessel-badges');if(badges&&!([...badges.children].some(item=>item.textContent===w.combatFit.label)))badges.append(node('span','',w.combatFit.label),node('span','',`${fmt(p.lateralCombatAccelerationMps2/9.80665,3)} g lateral`));
    renderCards($('exo-vessel-engineering-grid'),[
      ['Conventional propulsion',p.technology.label,`${p.technology.propellant}; ${mass(p.engineHardwareMassTonnes)} installed engine hardware and ${mass(p.propellantMassTonnes)} reaction mass.`,'ok'],
      ['Strategic delta-v',vessel.propulsion.strategicDeltaVText,`${vessel.propulsion.combatReserveDeltaVText} is segregated as immediate combat reserve; ${mass(p.combatPropellantTonnes)} of reaction mass supports that reserve.`],
      ['Combat acceleration',`${fmt(p.lateralCombatAccelerationMps2/9.80665,3)} g lateral`,`${fmt(p.longitudinalAccelerationMps2/9.80665,3)} g longitudinal after the ${fmt(p.structuralAccelerationLimitG,3)} g structural and ${fmt(p.crewAccelerationLimitG,3)} g biological limits.`],
      ['Sustained combat maneuver',vessel.propulsion.sustainedCombatDurationText,`${p.propellantLimitedSeconds<p.thermalLimitedSeconds?'Reaction mass':'Thermal capacity'} is the first limiting resource at full modeled output.`],
      ['Sensor plant',`${s.sensorChannels} sensor channels`,`${fmt(s.apertureAreaM2,2)} m² aperture area, ${fmt(s.baselineM,1)} m baseline, and ${fmt(s.processingIndex,2)} processing index.`],
      ['Fire control',`${s.fireControlChannels} channels`,`${fmt(s.stabilizationMicrorad,3)} microradian reference stabilization using ${power(s.fireControlPowerW)} modeled fire-control power.`],
      ['Electronic warfare',`${s.electronicWarfareChannels} channels`,`${mass(s.masses.electronicWarfare)} installed mass and ${power(s.electronicWarfarePowerW)} modeled power.`],
      ['Engineering validation',ledger.validation.valid?'Mass and equations closed':'Engineering violation detected',ledger.validation.valid?`Loaded mass is ${mass(ledger.massClosure.actualLoadedMassTonnes)} with ${mass(ledger.addedReactionMassTonnes)} of newly added conventional reaction mass.`:ledger.validation.violations.join(' '),ledger.validation.valid?'ok':'warning']
    ]);

    renderCards($('exo-vessel-armor-grid'),[
      ['Passive armor mass',mass(a.passiveArmorMassTonnes),`${fmt(a.armorToMassPercent,3)}% armor-to-loaded-mass ratio.`],
      ['Active protection mass',mass(a.fieldProtectionMassTonnes),`${fmt(a.protectionToMassPercent,3)}% total protection-to-loaded-mass ratio when passive and active protection are combined.`],
      ['Protected envelope',`${fmt(a.coverageFraction*100,1)}% coverage`,`${fmt(a.protectedSurfaceAreaM2,1)} m² reference surface area.`],
      ['Physical areal density',`${fmt(a.physicalArealDensityKgM2,2)} kg/m²`,`Equation check: area × density × coverage = ${mass(a.equationMassTonnes)}.`],
      ['Architecture-adjusted density',`${fmt(a.effectiveArealDensityKgM2,2)} kg/m² effective`,`${fmt(a.architectureEfficiency,3)}× ${a.architecture} architecture efficiency.`],
      ['Relativistic boundary','Avoidance and graph survival',a.relativisticBoundary]
    ]);
    const armorBody=$('exo-vessel-armor-body');if(armorBody){armorBody.replaceChildren();for(const layer of a.layers){const row=node('tr');for(const value of[layer.label,mass(layer.massTonnes),`${fmt(layer.fraction*100,2)}%`,`${fmt(layer.physicalArealDensityKgM2,2)} kg/m²`,`${fmt(layer.effectiveArealDensityKgM2,2)} kg/m²`])row.append(node('td','',value));armorBody.append(row);}}

    renderCards($('exo-vessel-combat-grid'),[
      ['Combat fit',w.combatFit.label,`${mass(w.totalCombatAllocationTonnes)} reclassified from ${mass(w.payloadContributionTonnes)} of mission payload and ${mass(w.marginContributionTonnes)} of design margin.`],
      ['Offensive installation',mass(w.offensiveMassTonnes),`${w.installations.length} installed weapon families; no engagement ranges have yet been assigned.`],
      ['Countermeasure installation',mass(w.countermeasureMassTonnes),`${w.countermeasures.inventory.reduce((total,item)=>total+item.unitCount,0)} modeled expendable units plus their launch and support plant.`],
      ['Weapon peak power',power(w.totals.peakPowerW),`${power(w.totals.continuousPowerW)} modeled sustained weapon demand and ${power(w.totals.wasteHeatW)} waste heat.`]
    ]);
    const weaponBody=$('exo-vessel-weapon-body');if(weaponBody){weaponBody.replaceChildren();for(const item of w.installations){const row=node('tr');const inventory=item.unitRoundMassTonnes>0?`${item.roundCount.toLocaleString()} units at ${mass(item.unitRoundMassTonnes)} each`:'Power-limited emitter inventory';for(const value of[item.label,mass(item.allocationMassTonnes),mass(item.mountMassTonnes),mass(item.supportMassTonnes),mass(item.magazineMassTonnes),mass(item.coolingMassTonnes),power(item.peakPowerW),inventory])row.append(node('td','',value));weaponBody.append(row);}}
    renderCards($('exo-vessel-countermeasure-grid'),w.countermeasures.inventory.map(item=>[item.label,`${item.unitCount.toLocaleString()} units`,`${mass(item.allocationMassTonnes)} total: ${mass(item.launcherAndSupportMassTonnes)} launcher and support plant plus ${mass(item.expendableMassTonnes)} expendables. ${item.functions.join('; ')}.`]));
  }

  addControl();buildSections();
  document.addEventListener('blacklight:exo-vessel-generated',render);
  queueMicrotask(()=>{render();$('exo-vessel-generate')?.click();});
})();
