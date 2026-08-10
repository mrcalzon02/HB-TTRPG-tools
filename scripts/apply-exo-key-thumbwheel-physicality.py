#!/usr/bin/env python3
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / 'blacklight-exo-crew-operations.js'
CSS = ROOT / 'blacklight-exo-crew-operations.css'
EXPECTED_JS = '0ce92e416d56c6b03080ef0cbc36dd5edf97c26f'
EXPECTED_CSS = 'c783d35b7c8952b6a3968f5ab29d5d5e85ff0bb9'

def blob_sha(path):
    data = path.read_bytes()
    return hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()

for path, expected in ((JS, EXPECTED_JS), (CSS, EXPECTED_CSS)):
    actual = blob_sha(path)
    if actual != expected:
        raise SystemExit(f'{path.name} changed concurrently: expected {expected}, found {actual}')

js = JS.read_text(encoding='utf-8')
css = CSS.read_text(encoding='utf-8')

old_thumb = '''    if(ctrl.kind==="thumbwheel")return `<div class="exo-gesture-mechanism mech-thumbwheel" data-control-gesture="thumbwheel" ${data} ${disabled}><div class="exo-thumbwheel-window"><span>${ctrl.actions[0]?.label||"−"}</span><div class="exo-thumbwheel-drum" data-gesture-moving><b>${rawIdx>=0?ctrl.actions[idx]?.label:(ctrl.actions[1]?.label||"0")}</b></div><span>${ctrl.actions.at(-1)?.label||"+"}</span></div><span class="gesture-hint">ROLL ↑ / ↓</span></div>`;'''
new_thumb = '''    if(ctrl.kind==="thumbwheel"){const readout=value||ctrl.actions[idx]?.state||"0";return `<div class="exo-gesture-mechanism mech-thumbwheel" data-control-gesture="thumbwheel" ${data} ${disabled}><div class="exo-thumbwheel-assembly"><div class="exo-thumbwheel-control"><span class="exo-thumbwheel-direction minus">${ctrl.actions[0]?.label||"−"}</span><div class="exo-thumbwheel-wheel" aria-hidden="true"><div class="exo-thumbwheel-belt" data-gesture-moving><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div><span class="exo-thumbwheel-direction plus">${ctrl.actions.at(-1)?.label||"+"}</span></div><div class="exo-thumbwheel-readout"><small>INDEX</small><b>${readout}</b></div></div><span class="gesture-hint">ROLL WHEEL ↑ / ↓</span></div>`;}'''
if js.count(old_thumb) != 1:
    raise SystemExit(f'Expected one thumbwheel renderer, found {js.count(old_thumb)}')
js = js.replace(old_thumb, new_thumb, 1)

start = js.index('  function keyGraphic(')
end = js.index('  function authorizationAssembly(', start)
new_key = '''  function keyGraphic(keyInserted,armed){if(!keyInserted)return "";const rotation=armed?34:-34;return `<svg class="exo-inserted-key" data-key-graphic viewBox="0 0 80 80" aria-hidden="true" style="position:absolute;left:50%;top:50%;width:82px;height:82px;overflow:visible;pointer-events:none;transform:translate(-50%,-50%) rotate(${rotation}deg);transform-origin:50% 50%;transition:transform .2s ease;filter:drop-shadow(0 3px 2px rgba(0,0,0,.78))"><rect x="37" y="38" width="6" height="23" rx="2" fill="#aeb5b2" stroke="#e1e5e2" stroke-width="1"/><rect x="33" y="55" width="14" height="8" rx="3" fill="#8f9895" stroke="#cfd5d2" stroke-width="1"/><ellipse cx="40" cy="69" rx="15" ry="10" fill="#9aa3a0" stroke="#e0e4e1" stroke-width="2"/><ellipse cx="40" cy="69" rx="8" ry="4.5" fill="#202627" stroke="#596361" stroke-width="1.5"/><path d="M35 48h10M35 52h10" stroke="#747d7a" stroke-width="1.2"/><circle cx="40" cy="40" r="5.5" fill="#858e8b" stroke="#dce1de" stroke-width="1.4"/></svg>`;}\n'''
js = js[:start] + new_key + js[end:]

old_move_key = '''if(g.kind==="key-twist"){const key=g.target.closest(".exo-key-cylinder")?.querySelector("[data-key-graphic]");if(key){key.style.transition="none";key.style.transform=`translate(-50%,-50%) rotate(${clamp(turn,0,46)}deg)`;}}'''
new_move_key = '''if(g.kind==="key-twist"){const key=g.target.closest(".exo-key-cylinder")?.querySelector("[data-key-graphic]");if(key){key.style.transition="none";key.style.transform=`translate(-50%,-50%) rotate(${-34+clamp(turn,0,68)}deg)`;}}'''
if js.count(old_move_key) != 1:
    raise SystemExit('Key-twist visual branch not found exactly once')
js = js.replace(old_move_key, new_move_key, 1)

