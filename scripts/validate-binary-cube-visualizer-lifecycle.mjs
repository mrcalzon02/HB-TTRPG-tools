import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const visualizer = read('shadowrun-binary-cube-visualizer.js');
const renderer = read('binary-cube-visualizer-renderer.js');

const checks = [];
function requireContract(label, source, pattern, detail) {
  const passed = pattern.test(source);
  checks.push({ label, passed, detail });
  if (!passed) throw new Error(`${label}: ${detail}`);
}

requireContract(
  'Visualizer panel is a singleton',
  visualizer,
  /function buildPanel\(\)\s*\{[\s\S]*?let panel = document\.getElementById\(PANEL_ID\);[\s\S]*?if \(panel\) return panel;/,
  'buildPanel must reuse the existing panel instead of attaching duplicate listeners and renderers.'
);
requireContract(
  'Panel binding is idempotent',
  visualizer,
  /function bind\(panel\)\s*\{[\s\S]*?if \(panel\.dataset\.cubeVisualizerBound === 'true'\) return;[\s\S]*?panel\.dataset\.cubeVisualizerBound = 'true';/,
  'bind must retain its dataset guard so repeated opens do not duplicate handlers.'
);
requireContract(
  'Close pauses playback before hiding',
  visualizer,
  /\[data-cube-visualizer-close\][\s\S]*?pausePlayback\(panel, false\);\s*panel\.hidden = true;/,
  'the close action must stop the animation loop before hiding the panel.'
);
requireContract(
  'Renderer installation is guarded',
  visualizer,
  /function installRenderer\(panel\)\s*\{[\s\S]*?if \(renderer \|\| rendererAvailable\) return;/,
  'installRenderer must not create a second WebGL renderer for an existing panel.'
);
requireContract(
  'Playback cancellation releases animation frames',
  visualizer,
  /function pausePlayback\(panel,[\s\S]*?cancelFrame\(playbackFrame\);[\s\S]*?playbackFrame = null;/,
  'pausePlayback must cancel and clear the active animation frame through the runtime wrapper.'
);
requireContract(
  'Preparation cancellation releases deferred work',
  visualizer,
  /function cancelPendingPreparation\(panel,[\s\S]*?cancelTask\(sceneBuildHandle\)[\s\S]*?cancelTask\(traceBuildHandle\)/,
  'scene and trace preparation handles must both be cancelled.'
);
requireContract(
  'Renderer disposal is idempotent',
  renderer,
  /dispose\(\)\s*\{\s*if \(this\.disposed\) return;\s*this\.disposed = true;/,
  'dispose must be safe to call repeatedly.'
);
requireContract(
  'Renderer disconnects observation',
  renderer,
  /this\.resizeObserver\?\.disconnect\(\);/,
  'dispose must disconnect the ResizeObserver.'
);
requireContract(
  'Renderer removes canvas handlers',
  renderer,
  /this\.canvas\.removeEventListener\(event,handler\)/,
  'dispose must remove pointer, wheel, click, and context-menu handlers.'
);
requireContract(
  'Renderer releases GPU buffers',
  renderer,
  /this\.gl\.deleteBuffer\(buffer\)/,
  'dispose must delete every owned WebGL buffer.'
);
requireContract(
  'Renderer releases GPU program',
  renderer,
  /this\.gl\.deleteProgram\(this\.program\);/,
  'dispose must delete the WebGL program.'
);
requireContract(
  'Renderer clears generated labels',
  renderer,
  /this\.labelLayer\.replaceChildren\(\);/,
  'dispose must clear generated label nodes.'
);

console.log(`Binary Cube V12 lifecycle contract gate passed (${checks.length} checks).`);
for (const check of checks) console.log(`  ✓ ${check.label}`);
