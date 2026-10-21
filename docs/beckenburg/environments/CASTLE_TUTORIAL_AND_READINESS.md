# Castle Beckenburg — Readiness Audit and Tutorial Expansion

**Source review: October 20, 2026.** A code/geometry inspection is not a clean Windows graphical acceptance run.

## What we have

CastleHubMap defines a 44 by 36 H-shaped ground plan with connected west, east and service wings, north great hall and open central courtyard. CastleHubArchitecturalPlan separately supplies measured walls, doorways/lintels, second-storey library deck, an upper gallery and traversable stair incline. CastleHubDecor supplies real model-backed furniture, mounted lights, switches and trim. CastleHubPanel supports first-person walk/look, collisions, lighting control, equipment purchases, role selection, expedition, network desk and spectral practice. CastleHubIntegrationTest contains geometry, station, asset and purchase validation checks.

**Assessment:** a genuinely walkable and furnished connected castle headquarters shell exists. It is **not a complete multi-building castle complex**, and the upper library is not proof of multiple finished towers/floors. The dedicated infirmary, working research laboratory, sanctuary, archive workflows, accommodation, relic vault, campaign operations, ritual training annex and full outdoor structures need further geometry and functioning interactions. Require actual visual walkthroughs, accessible circulation, true physical collision and source-backed assets before calling them finished.

## First campaign desk and orientation integration

The new CampaignBoardPanel provides a scrollable compact roster: nine established location families plus thirteen proposed wilderness locations, regional dossier text, current player credits and XP, and a deploy button enabled only by SiteCatalog.Location.playable(). It dispatches to the real current solo game using the already-selected discipline and environmental conditions; planned sites stay locked. It is available from the main menu and from the Castle CONTRACT station.

The panel displays a candid note: campaign progression and hired allies are **not implemented**. Ghost campaign, persistent story state and companion purchases remain future design.

The first CastleOrientation sequence is **real HQ orientation**, launched from CAMPAIGN BOARD → CASTLE ORIENTATION. Players physically visit the expedition station, campaign contract board, wardrobe and armory, then operate castle lights. During orientation, inspecting the armory cannot spend credits and inspecting expedition does not dispatch unexpectedly. Role switching and lighting are real controls. The visible objective follows player interaction and cannot be advanced by selecting a distant card. This orientation is reusable and gives no artificial campaign rewards.

**Not yet a paranormal tutorial:** no ghost, ritual teaching, loaner detectors, invented clues, supernatural training sequence, or training annex have been implemented by these changes.

## Full castle tutorial level requirements

1. **Arrival / navigation:** spawn in the real courtyard, teach movement, first-person aiming, light controls, map legend and fast route to expedition desk, with compact prompt overlays.
2. **Training stores:** a physical equipment bench where the player borrows issued temporary detectors, collects a genuine instrument and returns it to a marked socket. Do not grant permanent shop purchases.
3. **Evidence chamber:** instantiate safe host-originated events with normal instrument baselines and let players voluntarily mark, contradict or erase hypotheses in their manual journal; no auto-authentication.
4. **Three distinct rite bays:** physically build a Banishment containment circle, a Cleansing font with contamination-node loop, and an Absolution memorial/record chamber. All must use the actual future protocol engine (see detailed ritual spec), not a decorative progress bar.
5. **Live defense:** teach patrol, warding, ritually meaningful ghost interruption and recovering from a failed stage with an AI entity bound by normal legal action permissions. Explicit tutorial-only safety limits must not leak into multiplayer rules.
6. **Graduation:** permit free replay or skipping a learned lesson, restore training supplies without inventory duplication, award no repeated financial bonuses, and return to a functional contract board.
7. **Construction acceptance:** named and connected 3D spaces, legitimate walls/floors/doors/stairs, lighting, sound occlusion, actual interactions, keyboard/controller/focus tests, accessibility feedback, retreat routing and Windows graphics acceptance.

## Implementation gates still open

Compile all modified Java 17 sources, run CampaignBoardPanelTest and CastleOrientationTest, and perform an actual windowed interaction pass on Castle Beckenburg and the launched solo level. Then graybox a protected training annex; implement a shared three-protocol ritual state machine; reconcile manual deduction with host feedback; author real NPC ally behavior/persistence; and only then claim a complete single-player campaign.

Do not alter release milestones or mark the stage ledger complete on document or source commits alone. Links: [Ritual Protocols](../RITUAL_PROTOCOLS_DETAILED.md), [Campaign proposal](../CAMPAIGN_AND_ALLIED_INVESTIGATORS_DESIGN.md), [Location roster](WILDERNESS_AND_REMOTE_SITE_ROSTER.md).
