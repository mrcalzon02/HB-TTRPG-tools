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
  let meterAnimationFrame = 0;
  const meterMotion = new WeakMap();

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

  function rectifierRamp(state) {
    return clamp((state.feed.a.fraction+state.feed.b.fraction+state.feed.c.fraction+state.feed.d.fraction)/4,0,1);
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

  function voltmeterMarkup(x,y,base,kind,strength,ramp,label) {
    const input=kind==="input";
    const w=input?39:31,h=input?25:22;
    const pivotY=y+2.5;
    const arcR=input?12:9;
    const left=x-arcR,right=x+arcR,top=pivotY-arcR;
    const accent=input?"#84dff0":"#a8c98b";
    const glow=input?"rgba(100,220,255,.48)":"rgba(160,205,126,.34)";
    return `<g class="exo-eng-voltmeter exo-eng-voltmeter-${kind}" data-voltmeter data-meter-kind="${kind}" data-meter-base="${base}" data-meter-strength="${strength.toFixed(3)}" data-meter-ramp="${ramp.toFixed(3)}" data-meter-cx="${x}" data-meter-cy="${pivotY}" style="pointer-events:none">
      <rect x="${(x-w/2).toFixed(1)}" y="${(y-h/2).toFixed(1)}" width="${w}" height="${h}" rx="2.2" fill="#04100e" stroke="${accent}" stroke-width=".72" opacity=".96"/>
      <path d="M${left.toFixed(1)} ${pivotY.toFixed(1)} A${arcR} ${arcR} 0 0 1 ${right.toFixed(1)} ${pivotY.toFixed(1)}" fill="none" stroke="#334843" stroke-width="1"/>
      <path d="M${left.toFixed(1)} ${pivotY.toFixed(1)} A${arcR} ${arcR} 0 0 1 ${right.toFixed(1)} ${pivotY.toFixed(1)}" fill="none" stroke="${accent}" stroke-width=".55" opacity=".72"/>
      <path d="M${x} ${pivotY} L${x} ${top.toFixed(1)}" data-meter-needle fill="none" stroke="#f4ffff" stroke-width="1" stroke-linecap="round" vector-effect="non-scaling-stroke" filter="drop-shadow(0 0 2px ${glow})"/>
      <circle cx="${x}" cy="${pivotY}" r="1.45" fill="#dffff8" stroke="${accent}" stroke-width=".55"/>
      <text x="${x}" y="${(y+h/2-3).toFixed(1)}" text-anchor="middle" data-meter-readout fill="#e5fff7" stroke="#04100e" stroke-width=".5" font-size="${input?4.7:4.2}px" font-weight="900">${Math.round(base)} V</text>
      <text x="${x}" y="${(y-h/2+4.2).toFixed(1)}" text-anchor="middle" fill="${accent}" stroke="#04100e" stroke-width=".45" font-size="${input?3.25:3}px" font-weight="900" letter-spacing=".2">${label}</text>
    </g>`;
  }

  function plasmaFilaments(state) {
    const feedFractions=[state.feed.a.fraction,state.feed.b.fraction,state.feed.c.fraction,state.feed.d.fraction];
    const electrodes=[
      {x:-39,y:-32,feed:0,role:"input-a"},{x:-16,y:-47,feed:1,role:"input-b"},{x:16,y:-47,feed:2,role:"input-c"},{x:39,y:-32,feed:3,role:"input-d"},
      {x:39,y:32,feed:0,role:"output-a"},{x:16,y:47,feed:1,role:"output-b"},{x:-16,y:47,feed:2,role:"output-c"},{x:-39,y:32,feed:3,role:"output-d"}
    ];
    const cubicFrame=(x,y,index,strength,phase)=>{
      const wander=8+strength*17;
      const theta=(index+1)*1.73+phase;
      const c1x=x*.17+Math.sin(theta)*wander;
      const c1y=y*.16+Math.cos(theta*1.19+.4)*wander;
      const c2x=x*.61+Math.cos(theta*.93+1.2)*wander*1.18;
      const c2y=y*.59+Math.sin(theta*1.31+.7)*wander*1.18;
      return `M0 0 C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${x} ${y}`;
    };
    const branchFrame=(x,y,index,strength,phase,offset)=>{
      const wander=5+strength*11.5;
      const theta=(index+1)*1.31+phase+offset;
      const startX=x*.29+Math.sin(theta*.86)*wander*.34;
      const startY=y*.29+Math.cos(theta*1.14)*wander*.34;
      const endX=x*.79+Math.sin(theta*1.23+1.1)*wander*.72;
      const endY=y*.79+Math.cos(theta*.97+.3)*wander*.72;
      const controlX=x*.54+Math.cos(theta*1.07+.8)*wander*1.18;
      const controlY=y*.54+Math.sin(theta*1.41+.5)*wander*1.18;
      return `M${startX.toFixed(1)} ${startY.toFixed(1)} Q${controlX.toFixed(1)} ${controlY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
    };
    const phases=[0,1.46,3.08,4.74];
    const keyTimes="0;.25;.5;.75;1";
    const splines=".37 0 .63 1;.42 0 .58 1;.34 0 .66 1;.42 0 .58 1";
    const animatePath=(frames,duration)=>`<animate attributeName="d" values="${[...frames,frames[0]].join(";")}" dur="${duration.toFixed(2)}s" repeatCount="indefinite" calcMode="spline" keyTimes="${keyTimes}" keySplines="${splines}"/>`;
    const animateWidth=(base,duration,phaseShift=0)=>{
      const values=[base*.72,base*1.34,base*.88,base*1.52,base*.72].map(v=>v.toFixed(2)).join(";");
      return `<animate attributeName="stroke-width" values="${values}" dur="${(duration*(1.04+phaseShift)).toFixed(2)}s" repeatCount="indefinite" calcMode="spline" keyTimes="${keyTimes}" keySplines="${splines}"/>`;
    };
    const animateOpacity=(duration,min=.48,max=1)=>`<animate attributeName="opacity" values="${min};${max};${Math.max(min,.72)};${Math.max(min,max*.9)};${min}" dur="${(duration*1.13).toFixed(2)}s" repeatCount="indefinite" calcMode="spline" keyTimes="${keyTimes}" keySplines="${splines}"/>`;
    const flowPulse=(frames,duration,width,offset)=>`<path class="exo-eng-plasma-filament exo-eng-plasma-flow-pulse" d="${frames[0]}" fill="none" stroke="#f4ffff" stroke-width="${width.toFixed(2)}" stroke-linecap="round" stroke-dasharray="1.6 11 3.4 16" opacity=".82" filter="drop-shadow(0 0 2px rgba(225,255,255,.96)) drop-shadow(0 0 4px rgba(91,145,255,.82))">${animatePath(frames,duration)}<animate attributeName="stroke-dashoffset" values="${offset};${offset-64}" dur="${(duration*.54).toFixed(2)}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".18;.96;.42;1;.18" dur="${(duration*.91).toFixed(2)}s" repeatCount="indefinite"/></path>`;

    return electrodes.map((electrode,index)=>{
      const strength=clamp(feedFractions[electrode.feed],0,1),x=electrode.x,y=electrode.y;
      const mainFrames=phases.map(phase=>cubicFrame(x,y,index,strength,phase));
      const branchFrames=phases.map(phase=>branchFrame(x,y,index,strength,phase,0));
      const forkFrames=phases.map(phase=>branchFrame(x,y,index,strength,phase,2.35));
      const dur=1.62-strength*.78+(index%4)*.065;
      const branchDur=dur*.82;
      const forkDur=dur*.94;
      const width=1.0+strength*1.65;
      const branchWidth=.52+strength*.82;
      const contact=2.25+strength*1.95;
      const originX=x*.085+Math.sin(index*1.7)*1.4;
      const originY=y*.085+Math.cos(index*1.3)*1.4;
      const whiskerAngle=Math.atan2(y,x);
      const tx=Math.cos(whiskerAngle+Math.PI/2),ty=Math.sin(whiskerAngle+Math.PI/2);
      const whisker=`M${(x-tx*4.4).toFixed(1)} ${(y-ty*4.4).toFixed(1)} Q${(x+Math.cos(whiskerAngle)*2.8).toFixed(1)} ${(y+Math.sin(whiskerAngle)*2.8).toFixed(1)} ${(x+tx*4.4).toFixed(1)} ${(y+ty*4.4).toFixed(1)}`;
      return `<g class="exo-eng-plasma-tendril ${electrode.role}" data-feed-pair="${electrode.feed}" style="--filament:${(.48+strength*.52).toFixed(2)};--tendril-rate:${dur.toFixed(2)}s;--branch-rate:${branchDur.toFixed(2)}s;--phase:${(-index*.11).toFixed(2)}s">
        <path class="exo-eng-plasma-filament exo-eng-plasma-filament-halo exo-eng-plasma-filament-main" d="${mainFrames[0]}" stroke-width="${(width*4.4).toFixed(2)}" filter="url(#exoEngPlasmaHalo)">
          ${animatePath(mainFrames,dur)}${animateWidth(width*4.4,dur,.03)}${animateOpacity(dur,.15,.42)}
        </path>
        <path class="exo-eng-plasma-filament exo-eng-plasma-filament-core exo-eng-plasma-filament-main" d="${mainFrames[0]}" stroke-width="${width.toFixed(2)}">
          ${animatePath(mainFrames,dur)}${animateWidth(width,dur)}${animateOpacity(dur,.62,1)}
        </path>
        ${flowPulse(mainFrames,dur,width*.52,-index*7)}
        <path class="exo-eng-plasma-filament exo-eng-plasma-filament-halo exo-eng-plasma-filament-branch" d="${branchFrames[0]}" stroke-width="${(branchWidth*3.5).toFixed(2)}" filter="url(#exoEngPlasmaHalo)">
          ${animatePath(branchFrames,branchDur)}${animateWidth(branchWidth*3.5,branchDur,.07)}${animateOpacity(branchDur,.10,.32)}
        </path>
        <path class="exo-eng-plasma-filament exo-eng-plasma-filament-core exo-eng-plasma-filament-branch" d="${branchFrames[0]}" stroke-width="${branchWidth.toFixed(2)}">
          ${animatePath(branchFrames,branchDur)}${animateWidth(branchWidth,branchDur,.04)}${animateOpacity(branchDur,.42,.86)}
        </path>
        ${flowPulse(branchFrames,branchDur,Math.max(.34,branchWidth*.46),-index*5-11)}
        <path class="exo-eng-plasma-filament exo-eng-plasma-filament-core exo-eng-plasma-filament-fork" d="${forkFrames[0]}" stroke-width="${(branchWidth*.72).toFixed(2)}">
          ${animatePath(forkFrames,forkDur)}${animateWidth(branchWidth*.72,forkDur,.09)}${animateOpacity(forkDur,.28,.72)}
        </path>
        <g class="exo-eng-ionization exo-eng-ionization-origin" transform="translate(${originX.toFixed(1)} ${originY.toFixed(1)})">
          <circle class="exo-eng-ion-cloud" r="${(4.2+strength*2.8).toFixed(2)}" filter="url(#exoEngIonBloom)"><animate attributeName="r" values="${(3.4+strength*2.2).toFixed(2)};${(6.1+strength*3.5).toFixed(2)};${(4.1+strength*2.5).toFixed(2)};${(6.8+strength*3.8).toFixed(2)};${(3.4+strength*2.2).toFixed(2)}" dur="${(dur*1.21).toFixed(2)}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".18;.5;.28;.62;.18" dur="${(dur*1.21).toFixed(2)}s" repeatCount="indefinite"/></circle>
          <circle class="exo-eng-ion-hot" r="${(1.25+strength*.8).toFixed(2)}"><animate attributeName="r" values="${(1.0+strength*.6).toFixed(2)};${(1.75+strength*1.0).toFixed(2)};${(1.0+strength*.6).toFixed(2)}" dur="${(dur*.71).toFixed(2)}s" repeatCount="indefinite"/></circle>
        </g>
        <g class="exo-eng-ionization exo-eng-ionization-electrode">
          <circle class="exo-eng-ion-cloud" cx="${x}" cy="${y}" r="${(5.4+strength*3.6).toFixed(2)}" filter="url(#exoEngIonBloom)"><animate attributeName="r" values="${(4.0+strength*2.8).toFixed(2)};${(7.5+strength*4.6).toFixed(2)};${(5.0+strength*3.2).toFixed(2)};${(8.2+strength*4.9).toFixed(2)};${(4.0+strength*2.8).toFixed(2)}" dur="${(branchDur*1.16).toFixed(2)}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".16;.58;.28;.72;.16" dur="${(branchDur*1.16).toFixed(2)}s" repeatCount="indefinite"/></circle>
          <circle class="exo-eng-ion-ring" cx="${x}" cy="${y}" r="${(contact+1.8).toFixed(2)}"><animate attributeName="r" values="${(contact+1.0).toFixed(2)};${(contact+4.8).toFixed(2)};${(contact+1.0).toFixed(2)}" dur="${(branchDur*.92).toFixed(2)}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".7;.08;.7" dur="${(branchDur*.92).toFixed(2)}s" repeatCount="indefinite"/></circle>
          <path class="exo-eng-ion-whisker" d="${whisker}"><animate attributeName="opacity" values=".24;.92;.38;.76;.24" dur="${(forkDur*.77).toFixed(2)}s" repeatCount="indefinite"/></path>
          <circle class="exo-eng-plasma-contact" cx="${x}" cy="${y}" r="${contact.toFixed(2)}"><animate attributeName="r" values="${(contact*.78).toFixed(2)};${(contact*1.22).toFixed(2)};${(contact*.9).toFixed(2)};${(contact*1.35).toFixed(2)};${(contact*.78).toFixed(2)}" dur="${branchDur.toFixed(2)}s" repeatCount="indefinite"/></circle>
        </g>
      </g>`;
    }).join("");
  }

  function feedMarkup(item,state) {
    const key=item.letter.toLowerCase(),feed=state.feed[key],volts=feed.volts,ramp=rectifierRamp(state);
    return `<g class="exo-eng-feed feed-${key}" data-feed="${item.letter}">
      <path class="exo-eng-feed-conduit" d="${item.path}"/>
      <path class="exo-eng-feed-plasma" d="${item.path}"/>
      <circle class="exo-eng-port" cx="${item.portX}" cy="${item.portY}" r="5.4"/>
      <text class="exo-eng-feed-label" x="${item.x}" y="18" text-anchor="middle">FEED ${item.letter}</text>
      <text class="exo-eng-feed-value" x="${item.x}" y="30" text-anchor="middle">${volts} V</text>
      ${voltmeterMarkup(item.x,50,volts,"input",feed.fraction,ramp,`RAW ${item.letter}`)}
    </g>`;
  }

  function breakerMarkup(item,breakerState,plantState) {
    const cssState=breakerState==="ON"?"on":breakerState==="TRIPPED"?"tripped":"off";
    const railX=item.rail==="A"?88:214;
    const endX=item.side==="left"?20:282;
    const ledX=item.side==="left"?50:252;
    const labelX=item.side==="left"?58:244;
    const anchor=item.side==="left"?"start":"end";
    const bladeX=item.side==="left"?68:234;
    const open=breakerState!=="ON";
    const bladePath=item.side==="left"
      ? (open?`M${railX} ${item.y} L${bladeX+10} ${item.y-8}`:`M${railX} ${item.y} H${bladeX+10}`)
      : (open?`M${railX} ${item.y} L${bladeX-10} ${item.y-8}`:`M${railX} ${item.y} H${bladeX-10}`);
    const rail=item.rail==="A"?plantState.busA:plantState.busB;
    const ramp=rectifierRamp(plantState);
    const base=breakerState==="ON"?rail.volts:0;
    const meterX=item.side==="left"?29:273;
    return `<g class="exo-eng-breaker state-${cssState}" data-breaker="${item.id}">
      <path class="exo-eng-branch-base" d="M${railX} ${item.y} H${endX}"/>
      <path class="exo-eng-branch-live" d="M${railX} ${item.y} H${endX}"/>
      <circle class="exo-eng-breaker-node" cx="${railX}" cy="${item.y}" r="3.5"/>
      <path class="exo-eng-breaker-blade" d="${bladePath}"/>
      <circle class="exo-eng-breaker-led" cx="${ledX}" cy="${item.y}" r="4.2"/>
      <circle class="exo-eng-breaker-ring" cx="${ledX}" cy="${item.y}" r="7.2"/>
      <text class="exo-eng-breaker-name" x="${labelX}" y="${item.y-5}" text-anchor="${anchor}">${item.name}</text>
      <text class="exo-eng-breaker-load" x="${labelX}" y="${item.y+8}" text-anchor="${anchor}">${item.load} · ${breakerState}</text>
      ${voltmeterMarkup(meterX,item.y,base,"output",rail.fraction,ramp,`${item.rail} OUT`)}
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
    const outputPaths="M190 222 Q177 249 107 272 M167 237 Q153 257 97 272 M135 237 Q123 257 86 272 M112 222 Q102 249 75 272";
    return `<g class="exo-eng-primary-conditioner">
      <path class="exo-eng-rectifier-output-base" d="${outputPaths}"/>
      <path class="exo-eng-rectifier-output-live" d="${outputPaths}"/>
      <path class="exo-eng-main-incomer" d="M91 303 V309"/>
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
            <radialGradient id="exoEngCoreIon" cx="50%" cy="50%" r="50%">
              <stop offset="0" stop-color="#f5ffff" stop-opacity=".92"/>
              <stop offset=".18" stop-color="#98fff4" stop-opacity=".58"/>
              <stop offset=".52" stop-color="#4daeff" stop-opacity=".20"/>
              <stop offset="1" stop-color="#5870ff" stop-opacity="0"/>
            </radialGradient>
            <filter id="exoEngPlasmaHalo" x="-100%" y="-100%" width="300%" height="300%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="1.7"/></filter>
            <filter id="exoEngIonBloom" x="-180%" y="-180%" width="460%" height="460%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="2.6"/></filter>
          </defs>

          <text class="exo-eng-section-title" x="151" y="11" text-anchor="middle">RAW PRIMARY GENERATION · VARIABLE FOUR-FEED INPUT</text>
          ${FEEDS.map(item=>feedMarkup(item,state)).join("")}

          <text class="exo-eng-core-title" x="151" y="102" text-anchor="middle">MASTER PLASMA RECTIFIER</text>
          <text class="exo-eng-core-subtitle" x="151" y="112" text-anchor="middle">4 INPUT / 4 OUTPUT · OPPOSED ELECTRODE PAIRS · MODERATOR NEUTRAL</text>

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
            <circle class="exo-eng-plasma-core-halo" r="18" fill="url(#exoEngCoreIon)" filter="url(#exoEngIonBloom)"/>
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

          <text class="exo-eng-section-title" x="151" y="451" text-anchor="middle">PROTECTED DISTRIBUTION BRANCHES · LIVE VOLTAGE / BREAKER LED STATUS</text>
          ${BREAKERS.map(item=>breakerMarkup(item,state.breakers[item.id],state)).join("")}
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

  function updateVoltmeter(node,now,reduced) {
    const base=Number(node.dataset.meterBase)||0;
    const strength=clamp(Number(node.dataset.meterStrength)||0,0,1);
    const ramp=clamp(Number(node.dataset.meterRamp)||0,0,1);
    const kind=node.dataset.meterKind||"output";
    const cx=Number(node.dataset.meterCx)||0,cy=Number(node.dataset.meterCy)||0;
    const needle=node.querySelector("[data-meter-needle]");
    const readout=node.querySelector("[data-meter-readout]");
    if(!needle||!readout)return;
    let motion=meterMotion.get(node);
    if(!motion){motion={last:now,phase:Math.random()*Math.PI*2,noise:0,target:0,nextNoise:now,spike:0};meterMotion.set(node,motion);}
    const dt=Math.min(50,Math.max(0,now-motion.last));
    motion.last=now;
    if(reduced||base<=0){
      const value=base<=0?0:base;
      const angle=base<=0?-58:clamp((value-440)/80*92,-58,58);
      needle.setAttribute("transform",`rotate(${angle.toFixed(1)} ${cx} ${cy})`);
      readout.textContent=`${Math.round(value)} V`;
      return;
    }
    const input=kind==="input";
    motion.phase+=dt*(input?.011+.010*strength:.0042+.0048*ramp);
    if(now>=motion.nextNoise){
      motion.target=Math.random()*2-1;
      motion.nextNoise=now+(input?65+Math.random()*115:170+Math.random()*260);
      const spikeChance=input?.13+.24*ramp:.035+.08*ramp;
      if(Math.random()<spikeChance)motion.spike=(Math.random()<.5?-1:1)*(input?.75+Math.random()*.75:.35+Math.random()*.45);
    }
    motion.noise+=(motion.target-motion.noise)*(input?.20:.075);
    motion.spike*=Math.pow(input?.88:.94,dt/16.67);
    const amp=input?(2.8+strength*11+ramp*10):(0.7+ramp*4.6+strength*1.2);
    const wave=Math.sin(motion.phase)*.34+Math.sin(motion.phase*2.73+1.2)*.17+Math.sin(motion.phase*.63-2.1)*.13;
    const value=clamp(base+amp*(wave+motion.noise*.52+motion.spike),0,520);
    const angle=clamp((value-440)/80*92,-58,58);
    needle.setAttribute("transform",`rotate(${angle.toFixed(1)} ${cx} ${cy})`);
    readout.textContent=`${Math.round(value)} V`;
  }

  function animateVoltmeters(now) {
    const reduced=Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    if(engineeringActive())document.querySelectorAll("#station-panel [data-eng-power-map] [data-voltmeter]").forEach(node=>updateVoltmeter(node,now,reduced));
    meterAnimationFrame=requestAnimationFrame(animateVoltmeters);
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
    if(!meterAnimationFrame)meterAnimationFrame=requestAnimationFrame(animateVoltmeters);
    window.addEventListener("beforeunload",()=>{if(meterAnimationFrame)cancelAnimationFrame(meterAnimationFrame);meterAnimationFrame=0;},{once:true});
  }

  window.EXO_ENGINEERING_POWER_MAP=Object.freeze({refresh:queueRender,read:readState});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
