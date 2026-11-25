# CubeChat for Android

Open the [Android installation page](https://cubechat-android.lankytangerine2.chatgpt.site/) on your phone or [download CubeChat 0.1.4 from GitHub Releases](https://github.com/mrcalzon02/HB-TTRPG-tools/releases/download/cubechat-android-v0.1.4/CubeChat.apk). Open **CubeChat.apk** from your browser’s Downloads, then choose **Install** or **Update** in Android. The app supports Android 8.0 and newer and keeps multiple paired conversations on each phone.

The [Android development ledger](DEVELOPMENT_LEDGER.md) tracks planned features, their dependencies and the tests for each milestone.

## Security history (development source; not in the published APK)

In **Pairing → Firewall settings → History**, CubeChat can show two local graphs: VPN TUN
packets discarded over time and Android-reported *serving-cell signal* from explicit
cell reads. Summary counters also display TUN bytes and the number of manual cell
reports. The reporting source is limited: an empty graph never proves the network was
safe, and a measured cell identity never proves physical tower authenticity.

Statistics are aggregated into 5-minute buckets, capped at 2,016 buckets. The default
retention is **3 days**, configurable to **6 hours, 24 hours, 3 days, or 7 days**.
Collection is on by default for *aggregate counters only*: packet counts are collected
only while the existing CubeChat VPN actually receives packets, and cellular reports
are collected **only when the user explicitly requests a read with Android permission**.
There is no polling of cellular radios, packet content capture, background cell scan,
tower blacklist, or remote transmission. History is stored in application-private
preferences as AES-GCM ciphertext using an AndroidKeyStore key, and the manifest
already disables Android Auto Backup. Store/key failure stops statistics recording,
**not the firewall**, and never falls back to unencrypted history.

**Clear saved security statistics** erases the ciphertext and the dedicated key; it
also resets session-only cell identity observations. Changing to shorter retention
prunes older buckets. PURGE stops the statistics writer, clears the history/key,
and then performs the existing Android application-data reset. This is cryptographic/
application-data deletion, **not proof of physical flash sanitization or erasure of
other devices' data**. Android's app-data reset and full APK behavior still require
hands-on validation. Up to 30 seconds of recent packet counts can be lost on a crash.
System clock changes may affect historical ordering.

The core pure-Java SecurityTimelineTest has passed 26 assertions against exact
source blobs. SecurityHistoryUiTest for API 26/35 is staged in the Android test
suite but has **not yet been run**. No signed APK, Android emulator security proof,
or hardware certification is claimed by this source change.

## Lockdown and update-check behavior (development builds)

Under **Pairing → Firewall settings**, the **Lockdown**, **Exceptions**, **Radios**, **Connections**, **History**, **Recovery**, and **Device** tabs separate current Android capabilities from planned hardware-level enforcement. Lockdown is not a verified radio kill switch. The Recovery screen can request ordinary release of CubeChat-owned restrictions and report incomplete readback. It now records the **managed-policy, local armed-preference, and VPN-stop command outcomes separately** and stores the most recent manual-release receipt synchronously. A command returning successfully is **not** proof that an Android-owned VPN or radio policy was removed. No universal early automatic emergency release exists in this build. [Emergency-call testing of any kind is prohibited](docs/NO_EMERGENCY_CALL_TESTING.md).

While CubeChat's IP lockdown is requested, it **does not initiate GitHub update checks or open its APK download link**. The main screen shows **Update checks paused · Lockdown**, or marks a previously verified update as **Download paused**. Cached release information is retained. After deliberately turning lockdown off, a fresh update check may be requested; turning lockdown off does **not** resurrect a check invalidated by an earlier lockdown activation.

When a metadata fetch has already begun, CubeChat checks for revoked authorization before starting more HTTPS requests, after a server response, during reading, and before accepting release metadata. It also attempts to disconnect the active HTTP connection immediately upon lockdown activation or app shutdown. A system-level blocking network operation may not terminate instantly; **no device-side packet-leak guarantee has been established**. The restriction applies to CubeChat's updater, not a certification of every external browser or privileged system path.

For real network controls, the user must separately configure Android's VPN/managed-device facilities on compatible hardware. The privileged kernel/modem RadioGuard design remains a research track and is not deployed by the APK.



## Manual lockdown recovery and diagnostic privacy (development builds)

The **Recovery** tab writes an ordinary manual release journal entry *before* attempting cleanup, then saves the outcome of each CubeChat-managed restriction, local armed-preference and VPN-stop request. If the process stops between the start and finish, reopening the screen displays **release interrupted or unconfirmed**, hides the previous operation's receipts and offers **Retry CubeChat cleanup**. It never automatically rearms lockdown. A successful command receipt is **not** independent proof that Android's own VPN or radio restrictions were removed.

Both the **Recovery** and **Device** tabs offer an explicit copy action for compact diagnostics. Copied data is marked as sensitive so compatible Android versions obscure its visual clipboard preview. **It is still a normal system clipboard item:** other applications with access may read it. Copy only if you intend to share the report; neither tab automatically exports the information. The report excludes chat messages, contact identities, SIM/subscriber identifiers, network packet contents and location observations.

## Managed-device safeguards and current deployment gate (development builds)

**Advanced managed-device lockdown is intentionally disabled in this APK.** Even on an already-provisioned device-owner phone, the IP lockdown switch does not install new device-owner radio restrictions or a managed Always-on VPN. CubeChat does not have a verified early trusted-platform priority-release handoff, so these persistent restrictions cannot be represented as a safe automatic feature. The normal opt-in Android VPN fallback remains separate and needs Android's VPN consent/settings; it is not a hardware radio or emergency compatibility guarantee. If an older build left CubeChat-managed restrictions, the **Recovery** tab can attempt to remove them and report what Android does and does not confirm.

The [GuardianDeploymentGate](app/src/main/java/org/cubechat/android/GuardianDeploymentGate.java) marks device-owner, kernel-IP, radio-driver and cellular-modem enforcement disabled until dedicated hardware/OS integration is reviewed. The device-owner gate does not inspect, simulate or invoke telephone/emergency procedures.

## Legacy managed-device VPN ownership notes

When a phone is already provisioned with CubeChat as its **device owner**, manual lockdown cleanup attempts to remove only CubeChat's managed restrictions and VPN configuration. It now reads the configured always-on VPN package first. A different VPN package is preserved.

On Android 8–11 (API 26–30), the device-owner APIs cannot reliably distinguish a user-configured same-package VPN from one established by CubeChat. This development build therefore requires a stored record of CubeChat having installed the managed VPN before removing it on these devices. Missing provenance is reported as **incomplete cleanup**, not silently treated as permission to remove a user's VPN. On Android 12+ the platform restricts an admin's VPN removal to the configuration it owns. If Recovery reports uncertainty, open Android VPN settings and examine the current configuration; **do not assume a successful release command proves the VPN was removed**.

This mechanism does not add a privileged radio, modem or emergency-call feature. The emergency-call testing prohibition and automatic trusted-priority-yield deployment gate remain unchanged.

## Read-only RadioGuard feasibility probe (developer use)

Before choosing a disposable handset for deeper kernel research, install Android Platform Tools on your computer and explicitly select **one spare phone** using `adb devices`. From the `cubechat-android` directory run:

```bash
bash scripts/radioguard-readonly-probe.sh YOUR_SELECTED_ADB_SERIAL
```

This script **only reads** Android build, security patch, model, baseband, boot-state hints, SELinux, kernel release and filesystem/tool availability. It does not require root, install an APK, alter radio settings, issue telephony commands or capture subscriber, contacts, Wi-Fi MAC, GPS or device serial details in its report. It prints no target serial. Handle the resulting build fingerprint and baseband information as local diagnostic data.

A BPF filesystem mount or available `tc` tool does **not** establish that a usable interception point exists. The script explicitly marks hardware offloads, BPF attachment, vendor modem control, and privileged priority release as **NOT VERIFIED**. Never use it to certify any emergency-call functionality. The pure-host mock regression can be run without any phone:

```bash
bash scripts/test-radioguard-readonly-probe.sh
```

## QR artwork: brightness-modulated photo key cards (development source)

The existing **Show my invite → Save QR image** path still produces the familiar, high-contrast black-and-white PNG. An additional **Blend QR into a photo** action has now been integrated into the development source.

1. Open a pairing invite, tap **Blend QR into a photo**, and select an existing local image through Android's document picker. No additional media permission is requested.
2. Use the **Visibility** slider to darken/lighten picture pixels in the centered QR pattern. The editor updates its preview after a brief pause while dragging.
3. The app runs its existing ZXing QR decoder on the *full composed image*. **Save verified artwork PNG** remains disabled unless the decoder recovers the **exact pairing invite**.
4. Choose a destination for the PNG. The app losslessly encodes the image, decodes the encoded PNG bytes back to pixels, verifies them **again** against the invite, and only then writes the requested file.

Photos are sampled to a maximum 1600-pixel dimension and the QR requires six pixels per module plus a four-module quiet zone. Tiny or highly elongated images may be rejected; choose a larger or squarer image. Transparent backgrounds are flattened against white, and original image metadata is not copied into the rendered PNG. The editor does not save the picture, invite or preview until you explicitly choose a PNG destination. Photo selection and scan verification happen locally without uploading to a server.

**Status: source-integrated, not yet validated as a running APK.** The compositing and centered-geometry Java host tests passed **35/35**, with exact current source/test Git blob hashes. An independent OpenCV reader decoded an example *synthetic landscape* image at six contrast strengths (40–100%); this is not proof of real camera, printed-card or arbitrary photo reliability. Android's `QrArtworkRenderTest` and the pre-existing ZXing luminance decode tests are committed but require the manual Android SDK / API26+ build and regression workflow. See [QR artwork tracking issue #24](https://github.com/mrcalzon02/HB-TTRPG-tools/issues/24).

**Security:** QR luminance camouflage is **not encryption**. Anyone who reads the QR from the artwork can access the encoded pairing material. Treat the entire picture as a private key card, avoid posting it publicly, and use a conventional visible QR whenever scanning fails. The option does not alter CubeChat's keys, transport protocol or original QR export.


## Conversations and drafts

Choose **Conversations → Add contact** to create another invite or scan someone else's. Scanning another card keeps your earlier chats. Scanning the same card again opens its existing conversation. Use **Rename contact** to give the current conversation a local name and **Search contacts** to find it later. The Conversations picker now shows the **current contact first**, then other contacts with queued outgoing messages (largest queue first), followed by remaining contacts alphabetically. A **Conversations with queued messages only** checkbox narrows the list; the summary shows the number of matches and how many conversations have queued messages. Contact search stays local and its text is cleared when the dialog closes. The list is height-limited and scrollable to keep Close / Add contact usable on smaller phones. The current chat displays **Connected** or **Not connected**, the selected transport route and the count of locally queued messages. Only the selected conversation can be shown as connected; other contacts say **Tap to open**. A queued message has not yet been confirmed as delivered. Connection state describes the selected conversation, not a global online status for every contact.

In development builds, tapping **Send** shows **Saving…** while CubeChat writes the message to the local outbox. You can start typing your next draft immediately, even if it says the same thing. If the write fails, your current draft stays editable and **Send** becomes available again. Once queued, the message waits for the other phone to acknowledge receipt.

Each chat keeps its own keys, history, preferred connection and encrypted draft. The composer’s **Draft ⋮** menu offers **Save draft now**, **Copy draft**, and **Clear draft**. Drafts are saved asynchronously in CubeChat's local encrypted vault. A queued write is **not yet a confirmed save**; the development build now acknowledges the database commit. The compact line beneath the composer displays the live **UTF-8 byte count** alongside **Unsaved changes**, **Saving locally**, **Saved locally**, or **Draft not saved**, depending on the actual save stage. It does not claim the peer received anything. If the write fails while that exact edit remains open, CubeChat displays **Draft not saved** and keeps the text editable with a manual **Save draft now** retry. Failed writes do not falsely show success; completion callbacks from an older edit, another conversation, or a locked profile cannot confirm newer text as saved. On a successful outbox send, the obsolete unsaved-draft warning is cleared only if that message still owns the composer text. Already-admitted saves are allowed to finish ahead of a subsequently queued vault lock; a force-stop or sudden device loss before commit still cannot be guaranteed recoverable. Clearing the draft displays **Undo clear** for ten seconds; Undo restores text only in the same conversation and will not overwrite a new draft. Copy uses the Android clipboard, which other clipboard-aware applications may access. While reviewing earlier messages, a **Latest messages** shortcut returns to the bottom of the conversation. Tap or long-press a message bubble to open **Copy message** and **Quote in reply**. Copy places its text on the Android clipboard. Quote appends an editable plain-text excerpt below your current draft (up to 1,024 source bytes, with a `> ` prefix on each line); it never sends automatically. Text selection on the message itself remains available. The Copy buttons mark drafts, messages and invites as sensitive so compatible Android clipboard previews hide their contents. Clipboard-aware apps can still read a copy. PURGE attempts to clear the current CubeChat-marked clip when Android grants clipboard access. When a draft approaches the 4,096 UTF-8-byte text limit, the composer shows its byte count; an oversized draft is preserved but cannot be sent until shortened. Emoji and non-ASCII characters can consume multiple bytes. The selected conversation uses the radio. To resume delivery for a different contact, open that conversation on both phones. The app retains pending messages when you switch away. Bluetooth or Wi-Fi Direct may need to reconnect after a switch. The route setting applies to the selected conversation.

To check a contact, open their conversation and tap **Ping**. A fresh reply shows the route, round-trip time and when the check ran. Both phones need 0.1.2 or later to answer pings. “No reply” can mean the other phone is out of reach, has a different chat open or is running an older version.

Use Android’s **Share → CubeChat** for plain text or links. Pick a contact and review the draft before tapping **Send**. If you already have a draft, choose **Keep draft**, **Replace**, or **Append** when there is room. **Pairing → Find in conversation** searches the most recent 200 messages already loaded for the selected contact, entirely on the phone. It offers **All / You / Peer** filters, shows each match with the surrounding words (including matches deep inside long messages), and displays up to 60 newest results while counting all matches. Tap a result to jump to that message; if a refreshed conversation contains indistinguishable duplicates, CubeChat asks you to search again instead of choosing the wrong one. Search text is cleared when the dialog closes and is not stored or sent to a service. This does **not** search the full historic archive beyond the 200 loaded messages. **Pairing → Screen privacy** hides chat and key-card windows from Android screen captures and recent-app previews while enabled. The physical QR remains visible to someone in front of the display.

## Local profile, lock and PURGE

Choose **Create local profile** at first launch or **Pairing → Security → Set up local profile** in an existing installation. Create a local username and password. Setup migrates the existing mailbox. You can sign in, change the password and configure lock timing offline. The normal password and an Android Keystore key protect the vault key. The local username, timestamps, counters and transfer sizes or states remain ordinary app-private database fields. Keep the normal password somewhere recoverable. CubeChat has no password recovery service.

**Lock now** immediately hides the mailbox. The default foreground idle timeout is five minutes. Choose 1, 5, 15 or 30 minutes, or manual-only while open. Leaving CubeChat locks it immediately by default. **Lock timing** also offers a background grace period of 30 seconds, 1 minute, 5 minutes or 15 minutes. A cold start always requires the password. Turn off username autofill in **Security** if you prefer to type it every time. Android share and invite intents pass through the same sign-in screen. Secure screens conceal credential entry from screenshots and recent-app previews.

**PURGE password** is optional and starts disabled. To enroll, enter the current normal password, enter a different PURGE password twice, and acknowledge the local reset. Use the standard sign-in screen to activate it. There is no second confirmation. Changing or disabling the PURGE password requires the normal password.

Activation first sends **“PURGE protocol activated by this user.”** to each currently connected conversation. The usual phone interface keeps the selected conversation connected. CubeChat attempts one write to each live connection in parallel and immediately requests the local reset when those writes finish. A blocked local radio write has a shared 150 ms limit across the entire announcement. A recipient never has to read or acknowledge the notice. An offline phone, broken link or stalled radio can miss the announcement. With no connected peer, the reset starts immediately.

Android then clears CubeChat’s local app data and closes the app. The next launch opens the initial pairing screen. This clears profiles, pairing keys, messages, encrypted attachment copies, settings and queued work across all local conversations. Each other phone keeps its history. Files already saved in Downloads or another destination remain with their owner.

**Pairing → Chat preferences** offers five text sizes (including 28 sp Accessibility) with a live preview, optional Enter-to-send and a keyboard privacy preference. Standard text size and multiline composition are the defaults. The app also asks compatible keyboards to skip personalized learning by default. **Use defaults** restores just these chat preferences.

## Send or receive a file

Open a conversation, tap **Files → Attach file**, and choose a document, photo or other file in Android’s picker. Both clients need CubeChat 0.1.3 or later to exchange files. Text and live ping still work with 0.1.2. Attachments use the conversation’s current connection and support files up to 8 MiB each.

Open **Files → All conversations · Transfer status** to review file offers, active transfers, stopped transfers and completed files from every conversation in one dashboard. Incoming offers appear first. Select **Needs my review** to see only offers waiting for your decision. Tap a file to open it in the correct conversation. Progress follows the selected conversation as it pauses, disconnects, resumes or finishes. **Refresh** rereads saved transfers across all conversations. When using CubeChat without a password-protected profile, rotating the phone restores the overview and filter in the same conversation. The main chat also shows a compact, tappable notice when a transfer completes, is declined or is canceled; tap it to open the file details. Pending incoming offers take priority over status notices. Notices are based on observed state changes, so opening CubeChat with existing completed files does not generate a flood of old alerts.

The recipient sees the proposed filename and size. Before showing a new offer, CubeChat checks the phone's available storage and its attachment vault allowance, accounting for other accepted incoming transfers and leaving room for SQLite/encryption overhead. When capacity is insufficient, the offer is declined automatically and the sender's file details show **Rejected: not enough storage on recipient** on updated clients. The receiver checks capacity again when **Accept file** is tapped, since free space may have changed. The **Files** screen displays device free space, the remaining budget for new incoming files, and CubeChat's 64 MiB attachment allowance across conversations; it refreshes the capacity reading when opened. This is a conservative preflight, not a filesystem allocation guarantee; a different app can still consume storage mid-transfer. **Accept file** starts the transfer. **Decline** discards the offer. Either person can pause, resume or cancel. If the connection drops or the app restarts, reopen the matching conversation on both phones. The sender resumes from the recipient’s last confirmed chunk.

**Transfer progress quality-of-life (development source):** Percentages are clamped to the file's valid byte range, and the progress bar retains one-tenth-percent precision. **100% transferred is not the same as delivered or verified.** Until the final confirmation is recorded, a sender sees **Awaiting delivery confirmation** and a receiver sees **Verifying received file** (when connected and unpaused); only the terminal completed state says **Delivered** or **Verified**. Low-storage notices distinguish whether the sender's recipient or the receiver's own device lacks space. A newly arriving incoming offer rejected immediately during storage preflight can raise a local notice even though it never appeared as an offer. Reopening a conversation does not replay historical failures. Transfer filenames in brief notices have control and bidirectional formatting removed and are length-bounded. The all-conversations transfer dashboard also remains navigable if its underlying Files dialog has been closed.

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

The development build uses the CUB3 native transport. It authenticates ephemeral P-256 key shares with the existing QR secret and pinned identities, then uses per-connection record keys for messages, attachments, and control records. This protects the session keys against later loss of pairing credentials, provided the ephemeral and session keys remain secret. Receipt acknowledgements follow a committed inbox write. The local Android Keystore protects keys, queued envelopes and message text at rest. The APK bundles both current and legacy-WebView builds of the same cube transform for offline operation.

Upgrade both endpoints and any repeater to use CUB3. Existing key cards and stored conversations carry across the upgrade. A development endpoint rejects the released 0.1.4 CUB2 handshake. Host-side verification uses temporary localhost sockets and in-memory streams. Independent phone and security review gates remain open.

## Build

Use JDK 17 and Android SDK 35. Run `./gradlew assembleDebug` from this directory (Windows: `gradlew.bat assembleDebug`). The output is `app/build/outputs/apk/debug/app-debug.apk`. For release use `assembleRelease`, then sign the aligned release APK with the project’s private signing key. Its public certificate SHA-256 is `7D:8A:D8:86:14:3D:7C:8E:95:1C:D2:8A:F2:BB:14:30:11:D4:98:B0:3B:C4:8E:C9:0A:9D:87:6D:9E:E1:78:77`.

To publish a signed build, put it at `cubechat-android/downloads/CubeChat.apk` and run `python3 scripts/release_manifest.py --write` from this directory with `ANDROID_HOME` set. Commit the APK, generated `release.json`, and matching Android version changes together. The CubeChat release workflow on `main` verifies the package, version and signer, then publishes the verified files on the versioned GitHub release. Update `RELEASE_NOTES.md` with the version, build number and user-facing changes before publishing. Increment `versionCode` for every update, including prereleases, and give each build a new version tag.

The 0.1.4 release includes `CubeChat.apk`, `release.json`, `RELEASE_NOTES.md`, `SHA256SUMS.txt`, and `CubeChat-Android-0.1.4-Source.zip`. The source archive contains the Android build and the canonical Cube engine it imports. To verify downloaded files from the release, run `sha256sum -c SHA256SUMS.txt` in their directory.
