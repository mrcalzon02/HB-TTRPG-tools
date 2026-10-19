# Beckenburg: ordinary Foley and horror stings — 2026-10-19

## Source library separation
**Ordinary physical interaction:** [Essentials Series — NOX SOUND](https://nox-sound-design.itch.io/essentials-series-sfx-nox-sound), credited to Nox_Sound_Design. The publisher explicitly licenses the 1,644-effect library **CC0**, including commercial applications. Full source archive is preserved, **not shipped**, in Beckenburg Drive as `Essentials_Series_NOX_SOUND.zip` (Google file ID `1or3AdIA2eEwBnjpPN26chQ-V46nVhJUv`, 1,036,374,981 bytes). The connected raw-file download currently fails at this size, so none of its actual recordings are approved or packaged yet.

**Supernatural:** `PS1_Horror_SFX_Vol1.zip.zip` (Google Drive file ID `1L2QOzThFPJL21qdVdap2lhrTfGnkfIYd`). Its 20 numbered WAV entries pass ZIP CRC validation. User's classification: **#1** tension buildup, **#5** an unsuccessfully opened/rattled locked door, **#2–4 and #6–20** generic supernatural stings. Original archive has no embedded license text. **Do not redistribute these twenty WAVs in a public build until redistribution rights are established.** Their classification is confirmed, their integration is pending.

## Active sound architecture
`LanSound.Cue` declares 34 descriptive, captioned sound types. `LanHost` chooses the actual spatial event only after the interaction is accepted and projects attenuated/panned sound without revealing private ghost coordinates. Castle/solo/UI use `GameSfx` with repeat throttling. `LanAudio` attempts a curated, recorded PCM WAV under `org/beckenburg/sfx/<lowercase-cue>.wav` and otherwise renders the existing synthesized effect. `RecordedSfx` handles panning/volume, caps the recorded effect to four seconds and avoids mutating decoded master clips. Music (`SoundtrackAudio`) and voice retain their own separate paths. This is an integration framework, **not a claim that NOX recordings already ship**.

| Context | Audio category / implementation |
|---|---|
| Floors and footsteps | STEP / FOOTFALL; choose wooden, tile, stone, gravel, metal and outdoor variants only after matching the actual ground material |
| Doors, van cargo, light switches, breaker | DOOR / VAN_DOOR / SWITCH / BREAKER; choose material-appropriate physical effects, not a spectral sting |
| Menu buttons, equipment selection, transactions | UI_CLICK / UI_BACK / SELECT / PICKUP; subtle low-priority feedback |
| EMF, thermometer, radios, lights, cameras, writing books | SCANNER / DEVICE_ON / DEVICE_OFF / CAMERA / BOOK; allow tier-specific variations in a later pass |
| Player medicine and body reactions | POTION / IMPACT; reserve human voice reactions for explicit character state changes |
| Hunt, manifest, attacks, rituals | STRIKE / SIGNATURE / MANIFEST / WARD / RITUAL_START / RITUAL_END / IMPACT; supernatural library or generated fallback |

## Source-precise importing

1. Preserve the entire original NOX ZIP in Drive. The file should be downloaded/extracted through a tool that can handle its ~1 GB size; no source member names are currently verified by this intake.
2. Run `python development/import_nox_foley.py --scan /path/to/Essentials_Series_NOX_SOUND.zip > development/nox-candidates.tsv` and review the reported filenames. The scan guesses **categories only**, never approves a recording for use.
3. Copy selected entries to `development/nox-selections.tsv`, using the exact tab-separated columns `cue` and `archive_member`. There is intentionally no fabricated selection in the committed mapping.
4. Run `python development/import_nox_foley.py --build /path/to/Essentials_Series_NOX_SOUND.zip --mapping development/nox-selections.tsv`. This reads only the selected ZIP entries, transcodes them with ffmpeg to 16-kHz 16-bit stereo WAV, caps at 3.8 seconds, and writes individual tracks plus SHA-256 provenance into `assets/runtime/sfx/`.
5. `build.cmd` and `build.sh` automatically copy only these approved individual WAVs into the shipped Java classpath. They do not copy the 1 GB upstream archive. Keep provenance alongside each curated selection.

## Verified regression boundary
Current complete 99-class application source compiled on Java 21 with `javac --release 17`. `SoundCoverageTest` passed all **34 cues**, codec determinism, captions, panning, effects volume and nonduplicating button/tab listeners. An actual sample 16-kHz PCM WAV probe passed recorded decoding, volume and pan; the selective Python importer passed `py_compile` plus fixture scan/transcoding. The synthetic fixture is only a test and **not** a real NOX source recording. No full installer, full integration-suite acceptance, acoustical listening evaluation or approval of upstream NOX file choices has occurred in this slice.

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
