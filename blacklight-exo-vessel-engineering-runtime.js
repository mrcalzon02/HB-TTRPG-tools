(() => {
  'use strict';
  const base=globalThis.BlacklightExoVessel;
  const D=globalThis.BlacklightExoVesselEngineeringDefinitions;
  if(!base||!D||base.engineeringLedgerVersion)return;

  const G0=9.80665;
  const C=299792458;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const clone=value=>value==null?value:structuredClone(value);
  const sum=(rows,field='massTonnes')=>rows.reduce((total,row)=>total+finite(row[field]),0);
  const fmt=(value,digits=3)=>finite(value).toLocaleString(undefined,{maximumFractionDigits:digits});
  const dom=id=>globalThis.document?.getElementById?.(id)?.value||null;
  function hash(value){let state=2166136261;for(const char of String(value)){state^=char.charCodeAt(0);state=Math.imul(state,16777619);}return state>>>0;}
  const unit=seed=>hash(seed)/4294967295;
  function massText(tonnes){const value=Math.max(0,finite(tonnes));if(value>=1e12)return`${fmt(value/1e12)} trillion tonnes`;if(value>=1e9)return`${fmt(value/1e9)} billion tonnes`;if(value>=1e6)return`${fmt(value/1e6)} million tonnes`;if(value>=1e3)return`${fmt(value/1e3)} thousand tonnes`;if(value>=1)return`${fmt(value)} tonnes`;return`${fmt(value*1000)} kg`;}
  function velocityText(mps){const value=Math.max(0,finite(mps));if(value>=C*.01)return`${fmt(value/C,4)} c`;if(value>=1e6)return`${fmt(value/1e6,3)} Mm/s`;if(value>=1000)return`${fmt(value/1000,3)} km/s`;return`${fmt(value,1)} m/s`;}
  function durationText(seconds){const value=Math.max(0,finite(seconds));if(value>=86400)return`${fmt(value/86400,2)} days`;if(value>=3600)return`${fmt(value/3600,2)} hours`;if(value>=60)return`${fmt(value/60,2)} minutes`;return`${fmt(value,2)} seconds`;}
  function powerText(watts){const value=Math.max(0,finite(watts));if(value>=1e15)return`${fmt(value/1e15)} PW`;if(value>=1e12)return`${fmt(value/1e12)} TW`;if(value>=1e9)return`${fmt(value/1e9)} GW`;if(value>=1e6)return`${fmt(value/1e6)} MW`;if(value>=1e3)return`${fmt(value/1e3)} kW`;return`${fmt(value)} W`;}
  function geometry(volumeM3,shape,heightRatio=.72){const beam=Math.cbrt(Math.max(1,volumeM3)/(Math.PI/6*Math.max(2,shape)*heightRatio));const length=beam*Math.max(2,shape),height=beam*heightRatio;return{lengthM:length,beamM:beam,heightM:height,decks:Math.max(1,Math.round(height/4.2)),surfaceAreaM2:Math.PI*beam*(length+height)*.74};}
  function normalized(table){const total=Object.values(table).reduce((a,b)=>a+finite(b),0)||1;return Object.fromEntries(Object.entries(table).map(([key,value])=>[key,finite(value)/total]));}
  function rowMap(result){return Object.fromEntries((result.hull?.massBudget||[]).map(row=>[row.key,row]));}
  function derivedRow(parent,key,label,massTonnes,volumeM3,note,extra={}){
    const baseRow=parent||{};
    return{...baseRow,...extra,parentEngineeringKey:baseRow.key||null,key,label,massTonnes:Math.max(0,finite(massTonnes)),volumeM3:Math.max(0,finite(volumeM3)),note};
  }
  function selectedCombatFit(input,result){
    const requested=String(input.combatFit||dom('exo-vessel-combat-fit')||'AUTO').toUpperCase();
    const key=requested==='AUTO'?(D.roleCombatFit[result.identity?.roleKey]||'DEFENSIVE'):requested;
    if(!D.combatFits[key])throw new Error(`Unknown combat systems fit ${key}.`);
    return D.combatFits[key];
  }
  function crewLimitG(result,mobility){
    const key=result.lifeSupport?.profile?.key;
    const baseLimit={synthetic:12,'high-gravity':4.8,'low-gravity':1.15,aquatic:.85,ammonia:.72,hydrocarbon:.62,multispecies:1.35,'toxic-atmosphere':2.1,'human-standard':2.7}[key]||2.4;
    return Math.max(.25,baseLimit*finite(mobility.crewLimitMultiplier,1));
  }
  function propulsionLedger(seed,result,input,rows){
    const rank=clamp(Math.round(finite(result.drive?.pathLevelRank,4)),0,6),technology=D.propulsionByRank[rank],mobility=D.roleMobility[result.identity?.roleKey]||D.roleMobility.explorer;
    const maneuver=rows.maneuver;
    if(!maneuver)throw new Error('VESSEL-02 requires the architecture-adjusted maneuver row.');
    const dryBeforePropellant=Math.max(.001,finite(result.hull?.totalMassTonnes));
    const quality=finite(result.manufacturer?.production?.qualityControl,.65),targetStrategicDeltaV=technology.baseStrategicDeltaVMps*mobility.strategicMultiplier*(.91+quality*.14);
    const propellantMassTonnes=dryBeforePropellant*(Math.exp(targetStrategicDeltaV/technology.exhaustVelocityMps)-1);
    const wetMassTonnes=dryBeforePropellant+propellantMassTonnes;
    const combatPropellantTonnes=propellantMassTonnes*mobility.combatReserveFraction;
    const cruisePropellantTonnes=propellantMassTonnes-combatPropellantTonnes;
    const cruiseDeltaVMps=technology.exhaustVelocityMps*Math.log(wetMassTonnes/(dryBeforePropellant+combatPropellantTonnes));
    const combatReserveDeltaVMps=technology.exhaustVelocityMps*Math.log((dryBeforePropellant+combatPropellantTonnes)/dryBeforePropellant);
    const enginePowerW=Math.max(1,maneuver.massTonnes*1000*technology.specificPowerWKg*(.88+quality*.24));
    const thrustN=2*technology.efficiency*enginePowerW/technology.exhaustVelocityMps;
    const rawLongitudinalAccelerationMps2=thrustN/(wetMassTonnes*1000);
    const architecture=result.designPhilosophy?.classification||'HYBRID';
    const architectureLoadFactor=architecture==='INTERNAL'?1.06:architecture==='EVA'?.88:.97;
    const structuralLimitG=technology.maxEngineAccelerationG*mobility.accelerationMultiplier*architectureLoadFactor*(.88+quality*.22);
    const biologicalLimitG=crewLimitG(result,mobility);
    const longitudinalAccelerationMps2=Math.min(rawLongitudinalAccelerationMps2,structuralLimitG*G0,biologicalLimitG*G0);
    const lateralCombatAccelerationMps2=longitudinalAccelerationMps2*mobility.vectoringFraction;
    const propellantFlowKgS=thrustN/technology.exhaustVelocityMps;
    const propellantLimitedSeconds=combatPropellantTonnes*1000/Math.max(1e-12,propellantFlowKgS);
    const thermalCapacityJ=Math.max(1,finite(result.thermal?.totalThermalTonnes,1)*1000*(2.2e6*Math.pow(2.15,rank))*.20);
    const propulsionWasteHeatW=enginePowerW*technology.heatFraction;
    const thermalLimitedSeconds=thermalCapacityJ/Math.max(1,propulsionWasteHeatW);
    const sustainedCombatDurationSeconds=Math.min(propellantLimitedSeconds,thermalLimitedSeconds);
    const propellantVolumeM3=propellantMassTonnes*1000/technology.propellantDensityKgM3*1.12;
    return{
      recordType:'exoVesselPropulsionLedger',schemaVersion:'1.0.0',technologyBand:`P${rank}`,technology,
      engineHardwareMassTonnes:maneuver.massTonnes,engineHardwareVolumeM3:maneuver.volumeM3,propellantMassTonnes,propellantVolumeM3,dryBeforePropellantTonnes:dryBeforePropellant,wetMassTonnes,
      strategicDeltaVMps:cruiseDeltaVMps+combatReserveDeltaVMps,cruiseDeltaVMps,combatReserveDeltaVMps,combatReserveFraction:mobility.combatReserveFraction,cruisePropellantTonnes,combatPropellantTonnes,
      enginePowerW,thrustN,rawLongitudinalAccelerationMps2,longitudinalAccelerationMps2,lateralCombatAccelerationMps2,structuralAccelerationLimitG:structuralLimitG,crewAccelerationLimitG:biologicalLimitG,
      propellantFlowKgS,propellantLimitedSeconds,thermalCapacityJ,propulsionWasteHeatW,thermalLimitedSeconds,sustainedCombatDurationSeconds,
      validation:{valid:true,violations:[]}
    };
  }
  function armorLedger(result,rows,wetMassTonnes){
    const shielding=rows.shielding;
    if(!shielding)throw new Error('VESSEL-02 requires the architecture-adjusted shielding row.');
    const rank=clamp(Math.round(finite(result.drive?.pathLevelRank,4)),0,6),defenseKey=result.identity?.defenseKey||'hardened',fractions=normalized(D.armorLayerFractions[defenseKey]||D.armorLayerFractions.hardened);
    const architecture=result.designPhilosophy?.classification||'HYBRID',armorEfficiency=finite(result.designPhilosophy?.globalResults?.armorEfficiency,1),surfaceAreaM2=Math.max(1,finite(result.hull?.surfaceAreaM2,1));
    const fieldFraction=clamp(.07+rank*.027+finite(result.protection?.fieldFactor,.8)*.055,.08,.36),passiveArmorMassTonnes=shielding.massTonnes*(1-fieldFraction),fieldProtectionMassTonnes=shielding.massTonnes-passiveArmorMassTonnes;
    const baseCoverage={civilian:.52,hardened:.70,naval:.88}[defenseKey]||.70,architectureCoverage=architecture==='INTERNAL'?1.08:architecture==='EVA'?.72:.92,coverageFraction=clamp(baseCoverage*architectureCoverage,.28,.98);
    const physicalArealDensityKgM2=passiveArmorMassTonnes*1000/(surfaceAreaM2*coverageFraction),effectiveArealDensityKgM2=physicalArealDensityKgM2*armorEfficiency;
    const layers=Object.entries(fractions).map(([key,fraction])=>({key,label:({debris:'Spaced debris and Whipple protection',structural:'Structural armor',radiation:'Radiation and shadow shielding',thermal:'Thermal and laser ablative layer',citadel:'Local citadel reinforcement'})[key],massTonnes:passiveArmorMassTonnes*fraction,fraction,coverageFraction,physicalArealDensityKgM2:physicalArealDensityKgM2*fraction,effectiveArealDensityKgM2:effectiveArealDensityKgM2*fraction}));
    const facings=normalized(result.identity?.roleKey==='warship'?{forward:.24,aft:.11,port:.14,starboard:.14,dorsal:.12,ventral:.12,citadel:.13}:{forward:.17,aft:.13,port:.16,starboard:.16,dorsal:.13,ventral:.13,citadel:.12});
    const equationMassTonnes=surfaceAreaM2*physicalArealDensityKgM2*coverageFraction/1000;
    return{recordType:'exoVesselArmorLedger',schemaVersion:'1.0.0',doctrine:defenseKey,architecture,protectedSurfaceAreaM2:surfaceAreaM2,coverageFraction,physicalArealDensityKgM2,effectiveArealDensityKgM2,architectureEfficiency:armorEfficiency,passiveArmorMassTonnes,fieldProtectionMassTonnes,totalProtectionMassTonnes:shielding.massTonnes,armorToMassPercent:passiveArmorMassTonnes/wetMassTonnes*100,protectionToMassPercent:shielding.massTonnes/wetMassTonnes*100,equationMassTonnes,layers,facings,relativisticBoundary:'Protection against sufficiently energetic impacts transitions from passive absorption toward interception, avoidance, sacrificial separation, dispersion, and survival of critical graphs.',validation:{valid:true,violations:[]}};
  }
  function sensorLedger(result,rows,fit){
    const navigation=rows.navigation;
    if(!navigation)throw new Error('VESSEL-02 requires the architecture-adjusted navigation row.');
    const rank=clamp(Math.round(finite(result.drive?.pathLevelRank,4)),0,6),technology=D.sensorByRank[rank],role=(base.roles||[]).find(item=>item.key===result.identity?.roleKey)||{sensors:1};
    const sensorShare=clamp(.42+(finite(role.sensors,1)-1)*.07,.34,.58),fireControlShare=fit.fireControlShare,ewShare=fit.ewShare,navigationShare=Math.max(.16,1-sensorShare-fireControlShare-ewShare),shares=normalized({navigation:navigationShare,sensors:sensorShare,fireControl:fireControlShare,electronicWarfare:ewShare});
    const masses=Object.fromEntries(Object.entries(shares).map(([key,value])=>[key,navigation.massTonnes*value]));
    const topology=result.manufacturer?.topologyWeights||{},externalBaselineFactor=1+finite(topology.SPINE)*.28+finite(topology.CLUSTER)*.18+finite(result.designPhilosophy?.internalsVolumePercent<40?.12:0);
    const baselineM=Math.max(finite(result.navigation?.baselineM,25),finite(result.hull?.lengthM,25)*.62)*externalBaselineFactor;
    const apertureAreaM2=masses.sensors*1000/technology.apertureKgM2;
    const sensorChannels=Math.max(1,Math.floor(masses.sensors/technology.channelMassTonnes));
    const fireControlChannels=fit.maxWeaponFamilies===0?0:Math.max(1,Math.floor(masses.fireControl/Math.max(.1,technology.channelMassTonnes*.62)));
    const navigationChannels=Math.max(2,Math.floor(masses.navigation/Math.max(.1,technology.channelMassTonnes*.8)));
    const electronicWarfareChannels=Math.max(1,Math.floor(masses.electronicWarfare/Math.max(.1,technology.channelMassTonnes*.7)));
    const processingIndex=technology.processingFactor*(.72+finite(result.manufacturer?.production?.automation,.5)*.5)*(1+Math.log10(1+sensorChannels));
    const sensorPowerW=masses.sensors*1000*(1.5e4*Math.pow(3.2,rank));
    const fireControlPowerW=masses.fireControl*1000*(2e4*Math.pow(3.4,rank));
    const electronicWarfarePowerW=masses.electronicWarfare*1000*(2.8e4*Math.pow(3.5,rank));
    return{recordType:'exoVesselSensorLedger',schemaVersion:'1.0.0',technologyBand:`P${rank}`,technology,totalMassTonnes:navigation.massTonnes,masses,shares,baselineM,apertureAreaM2,sensorChannels,fireControlChannels,navigationChannels,electronicWarfareChannels,processingIndex,stabilizationMicrorad:technology.stabilizationMicrorad,sensorPowerW,fireControlPowerW,electronicWarfarePowerW,trackModelStatus:'Mass, baseline, aperture, processing, and channel capacity are generated. Light-lag, track uncertainty, and engagement solutions remain reserved for VESSEL-06.',validation:{valid:true,violations:[]}};
  }
  function familyByPreference(name){const value=String(name||'').toLowerCase();return Object.values(D.weaponFamilies).find(family=>family.aliases.some(alias=>value.includes(alias)))||null;}
  function selectedWeaponFamilies(seed,result,fit,rank){
    if(fit.maxWeaponFamilies===0)return[];
    const preferred=(result.manufacturer?.weaponPreferences||[]).map(familyByPreference).filter(Boolean),defaults=(D.defaultWeaponPriority[result.identity?.roleKey]||D.defaultWeaponPriority.explorer).map(key=>D.weaponFamilies[key]);
    const unique=[];for(const family of[...preferred,...defaults])if(family&&family.minimumRank<=rank&&!unique.some(item=>item.key===family.key))unique.push(family);
    return unique.sort((a,b)=>{const pa=preferred.findIndex(item=>item.key===a.key),pb=preferred.findIndex(item=>item.key===b.key);if(pa>=0||pb>=0)return(pa<0?99:pa)-(pb<0?99:pb);return unit(`${seed}:weapon:${a.key}`)-unit(`${seed}:weapon:${b.key}`);}).slice(0,fit.maxWeaponFamilies);
  }
  function weaponLedger(seed,result,rows,fit){
    const payload=rows.payload,margin=rows.margin;
    if(!payload||!margin)throw new Error('VESSEL-02 requires payload and design-margin rows.');
    const rank=clamp(Math.round(finite(result.drive?.pathLevelRank,4)),0,6),rawPayload=payload.massTonnes*fit.payloadShare,rawMargin=margin.massTonnes*fit.marginShare,rawAllocation=rawPayload+rawMargin;
    const capFraction={UNARMED:0,CIVILIAN:.018,DEFENSIVE:.055,SECURITY:.11,NAVAL:.23}[fit.key]||.055,combatCapTonnes=finite(result.hull?.totalMassTonnes)*capFraction,totalCombatAllocationTonnes=Math.min(rawAllocation,combatCapTonnes),scale=rawAllocation>0?totalCombatAllocationTonnes/rawAllocation:0;
    const payloadContributionTonnes=rawPayload*scale,marginContributionTonnes=rawMargin*scale,countermeasureMassTonnes=totalCombatAllocationTonnes*fit.countermeasureFraction,offensiveMassTonnes=totalCombatAllocationTonnes-countermeasureMassTonnes;
    const selected=selectedWeaponFamilies(seed,result,fit,rank),weights=normalized(Object.fromEntries(selected.map((family,index)=>[family.key,(index===0?1.35:1)*(.88+unit(`${seed}:weapon-weight:${family.key}`)*.24)])));
    const weaponPowerDensityWKg=Math.min(D.propulsionByRank[rank].specificPowerWKg*.12,2e4*Math.pow(4,rank));
    const installations=selected.map(family=>{
      const allocationMassTonnes=offensiveMassTonnes*finite(weights[family.key]),mountMassTonnes=allocationMassTonnes*family.mountFraction,supportMassTonnes=allocationMassTonnes*family.supportFraction,magazineMassTonnes=allocationMassTonnes*family.magazineFraction,coolingMassTonnes=allocationMassTonnes*family.coolingFraction;
      const peakPowerW=supportMassTonnes*1000*weaponPowerDensityWKg*family.powerFactor,continuousPowerW=peakPowerW*family.dutyCycle,wasteHeatW=continuousPowerW*family.heatFraction,roundCount=family.unitRoundMassTonnes>0?Math.floor(magazineMassTonnes/family.unitRoundMassTonnes):0;
      return{weaponFamily:family.key,label:family.label,technologyBand:`P${rank}`,allocationMassTonnes,mountMassTonnes,supportMassTonnes,magazineMassTonnes,coolingMassTonnes,peakPowerW,continuousPowerW,wasteHeatW,unitRoundMassTonnes:family.unitRoundMassTonnes,roundCount,preferredTargets:family.preferredTargets,integrationStatus:'Installed mass, magazine, power conditioning, cooling, and support are generated. Projectile, beam, guidance, and engagement-envelope statistics remain reserved for VESSEL-07.'};
    });
    const totals={mountMassTonnes:sum(installations,'mountMassTonnes'),supportMassTonnes:sum(installations,'supportMassTonnes'),magazineMassTonnes:sum(installations,'magazineMassTonnes'),coolingMassTonnes:sum(installations,'coolingMassTonnes'),peakPowerW:sum(installations,'peakPowerW'),continuousPowerW:sum(installations,'continuousPowerW'),wasteHeatW:sum(installations,'wasteHeatW')};
    const countermeasureInventory=Object.values(D.countermeasureTypes).map(type=>{
      const allocationMassTonnes=countermeasureMassTonnes*type.massFraction,launcherAndSupportMassTonnes=allocationMassTonnes*type.launcherFraction,expendableMassTonnes=allocationMassTonnes-launcherAndSupportMassTonnes,unitCount=Math.floor(expendableMassTonnes/Math.max(.001,type.unitMassTonnes)),peakPowerW=launcherAndSupportMassTonnes*1000*type.powerWPerTonne;
      return{countermeasureType:type.key,label:type.label,allocationMassTonnes,launcherAndSupportMassTonnes,expendableMassTonnes,unitMassTonnes:type.unitMassTonnes,unitCount,peakPowerW,functions:type.functions};
    });
    const countermeasurePeakPowerW=sum(countermeasureInventory,'peakPowerW');
    return{recordType:'exoVesselWeaponSupportLedger',schemaVersion:'1.0.0',combatFit:fit,totalCombatAllocationTonnes,payloadContributionTonnes,marginContributionTonnes,remainingPayloadTonnes:payload.massTonnes-payloadContributionTonnes,remainingMarginTonnes:margin.massTonnes-marginContributionTonnes,offensiveMassTonnes,countermeasureMassTonnes,installations,totals,countermeasures:{recordType:'exoVesselCountermeasureLedger',schemaVersion:'1.0.0',totalMassTonnes:countermeasureMassTonnes,peakPowerW:countermeasurePeakPowerW,inventory:countermeasureInventory,engagementStatus:'Inventory, launch support, channels, mass, and power are generated. Actual interception and deception resolution remain reserved for VESSEL-07 and VESSEL-08.'},validation:{valid:true,violations:[]}};
  }
  function buildMassBudget(result,rows,propulsion,armor,sensors,weapons){
    const replacements={};
    replacements.maneuver=[
      derivedRow(rows.maneuver,'conventional-engine','Conventional maneuver engines, tanks, and thrust structure',propulsion.engineHardwareMassTonnes,propulsion.engineHardwareVolumeM3,`${propulsion.technology.label}; ${powerText(propulsion.enginePowerW)} installed maneuver power and ${fmt(propulsion.thrustN/1e6,3)} MN thrust.`),
      derivedRow(rows.maneuver,'conventional-propellant','Conventional reaction mass',propulsion.propellantMassTonnes,propulsion.propellantVolumeM3,`${propulsion.technology.propellant}; ${velocityText(propulsion.strategicDeltaVMps)} strategic delta-v including ${velocityText(propulsion.combatReserveDeltaVMps)} combat reserve.`,{physicalInventoryFloorTonnes:propulsion.propellantMassTonnes,architectureAffectedMassTonnes:0})
    ];
    replacements.shielding=[
      derivedRow(rows.shielding,'armor','Passive armor, debris, radiation, and thermal protection',armor.passiveArmorMassTonnes,armor.passiveArmorMassTonnes/Math.max(.2,7.4),`${fmt(armor.coverageFraction*100,1)}% modeled coverage at ${fmt(armor.physicalArealDensityKgM2,1)} kg/m² physical areal density.`),
      derivedRow(rows.shielding,'protection-fields','Defensive field, isolation, and protection hardware',armor.fieldProtectionMassTonnes,armor.fieldProtectionMassTonnes/Math.max(.2,.82),`${fmt(armor.fieldProtectionMassTonnes,3)} tonnes of active protection hardware separated from passive armor mass.`)
    ];
    const nav=rows.navigation;
    replacements.navigation=[
      derivedRow(nav,'navigation','Navigation, clocks, and independent solution channels',sensors.masses.navigation,nav.volumeM3*sensors.shares.navigation,`${sensors.navigationChannels} independent navigation and clock solution channels.`),
      derivedRow(nav,'sensors','Sensor apertures, baselines, and processing',sensors.masses.sensors,nav.volumeM3*sensors.shares.sensors,`${fmt(sensors.apertureAreaM2,2)} m² modeled aperture and ${fmt(sensors.baselineM,1)} m baseline across ${sensors.sensorChannels} channels.`),
      derivedRow(nav,'fire-control','Fire-control computation and stabilization',sensors.masses.fireControl,nav.volumeM3*sensors.shares.fireControl,`${sensors.fireControlChannels} fire-control channels; ${fmt(sensors.stabilizationMicrorad,3)} microradian reference stabilization.`),
      derivedRow(nav,'electronic-warfare','Electronic warfare, deception, and counter-countermeasure plant',sensors.masses.electronicWarfare,nav.volumeM3*sensors.shares.electronicWarfare,`${sensors.electronicWarfareChannels} electronic warfare channels.`)
    ];
    const payload=rows.payload,margin=rows.margin,payloadVolumeScale=payload.massTonnes>0?weapons.remainingPayloadTonnes/payload.massTonnes:0,marginVolumeScale=margin.massTonnes>0?weapons.remainingMarginTonnes/margin.massTonnes:0;
    const combatRows=[];
    if(weapons.offensiveMassTonnes>0){
      combatRows.push(
        derivedRow(payload,'weapon-mounts','Weapon mounts, recoil paths, apertures, and launch structures',weapons.totals.mountMassTonnes,weapons.totals.mountMassTonnes/.72,`${weapons.installations.length} installed weapon families with physical firing or launch structures.`),
        derivedRow(payload,'weapon-support','Weapon power conditioning, handling, and control support',weapons.totals.supportMassTonnes,weapons.totals.supportMassTonnes/.56,`${powerText(weapons.totals.peakPowerW)} aggregate peak weapon power conditioning.`),
        derivedRow(payload,'weapon-magazines','Weapon magazines and expendable inventory',weapons.totals.magazineMassTonnes,weapons.totals.magazineMassTonnes/.88,'Finite ammunition, missile, projectile, or replaceable emitter inventory; magazine segregation is reserved for the module graph.'),
        derivedRow(payload,'weapon-cooling','Weapon heat sinks, coolant loops, and dedicated radiators',weapons.totals.coolingMassTonnes,weapons.totals.coolingMassTonnes/.65,`${powerText(weapons.totals.wasteHeatW)} modeled sustained weapon waste heat.`)
      );
    }
    if(weapons.countermeasureMassTonnes>0)combatRows.push(derivedRow(margin,'countermeasures','Countermeasure launchers, interceptors, decoys, jammers, and screens',weapons.countermeasureMassTonnes,weapons.countermeasureMassTonnes/.62,`${weapons.countermeasures.inventory.reduce((total,item)=>total+item.unitCount,0)} modeled expendable countermeasure units across ${weapons.countermeasures.inventory.length} functions.`));
    replacements.payload=[derivedRow(payload,'payload','Mission payload and role equipment',weapons.remainingPayloadTonnes,payload.volumeM3*payloadVolumeScale,payload.note),...combatRows];
    replacements.margin=[derivedRow(margin,'margin','Unallocated design and growth margin',weapons.remainingMarginTonnes,margin.volumeM3*marginVolumeScale,margin.note)];
    const output=[];for(const row of result.hull.massBudget){if(replacements[row.key])output.push(...replacements[row.key]);else output.push(clone(row));}
    return output;
  }
  function validateLedger(result,ledger){
    const violations=[];
    const mass=sum(result.hull.massBudget),volume=sum(result.hull.massBudget,'volumeM3');
    if(Math.abs(mass-result.hull.totalMassTonnes)>Math.max(1,mass)*1e-9)violations.push('Expanded engineering mass ledger does not close.');
    if(Math.abs(volume-result.hull.totalVolumeM3)>Math.max(1,volume)*1e-9)violations.push('Expanded engineering volume ledger does not close.');
    const p=ledger.propulsion,reconstructed=p.technology.exhaustVelocityMps*Math.log(p.wetMassTonnes/p.dryBeforePropellantTonnes);
    if(Math.abs(reconstructed-p.strategicDeltaVMps)>Math.max(1,reconstructed)*1e-9)violations.push('Propulsion delta-v does not reconstruct from wet mass, dry mass, and exhaust velocity.');
    if(p.combatReserveDeltaVMps>p.strategicDeltaVMps)violations.push('Combat reserve delta-v exceeds strategic delta-v.');
    const a=ledger.armor;if(Math.abs(a.equationMassTonnes-a.passiveArmorMassTonnes)>Math.max(1,a.passiveArmorMassTonnes)*1e-9)violations.push('Armor mass does not close against protected area, areal density, and coverage.');
    const w=ledger.weapons;if(Math.abs(w.offensiveMassTonnes-(w.totals.mountMassTonnes+w.totals.supportMassTonnes+w.totals.magazineMassTonnes+w.totals.coolingMassTonnes))>Math.max(1,w.offensiveMassTonnes)*1e-9)violations.push('Weapon installation mass categories do not close.');
    if(Math.abs(w.totalCombatAllocationTonnes-(w.offensiveMassTonnes+w.countermeasureMassTonnes))>Math.max(1,w.totalCombatAllocationTonnes)*1e-9)violations.push('Combat allocation does not close.');
    return{valid:!violations.length,violations};
  }
  function apply(seed,input,source,result){
    const rows=rowMap(result),fit=selectedCombatFit(input,result),propulsion=propulsionLedger(seed,result,input,rows),wetMassTonnes=propulsion.wetMassTonnes,armor=armorLedger(result,rows,wetMassTonnes),sensors=sensorLedger(result,rows,fit),weapons=weaponLedger(seed,result,rows,fit);
    const oldMassTonnes=finite(result.hull.totalMassTonnes),oldVolumeM3=finite(result.hull.totalVolumeM3),massBudget=buildMassBudget(result,rows,propulsion,armor,sensors,weapons),totalMassTonnes=sum(massBudget),totalVolumeM3=sum(massBudget,'volumeM3'),shape=Math.max(2,finite(result.hull.lengthM)/Math.max(1,finite(result.hull.beamM))),hullGeometry=geometry(totalVolumeM3,shape);
    result.hull.preEngineeringLedgerMassTonnes=oldMassTonnes;result.hull.preEngineeringLedgerVolumeM3=oldVolumeM3;result.hull.totalMassTonnes=totalMassTonnes;result.hull.totalVolumeM3=totalVolumeM3;result.hull.lengthM=hullGeometry.lengthM;result.hull.beamM=hullGeometry.beamM;result.hull.heightM=hullGeometry.heightM;result.hull.decks=hullGeometry.decks;result.hull.surfaceAreaM2=hullGeometry.surfaceAreaM2;result.hull.averageDensityTonnesM3=totalMassTonnes/Math.max(1e-12,totalVolumeM3);result.hull.massBalanceErrorTonnes=totalMassTonnes-sum(massBudget);result.hull.totalMassText=massText(totalMassTonnes);result.hull.dryMassTonnes=totalMassTonnes-finite(result.fuel?.carriedFuelTonnes)-propulsion.propellantMassTonnes;result.hull.massBudget=massBudget.map(row=>({...row,massPercent:row.massTonnes/totalMassTonnes*100,massText:massText(row.massTonnes),volumeText:`${fmt(row.volumeM3,1)} m³`}));
    result.drive.driveFractionPercent=finite(result.drive.integratedDriveMassTonnes)/totalMassTonnes*100;
    result.propulsion={...propulsion,strategicDeltaVText:velocityText(propulsion.strategicDeltaVMps),combatReserveDeltaVText:velocityText(propulsion.combatReserveDeltaVMps),lateralCombatAccelerationG:propulsion.lateralCombatAccelerationMps2/G0,sustainedCombatDurationText:durationText(propulsion.sustainedCombatDurationSeconds),enginePowerText:powerText(propulsion.enginePowerW)};
    result.armor=armor;
    result.sensors={...sensors,sensorPowerText:powerText(sensors.sensorPowerW)};
    result.fireControl={channels:sensors.fireControlChannels,massTonnes:sensors.masses.fireControl,powerW:sensors.fireControlPowerW,powerText:powerText(sensors.fireControlPowerW),stabilizationMicrorad:sensors.stabilizationMicrorad,status:sensors.trackModelStatus};
    result.electronicWarfare={channels:sensors.electronicWarfareChannels,massTonnes:sensors.masses.electronicWarfare,powerW:sensors.electronicWarfarePowerW,powerText:powerText(sensors.electronicWarfarePowerW)};
    result.weapons={...weapons,fitKey:fit.key,fitLabel:fit.label,peakPowerText:powerText(weapons.totals.peakPowerW),continuousPowerText:powerText(weapons.totals.continuousPowerW)};
    result.countermeasures=clone(weapons.countermeasures);
    result.power.propulsionPowerW=propulsion.enginePowerW;result.power.weaponPeakPowerW=weapons.totals.peakPowerW;result.power.weaponContinuousPowerW=weapons.totals.continuousPowerW;result.power.countermeasurePeakPowerW=weapons.countermeasures.peakPowerW;result.power.sensorAndFireControlW=sensors.sensorPowerW+sensors.fireControlPowerW+sensors.electronicWarfarePowerW;
    result.thermal.propulsionWasteHeatW=propulsion.propulsionWasteHeatW;result.thermal.weaponWasteHeatW=weapons.totals.wasteHeatW;result.thermal.weaponCoolingTonnes=weapons.totals.coolingMassTonnes;
    result.protection={...result.protection,passiveArmorMassTonnes:armor.passiveArmorMassTonnes,fieldProtectionMassTonnes:armor.fieldProtectionMassTonnes,coverageFraction:armor.coverageFraction,physicalArealDensityKgM2:armor.physicalArealDensityKgM2,effectiveArealDensityKgM2:armor.effectiveArealDensityKgM2,armorToMassPercent:armor.armorToMassPercent,protectionToMassPercent:armor.protectionToMassPercent};
    result.navigation={...result.navigation,navigationMassTonnes:sensors.masses.navigation,navigationChannels:sensors.navigationChannels,sensorChannels:sensors.sensorChannels,fireControlChannels:sensors.fireControlChannels,electronicWarfareChannels:sensors.electronicWarfareChannels,apertureAreaM2:sensors.apertureAreaM2,baselineM:sensors.baselineM};
    const ledger={recordType:'exoVesselEngineeringLedger',schemaVersion:'1.0.0',phase:'VESSEL-02',technologyBand:`P${result.drive.pathLevelRank}`,manufacturerId:result.manufacturer?.manufacturerId||null,sourceMassTonnes:oldMassTonnes,sourceVolumeM3:oldVolumeM3,addedReactionMassTonnes:propulsion.propellantMassTonnes,propulsion,armor,sensors,weapons,countermeasures:weapons.countermeasures,massClosure:{sourceMassTonnes:oldMassTonnes,addedMassTonnes:propulsion.propellantMassTonnes,expectedLoadedMassTonnes:oldMassTonnes+propulsion.propellantMassTonnes,actualLoadedMassTonnes:totalMassTonnes,massErrorTonnes:totalMassTonnes-(oldMassTonnes+propulsion.propellantMassTonnes),actualVolumeM3:totalVolumeM3},deferredSystems:{sensorTrackAndLightLag:'VESSEL-06',weaponPerformanceAndEngagementEnvelopes:'VESSEL-07',localDamageResolution:'VESSEL-08'},validation:{valid:true,violations:[]}};
    ledger.validation=validateLedger(result,ledger);result.engineeringLedger=ledger;
    if(result.manufacturer)result.manufacturer.realizedEngineering={technologyBand:ledger.technologyBand,combatFit:fit.key,strategicDeltaVMps:propulsion.strategicDeltaVMps,combatReserveDeltaVMps:propulsion.combatReserveDeltaVMps,lateralCombatAccelerationMps2:propulsion.lateralCombatAccelerationMps2,armorToMassPercent:armor.armorToMassPercent,protectionToMassPercent:armor.protectionToMassPercent,sensorChannels:sensors.sensorChannels,fireControlChannels:sensors.fireControlChannels,weaponFamilies:weapons.installations.map(item=>item.weaponFamily),countermeasureMassTonnes:weapons.countermeasureMassTonnes};
    result.warnings=[...(result.warnings||[]),`VESSEL-02 adds ${massText(propulsion.propellantMassTonnes)} of conventional reaction mass. All other armor, sensor, weapon-support, magazine, cooling, and countermeasure rows are reclassified from existing architecture-adjusted mass rather than duplicated.`,`The ${fit.label} installs ${weapons.installations.length} weapon families and ${massText(weapons.countermeasureMassTonnes)} of countermeasures. Weapon velocities, beam divergence, guidance, hit probability, and engagement ranges remain deliberately ungenerated until VESSEL-07.`,`Combat maneuver is limited to ${fmt(propulsion.lateralCombatAccelerationMps2/G0,3)} g lateral acceleration for ${durationText(propulsion.sustainedCombatDurationSeconds)} before either combat propellant or modeled thermal capacity is exhausted.`];
    return result;
  }

  function generate(seed,input={},source=null){const value=String(seed||input.seed||'vessel');return apply(value,input,source,base.generate(value,input,source));}
  globalThis.BlacklightExoVessel=Object.freeze({...base,engineeringLedgerVersion:1,engineeringSchemaVersion:'1.0.0',engineeringDefinitions:D,generate});
})();
