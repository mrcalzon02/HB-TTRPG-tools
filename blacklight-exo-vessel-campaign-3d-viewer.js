(() => {
  'use strict';
  if (globalThis.BlacklightExoVesselCampaign3DViewer) return;

  const $ = id => document.getElementById(id);
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clone = value => value == null ? value : structuredClone(value);
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, finite(value)));
  const FACE_INDEXES = [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[0,3,7,4],[1,5,6,2]];
  const EDGE_INDEXES = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  const STATE_COLORS = {intact:[126,214,155],damaged:[217,168,79],critical:[224,111,91],destroyed:[101,93,91]};
  const ROUTE_COLORS = {structural:'#87939b',power:'#d9b44a',cooling:'#62a8d8',data:'#9f86db',atmosphere:'#65b8a2',access:'#c7b7a1',magazineFeed:'#d48662',sensorDependency:'#78b7ca'};
  const REQUIRED_STATIC_IDS = [
    'exo-vessel-campaign-3d-launcher','exo-vessel-campaign-3d-window','exo-vessel-campaign-3d-close',
    'exo-vessel-campaign-3d-canvas','exo-vessel-campaign-3d-stage','exo-vessel-campaign-3d-inspector',
    'exo-vessel-campaign-3d-preset','exo-vessel-campaign-3d-filter','exo-vessel-campaign-3d-mode',
    'exo-vessel-campaign-3d-slice-axis','exo-vessel-campaign-3d-explode','exo-vessel-campaign-3d-slice',
    'exo-vessel-campaign-3d-routes','exo-vessel-campaign-3d-labels','exo-vessel-campaign-3d-envelope',
    'exo-vessel-campaign-3d-reset','exo-vessel-campaign-3d-summary','exo-vessel-campaign-3d-launcher-status',
    'exo-vessel-campaign-3d-inspector-eyebrow','exo-vessel-campaign-3d-inspector-name',
    'exo-vessel-campaign-3d-inspector-module','exo-vessel-campaign-3d-inspector-placement',
    'exo-vessel-campaign-3d-inspector-installation','exo-vessel-campaign-3d-inspector-damage',
    'exo-vessel-campaign-3d-inspector-operational','exo-vessel-campaign-3d-inspector-dimensions',
    'exo-vessel-campaign-3d-inspector-center','exo-vessel-campaign-3d-edit','exo-vessel-campaign-3d-zoom'
  ];

  let current = null;
  let selectedModuleId = null;
  let frameRequested = false;
  let hitFaces = [];
  let dragging = null;
  let layoutReady = false;
  const camera = {yaw:-0.72,pitch:-0.54,distance:3.2,explode:0,sliceAxis:'z',slicePercent:100};
  const preferences = {filter:'ALL',mode:'SOLID',routes:true,labels:false,envelope:true};

  function stateClass(row) {
    if (['DESTROYED','REMOVED','MISSING','SALVAGED'].includes(String(row.installationState).toUpperCase())) return 'destroyed';
    if (finite(row.damagePercent) >= 60 || row.operational === false) return 'critical';
    if (finite(row.damagePercent) > 0 || String(row.graphParticipation).toUpperCase() === 'DEGRADED') return 'damaged';
    return 'intact';
  }
  function visible(row, filter = preferences.filter) {
    if (filter === 'ALL') return true;
    if (filter === 'INTERNAL' || filter === 'EVA') return String(row.exposure).includes(filter);
    return stateClass(row).toUpperCase() === filter;
  }
  function moduleMap(vessel){return new Map((vessel?.moduleGraph?.modules||vessel?.modules||[]).map(item=>[item.moduleId,item]));}
  function stateMap(vessel){const rows=vessel?.campaignEffectiveState?.moduleStates||vessel?.combatResolutionModel?.postImpactState?.moduleStates||vessel?.conditionHistory?.moduleStates||[];return new Map(rows.map(item=>[item.moduleId,item]));}
  function sourceBounds(placement,row={}) {
    const bounds=placement?.bounds||{},minimum=bounds.min||{},maximum=bounds.max||{},size=bounds.size||{};
    const width=Math.max(1,finite(size.x,finite(maximum.x)-finite(minimum.x)+1||placement?.width||row.width||1));
    const height=Math.max(1,finite(size.y,finite(maximum.y)-finite(minimum.y)+1||placement?.height||row.height||1));
    const depth=Math.max(1,finite(size.z,finite(maximum.z)-finite(minimum.z)+1||placement?.depth||row.depth||1));
    const position=placement?.position||placement?.centroid||placement?.center||placement?.origin||{};
    const x=Number.isFinite(Number(minimum.x))?finite(minimum.x)+(width-1)/2:finite(position.x??placement?.x??row.x);
    const y=Number.isFinite(Number(minimum.y))?finite(minimum.y)+(height-1)/2:finite(position.y??placement?.y??row.y);
    const z=Number.isFinite(Number(minimum.z))?finite(minimum.z)+(depth-1)/2:finite(position.z??placement?.z??row.z);
    return{x,y,z,width,height,depth};
  }
  function sceneRows(vessel) {
    const modules=moduleMap(vessel),states=stateMap(vessel),placements=vessel?.voxelLayout?.modulePlacements||vessel?.voxelLayout?.placements||[];
    return placements.map((placement,index)=>{
      const moduleId=placement.moduleId||placement.module?.moduleId||placement.placementId||`placement-${index+1}`;
      const module=modules.get(moduleId)||{},state=states.get(moduleId)||{},installationState=state.installationState||'INSTALLED',damagePercent=finite(state.damagePercent);
      const row={placementId:placement.placementId||`placement-${index+1}`,moduleId,label:module.label||module.name||placement.label||moduleId,category:module.category||placement.category||module.semanticType||placement.semanticType||'module',exposure:String(module.envelope||module.installationEnvironment||placement.envelope||placement.installationEnvironment||'INTERNAL').toUpperCase(),installationState,damagePercent,operational:state.operational!==false&&!['DESTROYED','REMOVED','MISSING','SALVAGED'].includes(String(installationState).toUpperCase()),graphParticipation:state.graphParticipation||'FULL',source:placement};
      return{...row,...sourceBounds(placement,row),state:stateClass(row)};
    });
  }
  function routeStateRows(vessel) {return vessel?.campaignEffectiveState?.routeStates||vessel?.combatResolutionModel?.postImpactState?.routeStates||vessel?.conditionHistory?.routeStates||[];}
  function routePolylines(vessel) {
    const routes=vessel?.voxelLayout?.utilityRoutes||{};
    const states=new Map(routeStateRows(vessel).flatMap(row=>[[row.routeId,row],[row.sourceEdgeId,row]].filter(entry=>entry[0])));
    const output=[];
    for(const[graphType,rows]of Object.entries(routes))for(const route of rows||[]){const state=states.get(route.routeId)||states.get(route.sourceEdgeId)||{};output.push({routeId:route.routeId||route.sourceEdgeId,sourceEdgeId:route.sourceEdgeId||null,graphType,points:(route.points||[]).map(point=>({x:finite(point.x),y:finite(point.y),z:finite(point.z)})),state:state.state||route.state||'ACTIVE',functional:state.functional!==false&&!['SEVERED','REMOVED'].includes(String(state.state||route.state).toUpperCase())});}
    return output.filter(route=>route.routeId&&route.points.length>=2);
  }
  function sceneBounds(rows,vessel=current) {
    const grid=vessel?.voxelLayout?.grid?.size;
    if(grid)return{min:{x:0,y:0,z:0},max:{x:Math.max(1,finite(grid.x)-1),y:Math.max(1,finite(grid.y)-1),z:Math.max(1,finite(grid.z)-1)}};
    const values=rows.length?rows:[{x:0,y:0,z:0,width:1,height:1,depth:1}];
    return{min:{x:Math.min(...values.map(row=>row.x-row.width/2)),y:Math.min(...values.map(row=>row.y-row.height/2)),z:Math.min(...values.map(row=>row.z-row.depth/2))},max:{x:Math.max(...values.map(row=>row.x+row.width/2)),y:Math.max(...values.map(row=>row.y+row.height/2)),z:Math.max(...values.map(row=>row.z+row.depth/2))}};
  }
  function centerOfBounds(bounds){return{x:(bounds.min.x+bounds.max.x)/2,y:(bounds.min.y+bounds.max.y)/2,z:(bounds.min.z+bounds.max.z)/2};}
  function applySlice(rows,bounds,axis=camera.sliceAxis,percent=camera.slicePercent){const threshold=bounds.min[axis]+(bounds.max[axis]-bounds.min[axis])*clamp(percent,0,100)/100;return rows.filter(row=>row[axis]-row[{x:'width',y:'height',z:'depth'}[axis]]/2<=threshold+1e-9);}
  function explodedPoint(point,center,factor=camera.explode){const multiplier=1+clamp(factor,0,200)/100;return{x:center.x+(point.x-center.x)*multiplier,y:center.y+(point.y-center.y)*multiplier,z:center.z+(point.z-center.z)*multiplier};}
  function cameraCoordinates(point,center,state=camera){const x=point.x-center.x,y=point.y-center.y,z=point.z-center.z,cy=Math.cos(state.yaw),sy=Math.sin(state.yaw),cp=Math.cos(state.pitch),sp=Math.sin(state.pitch),horizontal=cy*x-sy*y,depthYaw=sy*x+cy*y;return{x:horizontal,y:cp*z-sp*depthYaw,depth:sp*z+cp*depthYaw};}
  function cameraProject(point,scene,width,height,state=camera){const view=cameraCoordinates(point,scene.center,state),span=Math.max(scene.span.x,scene.span.y,scene.span.z,1),cameraDistance=span*Math.max(1.2,state.distance),focal=Math.min(width,height)*1.05,denominator=Math.max(span*.18,cameraDistance+view.depth),scale=focal/denominator;return{x:width/2+view.x*scale,y:height/2-view.y*scale,depth:view.depth,scale};}
  function boxCorners(row,center,explode=camera.explode){const shifted=explodedPoint({x:row.x,y:row.y,z:row.z},center,explode),x0=shifted.x-row.width/2,x1=shifted.x+row.width/2,y0=shifted.y-row.height/2,y1=shifted.y+row.height/2,z0=shifted.z-row.depth/2,z1=shifted.z+row.depth/2;return[{x:x0,y:y0,z:z0},{x:x1,y:y0,z:z0},{x:x1,y:y1,z:z0},{x:x0,y:y1,z:z0},{x:x0,y:y0,z:z1},{x:x1,y:y0,z:z1},{x:x1,y:y1,z:z1},{x:x0,y:y1,z:z1}];}
  function boxFaces(row,scene,width,height,state=camera){const projected=boxCorners(row,scene.center,state.explode).map(point=>cameraProject(point,scene,width,height,state));return FACE_INDEXES.map((indexes,faceIndex)=>({row,faceIndex,points:indexes.map(index=>projected[index]),depth:indexes.reduce((total,index)=>total+projected[index].depth,0)/indexes.length,shade:[.78,.58,.68,.88,.72,.96][faceIndex]}));}
  function sortFacesForPainter(faces){return[...faces].sort((a,b)=>b.depth-a.depth);}
  function pointInPolygon(x,y,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j],intersect=((a.y>y)!==(b.y>y))&&x<(b.x-a.x)*(y-a.y)/((b.y-a.y)||1e-9)+a.x;if(intersect)inside=!inside;}return inside;}
  function rgba(state,shade=1,alpha=.82){const[r,g,b]=STATE_COLORS[state]||STATE_COLORS.intact;return`rgba(${Math.round(r*shade)},${Math.round(g*shade)},${Math.round(b*shade)},${alpha})`;}
  function resizeCanvas(canvas){const ratio=Math.min(2,globalThis.devicePixelRatio||1),rect=canvas.getBoundingClientRect(),width=Math.max(320,Math.round(rect.width*ratio)),height=Math.max(280,Math.round(rect.height*ratio));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}return{width,height};}

  function drawEnvelope(context,scene,width,height){if(!preferences.envelope)return;const bounds=scene.bounds,row={x:scene.center.x,y:scene.center.y,z:scene.center.z,width:bounds.max.x-bounds.min.x,height:bounds.max.y-bounds.min.y,depth:bounds.max.z-bounds.min.z},projected=boxCorners(row,scene.center,0).map(point=>cameraProject(point,scene,width,height));context.save();context.strokeStyle='rgba(120,183,202,.22)';context.lineWidth=Math.max(1,width/900);context.setLineDash([5,7]);for(const[a,b]of EDGE_INDEXES){context.beginPath();context.moveTo(projected[a].x,projected[a].y);context.lineTo(projected[b].x,projected[b].y);context.stroke();}context.restore();}
  function drawRoutes(context,vessel,scene,width,height){if(!preferences.routes)return;const threshold=scene.bounds.min[camera.sliceAxis]+(scene.bounds.max[camera.sliceAxis]-scene.bounds.min[camera.sliceAxis])*camera.slicePercent/100;context.save();context.lineWidth=Math.max(1.2,width/760);for(const route of routePolylines(vessel)){const points=route.points.filter(point=>point[camera.sliceAxis]<=threshold+1e-9).map(point=>cameraProject(explodedPoint(point,scene.center,camera.explode),scene,width,height));if(points.length<2)continue;context.strokeStyle=route.functional?(ROUTE_COLORS[route.graphType]||'#78b7ca'):'#e06f5b';context.globalAlpha=route.functional ? .56 : .74;context.setLineDash(route.functional?[4,4]:[2,8]);context.beginPath();context.moveTo(points[0].x,points[0].y);for(const point of points.slice(1))context.lineTo(point.x,point.y);context.stroke();}context.restore();}
  function drawLabels(context,rows,scene,width,height){if(!preferences.labels)return;context.save();context.font=`${Math.max(10,width/95)}px system-ui, sans-serif`;context.textAlign='center';context.textBaseline='bottom';for(const row of rows){const point=cameraProject(explodedPoint({x:row.x,y:row.y,z:row.z+row.depth/2},scene.center,camera.explode),scene,width,height);context.lineWidth=3;context.strokeStyle='rgba(4,8,12,.9)';context.fillStyle='#d7d0c4';context.strokeText(row.label,point.x,point.y-4);context.fillText(row.label,point.x,point.y-4);}context.restore();}
  function drawFrame(){frameRequested=false;if(!layoutReady||!current)return;const canvas=$('exo-vessel-campaign-3d-canvas'),context=canvas?.getContext('2d');if(!canvas||!context)return;const{width,height}=resizeCanvas(canvas),rows=sceneRows(current),bounds=sceneBounds(rows,current),center=centerOfBounds(bounds),scene={bounds,center,span:{x:Math.max(1,bounds.max.x-bounds.min.x),y:Math.max(1,bounds.max.y-bounds.min.y),z:Math.max(1,bounds.max.z-bounds.min.z)}},shown=applySlice(rows.filter(row=>visible(row)),bounds);context.clearRect(0,0,width,height);const gradient=context.createRadialGradient(width*.5,height*.45,0,width*.5,height*.45,Math.max(width,height)*.7);gradient.addColorStop(0,'#17252c');gradient.addColorStop(1,'#04080c');context.fillStyle=gradient;context.fillRect(0,0,width,height);drawEnvelope(context,scene,width,height);drawRoutes(context,current,scene,width,height);const faces=sortFacesForPainter(shown.flatMap(row=>boxFaces(row,scene,width,height)));hitFaces=[];for(const face of faces){const selected=face.row.moduleId===selectedModuleId;context.beginPath();context.moveTo(face.points[0].x,face.points[0].y);for(const point of face.points.slice(1))context.lineTo(point.x,point.y);context.closePath();if(preferences.mode!=='WIREFRAME'){context.fillStyle=rgba(face.row.state,face.shade,preferences.mode==='XRAY' ? .18 : selected ? .96 : .78);context.fill();}context.lineWidth=selected?Math.max(2.5,width/330):Math.max(.8,width/1100);context.strokeStyle=selected?'#ead9a4':rgba(face.row.state,Math.min(1.15,face.shade+.22),preferences.mode==='XRAY' ? .55 : .95);context.stroke();hitFaces.push(face);}drawLabels(context,shown,scene,width,height);$('exo-vessel-campaign-3d-summary').textContent=`${shown.length} of ${rows.length} placed modules visible · ${routePolylines(current).length} routed graph paths · camera ${Math.round(camera.yaw*180/Math.PI)}° / ${Math.round(camera.pitch*180/Math.PI)}° · ${Math.round(camera.slicePercent)}% ${camera.sliceAxis.toUpperCase()} slice.`;$('exo-vessel-campaign-3d-launcher-status').textContent=`${rows.length} placed modules · ${routePolylines(current).length} routed utility paths · ready for volumetric inspection.`;canvas.setAttribute('aria-label',`Interactive three-dimensional vessel viewer showing ${shown.length} of ${rows.length} placed modules.`);}
  function scheduleDraw(){if(frameRequested)return;frameRequested=true;requestAnimationFrame(drawFrame);}

  function setText(id,value){const element=$(id);if(element)element.textContent=String(value);}
  function renderInspector(row){const edit=$('exo-vessel-campaign-3d-edit'),zoom=$('exo-vessel-campaign-3d-zoom');if(!row){setText('exo-vessel-campaign-3d-inspector-eyebrow','No module selected');setText('exo-vessel-campaign-3d-inspector-name','Select a volume in the viewer');for(const id of REQUIRED_STATIC_IDS.filter(id=>id.startsWith('exo-vessel-campaign-3d-inspector-')&&!['exo-vessel-campaign-3d-inspector-eyebrow','exo-vessel-campaign-3d-inspector-name'].includes(id)))setText(id,'—');if(edit)edit.disabled=true;if(zoom)zoom.disabled=true;return;}setText('exo-vessel-campaign-3d-inspector-eyebrow',`${row.exposure} · ${row.state}`);setText('exo-vessel-campaign-3d-inspector-name',row.label);setText('exo-vessel-campaign-3d-inspector-module',row.moduleId);setText('exo-vessel-campaign-3d-inspector-placement',row.placementId);setText('exo-vessel-campaign-3d-inspector-installation',row.installationState);setText('exo-vessel-campaign-3d-inspector-damage',`${finite(row.damagePercent).toFixed(1)}%`);setText('exo-vessel-campaign-3d-inspector-operational',row.operational?'YES':'NO');setText('exo-vessel-campaign-3d-inspector-dimensions',`${row.width.toFixed(1)} × ${row.height.toFixed(1)} × ${row.depth.toFixed(1)} cells`);setText('exo-vessel-campaign-3d-inspector-center',`${row.x.toFixed(2)}, ${row.y.toFixed(2)}, ${row.z.toFixed(2)}`);if(edit)edit.disabled=false;if(zoom)zoom.disabled=false;}
  function selectedRow(){return sceneRows(current).find(row=>row.moduleId===selectedModuleId)||null;}
  function selectAt(event){const canvas=$('exo-vessel-campaign-3d-canvas');if(!canvas)return;const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)*canvas.width/Math.max(1,rect.width),y=(event.clientY-rect.top)*canvas.height/Math.max(1,rect.height),face=[...hitFaces].reverse().find(item=>pointInPolygon(x,y,item.points));if(!face)return;selectedModuleId=face.row.moduleId;renderInspector(face.row);scheduleDraw();}
  function setPreset(name){const presets={ISOMETRIC:[-.72,-.54],TOP:[0,-Math.PI/2+.02],PORT:[Math.PI/2,0],STARBOARD:[-Math.PI/2,0],FORWARD:[Math.PI,0],AFT:[0,0]},value=presets[name]||presets.ISOMETRIC;camera.yaw=value[0];camera.pitch=value[1];scheduleDraw();}
  function resetCamera(){Object.assign(camera,{yaw:-.72,pitch:-.54,distance:3.2,explode:0,sliceAxis:'z',slicePercent:100});syncControls();scheduleDraw();}
  function syncControls(){$('exo-vessel-campaign-3d-explode').value=String(camera.explode);$('exo-vessel-campaign-3d-slice').value=String(camera.slicePercent);$('exo-vessel-campaign-3d-slice-axis').value=camera.sliceAxis;$('exo-vessel-campaign-3d-mode').value=preferences.mode;$('exo-vessel-campaign-3d-filter').value=preferences.filter;$('exo-vessel-campaign-3d-routes').checked=preferences.routes;$('exo-vessel-campaign-3d-labels').checked=preferences.labels;$('exo-vessel-campaign-3d-envelope').checked=preferences.envelope;}
  function openWindow(){const dialog=$('exo-vessel-campaign-3d-window');if(!dialog?.open)dialog?.showModal();scheduleDraw();$('exo-vessel-campaign-3d-canvas')?.focus();}

  function bindStaticLayout(){const missing=REQUIRED_STATIC_IDS.filter(id=>!$(id));if(missing.length){const error=new Error(`Static vessel 3D viewer layout is incomplete: ${missing.join(', ')}`);console.error('[Blacklight EXO]',error);globalThis.BlacklightExoRuntimeSupervisor?.fail?.('vessel-3d-static-layout',error);return false;}layoutReady=true;for(const button of document.querySelectorAll('[data-exo-open-3d]'))button.addEventListener('click',openWindow);$('exo-vessel-campaign-3d-close').addEventListener('click',()=>$('exo-vessel-campaign-3d-window').close());$('exo-vessel-campaign-3d-reset').addEventListener('click',resetCamera);$('exo-vessel-campaign-3d-preset').addEventListener('change',event=>setPreset(event.currentTarget.value));$('exo-vessel-campaign-3d-filter').addEventListener('change',event=>{preferences.filter=event.currentTarget.value;scheduleDraw();});$('exo-vessel-campaign-3d-mode').addEventListener('change',event=>{preferences.mode=event.currentTarget.value;scheduleDraw();});$('exo-vessel-campaign-3d-slice-axis').addEventListener('change',event=>{camera.sliceAxis=event.currentTarget.value;scheduleDraw();});$('exo-vessel-campaign-3d-explode').addEventListener('input',event=>{camera.explode=finite(event.currentTarget.value);scheduleDraw();});$('exo-vessel-campaign-3d-slice').addEventListener('input',event=>{camera.slicePercent=finite(event.currentTarget.value);scheduleDraw();});for(const[id,key]of[['exo-vessel-campaign-3d-routes','routes'],['exo-vessel-campaign-3d-labels','labels'],['exo-vessel-campaign-3d-envelope','envelope']])$(id).addEventListener('change',event=>{preferences[key]=event.currentTarget.checked;scheduleDraw();});$('exo-vessel-campaign-3d-edit').addEventListener('click',()=>{const row=selectedRow(),select=$('exo-vessel-editor-module');if(row&&select){select.value=row.moduleId;select.dispatchEvent(new Event('change',{bubbles:true}));$('exo-vessel-campaign-3d-window').close();$('exo-vessel-campaign-damage-editor')?.scrollIntoView({behavior:'smooth'});}});$('exo-vessel-campaign-3d-zoom').addEventListener('click',()=>{if(selectedRow()){camera.distance=1.65;scheduleDraw();}});const canvas=$('exo-vessel-campaign-3d-canvas');canvas.addEventListener('pointerdown',event=>{dragging={id:event.pointerId,x:event.clientX,y:event.clientY,yaw:camera.yaw,pitch:camera.pitch,moved:false};canvas.setPointerCapture(event.pointerId);});canvas.addEventListener('pointermove',event=>{if(!dragging||dragging.id!==event.pointerId)return;const dx=event.clientX-dragging.x,dy=event.clientY-dragging.y;if(Math.abs(dx)+Math.abs(dy)>3)dragging.moved=true;camera.yaw=dragging.yaw+dx*.008;camera.pitch=clamp(dragging.pitch+dy*.008,-1.54,1.54);scheduleDraw();});canvas.addEventListener('pointerup',event=>{if(!dragging||dragging.id!==event.pointerId)return;const moved=dragging.moved;dragging=null;if(!moved)selectAt(event);});canvas.addEventListener('pointercancel',()=>{dragging=null;});canvas.addEventListener('wheel',event=>{event.preventDefault();camera.distance=clamp(camera.distance*Math.exp(event.deltaY*.0012),1.15,12);scheduleDraw();},{passive:false});canvas.addEventListener('keydown',event=>{let handled=true;if(event.key==='ArrowLeft')camera.yaw-=.09;else if(event.key==='ArrowRight')camera.yaw+=.09;else if(event.key==='ArrowUp')camera.pitch=clamp(camera.pitch-.09,-1.54,1.54);else if(event.key==='ArrowDown')camera.pitch=clamp(camera.pitch+.09,-1.54,1.54);else if(event.key==='+'||event.key==='=')camera.distance=clamp(camera.distance*.88,1.15,12);else if(event.key==='-'||event.key==='_')camera.distance=clamp(camera.distance*1.14,1.15,12);else if(event.key.toLowerCase()==='r')resetCamera();else handled=false;if(handled){event.preventDefault();scheduleDraw();}});new ResizeObserver(scheduleDraw).observe($('exo-vessel-campaign-3d-stage'));syncControls();renderInspector(null);return true;}

  function render(vessel=current){if(!vessel||!layoutReady)return;current=clone(vessel);const rows=sceneRows(current);if(selectedModuleId&&!rows.some(row=>row.moduleId===selectedModuleId))selectedModuleId=null;if(!selectedModuleId&&rows.length)selectedModuleId=rows[0].moduleId;renderInspector(rows.find(row=>row.moduleId===selectedModuleId)||null);scheduleDraw();}
  function install(){if(!bindStaticLayout())return;document.addEventListener('blacklight:exo-vessel-generated',event=>render(event.detail?.vessel||globalThis.BlacklightExoGetActiveVessel?.()));document.addEventListener('blacklight:exo-vessel-activate',event=>render(event.detail?.vessel||globalThis.BlacklightExoGetActiveVessel?.()));render(globalThis.BlacklightExoGetActiveVessel?.());}

  const api=Object.freeze({version:2,layout:'STATIC',stateClass,visible,sourceBounds,sceneRows,routePolylines,sceneBounds,centerOfBounds,applySlice,explodedPoint,cameraCoordinates,cameraProject,boxCorners,boxFaces,sortFacesForPainter,pointInPolygon,render,camera,preferences,requiredStaticIds:[...REQUIRED_STATIC_IDS]});
  globalThis.BlacklightExoVesselCampaign3DViewer=api;
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
})();