old_thumb_move = '''else if(g.kind==="thumbwheel"&&moving)moving.style.transform=`translateY(${clamp(g.dy,-20,20)}px) rotateX(${clamp(-g.dy*2,-50,50)}deg)`;'''
new_thumb_move = '''else if(g.kind==="thumbwheel"&&moving)moving.style.transform=`translateY(${clamp(g.dy,-18,18)}px)`;'''
if js.count(old_thumb_move) != 1:
    raise SystemExit('Thumbwheel gesture branch not found exactly once')
js = js.replace(old_thumb_move, new_thumb_move, 1)

old_key_threshold = '''if(g.kind==="key-twist"){if(clamp(g.turn,0,46)>=28){suppressGestureClickUntil=Date.now()+500;recordInput("auth-key-arm","Authorization key TURN TO ARM");return;}resetGestureVisual(g);return;}'''
new_key_threshold = '''if(g.kind==="key-twist"){if(clamp(g.turn,0,68)>=36){suppressGestureClickUntil=Date.now()+500;recordInput("auth-key-arm","Authorization key TURN TO ARM");return;}resetGestureVisual(g);return;}'''
if js.count(old_key_threshold) != 1:
    raise SystemExit('Key-twist threshold branch not found exactly once')
js = js.replace(old_key_threshold, new_key_threshold, 1)

old_thumb_css = '''.mech-thumbwheel{min-height:112px}.exo-thumbwheel-window{display:grid;grid-template-columns:1fr 52px 1fr;align-items:center;gap:4px;max-width:145px;margin:7px auto 0;padding:6px;border:1px solid #50585b;background:#050708;box-shadow:inset 0 4px 8px #000}.exo-thumbwheel-window>span{text-align:center;color:#707a77;font:900 .48rem ui-monospace,monospace}.exo-thumbwheel-drum{height:52px;border:1px solid #5c6669;border-radius:5px;background:repeating-linear-gradient(0deg,#32393b 0 4px,#15191a 4px 7px);display:grid;place-items:center;transform-style:preserve-3d;transition:transform .15s ease;box-shadow:inset 0 3px 5px #000}.exo-thumbwheel-drum b{color:#d9c585;font:900 .72rem ui-monospace,monospace;background:#080a0b;padding:6px 8px;border:1px solid #343c3f}'''
new_thumb_css = '''.mech-thumbwheel{min-height:112px}.exo-thumbwheel-assembly{display:grid;grid-template-columns:62px minmax(66px,1fr);align-items:center;justify-content:center;gap:8px;max-width:158px;margin:7px auto 0;padding:7px;border:1px solid #50585b;background:#050708;box-shadow:inset 0 4px 8px #000}.exo-thumbwheel-control{position:relative;display:grid;place-items:center;height:68px}.exo-thumbwheel-wheel{position:relative;width:42px;height:58px;overflow:hidden;border:1px solid #646e70;border-radius:6px;background:#0b0d0e;box-shadow:inset 0 5px 8px #000,0 1px 0 rgba(255,255,255,.06)}.exo-thumbwheel-wheel:before,.exo-thumbwheel-wheel:after{content:"";position:absolute;left:0;right:0;height:13px;z-index:2;pointer-events:none}.exo-thumbwheel-wheel:before{top:0;background:linear-gradient(#050607,transparent)}.exo-thumbwheel-wheel:after{bottom:0;background:linear-gradient(transparent,#050607)}.exo-thumbwheel-belt{position:absolute;left:5px;right:5px;top:-17px;height:92px;display:grid;grid-template-rows:repeat(7,1fr);gap:2px;transition:transform .15s ease}.exo-thumbwheel-belt i{display:block;border-radius:2px;background:linear-gradient(180deg,#697275,#282e30 42%,#161a1b 58%,#5e6769);border-top:1px solid #858e90;border-bottom:1px solid #08090a;box-shadow:0 1px 1px #000}.exo-thumbwheel-direction{position:absolute;left:50%;transform:translateX(-50%);color:#8a9490;font:900 .45rem ui-monospace,monospace}.exo-thumbwheel-direction.minus{top:-2px}.exo-thumbwheel-direction.plus{bottom:-2px}.exo-thumbwheel-readout{min-width:0;padding:7px 6px;border:1px solid #615b42;background:linear-gradient(180deg,#0b0c09,#050605);box-shadow:inset 0 3px 7px #000}.exo-thumbwheel-readout small{display:block;color:#81785c;font:900 .39rem ui-monospace,monospace;letter-spacing:.1em}.exo-thumbwheel-readout b{display:block;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e1cf91;font:900 .62rem ui-monospace,monospace;text-shadow:0 0 5px rgba(217,197,133,.18)}'''
if css.count(old_thumb_css) != 1:
    raise SystemExit(f'Expected one canonical thumbwheel CSS block, found {css.count(old_thumb_css)}')
css = css.replace(old_thumb_css, new_thumb_css, 1)

