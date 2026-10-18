# Beckenburg — Hardware, Accessibility, Graphics & Menu Options Standard

**Status:** Normative design and verification guidance; **not** a claim that the options are implemented.  
**Adoption:** 2026-10-17. Windows-first Java 17 Beckenburg; game-specific companion to [Game Development QoL and Design Philosophy](GAME_DEVELOPMENT_QOL_AND_PHILOSOPHY_STANDARD.md), [Technical Architecture](technical-architecture.md), [Production Plan](RELEASE_PRODUCTION_PLAN.md), and [Quality Gates](QUALITY_GATES.md).

> **Design rule:** Offer the widest *genuinely supported* choice of controls, disability accommodations, audio and rendering options without filling menus with inert toggles. Every exposed option must alter the real subsystem, persist, survive recovery, and be tested in a representative environment. An inaccessible settings screen is itself a release blocker.

## 1. Authority, implementation statuses and non-negotiables

Beckenburg currently has a Java 17-targeted Swing/software-rendered prototype. Its production 3D engine and shader feature set are not yet accepted. **Do not suggest an OpenGL/Vulkan/DirectX feature exists simply because an options catalogue lists it.** The 3D renderer decision is governed by Stage P01; settings/accessibility and final polish by P02/P25; long-session validation by P27. The game must not introduce a second simulation or alter ghost information rules to accommodate graphics quality.

Each option carries an implementation state:

- **BASE:** required now where the current Java/Swing surface can deliver it and tested through actual game pathways.
- **RENDERER:** mandatory *if* the eventual production backend exposes the capability reliably on supported hardware; gate on engine/API/driver and test it before revealing it.
- **OPTIONAL:** quality-enhancing effect/assist; implement only if there is genuine UX or measurable performance benefit and a tested fallback.
- **UNSUPPORTED:** unimplemented, unavailable, unsafe or unsupported on detected hardware; **never exposed as a functioning toggle**. Internal design lists and external documentation may describe it as planned, but functional menus must not.

No single checkbox stands in for the required disability support. Different players need independent accommodations. Accessibility settings must be usable before starting play, persist across sessions, and not require hearing, fine motor input or color discrimination merely to reach the accommodations.

## 2. Hardware and operating-system support

### H-01 — Detection without compulsory telemetry
At startup, detect relevant capabilities locally when APIs allow: operating-system family/build/architecture; actual Java/runtime architecture and version; graphics renderer/backend and version, GPU name, driver and capabilities; display/monitor enumeration, usable work areas, native dimensions, refresh, scaling/DPI and color support; CPU logical cores; permitted heap/system-memory estimates; audio playback/capture devices; supported controller device IDs and available input axes. Treat missing values as **unknown**, not fabricated. Avoid collecting serial numbers, unique IDs or unrelated processes. No remote reporting without clear user consent.

### H-02 — Support tiers, not fictional minimum specs
Publish separate **minimum, recommended and tested** configurations only after representative Windows hardware and drivers have passed the corresponding build. Record CPU, GPU/driver, RAM/heap, storage, Windows version, physical screen resolution, renderer API and actual sustained FPS/1% lows. A proposed Intel integrated-GPU profile and low-memory preset are useful targets, **not verified compatibility promises**. Windows is the release target; Linux and macOS are experimental unless separately supported and tested. Avoid inventing precise OS versions, driver minimums or universal FPS guarantees.

### H-03 — Runtime and software dependencies
Provide a bundled or clearly supported Java 17 runtime, deterministic launch, actionable missing-library/driver diagnostics, and clean install/uninstall. Local profiles, saves, logs and caches have documented paths and permissions; never silently require administrator rights. Support offline solo play and LAN host/join without external accounts, a cloud server or background updater dependency. Client/server version mismatches explain safe remediation.

### H-04 — Desktop hardware flexibility
High-DPI and mixed-monitor scaling; laptop/desktop window placement; windowed, borderless and exclusive fullscreen **only where verified**; focus/alt-tab recovery; unplugging a monitor; changing default audio devices; keyboard/controller hotplug; mouse capture/release; sleep/resume and display topology changes should not corrupt settings or strand the player. Unsupported modes should fall back to a safe visible window.

### H-05 — Diagnostics and privacy
Provide an optional compact local **System & Diagnostics** screen: selected renderer, supported feature level, resolution/display, FPS/frame-time, simulation tick timing, heap/graphics-memory usage when measurable, network latency/jitter, asset validation and driver issue hints. Copy/export a support report **only after a deliberate user action**, with a preview of exactly what data is included. Never include passwords, IP address/session tokens or chat/voice payloads by default. A diagnostic label is not a substitute for a tested fix.

