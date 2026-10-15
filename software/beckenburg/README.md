# The Beckenburg Project — Java 17 visual prototype

**Experimental S1 renderer/input spike, not a released game.** Runs entirely on the standard Java 17 desktop libraries (Swing and Java2D) without downloading dependencies. This is a genuine perspective-triangle **software 3D rasterizer** with depth buffering, a tiny multi-room test house, collision, doors, pitch/yaw camera, crude furniture/ghost meshes, dithered fog and a low internal resolution. It is deliberately temporary: no Java 3D engine has been selected, hardware rendering or Windows packaging proven, and there is **no LAN, ghost AI, evidence or gameplay loop** yet.

## Build / test

Install Java **17 or newer JDK** (`javac`, `java`, `jar` accessible). On Windows run `build.cmd`; to launch after a successful build use `build.cmd run`, or `java -jar build\beckenburg-prototype.jar`. On Linux/macOS run `sh build.sh` then `sh build.sh run`. Both build scripts compile using `javac --release 17` and run the same deterministic headless smoke test before packaging. The renderer has no dependency beyond the JDK; its UI has **not yet been tested on an actual Windows machine**, and `jpackage` deployment is deferred.

## Controls

WASD to move, Shift to move faster, drag with left mouse or use arrows to look, E open/close nearby door, F lamp toggle, Escape back to menu. Pointer is never forcibly captured. Esc stops the in-game Swing timer. 320×200 internal color/depth buffers are scaled to window without bilinear filtering. Fullscreen/window focus work remains a Stage 1 gate.

## Validation boundaries

`SmokeTest` covers map dimensions, collision, door open/close, distance restriction, real geometry raster output, finite depth buffer, altered orientation and low-light rendering. Test executable is headless. **This does not certify S1**, because Windows window/focus, sound and clean installer checks remain outstanding. No S2/S3 network or simulation claims are made. Stage documents: `../../docs/beckenburg/`.
