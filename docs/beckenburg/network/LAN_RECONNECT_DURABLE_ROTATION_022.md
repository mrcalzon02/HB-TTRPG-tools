# Beckenburg LAN Reliability — Durable Reconnect Tokens and Host Authority (022)

**Date:** 2026-10-18 · **Repository:** `mrcalzon02/HB-TTRPG-tools`, branch `main`  
**Status:** Source and regression tests committed. **Full Java application compilation, multiplayer socket regressions and physical Windows two-PC tests are not yet passed or claimed.** This is a follow-up to [021](LAN_HOSTING_RECOVERY_HARDENING_021.md) and the [hosting implementation plan](HOSTING_ADMIN_AND_LOCAL_IDENTITY_IMPLEMENTATION_PLAN.md), not a second release-status ledger.

## Main improvements made in source

### Durable two-stage reconnect rotation

**Problem:** After a client sent `RESUME|1|seat|oldToken`, the host assigned a new random token and immediately invalidated the previous reservation. If the TCP socket died after WELCOME but **before the client atomically persisted the replacement**, only the host knew the new secret. Process-restart reconnection failed despite an otherwise healthy authoritative mission.

**Implementation:**

1. A reserved disconnected seat is authenticated with its valid 192-bit host-issued token. The host sends a fresh `WELCOME|seat|1|newToken|hostSequence`; it still never allows a second concurrent socket to occupy the seat.
2. The host retains one bounded **previous** capability, usable only when that seat later becomes disconnected and reserved again. The old capability is **never an alternative way to hijack an active seat**; it has no ability to call gameplay commands on its own.
3. On successful reconnect the guest's `LanLobbyWindow` **atomically saves** its replacement token to the existing local `LanResumeStore`. Only if that save succeeds does it send `RESUMEACK|newToken` over the authenticated seat socket. The server checks the exact credential and clears the previous fallback.
4. If persistence or acknowledgement fails, the old token remains valid until the **original disconnect reservation expires**; failed retries do not indefinitely renew that grace period. A successful acknowledged return permits a fresh grace period upon the next independent transport outage.
5. The previously delivered host command-sequence high-water mark remains authoritative, so restarting a client with an older saved input counter cannot replay a prior attack, item or clue action.

This is bounded crash recovery, **not** a claim of reliable WAN transport or cloud sessions. The credentials and game packets are still unencrypted on the trusted LAN and should not be exposed to public Internet hosts.

### Preserve actual local host authority and legacy AI ghost flow

A production GUI-hosted session reserves its selected **H1 or human-ghost** owner role with a random local loopback admission secret. A remote player connecting first does not become owner merely because they hold H1. The authoritative host now rejects `START` if a guest issues it in a strictly owner-claimed session. The LAN lobby enables Start Match only for its own local host; guest H1 no longer sees an enabled administrative control in a ghost-owned room.

**Legacy source/API test contract retained:** Older non-strict `LanHost` constructors retain H1 ownership and the original human-ghost-to-AI handoff semantics, including `LanGhostLobbySecrecyTest`. The new strict GUI constructor enables explicit ghost ownership, and `LanHostOwnerRecoveryTest` now uses the legitimate owner credential in its ghost-hosting scenario. No bypass code was added to gameplay authority.

### Disconnected hunters remain present

For the 120-second default (host-configurable) reservation period, temporarily absent hunters keep their host-owned room, world body, damage susceptibility and inventory rather than vanishing from `TEAMMAP` or player body frames. The host transmits their last body and room to authorized hunter teammates; the ghost never receives the private hunter map or journal. After reservation expiration the existing `mission.depart` rules apply.

## Tests and evidence required

- **Expanded `LanSessionResumeIntegrationTest`**: unexpected TCP EOF, same-seat hunter/ghost return, invalid/replayed token rejection, evidence note rehydrate, authoritative body persistence and role privacy, and now a crash immediately after unacknowledged token rotation; original saved token can recover again, but fails once a newer token has been saved and acknowledged. It directly checks that failed rotation does not extend the initial reservation deadline.
- **`LanHostAuthorizationRegressionTest` (new):** connected guest H1 attempts to start a strict ghost-owned match and must receive a host-side rejection; authenticated ghost owner then starts that exact match. UI permissions are not substituted for packet-level checks.
- **`LanHostOwnerRecoveryTest`**: production strict ghost host claims their own seat, temporary loss/reconnect of guest H1 leaves the mission running, and explicit ghost-owner exit ends it. Existing legacy takeover tests still apply.
- Both `software/beckenburg/build.sh` and `software/beckenburg/build.cmd` run the new authorization regression and existing resume/socket tests.
- **Read-back verification** of all touched `main` blobs and registration in both scripts is evidence of remote source commits, **not a passed test suite**.

### Remaining work before calling this complete

The available container has a Java toolchain but cannot resolve or clone the authoritative GitHub repository over its current network. Connected GitHub editing allows commits/read-backs but does not provide a full locally runnable checkout. Therefore the entire Beckenburg compile and multiplayer test run is **not completed** in this slice; there is no legitimate Windows installer or packaged test build from these changes.

When a full checkout with approved assets is available, execute:
```shell
cd software/beckenburg
sh build.sh
# Windows cmd + JDK 17:
build.cmd
```
Preserve build output and isolate any failing regression without bypassing it. Then validate 2+ physical Windows PCs, a 1–6 hunter room, an optional human ghost, a 120-second reservation, voice/media hotplug, ghost-takeover, ritual and consumable transactions, port/firewall diagnosis, host process termination and startup over repeated matches.

**Outstanding deeper resilience:** full rollback/idempotent mission transaction proof, incomplete resynchronization domains (pending telegraphed strikes, held props under damage, late reward receipt), real client process crash immediately after rotated WELCOME, authentic encrypted WAN/dedicated-host design, and server-side performance measurements at 10/20/30 Hz.

**Security note:** Local IDs, edited player saves, XP, money and installed hardware profile remain *explicitly non-authoritative*. The host's separate temporary resume tokens and role checks authorize live session actions; no anti-cheat scanning, global bans or hardware locks are introduced.

**Contract:** INTENT → EXECUTE → OBSERVE → VERIFY → CLAIM. Existing [Quality Gates](../QUALITY_GATES.md) and [stage-ledger.json](../stage-ledger.json) are the single sources for project acceptance and status. No GitHub Actions added in this work.
