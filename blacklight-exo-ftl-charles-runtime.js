(() => {
  'use strict';
  const base=globalThis.BlacklightExoFTL;
  const D=globalThis.BlacklightExoFTLCharlesDefinitions;
  if(!base||!D||base.charlesPhysicsVersion)return;

  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const clone=v=>JSON.parse(JSON.stringify(v));
  function hash(value){let state=2166136261;for(const char of String(value)){state^=char.charCodeAt(0);state=Math.imul(state,16777619);}return state>>>0;}
  function rngFor(seed){let state=hash(seed)||1;return()=>{state+=0x6D2B79F5;let v=state;v=Math.imul(v^v>>>15,v|1);v^=v+Math.imul(v^v>>>7,v|61);return((v^v>>>14)>>>0)/4294967296;};}
  const pick=(rng,list)=>list[Math.floor(rng()*list.length)]||list[0];
  function shuffle(rng,list){const copy=[...list];for(let i=copy.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}

  function valueText(value,unit=''){
    if(!Number.isFinite(value))return 'not finite, which I am assured is a feature';
    const a=Math.abs(value);let text;
    if(a!==0&&(a>=1e9||a<1e-5))text=value.toExponential(4);
    else text=value.toLocaleString(undefined,{maximumFractionDigits:6});
    return `${text}${unit?` ${unit}`:''}`;
  }

  function evaluatedParameters(result){
    const m=result.mechanism||{};
    const p=result.performance||{};
    const k=result.kinematics||{};
    const d=result.dimensional||{};
    const e=result.energyBudget||{};
    const r=result.routeEnvelope||{};
    const n=result.navigation||{};
    const volume=Math.max(1,m.coverage?.controlledVolumeM3||1);
    const missionJ=Math.max(0,e.missionJ||result.power?.activationJ||0);
    const density=missionJ/volume;
    const beta=Math.max(0,p.practicalRouteC||0);
    const gamma=beta<1?1/Math.sqrt(Math.max(1e-15,1-beta*beta)):null;
    return{
      routeEquivalentC:beta,
      routeEquivalentText:beta<1?`${valueText(beta*100)}% c`:`${valueText(beta)} c`,
      missionEnergyDensityJm3:density,
      missionEnergyDensityText:valueText(density,'J/m³'),
      fieldVolumeM3:volume,
      fieldVolumeText:valueText(volume,'m³'),
      qPhaseIndex:d.qPhaseIndex,
      activeDimensions:d.activeDimensions,
      coherenceWindowText:d.coherenceWindowText,
      gravityGradientIndex:r.gradientInterferenceIndex,
      routeWindowText:r.certifiedWindowText,
      planeToleranceText:n.planeToleranceText,
      payloadTransitText:k.payloadTransitText,
      missionText:k.completeMissionText||p.missionText,
      gamma,
      gammaText:gamma===null?'not applicable to route-equivalent superluminal motion':valueText(gamma),
      apparatusRatio:m.coverage?.apparatusToPayloadRatio,
      apparatusRatioText:valueText(m.coverage?.apparatusToPayloadRatio||0,':1'),
      successPercent:result.reliability?.certifiedSuccessPercent,
      successText:valueText(result.reliability?.certifiedSuccessPercent||0,'%')
    };
  }

  function levelAssessment(result,doctrine,rng){
    const rank=clamp(Number(result.pathLevel?.rank)||0,0,6);
    const baseLine=D.persona.sharedLevelComments[rank];
    const methodSpecific=[
      `The present ${doctrine.label.toLowerCase()} is being asked to operate at Path ${rank}. ${baseLine}`,
      `${baseLine} In this family the refinement is visible primarily in ${pick(rng, doctrine.equations).control.toLowerCase()}`,
      `${baseLine} The apparatus has not discovered a new law; it has become less wasteful in the manner by which it exploits the old uncertainty.`
    ];
    return pick(rng,methodSpecific);
  }

  function substituteNotes(doctrine,params,rng){
    const remarks=[...doctrine.charlesRemarks];
    remarks.push(`For this generated case the route-equivalent rating is ${params.routeEquivalentText}, the controlled region is ${params.fieldVolumeText}, and the mission model concentrates approximately ${params.missionEnergyDensityText}. These values are not interchangeable merely because all three are alarming.`);
    if(params.gamma!==null)remarks.push(`The current Lorentz factor is ${params.gammaText}. At least this term belongs to physics we can explain without adding fictional axes. Enjoy the novelty.`);
    else remarks.push(`The reported route-equivalent speed exceeds c, so treating it as an ordinary material velocity would be a category error. I have highlighted this because someone will otherwise attempt to calculate wind resistance.`);
    if(params.activeDimensions)remarks.push(`The controller currently tracks ${params.activeDimensions} active dimensions at Q-index ${params.qPhaseIndex}. The crew is not required to visualize them. Previous attempts produced artwork, arguments, and one unauthorized cult.`);
    return shuffle(rng,remarks).slice(0,4);
  }

  function buildCharles(result,doctrine,seed){
    const rng=rngFor(`${seed}:charles-physics:v1`);
    const params=evaluatedParameters(result);
    const levelRank=clamp(Number(result.pathLevel?.rank)||0,0,6);
    const equations=clone(doctrine.equations).map((eq,index)=>({...eq,index:index+1,confidence:index===0?'control-grade':index<3?'engineering model':'speculative boundary model'}));
    return{
      speaker:D.persona.name,
      role:D.persona.role,
      standingDisclaimer:D.persona.standingDisclaimer,
      doctrineLabel:doctrine.label,
      operationalSummary:doctrine.operationalSummary,
      mathematicalFrame:doctrine.mathematicalFrame,
      levelRank,
      levelAssessment:levelAssessment(result,doctrine,rng),
      evaluatedParameters:params,
      equations,
      boundaryConditions:clone(doctrine.boundaryConditions),
      alternateModels:clone(doctrine.alternateModels),
      unknowns:clone(doctrine.unknowns),
      remarks:substituteNotes(doctrine,params,rng),
      briefingOrder:[
        'operationalSummary','mathematicalFrame','evaluatedParameters','equations','boundaryConditions','alternateModels','unknowns','remarks'
      ],
      epistemicStatus:{
        measured:'Values read directly from the generated architecture or its certified route model.',
        modeled:'Relationships used by the control system to predict and constrain operation.',
        speculative:'Interpretations that reproduce the observed behavior but are not uniquely established by the machinery.',
        unknown:'Questions for which even Charles can bound outcomes more reliably than causes.'
      }
    };
  }

  function generate(seed,input={},source=null){
    const result=base.generate(seed,input,source);
    const doctrine=D.paths[result.identity?.familyKey];
    if(!doctrine)return result;
    result.version=5;
    result.charlesPhysics=buildCharles(result,doctrine,seed);
    result.summary+=` Charles classifies the underlying explanation as a control-grade model with unresolved ontology: ${result.charlesPhysics.operationalSummary}`;
    result.sourceImpact.push(`Charles supplied a lower-level mathematical briefing for ${doctrine.label}, including boundary conditions, alternate interpretations, and explicit unknowns.`);
    return result;
  }

  globalThis.BlacklightExoFTL=Object.freeze({...base,version:5,charlesPhysicsVersion:1,charlesPhysicsDefinitions:D.paths,generate});
})();
