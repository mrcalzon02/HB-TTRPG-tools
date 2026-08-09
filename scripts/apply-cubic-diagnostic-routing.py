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


pipeline = 'binary-cube-diagnostic-pipeline.js'
panel = 'binary-cube-diagnostic-pipeline-panel.js'
workspace = 'scientific-tools-entry.js'
validator = 'scripts/validate-scientific-diagnostic-pipeline.mjs'

replace_once(pipeline,
"""    Object.freeze({ id: 'deobfuscation-sweep', stage: 3, order: 80, family: 'deobfuscation', independenceGroup: 'transform-search', cost: 'high', profiles: ['thorough','exhaustive'] }),
    Object.freeze({ id: 'binary-cube-attack-suite', stage: 3, order: 90, family: 'binary-cube', independenceGroup: 'cryptanalytic-attack', cost: 'high', profiles: ['exhaustive'] })
""",
"""    Object.freeze({ id: 'deobfuscation-sweep', stage: 3, order: 80, family: 'deobfuscation', independenceGroup: 'transform-search', cost: 'high', profiles: ['thorough','exhaustive'] }),
    Object.freeze({ id: 'cubic-decryptor-search', stage: 3, order: 90, family: 'binary-cube', independenceGroup: 'cryptanalytic-key-search', cost: 'bounded-high', profiles: ['exhaustive'] }),
    Object.freeze({ id: 'binary-cube-attack-suite', stage: 3, order: 95, family: 'binary-cube', independenceGroup: 'cryptanalytic-attack', cost: 'high', profiles: ['exhaustive'] })
""",
'diagnostic Cubic detector registration')

replace_once(pipeline,
"""      cubeDashboard: root?.BinaryCubeDecryptionDashboard || optionalRequire('./binary-cube-decryption-dashboard.js'),
      calibration: root?.BinaryCubeDiagnosticCalibrationRegistry || optionalRequire('./binary-cube-diagnostic-calibration-registry.js'),
""",
"""      cubeDashboard: root?.BinaryCubeDecryptionDashboard || optionalRequire('./binary-cube-decryption-dashboard.js'),
      cubicDecryptor: root?.BinaryCubeCubicDecryptorEngine || optionalRequire('./binary-cube-cubic-decryptor-engine.js'),
      calibration: root?.BinaryCubeDiagnosticCalibrationRegistry || optionalRequire('./binary-cube-diagnostic-calibration-registry.js'),
""",
'diagnostic Cubic dependency')

replace_once(pipeline,
"""      case 'deobfuscation-sweep': return Object.freeze({ applicable: Boolean(deps.information?.rankDeobfuscationCandidates), weight: 1.1, reason: deps.information?.rankDeobfuscationCandidates ? 'Thorough profile tests reversible encodings and obfuscation hypotheses.' : 'Deobfuscation engine unavailable.' });
      case 'binary-cube-attack-suite': return Object.freeze({ applicable: classification.classId === 'binary-cube-artifact' && Boolean(deps.cubeDashboard?.runAttackSuite), weight: 1.2, reason: classification.classId === 'binary-cube-artifact' ? 'Exhaustive profile runs bounded Binary Cube cryptanalytic attacks.' : 'Not a Binary Cube artifact.' });
""",
"""      case 'deobfuscation-sweep': return Object.freeze({ applicable: Boolean(deps.information?.rankDeobfuscationCandidates), weight: 1.1, reason: deps.information?.rankDeobfuscationCandidates ? 'Thorough profile tests reversible encodings and obfuscation hypotheses.' : 'Deobfuscation engine unavailable.' });
      case 'cubic-decryptor-search': {
        const canonicalPackage = classification.classId === 'binary-cube-artifact' && classification.subtype === 'binary-cube-package';
        const ready = Boolean(deps.cubicDecryptor?.buildSearchPlan && deps.cubicDecryptor?.parsePackage);
        return Object.freeze({ applicable: canonicalPackage && ready, weight: 1.25, reason: !canonicalPackage ? 'Not a canonical Binary Cube package.' : ready ? 'Canonical package metadata can define a deterministic Cubic Decryptor search plan without starting an unbounded brute-force job.' : 'Cubic Decryptor search engine unavailable.' });
      }
      case 'binary-cube-attack-suite': {
        const canonicalPackage = classification.classId === 'binary-cube-artifact' && classification.subtype === 'binary-cube-package';
        const cubicReady = Boolean(deps.cubicDecryptor?.buildSearchPlan && deps.cubicDecryptor?.parsePackage);
        const fallback = classification.classId === 'binary-cube-artifact' && (!canonicalPackage || !cubicReady);
        return Object.freeze({ applicable: fallback && Boolean(deps.cubeDashboard?.runAttackSuite), weight: 1.2, reason: classification.classId !== 'binary-cube-artifact' ? 'Not a Binary Cube artifact.' : canonicalPackage && cubicReady ? 'Canonical package search is owned by the Cubic Decryptor stage.' : 'Legacy/secure-export artifact retains the bounded dashboard attack fallback.' });
      }
""",
'diagnostic Cubic routing applicability')

