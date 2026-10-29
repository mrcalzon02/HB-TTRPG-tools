# Desktop Game Interface & Settings Standard

**Version:** 1.0.0 — proposed portfolio standard  
**Scope:** Windows and Linux desktop games and desktop equivalents; other platforms may adopt applicable sections  
**Owner:** Shared portfolio reference, maintained in HB-TTRPG-tools  
**Status:** Design contract. Publication does not imply implementation in any individual game.

## 1. Purpose and normative language

This document establishes a consistent **player-facing order of operations** across independently developed games: installation, launching, game-mode selection, session management, options, controls, safety, and exit. It standardizes **behavior and expectations**, not artwork, game engine, lore, or genre. A PSX horror game, match-three game, turn-based tactics game, and desktop VR companion may each keep a different visual presentation while satisfying the same interaction contract.

- **MUST** = required for an applicable feature or release target.
- **SHOULD** = expected unless a documented technical or design exception exists.
- **MAY** = optional.
- **Applicable feature** = genuinely implemented in that build/platform. A game MUST NOT expose inert or misleading settings for features it does not implement.
- **Disabled for a reason** = a visible disabled control with concise contextual explanation; it MUST NOT silently pretend to work.
- **Unavailable** = omit a wholly irrelevant feature. Do not fabricate multiplayer, graphics features, or controller support merely to satisfy a menu template.

A game MUST meet the common shell contract before claiming compliance. An individually documented exception does not quietly redefine the shared contract.

## 2. Canonical order of operations

```text
INSTALL OR EXTRACT
   └─ Installer / first-run setup (where appropriate)
       └─ Desktop shortcut / app registration / uninstaller
           └─ Launcher (when shipped; never a mandatory online gate for offline games)
               ├─ Play
               ├─ Settings / safe startup
               ├─ Check for updates (when a real updater exists)
               └─ Exit launcher
                   └─ Process boot / dependency and configuration checks
                       └─ First-run setup (language, accessibility, optional privacy choices)
                           └─ Main Menu
                               ├─ Continue (only when a valid resumable game exists)
                               ├─ Single Player
                               ├─ Multiplayer (only when supported)
                               ├─ Additional Modes (when supported)
                               ├─ Options
                               ├─ Credits
                               └─ Quit / Exit to Desktop
```

**Installer:** On installed distributions, provide a sensible install directory, shortcut choices, required dependency checks, optional file association choices, and a working uninstall path. Avoid unrelated bundled offers and surprise privileged operations. On portable ZIP/AppImage-style distributions, extraction and launch replace installation; portable builds must retain portable semantics.

**Launcher:** A shipped launcher is a small orchestration layer: play, real update status, version/build, settings/safe-mode entry, optional game/profile selection, and exit. The game MUST also support a reliable direct executable entry when technically feasible; the launcher MUST NOT prevent offline single-player use. Do not make users traverse two identical main menus.

**Startup:** Detect unsupported render modes, corrupt preferences, missing assets, and failed migration; provide recovery without erasing saves. Intro/logos must not cause a permanent input trap. Offer skip behavior for nonessential sequences and appropriate reduced-motion handling. First-run options should not create compulsory accounts for offline games.

**Main menu:** The shell is consistently navigable by supported inputs. Gameplay modes appear before ancillary information. Do not expose a Save Game command with no active game to save; use **Save Manager** for managing existing files from the main menu.

## 3. Standard main-menu tree

