#!/usr/bin/env python3

from pathlib import Path


def replace_once(path_name, old, new, label):
    path = Path(path_name)
    source = path.read_text(encoding='utf-8')
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one target, found {count}')
    path.write_text(source.replace(old, new, 1), encoding='utf-8')


replace_once(
    'scripts/validate-binary-cube-visualizer-step.mjs',
    "assert.equal(Renderer.constants.RENDERER_VERSION, '0.4.0');",
    "assert.equal(Renderer.constants.RENDERER_VERSION, '0.5.0');",
    'V5 static renderer version'
)

replace_once(
    'scripts/validate-binary-cube-visualizer-step-browser.mjs',
    "    if (!initial.traceReady || initial.traceTime !== 0 || initial.tracePhaseIndex !== 0 || initial.rendererVersion !== '0.4.0') throw new Error('V5 boundary did not initialize under V6.');",
    "    if (!initial.traceReady || initial.traceTime !== 0 || initial.tracePhaseIndex !== 0 || initial.rendererVersion !== '0.5.0') throw new Error('V5 boundary did not initialize under V9.');",
    'V5 browser initial renderer version'
)
replace_once(
    'scripts/validate-binary-cube-visualizer-step-browser.mjs',
    "    const largeScene = window.ShadowrunBinaryCubeVisualizer.currentState();\n    if (largeScene.gridSize !== 20 || largeScene.traceReady) throw new Error('Large static boundary changed.');",
    "    const largeScene = window.ShadowrunBinaryCubeVisualizer.currentState();\n    if (largeScene.gridSize !== 20 || !largeScene.traceReady || largeScene.renderTier !== 'batched' || largeScene.exactPointCount !== 400 || largeScene.renderedPointCount !== 400 || largeScene.traceExactPointCount !== 400 || largeScene.traceRenderedPointCount !== 400) throw new Error('The V5 boundary did not advance to an exact V9 batched trace: ' + JSON.stringify(largeScene));\n    if (panel.querySelectorAll('.cube-trace-cell').length !== 0) throw new Error('The 20 × 20 trace expanded one document cell per point.');",
    'V5 browser exact batched trace'
)
replace_once(
    'scripts/validate-binary-cube-visualizer-step-browser.mjs',
    "      largeStaticScenePreserved: true,\n      detailedTraceGridLimit: window.ShadowrunBinaryCubeVisualizer.constants.MAX_MANUAL_TRACE_GRID_SIZE,\n      v5BoundaryPreservedUnderV6: true",
    "      exactBatchedTraceAt20: true,\n      domDetailedTraceGridLimit: window.ShadowrunBinaryCubeVisualizer.constants.MAX_MANUAL_TRACE_GRID_SIZE,\n      v5BoundaryPreservedUnderV9: true",
    'V5 browser receipt fields'
)
replace_once(
    'scripts/validate-binary-cube-visualizer-step-browser.mjs',
    "  assert.equal(receipt.rendererVersion, '0.4.0');",
    "  assert.equal(receipt.rendererVersion, '0.5.0');",
    'V5 browser final renderer version'
)
replace_once(
    'scripts/validate-binary-cube-visualizer-step-browser.mjs',
    "  assert.equal(receipt.largeStaticScenePreserved, true);\n  assert.equal(receipt.detailedTraceGridLimit, 12);\n  assert.equal(receipt.v5BoundaryPreservedUnderV6, true);",
    "  assert.equal(receipt.exactBatchedTraceAt20, true);\n  assert.equal(receipt.domDetailedTraceGridLimit, 12);\n  assert.equal(receipt.v5BoundaryPreservedUnderV9, true);",
    'V5 browser final boundary assertions'
)

replace_once(
    'scripts/validate-binary-cube-visualizer-animation.mjs',
    "assert.equal(Renderer.constants.RENDERER_VERSION, '0.4.0');",
    "assert.equal(Renderer.constants.RENDERER_VERSION, '0.5.0');",
    'V6 static renderer version'
)

