from pathlib import Path
import subprocess

REPO = Path(__file__).resolve().parents[1]
CREW_JS = REPO / "blacklight-exo-crew-operations.js"
CREW_CSS = REPO / "blacklight-exo-crew-operations.css"
REPAIR_CSS = REPO / "blacklight-exo-repair-operations.css"
WORKFLOW = REPO / ".github/workflows/apply-exo-control-fidelity-pass.yml"
SELF = Path(__file__).resolve()

GOOD_JS_COMMIT = "b16b34aa967100e4e2440da82c61d6f8d973b085"
GOOD_CREW_CSS_COMMIT = "1f625ff2b21dde8136742d6512caae10a8bfcd32"
GOOD_REPAIR_CSS_COMMIT = "9a7347e3cb225a46a8d574cd3b351e0fcceb1904"
EXPECTED_CREW_CSS = "a228faaa406c9c56a8b098c1813d86af9ba9985e"
EXPECTED_REPAIR_CSS = "97080b119cf0cda1cb5449b5273d14d272309532"
BROKEN_OR_GOOD_JS = {"8afe1be4231bc335b5e2eed35cc6940b3334497d", "d94fb1cd35c2f00c468f0ef6c07076223ddfe21c"}


def git(*args):
    return subprocess.check_output(["git", *args], cwd=REPO, text=True).strip()


def blob(path):
    return git("hash-object", str(path.relative_to(REPO)))


def from_commit(commit, path):
    return subprocess.check_output(["git", "show", f"{commit}:{path}"], cwd=REPO, text=True)


