(() => {
  "use strict";

  const MAX_DIFFICULTY = 5;
  const AUTH_TOKENS = new Set(["auth-key-insert", "auth-key-arm", "auth-shield-open", "execute"]);
  const STATION_CODES = Object.freeze({helm:"HEL",navigation:"NAV",gunnery:"GUN",engineering:"ENG",science:"SCI",comms:"COM"});
  const $ = id => document.getElementById(id);
  const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
  const round = (v,d=0) => Number(v.toFixed(d));
  const spec = (id,label,min,max,step,unit="",opts={}) => Object.freeze({id,label,min,max,step,unit,...opts});

  const STATION_AUX_META = Object.freeze({
    helm:Object.freeze({title:"Flight Dynamics Trim Annex",subtitle:"Mechanical flight-law shaping and proximity-control hardware",note:"A pilot's secondary bench: aerodynamic-style bias vanes, damping flywheel, pulse rack, proximity iris and burn chronometer."}),
    navigation:Object.freeze({title:"Astrogation Refinement Table",subtitle:"Ephemeris, uncertainty and intercept-geometry instruments",note:"A plotting table rather than a switchboard: star clock, confidence aperture, cycle counter, gravity caliper and polar intercept arm."}),
    gunnery:Object.freeze({title:"Fire-Control Conditioning Rack",subtitle:"Ballistic timing, tracking and terminal-authority hardware",note:"An armored weapons rack: micrometer traverse, fuse bolt, salvo cam, filter shutters and terminal-budget clamp."}),
    engineering:Object.freeze({title:"Plant Regulation Manifold",subtitle:"Mechanical power-conditioning and synchronization apparatus",note:"A machinery-space panel: centrifugal governor, coolant pistons, synchroscope, choke-core gap and phase coupler."}),
    science:Object.freeze({title:"Sensor Analysis Optical Bench",subtitle:"Signal discrimination, optics and measurement hardware",note:"A laboratory bench: Doppler comb, spectral slit, subtraction balance, parallax boom and discriminator gate."}),
    comms:Object.freeze({title:"Signal Shaping & Coding Bay",subtitle:"Waveform, timing, coding and antenna-phasing hardware",note:"A communications rack: envelope jaws, timing escapement, code-tape gate, phasing carriage and interleave cassette cascade."})
  });

  const AUXILIARY_CONTROLS = Object.freeze({
    helm:Object.freeze([
      spec("vector-bias","Thrust vector bias",-15,15,1,"°",{signed:true,discipline:"Vector trim",mechanism:"vector-vane",gesture:"x",hardware:"Differential vector-vane cradle"}),
      spec("damping-gain","Inertial damping gain",0,100,5,"%",{discipline:"Flight stabilization",mechanism:"damping-flywheel",gesture:"y",hardware:"Friction-loaded damping flywheel"}),
      spec("rcs-pulse","RCS pulse width",10,500,10,"ms",{discipline:"Reaction-control timing",mechanism:"pulse-rack",gesture:"x",hardware:"RCS pulse timing rack"}),
      spec("collision-envelope","Proximity collision envelope",0,10,.5,"km",{discipline:"Proximity protection",mechanism:"proximity-iris",gesture:"dial",hardware:"Concentric proximity iris"}),
      spec("cutoff-lead","Burn cutoff lead",0,30,1,"s",{discipline:"Drive cutoff timing",mechanism:"burn-chronometer",gesture:"dial",hardware:"Burn cutoff chronometer cam"})
    ]),
    navigation:Object.freeze([
      spec("epoch-offset","Ephemeris epoch offset",-300,300,10,"s",{signed:true,discipline:"Reference timing",mechanism:"star-clock",gesture:"dial",hardware:"Sidereal epoch star clock"}),
      spec("covariance-gate","Solution covariance gate",0,100,5,"%",{discipline:"Solution confidence",mechanism:"confidence-aperture",gesture:"y",hardware:"Covariance confidence aperture"}),
      spec("solver-iterations","Solver iteration limit",1,64,1,"cycles",{discipline:"Trajectory solver",mechanism:"cycle-counter",gesture:"y",hardware:"Mechanical iteration counter stack"}),
      spec("exclusion-radius","Gravity-well exclusion radius",0,1000,25,"km",{discipline:"Hazard envelope",mechanism:"gravity-caliper",gesture:"x",hardware:"Gravity-well plotting caliper"}),
      spec("intercept-lead","Intercept lead time",0,180,5,"s",{discipline:"Intercept geometry",mechanism:"intercept-arm",gesture:"dial",hardware:"Polar intercept plotting arm"})
    ]),
    gunnery:Object.freeze([
      spec("lead-bias","Lead solution bias",-5,5,.1,"mrad",{signed:true,discipline:"Fire-control correction",mechanism:"lead-micrometer",gesture:"x",hardware:"Ballistic lead micrometer carriage"}),
      spec("fuse-delay","Fuse / trigger delay",0,20,.5,"ms",{discipline:"Terminal timing",mechanism:"fuse-bolt",gesture:"y",hardware:"Protected fuse timing bolt"}),
      spec("salvo-spacing","Salvo spacing",.1,5,.1,"s",{discipline:"Battery sequencing",mechanism:"salvo-cam",gesture:"dial",hardware:"Five-lobe salvo sequencing cam"}),
      spec("track-filter","Track filter gain",0,100,5,"%",{discipline:"Track conditioning",mechanism:"filter-shutters",gesture:"y",hardware:"Tracking filter shutter bank"}),
      spec("terminal-budget","Terminal correction budget",0,100,5,"%",{discipline:"Guidance authority",mechanism:"terminal-clamp",gesture:"x",hardware:"Terminal-authority segmented clamp"})
    ]),
    engineering:Object.freeze([
      spec("governor-bias","Reactor governor bias",-10,10,.5,"%",{signed:true,discipline:"Reactor regulation",mechanism:"centrifugal-governor",gesture:"x",hardware:"Centrifugal governor bias cage"}),
      spec("coolant-bypass","Coolant bypass fraction",0,100,5,"%",{discipline:"Thermal routing",mechanism:"coolant-pistons",gesture:"y",hardware:"Triple-piston coolant bypass manifold"}),
      spec("phase-trim","Bus phase trim",-10,10,.5,"°",{signed:true,discipline:"Distribution phasing",mechanism:"synchroscope",gesture:"dial",hardware:"Bus phase synchroscope"}),
      spec("ripple-rejection","Rectifier ripple rejection",0,100,5,"%",{discipline:"Power conditioning",mechanism:"choke-gap",gesture:"x",hardware:"Movable-core ripple choke"}),
      spec("inverter-sync","Inverter synchronization phase",0,360,5,"°",{discipline:"Inverter synchronization",mechanism:"phase-coupler",gesture:"dial",hardware:"Three-lamp inverter phase coupler"})
    ]),
    science:Object.freeze([
      spec("doppler-window","Doppler search window",-50,50,1,"km/s",{signed:true,discipline:"Velocity discrimination",mechanism:"doppler-comb",gesture:"x",hardware:"Variable-span Doppler comb"}),
      spec("spectral-bin","Spectral bin width",1,100,1,"nm",{discipline:"Spectral resolution",mechanism:"spectral-slit",gesture:"x",hardware:"Opposed-jaw spectral slit"}),
      spec("baseline-sub","Baseline subtraction",0,100,5,"%",{discipline:"Background rejection",mechanism:"baseline-balance",gesture:"y",hardware:"Differential baseline balance beam"}),
      spec("parallax-baseline","Parallax baseline",1,1000,10,"m",{discipline:"Geometric ranging",mechanism:"parallax-boom",gesture:"x",hardware:"Telescoping parallax optical boom"}),
      spec("return-threshold","Return discrimination threshold",0,100,5,"%",{discipline:"Signal discrimination",mechanism:"discriminator-gate",gesture:"y",hardware:"Return discriminator waterfall gate"})
    ]),
    comms:Object.freeze([
      spec("modulation-depth","Modulation depth",0,100,5,"%",{discipline:"Carrier modulation",mechanism:"envelope-jaws",gesture:"x",hardware:"Waveform envelope pinch jaws"}),
      spec("symbol-rate","Symbol rate",1,100,1,"ksym/s",{discipline:"Link timing",mechanism:"timing-escapement",gesture:"dial",hardware:"Symbol-clock escapement governor"}),
      spec("fec-overhead","Error-correction overhead",0,80,5,"%",{discipline:"Forward error correction",mechanism:"code-tape",gesture:"y",hardware:"Perforated-code tape gate"}),
      spec("beam-offset","Beam steering offset",-30,30,1,"°",{signed:true,discipline:"Directional steering",mechanism:"phasing-carriage",gesture:"x",hardware:"Antenna phasing carriage"}),
      spec("interleave-depth","Interleave depth",1,64,1,"frames",{discipline:"Burst resilience",mechanism:"interleave-cascade",gesture:"y",hardware:"Interleave cassette cascade"})
    ])
  });

  const initialValues = () => Object.fromEntries(Object.entries(AUXILIARY_CONTROLS).map(([station,controls]) => [station,Object.fromEntries(controls.map(c => [c.id,quantize(c,(c.min+c.max)/2)]))]));
  let values = initialValues();
  let configuredDifficulty = 0;
  let drawerOpen = false;
  let attempt = null;
  let message = "Panel II standing by. Begin a primary procedure to arm auxiliary requirements.";
  let auxGesture = null;

  function digits(c){const s=String(c.step ?? 1);return s.includes(".") ? s.length-s.indexOf(".")-1 : 0;}
  function quantize(c,value){const step=c.step||1,steps=Math.round((clamp(Number(value),c.min,c.max)-c.min)/step);return round(clamp(c.min+steps*step,c.min,c.max),digits(c));}
  function fraction(c,value){return c.max===c.min?.5:clamp((value-c.min)/(c.max-c.min),0,1);}
  function formatValue(c,value){const v=quantize(c,value),sign=c.signed&&v>0?"+":"",sep=c.unit==="°"||!c.unit?"":" ";return `${sign}${v}${c.unit?`${sep}${c.unit}`:""}`;}
  function stableHash(text){let h=2166136261;for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function activeStation(){return document.querySelector(".exo-station-tab[aria-selected='true']")?.dataset.station || "helm";}
  function activeProcedureId(){return document.querySelector("#station-panel [data-procedure-select]")?.value || "unselected";}
  function activeProcedureName(){const select=document.querySelector("#station-panel [data-procedure-select]");return select?.selectedOptions?.[0]?.textContent?.replace(/\s+·\s+\d+\s+canonical inputs.*$/i,"").trim() || "Selected procedure";}
  function activeRecommendedDifficulty(){const raw=Number(document.querySelector("#station-panel [data-procedure-select]")?.selectedOptions?.[0]?.dataset.recommendedDifficulty);return clamp(Number.isFinite(raw)&&raw?raw:3,1,MAX_DIFFICULTY);}
  function coreAttemptActive(){const abort=document.querySelector("#station-panel [data-procedure-abort]");return Boolean(abort && !abort.disabled);}
  function controlFor(station,id){return (AUXILIARY_CONTROLS[station]||[]).find(c=>c.id===id)||null;}

  function requirementPlan(station,procedureId,difficulty){
    const controls=AUXILIARY_CONTROLS[station]||[],count=Math.min(clamp(Math.round(difficulty),0,MAX_DIFFICULTY),controls.length);
    if(!count)return [];
    const offset=stableHash(`${station}:${procedureId}:aux-order`)%controls.length;
    const ordered=[...controls.slice(offset),...controls.slice(0,offset)];
    return ordered.slice(0,count).map(control => {
      const slots=Math.max(1,Math.floor((control.max-control.min)/(control.step||1))+1);
      const slot=stableHash(`${station}:${procedureId}:${control.id}:aux-target:level-${count}`)%slots;
      const target=quantize(control,control.min+slot*(control.step||1));
      const index=controls.indexOf(control)+1;
      return Object.freeze({controlId:control.id,control,target,tolerance:(control.step||1)/2,token:`aux-${station}-${control.id}`,code:`${STATION_CODES[station]}-AUX-${String(index).padStart(2,"0")}`});
    });
  }

  function requirementFor(controlId){return attempt?.requirements?.find(r=>r.controlId===controlId)||null;}
  function isAtTarget(req){const value=values[attempt?.station||activeStation()]?.[req.controlId];return Number.isFinite(value)&&Math.abs(value-req.target)<=req.tolerance+1e-9;}
  function requirementSatisfied(req){return Boolean(attempt&&attempt.touched.has(req.controlId)&&isAtTarget(req));}
  function incompleteRequirements(){return attempt?.requirements?.filter(r=>!requirementSatisfied(r))||[];}
  function allRequirementsSatisfied(){return incompleteRequirements().length===0;}

  function beginAttempt(){
    const station=activeStation(),procedureId=activeProcedureId(),difficulty=configuredDifficulty;
    attempt={station,procedureId,procedureName:activeProcedureName(),difficulty,recommendedDifficulty:activeRecommendedDifficulty(),requirements:requirementPlan(station,procedureId,difficulty),touched:new Set(),history:[]};
    message=difficulty?`Panel II level +${difficulty} armed: ${difficulty} auxiliary control${difficulty===1?"":"s"} must be deliberately set before authorization. Procedure recommendation is +${attempt.recommendedDifficulty}; +1 through +5 remain optional.`:`Master +0: no Panel II manipulation required. This procedure recommends +${attempt.recommendedDifficulty}, with optional levels +1 through +5 available.`;
    renderAll();
  }
  function clearAttempt(reason="Panel II standing by. Begin a primary procedure to arm auxiliary requirements."){
    attempt=null;message=reason;auxGesture=null;renderAll();
  }

  function renderMaster(){
    const input=$("crew-master-difficulty"),value=$("crew-master-difficulty-value"),summary=$("crew-master-difficulty-summary"),state=$("crew-master-difficulty-state");
    if(input){input.value=String(configuredDifficulty);input.disabled=Boolean(attempt&&coreAttemptActive());}
    if(value)value.textContent=`+${configuredDifficulty}`;
    if(summary)summary.textContent=configuredDifficulty?`${configuredDifficulty} Panel II control${configuredDifficulty===1?"":"s"} added to the selected procedure`:`Primary procedure + authorization only`;
    if(state)state.textContent=attempt?`Attempt locked at +${attempt.difficulty} · recommended +${attempt.recommendedDifficulty}`:`Selected procedure recommends +${activeRecommendedDifficulty()} · optional +1–+5`;
  }

  function mechanismBody(control){
    const bodies={
      "vector-vane":`<div class="aux-vector-vane"><i class="vane left"></i><i class="vane right"></i><b class="vector-spindle"></b><span class="vector-reference"></span></div>`,
      "damping-flywheel":`<div class="aux-damping-flywheel"><i class="flywheel-rim"></i><i class="flywheel-spoke a"></i><i class="flywheel-spoke b"></i><i class="flywheel-spoke c"></i><b class="friction-shoe"></b></div>`,
      "pulse-rack":`<div class="aux-pulse-rack"><div class="rack-teeth">${"<i></i>".repeat(13)}</div><b class="pulse-carriage"><span></span></b><em class="pulse-stop left"></em><em class="pulse-stop right"></em></div>`,
      "proximity-iris":`<div class="aux-proximity-iris"><i class="iris-ring r1"></i><i class="iris-ring r2"></i><i class="iris-ring r3"></i><b class="iris-aperture"></b><span class="iris-sweep"></span></div>`,
      "burn-chronometer":`<div class="aux-burn-chronometer"><i class="chrono-face"></i><b class="chrono-hand"></b><span class="chrono-cam"></span><em class="chrono-zero"></em></div>`,
      "star-clock":`<div class="aux-star-clock"><i class="star-orbit outer"></i><i class="star-orbit inner"></i><b class="star-pointer"></b><span class="star fixed s1">✦</span><span class="star fixed s2">·</span><span class="star fixed s3">✧</span></div>`,
      "confidence-aperture":`<div class="aux-confidence-aperture"><i class="confidence-fan"></i><b class="confidence-shutter"></b><span class="confidence-axis"></span></div>`,
      "cycle-counter":`<div class="aux-cycle-counter"><span class="counter-window w1"><i></i></span><span class="counter-window w2"><i></i></span><span class="counter-window w3"><i></i></span><b class="counter-ratchet"></b></div>`,
      "gravity-caliper":`<div class="aux-gravity-caliper"><span class="caliper-rule"></span><i class="caliper-jaw left"></i><i class="caliper-jaw right"></i><b class="gravity-well"></b></div>`,
      "intercept-arm":`<div class="aux-intercept-arm"><i class="plot-rings"></i><b class="plot-arm"></b><span class="plot-target"></span><em class="plot-origin"></em></div>`,
      "lead-micrometer":`<div class="aux-lead-micrometer"><i class="micro-bed"></i><b class="micro-carriage"></b><span class="micro-thimble"></span><em class="micro-reticle">＋</em></div>`,
      "fuse-bolt":`<div class="aux-fuse-bolt"><i class="bolt-slot"></i><b class="bolt-body"><span></span></b><em class="bolt-safety top"></em><em class="bolt-safety bottom"></em></div>`,
      "salvo-cam":`<div class="aux-salvo-cam"><i class="cam-wheel"></i>${"<span class=cam-lobe></span>".repeat(5)}<b class="cam-follower"></b></div>`,
      "filter-shutters":`<div class="aux-filter-shutters">${"<i class=filter-blade></i>".repeat(7)}<b class="filter-linkage"></b></div>`,
      "terminal-clamp":`<div class="aux-terminal-clamp"><i class="clamp-rail"></i><b class="clamp-jaw left"></b><b class="clamp-jaw right"></b><span class="clamp-segments">${"<em></em>".repeat(8)}</span></div>`,
      "centrifugal-governor":`<div class="aux-governor"><i class="gov-spindle"></i><b class="gov-collar"></b><span class="gov-arm left"></span><span class="gov-arm right"></span><em class="gov-weight left"></em><em class="gov-weight right"></em></div>`,
      "coolant-pistons":`<div class="aux-coolant-pistons"><span class="coolant-header"></span><i class="piston p1"></i><i class="piston p2"></i><i class="piston p3"></i><b class="coolant-crosshead"></b></div>`,
      "synchroscope":`<div class="aux-synchroscope"><i class="sync-face"></i><b class="sync-needle"></b><span class="sync-mark slow">S</span><span class="sync-mark fast">F</span></div>`,
      "choke-gap":`<div class="aux-choke-gap"><i class="choke-coil left"></i><i class="choke-coil right"></i><b class="choke-core left"></b><b class="choke-core right"></b><span class="flux-gap"></span></div>`,
      "phase-coupler":`<div class="aux-phase-coupler"><i class="phase-ring"></i><b class="phase-rotor"></b><span class="phase-lamp l1"></span><span class="phase-lamp l2"></span><span class="phase-lamp l3"></span></div>`,
      "doppler-comb":`<div class="aux-doppler-comb"><i class="comb-spine"></i>${"<span class=comb-tooth></span>".repeat(11)}<b class="doppler-window"></b></div>`,
      "spectral-slit":`<div class="aux-spectral-slit"><i class="slit-spectrum"></i><b class="slit-jaw left"></b><b class="slit-jaw right"></b><span class="slit-beam"></span></div>`,
      "baseline-balance":`<div class="aux-baseline-balance"><i class="balance-pivot"></i><b class="balance-beam"></b><span class="balance-pan left"></span><span class="balance-pan right"></span><em class="balance-zero"></em></div>`,
      "parallax-boom":`<div class="aux-parallax-boom"><i class="boom-base"></i><b class="boom-stage stage1"></b><b class="boom-stage stage2"></b><span class="optic left"></span><span class="optic right"></span></div>`,
      "discriminator-gate":`<div class="aux-discriminator-gate"><i class="waterfall">${"<span></span>".repeat(8)}</i><b class="threshold-bar"></b><em class="threshold-mask"></em></div>`,
      "envelope-jaws":`<div class="aux-envelope-jaws"><i class="carrier-trace"></i><b class="envelope-jaw top"></b><b class="envelope-jaw bottom"></b><span class="envelope-center"></span></div>`,
      "timing-escapement":`<div class="aux-timing-escapement"><i class="escape-wheel"></i><b class="escape-fork"></b><span class="escape-pallet left"></span><span class="escape-pallet right"></span></div>`,
      "code-tape":`<div class="aux-code-tape"><i class="tape-strip">${"<span></span>".repeat(15)}</i><b class="tape-gate"></b><em class="tape-reader"></em></div>`,
      "phasing-carriage":`<div class="aux-phasing-carriage"><i class="phase-rail"></i><b class="phase-carriage"></b><span class="antenna a1"></span><span class="antenna a2"></span><em class="phase-wave"></em></div>`,
      "interleave-cascade":`<div class="aux-interleave-cascade">${"<i class=cassette></i>".repeat(6)}<b class="cascade-index"></b><span class="cascade-chute"></span></div>`
    };
    return bodies[control.mechanism]||`<div class="aux-unknown-mechanism"><b></b></div>`;
  }

  function mechanismStyle(control,value){const f=fraction(control,value),signed=f*2-1,angle=-132+264*f;return `--aux-frac:${f.toFixed(5)};--aux-inv:${(1-f).toFixed(5)};--aux-signed:${signed.toFixed(5)};--aux-angle:${angle.toFixed(2)}deg`;}
  function mechanismMarkup(control,value,enabled){return `<div class="exo-aux-mechanism mech-${control.mechanism}" data-aux-actuator="${control.id}" data-gesture="${control.gesture||"x"}" tabindex="${enabled?0:-1}" role="slider" aria-disabled="${enabled?"false":"true"}" aria-valuemin="${control.min}" aria-valuemax="${control.max}" aria-valuenow="${value}" aria-label="${control.label}" style="${mechanismStyle(control,value)}">${mechanismBody(control)}<small class="mechanism-instruction">${control.gesture==="dial"?"DRAG AROUND / ← →":control.gesture==="y"?"DRAG ↑ ↓ / ↑ ↓":"DRAG ← → / ← →"}</small></div>`;}

  function controlCard(control,index,station,previewRequirements){
    const req=requirementFor(control.id),preview=previewRequirements.find(r=>r.controlId===control.id),activeReq=req||(!attempt?preview:null),required=Boolean(activeReq),satisfied=Boolean(req&&requirementSatisfied(req)),value=values[station][control.id],target=activeReq?formatValue(control,activeReq.target):"—",code=`${STATION_CODES[station]}-AUX-${String(index+1).padStart(2,"0")}`,enabled=Boolean(attempt&&coreAttemptActive()&&attempt.station===station);
    const status=req?(satisfied?"TARGET SET":attempt.touched.has(control.id)?"ADJUST TO TARGET":"MANIPULATION REQUIRED"):required?"REQUIRED ON NEXT BEGIN":"AVAILABLE";
    return `<article class="exo-aux-control aux-slot-${index+1}" data-required="${required}" data-satisfied="${satisfied}" data-aux-control="${control.id}" data-mechanism="${control.mechanism}">
      <header><span>${code}</span><strong>${control.label}</strong><small>${control.discipline||"Auxiliary regulation"}</small><em>${control.hardware}</em></header>
      <div class="exo-aux-readout"><b data-aux-readout>${formatValue(control,value)}</b><small>${required?`TARGET ${target}`:"NO ACTIVE TARGET"}</small></div>
      ${mechanismMarkup(control,value,enabled)}
      <div class="exo-aux-scale"><span>${formatValue(control,control.min)}</span><span>${formatValue(control,quantize(control,(control.min+control.max)/2))}</span><span>${formatValue(control,control.max)}</span></div>
      <div class="exo-aux-control-status">${status}</div>
    </article>`;
  }

  function renderDrawer(){
    const root=$("crew-auxiliary-root");if(!root)return;
    const station=activeStation(),controls=AUXILIARY_CONTROLS[station]||[],meta=STATION_AUX_META[station],preview=requirementPlan(station,activeProcedureId(),configuredDifficulty),requiredCount=attempt?.requirements.length??preview.length,incomplete=attempt?incompleteRequirements().length:requiredCount;
    root.dataset.open=drawerOpen?"true":"false";
    root.dataset.required=requiredCount?"true":"false";
    root.dataset.station=station;
    root.innerHTML=`<button class="exo-aux-handle aux-handle-${station}" type="button" data-aux-toggle aria-expanded="${drawerOpen}">
      <span><b>PANEL II · ${meta.title.toUpperCase()}</b><small>${STATION_CODES[station]} · ${requiredCount} required @ level +${attempt?.difficulty??configuredDifficulty} · REC +${attempt?.recommendedDifficulty??activeRecommendedDifficulty()}${attempt?` · ${incomplete} remaining`:""}</small></span><i>${drawerOpen?"▼ CLOSE":"▲ OPEN"}</i>
    </button>
    <section class="exo-aux-drawer aux-drawer-${station}" aria-hidden="${drawerOpen?"false":"true"}">
      <header class="exo-aux-drawer-head"><div><span class="exo-kicker">${meta.subtitle}</span><strong>${meta.title}</strong><p>${meta.note} Panel I remains intact above; these mechanisms are exclusive to this station's auxiliary hardware bank.</p></div><div class="exo-aux-attempt"><b>${attempt?attempt.procedureName:"Preview"}</b><span>${message}</span></div></header>
      <div class="exo-aux-grid aux-grid-${station}">${controls.map((c,i)=>controlCard(c,i,station,preview)).join("")}</div>
      <footer><span>${attempt?`${attempt.history.length} distinct auxiliary control${attempt.history.length===1?"":"s"} recorded this attempt`:"Targets shown are a preview until Begin Procedure is pressed."}</span><b>${attempt?(allRequirementsSatisfied()?"AUXILIARY REQUIREMENTS COMPLETE":`${incomplete} AUXILIARY REQUIREMENT${incomplete===1?"":"S"} OUTSTANDING`):`MASTER +${configuredDifficulty}`}</b></footer>
    </section>`;
  }

  function renderAll(){renderMaster();renderDrawer();}

  function updateMechanismCard(card,control,value){
    if(!card)return;const f=fraction(control,value),signed=f*2-1,angle=-132+264*f;
    card.style.setProperty("--aux-frac",f.toFixed(5));card.style.setProperty("--aux-inv",(1-f).toFixed(5));card.style.setProperty("--aux-signed",signed.toFixed(5));card.style.setProperty("--aux-angle",`${angle.toFixed(2)}deg`);
    const mechanism=card.querySelector("[data-aux-actuator]");if(mechanism){mechanism.style.cssText=mechanismStyle(control,value);mechanism.setAttribute("aria-valuenow",String(value));}
    const readout=card.querySelector("[data-aux-readout]");if(readout)readout.textContent=formatValue(control,value);
  }

  function recordAuxiliaryAction(station,control,req){
    const value=values[station][control.id],controls=AUXILIARY_CONTROLS[station]||[],index=controls.indexOf(control)+1,code=req?.code||`${STATION_CODES[station]}-AUX-${String(index).padStart(2,"0")}`,formatted=formatValue(control,value),entry={controlId:control.id,value,time:Date.now(),required:Boolean(req),satisfied:Boolean(req&&isAtTarget(req)),mechanism:control.mechanism,code,label:control.label,formatted};
    const existing=attempt.history.find(item=>item.controlId===control.id);
    if(existing)Object.assign(existing,entry);else attempt.history.push(entry);
    document.dispatchEvent(new CustomEvent("exo:auxiliary-input",{detail:{station,controlId:control.id,code,label:`PANEL II · ${code} ${control.label}: ${formatted}`,value:formatted,required:entry.required,satisfied:entry.satisfied}}));
  }

  function commitAuxControl(station,control,value){
    values[station][control.id]=quantize(control,value);
    if(!(attempt&&attempt.station===station&&coreAttemptActive())){renderDrawer();return;}
    attempt.touched.add(control.id);const req=requirementFor(control.id);recordAuxiliaryAction(station,control,req);
    window.EXO_CONTROL_AUDIO?.play?.("servo-set",{seed:`aux:${station}:${control.mechanism}:${control.id}`,intensity:.74});
    message=req?(isAtTarget(req)?`${req.code} ${control.label} accepted at ${formatValue(control,values[station][control.id])}.`:`${req.code} ${control.label} set to ${formatValue(control,values[station][control.id])}; target remains ${formatValue(control,req.target)}.`):`${control.hardware} adjusted; this mechanism is not required by the active difficulty plan.`;
    renderDrawer();
  }

  function beginAuxGesture(e){
    const actuator=e.target.closest("[data-aux-actuator]");if(!actuator||actuator.getAttribute("aria-disabled")==="true")return;
    const station=activeStation(),control=controlFor(station,actuator.dataset.auxActuator);if(!control)return;
    const card=actuator.closest(".exo-aux-control"),value=values[station][control.id],rect=actuator.getBoundingClientRect();
    auxGesture={pointerId:e.pointerId,station,control,card,actuator,startValue:value,startX:e.clientX,startY:e.clientY,lastValue:value,centerX:rect.left+rect.width/2,centerY:rect.top+rect.height/2};
    actuator.setPointerCapture?.(e.pointerId);actuator.dataset.dragging="true";e.preventDefault();
  }

  function moveAuxGesture(e){
    const g=auxGesture;if(!g||g.pointerId!==e.pointerId)return;if(e.cancelable)e.preventDefault();
    const c=g.control,gesture=c.gesture||"x";let delta,travel;
    if(gesture==="y"){delta=-(e.clientY-g.startY);travel=145;}
    else if(gesture==="dial"){delta=(e.clientX-g.startX)-(e.clientY-g.startY)*.45;travel=190;}
    else{delta=e.clientX-g.startX;travel=175;}
    const value=quantize(c,g.startValue+delta/travel*(c.max-c.min));if(value===g.lastValue)return;g.lastValue=value;values[g.station][c.id]=value;updateMechanismCard(g.card,c,value);
  }

  function endAuxGesture(e,cancelled=false){
    const g=auxGesture;if(!g||g.pointerId!==e.pointerId)return;auxGesture=null;delete g.actuator.dataset.dragging;
    if(cancelled){values[g.station][g.control.id]=g.startValue;renderDrawer();return;}
    if(g.lastValue===g.startValue){renderDrawer();return;}
    commitAuxControl(g.station,g.control,g.lastValue);
  }

  function handleAuxKeyboard(e){
    const actuator=e.target.closest("[data-aux-actuator]");if(!actuator||actuator.getAttribute("aria-disabled")==="true")return;
    const station=activeStation(),control=controlFor(station,actuator.dataset.auxActuator);if(!control)return;
    const current=values[station][control.id],step=(control.step||1)*(e.shiftKey?5:1);let next=null;
    if(["ArrowRight","ArrowUp"].includes(e.key))next=current+step;else if(["ArrowLeft","ArrowDown"].includes(e.key))next=current-step;else if(e.key==="Home")next=control.min;else if(e.key==="End")next=control.max;else return;
    e.preventDefault();next=quantize(control,next);if(next===current)return;commitAuxControl(station,control,next);
  }

  function blockAuthorization(e){
    if(!coreAttemptActive())return false;
    if(!attempt)beginAttempt();
    if(!attempt||attempt.difficulty===0)return false;
    const incomplete=incompleteRequirements();if(!incomplete.length)return false;
    e.preventDefault();e.stopImmediatePropagation();drawerOpen=true;
    const first=incomplete[0];message=`AUTHORIZATION HELD: ${incomplete.length} Panel II requirement${incomplete.length===1?"":"s"} incomplete. Next: ${first.code} ${first.control.label} → ${formatValue(first.control,first.target)}.`;
    renderAll();
    const root=$("crew-auxiliary-root");root?.classList.remove("exo-aux-alarm");requestAnimationFrame(()=>root?.classList.add("exo-aux-alarm"));
    return true;
  }

  function bind(){
    $("crew-master-difficulty")?.addEventListener("input",e=>{if(attempt&&coreAttemptActive())return;configuredDifficulty=clamp(Math.round(Number(e.target.value)),0,MAX_DIFFICULTY);renderAll();});
    const root=$("crew-auxiliary-root");
    root?.addEventListener("click",e=>{const toggle=e.target.closest("[data-aux-toggle]");if(toggle){drawerOpen=!drawerOpen;renderDrawer();}});
    root?.addEventListener("pointerdown",beginAuxGesture);
    root?.addEventListener("keydown",handleAuxKeyboard);
    document.addEventListener("pointermove",moveAuxGesture,{passive:false});
    document.addEventListener("pointerup",e=>endAuxGesture(e,false));
    document.addEventListener("pointercancel",e=>endAuxGesture(e,true));

    document.addEventListener("click",e=>{
      const begin=e.target.closest("#station-panel [data-procedure-begin]");
      const abort=e.target.closest("#station-panel [data-procedure-abort]");
      const stationTab=e.target.closest("#station-tabs [data-station]");
      const reset=e.target.closest("#crew-scenario-reset");
      const auth=e.target.closest("#station-panel [data-proc-input]");
      const authToken=auth?.dataset.procInput;
      if(auth&&AUTH_TOKENS.has(authToken)&&blockAuthorization(e))return;
      if(begin){queueMicrotask(beginAttempt);return;}
      if(abort){queueMicrotask(()=>clearAttempt("Primary procedure aborted; Panel II attempt requirements cleared."));return;}
      if(stationTab){queueMicrotask(()=>{attempt=null;auxGesture=null;drawerOpen=false;message="Station changed. Begin a primary procedure to arm this station's Panel II requirements.";renderAll();});return;}
      if(reset){queueMicrotask(()=>{configuredDifficulty=0;values=initialValues();attempt=null;auxGesture=null;drawerOpen=false;message="Human baseline reset; Panel II returned to nominal mid-range settings.";renderAll();});return;}
      if(authToken==="execute"){setTimeout(()=>{if(!coreAttemptActive())clearAttempt("Command executed; Panel II is standing by for the next procedure.");},0);}
    },true);

    document.addEventListener("change",e=>{
      if(e.target.closest("#station-panel [data-procedure-select]")){queueMicrotask(()=>{attempt=null;auxGesture=null;message="Procedure selection changed. New auxiliary targets will arm on Begin Procedure.";renderAll();});}
    },true);
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&drawerOpen&&!e.target.closest("[data-aux-actuator]")){drawerOpen=false;renderDrawer();}});
  }

  document.addEventListener("DOMContentLoaded",()=>{renderAll();bind();});
  window.EXO_AUXILIARY_PANEL=Object.freeze({controls:AUXILIARY_CONTROLS,meta:STATION_AUX_META,getDifficulty:()=>configuredDifficulty,getValues:()=>structuredClone(values)});
})();
