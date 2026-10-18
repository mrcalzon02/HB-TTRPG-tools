# Beckenburg — Multiplayer Hosting Tools, Local Installation Identity, and Implementation Plan

**Status:** adopted requirements, comparative research, engineering decisions and acceptance plan. Implementation is partial and explicitly recorded below.  
**Date:** 2026-10-18 · **Branch:** main only · **Primary platform:** Windows/Java 17.  
**Companions:** [Multiplayer Complaints Contract](MULTIPLAYER_COMPLAINTS_AND_RELIABILITY_CONTRACT_2026.md), [Technical Architecture](../technical-architecture.md), [Master GDD](../README.md), [Quality Gates](../QUALITY_GATES.md), [Stage Ledger](../stage-ledger.json).

## A. Product philosophy

1. Any person who can install Beckenburg must be able to play single-player offline. Any player who can host on their LAN must be able to invite a friend through a direct address/port without running a Beckenburg-operated account service.
2. A listen server is the **authoritative match** even when hosted by a player. The client may own and freely modify its local save, but cannot control another player's health, items, ghost powers, evidence, damage or case result. Local currency/XP editing is not a ban offense or an anti-cheat problem.
3. Multiplayer connection **recovery** is as important as initial connection. A working join screen is insufficient if one Wi-Fi hiccup ends a 35-minute case.
4. Hosting controls should be powerful but **compact**. Do not add fake server-browser, matchmaking, relay or moderation buttons with no backend. Use a single host window with tabs/sections that share the same match configuration source.
5. Local install IDs are convenience identities, **not security principals, anti-cheat attestations, hardware locks or globally authenticated accounts**. Client-supplied IDs can be copied, modified or replaced. Authorize sessions using host-issued random tokens and host-owned seat policies, never by believing an installation ID.
6. No silent router configuration or background port opening. Firewall help, optional UPnP/PCP/NAT-PMP probing and NAT mapping need explicit user consent, cleanup and error evidence if implemented. UPnP is **off by default** as a conservative choice.

## B. Competitive hosting-feature review

These capabilities are observed in real multiplayer game documentation, not a survey-measured top-ten ranking.

| Documented comparison | Capabilities and lesson |
|---|---|
| **Valheim** dedicated-server guide | Server name/port, password, public/invisible listing, save directory, save intervals, rotated backups, admin/banned/allowed user lists, kick/ban/unban; crossplay transport can avoid manual router forwarding but requires its separate backend |
| **Factorio** multiplayer and console references | Host-and-play or headless server; server configuration GUI/CLI, max users, password, admin, whitelist/ban, logs, automatic saves, AFK kick, LAN/public/hidden visibility, auto-pause with no players, configuration exports |
| **Unity Multiplayer Sessions** architecture | Session identity, membership, reconnect, owner/host election and actual state migration are different responsibilities; host election alone **does not move game state**. These API patterns can inform our design without adding Unity services to a Java product |
| **Steamworks networking** | Reliable/unreliable messaging, direct-IP or provider P2P, authenticated connection IDs, optional relays and diagnostics. The open-source network API does not automatically grant Valve's hosted relay infrastructure |
| **Microsoft Windows firewall guidance** | Default inbound restrictions and firewall policy are real causes of unreachable direct hosts. An outgoing client connection succeeding is not evidence that the same PC can accept unsolicited incoming connections |
| **User reports on co-op/asymmetric games** | Reconnect omissions, host rage-quit, voice drops, confusing bans/kicks, AFK ready-state delays, long backfill, lag/through-wall hits and hostile public lobbies; mitigate by verified functional tools |

### Hosting catalogue prioritized for a short-run asymmetric horror game

**P0 — Essential for a legitimate LAN feature:**
- Host locally, join by address/port, IPv4 fallback and visibly tested listener state.
- Private/invite-only host, room password or per-seat join secret, clear max player count (1–6 hunters plus separate ghost role), configured game rules and difficulty before launch.
- AI ghost fallback and **same world** on human-ghost departure; continuing hunt if hunter TCP drops; rejoining the existing seat/match.
- Visible connection states and errors; avoid silent lobby freeze, unreachable address and indistinguishable voice-vs-game drops.
- Dedicated Server authority in the architecture; client provides action *requests* only, role-specific host snapshots, authoritative loadouts and effects.
- Local persistent player identity, compatible save import, atomic profile saves and backups.

