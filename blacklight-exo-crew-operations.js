(() => {
  "use strict";

  const HUMAN_PROFILE = Object.freeze({
    id: "human-standard",
    name: "Human Standard",
    rulesBasis: "World of Darkness-derived d10",
    purpose: "role-play visualization placeholder",
    assumptions: {
      commandModel: "distributed watchstations",
      powerCarrier: "electrical bus",
      sensorModel: "passive + active electromagnetic",
      commsModel: "radio + laser datalink",
      maneuverModel: "RCS + conventional main drive",
      weaponModel: "human fire-control authorization"
    }
  });

  const BASE_POWER = Object.freeze({ helm:16, navigation:14, gunnery:17, engineering:23, science:17, comms:13 });
  const $ = id => document.getElementById(id);
  const clamp = (v,a=0,b=100) => Math.min(b,Math.max(a,v));
  const round = (v,d=0) => Number(v.toFixed(d));
  const d10 = () => Math.floor(Math.random()*10)+1;
  const AUTH_TAIL = Object.freeze(["auth-key-insert","auth-key-arm","auth-shield-open","execute"]);

  const withAuthorization = (...steps) => [...steps, ...AUTH_TAIL];

  const STATIONS = Object.freeze({
    helm:{
      label:"Helm", display:"maneuver",
      description:"Human flight-control station built around inertial attitude control, reaction-control thrusters and commanded main-drive thrust. The display is role-play state; the procedure produces a suggested d10 difficulty for the DM.",
      labels:{guard:"Flight inhibit guard",mode:"Flight-mode rotary",bus:"Thruster manifold",dial:"Attitude trim knob",slider:"Translation demand",lever:"Thrust gate lever",confirmA:"Vector confirm",confirmB:"Pilot acknowledge",execute:"COMMIT THRUST"},
      readouts:s=>[["Heading",`${round(s.heading)}°`],["Velocity",`${round(s.velocity,1)} km/s`],["Throttle",`${round(s.throttle)}%`],["Drive",`${round(s.driveHealth)}%`]],
      procedures:[
        {id:"planned-burn",name:"Execute planned translation burn",cue:"Select the planned-burn channel, use the normal thruster manifold, set positive translation demand, verify the vector, then use the authorization assembly.",sequence:withAuthorization("mode-2","bus-primary","slider-high","confirm-a","lever-forward")},
        {id:"attitude-slew",name:"Perform attitude slew",cue:"Select attitude-control authority, trim the commanded orientation and verify the vector before using the authorization assembly.",sequence:withAuthorization("mode-1","dial-right","confirm-a")},
        {id:"docking-trim",name:"Docking / proximity correction",cue:"Select precision control, route the auxiliary maneuvering manifold, set restrained translation and trim the approach before authorization.",sequence:withAuthorization("mode-3","bus-aux","slider-mid","dial-left")}
      ]
    },
    navigation:{
      label:"Navigation", display:"plot",
      description:"Human astrogation station using inertial reference, timebase, ephemeris data and finite-burn transfer solutions. Procedure order affects suggested difficulty; the console does not resolve the character's roll.",
      labels:{guard:"Solution inhibit guard",mode:"Solution-mode rotary",bus:"Reference source",dial:"Transfer index knob",slider:"Δv bias slider",lever:"Solution gate lever",confirmA:"Vector confirm",confirmB:"Timebase lock",execute:"COMMIT SOLUTION"},
      readouts:s=>[["Solution",`${round(s.nav)}%`],["Destination",s.navDestination],["Δv plan",`${round(s.navBurnDeltaV,2)} km/s`],["Committed",s.courseCommitted?"yes":"no"]],
      procedures:[
        {id:"transfer-solve",name:"Compute transfer solution",cue:"Establish the normal inertial reference, solve a transfer trajectory, bias delta-v and verify the vector before authorization.",sequence:withAuthorization("mode-1","bus-primary","dial-right","slider-mid","confirm-a")},
        {id:"collision-vector",name:"Generate collision-avoidance vector",cue:"Use the rapid-update reference path, apply a strong delta-v bias and confirm the timebase before authorization.",sequence:withAuthorization("mode-2","bus-aux","slider-high","confirm-b")},
        {id:"emergency-egress",name:"Emergency egress solution",cue:"Select the emergency solver, preserve a valid inertial reference and open the solution gate before authorization.",sequence:withAuthorization("mode-3","bus-primary","lever-forward")}
      ]
    },
    gunnery:{
      label:"Gunnery", display:"target",
      description:"Human fire-control station using sensor tracks, range/range-rate gating, stored weapon energy and explicit arming interlocks. It generates roll difficulty only; hit and damage remain DM adjudication.",
      labels:{guard:"Weapon arm guard",mode:"Fire-control rotary",bus:"Track / weapon feed",dial:"Range-rate gate knob",slider:"Capacitor demand",lever:"Weapon arm lever",confirmA:"Track confirm",confirmB:"Weapons acknowledge",execute:"FIRE / RELAY"},
      readouts:s=>[["Weapon group",s.weaponGroup],["Capacitors",`${round(s.capacitors)}%`],["Track",`${round(s.track)}%`],["Mode",s.weaponMode]],
      procedures:[
        {id:"fire-solution",name:"Build direct-fire solution",cue:"Release the weapon arm guard, select direct fire, use the primary track, gate range-rate and verify the track before authorization.",sequence:withAuthorization("guard-open","mode-1","bus-primary","dial-right","confirm-a")},
        {id:"point-defense",name:"Point-defense burst",cue:"Release the weapon arm guard, select defensive fire, route the close-track feed and arm the defensive channel before authorization.",sequence:withAuthorization("guard-open","mode-3","bus-aux","lever-forward")},
        {id:"missile-launch",name:"Authorize guided-weapon launch",cue:"Release the weapon arm guard, select guided control, obtain weapons acknowledgement, arm the selected cells and reconfirm track before authorization.",sequence:withAuthorization("guard-open","mode-2","confirm-b","lever-forward","confirm-a")}
      ]
    },
    engineering:{
      label:"Engineering", display:"systems",
      description:"Human plant-and-distribution station modeled around generator loading, electrical buses, coolant loops and hard safety interlocks. Procedures set suggested difficulty rather than automatically repairing the ship.",
      labels:{guard:"Plant safety guard",mode:"Plant-mode rotary",bus:"Distribution source",dial:"Load-share trim knob",slider:"Coolant / load command",lever:"Bus-tie lever",confirmA:"Plant confirm",confirmB:"Casualty acknowledge",execute:"APPLY CONFIGURATION"},
      readouts:s=>[["Reactor",`${round(s.reactor)}%`],["Thermal",`${round(s.thermal)}%`],["Cooling",`${round(s.coolingHealth)}%`],["Fault",s.engineeringFault||"none"]],
      procedures:[
        {id:"load-rebalance",name:"Rebalance electrical load",cue:"Use normal distribution control, retain the primary source, return load demand toward nominal and leave the bus tie normal before authorization.",sequence:withAuthorization("mode-1","bus-primary","slider-mid","lever-center")},
        {id:"coolant-isolation",name:"Isolate coolant-loop fault",cue:"Enter casualty control, shift supply away from the affected path, reduce commanded load, acknowledge the casualty and isolate through the tie before authorization.",sequence:withAuthorization("mode-2","bus-aux","slider-low","confirm-b","lever-aft")},
        {id:"scram",name:"Emergency reactor SCRAM",cue:"Release the plant safety guard, select emergency plant control, isolate distribution and drive the shutdown lever safe before authorization.",sequence:withAuthorization("guard-open","mode-3","bus-isolate","lever-aft")}
      ]
    },
    science:{
      label:"Science / Scanning", display:"sensor",
      description:"Human sensor station grounded in passive electromagnetic collection, active ranging and spectral analysis. Receiver gain, integration time and emitter state are separated because real sensing trades sensitivity, time and detectability.",
      labels:{guard:"Emitter inhibit guard",mode:"Sensor-mode rotary",bus:"Aperture / receiver chain",dial:"Receiver-gain knob",slider:"Integration-time slider",lever:"Emitter gate lever",confirmA:"Track confirm",confirmB:"Analyst acknowledge",execute:"ACQUIRE / RELAY"},
      readouts:s=>[["Track",`${round(s.track)}%`],["Class",s.targetClass],["Range",s.contact.present?`${Math.round(s.targetRange).toLocaleString()} km`:"no contact"],["Emissions",`${round(s.emissions)}%`]],
      procedures:[
        {id:"passive-track",name:"Establish passive track",cue:"Use the primary receiver chain, extend integration time, trim receiver gain and confirm the track before authorization.",sequence:withAuthorization("mode-1","bus-primary","slider-high","dial-right")},
        {id:"active-range",name:"Active range / velocity pulse",cue:"Release the emitter inhibit, select active ranging, route the primary aperture and open the emitter gate before authorization.",sequence:withAuthorization("guard-open","mode-2","bus-primary","lever-forward")},
        {id:"spectral-classify",name:"Spectral classification",cue:"Select analysis mode, route the secondary receiver chain, trim gain, extend integration and acknowledge analysis before authorization.",sequence:withAuthorization("mode-3","bus-aux","dial-left","slider-high","confirm-b")}
      ]
    },
    comms:{
      label:"Comms", display:"link",
      description:"Human communications station using address selection, carrier-path choice, frequency vernier, transmit power / beamwidth control and cryptographic authorization. The DM adjudicates reception, interception and consequences.",
      labels:{guard:"Transmit inhibit guard",mode:"Link-mode rotary",bus:"Carrier path",dial:"Frequency vernier knob",slider:"Power / beamwidth slider",lever:"Transmit key lever",confirmA:"Address confirm",confirmB:"Crypto acknowledge",execute:"TRANSMIT / RELAY"},
      readouts:s=>[["Link",`${round(s.comms)}%`],["Channel",s.commsChannel],["Encryption",s.commsEncryption?"enabled":"open"],["IFF",s.targetIFF]],
      procedures:[
        {id:"authenticated-hail",name:"Authenticated hail",cue:"Select normal hail mode, route the primary carrier, tune the frequency and confirm the address before authorization.",sequence:withAuthorization("mode-1","bus-primary","dial-right","confirm-a")},
        {id:"tightbeam-burst",name:"Encrypted tightbeam burst",cue:"Select secure narrowbeam, route the auxiliary carrier, raise directed power, acknowledge crypto and key the transmitter before authorization.",sequence:withAuthorization("mode-2","bus-aux","slider-high","confirm-b","lever-forward")},
        {id:"distress",name:"Emergency distress broadcast",cue:"Release transmit inhibition, select the emergency link channel and drive broadcast demand high before authorization.",sequence:withAuthorization("guard-open","mode-3","slider-high")}
      ]
    }
  });

  const initialControlState = () => ({
    guard:"closed", mode:"1", bus:"primary", dial:0, slider:0, lever:"center",
    authKey:"out", authLock:"safe", authShield:"closed"
  });

  const initialState = () => ({
    profile:HUMAN_PROFILE, simTime:0,
    velocity:12.4, heading:37, throttle:22, reactor:68, thermal:31, hull:100,
    track:42, comms:88, nav:74, weapons:61,
    driveHealth:100, sensorHealth:100, commsHealth:100, weaponHealth:100, coolingHealth:100,
    targetRange:42000, targetBearing:74, targetClosure:-1.7, targetClass:"unresolved", targetIFF:"unknown",
    emissions:18, firingSolution:0, courseCommitted:false, navDestination:"Rendezvous Alpha", navBurnDeltaV:2.1,
    commsChannel:"Fleet tactical", commsEncryption:true, weaponGroup:"Coil battery A", weaponMode:"safe", capacitors:54,
    engineeringFault:null, power:{...BASE_POWER},
    stationOnline:{helm:true,navigation:true,gunnery:true,engineering:true,science:true,comms:true},
    contact:{present:false,friendly:false,x:76,y:31},
    selectedProcedure:{helm:"planned-burn",navigation:"transfer-solve",gunnery:"fire-solution",engineering:"load-rebalance",science:"passive-track",comms:"authenticated-hail"},
    procedure:null, relay:null, log:[]
  });

  let state = initialState();
  let activeStation = "helm";
  let timer = null;
  let manualOpen = false;
  let manualQuery = "";

  const powerTotal = () => Object.values(state.power).reduce((a,b)=>a+b,0);
  const powerFactor = key => clamp(state.power[key]/BASE_POWER[key]*100);
  const engineeringQuality = () => (state.driveHealth+state.coolingHealth+state.hull)/3;

  function stationContext(key){
    const f={
      helm:()=>Math.min(powerFactor("helm"),state.nav,state.driveHealth),
      navigation:()=>state.track*.45+state.comms*.35+powerFactor("navigation")*.20,
      gunnery:()=>Math.min(state.track,powerFactor("gunnery"),state.weaponHealth,100-Math.max(0,state.thermal-55)),
      engineering:()=>Math.min(powerFactor("engineering"),engineeringQuality()),
      science:()=>Math.min(powerFactor("science"),state.sensorHealth,100-Math.max(0,state.thermal-70)),
      comms:()=>Math.min(powerFactor("comms"),state.commsHealth)
    };
    return clamp(f[key]?.()??60);
  }

  function coordinationScore(){
    const keys=Object.keys(STATIONS);
    return clamp(keys.reduce((sum,key)=>sum+stationContext(key),0)/keys.length-Math.max(0,powerTotal()-100)*1.5);
  }

  function addLog(station,message){
    state.log.unshift({time:state.simTime,station,message});
    state.log=state.log.slice(0,100);
    renderLog();
  }

  function timeString(seconds){
    const s=Math.max(0,Math.floor(seconds));
    return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  }

  function selectedProcedure(key=activeStation){
    const def=STATIONS[key];
    return def.procedures.find(p=>p.id===state.selectedProcedure[key])||def.procedures[0];
  }

  function renderTopState(){
    const fields={
      velocity:`${round(state.velocity,1)} km/s`, reactor:`${round(state.reactor)}%`, thermal:`${round(state.thermal)}%`, hull:`${round(state.hull)}%`,
      track:`${round(state.track)}%`, comms:`${round(state.comms)}%`, nav:`${round(state.nav)}%`, weapons:`${round(state.weapons)}%`
    };
    Object.entries(fields).forEach(([key,value])=>{
      const target=$(`state-${key}`); if(target) target.textContent=value;
      const meter=$(`meter-${key}`); if(meter) meter.style.width=`${clamp(key==="velocity"?state.velocity*4:state[key])}%`;
    });
    $("crew-profile-name").textContent=state.profile.name;
    $("crew-summary-rules").textContent="WoD-derived d10";
    $("crew-summary-resolution").textContent="DM adjudicated";
    $("crew-summary-difficulty").textContent=state.relay?`Difficulty ${state.relay.difficulty}`:"pending";
  }

  function renderPowerControls(){
    $("power-controls").innerHTML=Object.keys(state.power).map(key=>`
      <div class="exo-power-control"><label><span>${STATIONS[key].label}</span><b>${state.power[key]}</b></label>
      <input data-power="${key}" type="range" min="4" max="30" value="${state.power[key]}" aria-label="${STATIONS[key].label} visual power allocation"></div>`).join("");
    const total=powerTotal(), badge=$("power-total");
    badge.textContent=`${total} / 100 visual points allocated`;
    badge.dataset.over=total>100?"true":"false";
  }

  function renderTabs(){
    $("station-tabs").innerHTML=Object.entries(STATIONS).map(([key,def])=>`
      <button class="exo-station-tab" type="button" role="tab" data-station="${key}" aria-selected="${activeStation===key}">
        ${def.label}<span class="tab-state">3 operations</span>
      </button>`).join("");
  }

  function tacticalDisplay(kind){
    const c=state.contact;
    return `<div class="exo-tactical-display" aria-label="${kind} role-play visualization">
      <div class="exo-tactical-ring"></div><div class="exo-ownship" title="Own ship"></div>
      <div class="exo-contact ${c.friendly?"friend":""}" style="left:${c.x}%;top:${c.y}%;opacity:${c.present?1:0}" title="${state.targetClass}"></div>
      <span class="exo-display-caption">VISUAL ONLY // ${kind} // ${c.present?`${round(state.targetBearing)}° · ${Math.round(state.targetRange).toLocaleString()} km`:"no remote track"}</span>
    </div>`;
  }

  function inputHistory(){
    const p=state.procedure;
    if(!p||p.station!==activeStation||!p.active) return `<span class="exo-procedure-empty">No active attempt. Select an action and begin the procedure.</span>`;
    if(!p.inputs.length) return `<span class="exo-procedure-empty">Procedure armed. No controls manipulated yet.</span>`;
    return p.inputs.map((item,i)=>`<span class="exo-input-token"><b>${i+1}</b>${item.label}</span>`).join("");
  }

  const sliderText=v=>v<0?"LOW":v>0?"HIGH":"NOMINAL";

  function manualStepLabel(token,def){
    const fixed={
      "auth-key-insert":"Insert the station authorization key into the execution lock.",
      "auth-key-arm":"Rotate the authorization key clockwise to ARM.",
      "auth-shield-open":"Flip the locked protective execution shield fully UP.",
      "execute":`Press the recessed ${def.labels.execute} button.`
    };
    if(fixed[token])return fixed[token];
    if(token==="guard-open")return `Lift / open ${def.labels.guard}.`;
    if(token==="guard-close")return `Close ${def.labels.guard}.`;
    if(token.startsWith("mode-"))return `Rotate ${def.labels.mode} to position ${token.slice(-1)}.`;
    if(token==="bus-primary")return `Set ${def.labels.bus} to PRIMARY.`;
    if(token==="bus-aux")return `Set ${def.labels.bus} to AUXILIARY.`;
    if(token==="bus-isolate")return `Set ${def.labels.bus} to ISOLATE.`;
    if(token==="dial-left")return `Turn ${def.labels.dial} one detent counterclockwise.`;
    if(token==="dial-center")return `Return ${def.labels.dial} to zero / center.`;
    if(token==="dial-right")return `Turn ${def.labels.dial} one detent clockwise.`;
    if(token==="slider-low")return `Set ${def.labels.slider} to LOW.`;
    if(token==="slider-mid")return `Set ${def.labels.slider} to NOMINAL.`;
    if(token==="slider-high")return `Set ${def.labels.slider} to HIGH.`;
    if(token==="lever-forward")return `Move ${def.labels.lever} to FORWARD.`;
    if(token==="lever-center")return `Move ${def.labels.lever} to CENTER.`;
    if(token==="lever-aft")return `Move ${def.labels.lever} to AFT.`;
    if(token==="confirm-a")return `Press ${def.labels.confirmA}.`;
    if(token==="confirm-b")return `Press ${def.labels.confirmB}.`;
    return token;
  }

  function manualOverlay(def){
    const query=manualQuery.trim().toLowerCase();
    const stationCode=activeStation.slice(0,3).toUpperCase();
    const entries=def.procedures.map((proc,index)=>{
      const steps=proc.sequence.map(token=>manualStepLabel(token,def));
      const haystack=[proc.name,proc.cue,...steps].join(" ").toLowerCase();
      const hidden=query&&!haystack.includes(query)?" hidden":"";
      return `<article class="exo-manual-entry" data-manual-search="${haystack.replace(/"/g,'&quot;')}"${hidden}>
        <header><span>${stationCode}-${String(index+1).padStart(2,"0")}</span><strong>${proc.name}</strong><b>${proc.sequence.length} steps</b></header>
        <p>${proc.cue}</p>
        <h4>Correct operating sequence</h4>
        <ol>${steps.map((step,i)=>`<li><b>${i+1}</b><span>${step}</span></li>`).join("")}</ol>
      </article>`;
    }).join("");
    const visibleCount=def.procedures.filter(proc=>{
      if(!query)return true;
      const steps=proc.sequence.map(token=>manualStepLabel(token,def));
      return [proc.name,proc.cue,...steps].join(" ").toLowerCase().includes(query);
    }).length;
    return `<section class="exo-manual-overlay" aria-label="${def.label} operations manual">
      <div class="exo-manual-sheet">
        <header class="exo-manual-header">
          <div class="exo-manual-mark"><span></span><b>BLV-071</b></div>
          <div><small>CREW STATION OPERATIONS MANUAL · HUMAN STANDARD</small><h3>${def.label}</h3><p>Authorized operating procedures · Rev. 7C</p></div>
          <button type="button" class="exo-manual-close" data-manual-close aria-label="Close station manual">×</button>
        </header>
        <div class="exo-manual-searchbar">
          <label for="exo-manual-search">Search this station manual</label>
          <div><input id="exo-manual-search" data-manual-search-input type="search" value="${manualQuery.replace(/"/g,'&quot;')}" placeholder="Search actions, controls, steps…" autocomplete="off"><span data-manual-count>${visibleCount} / ${def.procedures.length} entries</span></div>
        </div>
        <aside class="exo-manual-note"><strong>Operator reference:</strong> Entries below show the canonical action sequence. Every operation terminates with the standard keyed execution assembly: key insertion, key ARM, shield UP, recessed execution.</aside>
        <div class="exo-manual-results">${entries}</div>
        <div class="exo-manual-empty" ${visibleCount?"hidden":""} data-manual-empty>No matching procedure in this station manual.</div>
      </div>
    </section>`;
  }

  function filterManualResults(){
    const panel=$("station-panel");
    if(!panel)return;
    const q=manualQuery.trim().toLowerCase();
    const entries=[...panel.querySelectorAll(".exo-manual-entry")];
    let visible=0;
    entries.forEach(entry=>{
      const match=!q||(entry.dataset.manualSearch||"").includes(q);
      entry.hidden=!match;
      if(match)visible+=1;
    });
    const count=panel.querySelector("[data-manual-count]");
    if(count)count.textContent=`${visible} / ${entries.length} entries`;
    const empty=panel.querySelector("[data-manual-empty]");
    if(empty)empty.hidden=visible!==0;
  }

  function authorizationAssembly(def,controls,active){
    const disabled=active?"":"disabled";
    const keyInserted=controls.authKey!=="out";
    const armed=controls.authLock==="armed";
    const shieldOpen=controls.authShield==="open";
    const executeReady=active&&keyInserted&&armed&&shieldOpen;
    return `
      <div class="exo-device-block exo-execute-block" style="grid-column:1/-1;border:1px solid rgba(231,121,121,.38);background:linear-gradient(180deg,rgba(231,121,121,.06),rgba(0,0,0,.24));padding:14px;">
        <span class="exo-device-label">Locked execution assembly</span>
        <strong style="white-space:normal">KEY ${controls.authKey.toUpperCase()} · LOCK ${controls.authLock.toUpperCase()} · SHIELD ${controls.authShield.toUpperCase()}</strong>
        <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;align-items:stretch">
          <div style="border:1px solid rgba(217,168,79,.18);border-radius:9px;padding:9px;background:#0b0d10">
            <span class="exo-device-label">1 · Authorization key</span>
            <button type="button" data-proc-input="auth-key-insert" data-proc-label="Authorization key INSERT" ${disabled} style="width:100%;margin-top:7px">${keyInserted?"KEY INSERTED":"INSERT KEY"}</button>
          </div>
          <div style="border:1px solid rgba(217,168,79,.18);border-radius:9px;padding:9px;background:#0b0d10">
            <span class="exo-device-label">2 · Key lock</span>
            <button type="button" data-proc-input="auth-key-arm" data-proc-label="Authorization key TURN TO ARM" ${!active||!keyInserted?"disabled":""} style="width:100%;margin-top:7px">${armed?"ARMED":"TWIST TO ARM"}</button>
          </div>
          <div style="border:1px solid rgba(217,168,79,.18);border-radius:9px;padding:9px;background:#0b0d10">
            <span class="exo-device-label">3 · Flip-up shield</span>
            <button type="button" data-proc-input="auth-shield-open" data-proc-label="Execution shield FLIP UP" ${!active||!armed?"disabled":""} style="width:100%;margin-top:7px">${shieldOpen?"SHIELD UP":"LIFT SHIELD"}</button>
          </div>
          <div style="border:1px solid ${executeReady?"rgba(231,121,121,.72)":"rgba(231,121,121,.2)"};border-radius:9px;padding:9px;background:${shieldOpen?"rgba(91,18,18,.26)":"rgba(0,0,0,.28)"}">
            <span class="exo-device-label">4 · Recessed execution</span>
            <div style="border:2px solid rgba(231,121,121,.32);border-radius:10px;padding:6px;margin-top:7px;box-shadow:inset 0 0 18px rgba(0,0,0,.65)">
              <button type="button" class="exo-execute-button" data-proc-input="execute" data-proc-label="${def.labels.execute}" ${executeReady?"":"disabled"} style="width:100%;min-height:50px">${def.labels.execute}</button>
            </div>
          </div>
        </div>
        <small style="display:block;margin-top:9px;color:#8e7c79;line-height:1.45">Human authorization ritual: insert key → twist to ARM → flip the protective shield up → press the recessed execution button. The assembly enforces those mechanical dependencies, but arming it too early still counts against procedural order.</small>
      </div>`;
  }

  function procedureControls(def){
    const proc=selectedProcedure(), session=state.procedure;
    const active=Boolean(session&&session.active&&session.station===activeStation&&session.operationId===proc.id);
    const controls=active?session.controls:initialControlState(), disabled=active?"":"disabled";
    const options=def.procedures.map(p=>`<option value="${p.id}" ${p.id===proc.id?"selected":""}>${p.name} · ${p.sequence.length} inputs</option>`).join("");
    return `<div class="exo-procedure-console">
      <div class="exo-procedure-setup"><div><span class="exo-kicker">Attempted ship action · three human baseline operations</span>
      <select data-procedure-select aria-label="Select ${def.label} procedure">${options}</select></div>
      <div class="exo-procedure-actions"><button type="button" class="exo-control-button primary" data-procedure-begin>${active?"Restart procedure":"Begin procedure"}</button>
      <button type="button" class="exo-control-button" data-procedure-abort ${active?"":"disabled"}>Abort / clear inputs</button></div></div>
      <div class="exo-physical-controls" data-active="${active}">
        <div class="exo-device-block"><span class="exo-device-label">${def.labels.guard}</span><strong>${controls.guard.toUpperCase()}</strong>
          <div class="exo-control-row"><button type="button" data-proc-input="guard-open" data-proc-label="Guard OPEN" ${disabled}>Lift / open</button><button type="button" data-proc-input="guard-close" data-proc-label="Guard CLOSE" ${disabled}>Close</button></div></div>
        <div class="exo-device-block"><span class="exo-device-label">${def.labels.mode}</span><strong>POSITION ${controls.mode}</strong>
          <div class="exo-control-row"><button type="button" data-proc-input="mode-1" data-proc-label="Rotary 1" ${disabled}>1</button><button type="button" data-proc-input="mode-2" data-proc-label="Rotary 2" ${disabled}>2</button><button type="button" data-proc-input="mode-3" data-proc-label="Rotary 3" ${disabled}>3</button></div></div>
        <div class="exo-device-block"><span class="exo-device-label">${def.labels.bus}</span><strong>${controls.bus.toUpperCase()}</strong>
          <div class="exo-control-row"><button type="button" data-proc-input="bus-primary" data-proc-label="Feed PRIMARY" ${disabled}>Primary</button><button type="button" data-proc-input="bus-aux" data-proc-label="Feed AUX" ${disabled}>Aux</button><button type="button" data-proc-input="bus-isolate" data-proc-label="Feed ISOLATE" ${disabled}>Isolate</button></div></div>
        <div class="exo-device-block exo-dial-block"><span class="exo-device-label">${def.labels.dial}</span><strong>TRIM ${controls.dial>=0?"+":""}${controls.dial}</strong>
          <div class="exo-control-row"><button type="button" data-proc-input="dial-left" data-proc-label="${def.labels.dial} CCW" ${disabled}>↶ CCW</button><button type="button" data-proc-input="dial-center" data-proc-label="${def.labels.dial} ZERO" ${disabled}>Zero</button><button type="button" data-proc-input="dial-right" data-proc-label="${def.labels.dial} CW" ${disabled}>CW ↷</button></div></div>
        <div class="exo-device-block"><span class="exo-device-label">${def.labels.slider}</span><strong>${sliderText(controls.slider)}</strong>
          <input data-proc-slider type="range" min="-1" max="1" step="1" value="${controls.slider}" aria-label="${def.labels.slider}" ${disabled} style="width:100%;accent-color:#d9a84f">
          <div class="exo-slider-scale" aria-hidden="true" style="display:flex;justify-content:space-between;color:#777269;font-size:.58rem;text-transform:uppercase;margin-top:4px"><span>Low</span><span>Nom</span><span>High</span></div></div>
        <div class="exo-device-block"><span class="exo-device-label">${def.labels.lever}</span><strong>${controls.lever.toUpperCase()}</strong>
          <div class="exo-lever-row"><button type="button" data-proc-input="lever-forward" data-proc-label="${def.labels.lever} FORWARD" ${disabled}>Forward</button><button type="button" data-proc-input="lever-center" data-proc-label="${def.labels.lever} CENTER" ${disabled}>Center</button><button type="button" data-proc-input="lever-aft" data-proc-label="${def.labels.lever} AFT" ${disabled}>Aft</button></div></div>
        <div class="exo-device-block exo-confirm-block"><span class="exo-device-label">Momentary pushbuttons</span><strong>PRESS AS PROCEDURE REQUIRES</strong>
          <div class="exo-control-row"><button type="button" data-proc-input="confirm-a" data-proc-label="${def.labels.confirmA}" ${disabled}>${def.labels.confirmA}</button><button type="button" data-proc-input="confirm-b" data-proc-label="${def.labels.confirmB}" ${disabled}>${def.labels.confirmB}</button></div></div>
        ${authorizationAssembly(def,controls,active)}
      </div>
      <div class="exo-sequence-recorder"><span class="exo-kicker">Input recorder</span><div class="exo-sequence-strip">${inputHistory()}</div></div>
    </div>`;
  }

  function renderStation(){
    const def=STATIONS[activeStation];
    $("station-panel").innerHTML=`<div class="exo-station-head"><div class="exo-station-title"><span class="exo-kicker">${state.profile.name} procedural watchstation</span><h2>${def.label}</h2><p>${def.description}</p></div>
      <div class="exo-station-readout">${def.readouts(state).map(([l,v])=>`<div class="exo-readout-chip"><span>${l}</span><strong>${v}</strong></div>`).join("")}</div></div>
      <div class="exo-station-body"><div class="exo-control-bank exo-procedure-bank">${procedureControls(def)}</div>${tacticalDisplay(def.display)}</div>
      <button type="button" class="exo-manual-launch" data-manual-open aria-label="Open ${def.label} operations manual"><span class="exo-manual-book-icon" aria-hidden="true"><i></i></span><b>OPS MANUAL</b><small>${def.procedures.length} ENTRIES</small></button>
      ${manualOpen?manualOverlay(def):""}`;
  }

  function renderDependencies(){
    const descriptions={
      helm:"Visual maneuver context: Helm power, Navigation picture and drive condition.",
      navigation:"Visual astrogation context: sensor picture, communications timebase and Navigation power.",
      gunnery:"Visual fire-control context: track picture, weapon power, hardware state and thermal margin.",
      engineering:"Visual plant context: Engineering power, drive/cooling/hull condition.",
      science:"Visual sensor context: Science power, sensor condition and thermal state.",
      comms:"Visual link context: Comms power and communications hardware."
    };
    $("dependency-grid").innerHTML=Object.entries(STATIONS).map(([key,def])=>{
      const value=stationContext(key), cls=value<45?"bad":value<72?"warn":"";
      return `<div class="exo-dependency"><strong>${def.label}</strong><span>${descriptions[key]}</span><b class="${cls}">${round(value)}%</b></div>`;
    }).join("");
    $("coordination-score").textContent=`${round(coordinationScore())}% visual`;
  }

  function renderLog(){
    $("operations-log").innerHTML=state.log.length?state.log.map(item=>`<li><time>${timeString(item.time)}</time><strong>${item.station}</strong><span>${item.message}</span></li>`).join(""):`<li><time>00:00</time><strong>System</strong><span>No events logged.</span></li>`;
  }

  function renderRelay(){
    const r=state.relay, difficulty=r?.difficulty??0;
    $("dm-relay-difficulty").textContent=r?difficulty:"—";
    $("dm-relay-pips").innerHTML=Array.from({length:10},(_,i)=>`<i class="${r&&i<difficulty?"active":""}" title="Pip ${i+1}">${i+1}</i>`).join("");
    if(!r){
      $("dm-relay-status").textContent="Awaiting executed procedure";
      $("dm-relay-detail").innerHTML=`<div><span>Station</span><strong>—</strong></div><div><span>Action</span><strong>—</strong></div><div><span>Procedure</span><strong>—</strong></div><div><span>Random d10</span><strong>—</strong></div><div><span>Visual context</span><strong>—</strong></div><div><span>Inputs</span><strong>—</strong></div>`;
      $("dm-relay-sequence").textContent="No procedure has been committed.";
      $("dm-relay-call").textContent="The console does not roll for the character and does not determine success or failure.";
      return;
    }
    $("dm-relay-status").textContent=`${r.classification} · suggested difficulty`;
    $("dm-relay-detail").innerHTML=`<div><span>Station</span><strong>${r.station}</strong></div><div><span>Action</span><strong>${r.operation}</strong></div>
      <div><span>Procedure</span><strong>${r.quality}% · ${r.classification}</strong></div><div><span>Random d10</span><strong>${r.randomD10} (${r.randomShift>=0?"+":""}${r.randomShift})</strong></div>
      <div><span>Visual context</span><strong>${r.context}% (${r.contextShift>=0?"+":""}${r.contextShift})</strong></div><div><span>Inputs</span><strong>${r.inputCount} / ${r.expectedCount} expected</strong></div>`;
    $("dm-relay-sequence").textContent=r.sequenceLabels.join(" → ");
    $("dm-relay-call").textContent=`DM RELAY: call for the character's normal World of Darkness-derived d10 pool against Difficulty ${r.difficulty}. The DM remains authoritative for pool construction, success thresholds, specialties, consequences, and edition/house-rule interpretation.`;
  }

  function renderAll(opts={}){
    renderTopState();
    if(!opts.skipPower) renderPowerControls();
    renderTabs(); renderStation(); renderDependencies(); renderLog(); renderRelay();
  }

  function editDistance(a,b){
    const m=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
    for(let i=0;i<=a.length;i++)m[i][0]=i;
    for(let j=0;j<=b.length;j++)m[0][j]=j;
    for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
      const cost=a[i-1]===b[j-1]?0:1;
      m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+cost);
    }
    return m[a.length][b.length];
  }

  function procedureQuality(actual,expected){
    if(!actual.length)return 0;
    const max=Math.max(actual.length,expected.length,1);
    const similarity=clamp(1-editDistance(actual,expected)/max,0,1);
    const aligned=expected.reduce((n,t,i)=>n+(actual[i]===t?1:0),0)/Math.max(expected.length,1);
    return clamp(Math.round((similarity*.72+aligned*.28)*100));
  }
  const classifyQuality=q=>q>=95?"by-the-book":q>=82?"minor deviation":q>=65?"workable sequence":q>=45?"poor sequence":"incorrect / hazardous sequence";
  const baseDifficulty=q=>q>=95?5:q>=82?6:q>=65?7:q>=45?8:9;

  function beginProcedure(){
    const proc=selectedProcedure();
    state.procedure={active:true,station:activeStation,operationId:proc.id,controls:initialControlState(),inputs:[],startedAt:state.simTime};
    addLog(STATIONS[activeStation].label,`Procedure started: ${proc.name}. Authorization key is out; execution shield is locked.`);
    renderStation();
  }

  function abortProcedure(){
    if(!state.procedure?.active)return;
    const station=STATIONS[state.procedure.station].label;
    state.procedure=null;
    addLog(station,"Procedure aborted; station inputs and authorization assembly reset.");
    renderStation();
  }

  function applyControlToken(token){
    const p=state.procedure;
    if(!p?.active||p.station!==activeStation)return {ok:false,reason:"No active procedure."};
    const c=p.controls;
    if(token==="auth-key-insert"){
      if(c.authKey!=="out")return {ok:false,reason:"Authorization key is already inserted."};
      c.authKey="inserted"; c.authLock="safe"; return {ok:true};
    }
    if(token==="auth-key-arm"){
      if(c.authKey==="out")return {ok:false,reason:"Key lock cannot turn without the authorization key inserted."};
      c.authKey="inserted"; c.authLock="armed"; return {ok:true};
    }
    if(token==="auth-shield-open"){
      if(c.authLock!=="armed")return {ok:false,reason:"Execution shield remains mechanically locked until the key is turned to ARM."};
      c.authShield="open"; return {ok:true};
    }
    if(token==="execute"){
      if(c.authLock!=="armed"||c.authShield!=="open")return {ok:false,reason:"Execution button is physically inaccessible until key ARM and shield UP."};
      return {ok:true};
    }
    if(token==="guard-open")c.guard="open";
    else if(token==="guard-close")c.guard="closed";
    else if(token.startsWith("mode-"))c.mode=token.slice(-1);
    else if(token.startsWith("bus-"))c.bus=token.slice(4);
    else if(token==="dial-left")c.dial-=1;
    else if(token==="dial-right")c.dial+=1;
    else if(token==="dial-center")c.dial=0;
    else if(token==="slider-low")c.slider=-1;
    else if(token==="slider-mid")c.slider=0;
    else if(token==="slider-high")c.slider=1;
    else if(token.startsWith("lever-"))c.lever=token.slice(6);
    return {ok:true};
  }

  function recordProcedureInput(token,label){
    const p=state.procedure;
    if(!p?.active||p.station!==activeStation){
      addLog(STATIONS[activeStation].label,"Control ignored: begin a procedure before manipulating the station.");
      return;
    }
    const result=applyControlToken(token);
    if(!result.ok){
      addLog(STATIONS[activeStation].label,`MECHANICAL INTERLOCK: ${result.reason}`);
      renderStation(); return;
    }
    p.inputs.push({token,label});
    if(p.inputs.length>24)p.inputs.shift();
    if(token==="execute"){ evaluateProcedure(); return; }
    renderStation();
  }

  function evaluateProcedure(){
    const p=state.procedure;
    if(!p?.active)return;
    const def=STATIONS[p.station], proc=def.procedures.find(x=>x.id===p.operationId)||def.procedures[0];
    const actual=p.inputs.map(x=>x.token), quality=procedureQuality(actual,proc.sequence), classification=classifyQuality(quality);
    const context=round(stationContext(p.station)), contextShift=context>=82?-1:context>=58?0:context>=38?1:2;
    const randomD10=d10(), randomShift=randomD10<=2?-1:randomD10>=9?1:0;
    const overrunShift=actual.length>proc.sequence.length+2?1:0;
    const difficulty=clamp(baseDifficulty(quality)+contextShift+randomShift+overrunShift,2,10);
    state.relay={station:def.label,operation:proc.name,quality,classification,context,contextShift,randomD10,randomShift,overrunShift,difficulty,inputCount:actual.length,expectedCount:proc.sequence.length,sequenceLabels:p.inputs.map(x=>x.label)};
    p.active=false;
    addLog(def.label,`${proc.name} committed through keyed execution assembly: procedure ${quality}% (${classification}), suggested Difficulty ${difficulty}. No success resolved.`);
    renderAll({skipPower:true});
  }

  function handleStationClick(event){
    const manualOpenButton=event.target.closest("[data-manual-open]");
    if(manualOpenButton){
      manualOpen=true; manualQuery=""; renderStation();
      requestAnimationFrame(()=>$('exo-manual-search')?.focus());
      return;
    }
    const manualCloseButton=event.target.closest("[data-manual-close]");
    if(manualCloseButton){ manualOpen=false; manualQuery=""; renderStation(); return; }
    if(manualOpen)return;
    const begin=event.target.closest("[data-procedure-begin]");
    if(begin){beginProcedure();return;}
    const abort=event.target.closest("[data-procedure-abort]");
    if(abort){abortProcedure();return;}
    const input=event.target.closest("[data-proc-input]");
    if(input)recordProcedureInput(input.dataset.procInput,input.dataset.procLabel||input.textContent.trim());
  }

  function handleStationInput(event){
    const search=event.target.closest("[data-manual-search-input]");
    if(!search)return;
    manualQuery=search.value;
    filterManualResults();
  }

  function handleStationChange(event){
    if(manualOpen)return;
    const slider=event.target.closest("[data-proc-slider]");
    if(slider){
      const value=Number(slider.value), token=value<0?"slider-low":value>0?"slider-high":"slider-mid";
      recordProcedureInput(token,`${STATIONS[activeStation].labels.slider} ${sliderText(value)}`); return;
    }
    const select=event.target.closest("[data-procedure-select]");
    if(!select)return;
    state.selectedProcedure[activeStation]=select.value;
    if(state.procedure?.active&&state.procedure.station===activeStation)state.procedure=null;
    renderStation();
  }

  function handlePowerInput(event){
    const input=event.target.closest("[data-power]"); if(!input)return;
    state.power[input.dataset.power]=Number(input.value);
    input.previousElementSibling.querySelector("b").textContent=input.value;
    const total=powerTotal(), badge=$("power-total");
    badge.textContent=`${total} / 100 visual points allocated`; badge.dataset.over=total>100?"true":"false";
    renderDependencies();
  }

  function commitPower(event){
    const input=event.target.closest("[data-power]");
    if(input)addLog("Engineering",`${STATIONS[input.dataset.power].label} visual power allocation set to ${input.value} points.`);
  }

  function reset(){
    state=initialState(); activeStation="helm"; manualOpen=false; manualQuery="";
    addLog("System","Human procedural bridge initialized: three operations per console, 7–9-input procedures, four-step keyed execution assembly, WoD-derived d10 difficulty relay.");
    renderAll();
  }

  function injectContact(){
    state.contact.present=true; state.contact.friendly=false; state.targetRange=38000+Math.random()*22000; state.targetBearing=Math.round(Math.random()*359);
    state.targetClosure=-.8-Math.random()*2.5; state.track=clamp(22+Math.random()*18); state.targetClass="unresolved"; state.targetIFF="unknown";
    addLog("Science",`ROLE-PLAY CONTACT: bearing ${state.targetBearing}°, range ${Math.round(state.targetRange).toLocaleString()} km. Await crew procedure and DM adjudication.`); renderAll();
  }

  function injectFault(){
    const faults=[["primary coolant loop oscillation","coolingHealth",18],["drive power-conditioning fault","driveHealth",16],["sensor mast timing fault","sensorHealth",20],["fire-control bus dropout","weaponHealth",19],["high-gain comms amplifier fault","commsHealth",22]];
    const [name,key,loss]=faults[Math.floor(Math.random()*faults.length)];
    state.engineeringFault=name; state[key]=clamp(state[key]-loss); state.thermal=clamp(state.thermal+8);
    addLog("Engineering",`ROLE-PLAY FAULT: ${name}. Visual ${key} reduced by ${loss} points; no game outcome resolved.`); renderAll();
  }

  function combatDrill(){
    state.contact.present=true; state.contact.friendly=false; state.targetRange=26000; state.targetBearing=52; state.targetClosure=-3.1; state.track=48;
    state.weaponMode="tracking"; state.nav=clamp(state.nav-8); state.reactor=82; state.thermal=clamp(state.thermal+11);
    addLog("System","ROLE-PLAY COMBAT DRILL loaded. Coordinate station procedures; every executed action produces a DM-facing difficulty rather than an automatic result."); renderAll();
  }

  function tick(){
    state.simTime+=1; if(!state.contact.present)return;
    state.targetRange=Math.max(50,state.targetRange+state.targetClosure*2); state.targetBearing=(state.targetBearing+.025)%360;
    state.contact.x=clamp(50+Math.cos(state.targetBearing*Math.PI/180)*34,8,92); state.contact.y=clamp(50+Math.sin(state.targetBearing*Math.PI/180)*34,8,92);
    if(state.simTime%4===0&&!manualOpen)renderStation();
  }

  function bindEvents(){
    $("station-tabs").addEventListener("click",e=>{const b=e.target.closest("[data-station]");if(!b)return;activeStation=b.dataset.station;manualQuery="";renderTabs();renderStation();});
    $("station-panel").addEventListener("click",handleStationClick);
    $("station-panel").addEventListener("input",handleStationInput);
    $("station-panel").addEventListener("change",handleStationChange);
    $("power-controls").addEventListener("input",handlePowerInput);
    $("power-controls").addEventListener("change",commitPower);
    $("crew-scenario-reset").addEventListener("click",reset);
    $("crew-scenario-contact").addEventListener("click",injectContact);
    $("crew-scenario-damage").addEventListener("click",injectFault);
    $("crew-scenario-battle").addEventListener("click",combatDrill);
    $("log-clear").addEventListener("click",()=>{state.log=[];renderLog();});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&manualOpen){manualOpen=false;manualQuery="";renderStation();}});
  }

  document.addEventListener("DOMContentLoaded",()=>{
    reset(); bindEvents();
    timer=window.setInterval(tick,1000);
    window.addEventListener("beforeunload",()=>window.clearInterval(timer),{once:true});
  });
})();