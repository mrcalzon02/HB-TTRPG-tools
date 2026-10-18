# Rules — How a Beckenburg Investigation Works

[Wiki home](README.md) · [Evidence](evidence.md) · [Ghosts](ghosts.md) · [Costs](shops-and-costs.md)

## The contract

From Beckenburg Castle, choose a role and an available site, prepare equipment and launch an expedition. The main gameplay loop is **search → observe → decide → identify → ward → perform the correct rite → extract**. A successful team must survive real host-simulated ghost behavior; retreat is permitted when completing the ritual is too dangerous. The castle is a navigable prototype hub, with expanded campaign reclamation, staff and upgrades planned.

**Solo prototype:** Play as a hunter against an AI Spirit, or launch a separate local ghost-practice simulation. The legacy solo case currently has its own simpler cleansing flow and UI instructions; it should not be mistaken for the finished thirteen-ghost LAN contract.

**LAN alpha:** Configure **1–6 hunters**, plus at most one human ghost seat; if no human ghost is seated, the AI handles the entity. The owner starts the mission after the configured participants ready up. The ghost player does **not** select or learn their species while in the lobby; the species is exposed on joining the actual ghost view. A random cosmetic ghost lobby avatar communicates the player's selected side, not the hidden match identity. All world effects, real readings, movement bounds, damage, inventory and rituals are host authoritative. Connection recovery is in source, but comprehensive Windows multiplayer acceptance remains an open gate.

The Hunter disciplines are **Cleric** (protective wards and ritual leadership), **Observer** (measurements, sensors and mapping) and **Demonologist** (lore, controlled provocation and risky spirit interaction). Their specialized trees and full balance are planned; the current game allows each discipline to pursue a basic investigation without a mandatory class lock.

## Winning, leaving and losing

For a species-identity LAN case:

1. **Investigate:** Survey named rooms with equipment, watch genuine ghost actions and note useful patterns. A journal tick is your judgment, not an automatic verdict. The system does **not** require obtaining three positive observations before proceeding.
2. **Identify:** Select the ghost and submit the guess (LAN **P**). The host checks your submitted species; an incorrect submission currently adds **15 stress** to that investigator and another guess is rate-limited by **30 host ticks**.
3. **Prepare the anchor:** Place a ward **at the haunting anchor room**; a defensive ward elsewhere can help but does not prepare the rite.
4. **Select its required rite:** Use the actual mapped **Banishment**, **Cleansing** or **Absolution** installation. Approach within **2 world units** (approximately 2 m in the authored house) for spatial validation.
5. **Defend the rite:** Keep at least one living active hunter in the ritual room. Leaving pauses the channel; **20 unattended ticks** breaks the attempt. A completed banishment takes **55 ticks** (5.5 s), cleansing **45** (4.5 s), absolution **60** (6 s) on the **100 ms host tick**.
6. **Finish or retreat:** The host records **BANISHED**, **CLEANSED**, **ABSOLVED**, **RETREATED** or **LOST**. Extraction requires physically returning to van staging while a mission is active.

A ritual needs *correct identity + correct rite + anchor ward + correct physical ritual site + defended channel*, **not** three manually checked or magically verified evidence types. Some older help text still displays a three-tool checklist; it is a legacy prompt and should be updated as the interface is revised.

## The ghost's obligations and freedom

The AI and human ghost both use the same legal action dispatcher. Available base actions are **Drift** (move), **Whisper**, **Disturb**, **Manifest**, **Strike** and **Signature**. Each checks energy, cooldown, position, timing, occupancy and world restrictions. Ghosts recharge under species-specific conditions and issue real audible or physical effects; the human ghost has no entitlement to hunter casefiles or unobserved positions.

The new host-driven **mandatory event clock** prompts a human ghost roughly every **10–15 seconds** with a short list of legal actions. The ghost chooses what to do; after a missed deadline, the server chooses a **real legal action**. Merely drifting cannot count as a haunting event. If wards, cooldowns or low energy leave no event legal, the host retries rather than producing a fictional signal. A ghost must therefore contribute ongoing activity once permitted by the game state. Specific world-realization of advanced special powers remains planned.

Combat is not an instant kill: host-side spatial strikes are telegraphed, proximity-limited and cause incremental health and fear losses. Defensive crosses, wards, salt and hiding interact with these threats. Incapacitated hunters cannot continue ordinary field actions.

## Difficulty and host configuration

A party of 1–6 hunters receives an automatic **+1 through +6 party difficulty** bonus. Implemented custom controls include hunter walking speed **50–150%**, sprint speed **100–200%**, sprint allowance, starting sanity, passive drain **0–200%**, ghost speed **50–150%**, energy recovery **50–200%**, activity frequency, hiding spot density **0–100%** and the van sanity/activity monitor toggles. Many familiar extra options—full hunt timers, adjustable evidence count, weather controls, favorite-room changes and payout multipliers—are still pending. Pending toggles should not appear to work in the lobby.

See [custom difficulty matrix](../CUSTOM_DIFFICULTY_MATRIX.md), [host contract](../../../software/beckenburg/src/main/java/org/beckenburg/CustomContract.java) and [LAN lobby](../../../software/beckenburg/src/main/java/org/beckenburg/LanLobbyWindow.java).

## Present LAN hunter controls

| Key | Action |
| --- | --- |
| WASD / mouse / arrows | Move / look; click to capture pointer |
| E | Interact with door, lights or nearby breaker |
| 1, 2, 3 then R | EMF, thermometer, spirit box; take a reading |
| TAB / J | Open investigator evidence/ghost guide / raw measurement journal |
| I then P | Cycle ghost guess / submit identification |
| C / B / N / V | Ward / cleansing / banishment / absolution |
| Z / G / H / U | Deploy cross / thrown ward / salt / scan UV |
| F8 / F9 / F10 | Place / inspect / recover writing book (host source slice) |
| L / X | Hide / extract at van staging |
| K / T / Y | Shop at van equipment station / consume health / consume sanity medicine |
| F3 / F4 / F7 | Voice / radio voice / voice settings |
| Enter / F2 | Local text chat / radio text chat |

The human-ghost panel uses WASD and mouse-look, **1–3** for offered haunting actions, **4** for strike, **5** for signature, **[ / ]** to choose a neighboring room and **SPACE** to drift. See [LanWorldPanel](../../../software/beckenburg/src/main/java/org/beckenburg/LanWorldPanel.java), [LanGhostPanel](../../../software/beckenburg/src/main/java/org/beckenburg/LanGhostPanel.java), [GhostDomain](../../../software/beckenburg/src/main/java/org/beckenburg/GhostDomain.java), [GhostActionCadence](../../../software/beckenburg/src/main/java/org/beckenburg/GhostActionCadence.java) and [LanCase](../../../software/beckenburg/src/main/java/org/beckenburg/LanCase.java).
