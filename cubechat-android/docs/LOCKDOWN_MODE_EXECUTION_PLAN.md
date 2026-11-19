# CubeChat Lockdown Mode — Lower-layer feasibility and execution plan

**Status:** Ingested planning handoff; implementation of kernel/baseband enforcement **NOT started**. Existing Android VPN and device-owner code retained as an unverified compatibility fallback. **Firewall code changes paused pending lower-layer evaluation.**  
**Date:** 2026-11-18 (America/Sitka)  
**Authoritative repository:** `mrcalzon02/HB-TTRPG-tools` · branch `main` · app `cubechat-android/`  
**Parent architecture:** [Radio Guardian single-APK RFC](RADIO_GUARDIAN_ARCHITECTURE.md)  
**Non-negotiable safety policy:** [NO EMERGENCY CALL TESTING](NO_EMERGENCY_CALL_TESTING.md). No actual, simulated, emulated, laboratory, certified or carrier-coordinated emergency-call continuity tests, under any circumstances.
**Absolute runtime priority:** [RADIOGUARD EMERGENCY PRIORITY YIELD](RADIOGUARD_EMERGENCY_PRIORITY_YIELD.md): trusted early OS indication must unconditionally release every CubeChat-owned network/radio restriction, and stay disarmed until explicit user reactivation. No emergency testing or fake emergency triggers. The current app has NO proven universal early signal; only a best-effort generic manual release path is implemented.
**Active tracking:** [CubeChat Lockdown Mode — feasibility issue #23](https://github.com/mrcalzon02/HB-TTRPG-tools/issues/23)

## 0. Decisions to retain from the stalled "CubeChat Lockdown Mode" effort

1. **One user-facing installable APK** is the product interface. This may include a separately installable, signed helper *payload*. A normal APK cannot elevate itself, alter the baseband, replace a kernel driver or silently provision device ownership. Hardware preparation/bootloader setup is a separate, explicit operation.
2. **One lockdown toggle, default-deny.** When enabled, aim to allow only explicitly authorized CubeChat communications and truly indispensable phone survival/registration/emergency services. All other device data and unapproved radio discoverability are denied wherever verified enforcement exists.
3. **Kernel-level/privileged assessment is the next priority, not more VPN UI tweaks.** IP firewall work already committed remains the fallback. A kernel IP policy is **not** a baseband cellular/RF firewall.
4. **Normal phone first:** preserve receiving and placing **ordinary non-emergency** calls, SIM/eSIM, IMS/VoLTE, carrier registration and Wi-Fi calling. Leave platform emergency-call handling outside RadioGuard's modified or tested boundary; document potential effects as **NOT_TESTED_BY_PROJECT**. Never describe the "alive signal" as one well-defined packet or endpoint.
5. **No false 'full lockdown' shield.** Each control reports `SUPPORTED`, `REQUESTED`, `VERIFIED_ACTIVE`, `UNVERIFIED`, `FAILED`, or `NOT_SUPPORTED` independently; overall protection cannot exceed the weakest required component.
6. **Known-cell history is an anomaly heuristic, not a physical tower certificate.** Broadcast cellular identities are spoofable; identifying a specific rogue base station or selectively blocking it requires hardware support not yet demonstrated.
7. **No changes to existing firewall enforcement paths** until feasibility assessment selects a device-specific approach, tests can show no unintended bypass and a recovery procedure exists. Documentation and isolated lab harnesses may proceed now.

## November 19, 2026 · Advanced managed-policy deployment gate

The user-consented application VPN fallback remains eligible on stock Android with separately verified Android VPN settings. New **device-owner Always-on VPN and radio restriction writes are gated OFF** in this development build, even if CubeChat was previously provisioned as device owner. The standard app has no guaranteed, sufficiently early trusted platform handoff to disengage those restrictions before platform services need the connection. A host-tested `GuardianDeploymentGate` declares device-owner, kernel, Wi-Fi/Bluetooth driver and cellular modem enforcement **DISABLED_UNVERIFIED**. Do not treat this as validation of emergency calls or invoke any emergency test or simulated event.

The existing `ManagedLockdownController.release()` remains available solely for best-effort removal of managed policies left by previous versions, and still reports partial failures without claiming readback completeness. Future support must be a separately audited integration, not a one-line Boolean change.

**Independent VPN-owner issue:** Per [Android's DevicePolicyManager documentation](https://developer.android.com/reference/android/app/admin/DevicePolicyManager#getAlwaysOnVpnPackage(android.content.ComponentName)), `getAlwaysOnVpnPackage(admin)` can return `null` both when no application VPN is configured and when the VPN is provided by the system. A null readback **cannot certify an empty slot**. The dormant managed-enable path rejects that ambiguity, requires the exact current CubeChat package and previously recorded admin provenance, and does not offer initial provisioning automatically. Legacy rollback retains its own ownership checks.

**Verification:** Java 17 host-only gate tests, unchanged recovery/ownership/update models and the mocked ADB probe passed 257 offline assertions in the current local suite. The exact new gate files matched their GitHub blob SHAs. The new Android API26/35 `ManagedDeploymentGateTest` and amended real-controller/inert-Android-stub harness are source committed but **have not been executed**. No Android SDK was available in the current environment, and no physical-device or radio test occurred.

## November 18, 2026 · P0 lower-layer security boundaries and P1 offline model

[P0 kernel/radio boundaries, bypass inventory and critical telephone-service matrix](RADIOGUARD_KERNEL_AND_RADIO_BOUNDARIES.md) is now the operational source for packet-path assumptions. It explicitly distinguishes the Android application / framework / kernel / vendor / baseband trust boundaries, explains why XDP alone does not cover outbound traffic, and requires verified external packet measurements before kernel enforcement can be claimed.

A **pure host-only** `GuardianTrafficPolicy` reference contract models exact per-UID, socket-cookie, destination, port, protocol, interface, direction and policy-generation grants with monotonic expiry. The `GuardianTrafficPolicyTest` adds **41 offline assertions** for denial of IPv4/IPv6, DNS, UDP/QUIC, root/system identity, unsolicited ingress, wrong socket identity, stale grants and non-IP scope. The class has **no privileged operating-system effect**. The main smoke script now compiles/runs these fixtures. A local Java 17-targeted reproduction passed 41 checks; the repository's CI has **not** been rerun on this revision.

**Remaining blockers:** exact spare-handset identity, kernel feature/attachment probes, vendor modem path and irreversible-change preflight; no actual eBPF kernel program, driver, baseband filter, root service or independently measured radio suppression exists. Preserve the runtime-firewall freeze until those gates are resolved.

## 1. Existing code audit (read-only, not release certification)

On `main` as reviewed after commits `02c86a8` and `467c67e`:

- `LockdownFirewall.java`: local IPv4/IPv6 TUN packet-discarding `VpnService`; CubeChat authorizes selected peer sockets using `protect()`. Android Always-on VPN plus "Block connections without VPN" is a separate OS configuration; plain service liveness is not fail-closed.
- `ManagedLockdownController.java`: optional already-provisioned device-owner path applies Always-on VPN and Bluetooth / Wi-Fi Direct / tethering restrictions as available. It is **not** a root helper and does not block cellular registration or authenticate towers. Wi-Fi remains potentially usable by authorized CubeChat sockets.
- `LockdownRadioPolicy.java` and `PeerLink.java`: transient user-selected CubeChat radio authorizations; existing disallowed sessions are revoked on lockdown transition.
- `FirewallSettings.java`: Lockdown, Exceptions, Radios tabs and independently worded OS vs app limitation statements.
- `app/src/main/AndroidManifest.xml`: Android device-admin receiver is declared; the app does not automatically become device owner. Fine-location permission is capped at SDK 32, a known blocker for a later cellular observer on Android 13+.
- `LockdownFirewallTest.java`: local Robolectric tests for arming and unprotected-socket refusal. **Not proof** of kernel or real modem enforcement, installed app compatibility, emergency behavior, reboot persistence, or packet-leak resistance.
- Last published Android release remains `cubechat-android-v0.1.4`, build 5. Newer `main` changes are development source until built, tested and released; never conflate source commit with device validation.

## Critical precondition — emergency priority before any privileged radio enforcement

**Priority ordering:** `TRUSTED_PLATFORM_PRIORITY_YIELD > RADIO_GUARDIAN > STANDARD_LOCKDOWN`. On an authenticated, early indication that emergency calling is needed, release all CubeChat-owned VPN/TUN, device-owner policy, kernel/eBPF/LSM/tc/netfilter, privileged-helper and vendor-radio controls; cancel pending commands; persist a no-auto-rearm state. Do not block the system until it proves eligibility to place a call. Do not wait for a prompt or network check.

The standard APK does not have a universal early emergency detector; system-only callback and emergency state broadcasts may arrive late. Never expose an unprotected remote/broadcast unlock endpoint. **Where early trusted preemption cannot be established, privileged controls that could interfere with telephone availability are not eligible for deployment.** Explicitly retain `AUTO_PRIORITY_YIELD_UNSUPPORTED` and `NOT_TESTED_BY_PROJECT`, not a success badge. The existing development VPN/manual release does not certify emergency availability.

**No emergency scenario may be invoked for verification.** Ordinary generic shutdown and non-emergency network checks are in scope. See [binding safety override](RADIOGUARD_EMERGENCY_PRIORITY_YIELD.md).

## 2. Enforce at the lowest independently verifiable boundary

### Control plane: one-toggle policy broker

Proposed stable contract (device-independent, versioned, no arbitrary-shell command):

```text
LockdownPolicy {
  policyVersion, generation, requestedEnabled, selectedPeerRoutes[],
  allowedRadioOperations[], necessarySystemServices[],
  systemSurvivalRules, userExceptions[], updatedAt, signerDigest
}
GuardianCapabilities {
  deviceFingerprint, androidApi, kernelVersion, modemVersion,
  ipHooks[], wifiControls[], bluetoothControls[], cellularControls[],
  exemptServiceObservability, bootPersistence, rollbackAvailable
}
GuardianAttestation {
  policyGeneration, appliedAt, ipVerdict, radioVerdict,
  serviceHealth, actualReadbacks[], unknownCoverage[], failures[]
}
```

Policy is preflighted against a device-adapter capability matrix *before* applying. App and helper communicate over a local authenticated channel with pinned app signer identity, scoped command schema, monotonic generation and nonce; no general command executor or network-reachable admin port. The guardian must not trust an app-supplied "verified" flag. Audit events are local and encrypted; no packet contents are logged.

### Layer A — OS/app IP fallback (already exists)

Use the current local packet-drop VPN, with Android Always-on + lockdown where possible. It stays as a recoverable baseline for ordinary phones. It must NOT be labeled a kernel/RF kill switch or claimed to cover privileged/system traffic that bypasses the VPN.

### Layer B — native kernel IP enforcement (feasibility target)

Research the *actual test phone* kernel/netd stack: eBPF cgroup hooks, Android UID filtering, netfilter/iptables/nftables support, tethering, network namespaces, hardware offloads, IPv4/IPv6 and DNS. Select the **least invasive** supported hook with a reproducible packet-path test. Avoid overriding Android's pinned eBPF maps or `netd` ownership assumptions. The root-owned service should default-deny non-authorized app IP, then minimally allow selected CubeChat peer IP flows and any explicitly documented OS necessities.

A packet-drop demonstration on the main interface **is not coverage proof**: test direct syscalls, UDP/QUIC, DNS, VPN, IPv6, tethering, local-link traffic, VPN restarts, root/system UIDs, airplane/sleep/wake and network handoffs. Document traffic classes still invisible to the interceptor.

**Hard boundary:** Kernel IP hooks do not mediate modem registration, RRC/NAS signaling, SIM authentication, cell reselection, Bluetooth link management or Wi-Fi management frames. Those require separate radio/firmware/hardware controls.

### Layer C — privileged Android radio controls

Identify public and privileged `TelephonyManager`, `DevicePolicyManager`, Radio HAL/AIDL controls and exact permission requirements. On devices that support them, disable 2G, adjust permitted network technologies, change mobile-data policy, and disable discovery/advertising/tethering at the OS or vendor level. Every write requires readback, reversibility and a timeout.

A privileged Android service is usually preferable to replacing the vendor HAL. Custom AOSP system integration requires system image provisioning, permission allowlists, SELinux enforcing, service declarations and OTA tests. Root access alone does not grant an API the modem has not implemented.

### Layer D — modem/baseband-specific controls (strict gate)

Only pursue selective cell or carrier rejection after obtaining **documented, testable hardware support** for the exact model/firmware. First investigate read-only modem event reporting and supported scan interfaces. No modem firmware patching, unreviewed AT/DIAG control, EFS/NV/calibration writes, or unsafe broadcast experiments.

If individual cell rejection cannot be proven, present `CELL_BLACKLIST_NOT_SUPPORTED` and offer user-authorized alternatives such as a supported network-type restriction or disconnect. Never advertise "authentic tower verified" from public identifiers/history alone.

### Layer E — passive connection intelligence

Independently useful on stock devices: serving and neighboring cell information (`getAllCellInfo`, `requestCellInfoUpdate` with location consent and throttling), per-subscription observation age, Wi-Fi association and eligible scans, permitted Bluetooth results, CubeChat authenticated routes, and packets **actually** seen by the TUN monitor. Build bounded encrypted co-observation history and explainable anomaly detection. Permission denied => show `NO_PERMISSION`; stale => `STALE`. Keep detection disconnected from destructive automatic modem actions until false positives are studied.

## 3. Default-deny semantics and essential traffic

The phrase **"only CubeChat and the phone's alive signal"** is the user-facing policy goal, not a single technical packet whitelist. A phone's network attachment, SIM/eSIM, IMS registration, carrier services, emergency calls, Wi-Fi calling and other vendor traffic may use different paths and identities. Some happen entirely inside the baseband and never enter the Android IP stack.

Create a per-device **Critical Service Matrix** with: service, purpose, transport, Android/vendor actor, actual observable flow, whether user can disable it, effect on calls, whether enforcement is verified, and recovery behavior. Absolutely minimize exceptions, but do not guess by globally permitting all system UIDs, all carrier destinations or all `com.android.*` packages.

Profiles:

- `NORMAL`: normal Android networking.
- `LOCKDOWN_STANDARD`: existing audited Android VPN/managed-device path, explicitly labeled partial if radio or OS coverage is unknown.
- `LOCKDOWN_GUARDIAN`: device-specific verified kernel IP policy + verified radio restrictions; only report full coverage for each proven class.
- `RADIO_SILENCE`: **separate high-impact user request** for supported wireless shutdown; not synonymous with ordinary lockdown. Warn that emergency calling may be unavailable. Only **non-emergency** radio recovery may be tested; no emergency-call continuity tests.

One UI toggle can request a whole policy, but activation is transactional. Show `REQUESTED` until every available component reports applied/readback; if partial, show `PARTIAL — <reason>` and enumerate blocked and unblocked traffic classes. If not possible to fulfill strict policy, refuse an unqualified "secure" state. Reboot persistence must be separately proven. In a crisis, CubeChat's own app traffic fails closed; the system telephony stack fails safe to preserve calls unless the user separately requests and confirms a radio-off mode.

## 4. Installation, recovery and maintaining a functioning telephone

- Deliver a single signed user-facing `CubeChat.apk` with capability-adapter code and an optional signed helper payload. Unrooted devices simply do not install/activate the helper.
- Initial elevated experiments use one **spare**, unlockable handset with recorded model, variant, SoC, Android build, baseband revision, carrier, ROM/boot image, recovery and verified rollback. Never treat the user's daily phone as a first flash target.
- Bootloader unlock/custom image/root manager requires a separate user-authorized provisioning step. **A single APK cannot guarantee system-level control on stock devices.** Unlocking may erase data and changes the security model.
- No silent root, no generic shell endpoint, no SELinux-permissive mode, no patching calibration partitions, no auto-enrollment as device owner.
- Early-boot enforcement is only possible where an appropriate privileged bootstrap is proven. No claim of fail-closed during early boot until packet- and radio-path measurements confirm that interval.
- Privileged Guardian must be version-pinned and bound to the CubeChat signer; incompatible app/helper versions disable privileged actions and report a fault. A rooted module can outlive an APK uninstall; implement an explicit disable/uninstall path and verify it.
- **Six-check preflight before destructive device changes:** (1) exact model/firmware matches adapter, (2) recoverable full backup and known boot images, (3) bootloader/recovery/rollback verified, (4) offline rescue control tested, (5) calls/SMS/data baseline recorded, (6) user explicitly approves the exact operation.
- Watchdog / heartbeat + boot-loop breaker. Rollback privileged *radio modifications* first on crash, watchdog timeout, helper loss or OTA mismatch. Maintain and test stock telephony recovery. Security status must show when a user-selected policy cannot be preserved safely.

## 5. Development phases, deliverables and go/no-go gates

| Phase | Execute now? | Deliverable | Go/no-go gate |
| --- | --- | --- | --- |
| P0: Lower-layer audit | **YES — priority** | Target-independent IP/RF trust-boundary map, protected-path matrix, Android kernel/HAL capability probes, baseline code audit, negative-space inventory | List each control and exact layer; explicitly separate IP from radio signaling |
| P1: Isolated harness | YES after P0 layout | Host-only policy simulator; synthetic eBPF/netfilter packet fixture matrix; fake base-station event traces as *offline* data | Correct deny/allow, IPv4/IPv6, process kill/boot transitions; no live phone changes |
| P2: Standard observer | YES after permission/privacy design | Read-only Connections view; encrypted local observations, age/source, dual-SIM, cellular seniority heuristics | Permission denial, stale/empty results and airplane mode remain coherent; no false tower-authentication claims |
| P3: Elevated IP proof | **BLOCKED by test handset and privileges** | Trusted helper skeleton, authenticated local IPC, root manager packaging and host-side fault injection; native kernel packet filter on spare device | Verified deny under reboot/VPN failure, no untracked bypass, calls/SMS survive, recovery rehearsed |
| P4: Radio adapter proof | BLOCKED by exact modem/firmware | Read-only vendor capability probing followed by minimal reversible radio controls | 2G/network-type/radio changes measured and reversible using **non-emergency** tests; emergency-call effects remain **NOT_TESTED_BY_PROJECT**, never inferred safe |
| P5: Single-toggle integration | AFTER P3/P4 | Atomic policy activation, status matrix, exceptions UI, explicit user consent, independent verification | No green/full state without complete relevant proof; one-APK standard operation intact |
| P6: Device expansion/release | AFTER physical validation | Signed reproducible APK/helper, compatibility allowlist, release notes, test evidence | Single + dual device CubeChat, **ordinary non-emergency** telephony, soak/OTA/rollback pass; no emergency-call simulation or validation |

**No release blocking rule change:** build/launch failures and required multiplayer/updater failures block ordinary project releases; security-specific claimed enforcement functionality **must not be advertised or enabled by default** without its own hardware and negative-testing gate. Diagnostics and partial support remain accurately labeled.

**Absolute prohibition:** No emergency-call continuity testing of any kind, including mock or shielded testing; review [NO_EMERGENCY_CALL_TESTING.md](NO_EMERGENCY_CALL_TESTING.md) before adding procedures. Ordinary telephony checks remain permitted. Nothing in the earlier objectives overrides this prohibition.

## 6. Acceptance tests (security invariants)

| Test | Expected result |
| --- | --- |
| Toggle from NORMAL to LOCKDOWN while third-party TCP, UDP/QUIC, DNS and IPv6 flows are active | Existing disallowed flows terminate or are blocked; no unaccounted reopens; report exact coverage |
| Reboot, app force-stop, VPN revoke and rooted helper crash | Do not claim enforcement that has stopped; selected policy persists only where separately verified; stock telephone recoverable |
| Generic manually initiated full release (NO emergency scenario) | Attempt all CubeChat-owned enforcement removals even after a partial failure; persist disarmed state and report external Android-owned VPN policies honestly. This verifies **only** ordinary teardown, not an emergency signal/call |
| Browser direct IP, private DNS, tethering, LAN, VPN app, secondary user/profile | Document and test each bypass. Missing visibility = uncovered, not "secure" |
| LTE/NR changes, dual SIM, eSIM replacement, SIM swap, roaming, no-service | Correct subscriptions, source/staleness and no false high-confidence tower identity |
| Nearby Wi-Fi/Bluetooth discovery, bonding, advertising and pre-existing links | Unsupported blocking is visibly partial; authorized CubeChat route selection does not imply all-app radio authorization |
| 2G disable or cellular restriction command on supported lab hardware | Device confirms supported policy; readback and rollback successful; calls still handled appropriately |
| Incoming/outgoing normal calls, SMS, IMS/VoLTE, Wi-Fi calling, data, alarms | Preserve agreed non-security phone behavior for each policy; document unavoidable tradeoffs |
| Emergency-call continuity (ALL modalities) | **PROHIBITED: NEVER TEST** — no calls, simulations, emulators, shielded RF labs, test SIMs, carrier-coordinated or certified facilities. Out of scope permanently; mark **NOT_TESTED_BY_PROJECT** and make no emergency-function assurance. [Binding policy](NO_EMERGENCY_CALL_TESTING.md) |
| Malicious/mismatched companion, untrusted app calling IPC, replayed commands | Reject before privilege operation; bound app signing identity and command generation verified |
| OTA, baseband update, root removal, APK uninstall | Fail to safe/monitor-only mode, remove/disable helper where explicitly authorized, preserve OS boot and normal calls |
| Clean and upgraded APK, offline P2P, attachment transfer, receipt, updater | No regression in existing CubeChat features or storage |

## November 19, 2026 — Read-only ADB preflight (no privileged operations)

A developer-invoked [hardware feasibility probe](../scripts/radioguard-readonly-probe.sh) now reads version, kernel, SELinux and limited non-sensitive capability hints **only when an explicit ADB device serial is provided**. It never installs or roots anything, changes radio settings, opens a network connection, tests calling, or scans cellular systems. A separate [mocked-ADB host check](../scripts/test-radioguard-readonly-probe.sh) validates its read-only query allowlist without touching any hardware; the host smoke script includes it.

**Interpretation:** Build fingerprints and boot property values are unverified hints, not proof of a working BPF hook, intact verified boot, secure radio driver, viable rollback, or independent priority release. A selected device still requires the documented six-check preflight before any destructive operation. No mobile phone was probed in this iteration.

## 7. Immediate next execution batch

- [x] Ingest paused Lockdown Mode direction: prioritize lower-layer radio/kernel evaluation, retain existing VPN as compatibility fallback, preserve one-APK requirement.
- [x] Audit current committed Android firewall, device-owner, manifest and existing tests (read-only).
- [x] Commit this executable plan and link it from the Radio Guardian architecture document on `main`.
- [x] Document candidate AOSP kernel hooks, netd ownership constraints and an explicit unverified bypass matrix. **Live hook support is not established until a real handset probe.**
- [x] Draft critical system survival-service matrix; all unmeasured interfaces and services remain `UNVERIFIED`.
- [x] Define the versioned `LockdownPolicy` / `GuardianCapabilities` / `GuardianAttestation` **proposed** wire contracts and an immutable exact-match Java IP policy model. Privileged IPC, attestation authenticity and enforcement remain open.
- [x] Add offline synthetic packet, bypass and non-IP-scope tests (41 assertions) to manual smoke script. **No kernel/radio claims.**
- [x] Add manual, read-only ADB inventory script and host-only mock checks. **No handset has been probed or marked compatible.**
- [ ] Probe exact spare handset only after model/firmware and rollback information are available.
- [ ] Implement passive Connections screen and threat history only after permission/privacy review.
- [ ] Resume runtime firewall changes only after P0 findings and supported approach are reviewed.

### Engineering truthfulness

- Source/planning commitments do **not** mean an APK, driver or kernel filter was built.
- A device-owner restriction can disable a radio feature without proving all radio frames have stopped.
- Cellular "seniority" is a local historical fingerprint, not a manufacturer-signed or network-authenticated base-station identity.
- Proving IP lockdown does not establish that no Bluetooth/Wi-Fi management frames or cellular registration packets are transmitted.
- Where Android, the device firmware, or external baseband hides a signal/control, label it as an **unverified coverage gap** until independently shown otherwise.

## Grounding references

- Android kernel eBPF/netd: https://source.android.com/docs/core/data/ebpf-traffic-monitor
- Android device-owner VPN: https://developer.android.com/work/dpc/network-telephony
- Android network-logging limitations: https://developer.android.com/work/dpc/logging
- Android cell information: https://developer.android.com/reference/android/telephony/TelephonyManager
- Telephony network-type controls: https://developer.android.com/reference/android/telephony/TelephonyManager#setAllowedNetworkTypesForReason(int,%20long)
- Android HAL architecture: https://source.android.com/docs/core/architecture/aidl/aidl-hals
- Verified boot state: https://source.android.com/docs/security/features/verifiedboot/device-state
- SELinux policy composition: https://source.android.com/docs/security/features/selinux/build
