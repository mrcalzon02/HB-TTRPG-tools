from pathlib import Path
import re

JS = Path('blacklight-exo-crew-operations.js')
CSS = Path('blacklight-exo-crew-operations.css')
HTML = Path('blacklight-exo-crew-operations.html')
WORKFLOW = Path('.github/workflows/_apply-sci-apm-source-refactor.yml')
SELF = Path('.github/_apply_sci_apm.py')

js = JS.read_text()
css = CSS.read_text()
html = HTML.read_text()

def once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing source anchor: {label}')
    return text.replace(old, new, 1)

js = once(js,
    'control("aperture","matrix","APERTURE MATRIX","aperture",[action("sci-ap-main","MAIN","MAIN ARRAY"),action("sci-ap-high","HIGH GAIN","HIGH GAIN"),action("sci-ap-side","SIDE","SIDE ARRAY"),action("sci-ap-aux","AUX","AUX ARRAY")],{physical:"aperture-matrix"}),',
    'control("aperture","matrix","APERTURE MATRIX","aperture",[action("sci-ap-main","MAIN","MAIN ARRAY"),action("sci-ap-high","HIGH GAIN","HIGH GAIN"),action("sci-ap-side","SIDE","SIDE ARRAY"),action("sci-ap-aux","AUX","AUX ARRAY")],{physical:"aperture-topology"}),',
    'SCI-APM-02 definition')

js = once(js,
    'science:{label:"Science / Scanning",display:"sensor",theme:"laboratory",description:"Sensor laboratory built around a receiver-band turret, aperture matrix, differential gain/noise-rejection faders, integration-time register and a physically inhibited active-emission gate."',
    'science:{label:"Science / Scanning",display:"sensor",theme:"laboratory",description:"Sensor laboratory centered on the SCI-APM-02 wideband aperture topology console: motorized azimuth/elevation pointing, vernier trim, phased-array beamforming, RF band and polarization routing, element isolation, continuous power/SWR telemetry and hard mast safety interlocks."',
    'Science description')

js = once(js,
    'commsArray:{dorsal:"online",ventral:"online",port:"online",starboard:"online",longRange:"online",optical:"online"},weaponGroup:',
    'commsArray:{dorsal:"online",ventral:"online",port:"online",starboard:"online",longRange:"online",optical:"online"},apertureMatrix:{az:0,el:0,brake:false,phase:[0,0,0,0],attenuation:[24,30,18,35],elements:[true,true,true,true,true,true,true,true],band:"L",polarization:"H",mastKill:false},weaponGroup:',
    'aperture state')

js = once(js,
    'let state=initialState(),activeStation="helm",manualOpen=false,manualQuery="",timer=null,scopeTimer=null,physicalGesture=null,suppressGestureClickUntil=0;',
    'let state=initialState(),activeStation="helm",manualOpen=false,manualQuery="",timer=null,scopeTimer=null,physicalGesture=null,suppressGestureClickUntil=0,apertureDrive=null,apertureDriveFrame=0;',
    'aperture runtime')

