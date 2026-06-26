(() => {
  'use strict';

  function stableSerialize(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  }

  function normalizeSeed(seed) {
    if (typeof seed === 'string') return seed;
    if (seed === undefined || seed === null) return 'npc-default-seed';
    return stableSerialize(seed);
  }

  function hash32(value) {
    const text = normalizeSeed(value);
    let result = 7;
    for (const character of text) result = (result * 31 + character.charCodeAt(0)) % 2147483647;
    return result || 1;
  }

  function deriveSeed(baseSeed, ...parts) {
    return [normalizeSeed(baseSeed), ...parts.map(stableSerialize)].join('::');
  }

  function create(seed) {
    const normalized = normalizeSeed(seed);
    let state = hash32(normalized);

    function next() {
      state = (state * 48271) % 2147483647;
      return (state - 1) / 2147483646;
    }

    function float(min = 0, max = 1) {
      if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) throw new RangeError('Invalid float range.');
      return min + next() * (max - min);
    }

    function int(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) throw new RangeError('Invalid integer range.');
      return Math.floor(float(min, max + 1));
    }

    function choice(entries) {
      if (!Array.isArray(entries) || entries.length === 0) return undefined;
      return entries[int(0, entries.length - 1)];
    }

    function weightedChoice(entries) {
      if (!Array.isArray(entries) || entries.length === 0) return undefined;
      const prepared = entries.map(entry => entry && typeof entry === 'object' && !Array.isArray(entry) && 'value' in entry
        ? { value: entry.value, weight: Math.max(0, Number(entry.weight) || 0) }
        : { value: entry, weight: 1 });
      const total = prepared.reduce((sum, entry) => sum + entry.weight, 0);
      if (total <= 0) return choice(prepared)?.value;
      let roll = float(0, total);
      for (const entry of prepared) {
        roll -= entry.weight;
        if (roll < 0) return entry.value;
      }
      return prepared[prepared.length - 1].value;
    }

    function shuffle(entries) {
      const output = [...(entries || [])];
      for (let index = output.length - 1; index > 0; index -= 1) {
        const swap = int(0, index);
        [output[index], output[swap]] = [output[swap], output[index]];
      }
      return output;
    }

    function fork(...parts) {
      return create(deriveSeed(normalized, ...parts));
    }

    return Object.freeze({
      seed: normalized,
      next,
      float,
      int,
      bool: probability => next() < (probability ?? 0.5),
      choice,
      weightedChoice,
      shuffle,
      fork
    });
  }

  globalThis.NpcProfileRandom = Object.freeze({
    VERSION: '0.1.0',
    stableSerialize,
    normalizeSeed,
    hash32,
    deriveSeed,
    create
  });
})();
