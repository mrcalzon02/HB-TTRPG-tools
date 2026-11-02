# R101 — private original source vs genuine saved Blender R11 annular baffle geometry

**Primary target is the exact ORIGINAL Factorio sprite, not any imagined space-thruster CAD.** The user's private original `thruster.zip` was independently SHA256 verified as `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`. Original body frame 1 and frame 33 each 264×542 were extracted correctly from the original 2112×2168 two-page RGBA atlas and compared *privately*. Original Wube pixel bytes and the private contact sheet are not published in GitHub/Actions.

## Real Blender evidence

[Independent R101 source R11 first-baffle registration workflow #41514469964](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41514469964) **SUCCESS**, actual Blender native render and saved/reopened editable 3D metal torus revisions. Artifact id **13174881899**, `factorio-r101-real-3d-source-r11-annular-baffle-profile-reconstruction`.

The SHA-verified unchanged R94 calibrated Blender baseline is `panel_trim_025_rear_018.blend` SHA256 `221629095354e1c695e95b861c6630c1c9e55739f7fb1f04ea1e0277825bf252`. R101 edits ONLY the existing 320-vertex finite 3D baffle `R11_recessed_internal_pressure_baffle_00` shape and station; camera, lights/materials, existing 80 physical R19 scales, R11 actual fluted liner, pressure rings 01–03, all fins/guards/physical mount contacts, and 64 animation frames remain unchanged.

### True original frames 1 and 33 vs actual Blender renders

RGB metric: alpha-premultiplied RGB MAE normalized [0,1], lower closer. Edges: 23%-highest native image gradient positions, bidirectional Euclidean Chamfer in source pixels, lower better. Both frame metrics averaged. These metrics are diagnostic; physical shape and source observed contours must also be inspected.

| Actual R11 3D candidate | Original mouth x48–215,y394–522 RGB | Full lower x25–238,y392–540 RGB | Nozzle inner x58–203,y424–540 RGB | Mouth edge Chamfer px |
|---|---:|---:|---:|---:|
| R94 original Blender baseline | .075590 | .073452 | .056862 | 4.8464 |
| First real baffle hidden *diagnostic* | .070386 | .070528 | .056336 | 3.8194 |
| **Real torus axially recessed +0.15 units** | **.068870** | **.069498** | **.054199** | 3.9634 |
| Real torus recessed +0.30 | .070407 | .070535 | .056350 | **3.8124** |
| Real torus recessed +0.45 | .070386 | .070528 | .056335 | 3.8194 |
| Real torus moved radially outward .10, recess +.25 | .070210 | .070320 | .056337 | 3.9621 |
| First torus made thinner .55× and recessed .25 | .070390 | .070530 | .056337 | 3.8146 |
| Torus moved radially inward .24 | .071112 | .070350 | .053355 | 4.9895 (worse) |
| Irregular circumferential rebate, recessed .25 | .072253 | .071802 | .058470 (worse) | 3.7608 |

**Working experimental choice, not production promotion:** `recess_y_015.blend`, an actual physical 3D first annular baffle with original mesh preserved and moved toward the chamber. Compared with R94, original-image mouth RGB error is ~**8.89% lower**, lower-flare RGB ~**5.38% lower**, and inner-nozzle RGB ~**4.68% lower**, all without deleting this genuine source-required element. This is more useful than full hiding in the three regions combined, although hiding has better mouth edge Chamfer. The +.30 version has slightly better mouth edge correspondence but loses the inner surface visibility improvement. Thus we cannot claim one global winner based on brightness.

**Important source-shape caution:** A 0.15-unit baffle translation is a geometric hypothesis, not a recovered original Wube pivot/CAD position; still visually inspect the source annular lip and bracket/refractory overlaps. All candidates remain diagnostics.

## Next physical steps

1. Evaluate ongoing independent [R102 true formed forty-flute R11 inner-wall sweep](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/workflows/factorio-source-forty-flute-liner-r102.yml) against original body frames 1/33 before selecting a liner shape.
2. Compare real 3D liner candidates jointly with the R101 +.15 torus (not hiding either) on a saved/reopened editable Blender scene, preserving original R19 plates, entire outside engine and original camera.
3. Extend fidelity checks to other original animation frames and native internal-edge/silhouette correspondence, not just RGB, before declaring source match.
4. Art/fidelity tests remain purely diagnostic. Real build/load/runtime/multiplayer/updater functionality alone may block related releases.
