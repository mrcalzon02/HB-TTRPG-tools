(() => {
  'use strict';

  const REGISTRY_URL='data/exo-vessel/ftl-topology-hazard-applicability-registry.json';
  const STATUS=Object.freeze({RESOLVED:'RESOLVED',UNRESOLVED:'UNRESOLVED',CONFLICT:'CONFLICT'});
  let registryPromise=null;

  const unique=items=>[...new Set((items||[]).filter(Boolean))];
  const FAMILY_ALIAS=Object.freeze({'gravitic-plane':'gravitational-plane'});
  const canonicalFamily=value=>FAMILY_ALIAS[String(value||'').trim()]||String(value||'').trim();
  function deepFreeze(value){
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    Object.freeze(value);
    Object.getOwnPropertyNames(value).forEach(key=>deepFreeze(value[key]));
    return value;
  }
  async function fetchJson(url){
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw new Error(`Unable to load ${url}: HTTP ${response.status}`);
    return response.json();
  }
  async function loadRegistry(){
    if(!registryPromise){
      registryPromise=fetchJson(REGISTRY_URL).then(registry=>{
        if(registry?.registryKey!=='blacklight.ftl.topology-hazard-applicability')throw new Error('Invalid topology-hazard applicability registry identity.');
        return deepFreeze(registry);
      }).catch(error=>{registryPromise=null;throw error;});
    }
    return registryPromise;
  }

  const SCOPE_RANK=Object.freeze({FAMILY:10,RACE:20,MANUFACTURER:30,NAMED_TECHNOLOGY:40,VESSEL:50,INSTALLATION:60});

  function recordMatches(record,context){
    if(record.family&&canonicalFamily(record.family)!==context.family)return false;
    if(record.hazardKey&&record.hazardKey!==context.hazardKey)return false;
    if(record.physicalEvidenceType&&record.physicalEvidenceType!==context.physicalEvidenceType)return false;
    const tests=[['namedTechnologyId','NAMED_TECHNOLOGY'],['vesselId','VESSEL'],['installationId','INSTALLATION'],['raceId','RACE'],['manufacturerId','MANUFACTURER']];
    for(const [field,scope] of tests){
      if(record.scopeType===scope){
        const expected=record[field]||record.scopeId;
        if(!expected||expected!==context[field])return false;
      }
    }
    return true;
  }

  function unresolved(registry,context,reason,status=STATUS.UNRESOLVED,matched=[]){
    return deepFreeze({
      schemaVersion:'1.0.0',status,applicable:null,relationship:null,record:null,
      matchedRecordIds:matched.map(r=>r.recordId),
      scopeResolution:{requestedFamily:context.family||null,requestedHazardKey:context.hazardKey||null,physicalEvidenceType:context.physicalEvidenceType||null,selectedScopeType:null,selectedRecordId:null,canonicalResolutionRequired:context.canonicalResolutionRequired!==false},
      warnings:[reason],provenance:unique([REGISTRY_URL,...(context.provenance||[])]),canonSafeguards:registry?.canonSafeguards||[]
    });
  }

  async function resolveFTLTopologyHazardApplicability(context={}){
    const registry=context.registry||await loadRegistry();
    const normalized={
      family:canonicalFamily(context.family)||null,
      hazardKey:String(context.hazardKey||'').trim()||null,
      physicalEvidenceType:String(context.physicalEvidenceType||'NORMALIZED_TIDAL_DEGENERACY_BOUNDARY').trim(),
      namedTechnologyId:context.namedTechnologyId||null,
      vesselId:context.vesselId||null,
      installationId:context.installationId||null,
      raceId:context.raceId||null,
      manufacturerId:context.manufacturerId||null,
      canonicalResolutionRequired:context.canonicalResolutionRequired!==false,
      simulationOverride:context.simulationOverride||null,
      provenance:context.provenance||[]
    };
    if(!normalized.family||!normalized.hazardKey)return unresolved(registry,normalized,'Family and hazardKey are required for canonical topology applicability resolution.');

    const matches=(registry.records||[]).filter(record=>recordMatches(record,normalized));
    if(!matches.length){
      if(!normalized.canonicalResolutionRequired&&normalized.simulationOverride&&typeof normalized.simulationOverride.applicable==='boolean'){
        return deepFreeze({
          schemaVersion:'1.0.0',status:STATUS.RESOLVED,applicable:normalized.simulationOverride.applicable,relationship:'SIMULATION_ONLY',record:null,matchedRecordIds:[],
          scopeResolution:{requestedFamily:normalized.family,requestedHazardKey:normalized.hazardKey,physicalEvidenceType:normalized.physicalEvidenceType,selectedScopeType:'SIMULATION_ONLY',selectedRecordId:null,canonicalResolutionRequired:false},
          warnings:['Simulation-only applicability override used; this is not canonical evidence.'],
          provenance:unique([REGISTRY_URL,'SIMULATION_ONLY caller override',...normalized.provenance]),canonSafeguards:registry.canonSafeguards||[]
        });
      }
      return unresolved(registry,normalized,'No canonical applicability record matches this family/hazard/evidence combination. Absence is unresolved, not NOT_APPLICABLE.');
    }

    const maxRank=Math.max(...matches.map(r=>SCOPE_RANK[r.scopeType]||0));
    const winners=matches.filter(r=>(SCOPE_RANK[r.scopeType]||0)===maxRank);
    const states=unique(winners.map(r=>`${r.applicability}|${r.relationship}`));
    if(states.length>1)return unresolved(registry,normalized,'Equal-precedence applicability records conflict; deterministic resolution refused.',STATUS.CONFLICT,winners);

    const selected=winners.slice().sort((a,b)=>String(a.recordId).localeCompare(String(b.recordId)))[0];
    const applicable=selected.applicability==='APPLICABLE';
    const relationship=selected.applicability==='NOT_APPLICABLE'?'NOT_APPLICABLE':selected.relationship;
    return deepFreeze({
      schemaVersion:'1.0.0',status:STATUS.RESOLVED,applicable,relationship,record:selected,
      matchedRecordIds:matches.map(r=>r.recordId),
      scopeResolution:{requestedFamily:normalized.family,requestedHazardKey:normalized.hazardKey,physicalEvidenceType:normalized.physicalEvidenceType,selectedScopeType:selected.scopeType||null,selectedRecordId:selected.recordId||null,canonicalResolutionRequired:normalized.canonicalResolutionRequired},
      warnings:winners.length>1?[`Multiple equivalent records matched at precedence ${maxRank}; deterministic recordId ordering selected ${selected.recordId}.`]:[],
      provenance:unique([REGISTRY_URL,selected.source?.title,selected.source?.documentId&&`${selected.source.documentId}@${selected.source.revisionId||'unspecified-revision'}`,...normalized.provenance]),
      canonSafeguards:registry.canonSafeguards||[]
    });
  }

  globalThis.BlacklightExoFTLTopologyHazardApplicabilityRuntime=deepFreeze({
    STATUS,REGISTRY_URL,canonicalFamily,resolveFTLTopologyHazardApplicability
  });
})();
