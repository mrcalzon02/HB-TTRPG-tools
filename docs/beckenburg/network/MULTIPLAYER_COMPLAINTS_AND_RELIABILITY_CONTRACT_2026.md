# Beckenburg — Multiplayer Complaints and Reliability Contract (2026)

**Adopted:** 2026-10-17. **Status:** researched design and testing requirements; not implemented-feature claims. Companion to the [master GDD](../README.md), [technical architecture](../technical-architecture.md), [quality gates](../QUALITY_GATES.md) and [stage ledger](../stage-ledger.json).

## Decisions

**Host/server authoritative simulation, local player-owned saves.** “Server authoritative” means a single trusted simulation — player-hosted listen server for LAN, optionally an independently hosted headless private server later. It does **not** demand cloud matchmaking, always-online DRM, a company-owned dedicated-server fleet or mandatory accounts. Clients request actions; they cannot authorize attacks, healing, completed rituals, payouts, evidence truth, object positions or hidden ghost information. The same command dispatcher and legal ghost observation contract apply to AI and human ghost controllers.

**Local saves can be edited without punishment.** Profiles, credits, levels, unlocks, cosmetics, settings and achievements are owned by the player and may be backed up, exported, imported or edited. We are NOT building anti-cheat or a centralized progression economy merely to stop local credit/XP edits. The host remains authoritative for *in-session* equipment, rewards, damage, objectives and the mutually agreed lobby equipment policy. A player's modified progression does not let them modify another player's character or the host's world. If fairness is desired, a host can choose equipment-normalized rules, not inspect someone's files.

**Offline and LAN are first-class.** Solo requires no network. LAN must work by direct IP/port without services; optional discovery is convenience. No Steam, EOS, third-party relay, central directory or internet dependency is required for baseline play. WAN, NAT negotiation, lobbies over the Internet and relaying are later explicitly gated options. A direct-IP listen server is not automatically reachable through CGNAT, restrictive firewalls or symmetric NAT.

**Controls must never be decorative.** Reconnect, connection method, relay, server browser, kick/vote and advanced diagnostics appear only if an end-to-end tested implementation exists. Failures must state the reason and safe next steps.

## Comparative research: complaints and advantages

These are user reports and developer patch notes, not a scientific frequency ranking or certain explanations for competing games' implementation details.

| Game and evidence | Recurring player-facing pain | Our design response |
|---|---|---|
| **Phasmophobia:** official v0.19 QoL, v0.18 and v0.17 fixes | Connection drops; voice/input and lobby transition failures; desynchronized doors/equipment; audio arriving after animation; inaccessible or incorrectly synced evidence; game-UI interference | Session reconnection, explicit device states, separate voice recovery, host-timestamped evidence and object events, accessibility and quality-preset tests |
| **Phasmophobia:** player reports | Mid-contract timeout, inability to rejoin, getting kicked immediately from public rooms, microphone dying between games | Resume same mission seat; deliberate private/invite/public semantics; user-resolvable diagnosis without restarting |
| **DEVOUR:** direct developer explanation and players' reports | Failed NAT punch-through, some networks needing relays, lost sessions and rejoin difficulty | Connectivity mode/fallback architecture and status; don't misrepresent direct P2P reliability; restore disconnected seats |
| **R.E.P.O.:** players' reports | Voice stops working and the team must fall back to Discord or restart | Resilient voice connection separate from authoritative game and built-in text fallback |
| **Dead by Daylight:** 2026 community reports | Rubber banding, lag spikes and apparently unfair melee hit validation | Single host collision/range arbitration, measured latency compensation and visual smoothing |
| **The Texas Chain Saw Massacre:** community reports | Lobby backfill deadlock, role shortages, waiting for AFK ready presses and early quits | AI ghost fills absent opponent, bounded ready countdown, keep premade groups together, quick round-to-round return |

### Important nuanced finding: team journal sharing

