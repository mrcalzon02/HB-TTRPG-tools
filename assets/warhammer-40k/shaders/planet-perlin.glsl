// Navis Cartographica planetary material utility.
// Deterministic low-cost 2D gradient noise for continent, coast, and biome masks.

float ncFade(float t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

vec2 ncHash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float ncPerlin(vec2 p) {
  vec2 cell = floor(p);
  vec2 local = fract(p);
  vec2 u = vec2(ncFade(local.x), ncFade(local.y));

  float n00 = dot(ncHash22(cell + vec2(0.0, 0.0)), local - vec2(0.0, 0.0));
  float n10 = dot(ncHash22(cell + vec2(1.0, 0.0)), local - vec2(1.0, 0.0));
  float n01 = dot(ncHash22(cell + vec2(0.0, 1.0)), local - vec2(0.0, 1.0));
  float n11 = dot(ncHash22(cell + vec2(1.0, 1.0)), local - vec2(1.0, 1.0));

  return mix(mix(n00, n10, u.x), mix(n01, n11, u.x), u.y) * 0.5 + 0.5;
}

float ncFbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rotation = mat2(0.80, -0.60, 0.60, 0.80);
  for (int octave = 0; octave < 5; ++octave) {
    value += amplitude * ncPerlin(p);
    p = rotation * p * 2.03 + vec2(19.17, 7.31);
    amplitude *= 0.5;
  }
  return value;
}

float ncContinentMask(vec2 uv, float seed, float seaLevel) {
  vec2 p = uv * vec2(3.25, 2.1) + vec2(seed * 0.013, seed * 0.021);
  float broad = ncFbm(p);
  float detail = ncFbm(p * 2.6 + 11.0) * 0.22;
  return smoothstep(seaLevel - 0.035, seaLevel + 0.035, broad + detail);
}

float ncCoastBand(vec2 uv, float seed, float seaLevel, float width) {
  vec2 p = uv * vec2(3.25, 2.1) + vec2(seed * 0.013, seed * 0.021);
  float elevation = ncFbm(p) + ncFbm(p * 2.6 + 11.0) * 0.22;
  float distanceToSea = abs(elevation - seaLevel);
  return 1.0 - smoothstep(0.0, width, distanceToSea);
}

float ncBiomeWeight(vec2 uv, float seed, float latitudeBias, float moistureBias) {
  float latitude = abs(uv.y * 2.0 - 1.0);
  float moisture = ncFbm(uv * 5.3 + vec2(seed * 0.031, seed * 0.017));
  float temperature = clamp(1.0 - latitude + latitudeBias, 0.0, 1.0);
  moisture = clamp(moisture + moistureBias, 0.0, 1.0);
  return clamp(temperature * moisture, 0.0, 1.0);
}
