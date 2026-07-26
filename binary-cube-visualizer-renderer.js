(function installBinaryCubeVisualizerRenderer(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubeVisualizerRenderer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeVisualizerRendererApi() {
  'use strict';

  const RENDERER_VERSION = '0.1.0';
  const FACE_LABELS = Object.freeze({
    top: Object.freeze([0, 1.18, 0]),
    bottom: Object.freeze([0, -1.18, 0]),
    front: Object.freeze([0, 0, 1.18]),
    back: Object.freeze([0, 0, -1.18]),
    left: Object.freeze([-1.18, 0, 0]),
    right: Object.freeze([1.18, 0, 0])
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

  function fail(message) {
    throw new Error(message);
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function normalizePointCoordinates(point, gridSize) {
    const size = Number(gridSize);
    if (!Number.isInteger(size) || size < 2) fail('Visualizer grid size must be at least 2.');
    const scale = 2 / (size - 1);
    return Object.freeze([
      -1 + Number(point.x) * scale,
      -1 + Number(point.y) * scale,
      -1 + Number(point.z) * scale
    ]);
  }

  function subtract(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function cross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  function normalize(vector) {
    const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
    return [vector[0] / length, vector[1] / length, vector[2] / length];
  }

  function perspective(fieldOfView, aspect, near, far) {
    const f = 1 / Math.tan(fieldOfView / 2);
    const rangeInverse = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInverse, -1,
      0, 0, near * far * 2 * rangeInverse, 0
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
        output[column * 4 + row] =
          left[row] * right[column * 4]
          + left[4 + row] * right[column * 4 + 1]
          + left[8 + row] * right[column * 4 + 2]
          + left[12 + row] * right[column * 4 + 3];
      }
    }
    return output;
  }

  function transformPoint(matrix, point) {
    const [x, y, z] = point;
    return [
      matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
      matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
      matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
      matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15]
    ];
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
      in vec3 aPosition;
      in vec3 aColor;
      uniform mat4 uViewProjection;
      uniform float uPointSize;
      out vec3 vColor;
      void main() {
        gl_Position = uViewProjection * vec4(aPosition, 1.0);
        gl_PointSize = uPointSize;
        vColor = aColor;
      }
    `);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, `#version 300 es
      precision highp float;
      in vec3 vColor;
      uniform bool uPointMode;
      out vec4 outColor;
      void main() {
        if (uPointMode) {
          vec2 centered = gl_PointCoord - vec2(0.5);
          if (dot(centered, centered) > 0.25) discard;
        }
        outColor = vec4(vColor, 1.0);
      }
    `);
    const program = gl.createProgram();
    if (!program) fail('WebGL could not allocate a renderer program.');
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || 'Unknown program-link error.';
      gl.deleteProgram(program);
      fail(`Binary Cube visualizer program linking failed: ${message}`);
    }
    return program;
  }

  function pushVertex(target, position, color) {
    target.push(position[0], position[1], position[2], color[0], color[1], color[2]);
  }

  function staticLineVertices() {
    const vertices = [];
    const cubeColor = [0.58, 0.72, 0.82];
    const corners = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ];
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];
    for (const [from, to] of edges) {
      pushVertex(vertices, corners[from], cubeColor);
      pushVertex(vertices, corners[to], cubeColor);
    }
    const axes = [
      [[0, 0, 0], [1.42, 0, 0], [0.95, 0.32, 0.32]],
      [[0, 0, 0], [0, 1.42, 0], [0.34, 0.92, 0.46]],
      [[0, 0, 0], [0, 0, 1.42], [0.35, 0.58, 0.98]]
    ];
    for (const [from, to, color] of axes) {
      pushVertex(vertices, from, color);
      pushVertex(vertices, to, color);
    }
    return new Float32Array(vertices);
  }

  class Renderer {
    constructor(options) {
      this.canvas = options?.canvas;
      this.labelLayer = options?.labelLayer;
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
      if (!this.lineBuffer || !this.pointBuffer) fail('WebGL could not allocate Binary Cube scene buffers.');
      this.lineVertexCount = 0;
      this.pointCount = 0;
      this.gridSize = 0;
      this.camera = { ...CAMERA_PRESETS.perspective, panX: 0, panY: 0, panZ: 0 };
      this.pointer = null;
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
      for (const face of Object.keys(FACE_LABELS)) {
        const label = document.createElement('span');
        label.className = 'cube-visualizer-face-label';
        label.dataset.face = face;
        label.textContent = face.toUpperCase();
        this.labelLayer.appendChild(label);
        this.labels.set(face, label);
      }
      for (const axis of ['X', 'Y', 'Z']) {
        const label = document.createElement('span');
        label.className = 'cube-visualizer-axis-label';
        label.dataset.axis = axis.toLowerCase();
        label.textContent = axis;
        this.labelLayer.appendChild(label);
        this.labels.set(`axis-${axis.toLowerCase()}`, label);
      }
    }

    installStaticLines() {
      const gl = this.gl;
      const vertices = staticLineVertices();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
      this.lineVertexCount = vertices.length / 6;
    }

    bindEvents() {
      this.onPointerDown = event => {
        if (this.disposed) return;
        this.canvas.setPointerCapture(event.pointerId);
        this.pointer = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          mode: event.button === 2 || event.shiftKey ? 'pan' : 'orbit'
        };
      };
      this.onPointerMove = event => {
        if (!this.pointer || event.pointerId !== this.pointer.id) return;
        const deltaX = event.clientX - this.pointer.x;
        const deltaY = event.clientY - this.pointer.y;
        this.pointer.x = event.clientX;
        this.pointer.y = event.clientY;
        if (this.pointer.mode === 'orbit') {
          this.camera.yaw -= deltaX * 0.008;
          this.camera.pitch = clamp(this.camera.pitch + deltaY * 0.008, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
        } else {
          const scale = this.camera.distance / Math.max(240, this.canvas.clientHeight) * 1.8;
          this.camera.panX -= deltaX * scale;
          this.camera.panY += deltaY * scale;
        }
        this.render();
      };
      this.onPointerUp = event => {
        if (this.pointer?.id === event.pointerId) this.pointer = null;
      };
      this.onWheel = event => {
        event.preventDefault();
        this.camera.distance = clamp(this.camera.distance * Math.exp(event.deltaY * 0.001), 2.35, 12);
        this.render();
      };
      this.onContextMenu = event => event.preventDefault();
      this.canvas.addEventListener('pointerdown', this.onPointerDown);
      this.canvas.addEventListener('pointermove', this.onPointerMove);
      this.canvas.addEventListener('pointerup', this.onPointerUp);
      this.canvas.addEventListener('pointercancel', this.onPointerUp);
      this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
      this.canvas.addEventListener('contextmenu', this.onContextMenu);
    }

    setScene(scene) {
      if (this.disposed) fail('The Binary Cube renderer has been disposed.');
      const gridSize = Number(scene?.gridSize);
      const points = scene?.points;
      if (!Number.isInteger(gridSize) || gridSize < 2) fail('The Binary Cube scene requires a valid grid size.');
      if (!Array.isArray(points) || points.length !== gridSize * gridSize) fail('The Binary Cube scene point field is incomplete.');
      const vertices = new Float32Array(points.length * 6);
      for (let index = 0; index < points.length; index += 1) {
        const point = points[index];
        if (!point || point.id !== index) fail(`Binary Cube scene point ${index} is invalid.`);
        const position = normalizePointCoordinates(point, gridSize);
        const offset = index * 6;
        vertices[offset] = position[0];
        vertices[offset + 1] = position[1];
        vertices[offset + 2] = position[2];
        const depthRatio = gridSize <= 1 ? 0 : point.z / (gridSize - 1);
        vertices[offset + 3] = 0.38 + depthRatio * 0.34;
        vertices[offset + 4] = 0.72 + depthRatio * 0.18;
        vertices[offset + 5] = 0.92 - depthRatio * 0.18;
      }
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.pointBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
      this.gridSize = gridSize;
      this.pointCount = points.length;
      this.render();
    }

    resetCamera() {
      this.camera = { ...CAMERA_PRESETS.perspective, panX: 0, panY: 0, panZ: 0 };
      this.render();
    }

    setCameraPreset(name) {
      const preset = CAMERA_PRESETS[name];
      if (!preset) fail(`Unknown Binary Cube camera preset: ${name}`);
      this.camera = { ...preset, panX: 0, panY: 0, panZ: 0 };
      this.render();
    }

    cameraMatrices() {
      const { yaw, pitch, distance, panX, panY, panZ } = this.camera;
      const target = [panX, panY, panZ];
      const cosPitch = Math.cos(pitch);
      const eye = [
        target[0] + distance * cosPitch * Math.sin(yaw),
        target[1] + distance * Math.sin(pitch),
        target[2] + distance * cosPitch * Math.cos(yaw)
      ];
      const view = lookAt(eye, target, [0, 1, 0]);
      const aspect = Math.max(1, this.canvas.width) / Math.max(1, this.canvas.height);
      const projection = perspective(Math.PI / 4, aspect, 0.08, 100);
      return { eye, viewProjection: multiplyMatrices(projection, view) };
    }

    resizeCanvas() {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(this.canvas.clientWidth * ratio));
      const height = Math.max(1, Math.round(this.canvas.clientHeight * ratio));
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }
    }

    bindVertexBuffer(buffer) {
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(this.positionLocation);
      gl.vertexAttribPointer(this.positionLocation, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(this.colorLocation);
      gl.vertexAttribPointer(this.colorLocation, 3, gl.FLOAT, false, 24, 12);
    }

    positionLabels(viewProjection) {
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;
      const positions = {
        ...FACE_LABELS,
        'axis-x': [1.5, 0, 0],
        'axis-y': [0, 1.5, 0],
        'axis-z': [0, 0, 1.5]
      };
      for (const [name, position] of Object.entries(positions)) {
        const label = this.labels.get(name);
        if (!label) continue;
        const clip = transformPoint(viewProjection, position);
        const visible = clip[3] > 0;
        const x = clip[0] / clip[3];
        const y = clip[1] / clip[3];
        label.hidden = !visible || x < -1.2 || x > 1.2 || y < -1.2 || y > 1.2;
        if (!label.hidden) {
          label.style.transform = `translate(${(x * 0.5 + 0.5) * width}px, ${(-y * 0.5 + 0.5) * height}px) translate(-50%, -50%)`;
        }
      }
    }

    render() {
      if (this.disposed) return;
      this.resizeCanvas();
      const gl = this.gl;
      const { viewProjection } = this.cameraMatrices();
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0.018, 0.028, 0.042, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.program);
      gl.uniformMatrix4fv(this.viewProjectionLocation, false, viewProjection);

      this.bindVertexBuffer(this.lineBuffer);
      gl.uniform1f(this.pointSizeLocation, 1);
      gl.uniform1i(this.pointModeLocation, 0);
      gl.drawArrays(gl.LINES, 0, this.lineVertexCount);

      if (this.pointCount > 0) {
        this.bindVertexBuffer(this.pointBuffer);
        const pointSize = this.gridSize <= 12 ? 7 : this.gridSize <= 32 ? 4.5 : 2.5;
        gl.uniform1f(this.pointSizeLocation, pointSize * Math.min(2, window.devicePixelRatio || 1));
        gl.uniform1i(this.pointModeLocation, 1);
        gl.drawArrays(gl.POINTS, 0, this.pointCount);
      }
      this.positionLabels(viewProjection);
    }

    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.resizeObserver?.disconnect();
      this.canvas.removeEventListener('pointerdown', this.onPointerDown);
      this.canvas.removeEventListener('pointermove', this.onPointerMove);
      this.canvas.removeEventListener('pointerup', this.onPointerUp);
      this.canvas.removeEventListener('pointercancel', this.onPointerUp);
      this.canvas.removeEventListener('wheel', this.onWheel);
      this.canvas.removeEventListener('contextmenu', this.onContextMenu);
      this.gl.deleteBuffer(this.lineBuffer);
      this.gl.deleteBuffer(this.pointBuffer);
      this.gl.deleteProgram(this.program);
      this.labelLayer.replaceChildren();
    }
  }

  function createRenderer(options) {
    return new Renderer(options);
  }

  return Object.freeze({
    createRenderer,
    normalizePointCoordinates,
    constants: Object.freeze({ RENDERER_VERSION, FACE_LABELS, CAMERA_PRESETS })
  });
});
