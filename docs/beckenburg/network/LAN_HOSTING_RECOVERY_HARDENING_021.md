# Beckenburg — LAN Hosting and Reconnect Hardening, Slice 021

**Date:** 2026-10-18 · **Branch:** `main` · **Status:** targeted production source changes, new automated socket tests registered; full Java 17 compilation and Windows two-PC runtime verification **NOT YET PERFORMED**. This document supplements [020](LAN_RESTART_RECOVERY_AND_SNAPSHOT_020.md) and the existing [quality gates](../QUALITY_GATES.md), not a replacement stage ledger.

## 1. Bugs found through source-level review

**5-field welcome regression (critical):** The server's new greeting included `WELCOME|seat|1|resumeToken|hostCommandSequence`; the client permitted five fields but extracted the random credential only when `parts.size()==4`. New ordinary client joins then received no saved resume token, and reserved-seat resumes could be rejected outright. `LanClient` now parses credentials whenever four **or five** fields are present and consumes the host high-water sequence in a five-field greeting. Legacy three- and four-field welcomes remain readable. `LanClientWelcomeTest` uses a real TCP ServerSocket to check all three greeting formats, token rotation and a stale command counter becoming host high-water + 1.

**Wrong reported voice port (hosting diagnostics):** `LanHost` assigns a separately chosen ephemeral **UDP voice port**, not necessarily the TCP gameplay port. `Host info` previously claimed both shared the same port. `LanHost.voicePort()` now provides the actual relay port, and the diagnostics present both real numbers with clear UDP firewall guidance. `LanNetworkDiagnosticsTest` was adjusted accordingly.

**Host owner confused with H1 (asymmetric hosting):** The previous logic used hunter seat 0 for ownership regardless of whether the actual local host was playing the ghost. Explicit host departure now follows the selected local owner seat (H1 when hunter-hosting, GHOST when ghost-hosting). Unexpected **TCP socket loss alone** can be temporarily reserved even for that owner seat while the authoritative `LanHost` process is still running. Only explicit owner Leave or stopping the actual host process ends its session; host migration is not implied. The expiration loop now includes H1 when it is a guest in a ghost-owned room. `LanHostOwnerRecoveryTest` exercises real guest-H1 loss and restore while the ghost hosts, plus hunter-owner client transport loss with continued server authority.

**Lost reservation on failed handshake:** The server no longer consumes a reserved seat until the resumed socket has been written its new welcome token. A failed WELCOME send preserves the previous reservation rather than orphaning the player. A crash *after* the server wrote a rotated token but before the client persisted it remains a narrower outstanding race: robust token-rotation acknowledgement and redundant bounded ticket handling require follow-up before stronger recovery guarantees.

**Local owner-slot theft (security/fairness):** Because the server starts accepting sockets before the host UI opens its own TCP client, a guest could occupy H1 first and get host-only START/leave behavior. The new optional strict-local-owner constructor for `LanHost` creates a **192-bit random local owner join credential before the listener starts** and reserves H1 or GHOST according to the actual host role. The production `LanLobbyWindow` passes that secret only to its in-process loopback client during a six-field `JOIN` handshake. The host validates secret, loopback origin and correct role before assignment. Ordinary remote guest join remains the existing 4/5-field format: with a hunter host, guests can take H2–H6 while H1 is pending; with a ghost host, the ghost role is reserved for the owner while remote hunters can occupy H1. Six-field owner claims without a correct credential are rejected. **Existing non-strict `LanHost` constructors remain for legacy automated tests; they must not be advertised as secure owner admissions.** `LanSecureOwnerAdmissionTest` verifies guest-first racing, forged owner proof, password-protected host claims and ghost-owner reservation.

## 2. Preserved architectural contracts

- **Server-authoritative:** exact game state, ghost, damage, healing, field evidence, equipment, match rules, session and replay sequence are host-owned. A client has only its assigned actor commands and permitted observations.
- **Local save ownership:** locally editable money, progression, unlocks and saves remain permitted without anti-cheat or hidden identity scanning. Installation ID and player-save ID do not authorize host seat or network commands.
- **Trusted LAN boundary:** owner credential, room password, resumed seat capability and voice are not end-to-end encrypted. The host restricts the strict owner claim to the loopback connection. Do not expose this listener as safe Internet hosting.
- **No arbitrary host migration:** if the host process or VM disappears, no peer holds its complete authoritative world. The client may reconnect only when the real host survives. Private headless hosting is a separately staged future feature.
- **No misleading diagnostics:** both TCP and UDP bound ports are displayed, not invented reachability/ping, relay, NAT type or public Internet URL.

## 3. Source/tests changed

`software/beckenburg/src/main/java/org/beckenburg/LanClient.java`, `LanHost.java`, `LanLobbyWindow.java`, `LanNetworkDiagnostics.java`; new `LanClientWelcomeTest.java`, `LanHostOwnerRecoveryTest.java`, `LanSecureOwnerAdmissionTest.java`; updated `LanNetworkDiagnosticsTest.java`, `build.sh`, `build.cmd`. Full-files were fetched with original blob SHAs, changed with targeted anchors, committed to `main` and read back remotely.

**Acceptance evidence still required:** full `javac --release 17` build with licensed runtime assets, all existing gameplay tests, integration tests above, cross-PC LAN sessions under disconnect and packet loss, Windows Firewall conditions for two distinct ports, actual GUI event/focus sequencing, and no ghost hunter-only secret leaks. The current work records **source implementation** and test definitions, not those acceptance passes.

## 4. Next engineering microsteps

1. Build, run and repair all 021 regressions in a complete Beckenburg checkout; return any failing test to root-cause repair, not skipping.
2. Make rotated reconnect token finalization crash-safe (two-phase confirmation or bounded previously-valid credential window) without enabling multiple concurrent controllers; simulate failure immediately after `WELCOME`.
3. Explicitly distinguish simulated listen host lifetime from owner-avatar presence in UI, host status and session log; only show reconnect for real existing host sessions.
4. Add host-owned rejection telemetry with secret redaction and accessible error UI, including separate UDP voice-port checks.
5. Exercise client restart, restoration of journal/inventory/ghost cooldowns, equipment transactions and ritual effects under real TCP loss on Windows.
6. Explore optional private headless Java host after the above LAN gates pass; do not bundle a public relay or cloud account service without approved security architecture.

As always, use INTENT → EXECUTE → OBSERVE → VERIFY → CLAIM. No GitHub Actions have been introduced for this slice. The existing [stage ledger](../stage-ledger.json) remains the sole implementation-status authority.