## 3. Comprehensive settings navigation — compact, not sprawling

Use one **Settings** destination with a persistent search/filter and a compact vertical category selector, not twelve separate title screens or explanation cards. Categories: **Display | Graphics | Accessibility | Audio | Controls | Gameplay | Network/LAN | Diagnostics**. Relevant summary values and brief tooltips fit on the same row as controls. Long option catalogues use searchable, scrollable subsections with sticky subheadings. There is one consistent Back/Escape behavior and a mouse/keyboard/controller path to every critical field.

**Required menu behaviors:** option value visibly updates; original, pending and applied values distinguished; immediate-safe settings preview live; expensive settings apply explicitly; show a brief restart-required reason only when true; reset individual option/group/all; preserve user profiles and device-local overrides; no save button that silently discards changes. Confirmation for risky display changes is time-bounded (e.g. 15 seconds) with automatic reversion to the last-known-good configuration. A safe launch flag or startup recovery path resets display/graphics/input without deleting progress. Changes that fail to initialize revert atomically and explain why. Keyboard focus and scroll do not steal movement input after returning to gameplay.

Search terms and screen-reader accessible labels refer to the same option IDs. Text scale and high-contrast controls must be reachable *before* the main menu is fully usable. Provide a compact beginner preset and an **Advanced** expander without hiding critical disability options behind an expertise gate.

## 4. Display settings catalogue

| Setting | Requirement / exposure gate |
|---|---|
| Monitor/display selection | RENDERER/BASE as backend supports; recover when selected monitor vanishes |
| Screen mode | Windowed, borderless, exclusive fullscreen only when individually proven |
| Resolution and refresh rate | Filter to modes actually enumerated and available; reversible preview |
| Window sizing | Resizable window, minimum readable bounds, DPI-aware layout, aspect preservation |
| Render scale | Independent internal scale, with sharp UI at native resolution where possible |
| Dynamic resolution | Optional adaptive floor/ceiling/target frame-time; avoid oscillating quality |
| Upscaling/filter | Nearest/bilinear and renderer-appropriate advanced scaler **only if implemented** |
| Frame pacing | VSync, supported swap policy, frame limiter (e.g. 30/60/uncapped only as useful), VRR behavior where tested |
| Brightness/gamma | Accessible scene controls that do not destroy necessary evidence or disappear in borderless mode |
| UI scale | Independent HUD/menu scaling, safe areas, ultrawide and text-overflow handling |
| FOV & camera distance | Tested first-person field-of-view; independent options for weapon view/aim if supported |
| Aspect ratio | Never stretch perspective; preserve correct pointer-to-render coordinate mapping |
| Color output | HDR/SDR only if display, backend and tone mapping genuinely support it |
| Color calibration | Simple reference ramp and gamma/black-level calibration; clear reset |
| FPS overlay | Optional lightweight internal diagnostic with unobtrusive placement |

**Do not** include unsupported display modes, HDR, vendor-specific upscalers or ray tracing simply to make the menu look complete.

## 5. Rendering, shaders and visual-performance catalogue

A wide selection is desirable; each item is separately benchmarked and feature-detected. Defaults are conservative and safe. Graphics presets **Low / Balanced / High / Custom** are useful entry points, but **Custom must preserve per-option values** and presets may not silently override accessibility preferences.

| Family | Specific adjustable options (render only when genuinely implemented) |
|---|---|
| Geometry | Draw/view distance; object LOD distance/bias; prop density; vegetation/detail density if applicable; dynamic occlusion/culling diagnostic |
| Textures | Texture resolution/budget; filtering (nearest/bilinear/trilinear); anisotropy up to backend limit; texture streaming or upload budget |
| Lighting | Quality and count of dynamic lights; static/baked versus dynamic where design allows; light shafts; volumetric-light quality; exposure/auto-exposure toggle |
| Shadows | On/off, resolution, distance, filtering softness, contact shadows and number of cascades if backend supports each; shadow-casting light count |
| Ambient effects | SSAO/HBAO or equivalent (only if actual implementation), ambient intensity and radius without making environmental clues invisible |
| Fog/volumetrics | Fog quality, raymarch samples, volumetric resolution, distance and dithering with visibility safeguards |
| Reflections | Screen-space reflections, reflection-probe quality, wet surface effects when actual materials require it |
| Edges/upscale | MSAA/FXAA/TAA only when backend supports; avoid mislabeled AA, TAA ghosting and unreadable tiny evidence |
| Particles | Particle count, transparency complexity, smoke/fire density, decals and cosmetic debris |
| Post processing | Bloom strength, vignette, chromatic aberration, depth of field, motion blur, film grain, screen-space distortion, color grading, sharpening |
| Shadows and silhouettes | Visibility priority for playable ghost tells, hunter outlines when legal, flashlight/readable-ritual cues; never performance-hide gameplay information |
| Retro styling | Optional pixel quantization, ordered dithering, low-color palette, CRT/scanline, posterization only if stylistically appropriate and readable |
| Debug/preview | Frame-time graph, shader compile report, renderer/capability list, texture usage and a controlled graphics comparison preview |

