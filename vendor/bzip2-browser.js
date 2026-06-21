/*
 * bzip2.js - a small bzip2 decompression implementation
 * Copyright 2011 antimatter15 and contributors.
 * Based on micro-bunzip by Rob Landley and bzip2 by Julian R Seward.
 * Released under the GNU Library General Public License version 2.
 * Browser adaptation: exposes window.bzip2.
 */
(function (global) {
  var bzip2 = {};

  bzip2.array = function (bytes) {
    var bit = 0;
    var byte = 0;
    var BITMASK = [0, 0x01, 0x03, 0x07, 0x0F, 0x1F, 0x3F, 0x7F, 0xFF];
    return function (n) {
      var result = 0;
      while (n > 0) {
        var left = 8 - bit;
        if (n >= left) {
          result <<= left;
          result |= BITMASK[left] & bytes[byte++];
          bit = 0;
          n -= left;
        } else {
          result <<= n;
          result |= (bytes[byte] & (BITMASK[n] << (8 - n - bit))) >> (8 - n - bit);
          bit += n;
          n = 0;
        }
      }
      return result;
    };
  };

  bzip2.simple = function (bits) {
    var size = bzip2.header(bits);
    var all;
    var chunk;
    var chunks = [];
    var index = 0;
    do {
      chunk = bzip2.decompress(bits, size);
      if (chunk !== -1) {
        chunks.push(chunk);
        index += chunk.byteLength;
      }
    } while (chunk !== -1);
    all = new Uint8Array(index);
    index = 0;
    for (var i = 0; i < chunks.length; ++i) {
      chunk = chunks[i];
      all.set(chunk, index);
      index += chunk.byteLength;
    }
    return all;
  };

  bzip2.header = function (bits) {
    if (bits(8 * 3) !== 4348520) throw new Error('No BZip2 magic number found.');
    var blockSize = bits(8) - 48;
    if (blockSize < 1 || blockSize > 9) throw new Error('Not a BZip2 archive.');
    return blockSize;
  };

  bzip2.decompress = function (bits, size, len) {
    var MAX_HUFCODE_BITS = 20;
    var MAX_SYMBOLS = 258;
    var SYMBOL_RUNA = 0;
    var SYMBOL_RUNB = 1;
    var GROUP_SIZE = 50;
    var bufsize = 100000 * (size || 9);
    var h = '';
    var i;
    var j;
    var k;
    var t;
    var uc;

    for (i = 0; i < 6; i++) h += bits(8).toString(16);
    if (h === '177245385090') return -1;
    if (h !== '314159265359') throw new Error('Invalid BZip2 block data.');
    bits(32);
    if (bits(1)) throw new Error('Unsupported obsolete BZip2 version.');

    var origPtr = bits(24);
    if (origPtr > bufsize) throw new Error('Initial BZip2 position exceeds buffer size.');

    t = bits(16);
    var symToByte = new Uint8Array(256);
    var symTotal = 0;
    for (i = 0; i < 16; i++) {
      if (t & (1 << (15 - i))) {
        k = bits(16);
        for (j = 0; j < 16; j++) {
          if (k & (1 << (15 - j))) symToByte[symTotal++] = 16 * i + j;
        }
      }
    }

    var groupCount = bits(3);
    if (groupCount < 2 || groupCount > 6) throw new Error('Invalid BZip2 Huffman group count.');
    var nSelectors = bits(15);
    if (nSelectors === 0) throw new Error('BZip2 stream contains no selectors.');

    var mtfSymbol = [];
    for (i = 0; i < groupCount; i++) mtfSymbol[i] = i;
    var selectors = new Uint8Array(32768);
    for (i = 0; i < nSelectors; i++) {
      for (j = 0; bits(1); j++) {
        if (j >= groupCount) throw new Error('Invalid BZip2 selector.');
      }
      uc = mtfSymbol[j];
      mtfSymbol.splice(j, 1);
      mtfSymbol.splice(0, 0, uc);
      selectors[i] = uc;
    }

    var symCount = symTotal + 2;
    var groups = [];
    var minLen;
    var maxLen;
    var hufGroup;
    var base;
    var limit;
    var pp;

    for (j = 0; j < groupCount; j++) {
      var length = new Uint8Array(MAX_SYMBOLS);
      var temp = new Uint8Array(MAX_HUFCODE_BITS + 1);
      t = bits(5);
      for (i = 0; i < symCount; i++) {
        while (true) {
          if (t < 1 || t > MAX_HUFCODE_BITS) throw new Error('Invalid BZip2 Huffman length.');
          if (!bits(1)) break;
          if (!bits(1)) t++;
          else t--;
        }
        length[i] = t;
      }

      minLen = maxLen = length[0];
      for (i = 1; i < symCount; i++) {
        if (length[i] > maxLen) maxLen = length[i];
        else if (length[i] < minLen) minLen = length[i];
      }

      hufGroup = groups[j] = {};
      hufGroup.permute = new Uint32Array(MAX_SYMBOLS);
      hufGroup.limit = new Uint32Array(MAX_HUFCODE_BITS + 1);
      hufGroup.base = new Uint32Array(MAX_HUFCODE_BITS + 1);
      hufGroup.minLen = minLen;
      hufGroup.maxLen = maxLen;
      base = hufGroup.base.subarray(1);
      limit = hufGroup.limit.subarray(1);
      pp = 0;
      for (i = minLen; i <= maxLen; i++) {
        for (t = 0; t < symCount; t++) {
          if (length[t] === i) hufGroup.permute[pp++] = t;
        }
      }
      for (i = minLen; i <= maxLen; i++) temp[i] = limit[i] = 0;
      for (i = 0; i < symCount; i++) temp[length[i]]++;
      pp = t = 0;
      for (i = minLen; i < maxLen; i++) {
        pp += temp[i];
        limit[i] = pp - 1;
        pp <<= 1;
        base[i + 1] = pp - (t += temp[i]);
      }
      limit[maxLen] = pp + temp[maxLen] - 1;
      base[minLen] = 0;
    }

    var byteCount = new Uint32Array(256);
    for (i = 0; i < 256; i++) mtfSymbol[i] = i;
    var runPos = 0;
    var count = 0;
    var remaining = 0;
    var selector = 0;
    var buf = new Uint32Array(bufsize);

    while (true) {
      if (!(remaining--)) {
        remaining = GROUP_SIZE - 1;
        if (selector >= nSelectors) throw new Error('BZip2 selector overflow.');
        hufGroup = groups[selectors[selector++]];
        base = hufGroup.base.subarray(1);
        limit = hufGroup.limit.subarray(1);
      }
      i = hufGroup.minLen;
      j = bits(i);
      while (true) {
        if (i > hufGroup.maxLen) throw new Error('Invalid BZip2 Huffman code.');
        if (j <= limit[i]) break;
        i++;
        j = (j << 1) | bits(1);
      }
      j -= base[i];
      if (j < 0 || j >= MAX_SYMBOLS) throw new Error('Invalid BZip2 symbol.');
      var nextSym = hufGroup.permute[j];

      if (nextSym === SYMBOL_RUNA || nextSym === SYMBOL_RUNB) {
        if (!runPos) {
          runPos = 1;
          t = 0;
        }
        if (nextSym === SYMBOL_RUNA) t += runPos;
        else t += 2 * runPos;
        runPos <<= 1;
        continue;
      }

      if (runPos) {
        runPos = 0;
        if (count + t >= bufsize) throw new Error('BZip2 block exceeds buffer size.');
        uc = symToByte[mtfSymbol[0]];
        byteCount[uc] += t;
        while (t--) buf[count++] = uc;
      }

      if (nextSym > symTotal) break;
      if (count >= bufsize) throw new Error('BZip2 block exceeds buffer size.');
      i = nextSym - 1;
      uc = mtfSymbol[i];
      mtfSymbol.splice(i, 1);
      mtfSymbol.splice(0, 0, uc);
      uc = symToByte[uc];
      byteCount[uc]++;
      buf[count++] = uc;
    }

    if (origPtr < 0 || origPtr >= count) throw new Error('Invalid BZip2 origin pointer.');
    j = 0;
    for (i = 0; i < 256; i++) {
      k = j + byteCount[i];
      byteCount[i] = j;
      j = k;
    }
    for (i = 0; i < count; i++) {
      uc = buf[i] & 0xff;
      buf[byteCount[uc]] |= i << 8;
      byteCount[uc]++;
    }

    var pos = 0;
    var current = 0;
    var run = 0;
    if (count) {
      pos = buf[origPtr];
      current = pos & 0xff;
      pos >>= 8;
      run = -1;
    }

    var output = new Uint8Array(bufsize);
    var copies;
    var previous;
    var outbyte;
    var index = 0;
    if (!len) len = Infinity;
    while (count) {
      count--;
      previous = current;
      pos = buf[pos];
      current = pos & 0xff;
      pos >>= 8;
      if (run++ === 3) {
        copies = current;
        outbyte = previous;
        current = -1;
      } else {
        copies = 1;
        outbyte = current;
      }
      while (copies--) {
        output[index++] = outbyte;
        if (!--len) return output.subarray(0, index);
      }
      if (current !== previous) run = 0;
    }
    return output.subarray(0, index);
  };

  global.bzip2 = bzip2;
})(window);