renderer = r'''
  function apertureMatrixMetrics(){
    const m=state.apertureMatrix,activeElements=m.elements.filter(Boolean).length,avgAtt=m.attenuation.reduce((a,b)=>a+b,0)/m.attenuation.length,phaseMin=Math.min(...m.phase),phaseMax=Math.max(...m.phase),phaseSpread=phaseMax-phaseMin,forward=round(clamp((100-avgAtt)*.96*(activeElements/8)*(m.mastKill?0:1)),1),reflected=round(clamp((8-activeElements)*6.5+phaseSpread*.055+(100-state.sensorHealth)*.2),1),swr=round(1+reflected/55,2),db=round(clamp(72-avgAtt*.42+activeElements*1.8-phaseSpread*.025),1);return {activeElements,avgAtt,phaseSpread,forward,reflected,swr,db};
  }
  function renderApertureTopology(ctrl,p,active){
    const m=state.apertureMatrix,metrics=apertureMatrixMetrics(),identity=controlIdentity(activeStation,ctrl),value=displayValue(ctrl),status=controlStatus(ctrl,p,active),attrs=`data-control-mode="${controlMode(activeStation,ctrl)}" data-control-activity="${status.activity}"`,indicator=stateIndicator(ctrl,p,active),disabled=active?"":"disabled",bands=["L","S","C","X"],bandIndex=Math.max(0,bands.indexOf(m.band)),bandAngle=-54+bandIndex*36;
    const routeButtons=ctrl.actions.map(a=>`<button type="button" aria-pressed="${value===a.state}" data-proc-input="${a.token}" data-control-id="${ctrl.id}" data-control-state="${a.state}" data-proc-label="${identity.fullName}: ${a.label}" ${disabled}>${a.label}</button>`).join("");
    const atten=m.attenuation.map((v,i)=>`<label class="exo-apm-atten"><span>CH-${String.fromCharCode(65+i)}</span><input data-apm-atten="${i}" type="range" min="0" max="60" step="1" value="${v}" ${disabled}><b data-apm-atten-readout="${i}">${v} dB</b></label>`).join("");
    const phase=m.phase.map((v,i)=>{const angle=clamp(v/180*58,-58,58);return `<div class="exo-apm-phase"><span>PH-${String.fromCharCode(65+i)}</span><div class="exo-apm-phase-knob"><i style="transform:rotate(${angle}deg)"></i></div><div><button type="button" data-apm-click="phase" data-apm-index="${i}" data-apm-delta="-2.8" ${disabled}>−</button><b>${v.toFixed(1)}°</b><button type="button" data-apm-click="phase" data-apm-index="${i}" data-apm-delta="2.8" ${disabled}>+</button></div></div>`;}).join("");
    const elements=m.elements.map((on,i)=>`<button type="button" class="exo-apm-element${on?" active":""}" data-apm-click="element" data-apm-index="${i}" aria-pressed="${on}" ${disabled}><i></i>E${i+1}</button>`).join("");
    const pols=["H","V","LHCP","RHCP"].map(x=>`<button type="button" class="${m.polarization===x?"active":""}" data-apm-click="polarization" data-apm-value="${x}" aria-pressed="${m.polarization===x}" ${disabled}>${x}</button>`).join("");
    const meter=(label,value,text,critical=false)=>`<div class="exo-apm-meter${critical?" critical":""}"><span>${label}</span><div><i style="width:${clamp(value)}%"></i></div><b>${text}</b></div>`;
    return `<div class="exo-device-block exo-apm-topology physical-aperture-topology area-aperture" ${attrs} data-control-code="${identity.code}" style="grid-area:aperture">${controlLabelMarkup(activeStation,ctrl)}<div class="exo-apm-head"><div><span class="exo-kicker">WIDEBAND</span><strong>${identity.fullName}</strong><small>AZ/EL CONTROL · PHASED ARRAY STEERING · BAND ROUTING · CRITICAL TELEMETRY</small></div><b>${m.mastKill?"MAST POWER ISOLATED":m.brake?"MECHANICAL BRAKE SET":"TRACKING READY"}</b></div>${indicator}<div class="exo-apm-grid">
      <section class="exo-apm-quadrant q1"><header><span>QUADRANT 1</span><b>AZ / EL MATRIX</b></header><div class="exo-apm-gimbal"><div class="exo-apm-stick-bed" data-apm-gimbal-joystick aria-disabled="${m.brake||m.mastKill}"><i class="axis x"></i><i class="axis y"></i><div class="exo-apm-stick" data-apm-stick-handle></div></div><div class="exo-apm-gimbal-readout"><span>AZ <b data-apm-az-readout>${m.az.toFixed(2)}°</b></span><span>EL <b data-apm-el-readout>${m.el.toFixed(2)}°</b></span><small>DRAG / HOLD · DISPLACEMENT COMMANDS SLEW RATE · RELEASE STOPS</small></div></div><div class="exo-apm-verniers"><div><span>AZ VERNIER · 10:1</span><p><button type="button" data-apm-click="vernier" data-apm-axis="az" data-apm-delta="-0.1" ${disabled}>−</button><b>${m.az.toFixed(2)}°</b><button type="button" data-apm-click="vernier" data-apm-axis="az" data-apm-delta="0.1" ${disabled}>+</button></p></div><div><span>EL VERNIER · 10:1</span><p><button type="button" data-apm-click="vernier" data-apm-axis="el" data-apm-delta="-0.1" ${disabled}>−</button><b>${m.el.toFixed(2)}°</b><button type="button" data-apm-click="vernier" data-apm-axis="el" data-apm-delta="0.1" ${disabled}>+</button></p></div></div><button type="button" class="exo-apm-brake${m.brake?" active":""}" data-apm-click="brake" aria-pressed="${m.brake}" ${disabled}>CALIPER BRAKE · ${m.brake?"LOCKED":"RELEASED"}</button></section>
      <section class="exo-apm-quadrant q2"><header><span>QUADRANT 2</span><b>PHASE SHIFT ARRAY</b></header><div class="exo-apm-atten-row">${atten}</div><div class="exo-apm-phase-row">${phase}</div><div class="exo-apm-elements"><span>ELEMENT ISOLATION</span><div>${elements}</div></div></section>
      <section class="exo-apm-quadrant q3"><header><span>QUADRANT 3</span><b>BAND SELECTION</b></header><div class="exo-apm-band"><div class="exo-apm-wafer"><i style="transform:rotate(${bandAngle}deg)"></i></div><div>${bands.map(x=>`<button type="button" class="${m.band===x?"active":""}" data-apm-click="band" data-apm-value="${x}" aria-pressed="${m.band===x}" ${disabled}>${x}-BAND</button>`).join("")}</div></div><div class="exo-apm-polarization"><span>POLARIZATION</span><div>${pols}</div></div><div class="exo-apm-routing"><span>APERTURE ROUTING</span><div>${routeButtons}</div></div></section>
      <section class="exo-apm-quadrant q4"><header><span>QUADRANT 4</span><b>CRITICAL TELEMETRY</b></header><div class="exo-apm-mast-safety"><span>MAST SAFETY OVERRIDE</span><button type="button" class="${m.mastKill?"active":""}" data-apm-click="mast" aria-pressed="${m.mastKill}" ${disabled}><i>!</i>${m.mastKill?"ACTUATOR POWER KILLED":"LIFT COVER / KILL"}</button></div><div class="exo-apm-telemetry">${meter("FORWARD POWER",metrics.forward,`${metrics.forward}%`)}${meter("REFLECTED POWER",metrics.reflected,`${metrics.reflected}%`,metrics.reflected>55)}${meter("SWR",clamp((metrics.swr-1)/2.5*100),metrics.swr.toFixed(2),metrics.swr>2)}${meter("SIGNAL dB",clamp(metrics.db/80*100),`${metrics.db} dB`)}</div><div class="exo-apm-telemetry-foot"><span>${metrics.activeElements}/8 ELEMENTS ONLINE</span><span>PHASE SPREAD ${metrics.phaseSpread.toFixed(1)}°</span><span>AVG ATTEN ${metrics.avgAtt.toFixed(1)} dB</span></div></section>
    </div></div>`;
  }

'''
anchor = '  function renderControl(ctrl,p,active){'
if anchor not in js:
    raise SystemExit('missing renderControl anchor')
