# Beckenburg LAN Session Recovery & Private Hosting — Source Integration 019

**Date:** 2026-10-18  
**Implementation status:** Changes committed to `main` with headless localhost test cases wired into both build scripts. Full-project Java 17 build, physical Windows LAN, GUI flow, hostile-network, performance and security validation **NOT YET VERIFIED**. Do not mark QA release gates passed.

## Grounded baseline and targeted changes

The previous `LanHost` already retained a running investigation after a guest's **deliberate** exit, but a missing guest was permanently departed from the mission; the original human-ghost disconnect switched to AI and did not allow the original ghost to return. Listen-owner `H1` leaving stopped the host-owned match. This work deliberately retains those semantics for explicit exit, avoids replacing the authoritative simulation, and creates **temporary restoration** for unexpected guest transport drops while the actual listen host still exists.

### Actual protocol behavior

- `JOIN|1|HUNTER|Nickname` and `JOIN|1|GHOST|Nickname` remain valid for passwordless trusted LAN rooms. Optional fifth field is a room password; this is **not encrypted** in the current LAN protocol.
- The host returns `WELCOME|Hn|1|<random-secret>` or `WELCOME|GHOST|1|<random-secret>`. `LanClient` accepts the existing 3-field welcome of older/local test servers, but only a 4-field welcome supports resumable seats.
- A client that loses the transport unexpectedly keeps its in-memory `ResumeTicket(seat, token, lastCommandSequence)`. A deliberate `close()` sends `LEAVE` and does **not** claim reconnection rights.
- The host preserves the disconnected seat's mission/actor state in `Reservation`; default grace **120 seconds** (`setReconnectGraceSeconds` accepts 1–300 before match start). Token is 24 random bytes, presented as 48 lowercase hexadecimal characters.
- `RESUME|1|<seat>|<token>` is validated on the host under the existing match lock: correct seat, running match, no competing socket, unexpired reservation and constant-time token equality. New socket receives the same seat, a **rotated secret**, host current tick, role-filtered state/world messages and an instruction to reopen the 3D viewport for its voice and scene.
- The reconnected client starts its input command counter above the old counter, preventing replay rejection or command duplication. Previous secrets cannot create a second active controller.
- During a ghost disconnect, the host AI controls the **same ghost domain**. On valid human-ghost recovery, the player regains that domain without rerolling species, room or energy; full ability/cooldown preservation must be proved through the regression and live tests.
- Disconnected hunters remain present in host simulation for physical and supernatural effects (including spatial strike validation) until reconnection or expiry. The host does not write effect messages to null sockets. When reservation expires, the existing `mission.depart` semantics apply; explicit guest Leave continues to use existing immediate-departure logic. The host's own listen-owner leaving still ends the match, as before.

### New local host admission controls

- Optional **Room password** is validated by `LanHost` before occupying a seat. Incorrect passwords receive `REJECT|incorrect room password`. Passwords are restricted to 64 printable ASCII characters for the version-1 text protocol.
- The GUI **Lock joins** changes a host-local field; ordinary joins are denied while locked. It cannot be invoked by a client packet. A previously authorized, reserved seat may still reconnect while the lock is active.
- **Host info** shows bound port, listening interface and candidate LAN addresses from local network adapters, seat/reservation counts and open/locked state. It warns that the displayed addresses are *candidates*, not guaranteed reachable WAN connections. It does not claim a NAT test, public IP, encrypted LAN, relay or automatic port mapping.
- Connection errors distinguish wrong password, lock, invalid hostname, refused connection, port conflict and timeout. These diagnostics are hints from actual local API failures; they are not fabricated ping or NAT measurements.

### Tests and support paths added

`LanSessionResumeIntegrationTest` uses localhost TCP connections and deliberately force-closes the transport without calling `LanClient.close`, then checks hunter same-seat resumption, rotated token, replay refusal, timeout departure and human ghost AI takeover/recovery with filtered ghost observations.

`LanHostAccessIntegrationTest` attempts wrong and correct room passwords, lock/unlock, rejects changing admission password once occupied and verifies existing passwordless joins.

`LanNetworkDiagnosticsTest` checks categorized socket errors, bound host port visibility, LAN-only warning and nonleaking device ID reporting.

Both `software/beckenburg/build.sh` and `software/beckenburg/build.cmd` list these tests in the regular headless regression run. The tests are **written and wired**, not asserted passed. Independently, `BeckenburgInstallIdentityTest` runs under Java 17-targeted javac locally and passes its deterministic identity stability and corruption cases.

**Subsequent engineering progress:** [LAN Restart Recovery and Snapshot 020](LAN_RESTART_RECOVERY_AND_SNAPSHOT_020.md) adds disk-persisted temporary recovery tickets, host sequence high-water protection and automatic hunter casefile/notes/progress replay. Statements below describe the original 019 slice and are superseded where 020 provides implementation; the full game build and Windows network tests remain unverified.

## Explicit limitations and follow-up gates

1. **Process-restart reconnection:** Resume credentials currently live only in an active client process/GUI. A crashed/exited client cannot recover the in-memory ticket; safe disk persistence for *short-lived seat secrets* is a separate privacy/security decision.
2. **Listen-host loss:** Host process exit ends the authoritative world. No migration or dedicated headless host is claimed.
3. **Complete filtered snapshot:** Returning clients receive core state/progress/world and re-enter `VIEW3D`/`GVIEW3D` to request additional scene/voice state; test completeness of all evidence, case journal, counters and prop inventory before marking full rehydrate complete.
4. **No Internet support:** The LAN password travels over plaintext TCP. Neither host authentication nor the voice UDP channel is encrypted; the socket must not be exposed as a secure public Internet service.
5. **No implemented global moderation:** Allowlist, kick, full admin panel, identity-based bans, public browser, UPnP/NAT, headless dedicated server, checkpoint restore and voice hotplug are still future work.
6. **Network timing:** The host remains on the measured-*later* prototype 100 ms tick. No latency fairness, loss tolerance or low-latency transport claims without profiling.
7. **Failure/consistency matrix:** Test unexpected TCP EOF before/after ready, during room movement and a windup strike, expired-seat leave, local client exit, wrong role/token/repeated resume, frontend rebind, high-rate network inputs, one player with inaccessible voice, many players and code-version mismatch.
8. **Host UI conditions:** Confirm password/lock and reconnect buttons are active only for real supported states; test actual Windows Swing menu focus and mouse capture after re-entering 3D.

### Acceptance commands (once complete checkout/art is available)

```sh
cd software/beckenburg
sh build.sh
# Or on a Windows JDK 17 environment:
build.cmd
```

Both scripts compile the full source/test tree, depend on approved licensed runtime assets and run many unrelated gameplay regressions. Any missing approved runtime asset, test failure, source compile error or Windows environment gap is a blocker, not permission to silently stub it. **No GitHub Actions.**

### Commit & verification rule

Each bounded patch went directly to the authoritative `mrcalzon02/HB-TTRPG-tools` `main` branch. Verification requires GitHub file read-back and HEAD; technical acceptance additionally requires complete build and real Windows sessions. The existing [Quality Gates](../QUALITY_GATES.md) and [stage-ledger.json](../stage-ledger.json) remain the only production status authorities, with this document recording only source scope/limits.
