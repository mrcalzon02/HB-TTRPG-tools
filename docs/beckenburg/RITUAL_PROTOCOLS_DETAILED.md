# Beckenburg — Distinct Banishment, Cleansing and Absolution Rituals

**Proposed detailed protocol; October 20, 2026.** This is an authoring/implementation contract, not an assertion that the new stages, reagents or minigames already function. The current host engine is LanCase.java, RitualSites.java, and GhostIdentity.java. The release stage ledger remains the single implementation-status authority.

## Actual current behavior and defect

| | Banishment | Cleansing | Absolution |
|---|---|---|---|
| Purpose | Force spirit out | Purify site | Release bound spirit |
| House installation | Sealed Iron Circle | Purification Font | Memorial Lectern |
| LAN channel | 55 × 100 ms | 45 × 100 ms | 60 × 100 ms |
| Ancient channel | 110 ticks | 90 ticks | 120 ticks |
| Host outcome | BANISHED | CLEANSED | ABSOLVED |

All three currently share identification, anchor ward, installation proximity, guard/channel, and interruption logic. The room empties: channel pauses, then breaks after 20 unattended ticks. Ghost DISTURB/SIGNATURE can regress shared ritual progress by 12/18 ticks. **Three distinct interactive processes do not yet exist.**

The current manual evidence journal correctly treats player ticks as personal hypotheses, not certified facts. However LanCase.identify currently accepts or rejects ghost guesses with information that can reveal correctness. **Correct that oracle behavior** before treating ritual identity as a complete fair mechanic: a selected hypothesis should be accepted as an attempt, and any actual mismatch should resolve by lawful terminal ritual behavior without silently disclosing the answer. No ritual may require three automatically authenticated clues. Devices log raw readings from actual world events; the investigator decides what they mean.

## Common prerequisites and responsibilities

1. Enter an authored map through a lawful expedition loadout; do not scatter purchased investigation devices as scenery.
2. Observe real environmental events, manually record hypotheses, and choose a possible entity. A story clue or historical dossier never auto-confirms a species.
3. Locate the true attachment anchor and prepare an actual ward with issued/owned resources. A defensive ward in the wrong room is not an anchor ward.
4. Reach the correct, separately modeled ritual installation with valid floor, body position, line of sight, and reachable interaction radius.
5. Supply that protocol's prepared consumables or recovered narrative objects. Reserve and consume them through host-owned transactional inventory, not an artificial UI click.
6. Execute distinct stages under actual cooldown, ghost-interference, injury and interruption rules. Single-player and 1–6 hunters must not require a missing specialty to succeed.
7. Produce exactly one host-controlled terminal outcome and financial result; support crash and reconnect idempotence and extraction.

## BANISHMENT — containment and forced expulsion

**Identity:** hostile, spatial, kinetic confrontation. Require lawful capture/binding rather than simply standing at a glowing altar.

**Candidate resources:** prepared anchor ward, iron-bound seals, chalk, chain, three focus mounts and charged reagent. Design per-site sockets; none of these represent free portable equipment.

**Phase B1: Draw boundary.** Player measures and places the circle's binding marks; each valid position must be visible and physically accessible.

**Phase B2: Charge three seals.** The party connects the binding pylons or chains in a meaningful order. Weak/broken seals can be repaired with limited supplies.

**Phase B3: Contain.** Lure or hold the ghost inside a constrained legal region without removing its agency or hiding the ghost's actual action costs.

**Phase B4: Expel.** Maintain the final channel while hostile powers can strike, disrupt a seal or force repositioning. A broken boundary halts or regresses the channel according to explicit limits; no arbitrary instant loss.

**Result:** BANISHED. The entity is forcibly removed; historical mysteries and physical damage may remain. Visual language: orange iron seals, chain tension, restrained manifestations, forceful closure.

**Current rite assignments:** Poltergeist, Demon, Wraith, Devil; ancient Poltergeist, Demon and Wraith follow the same required rite with harder channels.

## CLEANSING — remediation of corruption

**Identity:** methodical environmental treatment across multiple contamination sources; not merely a faster exorcism.

