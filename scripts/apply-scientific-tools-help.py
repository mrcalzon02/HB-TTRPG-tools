#!/usr/bin/env python3
from pathlib import Path
import re

NEW_VERSION = '20260809-scientific-help-1'


def read(path):
    return Path(path).read_text()


def write(path, text):
    Path(path).write_text(text)


def replace_once(text, old, new, label):
    if new in text and old not in text:
        return text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one old fragment, found {count}')
    return text.replace(old, new, 1)

# scientific-tools-entry.js
path = 'scientific-tools-entry.js'
text = read(path)
text, n = re.subn(r"const ASSET_VERSION = '[^']+';", f"const ASSET_VERSION = '{NEW_VERSION}';", text, count=1)
if n != 1:
    raise SystemExit('Scientific Tools asset version anchor not found exactly once.')
text = replace_once(text,
"""  let cooperativeRunnerPromise = null;\n""",
"""  let cooperativeRunnerPromise = null;\n  let helpSystemPromise = null;\n""",
'Scientific Tools help promise')
text = replace_once(text,
"""  function canonicalCubeEngineReady() {\n""",
"""  function loadHelpSystem() {\n    if (window.ScientificToolsHelp) return Promise.resolve(window.ScientificToolsHelp);\n    if (helpSystemPromise) return helpSystemPromise;\n    helpSystemPromise = (async () => {\n      await loadStyle('scientific-tools-help.css');\n      await loadScript('scientific-tools-help.js', () => Boolean(window.ScientificToolsHelp));\n      return window.ScientificToolsHelp;\n    })();\n    helpSystemPromise.catch(() => { helpSystemPromise = null; });\n    return helpSystemPromise;\n  }\n\n  function canonicalCubeEngineReady() {\n""",
'Scientific Tools help loader')
text = replace_once(text,
"""    void loadCooperativeRunner().catch(error => console.error('Scientific Tools cooperative runner could not be preloaded.', error));\n""",
"""    void Promise.all([loadCooperativeRunner(), loadHelpSystem()]).catch(error => console.error('Scientific Tools shared runtime could not be preloaded.', error));\n""",
'Scientific Tools help preload')
text = replace_once(text,
"""    initialize, selectTab, loadCooperativeRunner, loadBinaryCubeVisualizer,""",
"""    initialize, selectTab, loadCooperativeRunner, loadHelpSystem, loadBinaryCubeVisualizer,""",
'Scientific Tools help export')
write(path, text)

# app-lite-view-mounts.js cache seal
path = 'app-lite-view-mounts.js'
text = read(path)
text, n = re.subn(r"scientific-tools-entry\.js\?v=[A-Za-z0-9._-]+", f"scientific-tools-entry.js?v={NEW_VERSION}", text, count=1)
if n != 1:
    raise SystemExit('App-lite Scientific Tools cache token anchor not found exactly once.')
write(path, text)

# scripts/validate-scientific-tools-extraction.mjs
path = 'scripts/validate-scientific-tools-extraction.mjs'
text = read(path)
text = replace_once(text,
"""  cooperative: read('scientific-tools-cooperative-runner.js'),\n""",
"""  cooperative: read('scientific-tools-cooperative-runner.js'),\n  help: read('scientific-tools-help.js'),\n""",
'Scientific Tools help validator source')
anchor = """checks.push(excludes('Scheduler remains model-neutral', sources.cooperative, ['ShadowrunBinaryCubeEngine', 'BinaryCubeDiagnosticPipeline', 'BinaryCubeSteganalysisEngine', 'DoubleSlitExperimentLab']));\n"""
insert = anchor + """checks.push(includes('Shared Scientific Tools help owns crypto/stego explanations and accessible callouts', sources.help, [\n  'ScientificToolsHelp', \"const VERSION = '0.1.0';\", 'Help · How this tool works', 'Recommended workflow', 'What the outputs mean', 'Evidence boundary', 'MutationObserver', 'aria-describedby', 'role=\"tooltip\"', 'sth-section-callout', 'WebGPU acceleration', 'CPU-equivalent path', 'shadowrun-binary-cube-lab', 'shadowrun-binary-cube-visualizer', 'binary-cube-key-generation-visualizer', 'binary-cube-decryption-dashboard', 'binary-cube-cryptanalytic-test-lab', 'binary-cube-information-analysis-suite', 'binary-cube-communication-capacity-analyzer', 'binary-cube-media-forensics-suite', 'binary-cube-steganalysis-lab', 'binary-cube-diagnostic-pipeline-panel', 'binary-cube-cubic-decryptor', 'signals-laboratory'\n]));\nchecks.push(excludes('Shared help runtime remains explanatory rather than cryptographic authority', sources.help, ['function encryptBinary(', 'function decryptBinary(', 'function generateResearchKey(', 'function rsAnalysis(', 'function samplePairAnalysis(']));\n"""
if insert not in text:
    text = replace_once(text, anchor, insert, 'Scientific Tools help ownership assertions')