```text
MAIN MENU
├─ Continue [when resumable save exists]
├─ Single Player
│  ├─ New Game / New Campaign / New World
│  │  └─ Slot or profile → scenario/world → difficulty → modifiers → confirm → game
│  ├─ Continue / Resume [when applicable]
│  ├─ Load Game
│  │  └─ Slots and autosaves → details → load
│  ├─ Save Manager
│  │  └─ Rename / duplicate / export / import / backup / delete [supported operations]
│  └─ Back
├─ Multiplayer [when implemented]
│  ├─ Host / Create Lobby
│  │  └─ Public/private/friends/LAN → rules → permissions → lobby → ready/start
│  ├─ Join
│  │  └─ Invite / browser / LAN / direct address [implemented methods only]
│  ├─ Recent / Favorites [when implemented]
│  └─ Back
├─ Other Modes [genre-specific; e.g., tutorial, skirmish, challenge, sandbox]
├─ Options
│  ├─ Display
│  ├─ Graphics
│  ├─ Performance
│  ├─ Camera & Effects
│  ├─ Audio
│  ├─ Controls & Binding
│  ├─ Gameplay & Interface
│  ├─ Accessibility
│  ├─ Network, Privacy & Safety [when applicable]
│  └─ Language & Other
├─ Credits / Licenses
└─ Exit to Desktop [confirmation if data could be lost]
```

A game MAY place Continue or an explicit Tutorial on the main menu for convenience. The main-mode hierarchy must remain recognizable.

### 3.1 In-session pause/menu contract

```text
IN-SESSION MENU
├─ Resume
├─ Save Game [only when legal in the present mode/state]
├─ Load Game / Restart / Checkpoint [as supported]
├─ Options [same underlying settings as the main menu]
├─ Controls [same binding system as the main menu]
├─ Help / Tutorial / Objectives [when applicable]
├─ Return to Main Menu [warn on unsaved loss]
└─ Exit to Desktop [warn on unsaved loss]
```

Single-player pause SHOULD genuinely pause simulation when appropriate. Live multiplayer MUST NOT misrepresent local menus as pausing the shared world. Back/Escape returns one level, except while a capture dialog or safety confirmation requires another explicit action. A game MUST NOT replace the current room, remove existing input facilities, or pin the player/camera in place merely to show an ordinary panel unless this is a documented, intentional mode transition.

### 3.2 Save and load contract

- Separate **save profile**, **slot**, **autosave**, and **settings profile** identities. Settings and key bindings MUST NOT be stored only inside a game save.
- Show slot name, timestamp, applicable world/level, build/version compatibility, and optional preview.
- Support manual saving if the game permits it; clearly mark restrictions, checkpoints, and autosaves.
- Never overwrite or delete without an appropriate warning or explicit slot-selection action. Use atomic writes or equivalent safe replacement, and recover gracefully from incomplete/corrupt saves.
- Preserve backups on migration where feasible. Do not wipe incompatible saves; explain incompatibility and offer export/backup when possible.
- Provide a consistent location or **Open Save Folder** action when safe and applicable. Document Linux/Windows paths and portable-mode behavior.
- Loading must restore the intended state, not silently start a fresh game.

## 4. Settings interaction rules — apply to every category

1. A real setting MUST change real behavior. A nonfunctional slider/toggle is a release-blocking defect.
2. Every meaningful optional effect already implemented SHOULD have its own independent adjustment or disable control, particularly effects associated with discomfort or accessibility.
3. Give settings understandable names, current values, defaults, brief descriptions, and restart requirements where relevant.
4. Use **Apply**, **Revert/Cancel**, **Restore Category Defaults**, and **Restore All Defaults** where changes require commitment. Real-time safe settings MAY apply immediately, but must visibly persist.
5. Risky display changes MUST offer a timed **Keep / Revert** confirmation (recommended ~15 seconds), automatically reverting on timeout or loss of focus.
6. Support configuration persistence between launches, with versioned migrations. If malformed, use known-safe defaults without deleting saves.
7. Presets are convenience bundles, never a substitute for individual controls. Changing a component of a preset sets the preset to **Custom**.
8. Prefer useful ranges and true **Off** values; do not make the slider's lowest value secretly retain the effect.
9. Keep labels, focus, scroll position, and control navigation stable on screen resizing and UI scaling.
10. A supported feature can be hidden or disabled where not applicable, but its absence must not be disguised by a fake option.

## 5. Comprehensive setting catalog

These are **capability-driven settings**: expose every applicable item, not unsupported decoration. If a feature exists and players may reasonably need control over it, provide a control.

