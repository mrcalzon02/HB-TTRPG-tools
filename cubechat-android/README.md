# CubeChat for Android

Open the [Android installation page](https://cubechat-android.lankytangerine2.chatgpt.site/) on your phone or [download CubeChat 0.1.1 from GitHub Releases](https://github.com/mrcalzon02/HB-TTRPG-tools/releases/download/cubechat-android-v0.1.1/CubeChat.apk). Open **CubeChat.apk** from your browser’s Downloads, then choose **Install** or **Update** in Android. The app supports Android 8.0 and newer and keeps one paired conversation on each phone.

The [Android development ledger](DEVELOPMENT_LEDGER.md) tracks planned features, their dependencies and the tests for each milestone.

## Updates

When CubeChat opens with internet access, it checks GitHub Releases for a higher Android build number. Published prereleases are eligible. Drafts are excluded. An available update appears above the conversation. Open the notice to see the installed and available versions, then choose **Open download** or **Not now**. An APK downloads only when you open the download, and Android asks before installing it. You can also choose **Pairing → Check for updates**. Offline pairing and chats work independently of the update check.

## Exchange the key

1. On the first phone, choose **Show my invite**. The QR image carries the actual A→B and B→A keys. Anyone who copies the image has those keys.
2. On the second phone, scan it with the camera or with **Scan an invite** in CubeChat. A phone with the verified app link opens CubeChat and imports the keys immediately, even if the first phone is offline. The pairing menu can also open a saved QR image.
3. If CubeChat is missing, the same code opens its installation page. Install the APK, return to that page and tap **Open with this key**. The key stays in the link fragment on the receiving phone. For installations during an outage, transfer the APK locally first.
4. Type a message and tap **Send**. The app queues it until it can reach the other phone. **Delivered** means the recipient decrypted and saved it. Both phones can reply. Keep CubeChat open for live delivery. Reopening it restores the keys, conversation and pending messages.

## Connect during an outage

- **Local Wi-Fi / hotspot** uses a shared network. Either phone can provide the hotspot. The chat host listens on TCP 47743. The paired phones can rediscover each other on the same broadcast network on UDP 47744 after an address change. Networks that isolate wireless clients can prevent this connection.
- **Wi-Fi Direct** creates a phone-to-phone Wi-Fi group without a router. The phone that showed the key card creates the group. Select it from the other phone and accept Android’s wireless connection prompt.
- **Via relay** lets the guest reach the chat host through one to four local forwarding phones. In **Pairing → Connection**, set each forwarding phone’s next local IPv4 address. Select **Another forwarding phone** for intermediate hops. Set the guest’s first hop with **Send via relay** and leave the host on local Wi-Fi. Each hop must be reachable at the same time. Forwarders do not need the chat key. They use TCP 47745 between relays and TCP 47743 for the final hop.
- **Bluetooth** uses Bluetooth Classic RFCOMM. Select Bluetooth on both phones, make the first phone discoverable, then choose it on the second. Android may show a Bluetooth pairing prompt. The same message queue works across the available connections.

Android permissions for nearby devices, location on older releases, and camera access are requested when the corresponding feature is used. No account, SIM, internet connection or central chat server is required for local messages.

## Wire profile

The app uses the repository’s canonical `shadowrun-binary-cube-engine.js` and CubeChat’s `latin-cube-64` deterministic profile inside the `cubechat-local-v1` AES-256-GCM envelope. Each pair receives independent, randomly generated directional keys. The app can also host a pair using an existing `cubechat-secret-bundle-v1` or role-A `cubechat-provision-v1` export. Published Qube Lab preset keys should be used only for reproducing those examples. This APK supports text up to 4096 UTF-8 bytes per message. The browser’s experimental consumable-key CCLK2 mode and media fixtures are separate.

The native transport authenticates delivery sessions using the QR credentials and pinned peer identities. Receipt acknowledgements follow a committed inbox write. Rekeying is explicit. The local Android Keystore protects keys, queued envelopes and message text at rest. The APK bundles both current and legacy-WebView builds of the same cube transform for offline operation.

## Build

Use JDK 17 and Android SDK 35. Run `./gradlew assembleDebug` from this directory (Windows: `gradlew.bat assembleDebug`). The output is `app/build/outputs/apk/debug/app-debug.apk`. For release use `assembleRelease`, then sign the aligned release APK with the project’s private signing key. Its public certificate SHA-256 is `7D:8A:D8:86:14:3D:7C:8E:95:1C:D2:8A:F2:BB:14:30:11:D4:98:B0:3B:C4:8E:C9:0A:9D:87:6D:9E:E1:78:77`.

To publish a signed build, put it at `cubechat-android/downloads/CubeChat.apk` and run `python3 scripts/release_manifest.py --write` from this directory with `ANDROID_HOME` set. Commit the APK, generated `release.json`, and matching Android version changes together. The CubeChat release workflow on `main` verifies the package, version and signer, then publishes the verified files on the versioned GitHub release. Update `RELEASE_NOTES.md` with the version, build number and user-facing changes before publishing. Increment `versionCode` for every update, including prereleases, and give each build a new version tag.

The 0.1.1 release includes `CubeChat.apk`, `release.json`, `RELEASE_NOTES.md`, `SHA256SUMS.txt`, and `CubeChat-Android-0.1.1-Source.zip`. The source archive contains the Android build and the canonical Cube engine it imports. To verify downloaded files from the release, run `sha256sum -c SHA256SUMS.txt` in their directory.
