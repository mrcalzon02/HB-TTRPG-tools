# RadioGuard P0 — kernel interception, radio boundaries, and phone-survival matrix

**Date:** 2026-11-18 · **Status:** architecture and offline simulation only; no privileged hook or hardware interception installed.  
**Primary goal:** an attacker controlling a third-party Android app (and possibly an Android framework service) cannot use ordinary internet-capable sockets outside narrowly granted CubeChat routes. We also inventory the remaining wireless data paths rather than asserting that IP controls stop all RF.

**Absolute project prohibition:** [NO EMERGENCY CALL TESTING](NO_EMERGENCY_CALL_TESTING.md). No actual or simulated emergency-call continuity tests, ever; normal non-emergency communication testing remains permitted.
**Priority override:** [RADIOGUARD EMERGENCY PRIORITY YIELD](RADIOGUARD_EMERGENCY_PRIORITY_YIELD.md): trusted early platform requirement for emergency calling overrides *all* CubeChat IP/radio controls. No protocol simulation, interception of emergency calls or test triggers. This gate blocks privileged deployment until a safe early handoff is established.

**Scope / trust boundary:** Below application permissions is not automatically outside the operating system. The Android Linux kernel is part of Android. eBPF, netfilter, the Radio HAL, and root daemons may resist an *app-level* exploit, but **not arbitrary kernel control**. Any defense against a kernel-compromised attacker needs a separately protected execution/power boundary proven on real hardware.

## P0.1 — Packet path and enforcement candidates

```text
App / compromised app / Android service
  -> socket syscall, binder services, netd routing decisions
  -> cgroup socket / cgroup_skb hooks (if supported)
  -> kernel routing, netfilter, tc egress (device-specific)
  -> network driver and vendor offload / modem IP data plane
  -> Wi-Fi or cellular transmitter
Incoming: driver / offload -> XDP (driver support), tc ingress,
          netfilter, cgroup ingress / socket -> application
Separate paths: Wi-Fi management, Bluetooth controller/HCI,
          cellular RRC/NAS/SIM/baseband processing.
```

| Enforcement candidate | Strength | Coverage / caveat | Required probe before selecting |
| --- | --- | --- | --- |
| AOSP `netd` UID/cgroup eBPF | Established Android kernel mechanism for UID/socket controls | Already managed by `netd`/bpfloader; adding our maps or overriding pinned programs could conflict with Android networking | Kernel config, BPF program attachment, map ownership, concurrent netd behavior, owner UID correctness |
| New dedicated cgroup socket/packet hook | Precise UID / socket identity checks for ordinary kernel traffic | Not a hardware radio switch; attach order, kernel build, system/isolated UIDs, and non-socket traffic matter | BPF verifier, hook availability, inbound/outbound and IPv6 evidence |
| `tc` ingress/egress | Per-interface packet dropping independent of individual app code | Interface renames, VPN/TUN, CLAT/NAT64, hardware offloads, tethering, and device-driver paths may bypass a chosen hook | Per-interface packet traces on Wi-Fi, mobile, loopback, tether and VPN |
| netfilter/iptables/nftables | Broad packet enforcement where kernel and Android rules permit | Stock Android kernel and netd versions differ; do not assume `nft` exists or is compatible | Exact kernel features; ordering alongside netd, vendor firewall and NAT |
| XDP | Early **ingress** packet handling on supporting drivers | NOT a general outgoing-firewall substitute, not universally supported by mobile vendor drivers | Driver native/generic support and capture comparison |
| HAL/telephony policy | Can request selected network technology or radio configuration where privileged APIs and vendor implement it | Calls into modem; cannot guarantee that every autonomous baseband action is filtered | Verified write/readback and call/IMS recovery on exact firmware |
| Hardware gate / secure isolated controller | Can potentially enforce an independent RF restriction | Only if power/enable line, protected ownership and isolation actually exist | Electrical/driver docs plus independent RF measurement |

**Rule:** no packet-path diagram establishes coverage. Build an independent sender/receiver traffic fixture and measure actual egress and ingress. If an interface or hardware path is not measurable, mark it `NOT_VERIFIED`, never assume it is silent.

### Bypass and negative-test inventory

