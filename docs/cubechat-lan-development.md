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
