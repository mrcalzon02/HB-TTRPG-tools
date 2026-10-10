# CubeChat Experimental Release Candidate — 2026-10-10

**Status: PRE-RELEASE CANDIDATE; not security audited; not a published GitHub Release.**
Suggested tag: `cubechat-v0.1.0-alpha.1` (only create tag/release when the packaging and smoke-test gates pass).

## User-facing components

- `cubechat-server.cjs`: Node HTTP(S) relay/server
- `cubechat-forum.cjs`: persistent plaintext boards, threads and replies
- `cubechat-network.html`: recipient browser client
- `cubechat-host.html`: multi-contact host manager
- `cubechat-provision.html`: paired host/recipient provisioning files
- `cubechat-key-handoff.html`: compact key transfer string and two-tone WAV
- `cubechat-large-keys.html`: optional 1/4/16 MiB per-direction secret-file generation
- `cubechat-large-key-adapter.js`: experimental consumable material mixing
- `cubechat-forum.html`: public plaintext forum UI
- `cubechat.html`: local two-client demonstration
- `shadowrun-binary-cube-engine.js`: canonical experimental cubic engine

All files must be bundled in the same directory, with no npm install requirement. See `docs/cubechat-lan-development.md` for requirements and security boundaries.

## Cross-platform matrix (target, not runtime verified)

| Platform | Browser clients | Node host | Notes |
| --- | --- | --- | --- |
| Windows 10/11 | modern Chrome/Firefox/Edge | Node 20+ | firewall inbound allowance; HTTPS for non-loopback |
| macOS | modern Safari/Chrome/Firefox | Node 20+ | gatekeeper only applies to downloaded executables, not portable JS; terminal launch |
| Linux | modern Chromium/Firefox | Node 20+ | firewall, service lifecycle, trusted HTTPS |
| Android | recent Chrome/Firefox | experimental Node on Termux | Termux not bundled or tested; Android may suspend background hosting |

OS independent source does not imply equivalently easy installation; mobile hosting is not release-qualified. Browsers require a secure context for Web Crypto: localhost HTTP or trusted HTTPS with valid hostname/IP certificate. IPv4 and IPv6 listener binding varies by OS; use `CUBECHAT_HOST`.

## Smoke-test gates BEFORE publishing alpha release

1. `node --check cubechat-server.cjs` and `node --check cubechat-forum.cjs`.
2. Start `node cubechat-server.cjs 8787` and check GET `/`, `/cubechat-host.html`, `/cubechat-network.html`, `/cubechat-forum.html`, `/cubechat-key-handoff.html`, `/cubechat-large-keys.html`, and `/shadowrun-binary-cube-engine.js` return 200.
3. Check host/guest chat round trip for UTF-8, wrong keys and tampered ciphertext.
4. Check two independently provisioned profile IDs on one listener remain separate.
5. Restart host and verify forum persistence, board creation access restriction, validation and post limits.
6. Verify generated `CCLK2` files parse; check message recovery with matching large material, exhaustion behavior and rejection when mode/key mismatches.
7. Verify modem WAV round-trip against known input; compare imported transfer string and SHA-256 independently.
8. Smoke-test at least Windows, Linux and macOS browser/host combinations; test Android as browser client separately.
9. Identify any known security defects prominently in release notes. **Do not publish as secure messenger.**

## Suggested GitHub pre-release description

CubeChat v0.1.0-alpha.1 — experimental local-first host/recipient chat, multi-contact routing and community forum. Node 20+ portable browser host, independent directional shared keys, host-issued recipient profiles, compact and large-key laboratory modes. This version is intended only for controlled testing, not confidential communication or deployment on public Internet. Current limitations include unauthenticated relay admission, fragile session/reuse accounting, unreviewed experimental cube algorithm, plaintext forum and lack of safe persistence for key counters. Demo keys are public. The large file material and modem paths are experimental.

## Release-process constraint

There are presently no authorized connected actions for creating a GitHub Release or uploading release assets. Commit this candidate document to main, then use GitHub's existing Releases UI or an authorized publishing integration to create the **pre-release** after the gates above pass. Do not claim release publication merely because a candidate file or tag exists. Do not add GitHub Actions.
