# R106–R107 private original-sprite cutoff test — intermediate evidence

**Authoritative reference:** user's private Factorio thruster.zip, SHA256 0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791. The original art was not uploaded to GitHub, not embedded in Blender, and is not part of a public CI artifact.

## Recovered first real Blender-cut frames

R106 [run #41520345174](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41520345174) and R107 [run #41526832050](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41526832050) both physically removed the first fin-root strip, generated real native source-camera frame 1/33 renders, and saved/reopened an editable blend scene before failing their post-reopen check. These workflows are **failed**, not passed. In both cases, the failure message was `changed materials instead of cutting actual fin geometry`, in a check enumerating every Blender data.materials datablock. Blender may omit unused material datablocks on save/reopen. This check was replaced with verification of only materials actively used by scene objects plus shader links and per-object material slots; R106 commit db6a85351c3823f4c397649919a0f31fa6e22baa; R107 commit 9d39bbbceaaefcab04409aa60cd89a0517f312d7.

## Direct private actual-original comparison, best R104 source-tested assembly

Candidate: right_chamfer_plus_left_heel__baffle00_recess_inboard_014, baseline versus physically chopped **three main upper fins** (main_cut_at_row1). Recovered R107 artifact ID 13184260843. Native original and Blender frame both 264 × 542. RGB MAE alpha-premultiplied to black (lower is better). Edge distance: symmetric Sobel gradient Euclidean Chamfer px (lower is better). Region x36–228,y329–384 is the rear fin-root cut.

| Source frame | Original-vs-baseline RGB MAE | Original-vs-cut RGB MAE | Baseline edge px | Cut edge px |
|---|---:|---:|---:|---:|
| 1 | 0.126814 | **0.126509** | 2.752 | **2.679** |
| 33 | 0.134972 | **0.134702** | 2.536 | **2.503** |

Additional original-source normalized RGB MAE: complete mounting region x26–225,y298–420 (frame1 0.130375 → 0.130234; frame33 0.137306 → 0.137170). All upper fins x40–225,y336–444 (frame1 0.107596 → 0.107461; frame33 0.115321 → 0.115219). Mouth x48–215,y394–522 changes less than 0.000002, as intended.

The physical removal visibly changes only around the fin roots: 647 pixels (0.452% of frame) at >1 RGBA byte contrast, or 144 pixels (0.101% of frame) at >10 bytes, for source-camera frame1. Significant >10-byte changes are bounded x62–184,y320–348; no unrestricted changes to nozzle/upper machine. This is **a small but consistent source improvement** at both original frames. It does not yet establish visual approval, a correct body/fin termination silhouette, or complete 64-frame source matching.

## Required remaining outcomes

Fresh [R106 run 41539631089](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41539631089) and [R107 run 41539637521](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41539637521) must finish real Blender and saved/reopened geometry tests after the material-verification repair. Rank the deeper, bespoke and both-side candidate cutoffs against the source privately. Reject false source improvements due to mask or improper fin geometry; the source remains the only target. All tests of art/style remain diagnostics, not release gates.
