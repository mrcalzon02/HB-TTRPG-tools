(() => {
  'use strict';

  const MAJOR_MOONS = new Set([
    'Moon','Phobos','Deimos','Io','Europa','Ganymede','Callisto','Amalthea',
    'Mimas','Enceladus','Tethys','Dione','Rhea','Titan','Hyperion','Iapetus','Phoebe',
    'Miranda','Ariel','Umbriel','Titania','Oberon','Puck','Triton','Nereid','Proteus',
    'Charon','Nix','Hydra','Kerberos','Styx','Dysnomia','Hiʻiaka','Namaka','MK2'
  ]);

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  function compute(system, options = {}) {
    const zoomPercent = clamp(finite(options.zoomPercent, 100), 10, 50000);
    const focusedId = String(options.focusedId || 'star');
    const bodies = [...(system?.planets || [])]
      .filter(body => finite(body.distance, -1) >= 0)
      .sort((left, right) => finite(left.distance) - finite(right.distance));

    const innerRadius = 58;
    const outerRadius = 466;
    const bodyRadii = distributeBodies(bodies, innerRadius, outerRadius);
    const focusedParentId = resolveFocusedParent(bodies, focusedId);
    const corridors = new Map();
    const moonLayouts = new Map();
    const bodyLayouts = new Map();

    bodies.forEach((body, index) => {
      const radius = bodyRadii.get(body.id);
      const previousRadius = index ? bodyRadii.get(bodies[index - 1].id) : 28;
      const nextRadius = index < bodies.length - 1 ? bodyRadii.get(bodies[index + 1].id) : 492;
      const innerEdge = (previousRadius + radius) / 2;
      const outerEdge = (radius + nextRadius) / 2;
      const halfGap = Math.max(3, Math.min(radius - innerEdge, outerEdge - radius));
      const overviewEnvelope = clamp(halfGap * .34, 5, 22);
      const parentFocused = focusedParentId === body.id;
      const zoom = zoomPercent / 100;
      const focusExpansion = clamp(28 + Math.max(0, Math.log2(Math.max(1, zoom))) * 11, 28, 108);
      const satelliteEnvelope = parentFocused
        ? Math.max(overviewEnvelope * 1.8, focusExpansion)
        : clamp(overviewEnvelope * (1 + Math.max(0, Math.log2(Math.max(1, zoom))) * .035), 5, halfGap * .38);

      const moonRange = distanceRange(body.moons || []);
      const dense = (body.moons || []).length > 18;
      const parentLayout = {
        id:body.id,
        radius,
        innerEdge,
        outerEdge,
        halfGap,
        overviewEnvelope,
        satelliteEnvelope:clamp(satelliteEnvelope, 3, 108),
        parentFocused,
        dense,
        moonCount:(body.moons || []).length
      };
      corridors.set(body.id, parentLayout);
      bodyLayouts.set(body.id, parentLayout);

      const sortedMoons = [...(body.moons || [])].sort((left, right) => {
        const distanceDelta = finite(left.orbitalDistanceKm, Infinity) - finite(right.orbitalDistanceKm, Infinity);
        return distanceDelta || String(left.name).localeCompare(String(right.name));
      });
      sortedMoons.forEach((moon, moonIndex) => {
        const major = isMajorMoon(moon);
        const selected = moon.id === focusedId;
        const normalized = normalizedMoonDistance(moon, moonRange, moonIndex, sortedMoons.length);
        const minimum = Math.min(5.5, parentLayout.satelliteEnvelope * .24);
        const displayRadius = minimum + Math.pow(normalized, .78) * Math.max(0, parentLayout.satelliteEnvelope - minimum);
        const showAllFocusedOrbits = parentFocused && zoomPercent >= 1200;
        const orbitVisible = major || selected || showAllFocusedOrbits;
        const labelVisible = selected || (major && (parentFocused || zoomPercent >= 220)) || (parentFocused && zoomPercent >= 2600);
        const pointOpacity = selected ? 1 : major ? .92 : parentFocused ? .68 : dense ? .34 : .48;
        moonLayouts.set(moon.id, {
          id:moon.id,
          parentId:body.id,
          displayRadius,
          major,
          selected,
          parentFocused,
          orbitVisible,
          labelVisible,
          pointOpacity,
          dense,
          order:moonIndex
        });
      });
    });

    const mapDistance = distance => interpolateDistance(finite(distance), bodies, bodyRadii, innerRadius, outerRadius);
    const snapshot = {
      version:2,
      zoomPercent,
      focusedId,
      focusedParentId,
      innerRadius,
      outerRadius,
      bodies:bodies.map(body => ({
        id:body.id,
        name:body.name,
        distance:finite(body.distance),
        radius:bodyRadii.get(body.id),
        corridor:{...corridors.get(body.id)}
      }))
    };

    return Object.freeze({
      version:2,
      zoomPercent,
      focusedId,
      focusedParentId,
      innerRadius,
      outerRadius,
      bodyRadii,
      corridors,
      bodyLayouts,
      moonLayouts,
      mapDistance,
      snapshot
    });
  }

  function distributeBodies(bodies, innerRadius, outerRadius) {
    const result = new Map();
    if (!bodies.length) return result;
    if (bodies.length === 1) {
      result.set(bodies[0].id, (innerRadius + outerRadius) / 2);
      return result;
    }

    const distances = bodies.map(body => Math.max(.0001, finite(body.distance, .0001)));
    const low = Math.log10(Math.min(...distances));
    const high = Math.log10(Math.max(...distances));
    const range = Math.max(.0001, high - low);
    const radii = bodies.map((body, index) => {
      const rank = index / (bodies.length - 1);
      const logarithmic = (Math.log10(Math.max(.0001, finite(body.distance, .0001))) - low) / range;
      const hybrid = Math.pow(rank * .64 + logarithmic * .36, .91);
      return innerRadius + hybrid * (outerRadius - innerRadius);
    });

    const idealGap = (outerRadius - innerRadius) / Math.max(1, bodies.length - 1);
    const minimumGap = clamp(idealGap * .66, 17, 34);
    radii[0] = Math.max(innerRadius, radii[0]);
    for (let index = 1; index < radii.length; index += 1) {
      radii[index] = Math.max(radii[index], radii[index - 1] + minimumGap);
    }
    const overflow = radii.at(-1) - outerRadius;
    if (overflow > 0) {
      for (let index = 0; index < radii.length; index += 1) {
        radii[index] -= overflow * (index / Math.max(1, radii.length - 1));
      }
    }
    for (let index = radii.length - 2; index >= 0; index -= 1) {
      radii[index] = Math.min(radii[index], radii[index + 1] - minimumGap);
    }

    bodies.forEach((body, index) => result.set(body.id, clamp(radii[index], innerRadius, outerRadius)));
    return result;
  }

  function interpolateDistance(distance, bodies, bodyRadii, innerRadius, outerRadius) {
    if (!bodies.length) return (innerRadius + outerRadius) / 2;
    const first = bodies[0];
    const last = bodies.at(-1);
    if (distance <= finite(first.distance)) {
      const ratio = clamp(distance / Math.max(.0001, finite(first.distance)), 0, 1);
      return 25 + (bodyRadii.get(first.id) - 25) * Math.sqrt(ratio);
    }
    if (distance >= finite(last.distance)) {
      const excess = Math.log10(1 + distance / Math.max(.0001, finite(last.distance)));
      return clamp(bodyRadii.get(last.id) + excess * 32, bodyRadii.get(last.id), 488);
    }
    for (let index = 1; index < bodies.length; index += 1) {
      const left = bodies[index - 1];
      const right = bodies[index];
      if (distance > finite(right.distance)) continue;
      const low = Math.log(Math.max(.0001, finite(left.distance)));
      const high = Math.log(Math.max(.0002, finite(right.distance)));
      const t = clamp((Math.log(Math.max(.0001, distance)) - low) / Math.max(.0001, high - low), 0, 1);
      return bodyRadii.get(left.id) + (bodyRadii.get(right.id) - bodyRadii.get(left.id)) * t;
    }
    return outerRadius;
  }

  function resolveFocusedParent(bodies, focusedId) {
    if (!focusedId || focusedId === 'star') return null;
    for (const body of bodies) {
      if (body.id === focusedId) return body.id;
      if ((body.moons || []).some(moon => moon.id === focusedId)) return body.id;
    }
    return null;
  }

  function distanceRange(moons) {
    const values = moons
      .map(moon => finite(moon.orbitalDistanceKm, NaN))
      .filter(Number.isFinite)
      .filter(value => value > 0);
    return values.length
      ? {min:Math.min(...values), max:Math.max(...values)}
      : {min:1, max:1};
  }

  function normalizedMoonDistance(moon, range, index, count) {
    const distance = finite(moon.orbitalDistanceKm, NaN);
    if (Number.isFinite(distance) && distance > 0 && range.max > range.min) {
      return clamp((Math.log(distance) - Math.log(range.min)) / (Math.log(range.max) - Math.log(range.min)), 0, 1);
    }
    return count > 1 ? index / (count - 1) : .5;
  }

  function isMajorMoon(moon) {
    if (MAJOR_MOONS.has(String(moon.name || ''))) return true;
    if (finite(moon.radiusKm) >= 450) return true;
    if (finite(moon.mass) >= .00045) return true;
    return false;
  }

  globalThis.BlacklightExoOrbitalLayout = Object.freeze({compute, isMajorMoon});
})();