**P1 — Host tools before broad release:**
- Host dashboard with quick server summary: route, bind/listen address (not a fake public IP), port TCP/UDP, game version/content hash, privacy, role seats and authoritative difficulty.
- Connected-player list: nickname/seat, readiness, join/leave timestamp, RTT/jitter/loss when measurable, voice/mute status, disconnected grace counter and ghost AI/human ownership.
- Host controls: lock lobby, remove/kick participant, allowlist/password and temporary denylist; no global hardware-id bans. Owner and moderators have explicitly different permissions; never let a remote client claim admin because of its nickname, ID or profile file.
- Rejoin and party continuity, ready countdown, lobby persistent between contracts, reserve slots for returning participants and no infinite waiting for unavailable ghost slot.
- Host diagnostics: binding failed, TCP blocked, UDP voice blocked, address family, mismatch, seat full, NAT type where actually measured, connection route. Copyable local support log with redacted credentials/IP when possible.
- Quality and safety settings: AFK and ghost-AI replacement policies, voice mute/report/kick in private group, idle timeout, match-abort vote (host adjudicated), ability to gracefully end the case.
- Automatic checkpoint and autosave policy for host-controlled current mission, transactional case completion, manual server-state backup/export; do not invent mid-match resume when snapshot schema is incomplete.
- Presets with explicit change review: Casual Friends, Private Competitive, Accessible Investigation and Custom. Presets must state gear policy (player saves allowed vs normalized loadouts), human/AI ghost policy and idle timers. Individual accessibility settings always remain local.

**P2 — Strong additions after stable transport:**
- Direct LAN discovery plus manual-IP fallback; recent server list and favorites stored **locally**; connect diagnostics wizard that distinguishes LAN firewall from WAN NAT.
- Headless private server with config file and CLI; no graphics/audio capture required; graceful stop/save; startup health check, logs, backups, basic admin console, stable versioned schema and clean Windows distribution.
- Flexible LAN host devices: loopback host+client on same machine, secondary wired adapter, IPv6, VPN/overlay network clearly labeled as advanced/user supplied, multiple network adapters.
- Session/gameplay telemetry: host tick p95, queue lengths, seat snapshot age, packet loss/late event, recorded collision decision for suspicious ghost attacks. Output must be optional and local.
- Pausing when all hunters are absent **only for entirely cooperative/noncompetitive sessions**; in adversarial play ghost timing and outcomes require specific published match rules.
- Round admin options such as replay current map, change scenario, kick/lock midround, return all to staging, rotate ghost, set bot ghost, persist eligible party and ready status.

**P3 — Optional later capabilities with dependencies:**
- Direct public-WAN hosting with authenticated encrypted command/voice transport and explicit port/firewall guidance.
- ICE/STUN candidate gathering (requires a signaling channel), relays/TURN fallback (requires provisioned provider/bandwidth and privacy disclosure), shareable invite code (requires a real directory/rendezvous service).
- Public server browser with filters: language/region, ping, seat count, role availability, privacy, difficulty, content version, human/AI ghost; optional favorites/blocklists; **not** fake open listings.
- Dedicated multi-instance hosting, scheduled restart, remote RCON/admin control with authentication and rate limits, automatic log rolling. Never bind RCON to 0.0.0.0 without secure deployment.
- Actual host migration only once full snapshot, authority epoch, host election, world/event replay and private secrets have been proven. A replicated client state alone is not sufficient.

## C. Current baseline, audited by reading GitHub source

- Source: software/beckenburg/src/main/java/org/beckenburg/LanHost.java, LanClient.java, LanProtocol.java, LanVoiceRelay.java and current docs in network/.
- A real Java 17 TCP LAN host with seat-authoritative commands, 1–6 hunters, ghost seat and host-tick loop already exists. Client messages are a bounded version-1 ASCII protocol; this is a legacy design constraint for future feature negotiation.
- Separate UDP voice shares numeric port but is not encrypted; real WAN exposure is not supported.
- Human ghost loss already yielded AI takeover, and guest hunter **deliberate Leave** already preserved the mission. Source slice 019 now distinguishes unexpected guest loss from Leave, reserves the lost seat and supports validated in-process rejoin; H1/listen host departure still stops the match.
- The source-level resume, room password/lock and local LAN diagnostics are documented in [LAN Session Recovery 019](LAN_SESSION_RESUME_IMPLEMENTATION_019.md), with tests wired but a full rebuild and Windows acceptance still unverified. No completed dedicated server, host migration, public lobby, NAT/relay provider or public WAN authentication is claimed.
- The Java 17 solo local save (ProfileStore) already uses atomic properties files, mission receipt de-duplication, credits, experience and equipment.

