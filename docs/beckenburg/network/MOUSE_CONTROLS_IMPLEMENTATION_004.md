# Alpha 1.0 — Mouse-Look & LAN Field Controls

## Functional implementation
- Java 17 Swing shared `MouseLook` controller is used by **solo hunter**, **local ghost practice**, and **network hunter** first-person panels.
- Left click captures the viewport once; yaw/pitch follow pointer movement without holding the button. Arrow keys remain usable. Mouse sensitivity 0.004 radians/pixel with ±1.05 radian pitch clamps; large focus/warp jumps are discarded.
- Pointer is hidden while captured. `Robot` recenters on a normal desktop to avoid hitting a screen edge. If native pointer warping is unsupported/denied, delta-based pointer movement inside the panel remains available but cannot guarantee unlimited rotation.
- Focus loss, panel close, game pause, and return to menus restore normal cursor and clear movement state. Re-enter by clicking the viewport. No global OS mouse hooks or background pointer capture.
- Solo hold-Q callout wheel now consumes relative pointer movement while Q is held, preserving its eight-ping directional selection without rotating the camera. Keyboard wheel selection remains.

## 3D LAN mission interactions
- First-person hunter keys: **1 EMF**, **2 Thermometer**, **3 Spirit Box**, **R host scan**, **C host ward**, **B host ritual**, **X host extraction**, **E host door**.
- `LanClient` already serializes each command with a unique, monotonic sequence number. The host validates seat, room, evidence, wards, extraction and cooldown; the 3D view does not award itself items, evidence, victories or damage.
- Viewport receives `ACCEPT`, `REJECT`, `EVIDENCE`, `RITUAL`, `RESULT` to show host responses and disables movement after case result. On its old side-panel, the LAN lobby still provides legacy case controls for development.
- Teammates within 1.35m are not drawn in a hunter's own viewpoint, preventing a spawn-neighbor avatar from covering the screen. Their networked positions remain intact and peers further away still render.

## Tests and boundaries
- Headless: `MouseLookTest`, `LanWorldControlsTest`, prior `GameplaySmokeTest`, `GhostDomainTest`, atlas/van/callout tests, protocol, 4-socket case and 3D-world tests.
- GUI on Linux Xvfb: `MouseLookGuiTest` simulates capture, free motion and focus loss; `GhostPracticeGuiTest` validates practice return; `LanWorldGuiTest` opens a real LAN 3D view with remote teammates.
- Compile target: `javac --release 17`; development `beckenburg-game.jar` still requires Java runtime. **No physical Windows or multi-PC network acceptance**, no packaged JRE or installer, no LAN spectral 3D ghost mode, and no final nine-map/art content is claimed.
- Next priority: synchronized networked ghost 3D viewport and physics/interaction replication, then artifact/visual model pipeline and clean Windows acceptance.
