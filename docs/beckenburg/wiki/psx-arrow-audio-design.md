# PSX Arrow Audio — Reusable Retro Sound-Design Reference

**Source:** owner-supplied **🏹 Sound Design_ The PSX _Arrow_ Aesthetic.pdf**, 9 pages, SHA-256 `a3bc12a57828c9ceecf4728f3adc8ba2b0c52051c41f92b298fc90acf24d55a0`. The document describes **arrow/projectile sounds**. Beckenburg does **not** acquire a bow weapon merely by absorbing this source. Generalize reusable sound design cautiously: a short ghost/tool/interaction sound may use some of the same synthesis/voice-budget techniques, but arrow gameplay is neither requested nor implemented by this reference.

## Source content and relevance
- **Pages 1–2:** PS1 SPU-era sample/voice budgets, VAG ADPCM, 11,025/22,050 Hz mono examples and a synthetic/filtered whoosh plus dry wooden impact transient. Use as **historical reference and optional retro-audio preset**, not a hard 512KB/24-voice limit in modern Java.
- **Pages 2–3:** envelope/pitch bend for perceived flight speed, impact body and separate shared reverb. Useful for an *asset-authoring preview* or a scoped arrow/throwable sound family in games that actually contain projectiles.
- **Pages 3–5:** ADSR envelope, pitch modulation, shared reverb send, voice stealing/priority, panning and sample-cache accounting. Adopt bounded queues and categories only where measured overload/voice masking exists; preserve critical proximity/evidence cues.
- **Pages 6–9:** the guide proposes dry source assets, optional DSP bitcrushing, modern procedural synthesis, reverb bus and a nominal four-voice projectile pool. Treat these as **creative presets**; they are not verified engine APIs nor universal acoustics rules. Its “zero RAM” description of procedural audio is figurative, not a literal memory-allocation guarantee.

## Existing Beckenburg ownership
`SoundVolumeEditor` already supports spatial volumes, falloff, pitch, gain, fade, loop and local audition. `SoundVolumeAudio`, `RecordedSfx`, `GameSfx`, `LanSound` and the audit documents under `docs/audio/` own audible playback/coverage. **Do not spawn another competing sound engine** from this PDF or erase real-source/provenance checks. The source does not prove that a new sound asset exists or that an arrow projectile should be added to the game.

## Proposed authoring-only PSX audio profile
A reusable audio-asset pipeline may support original WAV import, mono/downsampled *derivatives*, sample length/decoded-byte estimates, per-category voice priority, stepped pitch envelopes, 1–2 short transient layers, dry/wet audition and room effect routing. Preserve full-quality sources and metadata and leave voice cues/evidence audibility intact. Use opt-in 11.025/22.05kHz/8–16-bit export profiles; default gameplay should prefer **audible clarity**, not gratuitous clipping, distortion or physical-media wait screens. Any import must validate licensing, file size, sampling format, clipping and origin and must never execute embedded data.

## Specific adoption decisions

| Item | Decision | Rationale |
| --- | --- | --- |
| Short dry sounds, compressed derivatives, source-preserving import | **Adopt where applicable** | Small files, predictable loading and mix clarity |
| Separate whoosh/transient/impact and pitch variation | **Optional per game sound** | Relevant to arrows/projectiles; not required for EMF detector, UI or spirits |
| Authoring a shared reverb send and material/room presets | **Adapt to existing SoundVolume module** | One real audio authority with credible positional attenuation and material/door/weather differences |
| Voice priority and limit diagnostics | **Adopt with profiling** | Prioritize UI and gameplay-critical audio; no invented PS1 hard cap |
| Mono/subtitle/visual cues for essential evidence | **Mandatory accessibility consideration** | Retro aesthetics cannot deny players needed sensory information |
| Native VAG/XA conversion, exact PS1 SPU RAM maps, fixed 24 voices | **Reject as compulsory** | We ship Java/Windows, not Sony PS1 hardware |
| Intentionally broken clicks, hard cuts, 1-second stalls | **Reject by default** | Avoid unnecessary audio defects and user-facing latency |

## Acceptance
An authored asset must be playable in the same audio routing as the game before it is marked integrated. Test at least three listening conditions: close/front, behind walls/door, and from the van; use existing simulation/event sound semantics and don't render remote camera/audio streams when no listener is consuming them. Profile concurrent sound load. Audio style/quality diagnostics are advisory; build/launch and genuine missing **essential** audio behavior may block a release when functionality truly fails.