replace_once(
    'scripts/validate-binary-cube-visualizer-animation-browser.mjs',
    "    if (initial.rendererVersion !== '0.4.0') throw new Error('The V6 renderer version is incorrect.');",
    "    if (initial.rendererVersion !== '0.5.0') throw new Error('The V6 renderer version is incorrect under V9.');",
    'V6 browser initial renderer version'
)
replace_once(
    'scripts/validate-binary-cube-visualizer-animation-browser.mjs',
    "    const largeScene = window.ShadowrunBinaryCubeVisualizer.currentState();\n    if (largeScene.gridSize !== 20 || largeScene.traceReady) throw new Error('The V6 detailed animation limit did not preserve the larger static scene.');\n    if (!/12 × 12/.test(panel.querySelector('[data-cube-trace-unavailable]').textContent)) throw new Error('The V6 detailed animation limit notice is missing.');",
    "    const largeScene = window.ShadowrunBinaryCubeVisualizer.currentState();\n    if (largeScene.gridSize !== 20 || !largeScene.traceReady || largeScene.renderTier !== 'batched' || largeScene.exactPointCount !== 400 || largeScene.renderedPointCount !== 400 || largeScene.traceExactPointCount !== 400 || largeScene.traceRenderedPointCount !== 400) throw new Error('The V6 boundary did not advance to an exact V9 batched animation: ' + JSON.stringify(largeScene));\n    if (panel.querySelectorAll('.cube-trace-cell').length !== 0) throw new Error('The 20 × 20 animated trace expanded one document cell per point.');\n    if (!/exact 400-point canonical state/i.test(panel.querySelector('[data-cube-trace-representation-notice]').textContent)) throw new Error('The V9 exact batched trace disclosure is missing.');",
    'V6 browser exact batched animation'
)
replace_once(
    'scripts/validate-binary-cube-visualizer-animation-browser.mjs',
    "      largeStaticScenePreserved: true,\n      detailedAnimationGridLimit: window.ShadowrunBinaryCubeVisualizer.constants.MAX_MANUAL_TRACE_GRID_SIZE",
    "      exactBatchedTraceAt20: true,\n      domDetailedTraceGridLimit: window.ShadowrunBinaryCubeVisualizer.constants.MAX_MANUAL_TRACE_GRID_SIZE",
    'V6 browser receipt fields'
)
replace_once(
    'scripts/validate-binary-cube-visualizer-animation-browser.mjs',
    "  assert.equal(receipt.rendererVersion, '0.4.0');",
    "  assert.equal(receipt.rendererVersion, '0.5.0');",
    'V6 browser final renderer version'
)
replace_once(
    'scripts/validate-binary-cube-visualizer-animation-browser.mjs',
    "  assert.equal(receipt.largeStaticScenePreserved, true);\n  assert.equal(receipt.detailedAnimationGridLimit, 12);",
    "  assert.equal(receipt.exactBatchedTraceAt20, true);\n  assert.equal(receipt.domDetailedTraceGridLimit, 12);",
    'V6 browser final boundary assertions'
)

replace_once(
    'scripts/validate-binary-cube-visualizer-encoder.mjs',
    "assert.match(entrySource, /ASSET_VERSION = '20260725-4'/);",
    "assert.match(entrySource, /ASSET_VERSION = '20260726-1'/);",
    'V7 asset version'
)

replace_once(
    'scripts/validate-binary-cube-visualizer-encoder-browser.mjs',
    "    const largeState = Visualizer.currentState();\n    if (largeState.gridSize !== 20 || !largeState.packageReady || !largeState.roundTripValid || largeState.traceReady || largeState.traceCollectionCount !== largeState.packageBlockCount) throw new Error('The V7 large-grid package/static-scene boundary failed: ' + JSON.stringify(largeState));",
    "    const largeState = Visualizer.currentState();\n    if (largeState.gridSize !== 20 || !largeState.packageReady || !largeState.roundTripValid || !largeState.traceReady || largeState.traceCollectionCount !== largeState.packageBlockCount || largeState.renderTier !== 'batched' || largeState.exactPointCount !== 400 || largeState.renderedPointCount !== 400 || largeState.traceExactPointCount !== 400 || largeState.traceRenderedPointCount !== 400) throw new Error('The V7 large-grid package/exact-batched boundary failed: ' + JSON.stringify(largeState));\n    if (panel.querySelectorAll('.cube-trace-cell').length !== 0) throw new Error('The 20 × 20 package trace expanded one document cell per point.');",
    'V7 browser exact batched package trace'
)
replace_once(
    'scripts/validate-binary-cube-visualizer-encoder-browser.mjs',
    "      largeGridPackageBoundary: true,",
    "      exactBatchedLargeGridTrace: true,",
    'V7 browser receipt field'
)
replace_once(
    'scripts/validate-binary-cube-visualizer-encoder-browser.mjs',
    "  assert.equal(receipt.rendererVersion, '0.4.0');",
    "  assert.equal(receipt.rendererVersion, '0.5.0');",
    'V7 browser final renderer version'
)
replace_once(
    'scripts/validate-binary-cube-visualizer-encoder-browser.mjs',
    "  assert.equal(receipt.largeGridPackageBoundary, true);",
    "  assert.equal(receipt.exactBatchedLargeGridTrace, true);",
    'V7 browser final boundary assertion'
)
