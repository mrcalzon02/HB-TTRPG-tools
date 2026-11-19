# RadioGuard — absolute emergency priority yield

**Priority: HARD OVERRIDE.** Supersedes all ordinary lockdown, fail-closed, VPN, root-helper, radio, and device-owner choices.  
**Testing boundary:** [NO EMERGENCY CALL TESTING](NO_EMERGENCY_CALL_TESTING.md) — no real calls, mocks, emergency protocol simulations, RF labs, test SIMs, test numbers, or other emergency continuity testing. This file defines design requirements only, **not proven emergency-call behavior**.

## Required behavior

When a **trusted, authoritative and sufficiently early platform indication** says emergency calling is required, RadioGuard must immediately **relinquish every enforcement control it owns**:

1. Do not block, interpret, filter, reroute, proxy, or mediate any emergency-call-related traffic or protocol. Let stock Android, telephony, the carrier and the modem operate independently.
2. Remove/disable RadioGuard's kernel eBPF, LSM, tc/netfilter, network-namespace and offload policies **if any have actually been installed**. Remove all corresponding policies and permitted-socket registrations; close the privileged helper's network proxies.
3. Release CubeChat-owned device-owner restrictions affecting Bluetooth, Wi-Fi, hotspot, network configuration and VPN configuration. Remove the device-owner's always-on VPN lockdown configuration.
4. Set CubeChat's local VPN policy to **off**, close its TUN interface and stop its packet-discard service. Do not merely allowlist some suspected emergency IP endpoints.
5. Cancel pending guardian policy operations and disable monitoring/alerts that could send commands to radios. Let the normal CubeChat application remain a normal application only insofar as it does not impose network/radio controls.
6. **Latch released** persistently, including after process restart, until the user makes a new explicit activation request. No automatic rearming after the condition clears.
7. Never require UI interaction, a password, peer availability, backend access, successful cloud authentication, or a network response before relinquishing enforcement.
8. Attempt **all** owned release operations even if one fails. Report which ones succeeded and which remain unverified/blocked; do not silently report success or delay the other release actions.

**Priority:** `PLATFORM_EMERGENCY_YIELD > ALL RADIOGUARD RULES`. This is a release, **not an emergency allowlist** or a special protected CubeChat route.

## Architecture and implementation gate

A public Android application has **no universal guaranteed early notification** that *any* emergency-call enabling protocol is required. Ordinary call-state callbacks are not sufficient; Android-specific emergency state broadcasts can be hidden/system APIs and may occur after the modem already began an emergency procedure. An exported app broadcast to toggle RadioGuard is unacceptable: malware could disable the firewall at will.

A future **trusted OS integration** must provide an authenticated, protected, early priority signal from the phone's own telephony control path to RadioGuard's independent guardian controller. This must not modify the platform's emergency-call implementation. The signal cannot depend on Android UI lifetimes or on a process that may be suspended. A narrow, privileged entrypoint must verify the OS caller identity and must not accept a request from an untrusted app. No actual emitter or emergency-call interception is implemented yet.

**Hard deployment rule:** On any handset where RadioGuard lacks a proven early, independent emergency-priority handoff, it must not enable a new low-level radio, modem, kernel, or OS-network control whose safe release is dependent upon that handoff. Keep those privileged features unavailable rather than promise unverified automatic disengagement. Existing user-consented VPN and managed-device code remain **unverified development/fallback**, not emergency-compatible or a safe-production guarantee.

- Preserve stock modem and emergency handling, and never claim an emergency mode was validated.
- A user-configured Android **Always-on VPN / Block without VPN** cannot necessarily be cleared by CubeChat. Android device-owner APIs can remove only configurations they own on newer Android releases. An actual override cannot claim a complete release if Android still controls the lockdown setting.
- A root/helper crash, blocked process, missing SELinux permission, or unsupported driver can prevent release. Devices without independent override facilities must be marked `AUTO_YIELD_NOT_SUPPORTED`, never `EMERGENCY_COMPATIBLE`.
- If remote management policy forbids changing device-owner restrictions, this product must not install those restrictions as a supposed safety-compatible configuration.
- Any independent radio power gate must be bypassed/opened by the trusted platform **before** an emergency procedure can need the transmitter, not by a delayed Android app callback.
- The safety-release API must not be remotely exposed or be a general command executor.

## Allowed verification without any emergency scenario

Only verify the **ordinary, non-emergency manual teardown** mechanism: releasing CubeChat-owned restrictions, stopping its VPN, refusing to rearm without a fresh user request, and recovering from failures. This tests a generic off switch, **not the emergency signal, call path, callback, bearer, protocol, or continuity**. Static inspection is allowed. No synthetic emergency activation event should be added to automated or manual tests.

Emergency-call support status remains **NOT_TESTED_BY_PROJECT** permanently. No release gate may require or simulate such a call.

## Source grounding

- Android managed VPN lifecycle and restrictions: https://developer.android.com/reference/android/app/admin/DevicePolicyManager#setAlwaysOnVpnPackage(android.content.ComponentName,java.lang.String,boolean)
- Android VPN lifecycle and user-level always-on settings: https://developer.android.com/develop/connectivity/vpn
- AOSP system-only emergency call-state broadcast (not a public universal early hook): https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/telephony/java/android/telephony/TelephonyManager.java
