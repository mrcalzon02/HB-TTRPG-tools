# CubeChat LAN prototype — IPv4 / IPv6 address and port

Status: **experimental development**, not production-secure messaging. No central services, no GitHub Actions, no added Node dependency.

## Start a host

Requires Node.js 20+ and an existing clone of HB-TTRPG-tools. From the repository root:

```sh
node cubechat-server.cjs 8787
```

Open `http://127.0.0.1:8787/` in two browser windows, selecting A in one and B in the other. Generate the directional A→B and B→A key bundle on A and **manually** import the identical JSON in B. Both clients connect to the host then send messages. The host process only forwards encrypted JSON envelopes to connected clients. A delivery count of zero means no recipient is currently connected. The server is not a persistent queue.

For another LAN device, use HTTPS. Most browsers deny `crypto.subtle` on an ordinary HTTP page whose host is a LAN IP rather than localhost. The host may use an existing trusted TLS certificate and key:

```sh
CUBECHAT_TLS_CERT=/path/to/server-cert.pem CUBECHAT_TLS_KEY=/path/to/server-key.pem CUBECHAT_HOST=0.0.0.0 node cubechat-server.cjs 8787
```

Browse to `https://192.168.1.25:8787/` or `https://[IPv6-address]:8787/` **only when the browser trusts the TLS certificate for that IP address**. Replace the addresses with the actual host address. IPv6 binding can use `CUBECHAT_HOST=::` where supported. The application accepts an IPv4, bracketed IPv6, or hostname plus numeric TCP port; both clients must load the app from the same selected address:port origin. Browser trust rules and firewall/NAT settings still apply. Generating or trusting private certificates requires user-controlled configuration.

## Security / development limitations

- The **full secret key bundle** must be exchanged through an independently trusted private channel or removable medium, *never* via the unauthenticated relay. The bundle currently holds two 256-bit random AES keys, which also serve as deterministic seeds for experimental Latin-cube transforms. This is a transitional prototype and does **not** meet the envisioned large independently physical-entropy-generated cube-key-file design.
- Browser `crypto.getRandomValues` uses a browser cryptographic RNG. It is not independently verified to be a hardware TRNG. The cube is an experimental inner transform; AES-256-GCM authenticates and encrypts the serialized cube package.
- The relay forwards only encrypted envelopes, but **does not authenticate participant role, server identity independently of HTTPS, or possession of a key before accepting sends**. Unauthorized senders can cause denial-of-service or push invalid envelopes. Clients reject failed AEAD checks and previously seen sequence IDs in the current session.
- Key bundles and sequence/replay state live in page memory only. **Do not restart/reload and resume transmission with a previous key bundle without a new protocol for persisted monotonic sequences or deterministic collision-proof nonce management.** Current sessions generate fresh random 96-bit GCM nonces; collision risk remains small but key rotation and robust persistence are production work.
- This release has no message persistence, contact verification, invitation, sender signature, off-device secret provisioning, recovery, authenticated handshake, durable delivery receipts, authenticated TLS server setup automation, rate limiting, or Internet NAT traversal.
- Do not expose the relay to the public Internet or use it for sensitive data. No raw TCP listener is available inside a browser; Node provides the listening HTTP(S) socket, with event-stream receive and POST send.
- Client currently allows local role selection; direction alone does not prove sender identity. A recipient holding the shared secret can forge messages under that channel.

## Verification gates (not yet passed in a browser)

1. Node syntax check: `node --check cubechat-server.cjs`.
2. Serve the app, confirm GET / and script both return 200, GET /events?role=A stays open, and POST /send only forwards valid-format envelopes.
3. Open clients on two devices over trusted HTTPS. Import the same out-of-band channel bundle; exchange Unicode and binary-boundary test messages in both directions.
4. Tampered message, wrong channel key, replayed sequence, malformed request, disconnected receiver, broken certificate, and connectivity loss must all be handled explicitly.
5. Before describing a publicly deployable encrypted messaging system, build a hardened authenticated session protocol, safe key lifetime and counter persistence, key-provisioning workflow, transport security and independent security review.

Related files: `cubechat-network.html` (network client), `cubechat-server.cjs` (small Node transport), `cubechat.html` (isolated local simulation), `shadowrun-binary-cube-engine.js` (canonical cube engine).


## Host-issued first-client provisioning (2026-10-10)

The first concrete host-provisioning slice is available at `cubechat-provision.html`, with package import support in `cubechat-network.html`. From an HTTPS or localhost context, a host chooses a recipient label, host address (IPv4/IPv6/DNS), port, and HTTP(S) scheme and selects **Generate two separate provisioned packages**.

The page draws two independent 32-byte secrets with browser `crypto.getRandomValues` (not a certified hardware TRNG), then exports **two distinct JSON files**: `cubechat-HOST-private-<id>.json` for the host and `cubechat-GUEST-SECRET-<id>.json` for the intended recipient. Each contains that relationship's A→B and B→A shared secrets; neither contains a larger host master vault. The host and guest copies have different role fields, but by design both parties know both shared directional channel secrets. Treat **either file as highly sensitive**, and use a trusted private handoff. The generated ID labels a pair; the relay currently does not enforce it.

