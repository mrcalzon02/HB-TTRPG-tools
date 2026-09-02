(function installHBTabletopDice(root) {
  'use strict';

  const MODE_ALIASES = Object.freeze({
    cumulative: 'cumulative',
    individual: 'individual total',
    'individual total': 'individual total',
    each: 'individual total',
    'per die': 'individual total'
  });

  const ROLL_RE = /^\s*(?:(?:\/)?roll\s+|r\s+|dice\s+)?(\d*)\s*[dD]\s*(\d+)\s*([+-]\s*\d+)?\s*(cumulative|individual(?:\s+total)?|each|per\s+die)?\s*$/i;

  function requireCrypto() {
    const cryptoObject = root && root.crypto;
    if (!cryptoObject || typeof cryptoObject.getRandomValues !== 'function') {
      throw new Error('A cryptographic RNG is required; weak fallback RNGs are forbidden.');
    }
    return cryptoObject;
  }

  function uniformInt(maxExclusive) {
    if (!Number.isSafeInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > 0x100000000) {
      throw new Error('Invalid random range.');
    }
    const cryptoObject = requireCrypto();
    const range = 0x100000000;
    const limit = Math.floor(range / maxExclusive) * maxExclusive;
    const buf = new Uint32Array(1);
    let value;
    do {
      cryptoObject.getRandomValues(buf);
      value = buf[0];
    } while (value >= limit);
    return value % maxExclusive;
  }

  function parseCommand(command, options = {}) {
    const match = ROLL_RE.exec(String(command || ''));
    if (!match) throw new Error('Unsupported dice command or notation.');
    const count = Number(match[1] || 1);
    const sides = Number(match[2]);
    const modifier = Number(String(match[3] || '0').replace(/\s+/g, ''));
    if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error('Dice count must be between 1 and 10.');
    if (!Number.isInteger(sides) || sides < 2 || sides > 100) throw new Error('Die sides must be between 2 and 100.');
    const rawMode = String(match[4] || options.defaultMode || 'cumulative').toLowerCase().replace(/\s+/g, ' ').trim();
    const mode = MODE_ALIASES[rawMode];
    if (!mode) throw new Error('Mode must be cumulative or individual total.');
    const notation = `${count}d${sides}${modifier ? (modifier > 0 ? `+${modifier}` : `${modifier}`) : ''}`;
    return Object.freeze({ originalCommand: String(command), notation, count, sides, modifier, mode });
  }

  function rollNotation(notation, options = {}) {
    return rollCommand(String(notation), options);
  }

  function rollCommand(command, options = {}) {
    const parsed = parseCommand(command, options);
    const rolls = Object.freeze(Array.from({ length: parsed.count }, () => uniformInt(parsed.sides) + 1));
    const subtotal = rolls.reduce((sum, value) => sum + value, 0);
    const total = subtotal + parsed.modifier;
    const presentation = parsed.mode === 'cumulative'
      ? Object.freeze({ mode: 'cumulative', total })
      : Object.freeze({ mode: 'individual total', results: rolls, ...(parsed.modifier ? { modifier: parsed.modifier } : {}) });
    const spoken = parsed.mode === 'cumulative'
      ? `${parsed.notation} cumulative: ${total}`
      : `${parsed.notation} individual total: ${rolls.join(', ')}${parsed.modifier ? `; aggregate modifier ${parsed.modifier > 0 ? '+' : ''}${parsed.modifier} retained separately` : ''}`;
    return Object.freeze({
      ...parsed,
      rolls,
      subtotal,
      total,
      presentation,
      spoken,
      entropySource: 'web-crypto-getRandomValues-rejection-sampling',
      physicalTrngAttested: false,
      timestamp: new Date().toISOString()
    });
  }

  root.HBTabletopDice = Object.freeze({ parseCommand, rollCommand, rollNotation });
})(typeof globalThis !== 'undefined' ? globalThis : this);
