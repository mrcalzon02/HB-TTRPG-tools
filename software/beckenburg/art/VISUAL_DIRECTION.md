# Beckenburg Visual Direction — Art Bible v0.1

**Authority:** User selected early-to-middle original-PlayStation-era presentation to keep 3D modeling and visual production tractable. Treat original PlayStation (approximately 1994–1998) as the initial *look reference*, not a demand for actual PlayStation hardware limits. The Java 17 renderer remains modern Windows software despite the chosen art style. Avoid drifting into slick modern PBR, glossy modern cinematic ghosts or high-poly cinematic characters.

## Style contract
- Geometry: strong readable silhouettes; angular shoulders, boots, coats, tools, pointed accessories and box-like building kit. Face planes and low-poly silhouettes remain visibly faceted rather than hidden behind smooth normal maps.
- Color: muted charcoal stone, browns, tarnished bronze, midnight blue, moss-green observation gear, dark wine occult leather, bone white wards; accent color reserved for legible equipment reactions and supernatural states.
- Textures: small hand-painted/pixel-painted diffuse maps (64² standard small item/face/trim; 128² for prominent hero surfaces initially); pixel filtering and limited palettes. Texture seams and UV islands deliberately visible where period-appropriate.
- Lighting: baked or simple vertex shading, very few dynamic local lights, heavy but navigable shadow shapes, distance fog, no expensive global illumination requirement. Don't render clue-critical information purely by subtle color difference.
- Screen: 4:3 320×240/320×200 internal preview with nearest-neighbor upscale as baseline option; 16:9 supported by extending view, never stretching models/UI. Visual wobble, texture swim and dithering are optional *style toggles* and must not compromise controls, text or evidence confidence.
- Ghosts: low-poly mesh with readable negative space/spectral silhouette. Opacity and trails are carefully budgeted; avoid unreadable transparent particle clouds. Ghost pose/body language conveys state before attacks.
- Interfaces: compact functional inventory, equipment and evidence UI. Retro palettes and restrained gothic headers, but readable text, keyboard navigation, accessible clues and fast class/tool actions. No ornamental information padding.

## First-pass production budgets (targets, NOT hard engine caps)
| Asset class | Target range | Initial texture | Rig / animation |
|---|---:|---|---|
| Hunter field character | 450–850 triangles | 128×128 body atlas + 64² face | 12–18 joints or equivalent light rig |
| Ghost standard form | 250–900 triangles | 64²–128² unique atlas | 8–15 joints or mesh effect |
| Large spectral entity | 600–1300 triangles | 128² atlas | Custom if justified |
| Handheld detector or relic | 35–180 triangles | 32²–64² | 0–2 moving parts |
| Complex ritual kit | 90–250 triangles | 64²–128² | Limited effects |
| Furniture / hero prop | 40–200 triangles | 64² | none |
| Environment wall modular unit | 2–40 triangles | 64² trim | none |
These are modeling effort targets, not historic authenticity claims; measure runtime frame-time before any strict performance ceilings. Collision can use simplified hulls independent of visual triangles.

## Model-sheet capture standard
Each hunter class gets a named **front / profile / back** orthographic sheet; silhouette thumbnail; color/material swatches; face and accessory study; rig/pivot notes; first-person held-tool clearance; animation states; body and equipment triangle target; UV atlas plan and evidence of implemented geometry when developed. Equipment gets front/profile/3/4 silhouette, scale in hand, activation surface, palette, icon, screen/readout legibility and game-event wiring notes.

## Hunter sequence
**01 Cleric** — first visual profile and ritual kit. Dark practical field coat over restrained religious/occult vestments, waxed leather boots, old brass ward holder, travel stole or emblem, modest bracer, satchel, a non-denominational protective seal, supplies. Weapon silhouette is protective rather than militarized. Equipment: ward token, consecrated vessel, chalk circle kit, relic focus. Avoid direct appropriation of sacred symbols as required universal game assets; use Beckenburg's fictional geometric ward icon as primary identity.

**02 Observer** — next sheet. Layered rugged jacket, compact field recorder, hip camera, sensor belt, backpack, small bright readable sensor accents. Equipment: EM meter, thermal probe, waveform recorder, tripod camera and evidence notebook. Nothing too sleek/cyberpunk.

**03 Demonologist** — after Observer. Field researcher in worn burgundy/brown coat, ledger pouch, protective satchel, partially concealed binding diagrams, stained notebooks, practical gloves. Equipment: annotated grimoire, reusable seal frame, incense housing, marked containment cord, pact-analysis slips. Should read as professional occult risk-taker rather than an evil wizard.

## Equipment study batches
A: universal base tools — light, EM field meter, thermometer, audio recorder, notebook, camera.
B: Cleric rites — sanctified focus, ward marker, chalk and consecrated vessel.
C: Observer stations — motion detector, tripod, reference clock, directional microphone.
D: Demonologist ritual gear — seals, circle anchors, spirit receiver, pact document tool.
E: specialty ghost type response kits — cold, shadow, possession, spectral traversal, mimic cross-check.

## Proof and handoff
A concept picture is not yet a UV map or production 3D asset. Before marking a character modeled, source mesh and license must exist, polycount must be counted, character must animate/interact and 3D camera plus LAN clients must show it at intended scale. Every tool must have an equipment data definition with real readings after S5. The current 2D model/equipment references are art direction only.