js = js.replace(anchor, renderer + anchor, 1)
js = once(js,
    'function renderControl(ctrl,p,active){const disabled=active?"":"disabled",',
    'function renderControl(ctrl,p,active){if(activeStation==="science"&&ctrl.id==="aperture")return renderApertureTopology(ctrl,p,active);const disabled=active?"":"disabled",',
    'aperture render branch')

handlers = r'''
  function apertureAuxiliary(controlId,label,value,scene="button-light"){
    controlAudio()?.play(scene,{seed:`science:aperture:${controlId}:${value}`});
    const p=state.procedure;if(p?.active&&p.station==="science")document.dispatchEvent(new CustomEvent("exo:auxiliary-input",{detail:{station:"science",controlId:`sci-apm-${controlId}`,label:`SCI-APM-02 · ${label}`,value:String(value),required:false,satisfied:true}}));else renderStation();
  }
  function refreshAperturePointingDom(){if(activeStation!=="science")return;const root=$("station-panel")?.querySelector(".exo-apm-topology"),m=state.apertureMatrix;if(!root)return;const az=root.querySelector("[data-apm-az-readout]"),el=root.querySelector("[data-apm-el-readout]");if(az)az.textContent=`${m.az.toFixed(2)}°`;if(el)el.textContent=`${m.el.toFixed(2)}°`;}
  function handleApertureClick(button){
    if(activeStation!=="science")return false;const m=state.apertureMatrix,kind=button.dataset.apmClick;if(!kind)return false;
    if(kind==="vernier"){const axis=button.dataset.apmAxis,delta=Number(button.dataset.apmDelta)||0;if(axis==="az")m.az=round(clamp(m.az+delta,-180,180),2);else m.el=round(clamp(m.el+delta,-90,90),2);apertureAuxiliary(`vernier-${axis}`,`${axis.toUpperCase()} VERNIER`,`${axis==="az"?m.az:m.el}°`,"rotary-detent");return true;}
    if(kind==="phase"){const i=Number(button.dataset.apmIndex),delta=Number(button.dataset.apmDelta)||0;m.phase[i]=round(clamp(m.phase[i]+delta,-180,180),1);apertureAuxiliary(`phase-${i}`,`PHASE ${String.fromCharCode(65+i)}`,`${m.phase[i].toFixed(1)}°`,"rotary-detent");return true;}
    if(kind==="element"){const i=Number(button.dataset.apmIndex);m.elements[i]=!m.elements[i];apertureAuxiliary(`element-${i+1}`,`ELEMENT E${i+1}`,m.elements[i]?"CONNECTED":"ISOLATED","button-heavy");return true;}
    if(kind==="band"){m.band=button.dataset.apmValue||m.band;apertureAuxiliary("band","HEAVY WAFER BAND SELECT",`${m.band}-BAND`,"rotary-detent");return true;}
    if(kind==="polarization"){m.polarization=button.dataset.apmValue||m.polarization;apertureAuxiliary("polarization","POLARIZATION",m.polarization,"toggle-flick");return true;}
    if(kind==="brake"){m.brake=!m.brake;apertureAuxiliary("caliper-brake","CALIPER BRAKE",m.brake?"LOCKED":"RELEASED","lever-throw");return true;}
    if(kind==="mast"){m.mastKill=!m.mastKill;apertureAuxiliary("mast-safety","MAST SAFETY OVERRIDE",m.mastKill?"ACTUATOR POWER KILLED":"ACTUATOR POWER AVAILABLE","guard-cover");return true;}
    return false;
  }
  function handleApertureRange(input,commit=false){
    if(activeStation!=="science")return false;const i=Number(input.dataset.apmAtten);if(!Number.isFinite(i))return false;const value=clamp(Number(input.value)||0,0,60);state.apertureMatrix.attenuation[i]=value;const readout=input.closest(".exo-apm-atten")?.querySelector(`[data-apm-atten-readout="${i}"]`);if(readout)readout.textContent=`${value} dB`;if(commit)apertureAuxiliary(`atten-${i}`,`CH-${String.fromCharCode(65+i)} ATTENUATION`,`${value} dB`,"servo-set");return true;
  }
  function beginApertureDrive(e,target){
    const m=state.apertureMatrix;if(activeStation!=="science"||m.brake||m.mastKill)return false;e.preventDefault();apertureDrive={pointerId:e.pointerId,target,startX:e.clientX,startY:e.clientY,dx:0,dy:0,last:performance.now()};target.setPointerCapture?.(e.pointerId);if(!apertureDriveFrame)apertureDriveFrame=requestAnimationFrame(stepApertureDrive);controlAudio()?.startLoop("servo-loop","science:aperture:gimbal",{seed:"science:aperture:gimbal",intensity:.55});return true;
  }
  function moveApertureDrive(e){if(!apertureDrive||apertureDrive.pointerId!==e.pointerId)return false;if(e.cancelable)e.preventDefault();apertureDrive.dx=clamp(e.clientX-apertureDrive.startX,-38,38);apertureDrive.dy=clamp(e.clientY-apertureDrive.startY,-38,38);const handle=apertureDrive.target.querySelector("[data-apm-stick-handle]");if(handle)handle.style.transform=`translate(${apertureDrive.dx}px,${apertureDrive.dy}px)`;return true;}
  function stepApertureDrive(t){apertureDriveFrame=0;if(!apertureDrive)return;const m=state.apertureMatrix,dt=Math.min(.05,Math.max(0,(t-apertureDrive.last)/1000));apertureDrive.last=t;if(!m.brake&&!m.mastKill){const sx=apertureDrive.dx/38,sy=apertureDrive.dy/38;m.az=round(clamp(m.az+sx*24*dt,-180,180),2);m.el=round(clamp(m.el-sy*12*dt,-90,90),2);refreshAperturePointingDom();}apertureDriveFrame=requestAnimationFrame(stepApertureDrive);}
  function endApertureDrive(e,cancelled=false){if(!apertureDrive||apertureDrive.pointerId!==e.pointerId)return false;const drive=apertureDrive;apertureDrive=null;if(apertureDriveFrame){cancelAnimationFrame(apertureDriveFrame);apertureDriveFrame=0;}controlAudio()?.stopLoop("science:aperture:gimbal");const handle=drive.target.querySelector("[data-apm-stick-handle]");if(handle){handle.style.transition="transform .2s ease";handle.style.transform="translate(0,0)";}if(!cancelled)apertureAuxiliary("master-gimbal","MASTER GIMBAL",`AZ ${state.apertureMatrix.az.toFixed(2)}° · EL ${state.apertureMatrix.el.toFixed(2)}°`,"yoke-return");return true;}

'''
anchor = '  function pointerAngle(e,element){'
if anchor not in js:
    raise SystemExit('missing pointerAngle anchor')