### 5.1 Display and window management

- Display mode: Windowed, Borderless Fullscreen, Exclusive Fullscreen (where supported).
- Monitor selection; resolution; refresh rate (where controllable); aspect-ratio behavior; viewport scaling and letterbox/crop policy; DPI awareness.
- Window resizing, remembered position/size, maximized state, focus behavior, multi-monitor recovery.
- Brightness, gamma, display calibration; HDR enable/disable, paper-white/peak brightness if HDR is implemented.
- UI/HUD scaling, safe-zone margins, text scaling, cursor size; color/display output if relevant.
- Always include a recoverable safe video mode that works after an invalid monitor or graphics choice.

### 5.2 Graphics quality and rendering

- Overall preset: Minimum/Low/Medium/High/Ultra/Custom as appropriate to the renderer.
- Render resolution/scale, dynamic resolution enable/target/minimum/maximum where supported.
- Upscaling method and quality, sharpening strength, anti-aliasing method and quality, TAA temporal controls where implemented.
- Texture quality, texture filtering, anisotropic filtering, texture-streaming budget when applicable.
- Geometry/model detail, object LOD, world view distance, terrain detail, foliage/vegetation density and draw distance.
- Shadow enable, resolution, quality, distance, cascades, contact shadows, soft shadows.
- Ambient occlusion and strength; indirect/global illumination; lighting quality; reflection quality and method.
- Water quality/reflections, clouds/fog/volumetrics, weather effects, particles, decals, debris, physics-driven cosmetic effects.
- Ray-tracing features, individual RT effects and quality when actually implemented.
- Renderer/backend selection and shader-cache controls if the engine provides them; mark restart requirements.

### 5.3 Camera, post-processing, comfort and visual effects

**Expose independent controls for every effect the game actually uses.** Recommended baseline defaults for comfort-sensitive effects are **Off** or modest.

- Motion blur: Off / strength; optionally separate camera blur and per-object blur.
- Depth of field: Off / strength; cinematic focus effects where applicable.
- Bloom/glow: Off / intensity; lens flare: Off / intensity.
- Chromatic aberration: Off / strength; film grain/noise: Off / strength.
- Vignette: Off / strength; color grading/filter selection; contrast and saturation when implemented.
- Camera shake: Off / intensity; head bob: Off / intensity; weapon sway/bob: Off / intensity.
- Camera tilt/roll, sprint FOV changes, automatic camera motion, auto-centering: independent off/sensitivity settings where applicable.
- Field of view and FOV mode (horizontal/vertical) where technically appropriate; camera sensitivity and smoothing.
- Flashing effects, repeated high-contrast pulses, screen distortion/warp, injury overlays, damage vignette: reduced/off variants when possible.
- Menu background animation, parallax, transition duration, animated text and cursor effects: reduce/disable motion.
- CRT/PSX-style filters: pixelation scale, vertex wobble, texture warping, scanlines, dithering, color depth, banding, distortion, grain, jitter — individually controllable **when the renderer implements them**.
- Provide a **Reduce Motion** preset which disables related effects while preserving individual override controls.

### 5.4 Performance and diagnostics

- Foreground FPS cap: uncapped and supported discrete/custom limits.
- Menu FPS cap and background/unfocused FPS cap independently when possible.
- VSync, variable refresh behavior where supported, frame pacing options if exposed by the engine.
- Frame-time and FPS display, frame-pacing graph, optional diagnostics/benchmark if actually supported.
- Optional low-power profile, reduced background simulation, shader precompilation/compilation notice.
- Clearly distinguish reported GPU features from settings that genuinely affect the renderer.

### 5.5 Audio and voice

- Master, music, effects, dialogue/voice, ambient, UI, and voice-chat volume where these buses exist.
- Output device where controllable; stereo/mono, spatial/surround configuration if supported.
- Dynamic range/night mode, dialogue boost, speaker/headphone profile if implemented.
- Mute on focus loss, background audio behavior, positional-audio strength where appropriate.
- Subtitles/captions on/off, size, contrast, speaker names, backgrounds, directional indicators where supported.
- Push-to-talk, voice activation and sensitivity, microphone device/test, input gain, voice mute/deafen where multiplayer voice is implemented.
- Licensed music / streamer-friendly mode where necessary; never claim licensing protections not actually implemented.

