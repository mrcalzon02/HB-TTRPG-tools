# Binary Cube: application hardening, secure files, key handoff, and deployment roadmap

Status: proposed; architecture and release gates, **not** evidence of implemented production security.
Scope: evolve the Cube Text Encoder example and canonical Cube Laboratory into a supported local-first encrypted-file application.
Authority: preserve existing cube algorithms as experimental reversible transforms. Never claim that cube permutation, FNV checksums, diffusion metrics, codeword replication, or deterministic masking establish cryptographic secrecy.

## Baseline (inspected 2026-10-10)
- `shadowrun-binary-cube-engine.js`: reversible Latin cube transform; seeded row/column/depth permutations and 2D block capacity of N², not arbitrary occupied 3D N³ geometry.
- `binary-cube-pre-entry-mask.js`, `binary-cube-subcube-indexing.js`, `binary-cube-data-dependent-chaining.js`: experimental optional transforms, not production cryptography.
- `shadowrun-binary-cube-auth.js`: PBKDF2-SHA-256 and AES-256-GCM authenticated envelope for an existing cube package; passphrase recipient transport, not a public-key identity/key-handoff scheme.
- `shadowrun-binary-cube-secure-export.js`: hides selected framing fields but its FNV checksum is not authentication.
- `binary-cube-text-encoder.html`: introductory UTF-8 round-trip example; its portable JSON currently contains the full cube key, so it must **not** be presented as a protected transmission format.
- Repository already contains extensive validators and desktop work. Reuse canonical runtime and adapter instead of duplicating algorithms.

## Security objectives and non-objectives
- Protect confidentiality and integrity of arbitrary files at rest and in transit when keys and endpoints remain uncompromised.
- Encrypt with standard AEAD; treat cubes as versioned, reversible preprocessing (experimental).
- No secret cube seed, private identity key, raw file key, or passphrase in unprotected output, telemetry, default persistent browser state, or exported diagnostics.
- No promise of anonymity, traffic-analysis resistance, endpoint compromise defense, plausible deniability, forward secrecy for historical offline files, or post-quantum protection without explicit validated implementation.
- Public keys may be shared; they must be *authenticated*. Public-key encryption alone cannot prevent MITM substitution.
- No custom cryptographic primitive as the security boundary. Use proven libraries/standards; externally review before claiming production readiness.

## Release architecture
1. **UI**: standalone Text / Files / Recipients / Keys / Settings / Diagnostics views. One shared application service across web and desktop. Local-first/offline-first.
2. **Canonical cubes**: versioned adapter `encode(bytes, profile, context)` / `decode(...)`. First profile is unchanged Latin-cube transform; additional masks, fan-out/chaining, and volumetric random-walk structures remain opt-in experiments until acceptance gates pass.
3. **Cryptography**: secure RNG generates a fresh content-encryption key (CEK) for each file. AEAD protects cube output and authenticated metadata. Chunked files require unique per-chunk nonce derivation and final authenticated commitment to chunk count/order, total bytes, and manifest to reject reordering, truncation and splicing. Do not implement ad hoc crypto algorithms.
4. **Recipient wrapping**: use a vetted interoperable recipient-encryption construction (evaluate age for file interoperability or a vetted HPKE/X25519 profile with explicit authentication). Wrap independent CEK for each recipient. Private keys remain local; public identity keys can be exported and verified by fingerprint/QR/out-of-band comparison. Reject unverified new keys by default.
5. **Identity trust**: pinned verified fingerprints, key-rotation proofs, mismatched identity blocking, explicit recovery paths. Explicitly differentiate encryption key from signing/identity key and their trust semantics. Sender authentication requires signatures or an authenticated sender protocol; recipient encryption alone does not prove sender identity.
6. **Recovery**: passphrase-wrapped CEK as opt-in secondary recipient using a hardened approved KDF such as Argon2id where supported, with calibrated parameters and resource limits. Recovery key/offline backup distinct from public transfer artifact. Make recovery and permanent key loss explicit.
7. **Portable file format**: magic bytes, format/schema version, cipher suite ID, cube profile version, authenticated metadata, random file ID, recipient envelopes, nonce/base nonce, encrypted/chunked payload, authenticated final manifest; strict parsers with size limits. Avoid unnecessary plaintext names/lengths in outer metadata. Derive deterministic cube structure only from protected context or separately derived secrets; bind settings to authenticated metadata.
8. **Packaging**: streamed binary read/write, drag/drop, output directory chooser, atomic save and replacement, interrupted-operation cleanup, memory ceilings, no plaintext intermediate disk files where feasible, secure-ish temp handling and clear limitations.

## Key handoff threat model
Attack scenarios to test:
- intercepted/substituted first public key (MITM); unverified contacts must not silently become trusted;
- wrong-recipient encryption; revoked/lost/rotated keys; stale trust records;
- malicious file header/recipient list/chunk manifest; truncation, replay, mix-and-match, rollback;
- leaked cube seed included in a plaintext JSON example;
- weak passphrase, insecure recovery file, clipboard/history leakage;
- compromise of sender/recipient endpoint, browser extension or compromised page scripts;
- malicious updates/dependency compromise and downgrade of crypto/container version.

