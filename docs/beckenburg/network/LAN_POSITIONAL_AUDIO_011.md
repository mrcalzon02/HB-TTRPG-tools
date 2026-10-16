# Beckenburg Alpha 1.7 — Positional Paranormal Audio

## Implementation scope (verified only by the tests named below)

The LAN host emits `SOUND|CUE|PAN|VOLUME|TICK` packets **only to eligible 3D hunter seats** after an accepted WHISPER, DISTURB, MANIFEST or STRIKE action. When an AI ghost physically moves while manifested, it can generate a sparse FOOTFALL cue. The packet is computed from the authoritative ghost pose, the receiver's body heading, door/masonry attenuation and distance. It carries coarse 25%-step stereo pan and gain, **not the ghost's exact world coordinates**. The human ghost receives no SOUND event and never gains hidden hunter observations through this feature. Sound projection does not affect ghost-command energy, damage, cooldowns or persistence.

The client generates short original sounds as bounded 16 kHz stereo/16-bit PCM using deterministic synthesis: whisper, displaced object, spectral manifestation, impending strike and spectral footfall. A single daemon audio worker handles playback off the Swing EDT using a bounded queue. If a sound device cannot open, the game continues without audio. Set `-Dbeckenburg.audio.mute=true` for silent play. No external sound files, native codec packages, runtime downloads or license dependencies are required.

Every event also produces a high-contrast on-screen caption with approximate direction. The caption remains functional with sound disabled or absent, expires after 20 simulation ticks and never exposes a hidden coordinate. Strike telegraphs and manifested-entity warnings retain visual priority.

## Test and release requirements

- `LanSoundTest`: quantized directional projection, van exclusion, invalid source/bad packet rejection, deterministic PCM, left/right gain and volume amplitude
- `LanSoundIntegrationTest`: four real sockets; only audible world-mode hunter receives WHISPER sound; van listeners and ghost receive none
- `LanSoundHudTest`: Swing on-screen caption visible with mute enabled and expires on subsequent server ticks
- Existing acoustic, ghost/AI parity, timed combat, LAN, physics and rendering tests remain release gates.

## Explicit incomplete work

These are deliberately synthesized provisional cues, not final authored sound effects. They do not include multi-material reverberation, voice recording, authored footsteps for all surfaces, surround audio devices or per-ghost signature packages. Physical Windows sound hardware, speaker output, multi-PC LAN timing and full in-game accessibility acceptance remain unverified. Original concept art and final 3D models are not yet integrated. This is **not** an alpha/beta production completion gate.