def require_replace(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Required anchor missing: {label}")
    return text.replace(old, new, 1)


if blob(CREW_CSS) != EXPECTED_CREW_CSS:
    raise SystemExit("Crew CSS changed concurrently; refusing to overwrite it.")
if blob(REPAIR_CSS) != EXPECTED_REPAIR_CSS:
    raise SystemExit("Repair CSS changed concurrently; refusing to overwrite it.")
if blob(CREW_JS) not in BROKEN_OR_GOOD_JS:
    raise SystemExit("Crew JS changed concurrently; refusing to overwrite it.")

js = from_commit(GOOD_JS_COMMIT, "blacklight-exo-crew-operations.js")

anchor = '  const GESTURE_KINDS=new Set(["selector","rotary","wheel","yoke","thumbwheel","lever","knife-switch","toggle","guard","dual-slider"]);\n'
audio_defs = '''  const CONTROL_AUDIO=Object.freeze({\n    mechanical:"assets/blacklight/keys.mp3",\n    acknowledge:"assets/blacklight/universfield-email-notification-143029.mp3"\n  });\n  const CONTROL_SOUND_PROFILE=Object.freeze({\n    selector:{rate:1.24,volume:.18,burst:2,spacing:34},rotary:{rate:1.34,volume:.16,burst:2,spacing:30},wheel:{rate:1.42,volume:.15,burst:3,spacing:28},\n    thumbwheel:{rate:1.55,volume:.13,burst:3,spacing:25},lever:{rate:.86,volume:.24,burst:1},"knife-switch":{rate:.73,volume:.28,burst:1},toggle:{rate:1.08,volume:.20,burst:1},\n    guard:{rate:.78,volume:.24,burst:1},"dual-slider":{rate:.94,volume:.16,burst:2,spacing:42},slider:{rate:1.08,volume:.13,burst:1},yoke:{rate:1.18,volume:.12,burst:1},\n    keypad:{rate:1.52,volume:.14,burst:1},matrix:{rate:1.42,volume:.15,burst:1},"switch-bank":{rate:1.04,volume:.18,burst:1},"breaker-bank":{rate:.68,volume:.26,burst:1},\n    "dual-button":{rate:1.12,volume:.20,burst:1},lockout:{rate:.82,volume:.27,burst:1},execute:{rate:.62,volume:.32,burst:1}\n  });\n'''
js = require_replace(js, anchor, anchor + audio_defs, "sound profile insertion")

mode_anchor = '  function controlMode(station,ctrl){if(MOMENTARY_KINDS.has(ctrl.kind))return "momentary";if(RESET_AFTER_EXECUTE[station]?.[ctrl.id]!==undefined)return "reset-execute";return "latched";}\n'
sound_helpers = '''  function soundSeed(value){let n=0;for(const ch of String(value||""))n=(Math.imul(n,31)+ch.charCodeAt(0))>>>0;return n;}\n  function playAudioClip(src,{volume=.18,rate=1}={}){try{const audio=new Audio(src);audio.preload="auto";audio.volume=clamp(volume,0,1);audio.playbackRate=clamp(rate,.5,2);const request=audio.play();if(request?.catch)request.catch(()=>{});}catch(_){/* physical control remains usable if audio is unavailable */}}\n  function playControlSound(token,controlId){const def=STATIONS[activeStation],ctrl=controlId?def.controls.find(c=>c.id===controlId):null;let kind=ctrl?.kind||"lockout";if(token==="execute")kind="execute";const profile=CONTROL_SOUND_PROFILE[kind]||CONTROL_SOUND_PROFILE.lockout,seed=soundSeed(`${token}:${controlId||"auth"}`),variance=((seed%11)-5)*.012,burst=Math.max(1,profile.burst||1);for(let i=0;i<burst;i++){const fire=()=>playAudioClip(CONTROL_AUDIO.mechanical,{volume:profile.volume,rate:profile.rate+variance+i*.025});if(i&&profile.spacing)setTimeout(fire,i*profile.spacing);else fire();}if((token==="execute"||token.startsWith("com-address")||token.startsWith("com-crypto-ack"))&&CONTROL_AUDIO.acknowledge)setTimeout(()=>playAudioClip(CONTROL_AUDIO.acknowledge,{volume:.10,rate:1.18}),token==="execute"?105:55);}\n'''
js = require_replace(js, mode_anchor, mode_anchor + sound_helpers, "sound helper insertion")

display_anchor = '  function displayValue(ctrl){return state.hardware[activeStation]?.[ctrl.id]??ctrl.default??"STANDBY";}\n'
status_helpers = '''  function controlStatus(ctrl,p,active){const mode=controlMode(activeStation,ctrl),tokens=new Set(ctrl.actions.map(a=>a.token)),attempt=Boolean(active&&p?.active&&p.station===activeStation),requiredNow=attempt&&p.expectedSequence.some(token=>tokens.has(token)),preSet=attempt&&p.preSatisfied.some(token=>tokens.has(token)),persistent=p?.requiredPersistent?.find(item=>item.controlId===ctrl.id),satisfied=Boolean(persistent&&state.hardware[activeStation]?.[ctrl.id]===persistent.state),relevant=requiredNow||preSet||Boolean(persistent);const modeLabel=mode==="momentary"?"MOMENTARY":mode==="reset-execute"?"AUTO RESET":"LATCHED";let activity="idle",activityLabel="IDLE";if(attempt&&requiredNow){activity="live";activityLabel="LIVE";}else if(attempt&&relevant&&satisfied){activity="set";activityLabel="SET";}else if(attempt&&relevant){activity="required";activityLabel="REQUIRED";}return {mode,modeLabel,activity,activityLabel,satisfied,relevant};}\n  function stateIndicator(ctrl,p,active){const s=controlStatus(ctrl,p,active);return `<div class="exo-control-state-strip" data-control-mode="${s.mode}" data-control-activity="${s.activity}"><span class="exo-control-state-lamp" aria-hidden="true"></span><span class="exo-control-mode-label">${s.modeLabel}</span><span class="exo-control-activity-label">${s.activityLabel}</span></div>`;}\n'''
js = require_replace(js, display_anchor, display_anchor + status_helpers, "control status insertion")

start = js.index('  function renderControl(ctrl,p,active){')
end = js.index('  function keyGraphic', start)
new_render = '''  function renderControl(ctrl,p,active){const disabled=active?"":"disabled",value=displayValue(ctrl),mode=controlMode(activeStation,ctrl),status=controlStatus(ctrl,p,active),indicator=stateIndicator(ctrl,p,active),attrs=`data-control-mode="${mode}" data-control-activity="${status.activity}"`;\n    if(ctrl.kind==="slider"){const vals=ctrl.actions,raw=vals.findIndex(a=>a.state===value),idx=raw>=0?raw:Math.floor((vals.length-1)/2);return `<div class="exo-device-block hardware-${ctrl.kind} area-${ctrl.area}" ${attrs} style="grid-area:${ctrl.area}"><span class="exo-device-label">${ctrl.label}</span><strong>${value}</strong>${indicator}<div class="exo-fader-body"><input data-proc-slider data-control-id="${ctrl.id}" data-slider-tokens="${vals.map(a=>a.token).join("|")}" data-slider-states="${vals.map(a=>a.state).join("|")}" type="range" min="0" max="${vals.length-1}" step="1" value="${idx}" ${disabled}></div><div class="exo-slider-scale">${(ctrl.scale||vals.map(a=>a.label)).map(x=>`<span>${x}</span>`).join("")}</div></div>`;}\n    if(GESTURE_KINDS.has(ctrl.kind))return `<div class="exo-device-block hardware-${ctrl.kind} area-${ctrl.area}" ${attrs} style="grid-area:${ctrl.area}"><span class="exo-device-label">${ctrl.label}</span><strong>${value}</strong>${indicator}${gestureMechanism(ctrl,value,active)}</div>`;\n    const buttons=ctrl.actions.map(a=>`<button type="button" aria-pressed="${value===a.state}" data-proc-input="${a.token}" data-control-id="${ctrl.id}" data-control-state="${a.state}" data-proc-label="${ctrl.label}: ${a.label}" ${disabled}>${a.label}</button>`).join("");return `<div class="exo-device-block hardware-${ctrl.kind} area-${ctrl.area}" ${attrs} style="grid-area:${ctrl.area}"><span class="exo-device-label">${ctrl.label}</span><strong>${mode==="momentary"?"SPRING RETURN":value}</strong>${indicator}<div class="exo-hardware-actions">${buttons}</div></div>`;}\n'''
js = js[:start] + new_render + js[end:]

old_auth = 'return `<div class="exo-device-block exo-lockout-device ${shieldOpen?"shield-open":""} ${armed?"is-armed":""} ${keyInserted?"key-in":""}" style="grid-area:lockout"><span class="exo-device-label">KEYED EXECUTION</span><div class="exo-lockout-face">'
new_auth = 'return `<div class="exo-device-block exo-lockout-device ${shieldOpen?"shield-open":""} ${armed?"is-armed":""} ${keyInserted?"key-in":""}" data-control-mode="reset-execute" data-control-activity="${active?"live":"idle"}" style="grid-area:lockout"><span class="exo-device-label">KEYED EXECUTION</span><div class="exo-control-state-strip" data-control-mode="reset-execute" data-control-activity="${active?"live":"idle"}"><span class="exo-control-state-lamp" aria-hidden="true"></span><span class="exo-control-mode-label">AUTO RESET</span><span class="exo-control-activity-label">${active?"LIVE":"IDLE"}</span></div><div class="exo-lockout-face">'
js = require_replace(js, old_auth, new_auth, "lockout state strip")

old_record = '  function recordInput(token,label,controlId,stateLabel){const p=state.procedure;if(!p?.active||p.station!==activeStation){addLog(STATIONS[activeStation].label,"Control ignored: begin a procedure first.");return;}const r=applyToken(token,controlId,stateLabel);if(!r.ok){addLog(STATIONS[activeStation].label,`MECHANICAL INTERLOCK: ${r.reason}`);renderStation();return;}p.inputs.push({token,label});if(p.inputs.length>30)p.inputs.shift();if(token==="execute"){evaluateProcedure();return;}renderStation();}\n'
new_record = '  function recordInput(token,label,controlId,stateLabel){const p=state.procedure;if(!p?.active||p.station!==activeStation){addLog(STATIONS[activeStation].label,"Control ignored: begin a procedure first.");return;}const r=applyToken(token,controlId,stateLabel);if(!r.ok){addLog(STATIONS[activeStation].label,`MECHANICAL INTERLOCK: ${r.reason}`);renderStation();return;}playControlSound(token,controlId);p.inputs.push({token,label});if(p.inputs.length>30)p.inputs.shift();if(token==="execute"){evaluateProcedure();return;}renderStation();}\n'
js = require_replace(js, old_record, new_record, "record-input SFX")
js = js.replace('Procedure started: ${selectedProcedure().name}. ${p.preSatisfied.length} latched setup state(s) already satisfied.','Procedure started: ${selectedProcedure().name}. ${p.preSatisfied.length} persistent setup state(s) already satisfied; LIVE indicators mark controls that still require manipulation.')
js = js.replace('Human procedural bridge initialized with persistent station hardware state, spring-return controls, post-execution resets, four operations per station, gestural physical controls and DM-facing d10 relay.','Human procedural bridge initialized with persistent hardware state, explicit LATCHED / MOMENTARY / AUTO RESET indicators, archived mechanical control audio, four operations per station, gestural controls and DM-facing d10 relay.')

crew_css = from_commit(GOOD_CREW_CSS_COMMIT, "blacklight-exo-crew-operations.css")
crew_extra = r'''

/* Persistent physical-state annunciation */
.exo-control-state-strip{display:grid;grid-template-columns:10px auto 1fr;align-items:center;gap:6px;margin:5px 0 7px;padding:4px 6px;border:1px solid #30383b;border-radius:3px;background:linear-gradient(180deg,#0b0e0f,#07090a);font:900 .43rem ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.09em;text-transform:uppercase;box-shadow:inset 0 2px 4px rgba(0,0,0,.48)}
.exo-control-state-lamp{width:7px;height:7px;border-radius:50%;background:#29302d;border:1px solid #46504c;box-shadow:inset 0 0 2px #000}.exo-control-mode-label{color:#838c89;white-space:nowrap}.exo-control-activity-label{justify-self:end;color:#626b68;white-space:nowrap}
.exo-control-state-strip[data-control-mode="latched"] .exo-control-mode-label{color:#9ab8c8}.exo-control-state-strip[data-control-mode="momentary"] .exo-control-mode-label{color:#c9d0cc}.exo-control-state-strip[data-control-mode="reset-execute"] .exo-control-mode-label{color:#d5b16d}
.exo-control-state-strip[data-control-activity="live"]{border-color:#77643b;background:linear-gradient(180deg,#19170f,#0b0a07)}.exo-control-state-strip[data-control-activity="live"] .exo-control-state-lamp{background:#e0b853;border-color:#f0d28b;box-shadow:0 0 8px rgba(224,184,83,.68),inset 0 0 2px #fff}.exo-control-state-strip[data-control-activity="live"] .exo-control-activity-label{color:#f0d28b}
.exo-control-state-strip[data-control-activity="set"]{border-color:#345642}.exo-control-state-strip[data-control-activity="set"] .exo-control-state-lamp{background:#70cb8b;border-color:#9be3ae;box-shadow:0 0 7px rgba(112,203,139,.55)}.exo-control-state-strip[data-control-activity="set"] .exo-control-activity-label{color:#8edca4}
.exo-control-state-strip[data-control-activity="required"]{border-color:#71484b}.exo-control-state-strip[data-control-activity="required"] .exo-control-state-lamp{background:#cf676b;border-color:#ef999c;box-shadow:0 0 7px rgba(207,103,107,.5)}.exo-control-state-strip[data-control-activity="required"] .exo-control-activity-label{color:#e58b8e}
.exo-device-block[data-control-activity="live"]{box-shadow:inset 0 1px rgba(255,255,255,.05),inset 0 -16px 20px rgba(0,0,0,.26),0 0 0 1px rgba(224,184,83,.28),0 5px 10px rgba(0,0,0,.24)}.exo-device-block[data-control-activity="set"]{box-shadow:inset 0 1px rgba(255,255,255,.05),inset 0 -16px 20px rgba(0,0,0,.26),0 0 0 1px rgba(112,203,139,.16),0 5px 10px rgba(0,0,0,.24)}
.exo-device-block[data-control-mode="latched"]>strong:before{content:"▰ ";color:#7396a7;font-size:.62rem}.exo-device-block[data-control-mode="reset-execute"]>strong:before{content:"↺ ";color:#d1a75d}.exo-device-block[data-control-mode="momentary"]>strong:before{content:"↕ ";color:#aab2ae}
@media(prefers-reduced-motion:no-preference){.exo-control-state-strip[data-control-activity="live"] .exo-control-state-lamp{animation:exo-live-lamp 1.4s ease-in-out infinite}@keyframes exo-live-lamp{50%{filter:brightness(1.45);box-shadow:0 0 12px rgba(224,184,83,.82)}}}

/* Diegetic fidelity layering */
.exo-device-block{border-radius:6px;overflow:hidden;box-shadow:inset 0 1px rgba(255,255,255,.05),inset 0 -16px 20px rgba(0,0,0,.26),0 5px 10px rgba(0,0,0,.24)}.exo-device-label{border-radius:2px;letter-spacing:.11em}.exo-gesture-mechanism{border-radius:5px;box-shadow:inset 0 1px rgba(255,255,255,.05),inset 0 7px 14px rgba(0,0,0,.48),inset 0 -10px 14px rgba(0,0,0,.34)}
.exo-station-tab{position:relative;border-radius:4px}.exo-station-tab:before{content:"";position:absolute;left:8px;right:8px;top:5px;height:2px;background:linear-gradient(90deg,transparent,var(--station-accent,#a2824a),transparent);opacity:.6}.exo-station-tab:after{content:"";position:absolute;right:8px;top:7px;width:7px;height:7px;border-radius:50%;background:#284032;border:1px solid #4f5c55}.exo-station-tab[aria-selected=true]:after{background:#8ad8a0;box-shadow:0 0 8px rgba(126,214,155,.48)}
.station-helm .exo-device-block{background:linear-gradient(180deg,rgba(130,171,193,.045),transparent 18%),repeating-linear-gradient(0deg,rgba(255,255,255,.012) 0 1px,transparent 1px 13px),linear-gradient(160deg,#28343a,#151d21 60%,#10161a)}.station-helm .exo-device-label{border-left:3px solid #789fb6}.station-helm .exo-gesture-mechanism{border-color:#3c5059}.station-helm .exo-yoke-gate{outline:1px solid rgba(121,185,220,.12);outline-offset:4px}.station-helm .exo-lever-slot{border-color:#566d78}
.station-navigation .exo-device-block{background:linear-gradient(180deg,rgba(205,182,117,.045),transparent 20%),repeating-linear-gradient(90deg,rgba(200,177,116,.014) 0 1px,transparent 1px 10px),linear-gradient(160deg,#302e26,#191711 62%,#12110d)}.station-navigation .exo-device-label{border-left:3px solid #a99563}.station-navigation .exo-gesture-mechanism{border-color:#524d3d}.station-navigation .exo-thumbwheel-window{border-color:#716645}.station-navigation .hardware-keypad .exo-hardware-actions{border-color:#5a533f;background:#0d0c09}
.station-gunnery .exo-device-block{background:linear-gradient(180deg,rgba(196,81,87,.055),transparent 18%),repeating-linear-gradient(135deg,rgba(110,55,58,.035) 0 5px,transparent 5px 12px),linear-gradient(160deg,#332428,#1b1214 62%,#120d0f)}.station-gunnery .exo-device-label{border-left:3px solid #994f53}.station-gunnery .exo-gesture-mechanism{border-color:#623f42}.station-gunnery .hardware-switch-bank .exo-hardware-actions,.station-gunnery .hardware-keypad .exo-hardware-actions{border:1px solid #633f42;background:#100a0b}.station-gunnery .hardware-switch-bank .exo-hardware-actions button[aria-pressed="true"],.station-gunnery .hardware-keypad .exo-hardware-actions button[aria-pressed="true"]{box-shadow:inset 0 -3px #a64f54,0 0 9px rgba(166,79,84,.25)}
.station-engineering .exo-device-block{background:linear-gradient(180deg,rgba(208,146,82,.05),transparent 18%),repeating-linear-gradient(90deg,rgba(201,132,64,.02) 0 2px,transparent 2px 18px),linear-gradient(160deg,#352a1f,#1c1711 62%,#14100c)}.station-engineering .exo-device-label{border-left:3px solid #aa7137}.station-engineering .exo-gesture-mechanism{border-color:#604a34}.station-engineering .hardware-breaker-bank .exo-hardware-actions{border-color:#69513a;background:#100d09}.station-engineering .exo-knife-plate{border-color:#806441;background:linear-gradient(#17130e,#090806)}.station-engineering .exo-balance-crossbar{background:#b0793f;opacity:.92}
.station-science .exo-device-block{background:linear-gradient(180deg,rgba(111,180,215,.05),transparent 18%),linear-gradient(rgba(121,185,220,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(121,185,220,.018) 1px,transparent 1px),linear-gradient(160deg,#24333b,#131d22 62%,#0e1519);background-size:auto,12px 12px,12px 12px,auto}.station-science .exo-device-label{border-left:3px solid #5689a4}.station-science .exo-gesture-mechanism{border-color:#375866}.station-science .hardware-matrix .exo-hardware-actions{background:#071014;border-color:#355663}.station-science .hardware-matrix .exo-hardware-actions button[aria-pressed="true"]{box-shadow:0 0 10px rgba(121,185,220,.3),inset 0 0 8px rgba(121,185,220,.15)}
.station-comms .exo-device-block{background:linear-gradient(180deg,rgba(155,138,209,.055),transparent 18%),repeating-linear-gradient(0deg,rgba(155,138,209,.018) 0 1px,transparent 1px 9px),linear-gradient(160deg,#2b2739,#161421 62%,#100e17)}.station-comms .exo-device-label{border-left:3px solid #74659c}.station-comms .exo-gesture-mechanism{border-color:#4b4364}.station-comms .hardware-keypad .exo-hardware-actions,.station-comms .hardware-switch-bank .exo-hardware-actions{background:#0b0910;border-color:#4c4266}.station-comms .exo-thumbwheel-window{border-color:#60537f}.station-comms .exo-thumbwheel-drum{border-color:#75689a}
'''
crew_css += crew_extra

repair_css = from_commit(GOOD_REPAIR_CSS_COMMIT, "blacklight-exo-repair-operations.css")
repair_extra = r'''

/* Station-specific service-side fidelity layers */
.repair-face-shell{border-radius:6px;box-shadow:inset 0 1px rgba(255,255,255,.05),inset 0 -18px 28px rgba(0,0,0,.28),0 5px 10px rgba(0,0,0,.24)}.repair-face-grid .repair-face-control{border-radius:5px;overflow:hidden;box-shadow:inset 0 1px rgba(255,255,255,.045),inset 0 -12px 18px rgba(0,0,0,.24),0 3px 5px rgba(0,0,0,.2)}.repair-face-control span{letter-spacing:.11em}.repair-face-control b{color:#e2e6e3;letter-spacing:.04em}
.repair-face-shell.station-helm{background:linear-gradient(180deg,rgba(121,185,220,.045),transparent 17%),linear-gradient(#28343a,#141b1f 64%,#10161a)}.repair-face-shell.station-helm .repair-face-control{background:repeating-linear-gradient(0deg,rgba(255,255,255,.012) 0 1px,transparent 1px 13px),linear-gradient(160deg,#263239,#141c20)}.repair-face-shell.station-helm .repair-face-control.form-yoke>i{outline:1px solid rgba(121,185,220,.16);outline-offset:3px}
.repair-face-shell.station-navigation{background:linear-gradient(180deg,rgba(201,177,116,.05),transparent 18%),linear-gradient(#302e26,#181611 64%,#12110d)}.repair-face-shell.station-navigation .repair-face-control{background:repeating-linear-gradient(90deg,rgba(201,177,116,.015) 0 1px,transparent 1px 10px),linear-gradient(160deg,#2d2a23,#17150f)}.repair-face-shell.station-navigation .repair-face-control.form-thumbwheel>i{border-color:#716645}
.repair-face-shell.station-gunnery{background:linear-gradient(180deg,rgba(186,93,96,.055),transparent 18%),linear-gradient(#312326,#1a1214 64%,#120d0f)}.repair-face-shell.station-gunnery .repair-face-control{background:repeating-linear-gradient(135deg,rgba(110,55,58,.035) 0 5px,transparent 5px 12px),linear-gradient(160deg,#302124,#191113)}.repair-face-shell.station-gunnery .repair-face-control.form-guard,.repair-face-shell.station-gunnery .repair-face-control.form-lever,.repair-face-shell.station-gunnery .repair-face-control.form-lockout{box-shadow:inset 0 0 0 1px rgba(174,77,82,.24),inset 0 -12px 18px rgba(0,0,0,.26),0 3px 5px rgba(0,0,0,.2)}
.repair-face-shell.station-engineering{background:linear-gradient(180deg,rgba(208,146,82,.055),transparent 18%),linear-gradient(#34291e,#1c1711 64%,#14100c)}.repair-face-shell.station-engineering .repair-face-control{background:repeating-linear-gradient(90deg,rgba(201,132,64,.02) 0 2px,transparent 2px 18px),linear-gradient(160deg,#33291f,#1a1510)}.repair-face-shell.station-engineering .repair-face-control.form-breaker-bank>i,.repair-face-shell.station-engineering .repair-face-control.form-knife-switch>i{border-color:#7a5d3e}
.repair-face-shell.station-science{background:linear-gradient(180deg,rgba(121,185,220,.055),transparent 18%),linear-gradient(#24333b,#131d22 64%,#0e1519)}.repair-face-shell.station-science .repair-face-control{background:linear-gradient(rgba(121,185,220,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(121,185,220,.018) 1px,transparent 1px),linear-gradient(160deg,#223039,#121b20);background-size:12px 12px,12px 12px,auto}.repair-face-shell.station-science .repair-face-control.form-matrix>i{border-color:#4e7687;box-shadow:0 0 8px rgba(121,185,220,.12),inset 0 2px 5px #000}
.repair-face-shell.station-comms{background:linear-gradient(180deg,rgba(155,138,209,.055),transparent 18%),linear-gradient(#2b2739,#161421 64%,#100e17)}.repair-face-shell.station-comms .repair-face-control{background:repeating-linear-gradient(0deg,rgba(155,138,209,.018) 0 1px,transparent 1px 9px),linear-gradient(160deg,#292537,#15131f)}.repair-face-shell.station-comms .repair-face-control.form-thumbwheel>i,.repair-face-shell.station-comms .repair-face-control.form-keypad>i,.repair-face-shell.station-comms .repair-face-control.form-switch-bank>i{border-color:#60537f}
.repair-face-alert{box-shadow:inset 0 2px 4px rgba(0,0,0,.5)}.repair-face-alert .lamp.power{background:#71cb8b;border-color:#9be3ae;box-shadow:0 0 8px rgba(113,203,139,.55)}.repair-face-alert .lamp.fault.on{background:#d46065;border-color:#ed9296;box-shadow:0 0 9px rgba(212,96,101,.62)}
'''
repair_css += repair_extra

CREW_JS.write_text(js, encoding="utf-8")
CREW_CSS.write_text(crew_css, encoding="utf-8")
REPAIR_CSS.write_text(repair_css, encoding="utf-8")
subprocess.check_call(["node", "--check", str(CREW_JS)], cwd=REPO)

# Self-remove so only authoritative runtime files survive the apply commit.
if WORKFLOW.exists(): WORKFLOW.unlink()
if SELF.exists(): SELF.unlink()