**Candidate resources:** purification font, prepared water/salt solution, safe containers and calibrated raw-resonance tools.

**Phase C1: Survey.** Locate genuinely contaminated nodes by observations and instruments; actual sources are chosen per case, with natural weather/utility confounders.

**Phase C2: Prepare.** Blend or charge the actual solution at the font using owned/issued material.

**Phase C3: Treat.** Carry finite treatment portions to the selected nodes; apply and observe effects. Ghost may lawfully recontaminate one unattended node with limits.

**Phase C4: Stabilize.** Return to the purification font, perform the short final channel and compare readings against baseline. Rechecking is a player decision, never an auto-confirmation.

**Result:** CLEANSED. Corruption and associated haunting cease, with a measurable return toward normality. Visual language: fluid, salt crystallization, blue-green purification and environmental restoration.

**Current rite assignments:** Shade, Specter, Hantu, Mimic; ancient Shade, Specter and Hantu use Cleansing.

## ABSOLUTION — understanding and release

**Identity:** contextual investigation, restoration of a meaningful attachment, then a vulnerable vigil. A ghost need not be innocent or cooperative.

**Candidate resources:** memorial lectern, recoverable personal effects, fictional records, symbolic repair/restoration items and optional history documents.

**Phase A1: Investigate obligation.** Collect and interpret multiple possible accounts or object associations. Never fabricate a pre-confirmed ghost identifier.

**Phase A2: Restore connection.** Return the selected actual object, restore an inscription, or reconstruct a memorial; each site must supply a plausible alternative path, not a pixel hunt.

**Phase A3: Resolve.** Perform a legible contract-specific act, such as acknowledging a name or completing a lawful memorial task. Wrong interpretation may cost time and provoke a response without revealing correct species.

**Phase A4: Vigil.** Maintain a final recital/quiet channel under real ghost interference. A ghost can move objects, manifest and resist with its own action budget.

**Result:** ABSOLVED. The spirit's binding concludes through reconciliation or release, not violent expulsion. Visual language: memorial markers, warm candles and a gradual reduction of haunt pressure.

**Current rite assignments:** Possessive, Yokai, Banshee, Spirit, Twins; ancient Possessive, Yokai, Banshee and Twins use Absolution.

## Authoritative state model (future)

Define RitualProtocol with ID, rite, eligible ghost archetypes, authored installation/socket, inventory requirements, anchor rule, stage list, per-stage interaction volumes, progress/repair rules, ancient multiplier, outcome and audiovisual effects. RitualAttempt owns a unique attempt ID, authoritative stage, resource reservations, participants, progress, interruption history and terminal receipt.

Commands PREPARE, PLACE, CHARGE, APPLY, CHANNEL, REPAIR, RETREAT and COMPLETE require range, correct world-state preconditions and actual inventory. Ghost and hunter controllers use the same commands and observation permissions as their human equivalents. No UI-only shortcuts, no teleport-only acts, no free gear, no duplication on reconnect, and no ritual success inferred from a button press alone.

## Acceptance matrix

- For each of the 23 currently defined base/ancient archetypes, exercise correct/wrong rite, wrong/true anchor, valid/invalid installation, safe/unsafe access, zero/adequate supplies, interrupted/complete attempt and correct terminal result.
- Simulate actual ghost contest, abandoned site grace, recovery, inventories and sequential stages for both AI and human ghost control.
- Confirm that **each** rite has unique interactive actions beyond changed prop, color, completion time or outcome label.
- Test solo and LAN, one to six investigators, field companion support when implemented, weather confounders, save/restart, and double-submit transactions.
- Verify tutorial loaners cannot enter the player's permanent purchased inventory or be used to farm cash/XP.

Related: [Three Ritual Sites](environments/THREE_RITUAL_SITES.md), [Manual Journal](MANUAL_EVIDENCE_JOURNAL.md), [Castle Tutorial](environments/CASTLE_TUTORIAL_AND_READINESS.md), and [Campaign Design](CAMPAIGN_AND_ALLIED_INVESTIGATORS_DESIGN.md).
