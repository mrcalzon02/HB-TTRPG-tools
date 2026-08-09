'use strict';

importScripts('binary-cube-steganalysis-engine.js?v=20260809-steganalysis-1');
importScripts('binary-cube-steganalysis-evidence-profile.js?v=20260809-raster-evidence-profile-1');
const Engine = self.BinaryCubeSteganalysisEngine;
const EvidenceProfile = self.BinaryCubeSteganalysisEvidenceProfile;
if (!Engine) throw new Error('BinaryCubeSteganalysisEngine failed to initialize in worker.');
if (!EvidenceProfile) throw new Error('BinaryCubeSteganalysisEvidenceProfile failed to initialize in worker.');

function transferableBytes(value) {
  if (value instanceof Uint8Array || value instanceof Uint8ClampedArray) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return Uint8Array.from(value || []);
}

self.addEventListener('message', event => {
  const message = event.data || {};
  const id = message.id;
  const operation = String(message.operation || '');
  try {
    self.postMessage({ id, type: 'progress', stage: 'Preparing steganalysis', fraction: 0.05 });
    let result;
    if (operation === 'localized-raster') {
      const rgba = new Uint8ClampedArray(message.rgba);
      self.postMessage({ id, type: 'progress', stage: 'Running localized RS / SPA / residual analysis', fraction: 0.25 });
      result = Engine.localizedRasterAnalysis(rgba, message.width, message.height, { tileSize: message.tileSize, channel: message.channel });
    } else if (operation === 'raster-evidence-profile') {
      const rgba = new Uint8ClampedArray(message.rgba);
      self.postMessage({ id, type: 'progress', stage: 'Running R / G / B / luma evidence-vector profiling', fraction: 0.2 });
      result = EvidenceProfile.profileRaster(rgba, message.width, message.height, { tileSize: message.tileSize, channels: message.channels });
    } else if (operation === 'compare-raster') {
      const cover = new Uint8ClampedArray(message.cover);
      const suspect = new Uint8ClampedArray(message.suspect);
      self.postMessage({ id, type: 'progress', stage: 'Comparing known cover and suspect raster', fraction: 0.3 });
      result = Engine.compareRasters(cover, suspect, message.width, message.height);
      result = { ...result, changedMask: Array.from(result.changedMask) };
    } else if (operation === 'jpeg-coefficients') {
      const bytes = transferableBytes(message.bytes);
      self.postMessage({ id, type: 'progress', stage: 'Decoding baseline JPEG coefficient stream', fraction: 0.3 });
      result = Engine.inspectJpegCoefficients(bytes);
    } else if (operation === 'raster-global') {
      const rgba = new Uint8ClampedArray(message.rgba);
      self.postMessage({ id, type: 'progress', stage: 'Running global RS / SPA analysis', fraction: 0.35 });
      result = Engine.analyzeRasterRegion(rgba, message.width, message.height, message.channel || 'luma', null);
    } else {
      throw new Error(`Unknown steganalysis worker operation: ${operation}`);
    }
    self.postMessage({ id, type: 'progress', stage: 'Finalizing evidence report', fraction: 0.95 });
    self.postMessage({ id, type: 'result', result });
  } catch (error) {
    self.postMessage({ id, type: 'error', error: { name: error?.name || 'Error', message: error?.message || String(error) } });
  }
});
