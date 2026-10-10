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

## Matrix underflow, filler and bounded generator policy (2026-10-10)

**Design requirement:** Never use sentinel zeros, a terminating zero run, or data-content heuristics to establish payload length. Zero bits are valid payload. The authoritative canonical Latin engine already carries originalBitLength and deterministically fills unused logical masked block positions; future volumetric variants must preserve exact authenticated length framing.

- Distinguish *unallocated spatial coordinates*, *allocated decoy/null voxels*, and *remaining payload slots*. For the Latin engine, each N-sided cube has N² logical positions, not N³ data slots. Future voxel modes may allocate up to N³ positions and cannot silently reinterpret legacy payload capacity.
- Carry actual original byte/bit length, encoded payload count, cube profile, mask/topology ID, chunk count, and padding policy inside authenticated, preferably encrypted, metadata. Parse only after authentication; reject overcapacity, unexpected trailing records and malformed framing.
- Fill every serialized unused slot, including trailing payload slots, with CSPRNG-derived context-separated padding or encrypted pseudorandom-looking padding. Existing deterministic filler is adequate for demonstration reversibility, **not** security-grade randomized padding.
- Distinguish physical visualization-only empty voxels from serialized slots; don't falsely claim hidden decoys conceal plaintext patterns. Full-volume population for N³ has potentially severe time/memory overhead.
- Bound side length by explicit min/max, encoded payload capacity, memory ceiling, CPU/time budget, expansion ratio and nonce/AEAD use limits. Sample geometric size from capacity-compatible, budget-feasible dimensions using a CSPRNG (not unbounded uniform sizes). For fan-out codewords include expansion before selecting dimensions.
- Do not regenerate whole oversized cubes solely to discard bytes. Stream filler/chunks where possible and cap worst-case traversal attempts; fail explicitly rather than silently downgrading safety.
- Publish diagnostic metrics: plaintext bytes, encoded bits, selected side/dimensions, active cells, filler/decoy count and proportion, total container bytes, generation time, memory high-water mark, and exact decode verification.
- Tests: empty file, all zeros, long zero runs, terminal zeros, mixed binary data, 1-bit-to-capacity boundaries, oversized selected cube, malformed or lying length, volume overflow, randomization reproducibility, interrupted processing, padded-ciphertext indistinguishability experiments (no security proof), and bounded worst-case latency.

## Production cube size policy: minimum 64, four doublings (2026-10-10)

The user-selected **logical side-length tiers** for production-grade cubic research are **64, 128, 256, 512, 1024**. These replace earlier suggestions of tiny cube sizes for production. Small sizes remain permitted only in explicitly labeled demo/fixture/test modes; production mode must not silently fall back below 64. Select only among the five supported tiers with CSPRNG input and capacity checks. The size tier is not a security-strength rating or an assertion that large cubes themselves resist cryptanalysis.

| Side N | Latin-cube logical positions N² | Full voxel positions N³ |
|---:|---:|---:|
| 64 | 4,096 | 262,144 |
| 128 | 16,384 | 2,097,152 |
| 256 | 65,536 | 16,777,216 |
| 512 | 262,144 | 134,217,728 |
| 1024 | 1,048,576 | 1,073,741,824 |

- Distinguish side length (N), active encoded positions, physical volume, logical capacity, and serialized overhead; current Latin-cube engine is N², not N³.
- Full-volume N=1024 requires over **1 GiB just for one byte per voxel** (and 128 MiB for densely bit-packed occupancy alone). JS arrays, object/coordinate maps, and traversal-state structures can cost far more. This tier cannot be naively allocated or filled in a browser.
- Use chunked/implicit/lazy generated geometry and sparse/bit-packed structures where compatible with the algorithm; establish benchmark-proven resource budgets for each tier. A mode/tier unsupported on the running device must fail clearly or require deliberate user selection of a supported tier, not silently downgrade to a smaller cube.
- A short payload in a minimum 64-side Latin cube still requires filler to cover unused logical positions in any fully serialized block. For full-volume modes, do not require N³ transmitted filler unless justified by measured benefit; define how implicit filler is regenerated and how metadata is authenticated.
- Before accepting upper tiers, benchmark latency, peak resident memory, serialized expansion and exact recovery across payload sizes, on representative low-end and desktop devices. Cap padding ratio and configure explicit user-acknowledged full-volume cost modes when needed.
- New production UI should offer side tiers 64/128/256/512/1024, with 64 default, estimated capacity/memory/time, and separate mode badges for Latin N² vs volumetric N³.
- Changes to the existing engine and legacy package schema must not break historical keys/packages; add a separately versioned production profile and rigorous migration/rejection tests.

