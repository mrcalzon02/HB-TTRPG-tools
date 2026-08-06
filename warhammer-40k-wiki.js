(() => {
  'use strict';

  const PARTS = Object.freeze([
    'data/cafarron-corridor-registry-v4.part-01.b64',
    'data/cafarron-corridor-registry-v4.part-02.b64',
    'data/cafarron-corridor-registry-v4.part-03.b64'
  ]);

  let archiveData = null;

  function decodeBase64(value) {
    const binary = atob(value.replace(/\s+/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  async function loadArchive() {
    if (archiveData) return archiveData;
    if (typeof DecompressionStream !== 'function') {
      throw new Error('This browser does not provide the gzip decompression support required by the sector archive.');
    }
    const responses = await Promise.all(PARTS.map(async path => {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Archive registry shard unavailable: ${path} (${response.status})`);
      return response.text();
    }));
    const compressed = decodeBase64(responses.join(''));
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
    const text = await new Response(stream).text();
    archiveData = Object.freeze(JSON.parse(text));
    return archiveData;
  }

  const ready = loadArchive();

  async function exportArchive() {
    const data = await ready;
    const payload = JSON.stringify(data, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `cafarron-corridor-strategic-archive-${data.version}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  window.Warhammer40KLore = Object.freeze({
    get data() { return archiveData; },
    ready,
    exportArchive
  });
})();
