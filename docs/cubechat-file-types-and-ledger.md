# CubeChat binary-file test scope and consumable-key ledger (2026-10-10)

**Classification: experimental research only. No secure-messenger, one-time-pad, or post-quantum-security claims.**

## Purpose and preserved boundaries

The canonical `shadowrun-binary-cube-engine.js` remains the single authority for reversible cube bitstream transformation. These tests deliberately use existing **published deterministic preset keys**, not operational contact secrets. The transformation plus a noncryptographic FNV corruption checksum does not provide confidentiality or authenticity. Actual experimental chat envelopes also use AES-256-GCM, which is a separate layer.

Keep CubeChat binary-file round-trip experiments distinct from authenticated messenger transport. A successful file round trip does **not** imply the chat server can transmit those files, that large files stream without unbounded memory use, or that an uploaded payload is safe.

## Deterministic binary-file harness

Run from a repository clone with Node.js 20+:

```sh
node scripts/cubechat-file-type-roundtrip.cjs
node scripts/cubechat-file-type-roundtrip.cjs --report dist/cubechat-file-roundtrip.json
```

The test constructs or embeds genuine short file-format fixtures and transforms their **original bytes**, not a text representation of a filename.

| Family | Tested fixture | Scope |
| --- | --- | --- |
| Pictures | PNG, JPEG, GIF, WebP | Reversible byte representation and header preservation |
| Document | Small generated PDF | Exact recovery including xref and EOF bytes |
| Audio | PCM WAV | Exact RIFF and sample-byte recovery |
| Archive | ZIP with one stored file | Exact ZIP framing and embedded content bytes |
| UTF-8 text | Accented and non-Latin text plus emoji | Encoding/decoding parity |
| Structured data | JSON contact-like fixture | Byte-for-byte content preservation |
| Arbitrary binary | All 256 byte values; zero-rich 777-byte buffer | NULs, high bytes, and boundary behavior |

For every nonempty fixture the Node harness asserts equal input/output buffers, equal SHA-256 digests, wrong-key rejection, and single-bit package mutation rejection. It reports file size, digest, ciphertext expansion, blocks, key ID, and pass/fail. An **empty file is currently an explicit unsupported edge case**: the underlying canonical bitstream engine rejects zero-length input. A future file-container layer should represent the empty payload without bypassing canonical validation.

**Observed in the connected audit:** JavaScript syntax of the harness and the modified clients parses. The four embedded image fixtures were separately executed against the fetched canonical engine and recovered byte-for-byte; the JPEG has the expected SOI/EOI markers. The complete Node harness, generated PDFs/WAV/ZIP, multi-device transport, and OS runtime compatibility **have not yet been executed or certified in this audit**.

## Browser consumable-key accounting

New modules: `cubechat-key-ledger-core.js` (authoritative deterministic state transitions) and `cubechat-key-ledger.js` (same-origin IndexedDB persistence).

The guest and host pages import both modules after the existing large-key adapter. On CCLK2 import, a SHA-256 content fingerprint, profile, and direction identify the key file. New files require explicit user attestation that the material is unused. Known key fingerprints resume the existing ledger record rather than resetting the outbound cursor to zero.

Outbound byte ranges are reserved and committed in a **strict IndexedDB read-write transaction before** the bytes are used in encryption or offered to the transport. A failed send does not reclaim them. Received ranges are atomically recorded after message authentication and full decode; exact duplicate and partially overlapping ranges are refused. The incoming ledger merges adjacent intervals and maintains bounded storage. Failed or missing ledger access blocks large-key activity rather than silently reverting to a volatile counter.

To exercise the pure acceptance rules:

```sh
node scripts/cubechat-key-ledger-contract.cjs
node scripts/cubechat-integration-test.cjs
```

The server now serves both ledger modules and the portable ZIP packager includes them. The relay integration test checks that the additional files are served. Static compilation and direct execution of pure state transitions were performed during the connected audit. **No browser IndexedDB crash/restart or two-device test has been performed.**

### Important remaining safety limitations

- Browser IndexedDB is *not* a rollback-resistant, externally backed trusted key ledger. Browser data deletion, profile restore, database rollback, origin changes, another device, or concurrent independently copied key files can defeat global one-time-consumption guarantees. Do not re-enroll previously used material as new when a ledger is missing.
- Strict durability requests improve the browser persistence boundary, but do not constitute a validated power-loss or hardware-secure transaction guarantee. An unsupported strict transaction must fail rather than fall back silently.
- Existing deterministic/AES chat-mode sequence and replay state remains volatile. The browser ledger does **not** by itself solve all message lifecycle, key rotation, sender identity, or AEAD nonce problems.
- No encrypted persistent contact history, mobile-native key vault, peer-to-peer offline transport, QR pairing, or production-ready secure file transmission is supplied by this patch.
- Same-origin key consumption must be reimported after page reload, because secret key bytes remain in page memory; only identifiers and consumption positions persist. This is intentional. Old key material with unknown usage history must be retired.
- Independent-browser execution, interruption injection, rapid concurrent-tab reservations, storage quota failure, browser data clear/reimport, and restart-with-old-backup are required acceptance gates before treating consumable mode as robust.

## Next acceptance gates

1. Run both Node tests on the actual repository clone; store their output, hashes, and platform versions.
2. Run true browser IndexedDB tests in two tabs (same origin), forced reload, failed POST, and unplug/power-loss simulations; prove consumed offsets never retreat under supported recovery paths.
3. Test content-validity decoders for all picture and document/audio/archive samples after exact round trip; add larger representative media files and streaming memory ceilings.
4. Verify the host and guest with trusted HTTPS over two independent machines, both directional CCLK2 files, mismatched keys, failed authentication, overlapping receive ranges, disconnect/reconnect, and lost storage.
5. Design protected, independently backed native-state persistence and authenticated offline pairing before making confidential/offline messenger claims.

**Do not add GitHub Actions to perform these tests; run them directly using the existing scripts and record actual evidence.**
