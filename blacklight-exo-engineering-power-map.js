(() => {
  "use strict";

  if (window.EXO_ENGINEERING_POWER_MAP) return;

  const BREAKERS = Object.freeze([
    Object.freeze({id:"breaker-reactor",name:"CALDER",load:"REACTOR",rail:"A",side:"left",y:474}),
    Object.freeze({id:"breaker-coolant",name:"VOSS",load:"COOLANT",rail:"A",side:"left",y:520}),
    Object.freeze({id:"breaker-field",name:"ASTER",load:"FIELD",rail:"A",side:"left",y:566}),
    Object.freeze({id:"breaker-sensor",name:"VESPER",load:"SENSOR",rail:"A",side:"left",y:612}),
    Object.freeze({id:"breaker-rectifier",name:"MORROW",load:"RECTIFIER",rail:"B",side:"right",y:474}),
    Object.freeze({id:"breaker-grid",name:"LARKEN",load:"GRID",rail:"B",side:"right",y:520}),
    Object.freeze({id:"breaker-inverter",name:"HALDEN",load:"INVERTER",rail:"B",side:"right",y:566}),
    Object.freeze({id:"breaker-lighting",name:"ORISON",load:"LIGHTING",rail:"B",side:"right",y:612})
  ]);

  const FEEDS = Object.freeze([
    Object.freeze({id:"rectifier-a",letter:"A",x:42,portX:112,portY:158,path:"M42 34 V86 H76 Q94 86 112 158"}),
    Object.freeze({id:"rectifier-b",letter:"B",x:104,portX:135,portY:143,path:"M104 34 V76 H119 Q130 77 135 143"}),
    Object.freeze({id:"rectifier-c",letter:"C",x:198,portX:167,portY:143,path:"M198 34 V76 H183 Q172 77 167 143"}),
    Object.freeze({id:"rectifier-d",letter:"D",x:260,portX:190,portY:158,path:"M260 34 V86 H226 Q208 86 190 158"})
  ]);

  const AUX_DEFAULTS = Object.freeze({
    "governor-bias":0,
    "coolant-bypass":50,
    "phase-trim":0,
    "ripple-rejection":50,
    "inverter-sync":180
  });

  let observer = null;
  let auxiliaryObserver = null;
  let queued = false;
  let plantPulseUntil = 0;
  let plantPulseLabel = "READY";

  const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
  const esc = value => String(value ?? "").replace(/[&<>\"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;"}[ch]));

  function engineeringActive() {
    return Boolean(document.querySelector('#station-tabs [data-station="engineering"][aria-selected="true"]'));
  }

  function selectedState(id,fallback="UNKNOWN") {
    const node = document.querySelector(`#station-panel [data-control-id="${id}"][data-control-state][aria-pressed="true"]`);
    return node?.dataset.controlState || fallback;
  }

  function dialFraction(id) {
    const node = document.querySelector(`#station-panel [data-control-id="${id}"][data-dial-angle]`);
    const angle = Number(node?.dataset.dialAngle);
    return Number.isFinite(angle) ? clamp((angle + 62) / 124,0,1) : .5;
  }

  function dialVolts(id) {
    return Math.round((400 + dialFraction(id) * 80) / 5) * 5;
  }

  function coolantPercent() {
    return Math.round(dialFraction("coolant-valve") * 100 / 5) * 5;
  }

  function auxiliaryValues() {
    try {
      const all = window.EXO_AUXILIARY_PANEL?.getValues?.();
      const engineering = all?.engineering || {};
      return Object.fromEntries(Object.entries(AUX_DEFAULTS).map(([id,fallback])=>{
        const value = Number(engineering[id]);
        return [id,Number.isFinite(value)?value:fallback];
      }));
    } catch (_) {
      return {...AUX_DEFAULTS};
    }
  }

  function phaseDistance(degrees) {
    const n = ((degrees % 360) + 360) % 360;
    return Math.min(n,360-n);
  }

  function readState() {
    const feed = Object.fromEntries(FEEDS.map(item=>[item.letter.toLowerCase(),{
      fraction:dialFraction(item.id),
      volts:dialVolts(item.id)
    }]));
    const breakers = Object.fromEntries(BREAKERS.map(item=>[item.id,selectedState(item.id,"OFF")]));
    const aux = auxiliaryValues();
    const phaseError = phaseDistance(aux["inverter-sync"] + aux["phase-trim"]);
    return {
      feed,
      busA:{fraction:dialFraction("voltage-a"),volts:dialVolts("voltage-a")},
      busB:{fraction:dialFraction("voltage-b"),volts:dialVolts("voltage-b")},
      transfer:selectedState("bus-transfer","ISOLATED"),
      pump:selectedState("pump-select","A"),
      coolant:coolantPercent(),
      breakers,
      aux,
      phaseError,
      auxiliaryReady:phaseError <= 15
    };
  }

  function signature(state) {
    return JSON.stringify({
      f:Object.values(state.feed).map(v=>v.volts),
      a:state.busA.volts,b:state.busB.volts,t:state.transfer,p:state.pump,c:state.coolant,
      br:state.breakers,aux:state.aux,phase:Math.round(state.phaseError),
      pulse:Date.now()<plantPulseUntil?plantPulseLabel:""
    });
  }

  function feedStyle(letter,feed,state) {
    const governor = state.aux["governor-bias"];
    const f = clamp(feed.fraction + governor/100,0,1);
    const ripple = clamp(state.aux["ripple-rejection"]/100,0,1);
    return [
      `--f${letter}-width:${(1.0+f*2.8).toFixed(2)}`,
      `--f${letter}-alpha:${(.38+f*.62).toFixed(2)}`,
      `--f${letter}-speed:${(1.7-f*.9+ripple*.25).toFixed(2)}s`,
      `--f${letter}-glow:${(3+f*10).toFixed(1)}px`
    ].join(";");
  }

  function plasmaFilaments(state) {
    const feedFractions=[state.feed.a.fraction,state.feed.b.fraction,state.feed.c.fraction,state.feed.d.fraction];
    const electrodes=[
      {x:-39,y:-32,feed:0,role:"input-a"},{x:-16,y:-47,feed:1,role:"input-b"},{x:16,y:-47,feed:2,role:"input-c"},{x:39,y:-32,feed:3,role:"input-d"},
      {x:-39,y:32,feed:0,role:"output-a"},{x:-16,y:47,feed:1,role:"output-b"},{x:16,y:47,feed:2,role:"output-c"},{x:39,y:32,feed:3,role:"output-d"}
    ];
    return electrodes.map((electrode,index)=>{
      const strength=clamp(feedFractions[electrode.feed],0,1),x=electrode.x,y=electrode.y;
      const side=x<0?-1:1,vertical=y<0?-1:1,wander=5+strength*8;
      const c1x=side*(5+(index%3)*3),c1y=vertical*(4+(index%2)*4);
      const c2x=x*.52+side*((index%2?1:-1)*wander),c2y=y*.54+vertical*((index%3-1)*wander*.55);
      const main=`M0 0 C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${x} ${y}`;
      const branchX=x*.72+side*(6+(index%2)*3),branchY=y*.72-vertical*(4+(index%3)*2);
      const branch=`M${(x*.42).toFixed(1)} ${(y*.42).toFixed(1)} Q${(x*.58-side*wander).toFixed(1)} ${(y*.52+vertical*wander*.45).toFixed(1)} ${branchX.toFixed(1)} ${branchY.toFixed(1)}`;
      const dur=.82+(index%4)*.13+(1-strength)*.28,branchDur=dur*.72,width=.85+strength*1.35,branchWidth=.45+strength*.65,contact=2.1+strength*1.6;
      return `<g class="exo-eng-plasma-tendril ${electrode.role}" style="--filament:${(.34+strength*.66).toFixed(2)};--tendril-rate:${dur.toFixed(2)}s;--branch-rate:${branchDur.toFixed(2)}s;--phase:${(-index*.11).toFixed(2)}s">
        <path class="exo-eng-plasma-filament exo-eng-plasma-filament-main" d="${main}" stroke-width="${width.toFixed(2)}"/>
        <path class="exo-eng-plasma-filament exo-eng-plasma-filament-branch" d="${branch}" stroke-width="${branchWidth.toFixed(2)}"/>
        <circle class="exo-eng-plasma-contact" cx="${x}" cy="${y}" r="${contact.toFixed(2)}" fill="#d8fffb" stroke="#59f4df" stroke-width=".8"/>
      </g>`;
    }).join("");
  }

  function feedMarkup(item,state) {
    const key=item.letter.toLowerCase(),volts=state.feed[key].volts;
    return `<g class="exo-eng-feed feed-${key}" data-feed="${item.letter}">
      <path class="exo-eng-feed-conduit" d="${item.path}"/>
      <path class="exo-eng-feed-plasma" d="${item.path}"/>
      <circle class="exo-eng-port" cx="${item.portX}" cy="${item.portY}" r="5.4"/>
      <text class="exo-eng-feed-label" x="${item.x}" y="18" text-anchor="middle">FEED ${item.letter}</text>
      <text class="exo-eng-feed-value" x="${item.x}" y="30" text-anchor="middle">${volts} V</text>
    </g>`;
  }

  function breakerMarkup(item,state) {
    const cssState=state==="ON"?"on":state==="TRIPPED"?"tripped":"off";
    const railX=item.rail==="A"?88:214;
    const endX=item.side==="left"?20:282;
    const ledX=item.side==="left"?50:252;
    const labelX=item.side==="left"?58:244;
    const anchor=item.side==="left"?"start":"end";
    const bladeX=item.side==="left"?68:234;
    const open=state!=="ON";
    const bladePath=item.side==="left"
      ? (open?`M${railX} ${item.y} L${bladeX+10} ${item.y-8}`:`M${railX} ${item.y} H${bladeX+10}`)
      : (open?`M${railX} ${item.y} L${bladeX-10} ${item.y-8}`:`M${railX} ${item.y} H${bladeX-10}`);
    return `<g class="exo-eng-breaker state-${cssState}" data-breaker="${item.id}">
      <path class="exo-eng-branch-base" d="M${railX} ${item.y} H${endX}"/>
      <path class="exo-eng-branch-live" d="M${railX} ${item.y} H${endX}"/>
      <circle class="exo-eng-breaker-node" cx="${railX}" cy="${item.y}" r="3.5"/>
      <path class="exo-eng-breaker-blade" d="${bladePath}"/>
      <circle class="exo-eng-breaker-led" cx="${ledX}" cy="${item.y}" r="4.2"/>
      <circle class="exo-eng-breaker-ring" cx="${ledX}" cy="${item.y}" r="7.2"/>
      <text class="exo-eng-breaker-name" x="${labelX}" y="${item.y-5}" text-anchor="${anchor}">${item.name}</text>
      <text class="exo-eng-breaker-load" x="${labelX}" y="${item.y+8}" text-anchor="${anchor}">${item.load} · ${state}</text>
    </g>`;
  }

  function sourceTransferMarkup(state) {
    const primary=state.transfer==="PRIMARY",auxiliary=state.transfer==="AUXILIARY",isolated=state.transfer==="ISOLATED";
    const pBlade=primary?"M91 335 L112 350":"M91 335 L109 323";
    const aBlade=auxiliary?"M211 335 L190 350":"M211 335 L193 323";
    return `<g class="exo-eng-source-transfer transfer-${state.transfer.toLowerCase()}">
      <text class="exo-eng-section-title" x="151" y="311" text-anchor="middle">BUS BAR TRANSFER INTERLOCK · BREAK-BEFORE-MAKE</text>
      <path class="exo-eng-source-base" d="M91 309 V335 M211 309 V335"/>
      <circle class="exo-eng-transfer-contact" cx="91" cy="335" r="4"/>
      <circle class="exo-eng-transfer-contact" cx="112" cy="350" r="4"/>
      <circle class="exo-eng-transfer-contact" cx="211" cy="335" r="4"/>
      <circle class="exo-eng-transfer-contact" cx="190" cy="350" r="4"/>
      <path class="exo-eng-transfer-blade primary" d="${pBlade}"/>
      <path class="exo-eng-transfer-blade auxiliary" d="${aBlade}"/>
      <path class="exo-eng-common-incomer" d="M112 350 H190 M151 350 V392"/>
      ${primary?'<path class="exo-eng-source-live primary" d="M91 309 V335 L112 350 H151 V392"/>':""}
      ${auxiliary?'<path class="exo-eng-source-live auxiliary" d="M211 309 V335 L190 350 H151 V392"/>':""}
      <rect class="exo-eng-interlock-box" x="125" y="322" width="52" height="25" rx="2"/>
      <text class="exo-eng-interlock-state" x="151" y="332" text-anchor="middle">${isolated?"ISOLATED":primary?"PRIMARY":"AUXILIARY"}</text>
      <text class="exo-eng-interlock-sub" x="151" y="341" text-anchor="middle">${isolated?"BOTH INCOMERS OPEN":primary?"RECTIFIER INCOMER CLOSED":"RESERVE INCOMER CLOSED"}</text>
    </g>`;
  }

  function auxSourceMarkup(state) {
    const sync=state.auxiliaryReady;
    const phase=Math.round(state.phaseError);
    const rotor=((state.aux["inverter-sync"]%360)+360)%360;
    return `<g class="exo-eng-aux-source ${sync?"sync":"unsync"}">
      <rect x="204" y="244" width="78" height="56" rx="3"/>
      <text x="243" y="255" text-anchor="middle">AUXILIARY SOURCE</text>
      <text x="243" y="265" text-anchor="middle">BATTERY / PASSIVE DC</text>
      <path class="exo-eng-battery" d="M217 274h28m-22-5v10m16-8v6"/>
      <circle class="exo-eng-sync-ring" cx="261" cy="276" r="12"/>
      <path class="exo-eng-sync-needle" d="M261 276 L261 267" transform="rotate(${rotor} 261 276)"/>
      <text class="exo-eng-sync-value" x="261" y="297" text-anchor="middle">${sync?"SYNC":"ΔPH"} ${phase}°</text>
      <path class="exo-eng-aux-incomer" d="M243 300 H211 V309"/>
    </g>`;
  }

  function primaryConditioningMarkup(state) {
    const avg=Math.round((state.feed.a.volts+state.feed.b.volts+state.feed.c.volts+state.feed.d.volts)/4);
    const spread=Math.max(state.feed.a.volts,state.feed.b.volts,state.feed.c.volts,state.feed.d.volts)-Math.min(state.feed.a.volts,state.feed.b.volts,state.feed.c.volts,state.feed.d.volts);
    const ripple=Math.round(state.aux["ripple-rejection"]);
    const gov=state.aux["governor-bias"];
    return `<g class="exo-eng-primary-conditioner">
      <path class="exo-eng-rectifier-output-base" d="M123 238 Q112 263 91 286 M179 238 Q190 263 211 286"/>
      <path class="exo-eng-rectifier-output-live" d="M123 238 Q112 263 91 286 M179 238 Q190 263 211 286"/>
      <path class="exo-eng-main-incomer" d="M91 286 V309"/>
      <rect x="53" y="272" width="76" height="31" rx="2"/>
      <text x="91" y="282" text-anchor="middle">PRIMARY CONDITIONED DC</text>
      <text x="91" y="292" text-anchor="middle">${avg} V · Δ${spread} V</text>
      <text x="91" y="300" text-anchor="middle">GOV ${gov>=0?"+":""}${gov.toFixed(1)}% · RIPPLE REJ ${ripple}%</text>
    </g>`;
  }

  function coolingMarkup(state) {
    const bypass=Math.round(state.aux["coolant-bypass"]);
    const valve=state.coolant;
    const mainFlow=clamp(valve*(1-bypass/100),0,100);
    const bypassFlow=clamp(valve*bypass/100,0,100);
    return `<g class="exo-eng-cooling" style="--cool-main:${(mainFlow/100).toFixed(2)};--cool-bypass:${(bypassFlow/100).toFixed(2)}">
      <text class="exo-eng-section-title" x="151" y="655" text-anchor="middle">RECTIFIER COOLING / THERMAL ROUTING</text>
      <path class="exo-eng-cool-base" d="M58 674 H116 Q151 646 186 674 H244"/>
      <path class="exo-eng-cool-main" d="M58 674 H116 Q151 646 186 674 H244"/>
      <path class="exo-eng-cool-bypass-base" d="M102 674 Q151 700 200 674"/>
      <path class="exo-eng-cool-bypass" d="M102 674 Q151 700 200 674"/>
      <circle class="exo-eng-pump-symbol" cx="58" cy="674" r="8"/>
      <path class="exo-eng-valve-symbol" d="M236 666 L244 674 L236 682 M252 666 L244 674 L252 682"/>
      <text class="exo-eng-cool-label" x="58" y="692" text-anchor="middle">PUMP ${esc(state.pump)}</text>
      <text class="exo-eng-cool-label" x="244" y="692" text-anchor="middle">HEADER ${valve}%</text>
      <text class="exo-eng-cool-label" x="151" y="707" text-anchor="middle">PANEL II BYPASS ${bypass}%</text>
    </g>`;
  }

  function regulationMarkup(state) {
    const phase=state.aux["phase-trim"];
    const inv=state.aux["inverter-sync"];
    return `<g class="exo-eng-regulation">
      <rect x="16" y="244" width="34" height="57" rx="2"/>
      <text x="33" y="254" text-anchor="middle">PANEL II</text>
      <text x="33" y="265" text-anchor="middle">PHASE</text>
      <circle cx="33" cy="279" r="10"/>
      <path d="M33 279 L33 271" transform="rotate(${phase*9} 33 279)"/>
      <text x="33" y="296" text-anchor="middle">${phase>=0?"+":""}${phase.toFixed(1)}°</text>
      <text class="exo-eng-reg-small" x="151" y="416" text-anchor="middle">INVERTER SYNC ${Math.round(inv)}° · PHASE TRIM ${phase>=0?"+":""}${phase.toFixed(1)}°</text>
    </g>`;
  }

  function markup(state) {
    const fa=state.feed.a,fb=state.feed.b,fc=state.feed.c,fd=state.feed.d;
    const average=(fa.fraction+fb.fraction+fc.fraction+fd.fraction)/4;
    const spread=Math.max(fa.volts,fb.volts,fc.volts,fd.volts)-Math.min(fa.volts,fb.volts,fc.volts,fd.volts);
    const balance=spread<=5?"BALANCED":spread<=15?"TRIM":"IMBALANCED";
    const ripple=clamp(state.aux["ripple-rejection"]/100,0,1);
    const pulse=Date.now()<plantPulseUntil;
    const styles=[
      feedStyle("a",fa,state),feedStyle("b",fb,state),feedStyle("c",fc,state),feedStyle("d",fd,state),
      `--bus-a-alpha:${(.28+state.busA.fraction*.72).toFixed(2)}`,
      `--bus-b-alpha:${(.28+state.busB.fraction*.72).toFixed(2)}`,
      `--core-rate:${(2.6-average*1.25).toFixed(2)}s`,
      `--core-glow:${(12+average*34).toFixed(1)}px`,
      `--ripple:${(1-ripple).toFixed(2)}`
    ].join(";");

    return `<div class="exo-eng-power-map" data-eng-power-map data-transfer="${esc(state.transfer)}" data-plant-pulse="${pulse}" style="${styles}">
      <header class="exo-eng-map-header">
        <span>ENG-MIM-02 · CONDITIONING / SOURCE TRANSFER / DISTRIBUTION MIMIC</span>
        <b>${pulse?esc(plantPulseLabel):`RECTIFIER ${balance}`}</b>
      </header>
      <div class="exo-eng-map-stage">
        <svg class="exo-eng-map-svg" viewBox="0 0 302 716" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Live engineering power conditioning and distribution schematic">
          <defs>
            <radialGradient id="exoEngGlass" cx="42%" cy="35%" r="68%">
              <stop offset="0" stop-color="#b7ffff" stop-opacity=".12"/>
              <stop offset=".34" stop-color="#2ea9a7" stop-opacity=".11"/>
              <stop offset=".72" stop-color="#112020" stop-opacity=".76"/>
              <stop offset="1" stop-color="#030909" stop-opacity=".97"/>
            </radialGradient>
            <radialGradient id="exoEngPlasma" cx="48%" cy="48%" r="55%">
              <stop offset="0" stop-color="#eaffff" stop-opacity=".28"/>
              <stop offset=".22" stop-color="#71fff0" stop-opacity=".16"/>
              <stop offset=".58" stop-color="#18bfc4" stop-opacity=".07"/>
              <stop offset="1" stop-color="#0c5361" stop-opacity="0"/>
            </radialGradient>
          </defs>

          <text class="exo-eng-section-title" x="151" y="11" text-anchor="middle">RAW PRIMARY GENERATION · VARIABLE FOUR-FEED INPUT</text>
          ${FEEDS.map(item=>feedMarkup(item,state)).join("")}

          <text class="exo-eng-core-title" x="151" y="102" text-anchor="middle">MASTER PLASMA RECTIFIER</text>
          <text class="exo-eng-core-subtitle" x="151" y="112" text-anchor="middle">4 INPUT / 4 OUTPUT · MODERATOR NEUTRAL · DC CONDITIONING</text>

          <g class="exo-eng-moderator">
            <path class="exo-eng-moderator-arm" d="M18 190 H93"/>
            <path class="exo-eng-moderator-pulse" d="M18 190 H93"/>
            <circle cx="93" cy="190" r="5.4"/>
            <text x="20" y="178">MASTER MODERATOR</text>
            <text x="20" y="204">NEUTRAL / FIELD REFERENCE</text>
          </g>

          <g class="exo-eng-rectifier" transform="translate(151 190)">
            <circle class="exo-eng-glass-bulb" r="58" fill="url(#exoEngGlass)"/>
            <circle class="exo-eng-glass-rim" r="52"/>
            <circle class="exo-eng-plasma-haze" r="34" fill="url(#exoEngPlasma)"/>
            <circle class="exo-eng-plasma-corona" r="11" fill="none" stroke="#55eadc" stroke-width="1.1" opacity=".38"/>
            <circle class="exo-eng-plasma-core" r="5.2"/>
            ${plasmaFilaments(state)}
            <circle class="exo-eng-neutral-kernel" r="3.2"/>
          </g>

          ${primaryConditioningMarkup(state)}
          ${auxSourceMarkup(state)}
          ${regulationMarkup(state)}
          ${sourceTransferMarkup(state)}

          <g class="exo-eng-distribution-bus">
            <text class="exo-eng-section-title" x="151" y="380" text-anchor="middle">COMMON SHIP DISTRIBUTION BUS</text>
            <path class="exo-eng-common-bus-base" d="M36 392 H266"/>
            <path class="exo-eng-common-bus-live" d="M36 392 H266"/>
            <circle class="exo-eng-bus-split" cx="151" cy="392" r="4.5"/>
            <path class="exo-eng-rail-base" d="M88 392 V632 M214 392 V632"/>
            <path class="exo-eng-rail-live rail-a" d="M88 392 V632"/>
            <path class="exo-eng-rail-live rail-b" d="M214 392 V632"/>
            <text class="exo-eng-bus-label" x="53" y="432">BUS A REG · ${state.busA.volts} V</text>
            <text class="exo-eng-bus-label" x="249" y="432" text-anchor="end">BUS B REG · ${state.busB.volts} V</text>
          </g>

          <text class="exo-eng-section-title" x="151" y="451" text-anchor="middle">PROTECTED DISTRIBUTION BRANCHES · BREAKER LED STATUS</text>
          ${BREAKERS.map(item=>breakerMarkup(item,state.breakers[item.id])).join("")}
          ${coolingMarkup(state)}
        </svg>
      </div>
      <footer class="exo-eng-map-footer">
        <span><small>PRIMARY CONDITIONING</small><b>A ${fa.volts} · B ${fb.volts} · C ${fc.volts} · D ${fd.volts} V</b></span>
        <span><small>SOURCE TRANSFER</small><b>${esc(state.transfer)} · AUX ${state.auxiliaryReady?"SYNC":"UNSYNC"}</b></span>
        <span><small>THERMAL / REGULATION</small><b>PUMP ${esc(state.pump)} · VALVE ${state.coolant}% · BYPASS ${Math.round(state.aux["coolant-bypass"])}%</b></span>
      </footer>
    </div>`;
  }

  function render() {
    queued=false;
    if(!engineeringActive()) return;
    const display=document.querySelector("#station-panel .display-systems");
    if(!display) return;
    const state=readState(),sig=signature(state);
    if(display.dataset.engPowerMapSignature===sig&&display.querySelector("[data-eng-power-map]")) return;
    display.dataset.engPowerMapSignature=sig;
    display.classList.add("exo-eng-specialized");
    display.innerHTML=markup(state);
  }

  function queueRender() {
    if(queued) return;
    queued=true;
    requestAnimationFrame(render);
  }

  function pulsePlant(label) {
    plantPulseLabel=label||"PLANT ACK";
    plantPulseUntil=Date.now()+950;
    queueRender();
    setTimeout(queueRender,1000);
  }

  function start() {
    const panel=document.getElementById("station-panel");
    if(!panel) return;
    observer=new MutationObserver(queueRender);
    observer.observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:["aria-pressed","data-dial-angle","data-control-state"]});
    const auxRoot=document.getElementById("crew-auxiliary-root");
    if(auxRoot){
      auxiliaryObserver=new MutationObserver(queueRender);
      auxiliaryObserver.observe(auxRoot,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["style","aria-valuenow"]});
    }
    document.addEventListener("click",event=>{
      const confirm=event.target.closest?.('#station-panel [data-control-id="eng-confirms"]');
      if(confirm) pulsePlant(confirm.dataset.controlState==="ACKNOWLEDGED"?"CASUALTY ACK":"PLANT CONFIRM");
      if(event.target.closest?.('#station-tabs [data-station="engineering"], #station-panel [data-control-id]')) queueRender();
    },true);
    document.addEventListener("change",event=>{if(event.target.closest?.("#station-panel,#crew-auxiliary-root"))queueRender();},true);
    document.addEventListener("input",event=>{if(event.target.closest?.("#station-panel,#crew-auxiliary-root"))queueRender();},true);
    document.addEventListener("exo:auxiliary-input",event=>{if(event.detail?.station==="engineering")queueRender();});
    queueRender();
  }

  window.EXO_ENGINEERING_POWER_MAP=Object.freeze({refresh:queueRender,read:readState});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