### Implemented source slice added in this initiative (requires full-project/Windows verification)

- BeckenburgInstallIdentity: creates separate one-time installation and player identifiers on first **application launch after install**, under the existing per-user ~/.beckenburg folder. A 256-bit SecureRandom value combined with **coarse hardware class** (OS family, architecture, logical CPU count) is SHA-256 mixed to derive a 128-bit hexadecimal installation ID. A separate random UUID is issued for the initial player profile. Hardware serials, MAC addresses, firmware/TPM identifiers, hard-drive IDs and hidden device tracking are not read. Hardware changes later do not invalidate or regenerate the ID.
- This data is stored as installation.properties with a cross-process installation.lock and atomic first creation. Corrupted/unsupported existing identity is **reported and preserved**, never silently replaced. Generated IDs are **not sent over the network**, and must not be treated as secret proofs of identity.
- On startup, InvestigationGame loads/creates this identity and creates an initial local save when no profile exists. The player sees a short ID on the launcher menu.
- ProfileStore.importFrom validates a user-selected local save in a temporary file, creates a pre-import backup, atomically replaces the active progress, and updates in-memory money, experience, equipment, medicines and mission receipts. It **does not import or overwrite installation ID**. A valid import can recover a previously blocked corrupt save.
- The launcher exposes IMPORT LOCAL SAVE. Java 17-focused headless tests check identity stability/uniqueness/corruption and imported progress/backups/corrupt recovery. Both platform build scripts invoke them. A focused local isolated identity test passed; end-to-end application compilation, Windows file chooser, installer and full test suite require verification.
- The present install identity is **not generated inside the OS installer**; it is generated on the first game process start, avoiding elevated installer privileges and leaving local identity under the player's own Windows account. The installer can later invoke a safe first-run step, but the same source code must remain the only authority.

## D. Identity, profiles and privacy: precise semantics

| Concept | Local persistence | Stable when... | On import/reinstall |
|---|---|---|---|
| Installation ID | installation.properties, created first run | Changing GPU, CPU count, OS version or monitor; moving/copying character saves | Stays on current installation; full uninstall that deletes this file yields a new one |
| Default player ID | Same separate local identity registry | Editing credits, importing old progression, changing host | Not overwritten by old save; future multiple local player profiles get their own IDs |
| Hardware-at-install profile | Coarse class stored once locally | Hardware later changes | Informational profile only, never revalidated or uploaded |
| Local progression save | profile.properties and backups | Installing updates, re-launching, LAN join | Import applies progression; old save backed up; user can edit own money/XP |
| Host seat + resume token | Host memory and temporary client secret store | Temporary transport disconnect in a single mission | Must be random, expiring and host-authenticated; unrelated to installation ID |
| Session admin authorization | Host-owned ACL and session credentials | Profile changes, client rename | Must not rely on claimed install ID or a local-file field; optional persistent friend trust later |

**Identity anti-goals:** Do not scan users' physical serial numbers, bind gameplay ownership to hardware, impose anti-tamper checks, claim global collision-proof authentication, generate platform hardware fingerprints, track players across games, or implement non-consensual global bans. If the player deletes the local ID and gets a new one, that is not a security incident. Session-level abuse control needs host-authoritative privileges and random host-issued secrets. If players request export of the entire installation ID, make it deliberate and include a warning that it is not a password.

**Imports and future multi-profile:** Current import keeps a single active identity and imports one progression file. A later Profile Manager can offer New / Duplicate / Rename / Select / Import / Export / Backup / Restore per player with a stable ID per local profile, while maintaining machine-scoped installation ID. If two players share one Windows login, they should not have to share an avatar/progression. Do not advertise multi-profile selection before implementing it.

## E. Host UI specification — high information density

Top command line: **SOLO | HOST LAN | JOIN BY ADDRESS | RECENT** (RECENT only when built).

