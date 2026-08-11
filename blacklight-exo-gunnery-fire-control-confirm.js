(() => {
  "use strict";
  if (window.EXO_GUN_FCF07) return;

  const OPTIONS=Object.freeze({
    targeting:Object.freeze(["PRECISION TRACK","EMISSION HOME","COOPERATIVE DESIGNATION","COUNTER-MANEUVER","SUBSYSTEM SELECT","AREA INTERDICTION"]),
    approach:Object.freeze(["DIRECT INTERCEPT","PLANE-OFFSET ARC","LOW-SIGNATURE COAST","DOGLEG OFFSET","SPIRAL WEAVE","DELAYED WAKE","COOPERATIVE PINCER"]),
    terminal:Object.freeze(["CENTER-MASS STRIKE","PROXIMITY BURST","PENETRATE / DELAY","SUBSYSTEM SPEAR","FLY-BY FRAGMENT","COUNTER-EVASION WEAVE","REACQUIRE LOOP"]),
    warhead:Object.freeze(["INERT KINETIC","FRAGMENTATION","SHAPED PLASMA","DISRUPTOR PULSE","BREACH PENETRATOR","SENSOR / MARKER"]),
    body:Object.freeze(["LIGHT INTERCEPTOR","STANDARD STRIKE","HEAVY PENETRATOR","LONG-ENDURANCE BUS","LOW-OBSERVABLE SHROUD","MULTI-STAGE CARRIER"]),
    propulsion:Object.freeze(["SPRINT MOTOR","SUSTAINER DRIVE","DUAL-PULSE DRIVE","VECTOR THRUSTER PACK","SILENT COAST STAGE","INTERCEPTOR DRIVE"]),
    power:Object.freeze(["THERMAL BATTERY","CAPACITOR BANK","MICROTURBINE GENERATOR","FUEL-CELL STACK","ISOTOPE RESERVE","HYBRID DUAL-SOURCE"])
  });
  const LABELS=Object.freeze({targeting:"TARGET",approach:"APPROACH",terminal:"TERMINAL",warhead:"WARHEAD",body:"BODY / BUS",propulsion:"PROPULSION",power:"POWER"});
  const COIL_MUNITIONS=Object.freeze([
    Object.freeze({name:"INERT KINETIC",code:"IK-12",subtitle:"SOLID DENSE-MASS SLUG",use:"GENERAL KINETIC STRIKE",preview:"kinetic"}),
    Object.freeze({name:"BREACH PENETRATOR",code:"BP-9",subtitle:"HARDENED LONG-ROD CORE",use:"ARMORED HULL / DEEP BREACH",preview:"penetrator"}),
    Object.freeze({name:"FRAGMENTATION",code:"FG-4",subtitle:"PRE-FRAGMENTED CASING",use:"SOFT TARGET / AREA DAMAGE",preview:"fragment"}),
    Object.freeze({name:"SHAPED PLASMA",code:"SP-7",subtitle:"MAGNETIC LINER WARHEAD",use:"LOCALIZED THERMAL PENETRATION",preview:"plasma"}),
    Object.freeze({name:"DISRUPTOR PULSE",code:"DP-3",subtitle:"FIELD-COUPLED PULSE PACKAGE",use:"SENSORS / ELECTRONICS",preview:"pulse"}),
    Object.freeze({name:"SENSOR / MARKER",code:"SM-2",subtitle:"TELEMETRY / BEACON PACKAGE",use:"DESIGNATION / BATTLESPACE MARKING",preview:"marker"})
  ]);
  const FIRE_CONTROL_TOPOLOGIES=Object.freeze([
    Object.freeze({id:"vector",label:"VECTOR LEAD",short:"VECTOR",feedback:"STANDARD LEAD RETICLE",tradeoff:"QUICK LOCK · TURN-SENSITIVE",proc:["gun-track-direct","track-mode","DIRECT TRACK"]}),
    Object.freeze({id:"prediction",label:"PATTERN PREDICTION",short:"PREDICT",feedback:"PROBABILITY HEAT ZONE",tradeoff:"COMPUTE DELAY · BETTER EVASION MODEL",proc:["gun-track-guided","track-mode","GUIDED TRACK"]}),
    Object.freeze({id:"cooperative",label:"COOPERATIVE",short:"CO-OP",feedback:"RELAY-FRAMED TARGET",tradeoff:"RELAY DEPENDENT · JAM VULNERABLE",proc:["gun-track-guided","track-mode","GUIDED TRACK"]}),
    Object.freeze({id:"bracket",label:"BRACKET SPREAD",short:"BRACKET",feedback:"SPREAD PATTERN",tradeoff:"HIGH AMMUNITION CONSUMPTION",proc:["gun-track-direct","track-mode","DIRECT TRACK"]})
  ]);
  const BRACKET_PATTERNS=Object.freeze(["CROSS","RING","SEQUENTIAL"]);
  const PDC_MUNITIONS=Object.freeze([
    Object.freeze({name:"30mm AP-K",subtitle:"TUNGSTEN CORE",detail:"PENETRATION",use:"HEAVY TORPEDOES / ARMORED DRONES",preview:"ap",velocity:"2,400"}),
    Object.freeze({name:"30mm HE-FLK",subtitle:"PROXIMITY BURST",detail:"RADIUS 12 m",use:"MISSILE SWARMS / SOFT TARGETS",preview:"flak",velocity:"2,150"}),
    Object.freeze({name:"30mm EMP-S",subtitle:"DISRUPTOR SHRAPNEL",detail:"EM ARC DISPERSION",use:"SMART MUNITIONS / SENSOR DISRUPTION",preview:"emp",velocity:"2,050"})
  ]);
  const PDC_TRACK=Object.freeze([
    Object.freeze({id:"kinematic",label:"KINEMATIC LEAD",sub:"FAST / UNGUIDED",token:"gun-track-direct",state:"DIRECT TRACK"}),
    Object.freeze({id:"threshold",label:"THREAT THRESHOLD",sub:"PRIORITY VECTOR",token:"gun-track-close",state:"CLOSE TRACK"}),
    Object.freeze({id:"cooperative",label:"COOPERATIVE RELAY",sub:"GRID INTERCEPT",token:"gun-track-guided",state:"GUIDED TRACK"})
  ]);
  const PDC_DENSITY_PROC=Object.freeze({
    LOW:Object.freeze(["gun-cap-low","capacitor","LOW"]),
    MED:Object.freeze(["gun-cap-mid","capacitor","READY"]),
    HIGH:Object.freeze(["gun-cap-high","capacitor","MAX"])
  });

  const selection=Object.fromEntries(Object.entries(OPTIONS).map(([id,list])=>[id,Math.floor(list.length/2)]));
  const armament={munition:0,topology:0,bracket:0,guard:"GUARD CLOSED",serial:1};
  const pdc={munition:0,track:1,density:"MED",spread:"CONE",envelope:"PERIMETER",logic:"HARD-LOCK",missiles:true,torpedoes:true,drones:false,serial:1};
  let serial=1,observer=null,queued=false;

  const esc=v=>String(v??"").replace(/[&<>\"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;"}[ch]));
  const wrap=(v,n)=>(v%n+n)%n;
  const current=id=>OPTIONS[id][selection[id]];
  const currentMunition=()=>COIL_MUNITIONS[armament.munition];
  const currentTopology=()=>FIRE_CONTROL_TOPOLOGIES[armament.topology];
  const currentBracket=()=>BRACKET_PATTERNS[armament.bracket];
  const currentPdcMunition=()=>PDC_MUNITIONS[pdc.munition];
  const procAttrs=(token,controlId,state,label)=>`data-proc-input="${token}" data-control-id="${controlId}" data-control-state="${state}" data-proc-label="${esc(label)}"`;

  function activeProcedure(){
    const begin=document.querySelector("#station-panel [data-procedure-begin]");
    return Boolean(begin&&/restart procedure/i.test(begin.textContent||""));
  }
  function optionMarkup(id){return OPTIONS[id].map((v,i)=>`<option value="${i}" ${i===selection[id]?"selected":""}>${esc(v)}</option>`).join("");}
  function summary(){return `${current("targeting")} · ${current("terminal")} · ${current("warhead")}`;}
  function fcfMarkup(){
    const armed=activeProcedure();
    const fields=Object.keys(OPTIONS).map(id=>`<label class="exo-fcf07-field"><span>${LABELS[id]}</span><select data-fcf07-select="${id}">${optionMarkup(id)}</select></label>`).join("");
    return `<span class="exo-device-label"><b class="exo-device-code">GUN-FCF-07</b><span> · FIRE CONTROL CONFIRM</span></span>
      <div class="exo-fcf07-head"><span>MUNITION PROGRAM / SLOT ${String(serial).padStart(2,"0")}</span><b>${armed?"PROCEDURE LIVE":"LOCAL SETUP"}</b></div>
      <div class="exo-fcf07-grid">${fields}</div>
      <div class="exo-fcf07-summary"><small>PROGRAM</small><b>${esc(summary())}</b></div>
      <div class="exo-fcf07-actions">
        <button type="button" ${procAttrs("gun-track-confirm","gun-confirms","TRACK CONFIRMED","GUN-FCF-07 · FIRE CONTROL CONFIRM: PROGRAM VALIDATED")}>VALIDATE</button>
        <button type="button" ${procAttrs("gun-weapons-ack","gun-confirms","ACKNOWLEDGED","GUN-FCF-07 · FIRE CONTROL CONFIRM: PROGRAM LOADED / ACKNOWLEDGED")}>LOAD / ACK</button>
      </div>`;
  }

  function coilPreviewSvg(type){
    if(type==="penetrator")return `<svg viewBox="0 0 160 68"><path class="round-body" d="M18 28h72l24 6-24 6H18z"/><path class="round-core" d="M34 31h66l13 3-13 3H34z"/><path class="vector" d="M118 34h28m-8-6 8 6-8 6"/></svg>`;
    if(type==="fragment")return `<svg viewBox="0 0 160 68"><circle class="round-body" cx="72" cy="34" r="15"/><path class="burst" d="M72 7v13M72 48v13M45 34h13M86 34h13M53 15l9 10M82 43l10 10M53 53l9-10M82 25l10-10"/><circle class="round-core" cx="72" cy="34" r="5"/></svg>`;
    if(type==="plasma")return `<svg viewBox="0 0 160 68"><ellipse class="round-body" cx="73" cy="34" rx="29" ry="14"/><path class="burst" d="M44 34c14-21 44-21 58 0-14 21-44 21-58 0zM55 34c9-11 25-11 35 0-10 11-26 11-35 0z"/><path class="vector" d="M104 34h35m-8-6 8 6-8 6"/></svg>`;
    if(type==="pulse")return `<svg viewBox="0 0 160 68"><rect class="round-body" x="48" y="25" width="38" height="18" rx="8"/><path class="burst" d="M96 18c14 8 14 24 0 32M104 12c22 12 22 32 0 44"/><path class="vector" d="M25 34h20"/></svg>`;
    if(type==="marker")return `<svg viewBox="0 0 160 68"><path class="round-body" d="M44 25h44l12 9-12 9H44z"/><circle class="round-core" cx="69" cy="34" r="5"/><path class="burst" d="M110 20v28M96 34h28M102 26l16 16M118 26l-16 16"/></svg>`;
    return `<svg viewBox="0 0 160 68"><path class="round-body" d="M18 27h76l20 7-20 7H18z"/><path class="vector" d="M116 34h30m-8-6 8 6-8 6"/><path class="vector faint" d="M34 20h46M34 48h46"/></svg>`;
  }
  function munitionDrumMarkup(){
    const m=currentMunition(),prev=COIL_MUNITIONS[wrap(armament.munition-1,COIL_MUNITIONS.length)],next=COIL_MUNITIONS[wrap(armament.munition+1,COIL_MUNITIONS.length)];
    return `<div class="exo-mgd01-ammo-bay">
      <div class="exo-mgd01-wheel"><button type="button" data-mgd-munition-step="-1">▲</button><div class="exo-mgd01-drum"><span>${esc(prev.name)}</span><b>${esc(m.name)}</b><span>${esc(next.name)}</span></div><button type="button" data-mgd-munition-step="1">▼</button></div>
      <div class="exo-mgd01-ammo-preview"><div class="exo-ammo-visual">${coilPreviewSvg(m.preview)}</div><div><small>${esc(m.code)} · CHAMBER PREVIEW</small><b>${esc(m.name)}</b><span>${esc(m.subtitle)}</span><em>${esc(m.use)}</em></div></div>
    </div>`;
  }
  function topologyMarkup(){
    return `<div class="exo-mgd01-topology">${FIRE_CONTROL_TOPOLOGIES.map((it,i)=>{
      const [token,controlId,state]=it.proc;
      return `<button type="button" data-mgd-topology="${i}" aria-pressed="${i===armament.topology}" ${procAttrs(token,controlId,state,`GUN-MGD-01 · FIRE CONTROL TOPOLOGY: ${it.label}`)}><b>${it.short}</b><span>${it.label}</span></button>`;
    }).join("")}</div>`;
  }
  function bracketMarkup(){
    const enabled=currentTopology().id==="bracket";
    return `<div class="exo-mgd01-bracket" data-enabled="${enabled}"><small>BRACKET</small>${BRACKET_PATTERNS.map((x,i)=>`<button type="button" data-mgd-bracket="${i}" aria-pressed="${i===armament.bracket}" ${enabled?"":"disabled"} ${enabled?procAttrs("gun-track-confirm","gun-confirms","TRACK CONFIRMED",`GUN-MGD-01 · BRACKET PATTERN: ${x}`):""}>${x}</button>`).join("")}</div>`;
  }
  function guardStateFromBlock(block){
    if(!block)return armament.guard;
    if(block.querySelector('[data-control-state="GUARD OPEN"][aria-pressed="true"]'))return "GUARD OPEN";
    if(block.querySelector('[data-control-state="GUARD CLOSED"][aria-pressed="true"]'))return "GUARD CLOSED";
    return armament.guard;
  }
  function armamentMarkup(){
    const topology=currentTopology(),open=armament.guard==="GUARD OPEN";
    return `<span class="exo-device-label"><b class="exo-device-code">GUN-MGD-01</b><span> · COIL GUN MASTER ARMAMENT</span></span>
      <div class="exo-mgd01-body">
        <div class="exo-mgd01-status"><b>${esc(currentMunition().name)}</b><span>${topology.feedback} · ${topology.tradeoff}</span></div>
        <div class="exo-mgd01-upper"><div class="exo-mgd01-guard"><small>MASTER GUARD</small><button type="button" aria-pressed="${open}" ${procAttrs("gun-safe-open","weapon-safe","GUARD OPEN","GUN-MGD-01 · MASTER GUARD: LIFT")}>LIFT</button><button type="button" aria-pressed="${!open}" ${procAttrs("gun-safe-close","weapon-safe","GUARD CLOSED","GUN-MGD-01 · MASTER GUARD: SAFE")}>SAFE</button></div>${topologyMarkup()}${bracketMarkup()}</div>
        ${munitionDrumMarkup()}
      </div>`;
  }

  function pdcPreviewSvg(type){
    if(type==="flak")return `<svg viewBox="0 0 130 82"><circle class="pdc-round" cx="45" cy="41" r="8"/><circle class="pdc-burst" cx="82" cy="41" r="22"/><circle class="pdc-burst inner" cx="82" cy="41" r="12"/><path class="pdc-vector" d="M52 41h18"/></svg>`;
    if(type==="emp")return `<svg viewBox="0 0 130 82"><path class="pdc-round" d="M24 34h28l10 7-10 7H24z"/><path class="pdc-arc" d="M69 24q14 17 0 34M79 17q22 24 0 48M91 11q29 30 0 60"/></svg>`;
    return `<svg viewBox="0 0 130 82"><path class="pdc-round" d="M20 34h43l15 7-15 7H20z"/><path class="pdc-core" d="M31 38h35l10 3-10 3H31z"/><path class="pdc-vector" d="M80 41h35m-8-6 8 6-8 6"/></svg>`;
  }
  function pdcAmmoMarkup(){
    const m=currentPdcMunition(),prev=PDC_MUNITIONS[wrap(pdc.munition-1,PDC_MUNITIONS.length)],next=PDC_MUNITIONS[wrap(pdc.munition+1,PDC_MUNITIONS.length)];
    return `<section class="exo-pdc-ammo"><h4>AMMO SELECTION THUMB WHEEL</h4><div class="exo-pdc-wheel"><button type="button" data-pdc-ammo-step="-1">▲ UP</button><div class="exo-pdc-drum"><span>${esc(prev.name)}</span><b>&gt; ${esc(m.name)} &lt;</b><span>${esc(next.name)}</span></div><button type="button" data-pdc-ammo-step="1">DOWN ▼</button></div><div class="exo-pdc-preview">${pdcPreviewSvg(m.preview)}<small>SELECTED FEED</small><b>${esc(m.name)}</b><span>${esc(m.subtitle)} · ${esc(m.detail)}</span><em>${esc(m.use)}</em></div></section>`;
  }
  function pdcChoice(group,value,label,sub,attrs=""){
    return `<button type="button" data-pdc-choice="${group}" data-pdc-value="${esc(value)}" aria-pressed="${pdc[group]===value}" ${attrs}><b>${label}</b>${sub?`<span>${sub}</span>`:""}</button>`;
  }
  function pdcTrackMarkup(){
    return PDC_TRACK.map((it,i)=>pdcChoice("track",i,it.label,it.sub,procAttrs(it.token,"track-mode",it.state,`GUN-TRK-03 · TRACKING MODE: ${it.label}`))).join("");
  }
  function densityAttrs(value){
    const [token,controlId,state]=PDC_DENSITY_PROC[value];
    return procAttrs(token,controlId,state,`GUN-TRK-03 · BURST DENSITY: ${value}`);
  }
  function spreadAttrs(value){return procAttrs("gun-track-confirm","gun-confirms","TRACK CONFIRMED",`GUN-TRK-03 · SPREAD PROFILE: ${value}`);}
  function logicAttrs(value){return procAttrs("gun-weapons-ack","gun-confirms","ACKNOWLEDGED",`GUN-TRK-03 · ENGAGEMENT LOGIC: ${value}`);}
  function pdcMatrixMarkup(){
    const m=currentPdcMunition();
    return `<span class="exo-device-label"><b class="exo-device-code">GUN-TRK-03</b><span> · POINT DEFENSE CONTROL MATRIX</span></span>
      <div class="exo-pdc-head"><b>POINT DEFENSE CONTROL MATRIX</b><span>SYS.STATE: ONLINE</span></div>
      <div class="exo-pdc-layout">${pdcAmmoMarkup()}<section class="exo-pdc-methods"><h4>TARGETING & ENGAGEMENT METHODOLOGIES</h4>
        <label>TRACKING MODE</label><div class="exo-pdc-track">${pdcTrackMarkup()}</div>
        <label>FIRING PATTERN</label>
        <div class="exo-pdc-inline"><span>BURST DENSITY</span>${["LOW","MED","HIGH"].map(x=>pdcChoice("density",x,x,"",densityAttrs(x))).join("")}</div>
        <div class="exo-pdc-inline"><span>SPREAD PROFILE</span>${["CONE","WALL","RING"].map(x=>pdcChoice("spread",x,x,"",spreadAttrs(x))).join("")}</div>
        <label>INTERCEPT ENVELOPE</label>
        <div class="exo-pdc-two">${pdcChoice("envelope","PERIMETER","PERIMETER","MAXIMUM-RANGE ENGAGE",procAttrs("gun-range-far","range-gate","FAR","GUN-TRK-03 · INTERCEPT ENVELOPE: PERIMETER"))}${pdcChoice("envelope","CLOSE-IN","CLOSE-IN","CIWS / LETHAL-RANGE HOLD",procAttrs("gun-range-near","range-gate","NEAR","GUN-TRK-03 · INTERCEPT ENVELOPE: CLOSE-IN"))}</div>
        <div class="exo-pdc-two">${pdcChoice("logic","HARD-LOCK","HARD-LOCK","ONE THREAT TO KILL",logicAttrs("HARD-LOCK"))}${pdcChoice("logic","OVERLAP-SWEEP","OVERLAP-SWEEP","MULTI-TRACK PAINT",logicAttrs("OVERLAP-SWEEP"))}</div>
        <label>AUTO-ENGAGE PARAMETERS</label>
        <div class="exo-pdc-filters">${[["missiles","MISSILES"],["torpedoes","TORPEDOES"],["drones","DRONES / STRIKE CRAFT"]].map(([id,label])=>`<button type="button" data-pdc-filter="${id}" aria-pressed="${pdc[id]}"><b>${pdc[id]?"☒":"☐"}</b>${label}</button>`).join("")}</div>
      </section></div>
      <footer class="exo-pdc-footer"><b>SELECTED MUNITION: ${esc(m.name)}</b><span>VELOCITY: ${m.velocity} m/s</span><span>THREAT PRIORITIZATION: ${pdc.track===1?"AUTO":"MANUAL / ASSIST"}</span></footer>`;
  }

  function rangeTelemetry(display){
    const text=display?.querySelector(".exo-display-caption")?.textContent||"";
    return {range:text.match(/([\d,]+)\s*km/i)?.[1]||"42,000",bearing:text.match(/(\d+(?:\.\d+)?)°/)?.[1]||"074"};
  }
  function bracketSvg(pattern){
    if(pattern==="RING")return `<g class="exo-gun-bracket-pattern"><circle cx="78" cy="23" r="8"/><circle cx="78" cy="23" r="4.7"/></g>`;
    if(pattern==="SEQUENTIAL")return `<g class="exo-gun-bracket-pattern"><path d="M68 32L88 14"/><circle cx="70" cy="30" r="2"/><circle cx="78" cy="23" r="2"/><circle cx="86" cy="16" r="2"/></g>`;
    return `<g class="exo-gun-bracket-pattern"><path d="M66 23h24M78 11v24"/></g>`;
  }
  function topologySvg(t){
    if(t.id==="prediction")return `<g class="exo-gun-prediction-zone"><rect x="78" y="8" width="18" height="15" rx="2"/><ellipse cx="87" cy="15.5" rx="6" ry="4"/></g>`;
    if(t.id==="cooperative")return `<g class="exo-gun-cooperative"><rect x="71" y="15" width="14" height="16"/><circle cx="64" cy="11" r="2.3"/><path d="M65.5 12.5L74 19"/></g>`;
    if(t.id==="bracket")return bracketSvg(currentBracket());
    return `<g class="exo-gun-lead-reticle"><circle cx="88" cy="14" r="4.4"/><path d="M88 6v5M88 17v5M80 14h5M91 14h5"/></g>`;
  }
  function coilFireControlMarkup(display){
    const t=currentTopology(),telemetry=rangeTelemetry(display);
    return `<div class="exo-gun-solution-overlay" data-gun-mode="coil" data-gun-topology="${t.id}">
      <svg class="exo-gun-solution-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path class="exo-gun-range-vector" d="M50 58L78 23"/><path class="exo-gun-lead-vector" d="M78 23L88 14"/><g class="exo-gun-synthetic-target" transform="translate(78 23) rotate(-28)"><path d="M-5 0L1-1.8L5 0L1 1.8Z"/></g>${topologySvg(t)}</svg>
      <div class="exo-gun-hud left"><small>COIL FIRE CONTROL</small><b>${t.label}</b><span>${t.feedback}</span></div>
      <div class="exo-gun-hud right"><small>TARGET / LEAD</small><b>BRG ${telemetry.bearing}° · RNG ${telemetry.range} KM</b><span>LEAD +06.4° · TOF 8.4 S</span></div>
      <div class="exo-gun-solution-status"><b>${esc(currentMunition().name)}</b><span>${t.tradeoff}</span></div>
    </div>`;
  }

  function pdcThreats(){
    const all=[
      {id:"M-17",kind:"missiles",x:82,y:20,tti:2.1,label:"MISSILE"},
      {id:"T-04",kind:"torpedoes",x:18,y:28,tti:3.8,label:"TORPEDO"},
      {id:"D-11",kind:"drones",x:86,y:70,tti:7.2,label:"DRONE"}
    ];
    const visible=all.filter(t=>pdc[t.kind]);
    return visible.length?visible:[{id:"NO-AUTO",kind:"none",x:82,y:20,tti:9.9,label:"MANUAL TRACK"}];
  }
  function threatMarkup(threat,primary){
    const hot=threat.id===primary.id;
    return `<g class="exo-pdc-threat ${hot?"primary":""}" transform="translate(${threat.x} ${threat.y})"><path d="M-3 0L0-2L3 0L0 2Z"/><circle r="${hot?5.2:3.6}"/><text x="5" y="-2">${threat.id}</text><text x="5" y="3">TTI ${threat.tti.toFixed(1)}s</text></g>`;
  }
  function tracerMarkup(targets,primary){
    const count=pdc.density==="HIGH"?10:pdc.density==="LOW"?3:6;
    const aimed=pdc.logic==="OVERLAP-SWEEP"?targets:[primary];
    return Array.from({length:count},(_,i)=>{
      const t=aimed[i%aimed.length],phase=(i-(count-1)/2);
      let x=t.x,y=t.y;
      if(pdc.spread==="CONE"){x+=phase*.65;y+=Math.abs(phase)*.22;}
      if(pdc.spread==="WALL"){x+=phase*1.2;y+=phase*.18;}
      if(pdc.spread==="RING"){const a=(i/count)*Math.PI*2;x+=Math.cos(a)*5.2;y+=Math.sin(a)*5.2;}
      return `<path class="exo-pdc-tracer tracer-${i%4}" d="M50 58 Q${(50+x)/2 + phase*.3} ${(58+y)/2 - 4} ${x.toFixed(1)} ${y.toFixed(1)}"/>`;
    }).join("");
  }
  function pdcImpactMarkup(primary){
    const m=currentPdcMunition();
    if(m.preview==="flak")return `<g class="exo-pdc-impact flak" transform="translate(${primary.x} ${primary.y})"><circle r="8"/><circle r="4.5"/><path d="M-11 0H11M0-11V11"/></g>`;
    if(m.preview==="emp")return `<g class="exo-pdc-impact emp" transform="translate(${primary.x} ${primary.y})"><path d="M-3-9Q7-4-3 1Q7 6-3 11"/><path d="M3-9Q13-4 3 1Q13 6 3 11"/></g>`;
    return `<g class="exo-pdc-impact ap" transform="translate(${primary.x} ${primary.y})"><circle r="2.4"/><path d="M-6 0H6M0-6V6"/></g>`;
  }
  function pdcFireControlMarkup(display){
    const threats=pdcThreats().sort((a,b)=>a.tti-b.tti);
    const primary=pdc.track===1?threats[0]:threats[Math.min(pdc.track===2?1:0,threats.length-1)];
    const envelope=pdc.envelope==="CLOSE-IN"?24:43;
    const relay=pdc.track===2?`<g class="exo-pdc-relay"><circle cx="14" cy="12" r="3"/><text x="19" y="13">RLY-03</text><path d="M17 14L${primary.x} ${primary.y}"/></g>`:"";
    return `<div class="exo-gun-solution-overlay exo-pdc-fire-overlay" data-gun-mode="pdc" data-pdc-density="${pdc.density.toLowerCase()}" data-pdc-spread="${pdc.spread.toLowerCase()}" data-pdc-logic="${pdc.logic.toLowerCase()}">
      <svg class="exo-gun-solution-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <circle class="exo-pdc-envelope" cx="50" cy="58" r="${envelope}"/>
        <circle class="exo-pdc-envelope-inner" cx="50" cy="58" r="17"/>
        ${threats.map(t=>threatMarkup(t,primary)).join("")}
        ${relay}
        ${tracerMarkup(threats,primary)}
        ${pdcImpactMarkup(primary)}
      </svg>
      <div class="exo-gun-hud left"><small>PDC INTERCEPT CONTROL</small><b>${PDC_TRACK[pdc.track].label}</b><span>${pdc.envelope} · ${pdc.logic}</span></div>
      <div class="exo-gun-hud right"><small>FIRING DOCTRINE</small><b>${pdc.density} / ${pdc.spread}</b><span>${esc(currentPdcMunition().name)} · ${currentPdcMunition().velocity} m/s</span></div>
      <div class="exo-pdc-priority-tag"><small>PRIMARY THREAT</small><b>${primary.id} · ${primary.label}</b><span>TTI ${primary.tti.toFixed(1)} S</span></div>
      <div class="exo-gun-solution-status"><b>${esc(currentPdcMunition().name)}</b><span>${pdc.logic==="OVERLAP-SWEEP"?`${threats.length} TRACK SWEEP`:`HARD LOCK ${primary.id}`} · ${pdc.density} BURST · ${pdc.spread}</span></div>
    </div>`;
  }

  function stationSelected(){return document.querySelector("#station-tabs [data-station='gunnery'][aria-selected='true']");}
  function locate(code){if(!stationSelected())return null;return document.querySelector(`#station-panel .station-gunnery .exo-device-block[data-control-code='${code}']`);}
  const locateFcf=()=>locate("GUN-FCF-07"),locateMgd=()=>locate("GUN-MGD-01"),locateTrk=()=>locate("GUN-TRK-03");
  function locateFireControlDisplay(){if(!stationSelected())return null;return document.querySelector("#station-panel .display-target");}
  function selectedWeaponBank(){
    const block=locate("GUN-WBN-02");
    const readout=block?.querySelector(":scope > strong")?.textContent||block?.querySelector("strong")?.textContent||"COIL A";
    return readout.trim().toUpperCase();
  }
  function renderFcf(){const b=locateFcf();if(!b||b.dataset.fcf07Program===String(serial))return;b.dataset.fcf07Program=String(serial);b.classList.add("exo-fcf07-program");b.innerHTML=fcfMarkup();}
  function renderArmament(){const b=locateMgd();if(!b)return;if(!b.classList.contains("exo-mgd01-armament"))armament.guard=guardStateFromBlock(b);if(b.dataset.mgd01Serial===String(armament.serial))return;b.dataset.mgd01Serial=String(armament.serial);b.classList.add("exo-mgd01-armament");b.innerHTML=armamentMarkup();}
  function renderPdc(){const b=locateTrk();if(!b||b.dataset.pdcSerial===String(pdc.serial))return;b.dataset.pdcSerial=String(pdc.serial);b.classList.add("exo-pdc03-matrix");b.innerHTML=pdcMatrixMarkup();}
  function renderFireControl(){
    const d=locateFireControlDisplay();if(!d)return;
    const bank=selectedWeaponBank(),mode=bank.includes("POINT DEFENSE")?"pdc":"coil";
    const signature=`${mode}:${armament.serial}:${pdc.serial}:${bank}`;
    const e=d.querySelector(".exo-gun-solution-overlay");
    if(e?.dataset.signature===signature)return;
    e?.remove();
    d.insertAdjacentHTML("beforeend",mode==="pdc"?pdcFireControlMarkup(d):coilFireControlMarkup(d));
    const n=d.querySelector(".exo-gun-solution-overlay");if(n)n.dataset.signature=signature;
  }
  function render(){queued=false;renderFcf();renderArmament();renderPdc();renderFireControl();}
  function queueRender(){if(queued)return;queued=true;requestAnimationFrame(render);}
  function bumpArmament(){armament.serial=armament.serial>=9999?1:armament.serial+1;queueRender();}
  function bumpPdc(){pdc.serial=pdc.serial>=9999?1:pdc.serial+1;queueRender();}
  function playDetent(seed,intensity=.78){try{window.EXO_CONTROL_AUDIO?.play?.("thumbwheel-notch",{station:"gunnery",seed,intensity});}catch(_){}}

  document.addEventListener("change",e=>{
    const s=e.target.closest("[data-fcf07-select]");if(!s)return;
    const id=s.dataset.fcf07Select;if(!OPTIONS[id])return;
    selection[id]=Math.max(0,Math.min(OPTIONS[id].length-1,Number(s.value)||0));serial=serial>=99?1:serial+1;
    playDetent(`fcf07:${id}:${selection[id]}`);queueRender();
  });
  document.addEventListener("click",e=>{
    const mun=e.target.closest("[data-mgd-munition-step]");if(mun){armament.munition=wrap(armament.munition+Number(mun.dataset.mgdMunitionStep||0),COIL_MUNITIONS.length);playDetent(`mgd01:munition:${armament.munition}`,.88);bumpArmament();return;}
    const top=e.target.closest("[data-mgd-topology]");if(top){armament.topology=Math.max(0,Math.min(FIRE_CONTROL_TOPOLOGIES.length-1,Number(top.dataset.mgdTopology)||0));playDetent(`mgd01:topology:${armament.topology}`,.82);bumpArmament();return;}
    const br=e.target.closest("[data-mgd-bracket]");if(br&&currentTopology().id==="bracket"){armament.bracket=Math.max(0,Math.min(BRACKET_PATTERNS.length-1,Number(br.dataset.mgdBracket)||0));playDetent(`mgd01:bracket:${armament.bracket}`,.8);bumpArmament();return;}
    const guard=e.target.closest(".exo-mgd01-armament [data-control-state]");if(guard?.dataset.controlId==="weapon-safe"){armament.guard=guard.dataset.controlState||armament.guard;armament.serial++;queueRender();return;}
    const ammo=e.target.closest("[data-pdc-ammo-step]");if(ammo){pdc.munition=wrap(pdc.munition+Number(ammo.dataset.pdcAmmoStep||0),PDC_MUNITIONS.length);playDetent(`pdc:ammo:${pdc.munition}`,.9);bumpPdc();return;}
    const choice=e.target.closest("[data-pdc-choice]");if(choice){const group=choice.dataset.pdcChoice,value=choice.dataset.pdcValue;if(group==="track")pdc.track=Number(value);else if(group in pdc)pdc[group]=value;playDetent(`pdc:${group}:${value}`,.8);bumpPdc();return;}
    const filter=e.target.closest("[data-pdc-filter]");if(filter){const id=filter.dataset.pdcFilter;if(id in pdc)pdc[id]=!pdc[id];playDetent(`pdc:${id}:${pdc[id]}`,.72);bumpPdc();}
  });

  function start(){
    observer=new MutationObserver(queueRender);
    observer.observe(document.getElementById("station-panel")||document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["aria-selected","aria-pressed","data-control-state"]});
    queueRender();
  }
  window.EXO_GUN_FCF07=Object.freeze({selection,armament,pdc,current:id=>current(id),currentMunition,currentTopology,currentBracket,currentPdcMunition,refresh:queueRender});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();