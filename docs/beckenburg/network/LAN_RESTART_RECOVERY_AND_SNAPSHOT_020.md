# Beckenburg — LAN Process-Restart Recovery and Role-Filtered Snapshot (020)

**Date:** 2026-10-18 · **Scope:** Java 17 LAN reliability source and regression additions. **Status:** GitHub code and tests committed. The isolated Java 17-compatible LAN ticket-store test **passed**. Full game compile, integrated socket regression suite, physical Windows multiplayer, voice hardware and installer proof remain **UNVERIFIED**.

Companion to [LAN Session Recovery 019](LAN_SESSION_RESUME_IMPLEMENTATION_019.md), [Hosting and Local Identity Plan](HOSTING_ADMIN_AND_LOCAL_IDENTITY_IMPLEMENTATION_PLAN.md) and [Quality Gates](../QUALITY_GATES.md). This is an implementation report, **not** a parallel stage/progress ledger.

## 1. What was added

### Restart-safe local resume capability

`LanResumeStore.java` persists an *ephemeral host-issued seat recovery capability* to `~/.beckenburg/lan-resume.properties` (within the current user profile). The file is independent of `installation.properties` and `profile.properties` and must not be included in progression save imports or exports.

- Validates server address, port, seat (`H1`–`H6`/`GHOST`), 48-digit random resume token and bounded command sequence; rejects invalid data.
- Atomically replaces the stored ticket. Attempts owner-only POSIX permissions; on Windows uses native inherited ACL permissions. Avoids cloud/network transmission or using any hardware serial.
- Local discovery of stored tickets is limited to 24 hours. **This is only the client's offer/display limit; the host still decides whether its much shorter reconnect grace window is open.** A saved ticket does not imply a valid or reservable seat.
- Never silently replaces a corrupt or unsupported ticket. An explicit client Leave clears saved credentials; temporary link loss preserves them; new successful remote join writes a new token, and a recovered session overwrites the old one after the host rotates its secret.
- Launching a LAN lobby finds the recent saved connection (IP/port and role), enables **Reconnect** and invites an explicit user action. No background reconnection attempts, port scans or remote authentication assumptions.
- Local LAN host shutdown is not resumable: the GUI deliberately does not preserve a self-hosted client's ticket as though the destroyed host still existed.

### Recover authoritative command sequence after a crash

The LAN welcome frame was extended compatibly to include a **host-calculated replay high-water mark**:

```
WELCOME|H2|1|<rotated-48-character-token>|<highest-host-accepted-command-sequence>
```

Old 3-field greetings remain readable, and older 4-field host greetings remain readable. A new 5-field greeting allows the client to choose the greater of its saved sequence and the host's accepted high-water. This handles a crash after the host accepted a command but before its local sequence was saved; the next input starts *above* the host's replay guard. For ghosts the high-water is derived from the prior controller's action and pose sequences; the host's actual GhostDomain action sequence remains authoritative.

**The stored ticket is never a player/installation ID and never authorizes live-world effects.** All resumed input travels through the unchanged seat/role-validation path on the host. A valid token can only bind a reserved seat once; after resumption the host rotates it.

### Role-filtered 3D state rehydration

`LanHost.VIEW3D` now replays, without a separate GUI-dependent `JOURNAL` command:
- Host-owned world positions and doors, bounded manifestation and counter snapshots, equipment charges and supply state.
- Party/hiding configuration, electricity/light state, known ritual site references and the reconnected hunter's health/sanity/evidence and rite progress.
- Hunter-only casefile entries and teammate-marked field observations, explicitly excluding the human ghost and its AI controller.
- Per-seat voice setup key and investigator radio history from the active host, not from the client.
- Existing `JOURNAL` command still works for an on-demand refresh. The lobby no longer redundantly requests a second journal reset when the 3D view opens.

