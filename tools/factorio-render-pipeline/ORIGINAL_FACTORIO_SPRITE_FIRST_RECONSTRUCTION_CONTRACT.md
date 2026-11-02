# Source-first 3D reconstruction contract — Factorio thruster

**This project's purpose is to reconstruct, in Blender, the particular 3D object whose render appears in the ORIGINAL Factorio sprite frames. It is NOT a design exercise for a plausible spacecraft thruster.**

The user's exact original `thruster.zip` (SHA256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`) contains the 64 original body frames in two 2112x2168 RGBA atlas pages, each frame 264x542. The separate flame, glow, pipe and information overlay sheets MUST NOT be modeled as part of the physical metal object. Keep proprietary sprites outside the public repository, public CI logs and artifacts.

## Authority and modeling order

1. **Observe the real source artwork first.** Record original-frame pixel landmarks, edge changes and occlusions; inspect more than one frame. Identify which visible shapes are separate objects, which are layers of a single casting, and which are just light/shading. Do not assume function or construction from the word *thruster*.
2. **Reconstruct actual 3D geometry** from those observations: independent shape, topology, volume, thickness, bevel, depth, orientation and relative registration. Flat image-plane cards, pasted source textures and generic invented greebles do not constitute the target.
3. **Use the original calibrated Blender camera** and consistent materials/lighting when testing, to avoid scoring a moved camera as a shape improvement.
4. The three upper fin mounts are **genuinely different**. Original port/left: diagonal, irregular forged upper link with stepped bracket and short lower heel. Original starboard/right: kinked, layered offset cover with the distinctive routed red lead. Original center: wide compact pale casting with two shorter individual integral tabs and copper feed above. A repeated swept 5x5 mounting plate is wrong even if it is mechanically plausible.
5. Original upper fin shapes have **broad shoulder nearest the attachment and narrowing toward the comparatively blunt distal free end**, with largely straight longitudinal sides in the camera projection. Distinct root-to-fin load contacts must remain attached as a candidate is revised. The original lower cupped guards, true open refractory throat and original 64-frame motion must be preserved.
6. Avoid unsupported rotating joint pins, pistons, actuator assemblies, additional collars, symmetrical mirrored mounts, decoration, or uniform ring shoes. The source does not prove their existence. Multi-frame original pixel positions and occlusion constrain what moves; hidden geometry remains a hypothesis.
7. **Make different hypotheses, not repetitions of failed micro-parameters.** Test substantial asymmetric changes of mesh topology, alignment, depth, width, thickness, slope and visibility independently, then combine only candidates that improve original-source shape. Assign candidates *diagnostic* status until source comparisons confirm.
8. **Validate against the ORIGINAL sprite**, with a private source check; measure source-native ROI registered RGB error and geometric internal-edge proximity across at least frames 1 and 33, extend to more original frames for meaningful changes. Image metrics reflect shading, and cannot on their own approve an incorrect solid. Inspect actual source-versus-real-Blender screenshots and true 3D objects.
9. Save and reopen the editable Blender candidates. Verify no camera/material/motion regressions, no detached physical fin roots, and no overwriting of the known working candidate. Do not claim CI passing means visual fidelity.
10. Art/shape diagnostics must **never** become blockers for unrelated functional game releases.

## Status and evidence

- Original R21/R48 enlarged fins toward their **free tips**, opposite the original. R80/R81 corrected real metal taper; preferred R81 shoulder 0.22 / tip 0.15.
- R82 attempted a straight world-coordinate chord through the fins and visually failed by exposing a large false dark nozzle arch. R83 corrected only the angular sweep without losing physical radial clearance.
- R84/R85 adjusted original separate cast proportions; R85 `center_short.blend` is the working experiment, **not final approved source geometry**. Its SHA256 is `4343640f04b179c3b08ec2bdce1de77582e21cc45e195f173816603b709c36b7`.
- R87 changed actual R49 cast surfaces locally but improved source side ROI errors by under ~1%; **the repeated generic five-row/five-column/dual-skin underlying architecture is wrong**.
- R88 is an ownership diagnostic: check which *actual* meshes visually produce the wrong surfaces.
- R89 is a new source-first reconstruction candidate: independent, source-traced port/starboard volumetric outer housing sections and original 3D mechanical anchors; test real Blender renders, do **not** approve before source comparison.

Eight original body frame samples **1,9,17,25,33,41,49,57** were checked privately in hinge regions left x36–96/y305–349, right x162–225/y308–358, center x96–165/y310–345. Best local RGB translation from frame 1 in each ROI stayed within about ±2 source pixels; intensity/neighbor changes remain, so this is not proof of absolute static identity or hidden pivot motion. This evidence favors mostly fixed cast geometry and more careful motion reconstruction for the heat-fins rather than speculative hinge actuators.

**Source imagery is the specification; Blender geometry is the hypothesis; rendering is the verification.**