### 5.6 Controls and input — flat-plane requirement

**All meaningful game and menu commands MUST be represented in one authoritative action registry, independent of input hardware and game engine.** Do not scatter binding rules across unrelated scenes, windows, or private controller tables.

- Global and context-scoped actions are registered in a **single flat action catalog** with stable IDs (e.g., `ui.back`, `ui.confirm`, `game.move.forward`, `game.attack.primary`, `chat.push_to_talk`). Context changes availability; it MUST NOT create a separate secret binding system.
- Provide a complete, searchable **Controls & Binding** page. Group/filter by context (Global, Menu, Gameplay, Vehicle, Spectator, Builder, Chat, etc.) for usability while preserving the single authoritative registry.
- Each rebindable action MUST expose actual bindings for keyboard, mouse, controller, and any other supported device. Do not limit rebindings to a short predetermined swap list.
- Support at least two binding slots per action when technically possible; allow clear/unbind, restore action defaults, restore device defaults and global defaults.
- Support direct input capture; modifier chords, hold/toggle behavior, double-tap if implemented, analog/digital axes, dead zones, sensitivity, inversion X/Y, acceleration/smoothing where implemented.
- Preserve simultaneous keyboard/mouse and gamepad support; hotplug/disconnect recovery; device-specific controller prompts and configurable layout where feasible.
- Clearly report conflicts (duplicate binding in an active context, unsupported/OS-reserved key, missing required UI action); let players resolve conflicts rather than silently stealing bindings.
- Permit rebinding Escape/Back while guaranteeing an accessible emergency menu-navigation or cancel path. OS-reserved and platform security key combinations are not promised as remappable.
- Binding import/export SHOULD use a human-readable, versioned format and survive reinstall/update where reasonably possible.
- Input settings MUST affect the title screen, menus, pause screen, gameplay, and dialog navigation—not only character movement.
- Controller support SHOULD be interoperable with common desktop input layers (e.g., SDL Gamepad/Steam Input as applicable), without hard-coding only one controller model or relying on one vendor's icons.
- All input transforms and aliases must be implemented in the input adapter, not by altering action meanings across projects.

#### 5.6.1 Action registry example (illustrative JSON)

```json
{
  "schema_version": "1.0",
  "actions": [
    {
      "id": "ui.confirm",
      "contexts": ["global"],
      "value_type": "digital",
      "required_navigation": true,
      "bindings": {
        "keyboard_mouse": ["Enter", "MouseLeft"],
        "gamepad": ["SouthButton"]
      }
    },
    {
      "id": "ui.back",
      "contexts": ["global"],
      "value_type": "digital",
      "required_navigation": true,
      "bindings": {
        "keyboard_mouse": ["Escape", "Backspace"],
        "gamepad": ["EastButton"]
      }
    },
    {
      "id": "game.attack.primary",
      "contexts": ["gameplay"],
      "value_type": "digital",
      "required_navigation": false,
      "bindings": {
        "keyboard_mouse": ["MouseLeft"],
        "gamepad": ["RightTrigger"]
      }
    }
  ]
}
```

The above is a conceptual contract, not a ready-to-import schema. Engines must map their device codes into stable action IDs. Conflicts are checked **within simultaneously active contexts**, not globally across unrelated modes.

### 5.7 Gameplay, interface, accessibility, and language

