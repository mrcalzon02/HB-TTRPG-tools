# CubeChat Radio Guardian — single-APK architecture RFC

Status: **design proposal only; not implemented, built, or device-validated**  
Reviewed: 2026-11-18  
Scope: CubeChat Android `org.cubechat.android`, existing local VPN lockdown, cellular/Wi-Fi/Bluetooth observation, optional device-specific elevated radio enforcement.

> **Active execution order (2026-11-18):** The [Lockdown Mode lower-layer execution plan](LOCKDOWN_MODE_EXECUTION_PLAN.md) is the prioritized continuation of the stalled CubeChat Lockdown Mode effort. Evaluate kernel/IP interception, baseband boundaries, critical OS traffic, a recoverable privileged helper and test-handset feasibility **before** changing current firewall runtime behavior. The VPN/device-owner implementation remains a compatibility fallback, not verified device-wide radio isolation.

## Objective

Ship **one user-facing, signed CubeChat APK** that functions as a normal messenger and security monitor on unmodified Android phones. If a device has been *separately and knowingly* provisioned for root or an integrated OS build, the same APK may offer an **optional** privileged Radio Guardian engine. It must never pretend ordinary APK installation grants modem control.

Keep Android's normal telephony stack, call handling, SMS, SIM/eSIM management, carrier services, emergency calling, Wi-Fi calling, mobile data, and OTA compatibility unless the user explicitly selects a supported restriction. The guardian is not a replacement baseband firmware or a universal radio driver.

## One package, three capability tiers

| Tier | Prior setup | Enabled behavior | Not claimed |
| --- | --- | --- | --- |
| Standard | Install APK, grant appropriate runtime permissions, separately consent to VPN | Local VPN, user-authorized CubeChat peer routes, passive cell identity/quality observation, anomaly alerts, local encrypted history | Physical cell identity verification, specific-cell rejection, whole-device radio silence |
| Elevated | Same APK; supported device already has user-authorized root system | Separate root-owned helper, device-specific supported telephony restrictions, verified state/readback, optional policy response | Arbitrary radio commands or guaranteed tower blacklisting |
| Integrated | Same APK plus a separately installed, compatible AOSP/custom OS integration | Privileged telephony adapter + vendor-supported filters with complete boot, rollback, SELinux, and carrier validation | Universal support for all modem vendors or full authentication of broadcast tower IDs |

**Single APK** means one distribution artifact/user-facing app and embedded versioned helper payloads. It does **not** mean one tap can unlock bootloader, root, flash a ROM, change firmware or elevate a normal app. Setup that changes verified-boot state requires separate physical user authorization and usually erases user data.

## Proposed components

1. **Existing CubeChat UI**: `FirewallSettings` gains compact `Connections` and `Radio Guardian` views showing observed state, security posture, coverage, and unsupported controls without false promises.
2. **Connection Observer**: Android `TelephonyManager` and callback APIs, `ConnectivityManager`, accessible Wi-Fi/Bluetooth metrics. Per-subscription identification of registered and observed neighbor cells, MCC/MNC, TAC/LAC, LTE/NR cell IDs when reported, PCI, channel/ARFCN, RAT, RSSI/RSRP/RSRQ/SINR where available. Values may be stale, missing, permission-gated, throttled, or spoofable.
3. **Local History Store**: Encrypted bounded SQLite tables for observation buckets, cell fingerprints, co-observed cell sets, first/last seen, counts, source quality, handover history, and retention. Location is opt-in, coarse buckets preferred, no automatic sharing or analytics telemetry.
4. **Risk Engine**: Distinguishes `UNKNOWN`, `OBSERVED`, `ANOMALOUS`, `HIGH_SUSPICION`; reasons and confidence visible. Never treat a first-seen ID or strong signal alone as malicious. Model RAT downgrades, implausible identity changes, neighborhood disagreement, abnormal timing, and repeated reproducible conditions. A repeated/spoofed identifier is not authenticated physical tower seniority.
5. **Policy Engine**: Per-transport explicit allow/deny for CubeChat peers; connects existing `LockdownFirewall` and `LockdownRadioPolicy`. Threat reaction may pause CubeChat transmissions, lock sensitive sessions, or recommend/execute *supported, consented* radio restrictions. IP VPN enforcement is **not** baseband isolation.
6. **Guardian Service (optional)**: Small native/Java privileged helper in an isolated process with narrow versioned IPC. Root-owned payload, verified hashes/signature, app signer and caller identity checks, explicit user approval for state-changing commands, no generic shell-execution endpoint, detailed audit log, minimal SELinux allowances.
7. **Device adapter(s)**: Explicit allowlist keyed by model, build fingerprint, modem firmware and capabilities. Start with read-only system APIs; then documented privileged radio capabilities; only validated vendor-specific cell restrictions if genuinely available. Unknown modem => monitoring only. Never patch modem firmware by default.

