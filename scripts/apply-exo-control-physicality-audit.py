#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / 'blacklight-exo-crew-operations.js'
CSS = ROOT / 'blacklight-exo-crew-operations.css'
EXPECTED_JS = 'bb40b61243de28bd0001a2231c90d1916376c357'
EXPECTED_CSS = '47e38177460b4144ec1bcbce0a221c5ae11dc51b'

def blob_sha(path):
    data = path.read_bytes()
    return hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()

for path, expected in ((JS, EXPECTED_JS), (CSS, EXPECTED_CSS)):
    actual = blob_sha(path)
    if actual != expected:
        raise SystemExit(f'{path.name} changed concurrently: expected {expected}, found {actual}')

js = JS.read_text(encoding='utf-8')
css = CSS.read_text(encoding='utf-8')

physical = {
    'flight-mode':'flight-regime-selector','thruster-bank':'thruster-bank-knob','hand-controller':'gimbal-stick','trim-wheel':'trim-wheel',
    'translation-throttle':'translation-throttle','thrust-gate':'thrust-gate','flight-confirms':'flight-confirm-buttons',
    'nav-reference':'reference-selector','solver-bank':'navigation-function-keypad','azimuth-drum':'navigation-index-drum','elevation-drum':'navigation-index-drum',
    'delta-v':'delta-v-fader','timebase':'bat-toggle','solution-latch':'solution-handoff-latch','nav-confirms':'navigation-validation-buttons',
    'weapon-safe':'weapon-master-guard','weapon-bank':'weapon-bank-selector','track-mode':'fire-control-keypad','range-gate':'range-rate-dial',
    'capacitor':'capacitor-demand-fader','weapon-arm':'weapon-arm-lever','gun-confirms':'fire-control-confirm-buttons',
    'breaker-bank':'breaker-bank','bus-source':'bus-knife-switch','load-share':'generator-load-share','coolant-valve':'coolant-handwheel',
    'pump-select':'pump-selector','bus-tie':'bus-tie-contactor','eng-confirms':'plant-annunciator-buttons',
    'receiver-band':'receiver-band-turret','aperture':'aperture-matrix','receiver-gain':'receiver-gain-dial','integration':'integration-slider',
    'emitter-inhibit':'emitter-inhibit-cover','emitter-gate':'emitter-gate-paddle','sci-confirms':'analysis-confirm-buttons',
    'link-mode':'link-mode-keypad','carrier-path':'carrier-path-selector','channel-wheel':'channel-index-drum','frequency':'frequency-vernier',
    'tx-power':'tx-beam-fader','crypto':'crypto-guarded-switch','transmit-key':'spring-transmit-key','com-confirms':'link-confirm-buttons'
}
kind_changes = {'weapon-bank':('switch-bank','selector'),'pump-select':('switch-bank','rotary'),'carrier-path':('switch-bank','selector')}

lines = js.splitlines(True)
seen = set()
for i, line in enumerate(lines):
    match = re.search(r'control\("([^"]+)"', line)
    if not match:
        continue
    cid = match.group(1)
    if cid not in physical:
        raise SystemExit(f'Unclassified Crew control encountered: {cid}')
    seen.add(cid)
    if cid in kind_changes:
        old, new = kind_changes[cid]
        needle = f'control("{cid}","{old}"'
        if needle not in line:
            raise SystemExit(f'Expected {old} kind for {cid}')
        line = line.replace(needle, f'control("{cid}","{new}"', 1)
    if 'physical:"' in line:
        raise SystemExit(f'Physical metadata already present for {cid}')
    opts_pos = line.rfind('})')
    if opts_pos != -1:
        line = line[:opts_pos] + f',physical:"{physical[cid]}"' + line[opts_pos:]
    else:
        close_pos = line.rfind('])')
        if close_pos == -1:
            raise SystemExit(f'Could not locate control close for {cid}')
        line = line[:close_pos] + f'],{{physical:"{physical[cid]}"}})' + line[close_pos+2:]
    lines[i] = line

if seen != set(physical):
    raise SystemExit(f'Control audit mismatch: missing={sorted(set(physical)-seen)} extra={sorted(seen-set(physical))}')
js = ''.join(lines)

# Every explicit Crew control receives a canonical physical identity class.
outer = 'class="exo-device-block hardware-${ctrl.kind} area-${ctrl.area}"'
if js.count(outer) != 3:
    raise SystemExit(f'Expected 3 renderControl outer class templates, found {js.count(outer)}')
js = js.replace(outer, 'class="exo-device-block hardware-${ctrl.kind} physical-${ctrl.physical||ctrl.kind} area-${ctrl.area}"')