old_key_css = '''.exo-key-cylinder{position:relative;width:68px;height:68px;border-radius:50%;background:radial-gradient(circle,#111415 0 32%,#565c5b 33% 39%,#171a1a 40% 60%,#6b716f 61% 66%,#111 67%);box-shadow:inset 0 0 0 2px #090a0a,0 3px 5px #000}.exo-key-cylinder>button{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border-radius:50%!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:43px 0 0!important;font-size:.42rem!important}.exo-key-cylinder i{position:absolute;left:50%;top:14px;width:7px;height:27px;background:#040505;box-shadow:0 0 0 2px #858a88;transform:translateX(-50%) rotate(0deg);transition:transform .2s}.exo-lockout-device.is-armed .exo-key-cylinder i{transform:translateX(-50%) rotate(42deg)}.exo-key-cylinder small{position:absolute;top:30px;color:#817a72;font:900 .38rem ui-monospace,monospace}.exo-key-cylinder small:nth-of-type(1){left:-26px}.exo-key-cylinder small:nth-of-type(2){right:-25px;color:#b77575}.exo-lockout-device>strong{font-size:.49rem!important;text-align:center;white-space:normal!important;margin:3px 0 0!important}.exo-lockout-shield,.exo-key-cylinder>button{touch-action:none}.exo-key-cylinder svg{z-index:2}'''
new_key_css = '''.exo-key-cylinder{position:relative;width:68px;height:68px;border-radius:50%;background:radial-gradient(circle,#0a0d0d 0 24%,#262b2a 25% 31%,#666d6a 32% 38%,#171a1a 39% 58%,#707673 59% 65%,#111 66%);box-shadow:inset 0 0 0 2px #090a0a,inset 0 2px 4px rgba(255,255,255,.05),0 3px 5px #000}.exo-key-cylinder:before{content:"";position:absolute;left:50%;top:50%;width:7px;height:22px;border-radius:4px;background:#020303;border:1px solid #858c89;box-shadow:inset 0 1px 2px #000,0 0 0 2px #141716;transform:translate(-50%,-50%) rotate(-34deg);transform-origin:50% 50%;transition:transform .2s ease}.exo-lockout-device.is-armed .exo-key-cylinder:before{transform:translate(-50%,-50%) rotate(34deg)}.exo-key-cylinder:after{content:"";position:absolute;inset:12px;border-radius:50%;border:1px solid rgba(208,215,211,.16);box-shadow:inset 0 0 0 3px rgba(0,0,0,.18);pointer-events:none}.exo-key-cylinder>button{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border-radius:50%!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:44px 0 0!important;font-size:.38rem!important;z-index:4}.exo-key-cylinder>button span{position:relative;z-index:5;text-shadow:0 1px 2px #000}.exo-key-cylinder small{position:absolute;top:28px;color:#817a72;font:900 .38rem ui-monospace,monospace;z-index:5}.exo-key-cylinder small:nth-of-type(1){left:-29px}.exo-key-cylinder small:nth-of-type(2){right:-27px;color:#b77575}.exo-inserted-key{z-index:3}.exo-lockout-device.key-in .exo-key-cylinder>button span{opacity:.72}.exo-lockout-device>strong{font-size:.49rem!important;text-align:center;white-space:normal!important;margin:3px 0 0!important}.exo-lockout-shield,.exo-key-cylinder>button{touch-action:none}'''
if css.count(old_key_css) != 1:
    raise SystemExit(f'Expected one canonical key-cylinder CSS block, found {css.count(old_key_css)}')
css = css.replace(old_key_css, new_key_css, 1)

# Update later station-specific references from the retired thumbwheel DOM names.
css = css.replace('.station-navigation .exo-thumbwheel-window{border-color:#716645}', '.station-navigation .exo-thumbwheel-assembly{border-color:#716645}.station-navigation .exo-thumbwheel-readout{border-color:#81754c}')
css = css.replace('.station-comms .exo-thumbwheel-window{border-color:#60537f}.station-comms .exo-thumbwheel-drum{border-color:#75689a}', '.station-comms .exo-thumbwheel-assembly{border-color:#60537f}.station-comms .exo-thumbwheel-wheel{border-color:#75689a}.station-comms .exo-thumbwheel-readout{border-color:#65598a}')

for forbidden in ('exo-thumbwheel-window', 'exo-thumbwheel-drum'):
    if forbidden in css or forbidden in js:
        raise SystemExit(f'Retired thumbwheel structure still referenced: {forbidden}')

for required in ('exo-thumbwheel-belt', 'exo-thumbwheel-readout', 'exo-inserted-key', 'rotate(${-34+clamp(turn,0,68)}deg)'):
    if required not in js + css:
        raise SystemExit(f'Missing new physicality token: {required}')

JS.write_text(js, encoding='utf-8')
CSS.write_text(css, encoding='utf-8')
print('Corrected keyed execution lock and thumbwheel/index-drum physicality.')