Host panel, minimal sections rather than separate pages:
- **Room:** room name, privacy, address:port copy, network transport, password reveal/hide, version, mission/stage, max seats, start/stop, lock.
- **Players:** compact rows of role, status, seat, nickname, RTT, voice state, owner/guest, reconnect countdown, action menu (mute, remove, allow).
- **Rules:** difficulty modifiers already implemented, AI/human ghost policy, loadout limits, friendly/custom preset, timer/difficulty explanation only when not obvious.
- **Network & Server:** local adapter/bind interface, port, connection self-test and diagnoses, current route, meaningful error history, dedicated server configuration import/export when built.
- **Admin:** administrator access, allow/deny list, autokick/reconnect policy, request return-to-lobby, graceful end and local session backup. Sensitive controls require confirmations.
- **Diagnostics:** expandable nonintrusive tick/RTT/packet graph and Copy Support Report with sensitive info redacted.

All controls expose whether they apply now, at next match, or require rehosting. Changing the host's client graphics/text/voice volume NEVER changes authoritative difficulty or other players' options. No tabs dedicated to an obvious one-button function; scrollable consolidated lists where practical. An inaccessible visual admin panel must have keyboard navigation and readable status.

## F. Engineering work packages, dependency order, and acceptance

### H-00 — Identity and save ownership (source slice active)

**Implemented in source:** local install ID registry, random player UUID, coarse hardware snapshot, first-run menu display, local save import, pre-import backup and test sources.  
**Still required:** full Java 17 build and tests on authoritative main; clean Windows first-launch/uninstall/reinstall tests; verify import through actual file chooser, both blocked profile recovery and normal progression; validate no ID ever sent over network. Decide whether installation ID should be visible in main profile UI beyond the compact code. Add optional Export Save button, readable backup list and profile switcher only when real.

**Acceptance:** first-run ID created once; restart, graphic-card swap and imported save leave install ID unchanged; separate installs have different IDs; corrupt registry never silently resets; no serial/MAC/TPM access; import backs up and restores actual currency/items; no static anti-cheat or authentication dependency.

### H-01 — Host diagnostics without new transports

Inspect listener/bind lifecycle and show actual bound TCP/UDP addresses, port and local IP candidates, game version, seat limits, last failed join reason, live LAN status. Improve errors and publish a small logging schema without writing voice/chat or secrets. Instrument current TCP queue and tick stall; distinguish 10 Hz game logic from display FPS. Test Windows firewall, two NICs, IPv4/IPv6 and UDP blocked/TCP works.

**Source implementation update (2026-10-18):** [020 restart recovery integration](LAN_RESTART_RECOVERY_AND_SNAPSHOT_020.md) extends 019 with first-run stored resume tickets, authoritative command sequence watermark and host-filtered casefile/progress rehydrate. Its isolated Java 17 ticket-store test passed; the complete socket game suite and Windows LAN session are not yet verified. Continue H-02 hardening rather than marking the release gate complete.

### H-02 — Connection recovery (highest gameplay priority)

First implement hunter drop continuity with host seat reservation and 120-second **provisional** deadline; then a safe seat-specific resume token and full role-filtered state snapshot. Reuse existing ghost AI takeover and add a human ghost return path with one world controller/epoch. No teleporting, item duplication, false final result or hidden-info leak. Reconnect UI appears only when tested on distinct PCs. Host process death is separate and explicitly reported.

### H-03 — Host administration and quick-lobby QoL

Implement password/invite-only LAN joins, room lock, capacity and ghost role selection, host-owned difficulty, readiness countdown, AI fallback, private names, refusal messages and party reuse. Add host-bound kick/mute/allowlist controls with recorded source and permission checks. Avoid unsanctioned global ban databases or bans tied only to local install IDs. A guest cannot forge HOST or kick packets by changing local save or nickname.

### H-04 — Voice, session backup and fault handling

Recover mic/output/voice subsystem across devices and transitions without killing TCP session. Build host mission checkpoints only after snapshot schema and unique event receipts support exact rollback/finality; add save-on-graceful-end and optional private-server backup. Define player absence/AFK policies appropriate to PvE vs 3v1. Collect a real 1–6 hunter + ghost live transport load matrix.

### H-05 — Network transport measurement and possible upgrade

