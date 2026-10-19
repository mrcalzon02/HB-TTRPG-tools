# Beckenburg: ordinary Foley and horror stings — 2026-10-19

## Source library separation
**Ordinary physical interaction:** [Essentials Series — NOX SOUND](https://nox-sound-design.itch.io/essentials-series-sfx-nox-sound), credited to Nox_Sound_Design. The publisher explicitly licenses the 1,644-effect library **CC0**, including commercial applications. Full source archive is preserved, **not shipped**, in Beckenburg Drive as `Essentials_Series_NOX_SOUND.zip` (Google file ID `1or3AdIA2eEwBnjpPN26chQ-V46nVhJUv`, 1,036,374,981 bytes). The full source ZIP remains archived in Drive, **and its already-extracted folder is available at** `https://drive.google.com/drive/folders/1KXPb8nj1w8MwgWFVrZwkIj9Hafk06TZ-`. Do not redownload the ~1 GB ZIP. Direct individual extracted WAV retrieval is working, and eight original CC0 recordings are already packaged; the live weather beds below add two compact NOX recordings, and DEVICE_OFF reuses the complete on/off source without repeating the on sound.

**Supernatural:** `PS1_Horror_SFX_Vol1.zip.zip` (Google Drive file ID `1L2QOzThFPJL21qdVdap2lhrTfGnkfIYd`). Its 20 numbered WAV entries pass ZIP CRC validation. User's classification: **#1** tension buildup, **#5** an unsuccessfully opened/rattled locked door, **#2–4 and #6–20** generic supernatural stings. Original archive has no embedded license text. **Do not redistribute these twenty WAVs in a public build until redistribution rights are established.** Their classification is confirmed, their integration is pending.

## Active sound architecture
`LanSound.Cue` declares 42 descriptive, captioned sound types. `LanHost` chooses the actual spatial event only after the interaction is accepted and projects attenuated/panned sound without revealing private ghost coordinates. Castle/solo/UI use `GameSfx` with repeat throttling. `LanAudio` attempts a curated, recorded WAV under `org/beckenburg/sfx/<lowercase-cue>.wav` and otherwise renders the existing synthesized effect. JavaSound converts original 24-bit 48/96-kHz NOX recordings to the 16-kHz stereo playback format at runtime. Short mechanical clips are capped at one second to protect urgent audio latency. `RecordedSfx` handles panning/volume, caps the recorded effect to four seconds and avoids mutating decoded master clips. Music (`SoundtrackAudio`) and voice retain their own separate paths. The PICKUP, DEVICE_ON/DEVICE_OFF, DROP, SCANNER, ELECTRIC_HUM, EQUIPMENT, DOTS_MOTOR and MONITOR_HUM routes now use curated NOX recordings. All other unfilled NOX cue routes retain their procedural fallback. This is not a claim that all 1,644 NOX effects ship.

| Context | Audio category / implementation |
|---|---|
| Floors and footsteps | STEP / FOOTFALL; choose wooden, tile, stone, gravel, metal and outdoor variants only after matching the actual ground material |
| Doors, van cargo, light switches, breaker | DOOR / VAN_DOOR / SWITCH / BREAKER; choose material-appropriate physical effects, not a spectral sting |
| Menu buttons, equipment selection, transactions | UI_CLICK / UI_BACK / SELECT / PICKUP; subtle low-priority feedback |
| EMF, thermometer, radios, lights, cameras, writing books | SCANNER / DEVICE_ON / DEVICE_OFF / CAMERA / BOOK; allow tier-specific variations in a later pass |
| Player medicine and body reactions | POTION / IMPACT; reserve human voice reactions for explicit character state changes |
| Hunt, manifest, attacks, rituals | STRIKE / SIGNATURE / MANIFEST / WARD / RITUAL_START / RITUAL_END / IMPACT; supernatural library or generated fallback |

## Source-precise importing

1. Preserve the original NOX ZIP in Drive and **use the already-extracted folder** rather than downloading the archive again. Its `Sample_A_Sound_Effect`, `Nature_Essentials_NOX_SOUND` and `Electromagnetic_NOX_SOUND` folders contain verified WAVs; `Footsteps_Essentials_NOX_SOUND` currently shows named material folders but those child folders list no WAV files in this Drive snapshot. Do not claim a footstep source is ready until actual media exists.
2. Use the **already-extracted Google Drive sound library** directly. Select only source files that actually match the target game action; do not redownload or re-extract the source archive.
3. Copy selected entries to `development/nox-selections.tsv`, using the exact tab-separated columns `cue` and `archive_member`. There is intentionally no fabricated selection in the committed mapping.
4. For a new recorded cue, transcode the **selected extracted Drive WAV** (if necessary), commit the runtime-sized file to `assets/runtime/sfx`, and add a regression requiring it to decode. The original remains unmodified in Drive.
5. `build.cmd` and `build.sh` automatically copy only these approved individual WAVs into the shipped Java classpath. They do not copy the 1 GB upstream archive. Keep provenance alongside each curated selection.

## Verified regression boundary
The current isolated NOX/audio integration source compiled on Java 21 with `javac --release 17` after refreshing the newer MissionWeather and EvidenceSignals dependencies. `SoundCoverageTest` passed all **39 cues**, codec determinism, captions, panning, effects volume and nonduplicating button/tab listeners. Actual original 24-bit NOX WAVs for PICKUP and DEVICE_ON decoded and produced non-silent, bounded PCM directly from the staged Java classpath; the selective Python importer passed `py_compile` plus fixture scan/transcoding. The synthetic fixture is only a test and **not** a real NOX source recording. No full installer, full integration-suite acceptance, acoustical listening evaluation or approval of upstream NOX file choices has occurred in this slice.

## Source-owner horror classification and trigger routing

The owner's clarification overrides generic filename guessing:

| PS1 source WAV | Sound role | Gameplay trigger |
|---|---|---|
| #1 | `TENSION_BUILD` | Host transitions Ghost Frenzy into WARNING, once per accepted start |
| #5 | `LOCKED_DOOR_RATTLE` | A living hunter actually attempts to cross a *currently sealed* Frenzy extraction threshold; cooldown 18 authoritative ticks per seat |
| #2–4 and #6–20 | `HORROR_STING_A/B/C`, each with six recorded variants | Eighteen generic candidate stings, selected by authoritative event tick, during real accepted DISTURB / MANIFEST / SIGNATURE actions. No fabricated evidence |
| #1 / #5 | Reserved only for their designated special roles | Never choose these two in the generic random pool |

Do not use #5 for normal opening/closing doors: it sounds like a physically obstructed door being repeatedly attempted, not a regular door latch. Normal room doors and van cargo mechanisms remain DOOR/VAN_DOOR; ordinary Foley should come from verified NOX clips. Do not play a scary sting as evidence for a ghost type or disclose an unmanifested ghost's exact location. All world stings are projected using the existing quantized host sound packets and distance attenuation. The exact generic bank assignments are: A={2,6,9,12,15,18}, B={3,7,10,13,16,19}, C={4,8,11,14,17,20}. The importer exports `horror_sting_a_0.wav` through `horror_sting_c_5.wav`, and `RecordedSfx` chooses one of the six corresponding entries using a deterministic seed from the host sound tick. If only some variants are installed, it uses an installed candidate; otherwise the existing generated sound is played. All 20 source tracks are thus classified without inventing meanings for the generic stings. Tension/stings have deterministic PSX-style synth fallbacks when no recording is shipped.

**Local-only PS1 audition:** `python development/import_ps1_horror.py /path/to/PS1_Horror_SFX_Vol1.zip.zip --scan`, then invoke without `--scan` to prepare short 16-kHz WAV previews in `build/ps1-sfx-preview`. Source ZIP is not modified, exact numbered members and CRC are verified, and the SHA-256 provenance file records each selection. The importer deliberately prevents directing previews into `assets/runtime/sfx`. Shipping the user-supplied recordings requires explicit distribution-rights confirmation before enabling the importer release switches. The build continues using its complete synthesized fallback until then.

**Sound cue verification:** the full `SoundCoverageTest` enumerates the cue vocabulary, generates deterministic stereo PCM, checks captions and panning, verifies FX volume and listener idempotence. New horror cues are ordinary `LanSound.Cue` entries, so they are automatically included in this test; no UI-only fake playback is accepted as a test of network authority.

## Verified extracted NOX source-to-runtime assignments

| Runtime cue | Actual extracted Drive file | Media and provenance |
|---|---|---|
| `PICKUP` | `Essentials_Series_NOX_SOUND/Sample_A_Sound_Effect/Backpack_Small_Polyester_PickUp_Stereo.wav` (Drive `1Pnq6x86vO_HliVVMvCao2EiNZWZA63kS`) | 421,258 bytes; original PCM 24-bit stereo 96 kHz, 0.73 s; SHA-256 `06c60638ce536d75b1347e0bd8ee2ec06ad1c6495a28322fb652b3ec21bf7e53`. Bundled unchanged as `assets/runtime/sfx/pickup.wav`. |
| `DEVICE_ON` | `Essentials_Series_NOX_SOUND/Electromagnetic_NOX_SOUND/Electromagnetic_Smartphone_On&Off_Mono_Elektrousi.wav` (Drive `1siHkusUAMAiNaamTphmhVfVbVTFhEfC5`) | 1,155,094 bytes; original PCM 24-bit mono 48 kHz, 8.02 s; SHA-256 `af4f2f108e254d3acd41fcf1df86056748996f385762b865fa7ff0530d32b012`. Bundled unchanged as `assets/runtime/sfx/device_on.wav`, clipped to its first second **in-memory** for a short device-startup cue. |

No synthetic test fixtures were substituted for these two sources. They were read directly from extracted Drive files, committed as exact Git blobs, and are packaged by both platform build scripts. Both decoding tests passed on Java 21 targeting Java 17; a real-world Windows listening check is still outstanding. Additional physical cues, especially STEP / DOOR / SWITCH, keep procedural feedback until source recordings are available and verified. Do not assign unrelated ambient electromagnetic loops as footsteps or door knocks just to fill every slot.

## Additional Drive-derived integration (2026-10-19)

- `ambient_rain.wav` — Drive source `1j7tNbjmOZrkGNsyJp5BnJVn64JmmZUtX`, `Nature_Essentials_NOX_SOUND/Ambiance_Rain_Calm_Loop_Stereo.wav`. Optimized first eight seconds into 16-kHz, 16-bit mono with short seam taper: 256,044-byte WAV. Active for natural RAIN and as the rainfall layer under synthesized thunder.
- `ambient_wind.wav` — Drive source `1z2EpLKMzyKzaSlPwzHuUOo2gbQ1Arn6b`, `Nature_Essentials_NOX_SOUND/Ambiance_Wind_Calm_Loop_Stereo.wav`. Same optimization, 256,044-byte WAV. Active for WIND.
- `device_off.wav` — reuses the exact Git object and original source recording as `device_on.wav`, not a new independent NOX recording. Java skips to the later (four-second onward) segment so off does not repeat the initial on transient.
- `WeatherSoundscape.playbackSample` selects real rain/wind beds when packaged and otherwise preserves the original deterministic procedural climate sound, thunder layer, intensity, room shelter attenuation and independent FX volume/mute. No player connection to Drive is necessary.
- `RecordedWeatherTest` and `SoundCoverageTest` are mandatory in both standard build scripts. Snow and other unfilled climate types continue using honest procedural fallbacks.
- **Unfilled physical cues:** material-specific footsteps and everyday doors/switches retain synthesized audio. The extracted NOX footstep material directories are currently empty in the Drive listing; available non-NOX `.uasset` door/book files are Unreal assets rather than Java-playable WAVs and are not misrepresented as working recordings.
- The full original user-supplied PS1 horror archive remains in Beckenburg Drive. Generic stings and numbered tension/blocked-door assignment logic remain in code, but the public build does not distribute those tracks absent verified redistribution rights.