**Accessibility-safe defaults:** motion blur, camera shake, aggressive depth-of-field, chromatic aberration, strong vignette, flicker, extreme contrast/bloom and chromatic/color-only evidence encodings **off or conservative** by default. Cosmetic darkness is negotiable; the ability to perceive a genuine mechanically required signal is not. Turning down particles/fog/shadows may not confer hidden-information cheating in asymmetric LAN gameplay; restore essential tells through gameplay-independent readable effects.

**Performance invariants:** never vary hitboxes, authoritative AI visibility, evidence identity, movement simulation, damage or ghost actions with graphical quality. Throttle GPU effects, not authoritative physics or network decisions. Record GPU/CPU bottlenecks before creating a setting that has negligible benefit. Shader cache/compile errors must offer safe fallback, not strand the player at a black screen.

## 6. Disability and inclusive access — independent, specific accommodations

### A. Vision, contrast and reading
- UI text scale distinct from subtitles, HUD labels, inventory text and cursor scale; scalable fonts must wrap and never clip critical buttons.
- Strong high-contrast mode; readable outlines; adjustable text backgrounds/opacity; larger icon and interaction prompt targets.
- Color blindness accommodations **with icon, shape, pattern and text redundancies**; a color-filter preset alone is insufficient.
- Reticle shape/color/size/thickness/contrast; visible focus ring and keyboard navigation order.
- Simplified/low-vision map with clearly labeled floor, doors, exits, teammates and accessible evidence, respecting hidden-information rules.
- Optional font choice/dyslexia-friendly spacing where available; line spacing and text speed; pause to read instructions.
- Screen-reader-compatible standard launcher control labels/focus order via Java accessibility interfaces when supported; game HUD textual equivalence and optional local text-to-speech **only after tested speech APIs**.
- Avoid small grey-on-grey tooltips, forced all-caps paragraphs, flashing objective text and timers that expire while the player is reading.

### B. Hearing, deaf/hard-of-hearing support and audio processing
- Subtitles for speech, tutorials and cinematic dialogue **enabled by default** before opening narrative content; speaker identification and adjustable size/background.
- Closed captions for relevant footsteps, door sounds, electronic meters, EVP/ghost warnings, directional threats and ritual cues; label intensity/direction or relative location without exposing secret ghost coordinates.
- Independent Master/Music/Effects/Ambience/Dialogue/Voice Chat sliders and functional mute; preserve a visual alert route when sound is muted.
- Dynamic range presets (night/quiet/normal/wide), dialogue priority, mono-mix and optional stereo balance when supported; limit sudden loudness.
- Configurable visual sound indicator/HUD cues with **same permitted perceptual information** as audible events. No hearing-only required evidence.
- User-controlled microphone push-to-talk/toggle, input/output device, self-test/level/mute and voice privacy; no forced microphone for solo play. Caption incoming LAN voice chat only if a real, consent-aware transcription component exists; do not promise automatic transcriptions otherwise.
- Reduce harsh frequency/squeal effects without disabling critical evidence; expose an audio-sensitivity preset if designed and tested.

### C. Mobility, dexterity, motor coordination and input accessibility
- Complete action-level remapping for keyboard/mouse and supported controllers, including separate bindings, input conflicts, reset and export/import where practical.
- Hold/toggle choices for sprint, crouch, aim, flashlight, voice and sustained instrument use; configurable double-click speed and repeat/hold durations if used.
- One-click interactions and an optional larger interaction cone/hotspot for solo/co-op interaction; avoid pixel-perfect targets.
- Adjustable mouse sensitivity X/Y, inversion, smoothing **off** by default, acceleration **off** by default, gamepad dead zones, curve and stick inversion.
- Allow keyboard and controller inputs simultaneously through a source-aware action multiplexer; releases cannot cancel other held input sources.
- Controller families: Xbox, PlayStation, Steam and generic SDL/HID-style mappings where an actual runtime path works; detectable hotplug/disconnect with safe rollback.
- Optional rumble intensity/off (never sole indicator), tactile confirmation alternatives and a keyboard-only path through the launcher.
- Rebindable pause, map, journal, extraction and critical evidence buttons; no long forced hold during a high-risk encounter without accommodation.
- If aim/interaction assists materially alter competitive balance, keep them to noncompetitive modes or use clearly declared equalized LAN lobby policies.

