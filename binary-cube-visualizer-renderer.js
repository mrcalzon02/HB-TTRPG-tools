(function installBinaryCubeVisualizerRenderer(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubeVisualizerRenderer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeVisualizerRendererApi() {
  'use strict';

  const RENDERER_VERSION = '0.6.0';
  const FACES = Object.freeze(['top', 'bottom', 'front', 'back', 'left', 'right']);
  const PLAYBACK_MODES = Object.freeze(['all', 'selected', 'row', 'serial']);
  const RENDER_QUALITIES = Object.freeze(['auto', 'exact', 'sampled', 'aggregate']);
  const VIEW_MODES = Object.freeze(['perspective', 'isometric']);
  const DEFAULT_MANUAL_BITS = '01001100110100110100110011010011';
  const DEFAULT_LOREM_TEXT = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
  const RENDER_TIER_POLICY = Object.freeze({
    detailedMaximum: 12,
    batchedMaximum: 64,
    sampledMaximum: 256,
    exactPointMaximum: 65536,
    sampledPointBudget: 8192,
    aggregatePointBudget: 2048
  });
  const FACE_GEOMETRY = Object.freeze({
    top: Object.freeze({ center: Object.freeze([0, 1, 0]), normal: Object.freeze([0, 1, 0]), u: Object.freeze([1, 0, 0]), v: Object.freeze([0, 0, 1]) }),
    bottom: Object.freeze({ center: Object.freeze([0, -1, 0]), normal: Object.freeze([0, -1, 0]), u: Object.freeze([1, 0, 0]), v: Object.freeze([0, 0, -1]) }),
    front: Object.freeze({ center: Object.freeze([0, 0, 1]), normal: Object.freeze([0, 0, 1]), u: Object.freeze([1, 0, 0]), v: Object.freeze([0, 1, 0]) }),
    back: Object.freeze({ center: Object.freeze([0, 0, -1]), normal: Object.freeze([0, 0, -1]), u: Object.freeze([-1, 0, 0]), v: Object.freeze([0, 1, 0]) }),
    left: Object.freeze({ center: Object.freeze([-1, 0, 0]), normal: Object.freeze([-1, 0, 0]), u: Object.freeze([0, 0, 1]), v: Object.freeze([0, 1, 0]) }),
    right: Object.freeze({ center: Object.freeze([1, 0, 0]), normal: Object.freeze([1, 0, 0]), u: Object.freeze([0, 0, -1]), v: Object.freeze([0, 1, 0]) })
  });
  const CAMERA_PRESETS = Object.freeze({
    perspective: Object.freeze({ yaw: 0.72, pitch: 0.48, distance: 4.8 }),
    isometric: Object.freeze({ yaw: Math.PI / 4, pitch: Math.atan(1 / Math.sqrt(2)), distance: 4.8 }),
    front: Object.freeze({ yaw: 0, pitch: 0, distance: 4.5 }),
    back: Object.freeze({ yaw: Math.PI, pitch: 0, distance: 4.5 }),
    left: Object.freeze({ yaw: -Math.PI / 2, pitch: 0, distance: 4.5 }),
    right: Object.freeze({ yaw: Math.PI / 2, pitch: 0, distance: 4.5 }),
    top: Object.freeze({ yaw: 0, pitch: Math.PI / 2 - 0.001, distance: 4.5 }),
    bottom: Object.freeze({ yaw: 0, pitch: -Math.PI / 2 + 0.001, distance: 4.5 })
  });
  const COLORS = Object.freeze({
    input: Object.freeze([0.28, 0.88, 1]),
    output: Object.freeze([1, 0.7, 0.24]),
    legal: Object.freeze([0.34, 0.76, 0.5]),
    illegal: Object.freeze([0.28, 0.32, 0.36]),
    dim: Object.freeze([0.13, 0.18, 0.24]),
    payloadZero: Object.freeze([0.22, 0.62, 0.9]),
    payloadOne: Object.freeze([0.4, 0.93, 1]),
    fillerZero: Object.freeze([0.37, 0.4, 0.45]),
    fillerOne: Object.freeze([0.58, 0.62, 0.68]),
    projectedZero: Object.freeze([0.78, 0.45, 0.16]),
    projectedOne: Object.freeze([1, 0.78, 0.3]),
    selected: Object.freeze([1, 1, 1]),
    path: Object.freeze([0.88, 0.94, 1])
  });

  function fail(message) { throw new Error(message); }
  function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function subtract(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function scale(vector, scalar) { return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar]; }
  function mix(a, b, progress) { return [a[0] + (b[0] - a[0]) * progress, a[1] + (b[1] - a[1]) * progress, a[2] + (b[2] - a[2]) * progress]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function normalize(vector) {
    const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
    return [vector[0] / length, vector[1] / length, vector[2] / length];
  }
  function smoothstep(progress) {
    const value = clamp(Number(progress) || 0, 0, 1);
    return value * value * (3 - 2 * value);
  }

  function nowMilliseconds() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
  }

  function textToBits(text) {
    const bytes = typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(String(text ?? ''))
      : Uint8Array.from(unescape(encodeURIComponent(String(text ?? ''))), character => character.charCodeAt(0));
    return Array.from(bytes, byte => byte.toString(2).padStart(8, '0')).join('');
  }

  function normalizeRenderQuality(value) {
    return RENDER_QUALITIES.includes(value) ? value : 'auto';
  }

  function deterministicSamplePointIds(gridSizeValue, budgetValue, options = {}) {
    const gridSize = Number(gridSizeValue);
    const totalPointCount = gridSize * gridSize;
    const budget = clamp(Math.floor(Number(budgetValue) || totalPointCount), 1, totalPointCount);
    if (!Number.isInteger(gridSize) || gridSize < 2) fail('A valid grid size is required for deterministic point sampling.');
    if (budget >= totalPointCount) return Object.freeze(Array.from({ length: totalPointCount }, (_, pointId) => pointId));
    const selectedPointId = Number(options.selectedPointId);
    const selectedRow = Number(options.selectedRow);
    const ids = new Set();
    const side = Math.max(2, Math.floor(Math.sqrt(budget)));
    for (let xIndex = 0; xIndex < side; xIndex += 1) {
      const x = Math.round(xIndex * (gridSize - 1) / Math.max(1, side - 1));
      for (let yIndex = 0; yIndex < side && ids.size < budget; yIndex += 1) {
        const y = Math.round(yIndex * (gridSize - 1) / Math.max(1, side - 1));
        ids.add(x * gridSize + y);
      }
    }
    if (Number.isInteger(selectedRow) && selectedRow >= 0 && selectedRow < gridSize) {
      for (let columnIndex = 0; columnIndex < side && ids.size < budget; columnIndex += 1) {
        const column = Math.round(columnIndex * (gridSize - 1) / Math.max(1, side - 1));
        ids.add(selectedRow * gridSize + column);
      }
    }
    const stride = Math.max(1, Math.floor(totalPointCount / budget));
    for (let pointId = 0; ids.size < budget && pointId < totalPointCount; pointId += stride) ids.add(pointId);
    if (Number.isInteger(selectedPointId) && selectedPointId >= 0 && selectedPointId < totalPointCount && !ids.has(selectedPointId)) {
      if (ids.size >= budget) ids.delete(Array.from(ids).at(-1));
      ids.add(selectedPointId);
    }
    if (!ids.has(0)) { if (ids.size >= budget) ids.delete(Array.from(ids).at(-1)); ids.add(0); }
    if (!ids.has(totalPointCount - 1)) { if (ids.size >= budget) ids.delete(Array.from(ids).at(-1)); ids.add(totalPointCount - 1); }
    return Object.freeze(Array.from(ids).sort((left, right) => left - right));
  }

  function resolveRenderPlan(gridSizeValue, qualityValue = 'auto', options = {}) {
    const gridSize = Number(gridSizeValue);
    if (!Number.isInteger(gridSize) || gridSize < 2) fail('A valid grid size is required for a renderer performance plan.');
    const totalPointCount = gridSize * gridSize;
    const requestedQuality = normalizeRenderQuality(qualityValue);
    let tier;
    let effectiveQuality;
    let budget;
    let fallback = false;
    if (requestedQuality === 'auto') {
      if (gridSize <= RENDER_TIER_POLICY.detailedMaximum) { tier = 'detailed'; effectiveQuality = 'exact'; budget = totalPointCount; }
      else if (gridSize <= RENDER_TIER_POLICY.batchedMaximum) { tier = 'batched'; effectiveQuality = 'exact'; budget = totalPointCount; }
      else if (gridSize <= RENDER_TIER_POLICY.sampledMaximum) { tier = 'sampled'; effectiveQuality = 'sampled'; budget = RENDER_TIER_POLICY.sampledPointBudget; }
      else { tier = 'aggregate'; effectiveQuality = 'aggregate'; budget = RENDER_TIER_POLICY.aggregatePointBudget; }
    } else if (requestedQuality === 'exact') {
      if (totalPointCount <= RENDER_TIER_POLICY.exactPointMaximum) {
        tier = gridSize <= RENDER_TIER_POLICY.detailedMaximum ? 'detailed' : 'batched';
        effectiveQuality = 'exact';
        budget = totalPointCount;
      } else {
        tier = 'sampled'; effectiveQuality = 'sampled'; budget = RENDER_TIER_POLICY.sampledPointBudget; fallback = true;
      }
    } else if (requestedQuality === 'sampled') {
      tier = 'sampled'; effectiveQuality = 'sampled'; budget = RENDER_TIER_POLICY.sampledPointBudget;
    } else {
      tier = 'aggregate'; effectiveQuality = 'aggregate'; budget = RENDER_TIER_POLICY.aggregatePointBudget;
    }
    const pointIds = deterministicSamplePointIds(gridSize, Math.min(totalPointCount, budget), options);
    return Object.freeze({
      gridSize,
      totalPointCount,
      requestedQuality,
      effectiveQuality,
      tier,
      fallback,
      renderedPointCount: pointIds.length,
      omittedPointCount: totalPointCount - pointIds.length,
      pointIds,
      fullRepresentation: pointIds.length === totalPointCount,
      disclosure: pointIds.length === totalPointCount
        ? `Exact ${pointIds.length.toLocaleString()}-point representation.`
        : `${tier === 'aggregate' ? 'Aggregate' : 'Sampled'} representation: ${pointIds.length.toLocaleString()} of ${totalPointCount.toLocaleString()} exact points. Encoding remains full resolution.`
    });
  }

  function resolveTraceRenderPointIds(traceValue, planValue, selectedPointIdValue, playbackModeValue) {
    const trace = validateTraceShape(traceValue);
    const selectedPointId = clamp(Number(selectedPointIdValue) || 0, 0, trace.pointField.length - 1);
    const playbackMode = PLAYBACK_MODES.includes(playbackModeValue) ? playbackModeValue : 'all';
    const plan = planValue?.gridSize === trace.gridSize ? planValue : resolveRenderPlan(trace.gridSize, 'auto');
    const selectedInputIndex = trace.inputCellIndexByPoint[selectedPointId];
    const selectedRow = playbackMode === 'row' ? Math.floor(selectedInputIndex / trace.gridSize) : null;
    return deterministicSamplePointIds(trace.gridSize, plan.renderedPointCount, { selectedPointId, selectedRow });
  }

  function normalizePointCoordinates(point, gridSize) {
    const size = Number(gridSize);
    if (!Number.isInteger(size) || size < 2) fail('Visualizer grid size must be at least 2.');
    const unit = 2 / (size - 1);
    return Object.freeze([-1 + Number(point.x) * unit, -1 + Number(point.y) * unit, -1 + Number(point.z) * unit]);
  }

  function resolveTraceTimeline(traceTimeValue, phaseCountValue) {
    const phaseCount = Number(phaseCountValue);
    if (!Number.isInteger(phaseCount) || phaseCount < 2) fail('Trace playback requires at least two phases.');
    const traceTime = clamp(Number(traceTimeValue) || 0, 0, 1);
    const segmentCount = phaseCount - 1;
    const phasePosition = traceTime * segmentCount;
    const phaseIndex = traceTime >= 1 ? phaseCount - 1 : Math.floor(phasePosition);
    const nextPhaseIndex = Math.min(phaseCount - 1, phaseIndex + 1);
    const segmentProgress = phaseIndex === nextPhaseIndex ? 0 : phasePosition - phaseIndex;
    return Object.freeze({
      traceTime,
      phaseCount,
      segmentCount,
      phasePosition,
      phaseIndex,
      nextPhaseIndex,
      segmentProgress,
      easedProgress: smoothstep(segmentProgress)
    });
  }

  function rayBoxFace(origin, direction) {
    if (!Array.isArray(origin) || origin.length !== 3 || !Array.isArray(direction) || direction.length !== 3) fail('Ray origin and direction must be three-dimensional arrays.');
    const axes = [
      { index: 0, minimumFace: 'left', maximumFace: 'right' },
      { index: 1, minimumFace: 'bottom', maximumFace: 'top' },
      { index: 2, minimumFace: 'back', maximumFace: 'front' }
    ];
    let enterDistance = -Infinity;
    let exitDistance = Infinity;
    let enterFace = null;
    let exitFace = null;
    for (const axis of axes) {
      const coordinate = Number(origin[axis.index]);
      const velocity = Number(direction[axis.index]);
      if (!Number.isFinite(coordinate) || !Number.isFinite(velocity)) fail('Ray values must be finite numbers.');
      if (Math.abs(velocity) < 1e-9) {
        if (coordinate < -1 || coordinate > 1) return null;
        continue;
      }
      let nearDistance = (-1 - coordinate) / velocity;
      let farDistance = (1 - coordinate) / velocity;
      let nearFace = axis.minimumFace;
      let farFace = axis.maximumFace;
      if (nearDistance > farDistance) {
        [nearDistance, farDistance] = [farDistance, nearDistance];
        [nearFace, farFace] = [farFace, nearFace];
      }
      if (nearDistance > enterDistance) { enterDistance = nearDistance; enterFace = nearFace; }
      if (farDistance < exitDistance) { exitDistance = farDistance; exitFace = farFace; }
      if (exitDistance < enterDistance) return null;
    }
    if (exitDistance < 0) return null;
    return enterDistance >= 0 ? enterFace : exitFace;
  }

  function perspective(fieldOfView, aspect, near, far) {
    const f = 1 / Math.tan(fieldOfView / 2);
    const rangeInverse = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (near + far) * rangeInverse, -1, 0, 0, near * far * 2 * rangeInverse, 0]);
  }

  function orthographic(left, right, bottom, top, near, far) {
    const width = right - left;
    const height = top - bottom;
    const depth = far - near;
    return new Float32Array([
      2 / width, 0, 0, 0,
      0, 2 / height, 0, 0,
      0, 0, -2 / depth, 0,
      -(right + left) / width, -(top + bottom) / height, -(far + near) / depth, 1
    ]);
  }

  function lookAt(eye, target, up) {
    const zAxis = normalize(subtract(eye, target));
    const xAxis = normalize(cross(up, zAxis));
    const yAxis = cross(zAxis, xAxis);
    return new Float32Array([
      xAxis[0], yAxis[0], zAxis[0], 0,
      xAxis[1], yAxis[1], zAxis[1], 0,
      xAxis[2], yAxis[2], zAxis[2], 0,
      -dot(xAxis, eye), -dot(yAxis, eye), -dot(zAxis, eye), 1
    ]);
  }

  function multiplyMatrices(left, right) {
    const output = new Float32Array(16);
    for (let column = 0; column < 4; column += 1) {
      for (let row = 0; row < 4; row += 1) {
        output[column * 4 + row] = left[row] * right[column * 4] + left[4 + row] * right[column * 4 + 1] + left[8 + row] * right[column * 4 + 2] + left[12 + row] * right[column * 4 + 3];
      }
    }
    return output;
  }

  function transformPoint(matrix, point) {
    const [x, y, z] = point;
    return [matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12], matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13], matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14], matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15]];
  }

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) fail('WebGL could not allocate a shader.');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'Unknown shader compilation error.';
      gl.deleteShader(shader);
      fail(`Binary Cube visualizer shader compilation failed: ${message}`);
    }
    return shader;
  }

  function createProgram(gl) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, `#version 300 es
      in vec3 aPosition; in vec3 aColor; uniform mat4 uViewProjection; uniform float uPointSize; out vec3 vColor;
      void main(){gl_Position=uViewProjection*vec4(aPosition,1.0);gl_PointSize=uPointSize;vColor=aColor;}`);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, `#version 300 es
      precision highp float; in vec3 vColor; uniform bool uPointMode; out vec4 outColor;
      void main(){if(uPointMode){vec2 centered=gl_PointCoord-vec2(0.5);if(dot(centered,centered)>0.25)discard;}outColor=vec4(vColor,1.0);}`);
    const program = gl.createProgram();
    if (!program) fail('WebGL could not allocate a renderer program.');
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) fail(`Binary Cube visualizer program linking failed: ${gl.getProgramInfoLog(program) || 'Unknown error.'}`);
    return program;
  }

  function pushVertex(target, position, color) { target.push(position[0], position[1], position[2], color[0], color[1], color[2]); }
  function pushTriangle(target, a, b, c, color) { pushVertex(target, a, color); pushVertex(target, b, color); pushVertex(target, c, color); }

  function staticLineVertices() {
    const vertices = [];
    const corners = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
    for (const [from,to] of [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]) {
      pushVertex(vertices, corners[from], [0.58,0.72,0.82]);
      pushVertex(vertices, corners[to], [0.58,0.72,0.82]);
    }
    for (const [from,to,color] of [[[0,0,0],[1.42,0,0],[0.95,0.32,0.32]],[[0,0,0],[0,1.42,0],[0.34,0.92,0.46]],[[0,0,0],[0,0,1.42],[0.35,0.58,0.98]]]) {
      pushVertex(vertices, from, color);
      pushVertex(vertices, to, color);
    }
    return new Float32Array(vertices);
  }

  function faceOutlineVertices(face, color) {
    const geometry = FACE_GEOMETRY[face];
    const center = add(geometry.center, scale(geometry.normal, 0.015));
    const u = scale(geometry.u, 1.015);
    const v = scale(geometry.v, 1.015);
    const corners = [add(add(center, scale(u,-1)),scale(v,-1)),add(add(center,u),scale(v,-1)),add(add(center,u),v),add(add(center,scale(u,-1)),v)];
    const vertices = [];
    for (const [from,to] of [[0,1],[1,2],[2,3],[3,0]]) { pushVertex(vertices,corners[from],color); pushVertex(vertices,corners[to],color); }
    return vertices;
  }

  function arrowPlaneVertices(target, start, tip, widthAxis, color) {
    const direction = normalize(subtract(tip, start));
    const headBase = add(tip, scale(direction, -0.3));
    const shaftHalf = scale(normalize(widthAxis), 0.055);
    const headHalf = scale(normalize(widthAxis), 0.19);
    const startLeft = add(start, scale(shaftHalf,-1));
    const startRight = add(start, shaftHalf);
    const baseLeft = add(headBase, scale(shaftHalf,-1));
    const baseRight = add(headBase, shaftHalf);
    pushTriangle(target,startLeft,startRight,baseRight,color);
    pushTriangle(target,startLeft,baseRight,baseLeft,color);
    pushTriangle(target,add(headBase,scale(headHalf,-1)),add(headBase,headHalf),tip,color);
  }

  function arrowVertices(face, role) {
    const geometry = FACE_GEOMETRY[face];
    const near = add(geometry.center, scale(geometry.normal, 0.08));
    const far = add(geometry.center, scale(geometry.normal, 0.92));
    const start = role === 'input' ? far : near;
    const tip = role === 'input' ? near : far;
    const color = role === 'input' ? COLORS.input : COLORS.output;
    const vertices = [];
    arrowPlaneVertices(vertices,start,tip,geometry.u,color);
    arrowPlaneVertices(vertices,start,tip,geometry.v,color);
    return vertices;
  }

  function directionGeometry(state) {
    const legal = new Set(state.legalOutputFaces);
    const lines = [];
    for (const face of FACES) {
      const color = face === state.inputFace ? COLORS.input : face === state.outputFace ? COLORS.output : legal.has(face) ? COLORS.legal : COLORS.illegal;
      lines.push(...faceOutlineVertices(face, color));
    }
    return {
      lines: new Float32Array(lines),
      arrows: new Float32Array([...arrowVertices(state.inputFace,'input'),...arrowVertices(state.outputFace,'output')])
    };
  }

  function validateTraceShape(trace) {
    if (!trace || !Array.isArray(trace.pointField) || !Array.isArray(trace.bitByPoint) || !Array.isArray(trace.cellKindByPoint) || !Array.isArray(trace.phases)) fail('A complete canonical transformation trace is required.');
    const required = ['inputCellIndexByPoint','outputCellIndexByPoint','sourceBitIndexByPoint','inputProjectionPointIds','outputProjectionPointIds'];
    for (const field of required) if (!Array.isArray(trace[field]) || trace[field].length !== trace.pointField.length) fail(`The canonical transformation trace ${field} array is incomplete.`);
    if (!Number.isInteger(trace.gridSize) || trace.gridSize < 2 || trace.pointField.length !== trace.gridSize * trace.gridSize) fail('The canonical transformation trace grid is invalid.');
    if (!FACES.includes(trace.inputFace) || !FACES.includes(trace.outputFace)) fail('The canonical transformation trace faces are invalid.');
    return trace;
  }

  function panelGridPosition(face, indexValue, countValue, outwardDistance, planeScale) {
    const geometry = FACE_GEOMETRY[face];
    const count = Math.max(1, Number(countValue) || 1);
    const side = Math.max(1, Math.ceil(Math.sqrt(count)));
    const index = clamp(Number(indexValue) || 0, 0, count - 1);
    const row = Math.floor(index / side);
    const column = index % side;
    const columnCoordinate = side === 1 ? 0 : -planeScale + (2 * planeScale * column) / (side - 1);
    const rowCoordinate = side === 1 ? 0 : planeScale - (2 * planeScale * row) / (side - 1);
    return add(add(add(geometry.center, scale(geometry.normal, outwardDistance)), scale(geometry.u, columnCoordinate)), scale(geometry.v, rowCoordinate));
  }

  function faceCellPosition(face, cellIndexValue, gridSizeValue, outwardDistance) {
    const geometry = FACE_GEOMETRY[face];
    const gridSize = Number(gridSizeValue);
    const cellIndex = Number(cellIndexValue);
    if (!Number.isInteger(gridSize) || gridSize < 2 || !Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= gridSize * gridSize) fail('A valid face cell and grid size are required.');
    const row = Math.floor(cellIndex / gridSize);
    const column = cellIndex % gridSize;
    const columnCoordinate = -1 + (2 * column) / (gridSize - 1);
    const rowCoordinate = 1 - (2 * row) / (gridSize - 1);
    return add(add(add(geometry.center, scale(geometry.normal, outwardDistance)), scale(geometry.u, columnCoordinate)), scale(geometry.v, rowCoordinate));
  }

  function pointAnchorPosition(traceValue, pointIdValue, phaseIndexValue) {
    const trace = validateTraceShape(traceValue);
    const pointId = Number(pointIdValue);
    const phaseIndex = clamp(Number(phaseIndexValue) || 0, 0, trace.phases.length - 1);
    if (!Number.isInteger(pointId) || pointId < 0 || pointId >= trace.pointField.length) fail(`Trace point ID must be an integer from 0 through ${trace.pointField.length - 1}.`);
    const inputIndex = trace.inputCellIndexByPoint[pointId];
    const outputIndex = trace.outputCellIndexByPoint[pointId];
    const sourceIndex = trace.sourceBitIndexByPoint[pointId];
    const sourceLocalIndex = sourceIndex >= 0 ? sourceIndex - trace.sourceBitRange.start : inputIndex;
    const sourceCount = sourceIndex >= 0 ? trace.sourceBitRange.consumed : trace.cellCount;
    const pointPosition = normalizePointCoordinates(trace.pointField[pointId], trace.gridSize);
    switch (phaseIndex) {
      case 0: return Object.freeze(panelGridPosition(trace.inputFace, sourceLocalIndex, sourceCount, sourceIndex >= 0 ? 1.2 : 1.35, sourceIndex >= 0 ? 0.78 : 0.92));
      case 1: return Object.freeze(panelGridPosition(trace.inputFace, inputIndex, trace.cellCount, 0.9, 0.82));
      case 2: return Object.freeze(panelGridPosition(trace.inputFace, inputIndex, trace.cellCount, 0.5, 0.94));
      case 3: return Object.freeze(faceCellPosition(trace.inputFace, inputIndex, trace.gridSize, 0.04));
      case 4:
      case 5:
      case 6: return pointPosition;
      case 7: return Object.freeze(faceCellPosition(trace.outputFace, outputIndex, trace.gridSize, 0.04));
      case 8: return Object.freeze(panelGridPosition(trace.outputFace, outputIndex, trace.cellCount, 0.9, 0.82));
      default: return Object.freeze(panelGridPosition(trace.outputFace, outputIndex, trace.cellCount, 1.2, 0.78));
    }
  }

  function pointParticipates(trace, pointId, selectedPointId, playbackMode) {
    if (playbackMode === 'all' || playbackMode === 'serial') return true;
    if (playbackMode === 'selected') return pointId === selectedPointId;
    const selectedInputIndex = trace.inputCellIndexByPoint[selectedPointId];
    const pointInputIndex = trace.inputCellIndexByPoint[pointId];
    return Math.floor(selectedInputIndex / trace.gridSize) === Math.floor(pointInputIndex / trace.gridSize);
  }

  function serialPlaybackState(traceValue, traceTimeValue) {
    const trace = validateTraceShape(traceValue);
    const pointCount = trace.pointField.length;
    const traceTime = clamp(Number(traceTimeValue) || 0, 0, 1);
    const scaled = traceTime * pointCount;
    const inputCellIndex = traceTime >= 1 ? pointCount - 1 : Math.min(pointCount - 1, Math.floor(scaled));
    const localTraceTime = traceTime >= 1 ? 1 : clamp(scaled - inputCellIndex, 0, 1);
    const activePointId = trace.inputProjectionPointIds[inputCellIndex];
    return Object.freeze({
      traceTime,
      pointCount,
      inputCellIndex,
      activePointId,
      localTraceTime,
      completedPointCount: traceTime >= 1 ? pointCount : Math.floor(scaled)
    });
  }

  function serialPointTraceTime(traceValue, pointIdValue, traceTimeValue) {
    const trace = validateTraceShape(traceValue);
    const pointId = Number(pointIdValue);
    if (!Number.isInteger(pointId) || pointId < 0 || pointId >= trace.pointField.length) fail(`Trace point ID must be an integer from 0 through ${trace.pointField.length - 1}.`);
    const inputCellIndex = trace.inputCellIndexByPoint[pointId];
    return clamp(clamp(Number(traceTimeValue) || 0, 0, 1) * trace.pointField.length - inputCellIndex, 0, 1);
  }

  function samePosition(left, right) {
    return Math.abs(left[0] - right[0]) < 1e-9 && Math.abs(left[1] - right[1]) < 1e-9 && Math.abs(left[2] - right[2]) < 1e-9;
  }

  function traceMotionAnchors(traceValue, pointIdValue) {
    const trace = validateTraceShape(traceValue);
    const anchors = [];
    for (let phaseIndex = 0; phaseIndex < trace.phases.length; phaseIndex += 1) {
      const position = pointAnchorPosition(trace, pointIdValue, phaseIndex);
      if (!anchors.length || !samePosition(anchors[anchors.length - 1], position)) anchors.push(position);
    }
    return anchors;
  }

  function tweenPointAcrossTrace(traceValue, pointIdValue, traceTimeValue) {
    const trace = validateTraceShape(traceValue);
    const anchors = traceMotionAnchors(trace, pointIdValue);
    if (anchors.length <= 1) return Object.freeze([...(anchors[0] || [0, 0, 0])]);
    const traceTime = clamp(Number(traceTimeValue) || 0, 0, 1);
    const segmentPosition = traceTime * (anchors.length - 1);
    const segmentIndex = traceTime >= 1 ? anchors.length - 2 : Math.floor(segmentPosition);
    const segmentProgress = traceTime >= 1 ? 1 : segmentPosition - segmentIndex;
    return Object.freeze(mix(anchors[segmentIndex], anchors[segmentIndex + 1], smoothstep(segmentProgress)));
  }

  function tracePointPosition(traceValue, pointIdValue, traceTimeValue, selectedPointIdValue = 0, playbackModeValue = 'all') {
    const trace = validateTraceShape(traceValue);
    const pointId = Number(pointIdValue);
    const selectedPointId = clamp(Number(selectedPointIdValue) || 0, 0, trace.pointField.length - 1);
    const playbackMode = PLAYBACK_MODES.includes(playbackModeValue) ? playbackModeValue : 'all';
    if (playbackMode === 'serial') return tweenPointAcrossTrace(trace, pointId, serialPointTraceTime(trace, pointId, traceTimeValue));
    if (!pointParticipates(trace, pointId, selectedPointId, playbackMode)) return pointAnchorPosition(trace, pointId, 0);
    const timeline = resolveTraceTimeline(traceTimeValue, trace.phases.length);
    const start = pointAnchorPosition(trace, pointId, timeline.phaseIndex);
    const end = pointAnchorPosition(trace, pointId, timeline.nextPhaseIndex);
    return Object.freeze(mix(start, end, timeline.easedProgress));
  }

  function colorAtPhase(trace, pointId, phaseIndex) {
    const bit = trace.bitByPoint[pointId];
    const filler = trace.cellKindByPoint[pointId] === 'filler';
    if (phaseIndex === 0 && filler) return COLORS.dim;
    if (phaseIndex < 6) return filler ? (bit === '1' ? COLORS.fillerOne : COLORS.fillerZero) : (bit === '1' ? COLORS.payloadOne : COLORS.payloadZero);
    return bit === '1' ? COLORS.projectedOne : COLORS.projectedZero;
  }

  function tracePointColor(trace, pointId, traceTimeValue, selectedPointId, playbackMode) {
    if (playbackMode !== 'serial' && pointId === selectedPointId) return COLORS.selected;
    const participates = pointParticipates(trace, pointId, selectedPointId, playbackMode);
    const localTraceTime = playbackMode === 'serial'
      ? serialPointTraceTime(trace, pointId, traceTimeValue)
      : participates ? clamp(Number(traceTimeValue) || 0, 0, 1) : 0;
    const timeline = resolveTraceTimeline(localTraceTime, trace.phases.length);
    const start = colorAtPhase(trace, pointId, timeline.phaseIndex);
    const end = colorAtPhase(trace, pointId, timeline.nextPhaseIndex);
    return mix(start, end, timeline.easedProgress);
  }

  function selectedPathVertices(trace, selectedPointId) {
    const phases = [0, 3, 4, 7, 9];
    const vertices = [];
    for (const phase of phases) pushVertex(vertices, pointAnchorPosition(trace, selectedPointId, phase), COLORS.path);
    return new Float32Array(vertices);
  }

  class Renderer {
    constructor(options) {
      this.canvas = options?.canvas;
      this.labelLayer = options?.labelLayer;
      this.onFaceClick = typeof options?.onFaceClick === 'function' ? options.onFaceClick : null;
      if (!(this.canvas instanceof HTMLCanvasElement)) fail('A canvas element is required for the Binary Cube renderer.');
      if (!(this.labelLayer instanceof HTMLElement)) fail('A label layer is required for the Binary Cube renderer.');
      this.gl = this.canvas.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: false });
      if (!this.gl) fail('WebGL2 is unavailable. The Binary Cube visualizer cannot create its 3D scene.');
      this.program = createProgram(this.gl);
      this.positionLocation = this.gl.getAttribLocation(this.program, 'aPosition');
      this.colorLocation = this.gl.getAttribLocation(this.program, 'aColor');
      this.viewProjectionLocation = this.gl.getUniformLocation(this.program, 'uViewProjection');
      this.pointSizeLocation = this.gl.getUniformLocation(this.program, 'uPointSize');
      this.pointModeLocation = this.gl.getUniformLocation(this.program, 'uPointMode');
      this.lineBuffer = this.gl.createBuffer();
      this.pointBuffer = this.gl.createBuffer();
      this.selectionLineBuffer = this.gl.createBuffer();
      this.arrowBuffer = this.gl.createBuffer();
      this.selectedPointBuffer = this.gl.createBuffer();
      this.selectedPathBuffer = this.gl.createBuffer();
      if (!this.lineBuffer || !this.pointBuffer || !this.selectionLineBuffer || !this.arrowBuffer || !this.selectedPointBuffer || !this.selectedPathBuffer) fail('WebGL could not allocate Binary Cube scene buffers.');
      this.lineVertexCount = 0;
      this.selectionLineVertexCount = 0;
      this.arrowVertexCount = 0;
      this.pointCount = 0;
      this.selectedPointCount = 0;
      this.selectedPathCount = 0;
      this.gridSize = 0;
      this.totalPointCount = 0;
      this.scenePointIds = [];
      this.scenePoints = [];
      this.renderPlan = resolveRenderPlan(4, 'auto');
      this.directionState = null;
      this.traceState = null;
      this.performanceState = Object.freeze({ sceneBuildMilliseconds: 0, uploadMilliseconds: 0, renderMilliseconds: 0, renderedPointCount: 0, totalPointCount: 0, bufferBytes: 0, tier: 'detailed', requestedQuality: 'auto', effectiveQuality: 'exact' });
      this.directionLabelPositions = {};
      this.camera = { ...CAMERA_PRESETS.perspective, panX: 0, panY: 0, panZ: 0 };
      this.viewMode = 'perspective';
      this.preIsometricCamera = null;
      this.viewportControls = null;
      this.viewportSerialMode = false;
      this.playbackMonitorFrame = null;
      this.pointer = null;
      this.pointerMoved = false;
      this.disposed = false;
      this.labels = new Map();
      this.installLabels();
      this.installStaticLines();
      this.installViewportControls();
      this.bindEvents();
      this.resizeObserver = new ResizeObserver(() => this.render());
      this.resizeObserver.observe(this.canvas);
      this.render();
    }

    installLabels() {
      this.labelLayer.replaceChildren();
      for (const face of FACES) {
        const geometry = FACE_GEOMETRY[face];
        const label = document.createElement('span');
        label.className = 'cube-visualizer-face-label';
        label.dataset.face = face;
        label.dataset.state = 'inactive';
        label.textContent = face.toUpperCase();
        label.dataset.position = JSON.stringify(add(geometry.center, scale(geometry.normal, 0.18)));
        this.labelLayer.appendChild(label);
        this.labels.set(face, label);
      }
      for (const axis of ['X','Y','Z']) {
        const label = document.createElement('span');
        label.className = 'cube-visualizer-axis-label';
        label.dataset.axis = axis.toLowerCase();
        label.textContent = axis;
        this.labelLayer.appendChild(label);
        this.labels.set(`axis-${axis.toLowerCase()}`, label);
      }
      for (const role of ['input','output']) {
        const label = document.createElement('span');
        label.className = `cube-visualizer-direction-label ${role}`;
        label.dataset.directionRole = role;
        label.hidden = true;
        this.labelLayer.appendChild(label);
        this.labels.set(`direction-${role}`, label);
      }
      const phaseLabel = document.createElement('span');
      phaseLabel.className = 'cube-visualizer-phase-label';
      phaseLabel.hidden = true;
      this.labelLayer.appendChild(phaseLabel);
      this.labels.set('trace-phase', phaseLabel);
    }

    installStaticLines() {
      const vertices = staticLineVertices();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.lineBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
      this.lineVertexCount = vertices.length / 6;
    }

    installViewportControls() {
      const shell = this.canvas.closest('[data-cube-visualizer-scene-shell]') || this.canvas.parentElement;
      if (!(shell instanceof HTMLElement)) return;
      if (getComputedStyle(shell).position === 'static') shell.style.position = 'relative';
      const controls = document.createElement('div');
      controls.className = 'cube-visualizer-viewport-controls';
      controls.setAttribute('role', 'group');
      controls.setAttribute('aria-label', 'Binary Cube viewport controls');
      Object.assign(controls.style, { position:'absolute', inset:'10px 10px auto 10px', zIndex:'30', pointerEvents:'none' });

      const play = document.createElement('button');
      play.type = 'button';
      play.className = 'layout-button cube-visualizer-viewport-play';
      play.textContent = '▶ Play Encoding';
      play.title = 'Build the canonical package if needed, then tween one validated canonical bit at a time through the cube.';
      play.setAttribute('aria-label', 'Play canonical Binary Cube encoding one bit at a time');
      Object.assign(play.style, { position:'absolute', left:'0', top:'0', pointerEvents:'auto', minHeight:'34px', boxShadow:'0 8px 24px rgba(0,0,0,.45)' });
      play.addEventListener('click', () => this.toggleCanonicalEncodingPlayback());

      const view = document.createElement('button');
      view.type = 'button';
      view.className = 'layout-button cube-visualizer-viewport-view';
      view.textContent = '👁 Isometric';
      view.title = 'Toggle a true orthographic isometric projection.';
      view.setAttribute('aria-label', 'Toggle isometric orthographic view');
      view.setAttribute('aria-pressed', 'false');
      Object.assign(view.style, { position:'absolute', right:'0', top:'0', pointerEvents:'auto', minHeight:'34px', boxShadow:'0 8px 24px rgba(0,0,0,.45)' });
      view.addEventListener('click', () => this.toggleIsometricView());

      controls.append(play, view);
      shell.appendChild(controls);
      this.viewportControls = { shell, controls, play, view };
    }

    updateViewControl() {
      const button = this.viewportControls?.view;
      if (!button) return;
      const isometric = this.viewMode === 'isometric';
      button.setAttribute('aria-pressed', String(isometric));
      button.textContent = isometric ? '👁 Perspective' : '👁 Isometric';
      button.title = isometric ? 'Return to the previous perspective camera.' : 'Switch to a true orthographic isometric projection.';
    }

    canonicalPanel() {
      return this.canvas.closest('.cube-visualizer-panel');
    }

    setViewportPlayState(state) {
      const button = this.viewportControls?.play;
      if (!button) return;
      if (state === 'playing') {
        button.disabled = false;
        button.textContent = '❚❚ Pause Encoding';
        button.setAttribute('aria-label', 'Pause canonical Binary Cube encoding playback');
      } else if (state === 'preparing') {
        button.disabled = true;
        button.textContent = 'Preparing Encoding…';
        button.setAttribute('aria-label', 'Preparing canonical Binary Cube encoding playback');
      } else {
        button.disabled = false;
        button.textContent = '▶ Play Encoding';
        button.setAttribute('aria-label', 'Play canonical Binary Cube encoding one bit at a time');
      }
    }

    reportViewportStatus(panel, message, type = '') {
      const node = panel?.querySelector('[data-cube-visualizer-status]');
      if (!node) return;
      node.textContent = message;
      node.classList.toggle('success', type === 'success');
      node.classList.toggle('error', type === 'error');
    }

    ensureDemoInput(panel) {
      const field = panel?.querySelector('[data-cube-trace-bits]');
      const note = panel?.querySelector('[data-cube-encoder-file-note]');
      if (!field || !note) return false;
      const normalized = field.value.replace(/\s+/g, '');
      const noFile = /^No file loaded/i.test(note.textContent || '');
      if (!noFile || (normalized && normalized !== DEFAULT_MANUAL_BITS)) return false;
      const bits = textToBits(DEFAULT_LOREM_TEXT);
      field.value = bits;
      note.textContent = `No file loaded; using built-in Lorem Ipsum demo input · ${bits.length / 8} bytes · ${bits.length} bits`;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    setPackagePlaybackScope(panel) {
      const scope = panel?.querySelector('[data-cube-trace-scope]');
      if (!scope || scope.value === 'all-blocks') return;
      scope.value = 'all-blocks';
      scope.dispatchEvent(new Event('change', { bubbles: true }));
    }

    monitorCanonicalPlayback(panel) {
      if (this.playbackMonitorFrame != null) cancelAnimationFrame(this.playbackMonitorFrame);
      const tick = () => {
        if (this.disposed) return;
        const play = panel?.querySelector('[data-cube-trace-play]');
        const playing = Boolean(play?.classList.contains('active'));
        this.setViewportPlayState(playing ? 'playing' : 'idle');
        if (playing) this.playbackMonitorFrame = requestAnimationFrame(tick);
        else {
          this.viewportSerialMode = false;
          this.playbackMonitorFrame = null;
        }
      };
      this.playbackMonitorFrame = requestAnimationFrame(tick);
    }

    waitForCanonicalTrace(panel, attempt = 0) {
      if (this.disposed) return;
      const workspace = panel?.querySelector('[data-cube-trace-workspace]');
      const play = panel?.querySelector('[data-cube-trace-play]');
      if (workspace && !workspace.hidden && play && !play.disabled) {
        this.setPackagePlaybackScope(panel);
        this.viewportSerialMode = true;
        play.click();
        this.monitorCanonicalPlayback(panel);
        return;
      }
      if (attempt >= 240) {
        this.viewportSerialMode = false;
        this.setViewportPlayState('idle');
        this.reportViewportStatus(panel, 'Exact animated trace playback is unavailable for the current package or rendering tier. The renderer did not substitute a decorative approximation.', 'error');
        return;
      }
      requestAnimationFrame(() => this.waitForCanonicalTrace(panel, attempt + 1));
    }

    toggleCanonicalEncodingPlayback() {
      const panel = this.canonicalPanel();
      if (!panel) return;
      const lowerPlay = panel.querySelector('[data-cube-trace-play]');
      if (lowerPlay?.classList.contains('active')) {
        panel.querySelector('[data-cube-trace-pause]')?.click();
        this.viewportSerialMode = false;
        this.setViewportPlayState('idle');
        return;
      }
      const workspace = panel.querySelector('[data-cube-trace-workspace]');
      if (workspace && !workspace.hidden && lowerPlay && !lowerPlay.disabled) {
        this.setPackagePlaybackScope(panel);
        this.viewportSerialMode = true;
        lowerPlay.click();
        this.monitorCanonicalPlayback(panel);
        return;
      }
      const usedDemo = this.ensureDemoInput(panel);
      const build = panel.querySelector('[data-cube-trace-build]');
      if (!build) {
        this.reportViewportStatus(panel, 'The canonical encoder action is unavailable; playback was not simulated.', 'error');
        return;
      }
      this.viewportSerialMode = true;
      this.setViewportPlayState('preparing');
      build.click();
      if (usedDemo) this.reportViewportStatus(panel, 'No source file was supplied. Built-in Lorem Ipsum bytes were passed through the canonical encoder and are being prepared for validated one-bit-at-a-time trace playback.', 'success');
      this.waitForCanonicalTrace(panel);
    }

    setViewMode(modeValue) {
      const mode = VIEW_MODES.includes(modeValue) ? modeValue : 'perspective';
      if (mode === this.viewMode) return this.getViewState();
      if (mode === 'isometric') {
        this.preIsometricCamera = { ...this.camera };
        this.camera = {
          ...CAMERA_PRESETS.isometric,
          distance: this.camera.distance,
          panX: this.camera.panX,
          panY: this.camera.panY,
          panZ: this.camera.panZ
        };
      } else {
        this.camera = this.preIsometricCamera ? { ...this.preIsometricCamera } : { ...CAMERA_PRESETS.perspective, panX:0, panY:0, panZ:0 };
        this.preIsometricCamera = null;
      }
      this.viewMode = mode;
      this.updateViewControl();
      this.render();
      return this.getViewState();
    }

    toggleIsometricView() {
      return this.setViewMode(this.viewMode === 'isometric' ? 'perspective' : 'isometric');
    }

    getViewState() {
      return Object.freeze({ mode: this.viewMode, camera: Object.freeze({ ...this.camera }), orthographic: this.viewMode === 'isometric' });
    }

    bindEvents() {
      this.onPointerDown = event => {
        try { this.canvas.setPointerCapture(event.pointerId); } catch (_) { /* Synthetic events may not own capture. */ }
        this.pointerMoved = false;
        this.pointer = { id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,mode:event.button===2||event.shiftKey?'pan':'orbit' };
      };
      this.onPointerMove = event => {
        if (!this.pointer || event.pointerId !== this.pointer.id) return;
        const deltaX = event.clientX - this.pointer.x;
        const deltaY = event.clientY - this.pointer.y;
        this.pointer.x = event.clientX;
        this.pointer.y = event.clientY;
        if (Math.hypot(event.clientX-this.pointer.startX,event.clientY-this.pointer.startY)>4) this.pointerMoved = true;
        if (this.pointer.mode === 'orbit') {
          this.camera.yaw -= deltaX * 0.008;
          this.camera.pitch = clamp(this.camera.pitch + deltaY * 0.008, -Math.PI/2+0.02, Math.PI/2-0.02);
        } else {
          const factor = this.camera.distance / Math.max(240,this.canvas.clientHeight) * 1.8;
          this.camera.panX -= deltaX * factor;
          this.camera.panY += deltaY * factor;
        }
        this.render();
      };
      this.onPointerUp = event => { if (this.pointer?.id === event.pointerId) this.pointer = null; };
      this.onClick = event => {
        if (this.pointerMoved || event.button !== 0 || event.shiftKey) { this.pointerMoved = false; return; }
        const face = this.pickFaceAt(event.clientX,event.clientY);
        if (face) this.onFaceClick?.(face,event);
      };
      this.onWheel = event => { event.preventDefault(); this.camera.distance = clamp(this.camera.distance*Math.exp(event.deltaY*0.001),2.35,12); this.render(); };
      this.onContextMenu = event => event.preventDefault();
      this.canvas.addEventListener('pointerdown',this.onPointerDown);
      this.canvas.addEventListener('pointermove',this.onPointerMove);
      this.canvas.addEventListener('pointerup',this.onPointerUp);
      this.canvas.addEventListener('pointercancel',this.onPointerUp);
      this.canvas.addEventListener('click',this.onClick);
      this.canvas.addEventListener('wheel',this.onWheel,{passive:false});
      this.canvas.addEventListener('contextmenu',this.onContextMenu);
    }

    uploadPointVertices(positions, colors) {
      const started = nowMilliseconds();
      const vertices = new Float32Array(positions.length * 6);
      for (let index = 0; index < positions.length; index += 1) {
        const offset = index * 6;
        vertices[offset] = positions[index][0];
        vertices[offset + 1] = positions[index][1];
        vertices[offset + 2] = positions[index][2];
        vertices[offset + 3] = colors[index][0];
        vertices[offset + 4] = colors[index][1];
        vertices[offset + 5] = colors[index][2];
      }
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.pointBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.DYNAMIC_DRAW);
      this.pointCount = positions.length;
      this.performanceState = Object.freeze({ ...this.performanceState, uploadMilliseconds: nowMilliseconds() - started, renderedPointCount: positions.length, bufferBytes: vertices.byteLength });
    }

    setScene(scene) {
      const started = nowMilliseconds();
      const gridSize = Number(scene?.gridSize);
      const points = scene?.points;
      const pointIds = Array.from(scene?.pointIds || points?.map(point => point.id) || []);
      const totalPointCount = Number(scene?.totalPointCount ?? gridSize * gridSize);
      const renderPlan = scene?.renderPlan || resolveRenderPlan(gridSize, scene?.quality || 'auto');
      if (!Number.isInteger(gridSize) || gridSize < 2) fail('The Binary Cube scene requires a valid grid size.');
      if (!Number.isInteger(totalPointCount) || totalPointCount !== gridSize * gridSize) fail('The Binary Cube scene exact point count is invalid.');
      if (!Array.isArray(points) || points.length !== pointIds.length || points.length !== renderPlan.renderedPointCount) fail('The Binary Cube scene sampled point field is incomplete.');
      this.gridSize = gridSize;
      this.totalPointCount = totalPointCount;
      this.scenePointIds = pointIds;
      this.scenePoints = points.map((point, index) => {
        if (!point || point.id !== pointIds[index]) fail(`Binary Cube sampled scene point ${index} is invalid.`);
        return normalizePointCoordinates(point, gridSize);
      });
      this.renderPlan = renderPlan;
      this.performanceState = Object.freeze({ ...this.performanceState, sceneBuildMilliseconds: nowMilliseconds() - started, renderedPointCount: points.length, totalPointCount, tier: renderPlan.tier, requestedQuality: renderPlan.requestedQuality, effectiveQuality: renderPlan.effectiveQuality });
      this.clearTraceState();
      return this.getPerformanceState();
    }

    setDirectionState(rawState) {
      const inputFace = String(rawState?.inputFace || '');
      const outputFace = String(rawState?.outputFace || '');
      const legalOutputFaces = Array.isArray(rawState?.legalOutputFaces) ? [...rawState.legalOutputFaces] : [];
      const inputQuarterTurns = ((Number(rawState?.inputQuarterTurns)||0)%4+4)%4;
      const outputQuarterTurns = ((Number(rawState?.outputQuarterTurns)||0)%4+4)%4;
      if (!FACES.includes(inputFace) || !FACES.includes(outputFace)) fail('Direction state requires valid input and output faces.');
      if (!legalOutputFaces.every(face => FACES.includes(face))) fail('Direction state contains an unknown legal output face.');
      this.directionState = Object.freeze({inputFace,outputFace,inputQuarterTurns,outputQuarterTurns,legalOutputFaces:Object.freeze(legalOutputFaces)});
      const geometry = directionGeometry(this.directionState);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.selectionLineBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER,geometry.lines,this.gl.DYNAMIC_DRAW);
      this.selectionLineVertexCount = geometry.lines.length/6;
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.arrowBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER,geometry.arrows,this.gl.DYNAMIC_DRAW);
      this.arrowVertexCount = geometry.arrows.length/6;
      const legal = new Set(legalOutputFaces);
      for (const face of FACES) {
        const state = face===inputFace?'input':face===outputFace?'output':legal.has(face)?'legal':'illegal';
        const label = this.labels.get(face);
        label.dataset.state = state;
        label.textContent = `${face.toUpperCase()}${state==='input'?' · INPUT':state==='output'?' · OUTPUT':''}`;
      }
      const inputGeometry = FACE_GEOMETRY[inputFace];
      const outputGeometry = FACE_GEOMETRY[outputFace];
      this.directionLabelPositions = {
        'direction-input': add(inputGeometry.center,scale(inputGeometry.normal,1.02)),
        'direction-output': add(outputGeometry.center,scale(outputGeometry.normal,1.02))
      };
      const inputLabel = this.labels.get('direction-input');
      inputLabel.textContent = `INPUT INWARD · ${inputFace.toUpperCase()} · ${inputQuarterTurns*90}°`;
      inputLabel.hidden = false;
      const outputLabel = this.labels.get('direction-output');
      outputLabel.textContent = `OUTPUT OUTWARD · ${outputFace.toUpperCase()} · ${outputQuarterTurns*90}°`;
      outputLabel.hidden = false;
      this.render();
    }

    getDirectionState() { return this.directionState; }

    clearTraceState() {
      this.traceState = null;
      const colors = this.scenePointIds.map(pointId => {
        const depthRatio = this.gridSize <= 1 ? 0 : pointId % this.gridSize / (this.gridSize - 1);
        return [0.38 + depthRatio * 0.22, 0.66 + depthRatio * 0.18, 0.82 - depthRatio * 0.12];
      });
      this.uploadPointVertices(this.scenePoints, colors);
      this.selectedPointCount = 0;
      this.selectedPathCount = 0;
      const label = this.labels.get('trace-phase');
      if (label) label.hidden = true;
      this.render();
    }

    setTraceTimelineState(traceValue, traceTimeValue, selectedPointIdValue, playbackModeValue = 'all') {
      const trace = validateTraceShape(traceValue);
      if (trace.pointField.length !== this.totalPointCount) fail('Trace point count does not match the exact scene point count.');
      const selectedPointId = clamp(Number(selectedPointIdValue) || 0, 0, trace.pointField.length - 1);
      const requestedPlaybackMode = PLAYBACK_MODES.includes(playbackModeValue) ? playbackModeValue : 'all';
      const playbackMode = this.viewportSerialMode ? 'serial' : requestedPlaybackMode;
      const timeline = resolveTraceTimeline(traceTimeValue, trace.phases.length);
      const serialState = playbackMode === 'serial' ? serialPlaybackState(trace, timeline.traceTime) : null;
      const stateTimeline = serialState ? resolveTraceTimeline(serialState.localTraceTime, trace.phases.length) : timeline;
      const renderedPointIds = resolveTraceRenderPointIds(trace, this.renderPlan, selectedPointId, playbackMode);
      const positions = renderedPointIds.map(pointId => tracePointPosition(trace, pointId, timeline.traceTime, selectedPointId, playbackMode));
      const colors = renderedPointIds.map(pointId => tracePointColor(trace, pointId, timeline.traceTime, selectedPointId, playbackMode));
      this.uploadPointVertices(positions, colors);

      const selectedPosition = tracePointPosition(trace, selectedPointId, timeline.traceTime, selectedPointId, playbackMode);
      const highlightedPointId = serialState?.activePointId ?? selectedPointId;
      const highlightedPosition = tracePointPosition(trace, highlightedPointId, timeline.traceTime, selectedPointId, playbackMode);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.selectedPointBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([...highlightedPosition, ...COLORS.selected]), this.gl.DYNAMIC_DRAW);
      this.selectedPointCount = 1;

      const pathVertices = selectedPathVertices(trace, highlightedPointId);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.selectedPathBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, pathVertices, this.gl.DYNAMIC_DRAW);
      this.selectedPathCount = pathVertices.length / 6;

      this.traceState = Object.freeze({
        traceTime: timeline.traceTime,
        phaseIndex: stateTimeline.phaseIndex,
        nextPhaseIndex: stateTimeline.nextPhaseIndex,
        phaseId: trace.phases[stateTimeline.phaseIndex].id,
        nextPhaseId: trace.phases[stateTimeline.nextPhaseIndex].id,
        segmentProgress: stateTimeline.segmentProgress,
        easedProgress: stateTimeline.easedProgress,
        selectedPointId,
        playbackMode,
        requestedPlaybackMode,
        activePointId: highlightedPointId,
        serialBitIndex: serialState?.inputCellIndex ?? null,
        serialBitProgress: serialState?.localTraceTime ?? null,
        renderedPointCount: renderedPointIds.length,
        totalPointCount: trace.pointField.length,
        renderTier: this.renderPlan.tier,
        selectedPosition: Object.freeze([...selectedPosition]),
        activePointPosition: Object.freeze([...highlightedPosition])
      });
      const label = this.labels.get('trace-phase');
      const transition = stateTimeline.phaseIndex === stateTimeline.nextPhaseIndex ? trace.phases[stateTimeline.phaseIndex].id : `${trace.phases[stateTimeline.phaseIndex].id} → ${trace.phases[stateTimeline.nextPhaseIndex].id}`;
      if (serialState) {
        const bit = trace.bitByPoint[serialState.activePointId];
        const kind = trace.cellKindByPoint[serialState.activePointId];
        const outputCellIndex = trace.outputCellIndexByPoint[serialState.activePointId];
        label.textContent = `SERIAL BIT ${serialState.inputCellIndex + 1}/${serialState.pointCount} · ${kind.toUpperCase()} ${bit} · ${(serialState.localTraceTime * 100).toFixed(1)}% ROUTE · INPUT ${serialState.inputCellIndex} → POINT ${serialState.activePointId} → OUTPUT ${outputCellIndex}`;
      } else {
        label.textContent = `TRACE ${(timeline.traceTime * 100).toFixed(1)}% · ${transition.replaceAll('-', ' ').toUpperCase()} · POINT ${selectedPointId} · ${renderedPointIds.length.toLocaleString()}/${trace.pointField.length.toLocaleString()} VISIBLE`;
      }
      label.hidden = false;
      this.render();
      return this.traceState;
    }

    setTraceState(trace, phaseIndexValue, selectedPointIdValue) {
      const phaseIndex = clamp(Number(phaseIndexValue)||0,0,trace.phases.length-1);
      const traceTime = phaseIndex / Math.max(1, trace.phases.length - 1);
      return this.setTraceTimelineState(trace, traceTime, selectedPointIdValue, 'all');
    }

    getTraceState() { return this.traceState; }
    getPerformanceState() { return Object.freeze({ ...this.performanceState, renderPlan: this.renderPlan }); }
    resetCamera() {
      this.viewMode = 'perspective';
      this.preIsometricCamera = null;
      this.camera = {...CAMERA_PRESETS.perspective,panX:0,panY:0,panZ:0};
      this.updateViewControl();
      this.render();
    }
    setCameraPreset(name) {
      const preset = CAMERA_PRESETS[name];
      if (!preset) fail(`Unknown Binary Cube camera preset: ${name}`);
      if (name === 'isometric') {
        this.setViewMode('isometric');
        return;
      }
      this.viewMode = 'perspective';
      this.preIsometricCamera = null;
      this.camera = {...preset,panX:0,panY:0,panZ:0};
      this.updateViewControl();
      this.render();
    }

    cameraFrame() {
      const {yaw,pitch,distance,panX,panY,panZ} = this.camera;
      const target = [panX,panY,panZ];
      const cosPitch = Math.cos(pitch);
      const eye = [target[0]+distance*cosPitch*Math.sin(yaw),target[1]+distance*Math.sin(pitch),target[2]+distance*cosPitch*Math.cos(yaw)];
      const forward = normalize(subtract(target,eye));
      const right = normalize(cross(forward,[0,1,0]));
      const up = normalize(cross(right,forward));
      const view = lookAt(eye,target,[0,1,0]);
      const aspect = Math.max(1,this.canvas.width)/Math.max(1,this.canvas.height);
      if (this.viewMode === 'isometric') {
        const halfHeight = clamp(distance * 0.46, 1.45, 5.6);
        const halfWidth = halfHeight * aspect;
        const projection = orthographic(-halfWidth, halfWidth, -halfHeight, halfHeight, 0.08, 100);
        return {eye,forward,right,up,aspect,projectionKind:'orthographic',halfWidth,halfHeight,viewProjection:multiplyMatrices(projection,view)};
      }
      return {eye,forward,right,up,aspect,projectionKind:'perspective',halfWidth:null,halfHeight:null,viewProjection:multiplyMatrices(perspective(Math.PI/4,aspect,0.08,100),view)};
    }

    pickFaceAt(clientX,clientY) {
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const frame = this.cameraFrame();
      const ndcX = ((clientX-rect.left)/rect.width)*2-1;
      const ndcY = 1-((clientY-rect.top)/rect.height)*2;
      if (frame.projectionKind === 'orthographic') {
        const origin = add(add(frame.eye, scale(frame.right, ndcX * frame.halfWidth)), scale(frame.up, ndcY * frame.halfHeight));
        return rayBoxFace(origin, frame.forward);
      }
      const tangent = Math.tan(Math.PI/8);
      const direction = normalize(add(add(frame.forward,scale(frame.right,ndcX*frame.aspect*tangent)),scale(frame.up,ndcY*tangent)));
      return rayBoxFace(frame.eye,direction);
    }

    resizeCanvas() {
      const ratio = Math.min(2,window.devicePixelRatio||1);
      const width = Math.max(1,Math.round(this.canvas.clientWidth*ratio));
      const height = Math.max(1,Math.round(this.canvas.clientHeight*ratio));
      if (this.canvas.width!==width || this.canvas.height!==height) { this.canvas.width=width; this.canvas.height=height; }
    }

    bindVertexBuffer(buffer) {
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.enableVertexAttribArray(this.positionLocation);
      gl.vertexAttribPointer(this.positionLocation,3,gl.FLOAT,false,24,0);
      gl.enableVertexAttribArray(this.colorLocation);
      gl.vertexAttribPointer(this.colorLocation,3,gl.FLOAT,false,24,12);
    }

    positionLabels(viewProjection) {
      const positions = {'axis-x':[1.5,0,0],'axis-y':[0,1.5,0],'axis-z':[0,0,1.5],...this.directionLabelPositions,'trace-phase':[0,1.52,0]};
      for (const face of FACES) positions[face] = JSON.parse(this.labels.get(face).dataset.position);
      for (const [name,position] of Object.entries(positions)) {
        const label = this.labels.get(name);
        if (!label || (name.startsWith('direction-') && !this.directionState)) continue;
        const clip = transformPoint(viewProjection,position);
        const x=clip[0]/clip[3];
        const y=clip[1]/clip[3];
        const hidden = clip[3]<=0 || x<-1.25 || x>1.25 || y<-1.25 || y>1.25;
        if (name !== 'trace-phase' || this.traceState) label.hidden = hidden;
        if (!label.hidden) label.style.transform = `translate(${(x*0.5+0.5)*this.canvas.clientWidth}px, ${(-y*0.5+0.5)*this.canvas.clientHeight}px) translate(-50%, -50%)`;
      }
    }

    draw(buffer, mode, count, pointSize=1, pointMode=false) {
      if (!count) return;
      this.bindVertexBuffer(buffer);
      this.gl.uniform1f(this.pointSizeLocation,pointSize);
      this.gl.uniform1i(this.pointModeLocation,pointMode?1:0);
      this.gl.drawArrays(mode,0,count);
    }

    render() {
      if (this.disposed) return;
      const started = nowMilliseconds();
      this.resizeCanvas();
      const gl = this.gl;
      const {viewProjection} = this.cameraFrame();
      gl.viewport(0,0,this.canvas.width,this.canvas.height);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0.018,0.028,0.042,1);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.program);
      gl.uniformMatrix4fv(this.viewProjectionLocation,false,viewProjection);
      this.draw(this.lineBuffer,gl.LINES,this.lineVertexCount);
      this.draw(this.selectionLineBuffer,gl.LINES,this.selectionLineVertexCount);
      this.draw(this.selectedPathBuffer,gl.LINE_STRIP,this.selectedPathCount);
      const pointSize = (this.renderPlan.tier === 'detailed' ? 7 : this.renderPlan.tier === 'batched' ? 4.5 : this.renderPlan.tier === 'sampled' ? 3.4 : 2.8) * Math.min(2, window.devicePixelRatio || 1);
      this.draw(this.pointBuffer,gl.POINTS,this.pointCount,pointSize,true);
      this.draw(this.selectedPointBuffer,gl.POINTS,this.selectedPointCount,Math.max(12,pointSize*1.8),true);
      this.draw(this.arrowBuffer,gl.TRIANGLES,this.arrowVertexCount);
      this.positionLabels(viewProjection);
      this.performanceState = Object.freeze({ ...this.performanceState, renderMilliseconds: nowMilliseconds() - started });
    }

    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.viewportSerialMode = false;
      this.resizeObserver?.disconnect();
      if (this.playbackMonitorFrame != null) cancelAnimationFrame(this.playbackMonitorFrame);
      this.viewportControls?.controls?.remove();
      for (const [event,handler] of [['pointerdown',this.onPointerDown],['pointermove',this.onPointerMove],['pointerup',this.onPointerUp],['pointercancel',this.onPointerUp],['click',this.onClick],['wheel',this.onWheel],['contextmenu',this.onContextMenu]]) this.canvas.removeEventListener(event,handler);
      for (const buffer of [this.lineBuffer,this.pointBuffer,this.selectionLineBuffer,this.arrowBuffer,this.selectedPointBuffer,this.selectedPathBuffer]) this.gl.deleteBuffer(buffer);
      this.gl.deleteProgram(this.program);
      this.labelLayer.replaceChildren();
    }
  }

  function createRenderer(options) { return new Renderer(options); }
  return Object.freeze({
    createRenderer,
    normalizePointCoordinates,
    resolveTraceTimeline,
    pointAnchorPosition,
    tracePointPosition,
    serialPlaybackState,
    serialPointTraceTime,
    tweenPointAcrossTrace,
    deterministicSamplePointIds,
    resolveRenderPlan,
    resolveTraceRenderPointIds,
    rayBoxFace,
    orthographic,
    textToBits,
    constants:Object.freeze({RENDERER_VERSION,FACES,FACE_GEOMETRY,CAMERA_PRESETS,PLAYBACK_MODES:Object.freeze(['all','selected','row']),RENDER_QUALITIES,VIEW_MODES,RENDER_TIER_POLICY,DEFAULT_LOREM_TEXT})
  });
});