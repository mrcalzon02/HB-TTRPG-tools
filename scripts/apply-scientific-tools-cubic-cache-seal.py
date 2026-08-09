#!/usr/bin/env python3
from pathlib import Path

OLD = '20260809-diagnostic-raster-evidence-1'
NEW = '20260809-cubic-decryptor-hardening-1'


def replace_once(path, old, new, label):
    file = Path(path)
    text = file.read_text()
    if new in text and old not in text:
        return False
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one old fragment, found {count}')
    file.write_text(text.replace(old, new, 1))
    return True


replace_once(
    'scientific-tools-entry.js',
    f"const ASSET_VERSION = '{OLD}';",
    f"const ASSET_VERSION = '{NEW}';",
    'Scientific Tools asset version'
)

replace_once(
    'app-lite-view-mounts.js',
    f"loadScript('scientific-tools-entry.js?v={OLD}')",
    f"loadScript('scientific-tools-entry.js?v={NEW}')",
    'Scientific Tools top-level cache seal'
)

validator = 'scripts/validate-scientific-tools-extraction.mjs'
replace_once(
    validator,
    f"loadScript('scientific-tools-entry.js?v={OLD}')",
    f"loadScript('scientific-tools-entry.js?v={NEW}')",
    'Scientific Tools validator top-level cache seal'
)
replace_once(
    validator,
    f"const ASSET_VERSION = '{OLD}';",
    f"const ASSET_VERSION = '{NEW}';",
    'Scientific Tools validator asset version'
)
replace_once(
    validator,
    """  'BinaryCubeDiagnosticPipeline', \"const VERSION = '0.3.0';\", \"const REPORT_SCHEMA_VERSION = '0.3.0';\", \"id: 'information-structure'\", \"id: 'media-forensic-sweep'\", \"id: 'audio-signal-forensics'\", \"id: 'raster-steganalysis'\", \"id: 'binary-cube-attack-suite'\", 'resolveCalibrationSnapshot',""",
    """  'BinaryCubeDiagnosticPipeline', \"const VERSION = '0.3.0';\", \"const REPORT_SCHEMA_VERSION = '0.3.0';\", \"id: 'information-structure'\", \"id: 'media-forensic-sweep'\", \"id: 'audio-signal-forensics'\", \"id: 'raster-steganalysis'\", \"id: 'cubic-decryptor-search'\", \"id: 'binary-cube-attack-suite'\", 'BinaryCubeCubicDecryptorEngine', 'recommendedAttemptBudget', 'resolveCalibrationSnapshot',""",
    'Scientific Tools validator Cubic diagnostic ownership'
)
replace_once(
    validator,
    """  'Diagnostic Evaluation Pipeline', 'Asset Presence Index', 'Certainty Index', 'Coverage Index', 'Unresolved Evidence Index', 'Undetected / Miss-Risk Index', 'unresolved / miss-risk', 'Calibration provenance', 'Calibration boundary', 'calibrationStatus', 'runtime prior', 'Specialist handoff', 'Export JSON Report'
""",
    """  'Diagnostic Evaluation Pipeline', 'Asset Presence Index', 'Certainty Index', 'Coverage Index', 'Unresolved Evidence Index', 'Undetected / Miss-Risk Index', 'unresolved / miss-risk', 'Calibration provenance', 'Calibration boundary', 'calibrationStatus', 'runtime prior', 'Specialist handoff', 'Continue in Cubic Decryptor', 'openCubicDecryptor', 'Export JSON Report'
""",
    'Scientific Tools validator Cubic handoff ownership'
)
replace_once(
    validator,
    """  \"const ASSET_VERSION = '20260809-cubic-decryptor-hardening-1';\", 'function loadDiagnosticPipeline()', \"loadScript('binary-cube-steganalysis-evidence-profile.js'\",""",
    """  \"const ASSET_VERSION = '20260809-cubic-decryptor-hardening-1';\", 'function loadDiagnosticPipeline()', \"loadScript('binary-cube-key-generation-research.js'\", \"loadScript('binary-cube-cubic-decryptor-engine.js'\", \"loadScript('binary-cube-steganalysis-evidence-profile.js'\",""",
    'Scientific Tools validator Cubic preload ownership'
)
replace_once(
    validator,
    "schemaVersion: '0.17.0'",
    "schemaVersion: '0.18.0'",
    'Scientific Tools ownership receipt version'
)

print('Scientific Tools Cubic cache seal applied or already present.')