Phasmophobia's 2026 shared teammate evidence/deduction feature was positively received by some players, but others requested an option not to see a teammate's hypotheses, especially with premade groups solving independently. Beckenburg should transmit **actual authorized evidence and optional shared notes** while offering **Show teammate deductions: On/Off**. Never treat a subjective guess as authoritative evidence or allow a ghost to read hunter-only journals.

### Current implementation verified by reading existing source/docs (2026-10-17)

- Java 17 LanHost is already the match authority with real seat-bound input commands, host-side ghost effects and AI ghost control.
- Java 17 LanClient/LanProtocol use **bounded ASCII TCP** messages for game and lobby (protocol version 1, 512-character maximum frame); host simulation schedule currently ticks at **100 ms**. This is prototype status, not an accepted final responsiveness target.
- LAN voice is a separate **unencrypted UDP G.711 μ-law** media path with bounded packets and seat-based tokens. This is *not* safe to advertise as encrypted Internet play.
- [LAN_GHOST_TAKEOVER_013.md](LAN_GHOST_TAKEOVER_013.md) confirms human-ghost-to-AI continuity. A guest hunter's explicit departure already allowed the investigation to continue; losing the host-owned H1 seat ended the match. [Source integration 019](LAN_SESSION_RESUME_IMPLEMENTATION_019.md) adds provisional unexpected-loss reservations, in-process same-seat reconnect and LAN access controls, still awaiting end-to-end Java/Windows verification.
- These findings add requirements to existing production stages and the single stage ledger; they do not create a parallel implementation.

## A. Session integrity and mid-game reconnect

**NET-01 — Explicit connection states.** Distinguish Connected, Degraded, Reconnecting, SeatReserved, AIControl, Closed and HostUnavailable. Display a compact status and reason, not a silent frozen loading screen.

**NET-02 — Rejoin the same mission.** Use a unique match identifier, unique seat, unpredictable time-limited resume secret negotiated over an authorized channel and host epoch. Reserve disconnect seats for an initially proposed **120 seconds** subject to playtest. Validate secret and seat before replay; rotate/revoke credentials, forbid two active controllers or replayed old commands, and restore permitted inventory, character wounds, current room, notes, camera, mission time and final payout eligibility. Do not spawn a duplicate hunter or accidentally re-roll the ghost.

**NET-03 — Hunter disconnect does not cancel everyone's game.** Park their host-owned character at the last legal position, release held input and audio, maintain normal physical risk and revive/rescue paths as defined by the host. The disconnected player is not suddenly invisible, immune or teleported to the van. A genuinely accessible friend-group grace mode can be host-configured but must not become a disconnect-to-escape tactic in adversarial play.

**NET-04 — Ghost continuity in both directions.** Existing human-to-AI takeover stays. When human ghost reconnects, let AI relinquish control at a safe host tick while preserving ghost identity, resources, cooldowns, pose, telegraph/strike state and the global command sequence/epoch. Returning must not grant extra powers or hidden knowledge.

**NET-05 — Filtered state rebuild.** Snapshot the world and delta/event journal with stable IDs and host tick, and send only the rejoining role's allowed view. Hunters never receive hidden ghost true type via networking; ghosts/AI never get hunter exact whereabouts or private notebook in their rejoin snapshot. Include doors, instruments, inventory reservations, health, sanity, objectives and persistent case evidence as permitted; bound size and validate schemas.

**NET-06 — Host loss is a separate case.** Listen-host disappearance cannot be solved by a reconnect button. Initial goal is graceful shutdown/abort reporting and correct local reward state. Headless dedicated server is a future way to survive a player's PC leaving. **Do not promise host migration** unless validated checkpoint transfer, secrets filtering, host-epoch fencing, and all authoritative world state exist. Avoid giving a newly promoted ghost host information their character must not know.

**NET-07 — Idempotent state and rewards.** Stable mission ID, event IDs, sequence and transaction receipts for item pickup/drop, revive, notes, ritual resolution and rewards. Repeat packets or reconnects cannot apply events twice. Atomic local profile writes; no loss or duplication from receiving the debrief multiple times. Players may still edit their own saves without accusations.

