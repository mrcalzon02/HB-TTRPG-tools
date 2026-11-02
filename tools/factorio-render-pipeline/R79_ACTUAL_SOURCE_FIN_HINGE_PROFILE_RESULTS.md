# R79 — original verified fin-hinge mounting tabs: independent real 3D candidate results

## Real Blender verification

- [R79 source-specific Blender run #41401424515](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41401424515) **SUCCESS**. Actual Blender 4.5 LTS saved/reopened four independent editable original 3D fin-root locking-tab candidates; source-calibrated orthographic native 264×542 rendered frames 1 and 33 each; verified unchanged meshes, camera, materials, all 64 fin motion frames, and all three physical bespoke casting-to-fin contacts. **No production geometry modified.**
- Workflow artifact **13121054991** `factorio-r79-independent-center-hinges-editable-four-candidates`: four original-art-free editable .blend scenes + eight real native PNG captures + JSON test report.
- Original source retrieved PRIVATELY from the user's Library `thruster.zip` and independently SHA256 checked against `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`; original body atlas frames 1 and 33 extracted at 264×542. Original art is NEVER committed in this repo or included in Actions artifacts.
- Source image ROIs: **center root/ears x96..163,y328..384**, **center bridge x95..162,y311..338**, and all mounts x27..224,y300..395. Scores are original source vs Blender premultiplied RGB MAE normalized to 0..1; lower is better. Not a proxy for physical truth or independent hinge motion.

## Four real asymmetrical candidate results

| Left/right existing original ear length fractions | Actual frame 1 center ears/root RGB MAE | Frame 33 | Frame 1 center main bridge | Frame 33 main bridge |
| --- | ---: | ---: | ---: | ---: |
| .45 / .45 (R77 best) | .17517419 | .17153086 | .20618512 | .20601760 |
| .36 / .45 | .17481940 | .17135886 | .20511342 | .20516697 |
| .45 / .36 | .17486797 | .17102363 | .20384193 | .20367784 |
| **.36 / .36** | **.17452903** | **.17086343** | **.20280181** | **.20283064** |

The .36/.36 candidate wins both measured frames/regions among these variants, but the difference relative to the original .45/.45 candidate is **only .00064516 in frame 1 root, .00066743 in frame 33 root**, and the much bigger gray-vs-weathered-cream main casting error persists. Both-source-frame comparison is essential; art approval remains FALSE.

Saved/reopened SHA256 of best new candidate `left_036_right_036.blend`:
`82e46c882738e038d8c7e09e7d91eed0516d92ad505890614bc86371d33a79d5`.

**Decision: no further blind shortening/symmetric/asymmetric candidate sweeps of these two tabs.** Tests confirm they were too long; at this stage there are clearly diminishing returns. The .36/.36 version is a separately editable improved experimental comparison but not an original-faithful production accept. R77 and R79 never changed actual game production assets.

### Next substantive geometry goal

Reconstruct the **real asymmetric three major cream metal mount castings** with genuine top/underside contour, independent hull stays and fin-root connection, rather than endlessly editing tiny tab lengths or adding imaginary pivots. Specifically compare the center crosspiece profile, left angled metal armor cover and right red-wire offset housing against the genuine original body sprite; currently the broad reconstructed metal plates are smooth gray and spatially unlike the original. Preserve original two short visible tabs, all original 64-frame heat-fin movement, and the same physical mount hierarchy. Any changes to source-observed cast and skin surfaces must be justified by direct source comparison; no rings or invented hydraulic pivots. Art/fidelity diagnostics remain non-release-blocking.