js = js.replace(anchor, handlers + anchor, 1)
js = once(js,'function beginPhysicalGesture(e){if(e.target.closest(".exo-detent-label"))return;','function beginPhysicalGesture(e){const apm=e.target.closest?.("[data-apm-gimbal-joystick]");if(apm){beginApertureDrive(e,apm);return;}if(e.target.closest(".exo-detent-label"))return;','gimbal pointerdown')
js = once(js,'function movePhysicalGesture(e){const g=physicalGesture;','function movePhysicalGesture(e){if(moveApertureDrive(e))return;const g=physicalGesture;','gimbal pointermove')
js = once(js,'function endPhysicalGesture(e,cancelled=false){const g=physicalGesture;','function endPhysicalGesture(e,cancelled=false){if(endApertureDrive(e,cancelled))return;const g=physicalGesture;','gimbal pointerup')
js = once(js,'function handleStationClick(e){if(Date.now()<suppressGestureClickUntil','function handleStationClick(e){const apmClick=e.target.closest?.("[data-apm-click]");if(apmClick&&handleApertureClick(apmClick))return;if(Date.now()<suppressGestureClickUntil','click routing')
js = once(js,'function handleStationInput(e){const manual=e.target.closest("[data-manual-search-input]");','function handleStationInput(e){const apm=e.target.closest?.("[data-apm-atten]");if(apm){handleApertureRange(apm,false);return;}const manual=e.target.closest("[data-manual-search-input]");','input routing')
js = once(js,'function handleStationChange(e){if(manualOpen)return;const ranged=e.target.closest("[data-proc-range]");','function handleStationChange(e){if(manualOpen)return;const apm=e.target.closest?.("[data-apm-atten]");if(apm){handleApertureRange(apm,true);return;}const ranged=e.target.closest("[data-proc-range]");','change routing')
js = once(js,'function reset(){state=initialState();activeStation="helm";manualOpen=false;manualQuery="";physicalGesture=null;suppressGestureClickUntil=0;','function reset(){state=initialState();activeStation="helm";manualOpen=false;manualQuery="";physicalGesture=null;apertureDrive=null;if(apertureDriveFrame){cancelAnimationFrame(apertureDriveFrame);apertureDriveFrame=0;}suppressGestureClickUntil=0;','reset cleanup')
js = once(js,'activeStation=b.dataset.station;manualQuery="";physicalGesture=null;renderTabs();renderStation();','activeStation=b.dataset.station;manualQuery="";physicalGesture=null;apertureDrive=null;if(apertureDriveFrame){cancelAnimationFrame(apertureDriveFrame);apertureDriveFrame=0;}controlAudio()?.stopLoop("science:aperture:gimbal");renderTabs();renderStation();','station cleanup')

