(() => {
  'use strict';
  const V=globalThis.BlacklightExoVessel,D=globalThis.BlacklightExoVesselConditionDefinitions;
  if(!V?.conditionHistoryVersion||!D||document.getElementById('exo-vessel-condition-history-section'))return;
  const $=id=>document.getElementById(id);
  const node=(tag,className='',text='')=>{const element=document.createElement(tag);if(className)element.className=className;if(text)element.textContent=text;return element;};
  const fmt=(value,digits=2)=>Number(value||0).toLocaleString(undefined,{maximumFractionDigits:digits});
  const mass=value=>{const tonnes=Math.max(0,Number(value)||0);if(tonnes>=1e9)return`${fmt(tonnes/1e9)} billion t`;if(tonnes>=1e6)return`${fmt(tonnes/1e6)} million t`;if(tonnes>=1e3)return`${fmt(tonnes/1e3)} thousand t`;if(tonnes>=1)return`${fmt(tonnes)} t`;return`${fmt(tonnes*1000)} kg`;};
  const card=(label,title,body,state='')=>{const article=node('article','exo-vessel-card');if(state)article.dataset.state=state;article.append(node('small','',label),node('h3','',title),node('p','',body));return article;};
  function addControls(){
    const grid=document.querySelector('.exo-vessel-control-grid');if(!grid||$('exo-vessel-condition-mode'))return;
    const validation=node('label');validation.append(node('span','','Condition validation mode'));const select=node('select');select.id='exo-vessel-condition-mode';select.add(new Option('Repair deterministically','REPAIR'));select.add(new Option('Reject invalid history','STRICT'));validation.append(select);grid.append(validation);select.addEventListener('change',()=>$('exo-vessel-generate')?.click());
  }
  function table(headers,bodyId){const wrap=node('div','exo-vessel-table-wrap'),table=node('table','exo-vessel-table'),thead=node('thead'),row=node('tr');for(const header of headers)row.append(node('th','',header));thead.append(row);const body=node('tbody');body.id=bodyId;table.append(thead,body);wrap.append(table);return wrap;}
  function build(){
    const section=node('section','bli-section');section.id='exo-vessel-condition-history-section';const head=node('div','bli-section-head');head.append(node('p','bli-eyebrow','Charles // VESSEL-05 condition and history'),node('h2','','The intact design is not the vessel that remains.'),node('p','','Construction shortfall, commissioning, wear, teardown, mothballing, abandonment, salvage, damage, wreckage, and total destruction are applied to persistent module identities and surviving graphs without erasing the intact reference authority.'));
    const actions=node('div','bli-actions'),exportButton=node('button','bli-action','Export Condition History');exportButton.type='button';exportButton.id='exo-vessel-export-condition-history';actions.append(exportButton);head.append(actions);
    const grid=node('div','exo-vessel-grid');grid.id='exo-vessel-condition-history-grid';
    const capacity=node('div','exo-vessel-grid');capacity.id='exo-vessel-condition-capacity-grid';
    const filterWrap=node('div','exo-vessel-control-grid'),filterLabel=node('label');filterLabel.append(node('span','','Module-state filter'));const filter=node('select');filter.id='exo-vessel-condition-filter';for(const value of['ALL',...D.installationStates,...D.serviceStates])filter.add(new Option(value.replaceAll('_',' '),value));filterLabel.append(filter);filterWrap.append(filterLabel);
    const moduleTable=table(['Module','Type','Installation','Service','Disposition','Condition','Damage','Residual mass','Graph'], 'exo-vessel-condition-module-body');
    const eventTable=table(['Sequence','Event','Target','Magnitude','Source','Description'], 'exo-vessel-condition-event-body');
    const zoneTable=table(['Zone','State','Physical / reference','Active','Atmosphere','Contamination'], 'exo-vessel-condition-zone-body');
    const graphTable=table(['Graph','Surviving nodes','Surviving edges','Severed routes'], 'exo-vessel-condition-graph-body');
    const repairTitle=node('h3','','Deterministic condition repairs');repairTitle.id='exo-vessel-condition-repair-title';const repairList=node('ul','exo-vessel-warning-list');repairList.id='exo-vessel-condition-repair-log';
    section.append(head,grid,capacity,filterWrap,moduleTable,eventTable,zoneTable,graphTable,repairTitle,repairList);
    const anchor=$('exo-vessel-voxel-section')||$('exo-vessel-module-graph-section')||$('exo-vessel-contract-section')||document.querySelector('.exo-vessel-overview');if(anchor)anchor.insertAdjacentElement('afterend',section);else document.querySelector('main')?.append(section);
    exportButton.addEventListener('click',exportHistory);filter.addEventListener('change',()=>render(globalThis.BlacklightExoGetActiveVessel?.()));
  }
  function exportHistory(){const vessel=globalThis.BlacklightExoGetActiveVessel?.(),history=vessel?.conditionHistory;if(!history)return;const blob=new Blob([JSON.stringify(history,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${vessel.seed}-condition-history.json`;document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);}
  function replaceCards(id,rows){$(id)?.replaceChildren(...rows.map(row=>card(...row)));}
  function render(vessel){
    const history=vessel?.conditionHistory;if(!history)return;const r=history.recalculated;
    replaceCards('exo-vessel-condition-history-grid',[
      ['Lifecycle template',history.activeTemplate.replaceAll('_',' '),`${history.serviceDoctrine} service doctrine; ${history.events.length} deterministic history events.`],
      ['Vessel coherence',history.coherentVesselGraph?'Coherent vessel or wreck':'No coherent vessel graph',history.coherentVesselGraph?`${r.componentCount} structural component${r.componentCount===1?'':'s'}; largest surviving authority holds ${fmt(r.largestCoherentComponentFraction*100,1)}% of residual mass.`:'Material may remain as debris, but no effective vessel topology survives.',history.coherentVesselGraph?'ok':'warning'],
      ['Residual material',mass(r.residualMassTonnes),`${fmt(r.residualMassFraction*100,2)}% of reference mass remains; ${mass(r.salvageableMassTonnes)} is currently recoverable.`],
      ['Module inventory',`${r.operationalModuleCount} operational`,`${r.installedModuleCount} physically installed or wrecked; ${r.missingModuleCount} missing, ${r.removedModuleCount} removed, ${r.damagedModuleCount} damaged, and ${r.destroyedModuleCount} destroyed.`],
      ['Effective routing',`${r.severedRouteCount} severed routes`,`${history.routeStates.filter(route=>route.functional).length} routes remain functionally connected.`],
      ['Condition validation',history.validation.valid?'Valid':'Invalid',history.validation.valid?`${history.validation.repairCount} deterministic repair${history.validation.repairCount===1?'':'s'} retained in the record.`:history.validation.violations.join(' '),history.validation.valid?'ok':'warning']
    ]);
    replaceCards('exo-vessel-condition-capacity-grid',[
      ['Readiness',`${fmt(r.readinessScore,1)}%`,'Recalculated from surviving power, cooling, propulsion, sensors, atmosphere, data, and requested readiness.'],
      ['Power',`${fmt(r.powerCapacityPercent,1)}%`,'Operational reactor and energy-storage capacity relative to the intact reference.'],
      ['Cooling',`${fmt(r.coolingCapacityPercent,1)}%`,'Operational thermal-control and dedicated weapon-cooling capacity.'],
      ['Life support',`${fmt(r.lifeSupportCapacityPercent,1)}%`,'Operational habitat, medical, and life-support capacity.'],
      ['Propulsion',`${fmt(r.propulsionCapacityPercent,1)}%`,'Operational main engines, drive apparatus, and integration authority.'],
      ['Sensors and data',`${fmt(r.sensorsCapacityPercent,1)}%`,'Operational navigation, sensor, fire-control, and electronic-warfare capacity.'],
      ['Weapons',`${fmt(r.weaponsCapacityPercent,1)}%`,'Installed weapon and support capacity only; engagement performance remains deferred.'],
      ['Cargo and reserve',`${fmt(r.cargoCapacityPercent,1)}%`,'Remaining cargo and reserved mission volume capacity.']
    ]);
    const filter=$('exo-vessel-condition-filter')?.value||'ALL',moduleMap=new Map(vessel.moduleGraph.modules.map(module=>[module.moduleId,module]));const moduleBody=$('exo-vessel-condition-module-body');if(moduleBody){moduleBody.replaceChildren();for(const state of history.moduleStates){if(filter!=='ALL'&&state.installationState!==filter&&state.serviceState!==filter)continue;const module=moduleMap.get(state.moduleId),row=node('tr');for(const value of[module?.label||state.moduleId,module?.semanticType||'unknown',state.installationState,state.serviceState,state.disposition,`${fmt(state.conditionPercent,1)}%`,`${fmt(state.damagePercent,1)}%`,mass(state.residualMassTonnes),state.graphParticipation])row.append(node('td','',value));moduleBody.append(row);}}
    const eventBody=$('exo-vessel-condition-event-body');if(eventBody){eventBody.replaceChildren();for(const event of history.events){const row=node('tr');for(const value of[event.sequence,event.eventType.replaceAll('_',' '),`${event.targetType}: ${event.targetIds.length}`,`${fmt(event.magnitude,1)}%`,event.source,event.description])row.append(node('td','',String(value)));eventBody.append(row);}}
    const zoneBody=$('exo-vessel-condition-zone-body');if(zoneBody){zoneBody.replaceChildren();for(const zone of history.zoneStates){const row=node('tr');for(const value of[zone.label,zone.state,`${zone.physicalModuleCount} / ${zone.referenceModuleCount}`,zone.activeModuleCount,`${fmt(zone.atmosphereIntegrityPercent,1)}%`,`${fmt(zone.contaminationPercent,1)}%`])row.append(node('td','',String(value)));zoneBody.append(row);}}
    const graphBody=$('exo-vessel-condition-graph-body');if(graphBody){graphBody.replaceChildren();for(const[name,graph]of Object.entries(history.effectiveGraphs)){const severed=history.routeStates.filter(route=>route.graphType===name&&!route.functional).length,row=node('tr');for(const value of[name,graph.nodes.length,graph.edges.length,severed])row.append(node('td','',String(value)));graphBody.append(row);}}
    const repairs=$('exo-vessel-condition-repair-log');if(repairs)repairs.replaceChildren(...(history.repairLog.length?history.repairLog.map(repair=>node('li','',`${repair.type}: ${repair.description}`)):[node('li','','No repairs were required.')]);
  }
  addControls();build();document.addEventListener('blacklight:exo-vessel-generated',event=>render(event.detail?.vessel));queueMicrotask(()=>render(globalThis.BlacklightExoGetActiveVessel?.()));
})();