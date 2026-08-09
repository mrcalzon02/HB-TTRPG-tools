/* Dedicated worker for the Communication Capacity Analyzer.
 * It imports the authoritative analyzer and calls its exported analysis API;
 * no communication/statistical model is duplicated here.
 */
'use strict';

importScripts('binary-cube-communication-capacity-analyzer.js?v=20260809-communication-capacity-2');

const Analyzer = self.BinaryCubeCommunicationCapacityAnalyzer;
if (!Analyzer?.analyzeCommunicationCapacity) {
  throw new Error('Authoritative Communication Capacity Analyzer did not initialize inside the worker.');
}

self.addEventListener('message', event => {
  const request = event.data || {};
  const id = Number(request.id);
  if (!Number.isInteger(id)) return;
  try {
    const bytes = request.bytes instanceof Uint8Array
      ? request.bytes
      : new Uint8Array(request.bytes || 0);
    self.postMessage({ type: 'progress', id, stage: 'Analyzing symbolic organizations', fraction: 0.08 });
    const report = Analyzer.analyzeCommunicationCapacity(bytes, request.options || {});
    self.postMessage({ type: 'progress', id, stage: 'Serializing analysis report', fraction: 0.96 });
    self.postMessage({ type: 'result', id, report });
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: {
        name: error?.name || 'Error',
        message: error?.message || String(error),
        stack: error?.stack || ''
      }
    });
  }
});