replace_once(pipeline,
"""    if (definition.id === 'binary-cube-attack-suite') {
      const source = deps.cubeDashboard.parseSourceBytes(bytes, sourceName);
""",
"""    if (definition.id === 'cubic-decryptor-search') {
      const source = deps.cubicDecryptor.parsePackage(classification.artifact);
      if (!source) return finding(definition, { status: 'inconclusive', reliability: 0.1, sampleSufficiency: 0, missRiskEvidence: 1, notes: ['The asset was classified as a canonical Binary Cube package but the Cubic Decryptor could not parse it into a deterministic search source.'], sensitivity: ['candidate-key-generators','seed-ranges','orientation-variants','payload-capacity-variants'] });
      const seedEnd = Math.max(0, Math.floor(Number(options.cubicSeedEnd ?? deps.cubicDecryptor.constants.DEFAULT_SEED_END)));
      const searchOptions = {
        profiles: [...deps.cubicDecryptor.constants.PROFILE_ORDER],
        usePackageMetadata: true,
        maxGridSize: Number(classification.artifact?.gridSize) || 64,
        seedStart: 0,
        seedEnd,
        seedTemplates: Array.from(options.cubicSeedTemplates || ['{n}']),
        includeFixedSeeds: true,
        orientationMode: 'manual',
        capacityMode: 'manual'
      };
      const searchPlan = deps.cubicDecryptor.buildSearchPlan(source, searchOptions);
      const firstStage = searchPlan.stages[0] || null;
      const requestedBudget = Math.max(1, Math.floor(Number(options.cubicAttemptBudget) || 2048));
      const recommendedAttemptBudget = Math.min(requestedBudget, firstStage?.attempts || 0);
      const firstStageCoverageFraction = firstStage?.attempts ? recommendedAttemptBudget / firstStage.attempts : 0;
      const fullPlanCoverageFraction = searchPlan.totalAttempts ? recommendedAttemptBudget / searchPlan.totalAttempts : 0;
      const identityStrength = classification.artifact?.keyDigest ? 'sha256' : 'legacy-fnv1a32';
      return finding(definition, {
        status: 'inconclusive',
        positiveEvidence: 0,
        negativeEvidence: 0,
        missRiskEvidence: searchPlan.totalAttempts ? 0.72 : 1,
        reliability: 1,
        sampleSufficiency: 1,
        metrics: {
          planId: searchPlan.planId,
          stageCount: searchPlan.stages.length,
          totalAttempts: searchPlan.totalAttempts,
          firstStageId: firstStage?.id || null,
          firstStageAttempts: firstStage?.attempts || 0,
          recommendedAttemptBudget,
          firstStageCoverageFraction,
          fullPlanCoverageFraction,
          seedStart: searchPlan.seedStart,
          seedEnd: searchPlan.seedEnd,
          identityStrength
        },
        notes: ['A deterministic Cubic Decryptor plan was constructed from canonical package metadata. The diagnostic pipeline does not silently exhaust this brute-force domain; continue in the Cubic Decryptor Tool to execute, pause, checkpoint, and resume the search.', 'Failure to execute the full plan remains explicit miss-risk rather than negative evidence.'],
        sensitivity: ['candidate-key-generators','seed-ranges','orientation-variants','payload-capacity-variants','deterministic-search-plan'],
        raw: { plan: searchPlan, recommendedAttemptBudget }
      });
    }
    if (definition.id === 'binary-cube-attack-suite') {
      const source = deps.cubeDashboard.parseSourceBytes(bytes, sourceName);
""",
'diagnostic Cubic plan execution')

