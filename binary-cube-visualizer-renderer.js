(function installBinaryCubeVisualizerRenderer(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubeVisualizerRenderer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeVisualizerRendererApi() {
  'use strict';

  const RENDERER_VERSION = '0.3.0';
  const FACES = Object.freeze(['top', 'bottom', 'front', 'back', 'left', 'right']);
  const FACE_GEOMETRY = Object.freeze({
    top: Object.freeze({ center: Object.freeze([0, 1, 0]), normal: Object.freeze([0, 1, 0]), u: Object.freeze([1, 0, 0]), v: Object.freeze([0, 0, 1]) }),
    bottom: Object.freeze({ center: Object.freeze([0, -1, 0]), normal: Object.freeze([0, -1, 0]), u: Object.freeze([1, 0, 0]), v: Object.freeze([0, 0, -1]) }),
    front: Object.freeze({ center: Object.freeze([0, 0, 1]), normal: Object.freeze([0, 0, 1]), u: Object.freeze([1, 0, 0]), v: Object.freeze([0, 1, 0]) }),
    back: Object.freeze({ center: Object.freeze([0, 0, -1]), normal: Object.freeze([0, 0, -1]), u: Object.freeze([-1, 0, 0]), v: Object.freeze([0, 1, 0]) }),
    left: Object.freeze({ center: Object.freeze([-1, 0, 0]), normal: Object.freeze([-1, 0, 0]), u: Object.freeze([0, 0, 1]), v: Object.freeze([0, 1, 0]) }),
    right: Object.freeze({ center: Object.freeze([1, 0, 0]), normal: Object.freeze([1, 0, 0]), u: Object.freeze([0, 0, -1]), v: Object.freeze([0, 1, 0]) })
  });
  const CAMERA_PRESETS = Object.freeze({
    perspective: Object.freeze({ yaw: 0.72, pitch: 0.48, distance: 4.6 }),
    front: Object.freeze({ yaw: 0, pitch: 0, distance: 4.2 }),
    back: Object.freeze({ yaw: Math.PI, pitch: 0, distance: 4.2 }),
    left: Object.freeze({ yaw: -Math.PI / 2, pitch: 0, distance: 4.2 }),
    right: Object.freeze({ yaw: Math.PI / 2, pitch: 0, distance: 4.2 }),
    top: Object.freeze({ yaw: 0, pitch: Math.PI / 2 - 0.001, distance: 4.2 }),
    bottom: Object.freeze({ yaw: 0, pitch: -Math.PI / 2 + 0.001, distance: 4.2 })
  });
  const COLORS = Object.freeze({
    input: Object.freeze([0.28, 0.88, 1]),
    output: Object.freeze([1, 0.7, 0.24]),
    legal: Object.freeze([0.34, 0.76, 0.5]),
    illegal: Object.freeze([0.28, 0.32, 0.36]),
    dim: Object.freeze([0.18, 0.24, 0.3]),
    payloadZero: Object.freeze([0.22, 0.62, 0.9]),
    payloadOne: Object.freeze([0.4, 0.93, 1]),
    fillerZero: Object.freeze([0.37, 0.4, 0.45]),
    fillerOne: Object.freeze([0.58, 0.62, 0.68]),
    projectedZero: Object.freeze([0.78, 0.45, 0.16]),
    projectedOne: Object.freeze([1, 0.78, 0.3]),
    selected: Object.freeze([1, 1, 1])
  });

  function fail(message) { throw new Error(message); }
  function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function subtract(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function scale(vector, scalar) { return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function normalize(vector) {
    const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
    return [vector[0] / length, vector[1] / length, vector[2] / length];
  }

  function normalizePointCoordinates(point, gridSize) {
    const size = Number(gridSize);
    if (!Number.isInteger(size) || size < 2) fail('Visualizer grid size must be at least 2.');
    const unit = 2 / (size - 1);
    return Object.freeze([-1 + Number(point.x) * unit, -1 + Number(point.y) * unit, -1 + Number(point.z) * unit]);
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
      pushVertex(vertices, corners[from], [0.58,0.72,0.82]); pushVertex(vertices, corners[to], [0.58,0.72,0.82]);
    }
    for (const [from,to,color] of [[[0,0,0],[1.42,0,0],[0.95,0.32,0.32]],[[0,0,0],[0,1.42,0],[0.34,0.92,0.46]],[[0,0,0],[0,0,1.42],[0.35,0.58,0.98]]]) {
      pushVertex(vertices, from, color); pushVertex(vertices, to, color);
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

  function colorForTracePoint(trace, pointId, phaseIndex, selectedPointId) {
    if (pointId === selectedPointId) return COLORS.selected;
    if (phaseIndex < 4) return COLORS.dim;
    const bit = trace.bitByPoint[pointId];
    const filler = trace.cellKindByPoint[pointId] === 'filler';
    if (phaseIndex < 6) return filler ? (bit === '1' ? COLORS.fillerOne : COLORS.fillerZero) : (bit === '1' ? COLORS.payloadOne : COLORS.payloadZero);
    return bit === '1' ? COLORS.projectedOne : COLORS.projectedZero;
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
      if (!this.lineBuffer || !this.pointBuffer || !this.selectionLineBuffer || !this.arrowBuffer || !this.selectedPointBuffer) fail('WebGL could not allocate Binary Cube scene buffers.');
      this.lineVertexCount = 0;
      this.selectionLineVertexCount = 0;
      this.arrowVertexCount = 0;
      this.pointCount = 0;
      this.selectedPointCount = 0;
      this.gridSize = 0;
      this.scenePoints = [];
      this.directionState = null;
      this.traceState = null;
      this.directionLabelPositions = {};
      this.camera = { ...CAMERA_PRESETS.perspective, panX: 0, panY: 0, panZ: 0 };
      this.pointer = null;
      this.pointerMoved = false;
      this.disposed = false;
      this.labels = new Map();
      this.installLabels();
      this.installStaticLines();
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
        this.pointer.x = event.clientX; this.pointer.y = event.clientY;
        if (Math.hypot(event.clientX-this.pointer.startX,event.clientY-this.pointer.startY)>4) this.pointerMoved = true;
        if (this.pointer.mode === 'orbit') {
          this.camera.yaw -= deltaX * 0.008;
          this.camera.pitch = clamp(this.camera.pitch + deltaY * 0.008, -Math.PI/2+0.02, Math.PI/2-0.02);
        } else {
          const factor = this.camera.distance / Math.max(240,this.canvas.clientHeight) * 1.8;
          this.camera.panX -= deltaX * factor; this.camera.panY += deltaY * factor;
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

    uploadPointVertices(colors) {
      const vertices = new Float32Array(this.scenePoints.length * 6);
      for (let index = 0; index < this.scenePoints.length; index += 1) {
        const position = this.scenePoints[index];
        const color = colors[index];
        const offset = index * 6;
        vertices.set([...position,...color],offset);
      }
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.pointBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER,vertices,this.gl.DYNAMIC_DRAW);
      this.pointCount = this.scenePoints.length;
    }

    setScene(scene) {
      const gridSize = Number(scene?.gridSize);
      const points = scene?.points;
      if (!Number.isInteger(gridSize) || gridSize < 2) fail('The Binary Cube scene requires a valid grid size.');
      if (!Array.isArray(points) || points.length !== gridSize*gridSize) fail('The Binary Cube scene point field is incomplete.');
      this.gridSize = gridSize;
      this.scenePoints = points.map((point,index) => {
        if (!point || point.id !== index) fail(`Binary Cube scene point ${index} is invalid.`);
        return normalizePointCoordinates(point,gridSize);
      });
      this.clearTraceState();
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
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.selectionLineBuffer); this.gl.bufferData(this.gl.ARRAY_BUFFER,geometry.lines,this.gl.DYNAMIC_DRAW); this.selectionLineVertexCount = geometry.lines.length/6;
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.arrowBuffer); this.gl.bufferData(this.gl.ARRAY_BUFFER,geometry.arrows,this.gl.DYNAMIC_DRAW); this.arrowVertexCount = geometry.arrows.length/6;
      const legal = new Set(legalOutputFaces);
      for (const face of FACES) {
        const state = face===inputFace?'input':face===outputFace?'output':legal.has(face)?'legal':'illegal';
        const label = this.labels.get(face); label.dataset.state = state; label.textContent = `${face.toUpperCase()}${state==='input'?' · INPUT':state==='output'?' · OUTPUT':''}`;
      }
      const inputGeometry = FACE_GEOMETRY[inputFace];
      const outputGeometry = FACE_GEOMETRY[outputFace];
      this.directionLabelPositions = {
        'direction-input': add(inputGeometry.center,scale(inputGeometry.normal,1.02)),
        'direction-output': add(outputGeometry.center,scale(outputGeometry.normal,1.02))
      };
      const inputLabel = this.labels.get('direction-input'); inputLabel.textContent = `INPUT INWARD · ${inputFace.toUpperCase()} · ${inputQuarterTurns*90}°`; inputLabel.hidden = false;
      const outputLabel = this.labels.get('direction-output'); outputLabel.textContent = `OUTPUT OUTWARD · ${outputFace.toUpperCase()} · ${outputQuarterTurns*90}°`; outputLabel.hidden = false;
      this.render();
    }

    getDirectionState() { return this.directionState; }

    clearTraceState() {
      this.traceState = null;
      const colors = this.scenePoints.map((_,index) => {
        const depthRatio = this.gridSize <= 1 ? 0 : index % this.gridSize / (this.gridSize-1);
        return [0.38+depthRatio*0.22,0.66+depthRatio*0.18,0.82-depthRatio*0.12];
      });
      this.uploadPointVertices(colors);
      this.selectedPointCount = 0;
      const label = this.labels.get('trace-phase');
      if (label) label.hidden = true;
      this.render();
    }

    setTraceState(trace, phaseIndexValue, selectedPointIdValue) {
      if (!trace || !Array.isArray(trace.pointField) || !Array.isArray(trace.bitByPoint) || !Array.isArray(trace.cellKindByPoint) || !Array.isArray(trace.phases)) fail('A complete canonical transformation trace is required.');
      if (trace.pointField.length !== this.scenePoints.length) fail('Trace point count does not match the visible point field.');
      const phaseIndex = clamp(Number(phaseIndexValue)||0,0,trace.phases.length-1);
      const selectedPointId = clamp(Number(selectedPointIdValue)||0,0,trace.pointField.length-1);
      const colors = trace.pointField.map((_,pointId) => colorForTracePoint(trace,pointId,phaseIndex,selectedPointId));
      this.uploadPointVertices(colors);
      const selectedPosition = this.scenePoints[selectedPointId];
      const selectedVertices = new Float32Array([...selectedPosition,...COLORS.selected]);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.selectedPointBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER,selectedVertices,this.gl.DYNAMIC_DRAW);
      this.selectedPointCount = 1;
      this.traceState = Object.freeze({phaseIndex,phaseId:trace.phases[phaseIndex].id,selectedPointId});
      const label = this.labels.get('trace-phase');
      label.textContent = `PHASE ${phaseIndex+1}/${trace.phases.length} · ${trace.phases[phaseIndex].id.replaceAll('-',' ').toUpperCase()} · POINT ${selectedPointId}`;
      label.hidden = false;
      this.render();
    }

    getTraceState() { return this.traceState; }
    resetCamera() { this.camera = {...CAMERA_PRESETS.perspective,panX:0,panY:0,panZ:0}; this.render(); }
    setCameraPreset(name) { const preset = CAMERA_PRESETS[name]; if (!preset) fail(`Unknown Binary Cube camera preset: ${name}`); this.camera = {...preset,panX:0,panY:0,panZ:0}; this.render(); }

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
      return {eye,forward,right,up,aspect,viewProjection:multiplyMatrices(perspective(Math.PI/4,aspect,0.08,100),view)};
    }

    pickFaceAt(clientX,clientY) {
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const frame = this.cameraFrame();
      const ndcX = ((clientX-rect.left)/rect.width)*2-1;
      const ndcY = 1-((clientY-rect.top)/rect.height)*2;
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
      gl.enableVertexAttribArray(this.positionLocation); gl.vertexAttribPointer(this.positionLocation,3,gl.FLOAT,false,24,0);
      gl.enableVertexAttribArray(this.colorLocation); gl.vertexAttribPointer(this.colorLocation,3,gl.FLOAT,false,24,12);
    }

    positionLabels(viewProjection) {
      const positions = {'axis-x':[1.5,0,0],'axis-y':[0,1.5,0],'axis-z':[0,0,1.5],...this.directionLabelPositions,'trace-phase':[0,1.52,0]};
      for (const face of FACES) positions[face] = JSON.parse(this.labels.get(face).dataset.position);
      for (const [name,position] of Object.entries(positions)) {
        const label = this.labels.get(name); if (!label || (name.startsWith('direction-') && !this.directionState)) continue;
        const clip = transformPoint(viewProjection,position); const x=clip[0]/clip[3]; const y=clip[1]/clip[3];
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
      this.resizeCanvas();
      const gl = this.gl;
      const {viewProjection} = this.cameraFrame();
      gl.viewport(0,0,this.canvas.width,this.canvas.height);
      gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0.018,0.028,0.042,1); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.program); gl.uniformMatrix4fv(this.viewProjectionLocation,false,viewProjection);
      this.draw(this.lineBuffer,gl.LINES,this.lineVertexCount);
      this.draw(this.selectionLineBuffer,gl.LINES,this.selectionLineVertexCount);
      const pointSize = (this.gridSize<=12?7:this.gridSize<=32?4.5:2.5)*Math.min(2,window.devicePixelRatio||1);
      this.draw(this.pointBuffer,gl.POINTS,this.pointCount,pointSize,true);
      this.draw(this.selectedPointBuffer,gl.POINTS,this.selectedPointCount,Math.max(12,pointSize*1.8),true);
      this.draw(this.arrowBuffer,gl.TRIANGLES,this.arrowVertexCount);
      this.positionLabels(viewProjection);
    }

    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.resizeObserver?.disconnect();
      for (const [event,handler] of [['pointerdown',this.onPointerDown],['pointermove',this.onPointerMove],['pointerup',this.onPointerUp],['pointercancel',this.onPointerUp],['click',this.onClick],['wheel',this.onWheel],['contextmenu',this.onContextMenu]]) this.canvas.removeEventListener(event,handler);
      for (const buffer of [this.lineBuffer,this.pointBuffer,this.selectionLineBuffer,this.arrowBuffer,this.selectedPointBuffer]) this.gl.deleteBuffer(buffer);
      this.gl.deleteProgram(this.program);
      this.labelLayer.replaceChildren();
    }
  }

  function createRenderer(options) { return new Renderer(options); }
  return Object.freeze({createRenderer,normalizePointCoordinates,rayBoxFace,constants:Object.freeze({RENDERER_VERSION,FACES,FACE_GEOMETRY,CAMERA_PRESETS})});
});
