#!/usr/bin/env python3

from pathlib import Path
import re

controller_path = Path('shadowrun-binary-cube-visualizer.js')
source = controller_path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one target, found {count}')
    source = source.replace(old, new, 1)


def replace_regex(pattern: str, replacement: str, label: str) -> None:
    global source
    source, count = re.subn(pattern, replacement, source, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one regex target, found {count}')


replace_once(
    "  const PLAYBACK_SPEEDS = Object.freeze([0.25, 0.5, 1, 2]);\n  const MASK_MODES = Object.freeze(['1', '0.75', '0.5', 'custom']);",
    "  const PLAYBACK_SPEEDS = Object.freeze([0.25, 0.5, 1, 2]);\n  const PLAYBACK_SCOPES = Object.freeze(['selected-bit', 'selected-row', 'selected-block', 'all-blocks', 'overview-only']);\n  const OVERVIEW_BLOCK_DURATION_MS = 1800;\n  const MASK_MODES = Object.freeze(['1', '0.75', '0.5', 'custom']);",
    'V8 constants'
)

replace_once(
    "  let playbackSpeed = 1;\n  let playbackMode = 'all';\n  let playbackFrame = null;",
    "  let playbackSpeed = 1;\n  let playbackMode = 'all';\n  let playbackScope = 'selected-block';\n  let playbackFrame = null;",
    'V8 state'
)

utilities = r'''  function firstPayloadPoint(trace) {
    for (let pointId = 0; pointId < trace.sourceBitIndexByPoint.length; pointId += 1) if (trace.sourceBitIndexByPoint[pointId] >= 0) return pointId;
    return 0;
  }

  function describeTraceBlock(trace, packageObject) {
    if (!trace || !packageObject) fail('A canonical trace and package are required for block inspection.');
    const sourceBitsConsumed = trace.sourceBitRange.consumed;
    const partialPayloadFillerCells = Math.max(0, packageObject.payloadCapacity - sourceBitsConsumed);
    const maskFillerCells = trace.cellCount - packageObject.payloadCapacity;
    const ciphertextStart = trace.blockIndex * trace.cellCount;
    const ciphertextEndExclusive = ciphertextStart + trace.cellCount;
    return Object.freeze({
      blockIndex: trace.blockIndex,
      sourceStart: trace.sourceBitRange.start,
      sourceEndExclusive: trace.sourceBitRange.endExclusive,
      sourceBitsConsumed,
      ciphertextStart,
      ciphertextEndExclusive,
      payloadCapacity: packageObject.payloadCapacity,
      partialPayloadFillerCells,
      maskFillerCells,
      totalFillerCells: trace.cellCount - sourceBitsConsumed,
      finalPartialBlock: trace.blockIndex === packageObject.blockCount - 1 && partialPayloadFillerCells > 0,
      validated: trace.outputBlock === packageObject.ciphertext.slice(ciphertextStart, ciphertextEndExclusive)
    });
  }

  function locateSourceBit(traces, sourceBitIndexValue) {
    const sourceBitIndex = Number(sourceBitIndexValue);
    if (!Number.isInteger(sourceBitIndex) || sourceBitIndex < 0) fail('Source bit index must be a non-negative integer.');
    for (const trace of traces || []) {
      if (sourceBitIndex < trace.sourceBitRange.start || sourceBitIndex >= trace.sourceBitRange.endExclusive) continue;
      const pointId = trace.sourceBitIndexByPoint.indexOf(sourceBitIndex);
      if (pointId < 0) fail(`Source bit ${sourceBitIndex} is inside block ${trace.blockIndex} but has no point identity.`);
      const inputCellIndex = trace.inputCellIndexByPoint[pointId];
      const outputCellIndex = trace.outputCellIndexByPoint[pointId];
      return Object.freeze({
        sourceBitIndex,
        blockIndex: trace.blockIndex,
        pointId,
        inputCellIndex,
        outputCellIndex,
        ciphertextIndex: trace.blockIndex * trace.cellCount + outputCellIndex,
        bit: trace.bitByPoint[pointId]
      });
    }
    fail(`Source bit index ${sourceBitIndex} is outside the active package.`);
  }

  function locateCiphertextBit(traces, ciphertextIndexValue) {
    const ciphertextIndex = Number(ciphertextIndexValue);
    if (!Number.isInteger(ciphertextIndex) || ciphertextIndex < 0) fail('Ciphertext bit index must be a non-negative integer.');
    const collection = traces || [];
    if (!collection.length) fail('A trace collection is required for ciphertext inspection.');
    const cellCount = collection[0].cellCount;
    const blockIndex = Math.floor(ciphertextIndex / cellCount);
    if (blockIndex < 0 || blockIndex >= collection.length) fail(`Ciphertext bit index ${ciphertextIndex} is outside the active package.`);
    const trace = collection[blockIndex];
    const outputCellIndex = ciphertextIndex % cellCount;
    const pointId = trace.outputProjectionPointIds[outputCellIndex];
    return Object.freeze({
      ciphertextIndex,
      blockIndex,
      pointId,
      inputCellIndex: trace.inputCellIndexByPoint[pointId],
      outputCellIndex,
      sourceBitIndex: trace.sourceBitIndexByPoint[pointId],
      bit: trace.outputBlock[outputCellIndex],
      kind: trace.cellKindByPoint[pointId]
    });
  }

  function sequenceBlockIndex(currentIndexValue, directionValue, blockCountValue, wrap = false) {
    const currentIndex = Number(currentIndexValue);
    const direction = Math.sign(Number(directionValue));
    const blockCount = Number(blockCountValue);
    if (!Number.isInteger(currentIndex) || !Number.isInteger(blockCount) || blockCount < 1 || currentIndex < 0 || currentIndex >= blockCount || !direction) return null;
    const target = currentIndex + direction;
    if (target >= 0 && target < blockCount) return target;
    if (!wrap) return null;
    return direction > 0 ? 0 : blockCount - 1;
  }

  function effectivePlaybackMode(scopeValue, cohortValue) {
    const scope = PLAYBACK_SCOPES.includes(scopeValue) ? scopeValue : 'selected-block';
    if (scope === 'selected-bit') return 'selected';
    if (scope === 'selected-row') return 'row';
    if (scope === 'overview-only') return 'all';
    return RendererApi?.constants?.PLAYBACK_MODES?.includes(cohortValue) ? cohortValue : 'all';
  }

  function isPackagePlaybackScope(scopeValue = playbackScope) {
    return scopeValue === 'all-blocks' || scopeValue === 'overview-only';
  }

'''
replace_regex(
    r"  function firstPayloadPoint\(trace\) \{.*?\n  \}\n\n(?=  function traceCellButton)",
    utilities,
    'V8 pure trace utilities'
)

replace_once(
    "    const trace = activeTrace;\n    if (!trace) return;\n    const sourceButtons = [];",
    "    const trace = activeTrace;\n    if (!trace) return;\n    const payloadCells = new Set(trace.payloadCellIndexes);\n    const sourceButtons = [];",
    'V8 trace payload set'
)

replace_once(
    "      const sourceIndex = trace.sourceBitIndexByInputCell[inputCellIndex];\n      framedButtons.push(traceCellButton(bit, pointId, `Framed input cell ${inputCellIndex}, ${kind}, source ${sourceIndex >= 0 ? sourceIndex : 'filler'}, point ${pointId}`, kind));\n      inputButtons.push(traceCellButton(bit, pointId, `Input face cell ${inputCellIndex}, point ${pointId}`, kind, 'input-face'));",
    "      const sourceIndex = trace.sourceBitIndexByInputCell[inputCellIndex];\n      const partialFiller = sourceIndex < 0 && payloadCells.has(inputCellIndex) ? 'partial-filler' : '';\n      framedButtons.push(traceCellButton(bit, pointId, `Framed input cell ${inputCellIndex}, ${kind}, source ${sourceIndex >= 0 ? sourceIndex : 'filler'}, point ${pointId}`, kind, partialFiller));\n      inputButtons.push(traceCellButton(bit, pointId, `Input face cell ${inputCellIndex}, point ${pointId}`, kind, `${partialFiller} input-face`));",
    'V8 framed partial filler'
)

replace_once(
    "    panel.querySelector('[data-cube-trace-point-grid]').innerHTML = trace.pointField.map(point => {\n      const kind = trace.cellKindByPoint[point.id];\n      return traceCellButton(trace.bitByPoint[point.id], point.id, `Point ${point.id} at (${point.x}, ${point.y}, ${point.z}), ${kind}`, kind, 'point-field');\n    }).join('');",
    "    panel.querySelector('[data-cube-trace-point-grid]').innerHTML = trace.pointField.map(point => {\n      const kind = trace.cellKindByPoint[point.id];\n      const inputCellIndex = trace.inputCellIndexByPoint[point.id];\n      const partialFiller = trace.sourceBitIndexByPoint[point.id] < 0 && payloadCells.has(inputCellIndex) ? 'partial-filler' : '';\n      return traceCellButton(trace.bitByPoint[point.id], point.id, `Point ${point.id} at (${point.x}, ${point.y}, ${point.z}), ${kind}`, kind, `${partialFiller} point-field`);\n    }).join('');",
    'V8 point partial filler'
)

replace_once(
    "      const kind = trace.cellKindByPoint[pointId];\n      const packageOutputIndex = trace.blockIndex * trace.cellCount + outputIndex;\n      outputButtons.push(traceCellButton(bit, pointId, `Output face cell ${outputIndex}, package ciphertext index ${packageOutputIndex}, point ${pointId}`, kind, 'output-face'));\n      outputStrip.push(traceCellButton(bit, pointId, `Encrypted package index ${packageOutputIndex}, point ${pointId}`, kind, 'encrypted-output'));",
    "      const kind = trace.cellKindByPoint[pointId];\n      const packageOutputIndex = trace.blockIndex * trace.cellCount + outputIndex;\n      const partialFiller = trace.sourceBitIndexByPoint[pointId] < 0 && payloadCells.has(trace.inputCellIndexByPoint[pointId]) ? 'partial-filler' : '';\n      outputButtons.push(traceCellButton(bit, pointId, `Output face cell ${outputIndex}, package ciphertext index ${packageOutputIndex}, point ${pointId}`, kind, `${partialFiller} output-face`));\n      outputStrip.push(traceCellButton(bit, pointId, `Encrypted package index ${packageOutputIndex}, point ${pointId}`, kind, `${partialFiller} encrypted-output`));",
    'V8 output partial filler'
)

replace_once(
    "    const rendered = renderer?.getTraceState?.();\n    const animatedPosition = rendered?.selectedPosition || RendererApi.tracePointPosition(activeTrace, details.pointId, traceTime, details.pointId, playbackMode);",
    "    const rendered = renderer?.getTraceState?.();\n    const visibleMode = effectivePlaybackMode(playbackScope, playbackMode);\n    const animatedPosition = rendered?.selectedPosition || RendererApi.tracePointPosition(activeTrace, details.pointId, traceTime, details.pointId, visibleMode);",
    'V8 inspector playback mode'
)
replace_once(
    "      button.classList.toggle('cohort', playbackMode === 'row' && sameRow);\n      button.classList.toggle('motion-muted', playbackMode === 'selected' && pointId !== details.pointId);",
    "      button.classList.toggle('cohort', visibleMode === 'row' && sameRow);\n      button.classList.toggle('motion-muted', visibleMode === 'selected' && pointId !== details.pointId);",
    'V8 inspector scope classes'
)
replace_once(
    "      filler: activeTrace ? activeTrace.cellCount - activeTrace.payloadCellIndexes.length : 0,",
    "      filler: activeTrace ? activeTrace.cellCount - activeTrace.sourceBitRange.consumed : 0,",
    'V8 total filler counter'
)
replace_once(
    "    const atStart = state.traceTime <= 0;\n    const atEnd = state.traceTime >= 1;",
    "    const packageScope = isPackagePlaybackScope();\n    const atStart = state.traceTime <= 0 && (!packageScope || selectedBlockIndex === 0);\n    const atEnd = state.traceTime >= 1 && (!packageScope || selectedBlockIndex === activeTraces.length - 1);",
    'V8 playback boundaries'
)
replace_once(
    "    renderer?.setTraceTimelineState(activeTrace, state.traceTime, selectedPointId, playbackMode);\n    updatePhaseMarkers(panel, state);",
    "    const rendererTime = playbackScope === 'overview-only' ? 5 / Math.max(1, activeTrace.phases.length - 1) : state.traceTime;\n    renderer?.setTraceTimelineState(activeTrace, rendererTime, selectedPointId, effectivePlaybackMode(playbackScope, playbackMode));\n    updateBlockTimeline(panel);\n    updatePhaseMarkers(panel, state);",
    'V8 overview renderer state'
)

playback = r'''  function playbackTick(panel, timestamp) {
    if (!activeTrace || playbackDirection === 0 || panel.hidden) {
      pausePlayback(panel, false);
      return;
    }
    if (playbackLastTimestamp == null) playbackLastTimestamp = timestamp;
    const elapsed = Math.min(100, Math.max(0, timestamp - playbackLastTimestamp));
    playbackLastTimestamp = timestamp;
    const duration = playbackScope === 'overview-only' ? OVERVIEW_BLOCK_DURATION_MS : PLAYBACK_DURATION_MS;
    const nextTime = traceTime + playbackDirection * elapsed * playbackSpeed / duration;
    const reachedBoundary = nextTime <= 0 || nextTime >= 1;
    traceTime = clamp(nextTime, 0, 1);
    updateTimelineDisplay(panel);
    if (reachedBoundary && isPackagePlaybackScope()) {
      const targetBlock = sequenceBlockIndex(selectedBlockIndex, playbackDirection, activeTraces.length, false);
      if (targetBlock !== null) {
        const direction = playbackDirection;
        loadSelectedBlock(panel, targetBlock, { quiet: true, keepPlaying: true, traceTime: direction > 0 ? 0 : 1 });
        playbackDirection = direction;
        playbackLastTimestamp = timestamp;
        setStatus(panel, `${direction > 0 ? 'Advanced to' : 'Returned to'} package block ${targetBlock + 1} of ${activeTraces.length}. Package ciphertext is unchanged.`, 'success');
        playbackFrame = requestFrame(nextTimestamp => playbackTick(panel, nextTimestamp));
        return;
      }
    }
    if (reachedBoundary) {
      const directionText = playbackDirection > 0 ? 'completed' : 'returned to the beginning';
      pausePlayback(panel, false);
      setStatus(panel, `${playbackScope.replaceAll('-', ' ')} playback ${directionText}. Package state and ciphertext were unchanged.`, 'success');
      return;
    }
    playbackFrame = requestFrame(nextTimestamp => playbackTick(panel, nextTimestamp));
  }

  function startPlayback(panel, direction) {
    if (!activeTrace) fail('Select a package block before playback.');
    if (direction !== 1 && direction !== -1) fail('Playback direction must be forward or reverse.');
    pausePlayback(panel, false);
    if (isPackagePlaybackScope()) {
      if (direction > 0 && traceTime >= 1) loadSelectedBlock(panel, sequenceBlockIndex(selectedBlockIndex, 1, activeTraces.length, true), { quiet: true, keepPlaying: true, traceTime: 0 });
      if (direction < 0 && traceTime <= 0) loadSelectedBlock(panel, sequenceBlockIndex(selectedBlockIndex, -1, activeTraces.length, true), { quiet: true, keepPlaying: true, traceTime: 1 });
    } else {
      if (direction > 0 && traceTime >= 1) traceTime = 0;
      if (direction < 0 && traceTime <= 0) traceTime = 1;
    }
    playbackDirection = direction;
    playbackLastTimestamp = null;
    updateTimelineDisplay(panel);
    playbackFrame = requestFrame(timestamp => playbackTick(panel, timestamp));
    setStatus(panel, `${direction > 0 ? 'Forward' : 'Reverse'} playback started for ${playbackScope.replaceAll('-', ' ')} at ${playbackSpeed}×.`, 'success');
  }

'''
replace_regex(
    r"  function playbackTick\(panel, timestamp\) \{.*?\n  \}\n\n  function startPlayback\(panel, direction\) \{.*?\n  \}\n\n(?=  function selectPoint)",
    playback,
    'V8 sequencing playback'
)

block_controls = r'''  function populateBlockSelector(panel) {
    const select = panel.querySelector('[data-cube-encoder-block]');
    select.replaceChildren(...activeTraces.map(trace => {
      const option = document.createElement('option');
      option.value = String(trace.blockIndex);
      const descriptor = describeTraceBlock(trace, activePackage);
      option.textContent = `Block ${trace.blockIndex + 1} · source ${descriptor.sourceStart}-${descriptor.sourceEndExclusive - 1} · ciphertext ${descriptor.ciphertextStart}-${descriptor.ciphertextEndExclusive - 1}${descriptor.finalPartialBlock ? ' · FINAL PARTIAL' : ''}`;
      option.selected = trace.blockIndex === selectedBlockIndex;
      return option;
    }));
    panel.querySelector('[data-cube-encoder-source-index]').max = String(Math.max(0, activePackage.originalBitLength - 1));
    panel.querySelector('[data-cube-encoder-ciphertext-index]').max = String(Math.max(0, activePackage.ciphertext.length - 1));
    renderBlockTimeline(panel);
  }

  function renderBlockTimeline(panel) {
    const target = panel.querySelector('[data-cube-encoder-block-timeline]');
    if (!target) return;
    target.innerHTML = activeTraces.map(trace => {
      const descriptor = describeTraceBlock(trace, activePackage);
      const classes = ['cube-block-marker', descriptor.finalPartialBlock ? 'partial' : '', descriptor.validated ? 'validated' : 'invalid'].filter(Boolean).join(' ');
      return `<button type="button" class="${classes}" data-cube-encoder-block-marker="${trace.blockIndex}" title="Source ${descriptor.sourceStart}-${descriptor.sourceEndExclusive - 1}; ciphertext ${descriptor.ciphertextStart}-${descriptor.ciphertextEndExclusive - 1}; ${descriptor.totalFillerCells} filler cells"><strong>${trace.blockIndex + 1}</strong><span>S ${descriptor.sourceStart}-${descriptor.sourceEndExclusive - 1}</span><span>C ${descriptor.ciphertextStart}-${descriptor.ciphertextEndExclusive - 1}</span><small>${descriptor.finalPartialBlock ? 'FINAL PARTIAL' : 'VALID'}</small></button>`;
    }).join('');
    updateBlockTimeline(panel);
  }

  function updateBlockTimeline(panel) {
    panel.querySelectorAll('[data-cube-encoder-block-marker]').forEach(button => {
      const blockIndex = Number(button.dataset.cubeEncoderBlockMarker);
      button.classList.toggle('active', blockIndex === selectedBlockIndex);
      button.setAttribute('aria-current', blockIndex === selectedBlockIndex ? 'step' : 'false');
    });
  }

  function renderBlockRangeInspector(panel) {
    const target = panel.querySelector('[data-cube-encoder-range-inspector]');
    if (!target || !activePackage || !activeTraces.length) return;
    const descriptor = describeTraceBlock(activeTraces[selectedBlockIndex], activePackage);
    target.innerHTML = `<strong>Block ${descriptor.blockIndex + 1} of ${activeTraces.length}${descriptor.finalPartialBlock ? ' · final partial block' : ''}</strong><span>Source bits ${descriptor.sourceStart}-${descriptor.sourceEndExclusive - 1} (${descriptor.sourceBitsConsumed} consumed)</span><span>Ciphertext bits ${descriptor.ciphertextStart}-${descriptor.ciphertextEndExclusive - 1}</span><span>${descriptor.partialPayloadFillerCells} partial payload filler · ${descriptor.maskFillerCells} mask filler · ${descriptor.totalFillerCells} total deterministic filler</span><span>${descriptor.validated ? 'Trace output validated against the exact package slice.' : 'Trace validation failed.'}</span>`;
    panel.querySelector('[data-cube-encoder-previous-block]').disabled = selectedBlockIndex <= 0;
    panel.querySelector('[data-cube-encoder-next-block]').disabled = selectedBlockIndex >= activeTraces.length - 1;
  }

  function selectAdjacentBlock(panel, direction) {
    const target = sequenceBlockIndex(selectedBlockIndex, direction, activeTraces.length, false);
    if (target === null) return;
    loadSelectedBlock(panel, target);
  }

  function jumpToSourceBit(panel, sourceBitIndexValue) {
    const location = locateSourceBit(activeTraces, sourceBitIndexValue);
    loadSelectedBlock(panel, location.blockIndex, { quiet: true, pointId: location.pointId, traceTime: 0 });
    setStatus(panel, `Source bit ${location.sourceBitIndex} is block ${location.blockIndex + 1}, point P${location.pointId}, input cell ${location.inputCellIndex}, and ciphertext index ${location.ciphertextIndex}.`, 'success');
    return location;
  }

  function jumpToCiphertextBit(panel, ciphertextIndexValue) {
    const location = locateCiphertextBit(activeTraces, ciphertextIndexValue);
    loadSelectedBlock(panel, location.blockIndex, { quiet: true, pointId: location.pointId, traceTime: 8 / 9 });
    setStatus(panel, `Ciphertext bit ${location.ciphertextIndex} is block ${location.blockIndex + 1}, output cell ${location.outputCellIndex}, point P${location.pointId}, and ${location.sourceBitIndex >= 0 ? `source bit ${location.sourceBitIndex}` : 'deterministic filler'}.`, 'success');
    return location;
  }

'''
replace_regex(
    r"  function populateBlockSelector\(panel\) \{.*?\n  \}\n\n(?=  function renderPackageSummary)",
    block_controls,
    'V8 block controls'
)

selected_block = r'''  function loadSelectedBlock(panel, blockIndexValue, options = {}) {
    if (!activePackage || !activeTraces.length) fail('Encrypt or import a package before selecting a block.');
    const blockIndex = Number(blockIndexValue);
    if (!Number.isInteger(blockIndex) || blockIndex < 0 || blockIndex >= activeTraces.length) fail(`Block index must be from 0 through ${activeTraces.length - 1}.`);
    if (!options.keepPlaying) pausePlayback(panel, false);
    selectedBlockIndex = blockIndex;
    panel.querySelector('[data-cube-encoder-block]').value = String(blockIndex);
    renderPackageSummary(panel);
    updateBlockTimeline(panel);
    renderBlockRangeInspector(panel);
    if (activeKey.gridSize > MAX_MANUAL_TRACE_GRID_SIZE) {
      clearTrace(panel, `Package block ${blockIndex + 1} is valid, but V8 detailed animation supports grids through ${MAX_MANUAL_TRACE_GRID_SIZE} × ${MAX_MANUAL_TRACE_GRID_SIZE}. The complete ${activeKey.gridSize} × ${activeKey.gridSize} point field remains visible.`);
      return;
    }
    activeTrace = activeTraces[blockIndex];
    traceTime = options.traceTime == null ? 0 : clamp(Number(options.traceTime) || 0, 0, 1);
    const requestedPoint = Number(options.pointId);
    selectedPointId = Number.isInteger(requestedPoint) && requestedPoint >= 0 && requestedPoint < activeTrace.cellCount ? requestedPoint : firstPayloadPoint(activeTrace);
    renderTraceCollections(panel);
    renderPhaseMarkers(panel);
    panel.querySelector('[data-cube-trace-workspace]').hidden = false;
    panel.querySelector('[data-cube-trace-unavailable]').hidden = true;
    updateTimelineDisplay(panel);
    if (!options.quiet) setStatus(panel, `Package block ${blockIndex + 1} selected. Its trace output exactly matches ciphertext indexes ${blockIndex * activeTrace.cellCount} through ${(blockIndex + 1) * activeTrace.cellCount - 1}.`, 'success');
  }

'''
replace_regex(
    r"  function loadSelectedBlock\(panel, blockIndexValue, options = \{\}\) \{.*?\n  \}\n\n(?=  function applyPackage)",
    selected_block,
    'V8 selected block loading'
)

replace_once(
    "    panel.querySelector('[data-cube-encoder-block]').replaceChildren();\n    panel.querySelector('[data-cube-encoder-package-summary]').textContent = message || 'No encrypted package is active.';",
    "    panel.querySelector('[data-cube-encoder-block]').replaceChildren();\n    panel.querySelector('[data-cube-encoder-block-timeline]').replaceChildren();\n    panel.querySelector('[data-cube-encoder-range-inspector]').textContent = 'No package block is selected.';\n    panel.querySelector('[data-cube-encoder-package-summary]').textContent = message || 'No encrypted package is active.';",
    'V8 clear package surface'
)

replace_once(
    "    panel.querySelector('[data-cube-encoder-block]').addEventListener('change', event => { try { loadSelectedBlock(panel, event.target.value); } catch (error) { setStatus(panel, error.message, 'error'); } });\n    panel.querySelector('[data-cube-trace-bits]').addEventListener('input', () => clearPackage(panel, 'Manual input changed. Encrypt again to rebuild the canonical package and traces.'));",
    "    panel.querySelector('[data-cube-encoder-block]').addEventListener('change', event => { try { loadSelectedBlock(panel, event.target.value); } catch (error) { setStatus(panel, error.message, 'error'); } });\n    panel.querySelector('[data-cube-encoder-previous-block]').addEventListener('click', () => { try { selectAdjacentBlock(panel, -1); } catch (error) { setStatus(panel, error.message, 'error'); } });\n    panel.querySelector('[data-cube-encoder-next-block]').addEventListener('click', () => { try { selectAdjacentBlock(panel, 1); } catch (error) { setStatus(panel, error.message, 'error'); } });\n    panel.querySelector('[data-cube-encoder-block-timeline]').addEventListener('click', event => { const button = event.target.closest('[data-cube-encoder-block-marker]'); if (button) { try { loadSelectedBlock(panel, button.dataset.cubeEncoderBlockMarker); } catch (error) { setStatus(panel, error.message, 'error'); } } });\n    panel.querySelector('[data-cube-encoder-source-jump]').addEventListener('click', () => { try { jumpToSourceBit(panel, panel.querySelector('[data-cube-encoder-source-index]').value); } catch (error) { setStatus(panel, error.message, 'error'); } });\n    panel.querySelector('[data-cube-encoder-ciphertext-jump]').addEventListener('click', () => { try { jumpToCiphertextBit(panel, panel.querySelector('[data-cube-encoder-ciphertext-index]').value); } catch (error) { setStatus(panel, error.message, 'error'); } });\n    panel.querySelector('[data-cube-trace-bits]').addEventListener('input', () => clearPackage(panel, 'Manual input changed. Encrypt again to rebuild the canonical package and traces.'));",
    'V8 navigation bindings'
)

replace_once(
    "    panel.querySelector('[data-cube-trace-mode]').addEventListener('change', event => {\n      const mode = event.target.value;\n      if (!RendererApi.constants.PLAYBACK_MODES.includes(mode)) return;\n      playbackMode = mode;\n      if (activeTrace) updateTimelineDisplay(panel);\n    });\n    panel.querySelector('[data-cube-trace-timeline]').addEventListener('input', event => {",
    "    panel.querySelector('[data-cube-trace-mode]').addEventListener('change', event => {\n      const mode = event.target.value;\n      if (!RendererApi.constants.PLAYBACK_MODES.includes(mode)) return;\n      playbackMode = mode;\n      if (activeTrace) updateTimelineDisplay(panel);\n    });\n    panel.querySelector('[data-cube-trace-scope]').addEventListener('change', event => {\n      const scope = event.target.value;\n      if (!PLAYBACK_SCOPES.includes(scope)) return;\n      pausePlayback(panel, false);\n      playbackScope = scope;\n      if (activeTrace) updateTimelineDisplay(panel);\n      setStatus(panel, `Playback scope changed to ${scope.replaceAll('-', ' ')}.`, 'success');\n    });\n    panel.querySelector('[data-cube-trace-timeline]').addEventListener('input', event => {",
    'V8 scope binding'
)

replace_once(
    '      <div class="cube-visualizer-header"><div><p class="eyebrow">V7 complete package encoder · selected-block animation</p><h2>Binary Cube Encoder Visualizer</h2><p>Encrypt manual bits or file bytes into the real canonical package, verify every block trace against its ciphertext, decrypt the result, and animate any selected block.</p></div><button type="button" class="layout-button" data-cube-visualizer-close>Close Visualizer</button></div>\n      <p class="cube-visualizer-warning"><strong>Experimental obfuscation research:</strong> package checksums detect corruption but are not cryptographic authentication. V7 animation is a verified view of canonical engine output; it never substitutes for package encryption or decryption.</p>',
    '      <div class="cube-visualizer-header"><div><p class="eyebrow">V8 multi-block sequencing · exact source and ciphertext inspection</p><h2>Binary Cube Encoder Visualizer</h2><p>Encrypt complete packages, navigate every verified block, jump directly to source or ciphertext bits, and play selected or package-wide trace scopes without changing canonical output.</p></div><button type="button" class="layout-button" data-cube-visualizer-close>Close Visualizer</button></div>\n      <p class="cube-visualizer-warning"><strong>Experimental obfuscation research:</strong> package checksums detect corruption but are not cryptographic authentication. V8 sequencing reads validated trace collections and never substitutes for canonical encryption or decryption.</p>',
    'V8 heading'
)

trace_panel = '''          <section class="cube-trace-panel">
            <div class="cube-trace-header"><div><p class="eyebrow">Verified package sequencing and selected-block trace</p><h3>Multi-Block Animated Bit Flow</h3></div><div class="cube-block-navigation"><button type="button" class="layout-button" data-cube-encoder-previous-block>Previous Block</button><div class="cube-visualizer-field cube-encoder-block-field"><label for="cube-encoder-block">Package block</label><select id="cube-encoder-block" data-cube-encoder-block></select></div><button type="button" class="layout-button" data-cube-encoder-next-block>Next Block</button></div></div>
            <div class="cube-block-timeline" aria-label="Validated package block timeline" data-cube-encoder-block-timeline></div>
            <div class="cube-block-range-inspector" data-cube-encoder-range-inspector>No package block is selected.</div>
            <div class="cube-bit-jump-controls"><label>Source bit index<input type="number" min="0" step="1" value="0" data-cube-encoder-source-index></label><button type="button" class="layout-button" data-cube-encoder-source-jump>Jump to Source Bit</button><label>Ciphertext bit index<input type="number" min="0" step="1" value="0" data-cube-encoder-ciphertext-index></label><button type="button" class="layout-button" data-cube-encoder-ciphertext-jump>Jump to Ciphertext Bit</button></div>
            <p class="cube-trace-unavailable" data-cube-trace-unavailable>Encrypt or import a package to select a block for animation.</p>
            <div hidden data-cube-trace-workspace>
              <div class="cube-trace-phase-bar"><strong data-cube-trace-phase-name>Block 1 · phase 1</strong><div class="cube-trace-controls"><button type="button" class="layout-button" data-cube-trace-first>First</button><button type="button" class="layout-button" data-cube-trace-previous>Previous Phase</button><button type="button" class="layout-button" data-cube-trace-reverse-play>Reverse</button><button type="button" class="layout-button" data-cube-trace-pause>Pause</button><button type="button" class="link-button" data-cube-trace-play>Play</button><button type="button" class="layout-button" data-cube-trace-next>Next Phase</button><button type="button" class="layout-button" data-cube-trace-last>Last</button><button type="button" class="layout-button" data-cube-trace-restart>Restart</button></div></div>
              <div class="cube-trace-playback-options"><label>Speed<select data-cube-trace-speed>${PLAYBACK_SPEEDS.map(speed => `<option value="${speed}"${speed === 1 ? ' selected' : ''}>${speed}×</option>`).join('')}</select></label><label>Package scope<select data-cube-trace-scope><option value="selected-bit">Selected bit</option><option value="selected-row">Selected row</option><option value="selected-block" selected>Selected block</option><option value="all-blocks">All blocks</option><option value="overview-only">Overview only</option></select></label><label>Motion cohort<select data-cube-trace-mode><option value="all">All bits</option><option value="selected">Selected bit only</option><option value="row">Selected input row</option></select></label></div>'''
replace_regex(
    r'''          <section class="cube-trace-panel">\n            <div class="cube-trace-header">.*?\n              <div class="cube-trace-playback-options">.*?</div>''',
    trace_panel,
    'V8 trace panel controls'
)

replace_once(
    "      selectedBlockIndex: activeTrace?.blockIndex ?? null,\n      recoveredBits,",
    "      selectedBlockIndex: activePackage ? selectedBlockIndex : null,\n      blockDescriptors: activePackage ? Object.freeze(activeTraces.map(trace => describeTraceBlock(trace, activePackage))) : Object.freeze([]),\n      recoveredBits,",
    'V8 state block descriptors'
)
replace_once(
    "      tracePlaybackSpeed: playbackSpeed,\n      tracePlaybackMode: playbackMode,\n      selectedPointId:",
    "      tracePlaybackSpeed: playbackSpeed,\n      tracePlaybackMode: playbackMode,\n      tracePlaybackScope: playbackScope,\n      packageSequenceActive: playbackDirection !== 0 && isPackagePlaybackScope(),\n      selectedBlockSourceStart: activeTrace?.sourceBitRange.start ?? null,\n      selectedBlockSourceEndExclusive: activeTrace?.sourceBitRange.endExclusive ?? null,\n      selectedBlockSourceBitsConsumed: activeTrace?.sourceBitRange.consumed ?? null,\n      selectedBlockCiphertextStart: activeTrace ? activeTrace.blockIndex * activeTrace.cellCount : null,\n      selectedBlockCiphertextEndExclusive: activeTrace ? (activeTrace.blockIndex + 1) * activeTrace.cellCount : null,\n      selectedBlockFinalPartial: activeTrace && activePackage ? describeTraceBlock(activeTrace, activePackage).finalPartialBlock : false,\n      selectedBlockPartialPayloadFillerCells: activeTrace && activePackage ? describeTraceBlock(activeTrace, activePackage).partialPayloadFillerCells : null,\n      selectedBlockMaskFillerCells: activeTrace && activePackage ? describeTraceBlock(activeTrace, activePackage).maskFillerCells : null,\n      selectedBlockTotalFillerCells: activeTrace && activePackage ? describeTraceBlock(activeTrace, activePackage).totalFillerCells : null,\n      selectedPointId:",
    'V8 sequencing state'
)
replace_once(
    "    utilities: Object.freeze({ normalizeBits, bytesToBits, bitsToBytes, normalizeCustomMask }),\n    constants: Object.freeze({ PANEL_ID, MAX_STATIC_GRID_SIZE, MAX_MANUAL_TRACE_GRID_SIZE, PLAYBACK_DURATION_MS, PLAYBACK_SPEEDS, MASK_MODES })",
    "    utilities: Object.freeze({ normalizeBits, bytesToBits, bitsToBytes, normalizeCustomMask, describeTraceBlock, locateSourceBit, locateCiphertextBit, sequenceBlockIndex, effectivePlaybackMode }),\n    constants: Object.freeze({ PANEL_ID, MAX_STATIC_GRID_SIZE, MAX_MANUAL_TRACE_GRID_SIZE, PLAYBACK_DURATION_MS, OVERVIEW_BLOCK_DURATION_MS, PLAYBACK_SPEEDS, PLAYBACK_SCOPES, MASK_MODES })",
    'V8 public API'
)

controller_path.write_text(source, encoding='utf-8')

css_path = Path('binary-cube-visualizer.css')
css = css_path.read_text(encoding='utf-8')
if '.cube-block-timeline' in css:
    raise SystemExit('V8 CSS already appears to be installed.')
css_addition = '''.cube-block-navigation{display:grid;grid-template-columns:auto minmax(250px,1fr) auto;gap:9px;align-items:end}.cube-block-timeline{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:7px;margin:12px 0}.cube-block-marker{display:grid;gap:3px;min-width:0;padding:9px;border:1px solid rgba(145,180,205,.24);border-radius:9px;background:rgba(255,255,255,.025);color:#b5c7d2;text-align:left}.cube-block-marker strong{font-size:1rem}.cube-block-marker span,.cube-block-marker small{font-size:.65rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cube-block-marker.validated{border-color:rgba(80,205,135,.4)}.cube-block-marker.partial{border-style:dashed;border-color:rgba(255,180,61,.72);background:rgba(130,76,8,.14)}.cube-block-marker.active{outline:3px solid rgba(115,221,243,.74);outline-offset:1px;color:#effdff;background:rgba(26,113,139,.22)}.cube-block-range-inspector{display:grid;gap:4px;padding:11px;border:1px dashed rgba(145,180,205,.28);border-radius:9px;background:rgba(255,255,255,.025);color:#bcd0dc}.cube-block-range-inspector strong{color:#effbff}.cube-bit-jump-controls{display:grid;grid-template-columns:minmax(150px,1fr) auto minmax(150px,1fr) auto;gap:8px;align-items:end;margin:10px 0}.cube-bit-jump-controls label{display:grid;gap:5px;font-weight:800}.cube-trace-cell.partial-filler{border-color:rgba(255,180,61,.82);background:repeating-linear-gradient(135deg,rgba(255,180,61,.16),rgba(255,180,61,.16) 5px,rgba(110,118,126,.12) 5px,rgba(110,118,126,.12) 10px)}
@media (max-width:900px){.cube-block-navigation,.cube-bit-jump-controls{grid-template-columns:1fr 1fr}.cube-block-navigation .cube-encoder-block-field{grid-column:1/-1;grid-row:1}.cube-block-timeline{grid-template-columns:repeat(auto-fit,minmax(100px,1fr))}}
@media (max-width:560px){.cube-block-navigation,.cube-bit-jump-controls{grid-template-columns:1fr}.cube-block-navigation .cube-encoder-block-field{grid-column:auto;grid-row:auto}}'''
css_path.write_text(css.rstrip() + '\n' + css_addition + '\n', encoding='utf-8')
