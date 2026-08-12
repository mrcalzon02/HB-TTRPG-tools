(() => {
  "use strict";

  if (window.EXO_HELM_AUTONAV_SUITE) return;

  const ENCOUNTERS = Object.freeze([
    Object.freeze({id:"intercept",label:"INTERCEPT APPROACH",closure:"MODERATE",bias:"PORT 14°",risk:"LOW",confidence:72,description:"Predictive closure package for controlled acquisition of a moving contact while retaining lateral escape authority.",probs:[46,18,21,9,6],recommended:["weave-1","thrust-feint"]}),
    Object.freeze({id:"offset-pass",label:"OFFSET PASS",closure:"HIGH",bias:"STARBOARD 9°",risk:"MODERATE",confidence:66,description:"High-closure crossing package that deliberately carries the vessel past the target's principal intercept axis.",probs:[34,12,31,15,8],recommended:["break-right","retro-snap"]}),
    Object.freeze({id:"flanking",label:"FLANKING VECTOR",closure:"MODERATE",bias:"PORT 31°",risk:"MODERATE",confidence:63,description:"Lateral displacement package intended to migrate the ship toward a hostile contact's weaker engagement aspect.",probs:[29,38,12,11,10],recommended:["spiral-climb","thrust-feint"]}),
    Object.freeze({id:"stern-chase",label:"STERN CHASE",closure:"HIGH",bias:"CENTERLINE",risk:"ELEVATED",confidence:78,description:"Sustained pursuit package emphasizing velocity matching, closure management and repeated future-position estimation.",probs:[57,9,11,14,9],recommended:["weave-1","random-jitter"]}),
    Object.freeze({id:"close-approach",label:"CLOSE APPROACH / DOCK",closure:"LOW",bias:"CENTERLINE",risk:"LOW",confidence:88,description:"Tight proximity package with conservative relative velocity limits and broad collision-avoidance margins.",probs:[51,10,10,25,4],recommended:["retro-snap","break-left"]}),
    Object.freeze({id:"collision-avoid",label:"COLLISION AVOIDANCE",closure:"VARIABLE",bias:"CLEAR VECTOR",risk:"CRITICAL",confidence:91,description:"Immediate hazard-rejection package that weights rapid divergence over mission geometry or formation discipline.",probs:[9,29,28,12,22],recommended:["break-left","break-right"]}),
    Object.freeze({id:"standoff",label:"HOLD-OFF / STANDOFF",closure:"ZERO",bias:"RANGE BAND",risk:"LOW",confidence:84,description:"Range-control package that maintains a selected engagement shell while minimizing unnecessary closure.",probs:[24,14,14,42,6],recommended:["random-jitter","decoy-offset"]}),
    Object.freeze({id:"break-contact",label:"BREAK CONTACT",closure:"NEGATIVE",bias:"EGRESS",risk:"ELEVATED",confidence:69,description:"Withdrawal package prioritizing separation rate, pursuit denial and access to multiple escape branches.",probs:[8,17,19,13,43],recommended:["spiral-climb","thrust-feint"]})
  ]);

  const EVASIVE = Object.freeze([
    Object.freeze({id:"weave-1",label:"WEAVE-1",use:"LOCK-ON FIRE",description:"Alternating lateral displacement with bounded timing jitter to spoil stable lead prediction.",authority:62,timing:"RHYTHMIC",signature:"MEDIUM",period:1.55,x:18,y:-5,roll:7,weights:[1.00,1.38,1.38,.72,1.18]}),
    Object.freeze({id:"break-left",label:"BREAK-TURN L",use:"PURSUIT CLOSURE",description:"High-authority port break intended to force a pursuing solution through a rapid angular-rate change.",authority:91,timing:"IMMEDIATE",signature:"HIGH",period:.92,x:-34,y:-18,roll:-24,weights:[.48,2.15,.52,.68,1.72]}),
    Object.freeze({id:"break-right",label:"BREAK-TURN R",use:"PURSUIT CLOSURE",description:"High-authority starboard break intended to force a pursuing solution through a rapid angular-rate change.",authority:91,timing:"IMMEDIATE",signature:"HIGH",period:.92,x:34,y:-18,roll:24,weights:[.48,.52,2.15,.68,1.72]}),
    Object.freeze({id:"spiral-climb",label:"SPIRAL CLIMB",use:"BALLISTIC INTERCEPT",description:"Coupled pitch and yaw escape package that continuously migrates the predicted intercept plane.",authority:78,timing:"CONTINUOUS",signature:"HIGH",period:1.28,x:16,y:-29,roll:32,weights:[.72,1.25,1.25,.42,1.92]}),
    Object.freeze({id:"random-jitter",label:"RANDOM JITTER",use:"TRACKING DEGRADATION",description:"Low-amplitude stochastic RCS impulses that increase short-horizon uncertainty without committing to a large vector change.",authority:38,timing:"STOCHASTIC",signature:"LOW",period:.58,x:11,y:-3,roll:5,weights:[.72,1.34,1.28,1.05,1.55]}),
    Object.freeze({id:"thrust-feint",label:"THRUST FEINT",use:"PREDICTION DENIAL",description:"Brief apparent acceleration commitment followed by an alternate branch once hostile prediction updates.",authority:74,timing:"DELAY / SNAP",signature:"HIGH",period:1.12,x:27,y:-24,roll:18,weights:[1.28,.72,1.62,.48,1.52]}),
    Object.freeze({id:"decoy-offset",label:"DECOY OFFSET",use:"SENSOR CONFUSION",description:"Maneuver package coordinated with decoy geometry to pull hostile tracking away from the true acceleration vector.",authority:55,timing:"OFFSET",signature:"SPLIT",period:1.72,x:-23,y:-11,roll:-13,weights:[.65,1.68,.72,1.22,1.05]}),
    Object.freeze({id:"retro-snap",label:"RETRO BRAKE SNAP",use:"OVERSHOOT CONTROL",description:"Abrupt controlled deceleration intended to force a high-closure pursuer or projectile solution through the ship's forward plane.",authority:86,timing:"BRAKE / REVERSE",signature:"HIGH",period:1.06,x:-4,y:24,roll:-8,weights:[.42,.76,.76,2.48,1.38]})
  ]);

  const ENCOUNTER_VISUAL = Object.freeze({
    intercept:{heading:-14,spread:1.0,reach:1.05},"offset-pass":{heading:9,spread:.88,reach:1.12},flanking:{heading:-31,spread:1.12,reach:1.02},"stern-chase":{heading:0,spread:.72,reach:1.18},"close-approach":{heading:0,spread:1.34,reach:.72},"collision-avoid":{heading:68,spread:1.48,reach:.92},standoff:{heading:180,spread:1.18,reach:.68},"break-contact":{heading:180,spread:.96,reach:1.16}
  });

  const BRANCH_META = Object.freeze([
    Object.freeze({label:"PRIMARY TRACK",cls:"primary"}),
    Object.freeze({label:"PORT BREAK",cls:"port"}),
    Object.freeze({label:"STARBOARD BREAK",cls:"starboard"}),
    Object.freeze({label:"BRAKE / HOLD",cls:"brake"}),
    Object.freeze({label:"HARD EVASIVE",cls:"hard"})
  ]);

  const PATTERN_GEOMETRY = Object.freeze({
    "weave-1":Object.freeze([
      {s:[0,0],c:[-24,-34],e:[2,-104],w:14},{s:[-2,-2],c:[-48,-31],e:[-63,-78],w:18},{s:[2,-2],c:[47,-43],e:[58,-88],w:18},{s:[0,2],c:[-7,9],e:[-2,24],w:11},{s:[1,-1],c:[31,-29],e:[43,-66],w:20}
    ]),
    "break-left":Object.freeze([
      {s:[0,0],c:[-35,-28],e:[-51,-77],w:12},{s:[-3,-1],c:[-62,-23],e:[-102,-50],w:24},{s:[2,0],c:[10,-19],e:[27,-45],w:8},{s:[0,2],c:[-21,8],e:[-36,23],w:10},{s:[-2,0],c:[-70,-12],e:[-109,-27],w:27}
    ]),
    "break-right":Object.freeze([
      {s:[0,0],c:[35,-28],e:[51,-77],w:12},{s:[-2,0],c:[-10,-19],e:[-27,-45],w:8},{s:[3,-1],c:[62,-23],e:[102,-50],w:24},{s:[0,2],c:[21,8],e:[36,23],w:10},{s:[2,0],c:[70,-12],e:[109,-27],w:27}
    ]),
    "spiral-climb":Object.freeze([
      {s:[0,0],c:[38,-18],e:[17,-91],w:18},{s:[-2,-1],c:[-23,-32],e:[-61,-66],w:18},{s:[2,-1],c:[55,-8],e:[78,-54],w:20},{s:[0,2],c:[17,8],e:[23,22],w:9},{s:[1,-2],c:[65,-38],e:[47,-105],w:28}
    ]),
    "random-jitter":Object.freeze([
      {s:[0,0],c:[-10,-31],e:[9,-72],w:19},{s:[-3,-1],c:[-41,-20],e:[-55,-54],w:22},{s:[3,-1],c:[38,-29],e:[52,-60],w:21},{s:[0,2],c:[13,6],e:[7,20],w:18},{s:[1,0],c:[-17,-45],e:[31,-78],w:27}
    ]),
    "thrust-feint":Object.freeze([
      {s:[0,0],c:[0,-43],e:[12,-98],w:11},{s:[-2,-1],c:[-25,-25],e:[-37,-51],w:9},{s:[2,-1],c:[15,-47],e:[72,-74],w:24},{s:[0,2],c:[-2,8],e:[4,21],w:8},{s:[1,-1],c:[11,-51],e:[91,-57],w:26}
    ]),
    "decoy-offset":Object.freeze([
      {s:[0,0],c:[-23,-31],e:[-40,-76],w:14},{s:[-3,-1],c:[-51,-22],e:[-82,-51],w:24},{s:[3,-1],c:[25,-31],e:[47,-64],w:17},{s:[0,2],c:[-12,7],e:[-18,22],w:16},{s:[1,-1],c:[20,-27],e:[65,-46],w:22}
    ]),
    "retro-snap":Object.freeze([
      {s:[0,0],c:[0,-17],e:[-2,-37],w:8},{s:[-2,0],c:[-21,-8],e:[-33,-23],w:11},{s:[2,0],c:[21,-8],e:[33,-23],w:11},{s:[0,1],c:[-3,13],e:[-4,25],w:29},{s:[0,0],c:[30,8],e:[47,20],w:20}
    ])
  });

  const PATTERN_TRAJECTORY = Object.freeze({
    "weave-1":"M120 190 C88 176 151 157 102 139 C76 129 148 106 94 88 C70 78 139 56 112 39",
    "break-left":"M120 190 C103 181 81 163 64 143 C47 122 35 91 24 53",
    "break-right":"M120 190 C137 181 159 163 176 143 C193 122 205 91 216 53",
    "spiral-climb":"M120 190 C159 181 164 153 127 145 C87 137 88 108 130 99 C167 90 166 60 128 47 C101 37 95 21 111 10",
    "random-jitter":"M120 190 L105 175 L132 159 L110 143 L139 126 L103 110 L130 93 L107 77 L137 60 L116 42",
    "thrust-feint":"M120 190 C120 166 119 145 119 124 C119 108 141 107 161 96 C180 85 186 65 190 41",
    "decoy-offset":"M120 190 C110 171 99 154 87 136 C73 117 62 97 49 78 C42 65 37 52 33 39",
    "retro-snap":"M120 190 C120 164 120 137 120 113 C120 96 95 103 91 124 C86 147 104 166 120 190"
  });

  const PROCEDURE_AUTONAV = Object.freeze({
    "planned-burn":Object.freeze({package:true,simulate:true,sync:true,vector:true,encounter:"intercept"}),"attitude-slew":Object.freeze({package:true,simulate:true,sync:true,vector:true,encounter:"offset-pass"}),"docking-trim":Object.freeze({encounter:"close-approach"}),evasive:Object.freeze({package:true,simulate:true,evasive:true,sync:true,pilot:true,encounter:"collision-avoid",pattern:"weave-1"}),"rcs-trim-check":Object.freeze({package:true,sync:true,pilot:true,encounter:"standoff",pattern:"random-jitter"}),"retrograde-braking":Object.freeze({package:true,simulate:true,sync:true,vector:true,encounter:"break-contact"}),"proximity-hold":Object.freeze({package:true,sync:true,pilot:true,encounter:"close-approach",pattern:"retro-snap"}),"main-drive-ramp":Object.freeze({package:true,simulate:true,sync:true,vector:true,encounter:"intercept"}),"rcs-countertranslation":Object.freeze({simulate:true,evasive:true,sync:true,pilot:true,encounter:"offset-pass",pattern:"break-left"}),"docking-departure":Object.freeze({package:true,sync:true,pilot:true,encounter:"break-contact",pattern:"retro-snap"}),"attitude-desaturation":Object.freeze({package:true,simulate:true,sync:true,vector:true,encounter:"standoff"}),"braking-turn":Object.freeze({package:true,simulate:true,evasive:true,sync:true,vector:true,pilot:true,encounter:"offset-pass",pattern:"break-right"}),"collision-dodge":Object.freeze({package:true,simulate:true,evasive:true,sync:true,vector:true,pilot:true,encounter:"collision-avoid",pattern:"break-left"}),"formation-reposition":Object.freeze({package:true,sync:true,vector:true,encounter:"close-approach"}),"silent-rcs-drift":Object.freeze({evasive:true,sync:true,pilot:true,encounter:"standoff",pattern:"random-jitter"}),"capture-alignment":Object.freeze({package:true,sync:true,vector:true,encounter:"close-approach"}),"wounded-drive-burn":Object.freeze({package:true,simulate:true,evasive:true,sync:true,vector:true,pilot:true,encounter:"break-contact",pattern:"thrust-feint"}),"pursuit-vector-change":Object.freeze({package:true,simulate:true,sync:true,vector:true,encounter:"stern-chase"}),"emergency-main-cutoff":Object.freeze({evasive:true,sync:true,pilot:true,encounter:"break-contact",pattern:"retro-snap"})
  });

  const state={encounter:"intercept",evasive:"weave-1",simulated:null,queued:false,synced:false,evasiveLoaded:false,simulationRun:0,attemptProcedure:null,status:"STANDBY"};
  let observer=null,renderQueued=false,visualQueued=false;
  const displayAnimations=new WeakMap();
  const encounterById=id=>ENCOUNTERS.find(item=>item.id===id)||ENCOUNTERS[0];
  const evasiveById=id=>EVASIVE.find(item=>item.id===id)||EVASIVE[0];
  const selectedProcedureId=()=>document.querySelector("#station-panel [data-procedure-select]")?.value||null;
  const requirementFor=id=>PROCEDURE_AUTONAV[id]||Object.freeze({});
  const activeAttempt=()=>Boolean(document.querySelector("#station-panel [data-procedure-abort]:not(:disabled)"));
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const normalize=values=>{const safe=values.map(value=>Math.max(1,value)),sum=safe.reduce((total,value)=>total+value,0),raw=safe.map(value=>value/sum*100),rounded=raw.map(Math.floor);let remainder=100-rounded.reduce((a,b)=>a+b,0);const fractions=raw.map((value,index)=>({index,fraction:value-Math.floor(value)})).sort((a,b)=>b.fraction-a.fraction);for(let i=0;remainder>0;i++,remainder--)rounded[fractions[i%fractions.length].index]++;return rounded;};
  const patternProbabilities=(encounter,pattern)=>normalize(encounter.probs.map((value,index)=>value*(pattern.weights[index]||1)));
  function simulateProbabilities(base){const run=++state.simulationRun,jittered=base.map((value,index)=>Math.max(2,value+Math.sin(run*1.73+index*2.31)*6.4+Math.cos(run*.81+index)*3.1));return normalize(jittered);}
  function resetWorkflow(procedureId,{applyDefaults=true}={}){const req=requirementFor(procedureId);state.attemptProcedure=procedureId;if(applyDefaults){if(req.encounter)state.encounter=req.encounter;if(req.pattern)state.evasive=req.pattern;}state.simulated=null;state.queued=false;state.synced=false;state.evasiveLoaded=false;state.status=(req.package||req.simulate||req.evasive||req.sync)?"AUTONAV REQUIRED":"STANDBY";queueVisualSync();}
  function gateState(req=requirementFor(selectedProcedureId())){const checks={package:!req.package||state.queued,simulation:!req.simulate||Boolean(state.simulated),evasive:!req.evasive||state.evasiveLoaded,sync:!req.sync||state.synced};return {...checks,ready:Object.values(checks).every(Boolean)};}
  function preSyncReady(req=requirementFor(selectedProcedureId())){return(!req.package||state.queued)&&(!req.simulate||Boolean(state.simulated))&&(!req.evasive||state.evasiveLoaded);}
  function dispatchRecorder(controlId,label,value,required=true,satisfied=true){if(!activeAttempt())return;document.dispatchEvent(new CustomEvent("exo:auxiliary-input",{detail:{station:"helm",controlId,label,value,required:Boolean(required),satisfied:Boolean(satisfied)}}));}
  function play(scene="button-light",seed="autonav"){window.EXO_CONTROL_AUDIO?.play?.(scene,{seed:`helm:${seed}`,intensity:.72});}

  function rotateLocal(point,heading,reach=1){
    const rad=heading*Math.PI/180,x=point[0]*reach,y=point[1]*reach;
    return [120+x*Math.cos(rad)-y*Math.sin(rad),190+x*Math.sin(rad)+y*Math.cos(rad)];
  }
  function quadraticPoint(branch,t){const u=1-t;return [u*u*branch.s[0]+2*u*t*branch.c[0]+t*t*branch.e[0],u*u*branch.s[1]+2*u*t*branch.c[1]+t*t*branch.e[1]];}
  function quadraticDerivative(branch,t){return [2*(1-t)*(branch.c[0]-branch.s[0])+2*t*(branch.e[0]-branch.c[0]),2*(1-t)*(branch.c[1]-branch.s[1])+2*t*(branch.e[1]-branch.c[1])];}
  function ribbonPath(branch,probability,visual){
    const left=[],right=[],samples=12,baseWidth=branch.w*visual.spread*(.58+probability/100*.9);
    for(let i=0;i<=samples;i++){
      const t=i/samples,p=quadraticPoint(branch,t),d=quadraticDerivative(branch,t),mag=Math.max(.001,Math.hypot(d[0],d[1])),nx=-d[1]/mag,ny=d[0]/mag,taper=.28+.72*t,width=baseWidth*taper;
      left.push(rotateLocal([p[0]+nx*width,p[1]+ny*width],visual.heading,visual.reach));
      right.push(rotateLocal([p[0]-nx*width,p[1]-ny*width],visual.heading,visual.reach));
    }
    const points=[...left,...right.reverse()];
    return points.map((p,i)=>`${i?"L":"M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")+" Z";
  }
  function centerlinePath(branch,visual){
    const points=Array.from({length:13},(_,i)=>rotateLocal(quadraticPoint(branch,i/12),visual.heading,visual.reach));
    return points.map((p,i)=>`${i?"L":"M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  }
  function coneDisplay(probabilities,encounter,pattern){
    const visual=ENCOUNTER_VISUAL[encounter.id]||ENCOUNTER_VISUAL.intercept,geometry=PATTERN_GEOMETRY[pattern.id]||PATTERN_GEOMETRY["weave-1"],pathOpacity=state.evasiveLoaded?.98:.66,pathWidth=state.evasiveLoaded?3.4:2.1;
    const branches=geometry.map((branch,index)=>({...BRANCH_META[index],branch,path:ribbonPath(branch,probabilities[index],visual),center:centerlinePath(branch,visual)}));
    const trajectory=PATTERN_TRAJECTORY[pattern.id]||PATTERN_TRAJECTORY["weave-1"];
    return `<div class="exo-autonav-cone-stage" data-encounter="${encounter.id}" data-evasive="${pattern.id}" data-geometry-profile="${pattern.id}" aria-label="Probabilistic maneuvering cones"><svg viewBox="0 0 240 220" role="img" aria-label="${encounter.label}; ${pattern.label}; maneuver-specific probability envelopes"><defs><radialGradient id="autonavHalo"><stop offset="0" stop-color="#84b8cf" stop-opacity=".24"/><stop offset="1" stop-color="#84b8cf" stop-opacity="0"/></radialGradient></defs><g class="autonav-grid"><circle cx="120" cy="190" r="30"/><circle cx="120" cy="190" r="60"/><circle cx="120" cy="190" r="90"/><path d="M20 190 H220 M120 10 V215 M56 126 L184 254 M184 126 L56 254"/></g><circle class="autonav-confidence-halo" cx="120" cy="190" r="42" fill="url(#autonavHalo)"/>${branches.map((item,index)=>`<path class="autonav-cone ${item.cls}" d="${item.path}" style="--prob:${probabilities[index]/100}"/><path class="autonav-branch-centerline ${item.cls}" d="${item.center}"/>`).join("")}<g transform="rotate(${visual.heading} 120 190)"><path class="autonav-pattern-trajectory" d="${trajectory}" pathLength="100" fill="none" stroke="#f0c979" stroke-width="${pathWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${pathOpacity}" stroke-dasharray="7 5"><animate attributeName="stroke-dashoffset" from="100" to="0" dur="${pattern.period}s" repeatCount="indefinite"/></path></g><g class="autonav-ownship" transform="rotate(${visual.heading+pattern.roll*.28} 120 190)"><path d="M120 176 L128 196 L120 192 L112 196Z"/><path d="M120 178 V205"/></g><g class="autonav-sweep" transform="rotate(${visual.heading} 120 190)"><path d="M120 190 L120 42"/></g></svg><div class="exo-autonav-probability-grid">${branches.map((item,index)=>`<div><span class="swatch ${item.cls}"></span><b>${item.label}</b><strong>${probabilities[index]}%</strong></div>`).join("")}<div style="grid-template-columns:1fr auto"><b>AUTHORITY</b><strong>${pattern.authority}%</strong></div><div style="grid-template-columns:1fr auto"><b>TIMING</b><strong>${pattern.timing}</strong></div><div style="grid-template-columns:1fr auto"><b>SIGNATURE</b><strong>${pattern.signature}</strong></div></div></div>`;
  }

  const packageSelect=selected=>`<select class="exo-autonav-select" data-autonav-encounter aria-label="Encounter maneuvers">${ENCOUNTERS.map(item=>`<option value="${item.id}" ${item.id===selected?"selected":""}>${item.label} · ${item.closure} CLOSURE · ${item.bias}</option>`).join("")}</select>`;
  const evasiveSelect=(selected,recommended)=>`<select class="exo-autonav-select" data-autonav-evasive aria-label="Evasive patterns">${EVASIVE.map(item=>`<option value="${item.id}" ${item.id===selected?"selected":""}>${item.label} · ${item.use}${recommended.includes(item.id)?" · REC":""}</option>`).join("")}</select>`;
  function gateMarkup(req,gates){const rows=[["PACKAGE",req.package,gates.package],["SIMULATION",req.simulate,gates.simulation],["EVASIVE",req.evasive,gates.evasive],["HELM SYNC",req.sync,gates.sync]];return`<div class="exo-autonav-gates">${rows.map(([label,required,complete])=>`<div class="exo-autonav-gate${!required?" na":complete?" complete":""}"><span>${label}</span><b>${!required?"N/A":complete?"COMPLETE":"REQUIRED"}</b></div>`).join("")}</div>`;}

  function suiteMarkup(block){
    const procedureId=selectedProcedureId();if(state.attemptProcedure!==procedureId&&!activeAttempt())resetWorkflow(procedureId,{applyDefaults:false});
    const req=requirementFor(procedureId),gates=gateState(req),encounter=encounterById(state.encounter),pattern=evasiveById(state.evasive),baseProbabilities=patternProbabilities(encounter,pattern),probabilities=state.simulated||baseProbabilities;
    const recommendation=encounter.recommended.map(id=>evasiveById(id).label).join(" / "),attempt=activeAttempt(),oldStrip=block.querySelector(".exo-control-state-strip")?.outerHTML||"";
    const queueDisabled=!attempt||!req.package,simulateDisabled=!attempt||!req.simulate||!state.queued,evasiveLoadDisabled=!attempt||!req.evasive,syncDisabled=!attempt||!req.sync||!preSyncReady(req),vectorDisabled=!attempt||!req.vector||!gates.ready,pilotDisabled=!attempt||!req.pilot||!gates.ready,gateStatus=!attempt?"STANDBY":gates.ready?"ENGINE GATE READY":state.status;
    return `<span class="exo-device-label"><b class="exo-device-code">HEL-CFM-07</b><span> · AUTO NAVIGATION PACKAGE SUITE</span></span>${oldStrip}<div class="exo-autonav-suite" data-autonav-suite data-enabled="${attempt}" data-encounter="${encounter.id}" data-evasive="${pattern.id}"><header class="exo-autonav-head"><div><small>ENCOUNTER MANEUVER PACKAGING · PROBABILISTIC VECTOR CONES · EVASIVE PATTERN LIBRARY</small><strong>${encounter.label} // ${pattern.label}</strong></div><span class="exo-autonav-status" data-state="${gateStatus.toLowerCase().replace(/\s+/g,"-")}">${gateStatus}</span></header><div class="exo-autonav-grid"><section class="exo-autonav-column packages"><header><span>PACKAGE BANK A</span><b>ENCOUNTER MANEUVERS</b></header><div class="exo-autonav-scrollbank">${packageSelect(encounter.id)}</div><div class="exo-autonav-metadata"><div><span>CLOSURE</span><b>${encounter.closure}</b></div><div><span>VECTOR BIAS</span><b>${encounter.bias}</b></div><div><span>RISK</span><b>${encounter.risk}</b></div><div><span>CONFIDENCE</span><b>${encounter.confidence}%</b></div></div></section><section class="exo-autonav-center"><header><span>HEL-NAV-PREDICTOR</span><b>MANEUVER-SPECIFIC PROBABILITY ENVELOPES</b></header>${coneDisplay(probabilities,encounter,pattern)}<p class="exo-autonav-description">${encounter.description} <b>${pattern.label}</b> now reshapes the actual branch envelopes and predicted trajectory; ${pattern.authority}% maneuver authority with ${pattern.timing.toLowerCase()} timing.</p>${gateMarkup(req,gates)}</section><section class="exo-autonav-column evasive"><header><span>PACKAGE BANK B</span><b>EVASIVE PATTERNS</b></header><div class="exo-autonav-scrollbank">${evasiveSelect(pattern.id,encounter.recommended)}</div><div class="exo-autonav-recommendation"><span>RECOMMENDED COUNTERPACKAGE</span><b>${recommendation}</b><small>SELECTED · ${pattern.label}: ${pattern.description}</small></div></section></div><footer class="exo-autonav-actions"><button type="button" data-autonav-action="queue" ${queueDisabled?"disabled":""}>QUEUE PACKAGE</button><button type="button" data-autonav-action="sync" ${syncDisabled?"disabled":""}>SYNC TO HELM</button><button type="button" data-autonav-action="load-evasive" ${evasiveLoadDisabled?"disabled":""}>LOAD EVASIVE</button><button type="button" data-autonav-action="simulate" ${simulateDisabled?"disabled":""}>SIMULATE</button><button type="button" class="primary" data-autonav-final="vector" data-proc-input="helm-vector-confirm" data-control-id="flight-confirms" data-control-state="VECTOR CONFIRMED" data-proc-label="HEL-CFM-07 · AUTO NAVIGATION PACKAGE SUITE: COMMIT NAV PLAN — ${encounter.label}" ${vectorDisabled?"disabled":""}>COMMIT NAV PLAN</button><button type="button" data-autonav-final="pilot" data-proc-input="helm-pilot-ack" data-control-id="flight-confirms" data-control-state="ACKNOWLEDGED" data-proc-label="HEL-CFM-07 · AUTO NAVIGATION PACKAGE SUITE: PILOT ACK — ${pattern.label}" ${pilotDisabled?"disabled":""}>PILOT ACK</button></footer></div>`;
  }

  function controlState(root,id,fallback){return root?.querySelector(`[data-control-id="${id}"][aria-pressed="true"]`)?.dataset.controlState||fallback;}
  function controlRange(root,id,fallback){const input=root?.querySelector(`input[data-control-id="${id}"]`),value=Number(input?.value);return Number.isFinite(value)?value:fallback;}
  function cancelDisplayAnimations(display){const list=displayAnimations.get(display)||[];list.forEach(animation=>{try{animation.cancel();}catch(_){}});displayAnimations.delete(display);}
  function motionFrames(pattern,x,y,roll){
    if(pattern.id==="weave-1")return [{x:0,y:0,r:0},{x:-x*.55,y:y*.3,r:-roll*.5},{x:x*.65,y:y*.6,r:roll*.7},{x:-x*.35,y:y*.85,r:-roll*.35},{x:x*.25,y:y,r:roll*.25}];
    if(pattern.id==="break-left"||pattern.id==="break-right")return [{x:0,y:0,r:0},{x:x*.28,y:y*.18,r:roll*.25},{x:x,y:y,r:roll},{x:x*.78,y:y*.92,r:roll*.82}];
    if(pattern.id==="spiral-climb")return [{x:0,y:0,r:0},{x:x*.65,y:y*.25,r:roll*.35},{x:-x*.3,y:y*.5,r:roll*.7},{x:x*.8,y:y*.8,r:roll},{x:x*.25,y:y,r:roll*.55}];
    if(pattern.id==="random-jitter")return [{x:0,y:0,r:0},{x:-x*.6,y:y*.2,r:-roll},{x:x*.8,y:-y*.15,r:roll*.7},{x:-x*.35,y:y*.55,r:-roll*.5},{x:x*.55,y:y*.8,r:roll},{x:0,y:y,r:0}];
    if(pattern.id==="thrust-feint")return [{x:0,y:0,r:0},{x:x*.05,y:y*.42,r:roll*.08},{x:x*.12,y:y*.65,r:roll*.12},{x:x,y:y,r:roll},{x:x*.85,y:y*.9,r:roll*.8}];
    if(pattern.id==="decoy-offset")return [{x:0,y:0,r:0},{x:x*.35,y:y*.3,r:roll*.2},{x:x*.7,y:y*.55,r:roll*.55},{x:x,y:y,r:roll},{x:x*.75,y:y*.9,r:roll*.75}];
    return [{x:0,y:0,r:0},{x:-x*.15,y:y*-.35,r:roll*.2},{x:x*.2,y:y*.2,r:roll*.4},{x:x,y:y,r:roll},{x:x*.35,y:y*.65,r:roll*.5}];
  }
  function syncHelmDisplay(){
    visualQueued=false;
    const root=document.querySelector("#station-panel .station-helm"),display=root?.querySelector(".display-maneuver");if(!root||!display)return;
    const encounter=encounterById(state.encounter),pattern=evasiveById(state.evasive),flight=controlState(root,"flight-mode","ATTITUDE"),bank=controlState(root,"thruster-bank","MAIN DRIVE"),gate=controlState(root,"thrust-gate","HOLD"),throttle=controlRange(root,"translation-throttle",55),trim=controlRange(root,"trim-wheel",0),gateVector=gate==="FORWARD"?1:gate==="AFT"?-1:0;
    const bankFactor=bank==="RCS"?1.22:bank==="DOCK JETS"?.58:1,flightFactor=flight==="TRANSLATE"?1.24:flight==="PROXIMITY"?.54:.82,throttleFactor=.55+throttle/100*.95;
    const x=(pattern.x+trim*.18+gateVector*7)*bankFactor,y=(pattern.y-gateVector*15-(throttle-50)*.13)*flightFactor,roll=pattern.roll+trim*.22+gateVector*5,authority=clamp(Math.round(pattern.authority*bankFactor*flightFactor*throttleFactor),18,100),duration=Math.round(clamp(pattern.period*1000/(.55+throttle/140)*(.88+(flight==="PROXIMITY"?.55:0)),520,5200));
    const signature=[encounter.id,pattern.id,flight,bank,gate,Math.round(throttle/5),Math.round(trim/5),state.evasiveLoaded,state.synced].join("|");
    document.body.dataset.helmAutonavEncounter=encounter.id;document.body.dataset.helmAutonavEvasive=pattern.id;document.body.dataset.helmAutonavLoaded=String(state.evasiveLoaded);document.body.dataset.helmAutonavSynced=String(state.synced);
    let readout=display.querySelector("[data-helm-response-readout]");if(!readout){readout=document.createElement("div");readout.dataset.helmResponseReadout="true";readout.style.cssText="position:absolute;left:7px;top:7px;z-index:7;display:grid;gap:2px;max-width:calc(100% - 14px);padding:5px 6px;border:1px solid rgba(125,183,201,.45);background:rgba(4,12,15,.82);box-shadow:inset 0 0 12px rgba(0,0,0,.55);pointer-events:none;font:800 .42rem/1.25 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.035em;color:#91aeb7;text-transform:uppercase";display.appendChild(readout);}
    readout.innerHTML=`<b style="color:#d3e4e7">${encounter.label} // ${pattern.label}</b><span>PRIMARY ${flight} · ${bank} · THR ${Math.round(throttle)}% · TRIM ${trim>=0?"+":""}${Math.round(trim)}% · ${gate}</span><span style="color:#d7bd7f">VECTOR X ${x>=0?"+":""}${Math.round(x)} · Y ${y>=0?"+":""}${Math.round(y)} · ROLL ${roll>=0?"+":""}${Math.round(roll)}° · AUTH ${authority}%</span>`;
    if(display.dataset.helmResponseSignature===signature)return;display.dataset.helmResponseSignature=signature;cancelDisplayAnimations(display);
    const ring=display.querySelector(".exo-tactical-ring"),ownship=display.querySelector(".exo-ownship"),contact=display.querySelector(".exo-contact"),animations=[],frames=motionFrames(pattern,x,y,roll),keyframes=frames.map(f=>({transform:`translate(-50%,-50%) translate(${f.x*.42}px,${f.y*.48}px) rotate(${f.r}deg)`}));
    if(ring?.animate)animations.push(ring.animate(frames.map((f,i)=>({transform:`translate(-50%,-50%) translate(${f.x*.18}px,${f.y*.14}px) rotate(${f.r+(i%2?6:-5)}deg) scale(${.94+authority/820})`,filter:`brightness(${.85+(i%2)*.3})`})),{duration:duration*1.9,iterations:Infinity,easing:pattern.id==="random-jitter"?"steps(6,end)":"ease-in-out"}));
    if(ownship?.animate)animations.push(ownship.animate(keyframes,{duration,iterations:Infinity,easing:pattern.id==="random-jitter"?"steps(6,end)":pattern.id.includes("break")?"cubic-bezier(.2,.82,.12,1)":"ease-in-out"}));
    if(contact?.animate)animations.push(contact.animate(frames.map(f=>({transform:`translate(${-f.x*.55}px,${-f.y*.5}px) scale(${.94+authority/650})`})),{duration:duration*1.35,iterations:Infinity,easing:pattern.id.includes("break")?"cubic-bezier(.2,.8,.15,1)":"ease-in-out"}));
    displayAnimations.set(display,animations);
  }
  function queueVisualSync(){if(visualQueued)return;visualQueued=true;requestAnimationFrame(syncHelmDisplay);}

  function upgrade(block){if(!block||block.dataset.autonavUpgraded==="true")return;block.dataset.autonavUpgraded="true";block.classList.add("hardware-autonav-suite","physical-autonav-suite");block.innerHTML=suiteMarkup(block);}
  function upgradeManualReferences(){document.querySelectorAll("#station-panel .exo-manual-step-copy").forEach(node=>{if(!node.textContent.includes("HEL-CFM-07"))return;node.querySelectorAll("span").forEach(span=>{span.textContent=span.textContent.replace(/FLIGHT CONFIRMATION/gi,"AUTO NAVIGATION PACKAGE SUITE").replace(/VECTOR CONFIRM/gi,"COMMIT NAV PLAN").replace(/PILOT ACK/gi,"PILOT ACKNOWLEDGE");});});}
  function findAndUpgrade(){renderQueued=false;document.querySelectorAll('#station-panel .exo-device-block[data-control-code="HEL-CFM-07"]').forEach(upgrade);upgradeManualReferences();queueVisualSync();}
  function queueUpgrade(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(findAndUpgrade);}
  function rerenderCurrentBlock(){const block=document.querySelector('#station-panel .exo-device-block[data-control-code="HEL-CFM-07"]');if(!block)return;block.dataset.autonavUpgraded="true";block.classList.add("hardware-autonav-suite","physical-autonav-suite");block.innerHTML=suiteMarkup(block);queueVisualSync();}
  function handleBegin(){resetWorkflow(selectedProcedureId(),{applyDefaults:true});}
  function selectEncounter(id){const req=requirementFor(selectedProcedureId()),encounter=encounterById(id);state.encounter=encounter.id;state.simulated=null;state.queued=false;state.synced=false;state.status=req.package?"PACKAGE SELECTED":"PACKAGE BROWSE";if(!encounter.recommended.includes(state.evasive)){state.evasive=encounter.recommended[0];state.evasiveLoaded=false;}dispatchRecorder("autonav-encounter-package",`HEL-CFM-07.A · ENCOUNTER PACKAGE: ${encounter.label}`,encounter.id,req.package,true);play("selector-set",`encounter:${encounter.id}`);queueVisualSync();}
  function selectEvasive(id){const req=requirementFor(selectedProcedureId()),pattern=evasiveById(id);state.evasive=pattern.id;state.simulated=null;state.evasiveLoaded=false;state.synced=false;state.status=req.evasive?"EVASIVE SELECTED":"EVASIVE BROWSE";dispatchRecorder("autonav-evasive-package",`HEL-CFM-07.B · EVASIVE PACKAGE: ${pattern.label}`,pattern.id,req.evasive,true);play("selector-set",`evasive:${pattern.id}`);queueVisualSync();}
  function handleAction(action){const req=requirementFor(selectedProcedureId()),encounter=encounterById(state.encounter),pattern=evasiveById(state.evasive);if(action==="queue"){state.queued=true;state.simulated=null;state.synced=false;state.status="PACKAGE QUEUED";dispatchRecorder("autonav-queue",`HEL-CFM-07.C · PACKAGE QUEUE: ${encounter.label}`,encounter.id,req.package,true);play("button-heavy","queue");}else if(action==="simulate"){if(!state.queued)return;state.simulated=simulateProbabilities(patternProbabilities(encounter,pattern));state.synced=false;state.status=`SIMULATION ${state.simulationRun} COMPLETE`;dispatchRecorder("autonav-simulation",`HEL-CFM-07.D · MANEUVER ENVELOPE SIMULATION: ${state.simulated.join("/")}%`,state.simulated.join(","),req.simulate,true);play("electrical-confirm",`simulate:${state.simulationRun}`);}else if(action==="load-evasive"){state.evasiveLoaded=true;state.synced=false;state.status="EVASIVE LOADED";dispatchRecorder("autonav-evasive-load",`HEL-CFM-07.E · EVASIVE LOAD: ${pattern.label}`,pattern.id,req.evasive,true);play("toggle-flick","load-evasive");}else if(action==="sync"){if(!preSyncReady(req))return;state.synced=true;state.status="HELM SYNCHRONIZED";dispatchRecorder("autonav-sync",`HEL-CFM-07.F · HELM SYNC: ${encounter.label}${req.evasive?` / ${pattern.label}`:""}`,`${encounter.id}:${pattern.id}`,req.sync,true);play("electrical-confirm","sync");document.dispatchEvent(new CustomEvent("exo:helm-autonav-sync",{detail:{procedure:selectedProcedureId(),encounter:encounter.id,evasive:pattern.id,probabilities:state.simulated||patternProbabilities(encounter,pattern)}}));}queueVisualSync();}
  function handleClick(event){const begin=event.target.closest?.("#station-panel [data-procedure-begin]");if(begin){handleBegin();return;}const actionButton=event.target.closest?.("[data-autonav-action]");if(actionButton){event.preventDefault();event.stopPropagation();handleAction(actionButton.dataset.autonavAction);rerenderCurrentBlock();return;}const finalButton=event.target.closest?.("[data-autonav-final]");if(finalButton){const req=requirementFor(selectedProcedureId()),gates=gateState(req),kind=finalButton.dataset.autonavFinal,allowed=activeAttempt()&&gates.ready&&((kind==="vector"&&req.vector)||(kind==="pilot"&&req.pilot));if(!allowed){event.preventDefault();event.stopImmediatePropagation();state.status="ENGINE GATE HOLD";rerenderCurrentBlock();play("button-heavy","gate-hold");return;}state.status=kind==="vector"?"NAV PLAN COMMITTED":"PILOT ACKNOWLEDGED";play("button-heavy",kind==="vector"?"commit-nav":"pilot-ack");queueVisualSync();}}
  function handleChange(event){const encounterSelect=event.target.closest?.("[data-autonav-encounter]");if(encounterSelect){selectEncounter(encounterSelect.value);rerenderCurrentBlock();return;}const evasiveSelectEl=event.target.closest?.("[data-autonav-evasive]");if(evasiveSelectEl){selectEvasive(evasiveSelectEl.value);rerenderCurrentBlock();return;}const select=event.target.closest?.("#station-panel [data-procedure-select]");if(select){resetWorkflow(select.value,{applyDefaults:true});queueUpgrade();return;}if(event.target.closest?.("#station-panel .station-helm"))queueVisualSync();}
  function handleInput(event){if(event.target.closest?.("#station-panel .station-helm [data-control-id]"))queueVisualSync();}
  function install(){const panel=document.getElementById("station-panel");if(!panel)return;observer=new MutationObserver(queueUpgrade);observer.observe(panel,{childList:true,subtree:true});document.addEventListener("click",handleClick,true);document.addEventListener("change",handleChange,true);document.addEventListener("input",handleInput,true);queueUpgrade();queueVisualSync();}

  window.EXO_HELM_AUTONAV_SUITE=Object.freeze({encounters:ENCOUNTERS,evasivePatterns:EVASIVE,procedureRequirements:PROCEDURE_AUTONAV,getState:()=>({...state,simulated:state.simulated?[...state.simulated]:null,gates:gateState()}),refresh:()=>{queueUpgrade();queueVisualSync();}});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();