text, n = re.subn(r"const ASSET_VERSION = '[^']+';", f"const ASSET_VERSION = '{NEW_VERSION}';", text, count=1)
if n == 0:
    text = text.replace("\"const ASSET_VERSION = '20260809-cubic-decryptor-hardening-7';\"", f"\"const ASSET_VERSION = '{NEW_VERSION}';\"")
workspace_old = "'function loadCubicDecryptor()', 'id=\"scientific-tools-open-diagnostic-pipeline\"'"
workspace_new = "'function loadCubicDecryptor()', 'function loadHelpSystem()', \"loadStyle('scientific-tools-help.css')\", \"loadScript('scientific-tools-help.js'\", 'id=\"scientific-tools-open-diagnostic-pipeline\"'"
text = replace_once(text, workspace_old, workspace_new, 'Scientific Tools help workspace loader assertions')
nonempty_old = """  'scientific-tools-local-media.js', 'binary-cube-key-generation-visualizer.css'"""
nonempty_new = """  'scientific-tools-local-media.js', 'scientific-tools-help.js', 'scientific-tools-help.css', 'scripts/validate-scientific-tools-help.mjs', 'binary-cube-key-generation-visualizer.css'"""
text = replace_once(text, nonempty_old, nonempty_new, 'Scientific Tools help nonempty contract')
text = text.replace("schemaVersion: '0.24.0'", "schemaVersion: '0.25.0'")
write(path, text)

# .github/workflows/scientific-tools-extraction.yml
path = '.github/workflows/scientific-tools-extraction.yml'
text = read(path)
text = replace_once(text,
"""      - \"scientific-tools-local-media.js\"\n""",
"""      - \"scientific-tools-local-media.js\"\n      - \"scientific-tools-help.js\"\n      - \"scientific-tools-help.css\"\n""",
'Scientific Tools help workflow paths')
text = replace_once(text,
"""      - \"scripts/validate-scientific-tools-extraction.mjs\"\n""",
"""      - \"scripts/validate-scientific-tools-extraction.mjs\"\n      - \"scripts/validate-scientific-tools-help.mjs\"\n""",
'Scientific Tools help validator workflow path')
text = replace_once(text,
"""          node --check scientific-tools-local-media.js\n""",
"""          node --check scientific-tools-local-media.js\n          node --check scientific-tools-help.js\n          node --check scripts/validate-scientific-tools-help.mjs\n          test -s scientific-tools-help.css\n""",
'Scientific Tools help syntax checks')
needle = """      - name: Validate Scientific Tools main-menu contract\n        run: node scripts/validate-scientific-tools-extraction.mjs\n"""
addition = """      - name: Validate shared cryptography and steganography help\n        run: node scripts/validate-scientific-tools-help.mjs\n\n""" + needle
if addition not in text:
    text = replace_once(text, needle, addition, 'Scientific Tools help validation step')
write(path, text)

print('Shared Scientific Tools help integration patch applied.')