- Difficulty and supported modifiers, tutorial prompts, objective assistance, autosave behavior, confirmation sensitivity, pause behavior where meaningful.
- HUD visibility/opacity/scale/placement, reticle style/size/color, hit indicators, damage numbers, objective markers when implemented.
- Text size, contrast, subtitles, colorblind-friendly palettes or independently configurable semantic colors, menu narration/screen-reading integration where achievable.
- Reduce Motion, photosensitivity-friendly settings, flashing-effect reduction, visual audio cues, mono-audio option, hold-versus-toggle alternatives, repeated-input assists.
- Menu and gameplay language; independent voice/text language where localized; readable input glyphs and icon labels.
- One-handed and alternative input layouts where possible, accessible timing options, clear focus indicators and consistent Back behavior.
- Accessibility configuration SHOULD be offered at first launch and remain available everywhere settings are accessible.

### 5.8 Network, multiplayer privacy, and safety (when applicable)

- Modes: offline/LAN/direct IP/friends/private/public are shown **only if implemented**. Never require an external server for supported offline play.
- Lobby visibility, player capacity, join permissions, passwords/invites where supported; clearly state host versus client authority.
- Multiplayer mute, block, kick/ban (host/moderator), reporting (only when a real report path exists), friend/invite permissions, chat/voice controls.
- Voice chat opt-in or clearly disclosed policy; privacy-conscious defaults; push-to-talk and independent voice mute/deafen where available.
- Connection status, region/latency display if available, cross-play indicator only if supported, safe disconnect and rejoin handling.
- Confirm leaving a live lobby/session where progress or other players will be affected. Explain host disconnect consequences and save ownership.
- Do not silently publish IP addresses, private lobby codes, player identities, or diagnostic logs to other users.

### 5.9 Updates, files, and diagnostics

- Show game version/build clearly. If an updater exists, include check, release notes, progress, integrity verification where practical, error handling, rollback/recovery guidance.
- Keep updates optional for offline single-player unless a genuine compatibility requirement makes an update necessary.
- Accessible logs/crash reports and an **Open Log Folder** option when supported; collect only disclosed data.
- Provide an ordinary quit-to-desktop path that closes the process and child processes properly.
- Uninstall/update MUST NOT silently destroy saves or user-selected mod/content directories.

## 6. UI behavior, navigation, and persistence

**Navigation:** All supported devices can reach all essential controls; visible focus; sensible tab/directional order; consistent Enter/Confirm and Escape/Back; no uncloseable modal; no mouse-only mandatory controls when controller support is claimed.

**Layout:** Content must fit on target aspect ratios and window sizes without overlapping labels, clipped buttons, or unscrollable menus. Long lists must scroll. UI scale must remain readable and recoverable. Text must not cover other controls after localization or scaling.

**State:** Keep settings in a versioned profile independent from savegames. Respect user-chosen settings at restart, between mode changes, and across launcher/game boundaries. Distinguish device-local preferences from portable save data.

**Unsaved data:** Warn before destructive operations and quitting sessions with unsaved progress. Use deliberate, accurate confirmations; never chain multiple redundant warnings for the same action.

**Reentry:** Launching a game, returning from multiplayer, canceling a new-game wizard, changing resolution, and returning to main menu must leave a functioning navigable interface. Ordinary panels should not unexpectedly wipe environmental context, cameras, keyboard access, or global controls.

## 7. Shared architecture across unrelated engines

The standard is a **contract**, not a mandate to duplicate a particular implementation or adopt a single engine.

- **Common menu-state model:** `installer → launcher → boot → main → mode_setup → lobby_or_save → session → pause → main/exit`.
- **Single capability manifest per application/build:** truthful flags for single-player, multiplayer, save/load, controller types, rendering effects, accessibility features, and update support.
- **Shared action ID vocabulary:** one action registry per project, one binder UI, engine adapters for hardware events.
- **Shared settings vocabulary:** stable keys and definitions; an engine adapter reads/writes only settings its renderer/gameplay systems actually implement.
- **Shared tests:** screen traversal, input capture, persist/reload, safe mode, mode-specific transitions, and no-dead-buttons audits.
- **Project overrides:** specific menu art, terminology (e.g., Campaign vs Single Player), genre-specific settings, and optional extra modes may vary. Core semantics stay consistent.
- **Exception log:** each game SHOULD keep a short `docs/desktop-ui-conformance.md` with supported capabilities, implemented sections, explicit exceptions, and outstanding gaps.
- **One canonical source:** link to this standard instead of copy-pasting drifting versions. Pin a standard version/commit for reproducibility, then deliberately upgrade.

