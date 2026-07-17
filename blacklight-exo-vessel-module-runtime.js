(() => {
  'use strict';
  const base=globalThis.BlacklightExoVessel;
  const D=globalThis.BlacklightExoVesselModuleDefinitions;
  if(!base||!D||!base.contractVersion||!base.engineeringLedgerVersion||base.moduleGraphVersion)return;

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const clone=value=>value==null?value:structuredClone(value);
  const sum=(rows,field='massTonnes')=>rows.reduce((total,row)=>total+finite(row[field]),0);
  const dom=id=>globalThis.document?.getElementById?.(id)?.value||null;
  function hash(value){let state=2166136261;for(const char of String(value)){state^=char.charCodeAt(0);state=Math.imul(state,16777619);}return state>>>0;}
  const unit=value=>hash(value)/4294967295;
  const slug=(value,fallback='node')=>(String(value||fallback).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,58)||fallback);
  const stableId=(prefix,...parts)=>`${prefix}-${slug(parts.join('-'))}-${hash(parts.join(':')).toString(16).padStart(8,'0')}`;
  const unique=values=>[...new Set(values.filter(Boolean))];

  function splitExact(total,count){
    const value=Math.max(0,finite(total)),size=Math.max(1,Math.round(finite(count,1))),output=[];
    let assigned=0;
    for(let index=0;index<size;index+=1){
      const part=index===size-1?value-assigned:value/size;
      output.push(part);assigned+=part;
    }
    return output;
  }
  function technologyFor(result,key){
    const record=result.contract?.technology?.subsystemVariants?.find(item=>item.subsystemKey===key);
    return record?{principalBand:record.principalBand,variant:record.variant,offset:record.offset,heritageBand:record.heritageBand}:{principalBand:`P${result.drive?.pathLevelRank||0}`,variant:'STANDARD',offset:0,heritageBand:`P${result.drive?.pathLevelRank||0}`};
  }
  function chooseTopology(seed,result){
    const weights=result.manufacturer?.topologyWeights||{MONOCOQUE:.2,SPINE:.2,CLUSTER:.2,RING:.2,HYBRID:.2};
    let roll=unit(`${seed}:module-topology`),selected='HYBRID';
    for(const key of ['MONOCOQUE','SPINE','CLUSTER','RING','HYBRID']){roll-=finite(weights[key]);if(roll<=0){selected=key;break;}}
    return{key:selected,weights:clone(weights),source:`${result.manufacturer?.name||'provisional manufacturer'} topology distribution`,architecture:result.designPhilosophy?.classification||'HYBRID'};
  }
  function infrastructure(vesselId){
    return D.infrastructure.map(item=>({...clone(item),nodeId:stableId('node',vesselId,item.key),massTonnes:0,volumeM3:0,state:'ACTIVE'}));
  }
  function infraMap(nodes){return Object.fromEntries(nodes.map(node=>[node.key,node]));}
  function rowSplitCount(row,result){
    if(row.key==='power')return result.identity?.defenseKey==='naval'?3:result.identity?.defenseKey==='hardened'?2:1;
    if(row.key==='life-support')return clamp(Math.round(finite(result.lifeSupport?.zones,1)),1,4);
    if(row.key==='sensors')return 2;
    if(row.key==='navigation')return Math.max(1,Math.min(2,Math.round(finite(result.sensors?.navigationChannels,2)/2)));
    if(row.key==='conventional-engine')return result.identity?.roleKey==='warship'?4:2;
    return 1;
  }
  function genericSpecs(row,result){
    const count=rowSplitCount(row,result),masses=splitExact(row.massTonnes,count),volumes=splitExact(row.volumeM3,count);
    return masses.map((massTonnes,index)=>({rowKey:row.key,label:count===1?row.label:`${row.label} ${index+1}`,suffix:`${row.key}-${index+1}`,massTonnes,volumeM3:volumes[index],splitIndex:index,splitCount:count,extensions:index===0&&row.key==='sensors'?{baselineEndpoint:'FORE'}:row.key==='sensors'?{baselineEndpoint:'AFT'}:{}}));
  }
  function armorSpecs(row,result){
    const layers=result.armor?.layers||[];
    if(!layers.length)return genericSpecs(row,result);
    return layers.map((layer,index)=>({rowKey:row.key,label:layer.label,suffix:`armor-${layer.key}-${index+1}`,massTonnes:layer.massTonnes,volumeM3:row.massTonnes>0?row.volumeM3*layer.massTonnes/row.massTonnes:0,splitIndex:index,splitCount:layers.length,semanticType:'ARMOR',extensions:{armorLayerKey:layer.key,coverageFraction:layer.coverageFraction,physicalArealDensityKgM2:layer.physicalArealDensityKgM2,effectiveArealDensityKgM2:layer.effectiveArealDensityKgM2}}));
  }
  function weaponSpecs(row,result){
    const field={ 'weapon-mounts':'mountMassTonnes','weapon-support':'supportMassTonnes','weapon-magazines':'magazineMassTonnes','weapon-cooling':'coolingMassTonnes'}[row.key];
    const installations=result.weapons?.installations||[];
    if(!field||!installations.length)return genericSpecs(row,result);
    return installations.map((installation,index)=>{
      const massTonnes=finite(installation[field]),volumeM3=row.massTonnes>0?row.volumeM3*massTonnes/row.massTonnes:0;
      return{rowKey:row.key,label:`${installation.label} ${D.moduleTypes[row.key]?.semanticType?.replaceAll('_',' ').toLowerCase()||row.label}`,suffix:`${row.key}-${slug(installation.weaponFamily)}-${index+1}`,massTonnes,volumeM3,splitIndex:index,splitCount:installations.length,extensions:{weaponFamily:installation.weaponFamily,installationLabel:installation.label,roundCount:installation.roundCount,peakPowerW:installation.peakPowerW,continuousPowerW:installation.continuousPowerW,wasteHeatW:installation.wasteHeatW}};
    });
  }
  function countermeasureSpecs(row,result){
    const inventory=result.countermeasures?.inventory||[];
    if(!inventory.length)return genericSpecs(row,result);
    return inventory.map((item,index)=>({rowKey:row.key,label:item.label,suffix:`countermeasure-${slug(item.countermeasureType)}-${index+1}`,massTonnes:item.allocationMassTonnes,volumeM3:row.massTonnes>0?row.volumeM3*item.allocationMassTonnes/row.massTonnes:0,splitIndex:index,splitCount:inventory.length,semanticType:'COUNTERMEASURE',extensions:{countermeasureType:item.countermeasureType,unitCount:item.unitCount,functions:clone(item.functions),peakPowerW:item.peakPowerW}}));
  }
  function expandRow(row,result){
    if(row.key==='armor')return armorSpecs(row,result);
    if(['weapon-mounts','weapon-support','weapon-magazines','weapon-cooling'].includes(row.key))return weaponSpecs(row,result);
    if(row.key==='countermeasures')return countermeasureSpecs(row,result);
    return genericSpecs(row,result);
  }
  function zoneKeyFor(spec,type,envelope){
    if(envelope==='EVA')return null;
    if(type.semanticType==='MAGAZINE')return `MAGAZINE-${slug(spec.extensions?.weaponFamily||spec.suffix)}`;
    return type.zone||'MACHINERY';
  }
  function moduleFromSpec(seed,result,spec,nodes){
    const type={...(D.moduleTypes[spec.rowKey]||D.moduleTypes.margin),semanticType:spec.semanticType||D.moduleTypes[spec.rowKey]?.semanticType||'MACHINERY'};
    const sourceRow=result.hull.massBudget.find(row=>row.key===spec.rowKey)||{};
    const envelope=sourceRow.envelope||((result.designPhilosophy?.classification==='EVA'||(result.designPhilosophy?.classification==='HYBRID'&&unit(`${seed}:module-envelope:${spec.suffix}`)<.45))?'EVA':'INTERNAL');
    const parent=envelope==='INTERNAL'?nodes['pressure-vault']:nodes['vacuum-truss'];
    const requiredProperty=envelope==='INTERNAL'?'ATMOSPHERE_MANIFOLD':'VACUUM_EXPOSED';
    const zoneKey=zoneKeyFor(spec,type,envelope);
    const pressureZoneId=zoneKey?stableId('zone',result.contract.identifiers.vesselInstanceId,zoneKey):null;
    const requirements={power:Boolean(type.requires?.power),cooling:Boolean(type.requires?.cooling),data:Boolean(type.requires?.data),atmosphere:Boolean(type.requires?.atmosphere&&envelope==='INTERNAL'),access:type.requires?.access!==false,crewDependent:Boolean(type.crewDependent)};
    const dependencies={
      structural:[parent.nodeId],
      power:requirements.power?[nodes['power-root'].nodeId]:[],
      cooling:requirements.cooling?[nodes['cooling-root'].nodeId]:[],
      data:requirements.data?[nodes['data-root'].nodeId]:[],
      atmosphere:requirements.atmosphere?[nodes['atmosphere-root'].nodeId]:[],
      access:requirements.access?[nodes['access-root'].nodeId]:[],
      magazine:[],
      sensors:[]
    };
    return{
      recordType:'exoVesselModule',schemaVersion:'1.0.0',
      moduleId:stableId('module',result.contract.identifiers.vesselInstanceId,spec.suffix),
      vesselInstanceId:result.contract.identifiers.vesselInstanceId,
      subsystemKey:spec.rowKey,label:spec.label,semanticType:type.semanticType,envelope,
      pressureZoneId,criticality:type.criticality||'MISSION',serviceMode:envelope==='INTERNAL'?'INTERNAL_CORRIDOR':'EVA_OR_REMOTE',
      massTonnes:Math.max(0,finite(spec.massTonnes)),volumeM3:Math.max(0,finite(spec.volumeM3)),
      technology:technologyFor(result,spec.rowKey),
      attachment:{parentId:parent.nodeId,requiredProperty,parentProperties:clone(parent.properties),valid:parent.properties.includes(requiredProperty)},
      requirements,dependencies,hazards:unique([...(type.hazards||[]),...(spec.extensions?.functions||[])]),functions:unique([type.semanticType,...(spec.extensions?.functions||[])]),
      state:{constructionPercent:100,damagePercent:0,salvageRemovalPercent:0,operational:true,applicationStatus:'INTACT_REFERENCE'},
      voxelBounds:null,
      provenance:{sourceEngineeringKey:spec.rowKey,sourceEngineeringLabel:sourceRow.label||spec.label,splitIndex:spec.splitIndex||0,splitCount:spec.splitCount||1,generatorId:'blacklight-exo-vessel-module-graph-generator',generatorVersion:'1.0.0'},
      extensions:clone(spec.extensions||{})
    };
  }
  function makeEdge(vesselId,graphName,from,to,edgeType,properties=[]){
    return{edgeId:stableId('edge',vesselId,graphName,from,to,edgeType),from,to,edgeType,properties:unique(properties),state:'ACTIVE'};
  }
  function createGraphs(vesselId,nodes,modules){
    const graphs=Object.fromEntries(D.utilityGraphs.map(name=>[name,{graphType:name,nodes:[],edges:[]}])) ;
    const nodeIds=[...nodes.map(node=>node.nodeId),...modules.map(module=>module.moduleId)];
    for(const graph of Object.values(graphs))graph.nodes=[...nodeIds];
    const map=infraMap(nodes);
    graphs.structural.edges.push(
      makeEdge(vesselId,'structural',map['structural-root'].nodeId,map['thrust-keel'].nodeId,'LOAD_PATH'),
      makeEdge(vesselId,'structural',map['structural-root'].nodeId,map['pressure-vault'].nodeId,'STRUCTURAL_BRANCH'),
      makeEdge(vesselId,'structural',map['structural-root'].nodeId,map['vacuum-truss'].nodeId,'STRUCTURAL_BRANCH')
    );
    for(const module of modules){
      graphs.structural.edges.push(makeEdge(vesselId,'structural',module.attachment.parentId,module.moduleId,'MODULE_ATTACHMENT',[module.attachment.requiredProperty]));
      if(module.requirements.power)graphs.power.edges.push(makeEdge(vesselId,'power',map['power-root'].nodeId,module.moduleId,'POWER_FEED',['ISOLATABLE']));
      if(module.semanticType==='REACTOR')graphs.power.edges.push(makeEdge(vesselId,'power',module.moduleId,map['power-root'].nodeId,'POWER_SOURCE',['GENERATION']));
      if(module.requirements.cooling)graphs.cooling.edges.push(makeEdge(vesselId,'cooling',map['cooling-root'].nodeId,module.moduleId,'COOLANT_FEED',['RETURN_LOOP']));
      if(module.semanticType==='THERMAL_CONTROL')graphs.cooling.edges.push(makeEdge(vesselId,'cooling',module.moduleId,map['cooling-root'].nodeId,'HEAT_REJECTION_SOURCE',['HEAT_TRANSPORT']));
      if(module.requirements.data)graphs.data.edges.push(makeEdge(vesselId,'data',map['data-root'].nodeId,module.moduleId,'DATA_AND_CONTROL',['AUTHENTICATED']));
      if(module.requirements.atmosphere)graphs.atmosphere.edges.push(makeEdge(vesselId,'atmosphere',map['atmosphere-root'].nodeId,module.moduleId,'ATMOSPHERE_FEED',['ISOLATABLE']));
      if(module.semanticType==='LIFE_SUPPORT')graphs.atmosphere.edges.push(makeEdge(vesselId,'atmosphere',module.moduleId,map['atmosphere-root'].nodeId,'ENVIRONMENTAL_SOURCE',['RECOVERY_LOOP']));
      if(module.requirements.access)graphs.access.edges.push(makeEdge(vesselId,'access',map['access-root'].nodeId,module.moduleId,module.envelope==='INTERNAL'?'INTERNAL_ACCESS':'EVA_SERVICE',[module.serviceMode]));
    }
    return graphs;
  }
  function pressureZones(vesselId,modules){
    const groups=new Map();
    for(const module of modules){
      if(!module.pressureZoneId)continue;
      const raw=module.semanticType==='MAGAZINE'?`MAGAZINE-${slug(module.extensions.weaponFamily||module.moduleId)}`:(D.moduleTypes[module.subsystemKey]?.zone||'MACHINERY');
      if(!groups.has(module.pressureZoneId)){
        const template=raw.startsWith('MAGAZINE-')?{label:`Isolated ${module.extensions.weaponFamily||'weapon'} magazine zone`,inhabited:false,isolated:true,environment:'MAGAZINE_ISOLATION'}:(D.pressureZoneTemplates[raw]||D.pressureZoneTemplates.MACHINERY);
        groups.set(module.pressureZoneId,{zoneId:module.pressureZoneId,key:raw,label:template.label,inhabited:template.inhabited,isolated:template.isolated,environment:template.environment,moduleIds:[],evacuationTargets:[],state:'ACTIVE'});
      }
      groups.get(module.pressureZoneId).moduleIds.push(module.moduleId);
    }
    const zones=[...groups.values()];
    const habitat=zones.find(zone=>zone.key==='HABITAT')||zones.find(zone=>zone.inhabited);
    for(const zone of zones)if(zone.inhabited&&habitat&&zone.zoneId!==habitat.zoneId)zone.evacuationTargets=[habitat.zoneId];
    return zones;
  }
  function pressureZoneGraph(vesselId,zones){
    const edges=[],hub=zones.find(zone=>zone.key==='HABITAT')||zones.find(zone=>zone.inhabited)||zones[0];
    if(hub)for(const zone of zones){
      if(zone.zoneId===hub.zoneId)continue;
      edges.push(makeEdge(vesselId,'pressure-zones',hub.zoneId,zone.zoneId,zone.key.startsWith('MAGAZINE-')?'MAGAZINE_TRANSFER_LOCK':'ISOLATION_LOCK',[zone.isolated?'ISOLATABLE':'OPEN']));
    }
    return{graphType:'pressureZones',nodes:zones.map(zone=>zone.zoneId),edges};
  }
  function buildLoadPaths(vesselId,nodes,modules){
    const map=infraMap(nodes),paths=[];
    for(const module of modules){
      let purpose=null,through=[module.moduleId,module.attachment.parentId,map['structural-root'].nodeId];
      if(module.semanticType==='MAIN_ENGINE'){purpose='CONVENTIONAL_THRUST';through=[module.moduleId,map['thrust-keel'].nodeId,map['structural-root'].nodeId];}
      else if(module.semanticType==='DRIVE_APPARATUS'||module.semanticType==='DRIVE_INTEGRATION')purpose='FTL_FOUNDATION';
      else if(module.semanticType==='WEAPON'){purpose='WEAPON_RECOIL_OR_LAUNCH';through=[module.moduleId,map['thrust-keel'].nodeId,map['structural-root'].nodeId];}
      else if(module.semanticType==='STRUCTURE')purpose='PRIMARY_STRUCTURE';
      if(purpose)paths.push({loadPathId:stableId('loadpath',vesselId,module.moduleId,purpose),fromNodeId:module.moduleId,toNodeId:map['structural-root'].nodeId,throughNodeIds:through,purpose,continuous:true,valid:true});
    }
    return paths;
  }
  function weaponIntegration(seed,result,graphs,modules,loadPaths){
    const sensors=modules.filter(module=>module.semanticType==='SENSOR').map(module=>module.moduleId);
    const fireControl=modules.filter(module=>module.semanticType==='FIRE_CONTROL').map(module=>module.moduleId);
    const mounts=modules.filter(module=>module.semanticType==='WEAPON'),hardpoints=[],requirements=[];
    for(const [index,mount]of mounts.entries()){
      const family=mount.extensions.weaponFamily||'UNSPECIFIED',magazines=modules.filter(module=>module.semanticType==='MAGAZINE'&&module.extensions.weaponFamily===family).map(module=>module.moduleId);
      const support=modules.filter(module=>module.semanticType==='WEAPON_SUPPORT'&&module.extensions.weaponFamily===family).map(module=>module.moduleId);
      const cooling=modules.filter(module=>module.semanticType==='WEAPON_COOLING'&&module.extensions.weaponFamily===family).map(module=>module.moduleId);
      mount.dependencies.magazine=[...magazines];mount.dependencies.sensors=unique([...sensors,...fireControl]);
      for(const magazine of magazines)graphs.magazineFeed.edges.push(makeEdge(result.contract.identifiers.vesselInstanceId,'magazine-feed',magazine,mount.moduleId,'AMMUNITION_OR_EMITTER_FEED',['ISOLATED_TRANSFER']));
      for(const sensor of sensors)graphs.sensorDependency.edges.push(makeEdge(result.contract.identifiers.vesselInstanceId,'sensor-dependency',sensor,mount.moduleId,'TARGET_TRACK',['LINE_OF_SIGHT_REQUIRED']));
      for(const fc of fireControl)graphs.sensorDependency.edges.push(makeEdge(result.contract.identifiers.vesselInstanceId,'sensor-dependency',fc,mount.moduleId,'FIRE_CONTROL_SOLUTION',['AUTHORIZED_CONTROL']));
      const facing=D.weaponFacings[hash(`${seed}:hardpoint-facing:${family}:${index}`)%D.weaponFacings.length],horizontalArcDeg=result.manufacturer?.topologyWeights?.MONOCOQUE>.4?100:result.manufacturer?.topologyWeights?.CLUSTER>.25?180:140,verticalArcDeg=facing==='DORSAL'||facing==='VENTRAL'?160:90;
      const loadPath=loadPaths.find(path=>path.fromNodeId===mount.moduleId);
      hardpoints.push({hardpointId:stableId('hardpoint',result.contract.identifiers.vesselInstanceId,mount.moduleId),moduleId:mount.moduleId,weaponFamily:family,facing,arc:{azimuthCenterDeg:(index*137)%360,elevationCenterDeg:facing==='DORSAL'?90:facing==='VENTRAL'?-90:0,horizontalArcDeg,verticalArcDeg,occlusionPolicy:'MUST_NOT_INTERSECT_OWN_STRUCTURE'},recoilPathId:loadPath?.loadPathId||null,magazineModuleIds:magazines,supportModuleIds:support,coolingModuleIds:cooling,sensorModuleIds:sensors,fireControlModuleIds:fireControl,valid:true});
      requirements.push({requirementId:stableId('sensorreq',result.contract.identifiers.vesselInstanceId,mount.moduleId),consumerModuleId:mount.moduleId,weaponFamily:family,requiredSensorTypes:['TRACK','RANGE','BEARING','TARGET_CLASSIFICATION'],minimumSensorChannels:1,minimumFireControlChannels:1,sourceModuleIds:sensors,fireControlModuleIds:fireControl,valid:true});
    }
    return{weaponHardpoints:hardpoints,sensorRequirements:requirements};
  }
  function applyFaults(graph,faults){
    for(const fault of faults||[]){
      const key=String(fault).toUpperCase();
      if(key==='INVALID_FIRST_ATTACHMENT'&&graph.modules[0]){graph.modules[0].attachment.parentId='node-intentionally-missing';graph.modules[0].attachment.valid=false;}
      else if(key==='REMOVE_FIRST_POWER_EDGE')graph.graphs.power.edges.shift();
      else if(key==='REMOVE_FIRST_COOLING_EDGE')graph.graphs.cooling.edges.shift();
      else if(key==='REMOVE_FIRST_DATA_EDGE')graph.graphs.data.edges.shift();
      else if(key==='REMOVE_FIRST_ACCESS_EDGE')graph.graphs.access.edges.shift();
      else if(key==='REMOVE_FIRST_MAGAZINE_LINK')graph.graphs.magazineFeed.edges.shift();
      else if(key==='BREAK_FIRST_LOAD_PATH'&&graph.loadPaths[0]){graph.loadPaths[0].throughNodeIds[1]='node-intentionally-missing';graph.loadPaths[0].continuous=false;graph.loadPaths[0].valid=false;}
    }
  }
  function validateGraph(result,graph){
    const violations=[],warnings=[],moduleIds=new Set(),nodeMap=new Map(graph.infrastructureNodes.map(node=>[node.nodeId,node]));
    for(const module of graph.modules){
      if(moduleIds.has(module.moduleId))violations.push(`Duplicate module ID ${module.moduleId}.`);moduleIds.add(module.moduleId);nodeMap.set(module.moduleId,module);
    }
    const mass=sum(graph.modules),volume=sum(graph.modules,'volumeM3');
    if(Math.abs(mass-result.hull.totalMassTonnes)>Math.max(1,mass)*1e-9)violations.push('Module inventory mass does not close against the loaded vessel.');
    if(Math.abs(volume-result.hull.totalVolumeM3)>Math.max(1,volume)*1e-9)violations.push('Module inventory volume does not close against the loaded vessel.');
    const edgeExists=(name,from,to)=>graph.graphs[name]?.edges?.some(edge=>edge.from===from&&edge.to===to);
    for(const module of graph.modules){
      const parent=nodeMap.get(module.attachment.parentId);
      if(!parent||!parent.properties?.includes(module.attachment.requiredProperty))violations.push(`${module.moduleId} has an invalid ${module.envelope} attachment parent.`);
      if(!edgeExists('structural',module.attachment.parentId,module.moduleId))violations.push(`${module.moduleId} is absent from the structural graph.`);
      for(const [name,required]of Object.entries({power:module.requirements.power,cooling:module.requirements.cooling,data:module.requirements.data,atmosphere:module.requirements.atmosphere,access:module.requirements.access}))if(required&&!graph.graphs[name].edges.some(edge=>edge.to===module.moduleId))violations.push(`${module.moduleId} lacks required ${name} connectivity.`);
      if(module.envelope==='INTERNAL'&&!module.pressureZoneId)violations.push(`${module.moduleId} is internal but lacks a pressure or buffer zone.`);
      if(module.envelope==='EVA'&&module.pressureZoneId)violations.push(`${module.moduleId} is EVA-mounted but assigned to a pressure zone.`);
      if(module.semanticType==='MAGAZINE'&&module.pressureZoneId){
        const zone=graph.pressureZones.find(item=>item.zoneId===module.pressureZoneId);
        if(!zone||zone.inhabited||!zone.isolated)violations.push(`${module.moduleId} magazine is not isolated from inhabited pressure zones.`);
      }
    }
    for(const [name,network]of Object.entries(graph.graphs))for(const edge of network.edges)if(!nodeMap.has(edge.from)||!nodeMap.has(edge.to))violations.push(`${name} edge ${edge.edgeId} references a missing node.`);
    const zoneIds=new Set(graph.pressureZones.map(zone=>zone.zoneId));
    for(const zone of graph.pressureZones){
      for(const moduleId of zone.moduleIds)if(!moduleIds.has(moduleId))violations.push(`${zone.zoneId} contains missing module ${moduleId}.`);
      if(zone.inhabited&&zone.zoneId!==(graph.pressureZones.find(item=>item.key==='HABITAT')?.zoneId||zone.zoneId)&&!zone.evacuationTargets.some(target=>zoneIds.has(target)))violations.push(`${zone.zoneId} lacks a valid evacuation target.`);
    }
    for(const edge of graph.pressureZoneGraph.edges)if(!zoneIds.has(edge.from)||!zoneIds.has(edge.to))violations.push(`Pressure-zone edge ${edge.edgeId} references a missing zone.`);
    for(const path of graph.loadPaths){
      if(path.throughNodeIds.some(nodeId=>!nodeMap.has(nodeId))||path.throughNodeIds[0]!==path.fromNodeId||path.throughNodeIds.at(-1)!==path.toNodeId||!path.continuous)violations.push(`${path.loadPathId} is not a continuous structural load path.`);
    }
    for(const hardpoint of graph.weaponHardpoints){
      if(!moduleIds.has(hardpoint.moduleId))violations.push(`${hardpoint.hardpointId} lacks a weapon module.`);
      if(!hardpoint.recoilPathId||!graph.loadPaths.some(path=>path.loadPathId===hardpoint.recoilPathId&&path.valid))violations.push(`${hardpoint.hardpointId} lacks a valid recoil or launch load path.`);
      if(!hardpoint.sensorModuleIds.length||!hardpoint.fireControlModuleIds.length)violations.push(`${hardpoint.hardpointId} lacks sensor or fire-control dependencies.`);
      const familyMagazines=graph.modules.filter(module=>module.semanticType==='MAGAZINE'&&module.extensions.weaponFamily===hardpoint.weaponFamily);
      if(familyMagazines.length&&!hardpoint.magazineModuleIds.every(id=>moduleIds.has(id)))violations.push(`${hardpoint.hardpointId} references a missing magazine.`);
      if(familyMagazines.length&&!graph.graphs.magazineFeed.edges.some(edge=>hardpoint.magazineModuleIds.includes(edge.from)&&edge.to===hardpoint.moduleId))violations.push(`${hardpoint.hardpointId} lacks a magazine-feed edge.`);
    }
    for(const requirement of graph.sensorRequirements)if(!requirement.sourceModuleIds.length||!requirement.fireControlModuleIds.length||!requirement.sourceModuleIds.every(id=>moduleIds.has(id))||!requirement.fireControlModuleIds.every(id=>moduleIds.has(id)))violations.push(`${requirement.requirementId} is not satisfied.`);
    const sensorEndpoints=graph.modules.filter(module=>module.semanticType==='SENSOR'&&module.extensions.baselineEndpoint);
    if(graph.modules.some(module=>module.semanticType==='SENSOR')&&sensorEndpoints.length<2)warnings.push('Sensor inventory has fewer than two explicit baseline endpoints.');
    return{valid:!violations.length,violations,warnings,moduleMassTonnes:mass,moduleVolumeM3:volume,repairCount:graph.repairLog.length};
  }
  function repairGraph(result,graph){
    const map=infraMap(graph.infrastructureNodes),moduleIds=new Set(graph.modules.map(module=>module.moduleId));
    const log=(type,targetId,description)=>graph.repairLog.push({repairId:stableId('repair',graph.vesselInstanceId,type,targetId,graph.repairLog.length),type,targetId,description,deterministic:true});
    const ensureEdge=(name,from,to,edgeType,properties=[])=>{
      const network=graph.graphs[name];
      network.edges=network.edges.filter(edge=>moduleIds.has(edge.from)||graph.infrastructureNodes.some(node=>node.nodeId===edge.from)).filter(edge=>moduleIds.has(edge.to)||graph.infrastructureNodes.some(node=>node.nodeId===edge.to));
      if(!network.edges.some(edge=>edge.from===from&&edge.to===to)){network.edges.push(makeEdge(graph.vesselInstanceId,name,from,to,edgeType,properties));log(`RESTORE_${name.toUpperCase()}_EDGE`,to,`Restored ${name} connectivity from ${from}.`);}
    };
    for(const module of graph.modules){
      const expected=module.envelope==='INTERNAL'?map['pressure-vault']:map['vacuum-truss'];
      if(module.attachment.parentId!==expected.nodeId||!module.attachment.parentProperties.includes(module.attachment.requiredProperty)){
        module.attachment={parentId:expected.nodeId,requiredProperty:module.envelope==='INTERNAL'?'ATMOSPHERE_MANIFOLD':'VACUUM_EXPOSED',parentProperties:clone(expected.properties),valid:true};
        module.dependencies.structural=[expected.nodeId];log('RESTORE_ATTACHMENT',module.moduleId,`Reattached module to ${expected.label}.`);
      }
      ensureEdge('structural',module.attachment.parentId,module.moduleId,'MODULE_ATTACHMENT',[module.attachment.requiredProperty]);
      if(module.requirements.power)ensureEdge('power',map['power-root'].nodeId,module.moduleId,'POWER_FEED',['ISOLATABLE']);
      if(module.requirements.cooling)ensureEdge('cooling',map['cooling-root'].nodeId,module.moduleId,'COOLANT_FEED',['RETURN_LOOP']);
      if(module.requirements.data)ensureEdge('data',map['data-root'].nodeId,module.moduleId,'DATA_AND_CONTROL',['AUTHENTICATED']);
      if(module.requirements.atmosphere)ensureEdge('atmosphere',map['atmosphere-root'].nodeId,module.moduleId,'ATMOSPHERE_FEED',['ISOLATABLE']);
      if(module.requirements.access)ensureEdge('access',map['access-root'].nodeId,module.moduleId,module.envelope==='INTERNAL'?'INTERNAL_ACCESS':'EVA_SERVICE',[module.serviceMode]);
    }
    for(const path of graph.loadPaths){
      const module=graph.modules.find(item=>item.moduleId===path.fromNodeId);
      if(!module)continue;
      const through=module.semanticType==='MAIN_ENGINE'||module.semanticType==='WEAPON'?[module.moduleId,map['thrust-keel'].nodeId,map['structural-root'].nodeId]:[module.moduleId,module.attachment.parentId,map['structural-root'].nodeId];
      if(JSON.stringify(path.throughNodeIds)!==JSON.stringify(through)||!path.continuous){path.throughNodeIds=through;path.toNodeId=map['structural-root'].nodeId;path.continuous=true;path.valid=true;log('RESTORE_LOAD_PATH',path.loadPathId,'Restored the continuous structural path to the principal root.');}
    }
    for(const hardpoint of graph.weaponHardpoints){
      const magazines=graph.modules.filter(module=>module.semanticType==='MAGAZINE'&&module.extensions.weaponFamily===hardpoint.weaponFamily).map(module=>module.moduleId);
      hardpoint.magazineModuleIds=magazines;
      for(const magazine of magazines)ensureEdge('magazineFeed',magazine,hardpoint.moduleId,'AMMUNITION_OR_EMITTER_FEED',['ISOLATED_TRANSFER']);
      hardpoint.sensorModuleIds=graph.modules.filter(module=>module.semanticType==='SENSOR').map(module=>module.moduleId);
      hardpoint.fireControlModuleIds=graph.modules.filter(module=>module.semanticType==='FIRE_CONTROL').map(module=>module.moduleId);
      hardpoint.valid=true;
    }
  }
  function buildGraph(seed,input,result){
    const vesselId=result.contract.identifiers.vesselInstanceId,nodes=infrastructure(vesselId),nodeByKey=infraMap(nodes),specs=[];
    for(const row of result.hull.massBudget)specs.push(...expandRow(row,result));
    const modules=specs.map(spec=>moduleFromSpec(seed,result,spec,nodeByKey));
    const graphs=createGraphs(vesselId,nodes,modules),zones=pressureZones(vesselId,modules),zoneGraph=pressureZoneGraph(vesselId,zones),loadPaths=buildLoadPaths(vesselId,nodes,modules);
    const integration=weaponIntegration(seed,result,graphs,modules,loadPaths),mode=String(input.graphValidationMode||dom('exo-vessel-graph-mode')||'REPAIR').toUpperCase();
    if(!['REPAIR','STRICT'].includes(mode))throw new Error(`Unknown module graph validation mode ${mode}.`);
    const graph={recordType:'exoVesselModuleGraph',schemaVersion:'1.0.0',phase:'VESSEL-03',vesselInstanceId:vesselId,topology:chooseTopology(result.contract.seeds.layoutSeed||seed,result),validationMode:mode,infrastructureNodes:nodes,modules,pressureZones:zones,pressureZoneGraph:zoneGraph,graphs,loadPaths,weaponHardpoints:integration.weaponHardpoints,sensorRequirements:integration.sensorRequirements,repairLog:[],deferredSystems:{voxelBounds:'VESSEL-04',conditionApplication:'VESSEL-05',trackAndCombatGeometry:'VESSEL-06',weaponEngagementEnvelopes:'VESSEL-07',localDamageResolution:'VESSEL-08'},validation:{valid:true,violations:[],warnings:[],moduleMassTonnes:0,moduleVolumeM3:0,repairCount:0}};
    applyFaults(graph,input.moduleGraphFaults||[]);
    const before=validateGraph(result,graph);
    if(!before.valid&&mode==='STRICT')throw new Error(`Semantic module graph rejected: ${before.violations.join(' ')}`);
    if(!before.valid){repairGraph(result,graph);graph.validation=validateGraph(result,graph);graph.validation.preRepairViolations=before.violations;}
    else graph.validation=before;
    if(!graph.validation.valid)throw new Error(`Semantic module graph remained invalid after deterministic repair: ${graph.validation.violations.join(' ')}`);
    return graph;
  }
  function apply(seed,input,source,result){
    if(result.moduleGraph?.schemaVersion==='1.0.0'&&result.moduleGraph.validation?.valid)return result;
    const graph=buildGraph(seed,input,result);
    result.moduleGraph=graph;
    result.modules=graph.modules;
    const layer=result.contract?.derivedLayers?.find(item=>item.key==='moduleGraph');
    if(layer)Object.assign(layer,{status:'generated',version:'1.0.0',source:'VESSEL-03 semantic module graph runtime',notes:`${graph.modules.length} physical modules, ${graph.pressureZones.length} pressure zones, ${graph.loadPaths.length} principal load paths, and ${graph.repairLog.length} deterministic repairs.`});
    if(result.contract){
      result.contract.provenance.generatorVersion='3.3.0';
      result.contract.provenance.moduleGraphVersion='1.0.0';
      result.contract.provenance.moduleGraphRegistry='data/exo-vessel/module-graph-registry.json';
      result.contract.extensions.moduleGraphSchema='data/schemas/exo-vessel-module-graph.schema.json';
      result.contract.validation=base.validateContract(result);
    }
    if(result.manufacturer)result.manufacturer.realizedModuleGraph={topology:graph.topology.key,moduleCount:graph.modules.length,pressureZoneCount:graph.pressureZones.length,internalModuleCount:graph.modules.filter(module=>module.envelope==='INTERNAL').length,evaModuleCount:graph.modules.filter(module=>module.envelope==='EVA').length,weaponHardpointCount:graph.weaponHardpoints.length,repairCount:graph.repairLog.length};
    result.warnings=[...(result.warnings||[]),`VESSEL-03 converted the closed engineering ledger into ${graph.modules.length} physical semantic modules connected by structural, power, cooling, data, atmosphere, access, magazine-feed, and sensor-dependency graphs.`,graph.repairLog.length?`${graph.repairLog.length} deterministic graph repairs were applied and recorded. Strict validation mode would have rejected the same defects.`:'The semantic graph passed without deterministic repair.',`Voxel bounds remain null until VESSEL-04; module identity and connectivity will not be regenerated merely to accommodate later geometry.`];
    return result;
  }
  function generate(seed,input={},source=null){const value=String(seed||input.seed||'vessel');return apply(value,input,source,base.generate(value,input,source));}
  globalThis.BlacklightExoVessel=Object.freeze({...base,moduleGraphVersion:1,moduleGraphSchemaVersion:'1.0.0',moduleDefinitions:D,generate});
})();