replace_once(panel,
"""    if (kind === 'steganalysis') return workspace?.openSteganalysisLab?.(null, { bytes: activeBytes, sourceName: activeName, mimeType: activeMime });
    if (kind === 'cube') {
""",
"""    if (kind === 'steganalysis') return workspace?.openSteganalysisLab?.(null, { bytes: activeBytes, sourceName: activeName, mimeType: activeMime });
    if (kind === 'cubic') {
      const Dashboard = window.BinaryCubeDecryptionDashboard;
      const source = Dashboard?.parseSourceBytes?.(activeBytes, activeName);
      if (!source) throw new Error('The loaded source could not be prepared for the Cubic Decryptor.');
      if (source.kind === 'binary-cube-package') return workspace?.openCubicDecryptor?.(null, { package: source.artifact, sourceName: activeName });
      return workspace?.openCubicDecryptor?.(null, { bits: source.bits, sourceName: activeName });
    }
    if (kind === 'cube') {
""",
'diagnostic Cubic handoff')

replace_once(panel,
"""<button type=\"button\" data-bcdp-handoff=\"information\">Information / Deobfuscation</button><button type=\"button\" data-bcdp-handoff=\"cube\">Binary Cube Dashboard</button>""",
"""<button type=\"button\" data-bcdp-handoff=\"information\">Information / Deobfuscation</button><button type=\"button\" data-bcdp-handoff=\"cubic\">Continue in Cubic Decryptor</button><button type=\"button\" data-bcdp-handoff=\"cube\">Binary Cube Dashboard</button>""",
'diagnostic Cubic handoff button')

replace_once(workspace,
"""      await Promise.all([loadDecryptionDashboard(), loadInformationAnalysisSuite(), loadMediaForensicsSuite(), loadSteganalysisLab()]);
      await loadStyle('binary-cube-diagnostic-pipeline.css');
      await loadScript('binary-cube-steganalysis-evidence-profile.js', () => Boolean(window.BinaryCubeSteganalysisEvidenceProfile));
""",
"""      await Promise.all([loadDecryptionDashboard(), loadInformationAnalysisSuite(), loadMediaForensicsSuite(), loadSteganalysisLab()]);
      await loadStyle('binary-cube-diagnostic-pipeline.css');
      await loadScript('binary-cube-key-generation-research.js', () => Boolean(window.BinaryCubeKeyGenerationResearch));
      await loadScript('binary-cube-cubic-decryptor-engine.js', () => Boolean(window.BinaryCubeCubicDecryptorEngine));
      await loadScript('binary-cube-steganalysis-evidence-profile.js', () => Boolean(window.BinaryCubeSteganalysisEvidenceProfile));
""",
'Scientific Tools diagnostic Cubic preload')

replace_once(validator,
"""const Pipeline = require(path.join(root, 'binary-cube-diagnostic-pipeline.js'));

assert.equal(Pipeline.version, '0.3.0');
""",
"""const Pipeline = require(path.join(root, 'binary-cube-diagnostic-pipeline.js'));
const Engine = require(path.join(root, 'shadowrun-binary-cube-engine.js'));
const Research = require(path.join(root, 'binary-cube-key-generation-research.js'));

assert.equal(Pipeline.version, '0.3.0');
""",
'diagnostic validator canonical dependencies')

replace_once(validator,
"""assert.ok(cubeScheduled.includes('binary-cube-structure'));
assert.ok(cubeScheduled.includes('binary-cube-attack-suite'));

const progress = [];
""",
"""assert.ok(cubeScheduled.includes('binary-cube-structure'));
assert.ok(cubeScheduled.includes('cubic-decryptor-search'));
assert.ok(!cubeScheduled.includes('binary-cube-attack-suite'), 'Canonical packages must route to the Cubic Decryptor rather than the legacy dashboard attack suite when Cubic is available.');

const cubicPlaintext = Array.from(Buffer.from('Diagnostic Cubic routing fixture', 'utf8'), byte => byte.toString(2).padStart(8, '0')).join('');
const cubicKey = Research.generateResearchKey('iterative-chain', '437', 4, { inputFace: 'top', outputFace: 'front', inputQuarterTurns: 0, outputQuarterTurns: 0, maskDensity: 0.75 });
const cubicPackage = Engine.encryptBinary(cubicPlaintext, cubicKey);
const cubicBytes = new TextEncoder().encode(JSON.stringify(cubicPackage));
const cubicReport = await Pipeline.runPipeline(cubicBytes, { profile: 'exhaustive', sourceName: 'cubic-package.json', cubicSeedEnd: 500, cubicAttemptBudget: 128 });
const cubicFinding = cubicReport.findings.find(item => item.detectorId === 'cubic-decryptor-search');
assert.ok(cubicFinding, 'Exhaustive canonical-package diagnostics must construct a Cubic Decryptor search plan.');
assert.equal(cubicFinding.status, 'inconclusive');
assert.equal(cubicFinding.metrics.identityStrength, 'sha256');
assert.equal(cubicFinding.metrics.seedEnd, 500);
assert.ok(cubicFinding.metrics.planId);
assert.ok(cubicFinding.metrics.totalAttempts >= 501);
assert.ok(cubicFinding.metrics.recommendedAttemptBudget > 0 && cubicFinding.metrics.recommendedAttemptBudget <= 128);
assert.ok(cubicFinding.metrics.fullPlanCoverageFraction < 1);
assert.ok(cubicFinding.missRiskEvidence > 0.5, 'An unexecuted Cubic search domain must remain explicit miss-risk.');
assert.ok(!cubicReport.findings.some(item => item.detectorId === 'binary-cube-attack-suite'), 'Canonical package execution must not duplicate the legacy dashboard attack suite.');

const progress = [];
""",
'diagnostic validator Cubic routing behavior')

