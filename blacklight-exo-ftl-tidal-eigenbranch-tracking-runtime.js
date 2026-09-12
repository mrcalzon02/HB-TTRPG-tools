(() => {
  'use strict';

  const REGISTRY_URL = 'data/exo-vessel/ftl-tidal-eigenbranch-tracking-registry.json';
  const STATUS = Object.freeze({
    RESOLVED:'RESOLVED', PARTIAL:'PARTIAL', UNRESOLVED:'UNRESOLVED',
    OUTSIDE_MODEL_VALIDITY:'OUTSIDE_MODEL_VALIDITY', CONFLICT:'CONFLICT'
  });
  let registryPromise = null;

  const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
  const dot = (a,b) => a.x*b.x+a.y*b.y+a.z*b.z;
  const magnitude = v => Math.hypot(v.x,v.y,v.z);
  const scale = (v,k) => ({x:v.x*k,y:v.y*k,z:v.z*k});
  const vectorFromColumn = (m,j) => ({x:m[0][j],y:m[1][j],z:m[2][j]});

  function deepFreeze(value){
    if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.getOwnPropertyNames(value).forEach(key => deepFreeze(value[key]));
    return value;
  }

  async function loadRegistry(){
    if(!registryPromise){
      registryPromise = fetch(REGISTRY_URL,{cache:'no-store'}).then(response => {
        if(!response.ok) throw new Error(`Unable to load ${REGISTRY_URL}: HTTP ${response.status}`);
        return response.json();
      }).then(registry => {
        if(registry?.registryKey !== 'blacklight.ftl.tidal-eigenbranch-tracking') throw new Error('Invalid FTL tidal eigenbranch tracking registry identity.');
        return deepFreeze(registry);
      }).catch(error => { registryPromise = null; throw error; });
    }
    return registryPromise;
  }

  function validSymmetric3(matrix){
    if(!Array.isArray(matrix) || matrix.length !== 3 || matrix.some(row => !Array.isArray(row) || row.length !== 3 || row.some(value => !finite(value)))) return false;
    const scaleRef = Math.max(1e-30,...matrix.flat().map(value => Math.abs(Number(value))));
    for(let i=0;i<3;i+=1) for(let j=i+1;j<3;j+=1){
      if(Math.abs(Number(matrix[i][j])-Number(matrix[j][i])) > 1e-10*scaleRef) return false;
    }
    return true;
  }

  function symmetricEigensystem3(matrix){
    const a = matrix.map(row => row.map(Number));
    const v = [[1,0,0],[0,1,0],[0,0,1]];
    for(let iteration=0;iteration<48;iteration+=1){
      let p=0,q=1,largest=Math.abs(a[0][1]);
      for(const [i,j] of [[0,2],[1,2]]){
        const candidate=Math.abs(a[i][j]);
        if(candidate>largest){ largest=candidate; p=i; q=j; }
      }
      const diagonalScale=Math.max(1e-30,Math.abs(a[0][0]),Math.abs(a[1][1]),Math.abs(a[2][2]));
      if(largest <= 1e-14*diagonalScale) break;
      const phi=0.5*Math.atan2(2*a[p][q],a[q][q]-a[p][p]);
      const c=Math.cos(phi), s=Math.sin(phi);
      const app=c*c*a[p][p]-2*s*c*a[p][q]+s*s*a[q][q];
      const aqq=s*s*a[p][p]+2*s*c*a[p][q]+c*c*a[q][q];
      for(let k=0;k<3;k+=1){
        if(k===p || k===q) continue;
        const akp=a[k][p], akq=a[k][q];
        a[k][p]=a[p][k]=c*akp-s*akq;
        a[k][q]=a[q][k]=s*akp+c*akq;
      }
      a[p][p]=app; a[q][q]=aqq; a[p][q]=a[q][p]=0;
      for(let k=0;k<3;k+=1){
        const vkp=v[k][p], vkq=v[k][q];
        v[k][p]=c*vkp-s*vkq;
        v[k][q]=s*vkp+c*vkq;
      }
    }
    const raw=[0,1,2].map(index => {
      const vector=vectorFromColumn(v,index);
      const norm=magnitude(vector);
      return {eigenvaluePerS2:a[index][index],eigenvector:norm>0?scale(vector,1/norm):vector};
    });
    return raw.sort((left,right)=>right.eigenvaluePerS2-left.eigenvaluePerS2);
  }

  function frobenius(matrix){
    return Math.sqrt(matrix.flat().reduce((sum,value)=>sum+Number(value)*Number(value),0));
  }

  function markDegeneracy(entries,tensorNorm,relativeGap){
    const degenerate=[false,false,false];
    for(let i=0;i<3;i+=1) for(let j=i+1;j<3;j+=1){
      const li=Math.abs(entries[i].eigenvaluePerS2), lj=Math.abs(entries[j].eigenvaluePerS2);
      const gap=Math.abs(entries[i].eigenvaluePerS2-entries[j].eigenvaluePerS2)/Math.max(li,lj,tensorNorm,1e-30);
      if(gap<relativeGap){ degenerate[i]=true; degenerate[j]=true; }
    }
    return entries.map((entry,index)=>({...entry,degenerate:degenerate[index]}));
  }

  const PERMUTATIONS=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];

  function bestAssignment(previous,current){
    let selected=null;
    for(const permutation of PERMUTATIONS){
      const score=permutation.reduce((sum,currentIndex,branchIndex)=>sum+Math.abs(dot(previous[branchIndex].eigenvector,current[currentIndex].eigenvector)),0);
      if(!selected || score>selected.score) selected={permutation,score};
    }
    return selected;
  }

  function alignToPrevious(previous,current){
    const assignment=bestAssignment(previous,current);
    return assignment.permutation.map((currentIndex,branchIndex)=>{
      const candidate=current[currentIndex];
      const signedDot=dot(previous[branchIndex].eigenvector,candidate.eigenvector);
      return {...candidate,eigenvector:signedDot<0?scale(candidate.eigenvector,-1):candidate.eigenvector};
    });
  }

  function axisAngle(a,b){
    if(!a || !b) return null;
    return Math.acos(clamp(Math.abs(dot(a,b)),-1,1));
  }

  function nonDegenerateNormal(entries){
    const nonDegenerate=entries.filter(entry=>!entry.degenerate);
    return nonDegenerate.length===1 ? nonDegenerate[0].eigenvector : null;
  }

  function sampleTensor(sample){
    return sample?.environmentPacket?.metrics?.tidalTensorPerS2 || sample?.metrics?.tidalTensorPerS2 || null;
  }

  function unresolved(reason,registry,context={}){
    return deepFreeze({
      schemaVersion:'1.0.0',status:STATUS.UNRESOLVED,familyId:context.familyId||null,encounterModel:context.encounterModel||null,
      tracking:{degeneracyRelativeGap:Number(registry?.defaultControls?.degeneracyRelativeGap)||0.02,maximumBranchRotationRad:Number(registry?.defaultControls?.maximumBranchRotationRad)||0.08726646259971647},
      samples:[],transitions:[],warnings:[reason],provenance:[REGISTRY_URL],canonSafeguards:registry?.canonSafeguards||[]
    });
  }

  async function resolveFTLTidalEigenbranchTracking(context={}){
    const registry=context.registry || await loadRegistry();
    const rawSamples=Array.isArray(context.samples)?context.samples:[];
    if(!rawSamples.length) return unresolved('No route or encounter samples were supplied for tidal eigenbranch tracking.',registry,context);

    const degeneracyRelativeGap=finite(context.degeneracyRelativeGap)?Number(context.degeneracyRelativeGap):Number(registry.defaultControls?.degeneracyRelativeGap)||0.02;
    const maximumBranchRotationRad=finite(context.maximumBranchRotationRad)?Number(context.maximumBranchRotationRad):Number(registry.defaultControls?.maximumBranchRotationRad)||0.08726646259971647;
    const sorted=[...rawSamples].sort((a,b)=>Number(a.fraction??a.sampleIndex??0)-Number(b.fraction??b.sampleIndex??0));
    const warnings=[];
    const samples=[];
    let previous=null;
    let anyDegenerate=false;
    let anyUnresolved=false;

    for(let index=0;index<sorted.length;index+=1){
      const source=sorted[index];
      const tensor=sampleTensor(source);
      if(!validSymmetric3(tensor)){
        anyUnresolved=true;
        samples.push({sampleIndex:index,fraction:Number(source.fraction??index),encounterEpoch:source.encounterEpoch||null,eigensystemStatus:'UNRESOLVED',eigenbranches:[]});
        previous=null;
        continue;
      }
      let entries=markDegeneracy(symmetricEigensystem3(tensor),frobenius(tensor),degeneracyRelativeGap);
      if(previous && previous.length===3) entries=alignToPrevious(previous,entries);
      const degenerate=entries.some(entry=>entry.degenerate);
      anyDegenerate ||= degenerate;
      const tracked=entries.map((entry,branchIndex)=>({branchId:`T${branchIndex+1}`,eigenvaluePerS2:entry.eigenvaluePerS2,eigenvector:entry.eigenvector,degenerate:entry.degenerate}));
      samples.push({
        sampleIndex:index,
        fraction:Number(source.fraction??index),
        encounterEpoch:source.encounterEpoch||null,
        eigensystemStatus:degenerate?'DEGENERATE_SUBSPACE':'RESOLVED',
        eigenbranches:tracked
      });
      previous=tracked;
    }

    const transitions=[];
    for(let index=0;index<samples.length-1;index+=1){
      const left=samples[index], right=samples[index+1];
      if(left.eigenbranches.length!==3 || right.eigenbranches.length!==3){
        transitions.push({leftSampleIndex:left.sampleIndex,rightSampleIndex:right.sampleIndex,status:'UNRESOLVED',branchRotationsRad:{},maximumResolvedBranchRotationRad:null,degenerateSubspaceRotationRad:null,refinementRequested:true});
        continue;
      }
      const rotations={};
      const resolved=[];
      for(let branchIndex=0;branchIndex<3;branchIndex+=1){
        const a=left.eigenbranches[branchIndex], b=right.eigenbranches[branchIndex];
        if(a.degenerate || b.degenerate){ rotations[a.branchId]=null; continue; }
        const angle=axisAngle(a.eigenvector,b.eigenvector);
        rotations[a.branchId]=angle;
        if(angle!==null) resolved.push(angle);
      }
      const leftNormal=nonDegenerateNormal(left.eigenbranches);
      const rightNormal=nonDegenerateNormal(right.eigenbranches);
      const subspaceRotation=(leftNormal&&rightNormal)?axisAngle(leftNormal,rightNormal):null;
      const maxResolved=resolved.length?Math.max(...resolved):null;
      const degenerate=left.eigensystemStatus==='DEGENERATE_SUBSPACE'||right.eigensystemStatus==='DEGENERATE_SUBSPACE';
      transitions.push({
        leftSampleIndex:left.sampleIndex,rightSampleIndex:right.sampleIndex,
        status:degenerate?'DEGENERATE_SUBSPACE':'RESOLVED',
        branchRotationsRad:rotations,
        maximumResolvedBranchRotationRad:maxResolved,
        degenerateSubspaceRotationRad:subspaceRotation,
        refinementRequested:(maxResolved!==null&&maxResolved>maximumBranchRotationRad)||(subspaceRotation!==null&&subspaceRotation>maximumBranchRotationRad)||degenerate
      });
    }

    if(anyDegenerate) warnings.push('One or more tidal eigensystems contain near-degenerate eigenvalues; individual axes inside those subspaces are not physically unique.');
    if(anyUnresolved) warnings.push('One or more samples lack a finite symmetric tidal tensor; eigenbranch continuity is unresolved across those gaps.');
    warnings.push('Eigenvector sign is gauge freedom; tracked vectors are sign-aligned only for continuity and do not define an arrow direction.');
    warnings.push('Tidal eigenbranch behavior is ordinary gravitational evidence and does not by itself establish a fictional shear-lane fork.');

    const status=anyUnresolved?STATUS.PARTIAL:STATUS.RESOLVED;
    return deepFreeze({
      schemaVersion:'1.0.0',status,familyId:context.familyId||null,encounterModel:context.encounterModel||null,
      tracking:{degeneracyRelativeGap,maximumBranchRotationRad},samples,transitions,warnings:unique(warnings),
      provenance:unique([REGISTRY_URL,...(context.provenance||[])]),canonSafeguards:registry.canonSafeguards||[]
    });
  }

  globalThis.BlacklightExoFTLTidalEigenbranchTrackingRuntime=deepFreeze({STATUS,REGISTRY_URL,loadRegistry,resolveFTLTidalEigenbranchTracking});
})();