## B. Connection options and realistic network architecture

**NET-08 — Modes:** Solo/offline in process, Host LAN, Join LAN by address and port as the minimum. Optional LAN discovery via bounded mDNS/broadcast; IPv4 and IPv6 direct connectivity separately exercised. WAN Direct with chosen port or forwarded port, NAT negotiation, a relay and provider friend invites are all deferred until operational and proven.

**NET-09 — NAT traversal is not magic.** ICE/STUN require a signaling pathway; UDP hole punching is not universally effective (e.g., carrier-grade NAT); TURN or similar relay requires a reachable managed or user-run service and has potential cost/privacy/latency consequences. A room code is a rendezvous reference and cannot by itself punch through firewalls. Expose actual route and port/firewall guidance, not “Network error”.

**NET-10 — Keep transport pluggable.** Existing TCP lobby/game commands are real and should not be thrown out without a measured reason. TCP reliable ordering can introduce head-of-line delays during loss; if profiling warrants, split reliable discrete events (transactions, evidence, chat, match control) from time-sensitive movement/state snapshots carried by a suitable UDP/reliable-datagram transport. Never block simulation tick or Swing EDT waiting on network IO. Bound queues; discard old transforms but never omit committed evidence or payouts.

**NET-11 — Library research, not a dependency mandate:** Java NIO/Netty suits an all-Java stack; Valve's permissively licensed C++ GameNetworkingSockets supplies encrypted UDP, ICE/NAT options and per-message reliability but needs tested Windows native packaging and a Java binding. Its public open-source build **does not grant Valve Steam Datagram Relay**. Steamworks SDR and Epic EOS relay access impose provider/platform requirements and are optional only. Preserve phone/VR independent project stacks elsewhere.

**NET-12 — Appropriate threat boundary.** LAN's present plaintext trust boundary must be accurately disclosed. Opening a WAN/public listen port would require an authenticated, encrypted signaling+game+voice protocol, bounded untrusted data, rate limits and safe resource cleanup first. Permitting local save edits is not permission for remote clients to inject damage, impersonate seats, exploit the server or eavesdrop on voice. Avoid unsafe Java deserialization.

## C. Latency, netcode fairness and voice

**NET-13 — Quantify real network quality.** Record RTT median/p95, jitter, packet loss/reorder, snapshot age, server tick p95, correction distance/teleports, receive backlog and voice packet underruns. Expose a short good/degraded/poor indicator with optional details. High FPS is not proof of low ping, and low ping is not proof of correct hit validation.

**NET-14 — Revisit prototype 10-Hz host tick.** Benchmark 10/20/30 ticks per second and select sustainable cadence on reference hardware under 1–6 hunter loads and ghost powers. Simulation stays decoupled from render/voice. Interpolate remote movement and optionally predict local controlled character with bounded correction; never extrapolate a ghost or hunter through a closed door simply to look smooth.

**NET-15 — Server-only strikes and hitboxes.** Validate actor position, target range, occlusion, doors, ward zones, power cooldown and telegraph state on host. Lag compensation may use **bounded** historical poses after tests; proposed 50–150 ms is an *experiment*, not a released promise. Never trust client-supplied result or arbitrary timestamp. Provide fair readable tells despite jitter, log rejected/accepted strike reasons in dev test, avoid through-wall hit bugs.

**NET-16 — Evidence and objects are authoritative events.** Doors, UV, voice/sound, ghost interactions, spectral artifacts, tool readings, photo captures and rituals carry host timestamps and source/provenance. A delayed audio door cue must not falsely signal the wrong ghost type. Clients cannot pick the same equipment simultaneously or lose it permanently when one peer crashes during a pickup. Graphics quality and shader toggles do not change legitimate evidence.