Benchmark current TCP 10-Hz host and voice path at artificial delays/loss, and compare 20/30-Hz host simulation with constrained CPU/GPU. Only after proof, add a bounded unreliable movement/snapshot channel while reliable evidence/case/reward messages stay reliable/idempotent. Validate host hit arbitration at door corners, smoke, wards, and ghost attack telegraphs. Protocol versioning and replay fences are mandatory.

### H-06 — Dedicated private server / external connectivity (later)

Refactor authoritative host loop into headless Java 17 process, same validated simulation/event contract, same session ACL and local saves for its mission state. Provide readable config, console commands, deterministic startup, autosave/backup, graceful shutdown, update/version support, repeatable packaging. Only after that consider encrypted WAN direct access, opt-in router port mapping and ICE/STUN/TURN or Steam/EOS connectors. Those are **independently optional** and not needed for local/private LAN.

## G. Explicit acceptance matrix

| ID | Required test outcome |
|---|---|
| HOST-01 | Clean Windows first launch creates stable local install/player IDs and initial save with no network connection |
| HOST-02 | Two installations with identical hardware class generate different IDs; same install always loads unchanged ID |
| HOST-03 | Imported user-edited progress with changed credits/XP/items succeeds, original backup remains, install ID unchanged |
| HOST-04 | Corrupted registry prevents silent replacement; corrupted progression can be restored by validated import |
| HOST-05 | A user changes GPU/CPU/monitor and reboots: no loss of identity, profiles or game progress |
| HOST-06 | Host can bind/join on two LAN machines, report actual TCP/UDP listener state and actionable firewall errors |
| HOST-07 | Hunter unexpected disconnect does not terminate others; no ghost information leak; same seat reconnects |
| HOST-08 | Human ghost leaves to AI and returns with intact cooldowns and role; old session commands rejected |
| HOST-09 | Wrong version, full, locked, password failure and expired reconnect all return distinct, correct status |
| HOST-10 | Private LAN host/AI ghost starts offline; no Steam/EOS/cloud login or internet required |
| HOST-11 | Client cannot send host-only difficulty, kick, result, item or damage commands; owner/role privileges enforced |
| HOST-12 | Stable tick and measured RTT/jitter/loss with 1–6 hunters, simultaneous voice and hostile guest packets |
| HOST-13 | Session backups/receipt dedup preserve authoritative missions when recovery is claimed |
| HOST-14 | Voice fails/reinitializes across audio devices without dropping match or losing local/radio text |
| HOST-15 | Headless-server features and WAN NAT/relay options are hidden until complete external deployment and test |
| HOST-16 | No identifier or hardware detail silently transmitted or printed in network/gameplay debug logs |
| HOST-17 | All menus usable via keyboard and large text; responsive controls with no redundant help panels |
| HOST-18 | Installer, launcher, game host, local save manager and export/recovery still work after a failed update |

**Claim protocol:** INTENT → EXECUTE → OBSERVE → VERIFY → CLAIM. A GitHub commit proves source persistence, not Windows installer, gameplay, multiplayer quality or tester accessibility. No GitHub Actions are introduced. Log future acceptance results only in the existing stage ledger.

## H. Source references

- Valheim official guide: https://valheim.com/support/a-guide-to-dedicated-servers/
- Factorio console/admin documentation: https://wiki.factorio.com/console
- Factorio multiplayer/headless/server configuration: https://wiki.factorio.com/Multiplayer
- Factorio server CLI options: https://wiki.factorio.com/Command_line_parameters
- Microsoft PC networking and firewall behavior: https://learn.microsoft.com/en-us/gaming/gdk/docs/features/console/networking/game-mesh/pc-port-behavior
- Unity Sessions reconnect: https://docs.unity.com/en-us/mps-sdk/join-session
- Unity host migration — ownership versus world state: https://docs.unity.com/en-us/mps-sdk/session-host-migration
- Valve Steam Datagram Relay constraints: https://partner.steamgames.com/doc/features/multiplayer/steamdatagramrelay
- Steam networking API: https://partner.steamgames.com/doc/api/ISteamNetworkingSockets
- Java SecureRandom: https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/security/SecureRandom.html
- Windows hardware/system ID is provider-specific and not a universal portable Java authentication token: https://learn.microsoft.com/en-us/uwp/api/windows.system.profile.systemidentification.getsystemidforpublisher