css = once(css,
    '.station-science{grid-template-columns:1fr 1.2fr 1fr;grid-template-areas:"band aperture gain" "integration inhibit emitter" "confirm confirm lockout"}',
    '.station-science{grid-template-columns:1fr 1fr 1fr;grid-template-areas:"aperture aperture aperture" "band gain integration" "inhibit emitter lockout" "confirm confirm lockout"}',
    'Science grid')

if '/* SCI-APM-02 canonical aperture topology */' not in css:
    css += r'''

/* SCI-APM-02 canonical aperture topology */
.exo-apm-topology{padding:11px!important;border-color:#536a74!important;background:linear-gradient(160deg,#202b30,#0b1114)!important;box-shadow:inset 0 1px rgba(255,255,255,.05),inset 0 -18px 26px rgba(0,0,0,.34),0 4px 9px rgba(0,0,0,.32)!important}.exo-apm-topology>.exo-device-label{border-color:#385365;color:#9bc4d8;background:#071016}
.exo-apm-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin:7px 0 8px;padding:8px 10px;border:1px solid #394b51;background:linear-gradient(180deg,#111b20,#080d10)}.exo-apm-head>div>strong{display:block;margin:0;color:#e1e7e5;font:900 .74rem ui-monospace,monospace;letter-spacing:.04em}.exo-apm-head small{display:block;margin-top:3px;color:#748d97;font:800 .48rem ui-monospace,monospace;letter-spacing:.06em}.exo-apm-head>b{padding:5px 7px;border:1px solid #3d6553;background:#08150f;color:#8ed8ad;font:900 .52rem ui-monospace,monospace;white-space:nowrap}
.exo-apm-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}.exo-apm-quadrant{position:relative;min-width:0;padding:9px;border:1px solid #45565c;background:radial-gradient(circle at 50% 35%,rgba(94,146,169,.045),transparent 45%),linear-gradient(180deg,#10181c,#080c0f);box-shadow:inset 0 1px rgba(255,255,255,.035),inset 0 -10px 16px rgba(0,0,0,.2)}.exo-apm-quadrant>header{display:flex;justify-content:space-between;gap:8px;align-items:baseline;padding-bottom:6px;margin-bottom:8px;border-bottom:1px solid #334147}.exo-apm-quadrant>header span{color:#687a82;font:900 .46rem ui-monospace,monospace;letter-spacing:.11em}.exo-apm-quadrant>header b{color:#c7d4d7;font:900 .58rem ui-monospace,monospace;letter-spacing:.06em}
.exo-apm-gimbal{display:grid;grid-template-columns:130px 1fr;gap:10px;align-items:center}.exo-apm-stick-bed{position:relative;width:118px;height:118px;margin:auto;border:1px solid #58666b;border-radius:50%;touch-action:none;user-select:none;cursor:grab;background:radial-gradient(circle,#10191d 0 25%,#070b0d 26% 45%,#303a3e 46% 49%,#070a0c 50% 61%,#20282b 62% 65%,#080b0d 66%);box-shadow:inset 0 6px 13px #000,0 1px #667175}.exo-apm-stick-bed[aria-disabled="true"]{opacity:.45;cursor:not-allowed}.exo-apm-stick-bed .axis{position:absolute;background:#31464f}.exo-apm-stick-bed .axis.x{left:13px;right:13px;top:50%;height:1px}.exo-apm-stick-bed .axis.y{top:13px;bottom:13px;left:50%;width:1px}.exo-apm-stick{position:absolute;left:50%;top:50%;width:42px;height:42px;margin:-21px;border:2px solid #819095;border-radius:50%;background:radial-gradient(circle at 36% 30%,#78868a 0 13%,#30383c 15% 58%,#15191b 60% 72%,#6b777b 74% 79%,#0e1214 81%);box-shadow:0 4px 6px #000,inset 0 1px rgba(255,255,255,.15);transition:transform .12s ease}.exo-apm-stick:after{content:"";position:absolute;inset:10px;border-radius:50%;background:#151d20;border:1px solid #9ca8ab}
.exo-apm-gimbal-readout{display:grid;grid-template-columns:1fr 1fr;gap:6px}.exo-apm-gimbal-readout>span{padding:6px;border:1px solid #293f48;background:#041016;color:#7199aa;font:900 .5rem ui-monospace,monospace}.exo-apm-gimbal-readout b{display:block;color:#c4e0e9;font-size:.72rem;margin-top:3px}.exo-apm-gimbal-readout small{grid-column:1/-1;color:#65767b;font:800 .43rem/1.35 ui-monospace,monospace}
.exo-apm-verniers{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px}.exo-apm-verniers>div{padding:6px;border:1px solid #354248;background:#0a0f12}.exo-apm-verniers span,.exo-apm-elements>span,.exo-apm-polarization>span,.exo-apm-routing>span,.exo-apm-mast-safety>span{display:block;color:#77898e;font:900 .45rem ui-monospace,monospace;letter-spacing:.07em}.exo-apm-verniers p{display:grid;grid-template-columns:34px 1fr 34px;gap:5px;align-items:center;margin:5px 0 0}.exo-apm-verniers p b{text-align:center;color:#cfd9d8;font:900 .58rem ui-monospace,monospace}.exo-apm-brake{width:100%;margin-top:7px;border-color:#695e48!important;background:linear-gradient(#352f25,#17140f)!important;color:#dacb9c!important}.exo-apm-brake.active{border-color:#b67b46!important;color:#ffd0a1!important;box-shadow:inset 0 0 10px rgba(192,113,48,.18)!important}
.exo-apm-atten-row{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.exo-apm-atten{display:grid;grid-template-rows:auto 96px auto;justify-items:center;gap:4px;padding:5px;border:1px solid #334147;background:#0a1013}.exo-apm-atten span,.exo-apm-atten b{font:900 .43rem ui-monospace,monospace;color:#87979c}.exo-apm-atten input{width:86px;height:18px;transform:rotate(-90deg);margin:38px -34px;accent-color:#82adc0}
.exo-apm-phase-row{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:7px}.exo-apm-phase{text-align:center;padding:5px;border:1px solid #354349;background:#090e11}.exo-apm-phase>span{color:#82949a;font:900 .43rem ui-monospace,monospace}.exo-apm-phase-knob{position:relative;width:48px;height:48px;margin:5px auto;border-radius:50%;background:radial-gradient(circle at 38% 32%,#6b777b 0 8%,#323a3e 10% 54%,#151a1c 56% 69%,#626d71 71% 75%,#101416 77%);box-shadow:0 2px 3px #000,inset 0 1px rgba(255,255,255,.12)}.exo-apm-phase-knob i{position:absolute;left:50%;top:4px;width:2px;height:17px;background:#d1bd7b;transform-origin:50% 20px}.exo-apm-phase>div:last-child{display:grid;grid-template-columns:26px 1fr 26px;gap:3px;align-items:center}.exo-apm-phase>div:last-child b{color:#cbd5d4;font:900 .45rem ui-monospace,monospace}.exo-apm-phase button{min-height:25px!important;padding:2px!important}
.exo-apm-elements{margin-top:7px}.exo-apm-elements>div{display:grid;grid-template-columns:repeat(8,1fr);gap:4px;margin-top:5px}.exo-apm-element{min-height:29px!important;padding:3px!important;font-size:.45rem!important}.exo-apm-element i{display:block;width:6px;height:6px;margin:0 auto 3px;border-radius:50%;background:#462c2c;box-shadow:inset 0 0 3px #000}.exo-apm-element.active i{background:#79ce9b;box-shadow:0 0 7px rgba(103,224,151,.48)}
.exo-apm-band{display:grid;grid-template-columns:112px 1fr;gap:10px;align-items:center}.exo-apm-wafer{position:relative;width:88px;height:88px;margin:auto;border-radius:50%;background:radial-gradient(circle at 35% 30%,#777f7e 0 7%,#343b3d 9% 54%,#15191a 56% 68%,#6c7473 70% 74%,#111516 76%);box-shadow:0 3px 5px #000,inset 0 1px rgba(255,255,255,.14)}.exo-apm-wafer:before{content:"L   S   C   X";position:absolute;inset:-13px -15px;color:#7f9094;font:900 .45rem ui-monospace,monospace;word-spacing:10px}.exo-apm-wafer i{position:absolute;left:50%;top:5px;width:3px;height:30px;background:#d3bd79;transform-origin:50% 39px}.exo-apm-band>div:last-child{display:grid;grid-template-columns:1fr 1fr;gap:5px}.exo-apm-band button.active,.exo-apm-polarization button.active{border-color:#708f79!important;color:#a9e4bd!important;background:linear-gradient(#244231,#101c15)!important}.exo-apm-polarization,.exo-apm-routing{margin-top:8px}.exo-apm-polarization>div,.exo-apm-routing>div{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:5px}
.exo-apm-mast-safety>button{width:100%;min-height:46px!important;margin-top:5px;border:2px solid #743b3d!important;background:repeating-linear-gradient(135deg,#35191b 0 9px,#241214 9px 18px)!important;color:#e2a1a3!important}.exo-apm-mast-safety>button i{display:inline-grid;place-items:center;width:22px;height:22px;margin-right:8px;border:1px solid #c66568;border-radius:50%;font-style:normal}.exo-apm-mast-safety>button.active{border-color:#d35c60!important;color:#ffd0d1!important;box-shadow:inset 0 0 14px rgba(213,72,78,.18),0 0 8px rgba(213,72,78,.12)!important}
.exo-apm-telemetry{display:grid;gap:7px;margin-top:8px}.exo-apm-meter{display:grid;grid-template-columns:112px 1fr 58px;gap:6px;align-items:center}.exo-apm-meter>span,.exo-apm-meter>b{color:#809297;font:900 .45rem ui-monospace,monospace}.exo-apm-meter>b{text-align:right;color:#c9d5d3}.exo-apm-meter>div{height:13px;padding:2px;border:1px solid #33443b;background:#040907;overflow:hidden}.exo-apm-meter>div i{display:block;height:100%;background:repeating-linear-gradient(90deg,#69bd83 0 6px,#325c40 6px 8px);box-shadow:0 0 6px rgba(91,210,127,.22)}.exo-apm-meter.critical>div i{background:repeating-linear-gradient(90deg,#c45d61 0 6px,#633237 6px 8px)}.exo-apm-meter.critical>b{color:#e48d90}.exo-apm-telemetry-foot{display:flex;justify-content:space-between;gap:6px;margin-top:8px;padding-top:6px;border-top:1px solid #314047;color:#718288;font:900 .42rem ui-monospace,monospace}
@media(max-width:980px){.exo-apm-grid{grid-template-columns:1fr}.exo-apm-gimbal{grid-template-columns:1fr}.exo-apm-atten-row,.exo-apm-phase-row{grid-template-columns:repeat(2,1fr)}.exo-apm-elements>div{grid-template-columns:repeat(4,1fr)}}
'''

html = re.sub(r'blacklight-exo-crew-operations\.css(?:\?v=[^"\']+)?', 'blacklight-exo-crew-operations.css?v=20260812-0055', html, count=1)
html, n = re.subn(r'blacklight-exo-crew-operations\.js(?:\?v=[^"\']+)?', 'blacklight-exo-crew-operations.js?v=20260812-0055', html, count=1)
if n != 1:
    raise SystemExit('failed to bump canonical Crew Operations JS')

JS.write_text(js)
CSS.write_text(css)
HTML.write_text(html)
WORKFLOW.unlink(missing_ok=True)
SELF.unlink(missing_ok=True)