### 7.1 Illustrative capability declaration

```json
{
  "standard": "desktop-game-interface",
  "standard_version": "1.0.0",
  "application": "EXAMPLE_ONLY",
  "platforms": ["windows", "linux"],
  "modes": {
    "single_player": true,
    "multiplayer": false
  },
  "features": {
    "launcher": true,
    "save_slots": true,
    "controller_input": true,
    "graphics.motion_blur": false,
    "graphics.bloom": true,
    "network.voice_chat": false
  }
}
```

This is an implementation-planning example, not a claim about any real project. A capability declaration MUST match the running build, not the design wishlist.

## 8. Release acceptance checklist

A desktop build is **not** compliant merely because the menus are drawn.

- [ ] Installed and portable entry paths (as shipped) launch reliably; safe startup and exit work.
- [ ] Real main menu, Single Player flow, Save Manager, and relevant additional modes work from start to finish.
- [ ] Multiplayer Host/Join/Lobby flow works end-to-end if multiplayer is advertised; absent otherwise.
- [ ] Every visible button, slider, dropdown, checkbox, and binding works and survives appropriate restart.
- [ ] Graphics changes alter rendering; effects can be disabled independently when implemented; presets reflect custom overrides.
- [ ] Display mode changes revert safely on timeout/failure; invalid settings recover in safe mode.
- [ ] All applicable gameplay and UI commands use the shared action registry; binding capture, conflict handling, clear, restore, and mixed-device testing pass.
- [ ] Escape/Back, keyboard navigation, and controller navigation never trap users in a screen.
- [ ] Save/load is integrity-tested; autosave/manual save behavior matches the UI and doesn't silently overwrite data.
- [ ] Menu and session transitions retain relevant UI/input/environment functionality.
- [ ] No overlapping text or clipped controls at supported resolutions and 100%/larger UI scales.
- [ ] Audio, accessibility, privacy, safety, and network controls are truthful and persistent.
- [ ] Windows/Linux paths, case sensitivity, permissions, and fullscreen/windowed behavior tested on supported targets.
- [ ] Performance settings and menu/background FPS caps genuinely function where advertised.
- [ ] No placeholder controls, nonfunctional settings, or fake update/report features remain in a release build.
- [ ] The project's conformance file names exclusions, implementation status, and the pinned version of this standard.

## 9. Suggested adoption sequence

1. Inventory the game's existing installer, launcher, menus, input systems, settings, and advertised feature set; distinguish **implemented** from **proposed**.
2. Wire the actual state transitions and Back/Exit behavior before cosmetic redesign.
3. Consolidate existing input mappings into the flat action registry; keep hardware adapters engine-specific.
4. Consolidate settings into one versioned store; connect real renderer/audio/gameplay/network parameters; build recovery.
5. Add comprehensive option surfaces for existing effects, accessible navigation, and meaningful controller support.
6. Run the release acceptance matrix on supported platforms, then publish a conformance note.
7. Keep adapting the shared contract as new platform/engine needs emerge; do not silently diverge in individual projects.

## 10. External references

Design guidance informing this proposed standard (not a claim of external certification):

- [Microsoft Xbox Accessibility Guidelines](https://learn.microsoft.com/en-us/gaming/accessibility/guidelines) — input, UI navigation, error handling, visual effects, access needs.
- [Xbox Accessibility Guideline 107: Input](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107) — broad in-game remapping expectation.
- [Xbox Accessibility Guideline 117: Visual distractions and motion settings](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117) — user control of camera behavior, blur, motion, flashing, and distraction.

---

**Canonical principle:** A game must be easy to install, launch, navigate, customize, play, save, resume, and exit. Every advertised capability must be real. Give the player control over what the software already knows how to do.
