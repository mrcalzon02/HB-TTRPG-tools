# CubeChat Lockdown / Radio Guardian — smoke report

**Evaluation:** November 18, 2026 (America/Sitka); CI timestamps November 19 UTC.  
**Tested commit:** [6ee56ee86e6b139e558d3cce4fb68e01bf14b882](https://github.com/mrcalzon02/HB-TTRPG-tools/commit/6ee56ee86e6b139e558d3cce4fb68e01bf14b882)  
**Final passing run:** [GitHub Actions #44454923448](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/44454923448)  
**Status:** **PASS application compilation, automated tests and emulator; NOT approved for actual-phone security installation or privileged radio control.**

> **Superseding safety decision (2026-11-18):** [NO EMERGENCY CALL TESTING](NO_EMERGENCY_CALL_TESTING.md). This report records past build evidence only, not an emergency-call test. No future CubeChat/RadioGuard emergency-call continuity tests are permitted under any circumstances (real, simulated, lab, carrier, manual or automated). Emergency call impact remains **NOT_TESTED_BY_PROJECT**.

## Implemented on main

- Firewall **Connections** tab; manual, permission-gated, read-only registered/neighboring cellular observations, timestamp, numeric IDs, technology, and signal where Android reports them. Android 10+ can request an updated observation, with throttling and no guaranteed modem response.
- Cell parser supports LTE, NR, GSM, WCDMA, TD-SCDMA and CDMA when present; unknown/stale results do not establish a tower identity. No RF transmission, selection or rejection.
- Memory-only bounded observation history (256 identities), distinct modem timestamp accounting, repeated-observation labels explicitly **not** trusted-tower authentication. No GPS tracking history, cloud log or automatic background scan.
- Offline GuardianPolicyGate contract requires independent readback across eight control/phone-survival surfaces before reporting a complete security state. **Not wired to any real privileged driver.**
- Fine location permission on Android 13+ is **only requested interactively**, not on app launch. The existing VPN, device-owner and peer radio policy code remain unchanged.

## Verifiable test results

| Gate | Outcome | Evidence |
| --- | --- | --- |
| First workflow YAML | FAIL (pre-job parse), fixed | [#44453456079](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/44453456079) |
| First application compilation | FAIL (Java 17 type clash / field initialization order), fixed | [#44453698815](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/44453698815) |
| First working Android build / signing | PASS; emulator blocked by KVM file permissions | [#44453942720](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/44453942720) |
| After KVM permission correction | PASS build, signatures, Android 35 instrumentation | [#44454387902](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/44454387902) |
| **Final full smoke** | **PASS** build, app/instrumentation APK signing, emulator, launch | [#44454923448](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/44454923448) |
| Pure Java host model | **PASS** 69 assertions | 23 history + 46 policy checks logged in final CI |
| Android Gradle unit and UI suite | **PASS** | Java 17 / Android SDK 35, assembleDebug, assembleDebugAndroidTest, testDebugUnitTest |
| New Connections screen UI on APIs 26 and 35 | **PASS** with unit suite | Tabs open without arming firewall and no unsupported selective rejection action |
| APK signing | **PASS** | Android APK signature scheme v2 for both APKs |
| Android 35 emulator | **PASS** | ContactStorageChecks reports cubechat_checks=passed, instrumentation code -1 |
| Emulator app launch | **PASS** | Android am start MainActivity + process lookup |
| Physical handset / cellular RF | **NOT RUN** | No eligible lab handset attached |
| Kernel/baseband selective blocking | **NOT IMPLEMENTED** | No verified root helper or vendor control interface |

## APK artifacts (debug, do not install over a public release)

- Application SHA-256: **395034adb911c4919ae3ae01a746b4900ee06f1fc5e546e817b5f5c908c897e7**
- Instrumentation SHA-256: **25fcb433d0c90554e2aa11d239ef0e1c73e9333164bbcc4a49d4db4e408923db**
- GitHub artifact: **cubechat-lockdown-smoke**, ID **14496618670**, 14-day retention, under passing run.
- Debug APK uses a development key and is not a release-signed update to the existing public 0.1.4 build 5. **No public release created.**

## Required before a real handset or a security guarantee

1. Physical Android permission grant/deny/revocation, GPS disabled, no SIM, dual SIM/eSIM, roaming, airplane, sleep/wake, cellular modem reporting and battery tests.
2. Independent IPv4/IPv6, DNS, VPN, QUIC, system UID, captive portal, boot, process death and Always-on lockdown *external packet capture*; do not infer absence of IP leaks from unit tests.
3. **Ordinary non-emergency** voice, incoming calls, SMS, IMS/VoLTE, Wi-Fi calling, radio recovery and update/rollback on expendable phone hardware. **All emergency-call continuity testing is prohibited**, not merely automated dialing; no simulations or laboratory exceptions. Emergency availability remains **NOT_TESTED_BY_PROJECT**.
4. Narrow authenticated privileged helper and safe root module uninstall; enforce protections only through documented supported device hooks; no arbitrary shell command endpoint.
5. Vendor- and firmware-specific radio readback; no rogue-cell blacklist or full RF-silence claim until demonstrated on identified hardware.
6. Full two-phone encrypted chat/file/receipt and release-signed upgrade acceptance. Existing build success alone is not sufficient.

## CI hygiene

The temporary push bootstrap was removed after completion. The new lockdown smoke workflow is **manual-dispatch only** on main, with an optional Android 35 emulator test enabled by default. It neither publishes a release nor changes automation schedules.

**Conclusion:** Validated first passive cellular observer and policy-proof model. The actual kernel/modem kill-switch design remains an unverified next phase.
