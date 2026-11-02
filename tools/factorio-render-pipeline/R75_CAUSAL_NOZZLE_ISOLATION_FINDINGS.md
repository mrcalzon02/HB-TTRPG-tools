# R75 — real native Blender source-camera nozzle isolation

**Workflow:** [#41387122238](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41387122238), **SUCCESS**; artifact ID **13115849018**, `factorio-r75-real-native-nozzle-mesh-isolation`. Baseline saved model is the genuine R71 +0.075 reconstructed candidate with SHA256 `e5aea187ab7b970791ba955913cf134905447b21f8c3fc3527beef1db0ed4aaa`, not the operator's original Wube sprites.

The R75 experiment temporarily toggled `hide_render` for each existing physical object/group, rendered at the unchanged original camera, restored all flags and render settings, then obtained an **exact RGBA byte-for-byte match** against the baseline. R75 makes **no geometry, material, shader, camera, animation, or object-population changes**. The proprietary original source was not fetched or published.

Native region: x48..217, y395..511, **170×117=19,890 pixels**. These measured pixel changes include illumination, shadows, and occlusion; they are not a count of direct first-hit polygon occupancy.

| Hidden for diagnostic only | Number of real 3D parts hidden | Pixel RGB MAE raw 0..255 | Pixels with >=2 RGB difference |
| --- | ---: | ---: | ---: |
| R11 fluted open liner | 1 | 2.467790 | 4,937 |
| R11 original baffle 00 | 1 | **3.743087** | **10,974** |
| R11 castellated baffle 01 | 1 | 0.437272 | 1,225 |
| 40 near-mouth R19 plates | 40 | 1.604592 | 4,403 |
| 40 staggered mid-mouth R19 plates | 40 | 0.088151 | 236 |
| All 80 original R19 plates | 80 | 1.640892 | 4,679 |

**Interpretation:** R11 baffle 00 changes the rendered nozzle region most strongly. R73 found only ~2,500 first-hit samples from both R11 baffles combined on its full-pixel mesh map, so the broader R75 effect must **not** be misrepresented as 10,974 pixels directly occluded by the ring. It includes changes to indirect/direct shadow and visible surfaces behind the ring. The baseline image remains very dark and smooth; hiding baffle 00 exposes a smooth grey underside. Thus removing the physical ring is demonstrably not an authenticated source-constrained fix.

The original R11 baffle 00 is a 320-vertex / 320-polygon physical torus, authored at upstream R11, relocated to y=-3.61 at major radius ≈1.385 in R48, with the existing nonemissive R13 dark shell metal. The operator has consistently specified that an annular mechanical band is **required**, but not incorrectly attached to the three individually mounted upper fins. R49 fixed that mounting hierarchy. Never mistake the band for a shared mounting shoe.

**Next experiment:** R76 conservatively remodels ONLY the **existing torus minor cross-section**, preserving circumferential station and major radius, the real annular band, R11/R19 deep open throat, all separate heat fins/castings/outer guards, camera, original lights and saved R71 geometry. It generates two separate candidates at fixed frame 1/33 and saves/reopens both. Neither can be approved without the private genuine original RGBA atlas.

Source-of-truth original archive SHA256: `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`. Original source pixels must never be committed to public GitHub. Visual shape/motion/balance tests are diagnostics only and must not block game releases.
