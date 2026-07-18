(() => {
  'use strict';
  const base=globalThis.BlacklightExoVessel,prior=globalThis.BlacklightExoVesselContracts;
  if(!base?.voxelLayoutVersion||!prior||base.voxelContractVersion)return;
  function hasVoxelPhaseAuthority(record){
    const version=String(record.contract?.provenance?.generatorVersion||''),match=/^(\d+)\.(\d+)\.(\d+)$/.exec(version),atOrBeyondVoxel=Boolean(match)&&Number(match[1])===3&&Number(match[2])>=4;
    return atOrBeyondVoxel&&record.contract?.provenance?.voxelLayoutVersion==='1.0.0';
  }
  function validate(record){
    const inherited=prior.validate(record),violations=[...(inherited.violations||[])],layout=record?.voxelLayout;
    if(layout){
      if(!layout.validation?.valid)violations.push(...(layout.validation?.violations||['VESSEL-04 voxel layout validation failed.']));
      if(layout.vesselInstanceId!==record.contract?.identifiers?.vesselInstanceId)violations.push('Voxel layout vessel identifier does not match the canonical contract.');
      const modules=record.moduleGraph?.modules||[],placements=layout.modulePlacements||[],moduleIds=new Set(modules.map(module=>module.moduleId)),placementIds=new Set(placements.map(item=>item.moduleId));
      if(moduleIds.size!==placementIds.size||[...moduleIds].some(id=>!placementIds.has(id)))violations.push('Voxel placement inventory does not match the persistent semantic module inventory.');
      for(const module of modules){
        const placement=placements.find(item=>item.moduleId===module.moduleId);
        if(!placement||!module.voxelBounds)violations.push(`${module.moduleId} lacks canonical voxel bounds.`);
        else if(JSON.stringify(module.voxelBounds)!==JSON.stringify(placement.bounds))violations.push(`${module.moduleId} voxel bounds diverge from its canonical placement.`);
      }
      if(layout.grid?.envelopeCellCount>layout.resolution?.maxEnvelopeCells)violations.push('Voxel layout exceeds its declared envelope cell cap.');
      if(record.contract?.derivedLayers?.find(layer=>layer.key==='voxelLayout')?.status!=='generated')violations.push('Canonical contract did not mark voxelLayout as generated.');
      if(!hasVoxelPhaseAuthority(record))violations.push('Canonical provenance does not retain VESSEL-04 voxel authority.');
      if(record.contract?.extensions?.voxelLayoutSchema!=='data/schemas/exo-vessel-voxel-layout.schema.json')violations.push('Canonical contract does not expose the voxel layout schema.');
    }
    return{valid:!violations.length,violations};
  }
  const contracts=Object.freeze({...prior,voxelLayoutRegistryPath:'data/exo-vessel/voxel-layout-registry.json',schemas:Object.freeze({...prior.schemas,voxelLayout:'data/schemas/exo-vessel-voxel-layout.schema.json'}),validate});
  function finalize(result){if(result?.contract)result.contract.validation=validate(result);return result;}
  function generate(seed,input={},source=null){return finalize(base.generate(seed,input,source));}
  function migrateRecord(record,input={},source=null){return finalize(base.migrateRecord(record,input,source));}
  globalThis.BlacklightExoVesselContracts=contracts;
  globalThis.BlacklightExoVessel=Object.freeze({...base,voxelContractVersion:1,contracts,validateContract:validate,generate,migrateRecord});
})();