| Attempt | Expected result of a future *validated* default-deny IP hook | Current state |
| --- | --- | --- |
| Normal app TCP over Wi-Fi and cellular | Drop unless a matching trusted permit exists | Host model only |
| Normal app UDP, QUIC (UDP/443), DNS (UDP/TCP/53), Private DNS (TCP/853) | Drop; do not use DNS allow-all | Host model only |
| IPv6 global, link-local and IPv4-mapped IPv6 | Drop unless explicitly permitted; inspect IPv6, CLAT and NAT64 | Host model only |
| Direct IP literals, resolver bypass, alternate DNS, proxy | Drop; hostnames and package names are not trusted boundaries | Host model only |
| VPN inside another app, work profile, secondary user, isolated UID | Treat as untrusted until proven covered by same kernel policy | Device probe needed |
| Traffic under system/root UID, via binder proxy, shared UID, or socket FD handoff | No blanket system UID exception; authenticate the actual originating operation where possible | Device probe needed |
| Socket with existing TCP state when toggle changes | Revoke or block existing traffic; future transitions must fail closed | Device probe needed |
| Reboot / app crash / helper crash / OTA / interface handoff | No unprotected boot window for *claimed* complete protection; otherwise report partial and preserve phone recovery | Device probe needed |
| Hardware accelerated tethering, Wi-Fi hotspot, cellular offload | Block or mark uncovered; measure externally | Device probe needed |
| Wi-Fi probe/management/beacons, Bluetooth Classic/LE or PAN signaling | **OUTSIDE IP ENFORCEMENT**; require independently verified radio control | No verified control |
| Modem registration, NAS/RRC, SIM exchanges, emergency network attachment | **OUTSIDE IP ENFORCEMENT**; typically autonomous modem/firmware operation | No verified control |
| Attacker with kernel write/replace privileges | Not guaranteed by an in-kernel policy; separate trust anchor needed | Not defended |

### P0.2 — Control-versus-data boundary

**Data plane:** ordinary IP packets from apps, services, and CubeChat's authenticated peers. Design explicit exact-match, short-lived policy grants. For outgoing CubeChat chat use kernel-observed UID/socket cookie, destination, transport/interface, direction and policy generation. For a listening CubeChat server, separately design a narrow ingress handshake window; authentication cannot occur before initial packets, so ingress is a bounded attack surface, NOT magically identity-authenticated.

**Control plane:** a dedicated signed Guardian service issues authorizations only after user policy and CubeChat's peer/route decision. Treat app-provided UID, socket cookie, network type, “trusted peer”, destination name, or “verified” flags as untrusted; the service must obtain authoritative identity and policy state from the kernel/OS. No all-app allowlists, generalized root command executor, unversioned IPC, or remote admin port.

**Integrity:** pin the trusted policy service binary and signer; use locked-down SELinux domain on integrated builds; use a monotonic policy generation, short expiry, and invalidation on adapter/version/firmware changes. A host-only Java contract cannot ensure unforgeable tokens—authentication and kernel readbacks are **P3 work**, not claims of the model.

**Evidence:** keep separate (1) intended policy, (2) kernel attachment/readback, (3) independently captured traffic at relevant interfaces and, where practical, (4) radio state. The GuardianPolicyGate proof model is a *display gate* only. App-supplied readback flags are never evidence of compliance.

## P0.3 — Critical service / phone-survival exceptions

“I'm alive” is **not** a universal IP endpoint or a single carrier heartbeat. A handset often negotiates radio attachment and emergency services autonomously in modem firmware. No broad exemptions for `com.android.*`, UID 0/1000, all carrier IP ranges, or arbitrary `IMS` destination domains.

| Function | Typical layer / actor | Baseline policy intent | Proof / limitation |
| --- | --- | --- | --- |
| Modem registration, SIM/eSIM authentication | Baseband, radio firmware, SIM | Preserve ordinary registration unless separate user-selected radio silence | IP hooks cannot attest or necessarily control |
| Incoming/outgoing voice and IMS/VoLTE | Vendor modem + OS IMS components; IP may be carried internally | Preserve normal calls by default; platform-specific exception where measurable | Call both directions before and after policy; no generic UID whitelist |
| Emergency calling | Modem/OS/carrier emergency path | Leave emergency functionality outside RadioGuard's modified/tested scope; flag possible impacts | **TESTING PROHIBITED UNDER ALL CONDITIONS** — no actual, simulated, laboratory, test-SIM or certified emergency-call exercises. Status: **NOT_TESTED_BY_PROJECT** |
| SMS / cell broadcasts | Modem / telephony stack, variable by carrier | Preserve essential SMS and alerts | Device evidence; some SMS over IMS |
| Wi-Fi calling | IMS IP traffic via Wi-Fi | Optional supported functionality explicitly measured | May require narrowly scoped vendor system IP flow or may be unavailable |
| Android network validation | OS connectivity verifier and captive portal probes | Allow only if proven necessary and minimally scoped; otherwise fail validation visibly | Dynamic system endpoints; do not invent fixed URL |
| DNS resolver / private DNS | Android system resolver or app | Drop by default unless a named, measured critical dependency | Never implicitly permit arbitrary DNS to enable other apps |
| Time sync / time integrity | OS/vendor; cellular time or IP NTP | Preserve where essential for authentication, narrowly and audibly | No blanket NTP on all ports |
| eSIM provisioning / carrier configuration updates | Privileged OS/carrier app + IP | May be paused while locked; user-authorized maintenance window | Do not block modem registration or brick carrier services |
| System/software APK updates | Android updater/app + IP | Denied in strict mode except explicit maintenance window | User sees update waiting |
| CubeChat peer data (local Wi-Fi, Wi-Fi Direct, relay) | CubeChat-owned authenticated transport | Permit exact route/peer/port/direction, bound to short-lived trusted grant | Existing VPN protection is not equivalent to privileged kernel enforcement |
| Internet CubeChat rendezvous | Not yet implemented (CC-06) | Deny until explicitly specified and built | No guessed server addresses |
| Bluetooth discovery / advertisements | Bluetooth stack/controller | Require selected transport; managed hard radio-off may also block CubeChat | No app-only control of other apps' Bluetooth |
| Tethered devices / hotspot | OS/vendor offload, not necessarily individual app UID | Disable unless exact, tested need; measure bypass | Device-specific |

