#!/usr/bin/env python3
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / 'blacklight-exo-control-audio.js'
EXPECTED = '95689f45e01fca29455502010769c2fbcbd8dd5b'

def blob(path):
    return subprocess.check_output(['git', 'hash-object', str(path.relative_to(ROOT))], cwd=ROOT, text=True).strip()

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one anchor, found {count}')
    return text.replace(old, new, 1)

actual = blob(PATH)
if actual != EXPECTED:
    raise SystemExit(f'blacklight-exo-control-audio.js changed concurrently: expected {EXPECTED}, found {actual}')

text = PATH.read_text(encoding='utf-8')
text = replace_once(
    text,
    "  const MAX_ACTIVE = 28;\n  const assets = Object.freeze({",
    """  const MAX_ACTIVE = 28;
  const STATION_CHARACTER = Object.freeze({
    helm: Object.freeze({ gain: 0.96, rate: 1.03 }),
    navigation: Object.freeze({ gain: 0.88, rate: 1.07 }),
    gunnery: Object.freeze({ gain: 1.08, rate: 0.95 }),
    engineering: Object.freeze({ gain: 1.14, rate: 0.90 }),
    science: Object.freeze({ gain: 0.84, rate: 1.09 }),
    comms: Object.freeze({ gain: 0.90, rate: 1.06 })
  });
  const PRELOAD_ASSETS = Object.freeze(['click', 'snap', 'snick', 'krunk', 'clickKlunk', 'slowCoinClicking', 'engineLoop', 'deng']);
  const assets = Object.freeze({""",
    'station character constants'
)

text = replace_once(
    text,
    "  const active = new Set();\n  const loops = new Map();\n  let masterVolume = MASTER_VOLUME;",
    """  const active = new Set();
  const loops = new Map();
  const preloaders = new Map();
  let masterVolume = MASTER_VOLUME;""",
    'preloader state'
)

text = replace_once(
    text,
    "  function variation(seed, index) {\n    const value = hash(`${seed}:${index}`) % 1001;\n    return (value / 1000 - 0.5) * 0.045;\n  }",
    """  function variation(seed, index) {
    const value = hash(`${seed}:${index}`) % 1001;
    return (value / 1000 - 0.5) * 0.045;
  }

  function stationFromOptions(options = {}) {
    const source = String(options.station || options.seed || options.key || '');
    const match = source.match(/(?:^|:)(helm|navigation|gunnery|engineering|science|comms)(?=:|$)/i);
    return match ? match[1].toLowerCase() : null;
  }

  function characterFor(options = {}) {
    return STATION_CHARACTER[stationFromOptions(options)] || { gain: 1, rate: 1 };
  }

  function prime() {
    PRELOAD_ASSETS.forEach(name => {
      if (preloaders.has(name) || !assets[name]) return;
      try {
        const audio = new Audio(assets[name]);
        audio.preload = 'auto';
        audio.volume = 0;
        audio.load();
        preloaders.set(name, audio);
      } catch (_) {
        // Asset priming is optional; interaction playback remains the fallback.
      }
    });
  }""",
    'station parser and prime function'
)

text = replace_once(
    text,
    "    const audio = new Audio(source);\n    const rateVariation = options.vary === false ? 0 : variation(options.seed || options.key || options.scene || '', index);\n    audio.preload = 'auto';\n    audio.volume = clamp((layer.gain ?? 0.1) * (options.intensity ?? 1) * masterVolume, 0, 1);\n    audio.playbackRate = clamp((layer.rate ?? 1) + rateVariation, 0.5, 2);",
    """    const audio = new Audio(source);
    const rateVariation = options.vary === false ? 0 : variation(options.seed || options.key || options.scene || '', index);
    const character = characterFor(options);
    audio.preload = 'auto';
    audio.volume = clamp((layer.gain ?? 0.1) * (options.intensity ?? 1) * character.gain * masterVolume, 0, 1);
    audio.playbackRate = clamp(((layer.rate ?? 1) + rateVariation) * character.rate, 0.5, 2);""",
    'station gain/rate shaping'
)

text = replace_once(
    text,
    "    assets,\n    scenes,\n    play,",
    """    assets,
    scenes,
    stationCharacter: STATION_CHARACTER,
    prime,
    play,""",
    'public audio API'
)

text = replace_once(
    text,
    "  });\n})();\n",
    """  });

  prime();
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll(); });
  window.addEventListener('pagehide', stopAll);
})();
""",
    'prime and lifecycle cleanup'
)

PATH.write_text(text, encoding='utf-8')
(ROOT / 'scripts/apply-exo-audio-character.py').unlink(missing_ok=True)
(ROOT / '.github/workflows/apply-exo-audio-character.yml').unlink(missing_ok=True)
