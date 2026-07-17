(() => {
  'use strict';
  const V=globalThis.BlacklightExoVessel;
  if(!V?.moduleGraphVersion||document.getElementById('exo-vessel-module-graph-section'))return;
  const $=id=>document.getElementById(id);
  const node=(tag,className='',text='')=>{const element=document.createElement(tag);if(className)element.className=className;if(text)element.textContent=text;return element;};
  const fmt=(value,digits=2)=>Number(value||0).toLocaleString(undefined,{maximumFractionDigits:digits});
  const mass=value=>{const tonnes=Math.max(0,Number(value)||0);if(tonnes>=1e9)return`${fmt(tonnes/1e9,3)} billion t`;if(tonnes>=1e6)return`${fmt(tonnes/1e6,3)} million t`;if(tonnes>=1e3)return`${fmt(tonnes/1e3,3)} thousand t`;if(tonnes>=1)return`${fmt(tonnes,3)} t`;return`${fmt(tonnes*1000,3)} kg`;};

  function addControls(){
    const grid=document.querySelector('.exo-vessel-control-grid');
    if(grid&&!$('exo-vessel-graph-mode')){
      const label=node('label');
      label.append(node('span','','Semantic graph validation'));
      const select=node('select');select.id='exo-vessel-graph-mode';
      select.add(new Option('Repair deterministically and record changes','REPAIR'));
      select.add(new Option('Strictly reject invalid connectivity','STRICT'));
      label.append(select);grid.append(label);
      select.addEventListener('change',()=>$('exo-vessel-generate')?.click());
    }
    const actions=document.querySelector('.exo-vessel-hero .bli-actions');
    if(actions&&!$('exo-vessel-export-module-graph')){
      const button=node('button','bli-action','Export Module Graph JSON');button.id='exo-vessel-export-module-graph';button.type='button';actions.append(button);
      button.addEventListener('click',()=>{
        const graph=globalThis.BlacklightExoGetActiveVessel?.()?.moduleGraph;if(!graph)return;
        const blob=new Blob([`${JSON.stringify(graph,null,2)}\n`],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');
        anchor.href=url;anchor.download=`${graph.vesselInstanceId}-module-graph.json`;anchor.click();URL.revokeObjectURL(url);
      });
    }
  }
  function section(eyebrow,title,description,id){
    const wrapper=node('section','bli-section');wrapper.id=id;
    const head=node('div','bli-section-head');head.append(node('p','bli-eyebrow',eyebrow),node('h2','',title),node('p','',description));wrapper.append(head);return wrapper;
  }
  function build(){
    const wrapper=section('Charles // VESSEL-03 semantic module graph','The closed mass ledger is now a connected physical machine.','Every module has a persistent identity, structural parent, service envelope, pressure-zone assignment, technology record, declared utility requirements and explicit graph edges. Invalid connectivity is either rejected or repaired deterministically with the original violations retained.','exo-vessel-module-graph-section');
    const grid=node('div','exo-vessel-grid');grid.id='exo-vessel-module-graph-grid';wrapper.append(grid);
    const graphWrap=node('div','exo-vessel-table-wrap');graphWrap.innerHTML='<table class="exo-vessel-table"><thead><tr><th>Network</th><th>Nodes</th><th>Edges</th><th>Engineering meaning</th></tr></thead><tbody id="exo-vessel-graph-network-body"></tbody></table>';wrapper.append(graphWrap);
    const moduleWrap=node('div','exo-vessel-table-wrap');moduleWrap.innerHTML='<table class="exo-vessel-table"><thead><tr><th>Module</th><th>Type / envelope</th><th>Mass / volume</th><th>Parent / pressure zone</th><th>Required connections</th></tr></thead><tbody id="exo-vessel-module-body"></tbody></table>';wrapper.append(moduleWrap);
    const zoneWrap=node('div','exo-vessel-table-wrap');zoneWrap.innerHTML='<table class="exo-vessel-table"><thead><tr><th>Pressure or buffer zone</th><th>Environment</th><th>Modules</th><th>Isolation / evacuation</th></tr></thead><tbody id="exo-vessel-pressure-zone-body"></tbody></table>';wrapper.append(zoneWrap);
    const hardpointWrap=node('div','exo-vessel-table-wrap');hardpointWrap.innerHTML='<table class="exo-vessel-table"><thead><tr><th>Weapon family</th><th>Facing and arc</th><th>Load path</th><th>Magazine / support / cooling</th><th>Sensor authority</th></tr></thead><tbody id="exo-vessel-hardpoint-body"></tbody></table>';wrapper.append(hardpointWrap);
    const repairTitle=node('h3','','Deterministic validation and repair log');repairTitle.id='exo-vessel-repair-title';
    const repairs=node('ul','exo-vessel-warning-list');repairs.id='exo-vessel-module-repair-log';wrapper.append(repairTitle,repairs);
    const anchor=$('exo-vessel-engineering-section')||$('exo-vessel-manufacturer-section')||document.querySelector('.exo-vessel-overview');
    anchor?.insertAdjacentElement('afterend',wrapper);
  }
  function card(label,title,body,state=''){
    const article=node('article','exo-vessel-card');if(state)article.dataset.state=state;article.append(node('small','',label),node('h3','',title),node('p','',body));return article;
  }
  function render(event){
    const vessel=event?.detail?.vessel||globalThis.BlacklightExoGetActiveVessel?.(),graph=vessel?.moduleGraph;if(!graph)return;
    const internal=graph.modules.filter(module=>module.envelope==='INTERNAL').length,eva=graph.modules.length-internal,edgeCount=Object.values(graph.graphs).reduce((total,network)=>total+network.edges.length,0);
    $('exo-vessel-module-graph-grid')?.replaceChildren(
      card('Graph authority',graph.validation.valid?'Validated semantic graph':'Invalid graph',`${graph.vesselInstanceId}; ${graph.validationMode} mode; ${graph.validation.repairCount} deterministic repair${graph.validation.repairCount===1?'':'s'}.`,graph.validation.valid?'ok':'warning'),
      card('Selected topology',graph.topology.key,`${graph.topology.source}. The ${graph.topology.architecture} construction philosophy remains separate from physical topology.`),
      card('Physical module inventory',`${graph.modules.length} modules`,`${internal} internal and ${eva} EVA-mounted modules close to ${mass(graph.validation.moduleMassTonnes)} and ${fmt(graph.validation.moduleVolumeM3,1)} m³.`),
      card('Pressure and buffer zones',`${graph.pressureZones.length} zones`,`${graph.pressureZones.filter(zone=>zone.inhabited).length} inhabited, ${graph.pressureZones.filter(zone=>zone.isolated).length} isolated, and ${graph.pressureZones.filter(zone=>zone.key.startsWith('MAGAZINE-')).length} dedicated magazine zones.`),
      card('Connectivity',`${edgeCount} utility edges`,`${graph.loadPaths.length} principal structural load paths across ${Object.keys(graph.graphs).length} explicit networks.`),
      card('Combat integration',`${graph.weaponHardpoints.length} weapon hardpoints`,`${graph.sensorRequirements.length} sensor requirements; weapon performance remains deferred to VESSEL-07.`)
    );
    const networkBody=$('exo-vessel-graph-network-body');if(networkBody){networkBody.replaceChildren();
      const meanings={structural:'Attachments and continuous load-bearing authority.',power:'Generation and isolatable power feeds.',cooling:'Coolant supply, return, and heat-rejection routing.',data:'Authenticated command, control, and telemetry.',atmosphere:'Environmental supply and recovery loops.',access:'Internal corridors or EVA and remote service routes.',magazineFeed:'Isolated ammunition, missile, projectile, or emitter feeds.',sensorDependency:'Target tracks and authorized fire-control solutions.'};
      for(const [name,network]of Object.entries(graph.graphs)){const tr=node('tr');for(const value of[name,network.nodes.length,network.edges.length,meanings[name]||'Explicit dependency network.'])tr.append(node('td','',String(value)));networkBody.append(tr);}
    }
    const moduleBody=$('exo-vessel-module-body');if(moduleBody){moduleBody.replaceChildren();
      for(const module of graph.modules){const tr=node('tr'),requirements=Object.entries(module.requirements).filter(([,value])=>value).map(([key])=>key).join(', ')||'structural only';
        const parent=`${module.attachment.parentId}\n${module.pressureZoneId||'vacuum / no pressure zone'}`;
        for(const value of[`${module.label}\n${module.moduleId}`,`${module.semanticType}\n${module.envelope} · ${module.serviceMode}`,`${mass(module.massTonnes)}\n${fmt(module.volumeM3,2)} m³`,parent,requirements])tr.append(node('td','',value));moduleBody.append(tr);}
    }
    const zoneBody=$('exo-vessel-pressure-zone-body');if(zoneBody){zoneBody.replaceChildren();
      for(const zone of graph.pressureZones){const tr=node('tr');for(const value of[`${zone.label}\n${zone.zoneId}`,zone.environment,String(zone.moduleIds.length),`${zone.isolated?'isolated':'shared'}${zone.evacuationTargets.length?`; evacuation to ${zone.evacuationTargets.join(', ')}`:''}`])tr.append(node('td','',value));zoneBody.append(tr);}
    }
    const hardpointBody=$('exo-vessel-hardpoint-body');if(hardpointBody){hardpointBody.replaceChildren();
      if(!graph.weaponHardpoints.length){const tr=node('tr'),td=node('td','', 'No weapon hardpoints are installed under the selected combat fit.');td.colSpan=5;tr.append(td);hardpointBody.append(tr);}
      for(const hp of graph.weaponHardpoints){const tr=node('tr');for(const value of[hp.weaponFamily,`${hp.facing}; ${fmt(hp.arc.horizontalArcDeg,0)}° × ${fmt(hp.arc.verticalArcDeg,0)}°`,hp.recoilPathId||'invalid',`${hp.magazineModuleIds.length} magazine · ${hp.supportModuleIds.length} support · ${hp.coolingModuleIds.length} cooling`,`${hp.sensorModuleIds.length} sensor · ${hp.fireControlModuleIds.length} fire-control`])tr.append(node('td','',value));hardpointBody.append(tr);}
    }
    const repairs=$('exo-vessel-module-repair-log');if(repairs){repairs.replaceChildren();
      const rows=graph.repairLog.length?graph.repairLog:[{type:'NO_REPAIR_REQUIRED',description:'The generated graph passed attachment, utility, pressure-zone, load-path, magazine and sensor-dependency validation without repair.'}];
      for(const item of rows)repairs.append(node('li','',`${item.type}: ${item.description}`));
    }
  }
  addControls();build();document.addEventListener('blacklight:exo-vessel-generated',render);queueMicrotask(()=>{render();$('exo-vessel-generate')?.click();});
})();