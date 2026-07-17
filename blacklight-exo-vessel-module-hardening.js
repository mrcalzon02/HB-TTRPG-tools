(() => {
  'use strict';
  const base=globalThis.BlacklightExoVessel;
  if(!base?.moduleGraphVersion||!base.distributedArmorVersion||base.moduleHardeningVersion)return;
  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const clone=value=>value==null?value:structuredClone(value);
  function apply(result){
    if(result?.moduleGraph?.modules?.every(module=>module.extensions?.hardening))return result;
    const rows=new Map((result.hull?.massBudget||[]).map(row=>[row.key,row]));
    const grouped=new Map();
    for(const module of result.moduleGraph?.modules||[]){const key=module.provenance?.sourceEngineeringKey||module.subsystemKey;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(module);}
    for(const [key,modules]of grouped){
      const row=rows.get(key),rowHardening=finite(row?.distributedHardeningTonnes),rowHardeningVolume=finite(row?.distributedHardeningVolumeM3),moduleMassTotal=modules.reduce((sum,module)=>sum+finite(module.massTonnes),0)||1,moduleVolumeTotal=modules.reduce((sum,module)=>sum+finite(module.volumeM3),0)||1;
      let assignedMass=0,assignedVolume=0;
      modules.forEach((module,index)=>{
        const hardeningMassTonnes=index===modules.length-1?rowHardening-assignedMass:rowHardening*finite(module.massTonnes)/moduleMassTotal;
        const hardeningVolumeM3=index===modules.length-1?rowHardeningVolume-assignedVolume:rowHardeningVolume*finite(module.volumeM3)/moduleVolumeTotal;
        assignedMass+=hardeningMassTonnes;assignedVolume+=hardeningVolumeM3;
        const categories={};for(const [category,mass]of Object.entries(row?.hardeningCategories||{}))categories[category]=finite(mass)*finite(module.massTonnes)/moduleMassTotal;
        module.extensions={...(module.extensions||{}),hardening:{distributed:true,standaloneModule:false,massTonnes:Math.max(0,hardeningMassTonnes),volumeM3:Math.max(0,hardeningVolumeM3),categories,armorModel:result.armor?.model,equivalentOuterHullThicknessMm:finite(result.armor?.equivalentOuterHullThicknessMm),externalSystemDurabilityMultiplier:finite(result.armor?.externalSystemDurabilityMultiplier,1)}};
      });
    }
    const modules=result.moduleGraph?.modules||[],distributedMassTonnes=modules.reduce((sum,module)=>sum+finite(module.extensions?.hardening?.massTonnes),0),distributedVolumeM3=modules.reduce((sum,module)=>sum+finite(module.extensions?.hardening?.volumeM3),0);
    result.moduleGraph.hardeningSummary={model:result.armor?.model,standaloneArmorModules:false,distributedMassTonnes,distributedVolumeM3,moduleCount:modules.filter(module=>finite(module.extensions?.hardening?.massTonnes)>0).length,allocations:clone(result.armor?.allocations||{}),directionalArmor:clone(result.armor?.facings||{}),directionalFields:clone(result.armor?.fieldFacings||{})};
    result.modules=result.moduleGraph.modules;
    result.warnings=[...(result.warnings||[]),`VESSEL-03 distributes ${distributedMassTonnes.toLocaleString(undefined,{maximumFractionDigits:3})} tonnes of passive hardening across the modules and structural systems it reinforces; no ARMOR semantic modules are generated.`];
    return result;
  }
  function generate(seed,input={},source=null){return apply(base.generate(seed,input,source));}
  globalThis.BlacklightExoVessel=Object.freeze({...base,moduleHardeningVersion:1,generate});
})();