Recipient workflow:
A creates offline key pair -> exports **public** identity/contact card -> B imports card and verifies a fingerprint by an independent channel -> B pins that fingerprint -> B creates random CEK for each file and encrypts with AEAD -> B wraps CEK for A's verified public key and optionally signs the container -> A authenticates package and locally unwraps CEK with private key -> A decrypts, reverses cube transform, and verifies exact bytes.
Private keys and CEKs are **never exchanged in plaintext**. A passphrase handoff is not an acceptable automatic fallback.

## Roadmap and exit criteria
### P0 — Baseline and safety isolation
- Pin current source versions and document all present algorithms/formats/interfaces.
- Label existing text JSON as **demonstration, not secure transport**; remove any insecure claim. Separate unprotected demo exports from protected exports.
- Add negative security tests: key present in package, accidental plaintext leak, empty/invalid key, unauthorized extraction.
**Gate:** existing round-trip tests preserved; demo clearly segregated; no unsafe export mistaken for encrypted file.

### P1 — Canonical binary/file adapter
- UTF-8 and byte-safe APIs; no requirement to convert entire files to bit strings in memory.
- Streaming/chunking design for large files, bounded allocations, binary fixtures, multi-GB stress profile on desktop.
- File properties retained inside protected metadata (name, type, size, hash as appropriate).
**Gate:** exact round trip over empty, Unicode, binary NUL, all-byte, random, large and boundary-length fixtures; deterministic schema validation.

### P2 — Authenticated single-recipient encryption
- Choose and integrate audited AEAD library/platform primitive (AES-256-GCM or XChaCha20-Poly1305) and secure nonce strategy; ensure authenticated chunk framing.
- Versioned encrypted container with rigorous format/parser limits.
- Migrate/wrap legacy cube packages explicitly, never silently reinterpret.
**Gate:** wrong key, modified header/chunk, reordering, removal, duplication and truncation all fail closed; interop vectors tested.

### P3 — Key identity, handoff and verification
- Local identity generation, key import/export, public contact cards, fingerprint/QR verify, trust pinning, recipient wrapping, sender-authentication decision.
- Offline first, no mandatory directory service or server.
- Tests for substitutions, tampering, rotation, user confusion, wrong recipient, revoked credentials.
**Gate:** MITM key-substitution drill fails closed; verified recipient can unlock across two separately installed clients; unverified identities are visible and blocked by default.

### P4 — Recovery, key lifecycle and permissions
- Protect private key at rest using OS-backed key store where available; encrypted key file fallback with strong KDF.
- Key backup/recovery, rekeying and recipient add/remove by rewrapping CEK only if policy permits; clarify that revocation cannot retract downloaded plaintext or old keys.
- Metadata minimization, clipboard/timeouts, logs free of secrets.
**Gate:** simulated device loss recovery works from backup; wrong recovery material is rejected; key export/import has explicit confirmations.

### P5 — Cubic mode integration
- Treat Latin-cube and experimental mask/index/chaining profiles as separately versioned reversible transformations, integrated through a single adapter.
- Add new volumetric mode: keyed dimension selection, bounded occupancy, 3D spatial permutation or DFS traversal with deterministic reconstruction, duplicate-visit prevention for data assignment, and fallback/backtracking semantics clearly defined.
- Distinguish a self-avoiding assignment ordering from a strict Hamiltonian walk; never misrepresent one as the other.
**Gate:** reproducible byte-exact restoration for every mode over multiple lengths/seeds; limits and amplification costs measured; authenticated file encryption unaffected.

### P6 — UI, performance, reliability
- Real text/file app: progress, cancellation, queue, clear file/key separation, recipient verification status, sealed/unsealed previews, offline support, import errors with nonsecret diagnostics.
- Test screen reader, keyboard, responsive layout, low-memory and slow-hardware cases.
**Gate:** browser and packaged desktop smoke tests; no browser console errors; offline operation and interrupted-transfer recovery.

### P7 — Independent review and release candidate
- Threat modeling, third-party crypto/security review, dependency audit, fuzzers for container parsing, malformed file corpus, known-answer vectors, differential tests, cross-platform test matrix.
- Publish reproducible signed release artifacts and verified hashes through an authorized build/release process **without adding GitHub Actions**.
- User documentation: security guarantees, limitations, key handoff instructions, contact verification, recovery and failure cases.
**Gate:** critical/high security findings remediated and reverified; deployment smoke verified, rollback exercised; only then label release production-ready.