## Subcube diffusion and message-dependent entry masks (2026-10-10)

**Preserve this as a distinct experimental method**, not simply subcube bit replication and not the existing fixed pre-entry noise masks.

Historical intent: a single logical bit may influence multiple subcube entries, and reversible diffusion (Mix → Permute → Mix → Permute) spreads its influence into other bits; a message-dependent entry-mask variant uses message content to select spatial entry patterns over larger cube clusters, aspiring to "sub-bit" representation through distributed coded influence. The existing `binary-cube-subcube-indexing.js` implements keyed codeword multi-placement at fan-outs 1, 3, 5, 7, but its regions are presently logical bit-index partitions rather than physically nested 3D voxels. `binary-cube-data-dependent-chaining.js` is separately implemented and is not sufficient evidence of the desired clustered diffusion.

Design requirements:
- Define "sub-bit" precisely as *distributed influence/coded representation of one logical bit across multiple physical positions*; never claim information-theoretic storage of more than one independent bit per classical bit.
- Select 64/128/256/512/1024 size tier within the established budget; define physical cluster partition and explicit active/inactive/masked positions.
- Use invertible mixing steps and keyed permutations, recording round count, domain separation, deterministic seed and protected frame settings. If the message drives a mask, ensure the inverse can reconstruct decisions from recovered state or decryptable authenticated control information; do not introduce a plaintext-dependent circular decoder dependency.
- Preserve exact recovery, collision-free assignment, zero-filled inputs, long terminal zero runs and arbitrary binary data; fill unused serialized slots with securely generated padding per the underflow policy.
- Measure differential diffusion/avalanche, locality leakage, chosen-input behavior, error propagation, redundancy and expansion, timing, and memory independently for fixed masks, subcube codewords, chaining, true reversible diffusion, and combined message-dependent mask modes.
- Do not equate visual complexity or unexpectedly structured ciphertext with cryptographic security. Keep standard authenticated encryption protecting experimental cube transforms as independently versioned layers.
- Wire the experimental option through one shared engine authority across the text example, file application, lab visualizer and test suites only after a staged validated prototype. Label unimplemented operations explicitly.

## Pre-distributed keychain schedule and mutation epochs (2026-10-10)

**Concept, not implemented:** Support a collection of independently physical-entropy-generated, locally held large cube-key files arranged as a reversible translation chain. A schedule can permute the *order of application* without needing a new key transfer on every rotation. Illustration: initial L→R→S→M→R2→S2→L2, swap R and R2 at 12:00, swap M and S at 17:00, and activate a separately provisioned new keychain at 00:00. These named operations are provisional labels; precise semantics require confirmation before implementation.

Design:
- Maintain immutable independently generated key files with opaque IDs and a compact, versioned **mutation manifest** mapping named operations to specific key files and allowed transforms; include deterministic operation order, timezone, schedule version, and future chain epoch.
- Prepare next keychain **out of band** in advance, using a verified secret handoff. Do not encrypt the next wholly independent keychain under a compromised former channel and claim compromise recovery.
- Use an authenticated per-message epoch ID, monotonic sequence number, manifest version and activation state. Decode according to the sender's authenticated state, not the receiver's current wall clock.
- Define midnight activation and each clock mutation in UTC or an explicitly pinned timezone with daylight-saving behavior; include activation boundaries and retry/reorder handling for delayed/offline packets. Treat schedule as operational coordination, not a cryptographic secret.
- Require exact inverse traversal and reversible subcube transforms; measure interoperability after every mutation. Preserve old epochs only for explicit bounded read windows; separate old-message decryption from permission to encrypt new messages.
- Distinguish reordering/reusing the same keys from actual introduction of fresh independent entropy. Changing order alone does not restore secrecy after key compromise, prevent replay, or guarantee avalanche resistance.
- Add validation: 11:59/12:00, 16:59/17:00, 23:59/00:00 boundaries, clock skew, delayed delivery, missed rotations, wrong manifest, identical operation names, interrupted upgrades, chain rollback, compromised key, and crash recovery.
