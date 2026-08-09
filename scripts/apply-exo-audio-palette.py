#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {
    'blacklight-exo-crew-operations.js': '00daa7843081228c1cb7166f8cf76a9ca98f03bf',
    'blacklight-exo-repair-operations.js': 'f89bd0681ac05ce3e1450a7c376b5e57bd1d1d3c',
    'blacklight-exo-crew-operations.html': '4c4111f1d61a54cb8908357a3433449c6a8eaf58',
    'blacklight-exo-repair-operations.html': '6fdeee5f7011da309c3bea8c9d9afecafbbab17b',
}

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')

def blob(path):
    return subprocess.check_output(['git', 'hash-object', path], cwd=ROOT, text=True).strip()

def require_hashes():
    for path, expected in EXPECTED.items():
        actual = blob(path)
        if actual != expected:
            raise SystemExit(f'{path} changed concurrently: expected {expected}, found {actual}')

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one exact anchor, found {count}')
    return text.replace(old, new, 1)

require_hashes()

# Crew Operations: replace the provisional single-recording audio logic with shared semantic scenes.
path = 'blacklight-exo-crew-operations.js'
text = read(path)
start = text.find('  const CONTROL_AUDIO=Object.freeze({')
end = text.find('  function initialHardwareState()', start)
if start < 0 or end < 0:
    raise SystemExit('Crew audio block anchors not found.')
replacement = '''  const controlAudio=()=>window.EXO_CONTROL_AUDIO||null;
  const CONTROL_SOUND_SCENE=Object.freeze({selector:"selector-set",rotary:"rotary-detent",wheel:"wheel-stop",thumbwheel:"thumbwheel-notch",lever:"lever-throw","knife-switch":"knife-throw",toggle:"toggle-flick",guard:"guard-cover","dual-slider":"servo-set",slider:"servo-set",yoke:"yoke-return",keypad:"button-light",matrix:"button-light","switch-bank":"toggle-flick","breaker-bank":"breaker-throw","dual-button":"button-heavy",lockout:"key-turn"});
  function controlSoundScene(token,controlId){if(token==="auth-key-insert")return "key-insert";if(token==="auth-key-arm")return "key-turn";if(token==="auth-shield-open")return "guard-cover";if(token==="execute")return "execute-heavy";const def=STATIONS[activeStation],ctrl=controlId?def.controls.find(c=>c.id===controlId):null;return CONTROL_SOUND_SCENE[ctrl?.kind]||"button-light";}
  function playControlSound(token,controlId){const audio=controlAudio();if(!audio)return;const scene=controlSoundScene(token,controlId);audio.play(scene,{seed:`${activeStation}:${token}:${controlId||"auth"}`});if(token.startsWith("com-address")||token.startsWith("com-crypto-ack"))setTimeout(()=>audio.play("electrical-confirm",{seed:`confirm:${token}`,intensity:.8}),88);}
  function motionSoundScene(kind){if(["rotary","wheel","thumbwheel"].includes(kind))return "detent-roll-loop";if(["dual-slider","yoke"].includes(kind))return "servo-loop";return null;}
  function motionSoundKey(kind,controlId){return `crew:${activeStation}:${controlId||kind}`;}
  function startControlMotionSound(kind,controlId){const scene=motionSoundScene(kind),audio=controlAudio();if(scene&&audio)audio.startLoop(scene,motionSoundKey(kind,controlId),{seed:motionSoundKey(kind,controlId),intensity:kind==="yoke"?.45:.72});}
  function stopControlMotionSound(kind,controlId){controlAudio()?.stopLoop(motionSoundKey(kind,controlId));}
'''
text = text[:start] + replacement + text[end:]
text = replace_once(text, 'target.setPointerCapture?.(e.pointerId);}', 'target.setPointerCapture?.(e.pointerId);startControlMotionSound(kind,target.dataset.controlId);}', 'crew gesture-loop start')
text = replace_once(text, 'physicalGesture=null;if(cancelled){resetGestureVisual(g);return;}', 'physicalGesture=null;stopControlMotionSound(g.kind,g.target.dataset.controlId);if(cancelled){resetGestureVisual(g);return;}', 'crew gesture-loop stop')
write(path, text)

# Repair Bay: map accepted maintenance actions to the same canonical sound scenes.
path = 'blacklight-exo-repair-operations.js'
text = read(path)
actions_anchor = 'const ACTIONS={"isolate-power":"Opened service disconnect","inspect":"Visual inspection","continuity-test":"Continuity test","ground-test":"Insulation / ground test","replace":"Replaced component","splice":"Spliced / replaced conductor","reseat":"Reseated connector","restore-power":"Closed service disconnect","functional-test":"Functional test / DM relay"};\n'
repair_audio = actions_anchor + '''const REPAIR_SOUND_SCENE=Object.freeze({"isolate-power":"breaker-throw",inspect:"panel-latch","continuity-test":"meter-test","ground-test":"meter-test",replace:"module-seat",splice:"tool-snick",reseat:"connector-seat","restore-power":"power-contact","functional-test":"functional-test"});
function playRepairSound(action){const scene=REPAIR_SOUND_SCENE[action],audio=window.EXO_CONTROL_AUDIO;if(scene&&audio)audio.play(scene,{seed:`repair:${activeStation}:${action}`,intensity:action==="inspect"?.72:1});}
'''
text = replace_once(text, actions_anchor, repair_audio, 'repair sound map')
text = replace_once(text, 'if(action==="isolate-power"){state.servicePower="isolated";', 'if(action==="isolate-power"){playRepairSound(action);state.servicePower="isolated";', 'repair isolate sound')
text = replace_once(text, 'if(action==="restore-power"){state.servicePower="energized";', 'if(action==="restore-power"){playRepairSound(action);state.servicePower="energized";', 'repair restore sound')
text = replace_once(text, 'if(action==="functional-test"){record(action);evaluateRepair();return;}', 'if(action==="functional-test"){playRepairSound(action);record(action);evaluateRepair();return;}', 'repair functional sound')
text = replace_once(text, 'if(!target){state.instrument="Select a component or wire run first.";renderSelection();return;}if(state.servicePower', 'if(!target){state.instrument="Select a component or wire run first.";renderSelection();return;}playRepairSound(action);if(state.servicePower', 'repair targeted action sound')
write(path, text)

# Load the shared canonical mixer before either authoritative page controller.
path = 'blacklight-exo-crew-operations.html'
text = read(path)
text = replace_once(text, '  <script src="blacklight-exo-crew-operations.js" defer></script>', '  <script src="blacklight-exo-control-audio.js" defer></script>\n  <script src="blacklight-exo-crew-operations.js" defer></script>', 'crew audio module load')
write(path, text)

path = 'blacklight-exo-repair-operations.html'
text = read(path)
text = replace_once(text, '  <script src="blacklight-exo-repair-operations.js" defer></script>', '  <script src="blacklight-exo-control-audio.js" defer></script>\n  <script src="blacklight-exo-repair-operations.js" defer></script>', 'repair audio module load')
write(path, text)

# This is a one-shot direct-source migration. Remove the helper and its runner in the same commit.
(ROOT / 'scripts/apply-exo-audio-palette.py').unlink(missing_ok=True)
(ROOT / '.github/workflows/apply-exo-audio-palette.yml').unlink(missing_ok=True)
