#!/usr/bin/env python3
from pathlib import Path

SHADOWRUN_VERSION = '20260809-v17-contextual-help'


def replace_once(text, old, new, label):
    if new in text and old not in text:
        return text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one old fragment, found {count}')
    return text.replace(old, new, 1)

path = Path('shadowrun-entry.js')
text = path.read_text()
text = replace_once(text, "const ASSET_VERSION = '20260809-v16-binary-cube-reseed';", f"const ASSET_VERSION = '{SHADOWRUN_VERSION}';", 'Shadowrun cache seal')
text = replace_once(text,
"""  let cubeVisualizerPromise = null;\n  let sprawlToolPromise = null;\n""",
"""  let cubeVisualizerPromise = null;\n  let contextualHelpPromise = null;\n  let sprawlToolPromise = null;\n""",
'Shadowrun contextual-help promise')
text = replace_once(text,
"""  function canonicalCubeEngineReady() {\n""",
"""  function loadContextualHelp() {\n    if (window.ScientificToolsHelp) return Promise.resolve(window.ScientificToolsHelp);\n    if (contextualHelpPromise) return contextualHelpPromise;\n    contextualHelpPromise = (async () => {\n      await loadStyle('scientific-tools-help.css');\n      await loadScript('scientific-tools-help.js', () => Boolean(window.ScientificToolsHelp));\n      return window.ScientificToolsHelp;\n    })();\n    contextualHelpPromise.catch(() => { contextualHelpPromise = null; });\n    return contextualHelpPromise;\n  }\n\n  function canonicalCubeEngineReady() {\n""",
'Shadowrun contextual-help loader')
text = replace_once(text,
"""    if (canonicalCubeEngineReady() && window.ShadowrunBinaryCubeWorkerClient && window.ShadowrunBinaryCubeAuth && window.ShadowrunBinaryCubeEncryption && window.ShadowrunBinaryCubeEditor && window.ShadowrunBinaryCubeAuthUI) return Promise.resolve(window.ShadowrunBinaryCubeEncryption);\n""",
"""    if (canonicalCubeEngineReady() && window.ShadowrunBinaryCubeWorkerClient && window.ShadowrunBinaryCubeAuth && window.ShadowrunBinaryCubeEncryption && window.ShadowrunBinaryCubeEditor && window.ShadowrunBinaryCubeAuthUI && window.ScientificToolsHelp) return Promise.resolve(window.ShadowrunBinaryCubeEncryption);\n""",
'Shadowrun laboratory fast-path help requirement')
text = replace_once(text,
"""    cubeToolPromise = (async () => {\n      await loadScript('shadowrun-binary-cube-engine.js', canonicalCubeEngineReady);\n""",
"""    cubeToolPromise = (async () => {\n      await loadContextualHelp();\n      await loadScript('shadowrun-binary-cube-engine.js', canonicalCubeEngineReady);\n""",
'Shadowrun laboratory help load')
text = replace_once(text,
"""    if (canonicalCubeEngineReady() && window.ShadowrunBinaryCubeWorkerClient && window.BinaryCubeVisualizerRenderer && window.ShadowrunBinaryCubeVisualizer) return Promise.resolve(window.ShadowrunBinaryCubeVisualizer);\n""",
"""    if (canonicalCubeEngineReady() && window.ShadowrunBinaryCubeWorkerClient && window.BinaryCubeVisualizerRenderer && window.ShadowrunBinaryCubeVisualizer && window.ScientificToolsHelp) return Promise.resolve(window.ShadowrunBinaryCubeVisualizer);\n""",
'Shadowrun visualizer fast-path help requirement')
text = replace_once(text,
"""    cubeVisualizerPromise = (async () => {\n      await loadStyle('binary-cube-visualizer.css');\n""",
"""    cubeVisualizerPromise = (async () => {\n      await loadContextualHelp();\n      await loadStyle('binary-cube-visualizer.css');\n""",
'Shadowrun visualizer help load')
path.write_text(text)

path = Path('app-lite-view-mounts.js')
text = path.read_text()
text = replace_once(text,
"""loadScript('shadowrun-entry.js?v=20260809-v16-binary-cube-reseed')""",
f"""loadScript('shadowrun-entry.js?v={SHADOWRUN_VERSION}')""",
'App-lite Shadowrun cache token')
path.write_text(text)

path = Path('scripts/validate-scientific-tools-extraction.mjs')
text = path.read_text()
old = """  \"['tools','Binary Cube Encryption Laboratory'\", \"['tools','Binary Cube Encoder Visualizer'\", 'function loadCubeTool()', 'function loadCubeVisualizer()', \"loadScript('shadowrun-binary-cube-engine.js'\"\n"""
new = """  \"['tools','Binary Cube Encryption Laboratory'\", \"['tools','Binary Cube Encoder Visualizer'\", 'function loadCubeTool()', 'function loadCubeVisualizer()', 'function loadContextualHelp()', \"loadScript('scientific-tools-help.js'\", \"loadStyle('scientific-tools-help.css'\", \"loadScript('shadowrun-binary-cube-engine.js'\"\n"""
text = replace_once(text, old, new, 'Shadowrun direct help ownership contract')
text = text.replace("schemaVersion: '0.25.0'", "schemaVersion: '0.26.0'")
path.write_text(text)

print('Shadowrun direct Binary Cube contextual-help route applied.')
