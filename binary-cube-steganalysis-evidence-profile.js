(function installBinaryCubeSteganalysisEvidenceProfile(root, factory) {
  'use strict';
  const Engine = root?.BinaryCubeSteganalysisEngine
    || (typeof module === 'object' && module.exports && typeof require === 'function' ? require('./binary-cube-steganalysis-engine.js') : null);
  const api = factory(Engine);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubeSteganalysisEvidenceProfile = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeSteganalysisEvidenceProfile(Engine) {
  'use strict';

  if (!Engine) throw new Error('Steganalysis evidence profile requires BinaryCubeSteganalysisEngine.');

  const VERSION = '0.1.0';
  const DEFAULT_CHANNELS = Object.freeze(['r', 'g', 'b', 'luma']);
  const LEGACY_MIXED_THRESHOLD = 0.12;
  const LEGACY_POSITIVE_THRESHOLD = 0.35;

  const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, Number(value) || 0));
  const finite = value => Number.isFinite(Number(value));

  function mean(valuesValue) {
    const values = Array.from(valuesValue || []).filter(finite).map(Number);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }

  function median(valuesValue) {
    const values = Array.from(valuesValue || []).filter(finite).map(Number).sort((a, b) => a - b);
    if (!values.length) return null;
    const middle = Math.floor(values.length / 2);
    return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
  }

  function maximum(valuesValue) {
    const values = Array.from(valuesValue || []).filter(finite).map(Number);
    return values.length ? Math.max(...values) : null;
  }

  function minimum(valuesValue) {
    const values = Array.from(valuesValue || []).filter(finite).map(Number);
    return values.length ? Math.min(...values) : null;
  }

  function summarizeRegion(analysisValue) {
    const analysis = analysisValue || {};
    const rs = analysis.rs || null;
    const spa = analysis.spa || null;
    const estimates = [rs?.valid ? rs.estimatedPayloadRate : null, spa?.valid ? spa.estimatedPayloadRate : null].filter(finite).map(Number);
    const consensus = finite(analysis.payloadEstimateConsensus) ? Number(analysis.payloadEstimateConsensus) : median(estimates);
    const agreement = finite(analysis.detectorAgreement) ? clamp(analysis.detectorAgreement) : estimates.length >= 2 ? clamp(1 - Math.abs(estimates[0] - estimates[1])) : null;
    const legacyScalar = consensus == null ? 0 : clamp(consensus * (agreement == null ? 0.35 : agreement));
    const legacyStatus = !estimates.length ? 'inconclusive' : legacyScalar >= LEGACY_POSITIVE_THRESHOLD ? 'positive' : legacyScalar >= LEGACY_MIXED_THRESHOLD ? 'mixed' : 'negative';
    return Object.freeze({
      validEstimatorCount: estimates.length,
      rs: Object.freeze({ valid: Boolean(rs?.valid), payloadEstimate: rs?.estimatedPayloadRate ?? null, changedSampleEstimate: rs?.estimatedChangedSampleRate ?? null, groups: Number(rs?.groups || 0), initialBias: Number(rs?.initialBias || 0) }),
      spa: Object.freeze({ valid: Boolean(spa?.valid), payloadEstimate: spa?.estimatedPayloadRate ?? null, changedSampleEstimate: spa?.estimatedChangedSampleRate ?? null, pairs: Number(spa?.counts?.pairs || 0), traceImbalance: Number(spa?.traceImbalance || 0), preconditions: spa?.preconditions || null }),
      payloadEstimateConsensus: consensus,
      estimatorAgreement: agreement,
      estimatorSpread: estimates.length >= 2 ? Math.abs(estimates[0] - estimates[1]) : null,
      lsb: Object.freeze({ oneFraction: Number(analysis.lsb?.oneFraction || 0), entropy: Number(analysis.lsb?.entropy || 0), transitionFraction: Number(analysis.lsb?.transitionFraction || 0) }),
      pairEqualization: Object.freeze({ normalizedChiSquare: Number(analysis.chi?.normalized || 0), usedPairs: Number(analysis.chi?.usedPairs || 0) }),
      residual: Object.freeze({ roughness: Number(analysis.residualRoughness || 0), cooccurrenceEntropy: Number(analysis.residualCooccurrence?.entropy || 0), diagonalFraction: Number(analysis.residualCooccurrence?.diagonalFraction || 0), symmetryError: Number(analysis.residualCooccurrence?.symmetryError || 0), pairs: Number(analysis.residualCooccurrence?.pairs || 0) }),
      legacyPayloadMagnitudeEvidence: legacyScalar,
      legacyStatus,
      boundary: 'RS and SPA values are payload estimators under specific randomized-LSB assumptions. The legacy scalar is retained only for comparison with Diagnostic Pipeline 0.2.x behavior; it is not a calibrated probability or a universal steganography detector score.'
    });
  }

  function summarizeTiles(reportValue) {
    const tiles = Array.from(reportValue?.tiles || []);
    const summaries = tiles.map(tile => Object.freeze({ x: tile.x, y: tile.y, width: tile.width, height: tile.height, ...summarizeRegion(tile.analysis) }));
    const payloads = summaries.map(item => item.payloadEstimateConsensus).filter(finite);
    const legacy = summaries.map(item => item.legacyPayloadMagnitudeEvidence).filter(finite);
    return Object.freeze({
      count: summaries.length,
      payloadEstimate: Object.freeze({ minimum: minimum(payloads), median: median(payloads), mean: mean(payloads), maximum: maximum(payloads) }),
      legacyScalar: Object.freeze({ minimum: minimum(legacy), median: median(legacy), mean: mean(legacy), maximum: maximum(legacy) }),
      tiles: Object.freeze(summaries)
    });
  }

  function channelRecord(reportValue) {
    const report = reportValue || {};
    return Object.freeze({
      channel: String(report.channel || ''),
      global: summarizeRegion(report.global),
      localization: summarizeTiles(report)
    });
  }

  function crossChannelSummary(recordsValue) {
    const records = Array.from(recordsValue || []);
    const payloadRows = records.filter(row => finite(row.global?.payloadEstimateConsensus));
    const payloads = payloadRows.map(row => row.global.payloadEstimateConsensus);
    const legacyRows = records.filter(row => finite(row.global?.legacyPayloadMagnitudeEvidence));
    const legacy = legacyRows.map(row => row.global.legacyPayloadMagnitudeEvidence);
    const agreements = records.map(row => row.global?.estimatorAgreement).filter(finite);
    const lsbEntropies = records.map(row => row.global?.lsb?.entropy).filter(finite);
    const chi = records.map(row => row.global?.pairEqualization?.normalizedChiSquare).filter(finite);
    const roughness = records.map(row => row.global?.residual?.roughness).filter(finite);
    const bestPayload = payloadRows.length ? payloadRows.reduce((best, row) => row.global.payloadEstimateConsensus > best.global.payloadEstimateConsensus ? row : best, payloadRows[0]) : null;
    const bestLegacy = legacyRows.length ? legacyRows.reduce((best, row) => row.global.legacyPayloadMagnitudeEvidence > best.global.legacyPayloadMagnitudeEvidence ? row : best, legacyRows[0]) : null;
    return Object.freeze({
      channelCount: records.length,
      validPayloadChannels: payloadRows.length,
      payloadEstimateRange: payloads.length ? maximum(payloads) - minimum(payloads) : null,
      payloadEstimateMedian: median(payloads),
      maximumPayloadEstimate: maximum(payloads),
      maximumPayloadChannel: bestPayload?.channel || null,
      legacyScalarRange: legacy.length ? maximum(legacy) - minimum(legacy) : null,
      maximumLegacyScalar: maximum(legacy),
      maximumLegacyChannel: bestLegacy?.channel || null,
      estimatorAgreementRange: agreements.length ? maximum(agreements) - minimum(agreements) : null,
      lsbEntropyRange: lsbEntropies.length ? maximum(lsbEntropies) - minimum(lsbEntropies) : null,
      pairChiSquareRange: chi.length ? maximum(chi) - minimum(chi) : null,
      residualRoughnessRange: roughness.length ? maximum(roughness) - minimum(roughness) : null
    });
  }

  function diagnosticFlags(recordsValue, crossValue) {
    const records = Array.from(recordsValue || []);
    const cross = crossValue || crossChannelSummary(records);
    const flags = [];
    for (const record of records) {
      const global = record.global || {};
      if (global.validEstimatorCount === 1) flags.push(Object.freeze({ channel: record.channel, id: 'single-valid-estimator', detail: 'Only one of RS/SPA met its validity criteria; payload consensus is underconstrained.' }));
      if (finite(global.estimatorAgreement) && global.estimatorAgreement < 0.5) flags.push(Object.freeze({ channel: record.channel, id: 'estimator-disagreement', detail: 'RS and SPA estimates materially disagree under their respective assumptions.' }));
      if (global.legacyStatus === 'negative' && finite(global.payloadEstimateConsensus) && global.payloadEstimateConsensus >= 0.02) flags.push(Object.freeze({ channel: record.channel, id: 'nonzero-below-legacy-threshold', detail: 'Payload estimators are nonzero while the legacy magnitude-weighted scalar remains negative.' }));
      const localizedMax = record.localization?.payloadEstimate?.maximum;
      if (finite(localizedMax) && finite(global.payloadEstimateConsensus) && localizedMax - global.payloadEstimateConsensus >= 0.12) flags.push(Object.freeze({ channel: record.channel, id: 'localized-global-divergence', detail: 'At least one tile has a substantially larger payload estimate than the global channel estimate.' }));
    }
    if (finite(cross.payloadEstimateRange) && cross.payloadEstimateRange >= 0.12) flags.push(Object.freeze({ channel: null, id: 'cross-channel-payload-divergence', detail: 'Payload estimates differ materially across R/G/B/luma views.' }));
    return Object.freeze(flags);
  }

  function profileRaster(rgbaValue, widthValue, heightValue, options = {}) {
    const width = Math.max(1, Math.floor(Number(widthValue) || 1));
    const height = Math.max(1, Math.floor(Number(heightValue) || 1));
    const channels = Array.from(options.channels || DEFAULT_CHANNELS, value => String(value || '').toLowerCase()).filter((value, index, array) => value && array.indexOf(value) === index);
    const tileSize = Math.max(16, Math.min(512, Math.floor(Number(options.tileSize) || Engine.constants?.DEFAULT_TILE_SIZE || 64)));
    const records = channels.map(channel => channelRecord(Engine.localizedRasterAnalysis(rgbaValue, width, height, { channel, tileSize })));
    const crossChannel = crossChannelSummary(records);
    const flags = diagnosticFlags(records, crossChannel);
    return Object.freeze({
      format: 'hb-ttrpg-steganalysis-raster-evidence-profile',
      schemaVersion: VERSION,
      engineVersion: Engine.version || Engine.constants?.VERSION || null,
      width,
      height,
      tileSize,
      channels: Object.freeze(records),
      crossChannel,
      diagnosticFlags: flags,
      interpretation: Object.freeze({
        payloadEstimation: 'RS/SPA payload estimates remain estimator outputs and are not promoted to posterior probabilities.',
        channelComparison: 'R/G/B/luma differences are diagnostic structure. Channel asymmetry can motivate follow-up but is not by itself evidence of intentional embedding.',
        localization: 'Tile extrema are exploratory measurements subject to multiple-comparison effects; they are not independent positive detections.',
        residuals: 'LSB entropy, pair equalization, residual roughness, and co-occurrence remain separate forensic features until corpus calibration supports a combined rule.'
      }),
      boundary: 'This profile intentionally returns an evidence vector rather than a new universal steganography score. It delegates RS, SPA, LSB, residual, and localized measurements to BinaryCubeSteganalysisEngine and does not change production detection thresholds.'
    });
  }

  return Object.freeze({
    version: VERSION,
    profileRaster,
    summarizeRegion,
    summarizeTiles,
    crossChannelSummary,
    diagnosticFlags,
    constants: Object.freeze({ VERSION, DEFAULT_CHANNELS, LEGACY_MIXED_THRESHOLD, LEGACY_POSITIVE_THRESHOLD })
  });
});
