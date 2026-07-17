(() => {
  'use strict';
  const base=globalThis.BlacklightExoVessel;
  if(!base?.engineeringLedgerVersion||base.distributedArmorVersion)return;

  const allocationProfiles={
    civilian:{outerHull:.58,externalSystems:.16,structural:.18,citadel:.08},
    hardened:{outerHull:.50,externalSystems:.18,structural:.20,citadel:.12},
    naval:{outerHull:.42,externalSystems:.22,structural:.22,citadel:.14}
  };
  const physicalFacingProfiles={
    civilian:{FORE:.17,AFT:.14,LEFT:.16,RIGHT:.16,UP:.13,DOWN:.13,CITADEL:.06,STRUCTURAL:.05},
    hardened:{FORE:.19,AFT:.12,LEFT:.14,RIGHT:.14,UP:.12,DOWN:.12,CITADEL:.10,STRUCTURAL:.07},
    naval:{FORE:.24,AFT:.10,LEFT:.12,RIGHT:.12,UP:.10,DOWN:.10,CITADEL:.13,STRUCTURAL:.09}
  };
  const fieldFacingProfiles={
    civilian:{FORE:.18,AFT:.14,LEFT:.16,RIGHT:.16,UP:.13,DOWN:.13,CITADEL:.06,STRUCTURAL:.04},
    hardened:{FORE:.20,AFT:.12,LEFT:.14,RIGHT:.14,UP:.12,DOWN:.12,CITADEL:.10,STRUCTURAL:.06},
    naval:{FORE:.25,AFT:.09,LEFT:.12,RIGHT:.12,UP:.10,DOWN:.10,CITADEL:.14,STRUCTURAL:.08}
  };
  const labels={FORE:'Fore',AFT:'Aft',LEFT:'Left / port',RIGHT:'Right / starboard',UP:'Up / dorsal',DOWN:'Down / ventral',CITADEL:'Citadel protection',STRUCTURAL:'Structural armoring'};
  const categoryTargets={
    outerHull:['structure','drive-integration','life-support','payload','maintenance','navigation','power','fuel','thermal','conventional-engine','sensors','fire-control','electronic-warfare','weapon-mounts','weapon-support','weapon-cooling','countermeasures','margin'],
    externalSystems:['thermal','conventional-engine','sensors','weapon-mounts','weapon-support','weapon-cooling','countermeasures','drive-integration'],
    structural:['structure','drive-integration','conventional-engine','power','fuel'],
    citadel:['drive','power','fuel','life-support','navigation','fire-control','electronic-warfare']
  };
  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const clone=value=>value==null?value:structuredClone(value);
  const sum=(rows,field)=>rows.reduce((total,row)=>total+finite(row[field]),0);
  function normalized(table){const total=Object.values(table).reduce((a,b)=>a+finite(b),0)||1;return Object.fromEntries(Object.entries(table).map(([key,value])=>[key,finite(value)/total]));}
  function splitExact(total,targets,weightField='massTonnes'){
    const weights=targets.map(row=>Math.max(.000001,finite(row[weightField],1))),weightTotal=weights.reduce((a,b)=>a+b,0)||1,parts=[];let assigned=0;
    for(let index=0;index<targets.length;index+=1){const value=index===targets.length-1?total-assigned:total*weights[index]/weightTotal;parts.push(value);assigned+=value;}
    return parts;
  }
  function hardeningTargets(rows,category){
    const keys=new Set(categoryTargets[category]||[]),preferred=rows.filter(row=>keys.has(row.key));
    if(preferred.length)return preferred;
    return rows.filter(row=>!['protection-fields','conventional-propellant','weapon-magazines'].includes(row.key));
  }
  function distributeRows(result,armor){
    const armorRow=result.hull.massBudget.find(row=>row.key==='armor');
    if(!armorRow)return;
    const rows=result.hull.massBudget.filter(row=>row.key!=='armor').map(row=>({...clone(row),distributedHardeningTonnes:finite(row.distributedHardeningTonnes),distributedHardeningVolumeM3:finite(row.distributedHardeningVolumeM3),hardeningCategories:{...(row.hardeningCategories||{})}}));
    for(const [category,allocation]of Object.entries(armor.allocations)){
      const targets=hardeningTargets(rows,category),masses=splitExact(allocation.massTonnes,targets),volumes=splitExact(allocation.volumeM3,targets,'volumeM3');
      targets.forEach((target,index)=>{
        target.massTonnes+=masses[index];target.volumeM3+=volumes[index];target.distributedHardeningTonnes+=masses[index];target.distributedHardeningVolumeM3+=volumes[index];target.hardeningCategories[category]=finite(target.hardeningCategories[category])+masses[index];
        target.distributedHardening=true;target.note=`${target.note||''} Includes distributed ${category.replace(/([A-Z])/g,' $1').toLowerCase()} hardening; this is reinforcement of the vessel and installed system, not a detachable armor module.`.trim();
      });
    }
    const totalMass=sum(rows,'massTonnes'),totalVolume=sum(rows,'volumeM3');
    result.hull.massBudget=rows.map(row=>({...row,massPercent:row.massTonnes/Math.max(1e-12,totalMass)*100,massText:row.massText,volumeText:`${finite(row.volumeM3).toLocaleString(undefined,{maximumFractionDigits:1})} m³`}));
    result.hull.totalMassTonnes=totalMass;result.hull.totalVolumeM3=totalVolume;result.hull.averageDensityTonnesM3=totalMass/Math.max(1e-12,totalVolume);result.hull.massBalanceErrorTonnes=totalMass-sum(result.hull.massBudget,'massTonnes');
  }
  function correctedArmor(result){
    const source=result.armor,doctrine=source.doctrine||result.identity?.defenseKey||'hardened',allocationWeights=normalized(allocationProfiles[doctrine]||allocationProfiles.hardened),physicalWeights=normalized(physicalFacingProfiles[doctrine]||physicalFacingProfiles.hardened),fieldWeights=normalized(fieldFacingProfiles[doctrine]||fieldFacingProfiles.hardened),passive=finite(source.passiveArmorMassTonnes),active=finite(source.fieldProtectionMassTonnes),rowVolume=finite(result.hull.massBudget.find(row=>row.key==='armor')?.volumeM3,passive/7.4),referenceArmorDensityKgM3=7800,equivalentOuterHullThicknessMm=finite(source.physicalArealDensityKgM2)/referenceArmorDensityKgM3*1000;
    const allocations={};let assignedMass=0,assignedVolume=0;const allocationEntries=Object.entries(allocationWeights);
    allocationEntries.forEach(([key,fraction],index)=>{const massTonnes=index===allocationEntries.length-1?passive-assignedMass:passive*fraction,volumeM3=index===allocationEntries.length-1?rowVolume-assignedVolume:rowVolume*fraction;allocations[key]={key,label:({outerHull:'Outer-hull thickness and continuous skin',externalSystems:'External-system hardening and armored housings',structural:'Structural armoring and reinforced load paths',citadel:'Citadel armoring around critical internal systems'})[key],fraction,massTonnes,volumeM3};assignedMass+=massTonnes;assignedVolume+=volumeM3;});
    const facings={},fieldFacings={};
    for(const [key,weight]of Object.entries(physicalWeights))facings[key]={key,label:labels[key],weight,massTonnes:passive*weight,physicalArealDensityKgM2:source.physicalArealDensityKgM2*weight*8,effectiveArealDensityKgM2:source.effectiveArealDensityKgM2*weight*8,equivalentThicknessMm:equivalentOuterHullThicknessMm*weight*8};
    const baseFieldFactor=finite(result.protection?.fieldFactor,1);
    for(const [key,weight]of Object.entries(fieldWeights))fieldFacings[key]={key,label:labels[key],weight,massTonnes:active*weight,relativeFieldStrength:weight*8,effectiveFieldFactor:baseFieldFactor*weight*8};
    const layerLabels={debris:'Outer-hull debris and impact thickness',structural:'Structural armoring and reinforced load paths',radiation:'Radiation and shadow protection integrated into the hull',thermal:'Thermal and laser-resistant outer-hull treatment',citadel:'Citadel armoring around critical internal systems'};
    return{...source,model:'DISTRIBUTED_HULL_AND_SYSTEM_HARDENING',standaloneArmorModules:false,referenceArmorDensityKgM3,equivalentOuterHullThicknessMm,externalSystemDurabilityMultiplier:1+allocations.externalSystems.fraction*finite(source.armorToMassPercent)/12,allocations,facings,fieldFacings,layers:(source.layers||[]).map(layer=>({...layer,label:layerLabels[layer.key]||layer.label})),distributionRule:'Passive protection mass is distributed into hull thickness, structural reinforcement, citadel protection, and hardened external-system housings. Active protection remains installed field-generation and control hardware with directional coverage.',relativisticBoundary:source.relativisticBoundary};
  }
  function apply(result){
    if(result?.armor?.model==='DISTRIBUTED_HULL_AND_SYSTEM_HARDENING')return result;
    const armor=correctedArmor(result);result.armor=armor;result.engineeringLedger.armor=clone(armor);distributeRows(result,armor);
    result.protection={...result.protection,armorModel:armor.model,standaloneArmorModules:false,equivalentOuterHullThicknessMm:armor.equivalentOuterHullThicknessMm,externalSystemDurabilityMultiplier:armor.externalSystemDurabilityMultiplier,hardeningAllocations:clone(armor.allocations),directionalArmor:clone(armor.facings),directionalFields:clone(armor.fieldFacings)};
    result.engineeringLedger.massClosure.actualLoadedMassTonnes=result.hull.totalMassTonnes;result.engineeringLedger.massClosure.actualVolumeM3=result.hull.totalVolumeM3;result.engineeringLedger.massClosure.massErrorTonnes=result.hull.totalMassTonnes-result.engineeringLedger.massClosure.expectedLoadedMassTonnes;
    result.warnings=[...(result.warnings||[]),'Armor is modeled as distributed outer-hull thickness, structural reinforcement, citadel reinforcement, and hardened external-system construction. It does not generate detachable armor modules.','Fore, aft, left, right, up, down, citadel, and structural physical protection are tracked separately from directional active shielding.'];
    return result;
  }
  function generate(seed,input={},source=null){return apply(base.generate(seed,input,source));}
  globalThis.BlacklightExoVessel=Object.freeze({...base,distributedArmorVersion:1,generate});
})();