**Important order of operations:** Serve `cubechat-network.html` from the final Node host origin first, then import the appropriate file on each device; the import automatically assigns A/B role and the recorded address/port. Do not import from GitHub Pages and then navigate to a different host—this prototype stores key material in memory and it will be lost when the page navigates. Click **Connect to host** on both devices, then test A→B and B→A. A recipient can download and install a future native package later; these are currently JSON provisioning packages, not executable installers.

**Scope limit:** The present Node relay routes by roles A and B rather than by recipient profile ID. It supports **one host/guest pair per server instance**. Do not create several guests on the same port and assume channel isolation: clients could be misrouted. Multi-client registration, authenticated profile/role routing, proper peer authentication, persistent state, revocation and hardened handoff remain future work. A guest package copied by an attacker is compromised; no confidentiality is assured by embedding keys inside it alone. No existing master host secret is accessed or exported in this implementation.


## Profile-isolated multi-client relay slice (2026-10-10)

The Node relay now partitions event subscriptions and message forwarding by `profileId + role`, where `profileId` is the 24-digit lowercase hexadecimal identifier generated by the host provisioning page. The client automatically imports its profile identifier and supplies it with its events subscription and send request. Multiple independently provisioned host/guest pairs can therefore connect through the **same listener port** without all messages being broadcast to every A or B subscriber. Legacy generated/demo keys use the explicit all-zero demonstration profile. Each host relationship still uses its own matching host-side package imported into a separate browser tab/session; a single host UI managing multiple contacts is future work.

**Security limitation:** This is **routing namespace isolation, not authorization or authentication**. The relay accepts client-supplied profile IDs and A/B role values, so anyone who knows or guesses a profile ID can subscribe to its opaque encrypted envelopes or inject messages; AES-GCM still rejects ciphertext that cannot be authenticated with the correct per-profile key. Profile IDs are routing labels, not secret capabilities, not proof of possession, and not part of a secure identity protocol. Do not assert authenticated client registration, sender identity, absence of traffic metadata leaks, or Internet deployment readiness. Session admission authentication and rate limits remain required. No host master vault is distributed.

Checkpoints required before live-use claims: two *different* profiles on one relay port, all four client windows receiving only matching profile messages, wrong-key rejection, duplicate sequence rejection, page refresh, and connection interruption. JavaScript source syntax parsing and GitHub readback do **not** prove those live runtime checks passed.


## One-page host contact manager (2026-10-10)

The `cubechat-host.html` UI now imports **multiple separate host-role provisioning packages** (`cubechat-HOST-private-*.json`) and keeps their direction-specific cube transforms, AES keys, monotonic send sequence, receive replay set and up-to-1000-item **in-memory** chat display partitioned by profile ID. Each contact may be connected or disconnected independently using one `/events?role=A&profile=<id>` event stream on the same relay. Send dispatches only to the selected contact's profile and B role. Profile imports reject duplicates, and the host package must match the page's active address/port origin. `cubechat-server.cjs` explicitly serves the new host page and provisioning page.

For each recipient, generate a unique package pair via `cubechat-provision.html`, save the host copy locally, and deliver the guest copy privately. From the host address/port origin, open `/cubechat-host.html`, import one or more **host** packages and connect each contact. On each guest device, open `/cubechat-network.html`, import its matching **guest** package, then connect. Do not use the same profile ID for independent recipients. No host-side master vault or native installers exist yet.

This is a **development implementation**, not a live-verified, secure multi-user messenger. Routing by client-provided profile ID is not authenticated admission; the existing relay does not verify host/guest identity. Stored chat histories and key material disappear at reload; keeping old key material while resetting replay/sequence state requires a revised lifetime/nonce protocol. No remote runtime test, two-device integration test, browser automation, traffic-isolation test or security review has yet passed. Source readback and JavaScript syntax are the verification completed for this slice.


## Basic forum and replacement-key transfer prototype (2026-10-10)

The same Node listener now serves `cubechat-forum.html`, backed by `cubechat-forum.cjs`, with persistent plaintext board, thread, and reply data in `cubechat-forum-data.json` (or `CUBECHAT_FORUM_DB`). Posting uses unverified display names, not CubeChat identities; forum messages are **not encrypted with CubeChat keys** and must never be presented as private. Host creates boards by starting the server with a nonempty `CUBECHAT_FORUM_ADMIN_TOKEN` environment variable and supplying it in the forum UI. Discussion API currently has coarse IP-based posting throttling, bounded fields and atomic JSON file replacement but no accounts, moderation, access control or database concurrency. Keep the forum on trusted LAN until these exist; no public-Internet security claim.