## Development operating contract
- Single `main` integration branch; small targeted edits and verified commit readback.
- DEEFM: INTENT -> EXECUTE -> OBSERVE -> VERIFY -> CLAIM.
- No new GitHub Actions, no stubs/bypasses/no-op tests.
- Connector errors: classify, bounded retry with state refresh, avoid duplicate commits and destructive force pushes, report blocker if unresolved.
- Document actual behavior and test results; source and browser/API/desktop adapters invoke shared authorities.
- Status labels: planned / implemented / runtime verified / security reviewed / released. Never promote based on repository presence alone.

## Immediate next implementation
P0 first: mark the text encoder's current bundled-key JSON unprotected; introduce clear **demo package** vs **protected container** language and prohibit saving sensitive messages in current demo. Then implement P1 byte-oriented adapter and file format tests. Production claims await P2-P7.

## Optional directional channel and key-epoch hopping profile (design extension, 2026-10-10)

**Status: planned only.** This does not replace the AEAD boundary or establish production security. All capabilities are optional and negotiated explicitly: one-way A→B and B→A independent shared symmetric keys; per-contact identity/trust policy; manual, interval-based, randomized, or event-triggered key rotation; independent per-message cubic-geometry changes; experimental sender-authentication add-ons subject to their own proofs and limits. No public key, PKI, directory server or permanent network connection is mandatory for the offline symmetric mode.

### Enrollment
- For each direction, two peers securely hand off a **high-entropy shared secret** using an authenticated private physical or existing secure channel; no unauthenticated online plaintext transfer or password-as-key shortcut.
- Create random opaque channel ID, direction and key epoch, independent sending and receiving state, contact-specific trust policy, and protected local key vault. Never embed the channel root key or next-epoch secret in ordinary plaintext exported file JSON.
- Symmetric sharing cannot prove exclusive sender authorship or prevent the recipient from forging a message under the same key. Show that limitation explicitly; optional authorship proofs require additional keys/protocols and independent scrutiny.

### Rekey control protocol
1. Sender under authenticated epoch E sends `KEY_PROPOSE` containing new random secret material encrypted by existing AEAD, proposed epoch E+1, proposal ID, min activation sequence, algorithm suite/profile, bounded expiry/rollback policy, and transcript binding.
2. Receiver decrypts/authenticates under E, rejects duplicates/replays/rollback/incompatible suites, stages secret without activation, and sends authenticated `KEY_ACK` bound to the exact proposal hash and next epoch.
3. Sender commits via authenticated `KEY_COMMIT`, with activation boundary defined by **per-direction authenticated message sequence number**, not wall clock or local operation count; receiver confirms. Sender must not emit E+1 payloads before acknowledgments necessary to avoid stranded peers.
4. Receive side accepts epochs E and E+1 only in a narrow bounded reordering window; previously used sequence IDs/nonces are rejected. Eventually retire E securely when confirmed and retention limits permit.
5. Lost proposal, lost ACK/COMMIT, simultaneous rekey, offline recipient, delayed files and crashes require durable pending state and bounded retransmission or explicit recovery. Do not silently guess keys or downgrade authentication.
6. Randomized hopping draws intervals from a CSPRNG with configured min/max messages or elapsed time, while enforcing AEAD nonce/usage limits and preventing adversarial forced frequent rotation (DoS). Geometry/profile changes have separately derived independent keys and versioned authenticated metadata.
7. Rekeying under E **does not restore secrecy if E was compromised**, since an eavesdropper with E can decrypt the key proposal. Compromise recovery requires fresh secret handoff over a secure channel; symmetric rekey alone does not provide post-compromise security or forward secrecy for historical captured traffic.

### Wire and storage requirements
- Envelope includes version, channel ID (opaque), direction, epoch, sequence, cipher suite, authenticated length/metadata and authenticated transcript/rekey control references, with unique per-key nonces.
- State machine: `ACTIVE_E` → `PROPOSED_NEXT` → `ACKNOWLEDGED` → `COMMITTED` → `ACTIVE_NEXT` → `RETIRED_E`. Abort or retry safely on missing acknowledgments.
- Encrypt control and payload records; sender/receiver must persist counters atomically across restart. Separate epoch key derivation, control authentication, payload encryption and cube structure derivation by domain-separated KDF inputs.
- Optional traffic padding and delivery batching can reduce some metadata leakage, not guarantee anonymity or make the traffic undetectable.
- A genuine radio-frequency-hopping transport is out of scope for a browser file app and requires compatible radio hardware/physical-layer protocol. Here “frequency hopping” means **logical key/parameter rotation**, not radio frequency control.

### Required new acceptance tests
- Clean rekey with sequence boundary; delayed/reordered/duplicated/replayed payloads; tampered proposal, ACK or COMMIT; rollover; crash recovery after each transition; simultaneous rotation; divergent time clocks; lost acknowledgments; offline recipient; key deletion/retention; key leakage and compromise drill.
- Verify old epoch never encrypts new messages past committed switch; next epoch never activates prematurely; no nonce reuse after crash or restart; no unauthenticated fallback; no secret in logs/exports.
- Record separate limitations: no exclusive sender-authentication from symmetric shared key and no post-compromise recovery from an old-key-protected rekey message.
