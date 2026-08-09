(function installDiagnosticCalibrationBaseline(root, factory) {
  'use strict';
  const Registry = root?.BinaryCubeDiagnosticCalibrationRegistry
    || (typeof module === 'object' && module.exports && typeof require === 'function' ? require('./binary-cube-diagnostic-calibration-registry.js') : null);
  const api = factory(Registry);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubeDiagnosticCalibrationBaseline = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createDiagnosticCalibrationBaseline(Registry) {
  'use strict';

  if (!Registry) throw new Error('Diagnostic calibration baseline requires BinaryCubeDiagnosticCalibrationRegistry.');
  const VERSION = '20260809-ground-truth-1';
  const SOURCE_PIPELINE_VERSION = '0.2.0';
  const SOURCE_REGISTRY_VERSION = '0.1.0';
  const SOURCE_CI_RUN = 31328335871;
  const SOURCE_COMMIT = '803bae67943a420fde496aec58e9f0cd6b02b59a';

  const receipts = Object.freeze([
    Object.freeze({ fixtureId: 'clean-control', detectorId: 'media-forensic-sweep', concealmentFamily: 'clean-raster-control', expected: 'negative', completed: true, observedPositive: false, pass: true }),
    Object.freeze({ fixtureId: 'clean-control', detectorId: 'png-structure', concealmentFamily: 'clean-raster-control', expected: 'negative', completed: true, observedPositive: false, pass: true }),
    Object.freeze({ fixtureId: 'clean-control', detectorId: 'raster-steganalysis', concealmentFamily: 'clean-raster-control', expected: 'negative', completed: true, observedPositive: false, pass: true }),
    Object.freeze({ fixtureId: 'rgb-lsb', detectorId: 'png-structure', concealmentFamily: 'pixel-domain-lsb', expected: 'negative', completed: true, observedPositive: false, pass: true }),
    Object.freeze({ fixtureId: 'rgb-lsb', detectorId: 'raster-steganalysis', concealmentFamily: 'pixel-domain-lsb', expected: 'positive', completed: true, observedPositive: false, pass: false, observedPositiveEvidence: 0.08364196802819356, note: 'Measured false negative retained from the first calibration run. RS/SPA on this 64×64 deterministic RGB-LSB fixture did not cross the declared positive threshold.' }),
    Object.freeze({ fixtureId: 'post-iend', detectorId: 'media-forensic-sweep', concealmentFamily: 'appended-container-data', expected: 'positive', completed: true, observedPositive: true, pass: true }),
    Object.freeze({ fixtureId: 'post-iend', detectorId: 'png-structure', concealmentFamily: 'appended-container-data', expected: 'positive', completed: true, observedPositive: true, pass: true }),
    Object.freeze({ fixtureId: 'afsk1200', detectorId: 'audio-signal-forensics', concealmentFamily: 'audio-afsk', expected: 'positive', completed: true, observedPositive: true, pass: true, observedPositiveEvidence: 0.8638431269536299 }),
    Object.freeze({ fixtureId: 'dtmf', detectorId: 'audio-signal-forensics', concealmentFamily: 'audio-dtmf', expected: 'positive', completed: true, observedPositive: true, pass: true, observedPositiveEvidence: 0.8400000000000001 })
  ]);

  const snapshot = Registry.buildSnapshot(receipts, {
    generatedBy: `measured CI baseline · run ${SOURCE_CI_RUN} · commit ${SOURCE_COMMIT}`,
    corpusVersion: VERSION
  });

  return Object.freeze({
    version: VERSION,
    sourcePipelineVersion: SOURCE_PIPELINE_VERSION,
    sourceRegistryVersion: SOURCE_REGISTRY_VERSION,
    sourceCiRun: SOURCE_CI_RUN,
    sourceCommit: SOURCE_COMMIT,
    receipts,
    snapshot,
    observedPassCount: receipts.filter(item => item.pass).length,
    observedFailureCount: receipts.filter(item => !item.pass).length,
    boundary: 'This baseline is an empirical snapshot of a small deterministic corpus, not a universal detector benchmark. The RGB-LSB false negative is intentionally retained so calibration lowers confidence rather than hiding detector blindness.'
  });
});