`cubechat-key-handoff.html` is the first **offline replacement-key transfer laboratory**. For an already provisioned profile ID, a host can generate two fresh independently browser-CSPRNG-produced 32-byte secrets, serialize them as the compact `CCK1.` URL-safe base64 transfer string, copy/save it, or generate a PCM WAV file using 1,200/2,200 Hz FSK (8 kHz mono, 40 ms per bit). The receiver can paste/import the string or a clean generated WAV and check length and accidental-corruption checksum, then export updated matching A-side and B-side provisioning JSON files. The exported replacement secret files must be transferred *privately* and independently authenticated by comparison of a trusted fingerprint; checksum alone is **not authentication**.

**Crucial scope**: new keys are **not yet automatically activated in the running host contacts or guest app**; participants must separately import matching updated packages and coordinate manual activation. There is no simultaneous old/new key overlap, authenticated key switch, resumable negotiation, automatic revocation or post-compromise recovery claim. The prototype transfer format can carry only two 256-bit seeds, **not the envisioned physically-random giant cube-key files**. Generated audio is suitable for WAV file transfer in exact format, not yet for live microphone or acoustic-channel recording. Offline QR generation, scan-and-import, and chunked large-key exchange remain unimplemented. Transfer strings and WAVs expose all secrets to anyone who obtains them.


## Future-no-PKI direction and optional large secret-file generation (2026-10-10)

**Governing research intention:** CubeChat deliberately investigates communication without reliance on public-key key exchange for initial trust. Secure physical or independently trusted transfer of shared material is acknowledged as an inconvenient but accepted design constraint. Do not silently introduce conventional public-key provisioning as the default or claim that large stored secret files alone imply cryptographic security. This is a research prototype; quantum attacks threaten widely deployed RSA and ECC, but approved post-quantum public-key approaches also exist and the claim that *all* modern conventional encryption is compromised is not an established fact.

Retain the currently operational compact **deterministic 256-bit cube-seed demonstration** as the default mode. Add a separate **opt-in** experimental workflow in `cubechat-large-keys.html`: generate distinct 1/4/16 MiB random byte streams in the browser (drawn from browser OS-backed CSPRNG, not claimed to be a certified TRNG) or ingest externally physically generated random binary streams of the exact selected size. The resulting separate, recipient-specific A→B and B→A `CCLK2` binary files contain a fixed 64-byte envelope (magic/version/direction/profile/byte count) and raw directional material, and the UI reports SHA-256 file fingerprints and supports structural validation on import. Those hash fingerprints must be authenticated independently with the peer, and file acquisition must be confidential. No PRNG seed expands or replaces the bytes in these files.

**Important boundary:** The large key-file mode is **generation/distribution research only**, not yet an active CubeChat encryption implementation. No present cube transform consumes these multi-MiB files, and there is no runtime key activation, consumable-key position accounting, vault, chunked QR or acoustic transport. Actual message confidentiality remains dependent on the existing experimental deterministic cube transform plus AES-GCM as previously documented. Do not suggest one-time-pad guarantees without explicit one-time-use and composition proofs. The path from generated material to a reversible, bounded, tested cube transform is separate future implementation work.


## Optional large-key bytes applied to live messages (2026-10-10)

`cubechat-large-key-adapter.js` parses the independently generated `CCLK2` directional binary files, performs bounds-checked XOR against **actual stored key-file bytes**, and reserves each transmitted message's byte range in a session-local monotonic cursor. The guest `cubechat-network.html` and host `cubechat-host.html` can each import both matching AB/BA files; host maintains separate key material for each contact. The default remains the prior deterministic Latin-cube demo.

With large-key mode enabled, outgoing UTF-8 bytes are XOR-mixed with a contiguous, nonoverlapping segment of the A→B/B→A file, then run through the canonical Latin-cube transform, then protected inside the existing authenticated AES-GCM message envelope. Authenticated envelope fields include `mode=large-pad-v1`, `padStart` and `padLength`. Incoming authenticated metadata identifies the corresponding key-material region; the client reverses the cube transform and XOR. In-memory replay checks reject repeated sequences or a repeated starting offset. Exact file IDs/profiles and direction are validated at import. The adapter blocks an exhausted file instead of repeating the material.

**Research boundaries and remaining defects:** This is a deliberately simple *consumable byte mask feeding the existing cube*, **not** a large-random-matrix-generated geometric cube codebook, and not a claim of OTP security. It still depends on AES-GCM and the existing compact deterministic cube-seed credentials. Never use these files again in another session: the byte cursor is not durably persisted, and importing/reloading the same file resets use accounting. The current receive replay set only detects equal pad starting offsets, not all partially overlapping ranges; it must be hardened before long-term sessions. All clients must agree on the same mode and privately possess identical directional files. Mode switching only occurs when disconnected, with no automatic remote synchronization. On failed sends a reserved region is burned for safety; do not attempt to rewind consumption. Messages are capped at 4,096 UTF-8 bytes in this mode. Security, multi-device execution, ciphertext tampering and exhaustion tests are not complete.
