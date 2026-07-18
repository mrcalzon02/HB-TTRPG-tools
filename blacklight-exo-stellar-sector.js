(() => {
  'use strict';
  const SNAPSHOT_KEY='blacklight-exo-sector-snapshots-v1';
  const $=id=>document.getElementById(id);
  const node=(tag,className='',text='')=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==''&&text!=null)n.textContent=String(text);return n;};
  const fmt=(value,digits=2)=>Number(value||0).toLocaleString(undefined,{maximumFractionDigits:digits});
  const idle=callback=>('requestIdleCallback'in window?requestIdleCallback(callback,{timeout:160}):setTimeout(()=>callback({timeRemaining:()=>8,didTimeout:true}),16));
  let sector=null,archiveHash='',renderers=[],completed=0;

  function hashText(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(16).padStart(8,'0');}
  function setStatus(text,progress){$('exo-sector-status').textContent=text;if(progress!=null)$('exo-sector-progress-fill').style.width=`${Math.max(0,Math.min(100,progress))}%`;}
  function summary(){
    const s=sector.summary;
    $('exo-sector-summary-name').textContent=sector.name;
    $('exo-sector-summary-clusters').textContent=s.clusterCount;
    $('exo-sector-summary-species').textContent=`${s.activeSpeciesCount} + ${s.extinctSpeciesCount} extinct`;
    $('exo-sector-summary-polities').textContent=`${s.polityCount} / ${s.fleetCommandCount}`;
    $('exo-sector-summary-hash').textContent=archiveHash;
    $('exo-sector-export').disabled=false;$('exo-sector-save').disabled=false;
  }
  function dataRows(dl,rows){dl.replaceChildren();for(const[label,value]of rows){dl.append(node('dt','',label),node('dd','',value));}}
  function clusterById(id){return sector.clusters.find(item=>item.clusterId===id);}
  function polityById(id){return sector.polities.find(item=>item.polityId===id);}
  function selectCluster(cluster){
    if(!cluster)return;
    $('exo-sector-cluster-name').textContent=cluster.name;
    $('exo-sector-cluster-summary').textContent=`${cluster.controlState.replaceAll('-',' ')} · ${cluster.strategicValue} strategic value · ${cluster.systemCount} systems.`;
    dataRows($('exo-sector-cluster-data'),[
      ['Coordinates',`${cluster.coordinatesLy.x}, ${cluster.coordinatesLy.y}, ${cluster.coordinatesLy.z} ly`],
      ['Charted systems',`${cluster.chartedSystemCount} / ${cluster.systemCount}`],
      ['Controlled planets',cluster.controlledPlanetCount],
      ['Habitable worlds',cluster.habitableWorldCount],
      ['Industrial worlds',cluster.industrialWorldCount],
      ['Ruin worlds',cluster.ruinWorldCount],
      ['Controlling polities',cluster.controllingPolityIds.map(id=>polityById(id)?.name||id).join('; ')||'None']
    ]);
    $('exo-sector-cluster-tags').replaceChildren(...[...cluster.navigationHazards,cluster.controlState,cluster.strategicValue].map(text=>node('span','',text)));
  }
  function drawMap(){
    const svg=$('exo-sector-map'),NS='http://www.w3.org/2000/svg';
    const make=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
    svg.replaceChildren();
    for(let x=100;x<1000;x+=100)svg.append(make('line',{x1:x,y1:20,x2:x,y2:660,class:'exo-sector-map-grid'}));
    for(let y=80;y<680;y+=80)svg.append(make('line',{x1:20,y1:y,x2:980,y2:y,class:'exo-sector-map-grid'}));
    const xs=sector.clusters.map(c=>c.coordinatesLy.x),ys=sector.clusters.map(c=>c.coordinatesLy.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const pos=c=>({x:55+(c.coordinatesLy.x-minX)/Math.max(1,maxX-minX)*890,y:625-(c.coordinatesLy.y-minY)/Math.max(1,maxY-minY)*570});
    const sorted=[...sector.clusters].sort((a,b)=>a.coordinatesLy.x-b.coordinatesLy.x);
    for(let i=1;i<sorted.length;i++){const a=pos(sorted[i-1]),b=pos(sorted[i]);svg.append(make('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'exo-sector-link'}));}
    for(const c of sector.clusters){
      const p=pos(c),g=make('g'),circle=make('circle',{cx:p.x,cy:p.y,r:7,tabindex:0,role:'button',class:'exo-sector-cluster-node','data-control':c.controlState,'aria-label':c.name}),label=make('text',{x:p.x+10,y:p.y-9,class:'exo-sector-map-label'});
      label.textContent=c.name;circle.addEventListener('click',()=>selectCluster(c));circle.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectCluster(c);}});
      g.append(circle,label);svg.append(g);
    }
    selectCluster(sector.clusters[0]);
  }
  function card(eyebrow,title,body,stance=''){
    const article=node('article','exo-sector-card');if(stance)article.dataset.stance=stance;
    article.append(node('small','',eyebrow),node('h3','',title),node('p','',body));return article;
  }
  function addDefinition(article,rows){const dl=node('dl');for(const[label,value]of rows)dl.append(node('dt','',label),node('dd','',value));article.append(dl);}
  function tags(article,items){const wrap=node('div','tags');wrap.append(...items.map(text=>node('span','',text)));article.append(wrap);}
  function clusterCard(c){const a=card(c.controlState,c.name,`${c.systemCount} systems; ${c.controlledPlanetCount} controlled planets; ${c.ruinWorldCount} ruin worlds.`);addDefinition(a,[['Strategic value',c.strategicValue],['Controllers',c.controllingPolityIds.length||'none'],['Habitable',c.habitableWorldCount],['Industrial',c.industrialWorldCount]]);tags(a,c.navigationHazards);a.addEventListener('click',()=>{selectCluster(c);$('exo-sector-map-title').scrollIntoView({behavior:'smooth'});});return a;}
  function speciesCard(s){const a=card(`${s.sectorStance} · ${s.dispositionArchetype}`,s.name,s.behavioralSummary,s.sectorStance);addDefinition(a,[['Biology',`${s.biology.metabolism}; ${s.biology.bodyPlan}`],['Native environment',`${s.biology.nativeGravity}; ${s.biology.nativeEnvironment}`],['Technology',`${s.technology.principalBand} · ${s.technology.transit}`],['Inertial control',s.technology.inertialControl],['Territory',`${s.controlledClusterIds.length} cluster authority records`]]);tags(a,[...s.technology.specialties,...s.bestiaryTags]);const filter=$('exo-sector-stance-filter')?.value||'all';a.hidden=filter!=='all'&&a.dataset.stance!==filter;return a;}
  function fleetCard(f){const p=polityById(f.polityId),a=card(`${f.readiness} · ${f.technologyBand}`,f.name,`${f.doctrine}.`,p?.sectorStance||'');addDefinition(a,[['Capital ships',f.capitalShips],['Cruisers',f.cruisers],['Escorts',f.escorts],['Logistics hulls',f.logisticsHullCount],['Polity',p?.name||f.polityId]]);tags(a,[...f.loadoutFamilies,...f.operationalLimitations]);return a;}
  function orgCard(o){const a=card(`${o.organizationType} · ${o.scope}`,o.name,o.functions.join(', '),polityById(o.polityId)?.sectorStance||'');return a;}
  function extinctCard(s){const c=clusterById(s.lastKnownClusterId),a=card(`${s.archiveConfidence} archive · ${fmt(s.estimatedExtinctionYearsAgo,0)} years ago`,s.name,`Probable cause: ${s.probableCause}. Last known cluster: ${c?.name||s.lastKnownClusterId}.`);addDefinition(a,[['Technology at extinction',s.technologyBandAtExtinction],['Evidence',s.remainingEvidence.join(', ')]]);return a;}
  function bestiaryCard(b){const c=clusterById(b.nativeClusterId),a=card(`${b.threatClass} · ${b.ecologyClass}`,b.name,`${b.environment}. ${b.notes}. Native record: ${c?.name||b.nativeClusterId}.`);return a;}
  function polityRow(p){const tr=node('tr');for(const value of[p.name,p.government,p.empireScale,p.controlledClusterIds.length,p.controlledPlanetCount,`${fmt(p.populationBillions)} billion`,p.diplomaticPosture])tr.append(node('td','',value));return tr;}

  function progressive(sectionId,items,containerId,renderItem,chunk=6){
    const section=$(sectionId),container=$(containerId),progress=$(`${sectionId.replace('-section','')}-progress`)||section.querySelector('.bli-section-head p:last-child');
    let index=0,started=false;
    section.dataset.renderState='waiting';
    const run=deadline=>{
      const start=performance.now();
      while(index<items.length&&(deadline.timeRemaining()>2||performance.now()-start<8)){
        const fragment=document.createDocumentFragment();
        for(let n=0;n<chunk&&index<items.length;n++,index++)fragment.append(renderItem(items[index]));
        container.append(fragment);
      }
      progress.textContent=`Rendered ${index} of ${items.length} records.`;
      if(index<items.length)idle(run);else{section.dataset.renderState='complete';completed++;updateOverall();}
    };
    const begin=()=>{if(started)return;started=true;section.dataset.renderState='rendering';progress.textContent=`Rendering 0 of ${items.length} records…`;idle(run);};
    renderers.push({section,begin});
  }
  function updateOverall(){const total=renderers.length;const pct=25+(completed/Math.max(1,total))*75;setStatus(`Sector authority loaded. ${completed} of ${total} deferred directories complete.`,pct);}
  function setupLazy(){
    progressive('exo-sector-clusters-section',sector.clusters,'exo-sector-clusters-grid',clusterCard,4);
    progressive('exo-sector-species-section',sector.species,'exo-sector-species-grid',speciesCard,4);
    progressive('exo-sector-polities-section',sector.polities,'exo-sector-polities-body',polityRow,8);
    progressive('exo-sector-fleets-section',sector.fleetCommands,'exo-sector-fleets-grid',fleetCard,4);
    progressive('exo-sector-organizations-section',sector.organizations,'exo-sector-organizations-grid',orgCard,8);
    progressive('exo-sector-extinct-section',sector.extinctSpecies,'exo-sector-extinct-grid',extinctCard,4);
    progressive('exo-sector-bestiary-section',sector.bestiary,'exo-sector-bestiary-grid',bestiaryCard,4);
    const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){const r=renderers.find(x=>x.section===entry.target);r?.begin();observer.unobserve(entry.target);}},{rootMargin:'320px'});
    renderers.forEach(r=>observer.observe(r.section));
  }
  function applySpeciesFilter(){
    const filter=$('exo-sector-stance-filter').value;
    for(const a of $('exo-sector-species-grid').children)a.hidden=filter!=='all'&&a.dataset.stance!==filter;
  }
  function exportSector(){
    const blob=new Blob([JSON.stringify(sector,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`${sector.sectorId}-${sector.schemaVersion}.json`;document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
  }
  function snapshots(){try{return JSON.parse(localStorage.getItem(SNAPSHOT_KEY)||'[]');}catch(_){return[];}}
  function saveSnapshot(){
    const list=snapshots(),entry={snapshotId:`snapshot-${Date.now().toString(36)}`,recordedAt:new Date().toISOString(),note:$('exo-sector-note').value.trim(),sectorId:sector.sectorId,schemaVersion:sector.schemaVersion,archiveHash,record:sector};
    list.unshift(entry);localStorage.setItem(SNAPSHOT_KEY,JSON.stringify(list.slice(0,5)));$('exo-sector-note').value='';renderSnapshots();
  }
  function renderSnapshots(){
    const list=snapshots(),root=$('exo-sector-snapshot-list');root.replaceChildren();
    if(!list.length){root.append(node('p','','No local campaign snapshots recorded. The fixed source remains available from the page archive.'));return;}
    for(const s of list){const row=node('div','exo-sector-snapshot'),label=node('span','',`${new Date(s.recordedAt).toLocaleString()} · ${s.note||'unnamed checkpoint'}`),meta=node('code','',`${s.schemaVersion} · ${s.archiveHash}`);row.append(label,meta);root.append(row);}
  }
  async function load(){
    try{
      const authority=globalThis.BlacklightExoStellarSectorData;
      if(!authority?.build)throw new Error('fixed sector data module did not initialize');
      sector=authority.build();
      const canonical=JSON.stringify(sector);archiveHash=hashText(canonical);
      if(sector.recordType!=='blacklightExoStellarSector'||sector.schemaVersion!=='1.0.0')throw new Error('unexpected sector schema');
      summary();drawMap();setupLazy();renderSnapshots();setStatus('Core sector authority loaded. Deferred directories will render as they approach the viewport.',25);
    }catch(error){console.error('[Blacklight EXO] Sector archive failed:',error);setStatus(`Sector archive failed to initialize: ${error.message}`,0);}
  }
  $('exo-sector-export').addEventListener('click',exportSector);$('exo-sector-save').addEventListener('click',saveSnapshot);$('exo-sector-stance-filter').addEventListener('change',applySpeciesFilter);
  load();
})();