replace_once(validator,
"""for (const required of [\"id: 'information-structure'\", \"id: 'media-forensic-sweep'\", \"id: 'audio-signal-forensics'\", \"id: 'raster-steganalysis'\", \"id: 'binary-cube-attack-suite'\", 'resolveCalibrationSnapshot', 'calibrationStatus', 'calibrationIndex', 'async function runConcurrent(', 'for (const stage of plan.stages)', 'decodeBinaryFsk', 'decodeDtmf', 'not posterior probabilities']) assert.ok(source.includes(required), `Pipeline source missing ${JSON.stringify(required)}.`);
""",
"""for (const required of [\"id: 'information-structure'\", \"id: 'media-forensic-sweep'\", \"id: 'audio-signal-forensics'\", \"id: 'raster-steganalysis'\", \"id: 'cubic-decryptor-search'\", \"id: 'binary-cube-attack-suite'\", 'BinaryCubeCubicDecryptorEngine', 'recommendedAttemptBudget', 'resolveCalibrationSnapshot', 'calibrationStatus', 'calibrationIndex', 'async function runConcurrent(', 'for (const stage of plan.stages)', 'decodeBinaryFsk', 'decodeDtmf', 'not posterior probabilities']) assert.ok(source.includes(required), `Pipeline source missing ${JSON.stringify(required)}.`);
""",
'diagnostic validator Cubic source contract')

replace_once(validator,
"""for (const required of ['Diagnostic Evaluation Pipeline', 'Asset Presence Index', 'Certainty Index', 'Coverage Index', 'Undetected / Miss-Risk Index', 'Specialist handoff', 'Export JSON Report']) assert.ok(panel.includes(required), `Pipeline panel missing ${JSON.stringify(required)}.`);
""",
"""for (const required of ['Diagnostic Evaluation Pipeline', 'Asset Presence Index', 'Certainty Index', 'Coverage Index', 'Undetected / Miss-Risk Index', 'Specialist handoff', 'Continue in Cubic Decryptor', 'openCubicDecryptor', 'Export JSON Report']) assert.ok(panel.includes(required), `Pipeline panel missing ${JSON.stringify(required)}.`);
""",
'diagnostic validator Cubic panel contract')

replace_once(validator,
"""console.log(JSON.stringify({ format: 'hb-ttrpg-scientific-diagnostic-pipeline-validation-receipt', schemaVersion: '0.3.0', pass: true, profiles: Object.keys(Pipeline.constants.PROFILES), deterministicStageOrder: true, concurrentWithinStage: true, automaticRouting: true, calibratedDetectorLedger: true, audioSignalRouting: true, evidenceIndicesAreNotProbabilities: true, unresolvedMethodsIncreaseMissRisk: true, localNodeRunner: true, sharedLocalPngPixelDecoder: true, findings: textReport.findings.length }, null, 2));
""",
"""console.log(JSON.stringify({ format: 'hb-ttrpg-scientific-diagnostic-pipeline-validation-receipt', schemaVersion: '0.3.0', pass: true, profiles: Object.keys(Pipeline.constants.PROFILES), deterministicStageOrder: true, concurrentWithinStage: true, automaticRouting: true, calibratedDetectorLedger: true, audioSignalRouting: true, cubicSearchRouting: true, cubicSearchPlanId: cubicFinding.metrics.planId, cubicSearchBudget: cubicFinding.metrics.recommendedAttemptBudget, evidenceIndicesAreNotProbabilities: true, unresolvedMethodsIncreaseMissRisk: true, localNodeRunner: true, sharedLocalPngPixelDecoder: true, findings: textReport.findings.length }, null, 2));
""",
'diagnostic validator Cubic receipt')

print('Cubic diagnostic routing migration applied or already present.')
