# CubeChat Android development ledger

This ledger tracks the work from the single-conversation Android APK to a messenger with attachments, selectable delivery routes, local profiles, conversation retention controls, and organization forums. The starting point is [Android 0.1.1, build 2](https://github.com/mrcalzon02/HB-TTRPG-tools/releases/tag/cubechat-android-v0.1.1).

## Android 0.1.3, build 4

The [0.1.3 release](https://github.com/mrcalzon02/HB-TTRPG-tools/releases/tag/cubechat-android-v0.1.3) adds attachments to direct conversations. The sender picks a file through Android. The recipient sees its name and size and must accept before any file contents are sent. Both phones can pause, resume or cancel. The receiver verifies the result before offering export to a user-selected destination.

[Two-device file transfer and offline radio acceptance](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/44008199653) · [Attachment vault regression](app/src/androidTest/java/org/cubechat/android/AttachmentStorageChecks.java)

## Android 0.1.2, build 3

The [0.1.2 release](https://github.com/mrcalzon02/HB-TTRPG-tools/releases/tag/cubechat-android-v0.1.2) adds direct contacts, local nicknames, searchable conversations, queued counts, per-contact encrypted drafts, Android text sharing, search within the newest 200 messages, a live end-client ping, and optional screenshot and Recents protection. Migration keeps the original paired identity, keys, messages and outbox. The active conversation owns the network connection. Both phones open the matching conversation for delivery.

[Two-device upgrade, messaging and privacy acceptance](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/44006544741) · [Android storage migration regression](app/src/androidTest/java/org/cubechat/android/ContactStorageChecks.java)

**Next work** covers the local credential-protected vault (CC-03), per-send route selection (CC-05) and cellular delivery (CC-06). With multiple contacts and independent sequence counters in place, expiration still needs an authenticated way to skip unsent messages and a defined clock policy.

## Starting behavior in 0.1.1

| Area | Android 0.1.1 behavior |
| --- | --- |
| Pairing and text | One paired conversation per installation. One offline QR scan imports the actual A→B and B→A keys. The same QR opens an install page if the app is missing. Text is limited to 4,096 UTF-8 bytes. Replacing the pairing clears local history. |
| Delivery | Local Wi-Fi/hotspot, Wi-Fi Direct, Bluetooth Classic and manually configured chains of one to four live Wi-Fi forwarders. The selected route applies to the chat. A recipient acknowledges after decrypting and committing a message. Connected peers already exchange heartbeats. |
| Storage | Android Keystore protects the key used to encrypt pairing material, message bodies and pending envelopes. SQLite stores direction, timestamp, sequence and delivery state in readable columns. The manifest disables app backup. Opening the app does not ask for a CubeChat password. |
| Updates | The updater considers published releases and prereleases by Android build number. The user opens the download and confirms installation. Offline chat and QR import work independently. |
| Earlier prototypes | The browser project has a multi-contact host, media fixtures and a self-hosted plaintext forum with boards, threads and replies. These are references for Android development. The prototype forum stores readable posts and accepts unverified display names. |

[Android behavior and wire profile](README.md) · [Android message store](app/src/main/java/org/cubechat/android/ChatStore.java) · [Delivery and receipts](app/src/main/java/org/cubechat/android/PeerLink.java) · [Browser forum and key handoff prototypes](../docs/cubechat-lan-development.md)

## Work ledger

**Shipped** identifies a released capability. **Extend** means part of an item is available. **Planned** means the user-facing capability is outstanding. The order within each section is a proposed build order. When an item ships, record its APK tag, commit and acceptance evidence beside the item. A changed UI or a passing unit test alone does not establish two-phone behavior.

### Local profiles, contacts and storage

| ID | Capability and status | Acceptance on Android |
| --- | --- | --- |
| CC-01 | **Direct contacts and conversations · Shipped in 0.1.2.** Each paired contact has separate keys, history, outbox, route preference and encrypted draft. Local aliases are independent of the peer fingerprint. Group membership and retention controls remain with CC-09–14. | Upgrade a populated 0.1.1 install, scan a second contact and switch between both. Deliver and reply on each, including after restart. The first contact's keys, queue and history survive. A duplicate scan opens the existing conversation. |
| CC-02 | **Replay protection through deletion · Extend.** 0.1.2 migrates the send and receive counters for each pairing out of the visible message rows and advances them atomically. Define how abandoned or expired queued messages are skipped without blocking later messages. | Expire the newest received message and an unsent message between two queued sends. Reconnect, retry a previously received envelope, then send another message. The expired items stay gone and the next message arrives exactly once. A restarted volatile session uses fresh session keys. |
| CC-03 | **Local username, password and encrypted vault · Extend.** Support creating a local profile, signing in offline, changing the password, locking manually and locking after inactivity. The password gates access to the vault keys. Protect contact and thread metadata, attachments and pending work along with message bodies. Preserve physical QR pairing independently of online accounts. | Create two local profiles. A wrong password, notification or incoming intent cannot reveal either profile's data. Unlock the intended vault after a reboot in airplane mode. Change its password, test the old and new credentials, and interrupt a 0.1.1 migration to verify safe recovery. |
| CC-04 | **Duress password · Planned.** The proposed default is a second password that opens a separate decoy vault from the ordinary sign-in screen. Enrollment is optional. The primary vault stays sealed. Enabling this feature does not silently enroll the user in erasure or alerting. | Configure normal and duress credentials. Try both, a wrong password, then the duress credential again after restart. Each correct credential opens only its own history, keys, badges and settings. A real incoming message, Recents or a notification must not expose the primary profile while the decoy is open. |

### Sending, reachability and files

| ID | Capability and status | Acceptance on Android |
| --- | --- | --- |
| CC-05 | **Choose a route per send · Extend.** 0.1.2 remembers the route for each contact. Add the individual message or attachment override. Offer local Wi-Fi/hotspot, Wi-Fi Direct, Bluetooth, local relay and, when available, cellular data. Show the selected route, the route actually used and why a send is waiting. Only a user-selected fallback may change a pinned route. Coordinate queue scheduling with CC-02 so an unavailable route cannot stall a different one. | Queue one Bluetooth-only message and one Wi-Fi-only message to the same contact. With only Wi-Fi available, deliver the Wi-Fi item. Restore Bluetooth and deliver the waiting item once over Bluetooth. Repeat across restart and verify that an available cellular connection carries neither item. |
| CC-06 | **Cellular delivery · Planned.** Add a reachable internet rendezvous or encrypted forwarding service and explicit mobile-data selection. Keep the CubeChat encryption profile end to end. Show data use before large metered transfers. The service operator, endpoint configuration and offline queue lifetime are open design decisions. | Exchange messages in both directions between phones on independent cellular networks with Wi-Fi and Bluetooth off. Verify the mobile interface used, that the forwarder lacks conversation keys and that a dropped connection retries once connectivity returns. Disabling cellular for the conversation prevents chat traffic on it. |
| CC-07 | **Ping a contact · Shipped in 0.1.2.** A user-triggered check asks the paired client for a fresh reply on the selected route. Older clients continue to exchange text and cannot answer this probe. Show route, round-trip time and when the check ran. A timeout means “no reply on this route.” Keep receivability, message delivery and optional read receipts distinct. | Ping a reachable peer, a disconnected peer and a live relay with its far-end client offline. Only a fresh matching reply from the paired client shows reachability. A stale reply, an old heartbeat or a relay acknowledgement cannot turn the contact online. |
| CC-08 | **Encrypted file attachments · Shipped for local routes in 0.1.3.** The Android picker, 8 MiB file limit, pending offer, accept/decline, progress, pause/resume, cancel, verified completion and explicit export use the active conversation and encrypted vault. Cellular and future volatile-mode support depend on CC-06 and CC-11. | Transfer a photo and a multi-chunk binary over Wi-Fi and Bluetooth, then cellular when CC-06 ships. Interrupt and resume, verify byte-for-byte equality and a single received item. Decline, cancel, tamper with a chunk and exhaust storage. No rejected or incomplete file appears as received. |

### Conversation security

| ID | Capability and status | Acceptance on Android |
| --- | --- | --- |
| CC-09 | **Timed expiration · Planned.** Select a lifetime per conversation or message. Label the timer origin. The proposed timer starts at send time. Carry the deadline in the authenticated message and apply it to pending sends, notifications, attachments and previews. | Test both phones online, one offline past the deadline, devices restarted and clocks in disagreement. An expired item cannot be delivered late or reappear after retry. Show how the client handles an uncertain clock before promising an expiration time. |
| CC-10 | **Secure deletion · Planned.** Working interpretation of “secured lead functions.” Offer explicit delete-message and delete-conversation controls. In persistent mode, use a key lifecycle that makes deleted content unreadable without affecting surviving messages. A peer deletion request may report pending, acknowledged or unsupported. | Delete one attachment and one thread. Inspect the vault, journals, partial files, previews and pending queues, then restart and attempt recovery with surviving keys. Other conversations still decrypt. Record the scope of cryptographic erasure separately from physical flash sanitization. An offline peer or user-exported copy is never reported as erased. |
| CC-11 | **RAM-only conversation · Planned.** Choose this mode before creating or importing the session. Both endpoints must support it. Hold session keys, text, drafts, queued sends and permitted attachments in volatile memory. Use a fresh session after loss of process state. Show “received in memory” on acknowledgement. Refuse a persistence-only peer or relay and oversized attachments before leaking content to disk. | On two phones, send distinctive text and a file, receive, background, disconnect and retry. Trace all app-controlled writes, including encrypted writes, and inspect SQLite/journals, WebView state, saved UI state, crash logs, previews and export paths. Force-stop, cold-start and power-cycle both phones. Neither phone restores the conversation, keys or queue. Repeat with an old client and a disk-backed route. |

The proposed RAM-only guarantee covers every CubeChat-controlled write of session content or session keys on a supported path. This includes encrypted temporary files. The strict mode should use the in-app scanner and suppress clipboard copying, notification text, screenshots, Recents previews, keyboard learning and automatic media export. A photographed card, an existing source file, another person's camera, a modified peer, and storage controlled by the OS or an external keyboard are outside that claim. Identify tested devices, Android versions and remaining platform limits before advertising stronger guarantees.

### Social features and physical organization keys

| ID | Capability and status | Acceptance on Android |
| --- | --- | --- |
| CC-12 | **Chat and social controls · Extend.** 0.1.2 includes a searchable conversation list, local names, pending counts and local message search. Add unread counts, threaded replies, mute and block. Make read receipts and presence sharing optional per conversation. | Use three clients with two active threads. A reply and unread badge land in the correct thread. A muted chat stays quiet, a blocked peer cannot surface new chats or pings, and disabling read receipts leaves delivery receipts working. |
| CC-13 | **Organization forums · Planned.** Add organization membership, boards, topics, replies, announcements and pinning. Define owner, moderator and member permissions. Authenticate individual authors and privileged actions independently of possession of the shared reading key. Reuse the browser forum's interaction model where useful. | An owner pins an announcement, a member replies, and a moderator handles a post. A member cannot impersonate the owner or approve a rotation. Offline readers synchronize authorized posts once after reconnecting. A removed member with only previous keys cannot read new-generation posts. |
| CC-14 | **Physical organization QR renewal (QRL) · Planned.** From the organization forum, an authorized administrator can generate, display or print the new key card for posting at a controlled physical location. The organization board can pin a renewal notice with generation, effective time and collection location. The posted physical QR carries the actual new key. A member scans once, offline, and the app imports it into the existing organization. | With the network off, two members scan the replacement card and one member keeps only the old card. Scanning twice changes nothing. Reject a rolled-back or unauthorized replacement of an established organization key. The two updated members exchange new-generation posts. The old-key phone cannot decrypt or submit accepted new posts until it receives the new card. |

Possession is the membership mechanism for the physical card. Anyone who obtains a copy obtains the keys it carries, including a former member who can still reach the posting location. A forum renewal notice can be readable under the old key. It must carry no new key or scannable copy. Rotation protects future traffic. Previously delivered history follows its original retention policy.

## Build sequence and verification

| Milestone | Deliverable |
| --- | --- |
| 1. Preserve existing conversations | CC-01–03. Exercise upgrade, offline unlock, an interrupted migration and message numbering after removal. Build the route picker and ping alongside this work (CC-05 and CC-07). |
| 2. Deliver data on the chosen route | CC-06 and CC-08. Use two physical phones for carrier and radio tests. Record sender queue state, actual route, end-client receipt and attachment hash. |
| 3. Add conversation security controls | CC-04 and CC-09–11. Test persistent and volatile clients against each other. Record the observed scope of deletion, password isolation and RAM-only writes for each supported configuration. |
| 4. Bring organizations online and offline | CC-12–14. Run a three-member forum through a real physical key change, offline posting, role enforcement and reconnection. |

Each milestone keeps the existing one-scan QR invite, local two-way messaging during an outage, and user-confirmed APK updates in its regression checks. No release number has been assigned to a milestone.
