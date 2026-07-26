(function installShadowrunBinaryCubeVisualizer(root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ShadowrunBinaryCubeVisualizer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createShadowrunBinaryCubeVisualizer(root) {
  'use strict';

  const PANEL_ID = 'shadowrun-binary-cube-visualizer';
  const MAX_STATIC_GRID_SIZE = 64;
  const MAX_MANUAL_TRACE_GRID_SIZE = 12;
  const DEFAULT_SEED = 'binary-cube-visualizer-static-demo';
  const DEFAULT_BITS = '0100110011010011';
  const PLAYBACK_DURATION_MS = 18000;
  const PLAYBACK_SPEEDS = Object.freeze([0.25, 0.5, 1, 2]);
  const Engine = root?.ShadowrunBinaryCubeEngine;
  const RendererApi = root?.BinaryCubeVisualizerRenderer;
  const FACES = Engine?.constants?.FACES || Object.freeze(['top', 'bottom', 'front', 'back', 'left', 'right']);
  let renderer = null;
  let activeKey = null;
  let activeKeyOrigin = null;
  let pickRole = 'input';
  let draftDirection = { inputFace: 'top', outputFace: 'front', inputQuarterTurns: 0, outputQuarterTurns: 0 };
  let activeTrace = null;
  let traceTime = 0;
  let selectedPointId = 0;
  let playbackDirection = 0;
  let playbackSpeed = 1;
  let playbackMode = 'all';
  let playbackFrame = null;
  let playbackLastTimestamp = null;

  function fail(message) { throw new Error(message); }
  function title(value) { return String(value).replace(/^./, character => character.toUpperCase()); }
  function normalizeQuarterTurns(value) { return ((Number(value) || 0) % 4 + 4) % 4; }
  function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
  function normalizeBits(value) {
    const bits = String(value ?? '').replace(/\s+/g, '');
    if (!bits) fail('Manual trace input must contain at least one binary digit.');
    if (/[^01]/.test(bits)) fail('Manual trace input may contain only 0, 1, and whitespace.');
    return bits;
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
  }

  function requireDependencies() {
    if (!Engine) fail('The canonical Binary Cube engine must load before the visualizer.');
    if (!RendererApi?.createRenderer) fail('The Binary Cube WebGL renderer must load before the visualizer.');
    if (typeof RendererApi.resolveTraceTimeline !== 'function' || typeof RendererApi.tracePointPosition !== 'function') fail('The Binary Cube V6 trace-time renderer API is unavailable.');
    if (typeof Engine.traceEncryptBlock !== 'function' || typeof Engine.validateTransformationTrace !== 'function') fail('The canonical Binary Cube trace API is unavailable.');
  }

  function setStatus(panel, message, type = '') {
    const node = panel?.querySelector('[data-cube-visualizer-status]');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('success', type === 'success');
    node.classList.toggle('error', type === 'error');
  }

  function parseKey(panel) {
    const raw = panel.querySelector('[data-cube-visualizer-key]').value.trim();
    if (!raw) fail('Key JSON is empty. Generate a scene or paste a canonical Binary Cube key.');
    try { return Engine.validateKey(JSON.parse(raw)); }
    catch (error) { fail(`Key JSON could not be loaded: ${error.message}`); }
  }

  function legalOutputFaces(inputFace = draftDirection.inputFace) { return Engine.legalOutputFaces(inputFace); }
  function rendererDirectionState() { return { ...draftDirection, legalOutputFaces: legalOutputFaces(draftDirection.inputFace) }; }

  function updateDirectionSummary(panel) {
    const node = panel.querySelector('[data-cube-visualizer-direction-summary]');
    if (!node) return;
    const legal = legalOutputFaces().map(title).join(', ');
    const loaded = activeKey ? `Loaded key ${activeKey.keyId}: ${title(activeKey.inputFace)} ${activeKey.inputQuarterTurns * 90}° → ${title(activeKey.outputFace)} ${activeKey.outputQuarterTurns * 90}°.` : 'No canonical key is loaded.';
    node.textContent = `Draft direction: ${title(draftDirection.inputFace)} ${draftDirection.inputQuarterTurns * 90}° inward → ${title(draftDirection.outputFace)} ${draftDirection.outputQuarterTurns * 90}° outward. Legal outputs: ${legal}. ${loaded}`;
  }

  function setPickRole(panel, role) {
    if (role !== 'input' && role !== 'output') fail('Face-picking role must be input or output.');
    pickRole = role;
    panel.querySelectorAll('[data-cube-visualizer-pick-role]').forEach(button => {
      const active = button.dataset.cubeVisualizerPickRole === role;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    panel.querySelector('[data-cube-visualizer-pick-instruction]').textContent = `Cube clicks now select the ${role} face.`;
  }

  function rebuildOutputOptions(panel, preferredFace = draftDirection.outputFace) {
    const select = panel.querySelector('[data-cube-visualizer-output-face]');
    const legal = legalOutputFaces(draftDirection.inputFace);
    const selected = legal.includes(preferredFace) ? preferredFace : legal[0];
    select.replaceChildren(...legal.map(face => {
      const option = document.createElement('option');
      option.value = face;
      option.textContent = title(face);
      option.selected = face === selected;
      return option;
    }));
    draftDirection.outputFace = selected;
  }

  function syncControlsFromKey(panel, key) {
    panel.querySelector('[data-cube-visualizer-size]').value = String(key.gridSize);
    panel.querySelector('[data-cube-visualizer-seed]').value = key.seed;
    panel.querySelector('[data-cube-visualizer-input-face]').value = key.inputFace;
    draftDirection = { inputFace:key.inputFace, outputFace:key.outputFace, inputQuarterTurns:key.inputQuarterTurns, outputQuarterTurns:key.outputQuarterTurns };
    rebuildOutputOptions(panel, key.outputFace);
    panel.querySelector('[data-cube-visualizer-input-turns]').value = String(key.inputQuarterTurns);
    panel.querySelector('[data-cube-visualizer-output-turns]').value = String(key.outputQuarterTurns);
  }

  function readDraftFromControls(panel) {
    draftDirection.inputFace = panel.querySelector('[data-cube-visualizer-input-face]').value;
    rebuildOutputOptions(panel, panel.querySelector('[data-cube-visualizer-output-face]').value);
    draftDirection.outputFace = panel.querySelector('[data-cube-visualizer-output-face]').value;
    draftDirection.inputQuarterTurns = normalizeQuarterTurns(panel.querySelector('[data-cube-visualizer-input-turns]').value);
    draftDirection.outputQuarterTurns = normalizeQuarterTurns(panel.querySelector('[data-cube-visualizer-output-turns]').value);
    return draftDirection;
  }

  function tracePointFromSourceIndex(trace, sourceBitIndex) {
    const inputCellIndex = trace.sourceBitIndexByInputCell.findIndex(value => value === sourceBitIndex);
    return inputCellIndex >= 0 ? trace.inputProjectionPointIds[inputCellIndex] : -1;
  }

  function firstPayloadPoint(trace) {
    for (let pointId = 0; pointId < trace.sourceBitIndexByPoint.length; pointId += 1) if (trace.sourceBitIndexByPoint[pointId] >= 0) return pointId;
    return 0;
  }

  function traceCellButton(bit, pointId, label, kind, extra = '') {
    return `<button type="button" class="cube-trace-cell ${escapeHtml(kind)} ${escapeHtml(extra)}" data-cube-trace-point="${pointId}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><span>${bit}</span><small>P${pointId}</small></button>`;
  }

  function renderTraceCollections(panel) {
    const trace = activeTrace;
    if (!trace) return;
    const sourceButtons = [];
    for (let localIndex = 0; localIndex < trace.sourceBits.length; localIndex += 1) {
      const sourceIndex = trace.sourceBitRange.start + localIndex;
      const pointId = tracePointFromSourceIndex(trace, sourceIndex);
      sourceButtons.push(traceCellButton(trace.sourceBits[localIndex], pointId, `Source bit ${sourceIndex}, point ${pointId}`, 'payload'));
    }
    panel.querySelector('[data-cube-trace-source-strip]').innerHTML = sourceButtons.join('');

    const framedButtons = [];
    const inputButtons = [];
    for (let inputCellIndex = 0; inputCellIndex < trace.cellCount; inputCellIndex += 1) {
      const pointId = trace.inputProjectionPointIds[inputCellIndex];
      const kind = trace.cellKindByPoint[pointId];
      const bit = trace.framedBlock[inputCellIndex];
      const sourceIndex = trace.sourceBitIndexByInputCell[inputCellIndex];
      framedButtons.push(traceCellButton(bit, pointId, `Framed input cell ${inputCellIndex}, ${kind}, source ${sourceIndex >= 0 ? sourceIndex : 'filler'}, point ${pointId}`, kind));
      inputButtons.push(traceCellButton(bit, pointId, `Input face cell ${inputCellIndex}, point ${pointId}`, kind, 'input-face'));
    }
    panel.querySelector('[data-cube-trace-framed-grid]').innerHTML = framedButtons.join('');
    panel.querySelector('[data-cube-trace-input-grid]').innerHTML = inputButtons.join('');

    panel.querySelector('[data-cube-trace-point-grid]').innerHTML = trace.pointField.map(point => {
      const kind = trace.cellKindByPoint[point.id];
      return traceCellButton(trace.bitByPoint[point.id], point.id, `Point ${point.id} at (${point.x}, ${point.y}, ${point.z}), ${kind}`, kind, 'point-field');
    }).join('');

    const outputButtons = [];
    const outputStrip = [];
    for (let outputIndex = 0; outputIndex < trace.cellCount; outputIndex += 1) {
      const pointId = trace.outputProjectionPointIds[outputIndex];
      const bit = trace.outputBlock[outputIndex];
      const kind = trace.cellKindByPoint[pointId];
      outputButtons.push(traceCellButton(bit, pointId, `Output face cell ${outputIndex}, point ${pointId}`, kind, 'output-face'));
      outputStrip.push(traceCellButton(bit, pointId, `Encrypted output index ${outputIndex}, point ${pointId}`, kind, 'encrypted-output'));
    }
    panel.querySelector('[data-cube-trace-output-grid]').innerHTML = outputButtons.join('');
    panel.querySelector('[data-cube-trace-output-strip]').innerHTML = outputStrip.join('');
  }

  function selectedTraceDetails() {
    if (!activeTrace) return null;
    const pointId = selectedPointId;
    const point = activeTrace.pointField[pointId];
    const inputCellIndex = activeTrace.inputCellIndexByPoint[pointId];
    const outputCellIndex = activeTrace.outputCellIndexByPoint[pointId];
    const sourceBitIndex = activeTrace.sourceBitIndexByPoint[pointId];
    return Object.freeze({
      pointId,
      x: point.x,
      y: point.y,
      z: point.z,
      kind: activeTrace.cellKindByPoint[pointId],
      bit: activeTrace.bitByPoint[pointId],
      sourceBitIndex,
      inputCellIndex,
      inputRow: Math.floor(inputCellIndex / activeTrace.gridSize),
      outputCellIndex,
      finalOutputIndex: outputCellIndex,
      finalBit: activeTrace.outputBlock[outputCellIndex]
    });
  }

  function timelineState() {
    return activeTrace ? RendererApi.resolveTraceTimeline(traceTime, activeTrace.phases.length) : null;
  }

  function updateInspector(panel) {
    const details = selectedTraceDetails();
    if (!details) {
      panel.querySelector('[data-cube-trace-inspector]').textContent = 'Build a canonical trace to inspect a point.';
      return;
    }
    const rendered = renderer?.getTraceState?.();
    const animatedPosition = rendered?.selectedPosition || RendererApi.tracePointPosition(activeTrace, details.pointId, traceTime, details.pointId, playbackMode);
    panel.querySelector('[data-cube-trace-point-id]').value = String(details.pointId);
    panel.querySelector('[data-cube-trace-point-id]').max = String(activeTrace.cellCount - 1);
    panel.querySelector('[data-cube-trace-inspector]').innerHTML = `
      <dl>
        <div><dt>Point identity</dt><dd>P${details.pointId}</dd></div>
        <div><dt>Canonical coordinate</dt><dd>(${details.x}, ${details.y}, ${details.z})</dd></div>
        <div><dt>Animated position</dt><dd>(${animatedPosition.map(value => value.toFixed(3)).join(', ')})</dd></div>
        <div><dt>Cell type</dt><dd>${title(details.kind)}</dd></div>
        <div><dt>Source index</dt><dd>${details.sourceBitIndex >= 0 ? details.sourceBitIndex : 'Deterministic filler'}</dd></div>
        <div><dt>Input face index</dt><dd>${details.inputCellIndex}</dd></div>
        <div><dt>Input row cohort</dt><dd>${details.inputRow}</dd></div>
        <div><dt>Point bit</dt><dd>${details.bit}</dd></div>
        <div><dt>Output face index</dt><dd>${details.outputCellIndex}</dd></div>
        <div><dt>Final output index</dt><dd>${details.finalOutputIndex}</dd></div>
        <div><dt>Final bit</dt><dd>${details.finalBit}</dd></div>
      </dl>`;
    panel.querySelectorAll('[data-cube-trace-point]').forEach(button => {
      const pointId = Number(button.dataset.cubeTracePoint);
      button.classList.toggle('selected', pointId === details.pointId);
      const pointInputIndex = activeTrace.inputCellIndexByPoint[pointId];
      const sameRow = Math.floor(pointInputIndex / activeTrace.gridSize) === details.inputRow;
      button.classList.toggle('cohort', playbackMode === 'row' && sameRow);
      button.classList.toggle('motion-muted', playbackMode === 'selected' && pointId !== details.pointId);
    });
  }

  function updateCounters(panel) {
    const details = selectedTraceDetails();
    const state = timelineState();
    const values = {
      source: activeTrace?.sourceBitRange.consumed ?? 0,
      payload: activeTrace?.payloadCellIndexes.length ?? 0,
      filler: activeTrace ? activeTrace.cellCount - activeTrace.payloadCellIndexes.length : 0,
      block: activeTrace?.blockIndex ?? 0,
      point: details?.pointId ?? '—',
      input: details?.inputCellIndex ?? '—',
      output: details?.outputCellIndex ?? '—',
      final: details?.finalOutputIndex ?? '—',
      time: state ? `${(state.traceTime * 100).toFixed(1)}%` : '—',
      progress: state ? `${(state.segmentProgress * 100).toFixed(1)}%` : '—'
    };
    for (const [name, value] of Object.entries(values)) {
      const node = panel.querySelector(`[data-cube-trace-counter="${name}"]`);
      if (node) node.textContent = String(value);
    }
  }

  function updatePhaseMarkers(panel, state) {
    panel.querySelectorAll('[data-cube-trace-marker]').forEach(button => {
      const markerIndex = Number(button.dataset.cubeTraceMarker);
      button.classList.toggle('active', markerIndex === state.phaseIndex);
      button.classList.toggle('complete', markerIndex < state.phaseIndex || state.traceTime === 1);
      button.setAttribute('aria-current', markerIndex === state.phaseIndex ? 'step' : 'false');
    });
  }

  function updatePlaybackControls(panel, state) {
    const atStart = state.traceTime <= 0;
    const atEnd = state.traceTime >= 1;
    panel.querySelector('[data-cube-trace-first]').disabled = atStart;
    panel.querySelector('[data-cube-trace-previous]').disabled = atStart;
    panel.querySelector('[data-cube-trace-reverse-play]').disabled = atStart && playbackDirection >= 0;
    panel.querySelector('[data-cube-trace-next]').disabled = atEnd;
    panel.querySelector('[data-cube-trace-last]').disabled = atEnd;
    panel.querySelector('[data-cube-trace-play]').disabled = atEnd && playbackDirection <= 0;
    panel.querySelector('[data-cube-trace-pause]').disabled = playbackDirection === 0;
    panel.querySelector('[data-cube-trace-play]').classList.toggle('active', playbackDirection > 0);
    panel.querySelector('[data-cube-trace-reverse-play]').classList.toggle('active', playbackDirection < 0);
    const timeline = panel.querySelector('[data-cube-trace-timeline]');
    timeline.value = String(Math.round(state.traceTime * 1000));
    panel.querySelector('[data-cube-trace-timeline-readout]').textContent = `${(state.traceTime * 100).toFixed(1)}% · segment ${(state.segmentProgress * 100).toFixed(1)}%`;
  }

  function updateTimelineDisplay(panel) {
    if (!activeTrace) return;
    const state = timelineState();
    const currentPhase = activeTrace.phases[state.phaseIndex];
    const nextPhase = activeTrace.phases[state.nextPhaseIndex];
    const transition = state.phaseIndex === state.nextPhaseIndex ? currentPhase.id : `${currentPhase.id} → ${nextPhase.id}`;
    panel.querySelector('[data-cube-trace-phase-name]').textContent = `${state.phaseIndex + 1} / ${activeTrace.phases.length} · ${transition.replaceAll('-', ' ')}`;
    panel.querySelectorAll('[data-cube-trace-stage]').forEach(stage => {
      const stageIndex = Number(stage.dataset.cubeTraceStage);
      stage.hidden = stageIndex > state.nextPhaseIndex;
      stage.classList.toggle('active', stageIndex === state.phaseIndex || (state.segmentProgress > 0 && stageIndex === state.nextPhaseIndex));
    });
    renderer?.setTraceTimelineState(activeTrace, state.traceTime, selectedPointId, playbackMode);
    updatePhaseMarkers(panel, state);
    updatePlaybackControls(panel, state);
    updateCounters(panel);
    updateInspector(panel);
  }

  function requestFrame(callback) {
    if (typeof root?.requestAnimationFrame === 'function') return root.requestAnimationFrame(callback);
    return root.setTimeout(() => callback(Date.now()), 16);
  }

  function cancelFrame(handle) {
    if (handle == null) return;
    if (typeof root?.cancelAnimationFrame === 'function') root.cancelAnimationFrame(handle);
    else root.clearTimeout(handle);
  }

  function pausePlayback(panel, announce = false) {
    cancelFrame(playbackFrame);
    playbackFrame = null;
    playbackLastTimestamp = null;
    const wasPlaying = playbackDirection !== 0;
    playbackDirection = 0;
    if (activeTrace && panel) updateTimelineDisplay(panel);
    if (announce && wasPlaying) setStatus(panel, `Playback paused at ${(traceTime * 100).toFixed(1)}%. The trace remains fully inspectable.`, 'success');
  }

  function setTraceTime(panel, value, options = {}) {
    if (!activeTrace) fail('Build a canonical trace before changing trace time.');
    traceTime = clamp(Number(value) || 0, 0, 1);
    if (!options.keepPlaying) pausePlayback(panel, false);
    updateTimelineDisplay(panel);
  }

  function phaseBoundaryTime(phaseIndex) {
    return phaseIndex / Math.max(1, activeTrace.phases.length - 1);
  }

  function setPhase(panel, phaseIndexValue) {
    if (!activeTrace) fail('Build a canonical trace before stepping phases.');
    const phaseIndex = clamp(Math.round(Number(phaseIndexValue) || 0), 0, activeTrace.phases.length - 1);
    setTraceTime(panel, phaseBoundaryTime(phaseIndex));
  }

  function stepPhase(panel, direction) {
    if (!activeTrace) fail('Build a canonical trace before stepping phases.');
    const state = timelineState();
    let target;
    if (direction > 0) target = Math.min(activeTrace.phases.length - 1, Math.floor(state.phasePosition + 1e-9) + 1);
    else target = Math.max(0, Math.ceil(state.phasePosition - 1e-9) - 1);
    setPhase(panel, target);
  }

  function playbackTick(panel, timestamp) {
    if (!activeTrace || playbackDirection === 0 || panel.hidden) {
      pausePlayback(panel, false);
      return;
    }
    if (playbackLastTimestamp == null) playbackLastTimestamp = timestamp;
    const elapsed = Math.min(100, Math.max(0, timestamp - playbackLastTimestamp));
    playbackLastTimestamp = timestamp;
    const nextTime = traceTime + playbackDirection * elapsed * playbackSpeed / PLAYBACK_DURATION_MS;
    const reachedBoundary = nextTime <= 0 || nextTime >= 1;
    traceTime = clamp(nextTime, 0, 1);
    updateTimelineDisplay(panel);
    if (reachedBoundary) {
      const directionText = playbackDirection > 0 ? 'completed' : 'returned to the beginning';
      pausePlayback(panel, false);
      setStatus(panel, `Animated trace ${directionText}. Every point position was derived from canonical trace time.`, 'success');
      return;
    }
    playbackFrame = requestFrame(nextTimestamp => playbackTick(panel, nextTimestamp));
  }

  function startPlayback(panel, direction) {
    if (!activeTrace) fail('Build a canonical trace before playback.');
    if (direction !== 1 && direction !== -1) fail('Playback direction must be forward or reverse.');
    pausePlayback(panel, false);
    if (direction > 0 && traceTime >= 1) traceTime = 0;
    if (direction < 0 && traceTime <= 0) traceTime = 1;
    playbackDirection = direction;
    playbackLastTimestamp = null;
    updateTimelineDisplay(panel);
    playbackFrame = requestFrame(timestamp => playbackTick(panel, timestamp));
    setStatus(panel, `${direction > 0 ? 'Forward' : 'Reverse'} playback started at ${playbackSpeed}× in ${playbackMode} mode.`, 'success');
  }

  function selectPoint(panel, pointIdValue) {
    if (!activeTrace) fail('Build a canonical trace before selecting a point.');
    const pointId = Number(pointIdValue);
    if (!Number.isInteger(pointId) || pointId < 0 || pointId >= activeTrace.cellCount) fail(`Point ID must be an integer from 0 through ${activeTrace.cellCount - 1}.`);
    selectedPointId = pointId;
    updateTimelineDisplay(panel);
  }

  function clearTrace(panel, message = '') {
    pausePlayback(panel, false);
    activeTrace = null;
    traceTime = 0;
    selectedPointId = 0;
    renderer?.clearTraceState();
    panel.querySelector('[data-cube-trace-workspace]').hidden = true;
    panel.querySelector('[data-cube-trace-unavailable]').hidden = false;
    panel.querySelector('[data-cube-trace-unavailable]').textContent = message || 'Build a canonical single-block trace to begin animated inspection.';
  }

  function renderPhaseMarkers(panel) {
    panel.querySelector('[data-cube-trace-markers]').innerHTML = activeTrace.phases.map((phase, index) => `<button type="button" class="cube-trace-marker" data-cube-trace-marker="${index}" title="Jump to phase ${index + 1}: ${escapeHtml(phase.id)}"><span>${index + 1}</span><small>${escapeHtml(phase.id.replaceAll('-', ' '))}</small></button>`).join('');
  }

  function buildTrace(panel, options = {}) {
    if (!activeKey) fail('Generate or import a canonical key before building a trace.');
    if (activeKey.gridSize > MAX_MANUAL_TRACE_GRID_SIZE) {
      clearTrace(panel, `V6 detailed bit animation supports grids through ${MAX_MANUAL_TRACE_GRID_SIZE} × ${MAX_MANUAL_TRACE_GRID_SIZE}. The complete ${activeKey.gridSize} × ${activeKey.gridSize} point field remains visible.`);
      if (!options.quiet) setStatus(panel, 'Choose a 12 × 12 or smaller key for V6 bit animation.', 'error');
      return null;
    }
    const bits = normalizeBits(panel.querySelector('[data-cube-trace-bits]').value);
    const trace = Engine.traceEncryptBlock(bits, activeKey, 0);
    Engine.validateTransformationTrace(trace, activeKey);
    pausePlayback(panel, false);
    activeTrace = trace;
    traceTime = 0;
    selectedPointId = firstPayloadPoint(trace);
    renderTraceCollections(panel);
    renderPhaseMarkers(panel);
    panel.querySelector('[data-cube-trace-workspace]').hidden = false;
    panel.querySelector('[data-cube-trace-unavailable]').hidden = true;
    updateTimelineDisplay(panel);
    if (!options.quiet) setStatus(panel, `Canonical block ${trace.blockIndex} animation built from ${trace.phases.length} immutable phases and exact output ${trace.outputBlock}.`, 'success');
    return trace;
  }

  function applyDraftDirection(panel, message) {
    renderer?.setDirectionState(rendererDirectionState());
    updateDirectionSummary(panel);
    clearTrace(panel, 'Directional draft changed. Generate a canonical key before rebuilding the animated trace.');
    if (message) setStatus(panel, message);
  }

  function markDraftChanged(panel, reason) {
    readDraftFromControls(panel);
    applyDraftDirection(panel, `${reason} The loaded canonical key JSON remains unchanged. Generate a new canonical draft key to apply this direction.`);
  }

  function renderKey(panel, key, origin = 'generated') {
    const validated = Engine.validateKey(key);
    if (validated.gridSize > MAX_STATIC_GRID_SIZE) fail(`The detailed point renderer accepts grids through ${MAX_STATIC_GRID_SIZE} × ${MAX_STATIC_GRID_SIZE}. Full-resolution encoding remains available in the laboratory; larger rendering tiers are scheduled for V9.`);
    pausePlayback(panel, false);
    const points = Engine.buildPoints(validated);
    renderer.setScene({ gridSize: validated.gridSize, points });
    activeKey = validated;
    activeKeyOrigin = origin;
    syncControlsFromKey(panel, validated);
    renderer.setDirectionState(rendererDirectionState());
    panel.querySelector('[data-cube-visualizer-key]').value = JSON.stringify(validated, null, 2);
    panel.querySelector('[data-cube-visualizer-summary]').textContent = `Key ${validated.keyId} · ${validated.gridSize} × ${validated.gridSize} · ${points.length.toLocaleString()} exact keyed points`;
    updateDirectionSummary(panel);
    buildTrace(panel, { quiet: true });
    const originText = origin === 'imported' ? 'Imported canonical key' : 'Generated canonical key';
    const traceText = validated.gridSize <= MAX_MANUAL_TRACE_GRID_SIZE ? ' A reversible V6 trace timeline is ready at 0%.' : '';
    setStatus(panel, `${originText} ${validated.keyId} rendered with explicit input and output direction.${traceText} Camera movement changes only the view.`, 'success');
  }

  function generateKey(panel) {
    readDraftFromControls(panel);
    const key = Engine.createKey({
      gridSize: Number(panel.querySelector('[data-cube-visualizer-size]').value),
      seed: panel.querySelector('[data-cube-visualizer-seed]').value.trim() || DEFAULT_SEED,
      ...draftDirection,
      maskDensity: 1
    });
    renderKey(panel, key, 'generated');
  }

  function handleFaceClick(panel, face) {
    if (!FACES.includes(face)) return;
    if (pickRole === 'input') {
      panel.querySelector('[data-cube-visualizer-input-face]').value = face;
      draftDirection.inputFace = face;
      rebuildOutputOptions(panel, draftDirection.outputFace);
      draftDirection.outputFace = panel.querySelector('[data-cube-visualizer-output-face]').value;
      setPickRole(panel, 'output');
      applyDraftDirection(panel, `${title(face)} selected as the draft input face. Choose one of its four legal perpendicular output faces.`);
      return;
    }
    if (!legalOutputFaces().includes(face)) {
      setStatus(panel, `${title(face)} cannot be the output face for ${title(draftDirection.inputFace)} input. Select a perpendicular face.`, 'error');
      return;
    }
    panel.querySelector('[data-cube-visualizer-output-face]').value = face;
    draftDirection.outputFace = face;
    applyDraftDirection(panel, `${title(face)} selected as the draft output face. The loaded canonical key remains unchanged until you generate a new key.`);
  }

  function installRenderer(panel) {
    if (renderer) return;
    const fallback = panel.querySelector('[data-cube-visualizer-fallback]');
    try {
      renderer = RendererApi.createRenderer({
        canvas: panel.querySelector('[data-cube-visualizer-canvas]'),
        labelLayer: panel.querySelector('[data-cube-visualizer-label-layer]'),
        onFaceClick: face => handleFaceClick(panel, face)
      });
      fallback.hidden = true;
    } catch (error) {
      fallback.hidden = false;
      fallback.textContent = `${error.message} The canonical key and trace data remain available as text, but this browser cannot display the V6 scene.`;
      setStatus(panel, error.message, 'error');
      throw error;
    }
  }

  function bind(panel) {
    if (panel.dataset.cubeVisualizerBound === 'true') return;
    panel.dataset.cubeVisualizerBound = 'true';
    panel.querySelector('[data-cube-visualizer-close]').addEventListener('click', () => { pausePlayback(panel, false); panel.hidden = true; });
    panel.querySelector('[data-cube-visualizer-generate]').addEventListener('click', () => { try { generateKey(panel); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-visualizer-load]').addEventListener('click', () => { try { renderKey(panel, parseKey(panel), 'imported'); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelectorAll('[data-cube-visualizer-pick-role]').forEach(button => button.addEventListener('click', () => setPickRole(panel, button.dataset.cubeVisualizerPickRole)));
    panel.querySelector('[data-cube-visualizer-input-face]').addEventListener('change', () => markDraftChanged(panel, 'Input face draft changed.'));
    panel.querySelector('[data-cube-visualizer-output-face]').addEventListener('change', () => markDraftChanged(panel, 'Output face draft changed.'));
    panel.querySelector('[data-cube-visualizer-input-turns]').addEventListener('change', () => markDraftChanged(panel, 'Input orientation draft changed.'));
    panel.querySelector('[data-cube-visualizer-output-turns]').addEventListener('change', () => markDraftChanged(panel, 'Output orientation draft changed.'));
    panel.querySelector('[data-cube-visualizer-reset-camera]').addEventListener('click', () => renderer?.resetCamera());
    panel.querySelectorAll('[data-cube-visualizer-camera]').forEach(button => button.addEventListener('click', () => renderer?.setCameraPreset(button.dataset.cubeVisualizerCamera)));
    panel.querySelector('[data-cube-trace-build]').addEventListener('click', () => { try { buildTrace(panel); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-trace-bits]').addEventListener('input', () => clearTrace(panel, 'Manual bits changed. Rebuild the canonical animated trace.'));
    panel.querySelector('[data-cube-trace-first]').addEventListener('click', () => setPhase(panel, 0));
    panel.querySelector('[data-cube-trace-previous]').addEventListener('click', () => stepPhase(panel, -1));
    panel.querySelector('[data-cube-trace-next]').addEventListener('click', () => stepPhase(panel, 1));
    panel.querySelector('[data-cube-trace-last]').addEventListener('click', () => setPhase(panel, activeTrace ? activeTrace.phases.length - 1 : 0));
    panel.querySelector('[data-cube-trace-restart]').addEventListener('click', () => { if (activeTrace) { pausePlayback(panel, false); selectedPointId = firstPayloadPoint(activeTrace); setTraceTime(panel, 0); } });
    panel.querySelector('[data-cube-trace-play]').addEventListener('click', () => { try { startPlayback(panel, 1); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-trace-reverse-play]').addEventListener('click', () => { try { startPlayback(panel, -1); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-trace-pause]').addEventListener('click', () => pausePlayback(panel, true));
    panel.querySelector('[data-cube-trace-speed]').addEventListener('change', event => {
      const speed = Number(event.target.value);
      if (!PLAYBACK_SPEEDS.includes(speed)) return;
      playbackSpeed = speed;
      if (activeTrace) updateTimelineDisplay(panel);
    });
    panel.querySelector('[data-cube-trace-mode]').addEventListener('change', event => {
      const mode = event.target.value;
      if (!RendererApi.constants.PLAYBACK_MODES.includes(mode)) return;
      playbackMode = mode;
      if (activeTrace) updateTimelineDisplay(panel);
    });
    panel.querySelector('[data-cube-trace-timeline]').addEventListener('input', event => {
      try { setTraceTime(panel, Number(event.target.value) / 1000); } catch (error) { setStatus(panel, error.message, 'error'); }
    });
    panel.querySelector('[data-cube-trace-markers]').addEventListener('click', event => {
      const button = event.target.closest('[data-cube-trace-marker]');
      if (!button) return;
      setPhase(panel, button.dataset.cubeTraceMarker);
    });
    panel.querySelector('[data-cube-trace-select-point]').addEventListener('click', () => { try { selectPoint(panel, panel.querySelector('[data-cube-trace-point-id]').value); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-trace-workspace]').addEventListener('click', event => {
      const button = event.target.closest('[data-cube-trace-point]');
      if (!button) return;
      try { selectPoint(panel, button.dataset.cubeTracePoint); } catch (error) { setStatus(panel, error.message, 'error'); }
    });
    root?.document?.addEventListener('visibilitychange', () => {
      if (root.document.hidden && playbackDirection !== 0) pausePlayback(panel, false);
    });
  }

  function faceOptions(selected) { return FACES.map(face => `<option value="${face}"${face === selected ? ' selected' : ''}>${title(face)}</option>`).join(''); }
  function turnOptions(selected) { return [0,1,2,3].map(turns => `<option value="${turns}"${turns === selected ? ' selected' : ''}>${turns * 90}°</option>`).join(''); }
  function counterCard(name, label) { return `<div><span>${escapeHtml(label)}</span><strong data-cube-trace-counter="${name}">0</strong></div>`; }
  function traceStage(phase, titleText, body) { return `<section class="cube-trace-stage" hidden data-cube-trace-stage="${phase}"><h4>${escapeHtml(titleText)}</h4>${body}</section>`; }

  function buildPanel() {
    requireDependencies();
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;
    const host = document.getElementById('shadowrun') || document.querySelector('main') || document.body;
    panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'cube-visualizer-panel';
    panel.innerHTML = `
      <div class="cube-visualizer-header"><div><p class="eyebrow">V6 animated trace environment · reversible canonical time</p><h2>Binary Cube Encoder Visualizer</h2><p>Play, pause, reverse, scrub, restart, and inspect one real block while every visible position is recalculated from immutable trace time.</p></div><button type="button" class="layout-button" data-cube-visualizer-close>Close Visualizer</button></div>
      <p class="cube-visualizer-warning"><strong>Deterministic animation:</strong> motion interpolates between the ten V5 phase anchors. No point accumulates movement, and no animation code calculates encryption. Detailed bit animation supports grids through ${MAX_MANUAL_TRACE_GRID_SIZE} × ${MAX_MANUAL_TRACE_GRID_SIZE}; larger point fields remain static until the later batched-rendering stage.</p>
      <div class="cube-visualizer-layout">
        <aside class="cube-visualizer-controls">
          <div class="cube-visualizer-field"><label for="cube-visualizer-seed">Key seed</label><input id="cube-visualizer-seed" type="text" value="${DEFAULT_SEED}" spellcheck="false" data-cube-visualizer-seed></div>
          <div class="cube-visualizer-field"><label for="cube-visualizer-size">Detailed grid size</label><select id="cube-visualizer-size" data-cube-visualizer-size><option value="4">4 × 4</option><option value="12">12 × 12</option><option value="20">20 × 20</option><option value="28">28 × 28</option><option value="36">36 × 36</option><option value="44">44 × 44</option><option value="52">52 × 52</option><option value="60">60 × 60</option><option value="64">64 × 64</option></select></div>
          <fieldset class="cube-visualizer-direction-controls"><legend>Encoding direction draft</legend>
            <div class="cube-visualizer-face-row"><div class="cube-visualizer-field"><label for="cube-visualizer-input-face">Input face</label><select id="cube-visualizer-input-face" data-cube-visualizer-input-face>${faceOptions('top')}</select></div><div class="cube-visualizer-field"><label for="cube-visualizer-input-turns">Input orientation</label><select id="cube-visualizer-input-turns" data-cube-visualizer-input-turns>${turnOptions(0)}</select></div></div>
            <div class="cube-visualizer-face-row"><div class="cube-visualizer-field"><label for="cube-visualizer-output-face">Output face</label><select id="cube-visualizer-output-face" data-cube-visualizer-output-face></select></div><div class="cube-visualizer-field"><label for="cube-visualizer-output-turns">Output orientation</label><select id="cube-visualizer-output-turns" data-cube-visualizer-output-turns>${turnOptions(0)}</select></div></div>
            <div class="cube-visualizer-pick-controls" role="group" aria-label="Cube face click mode"><button type="button" class="layout-button active" aria-pressed="true" data-cube-visualizer-pick-role="input">Pick Input Face</button><button type="button" class="layout-button" aria-pressed="false" data-cube-visualizer-pick-role="output">Pick Output Face</button></div>
            <small data-cube-visualizer-pick-instruction>Cube clicks now select the input face.</small><p class="cube-visualizer-direction-summary" data-cube-visualizer-direction-summary></p>
          </fieldset>
          <div class="cube-visualizer-actions"><button type="button" class="link-button" data-cube-visualizer-generate>Generate Canonical Draft Key</button><button type="button" class="layout-button" data-cube-visualizer-load>Load Key JSON</button></div>
          <div class="cube-visualizer-field"><label for="cube-visualizer-key">Canonical key JSON</label><textarea id="cube-visualizer-key" spellcheck="false" data-cube-visualizer-key></textarea></div>
          <div><strong>Camera presets</strong><div class="cube-visualizer-camera-controls"><button type="button" class="layout-button" data-cube-visualizer-reset-camera>Perspective</button>${FACES.map(face => `<button type="button" class="layout-button" data-cube-visualizer-camera="${face}">${title(face)}</button>`).join('')}</div></div>
          <div class="cube-visualizer-status" role="status" aria-live="polite" data-cube-visualizer-status>Preparing the canonical demonstration key.</div>
        </aside>
        <div class="cube-visualizer-main-column">
          <div class="cube-visualizer-scene-shell"><canvas class="cube-visualizer-canvas" aria-label="Manipulatable three-dimensional Binary Cube animated point field" data-cube-visualizer-canvas></canvas><div class="cube-visualizer-label-layer" aria-hidden="true" data-cube-visualizer-label-layer></div><div class="cube-visualizer-fallback" hidden data-cube-visualizer-fallback></div><div class="cube-visualizer-scene-overlay"><div class="cube-visualizer-summary" data-cube-visualizer-summary>No key loaded.</div><div class="cube-visualizer-help">Click a face to select · Drag to orbit · Shift-drag or right-drag to pan · Wheel to zoom</div></div></div>
          <section class="cube-trace-panel">
            <div class="cube-trace-header"><div><p class="eyebrow">Canonical single-block timeline</p><h3>Animated Bit Flow</h3></div><div class="cube-visualizer-field cube-trace-bits-field"><label for="cube-trace-bits">Manual binary source</label><textarea id="cube-trace-bits" spellcheck="false" data-cube-trace-bits>${DEFAULT_BITS}</textarea></div><button type="button" class="link-button" data-cube-trace-build>Build Canonical Animated Trace</button></div>
            <p class="cube-trace-unavailable" data-cube-trace-unavailable>Build a canonical single-block trace to begin animated inspection.</p>
            <div hidden data-cube-trace-workspace>
              <div class="cube-trace-phase-bar"><strong data-cube-trace-phase-name>1 / 10 · source ready</strong><div class="cube-trace-controls"><button type="button" class="layout-button" data-cube-trace-first>First</button><button type="button" class="layout-button" data-cube-trace-previous>Previous Phase</button><button type="button" class="layout-button" data-cube-trace-reverse-play>Reverse</button><button type="button" class="layout-button" data-cube-trace-pause>Pause</button><button type="button" class="link-button" data-cube-trace-play>Play</button><button type="button" class="layout-button" data-cube-trace-next>Next Phase</button><button type="button" class="layout-button" data-cube-trace-last>Last</button><button type="button" class="layout-button" data-cube-trace-restart>Restart</button></div></div>
              <div class="cube-trace-playback-options"><label>Speed<select data-cube-trace-speed>${PLAYBACK_SPEEDS.map(speed => `<option value="${speed}"${speed === 1 ? ' selected' : ''}>${speed}×</option>`).join('')}</select></label><label>Motion cohort<select data-cube-trace-mode><option value="all">All bits</option><option value="selected">Selected bit only</option><option value="row">Selected input row</option></select></label></div>
              <div class="cube-trace-timeline"><input type="range" min="0" max="1000" step="1" value="0" aria-label="Binary Cube trace timeline" data-cube-trace-timeline><output data-cube-trace-timeline-readout>0.0% · segment 0.0%</output></div>
              <div class="cube-trace-markers" aria-label="Trace phase markers" data-cube-trace-markers></div>
              <div class="cube-trace-counters">${counterCard('source','Source bits consumed')}${counterCard('payload','Payload cells')}${counterCard('filler','Filler cells')}${counterCard('block','Block index')}${counterCard('point','Selected point')}${counterCard('input','Input face index')}${counterCard('output','Output face index')}${counterCard('final','Final output index')}${counterCard('time','Trace time')}${counterCard('progress','Segment progress')}</div>
              <div class="cube-trace-inspection-layout"><div class="cube-trace-stages">
                ${traceStage(0,'Source strip','<div class="cube-trace-strip" data-cube-trace-source-strip></div>')}
                ${traceStage(1,'Framed block','<div class="cube-trace-grid" data-cube-trace-framed-grid></div>')}
                ${traceStage(2,'Mask and filler distinction','<p>Payload and deterministic filler bits separate as the framed panel approaches the selected input face.</p>')}
                ${traceStage(3,'Input face cells','<div class="cube-trace-grid" data-cube-trace-input-grid></div>')}
                ${traceStage(4,'Point assignment','<div class="cube-trace-grid" data-cube-trace-point-grid></div>')}
                ${traceStage(5,'Point-field loaded','<p>Bits occupy their exact keyed 3D point identities. Pause or scrub to inspect any stable position.</p>')}
                ${traceStage(6,'Output projection selected','<p>The same point identities are recolored for the output projection without moving or remapping them.</p>')}
                ${traceStage(7,'Output face cells','<div class="cube-trace-grid" data-cube-trace-output-grid></div>')}
                ${traceStage(8,'Encrypted block emitted','<div class="cube-trace-strip" data-cube-trace-output-strip></div>')}
                ${traceStage(9,'Block complete','<p>The outward bit panel is the canonical encrypted block. Reverse playback returns every point along the exact same deterministic route.</p>')}
              </div><aside class="cube-trace-inspector-panel"><div class="cube-trace-point-selector"><label for="cube-trace-point-id">Inspect point ID</label><input id="cube-trace-point-id" type="number" min="0" step="1" value="0" data-cube-trace-point-id><button type="button" class="layout-button" data-cube-trace-select-point>Inspect</button></div><div class="cube-trace-inspector" data-cube-trace-inspector>Build a canonical trace to inspect a point.</div></aside></div>
            </div>
          </section>
        </div>
      </div>`;
    host.appendChild(panel);
    rebuildOutputOptions(panel, 'front');
    bind(panel);
    installRenderer(panel);
    setPickRole(panel, 'input');
    generateKey(panel);
    return panel;
  }

  function openPanel() {
    const panel = buildPanel();
    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    renderer?.render();
    return panel;
  }

  function currentState() {
    const direction = renderer?.getDirectionState?.() || rendererDirectionState();
    const details = selectedTraceDetails();
    const state = timelineState();
    const rendered = renderer?.getTraceState?.();
    return Object.freeze({
      panelOpen: Boolean(document.getElementById(PANEL_ID) && !document.getElementById(PANEL_ID).hidden),
      keyId: activeKey?.keyId || null,
      keyOrigin: activeKeyOrigin,
      gridSize: activeKey?.gridSize || null,
      activeInputFace: activeKey?.inputFace || null,
      activeOutputFace: activeKey?.outputFace || null,
      activeInputQuarterTurns: activeKey?.inputQuarterTurns ?? null,
      activeOutputQuarterTurns: activeKey?.outputQuarterTurns ?? null,
      draftInputFace: direction.inputFace,
      draftOutputFace: direction.outputFace,
      draftInputQuarterTurns: direction.inputQuarterTurns,
      draftOutputQuarterTurns: direction.outputQuarterTurns,
      legalOutputFaces: Object.freeze([...direction.legalOutputFaces]),
      pickRole,
      rendererVersion: RendererApi?.constants?.RENDERER_VERSION || null,
      traceReady: Boolean(activeTrace),
      traceTime: state?.traceTime ?? null,
      tracePhaseIndex: state?.phaseIndex ?? null,
      traceNextPhaseIndex: state?.nextPhaseIndex ?? null,
      tracePhaseProgress: state?.segmentProgress ?? null,
      tracePhaseId: activeTrace && state ? activeTrace.phases[state.phaseIndex].id : null,
      traceNextPhaseId: activeTrace && state ? activeTrace.phases[state.nextPhaseIndex].id : null,
      tracePhaseCount: activeTrace?.phases.length || 0,
      traceBlockIndex: activeTrace?.blockIndex ?? null,
      traceOutputBlock: activeTrace?.outputBlock || null,
      tracePlaying: playbackDirection !== 0,
      tracePlaybackDirection: playbackDirection,
      tracePlaybackSpeed: playbackSpeed,
      tracePlaybackMode: playbackMode,
      selectedPointId: details?.pointId ?? null,
      selectedSourceBitIndex: details?.sourceBitIndex ?? null,
      selectedInputCellIndex: details?.inputCellIndex ?? null,
      selectedOutputCellIndex: details?.outputCellIndex ?? null,
      selectedFinalOutputIndex: details?.finalOutputIndex ?? null,
      selectedFinalBit: details?.finalBit ?? null,
      selectedAnimatedPosition: rendered?.selectedPosition ? Object.freeze([...rendered.selectedPosition]) : null
    });
  }

  return Object.freeze({
    openPanel,
    currentState,
    constants: Object.freeze({ PANEL_ID, MAX_STATIC_GRID_SIZE, MAX_MANUAL_TRACE_GRID_SIZE, PLAYBACK_DURATION_MS, PLAYBACK_SPEEDS })
  });
});