**NET-17 — Recover media independently.** Mic capture, headphone device output, proximity voice, radio and ghost hearing use separate failure handling. Unplug or switch audio devices mid-match; retry voice without terminating TCP session; display capture/send/receive/mute state. Preserve radio/local text messaging during outage; captions/visual equivalents for authored critical sounds do not depend on voice transcription. Six simultaneous players' voice streams must remain bounded, and ghost-hearing inputs must follow host-owned hearing rules.

## D. Lobby, game UX and local saves

**NET-18 — Fast private-room flow.** Compact Solo / Host LAN / Join by Address, copy direct connection details, show role/ready/difficulty, host-owned party scaling and ghost-seat occupancy. Set invitation/privacy honestly: Public only if genuinely publicly listed; private groups should not accidentally masquerade as joinable public games. Reuse existing party for next round.

**NET-19 — AI prevents opponent-seat scarcity.** The host AI can fill an empty ghost role; lobby launch must not block forever waiting for a human ghost. Specify what happens if human ghost disconnects and AI takes over. Ready countdown short and cancelable; a player who is loading/muted/unready has a visible specific status.

**NET-20 — Useful reject reasons and recovery.** Wrong version, full room, host exited, LAN address unreachable, incorrect port, firewall, private room, role mismatch, seat reconnect expired, media-only failure: all distinct. Provide Reconnect only when the reserved seat has a real working resume contract.

**NET-21 — Player coordination without forced solutions.** Shared verified observations, optional teammate hypothesis overlay, map pins, equipment ownership and evidence journal synchronized to allowed hunters; no hidden ghost truth exposed. Ensure team text/voice alternatives for players who cannot or do not wish to use microphones. No giant menus to explain trivial buttons.

**SAVE-01 — Ownership and backup:** local exported/imported save profiles, accessible storage path, backups, atomic writes, schema migrations; NO anti-cheat scanning, punitive bans for edited XP or mandatory cloud synchronization.

**SAVE-02 — Separate personal progress and in-match authority:** player claims unlocks/wallet in lobby; host enforces agreed equipment loadout and gameplay rules; client keeps own personal copy of final match payout receipt. A cheated local wallet cannot create a real healing effect unless the host validated it as permitted under that session's rules.

**SAVE-03 — Optional fair gear presets:** “Friends — allow player progression”, “Equalized — standardized kits”, “Custom — explicit limits”. All enforced as declared host session policy, never by examining users' private files or installing surveillance software.

**SAVE-04 — Independent endgame results:** disconnecting before a debrief should not erase verified host result when rejoin/receipt recovery is available; never automatically award victory if host crashed without validated outcome. A player may locally grant themselves credits anyway.

## E. Required verification before claiming implementation

| Gate | Scenario and evidence |
|---|---|
| N-G01 | Hunter drops network mid-hunt, rejoins same match, no duplicate player, power/item/health conserved |
| N-G02 | Ghost disconnects, AI plays, same human reclaims seat, no power reset or hidden-info leak |
| N-G03 | Host closes/dies vs. client crashes: distinct truthful recovery; unsupported migration not advertised |
| N-G04 | Repeat pickup, healing, objective, revive, payout, reconnect messages: no duplicate host action |
| N-G05 | Audio disappears across lobby→game→lobby three times; playable session stays active, text fallback works |
| N-G06 | Three Windows systems/driver setups, different routers/firewalls and offline LAN; direct IP and diagnosis tested |
| N-G07 | Stress 1–6 hunters, human/AI ghost, voice, many props/evidence events; record server tick/frame and bounded queues |
| N-G08 | Inject added 0/50/150/250 ms latency, 0/2/5/10% loss, jitter/reorder/duplicates; record what fails, no untested promise |
| N-G09 | Around corners/doors/wards, host ghost strike and client view agree; no fake apparent wall hit or unfair free strike |
| N-G10 | Rejoin restores case events, door/tool state and *only* role-permitted secrets |
| N-G11 | Invalid/expired seat secret, simultaneous double-login and malformed 512+ byte frames fail safely |
| N-G12 | Local save edited for 999999 credits and max gear: host policies enforce only agreed game rules, no “cheat detected” |
| N-G13 | Keyboard-only and low-vision player can read lobby/connection status; game-critical sound cues accessible |
| N-G14 | WAN exposure **not claimed** before real encryption/authentication and tested service route |
| N-G15 | Real packaged clean Windows installs on at least two machines establish and recover a LAN match |

