(() => {
  'use strict';

  const REGISTRY_URL='data/exo-vessel/ftl-sectional-dependency-topology-registry.json';
  const STATUS=Object.freeze({READY:'READY',UNRESOLVED:'UNRESOLVED',CONFLICT:'CONFLICT',BLOCKED:'BLOCKED'});
  const CHANNELS=Object.freeze(['sensor','navigation','reference','solver','command','actuator','exit','clearance','recovery','thermal','structure']);
  let cachePromise=null;

  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const clamp01=v=>Math.min(1,Math.max(0,Number(v)||0));
  const unique=items=>[...new Set((items||[]).filter(Boolean))];

  function deepFreeze(value){
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    Object.freeze(value);
    Object.getOwnPropertyNames(value).forEach(k=>deepFreeze(value[k]));
    return value;
  }

  async function loadRegistry(){
    if(!cachePromise){
      cachePromise=fetch(REGISTRY_URL,{cache:'no-store'}).then(r=>{
        if(!r.ok)throw new Error(`Unable to load ${REGISTRY_URL}: HTTP ${r.status}`);
        return r.json();
      }).then(deepFreeze).catch(error=>{cachePromise=null;throw error;});
    }
    return cachePromise;
  }

  function normalizeReadiness(readiness={}){
    const out={};
    CHANNELS.forEach(channel=>{out[channel]=finite(readiness[channel])?clamp01(readiness[channel]):1;});
    return out;
  }

  function selectProfile(registry,context={}){
    if(context.profile&&typeof context.profile==='object')return {status:STATUS.READY,profile:context.profile,warnings:['Caller-supplied sectional topology profile is active; preserve its declared provenance/status.']};
    const requested=context.profileId||'generic-sectional-safety-v1';
    const matches=(registry.profiles||[]).filter(p=>p.profileId===requested);
    if(!matches.length)return {status:STATUS.UNRESOLVED,profile:null,warnings:[`No sectional dependency profile matched ${requested}.`]};
    if(matches.length>1){
      const sig=new Set(matches.map(p=>JSON.stringify({status:p.status,defaultServiceChannelMap:p.defaultServiceChannelMap||{}})));
      if(sig.size>1)return {status:STATUS.CONFLICT,profile:null,warnings:[`Conflicting sectional dependency profiles matched ${requested}.`]};
    }
    return {status:STATUS.READY,profile:matches[0],warnings:[]};
  }

  function sectionIds(network={}){
    return unique((network.sections||[]).map(s=>s.sectionId));
  }

  function edgeAvailability(edge={}){
    return finite(edge.availability)?clamp01(edge.availability):1;
  }

  function edgeLatency(edge={}){
    return finite(edge.latency)?Math.max(0,Number(edge.latency)):0;
  }

  function better(candidate,current,tolerance=1e-12){
    if(!current)return true;
    if(candidate.availability>current.availability+tolerance)return true;
    if(Math.abs(candidate.availability-current.availability)<=tolerance&&candidate.latency<current.latency-tolerance)return true;
    return false;
  }

  function widestServicePaths(network={},service){
    const ids=sectionIds(network);
    const valid=new Set(ids);
    const state=Object.fromEntries(ids.map(id=>[id,null]));
    const warnings=[];
    (network.sources||[]).filter(src=>src.service===service).forEach(src=>{
      if(!valid.has(src.sectionId)){
        warnings.push(`Service source ${src.sourceId||'(unnamed)'} references unknown section ${src.sectionId}.`);
        return;
      }
      const candidate={availability:finite(src.availability)?clamp01(src.availability):1,latency:0,sourceId:src.sourceId||src.sectionId,path:[src.sectionId]};
      if(better(candidate,state[src.sectionId]))state[src.sectionId]=candidate;
    });

    const edges=(network.edges||[]).filter(edge=>edge.service===service&&valid.has(edge.from)&&valid.has(edge.to));
    const visited=new Set();
    while(true){
      let currentId=null;
      let currentState=null;
      ids.forEach(id=>{
        if(visited.has(id)||!state[id])return;
        if(!currentState||better(state[id],currentState)){currentId=id;currentState=state[id];}
      });
      if(currentId===null)break;
      visited.add(currentId);
      edges.filter(edge=>edge.from===currentId).forEach(edge=>{
        const candidate={
          availability:Math.min(currentState.availability,edgeAvailability(edge)),
          latency:currentState.latency+edgeLatency(edge),
          sourceId:currentState.sourceId,
          path:[...currentState.path,edge.to]
        };
        if(better(candidate,state[edge.to]))state[edge.to]=candidate;
      });
    }

    ids.forEach(id=>{
      if(!state[id])state[id]={availability:0,latency:null,sourceId:null,path:[]};
    });
    return {state,warnings};
  }

  function serviceTypes(network={},serviceMap={}){
    const found=[];
    (network.sources||[]).forEach(s=>found.push(s.service));
    (network.edges||[]).forEach(e=>found.push(e.service));
    Object.values(serviceMap||{}).flat().forEach(s=>found.push(s));
    return unique(found);
  }

  function sectionLocalReadiness(section={},incoming={}){
    const local=normalizeReadiness(section.readiness||{});
    const out={};
    CHANNELS.forEach(channel=>{out[channel]=Math.min(incoming[channel],local[channel]);});
    return out;
  }

  function channelServices(section={},channel,serviceMap={}){
    const override=section.serviceRequirements?.[channel];
    const raw=Array.isArray(override)?override:(serviceMap[channel]||[]);
    return unique(raw);
  }

  function sectionResults(network={},incoming={},serviceMap={},serviceStates={}){
    return (network.sections||[]).map(section=>{
      const localReadiness=sectionLocalReadiness(section,incoming);
      const effectiveReadiness={...localReadiness};
      const services={};
      const channelLatencies={};
      serviceTypes(network,serviceMap).forEach(service=>{
        const st=serviceStates[service]?.[section.sectionId]||{availability:0,latency:null,sourceId:null,path:[]};
        services[service]={...st};
      });
      CHANNELS.forEach(channel=>{
        const required=channelServices(section,channel,serviceMap);
        let readiness=localReadiness[channel];
        let latency=0;
        let hasFiniteLatency=false;
        required.forEach(service=>{
          const st=services[service]||{availability:0,latency:null};
          readiness=Math.min(readiness,st.availability);
          if(st.latency===null){latency=null;}
          else if(latency!==null){latency=Math.max(latency,st.latency);hasFiniteLatency=true;}
        });
        effectiveReadiness[channel]=clamp01(readiness);
        channelLatencies[channel]=required.length?(latency===null?null:(hasFiniteLatency?latency:0)):0;
      });
      return {
        sectionId:section.sectionId,
        localReadiness,
        effectiveReadiness,
        services,
        channelLatencies,
        blockedChannels:CHANNELS.filter(channel=>effectiveReadiness[channel]<=0)
      };
    });
  }

  function kthLargest(values,k){
    if(k<1||values.length<k)return 0;
    return [...values].sort((a,b)=>b-a)[k-1];
  }

  function kthSmallestFinite(values,k){
    const finiteValues=values.filter(finite).map(Number).sort((a,b)=>a-b);
    return finiteValues.length>=k?finiteValues[k-1]:null;
  }

  function evaluateGroups(network={},sections=[]){
    const byId=Object.fromEntries(sections.map(section=>[section.sectionId,section]));
    const results=[];
    const warnings=[];
    (network.groups||[]).forEach((group,index)=>{
      const groupId=group.groupId||`group-${index+1}`;
      const channel=group.channel;
      const members=unique(group.members||[]);
      const k=Math.max(1,Math.floor(Number(group.kRequired)||members.length||1));
      const known=members.map(id=>byId[id]).filter(Boolean);
      if(!CHANNELS.includes(channel))warnings.push(`Group ${groupId} uses unknown channel ${channel}.`);
      if(known.length!==members.length)warnings.push(`Group ${groupId} references ${members.length-known.length} unknown section member(s).`);
      const readinessValues=known.map(section=>CHANNELS.includes(channel)?section.effectiveReadiness[channel]:0);
      const readiness=kthLargest(readinessValues,k);
      const floor=finite(group.readinessFloor)?clamp01(group.readinessFloor):Number.EPSILON;
      const eligible=known.filter(section=>CHANNELS.includes(channel)&&section.effectiveReadiness[channel]>=Math.max(floor,readiness-1e-12));
      const latency=kthSmallestFinite(eligible.map(section=>section.channelLatencies[channel]),k);
      const blocked=known.length<k||readiness<floor;
      if(blocked&&readiness>0&&readiness<floor)warnings.push(`Group ${groupId} readiness ${readiness.toFixed(6)} is below declared floor ${floor.toFixed(6)}.`);
      results.push({groupId,channel,kRequired:k,members,readiness:clamp01(readiness),latency,blocked});
    });
    return {results,warnings};
  }

  async function resolveFTLSectionalDependencyTopology(context={}){
    const registry=context.registry||await loadRegistry();
    const selected=selectProfile(registry,context);
    const inputReadiness=normalizeReadiness(context.readiness||{});
    const warnings=[...(selected.warnings||[])];
    if(selected.status!==STATUS.READY){
      return deepFreeze({status:selected.status,profile:selected.profile,inputReadiness,aggregateReadiness:{...inputReadiness},sectionResults:[],groupResults:[],serviceDiagnostics:{},warnings,provenance:unique([registry.registryKey,...(context.provenance||[])])});
    }

    const network=context.network;
    if(!network||!Array.isArray(network.sections)||!network.sections.length){
      warnings.push('No sectional network with at least one section was supplied; incoming readiness is preserved.');
      return deepFreeze({status:STATUS.UNRESOLVED,profile:selected.profile,inputReadiness,aggregateReadiness:{...inputReadiness},sectionResults:[],groupResults:[],serviceDiagnostics:{},warnings,provenance:unique([registry.registryKey,selected.profile.profileId,...(context.provenance||[])])});
    }

    const serviceMap=context.serviceChannelMap||selected.profile.defaultServiceChannelMap||{};
    const serviceStates={};
    const diagnostics={};
    serviceTypes(network,serviceMap).forEach(service=>{
      const solved=widestServicePaths(network,service);
      serviceStates[service]=solved.state;
      warnings.push(...solved.warnings);
      diagnostics[service]={sources:(network.sources||[]).filter(src=>src.service===service).length,edges:(network.edges||[]).filter(edge=>edge.service===service).length};
    });

    const sections=sectionResults(network,inputReadiness,serviceMap,serviceStates);
    const groups=evaluateGroups(network,sections);
    warnings.push(...groups.warnings);
    const aggregateReadiness={...inputReadiness};
    groups.results.forEach(group=>{
      if(CHANNELS.includes(group.channel))aggregateReadiness[group.channel]=Math.min(aggregateReadiness[group.channel],group.readiness);
    });
    const blockedGroups=groups.results.filter(group=>group.blocked);
    if(!groups.results.length)warnings.push('No safety groups were declared; section diagnostics are available but installation-level readiness is not reduced by topology alone.');
    if(blockedGroups.length)warnings.push(`Sectional safety group(s) blocked: ${blockedGroups.map(g=>g.groupId).join(', ')}.`);
    const status=blockedGroups.length?STATUS.BLOCKED:STATUS.READY;

    return deepFreeze({
      status,
      profile:selected.profile,
      inputReadiness,
      aggregateReadiness,
      sectionResults:sections,
      groupResults:groups.results,
      serviceDiagnostics:diagnostics,
      warnings,
      provenance:unique([registry.registryKey,selected.profile.profileId,...(network.provenance||[]),...(context.provenance||[])])
    });
  }

  globalThis.BlacklightExoFTLSectionalDependencyTopologyRuntime=deepFreeze({STATUS,CHANNELS,resolveFTLSectionalDependencyTopology});
})();
