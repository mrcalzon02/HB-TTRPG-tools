# Local equipment development — 2026-10-18

Baseline: clean `main` at `cf2b497a9b9caef905605bead34d10a8b399f803`.
Workspace was empty; the authorized repository was cloned locally. No existing
uncommitted work was overwritten. Java 17.0.12, Blender 5.0.0, Python 3.12.10,
Git 2.54.0 and Codex CLI 0.163.0-alpha.10.2 were located and version-checked.
The default Oracle Java alias stalled; builds explicitly use the installed JDK 17.

## Verified implementation slice

Sound recorder is available in the LAN equipment rack, including paid upgrades,
four-slot equip/switching, host-owned batteries, van service, start/stop input,
automatic recording limits, private playback, WAV export, automatic event logs,
and same-session reconnection. R records/stops; P plays/exports the latest clip
while holding the recorder. It captures the actual synthesized game cues that
the host projects to the investigator, with timing, amplitude and pan. It does
not capture microphone/voice-chat PCM. Ordinary silence remains silence.

| Tier | Clip length | Stored clips | Event budget | Audio | Pickup | Battery |
| --- | --- | --- | --- | --- | --- | --- |
| I | 8s | 2 | 32 | mono | 4m | 240s |
| II | 16s | 3 | 64 | stereo | 5.4m | 360s |
| III | 32s | 4 | 128 | stereo | 7m | 540s |

Old clips rotate out when physical storage is full. Data contains cue/pan/gain/
relative time, without hidden ghost identity or source coordinates. Playback
renders the same synthesized PCM and retains silence and overlapping events.

Three Blender models derive from the existing Exploration Objects recorder.
They add actual LCDs, controls, battery compartments, microphone grilles and
tier hardware. Geometry: 302/366/406 triangles, one mesh/material each,
256×128 texture atlas. Every GLB was reopened in Blender and rendered in Java.
The live LCD is projected onto its real face. Editable `.blend` files, production
script, source/output hashes and preview PNGs are under `development/assets/`.
Creator confirms CC0: https://elbolilloduro.itch.io/exploration-objects

## Baseline repairs

- Seven Kenney GLBs referenced absent external PNGs and unsupported material
  declarations. Exact CC0 archive textures are embedded; geometry/UVs retained.
  Identity UV declarations and unlit metadata are converted to renderer materials.
- J could open the journal but was blocked by the open-journal input guard.
- Intentional client exit could reset a TCP connection with unread inbound data,
  losing LEAVE and reserving the host instead of ending the match. Output now
  half-closes and input drains until host EOF, with a one-second fallback.
- Counter stock arrays had three seats despite six-hunter sessions. All six
  hunters now receive viewport equipment state and can use their instruments.
- Obsolete test contracts were replaced with stronger behavioral checks: PNG
  decoding and shutter pixels, ordinary numerical EMF with a log entry, current
  GEARUSE input, and rejection of a remote ritual at the actual anchor gate.
  Instruments do not certify evidence.

The clean baseline initially had six failing regression classes. Fixing asset
loading exposed a second obsolete assertion in GameplaySmokeTest. Full-suite
runs also exposed the intermittent TCP departure race; its new regression runs
twelve exits with pending unread traffic.

## Reproduction and evidence

Use `C:\Program Files\Java\jdk-17\bin` first in PATH, then run `build.cmd`.
The build compiles Java 17 source and packages actual models before testing.
To collect independent bounded results after compilation:

```
python development/run_local_regressions.py --java "C:\Program Files\Java\jdk-17\bin\java.exe" --project . --output build/final-regressions.json
```

Blender production:

```
"C:\Program Files\Blender Foundation\Blender 5.0\blender.exe" --background --python-exit-code 1 --python development/assets/build_recorders.py
```

Archive inventory is read-only: 18 archives, 8,656 archive entries, and 42 runtime
source models after this slice. The machine manifest preserves unknown geometry
and license fields; this is not a claim that all source-pack geometry is audited.
Original archives stay intact at the owner's library. The medieval pack remains
reserved for the future lobby.

Windows/Unix build scripts package identical selected model names and invoke the
same regression classes. Unix syntax is checked with Git Bash; a native Unix
execution and interactive audio-device acceptance are not claimed.

## Completion gate

`equipment-ledger.json` covers all 42 types / 126 stages. Fourteen tools are now
enabled in the LAN rack; 28 remain unavailable there. Existing enabled devices
still require their full physical/tier audits. The recorder is not integrated
into the separate legacy solo inventory. The overall equipment gate is **not
met**. Do not start roster/lobby expansion or label the catalog complete.
