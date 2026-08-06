(() => {
  'use strict';

  const active = new WeakMap();
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function hash(value) {
    let result = 2166136261;
    for (const character of String(value || '')) {
      result ^= character.charCodeAt(0);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function random(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let next = value;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  }

  function classifyTemplate(text) {
    const value = String(text || '').toLowerCase();
    if (/desert|arid|dune|sand world|dust world|wasteland/.test(value)) return 'desert';
    return 'unsealed';
  }

  function desertTexture(THREE, seed) {
    const width = 512;
    const height = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    const roll = random(seed ^ 0x7a51d39b);

    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#cda76a');
    gradient.addColorStop(0.28, '#b77c43');
    gradient.addColorStop(0.52, '#d1aa68');
    gradient.addColorStop(0.74, '#91532f');
    gradient.addColorStop(1, '#c59050');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.globalCompositeOperation = 'multiply';
    for (let band = 0; band < 34; band += 1) {
      const y = roll() * height;
      const amplitude = 2 + roll() * 12;
      const frequency = 0.008 + roll() * 0.025;
      context.beginPath();
      context.moveTo(0, y);
      for (let x = 0; x <= width; x += 8) {
        const ridge = Math.sin(x * frequency + roll() * 0.4) * amplitude;
        context.lineTo(x, y + ridge);
      }
      context.strokeStyle = `rgba(${70 + Math.floor(roll() * 55)},${42 + Math.floor(roll() * 35)},${24 + Math.floor(roll() * 22)},${0.05 + roll() * 0.11})`;
      context.lineWidth = 1 + roll() * 4;
      context.stroke();
    }

    for (let crater = 0; crater < 58; crater += 1) {
      const x = roll() * width;
      const y = roll() * height;
      const radius = 1.2 + roll() * 8;
      const craterGradient = context.createRadialGradient(x - radius * 0.25, y - radius * 0.2, radius * 0.12, x, y, radius);
      craterGradient.addColorStop(0, 'rgba(247,214,148,.18)');
      craterGradient.addColorStop(0.56, 'rgba(83,45,25,.16)');
      craterGradient.addColorStop(1, 'rgba(63,34,22,0)');
      context.fillStyle = craterGradient;
      context.beginPath();
      context.ellipse(x, y, radius, radius * (0.45 + roll() * 0.4), roll() * Math.PI, 0, Math.PI * 2);
      context.fill();
    }

    const image = context.getImageData(0, 0, width, height);
    for (let index = 0; index < image.data.length; index += 4) {
      const grain = Math.floor((roll() - 0.5) * 24);
      image.data[index] = clamp(image.data[index] + grain, 0, 255);
      image.data[index + 1] = clamp(image.data[index + 1] + grain, 0, 255);
      image.data[index + 2] = clamp(image.data[index + 2] + grain, 0, 255);
    }
    context.putImageData(image, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
  }

  function registeredMaterial(THREE, template, seed, fallbackColor) {
    if (template === 'desert') {
      const map = desertTexture(THREE, seed);
      return new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map,
        bumpMap: map,
        bumpScale: 0.035,
        roughness: 0.93,
        metalness: 0.015,
        emissive: 0x251208,
        emissiveIntensity: 0.08
      });
    }
    return new THREE.MeshStandardMaterial({
      color: fallbackColor,
      emissive: fallbackColor,
      emissiveIntensity: 0.22,
      roughness: 0.74,
      metalness: 0.08
    });
  }

  function profile(node, records) {
    const text = [node.id, node.name, ...records.flatMap(record => [record.name, record.objectType, record.classification, record.environment])].join('|');
    const roll = random(hash(text));
    const recordText = text.toLowerCase();
    const starColors = [0xffd88a, 0xffb56b, 0xfff0c4, 0xc9ddff, 0xff8b58];
    const bodyColors = recordText.includes('forge')
      ? [0x8c3926, 0xc65a30, 0x4f5455, 0xd28a39]
      : recordText.includes('desert')
        ? [0xc79b5c, 0x9b5737, 0xd6bd7a, 0x6d4933]
        : recordText.includes('ice')
          ? [0xd9f3ff, 0x91bed0, 0xe9f6f4, 0x718da8]
          : recordText.includes('dead') || recordText.includes('tomb')
            ? [0x77756f, 0x4f5352, 0x999589, 0x343838]
            : [0x5d9f83, 0xc59a58, 0x738da8, 0x8c6651, 0xb8b36e];
    const bodies = clamp(3 + Math.floor(roll() * 5), 3, 7);
    const registeredIndex = Math.min(bodies - 1, 1 + Math.floor(roll() * Math.max(1, bodies - 1)));
    return {
      seed: hash(text),
      template: classifyTemplate(text),
      starColor: starColors[Math.floor(roll() * starColors.length)],
      starScale: 1.45 + roll() * 0.75,
      registeredIndex,
      bodies: Array.from({ length: bodies }, (_, index) => ({
        radius: 3.4 + index * 2.45 + roll() * 0.65,
        scale: 0.28 + roll() * 0.46 + (index === registeredIndex ? 0.22 : 0),
        color: bodyColors[Math.floor(roll() * bodyColors.length)],
        inclination: (roll() - 0.5) * 0.22,
        phase: roll() * Math.PI * 2,
        speed: 0.035 / Math.sqrt(index + 1),
        moons: index === registeredIndex ? Math.floor(roll() * 3) : (roll() > 0.78 ? 1 : 0)
      }))
    };
  }

  function disposeMaterial(material) {
    if (!material) return;
    for (const key of ['map', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap']) {
      material[key]?.dispose?.();
    }
    material.dispose?.();
  }

  function dispose(host) {
    const instance = active.get(host);
    if (!instance) return;
    cancelAnimationFrame(instance.frame);
    instance.observer.disconnect();
    instance.scene.traverse(object => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach(disposeMaterial);
      else disposeMaterial(object.material);
    });
    instance.renderer.dispose();
    instance.renderer.domElement.remove();
    active.delete(host);
  }

  function mount({ host, node, records = [] }) {
    dispose(host);
    const THREE = window.THREE;
    if (!THREE || !host || !node) return null;

    const system = profile(node, records);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020404);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
    camera.position.set(0, 14, 24);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputEncoding = THREE.sRGBEncoding;
    host.replaceChildren(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x9f9a86, 0.72));
    const starLight = new THREE.PointLight(system.starColor, 2.2, 70, 1.5);
    scene.add(starLight);

    const systemGroup = new THREE.Group();
    systemGroup.rotation.x = -0.18;
    scene.add(systemGroup);

    const star = new THREE.Mesh(
      new THREE.SphereGeometry(system.starScale, 28, 20),
      new THREE.MeshBasicMaterial({ color: system.starColor })
    );
    star.add(new THREE.Mesh(
      new THREE.SphereGeometry(system.starScale * 1.18, 20, 14),
      new THREE.MeshBasicMaterial({ color: system.starColor, transparent: true, opacity: 0.13, wireframe: true })
    ));
    systemGroup.add(star);

    const movingBodies = [];
    system.bodies.forEach((body, index) => {
      const orbit = new THREE.Mesh(
        new THREE.RingGeometry(body.radius - 0.018, body.radius + 0.018, 96),
        new THREE.MeshBasicMaterial({ color: index === system.registeredIndex ? 0xd9bc69 : 0x59645e, transparent: true, opacity: index === system.registeredIndex ? 0.62 : 0.34, side: THREE.DoubleSide })
      );
      orbit.rotation.x = Math.PI / 2 + body.inclination;
      systemGroup.add(orbit);

      const pivot = new THREE.Group();
      pivot.rotation.y = body.phase;
      pivot.rotation.z = body.inclination;
      const material = index === system.registeredIndex
        ? registeredMaterial(THREE, system.template, system.seed ^ index, body.color)
        : new THREE.MeshStandardMaterial({ color: body.color, roughness: 0.74, metalness: 0.08 });
      const planet = new THREE.Mesh(new THREE.SphereGeometry(body.scale, 28, 20), material);
      planet.position.x = body.radius;
      if (index === system.registeredIndex) {
        planet.add(new THREE.Mesh(
          new THREE.SphereGeometry(body.scale * 1.24, 20, 14),
          new THREE.MeshBasicMaterial({
            color: system.template === 'desert' ? 0xd49a53 : 0xe0c77f,
            transparent: true,
            opacity: system.template === 'desert' ? 0.09 : 0.17,
            wireframe: system.template !== 'desert'
          })
        ));
      }
      pivot.add(planet);

      for (let moonIndex = 0; moonIndex < body.moons; moonIndex += 1) {
        const moonPivot = new THREE.Group();
        moonPivot.position.copy(planet.position);
        moonPivot.rotation.y = moonIndex * Math.PI + system.seed * 0.0001;
        const moon = new THREE.Mesh(
          new THREE.SphereGeometry(Math.max(0.07, body.scale * 0.18), 12, 8),
          new THREE.MeshStandardMaterial({ color: 0xb7b5aa, roughness: 0.9 })
        );
        moon.position.x = body.scale * (1.7 + moonIndex * 0.7);
        moonPivot.add(moon);
        pivot.add(moonPivot);
      }

      systemGroup.add(pivot);
      movingBodies.push({ pivot, planet, speed: body.speed, moonSpeed: 0.0035 + index * 0.0004 });
    });

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const instance = { renderer, scene, observer, frame: 0 };
    const animate = time => {
      instance.frame = requestAnimationFrame(animate);
      const seconds = time * 0.001;
      star.rotation.y = seconds * 0.08;
      movingBodies.forEach((body, index) => {
        body.pivot.rotation.y += body.speed * 0.012;
        body.planet.rotation.y += 0.0025 + index * 0.0003;
        body.pivot.children.slice(1).forEach(moonPivot => { moonPivot.rotation.y += body.moonSpeed; });
      });
      systemGroup.rotation.y = Math.sin(seconds * 0.12) * 0.08;
      renderer.render(scene, camera);
    };
    active.set(host, instance);
    instance.frame = requestAnimationFrame(animate);

    return Object.freeze({
      dispose: () => dispose(host),
      profile: system
    });
  }

  window.CafarronSystemOrreryV1 = Object.freeze({
    mount,
    dispose,
    templates: Object.freeze(['desert'])
  });
})();