### D. Motion/vestibular comfort and photosensitivity
- Independently adjustable camera bob, head sway, camera roll, weapon sway, camera shake, forced camera motion, motion blur, FOV, smoothing and turn rates; off/reduced comfort preset.
- Offer predictable horizon and optional reticle; avoid forced zoom/whip pans, unexpected cutscene movement and intrusive UI parallax.
- Suppress or substantially reduce repeated flashes, lightning strobing, rapid patterns, white flash loading screens and seizure-triggering shader effects as far as feasible.
- Apply photosensitivity reduction to ghost hunt effects, ritual glyphs, EMF pulses, menus and advertisements of effects — not just to the settings preview.
- **Never claim photosensitivity-safe for every individual**; users have differing triggers. Test effect cadence and supply a clear reduced-flash mode.

### E. Cognitive, neurodivergent, attention and language access
- Objectives and relevant inputs are available on demand through a consistent journal/help panel rather than transient, once-only banners.
- Configurable HUD density, contextual hints and reminder frequency; pin objectives, retain chronological event/evidence logs, allow readable maps and searchable glossary.
- Replace mandatory timed reading and rapid-fire modal tutorials with player-controlled pace; let cutscenes be skipped/replayed where feasible.
- Distinguish confirmed evidence from speculative observations and deliberately misleading ghost signals, without spoiling mystery solutions.
- Plain-language button/action labels, consistent icon vocabulary, predictable navigation and clear failure reasons.
- Difficulty and gameplay accessibility assists belong in a separate **Gameplay** section; warn when a setting changes achievements, saves or shared lobby rules instead of silently doing so.
- Localization-ready Unicode/font fallback and text layout; don't claim a language is supported without a complete translated corpus and tested glyphs.

### F. Safety, autonomy and anti-friction
- No accessibility setting can be locked behind gameplay unlocks, purchases or hidden debug modes.
- Accessibility presets must remain editable; **visual comfort** and **gameplay difficulty** remain distinct.
- No player is forced to disclose a disability, diagnosis or medical status.
- An option to disable intense effects must not remove the information necessary to finish a legitimate objective.
- Do not require voice recognition, VR hardware, a gamepad, internet access or a specific vendor's accessibility technology to operate normal Windows first-person gameplay.

## 7. Audio, input, gameplay and network menu inventories

**Audio:** device routing/test, master/music/effects/ambience/UI/dialogue/voice chat/microphone levels, mute, spatial audio preset where truly supported, mono/dynamic range, VO priority, captions and hearing assists. Device swaps must not silently reenable a muted microphone or speaker.

**Controls:** action bindings by context (menu/hunter/ghost/vehicle if any), keyboard/mouse/controller layouts, input test, dead zones, aim/movement sensitivities, invert axes, hold/toggle, remap defaults, controller identification, rumble, pointer confinement and input lost/focus recovery. Show the actual hardware label that will activate each prompt.

**Gameplay:** difficulty preset and custom lobby settings with accurate explanation of what each changes; tutorial hints and information presentation; role-specific HUD; movement comfort/interaction assists; accessibility-compatible evidence journal; optional auto-reload/auto-sort only where those systems exist. Keep role, ghost and evidence mechanics host-authoritative. Never conceal gameplay modifiers in a generic “graphics quality” preset.

**LAN:** host address/port and direct IP, seat readiness, network connection quality, voice permissions and mute, host-owned difficulty and match rules, reconnect help, privacy state and actual connection security properties. Do not market LAN traffic as encrypted if it isn't. User-discoverable version mismatch and recovery path.

**Profiles/system:** save backup/restore, language, accessibility presets, graphics preset, restore safe defaults, update information tied to Beckenburg's own release channel, troubleshooting logs, about/licenses/asset credits. Auto-update, installer and device probing behavior must be explicit and never required for offline play.

## 8. Implementation architecture and configuration contract

