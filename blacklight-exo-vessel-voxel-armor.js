(() => {
  'use strict';
  const base=globalThis.BlacklightExoVessel;
  if(!base?.voxelLayoutVersion||!base.moduleHardeningVersion||base.voxelArmorVersion)return;
  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const faceGeometry=(key,grid)=>{
    const max={x:grid.size.x-1,y:grid.size.y-1,z:grid.size.z-1},center={x:max.x/2,y:max.y/2,z:max.z/2};
    if(key==='FORE')return{point:{x:max.x,y:center.y,z:center.z},normal:{x:1,y:0,z:0},areaM2:grid.physicalSizeM.y*grid.physicalSizeM.z,coverageMode:'OUTER_HULL'};
    if(key==='AFT')return{point:{x:0,y:center.y,z:center.z},normal:{x:-1,y:0,z:0},areaM2:grid.physicalSizeM.y*grid.physicalSizeM.z,coverageMode:'OUTER_HULL'};
    if(key==='LEFT')return{point:{x:center.x,y:0,z:center.z},normal:{x:0,y:-1,z:0},areaM2:grid.physicalSizeM.x*grid.physicalSizeM.z,coverageMode:'OUTER_HULL'};
    if(key==='RIGHT')return{point:{x:center.x,y:max.y,z:center.z},normal:{x:0,y:1,z:0},areaM2:grid.physicalSizeM.x*grid.physicalSizeM.z,coverageMode:'OUTER_HULL'};
    if(key==='UP')return{point:{x:center.x,y:center.y,z:max.z},normal:{x:0,y:0,z:1},areaM2:grid.physicalSizeM.x*grid.physicalSizeM.y,coverageMode:'OUTER_HULL'};
    if(key==='DOWN')return{point:{x:center.x,y:center.y,z:0},normal:{x:0,y:0,z:-1},areaM2:grid.physicalSizeM.x*grid.physicalSizeM.y,coverageMode:'OUTER_HULL'};
    if(key==='CITADEL')return{point:center,normal:{x:0,y:0,z:0},areaM2:Math.max(1,grid.physicalSizeM.y*grid.physicalSizeM.z*.35),coverageMode:'INTERNAL_CITADEL'};
    return{point:{x:center.x*.8,y:center.y,z:center.z},normal:{x:1,y:0,z:0},areaM2:Math.max(1,grid.physicalSizeM.x*grid.cellEdgeM),coverageMode:'STRUCTURAL_LOAD_PATHS'};
  };
  function apply(result){
    const layout=result?.voxelLayout,armor=result?.armor;if(!layout||!armor)return result;
    const physical=armor.facings||{},fields=armor.fieldFacings||{};
    layout.armorSurfaces=Object.keys(physical).map(key=>{
      const face=physical[key],field=fields[key]||{},geometry=faceGeometry(key,layout.grid);
      return{surfaceId:`armor-surface-${layout.vesselInstanceId}-${key.toLowerCase()}`,facing:key,label:face.label,source:'VESSEL_WIDE_DISTRIBUTED_ARMOR_LEDGER',moduleId:null,standaloneModule:false,point:geometry.point,normal:geometry.normal,areaM2:geometry.areaM2,coverageMode:geometry.coverageMode,passive:{weight:face.weight,massTonnes:face.massTonnes,physicalArealDensityKgM2:face.physicalArealDensityKgM2,effectiveArealDensityKgM2:face.effectiveArealDensityKgM2,equivalentThicknessMm:face.equivalentThicknessMm},activeField:{weight:finite(field.weight),massTonnes:finite(field.massTonnes),relativeFieldStrength:finite(field.relativeFieldStrength),effectiveFieldFactor:finite(field.effectiveFieldFactor)}};
    });
    const expected=['FORE','AFT','LEFT','RIGHT','UP','DOWN','CITADEL','STRUCTURAL'],actual=new Set(layout.armorSurfaces.map(surface=>surface.facing)),violations=[...(layout.validation?.violations||[])];
    if(expected.some(key=>!actual.has(key)))violations.push('Distributed armor surfaces do not cover all six external directions, citadel reinforcement, and structural reinforcement.');
    if(layout.modulePlacements.some(placement=>placement.semanticType==='ARMOR'))violations.push('Voxel layout incorrectly contains standalone armor-module placements.');
    layout.validation={...(layout.validation||{}),valid:!violations.length,violations};
    result.warnings=[...(result.warnings||[]),'VESSEL-04 represents armor as six directional outer-hull surfaces plus citadel and structural reinforcement. Directional active shielding is layered onto those same protection records.'];
    return result;
  }
  function generate(seed,input={},source=null){return apply(base.generate(seed,input,source));}
  globalThis.BlacklightExoVessel=Object.freeze({...base,voxelArmorVersion:1,generate});
})();
