(() => {
  "use strict";

  const MAX_DIFFICULTY = 5;
  const AUTH_TOKENS = new Set(["auth-key-insert", "auth-key-arm", "auth-shield-open", "execute"]);
  const STATION_CODES = Object.freeze({helm:"HEL",navigation:"NAV",gunnery:"GUN",engineering:"ENG",science:"SCI",comms:"COM"});
  const $ = id => document.getElementById(id);
  const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
  const round = (v,d=0) => Number(v.toFixed(d));
  const spec = (id,label,min,max,step,unit="",opts={}) => Object.freeze({id,label,min,max,step,unit,...opts});

  const AUXILIARY_CONTROLS = Object.freeze({
    helm:Object.freeze([
      spec("vector-bias","Thrust vector bias",-15,15,1,"°",{signed:true,discipline:"Vector trim"}),
      spec("damping-gain","Inertial damping gain",0,100,5,"%",{discipline:"Flight stabilization"}),
      spec("rcs-pulse","RCS pulse width",10,500,10,"ms",{discipline:"Reaction-control timing"}),
      spec("collision-envelope","Proximity collision envelope",0,10,.5,"km",{discipline:"Proximity protection"}),
      spec("cutoff-lead","Burn cutoff lead",0,30,1,"s",{discipline:"Drive cutoff timing"})
    ]),
    navigation:Object.freeze([
      spec("epoch-offset","Ephemeris epoch offset",-300,300,10,"s",{signed:true,discipline:"Reference timing"}),
      spec("covariance-gate","Solution covariance gate",0,100,5,"%",{discipline:"Solution confidence"}),
      spec("solver-iterations","Solver iteration limit",1,64,1,"cycles",{discipline:"Trajectory solver"}),
      spec("exclusion-radius","Gravity-well exclusion radius",0,1000,25,"km",{discipline:"Hazard envelope"}),
      spec("intercept-lead","Intercept lead time",0,180,5,"s",{discipline:"Intercept geometry"})
    ]),
    gunnery:Object.freeze([
      spec("lead-bias","Lead solution bias",-5,5,.1,"mrad",{signed:true,discipline:"Fire-control correction"}),
      spec("fuse-delay","Fuse / trigger delay",0,20,.5,"ms",{discipline:"Terminal timing"}),
      spec("salvo-spacing","Salvo spacing",.1,5,.1,"s",{discipline:"Battery sequencing"}),
      spec("track-filter","Track filter gain",0,100,5,"%",{discipline:"Track conditioning"}),
      spec("terminal-budget","Terminal correction budget",0,100,5,"%",{discipline:"Guidance authority"})
    ]),
    engineering:Object.freeze([
      spec("governor-bias","Reactor governor bias",-10,10,.5,"%",{signed:true,discipline:"Reactor regulation"}),
      spec("coolant-bypass","Coolant bypass fraction",0,100,5,"%",{discipline:"Thermal routing"}),
      spec("phase-trim","Bus phase trim",-10,10,.5,"°",{signed:true,discipline:"Distribution phasing"}),
      spec("ripple-rejection","Rectifier ripple rejection",0,100,5,"%",{discipline:"Power conditioning"}),
      spec("inverter-sync","Inverter synchronization phase",0,360,5,"°",{discipline:"Inverter synchronization"})
    ]),
    science:Object.freeze([
      spec("doppler-window","Doppler search window",-50,50,1,"km/s",{signed:true,discipline:"Velocity discrimination"}),
      spec("spectral-bin","Spectral bin width",1,100,1,"nm",{discipline:"Spectral resolution"}),
      spec("baseline-sub","Baseline subtraction",0,100,5,"%",{discipline:"Background rejection"}),
      spec("parallax-baseline","Parallax baseline",1,1000,10,"m",{discipline:"Geometric ranging"}),
      spec("return-threshold","Return discrimination threshold",0,100,5,"%",{discipline:"Signal discrimination"})
    ]),
    comms:Object.freeze([
      spec("modulation-depth","Modulation depth",0,100,5,"%",{discipline:"Carrier modulation"}),
      spec("symbol-rate","Symbol rate",1,100,1,"ksym/s",{discipline:"Link timing"}),
      spec("fec-overhead","Error-correction overhead",0,80,5,"%",{discipline:"Forward error correction"}),
      spec("beam-offset","Beam steering offset",-30,30,1,"°",{signed:true,discipline:"Directional steering"}),
      spec("interleave-depth","Interleave depth",1,64,1,"frames",{discipline:"Burst resilience"})
    ])
  });

  const initialValues = () => Object.fromEntries(Object.entries(AUXILIARY_CONTROLS).map(([station,controls]) => [station,Object.fromEntries(controls.map(c => [c.id,quantize(c,(c.min+c.max)/2)]))]));
  let values = initialValues();
  let configuredDifficulty = 0;
  let drawerOpen = false;
  let attempt = null;
  let message = "Panel II standing by. Begin a primary procedure to arm auxiliary requirements.";

  function digits(c){const s=String(c.step ?? 1);return s.includes(".") ? s.length-s.indexOf(".")-1 : 0;}
  function quantize(c,value){const step=c.step||1,steps=Math.round((clamp(Number(value),c.min,c.max)-c.min)/step);return round(clamp(c.min+steps*step,c.min,c.max),digits(c));}
  function formatValue(c,value){const v=quantize(c,value),sign=c.signed&&v>0?"+":"",sep=c.unit==="°"||!c.unit?"":" ";return `${sign}${v}${c.unit?`${sep}${c.unit}`:""}`;}
  function stableHash(text){let h=2166136261;for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function activeStation(){return document.querySelector(".exo-station-tab[aria-selected='true']")?.dataset.station || "helm";}
  function activeProcedureId(){return document.querySelector("#station-panel [data-procedure-select]")?.value || "unselected";}
  function activeProcedureName(){const select=document.querySelector("#station-panel [data-procedure-select]");return select?.selectedOptions?.[0]?.textContent?.replace(/\s+·\s+\d+\s+canonical inputs.*$/i,"").trim() || "Selected procedure";}
  function coreAttemptActive(){const abort=document.querySelector("#station-panel [data-procedure-abort]");return Boolean(abort && !abort.disabled);}

  function requirementPlan(station,procedureId,difficulty){
    const controls=AUXILIARY_CONTROLS[station]||[],count=Math.min(clamp(Math.round(difficulty),0,MAX_DIFFICULTY),controls.length);
    if(!count)return [];
    const offset=stableHash(`${station}:${procedureId}:aux-order`)%controls.length;
    const ordered=[...controls.slice(offset),...controls.slice(0,offset)];
    return ordered.slice(0,count).map(control => {
      const slots=Math.max(1,Math.floor((control.max-control.min)/(control.step||1))+1);
      const slot=stableHash(`${station}:${procedureId}:${control.id}:aux-target`)%slots;
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
    attempt={station,procedureId,procedureName:activeProcedureName(),difficulty,requirements:requirementPlan(station,procedureId,difficulty),touched:new Set(),history:[]};
    message=difficulty?`Panel II armed: ${difficulty} auxiliary control${difficulty===1?"":"s"} must be deliberately set before authorization.`:"Master +0: no Panel II manipulation required for this procedure.";
    renderAll();
  }
  function clearAttempt(reason="Panel II standing by. Begin a primary procedure to arm auxiliary requirements."){
    attempt=null;message=reason;renderAll();
  }

  function renderMaster(){
    const input=$("crew-master-difficulty"),value=$("crew-master-difficulty-value"),summary=$("crew-master-difficulty-summary"),state=$("crew-master-difficulty-state");
    if(input){input.value=String(configuredDifficulty);input.disabled=Boolean(attempt&&coreAttemptActive());}
    if(value)value.textContent=`+${configuredDifficulty}`;
    if(summary)summary.textContent=configuredDifficulty?`${configuredDifficulty} auxiliary control${configuredDifficulty===1?"":"s"} added to every primary procedure`:`Primary procedure + authorization only`;
    if(state)state.textContent=attempt?`Attempt locked at +${attempt.difficulty}`:"Changes apply to the next procedure";
  }

  function controlCard(control,index,station,previewRequirements){
    const req=requirementFor(control.id),preview=previewRequirements.find(r=>r.controlId===control.id),activeReq=req||(!attempt?preview:null),required=Boolean(activeReq),satisfied=Boolean(req&&requirementSatisfied(req)),value=values[station][control.id],target=activeReq?formatValue(control,activeReq.target):"—",code=`${STATION_CODES[station]}-AUX-${String(index+1).padStart(2,"0")}`;
    const status=req?(satisfied?"TARGET SET":attempt.touched.has(control.id)?"ADJUST TO TARGET":"MANIPULATION REQUIRED"):required?"REQUIRED ON NEXT BEGIN":"AVAILABLE";
    return `<article class="exo-aux-control" data-required="${required}" data-satisfied="${satisfied}" data-aux-control="${control.id}">
      <header><span>${code}</span><strong>${control.label}</strong><small>${control.discipline||"Auxiliary regulation"}</small></header>
      <div class="exo-aux-readout"><b data-aux-readout>${formatValue(control,value)}</b><small>${required?`TARGET ${target}`:"NO ACTIVE TARGET"}</small></div>
      <input data-aux-range="${control.id}" type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${value}" ${attempt&&coreAttemptActive()?"":"disabled"}>
      <div class="exo-aux-scale"><span>${formatValue(control,control.min)}</span><span>${formatValue(control,quantize(control,(control.min+control.max)/2))}</span><span>${formatValue(control,control.max)}</span></div>
      <div class="exo-aux-control-status">${status}</div>
    </article>`;
  }

  function renderDrawer(){
    const root=$("crew-auxiliary-root");if(!root)return;
    const station=activeStation(),controls=AUXILIARY_CONTROLS[station]||[],preview=requirementPlan(station,activeProcedureId(),configuredDifficulty),requiredCount=attempt?.requirements.length??preview.length,incomplete=attempt?incompleteRequirements().length:requiredCount;
    root.dataset.open=drawerOpen?"true":"false";
    root.dataset.required=requiredCount?"true":"false";
    root.innerHTML=`<button class="exo-aux-handle" type="button" data-aux-toggle aria-expanded="${drawerOpen}">
      <span><b>PANEL II · AUXILIARY CONTROLS</b><small>${STATION_CODES[station]} · ${requiredCount} required @ master +${attempt?.difficulty??configuredDifficulty}${attempt?` · ${incomplete} remaining`:""}</small></span><i>${drawerOpen?"▼ CLOSE":"▲ OPEN"}</i>
    </button>
    <section class="exo-aux-drawer" aria-hidden="${drawerOpen?"false":"true"}">
      <header class="exo-aux-drawer-head"><div><span class="exo-kicker">Independent secondary hardware bank</span><strong>${station.replace(/^./,c=>c.toUpperCase())} auxiliary console</strong><p>The primary watchstation remains intact underneath this panel. Master difficulty adds only these secondary controls; it never removes or relocates Panel I hardware.</p></div><div class="exo-aux-attempt"><b>${attempt?attempt.procedureName:"Preview"}</b><span>${message}</span></div></header>
      <div class="exo-aux-grid">${controls.map((c,i)=>controlCard(c,i,station,preview)).join("")}</div>
      <footer><span>${attempt?`${attempt.history.length} auxiliary manipulation${attempt.history.length===1?"":"s"} recorded this attempt`:"Targets shown are a preview until Begin Procedure is pressed."}</span><b>${attempt?(allRequirementsSatisfied()?"AUXILIARY REQUIREMENTS COMPLETE":`${incomplete} AUXILIARY REQUIREMENT${incomplete===1?"":"S"} OUTSTANDING`):`MASTER +${configuredDifficulty}`}</b></footer>
    </section>`;
  }

  function renderAll(){renderMaster();renderDrawer();}

  function handleAuxInput(input,commit=false){
    const station=activeStation(),control=(AUXILIARY_CONTROLS[station]||[]).find(c=>c.id===input.dataset.auxRange);if(!control)return;
    const value=quantize(control,input.value);values[station][control.id]=value;
    const card=input.closest(".exo-aux-control"),readout=card?.querySelector("[data-aux-readout]");if(readout)readout.textContent=formatValue(control,value);
    if(commit&&attempt&&attempt.station===station&&coreAttemptActive()){
      attempt.touched.add(control.id);const req=requirementFor(control.id);attempt.history.push({controlId:control.id,value,time:Date.now(),required:Boolean(req),satisfied:Boolean(req&&isAtTarget(req))});
      window.EXO_CONTROL_AUDIO?.play?.("servo-set",{seed:`aux:${station}:${control.id}`,intensity:.68});
      message=req?(isAtTarget(req)?`${req.code} ${control.label} accepted at ${formatValue(control,value)}.`:`${req.code} ${control.label} set to ${formatValue(control,value)}; target remains ${formatValue(control,req.target)}.`):`${control.label} adjusted; this control is not required by the active difficulty plan.`;
      renderDrawer();
    }
  }

  function blockAuthorization(e,token){
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
    $("crew-auxiliary-root")?.addEventListener("click",e=>{const toggle=e.target.closest("[data-aux-toggle]");if(toggle){drawerOpen=!drawerOpen;renderDrawer();}});
    $("crew-auxiliary-root")?.addEventListener("input",e=>{const input=e.target.closest("[data-aux-range]");if(input)handleAuxInput(input,false);});
    $("crew-auxiliary-root")?.addEventListener("change",e=>{const input=e.target.closest("[data-aux-range]");if(input)handleAuxInput(input,true);});

    document.addEventListener("click",e=>{
      const auth=e.target.closest("#station-panel [data-proc-input]");if(auth&&AUTH_TOKENS.has(auth.dataset.procInput)){if(blockAuthorization(e,auth.dataset.procInput))return;}
    },true);

    document.addEventListener("click",e=>{
      if(e.target.closest("#station-panel [data-procedure-begin]")){queueMicrotask(beginAttempt);return;}
      if(e.target.closest("#station-panel [data-procedure-abort]")){queueMicrotask(()=>clearAttempt("Primary procedure aborted; Panel II attempt requirements cleared."));return;}
      if(e.target.closest("#station-tabs [data-station]")){queueMicrotask(()=>{attempt=null;drawerOpen=false;message="Station changed. Begin a primary procedure to arm this station's Panel II requirements.";renderAll();});return;}
      if(e.target.closest("#crew-scenario-reset")){queueMicrotask(()=>{configuredDifficulty=0;values=initialValues();attempt=null;drawerOpen=false;message="Human baseline reset; Panel II returned to nominal mid-range settings.";renderAll();});return;}
      const execute=e.target.closest("#station-panel [data-proc-input='execute']");if(execute){setTimeout(()=>{if(!coreAttemptActive())clearAttempt("Command executed; Panel II is standing by for the next procedure.");},0);}
    });

    document.addEventListener("change",e=>{if(e.target.closest("#station-panel [data-procedure-select]")){queueMicrotask(()=>{attempt=null;message="Procedure selection changed. New auxiliary targets will arm on Begin Procedure.";renderAll();});}});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&drawerOpen){drawerOpen=false;renderDrawer();}});
  }

  document.addEventListener("DOMContentLoaded",()=>{renderAll();bind();});
  window.EXO_AUXILIARY_PANEL=Object.freeze({controls:AUXILIARY_CONTROLS,getDifficulty:()=>configuredDifficulty,getValues:()=>structuredClone(values)});
})();
