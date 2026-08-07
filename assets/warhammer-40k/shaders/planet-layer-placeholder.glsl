// Placeholder fragment-layer scaffold for Navis Cartographica planet materials.
// Replace incrementally as generated texture assets mature.

vec3 blendPlanetLayers(vec3 baseColor, vec3 biomeColor, float biomeMask) {
  return mix(baseColor, biomeColor, clamp(biomeMask, 0.0, 1.0));
}
