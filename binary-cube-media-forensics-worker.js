/* Dedicated worker for the Steganography, Signal & Media Forensics Suite.
 * The worker imports the authoritative suite and delegates analysis to it.
 * It intentionally contains no duplicate steganography, convolution, or audio math.
 */
'use strict';

importScripts('binary-cube-media-forensics-suite.js?v=20260809-media-forensics-1');

const Suite = self.BinaryCubeMediaForensicsSuite;
if (!Suite?.fullForensicSweep) throw new Error('Authoritative Media Forensics Suite did not initialize inside the worker.');

self.addEventListener('message', event => {
  const request = event.data || {};
  const id = Number(request.id);
  if (!Number.isInteger(id)) return;
  try {
    const bytes = request.bytes instanceof ArrayBuffer
      ? new Uint8Array(request.bytes)
      : request.bytes instanceof Uint8Array
        ? request.bytes
        : new Uint8Array(request.bytes || 0);
    if (request.operation !== 'full-sweep') throw new Error(`Unsupported media-forensics worker operation ${request.operation}.`);
    self.postMessage({ type: 'progress', id, stage: 'Scanning byte and bit planes', fraction: 0.12 });
    const report = Suite.fullForensicSweep(bytes);
    self.postMessage({ type: 'progress', id, stage: 'Serializing forensic report', fraction: 0.96 });
    self.postMessage({ type: 'result', id, report });
  } catch (error) {
    self.postMessage({ type: 'error', id, error: { name: error?.name || 'Error', message: error?.message || String(error), stack: error?.stack || '' } });
  }
});