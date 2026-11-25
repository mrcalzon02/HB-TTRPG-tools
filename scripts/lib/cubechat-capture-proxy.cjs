'use strict';

// Transparent loopback byte capture. Stream files contain exactly the bytes
// seen on each TCP connection; HTTP extraction is a later, separate operation.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');

const DIRECTIONS = ['client-to-relay', 'relay-to-client'];
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function writeAll(fd, bytes) {
  let offset = 0;
  while (offset < bytes.length) {
    const written = fs.writeSync(fd, bytes, offset, bytes.length - offset);
    if (!written) throw Error('Capture stream write made no progress');
    offset += written;
  }
}

function closeFile(fd) {
  let problem;
  try { fs.fsyncSync(fd); } catch (error) { problem = error; }
  try { fs.closeSync(fd); } catch (error) { problem ||= error; }
  if (problem) throw problem;
}

async function createCaptureProxy({ targetPort, captureDirectory }) {
  if (!Number.isInteger(targetPort) || targetPort < 1 || targetPort > 65535) {
    throw Error('Capture proxy requires a valid loopback target port');
  }
  if (typeof captureDirectory !== 'string' || !captureDirectory) {
    throw Error('Capture proxy requires a capture directory');
  }
  const directory = path.resolve(captureDirectory);
  fs.mkdirSync(path.join(directory, 'streams'), { recursive: true });
  if (fs.existsSync(path.join(directory, 'connections.json'))) {
    throw Error('Capture directory already contains a connection manifest');
  }
  const indexFd = fs.openSync(path.join(directory, 'chunk-index.jsonl'), 'wx', 0o600);
  const startedAt = new Date().toISOString();
  const records = [];
  const totals = { 'client-to-relay': 0, 'relay-to-client': 0 };
  let chunkCount = 0, port = null, closing = false, closed = false;
  let failure = null, closePromise = null;

  const rememberFailure = error => { failure ||= error; };
  const server = net.createServer({ allowHalfOpen: true }, client => {
    if (closing) { client.destroy(); return; }
    const id = 'connection-' + String(records.length + 1).padStart(4, '0');
    const record = {
      id,
      startedAt: new Date().toISOString(),
      endedAt: null,
      clientAddress: client.remoteAddress,
      clientPort: client.remotePort,
      targetAddress: '127.0.0.1',
      targetPort,
      streams: {},
      errors: []
    };
    const streams = {};
    let upstream;
    try {
      for (const direction of DIRECTIONS) {
        const file = 'streams/' + id + '.' + direction + '.bin';
        streams[direction] = {
          fd: fs.openSync(path.join(directory, file), 'wx', 0o600),
          hash: crypto.createHash('sha256')
        };
        record.streams[direction] = { file, bytes: 0, sha256: null };
      }
      upstream = net.createConnection({ host: '127.0.0.1', port: targetPort, allowHalfOpen: true });
    } catch (error) {
      rememberFailure(error);
      for (const stream of Object.values(streams)) {
        try { closeFile(stream.fd); } catch (closingError) { rememberFailure(closingError); }
      }
      client.destroy();
      return;
    }
    let complete;
    const completion = new Promise(resolve => { complete = resolve; });
    const connection = { record, client, upstream, completion, clientClosed: false, upstreamClosed: false, finalized: false };
    records.push(connection);

    function finish() {
      if (connection.finalized || !connection.clientClosed || !connection.upstreamClosed) return;
      connection.finalized = true;
      record.endedAt = new Date().toISOString();
      for (const direction of DIRECTIONS) {
        const stream = streams[direction];
        try { closeFile(stream.fd); } catch (error) { rememberFailure(error); }
        record.streams[direction].sha256 = stream.hash.digest('hex');
      }
      complete();
    }

    function connectionError(side, error) {
      record.errors.push({ side, at: new Date().toISOString(), code: error.code || null, message: error.message });
      client.destroy();
      upstream.destroy();
    }

    function transfer(source, destination, direction, chunk) {
      const stream = streams[direction], metadata = record.streams[direction];
      try {
        const offset = metadata.bytes;
        // Save both the byte stream and its observed chunk boundary before
        // forwarding. Chunk boundaries are observations, not TCP packet claims.
        writeAll(stream.fd, chunk);
        stream.hash.update(chunk);
        metadata.bytes += chunk.length;
        totals[direction] += chunk.length;
        writeAll(indexFd, Buffer.from(JSON.stringify({
          connectionId: id,
          direction,
          capturedAt: new Date().toISOString(),
          offset,
          length: chunk.length,
          sha256: sha256(chunk)
        }) + '\n'));
        chunkCount++;
        if (!destination.write(chunk)) {
          source.pause();
          destination.once('drain', () => { if (!source.destroyed) source.resume(); });
        }
      } catch (error) {
        rememberFailure(error);
        connectionError('capture', error);
      }
    }

    client.on('data', chunk => transfer(client, upstream, 'client-to-relay', chunk));
    upstream.on('data', chunk => transfer(upstream, client, 'relay-to-client', chunk));
    client.on('end', () => upstream.end());
    upstream.on('end', () => client.end());
    client.on('error', error => connectionError('client', error));
    upstream.on('error', error => connectionError('relay', error));
    client.on('close', hadError => {
      connection.clientClosed = true;
      // Clean EOF has already been propagated with end(). Let pending writes
      // drain; destroying the counterpart here could truncate the last bytes.
      if (hadError || !client.readableEnded) upstream.destroy();
      finish();
    });
    upstream.on('close', hadError => {
      connection.upstreamClosed = true;
      if (hadError || !upstream.readableEnded) client.destroy();
      finish();
    });
  });

  try {
    await new Promise((resolve, reject) => {
      const onError = error => { server.removeListener('listening', onListen); reject(error); };
      const onListen = () => { server.removeListener('error', onError); resolve(); };
      server.once('error', onError);
      server.once('listening', onListen);
      server.listen(0, '127.0.0.1');
    });
    port = server.address().port;
  } catch (error) {
    try { closeFile(indexFd); } catch (closingError) { rememberFailure(closingError); }
    throw error;
  }
  server.on('error', rememberFailure);

  function snapshot() {
    return {
      port,
      listening: server.listening,
      closing,
      closed,
      connections: records.length,
      openConnections: records.filter(connection => !connection.finalized).length,
      chunks: chunkCount,
      bytes: { ...totals }
    };
  }

  async function close() {
    if (closePromise) return closePromise;
    closePromise = (async () => {
      closing = true;
      const listenerClosed = new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
      });
      for (const connection of records) {
        connection.client.destroy();
        connection.upstream.destroy();
      }
      await Promise.all([listenerClosed, ...records.map(connection => connection.completion)]);
      try { closeFile(indexFd); } catch (error) { rememberFailure(error); }
      closed = true;
      const manifest = {
        schema: 'cubechat-byte-capture-connections-v1',
        startedAt,
        endedAt: new Date().toISOString(),
        listenerAddress: '127.0.0.1',
        listenerPort: port,
        targetAddress: '127.0.0.1',
        targetPort,
        chunkCount,
        bytes: { ...totals },
        connections: records.map(connection => connection.record)
      };
      const manifestFd = fs.openSync(path.join(directory, 'connections.json'), 'wx', 0o600);
      try { writeAll(manifestFd, Buffer.from(JSON.stringify(manifest, null, 2) + '\n')); }
      finally { closeFile(manifestFd); }
      if (failure) throw failure;
    })();
    return closePromise;
  }

  return { port, baseUrl: 'http://127.0.0.1:' + port, close, snapshot };
}

