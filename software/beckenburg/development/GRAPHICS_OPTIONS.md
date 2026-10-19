# Desktop display and PSX rendering

Java 17 Swing (CPU software rasterization), no fabricated GPU shaders or VSync.
GraphicsOptions is persisted in Java Preferences and entirely client-local.
Modern screen output modes: windowed, borderless window, borderless fullscreen,
and exclusive fullscreen at the current monitor resolution when AWT supports it.
Window size choices include 720p, 900p, 1080p, 1440p, 2160p and ultrawide.
Oversized windowed selections are safely clamped to available monitor space.
The Options dialog confirms mode switches and automatically reverts after
15 seconds if unconfirmed. F11 and Alt+Enter toggle fullscreen/windowed.

The render target is now a real resizable RGB and depth buffer. Resolution
quality sets internal height (200p/270p/360p/480p/540p/720p); actual width
follows the selected aspect ratio. Auto derives the monitor viewport aspect.
Forced 4:3, 16:9, 16:10, or 21:9 retain correct projection with letterbox or
pillarbox bands, not stretched sprites or walls. All solo, castle and LAN
first-person views use this configuration. Nameplate coordinates follow actual
framebuffer and letterboxed viewport positions. Van camera visuals retain
their own equipment-based optic zoom and monitor interpolation.

Optional scene-only rendering effects include fast/strong CPU edge-aware
anti-aliasing, nearest/bilinear/bicubic upscaling, brightness, contrast,
scanlines, vignette, grain and chromatic aberration. They are applied
after the already integrated PSX vertex snapping, affine texture warping,
dither and palette treatment, but before native-resolution Swing HUD drawing.
Internal 720p is expensive on CPU; recommend Retro/Balanced on low-power machines.
Hardware MSAA, GPU postprocessing and guaranteed VSync are not available
without adding a GPU renderer backend, and are not misrepresented here.

GraphicsOptionsTest covers frame allocation, 4:3 and widescreen mapping,
unchanged optical field of view, effect opt-out and CPU safety bounds.
Run with build.sh or build.cmd. Real multi-monitor and exclusive-fullscreen
playthroughs must be accepted on physical target hardware.