old_dataset = 'function actionDataset(ctrl){return `data-control-id="${ctrl.id}" data-gesture-tokens="${ctrl.actions.map(a=>a.token).join("|")}" data-gesture-labels="${ctrl.actions.map(a=>a.label).join("|")}" data-gesture-states="${ctrl.actions.map(a=>a.state).join("|")}"`;}'
new_dataset = 'function actionDataset(ctrl){return `data-control-id="${ctrl.id}" data-control-physical="${ctrl.physical||ctrl.kind}" data-gesture-tokens="${ctrl.actions.map(a=>a.token).join("|")}" data-gesture-labels="${ctrl.actions.map(a=>a.label).join("|")}" data-gesture-states="${ctrl.actions.map(a=>a.state).join("|")}"`;}'
if js.count(old_dataset) != 1:
    raise SystemExit('actionDataset anchor mismatch')
js = js.replace(old_dataset, new_dataset, 1)

old_toggle = '    if(ctrl.kind==="toggle")return `<div class="exo-gesture-mechanism mech-toggle" data-control-gesture="toggle" ${data} ${disabled}><div class="exo-toggle-slot"><div class="exo-toggle-handle" data-gesture-moving style="transform:${rawIdx>=0?`translateY(${signed*18}px) rotate(${signed*12}deg)`:"none"}"></div></div>${detentMarkup(ctrl,value)}<span class="gesture-hint">FLICK SWITCH</span></div>`;'
new_toggle = '    if(ctrl.kind==="toggle")return `<div class="exo-gesture-mechanism mech-toggle" data-control-gesture="toggle" ${data} ${disabled}><div class="exo-toggle-slot"><div class="exo-toggle-handle" data-gesture-moving style="transform:${rawIdx>=0?`rotate(${signed*24}deg)`:"none"}"><i></i></div></div>${detentMarkup(ctrl,value)}<span class="gesture-hint">FLICK BAT SWITCH</span></div>`;'
if js.count(old_toggle) != 1:
    raise SystemExit('Toggle renderer anchor mismatch')
js = js.replace(old_toggle, new_toggle, 1)

old_guard = '    if(ctrl.kind==="guard")return `<div class="exo-gesture-mechanism mech-guard" data-control-gesture="guard" ${data} ${disabled}><div class="exo-guard-cage"><div class="exo-guard-cover" data-gesture-moving style="transform:${rawIdx===0?"rotateX(-76deg)":"none"}"></div><div class="exo-guard-toggle"></div></div>${detentMarkup(ctrl,value)}<span class="gesture-hint">LIFT / CLOSE GUARD</span></div>`;'
new_guard = '    if(ctrl.kind==="guard")return `<div class="exo-gesture-mechanism mech-guard" data-control-gesture="guard" ${data} ${disabled}><div class="exo-guard-cage"><div class="exo-guard-cover" data-gesture-moving style="transform:${rawIdx===0?"rotateX(-76deg)":"none"}"></div><div class="exo-guard-toggle" style="transform:translateY(${rawIdx===0?-6:6}px) rotate(${rawIdx===0?-8:8}deg)"></div></div>${detentMarkup(ctrl,value)}<span class="gesture-hint">LIFT / CLOSE GUARD</span></div>`;'
if js.count(old_guard) != 1:
    raise SystemExit('Guard renderer anchor mismatch')
js = js.replace(old_guard, new_guard, 1)

lever_anchor = '    if(ctrl.kind==="lever")return `<div class="exo-gesture-mechanism mech-lever" data-control-gesture="lever" ${data} ${disabled}><div class="exo-lever-slot"><div class="exo-lever-stick" data-gesture-moving style="transform:translate(-50%,calc(-50% + ${rawIdx>=0?-signed*20:0}px))"><i></i></div></div>${detentMarkup(ctrl,value)}<span class="gesture-hint">THROW LEVER</span></div>`;'
if js.count(lever_anchor) != 1:
    raise SystemExit('Lever renderer anchor mismatch')
transmit_renderer = '    if(ctrl.physical==="spring-transmit-key")return `<div class="exo-gesture-mechanism mech-transmit-key" data-control-gesture="lever" ${data} ${disabled}><div class="exo-transmit-key-bed"><i class="exo-transmit-key-pivot"></i><div class="exo-transmit-key-arm" data-gesture-moving style="transform:rotate(${rawIdx>=0?signed*13:0}deg)"><span></span></div><i class="exo-transmit-key-stop"></i></div>${detentMarkup(ctrl,value)}<span class="gesture-hint">PRESS / RELEASE TRANSMIT KEY</span></div>`;\n'
js = js.replace(lever_anchor, transmit_renderer + lever_anchor, 1)

