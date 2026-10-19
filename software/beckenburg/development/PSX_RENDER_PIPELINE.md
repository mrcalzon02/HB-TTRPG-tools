# Castle Beckenburg night sky and native PSX effects

The renderer is Java 17 Swing/software rasterization. The external-engine source
catalogued in `assets/psx-shaders/index.json` remains reference-only; no third-party
shader code or incompatible Godot/Unity/GLSL plugins have been imported.

All `SceneRenderer` views (castle, solo, LAN hunter and video) use the same
native `PsxPipeline`: four persistent presets (Off, Soft, Classic default,
Gritty), projected-vertex snapping, configurable affine/perspective UV blending,
ordered Bayer RGB quantization. Choose the preset through **Options**; newly
created 3D views read the saved choice. Existing depth testing, clipping,
fog, actual GLB textures and correctly upscaled Swing interface are preserved.

The sky panorama now renders even for interior camera positions. Castle masonry
and the authored Kenney window geometry determine visibility; the sky doesn't
write depth. World-fixed stars, distant hills, moon and subtle moving cloud
bands appear behind real apertures, without a new texture archive.

The regression suite includes `PsxPipelineTest` and an indoor background
assertion in `CastleHubIntegrationTest`, in both `build.sh` and `build.cmd`.
Local Windows graphical acceptance and confirmation of actual window mesh
apertures are still required before declaring the visual result finished.
