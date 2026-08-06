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

  function dispose(host) {
    const instance = active.get(host);
    if (!instance) return;
    cancelAnimationFrame(instance.frame);
    instance.observer.disconnect();
    instance.scene.traverse(object => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach(material => material.dispose?.());
      else object.material?.dispose?.();
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
      const planet = new THREE.Mesh(
        new THREE.SphereGeometry(body.scale, 20, 14),
        new THREE.MeshStandardMaterial({
          color: body.color,
          emissive: index === system.registeredIndex ? body.color : 0x000000,
          emissiveIntensity: index === system.registeredIndex ? 0.22 : 0,
          roughness: 0.74,
          metalness: 0.08
        })
      );
      planet.position.x = body.radius;
      if (index === system.registeredIndex) {
        planet.add(new THREE.Mesh(
          new THREE.SphereGeometry(body.scale * 1.24, 16, 12),
          new THREE.MeshBasicMaterial({ color: 0xe0c77f, transparent: true, opacity: 0.17, wireframe: true })
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

  window.CafarronSystemOrreryV1 = Object.freeze({ mount, dispose });
})();