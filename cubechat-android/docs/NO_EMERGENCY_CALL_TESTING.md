# CubeChat RadioGuard — absolute emergency-call testing exclusion

**Status: mandatory, standing project prohibition.**
**Decision date:** 2026-11-18 (America/Sitka).
**Applies to:** CubeChat, RadioGuard, every future contributor/agent/runner, manual QA, automated tests, physical phones, emulators, RF labs, and release gates.

## Prohibited without exception

**DO NOT TEST EMERGENCY CALL CONTINUITY UNDER ANY CONDITIONS.**

Never intentionally initiate, dial, route, connect, or attempt to exercise an emergency-call or emergency-bearer path in a CubeChat/RadioGuard test. This includes:

- Real emergency numbers (including 911, 112 and regional equivalents), manually or automatically.
- Simulated or mocked emergency calling, emulated emergency setup, shielded RF labs, test SIMs, carrier-coordinated labs, certified test facilities, and emergency network-bearer simulations.
- A/B tests of emergency calling under lockdown, radio restrictions, reboot, network downgrade, failover, or recovery.
- QA acceptance criteria that require emergency-call completion, emergency attachment, or emergency-path validation.
- Any suggestion that the above is permitted merely because it occurs without a public network connection.

These actions are **out of scope**, not deferred tests waiting for a lab.

## What remains permitted

- Static standards/documentation review and risk analysis without initiating or simulating an emergency-call operation.
- Normal non-emergency inbound/outbound calling, IMS/VoLTE state observation, ordinary SMS, Wi-Fi calling, carrier registration, data, Internet, Wi-Fi/Bluetooth behavior, VPN/kernel-packet firewall tests, and supported radio-state observations.
- Independent packet capture and negative tests that use ordinary, non-emergency IP flows and **do not trigger emergency modem or calling procedures**.
- Non-emergency device rescue and rollback checks. These must never invoke emergency functions.

## Design and evidence consequences

1. **Do not modify, hook, simulate, override, or deliberately exercise the platform's emergency-call implementation as part of RadioGuard testing.** Retain platform/vendor telephony and emergency handling as outside RadioGuard's claimed enforcement boundary.
2. If a proposed radio restriction could affect emergency availability, perform only documentation/static risk review and ordinary non-emergency regression checks. A risk assessment is **not** validation of emergency calling.
3. Never claim `EMERGENCY_TESTED`, `EMERGENCY_CALL_VERIFIED`, `E911_COMPATIBLE_VERIFIED`, or equivalent. Mark emergency-call impact `NOT_TESTED_BY_PROJECT` and explicitly communicate residual uncertainty.
4. Never add emergency-call testing as a release gate, acceptance test, runner job, manual step, or suggested workaround. An unverified emergency path must not be treated as a passing result.
5. Do not claim that ordinary-call, IMS, registration, or SMS success proves the emergency call path works.
6. If implementing a feature would *require* emergency call tests to demonstrate its safety, **do not ship the feature with that safety claim**. Limit scope or withhold the hazardous radio-modification capability instead of violating this prohibition.
7. The ordinary phone and CubeChat messaging functions should remain unaffected by default. User-requested radio silence must prominently warn that calling may be unavailable; no project test may exercise emergency calling.

## Emergency priority yield (design mandate, not a test)

A trusted early platform indication that emergency calling is required must **immediately supersede and release all CubeChat/RadioGuard enforcement**, without confirmation: VPN/TUN and its always-on lockdown settings if CubeChat owns them, managed-device restrictions, prospective kernel/LSM/eBPF/tc enforcement, modem/radio restrictions, and privileged helper control. It is a complete disengagement, not an allowlist for emergency traffic. The released state must remain latched until the user deliberately reactivates lockdown. See [the binding override architecture](RADIOGUARD_EMERGENCY_PRIORITY_YIELD.md).

**This requirement does not authorize emergency-call tests, mocks, protocol simulations, lab procedures, or artificial emergency triggers.** No ordinary-app interface guarantees an early, authoritative emergency signal. On devices without an independently trusted and provably early handoff, disable or withhold any new privileged restrictions dependent on that handoff rather than claim the automatic release works. The ordinary APK currently has no trustworthy automatic emergency activation signal. Emergency-call safety remains **NOT_TESTED_BY_PROJECT**.

## Scope correction to prior planning

This directive **supersedes** every prior CubeChat/RadioGuard instruction proposing manufacturer/carrier-certified emergency simulations, shielded-lab emergency bearer setup, coordinated emergency calls, or emergency-path validation, even where such prior suggestions appeared in external research or conversation text.

Normal calls, SMS, IMS/VoLTE, Wi-Fi calling, and other **non-emergency** network tests remain in scope.

**Audit outcome:** Any test plan or implementation instruction conflicting with this file is invalid; remove the step before execution. Escalate the design limitation, not the prohibition.