### Active connection and device inventory

The single `Connections` tab must separate **actively connected**, **nearby/visible**, and **historically observed** objects; never represent scans as complete hardware inventories.

| Surface | Stock Android source | Elevated improvements / limits |
| --- | --- | --- |
| Cellular | Registered/subscription cells + reported neighbors via telephony callbacks | Deeper supported modem event/diagnostic reporting; some baseband events remain inaccessible |
| Wi-Fi | Current associated AP, SSID/BSSID and accessible network state with applicable permissions | Vendor-specific richer scan/driver telemetry, not authentication of AP hardware |
| Bluetooth | Current CubeChat sessions, bonded devices, permitted nearby scan results | Other apps' private Bluetooth traffic and all RF events are not generally visible |
| CubeChat P2P | Selected peer route, socket endpoints, authentication, connect/disconnect, bytes and heartbeats | Authoritative for CubeChat's own traffic, not all apps |
| IP flows | From the local VPN: headers/metadata of packets actually routed through its TUN interface (current firewall drops payloads) | Optional root-owned narrow flow observer; no claim to enumerate traffic bypassing VPN unless independently verified |

Collect only metadata needed for user-selected diagnostics; never retain packet bodies, decrypted chat text, IMSI/IMEI, contacts or raw precise-location trails in the monitoring log. Rate-limit scans, show observation age/source, and respect permission revocation. A privileged network inventory is not a replacement for the IP firewall or a source of guaranteed visibility into modem signaling.

### Android compatibility strategy

- Keep existing `minSdk 26` and ordinary messaging functional. Gate cellular APIs by SDK, feature, permission, subscription and radio support. `requestCellInfoUpdate` is API 29+, throttled and not guaranteed.
- Existing manifest currently caps `ACCESS_FINE_LOCATION` at SDK 32: for any monitoring on Android 13+, request fine location appropriately with transparent purpose, and respect user denial. For sustained monitoring consider location foreground-service restrictions and background-location consent; do not silently gather continuous location.
- Keep the existing no-upstream, drop-by-default VPN and Android Always-on + Block without VPN confirmation separately displayed. Never claim it intercepts cellular signaling, emergency calls or all privileged OS traffic. Keep one-VPN-at-a-time limitations.
- AOSP privileged permissions require appropriate system placement/permission allowlists; a normal signed APK or root subprocess does not automatically become a platform-signed privileged app. SELinux remains enforcing. Prefer an additive system service instead of replacing the vendor Radio HAL.
- AIDL/VINTF/HIDL and modem interfaces vary by device and Android release. A privileged app cannot invent cell-bar commands the firmware does not expose.
- Preserve phone call state, default dialer, mobile network registration, SIM/eSIM, IMS/VoLTE, Wi-Fi calling, alarms, network validation and update reliability. When radio security and emergency access conflict, preserve emergency call path and report the exception.
- Guard against OTA compatibility: detect build/fingerprint changes, disable unvalidated adapters, and fall back to safe standard observation mode.

## Installation experience

1. Install/update **one** `CubeChat.apk`; all existing messages, profiles and routes must migrate normally.
2. Permission wizard reports exactly what each permission enables. No root prompt is required for ordinary mode. The app is functional offline.
3. Optional **Advanced Radio Guardian** probes device and root manager *read-only*. Show supported vs unsupported actions and explicit risks.
4. Only after explicit approval on a supported, already-provisioned device, verify and install the bundled, versioned helper through its supported module mechanism (e.g. Magisk/KernelSU). Validate helper identity, version, boot/start state and every policy application by readback.
5. If installation fails or root is revoked, leave normal CubeChat and standard Android telephony operational; show `HELPER UNAVAILABLE`, not `PROTECTED`.
6. Expose **Disable Guardian** and **Uninstall helper**. Companion helper disables itself at boot when the bound CubeChat package or signer is missing. An app uninstall cannot be assumed to remove root modules automatically.

## Enforcement semantics

Statuses reported independently:

- **Observer:** `NO_PERMISSION` / `UNSUPPORTED` / `STALE` / `ACTIVE`.
- **IP filtering:** `OFF` / `REQUESTED` / `RUNNING_UNVERIFIED` / `OS_LOCKDOWN_VERIFIED`.
- **Radio control:** `NONE` / `PRIVILEGED_AVAILABLE` / `RESTRICTION_REQUESTED` / `RESTRICTION_READBACK_CONFIRMED` / `FAILED`.
- **Cell identity:** `UNVERIFIED` always for purely broadcast-based fingerprints; risk assessment is not cryptographic tower authentication.

Policy modes: `MONITOR` (default, zero telephony changes), `WARN`, `RESTRICT_CHAT`, `RADIO_RESTRICT` (only available with supported verified privileged adapter), `RADIO_OFF` (explicit request, with prominent impact warning and emergency handling). No invisible auto-enable of a destructive radio mode.

## Recovery, support and release gates

- Maintain versioned helper/app protocol; incompatibility => safe shutdown of guardian adapter, not a phone-boot loop.
- Heartbeat/watchdog, boot-loop counter, staged activation, 60-second recovery window after privileged changes, and a reliable documented recovery/disable path from root manager or recovery environment.
- Fail closed for **CubeChat message/packet policy** when uncertain; fail safe for **core Android radio service** by leaving stock telephony in charge and alerting, rather than bricking calling. User-selected whole-radio-off mode is a separate explicit exception.
- No firmware partition patch, modem calibration/NV write, SELinux permissive mode or bootloader operation from the APK.
- Separate tests: Java/Robolectric risk-engine fixtures; permission denial and API level; dual-SIM/eSIM and SIM swap; LTE↔NR and handover; malformed/stale cell data; baseband reset; no-service recovery; VPN leakage checks; helper signature and IPC authorization; OTA change and uninstall; calls, incoming calls, SMS, MMS, Wi-Fi calling and ordinary internet; two-phone CubeChat chat/attachments; device wake/sleep/reboot.
- Never place an actual emergency call as an automated test. Use manufacturer/carrier test environments or explicitly coordinated, non-emergency validation where appropriate. No on-air rogue base station transmissions during development; use recorded/synthetic observations and certified lab setups.
- Do not ship a `RADIO_RESTRICT` capability until a specified real handset, exact OS build and baseband support have passed lab verification and rollback tests.

## First milestones

1. **M0 — Audit:** Existing firewall source and manifest, security boundary tests, handset capability matrix, baseline normal-phone behavior.
2. **M1 — Passive:** Add cellular observation, history and a Connections tab to the ordinary APK; regression tests and real device measurement.
3. **M2 — Heuristics:** Local fingerprinting, explainable alerts, falsing/no-service tests, privacy/retention.
4. **M3 — Portable policy:** Integrate warnings and user-controlled CubeChat traffic lockdown. Confirm system VPN lockdown state and packet leakage behavior separately.
5. **M4 — Root helper prototype:** Narrow trusted IPC, signed embedded module, consent, secure installation and rollback **on one supported test phone only**.
6. **M5 — Device-specific radio adapter:** Check supported privileged commands, readback and safe mode. No claims about cell-selective blocking until established.
7. **M6 — Integrated build (optional):** AOSP integration for devices with available source/vendor interfaces and validated VINTF/SELinux compatibility. Keep the APK operational without the integration.

## Open decisions

- Pick **one** expendable handset (exact model, model variant, SoC, Android build, baseband version, carrier and bootloader unlock status) for elevated testing; existing daily-use phones should not be the first test targets.
- Decide whether location history is cell-cooccurrence-only by default, or location-bucket-enabled after consent.
- Establish what emergency, carrier, enterprise and Wi-Fi calling traffic should remain accessible under each lockdown mode; do not claim IP allowlisting proves every OS bypass is covered.
- Run battery and field false-positive measurements before enabling continuous scan intervals.
- Identify a modem/SoC with *documented, verifiable* cell-rejection facilities before designing a specific-cell blocking UI.

## Technical references

- Android cell information: https://developer.android.com/reference/android/telephony/TelephonyManager
- AOSP HAL/AIDL: https://source.android.com/docs/core/architecture/aidl/aidl-hals
- Privileged allowlisting: https://source.android.com/docs/core/permissions/perms-allowlist
- Android VPN lockdown: https://developer.android.com/develop/connectivity/vpn
- Verified boot: https://source.android.com/docs/security/features/verifiedboot
- Android SELinux: https://source.android.com/docs/security/features/selinux
- Magisk module mechanics: https://github.com/topjohnwu/Magisk/blob/master/docs/tools.md
- KernelSU modules: https://kernelsu.org/guide/module.html
