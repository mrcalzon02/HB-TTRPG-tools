#!/usr/bin/env python3
from pathlib import Path


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
    'binary-cube-diagnostic-pipeline.js',
    """  function normalizeProfile(profileValue) {
    const id = String(profileValue || 'thorough').toLowerCase();
    return PROFILES[id] || PROFILES.thorough;
  }
""",
    """  function normalizeProfile(profileValue) {
    const raw = profileValue && typeof profileValue === 'object' ? profileValue.id : profileValue;
    const id = String(raw || 'thorough').toLowerCase();
    return PROFILES[id] || PROFILES.thorough;
  }
""",
    'Diagnostic profile normalization'
)

replace_once(
    'scripts/validate-scientific-diagnostic-pipeline.mjs',
    """const progress = [];
const textReport = await Pipeline.runPipeline(text, { profile: 'triage', sourceName: 'control.txt', mimeType: 'text/plain', onProgress: update => progress.push(update) });
assert.equal(textReport.format, Pipeline.constants.REPORT_FORMAT);
""",
    """const progress = [];
const textReport = await Pipeline.runPipeline(text, { profile: 'triage', sourceName: 'control.txt', mimeType: 'text/plain', onProgress: update => progress.push(update) });
assert.equal(textReport.profile.id, 'triage');
assert.deepEqual(textReport.plan.profile, Pipeline.constants.PROFILES.triage, 'runPipeline must preserve the requested Triage routing profile instead of silently re-normalizing it to Thorough.');
assert.ok(!textReport.plan.detectors.find(item => item.id === 'deobfuscation-sweep').applicable, 'Triage execution must not schedule Thorough-only deobfuscation.');
assert.equal(textReport.format, Pipeline.constants.REPORT_FORMAT);
""",
    'Diagnostic Triage execution regression'
)

replace_once(
    'scripts/validate-scientific-diagnostic-pipeline.mjs',
    """const cubicFinding = cubicReport.findings.find(item => item.detectorId === 'cubic-decryptor-search');
assert.ok(cubicFinding, 'Exhaustive canonical-package diagnostics must construct a Cubic Decryptor search plan.');
""",
    """assert.equal(cubicReport.profile.id, 'exhaustive');
assert.deepEqual(cubicReport.plan.profile, Pipeline.constants.PROFILES.exhaustive, 'runPipeline must preserve the requested Exhaustive routing profile.');
const cubicFinding = cubicReport.findings.find(item => item.detectorId === 'cubic-decryptor-search');
assert.ok(cubicFinding, 'Exhaustive canonical-package diagnostics must construct a Cubic Decryptor search plan.');
""",
    'Diagnostic Exhaustive execution regression'
)

print('Diagnostic profile normalization repair applied or already present.')