1. Define one typed, versioned **OptionRegistry** with unique keys, category, data type/range/enum, default, platform capability predicate, user-visible label, short help, persistence scope, live-apply/restart flag, accessibility impact and validation function.
2. Bind each visible widget to a registered subsystem setter and observer. A setting is **exposed only when a live implementation exists** and the capability predicate passes; a future option can remain in documentation/backlog, never as a dead control.
3. Keep machine-local display/GPU/sound configuration separate from portable player accessibility preferences and game/host state. Document exact save location, atomic write and schema migrations. No cross-device overwrite that breaks display or input.
4. Keep UI thread (Swing EDT), renderer and authoritative simulation separated. Validate cross-thread setting changes, dispose/recreate graphics resources safely, and do not render-block gameplay input.
5. Provide staged preview / committed configuration / last-known-good configuration. On failed display-mode, shader or window creation, automatically restore safe baseline with readable diagnostics.
6. Attach a compact settings inspector/debug test that enumerates every *visible* option key and confirms correct setter, persisted value, actual subsystem read-back and reset behavior.
7. Supply at least one **safe preset** with minimal postprocessing, familiar controls, low graphics resource demand, subtitles on and non-color-only cues. Presets must not silently disable individualized accommodations.
8. Record feature acceptance in existing [stage ledger](stage-ledger.json) and [quality gates](QUALITY_GATES.md); do not create a parallel progress tracker. Documentation is policy; it does not earn “implemented” status.

## 9. Required validation matrix

| Gate | Acceptance evidence |
|---|---|
| 01 — Boot and safe fallback | Invalid/unsupported display mode, corrupt settings, renderer failure and missing device all recover to usable Settings/Exit |
| 02 — Controls reachability | Critical menu/game functions reachable by keyboard only and tested mouse/controller pathways; no key trap |
| 03 — Input coexistence | Simultaneous keyboard+controller hold/release, focus loss, unplug/reconnect and repeated input cause no phantom actions |
| 04 — Persistence | Change each exposed option, close/relaunch, confirm actual subsystem behavior and values, reset group, preserve save data |
| 05 — Graphics evidence | Each exposed shader/visual toggle has screenshot/frame-hash or equivalent visible proof and correct backend capability gate |
| 06 — GPU/CPU regression | Presets measured for frame-time p95/1% lows, thermal where relevant, memory, sustained operation; no blocked sim or network tick |
| 07 — Dark-scene fairness | Low/High/colorblind/reduced-flash users can perceive the same legitimate clues and warnings; no hidden-state leak |
| 08 — Hearing route | Dialogue captions, key acoustic evidence and dangerous warnings readable without audio; muted mic stays muted |
| 09 — Vision route | All critical menus, journal, puzzle/ritual cues usable at enlarged text, high contrast and grayscale |
| 10 — Motor route | Rebind, hold/toggle, interaction target adjustment and mouse/key/controller-only operation verified in real mission |
| 11 — Comfort/photosensitivity | Reduced motion/flash profile affects actual ghost effects, rituals, loading and cinematics; no compulsory strobe |
| 12 — Multi-monitor/high-DPI | Window resizes, monitor unplug, DPI/scale changes and ALT+TAB preserve usable click targets and readable text |
| 13 — Audio devices | Playback/capture selection/stop/start hotplug and mute handle rejection without locks or accidental transmission |
| 14 — LAN options integrity | Host-selected difficulties persist for session and authoritative rules; client cannot change them via local graphic/accessibility UI |
| 15 — Installer/runtime matrix | Clean Windows test, bundled runtime, offline solo, LAN version checking, unsupported GPU/driver warning and uninstallation evidence |
| 16 — No false features | Enumerate all live settings; each has value read-back, confirmed state change and regression test; hide every no-op option |

**Release authority:** Missing a physical GPU/OS/controller or required disability-path test is *UNVERIFIED*, not “passed.” Record model/driver/device conditions without publishing personal data. Do not claim “all devices supported” or "accessible to everyone."

## 10. Priority and staged delivery

- **Foundation / P02:** real settings persistence and UI control binding; screen/window/text scaling, sensible sound volumes, subtitle groundwork, keyboard focus recovery, input remapping, last-known-good configuration.
- **Renderer gate / P01 onward:** capability enumerator and graphics options tied to the **accepted** 3D engine, measured graphical defaults, low-spec fallback, FOV/resolution/render scale, and deferred advanced shaders only when proven.
- **UX completeness / P25:** vision, hearing, motor, vestibular, photosensitivity, cognitive accommodations, on-demand help, role HUD, real accessibility testing without external instructions.
- **Stability / P27:** GPU/driver/Windows permutations, long sessions, device hotplug, multiple monitors, accessibility-preset and network/fairness regressions; no claim of Gold until release gates and clean Windows install proof pass.

**Applicability to other games:** The categories, ability detection, recovery, persistence and disability requirements are reusable across native, desktop and VR projects, but each title must apply its own hardware/engine contract. Do not transplant Windows-specific APIs or unsupported shader toggles into a phone-native title.