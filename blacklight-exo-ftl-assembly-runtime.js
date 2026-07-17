(() => {
  'use strict';
  const base=globalThis.BlacklightExoFTL,D=globalThis.BlacklightExoFTLAssemblyDefinitions;
  if(!base||!D||base.constructionAssemblyVersion)return;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const clone=v=>JSON.parse(JSON.stringify(v));
  function hash(value){let state=2166136261;for(const char of String(value)){state^=char.charCodeAt(0);state=Math.imul(state,16777619);}return state>>>0;}
  function rngFor(seed){let state=hash(seed)||1;return()=>{state+=0x6D2B79F5;let v=state;v=Math.imul(v^v>>>15,v|1);v^=v+Math.imul(v^v>>>7,v|61);return((v^v>>>14)>>>0)/4294967296;};}
  const lerp=(a,b,t)=>a+(b-a)*t;
  const logLerp=(a,b,t)=>10**lerp(Math.log10(Math.max(1e-30,a)),Math.log10(Math.max(1e-30,b)),t);
  const fmt=(v,d=3)=>Number(v).toLocaleString(undefined,{maximumFractionDigits:d});
  const cycles=v=>`${Math.max(1,Math.round(v)).toLocaleString()} transit cycle${Math.round(v)===1?'':'s'}`;
  function hoursText(h){if(h<1)return`${fmt(h*60,2)} minutes`;if(h<48)return`${fmt(h,2)} hours`;if(h<8766)return`${fmt(h/24,2)} days`;return`${fmt(h/8766,2)} years`;}
  const slots=[
    {kind:'energy conditioning',place:'near the primary energy plant with independent dump and isolation paths'},
    {kind:'prime mover',place:'at the geometric and mechanical center of the drive effect'},
    {kind:'field formation',place:'around the primary controlled volume or aperture on surveyed structural foundations'},
    {kind:'transit control',place:'distributed along the principal field, motion, address, or coupling axis'},
    {kind:'navigation and sensing',place:'on independent long baselines with protected reference clocks'},
    {kind:'termination and recovery',place:'at both ends of the operating sequence with independent recovery authority'},
    {kind:'whole-effect coverage structure',place:'around every ship, payload, aperture, throat, cage, or structural region included by the effect'},
    {kind:'control, thermal, and abort backbone',place:'through every component class using segregated power, timing, coolant, and shutdown routes'}
  ];
  function normalize(values){const total=values.reduce((s,v)=>s+Math.max(1e-12,v),0);return values.map(v=>Math.max(1e-12,v)/total);}
  function envSeverity(result){
    const r=result.routeEnvelope||{},e=result.energyBudget||{};
    const route={'deep-space':0,'planetary-well':.35,'gas-giant':.55,binary:.5,'compact-object':1.25,nebula:.42,uncharted:.58,'q-disturbed':1}[result.identity?.routeKey]||0;
    return clamp(1+(Number(r.gradientInterferenceIndex)||0)/160+(100-clamp(Number(r.certifiedWindowAvailabilityPercent)||100,0,100))/180+Math.log10(1+Math.max(0,Number(e.thermalDebtGWh)||0))/15+route,1,4.5);
  }
  function stageForm(name,level,axes){
    if(level.rank===0)return`Oversized fixed ${name.toLowerCase()} with individually fitted channels, sacrificial active surfaces, and large physical stand-off.`;
    if(level.rank===1)return`Segmented industrial ${name.toLowerCase()} with replaceable sectors; ${axes.join(', ')} become controlled production variables.`;
    if(level.rank===2)return`Redundant fixed operational ${name.toLowerCase()} with embedded diagnostics, recoverable faults, and scheduled service access.`;
    if(level.rank===3)return`Mass-limited mobile ${name.toLowerCase()} with shock isolation, independent abort paths, and live compensation for hull motion.`;
    if(level.rank===4)return`Fleet-standard ${name.toLowerCase()} with interoperable modules, serialized life records, and condition-based replacement.`;
    if(level.rank===5)return`Compact integrated ${name.toLowerCase()} combining structure, field, thermal, power, and sensing functions with active alignment.`;
    return`Adaptive self-diagnosing ${name.toLowerCase()} with graceful degradation, self-healing interfaces, predictive repair, and reversible energy handling.`;
  }
  function sourceComponents(result,profile){
    const m=result.mechanism||{};
    const chain=(m.machineChain||[]).slice(0,6);
    while(chain.length<6)chain.push({stage:`Auxiliary mechanism stage ${chain.length+1}`,function:'Support the base transit effect through a separately qualified energy, field, sensing, or recovery function.'});
    const coverage=m.coverage||{};
    const control=(m.controlVariables||[]);
    const mechanics=m.mechanicalConstraints||[];
    const effects=m.environment?.effects||[];
    const rows=chain.map((stage,i)=>({name:stage.stage,role:stage.function,kind:slots[i].kind,placement:slots[i].place}));
    rows.push({name:`${String(coverage.type||'controlled-volume').replaceAll('-',' ')} coverage structure`,role:`${coverage.method||'Enclose the complete protected region.'} ${coverage.hullIntegration||''}`.trim(),kind:slots[6].kind,placement:coverage.extent||slots[6].place});
    rows.push({name:`${m.doctrineLabel||'Drive'} control, metrology, thermal, and abort backbone`,role:`Synchronize every component, remove waste heat, enforce control tolerances, and terminate the device before a local fault propagates.`,kind:slots[7].kind,placement:slots[7].place});
    return rows.map((row,i)=>{
      const variable=control[i%Math.max(1,control.length)]||{name:'system coherence',role:'Hold all component states inside the certified operating envelope.',failure:'Loss of control propagates across the device train.'};
      const constraint=mechanics[i%Math.max(1,mechanics.length)]||'Cyclic field, thermal, structural, or dimensional loading accumulates damage.';
      const effect=effects[i%Math.max(1,effects.length)]||'Residual heat, wake, radiation, or field disturbance remains after operation.';
      const previous=i>0?i-1:null,next=i<7?i+1:null;
      const interfaces=[previous,next,6,7].filter(v=>v!==null&&v!==i);
      return{...row,index:i,interfaces:[...new Set(interfaces)],materials:profile.materials[i],controlVariable:clone(variable),constraint,effect};
    });
  }
  function buildComponents(result,profile,level,seed){
    const rng=rngFor(`${seed}:components`),rank=level.rank,t=rank/6,severity=envSeverity(result);
    const source=sourceComponents(result,profile);
    const massShares=normalize(profile.mass),powerShares=normalize(profile.power),volumeShares=normalize(profile.volume);
    const totalMass=Math.max(.001,Number(result.pathLevel?.facilityMassTonnes)||Number(result.power?.referenceMassTonnes)||1);
    const density=lerp(profile.density[0],profile.density[1],t),totalVolume=totalMass/density;
    const peak=Math.max(1,Number(result.energyBudget?.peakPowerW)||Number(result.power?.averagePowerW)||1);
    const missionHours=Math.max(1/3600,(Number(result.kinematics?.completeMissionSeconds)||Number(result.performance?.missionSeconds)||1)/3600);
    const records=source.map((src,i)=>{
      const count=Math.max(1,Math.round(logLerp(profile.c0[i],profile.c6[i],clamp(t+(rng()-.5)*.03,0,1))));
      const life=Math.max(1,logLerp(profile.l0[i],profile.l6[i],t)/severity);
      const inspect=Math.max(1,Math.floor(life*level.inspect)),overhaul=Math.max(1,Math.floor(life*level.overhaul));
      const mass=totalMass*massShares[i],power=peak*powerShares[i],volume=totalVolume*volumeShares[i];
      const axes=[src.controlVariable.name,'specific mass and volume','energy conversion and recovery','fault-isolation latency'];
      const service=`Inspect ${src.materials} for distortion, contamination, erosion, reference drift, seal damage, conductor fatigue, and loss of calibrated response; replace line-replaceable sectors, restore alignment and containment, then repeat the component acceptance test.`;
      return{
        key:`assembly-${i+1}`,index:i,name:src.name,subsystem:src.kind,role:src.role,placement:src.placement,materials:src.materials,
        interfaces:src.interfaces.map(v=>`assembly-${v+1}`),buildOrder:(i+1)*10,count,
        massTonnes:mass,massText:base.format.massText(mass*1000),massPercent:massShares[i]*100,unitMassText:base.format.massText(mass*1000/count),
        peakPowerW:power,peakPowerText:base.format.powerText(power),powerPercent:powerShares[i]*100,
        volumeM3:volume,volumeText:`${fmt(volume,2)} m³`,volumePercent:volumeShares[i]*100,
        currentForm:stageForm(src.name,level,axes),improvementAxes:axes,
        assemblyMethod:`Fabricate qualified subassemblies from ${src.materials}; mount them ${src.placement}; connect structural, power, field, thermal, timing, and data interfaces independently; perform low-energy continuity, alignment, containment, and abort tests before allowing the next dependent stage.`,
        alignmentRequirement:`Control ${src.controlVariable.name}: ${src.controlVariable.role} Failure consequence: ${src.controlVariable.failure}`,
        serviceAccess:`Preserve direct or remote access to every replaceable active surface, seal, switch, reference node, and isolation boundary associated with ${src.name}.`,
        failureConsequence:`${src.controlVariable.failure} ${src.effect}`,
        wear:[{name:`${src.name} cumulative degradation`,mechanism:`${src.constraint} ${src.effect}`,symptoms:`Growing correction demand, thermal imbalance, reference disagreement, longer spool or recovery, nuisance aborts, and loss of repeatability.`,consequence:`${src.controlVariable.failure} ${src.effect}`,nominalLifeCycles:life*severity,adjustedLifeCycles:life,adjustedLifeText:cycles(life),estimatedOperatingTimeText:hoursText(life*missionHours),inspectionIntervalCycles:inspect,inspectionIntervalText:cycles(inspect),overhaulIntervalCycles:overhaul,overhaulIntervalText:cycles(overhaul),wearPerTransitPercent:100/life,severityMultiplier:severity,serviceAction:service}]
      };
    });
    const ref=records[profile.ref]||records[0];
    for(const r of records)r.ratioToReference={referenceKey:ref.key,referenceName:ref.name,mass:r.massTonnes/ref.massTonnes,power:r.peakPowerW/ref.peakPowerW,volume:r.volumeM3/ref.volumeM3,text:`${fmt(r.massTonnes/ref.massTonnes)} mass : ${fmt(r.peakPowerW/ref.peakPowerW)} peak power : ${fmt(r.volumeM3/ref.volumeM3)} volume`};
    return{records,totalMass,totalVolume,density,peak,severity,ref};
  }
  function sequence(records,level){
    const map=Object.fromEntries(records.map(r=>[r.key,r]));
    return records.map((r,i)=>({step:i+1,componentKey:r.key,component:r.name,subsystem:r.subsystem,
      prerequisites:r.interfaces.map(k=>map[k]).filter(o=>o&&o.buildOrder<r.buildOrder).map(o=>o.name),
      downstreamInterfaces:r.interfaces.map(k=>map[k]).filter(o=>o&&o.buildOrder>=r.buildOrder).map(o=>o.name),
      procedure:r.assemblyMethod,alignmentHoldPoint:r.alignmentRequirement,
      qualityHoldPoint:`${level.metrology} Record the accepted structural, utility, field, timing, thermal, and containment baseline before dependent installation proceeds.`,
      accessRequirement:r.serviceAccess}));
  }
  function interfaceLedger(records,m){
    const map=Object.fromEntries(records.map(r=>[r.key,r])),seen=new Set(),edges=[];
    for(const r of records)for(const k of r.interfaces){const o=map[k];if(!o)continue;const id=[r.key,o.key].sort().join(':');if(seen.has(id))continue;seen.add(id);edges.push({key:id,a:r.name,b:o.name,massRatio:r.massTonnes/o.massTonnes,powerRatio:r.peakPowerW/o.peakPowerW,interfaceRequirement:`${r.alignmentRequirement} Isolate faults so loss of ${r.name} cannot automatically disable ${o.name}.`});}
    return{edgeCount:edges.length,edges,criticalRules:[
      `The complete machine must preserve the base action: ${m.poweredAction||m.principle||'the certified transit effect'}`,
      `Whole-effect coverage must remain valid: ${m.coverage?.inclusionRule||'all intended matter must remain inside the controlled region'}.`,
      `Scaling constraint: ${m.coverage?.scalingConstraint||'larger protected volume increases field, structural, sensing, and control burden'}.`,
      ...(m.mechanicalConstraints||[]).slice(0,4)
    ]};
  }
  function progression(profile,m){
    const pathLevels=base.pathLevels||[];
    return D.levels.map(level=>{
      const range=pathLevels[level.rank]?.facilityMassTonnes||[1e8/10**level.rank,1e9/10**level.rank];
      const mass=Math.sqrt(range[0]*range[1]),labor=mass*level.labor,workforce=clamp(Math.round(250*mass**.23*(.5+level.parallel)),50,2e7);
      const critical=labor/Math.max(1,workforce*(.45+level.parallel*.45));
      const lives=profile.l0.map((v,i)=>logLerp(v,profile.l6[i],level.rank/6));
      const mean=Math.exp(lives.reduce((s,v)=>s+Math.log(Math.max(1,v)),0)/lives.length);
      const action=m.poweredAction||m.principle||'the base transit effect';
      const strategy=[
        `Construct a fixed monumental machine around one rigid payload geometry. Gross containment, physical distance, and sacrificial hardware compensate for poor control.`,
        `Divide the same mechanism into repeatable industrial sectors with replaceable active surfaces, indexed interfaces, and instrumented service galleries.`,
        `Use factory-qualified redundant modules and closed-loop calibration to support scheduled fixed-site operation.`,
        `Repackage the same component train into mass-limited mobile compartments and compensate hull motion, changing mass, vibration, and battle damage.`,
        `Standardize fleet modules, automatic acceptance tests, predictive maintenance, and independent fault isolation.`,
        `Combine structural, field, thermal, power, and sensing functions into compact active modules with rapid in-service replacement.`,
        `Grow adaptive self-diagnosing structures in final geometry, recover reversible energy, and retune continuously around wear and damage.`
      ][level.rank];
      return{key:level.key,rank:level.rank,label:level.label,strategy:`${strategy} The unchanged action remains: ${action}`,acceptanceTest:`Demonstrate the complete operating cycle, then inject a fault into one component class and prove safe isolation, controlled termination, and repeatable recertification.`,fabrication:level.fabrication,joining:level.joining,metrology:level.metrology,commissioning:level.commissioning,automationPercent:level.automation,modularityPercent:level.modularity,ndtCoveragePercent:level.ndt,toleranceFactor:level.tolerance,energyRecoveryPercent:level.recovery,spareMassPercent:level.spares,assemblyLossPercent:level.loss,representativeMassText:base.format.massText(mass*1000),laborHoursText:`${fmt(labor,0)} labor-hours`,representativeWorkforce:workforce,criticalPathText:hoursText(critical),componentLifeText:cycles(mean),improvement:`Refines compactness, tolerance, energy recovery, serviceability, fault isolation, and component life without changing what the powered device physically does.`};
    });
  }
  function maintenance(records,level,severity){
    const rows=records.flatMap(r=>r.wear.map(w=>({component:r.name,mode:w.name,mechanism:w.mechanism,symptoms:w.symptoms,consequence:w.consequence,wearPerTransitPercent:w.wearPerTransitPercent,adjustedLifeCycles:w.adjustedLifeCycles,adjustedLifeText:w.adjustedLifeText,operatingTimeText:w.estimatedOperatingTimeText,inspectionIntervalCycles:w.inspectionIntervalCycles,inspectionIntervalText:w.inspectionIntervalText,overhaulIntervalCycles:w.overhaulIntervalCycles,overhaulIntervalText:w.overhaulIntervalText,serviceAction:w.serviceAction,access:r.serviceAccess}))).sort((a,b)=>b.wearPerTransitPercent-a.wearPerTransitPercent);
    const inspection=Math.max(1,Math.min(...rows.map(r=>r.inspectionIntervalCycles))),overhaul=Math.max(1,Math.min(...rows.map(r=>r.overhaulIntervalCycles)));
    return{environmentSeverityMultiplier:severity,environmentSeverityText:`${fmt(severity)}× nominal wear`,shortestLifeComponent:rows[0]?.component,shortestLifeMode:rows[0]?.mode,shortestLifeText:rows[0]?.adjustedLifeText,
      periodicInspection:`Complete the shortest coordinated inspection every ${cycles(inspection)} and after any abort, overload, boundary contact, or uncommanded environmental exposure.`,
      overhaul:`Open the complete device train for coordinated overhaul no later than every ${cycles(overhaul)}; individual components may require earlier service.`,
      stageMaintenancePhilosophy:level.rank<2?'Inspect after nearly every activation and replace suspect hardware rather than trusting trend data.':level.rank<4?'Combine scheduled teardown with embedded condition monitoring and qualified exchange modules.':level.rank<6?'Use predictive life models, line-replaceable units, and automatic calibration after service.':'Continuously measure damage, isolate failing cells, and schedule repair before certification margin is consumed.',rows};
  }
  function build(result,profile,seed){
    const rank=clamp(Number(result.pathLevel?.rank)||0,0,6),level=D.levels[rank],m=result.mechanism||{};
    const data=buildComponents(result,profile,level,seed),records=data.records,interfaces=interfaceLedger(records,m),maint=maintenance(records,level,data.severity);
    const labor=data.totalMass*level.labor,workforce=clamp(Math.round(250*data.totalMass**.23*(.5+level.parallel)),50,2e7),critical=labor/Math.max(1,workforce*(.45+level.parallel*.45));
    const spare=data.totalMass*level.spares/100,loss=data.totalMass*level.loss/100;
    return{version:1,doctrineLabel:`${m.doctrineLabel||result.identity.family} Construction Assembly Doctrine`,pathLevelKey:level.key,pathLevelRank:rank,pathLevelLabel:level.label,
      assemblyPrinciple:`Build the support structure and protected geometry first, install the six mechanism stages in causal order, close the whole-effect coverage system, then connect an independently isolatable control, thermal, metrology, and abort backbone. ${m.functionalStatement||m.principle||''}`,
      ratioRule:`Mass, peak-power, and installed-volume shares are normalized independently. The reference component is ${data.ref.name}; every component reports its ratio to that reference rather than implying that one percentage ledger can substitute for another.`,
      referenceComponentKey:data.ref.key,referenceComponent:data.ref.name,totalApparatusMassTonnes:data.totalMass,totalApparatusMassText:base.format.massText(data.totalMass*1000),modeledInstalledVolumeM3:data.totalVolume,modeledInstalledVolumeText:`${fmt(data.totalVolume,2)} m³`,installedDensityTonnesM3:data.density,peakPowerW:data.peak,peakPowerText:base.format.powerText(data.peak),componentCount:records.reduce((s,r)=>s+r.count,0),componentClassCount:records.length,interfaceCount:interfaces.edgeCount,
      qualityPlan:{fabrication:level.fabrication,joining:level.joining,metrology:level.metrology,commissioning:level.commissioning,automationPercent:level.automation,modularityPercent:level.modularity,nondestructiveTestCoveragePercent:level.ndt,toleranceFactorRelativeToPath0:level.tolerance,energyRecoveryPercent:level.recovery,spareMassPercent:level.spares,assemblyLossPercent:level.loss},
      productionEstimate:{laborHours:labor,laborHoursText:`${fmt(labor,0)} labor-hours`,representativeWorkforce:workforce,criticalPathHours:critical,criticalPathText:hoursText(critical),fabricationAndReworkLossTonnes:loss,fabricationAndReworkLossText:base.format.massText(loss*1000),recommendedSpareMassTonnes:spare,recommendedSpareMassText:base.format.massText(spare*1000)},
      components:records,assemblySequence:sequence(records,level),interfaces,maintenance:maint,stageProgression:progression(profile,m),
      currentStageStrategy:progression(profile,m)[rank].strategy,currentAcceptanceTest:progression(profile,m)[rank].acceptanceTest,
      constructionWarnings:[...interfaces.criticalRules,`Current route and mission apply a ${fmt(data.severity)}× environmental wear multiplier.`,`The spare allocation of ${base.format.massText(spare*1000)} must include shortest-life active surfaces, seals, switches, reference nodes, sensors, and containment sectors.`]};
  }
  function generate(seed,input={},source=null){
    const result=base.generate(seed,input,source),profile=D.profiles[result.identity?.familyKey];if(!profile)return result;
    result.version=6;result.constructionAssembly=build(result,profile,`${seed}:construction:v1`);
    const a=result.constructionAssembly;
    result.summary+=` Construction uses ${a.componentClassCount} major component classes, ${a.interfaceCount} qualified subsystem boundaries, ${a.totalApparatusMassText}, and approximately ${a.productionEstimate.laborHoursText} before commissioning.`;
    result.sourceImpact.push(`The construction model added component ratios, assembly order, interface qualification, wear life, maintenance intervals, and Path 0–6 production development.`);
    return result;
  }
  globalThis.BlacklightExoFTL=Object.freeze({...base,version:6,constructionAssemblyVersion:1,assemblyDefinitions:D,generate});
})();
