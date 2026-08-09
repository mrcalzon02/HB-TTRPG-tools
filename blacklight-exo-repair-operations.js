(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const clamp = (v, a = 0, b = 100) => Math.min(b, Math.max(a, v));
  const d10 = () => Math.floor(Math.random() * 10) + 1;
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const escapeXml = value => String(value).replace(/[<>&'\"]/g, ch => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", "'":"&apos;", '\"':"&quot;" }[ch]));

  const STATIONS = Object.freeze({
    helm:{label:"Helm",output:"Thrust / attitude command interface",labels:{guard:"Flight inhibit guard",mode:"Flight-mode rotary",bus:"Thruster manifold selector",dial:"Attitude trim knob",slider:"Translation demand slider",lever:"Thrust gate lever",confirmA:"Vector confirm",confirmB:"Pilot acknowledge",execute:"Thrust execution relay"}},
    navigation:{label:"Navigation",output:"Committed navigation-solution interface",labels:{guard:"Solution inhibit guard",mode:"Solution-mode rotary",bus:"Reference-source selector",dial:"Transfer index knob",slider:"Δv bias slider",lever:"Solution gate lever",confirmA:"Vector confirm",confirmB:"Timebase lock",execute:"Solution commit relay"}},
    gunnery:{label:"Gunnery",output:"Fire-control / weapon authorization interface",labels:{guard:"Weapon arm guard",mode:"Fire-control rotary",bus:"Track / weapon feed selector",dial:"Range-rate gate knob",slider:"Capacitor demand slider",lever:"Weapon arm lever",confirmA:"Track confirm",confirmB:"Weapons acknowledge",execute:"Weapon execution relay"}},
    engineering:{label:"Engineering",output:"Plant configuration / distribution interface",labels:{guard:"Plant safety guard",mode:"Plant-mode rotary",bus:"Distribution-source selector",dial:"Load-share trim knob",slider:"Coolant / load command slider",lever:"Bus-tie lever",confirmA:"Plant confirm",confirmB:"Casualty acknowledge",execute:"Configuration execution relay"}},
    science:{label:"Science / Scanning",output:"Sensor acquisition / emitter interface",labels:{guard:"Emitter inhibit guard",mode:"Sensor-mode rotary",bus:"Aperture / receiver selector",dial:"Receiver-gain knob",slider:"Integration-time slider",lever:"Emitter gate lever",confirmA:"Track confirm",confirmB:"Analyst acknowledge",execute:"Acquisition execution relay"}},
    comms:{label:"Comms",output:"Carrier / transmitter command interface",labels:{guard:"Transmit inhibit guard",mode:"Link-mode rotary",bus:"Carrier-path selector",dial:"Frequency vernier knob",slider:"Power / beamwidth slider",lever:"Transmit key lever",confirmA:"Address confirm",confirmB:"Crypto acknowledge",execute:"Transmit execution relay"}}
  });

  const NODE_TEMPLATE = Object.freeze([
    {id:"power-in",kind:"power feed",zone:"power",x:34,y:252,w:112,h:58,fixed:"28 VDC / logic feed"},
    {id:"main-fuse",kind:"protective fuse",zone:"power",x:178,y:252,w:112,h:58,fixed:"Panel protective fuse"},
    {id:"control-bus",kind:"control backplane",zone:"power",x:322,y:242,w:126,h:78,fixed:"Control / logic backplane"},
    {id:"guard",kind:"guarded switch",zone:"controls",x:476,y:58,w:132,h:62,key:"guard"},
    {id:"mode",kind:"rotary selector",zone:"controls",x:638,y:58,w:132,h:62,key:"mode"},
    {id:"bus-selector",kind:"source selector",zone:"controls",x:800,y:58,w:156,h:62,key:"bus"},
    {id:"dial",kind:"rotary trim",zone:"controls",x:476,y:168,w:132,h:62,key:"dial"},
    {id:"slider",kind:"linear command",zone:"controls",x:638,y:168,w:132,h:62,key:"slider"},
    {id:"lever",kind:"three-position lever",zone:"controls",x:800,y:168,w:156,h:62,key:"lever"},
    {id:"confirm-a",kind:"momentary confirm",zone:"controls",x:506,y:292,w:146,h:60,key:"confirmA"},
    {id:"confirm-b",kind:"momentary acknowledge",zone:"controls",x:714,y:292,w:160,h:60,key:"confirmB"},
    {id:"auth-key",kind:"key receptacle",zone:"authorization",x:442,y:416,w:132,h:62,fixed:"Authorization key receptacle"},
    {id:"auth-lock",kind:"keyed interlock",zone:"authorization",x:604,y:416,w:132,h:62,fixed:"SAFE / ARM key lock"},
    {id:"shield-switch",kind:"shield interlock",zone:"authorization",x:766,y:416,w:132,h:62,fixed:"Execution shield interlock"},
    {id:"execute-relay",kind:"safety relay",zone:"output",x:838,y:514,w:134,h:60,key:"execute"},
    {id:"feedback-return",kind:"feedback monitor",zone:"output",x:296,y:512,w:140,h:60,fixed:"Command-state feedback"},
    {id:"station-output",kind:"downstream interface",zone:"output",x:614,y:520,w:184,h:60,output:true}
  ]);

  const EDGE_TEMPLATE = Object.freeze([
    ["pwr-a","power-in","main-fuse","power"],["pwr-b","main-fuse","control-bus","power"],
    ["pwr-guard","control-bus","guard","power"],["pwr-mode","control-bus","mode","power"],["pwr-bus","control-bus","bus-selector","power"],["pwr-dial","control-bus","dial","power"],["pwr-slider","control-bus","slider","power"],["pwr-lever","control-bus","lever","power"],
    ["sig-guard-mode","guard","mode","signal"],["sig-mode-bus","mode","bus-selector","signal"],["sig-bus-dial","bus-selector","dial","signal"],["sig-dial-slider","dial","slider","signal"],["sig-slider-lever","slider","lever","signal"],["sig-lever-confirm-a","lever","confirm-a","signal"],["sig-confirm-a-b","confirm-a","confirm-b","signal"],["sig-confirm-auth","confirm-b","auth-key","signal"],
    ["safe-key-lock","auth-key","auth-lock","safety"],["safe-lock-shield","auth-lock","shield-switch","safety"],["safe-shield-relay","shield-switch","execute-relay","safety"],["safe-relay-output","execute-relay","station-output","safety"],
    ["return-output-monitor","station-output","feedback-return","return"],["return-monitor-confirm","feedback-return","confirm-b","return"]
  ]);

  const FAULT_TYPES = Object.freeze([
    {id:"blown-fuse",label:"protective fuse open",target:"node",candidates:["main-fuse"],repairAction:"replace",visual:"obvious",faceplate:"CONTROL POWER DROP",symptom:s=>`${s.label} loses the control bus after a transient. Panel feed is present upstream, but downstream control power does not remain established.`,expected:t=>["isolate-power",`continuity-test:${t}`,`replace:${t}`,"restore-power","functional-test"]},
    {id:"relay-failure",label:"execution relay contact failure",target:"node",candidates:["execute-relay"],repairAction:"replace",visual:"subtle",faceplate:"EXECUTE NO PICKUP",symptom:s=>`${s.label} accepts the keyed authorization sequence, but the final commanded state does not propagate to the downstream interface.`,expected:t=>["isolate-power",`inspect:${t}`,`continuity-test:${t}`,`replace:${t}`,"restore-power","functional-test"]},
    {id:"loose-connector",label:"high-resistance connector",target:"node",candidates:["bus-selector","confirm-a","confirm-b","feedback-return"],repairAction:"reseat",visual:"subtle",faceplate:"INTERMITTENT CONTROL STATE",symptom:s=>`${s.label} indications flicker with vibration and an otherwise valid control state intermittently disappears from the feedback path.`,expected:t=>["isolate-power",`inspect:${t}`,`reseat:${t}`,`continuity-test:${t}`,"restore-power","functional-test"]},
    {id:"open-conductor",label:"open conductor",target:"edge",candidates:["sig-guard-mode","sig-mode-bus","sig-bus-dial","sig-dial-slider","sig-slider-lever","sig-lever-confirm-a","sig-confirm-a-b","return-monitor-confirm"],repairAction:"splice",visual:"hidden",faceplate:"COMMAND PATH DROPOUT",symptom:s=>`${s.label} has normal local power, but one command transition disappears between adjacent control stages and never reaches the next device.`,expected:t=>["isolate-power",`continuity-test:${t}`,`splice:${t}`,`continuity-test:${t}`,"restore-power","functional-test"]},
    {id:"ground-short",label:"branch short to chassis",target:"edge",candidates:["pwr-guard","pwr-mode","pwr-bus","pwr-dial","pwr-slider","pwr-lever"],repairAction:"splice",visual:"subtle",faceplate:"BRANCH OVERCURRENT",symptom:s=>`${s.label} control voltage collapses only when one branch is energized; current limiting or the protective feed reacts without a complete panel blackout.`,expected:t=>["isolate-power",`ground-test:${t}`,`splice:${t}`,`ground-test:${t}`,"restore-power","functional-test"]}
  ]);

  const ACTION_LABELS = Object.freeze({"isolate-power":"Opened service disconnect","inspect":"Visual inspection","continuity-test":"Continuity test","ground-test":"Insulation / ground test","replace":"Replaced component","splice":"Spliced / replaced conductor","reseat":"Reseated connector","restore-power":"Closed service disconnect","functional-test":"Functional test / DM relay"});
  const FRONT_CONTROLS = Object.freeze([
    ["guard","GUARD"],["mode","MODE"],["bus-selector","SOURCE"],["dial","TRIM"],["slider","COMMAND"],["lever","GATE"],["confirm-a","CONFIRM"],["confirm-b","ACK"],["execute-relay","EXECUTE"]
  ]);

  let activeStation = "engineering";
  let state = freshState();

  function freshState(){
    return {fault:null,selected:null,servicePower:"energized",sequence:[],relay:null,instrument:"No test performed",trainingOverlay:false,safetyViolations:0,revealedFault:false,log:[],clock:0};
  }

  function nodesForStation(){
    const s=STATIONS[activeStation];
    return NODE_TEMPLATE.map(n=>({...n,label:n.output?s.output:n.key?s.labels[n.key]:n.fixed}));
  }
  function edgesForStation(){return EDGE_TEMPLATE.map(([id,from,to,kind])=>({id,from,to,kind}));}
  function nodeMap(){return Object.fromEntries(nodesForStation().map(n=>[n.id,n]));}
  function targetRecord(id){
    const node=nodesForStation().find(n=>n.id===id);
    if(node)return{id,kind:"component",label:node.label,subtype:node.kind};
    const edge=edgesForStation().find(e=>e.id===id); if(!edge)return null;
    const map=nodeMap();
    return{id,kind:"wire run",label:`${map[edge.from].label} → ${map[edge.to].label}`,subtype:`${edge.kind} conductor`};
  }

  function addLog(source,message){state.clock+=1;state.log.unshift({time:state.clock,source,message});state.log=state.log.slice(0,80);renderLog();}
  const timeString=n=>`${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;

  function renderTabs(){
    $("repair-station-tabs").innerHTML=Object.entries(STATIONS).map(([k,s])=>`<button type="button" class="exo-repair-tab" data-repair-station="${k}" aria-selected="${k===activeStation}">${s.label}</button>`).join("");
  }

  function edgePath(edge,map){
    const a=map[edge.from],b=map[edge.to];
    const x1=a.x+a.w/2,y1=a.y+a.h/2,x2=b.x+b.w/2,y2=b.y+b.h/2;
    const mid=(x1+x2)/2;
    return `M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`;
  }
  function edgeMid(edge,map){
    const a=map[edge.from],b=map[edge.to];
    return{x:(a.x+a.w/2+b.x+b.w/2)/2,y:(a.y+a.h/2+b.y+b.h/2)/2};
  }

  function faultGraphicVisible(){
    if(!state.fault)return false;
    return state.trainingOverlay||state.revealedFault||state.fault.visual==="obvious"||state.fault.repaired;
  }

  function deviceGlyph(node){
    const cx=node.w/2,cy=node.h/2;
    switch(node.kind){
      case "power feed": return `<path class="glyph-line" d="M ${cx-10} ${cy+14} l 11-19 h-7 l 10-17 -2 14 h8 z"/>`;
      case "protective fuse": return `<line class="glyph-line" x1="24" y1="${cy}" x2="${node.w-24}" y2="${cy}"/><rect class="glyph-detail" x="${cx-24}" y="${cy-8}" width="48" height="16" rx="8"/>`;
      case "control backplane": return `<line class="glyph-line" x1="20" y1="25" x2="${node.w-20}" y2="25"/><line class="glyph-line" x1="20" y1="39" x2="${node.w-20}" y2="39"/><line class="glyph-line" x1="20" y1="53" x2="${node.w-20}" y2="53"/>`;
      case "guarded switch": return `<rect class="glyph-detail" x="${cx-24}" y="17" width="48" height="27" rx="4"/><line class="glyph-line" x1="${cx}" y1="43" x2="${cx+13}" y2="18"/>`;
      case "rotary selector": case "rotary trim": return `<circle class="glyph-detail" cx="${cx}" cy="30" r="17"/><line class="glyph-line" x1="${cx}" y1="30" x2="${cx+10}" y2="18"/>`;
      case "source selector": return `<circle class="glyph-detail" cx="${cx}" cy="30" r="16"/><circle class="glyph-dot" cx="${cx-24}" cy="30" r="3"/><circle class="glyph-dot" cx="${cx+24}" cy="30" r="3"/>`;
      case "linear command": return `<rect class="glyph-detail" x="20" y="25" width="${node.w-40}" height="10" rx="5"/><rect class="glyph-solid" x="${cx-6}" y="18" width="12" height="24" rx="3"/>`;
      case "three-position lever": return `<circle class="glyph-detail" cx="${cx}" cy="37" r="10"/><line class="glyph-line lever" x1="${cx}" y1="37" x2="${cx+16}" y2="14"/>`;
      case "momentary confirm": case "momentary acknowledge": return `<circle class="glyph-solid" cx="${cx}" cy="30" r="15"/><circle class="glyph-detail" cx="${cx}" cy="30" r="20"/>`;
      case "key receptacle": return `<circle class="glyph-detail" cx="${cx}" cy="29" r="16"/><path class="glyph-line" d="M ${cx} 21 v17 m0-8 h9"/>`;
      case "keyed interlock": return `<circle class="glyph-detail" cx="${cx}" cy="29" r="18"/><line class="glyph-line" x1="${cx}" y1="29" x2="${cx+13}" y2="19"/>`;
      case "shield interlock": return `<path class="glyph-detail" d="M ${cx-17} 17 h34 v23 q-17 15 -34 0 z"/>`;
      case "safety relay": return `<rect class="glyph-detail" x="${cx-28}" y="18" width="56" height="27" rx="4"/><path class="glyph-line" d="M ${cx-18} 32 q8-12 16 0 t16 0"/>`;
      case "feedback monitor": return `<rect class="glyph-detail" x="${cx-30}" y="15" width="60" height="30" rx="3"/><path class="glyph-line" d="M ${cx-24} 32 l10-7 9 8 12-13 17 11"/>`;
      case "downstream interface": return `<rect class="glyph-detail" x="${cx-35}" y="18" width="70" height="27" rx="3"/>${[-24,-12,0,12,24].map(dx=>`<circle class="glyph-dot" cx="${cx+dx}" cy="31" r="3"/>`).join("")}`;
      default:return "";
    }
  }

  function damageMarkupForNode(node){
    if(!state.fault||state.fault.targetId!==node.id||!faultGraphicVisible())return "";
    if(state.fault.repaired)return `<g class="repair-mark"><circle cx="${node.w-16}" cy="14" r="10"/><path d="M ${node.w-21} 14 l4 4 8-9"/></g>`;
    const severe=state.fault.severity>=3?" severe":"";
    if(state.fault.typeId==="blown-fuse")return `<g class="damage-mark burn${severe}"><ellipse cx="${node.w/2}" cy="${node.h/2}" rx="35" ry="24"/><path d="M ${node.w/2-13} 15 l9 13 -7 9 15 10"/></g>`;
    if(state.fault.typeId==="relay-failure")return `<g class="damage-mark burn${severe}"><ellipse cx="${node.w/2}" cy="${node.h/2}" rx="40" ry="23"/><path d="M 18 18 l15 13 -8 12 19 8"/></g>`;
    if(state.fault.typeId==="loose-connector")return `<g class="damage-mark loose"><path d="M ${node.w-34} 12 l17 10 -12 12 16 9"/><circle cx="${node.w-19}" cy="19" r="5"/></g>`;
    return `<g class="damage-mark"><path d="M 18 12 l14 17 -9 8 18 14"/></g>`;
  }

  function renderNode(node,selected,related){
    const isFault=state.fault?.targetId===node.id;
    const classes=["exo-device",selected?"selected":"",related?"related":"",isFault&&faultGraphicVisible()&&!state.fault.repaired?"damaged":"",isFault&&state.fault?.repaired?"repaired":""].filter(Boolean).join(" ");
    const short=node.label.length>27?`${node.label.slice(0,26)}…`:node.label;
    return `<g class="${classes}" data-schematic-target="${node.id}" transform="translate(${node.x} ${node.y})">
      <rect class="device-shell" width="${node.w}" height="${node.h}" rx="7"></rect>
      ${deviceGlyph(node)}
      <circle class="port left" cx="0" cy="${node.h/2}" r="4"/><circle class="port right" cx="${node.w}" cy="${node.h/2}" r="4"/>
      <text class="node-title" x="9" y="${node.h-14}">${escapeXml(short)}</text>
      <text class="node-kind" x="9" y="${node.h-4}">${escapeXml(node.kind)}</text>
      ${damageMarkupForNode(node)}
      <title>${escapeXml(node.label)} · ${escapeXml(node.kind)}</title>
    </g>`;
  }

  function renderDamageForEdge(edge,map){
    if(!state.fault||state.fault.targetId!==edge.id||!faultGraphicVisible())return "";
    const p=edgeMid(edge,map);
    if(state.fault.repaired)return `<g class="wire-repair" transform="translate(${p.x} ${p.y})"><rect x="-16" y="-6" width="32" height="12" rx="5"/><path d="M -8 0 h16"/></g>`;
    if(state.fault.typeId==="open-conductor")return `<g class="wire-break" transform="translate(${p.x} ${p.y})"><circle r="14"/><path d="M -11 -7 l8 7 -8 7 M 11 -7 l-8 7 8 7"/></g>`;
    if(state.fault.typeId==="ground-short")return `<g class="wire-arc" transform="translate(${p.x} ${p.y})"><circle r="17"/><path d="M -4 -15 l8 9 -6 4 8 8 -5 8"/></g>`;
    return "";
  }

  function renderSchematic(){
    const nodes=nodesForStation(),edges=edgesForStation(),map=Object.fromEntries(nodes.map(n=>[n.id,n]));
    const selectedId=state.selected?.id;
    const selectedEdge=edges.find(e=>e.id===selectedId);
    const relatedNodes=new Set(selectedEdge?[selectedEdge.from,selectedEdge.to]:[]);
    if(nodes.some(n=>n.id===selectedId))edges.filter(e=>e.from===selectedId||e.to===selectedId).forEach(e=>{relatedNodes.add(e.from);relatedNodes.add(e.to);});
    const live=state.servicePower==="energized";
    const svg=`<svg viewBox="0 0 1000 600" role="img" aria-label="${escapeXml(STATIONS[activeStation].label)} service schematic" class="${live?"is-live":"is-isolated"}">
      <defs>
        <pattern id="svc-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 H 0 V 20" class="grid-minor"/></pattern>
        <pattern id="svc-grid-major" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#svc-grid)"/><path d="M 100 0 H 0 V 100" class="grid-major"/></pattern>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <marker id="arrow-signal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z"/></marker>
      </defs>
      <rect class="schematic-paper" width="1000" height="600"/><rect class="schematic-grid" width="1000" height="600" fill="url(#svc-grid-major)"/>
      <g class="service-zones">
        <rect x="18" y="214" width="440" height="126" rx="10"/><text x="30" y="232">A · POWER DISTRIBUTION / LOGIC BACKPLANE</text>
        <rect x="460" y="26" width="518" height="344" rx="10"/><text x="472" y="44">B · OPERATOR CONTROL CIRCUITS</text>
        <rect x="424" y="384" width="486" height="110" rx="10"/><text x="436" y="402">C · KEYED AUTHORIZATION / SAFETY CHAIN</text>
        <rect x="266" y="492" width="712" height="96" rx="10"/><text x="278" y="510">D · EXECUTION OUTPUT / FEEDBACK RETURN</text>
      </g>
      <g class="exo-wire-underlay">${edges.map(e=>`<path d="${edgePath(e,map)}"/>`).join("")}</g>
      <g class="exo-wire-layer">${edges.map(edge=>{
        const selected=selectedId===edge.id;
        const related=!selected&&nodes.some(n=>n.id===selectedId)&&(edge.from===selectedId||edge.to===selectedId);
        const isFault=state.fault?.targetId===edge.id;
        const cls=["exo-wire",edge.kind,selected?"selected":"",related?"related":"",isFault&&faultGraphicVisible()&&!state.fault.repaired?"damaged":"",isFault&&state.fault?.repaired?"repaired":""].filter(Boolean).join(" ");
        return `<path class="${cls}" data-schematic-target="${edge.id}" d="${edgePath(edge,map)}"><title>${escapeXml(targetRecord(edge.id).label)}</title></path>${renderDamageForEdge(edge,map)}`;
      }).join("")}</g>
      <g class="exo-node-layer">${nodes.map(n=>renderNode(n,selectedId===n.id,relatedNodes.has(n.id)&&selectedId!==n.id)).join("")}</g>
      <g class="schematic-corner-note"><text x="30" y="580">BLV-071 / ${escapeXml(STATIONS[activeStation].label.toUpperCase())} / SERVICE DWG 7C</text><text x="760" y="580">${live?"CAUTION — CONTROL POWER ENERGIZED":"SERVICE SAFE — DISCONNECT OPEN"}</text></g>
    </svg>`;
    $("repair-schematic").innerHTML=svg;
    $("schematic-title").textContent=`${STATIONS[activeStation].label} internal control panel`;
    $("schematic-power-banner").textContent=live?"LIVE CONTROL POWER":"SERVICE DISCONNECT OPEN";
    $("schematic-power-banner").dataset.live=String(live);
  }

  function visibleConditionText(){
    if(!state.fault)return "No visible damage";
    if(state.fault.repaired)return "Repair hardware visible; panel awaiting functional verification";
    if(state.fault.visual==="obvious")return state.fault.faceplate;
    if(state.fault.visual==="subtle")return `Subtle symptom: ${state.fault.faceplate}`;
    return "No conclusive exterior damage; electrical diagnosis required";
  }

  function faceControlClass(id){
    if(!state.fault)return "";
    const exact=state.fault.targetId===id;
    if(state.fault.repaired&&exact)return " repaired";
    if(!faultGraphicVisible())return "";
    if(exact)return ` damaged damage-${state.fault.typeId}`;
    if(state.fault.typeId==="blown-fuse")return " dimmed";
    if(state.fault.typeId==="ground-short"&&["guard","mode","bus-selector","dial","slider","lever"].includes(id))return " brownout";
    return "";
  }

  function renderFaceplate(){
    const station=STATIONS[activeStation];
    const live=state.servicePower==="energized";
    const alarm=state.fault&&!state.fault.repaired;
    const controls=FRONT_CONTROLS.map(([id,label],i)=>{
      const node=nodesForStation().find(n=>n.id===id);
      const cls=faceControlClass(id);
      const form=i===3?"dial":i===4?"slider":i===5?"lever":i>=6?"button":"selector";
      return `<div class="face-control ${form}${cls}" data-face-control="${id}"><span>${label}</span><b>${escapeXml(node?.label||label)}</b><i></i></div>`;
    }).join("");
    const severity=state.fault?.severity||0;
    $("repair-faceplate").innerHTML=`
      <div class="faceplate-shell ${alarm?"has-fault":""} severity-${severity} ${live?"live":"isolated"}">
        <div class="faceplate-rail"><span>BLV-071 · ${escapeXml(station.label.toUpperCase())} OPERATOR PANEL</span><b>${live?"BUS LIVE":"SERVICE SAFE"}</b></div>
        <div class="faceplate-alerts">
          <i class="lamp power"></i><span>PWR</span><i class="lamp fault ${alarm?"on":""}"></i><span>FAULT</span><i class="lamp service ${state.fault?.repaired?"on":""}"></i><span>SERVICE</span>
          <strong>${state.fault?escapeXml(state.fault.faceplate):"NO ACTIVE SERVICE TICKET"}</strong>
        </div>
        <div class="faceplate-controls">${controls}</div>
        <div class="faceplate-damage-caption"><span>VISIBLE OPERATOR-SIDE CONDITION</span><strong>${escapeXml(visibleConditionText())}</strong></div>
      </div>`;
  }

  function targetConditionText(){
    if(!state.selected)return "Unknown";
    if(!state.fault)return "No active ticket";
    if(state.selected.id!==state.fault.targetId)return "No confirmed defect";
    if(state.fault.repaired)return "Repair applied / verify";
    if(state.trainingOverlay||state.revealedFault||state.fault.visual==="obvious")return `Confirmed ${state.fault.label}`;
    return "Suspect — not yet confirmed";
  }

  function renderSelection(){
    $("selected-target").textContent=state.selected?.label||"None";
    $("selected-kind").textContent=state.selected?`${state.selected.kind} · ${state.selected.subtype}`:"—";
    $("target-condition").textContent=targetConditionText();
    $("instrument-result").textContent=state.instrument;
  }

  function renderFault(){
    const station=STATIONS[activeStation];
    $("repair-status-station").textContent=station.label;
    if(!state.fault){
      $("repair-status-fault").textContent="none injected";$("fault-severity").textContent="No fault";$("fault-symptom").textContent="Inject randomized damage to begin a repair attempt.";$("repair-attempt-state").textContent="Awaiting fault";$("fault-visibility-state").textContent="—";
    }else{
      $("repair-status-fault").textContent="active service ticket";$("fault-severity").textContent=`Severity ${state.fault.severity}`;$("fault-symptom").textContent=state.fault.symptom;$("repair-attempt-state").textContent=state.fault.repaired?"Repair applied; verify":"Fault active";$("fault-visibility-state").textContent=state.revealedFault?"diagnosed":state.fault.visual;
    }
    $("visible-condition").textContent=visibleConditionText();
    $("service-power-state").textContent=state.servicePower.toUpperCase();
    $("repair-hazard-state").textContent=state.servicePower==="energized"?(state.fault?.typeId==="ground-short"&&!state.fault.repaired?"LIVE / SHORT HAZARD":"LIVE PANEL"):"DE-ENERGIZED";
  }

  function renderSequence(){
    const host=$("repair-sequence");
    if(!state.sequence.length){host.innerHTML=`<li class="empty">No actions recorded.</li>`;return;}
    host.innerHTML=state.sequence.map((e,i)=>`<li><b>${i+1}</b>${e.label}${e.targetLabel?` · <span class="target">${e.targetLabel}</span>`:""}</li>`).join("");
  }

  function renderRelay(){
    const r=state.relay;$("repair-difficulty").textContent=r?r.difficulty:"—";$("repair-status-difficulty").textContent=r?`Difficulty ${r.difficulty}`:"pending";
    $("repair-pips").innerHTML=Array.from({length:10},(_,i)=>`<i class="${r&&i<r.difficulty?"active":""}">${i+1}</i>`).join("");
    if(!r){$("repair-relay-status").textContent="Awaiting functional test";$("repair-relay-detail").innerHTML=`<div><span>Station</span><strong>${STATIONS[activeStation].label}</strong></div><div><span>Fault</span><strong>Undiagnosed / pending</strong></div><div><span>Sequence quality</span><strong>—</strong></div><div><span>Safety</span><strong>—</strong></div><div><span>Random d10</span><strong>—</strong></div><div><span>Repair state</span><strong>—</strong></div>`;$("repair-relay-call").textContent="The repair console does not determine whether the system is restored. Complete a repair attempt and run the functional test to produce a DM-facing difficulty.";return;}
    $("repair-relay-status").textContent=`${r.classification} · suggested difficulty`;
    $("repair-relay-detail").innerHTML=`<div><span>Station</span><strong>${r.station}</strong></div><div><span>Fault</span><strong>${r.faultLabel} · severity ${r.severity}</strong></div><div><span>Sequence quality</span><strong>${r.quality}% · ${r.classification}</strong></div><div><span>Safety</span><strong>${r.safetyViolations?`${r.safetyViolations} unsafe action(s)`:"procedure-safe"}</strong></div><div><span>Random d10</span><strong>${r.randomD10} (${r.randomShift>=0?"+":""}${r.randomShift})</strong></div><div><span>Repair state</span><strong>${r.repaired?"correct repair action applied":"fault not correctly repaired"}</strong></div>`;
    $("repair-relay-call").textContent=`DM REPAIR RELAY: call for the character's normal World of Darkness-derived technical / repair dice pool against Difficulty ${r.difficulty}. The console reports ${r.repaired?"a plausible repair configuration":"an unresolved or incorrectly treated fault"}, but the DM determines whether the repair succeeds, how long it takes, and whether it remains stable.`;
  }

  function renderLog(){const h=$("repair-log");h.innerHTML=state.log.length?state.log.map(i=>`<li><time>${timeString(i.time)}</time><strong>${i.source}</strong><span>${i.message}</span></li>`).join(""):`<li><time>00:00</time><strong>System</strong><span>No maintenance events logged.</span></li>`;}
  function renderAll(){renderTabs();renderFaceplate();renderSchematic();renderSelection();renderFault();renderSequence();renderRelay();renderLog();$("repair-training-overlay").setAttribute("aria-pressed",String(state.trainingOverlay));}

  function injectFault(){
    const type=pick(FAULT_TYPES),targetId=pick(type.candidates),severity=1+Math.floor(Math.random()*3);
    let visual=type.visual;
    if(severity===3&&visual==="hidden")visual="subtle";
    if(severity===1&&visual==="obvious"&&type.id!=="blown-fuse")visual="subtle";
    state.fault={typeId:type.id,label:type.label,targetId,targetKind:type.target,repairAction:type.repairAction,severity,visual,faceplate:type.faceplate,symptom:type.symptom(STATIONS[activeStation]),expected:type.expected(targetId),repaired:false};
    state.sequence=[];state.relay=null;state.selected=null;state.instrument="No test performed";state.servicePower="energized";state.safetyViolations=0;state.revealedFault=false;
    addLog("Damage",`${STATIONS[activeStation].label} service ticket opened: randomized internal fault injected. Exterior visibility classified ${visual}. Exact location remains hidden unless physically evident or diagnosed.`);renderAll();
  }

  function selectTarget(id){state.selected=targetRecord(id);state.instrument="Target selected; choose a diagnostic action.";renderSelection();renderSchematic();}
  function actionToken(action,targetId){return ["isolate-power","restore-power","functional-test"].includes(action)?action:`${action}:${targetId||"none"}`;}
  function recordAction(action,target){const targetId=target?.id||null;state.sequence.push({token:actionToken(action,targetId),action,targetId,label:ACTION_LABELS[action],targetLabel:target?.label||""});if(state.sequence.length>30)state.sequence.shift();}

  function shouldReveal(action,target){
    if(!state.fault||!target||target.id!==state.fault.targetId)return false;
    const t=state.fault.typeId;
    if(action==="inspect"&&["blown-fuse","relay-failure","loose-connector"].includes(t))return true;
    if(action==="continuity-test"&&["blown-fuse","relay-failure","loose-connector","open-conductor"].includes(t))return true;
    if(action==="ground-test"&&t==="ground-short")return true;
    return false;
  }

  function diagnosticResult(action,target){
    if(!state.fault)return "No active fault ticket.";if(!target)return "Select a component or wire run first.";
    const hit=target.id===state.fault.targetId,repairedHit=hit&&state.fault.repaired;
    if(action==="inspect"){
      if(repairedHit)return "Repair area is seated, secured and shows no remaining visible defect in the simulated service model.";
      if(!hit)return "No visible heat damage, looseness, contamination or displaced hardware.";
      if(state.fault.typeId==="loose-connector")return "Connector shell movement and contact fretting observed; seating is not secure.";
      if(state.fault.typeId==="relay-failure")return "Relay housing shows abnormal heat discoloration; mechanical pickup is suspect.";
      if(state.fault.typeId==="blown-fuse")return "Fuse indicator is open and the body shows transient heating; electrical confirmation recommended.";
      return "No conclusive external damage; electrical testing is required.";
    }
    if(action==="continuity-test"){
      if(repairedHit)return target.kind==="wire run"?"Post-repair continuity nominal across selected conductor.":"Post-repair continuity / contact path within expected range.";
      if(!hit)return target.kind==="wire run"?"Continuity nominal across selected conductor.":"Continuity / contact path within expected range.";
      if(["blown-fuse","open-conductor"].includes(state.fault.typeId))return "OPEN CIRCUIT / no continuity measured.";
      if(state.fault.typeId==="loose-connector")return "Intermittent high resistance; reading changes with connector movement.";
      if(state.fault.typeId==="relay-failure")return "Relay command and switched-contact state disagree; contact path fails continuity under commanded pickup.";
      if(state.fault.typeId==="ground-short")return "Very low branch resistance; continuity alone cannot distinguish load from chassis fault. Perform insulation test.";
    }
    if(action==="ground-test"){
      if(repairedHit)return "Post-repair insulation resistance nominal; no significant leakage to chassis ground.";
      if(hit&&state.fault.typeId==="ground-short")return "INSULATION FAILURE: low resistance to chassis ground on selected branch.";
      return "Insulation resistance nominal; no significant leakage to chassis ground.";
    }
    return "Instrument action complete.";
  }

  function runRepairAction(action){
    if(!state.fault){addLog("Service","Action ignored: inject a randomized fault before beginning maintenance.");return;}
    const needsTarget=!["isolate-power","restore-power","functional-test"].includes(action),target=needsTarget?state.selected:null;
    if(needsTarget&&!target){state.instrument="Select a component or wire run before using this action.";renderSelection();return;}
    if(action==="isolate-power"){
      state.servicePower="isolated";recordAction(action,null);state.instrument="Service disconnect OPEN. Control panel de-energized for maintenance.";addLog("Technician","Service disconnect opened; panel placed in maintenance-safe de-energized state.");
    }else if(action==="restore-power"){
      state.servicePower="energized";recordAction(action,null);state.instrument="Service disconnect CLOSED. Panel control power restored.";addLog("Technician","Service disconnect closed; panel re-energized for verification.");
    }else if(["inspect","continuity-test","ground-test"].includes(action)){
      if(["continuity-test","ground-test"].includes(action)&&state.servicePower!=="isolated"){state.safetyViolations+=1;addLog("Safety",`${ACTION_LABELS[action]} attempted while service power remained energized.`);}
      recordAction(action,target);state.instrument=diagnosticResult(action,target);
      if(shouldReveal(action,target)){state.revealedFault=true;addLog("Diagnostic",`Fault location confirmed at ${target.label}. Schematic damage annotation unlocked.`);}
      addLog("Diagnostic",`${ACTION_LABELS[action]} on ${target.label}: ${state.instrument}`);
    }else if(["replace","splice","reseat"].includes(action)){
      if(state.servicePower!=="isolated"){state.safetyViolations+=1;addLog("Safety",`${ACTION_LABELS[action]} performed while service power remained energized.`);}
      recordAction(action,target);const correctTarget=target.id===state.fault.targetId,correctMethod=action===state.fault.repairAction;
      if(correctTarget&&correctMethod){state.fault.repaired=true;state.revealedFault=true;state.instrument=`${ACTION_LABELS[action]} applied to suspected fault location. Restoration still requires verification.`;addLog("Repair",`Correct repair method applied at ${target.label}; repair hardware now shown on the service drawing pending functional test.`);}
      else{state.instrument=`${ACTION_LABELS[action]} completed, but no confirmed fault correction is indicated.`;addLog("Repair",`${ACTION_LABELS[action]} applied at ${target.label}; no confirmed correction.`);}
    }else if(action==="functional-test"){
      recordAction(action,null);
      if(state.servicePower!=="energized"){state.instrument="Functional test cannot exercise the station while the service disconnect remains open.";addLog("Test","Functional test attempted with service power isolated; no live response available.");}
      else if(state.fault.repaired){state.instrument="Functional test produces a nominal simulated response path. DM adjudication still required.";addLog("Test","Functional test reached the simulated downstream interface after repair work.");}
      else{state.instrument="Functional test still reproduces the reported symptom / unresolved path.";addLog("Test","Functional test indicates the service fault remains unresolved in the repair model.");}
      evaluateRepair();
    }
    renderAll();
  }

  function editDistance(a,b){const m=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));for(let i=0;i<=a.length;i++)m[i][0]=i;for(let j=0;j<=b.length;j++)m[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){const c=a[i-1]===b[j-1]?0:1;m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+c);}return m[a.length][b.length];}
  function repairQuality(actual,expected){if(!actual.length)return 0;const max=Math.max(actual.length,expected.length,1),similarity=clamp(1-editDistance(actual,expected)/max,0,1),aligned=expected.reduce((n,t,i)=>n+(actual[i]===t?1:0),0)/Math.max(expected.length,1);return clamp(Math.round((similarity*.7+aligned*.3)*100));}
  const classifyQuality=q=>q>=94?"manual-correct":q>=80?"serviceable sequence":q>=64?"improvised sequence":q>=44?"poor maintenance practice":"hazardous / incorrect sequence";
  const baseDifficulty=q=>q>=94?5:q>=80?6:q>=64?7:q>=44?8:9;
  function evaluateRepair(){const f=state.fault;if(!f)return;const actual=state.sequence.map(e=>e.token),quality=repairQuality(actual,f.expected),randomD10=d10(),randomShift=randomD10<=2?-1:randomD10>=9?1:0,severityShift=f.severity===1?0:f.severity===2?1:2,unresolvedShift=f.repaired?0:2,safetyShift=Math.min(2,state.safetyViolations),overrunShift=actual.length>f.expected.length+4?1:0,difficulty=clamp(baseDifficulty(quality)+severityShift+unresolvedShift+safetyShift+overrunShift+randomShift,2,10);state.relay={station:STATIONS[activeStation].label,faultLabel:f.label,severity:f.severity,quality,classification:classifyQuality(quality),repaired:f.repaired,safetyViolations:state.safetyViolations,randomD10,randomShift,difficulty};addLog("DM Relay",`${f.label} repair attempt evaluated at ${quality}% procedural quality; suggested Difficulty ${difficulty}. No repair success resolved.`);}

  function clearAttempt(){state.sequence=[];state.relay=null;state.selected=null;state.instrument="No test performed";state.servicePower="energized";state.safetyViolations=0;state.revealedFault=false;if(state.fault)state.fault.repaired=false;addLog("System","Current repair attempt cleared; fault ticket retained and visible symptoms reset to pre-diagnosis state.");renderAll();}
  function reset(){state=freshState();activeStation="engineering";addLog("System","Console Repair Bay initialized. Select a station and inject randomized damage.");renderAll();}
  function changeStation(key){activeStation=key;state=freshState();addLog("System",`${STATIONS[key].label} service topology loaded; previous fault ticket cleared.`);renderAll();}

  function bindEvents(){
    $("repair-station-tabs").addEventListener("click",e=>{const b=e.target.closest("[data-repair-station]");if(b)changeStation(b.dataset.repairStation);});
    $("repair-schematic").addEventListener("click",e=>{const t=e.target.closest("[data-schematic-target]");if(t)selectTarget(t.dataset.schematicTarget);});
    document.querySelector(".exo-repair-actions").addEventListener("click",e=>{const b=e.target.closest("[data-repair-action]");if(b)runRepairAction(b.dataset.repairAction);});
    $("repair-new-fault").addEventListener("click",injectFault);$("repair-reset").addEventListener("click",reset);$("repair-clear-sequence").addEventListener("click",clearAttempt);$("repair-log-clear").addEventListener("click",()=>{state.log=[];renderLog();});
    $("repair-fit").addEventListener("click",()=>{const h=$("repair-schematic");h.scrollLeft=0;h.scrollTop=0;});
    $("repair-training-overlay").addEventListener("click",()=>{state.trainingOverlay=!state.trainingOverlay;addLog("Training",`Fault-location overlay ${state.trainingOverlay?"enabled":"disabled"}.`);renderAll();});
  }

  document.addEventListener("DOMContentLoaded",()=>{reset();bindEvents();});
})();