function extractRequests(captureDirectory) {
  const directory = path.resolve(captureDirectory);
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'connections.json'), 'utf8'));
  if (manifest.schema !== 'cubechat-byte-capture-connections-v1' || !Array.isArray(manifest.connections)) {
    throw Error('Invalid byte-capture manifest');
  }
  const requests = [];
  for (const connection of manifest.connections) {
    const stream = connection.streams['client-to-relay'];
    const file = path.resolve(directory, stream.file);
    if (!file.startsWith(directory + path.sep)) throw Error('Capture stream path leaves capture directory');
    const bytes = fs.readFileSync(file);
    if (bytes.length !== stream.bytes || sha256(bytes) !== stream.sha256) {
      throw Error('Captured stream length or SHA-256 mismatch: ' + connection.id);
    }
    let offset = 0, ordinal = 0;
    while (offset < bytes.length) {
      const headerEnd = bytes.indexOf('\r\n\r\n', offset);
      if (headerEnd < 0) throw Error('Truncated HTTP request headers: ' + connection.id + ' at ' + offset);
      const lines = bytes.subarray(offset, headerEnd).toString('latin1').split('\r\n');
      const start = /^(\S+) (\S+) HTTP\/(\d+\.\d+)$/.exec(lines.shift());
      if (!start) throw Error('Invalid captured HTTP request line: ' + connection.id + ' at ' + offset);
      const headers = lines.map(line => {
        const colon = line.indexOf(':');
        if (colon < 1 || /^[ \t]/.test(line)) throw Error('Invalid captured HTTP header: ' + connection.id);
        return [line.slice(0, colon), line.slice(colon + 1).trim()];
      });
      if (headers.some(([name]) => name.toLowerCase() === 'transfer-encoding')) {
        throw Error('Transfer-Encoding request bodies are unsupported; use Content-Length clients');
      }
      const lengths = headers.filter(([name]) => name.toLowerCase() === 'content-length').map(([, value]) => value);
      if (lengths.length > 1 || (lengths.length && !/^\d+$/.test(lengths[0]))) {
        throw Error('Invalid or repeated captured HTTP Content-Length: ' + connection.id);
      }
      const length = lengths.length ? Number(lengths[0]) : 0;
      if (!Number.isSafeInteger(length) || length < 0) throw Error('Unsafe captured HTTP Content-Length');
      const bodyOffset = headerEnd + 4, endOffset = bodyOffset + length;
      if (endOffset > bytes.length) throw Error('Truncated captured HTTP request body: ' + connection.id);
      const body = bytes.subarray(bodyOffset, endOffset);
      requests.push({
        connectionId: connection.id,
        ordinal: ++ordinal,
        sourceOffset: offset,
        headerBytes: bodyOffset - offset,
        bodyOffset,
        endOffset,
        method: start[1],
        path: start[2],
        httpVersion: start[3],
        headers,
        bodyUtf8: body.toString('utf8'),
        bodyBase64: body.toString('base64'),
        bodyBytes: body.length
      });
      offset = endOffset;
    }
  }
  return requests;
}

module.exports = { createCaptureProxy, extractRequests };
