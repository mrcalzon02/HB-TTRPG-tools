# R105 — eight-frame genuine source benchmark of current fin-root gap

The only visual reference is the user's authentic private `thruster.zip` SHA256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`; both proprietary 2112×2168 atlases stay **private and outside GitHub**. Source frames 1/9/17/25/33/41/49/57 were extracted at the correct 8-column × 4-row, native 264×542 source coordinates. No user art in public artifacts. Private original artwork was compared locally against actual Blender native-camera PNGs from [successful R105 run #41516656756](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41516656756), artifact **13176618113**.

## Results: real eight original body poses

| Native original source region | Right-chamfer-left-heel R103 mean error | Both-stepped original R103 mean error |
|---|---:|---:|
| Fin root + rear end x36–228, y329–384: normalized alpha-premultiplied RGB MAE, lower better | **0.13334** | 0.13410 |
| Same root region: symmetric gradient-edge Chamfer px, lower better | **2.55368** | 2.57759 |
| Three full upper fins x40–225, y336–444: RGB | **0.11340** | 0.11360 |
| Whole mounting zone x26–225, y298–420: RGB | 0.13616 | **0.13549** |
| Refractory mouth x48–215, y394–522: RGB | **0.06792** | 0.06793 |

Fin-root RGB error for the right-chamfer-left-heel candidate varies across authentic frames: 1=.12680, 9=.13588, 17=.13278, 25=.13015, 33=.13497, 41=.13933, 49=.13034, 57=.13647. The source mismatch persists throughout the original animation, rather than being a one-frame accident. The chamfer-contour R97 branch matches the original root zone slightly better on both image RGB and gradient edge distance, even though the complete hinge region is a little better in the alternative.

**Decision:** prioritize original-body R104 **right_chamfer_plus_left_heel__baffle00_recess_inboard_014** as the *strongest working base* for the user-directed R107 discrete fin rear-end chop. The user's observed fin-root boundary is the actual 3D source geometry specification. Old assumptions that fin root vertices must merge deep into the simulated motor are wrong. The existing R105 images still show the original erroneous rear fin continuations; R105 is NOT proof that the R106/R107 new fin cuts have passed Blender.

R106 and R107 implement true finite-thickness end caps and physically remove the obsolete upper-fin proximal sheet row, while retaining original slots, tip, heat pigment, stationary body/mount/cups/nozzle, and all 64 original lower-fin shape keys. **R106/R107 CI status must be checked independently**; their source acceptance awaits *actual* corresponding rendered artifacts and 8-frame follow-up. Visual checks remain diagnostics and must not block unrelated functional game releases.
