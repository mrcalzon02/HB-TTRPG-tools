(() => {
  'use strict';
  if(globalThis.BlacklightExoVesselVoxelCore)return;
  const D=globalThis.BlacklightExoVesselVoxelDefinitions;if(!D)return;
  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const clone=value=>value==null?value:structuredClone(value);
  function hash(value){let state=2166136261;for(const char of String(value)){state^=char.charCodeAt(0);state=Math.imul(state,16777619);}return state>>>0;}
  const slug=(value,fallback='voxel')=>(String(value||fallback).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,58)||fallback);
  const stableId=(prefix,...parts)=>`${prefix}-${slug(parts.join('-'))}-${hash(parts.join(':')).toString(16).padStart(8,'0')}`;
  const centerOf=bounds=>({x:bounds.min.x+(bounds.size.x-1)/2,y:bounds.min.y+(bounds.size.y-1)/2,z:bounds.min.z+(bounds.size.z-1)/2});
  const within=(value,min,max)=>value>=min&&value<=max;
  const pointInside=(point,grid)=>within(point.x,0,grid.size.x-1)&&within(point.y,0,grid.size.y-1)&&within(point.z,0,grid.size.z-1);
  const overlap=(a,b)=>a.min.x<=b.max.x&&a.max.x>=b.min.x&&a.min.y<=b.max.y&&a.max.y>=b.min.y&&a.min.z<=b.max.z&&a.max.z>=b.min.z;
  const boundsFrom=(min,size)=>({min:{...min},max:{x:min.x+size.x-1,y:min.y+size.y-1,z:min.z+size.z-1},size:{...size}});
  const translateBounds=(bounds,delta)=>boundsFrom({x:bounds.min.x+delta.x,y:bounds.min.y+delta.y,z:bounds.min.z+delta.z},bounds.size);
  const suggestedCellEdge=lengthM=>D.suggestedResolution.find(item=>lengthM<item.maximumLengthM)?.cellEdgeM||100;
  const shapeFor=module=>D.semanticPlacement[module.semanticType]?.shape||'COMPACT';
  function dimensionsFor(module,cellEdgeM){
    const required=Math.max(1,Math.ceil(finite(module.volumeM3)/(cellEdgeM**3))),root=Math.max(1,Math.cbrt(required)),shape=shapeFor(module);let x,y,z;
    if(shape==='LONGITUDINAL'){x=Math.max(2,Math.ceil(root*2.2));y=Math.max(1,Math.ceil(root*.72));z=Math.max(1,Math.ceil(root*.72));}
    else if(shape==='PANEL'){x=Math.max(2,Math.ceil(root*1.8));y=Math.max(2,Math.ceil(root*1.8));z=1;}
    else if(shape==='SURFACE'){x=Math.max(1,Math.ceil(root*1.6));y=Math.max(1,Math.ceil(root*1.2));z=Math.max(1,Math.ceil(required/(x*y)));}
    else if(shape==='SHELL'){x=Math.max(2,Math.ceil(root*2));y=Math.max(2,Math.ceil(root*1.5));z=Math.max(1,Math.ceil(required/(x*y)));}
    else if(shape==='TANK'){x=Math.max(2,Math.ceil(root*1.5));y=Math.max(1,Math.ceil(root));z=Math.max(1,Math.ceil(root));}
    else if(shape==='BAY'){x=Math.max(2,Math.ceil(root*1.6));y=Math.max(2,Math.ceil(root*1.3));z=Math.max(1,Math.ceil(root*.9));}
    else{x=Math.max(1,Math.ceil(root*1.2));y=Math.max(1,Math.ceil(root));z=Math.max(1,Math.ceil(root));}
    while(x*y*z<required){if(x<=y&&x<=z)x+=1;else if(y<=z)y+=1;else z+=1;}
    return{x,y,z,requiredCells:required,capacityCells:x*y*z};
  }
  const lanePatterns={
    MONOCOQUE:[{c:1,r:1},{c:1,r:0},{c:2,r:1},{c:1,r:2},{c:0,r:1}],
    SPINE:[{c:1,r:1},{c:1,r:0},{c:2,r:1},{c:1,r:2}],
    CLUSTER:[{c:0,r:0},{c:1,r:0},{c:2,r:0},{c:0,r:1},{c:1,r:1},{c:2,r:1}],
    RING:[{c:0,r:0},{c:1,r:0},{c:2,r:0},{c:2,r:1},{c:2,r:2},{c:1,r:2},{c:0,r:2},{c:0,r:1}],
    HYBRID:[{c:1,r:1},{c:1,r:0},{c:2,r:1},{c:1,r:2},{c:0,r:1}]
  };
  function laneFor(module,topology,laneCount){
    if(module.semanticType==='MAIN_ENGINE')return finite(module.provenance?.splitIndex,0)%laneCount;
    if(topology==='MONOCOQUE')return module.envelope==='INTERNAL'?0:1+(hash(`${module.moduleId}:lane`)%Math.max(1,laneCount-1));
    if(topology==='SPINE')return module.envelope==='INTERNAL'?0:1+(hash(`${module.pressureZoneId||module.moduleId}:lane`)%Math.max(1,laneCount-1));
    if(topology==='HYBRID')return module.envelope==='INTERNAL'?0:1+(hash(`${module.moduleId}:rail`)%Math.max(1,laneCount-1));
    return hash(`${module.pressureZoneId||module.extensions?.weaponFamily||module.moduleId}:pod`)%laneCount;
  }
  const priority=module=>D.semanticPlacement[module.semanticType]?.priority||40;
  function makePlan(result,cellEdgeM){
    const topology=result.moduleGraph.topology.key,pattern=lanePatterns[topology]||lanePatterns.HYBRID,laneCount=pattern.length;
    const entries=result.moduleGraph.modules.map(module=>({module,dims:dimensionsFor(module,cellEdgeM),lane:laneFor(module,topology,laneCount)}));
    const lanes=pattern.map((position,index)=>({index,position,entries:[],width:1,depth:1,cursorX:1}));
    for(const entry of entries)lanes[entry.lane].entries.push(entry);
    for(const lane of lanes){lane.entries.sort((a,b)=>priority(b.module)-priority(a.module)||b.dims.capacityCells-a.dims.capacityCells||a.module.moduleId.localeCompare(b.module.moduleId));lane.width=Math.max(1,...lane.entries.map(entry=>entry.dims.y));lane.depth=Math.max(1,...lane.entries.map(entry=>entry.dims.z));lane.length=2+lane.entries.reduce((total,entry)=>total+entry.dims.x+1,0);}
    const columns=[...new Set(pattern.map(item=>item.c))].sort((a,b)=>a-b),rows=[...new Set(pattern.map(item=>item.r))].sort((a,b)=>a-b),gap=3;
    const colWidths=Object.fromEntries(columns.map(col=>[col,Math.max(1,...lanes.filter(lane=>lane.position.c===col).map(lane=>lane.width))]));
    const rowDepths=Object.fromEntries(rows.map(row=>[row,Math.max(1,...lanes.filter(lane=>lane.position.r===row).map(lane=>lane.depth))]));
    const colStarts={},rowStarts={};let cursor=2;for(const col of columns){colStarts[col]=cursor;cursor+=colWidths[col]+gap;}const packedY=cursor+1;cursor=2;for(const row of rows){rowStarts[row]=cursor;cursor+=rowDepths[row]+gap;}const packedZ=cursor+1;
    const packedX=Math.max(6,...lanes.map(lane=>lane.length))+2,placements=[];
    for(const lane of lanes){let x=1;for(const entry of lane.entries){const min={x,y:colStarts[lane.position.c]+Math.floor((colWidths[lane.position.c]-entry.dims.y)/2),z:rowStarts[lane.position.r]+Math.floor((rowDepths[lane.position.r]-entry.dims.z)/2)},bounds=boundsFrom(min,{x:entry.dims.x,y:entry.dims.y,z:entry.dims.z});placements.push({module:entry.module,lane:lane.index,bounds,requiredCells:entry.dims.requiredCells,capacityCells:entry.dims.capacityCells});x=bounds.max.x+2;}}
    const hullMinimum={x:Math.max(1,Math.ceil(finite(result.hull?.lengthM,1)/cellEdgeM)+2),y:Math.max(1,Math.ceil(finite(result.hull?.beamM,1)/cellEdgeM)+2),z:Math.max(1,Math.ceil(finite(result.hull?.heightM,1)/cellEdgeM)+2)};
    const gridSize={x:Math.max(packedX,hullMinimum.x),y:Math.max(packedY,hullMinimum.y),z:Math.max(packedZ,hullMinimum.z)},offset={x:0,y:Math.floor((gridSize.y-packedY)/2),z:Math.floor((gridSize.z-packedZ)/2)};
    for(const placement of placements)placement.bounds=translateBounds(placement.bounds,offset);
    return{topology,pattern,lanes,placements,gridSize,packedGridSize:{x:packedX,y:packedY,z:packedZ},hullMinimum,placementOffset:offset,cellEdgeM};
  }
  function adaptivePlan(result,input){
    const hullLength=Math.max(finite(result.hull.lengthM),finite(result.hull.beamM),finite(result.hull.heightM),1),forced=finite(input.voxelCellEdgeM,0);let edge=forced>0?forced:suggestedCellEdge(hullLength),plan=makePlan(result,edge),iterations=0;
    while(plan.gridSize.x*plan.gridSize.y*plan.gridSize.z>D.maxEnvelopeCells&&iterations<30){if(forced>0)throw new Error(`Requested voxel cell edge ${forced} m exceeds the maximum envelope cell budget.`);edge*=1.25;plan=makePlan(result,edge);iterations+=1;}
    if(plan.gridSize.x*plan.gridSize.y*plan.gridSize.z>D.maxEnvelopeCells)throw new Error('Unable to satisfy the voxel envelope cell cap.');
    return{...plan,adaptationIterations:iterations,suggestedCellEdgeM:suggestedCellEdge(hullLength),forcedCellEdgeM:forced||null};
  }
  function placementRecord(item,grid,cellEdgeM){
    const module=item.module,bounds={...clone(item.bounds),cellEdgeM,orientation:'X_FORWARD',topologyLane:item.lane};
    return{placementId:stableId('placement',grid.vesselInstanceId,module.moduleId),moduleId:module.moduleId,semanticType:module.semanticType,envelope:module.envelope,pressureZoneId:module.pressureZoneId,bounds,requiredCells:item.requiredCells,capacityCells:item.capacityCells,representedVolumeM3:item.capacityCells*(cellEdgeM**3),actualModuleVolumeM3:module.volumeM3,packingUtilization:finite(module.volumeM3)/Math.max(cellEdgeM**3,item.capacityCells*(cellEdgeM**3)),voxelType:module.semanticType,color:D.semanticColors[module.semanticType]||'#7f8c8d'};
  }
  globalThis.BlacklightExoVesselVoxelCore=Object.freeze({finite,clone,hash,stableId,centerOf,pointInside,overlap,boundsFrom,adaptivePlan,placementRecord});
})();