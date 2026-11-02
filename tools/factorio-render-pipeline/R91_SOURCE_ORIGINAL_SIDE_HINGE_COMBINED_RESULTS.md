# R91 — exact original sprite comparison of real 3D source-traced left/right hinge assemblies

## Objective and evidence

The user requires reconstruction of the **specific rendered original Factorio sprite as a real editable Blender object**, not design of a plausible mechanical thruster. Genuine private user original `thruster.zip` SHA256 **`0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`** was read exclusively in a private workspace. Its two genuine body atlas pages provided native 264×542 original frames **1 and 33**. The public CI artifact contains only our own Blender model and renders. Scores are average source-vs-native-render premultiplied RGB MAE 0..1 (lower better); color/material/shadow differences can influence them and do not guarantee geometric fidelity.

- [R89 completed real Blender workflow #41477053777](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41477053777): **SUCCESS**, five independent genuine layered physically 3D source-contour left/right model variants, saved/reopened Blender .blend, actual original source camera frames 1 and 33 each. Original R85 baseline remains untouched. Earlier workflow failure was a Blender stale object RNA handle, then a mismatched JSON key in a test assertion; both were repaired before this successful final run.
- [R90 real Blender knee-size workflow #41476956901](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41476956901): **SUCCESS**, eight knee guard geometry hypotheses (7 saved/reopened editable Blender candidates) on the first R89 source-traced cast. R88 showed the old R08 knee guards, not the aft shroud wings, had a substantial source-incorrect visible footprint. Preserved untouched R08 shroud wings, R49 casting-to-fin physical contacts, R64 upper hull stays, correct R81 fin taper, R83 angular straightening and all original 64-frame keyed motion.
- [R91 complete combined real Blender workflow #41477873481](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41477873481): **SUCCESS**, eight real 3D combinations of two different source-traced R89 casting profiles (tighter, raised) and four independently scaled/hidden old R08 knee guard profiles, with 16 genuine Blender native images. Six variants were saved/reopened as independent editable .blend, original camera/materials and other physical geometry verified. Artifact `factorio-r91-source-first-real-3d-hinge-knee-combination-candidates` id **13157084772**.

## Original sprite quantitative comparison

| Source-traced 3D casting shape + real R08 old knee volume | Left x27..90 y314..358 | Right x166..220 y313..356 | Complete source hinge x26..225 y298..420 |
| --- | ---: | ---: | ---: |
| R85 old imagined thruster reconstruction | 0.1854650 | 0.1733718 | 0.1551817 |
| R89 first source trace with old knee guards | 0.1677302 | 0.1638144 | 0.1531160 |
| R90 first trace with both knee guards hidden | 0.1627764 | 0.1460153 | 0.1440037 |
| R91 raised castings with original guards | 0.1665284 | 0.1603962 | 0.1520088 |
| R91 raised castings with separate 70% left/40% right guards | 0.1591313 | 0.1427571 | 0.1460444 |
| R91 raised castings with both guards scaled to 40% | 0.1602307 | 0.1427583 | 0.1446048 |
| **R91 raised castings with both obsolete guards hidden** | **0.1601979** | 0.1434345 | **0.1423969** |
| R91 tight castings with original guards | 0.1662751 | 0.1595157 | 0.1521979 |
| R91 tight castings with separate 70% left/40% right guards | **0.1580755** | **0.1401100** | 0.1459693 |
| R91 tight castings with both guards scaled to 40% | 0.1610721 | **0.1401112** | 0.1448162 |
| R91 tight castings with both obsolete guards hidden | 0.1612048 | 0.1408873 | 0.1429841 |

Best complete-region candidate **raised_hidden.blend**, SHA256 **`e410c19cecf5bedeacd52252e81f68e3375cb11c3a3f77fc72cd87c8d80dc67d`**, 10,562,029 bytes. Left/right source contours are 3D finite-volume layered solid meshes attached to the existing original fin-to-cast/hull network; the two original R08 knee guard meshes remain present and inspectable in the .blend but are hidden from camera rendering, not deleted. Original shroud wings are preserved. This is a **preferred experiment, not final approved source-accurate geometry**.

## Specific next experiment

The *raised* source profile wins the total and left extended ROI; the *tight* profile wins the right casting's local ROI. Test **different source-traced profiles on the two sides** in a NEW genuinely saved/reopened editable Blender scene: left raised/right tight, and reverse control. They must remain true original physically deep separate meshes; never merge them into one symmetric plate, hallucinate pivots or alter genuine source artwork. After privately comparing to the original, independently refine source-driven casting boundaries, thickness, weathered surfaces and central bridge geometry. Visual/art diagnostics must never block functional game releases.