old_move = 'else if(g.kind==="lever"&&moving)moving.style.transform=`translate(-50%,calc(-50% + ${clamp(g.dy,-34,34)}px)) rotate(${clamp(g.dx*.35,-18,18)}deg)`;else if(["knife-switch","toggle","guard"].includes(g.kind)&&moving)moving.style.transform=`translateY(${clamp(g.dy,-34,34)}px) rotate(${clamp(g.dx*.35,-18,18)}deg)`;'
new_move = 'else if(g.kind==="lever"&&moving){if(g.target.dataset.controlPhysical==="spring-transmit-key")moving.style.transform=`rotate(${clamp(-g.dy*.45,-18,18)}deg)`;else moving.style.transform=`translate(-50%,calc(-50% + ${clamp(g.dy,-34,34)}px)) rotate(${clamp(g.dx*.35,-18,18)}deg)`;}else if(g.kind==="toggle"&&moving)moving.style.transform=`rotate(${clamp(g.dy*.6,-28,28)}deg)`;else if(["knife-switch","guard"].includes(g.kind)&&moving)moving.style.transform=`translateY(${clamp(g.dy,-34,34)}px) rotate(${clamp(g.dx*.35,-18,18)}deg)`;'
if js.count(old_move) != 1:
    raise SystemExit('Gesture movement anchor mismatch')
js = js.replace(old_move, new_move, 1)

old_toggle_css = '.mech-toggle{min-height:132px}.exo-toggle-slot{position:relative;width:52px;height:90px;margin:0 auto;border-radius:10px;background:linear-gradient(90deg,#171c1e,#050607 38% 62%,#171c1e);border:1px solid #465054;box-shadow:inset 0 4px 8px #000}.exo-toggle-slot:before{content:"";position:absolute;left:50%;top:10px;bottom:10px;width:8px;transform:translateX(-50%);background:#040506;border:1px solid #30383b}.exo-toggle-handle{position:absolute;left:50%;top:50%;width:30px;height:34px;margin:-17px 0 0 -15px;border-radius:8px;background:linear-gradient(#6f787a,#272d2f);border:1px solid #858d90;transition:transform .16s ease;box-shadow:0 3px 4px #000,inset 0 1px rgba(255,255,255,.12)}.exo-toggle-handle:after{content:"";position:absolute;left:5px;right:5px;top:7px;height:3px;background:#1b1f21;box-shadow:0 6px #1b1f21,0 12px #1b1f21}'
new_toggle_css = '.mech-toggle{min-height:132px}.exo-toggle-slot{position:relative;width:82px;height:78px;margin:2px auto 0;border-radius:50%;background:radial-gradient(circle,#080a0b 0 26%,#343c3f 28% 32%,#101415 34% 62%,#485154 64% 67%,#090b0c 69%);border:1px solid #465054;box-shadow:inset 0 5px 9px #000,0 1px 0 #5a6264}.exo-toggle-slot:before{content:"";position:absolute;left:50%;top:50%;width:12px;height:42px;transform:translate(-50%,-50%);border-radius:7px;background:#030405;border:1px solid #353d40;box-shadow:inset 0 2px 4px #000}.exo-toggle-handle{position:absolute;left:50%;top:50%;width:13px;height:52px;margin:-26px 0 0 -6.5px;border-radius:7px;transform-origin:50% 50%;background:linear-gradient(90deg,#939b99,#3a4140 48%,#b6bcb9 52%,#4b5351);border:1px solid #909895;transition:transform .16s ease;box-shadow:0 3px 4px #000}.exo-toggle-handle:before{content:"";position:absolute;left:50%;top:50%;width:24px;height:24px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#787f7d 0 28%,#292f2e 31% 56%,#8d9491 59% 66%,#111 68%);box-shadow:0 2px 3px #000}.exo-toggle-handle i{position:absolute;left:50%;top:3px;width:18px;height:16px;transform:translateX(-50%);border-radius:7px 7px 3px 3px;background:linear-gradient(#737c79,#272d2c);border:1px solid #8c9592}'
if css.count(old_toggle_css) != 1:
    raise SystemExit('Canonical toggle CSS block mismatch')
css = css.replace(old_toggle_css, new_toggle_css, 1)

