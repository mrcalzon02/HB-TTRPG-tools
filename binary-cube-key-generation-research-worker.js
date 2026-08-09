/* Binary Cube key-generation research worker.
 * Candidate generation and structural diagnostics run off the browser main thread.
 * The worker delegates to the shared research model, which in turn delegates key
 * validation, fingerprints, masks, encryption, and collision proofs to the canonical engine.
 */
'use strict';

importScripts(
  'shadowrun-binary-cube-engine.js?v=20260809-key-profile-visualizer-1',
  'binary-cube-key-generation-research.js?v=20260809-key-profile-visualizer-1'
);

const Research = self.BinaryCubeKeyGenerationResearch;
if (!Research) throw new Error('Binary Cube key-generation research model did not initialize inside the worker.');

function progress(id, stage, fraction, detail = '') {
  self.postMessage({ type: 'progress', id, stage, fraction, detail });
}

function execute(id, operation, payload = {}) {
  if (operation !== 'compare-profiles') throw new Error(`Unknown key-generation research operation: ${operation}`);
  const profiles = Array.isArray(payload.profiles) && payload.profiles.length
    ? payload.profiles.map(String)
    : Research.constants.PROFILES;
  const seed = String(payload.seed ?? 'binary-cube-profile-structure-demo');
  const gridSize = Number(payload.gridSize ?? 64);
  const sampleResolution = Number(payload.sampleResolution ?? 32);
  const snapshots = [];

  for (let index = 0; index < profiles.length; index += 1) {
    const profile = profiles[index];
    progress(id, `Generating ${profile}`, index / Math.max(1, profiles.length), `${index + 1} of ${profiles.length}`);
    snapshots.push(Research.buildProfileSnapshot(profile, seed, gridSize, { sampleResolution }));
  }

  progress(id, 'Comparison complete', 1, `${profiles.length} profiles`);
  return {
    format: 'hb-ttrpg-binary-cube-key-generation-structure-snapshot',
    schemaVersion: Research.constants.RESEARCH_SCHEMA_VERSION,
    seed,
    gridSize,
    profiles: snapshots,
    interpretationBoundary: 'Adjacency remains visible as one diagnostic. Ignoring it does not ignore axis leakage, regional predictability, fixed-position concentration, displacement structure, or other measured regularity.'
  };
}

self.addEventListener('message', event => {
  const request = event.data || {};
  const id = request.id;
  if (!Number.isInteger(id)) return;
  try {
    const result = execute(id, String(request.operation || ''), request.payload || {});
    self.postMessage({ type: 'result', id, result });
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
