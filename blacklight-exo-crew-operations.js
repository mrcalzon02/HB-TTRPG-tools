(() => {
  "use strict";

  const PROFILE = Object.freeze({
    id:"human-standard", name:"Human Standard",
    assumptions:{commandModel:"distributed watchstations",powerCarrier:"electrical bus",sensorModel:"passive + active electromagnetic",commsModel:"radio + laser datalink",maneuverModel:"RCS + conventional main drive",weaponModel:"human fire-control authorization"}
  });
  const $ = id => document.getElementById(id);
  const clamp = (v,a=0,b=100) => Math.min(b,Math.max(a,v));
  const round = (v,d=0) => Number(v.toFixed(d));
  const initial = () => ({
    profile:PROFILE,simTime:0,readiness:"nominal",efficiency:100,velocity:12.4,heading:37,throttle:22,reactor:68,thermal:31,hull:100,track:42,comms:88,nav:74,weapons:61,
    driveHealth:100,sensorHealth:100,commsHealth:100,weaponHealth:100,coolingHealth:100,targetRange:42000,targetBearing:74,targetClosure:-1.7,targetClass:"unresolved",targetIFF:"unknown",activeScan:false,emissions:18,firingSolution:0,courseCommitted:false,navDestination:"Rendezvous Alpha",navBurnDeltaV:2.1,commsChannel:"Fleet tactical",commsEncryption:true,distress:false,weaponGroup:"Coil battery A",weaponMode:"safe",capacitors:54,engineeringFault:null,
    power:{helm:16,navigation:14,gunnery:17,engineering:23,science:17,comms:13},stationOnline:{helm:true,navigation:true,gunnery:true,engineering:true,science:true,comms:true},contact:{present:false,friendly:false,x:76,y:31},log:[]
  });
  let state=initial(), activeStation="helm", timer=null;
  const basePower={helm:16,navigation:14,gunnery:17,engineering:23,science:17,comms:13};
  const powerTotal=()=>Object.values(state.power).reduce((a,b)=>a+b,0);
  const powerFactor=k=>clamp(state.power[k]/basePower[k]*100);
  const engQuality=()=> (state.driveHealth+state.coolingHealth+state.hull)/3;

  const stations={
    helm:{label:"Helm",description:"Controls attitude, throttle, maneuvering, and immediate collision avoidance. Helm quality depends on Engineering power and Navigation solution quality.",readouts:()=>[["Heading",`${round(state.heading)}°`],["Velocity",`${round(state.velocity,1)} km/s`],["Throttle",`${round(state.throttle)}%`],["Drive",`${round(state.driveHealth)}%`]],display:"maneuver",controls:()=>`
      <div class="exo-control"><span class="exo-control-title">Main-drive throttle</span><input data-control="helm-throttle" type="range" min="0" max="100" value="${round(state.throttle)}"><div class="exo-control-row"><button data-action="helm-apply" class="exo-control-button primary">Apply thrust</button><button data-action="helm-idle" class="exo-control-button">Idle drive</button></div></div>
      <div class="exo-control"><label>Command heading</label><input data-control="helm-heading" type="number" min="0" max="359" value="${round(state.heading)}"><div class="exo-control-row"><button data-action="helm-turn" class="exo-control-button primary">Execute turn</button><button data-action="helm-evade" class="exo-control-button danger">Evasive burn</button></div></div>
      <div class="exo-control wide"><span class="exo-control-title">Flight authority</span><div class="exo-control-row"><button data-action="helm-hold" class="exo-control-button">Hold attitude</button><button data-action="helm-nav" class="exo-control-button ${state.courseCommitted?"primary":""}">Fly nav solution</button><button data-action="helm-brake" class="exo-control-button">Retrograde braking</button></div></div>`},
    navigation:{label:"Navigation",description:"Builds course solutions, predicts burns, and hands executable vectors to Helm. Better Science tracks and stable Communications improve route confidence.",readouts:()=>[["Solution",`${round(state.nav)}%`],["Destination",state.navDestination],["Δv plan",`${round(state.navBurnDeltaV,2)} km/s`],["Committed",state.courseCommitted?"yes":"no"]],display:"plot",controls:()=>`
      <div class="exo-control"><label>Destination / waypoint</label><select data-control="nav-destination"><option ${state.navDestination==="Rendezvous Alpha"?"selected":""}>Rendezvous Alpha</option><option ${state.navDestination==="L4 Survey Marker"?"selected":""}>L4 Survey Marker</option><option ${state.navDestination==="Deep-space hold"?"selected":""}>Deep-space hold</option><option ${state.navDestination==="Emergency egress"?"selected":""}>Emergency egress</option></select></div>
      <div class="exo-control"><label>Planned delta-v (km/s)</label><input data-control="nav-dv" type="number" min="0" max="20" step=".1" value="${round(state.navBurnDeltaV,1)}"><div class="exo-control-row"><button data-action="nav-solve" class="exo-control-button primary">Recalculate</button></div></div>
      <div class="exo-control wide"><span class="exo-control-title">Course workflow</span><div class="exo-control-row"><button data-action="nav-refine" class="exo-control-button">Refine with sensor track</button><button data-action="nav-commit" class="exo-control-button primary">Commit to Helm</button><button data-action="nav-clear" class="exo-control-button">Clear course</button></div></div>`},
    gunnery:{label:"Gunnery",description:"Turns Science tracks into firing solutions, charges weapon groups, and authorizes fire. Weapons are limited by track quality, power, thermal headroom, and Engineering health.",readouts:()=>[["Weapon group",state.weaponGroup],["Capacitors",`${round(state.capacitors)}%`],["Solution",`${round(state.firingSolution)}%`],["Mode",state.weaponMode]],display:"target",controls:()=>`
      <div class="exo-control"><label>Weapon group</label><select data-control="gun-group"><option ${state.weaponGroup==="Coil battery A"?"selected":""}>Coil battery A</option><option ${state.weaponGroup==="Point defense"?"selected":""}>Point defense</option><option ${state.weaponGroup==="Missile cells"?"selected":""}>Missile cells</option><option ${state.weaponGroup==="Spinal accelerator"?"selected":""}>Spinal accelerator</option></select></div>
      <div class="exo-control"><span class="exo-control-title">Fire-control mode</span><div class="exo-control-row"><button data-action="gun-safe" class="exo-control-button">Safe</button><button data-action="gun-track" class="exo-control-button">Track</button><button data-action="gun-arm" class="exo-control-button danger">Arm</button></div></div>
      <div class="exo-control wide"><span class="exo-control-title">Engagement sequence</span><div class="exo-control-row"><button data-action="gun-charge" class="exo-control-button">Charge capacitors</button><button data-action="gun-solution" class="exo-control-button primary">Build firing solution</button><button data-action="gun-fire" class="exo-control-button danger" ${state.weaponMode!=="armed"||state.firingSolution<60?"disabled":""}>Fire selected group</button></div></div>`},
    engineering:{label:"Engineering",description:"Owns reactor output, cooling, damage control, and the shipwide power bus. Engineering decisions directly cap what every other station can accomplish.",readouts:()=>[["Reactor",`${round(state.reactor)}%`],["Thermal",`${round(state.thermal)}%`],["Cooling",`${round(state.coolingHealth)}%`],["Fault",state.engineeringFault||"none"]],display:"systems",controls:()=>`
      <div class="exo-control"><span class="exo-control-title">Reactor demand</span><input data-control="eng-reactor" type="range" min="20" max="100" value="${round(state.reactor)}"><div class="exo-control-row"><button data-action="eng-reactor" class="exo-control-button primary">Set output</button></div></div>
      <div class="exo-control"><span class="exo-control-title">Thermal management</span><div class="exo-control-row"><button data-action="eng-cool" class="exo-control-button">Increase cooling</button><button data-action="eng-radiators" class="exo-control-button">Extend radiators</button></div></div>
      <div class="exo-control wide"><span class="exo-control-title">Damage control</span><div class="exo-control-row"><button data-action="eng-diagnose" class="exo-control-button">Run diagnostics</button><button data-action="eng-repair" class="exo-control-button primary" ${!state.engineeringFault?"disabled":""}>Dispatch repair team</button><button data-action="eng-scram" class="exo-control-button danger">Emergency SCRAM</button></div></div>`},
    science:{label:"Science / Scanning",description:"Detects, classifies, and refines contacts. Track quality feeds Navigation and Gunnery while active scans improve data at the cost of emissions.",readouts:()=>[["Track",`${round(state.track)}%`],["Class",state.targetClass],["Range",state.contact.present?`${Math.round(state.targetRange).toLocaleString()} km`:"no contact"],["Emissions",`${round(state.emissions)}%`]],display:"sensor",controls:()=>`
      <div class="exo-control"><span class="exo-control-title">Sensor posture</span><div class="exo-control-row"><button data-action="sci-passive" class="exo-control-button">Passive sweep</button><button data-action="sci-active" class="exo-control-button primary">Active scan</button><button data-action="sci-focus" class="exo-control-button">Focus track</button></div></div>
      <div class="exo-control"><label>Sensor band</label><select><option>Multi-spectrum</option><option>Thermal / infrared</option><option>Radar / lidar</option><option>Gravimetric derived</option></select></div>
      <div class="exo-control wide"><span class="exo-control-title">Analysis pipeline</span><div class="exo-control-row"><button data-action="sci-classify" class="exo-control-button">Classify contact</button><button data-action="sci-share" class="exo-control-button primary">Publish track shipwide</button></div></div>`},
    comms:{label:"Comms",description:"Maintains ship, fleet, and remote links; authenticates contacts; and distributes external data. Link quality contributes to navigation confidence and cooperative targeting.",readouts:()=>[["Link",`${round(state.comms)}%`],["Channel",state.commsChannel],["Encryption",state.commsEncryption?"enabled":"open"],["IFF",state.targetIFF]],display:"link",controls:()=>`
      <div class="exo-control"><label>Primary channel</label><select data-control="comms-channel"><option ${state.commsChannel==="Fleet tactical"?"selected":""}>Fleet tactical</option><option ${state.commsChannel==="Civil navigation"?"selected":""}>Civil navigation</option><option ${state.commsChannel==="Tightbeam laser"?"selected":""}>Tightbeam laser</option><option ${state.commsChannel==="Emergency broadwave"?"selected":""}>Emergency broadwave</option></select></div>
      <div class="exo-control"><span class="exo-control-title">Link security</span><div class="exo-control-row"><button data-action="comms-encrypt" class="exo-control-button ${state.commsEncryption?"primary":""}">Toggle encryption</button><button data-action="comms-handshake" class="exo-control-button">Authenticate contact</button></div></div>
      <div class="exo-control wide"><span class="exo-control-title">Transmit</span><div class="exo-control-row"><button data-action="comms-hail" class="exo-control-button primary">Hail contact</button><button data-action="comms-data" class="exo-control-button">Send nav / track data</button><button data-action="comms-distress" class="exo-control-button danger">Distress burst</button></div></div>`}
  };

  const dependencies=[
    ["Helm","Engineering power + Navigation solution determine maneuver precision.",()=>Math.min(powerFactor("helm"),state.nav)],
    ["Navigation","Science track + Comms link improve route and rendezvous confidence.",()=>state.track*.55+state.comms*.45],
    ["Gunnery","Science track + Engineering power + thermal headroom cap firing quality.",()=>Math.min(state.track,powerFactor("gunnery"),100-Math.max(0,state.thermal-45))],
    ["Engineering","Reactor, cooling and repair status provide the operational ceiling for all stations.",()=>engQuality()],
    ["Science","Engineering power and sensor health determine collection rate.",()=>Math.min(powerFactor("science"),state.sensorHealth)],
    ["Comms","Engineering power and comms hardware determine usable link quality.",()=>Math.min(powerFactor("comms"),state.commsHealth)]
  ];

  function calculate(){
    const over=Math.max(0,powerTotal()-100), eq=engQuality();
    const avg=Object.keys(state.stationOnline).reduce((sum,k)=>sum+(state.stationOnline[k]?Math.min(powerFactor(k),100):0),0)/6;
    state.weapons=clamp(state.weaponHealth*.35+powerFactor("gunnery")*.25+state.capacitors*.2+state.track*.2-over*2.2);
    state.comms=clamp(state.commsHealth*.52+powerFactor("comms")*.33+(state.commsEncryption?5:0)-over*1.3);
    state.nav=clamp(powerFactor("navigation")*.35+state.track*.24+state.comms*.18+eq*.23-(state.courseCommitted?0:4));
    state.efficiency=clamp(avg*.42+eq*.28+state.nav*.12+state.track*.1+state.comms*.08-over*1.7);
    if(state.hull<40||state.reactor>94||state.thermal>88) state.readiness="critical";
    else if(state.engineeringFault||state.hull<75||state.thermal>70||state.efficiency<70) state.readiness="degraded";
    else if(state.contact.present&&state.weaponMode==="armed") state.readiness="action stations";
    else state.readiness="nominal";
  }
  function log(station,message){state.log.unshift({time:state.simTime,station,message});state.log=state.log.slice(0,80);renderLog();}
  function time(s){const m=String(Math.floor(s/60)).padStart(2,"0"),x=String(Math.floor(s%60)).padStart(2,"0");return `${m}:${x}`;}
  function renderTop(){
    calculate();
    const values={velocity:`${round(state.velocity,1)} km/s`,reactor:`${round(state.reactor)}%`,thermal:`${round(state.thermal)}%`,hull:`${round(state.hull)}%`,track:`${round(state.track)}%`,comms:`${round(state.comms)}%`,nav:`${round(state.nav)}%`,weapons:`${round(state.weapons)}%`};
    Object.entries(values).forEach(([k,v])=>{const t=$(`state-${k}`),m=$(`meter-${k}`);if(t)t.textContent=v;if(m)m.style.width=`${clamp(k==="velocity"?state.velocity*4:state[k])}%`;});
    $("crew-summary-readiness").textContent=state.readiness;$("crew-summary-efficiency").textContent=`${round(state.efficiency)}%`;$("crew-profile-name").textContent=state.profile.name;
  }
  function renderPower(){
    $("power-controls").innerHTML=Object.keys(state.power).map(k=>`<div class="exo-power-control"><label><span>${stations[k].label}</span><b>${state.power[k]}</b></label><input data-power="${k}" type="range" min="4" max="30" value="${state.power[k]}"></div>`).join("");
    const total=powerTotal(), badge=$("power-total");badge.textContent=`${total} / 100 points allocated`;badge.dataset.over=total>100?"true":"false";
  }
  function renderTabs(){$("station-tabs").innerHTML=Object.entries(stations).map(([k,d])=>`<button class="exo-station-tab" type="button" role="tab" data-station="${k}" aria-selected="${activeStation===k}">${d.label}<span class="tab-state">${state.stationOnline[k]?"station online":"station offline"}</span></button>`).join("");}
  function tactical(kind){const c=state.contact;return `<div class="exo-tactical-display" aria-label="${kind} display"><div class="exo-tactical-ring"></div><div class="exo-ownship" title="Own ship"></div><div class="exo-contact ${c.friendly?"friend":""}" style="left:${c.x}%;top:${c.y}%;opacity:${c.present?1:0}" title="${state.targetClass}"></div><span class="exo-display-caption">${kind} // ${c.present?`${round(state.targetBearing)}° · ${Math.round(state.targetRange).toLocaleString()} km`:"no remote track"}</span></div>`;}
  function renderStation(){const d=stations[activeStation];$("station-panel").innerHTML=`<div class="exo-station-head"><div class="exo-station-title"><span class="exo-kicker">${state.profile.name} watchstation</span><h2>${d.label}</h2><p>${d.description}</p></div><div class="exo-station-readout">${d.readouts().map(([a,b])=>`<div class="exo-readout-chip"><span>${a}</span><strong>${b}</strong></div>`).join("")}</div></div><div class="exo-station-body"><div class="exo-control-bank">${d.controls()}</div>${tactical(d.display)}</div>`;}
  function renderDeps(){$("dependency-grid").innerHTML=dependencies.map(([a,b,get])=>{const v=clamp(get()),c=v<45?"bad":v<72?"warn":"";return `<div class="exo-dependency"><strong>${a}</strong><span>${b}</span><b class="${c}">${round(v)}%</b></div>`;}).join("");$("coordination-score").textContent=`${round(state.efficiency)}%`;}
  function renderLog(){const h=$("operations-log");h.innerHTML=state.log.length?state.log.map(i=>`<li><time>${time(i.time)}</time><strong>${i.station}</strong><span>${i.message}</span></li>`).join(""):`<li><time>00:00</time><strong>System</strong><span>No events logged.</span></li>`;}
  function renderAll(skipPower=false){renderTop();if(!skipPower)renderPower();renderTabs();renderStation();renderDeps();renderLog();}

  function act(name){
    const q=s=>document.querySelector(s), num=(s,f)=>Number(q(s)?.value??f);
    const A={
      "helm-apply":()=>{state.throttle=clamp(num('[data-control="helm-throttle"]',state.throttle));state.velocity+=state.throttle*.015*powerFactor("helm")*state.driveHealth/10000;state.thermal=clamp(state.thermal+state.throttle*.035);log("Helm",`Applied ${round(state.throttle)}% thrust; velocity ${round(state.velocity,1)} km/s.`);},
      "helm-idle":()=>{state.throttle=0;log("Helm","Main drive returned to idle thrust.");},
      "helm-turn":()=>{state.heading=((num('[data-control="helm-heading"]',state.heading)%360)+360)%360;state.thermal=clamp(state.thermal+1.4);log("Helm",`Executed attitude change to ${round(state.heading)}°.`);},
      "helm-evade":()=>{state.heading=(state.heading+37+Math.random()*52)%360;state.velocity+=.45;state.thermal=clamp(state.thermal+9);state.nav=clamp(state.nav-12);state.firingSolution=clamp(state.firingSolution-28);log("Helm","Evasive burn disturbed Navigation and Gunnery solutions.");},
      "helm-hold":()=>log("Helm",`Attitude hold engaged at ${round(state.heading)}°.`),
      "helm-nav":()=>state.courseCommitted?log("Helm",`Accepted Navigation course for ${state.navDestination}.`):log("Helm","No committed Navigation course available."),
      "helm-brake":()=>{state.velocity=Math.max(0,state.velocity-.8);state.thermal=clamp(state.thermal+5);log("Helm",`Retrograde burn; velocity ${round(state.velocity,1)} km/s.`);},
      "nav-solve":()=>{state.navDestination=q('[data-control="nav-destination"]')?.value||state.navDestination;state.navBurnDeltaV=clamp(num('[data-control="nav-dv"]',0),0,20);state.nav=clamp(state.nav+6*powerFactor("navigation")/100);log("Navigation",`Recalculated ${state.navDestination} at Δv ${round(state.navBurnDeltaV,1)} km/s.`);},
      "nav-refine":()=>{const g=state.track*.13;state.nav=clamp(state.nav+g);log("Navigation",`Refined course using Science track (+${round(g)}).`);},
      "nav-commit":()=>{state.courseCommitted=true;log("Navigation",`Committed ${state.navDestination} solution to Helm.`);},
      "nav-clear":()=>{state.courseCommitted=false;state.nav=clamp(state.nav-8);log("Navigation","Cleared committed flight solution.");},
      "gun-safe":()=>{state.weaponMode="safe";log("Gunnery","Selected weapons safed.");},
      "gun-track":()=>{state.weaponMode="tracking";log("Gunnery","Fire-control tracking enabled.");},
      "gun-arm":()=>{state.weaponMode="armed";state.thermal=clamp(state.thermal+2);log("Gunnery",`${state.weaponGroup} armed.`);},
      "gun-charge":()=>{const g=Math.max(3,powerFactor("gunnery")*.12);state.capacitors=clamp(state.capacitors+g);state.thermal=clamp(state.thermal+g*.18);log("Gunnery",`Capacitors charged to ${round(state.capacitors)}%.`);},
      "gun-solution":()=>{state.firingSolution=clamp(Math.min(state.track,state.weapons,state.nav+10));log("Gunnery",`Firing solution ${round(state.firingSolution)}%.`);},
      "gun-fire":()=>{if(state.weaponMode!=="armed"||state.firingSolution<60){log("Gunnery","Fire rejected: arm weapon and build ≥60% solution.");return;}const e=state.weaponGroup==="Point defense"?12:state.weaponGroup==="Missile cells"?8:28;state.capacitors=clamp(state.capacitors-e);state.thermal=clamp(state.thermal+e*.7);state.firingSolution=clamp(state.firingSolution-18);const hit=state.contact.present&&Math.random()<state.track/115;if(hit)state.contact.present=Math.random()>.65;log("Gunnery",`${state.weaponGroup} fired; ${hit?"probable effect":"no confirmed effect"}.`);},
      "eng-reactor":()=>{state.reactor=clamp(num('[data-control="eng-reactor"]',state.reactor),20,100);state.thermal=clamp(state.thermal+Math.max(0,state.reactor-70)*.08);log("Engineering",`Reactor output set to ${round(state.reactor)}%.`);},
      "eng-cool":()=>{state.thermal=clamp(state.thermal-9*state.coolingHealth/100);log("Engineering","Coolant flow increased.");},
      "eng-radiators":()=>{state.thermal=clamp(state.thermal-14*state.coolingHealth/100);state.emissions=clamp(state.emissions+12);log("Engineering","Radiators extended; heat reduced, emissions increased.");},
      "eng-diagnose":()=>log("Engineering",state.engineeringFault?`Diagnostics isolate: ${state.engineeringFault}.`:"Diagnostics complete: no active fault."),
      "eng-repair":()=>{if(!state.engineeringFault)return;const f=state.engineeringFault;state.engineeringFault=null;["driveHealth","coolingHealth"].forEach(k=>state[k]=clamp(state[k]+18));["sensorHealth","commsHealth","weaponHealth"].forEach(k=>state[k]=clamp(state[k]+8));log("Engineering",`Repair team cleared ${f}.`);},
      "eng-scram":()=>{state.reactor=20;state.thermal=clamp(state.thermal-8);state.power={helm:10,navigation:8,gunnery:4,engineering:50,science:12,comms:16};log("Engineering","Emergency SCRAM; survival bus priority engaged.");},
      "sci-passive":()=>{state.activeScan=false;state.emissions=clamp(state.emissions-7);state.track=clamp(state.track+(state.contact.present?3.5*powerFactor("science")/100:.8));log("Science",`Passive sweep; track ${round(state.track)}%.`);},
      "sci-active":()=>{state.activeScan=true;state.emissions=clamp(state.emissions+18);if(!state.contact.present&&Math.random()>.2)state.contact.present=true;state.track=clamp(state.track+12*powerFactor("science")/100*state.sensorHealth/100);log("Science",`Active pulse; track ${round(state.track)}%.`);},
      "sci-focus":()=>{if(!state.contact.present){log("Science","Focus rejected: no contact selected.");return;}state.track=clamp(state.track+8);state.emissions=clamp(state.emissions+5);log("Science","Sensor apertures focused on contact.");},
      "sci-classify":()=>{if(!state.contact.present){log("Science","Classification unavailable: no contact.");return;}state.targetClass=state.track>78?"medium transit vessel":state.track>50?"powered vessel":"unresolved contact";log("Science",`Classification: ${state.targetClass}.`);},
      "sci-share":()=>{state.nav=clamp(state.nav+state.track*.06);state.firingSolution=clamp(state.firingSolution+state.track*.05);log("Science","Published track to Navigation and Gunnery.");},
      "comms-encrypt":()=>{state.commsEncryption=!state.commsEncryption;log("Comms",`Encryption ${state.commsEncryption?"enabled":"disabled"}.`);},
      "comms-handshake":()=>{if(!state.contact.present){log("Comms","Authentication has no selected contact.");return;}state.targetIFF=state.track>65?(Math.random()>.55?"authenticated neutral":"unverified"):"unverified";log("Comms",`IFF result: ${state.targetIFF}.`);},
      "comms-hail":()=>{state.commsChannel=q('[data-control="comms-channel"]')?.value||state.commsChannel;log("Comms",`Hail transmitted on ${state.commsChannel}.`);},
      "comms-data":()=>{state.nav=clamp(state.nav+4);state.track=clamp(state.track+2);log("Comms","Shared Navigation / Science data packet.");},
      "comms-distress":()=>{state.distress=true;state.commsChannel="Emergency broadwave";state.emissions=100;log("Comms","Emergency distress burst at maximum power.");}
    };
    if(name.startsWith("gun-")&&q('[data-control="gun-group"]'))state.weaponGroup=q('[data-control="gun-group"]').value;
    if(A[name]){A[name]();renderAll();}
  }

  function tick(){
    state.simTime++;state.velocity=Math.max(0,state.velocity+state.throttle*.0022*(state.reactor/100));state.thermal=clamp(state.thermal+(state.reactor-55)*.005+state.throttle*.004-state.coolingHealth*.0027);
    if(state.thermal>82){state.driveHealth=clamp(state.driveHealth-.045);state.weaponHealth=clamp(state.weaponHealth-.025);}
    if(state.contact.present){state.targetRange=Math.max(50,state.targetRange+state.targetClosure*10);state.targetBearing=(state.targetBearing+.08)%360;state.contact.x=clamp(50+Math.cos(state.targetBearing*Math.PI/180)*34,8,92);state.contact.y=clamp(50+Math.sin(state.targetBearing*Math.PI/180)*34,8,92);if(!state.activeScan)state.track=clamp(state.track-.025);}else state.track=clamp(state.track-.012);
    state.emissions=clamp(state.emissions-.035);state.capacitors=clamp(state.capacitors+powerFactor("gunnery")*.004);calculate();renderTop();renderDeps();if(state.simTime%2===0)renderStation();
  }
  function reset(){state=initial();activeStation="helm";log("System","Human-derived BLV-071 Wayfarer watch initialized. All six stations online.");renderAll();}
  function contact(){state.contact.present=true;state.contact.friendly=false;state.targetRange=38000+Math.random()*22000;state.targetBearing=Math.round(Math.random()*359);state.targetClosure=-.8-Math.random()*2.5;state.track=22+Math.random()*18;state.targetClass="unresolved";state.targetIFF="unknown";log("Science",`New contact at ${state.targetBearing}°, ${Math.round(state.targetRange).toLocaleString()} km.`);renderAll();}
  function fault(){const f=[["primary coolant loop oscillation","coolingHealth",18],["drive power-conditioning fault","driveHealth",16],["sensor mast timing fault","sensorHealth",20],["fire-control bus dropout","weaponHealth",19],["high-gain comms amplifier fault","commsHealth",22]],x=f[Math.floor(Math.random()*f.length)];state.engineeringFault=x[0];state[x[1]]=clamp(state[x[1]]-x[2]);state.thermal=clamp(state.thermal+8);log("Engineering",`FAULT: ${x[0]}; ${x[1]} degraded ${x[2]} points.`);renderAll();}
  function combat(){state.contact.present=true;state.contact.friendly=false;state.targetRange=26000;state.targetBearing=52;state.targetClosure=-3.1;state.track=48;state.weaponMode="tracking";state.firingSolution=32;state.nav=clamp(state.nav-8);state.reactor=82;state.thermal=clamp(state.thermal+11);log("System","COMBAT DRILL: hostile-behavior contact injected. Coordinate all six stations.");renderAll();}

  document.addEventListener("DOMContentLoaded",()=>{
    reset();
    $("station-tabs").addEventListener("click",e=>{const b=e.target.closest("[data-station]");if(!b)return;activeStation=b.dataset.station;renderTabs();renderStation();});
    $("station-panel").addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(b)act(b.dataset.action);});
    $("station-panel").addEventListener("change",e=>{if(e.target.matches('[data-control="gun-group"]'))state.weaponGroup=e.target.value;if(e.target.matches('[data-control="nav-destination"]'))state.navDestination=e.target.value;if(e.target.matches('[data-control="comms-channel"]'))state.commsChannel=e.target.value;});
    $("power-controls").addEventListener("input",e=>{const i=e.target.closest("[data-power]");if(!i)return;state.power[i.dataset.power]=Number(i.value);i.previousElementSibling.querySelector("b").textContent=i.value;const t=powerTotal(),b=$("power-total");b.textContent=`${t} / 100 points allocated`;b.dataset.over=t>100?"true":"false";renderTop();renderDeps();});
    $("power-controls").addEventListener("change",e=>{const i=e.target.closest("[data-power]");if(i){log("Engineering",`${stations[i.dataset.power].label} power allocation set to ${i.value} points.`);renderStation();}});
    $("crew-scenario-reset").addEventListener("click",reset);$("crew-scenario-contact").addEventListener("click",contact);$("crew-scenario-damage").addEventListener("click",fault);$("crew-scenario-battle").addEventListener("click",combat);$("log-clear").addEventListener("click",()=>{state.log=[];renderLog();});
    timer=window.setInterval(tick,1000);window.addEventListener("beforeunload",()=>window.clearInterval(timer),{once:true});
  });
})();
