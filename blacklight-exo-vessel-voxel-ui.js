(() => {
  'use strict';
  const V=globalThis.BlacklightExoVessel;
  if(!V?.voxelLayoutVersion||document.getElementById('exo-vessel-voxel-section'))return;
  const $=id=>document.getElementById(id);
  const node=(tag,className='',text='')=>{const element=document.createElement(tag);if(className)element.className=className;if(text)element.textContent=text;return element;};
  const fmt=(value,digits=2)=>Number(value||0).toLocaleString(undefined,{maximumFractionDigits:digits});
  function addStyle(){
    const style=node('style');style.textContent=`
      .exo-voxel-viewer{display:grid;grid-template-columns:minmax(0,2fr) minmax(240px,1fr);gap:1rem;align-items:start}
      .exo-voxel-canvas-wrap{position:relative;background:linear-gradient(180deg,#071018,#0b1722);border:1px solid rgba(150,190,220,.25);border-radius:.6rem;overflow:hidden;min-height:420px}
      #exo-vessel-voxel-canvas{display:block;width:100%;height:520px;cursor:grab}.exo-voxel-controls{display:grid;gap:.75rem}.exo-voxel-controls label{display:grid;gap:.3rem}
      .exo-voxel-legend{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.75rem}.exo-voxel-chip{display:inline-flex;align-items:center;gap:.35rem;padding:.2rem .45rem;border:1px solid rgba(255,255,255,.15);border-radius:999px;font-size:.78rem}.exo-voxel-swatch{width:.75rem;height:.75rem;border-radius:2px}
      .exo-voxel-note{font-size:.85rem;opacity:.82}.exo-voxel-table td{white-space:pre-line}
      @media(max-width:900px){.exo-voxel-viewer{grid-template-columns:1fr}}
    `;document.head.append(style);
  }
  function addControls(){
    const grid=document.querySelector('.exo-vessel-control-grid');
    if(grid&&!$('exo-vessel-voxel-mode')){
      const label=node('label');label.append(node('span','','Voxel validation'));
      const select=node('select');select.id='exo-vessel-voxel-mode';select.add(new Option('Repair deterministically and record changes','REPAIR'));select.add(new Option('Strictly reject invalid layout','STRICT'));label.append(select);grid.append(label);select.addEventListener('change',()=>$('exo-vessel-generate')?.click());
    }
    if(grid&&!$('exo-vessel-voxel-edge')){
      const label=node('label');label.append(node('span','','Voxel edge override (m)'));
      const input=node('input');input.id='exo-vessel-voxel-edge';input.type='number';input.min='0';input.step='any';input.placeholder='Automatic adaptive resolution';label.append(input);grid.append(label);input.addEventListener('change',()=>$('exo-vessel-generate')?.click());
    }
    const actions=document.querySelector('.exo-vessel-hero .bli-actions');
    if(actions&&!$('exo-vessel-export-voxel-layout')){
      const button=node('button','bli-action','Export Voxel Layout JSON');button.id='exo-vessel-export-voxel-layout';button.type='button';actions.append(button);
      button.addEventListener('click',()=>{const layout=globalThis.BlacklightExoGetActiveVessel?.()?.voxelLayout;if(!layout)return;const blob=new Blob([`${JSON.stringify(layout,null,2)}\n`],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`${layout.vesselInstanceId}-voxel-layout.json`;anchor.click();URL.revokeObjectURL(url);});
    }
  }
  function section(){
    const wrapper=node('section','bli-section');wrapper.id='exo-vessel-voxel-section';
    const head=node('div','bli-section-head');head.append(node('p','bli-eyebrow','Charles // VESSEL-04 crude three-dimensional assembler'),node('h2','','The semantic machine now occupies space.'),node('p','','Persistent modules are assigned non-overlapping integer-cell bounds inside a compressed sparse topology. Utility routes, access paths, armor surfaces, EVA hardpoints, engine exhaust, radiator fields and weapon sight lines are spatially represented without applying damage or combat performance.'));wrapper.append(head);
    const viewer=node('div','exo-voxel-viewer');
    const canvasWrap=node('div','exo-voxel-canvas-wrap');const canvas=node('canvas');canvas.id='exo-vessel-voxel-canvas';canvas.width=1000;canvas.height=620;canvasWrap.append(canvas);
    const controls=node('div','exo-voxel-controls');controls.innerHTML=`
      <article class="exo-vessel-card"><small>Viewer orientation</small><h3>Isometric aggregate blocks</h3><p class="exo-voxel-note">Drag horizontally or use the sliders. Blocks represent bounded module volumes, not decorative hull art.</p></article>
      <label><span>Yaw</span><input id="exo-voxel-yaw" type="range" min="-180" max="180" value="35"></label>
      <label><span>Pitch</span><input id="exo-voxel-pitch" type="range" min="10" max="80" value="35"></label>
      <label><span>Module filter</span><select id="exo-voxel-filter"><option value="ALL">All semantic types</option></select></label>
      <label><span><input id="exo-voxel-routes" type="checkbox"> Show access and utility routes</span></label>
      <div id="exo-voxel-legend" class="exo-voxel-legend"></div>`;
    viewer.append(canvasWrap,controls);wrapper.append(viewer);
    const grid=node('div','exo-vessel-grid');grid.id='exo-vessel-voxel-grid';wrapper.append(grid);
    const table=node('div','exo-vessel-table-wrap');table.innerHTML='<table class="exo-vessel-table exo-voxel-table"><thead><tr><th>Module / type</th><th>Voxel bounds</th><th>Cells / utilization</th><th>Envelope / lane</th><th>Spatial obligations</th></tr></thead><tbody id="exo-vessel-voxel-body"></tbody></table>';wrapper.append(table);
    const repairTitle=node('h3','','Voxel validation and repair log'),repairs=node('ul','exo-vessel-warning-list');repairs.id='exo-vessel-voxel-repair-log';wrapper.append(repairTitle,repairs);
    const anchor=$('exo-vessel-module-graph-section')||$('exo-vessel-engineering-section')||document.querySelector('.exo-vessel-overview');anchor?.insertAdjacentElement('afterend',wrapper);
  }
  function card(label,title,body,state=''){const article=node('article','exo-vessel-card');if(state)article.dataset.state=state;article.append(node('small','',label),node('h3','',title),node('p','',body));return article;}
  function hull(points){points=[...points].sort((a,b)=>a.x===b.x?a.y-b.y:a.x-b.x);const cross=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x),lower=[],upper=[];for(const p of points){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}for(const p of points.reverse()){while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}lower.pop();upper.pop();return lower.concat(upper);}
  function project(point,layout,yawDeg,pitchDeg,canvas){
    const yaw=yawDeg*Math.PI/180,pitch=pitchDeg*Math.PI/180,g=layout.grid.size,c={x:(g.x-1)/2,y:(g.y-1)/2,z:(g.z-1)/2},x=point.x-c.x,y=point.y-c.y,z=point.z-c.z,x1=x*Math.cos(yaw)-y*Math.sin(yaw),y1=x*Math.sin(yaw)+y*Math.cos(yaw),scale=Math.min(canvas.width/Math.max(8,g.x+g.y),canvas.height/Math.max(8,g.z+g.x*.45))*1.35;
    return{x:canvas.width/2+x1*scale,y:canvas.height/2+(y1*Math.sin(pitch)-z*Math.cos(pitch))*scale,depth:y1*Math.cos(pitch)+z*Math.sin(pitch)};
  }
  function corners(bounds){const values=[];for(const x of[bounds.min.x,bounds.max.x+1])for(const y of[bounds.min.y,bounds.max.y+1])for(const z of[bounds.min.z,bounds.max.z+1])values.push({x,y,z});return values;}
  function draw(layout){
    const canvas=$('exo-vessel-voxel-canvas'),ctx=canvas?.getContext('2d');if(!ctx||!layout)return;const yaw=Number($('exo-voxel-yaw')?.value||35),pitch=Number($('exo-voxel-pitch')?.value||35),filter=$('exo-voxel-filter')?.value||'ALL',showRoutes=$('exo-voxel-routes')?.checked;
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#071018';ctx.fillRect(0,0,canvas.width,canvas.height);
    if(showRoutes){ctx.lineWidth=1.2;ctx.globalAlpha=.45;for(const[name,routes]of Object.entries(layout.utilityRoutes)){ctx.strokeStyle=({power:'#f1c40f',cooling:'#3498db',data:'#1abc9c',atmosphere:'#2ecc71',access:'#ecf0f1',structural:'#95a5a6',magazineFeed:'#e74c3c',sensorDependency:'#00bcd4'})[name]||'#bdc3c7';for(const route of routes){ctx.beginPath();route.points.forEach((point,index)=>{const p=project(point,layout,yaw,pitch,canvas);index?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.stroke();}}ctx.globalAlpha=1;}
    const blocks=layout.modulePlacements.filter(item=>filter==='ALL'||item.semanticType===filter).map(item=>{const projected=corners(item.bounds).map(point=>project(point,layout,yaw,pitch,canvas));return{item,polygon:hull(projected),depth:projected.reduce((sum,p)=>sum+p.depth,0)/projected.length};}).sort((a,b)=>a.depth-b.depth);
    for(const block of blocks){const{item,polygon}=block;if(polygon.length<3)continue;ctx.beginPath();polygon.forEach((point,index)=>index?ctx.lineTo(point.x,point.y):ctx.moveTo(point.x,point.y));ctx.closePath();ctx.fillStyle=item.color||'#7f8c8d';ctx.globalAlpha=item.envelope==='EVA'?.78:.58;ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle=item.envelope==='EVA'?'#ffffff':'#9fb3c8';ctx.lineWidth=item.semanticType==='WEAPON'||item.semanticType==='MAIN_ENGINE'?2:1;ctx.stroke();}
    ctx.fillStyle='#d7e5ef';ctx.font='14px system-ui';ctx.fillText(`${layout.topology.key} · ${fmt(layout.resolution.cellEdgeM,3)} m/cell · ${layout.modulePlacements.length} modules`,16,24);
  }
  function render(event){
    const vessel=event?.detail?.vessel||globalThis.BlacklightExoGetActiveVessel?.(),layout=vessel?.voxelLayout;if(!layout)return;
    const routeCount=Object.values(layout.utilityRoutes).reduce((total,routes)=>total+routes.length,0),physical=layout.grid.physicalSizeM;
    $('exo-vessel-voxel-grid')?.replaceChildren(
      card('Spatial authority',layout.validation.valid?'Validated voxel layout':'Invalid voxel layout',`${layout.validationMode} mode; ${layout.validation.repairCount} deterministic repair${layout.validation.repairCount===1?'':'s'}.`,layout.validation.valid?'ok':'warning'),
      card('Adaptive resolution',`${fmt(layout.resolution.cellEdgeM,3)} m cells`,`${layout.grid.envelopeCellCount.toLocaleString()} envelope cells under the ${layout.resolution.maxEnvelopeCells.toLocaleString()}-cell cap; ${layout.resolution.compressedSparse?'compressed sparse blocks':'dense grid'}.`),
      card('Physical envelope',`${fmt(physical.x,1)} × ${fmt(physical.y,1)} × ${fmt(physical.z,1)} m`,`${layout.grid.size.x} × ${layout.grid.size.y} × ${layout.grid.size.z} aggregate cells using ${layout.topology.key.toLowerCase()} placement.`),
      card('Placed volume',`${layout.modulePlacements.length} module blocks`,`${layout.occupiedBlocks.length} occupied blocks and ${layout.infrastructureBlocks.length} massless infrastructure blocks.`),
      card('Routing',`${routeCount} utility routes`,`${layout.accessRoutes.length} access paths and ${layout.evacuationRoutes.length} pressure-zone evacuation paths.`),
      card('External geometry',`${layout.evaHardpoints.length} EVA hardpoints`,`${layout.armorSurfaces.length} armor surfaces, ${layout.weaponHardpointPlacements.length} weapon sight lines, ${layout.engineExhaustClearances.length} exhaust corridors and ${layout.radiatorClearances.length} radiator fields.`)
    );
    const filter=$('exo-voxel-filter');if(filter){const selected=filter.value,types=[...new Set(layout.modulePlacements.map(item=>item.semanticType))].sort();filter.replaceChildren(new Option('All semantic types','ALL'),...types.map(type=>new Option(type.replaceAll('_',' '),type)));filter.value=types.includes(selected)?selected:'ALL';}
    const legend=$('exo-voxel-legend');if(legend){legend.replaceChildren();for(const[type,color]of Object.entries(globalThis.BlacklightExoVesselVoxelDefinitions.semanticColors).filter(([type])=>layout.modulePlacements.some(item=>item.semanticType===type))){const chip=node('span','exo-voxel-chip'),swatch=node('span','exo-voxel-swatch');swatch.style.background=color;chip.append(swatch,node('span','',type.replaceAll('_',' ')));legend.append(chip);}}
    const body=$('exo-vessel-voxel-body');if(body){body.replaceChildren();for(const placement of layout.modulePlacements){const b=placement.bounds,tr=node('tr'),obligations=[];if(placement.semanticType==='MAIN_ENGINE')obligations.push('aft exhaust clearance');if(placement.semanticType==='THERMAL_CONTROL')obligations.push('radiator view field');if(placement.semanticType==='WEAPON')obligations.push('weapon sight line');if(placement.semanticType==='ARMOR')obligations.push('external armor surface');if(placement.envelope==='EVA')obligations.push('EVA hardpoint');for(const value of[`${placement.moduleId}\n${placement.semanticType}`,`(${b.min.x},${b.min.y},${b.min.z}) → (${b.max.x},${b.max.y},${b.max.z})\n${b.size.x}×${b.size.y}×${b.size.z}`,`${placement.requiredCells}/${placement.capacityCells}\n${fmt(placement.packingUtilization*100,1)}%`,`${placement.envelope}\nlane ${b.topologyLane}`,obligations.join(', ')||'ordinary bounded module'])tr.append(node('td','',value));body.append(tr);}}
    const repairs=$('exo-vessel-voxel-repair-log');if(repairs){repairs.replaceChildren();const rows=layout.repairLog.length?layout.repairLog:[{type:'NO_REPAIR_REQUIRED',description:'The generated topology passed placement, overlap, route, exhaust, radiator and self-occlusion validation without repair.'}];for(const item of rows)repairs.append(node('li','',`${item.type}: ${item.description}`));}
    draw(layout);
  }
  addStyle();addControls();section();document.addEventListener('blacklight:exo-vessel-generated',render);for(const id of['exo-voxel-yaw','exo-voxel-pitch','exo-voxel-filter','exo-voxel-routes'])$(id)?.addEventListener('input',()=>draw(globalThis.BlacklightExoGetActiveVessel?.()?.voxelLayout));
  let dragging=false,lastX=0;$('exo-vessel-voxel-canvas')?.addEventListener('pointerdown',event=>{dragging=true;lastX=event.clientX;event.currentTarget.setPointerCapture(event.pointerId);});$('exo-vessel-voxel-canvas')?.addEventListener('pointermove',event=>{if(!dragging)return;const yaw=$('exo-voxel-yaw');yaw.value=String(Math.max(-180,Math.min(180,Number(yaw.value)+(event.clientX-lastX))));lastX=event.clientX;draw(globalThis.BlacklightExoGetActiveVessel?.()?.voxelLayout);});$('exo-vessel-voxel-canvas')?.addEventListener('pointerup',()=>dragging=false);
  queueMicrotask(render);
})();