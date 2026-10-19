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
