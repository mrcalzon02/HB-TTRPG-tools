# CubeChat for Android

Open the [Android installation page](https://cubechat-android.lankytangerine2.chatgpt.site/) on your phone or [download CubeChat 0.1.4 from GitHub Releases](https://github.com/mrcalzon02/HB-TTRPG-tools/releases/download/cubechat-android-v0.1.4/CubeChat.apk). Open **CubeChat.apk** from your browser’s Downloads, then choose **Install** or **Update** in Android. The app supports Android 8.0 and newer and keeps multiple paired conversations on each phone.

The [Android development ledger](DEVELOPMENT_LEDGER.md) tracks planned features, their dependencies and the tests for each milestone.

## Conversations and drafts

Choose **Conversations → Add contact** to create another invite or scan someone else's. Scanning another card keeps your earlier chats. Scanning the same card again opens its existing conversation. Use **Rename contact** to give the current conversation a local name and **Search contacts** to find it later. The contact list shows how many outgoing messages are waiting.

Each chat keeps its own keys, history, preferred connection and encrypted draft. While reviewing earlier messages, a **Latest messages** shortcut returns to the bottom of the conversation. When a draft approaches the 4,096 UTF-8-byte text limit, the composer shows its byte count; an oversized draft is preserved but cannot be sent until shortened. Emoji and non-ASCII characters can consume multiple bytes. The selected conversation uses the radio. To resume delivery for a different contact, open that conversation on both phones. The app retains pending messages when you switch away. Bluetooth or Wi-Fi Direct may need to reconnect after a switch. The route setting applies to the selected conversation.

To check a contact, open their conversation and tap **Ping**. A fresh reply shows the route, round-trip time and when the check ran. Both phones need 0.1.2 or later to answer pings. “No reply” can mean the other phone is out of reach, has a different chat open or is running an older version.

Use Android’s **Share → CubeChat** for plain text or links. Pick a contact and review the draft before tapping **Send**. If you already have a draft, choose **Keep draft**, **Replace**, or **Append** when there is room. **Pairing → Find in conversation** searches the most recent 200 loaded messages on the phone. **Pairing → Screen privacy** hides chat and key-card windows from Android screen captures and recent-app previews while enabled. The physical QR remains visible to someone in front of the display.

## Local profile, lock and PURGE

Choose **Create local profile** at first launch or **Pairing → Security → Set up local profile** in an existing installation. Create a local username and password. Setup migrates the existing mailbox. You can sign in, change the password and configure lock timing offline. The normal password and an Android Keystore key protect the vault key. The local username, timestamps, counters and transfer sizes or states remain ordinary app-private database fields. Keep the normal password somewhere recoverable. CubeChat has no password recovery service.

**Lock now** immediately hides the mailbox. The default foreground idle timeout is five minutes. Choose 1, 5, 15 or 30 minutes, or manual-only while open. Leaving CubeChat locks it immediately by default. **Lock timing** also offers a background grace period of 30 seconds, 1 minute, 5 minutes or 15 minutes. A cold start always requires the password. Turn off username autofill in **Security** if you prefer to type it every time. Android share and invite intents pass through the same sign-in screen. Secure screens conceal credential entry from screenshots and recent-app previews.

**PURGE password** is optional and starts disabled. To enroll, enter the current normal password, enter a different PURGE password twice, and acknowledge the local reset. Use the standard sign-in screen to activate it. There is no second confirmation. Changing or disabling the PURGE password requires the normal password.

Activation first sends **“PURGE protocol activated by this user.”** to each currently connected conversation. The usual phone interface keeps the selected conversation connected. CubeChat attempts one write to each live connection in parallel and immediately requests the local reset when those writes finish. A blocked local radio write has a shared 150 ms limit across the entire announcement. A recipient never has to read or acknowledge the notice. An offline phone, broken link or stalled radio can miss the announcement. With no connected peer, the reset starts immediately.

Android then clears CubeChat’s local app data and closes the app. The next launch opens the initial pairing screen. This clears profiles, pairing keys, messages, encrypted attachment copies, settings and queued work across all local conversations. Each other phone keeps its history. Files already saved in Downloads or another destination remain with their owner.

**Pairing → Chat preferences** offers five text sizes (including 28 sp Accessibility) with a live preview, optional Enter-to-send and a keyboard privacy preference. Standard text size and multiline composition are the defaults. The app also asks compatible keyboards to skip personalized learning by default. **Use defaults** restores just these chat preferences.

## Send or receive a file

Open a conversation, tap **Files → Attach file**, and choose a document, photo or other file in Android’s picker. Both clients need CubeChat 0.1.3 or later to exchange files. Text and live ping still work with 0.1.2. Attachments use the conversation’s current connection and support files up to 8 MiB each.

Open **Files → All conversations · Transfer status** to review file offers, active transfers, stopped transfers and completed files from every conversation in one dashboard. Tap an entry to open that conversation and inspect the file's details. The main chat also shows a compact, tappable notice when a transfer completes, is declined or is canceled; tap it to open the file details. Pending incoming offers take priority over status notices. Notices are based on observed state changes, so opening CubeChat with existing completed files does not generate a flood of old alerts. The dashboard lists recorded transfer states; it does not claim that an inactive conversation is currently connected.\n\nThe recipient sees the proposed filename and size. Before showing a new offer, CubeChat checks the phone's available storage and its attachment vault allowance, accounting for other accepted incoming transfers and leaving room for SQLite/encryption overhead. When capacity is insufficient, the offer is declined automatically and the sender's file details show **Rejected: not enough storage on recipient** on updated clients. The receiver checks capacity again when **Accept file** is tapped, since free space may have changed. The **Files** screen displays device free space, the remaining budget for new incoming files, and CubeChat's 64 MiB attachment allowance across conversations; it refreshes the capacity reading when opened. This is a conservative preflight, not a filesystem allocation guarantee; a different app can still consume storage mid-transfer. **Accept file** starts the transfer. **Decline** discards the offer. Either person can pause, resume or cancel. If the connection drops or the app restarts, reopen the matching conversation on both phones. The sender resumes from the recipient’s last confirmed chunk.

After CubeChat verifies the complete file, choose **Save file** and select a destination in Android’s document picker. Until you save it, the contents stay inside the encrypted app vault. The app never automatically opens the received file. An exported copy belongs to the destination you selected. The vault allows 64 MiB of accepted or locally staged file content. Remove completed local copies from **Files** to free space. Choose **Files → Manage storage** for completed attachments across every local conversation, sorted largest first. The cleanup view shows filenames, contact names and sizes, then requires confirmation before removing each encrypted local copy. Active transfers cannot be removed through this view; separately exported files remain untouched.

File manifests use the existing Cube profile. Binary contents use per-file, per-direction AES-GCM encryption, with the file identity, total size, offset and expected SHA-256 authenticated with each chunk. The receiving app verifies the complete length and digest before offering **Save file**. Filenames, MIME types, hashes and file contents are encrypted in the app vault. Size, progress and transfer state are stored as ordinary database fields.

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

The 0.1.4 release includes `CubeChat.apk`, `release.json`, `RELEASE_NOTES.md`, `SHA256SUMS.txt`, and `CubeChat-Android-0.1.4-Source.zip`. The source archive contains the Android build and the canonical Cube engine it imports. To verify downloaded files from the release, run `sha256sum -c SHA256SUMS.txt` in their directory.