`GVIEW3D` remains the separately filtered ghost view, including species reveal only after a valid ghost seat enters active play. It receives **none** of the hunter casefile, notes, TEAMMAP, PROGRESS or hidden-data snapshots.

## 2. Source locations

- `software/beckenburg/src/main/java/org/beckenburg/LanResumeStore.java`
- `software/beckenburg/src/main/java/org/beckenburg/LanClient.java`
- `software/beckenburg/src/main/java/org/beckenburg/LanHost.java`
- `software/beckenburg/src/main/java/org/beckenburg/LanLobbyWindow.java`
- `software/beckenburg/src/test/java/org/beckenburg/LanResumeStoreTest.java`
- `software/beckenburg/src/test/java/org/beckenburg/LanSessionResumeIntegrationTest.java`
- `software/beckenburg/build.sh`, `software/beckenburg/build.cmd`

## 3. Direct validation performed

An isolated compilation of the ticket store with `javac --release 17` and its Java regression suite executed successfully in the model's working container on 2026-10-18:

```
PASS: LAN resume file, rotation, expiry, corruption preservation and profile isolation
```

This exercised source behavior equivalent to the committed ticket store with only `ProfileStore.defaultPath()` stubbed to avoid unrelated project dependencies. **It is not a claim that the full repository, launcher, TCP host/client or Windows installer compiled or ran.**

The broader `LanSessionResumeIntegrationTest` has been corrected to use legal room mode before opening 3D, then 3D step input afterward; it now sends a deliberately stale saved sequence, expects the host sequence high-water to prevent replay rejection, marks a real investigator clue before disconnect and expects that note plus a fresh progress/journal snapshot on rejoin. Tests explicitly reject leakage of hunter-only frames to a ghost seat.

The test is included in both native build scripts and remains **awaiting execution** in a full source/assets checkout.

## 4. Engineering limits to address next

1. **Full build and runtime acceptance:** Run `software/beckenburg/build.sh` or `build.cmd` in a complete source checkout with the approved runtime assets. Source read-back or a test listed in a script is not test success. Use a Windows 10/11 target with two independent machines and direct LAN.
2. **Additional snapshot domains:** Confirm exact 3D rehydrate fidelity for active ghost strike warning, hunter hiding, placed/held props, ward markers, mission result already resolved, inventory transactions pending at disconnect and voice channel/device hotplug. The current snapshot covers the enumerated documented fields, not an unrestricted binary world checkpoint.
3. **Crash races:** Test token rotation, sudden EOF before first `WELCOME`, disconnect during profile write, repeated/expired tokens, local OS shutdown without `LEAVE`, host timeout just before rejoin and connection-lost events queued during GUI initialization.
4. **Role secrecy:** Test that a player's former hunter/ghost session cannot recover using a different seat/role or receive a secret through mismatched `RESUME`/view packets. Future spectators require explicit filtered roles.
5. **Host loss:** H1/listen host remains the match's authoritative owner. No host migration or completed headless dedicated server has been implemented.
6. **Security:** This remains a **trusted-LAN-only plaintext transport**. The saved local secret allows a player to reclaim a host-reserved seat; it is not encryption or strong identity authentication for hostile WAN. Public WAN play needs an authenticated encrypted session and media design.
7. **Network timing:** Host tick remains a 100-ms prototype loop, pending measured 10/20/30-Hz and network impairment tests. Neither protocol high-water recovery nor snapshot replay asserts low latency.

## 5. Acceptance follow-up

Evidence for full acceptance must include: compile+test log, real two-PC Windows LAN, same-seat hunter and ghost recovery after real client process termination, no ghost-private-state leak, no duplicate mission rewards/held gear, reconnect during active ritual, reconnect after changing audio devices, tested host shutdown and explicit display that remote server disconnection is different from a voice-only failure.

Record verification against the existing [quality gates](../QUALITY_GATES.md) and [stage-ledger.json](../stage-ledger.json). Do not create a new status ledger or represent proposed features as finished. No GitHub Actions were introduced.