**Release discipline:** Gates remain unverified until run, observed and linked to the existing stage ledger. No new parallel status spreadsheet. Source changes need test evidence, remote readback, and Windows runtime proof for corresponding stage promotion.

## F. Ordered engineering slices

**M0 — Characterize existing LAN:** baseline TCP queue/tick and G.711 UDP, reproduce hunter EOF termination, host crash, current ghost takeover, audio-device hotplug, evidence/object double actions. Preserve same legal ghost rules.

**M1 — Hunter seat recovery:** do not end match on transient hunter disconnect, reserve seat, add session credential and filtered host snapshot; extend human ghost resume from existing AI takeover. Make a true Reconnect control only after real test.

**M2 — Communication/lobby QoL:** failover voice and device reinit, correct local/radio chat, LAN error reasons/discovery, ready and role UX, replay-preserved party. Keep a real AI ghost fallback.

**M3 — Tick/fairness/performance:** measure 10/20/30 tick experiments, implement only warranted movement transport/interpolation, collision/LOS compensation, timestamped audio cues and snapshot loss regression tests.

**M4 — Optional independence:** investigate headless private dedicated server, then secure direct WAN and optional STUN/ICE/relay providers. Do not require a company-owned lobby service or rename a simple LAN room as an Internet session.

**M5 — Acceptance:** fault-injected integration and actual Windows multi-PC LAN sessions, six-hunter loads and voice; check every label/claim against evidence.

## Sources inspected (October 17, 2026)

### Official and technical
- Phasmophobia v0.19 QoL Part 2: https://kineticgames.co.uk/news/phasmophobia-v01900-quality-of-life-part-2
- Phasmophobia v0.18 fixes: https://kineticgames.co.uk/news/phasmophobia-v01800-patch-notes
- Phasmophobia v0.17.1.4 fixes: https://kineticgames.co.uk/news/phasmophobia-v01714-patch-notes
- DEVOUR developer explanation of STUN/NAT and relays: https://steamcommunity.com/app/1274570/discussions/0/3084382396876626835/
- GameNetworkingSockets architecture and license: https://github.com/ValveSoftware/GameNetworkingSockets
- Steam Datagram Relay eligibility: https://partner.steamgames.com/doc/features/multiplayer/steamdatagramrelay
- EOS P2P relay policy: https://dev.epicgames.com/docs/en-US/api-ref/enums/eos-e-relay-control

### Player reports and community discussion
- Phasmophobia timeouts: https://steamcommunity.com/app/739630/discussions/0/691996723218838661/
- Phasmophobia voice failing mid-session: https://steamcommunity.com/app/739630/discussions/0/595152778808118141/
- Phasmophobia reconnect plea: https://www.reddit.com/r/PhasmophobiaGame/comments/lj0jos/
- Phasmophobia teammate deduction toggle: https://www.reddit.com/r/PhasmophobiaGame/comments/1w0j1vp/
- Phasmophobia public-lobby false positives: https://steamcommunity.com/app/739630/discussions/0/592887665229041606/
- DEVOUR disconnect/rejoin: https://steamcommunity.com/app/1274570/discussions/0/3155328042353713601/
- R.E.P.O. voice drop: https://steamcommunity.com/app/3241660/discussions/0/595142971903468598/
- Dead by Daylight 2026 latency complaints: https://www.reddit.com/r/deadbydaylight/comments/1usljsn/ping_dependency_has_gotten_much_worse_this_patch/
- Texas Chain Saw lobby ready issues: https://www.reddit.com/r/TXChainSawGame/comments/1iyu272

**Source limitation:** These are selected examples of material recurring pain points, not an exhaustive statistically ranked complaint survey; prioritize by risk to player time, trust and mission correctness.
