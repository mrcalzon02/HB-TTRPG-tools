# Beckenburg authored music — runtime soundtrack

Sources: the six original MP3 files in the [Beckenburg music Drive folder](https://drive.google.com/drive/folders/1yR0oo_DSMWZ82PeqIsTISw9tzqwXjg5d). Originals are preserved in Drive. These repository files are *derived* ZIP containers holding Java Sound-compatible 22,050 Hz mono G.711 U-law WAV. They are not the MP3 originals, and no third-party MP3 decoder is needed at runtime.

| Runtime ID | Source filename | Game rule |
| --- | --- | --- |
| `castle-candlelit-shadows` | `Candlelit Shadows(castle).mp3` | Castle lobby exclusively |
| `hunt-final-surge` | `Final Surge(hunted).mp3` | Host-authorized aggressive hunt window |
| `ritual-of-ash` | `(The Ritual)Of Ash.mp3` | Accepted post-identification ritual start (alternates with next track) |
| `ritual-final-strike` | `(The Ritual)-Final Strike.mp3` | Next accepted ritual start |
| `ambient-cold-unresolved-drone` | `Cold Unresolved Drone.mp3` | General field ambience |
| `ambient-sombra-profunda` | `Sombra Profunda.mp3` | Alternate field ambience |

**Playback priority:** hunt > ritual > field ambience. The castle never plays field or hunt music. Closing or hiding a view suspends that view's music; gameplay sound effects and LAN voice remain on separate audio paths. A host-accepted `RITUAL|STARTED|...` starts ritual music, `RITUAL|BROKEN` or result ends it. The hunter 3D panel also restores an in-progress rite when reentered. The host sends `HUNT|START|duration` after an *applied* ghost STRIKE and `HUNT|END` when the 70-tick aggressive window closes. This is the current authoritative hunt-music window; a future extended chase-state system can expand the trigger without a soundtrack rewrite.

The original music licenses / author warranties have **not been independently reviewed**: treat these as user-supplied project audio approved for private development/testing, and verify rights for any public redistribution.

The two ritual ZIP files are stored as `.zip.0` and `.zip.1` pieces because the connector could not reliably accept the 3.4–3.6 MB binary blobs in one write. `SoundtrackAudio.archive` restores an in-memory input stream by concatenating the pieces, not extracting untrusted content to disk. Existing archive contents are bounded to one named WAV, max 8 MiB.

The eight binary runtime blobs in this folder were verified byte-for-byte against the locally converted sources via Git blob SHA. Both `build.sh` and `build.cmd` copy these files to `org/beckenburg/music` in the packaged JAR. `SoundtrackAudioTest` checks all six WAV decoders and scene priority without an audio device.

## Other horror sound effects (not imported into the music bus)

The separate source pack [Essentials_Series_NOX_SOUND.zip](https://drive.google.com/file/d/1or3AdIA2eEwBnjpPN26chQ-V46nVhJUv/view), in the Beckenburg Project Drive root, is a **candidate effects library**, approximately 1.04 GB. It remains outside this repository and has not been audited for contents, license, suitability or duplication. Cataloging, selective conversion, and triggers for manifestations, ghost attacks, ambience accents, ritual failures, doors and equipment belong to a later sound-effects pass. Music never replaces positional effects or communications.