## P0.4 — Readback and attestation contract

Versioned transport-neutral schema proposal; not yet an installed privileged helper:

- `LockdownPolicy{schema_version,generation,device_fingerprint,authorized_peer_connections[],critical_service_grants[],requested_radio_mode,expiry}`
- `GuardianCapabilities{adapter_id,device_fingerprint,kernel_release,os_build,baseband_revision,verified_boot_state,hook_support,driver_readback,boot_coverage,rollback_available}`
- `GuardianAttestation{generation,component,hook_loaded,policy_digest,proof_source,observed_at_monotonic,independent_capture_id,coverage,failures}`

Classification for each traffic/signal class: `REQUESTED`, `ATTACHED_UNVERIFIED`, `EXTERNALLY_VERIFIED`, `UNSUPPORTED`, `FAILED`. The UI must not report stronger protection than the weakest required class. Post-boot self-report without external negative capture remains unverified.

The newly added `GuardianTrafficPolicy` is a **pure Java model** to exercise tuple matching and avoid mistaking non-IP paths for IP permits. It never opens a socket or loads a kernel program. Tests are in `tests/GuardianTrafficPolicyTest.java` and `scripts/test-guardian-host.sh`; they are **not** a live kernel firewall test.

## P0.5 — Modem and rogue-cell claims

- Filtering AT/QMI/MBIM control messages does **not** necessarily filter autonomous baseband cell selection, attach, NAS/RRC or signaling. A modem command filter is not a verified false-base-station firewall.
- Disable 2G only where the hardware/carrier/Android implementation supports it; emergency service behavior may override normal policy. **Only test non-emergency** LTE/NR availability and ordinary roaming. Do not test emergency behavior under any circumstances. Report it as **NOT_TESTED_BY_PROJECT**.
- 5G SUCI depends on SIM/USIM credentials and home-network provisioning; userland cannot generally force universal concealed-identity behavior. Initial signaling may include unciphered states, and null-cipher rules have necessary specification and emergency exceptions.
- A cell's MCC/MNC/TAC/PCI, signal power, neighbor list, or a plausible `DIAG` frame is **not** proof that physical tower equipment is authenticated. Unknown means unknown; no automatic cell barring.
- Start with opt-in, bounded, read-only observations already present in CubeChat. Any live radio controls require exact device/firmware evidence and safe rollback.

## P0/P1 lab gates and next choices

1. **No handset required:** exercise the host-only deny model, malformed/missing/stale/mismatched exact grants, non-IP scope, policy-generation mismatch and empty critical-service exception list. Keep tests in manual-only workflow.
2. **Exact spare handset required for P3:** record model, variant, SoC, Android API, kernel config and release, modem firmware, carrier, SIM mode, bootloader status, verified root-of-trust and stock rollback images. No changes to an active daily phone.
3. **First privileged proof:** choose one compatible eBPF/cgroup or `tc`/netfilter path with repeatable Android integration. Do NOT overwrite Android's netd BPF maps. Run an external independent capture for every target interface, with baseline and negative tests.
4. **Non-emergency telephony checks only:** ordinary voice, IMS/VoLTE, SMS, Wi-Fi calling and carrier registration before/after. **Never conduct emergency-call continuity tests** (including manual, simulated, emulator, shielded or certified lab tests). Emergency-call effects remain untested and cannot be certified.
5. **Release blocker:** any advertised complete protection must survive verified boot/OTA, helper failure, interface migration, privileged app attack scenarios and audited recovery. Unmeasured radio paths are not complete protection.

## Technical grounding

- AOSP eBPF/netd: https://source.android.com/docs/core/data/ebpf-traffic-monitor
- AOSP BPF kernel integration: https://source.android.com/docs/core/architecture/kernel/bpf
- AOSP AIDL HAL architecture: https://source.android.com/docs/core/architecture/aidl/aidl-hals
- AOSP Verified Boot device states: https://source.android.com/docs/security/features/verifiedboot/device-state
- Linux networking classifier / BPF subsystem: https://docs.kernel.org/bpf/
- 3GPP TS 33.401 (LTE), 33.501 (5G), TR 33.809 (false-base-station study)
- NIST SP 800-124 Rev. 2 (enterprise mobile-device security)