identity_css = r'''
/* Audited per-control physical identities: every Crew control is classified by actual mechanism. */
.physical-flight-regime-selector .exo-physical-knob{width:60px;height:48px;border-radius:18px;background:linear-gradient(145deg,#74838a,#273035 58%,#11171a)}
.physical-flight-regime-selector .exo-physical-knob i{height:24px;background:#9ec8db}.physical-thruster-bank-knob .exo-physical-knob{background:repeating-conic-gradient(#454e51 0 10deg,#252b2d 10deg 20deg);box-shadow:0 3px 5px #000,inset 0 0 0 12px #303638}.physical-trim-wheel .exo-physical-knob{width:70px;height:70px;background:repeating-conic-gradient(#777f80 0 5deg,#252a2c 5deg 10deg);box-shadow:0 3px 5px #000,inset 0 0 0 9px #121617,inset 0 0 0 18px #4f585a}.physical-trim-wheel .exo-physical-knob:before{width:22px;height:22px;background:#202628}.physical-translation-throttle input::-webkit-slider-thumb{width:30px;border-radius:5px;background:repeating-linear-gradient(90deg,#263033 0 4px,#7894a0 4px 6px)}.physical-thrust-gate .exo-lever-slot{width:76px;border-color:#667985}.physical-thrust-gate .exo-lever-slot:after{left:4px;right:4px;background:#60717a;box-shadow:0 -27px #4b5960,0 27px #4b5960}.physical-thrust-gate .exo-lever-stick{width:48px}
.physical-reference-selector .exo-physical-knob{box-shadow:0 3px 5px #000,inset 0 0 0 7px #5d5540}.physical-navigation-function-keypad .exo-hardware-actions button{font-size:.48rem;letter-spacing:.04em}.physical-delta-v-fader input::-webkit-slider-thumb{width:17px;background:linear-gradient(90deg,#9b8c63,#3a3528)}.physical-solution-handoff-latch .exo-lever-slot{width:50px;height:82px}.physical-solution-handoff-latch .exo-lever-stick{width:32px;height:20px}
.physical-weapon-master-guard .exo-guard-cover{border-color:#a25559;background:repeating-linear-gradient(135deg,rgba(158,54,59,.55) 0 5px,rgba(35,19,20,.86) 5px 10px)}.physical-weapon-bank-selector .exo-knob-well{box-shadow:inset 0 4px 10px #000,0 0 0 3px #4d2427}.physical-weapon-bank-selector .exo-physical-knob i{background:#d56c70}.physical-fire-control-keypad .exo-hardware-actions button{border-color:#684144;background:linear-gradient(#3b292b,#171011)}.physical-range-rate-dial .exo-knob-well:before{border-style:solid;border-color:#6e5050}.physical-range-rate-dial .exo-physical-knob{width:60px;height:60px}.physical-capacitor-demand-fader input::-webkit-slider-thumb{background:repeating-linear-gradient(90deg,#5f272a 0 4px,#c15c61 4px 6px)}.physical-weapon-arm-lever .exo-lever-slot{border-color:#7b4145;background:linear-gradient(90deg,#211417,#050405 37% 63%,#211417)}.physical-weapon-arm-lever .exo-lever-stick:before{background:linear-gradient(#8d4c50,#3d171a);border-color:#a86468}
.physical-breaker-bank .exo-hardware-actions button{border-radius:2px;box-shadow:inset 0 -11px 0 #15191a,0 3px 0 #050607}.physical-bus-knife-switch .exo-knife-blade i{background:linear-gradient(#6d4f32,#2a2118)}.physical-generator-load-share .exo-balance-rail{border-color:#73563a}.physical-coolant-handwheel .exo-physical-knob{width:72px;height:72px;background:repeating-conic-gradient(#9b7448 0 8deg,transparent 8deg 38deg),radial-gradient(circle,#2a2d2b 0 16%,transparent 17% 48%,#7c5c38 49% 58%,#1a1713 59%);box-shadow:0 3px 5px #000}.physical-coolant-handwheel .exo-physical-knob:after{inset:24px;background:#363a37;border:2px solid #8d6a43}.physical-pump-selector .exo-physical-knob{width:58px;height:46px;border-radius:12px;background:linear-gradient(#7e684e,#30271d)}.physical-bus-tie-contactor .exo-lever-slot{width:82px;border-color:#72573d}.physical-bus-tie-contactor .exo-lever-stick{width:56px;height:28px}.physical-bus-tie-contactor .exo-lever-stick:before{background:linear-gradient(#6d6557,#29261f);border-color:#8d816d}
.physical-receiver-band-turret .exo-physical-knob{width:64px;height:64px;clip-path:polygon(25% 4%,75% 4%,96% 25%,96% 75%,75% 96%,25% 96%,4% 75%,4% 25%)}.physical-receiver-band-turret .exo-physical-knob i{background:#9bd7ea}.physical-aperture-matrix .exo-hardware-actions button{box-shadow:inset 0 0 8px rgba(121,185,220,.12),0 3px 0 #05090b}.physical-receiver-gain-dial .exo-physical-knob{width:50px;height:50px;background:radial-gradient(circle at 36% 30%,#829197 0 10%,#2f3b40 12% 58%,#11191c 60%)}.physical-integration-slider input::-webkit-slider-thumb{width:14px;background:linear-gradient(90deg,#51809a,#9fc8d9,#51809a)}.physical-emitter-inhibit-cover .exo-guard-cover{border-color:#9b824b;background:repeating-linear-gradient(135deg,rgba(159,124,55,.48) 0 6px,rgba(34,31,20,.86) 6px 12px)}.physical-emitter-gate-paddle .exo-lever-slot{width:48px;height:80px}.physical-emitter-gate-paddle .exo-lever-stick{width:34px;height:19px}
.physical-link-mode-keypad .exo-hardware-actions button{border-color:#51496a;background:linear-gradient(#342f46,#14121d)}.physical-carrier-path-selector .exo-knob-well{box-shadow:inset 0 4px 10px #000,0 0 0 3px #443b5e}.physical-carrier-path-selector .exo-physical-knob{width:58px;height:58px}.physical-frequency-vernier .exo-physical-knob{width:62px;height:62px;background:radial-gradient(circle,#1c2022 0 22%,#6e7481 23% 31%,#252a31 32% 55%,#8e96a3 56% 61%,#11151a 63%)}.physical-frequency-vernier .exo-physical-knob:before{width:28px;height:28px;border:2px solid #9b8ad1}.physical-tx-beam-fader input::-webkit-slider-thumb{width:18px;background:linear-gradient(90deg,#564b78,#b1a2df,#564b78)}.physical-crypto-guarded-switch .exo-guard-cover{border-color:#7868a5;background:repeating-linear-gradient(135deg,rgba(104,83,157,.5) 0 5px,rgba(25,20,37,.86) 5px 10px)}
.mech-transmit-key{min-height:132px}.exo-transmit-key-bed{position:relative;width:116px;height:78px;margin:4px auto 0;border:1px solid #504865;border-radius:8px;background:linear-gradient(180deg,#15121e,#08070b);box-shadow:inset 0 5px 9px #000}.exo-transmit-key-pivot{position:absolute;left:20px;top:50%;width:25px;height:25px;transform:translateY(-50%);border-radius:50%;background:radial-gradient(circle,#777083 0 26%,#282431 29% 58%,#8b8299 61% 66%,#111 69%);box-shadow:0 2px 3px #000}.exo-transmit-key-arm{position:absolute;left:30px;top:50%;width:66px;height:16px;margin-top:-8px;transform-origin:6px 50%;transition:transform .15s ease;background:linear-gradient(#90909a,#3a3844);border:1px solid #9b97a7;border-radius:7px;box-shadow:0 3px 4px #000}.exo-transmit-key-arm span{position:absolute;right:-8px;top:50%;width:28px;height:30px;transform:translateY(-50%);border-radius:8px;background:linear-gradient(#5d526f,#211c2a);border:1px solid #827598}.exo-transmit-key-stop{position:absolute;right:10px;bottom:10px;width:18px;height:8px;border-radius:3px;background:#5f566e;border:1px solid #857a94}.physical-link-confirm-buttons .exo-hardware-actions button{border-color:#62577d}
'''

marker = '@media(max-width:1050px)'
if marker not in css:
    raise SystemExit('Responsive CSS marker missing')
css = css.replace(marker, identity_css + '\n' + marker, 1)

# Build-time audit: all 44 explicit station controls must have a physical classification.
control_lines = [line for line in js.splitlines() if 'control("' in line]
if len(control_lines) != 44:
    raise SystemExit(f'Expected 44 explicit Crew controls, found {len(control_lines)}')
unclassified = [line for line in control_lines if 'physical:"' not in line]
if unclassified:
    raise SystemExit(f'Unclassified Crew control lines remain: {len(unclassified)}')
for required in ('physical-spring-transmit-key','physical-coolant-handwheel','physical-weapon-bank-selector','physical-carrier-path-selector','physical-pump-selector'):
    if required not in css:
        raise SystemExit(f'Missing audited physical style: {required}')

JS.write_text(js, encoding='utf-8')
CSS.write_text(css, encoding='utf-8')
print('Classified and physically specialized all 44 explicit Crew controls; shared keyed lockout remains separately audited.')
