# Ghost Frenzy — host-authoritative major action

**Ghost Frenzy** is an intense supernatural state *above* the standard
WHISPER / DISTURB / MANIFEST / STRIKE / SIGNATURE action ladder. It is not
the ordinary strike telegraph renamed, and does not copy instant-kill
mechanics from other ghost-hunting games.

## State machine

CALM → WARNING → RAGING → RECOVERY → CALM. Only the host can change a phase.
A warning opens a reaction window; **no Frenzy health or sanity attacks can
land until RAGING**. During RAGING the ghost can move via the existing
collision/room topology and choose attacks permitted by its species.
Crosses interrupt RAGING, forcing RECOVERY. Recovery prevents new Frenzies.
Host broadcasts a bounded `FRENZY|PHASE|remainingTicks|CAUSE` state to hunters
and the ghost, with read-back for newly entered 3D hunters.

The hunter/van extraction threshold is sealed during WARNING/RAGING, but
investigators already in the van remain safe. Hiding, collision, physical
line of sight, real 3D range, wards and local ghost energy all remain
host-authoritative. The actual human-ghost ability request carries only a
named action and replay-protected sequence: never hunter position or target.

### Species matrix (100 ms host simulation ticks)

| Ghost | Frenzy entry | Early sanity threshold | Warning | Rage | Recovery | CLAW (energy / HP / fear) | DREAD (energy / fear) |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Demon | 38 | 95 | 2.2s | 19s | 15s | 5 / 14 / 8 | 8 / 12 |
| Devil | 58 | 78 | 2.7s | 21s | 27s | 8 / 11 / 14 | 7 / 25 |
| Poltergeist | 64 | 68 | 2.5s | 21s | 33s | 10 / 16 / 9 | 8 / 17 |
| Banshee | 70 | 68 | 3.0s | 23s | 30s | Not permitted | 8 / 28 |
| Wraith | 73 | 65 | 2.7s | 23s | 35s | 8 / 16 / 12 | 9 / 18 |
| Hantu | 67 | 72 | 2.8s | 20s | 31s | 7 / 10 / 12 | 8 / 22 |
| Yokai | 72 | 72 | 2.7s | 20.5s | 31s | Not permitted | 8 / 23 |
| Shade | 82 | 48 | 3.5s | 17.5s | 43s | Not permitted | 10 / 27 |
| Specter | 78 | 56 | 3.1s | 19s | 40s | Not permitted | 10 / 26 |
| Possessive | 75 | 58 | 3.0s | 19s | 37s | 9 / 10 / 12 | 8 / 21 |
| Mimic | 72 | 72 | 2.5s | 19.5s | 34s | 8 / 12 / 14 | 9 / 19 |
| Twins | 69 | 67 | 2.8s | 22s | 34.5s | 9 / 12 / 12 | 8 / 19 |
| Spirit | 78 | 60 | 2.8s | 21s | 39s | 9 / 18 / 13 | 10 / 16 |

Sanity thresholds are **average player sanity**, not a secret threshold
handed to the human ghost client. Low sanity OR sufficient real-world
provocation unlocks host-driven Frenzy when entry price/time/recovery permit.
The Demon's 38-point entry price and shorter recovery permit frequent attacks;
its Frenzy contacts are deliberately *moderate*, rather than an instant kill.
The Demon gains 1 ambient energy per two ticks by its original `GhostTraits`
profile (before custom recharge modifiers). Warning and active duration,
CLAW/DREAD energy costs, per-ability cooldowns and allowed attack families
are species-defined. DREAD is sanity damage only; CLAW requires a damaging
species and within 2m contact, while DREAD requires sight within 5m.
Both are prohibited during WARNING and RECOVERY.

Actual host-validated actions such as rituals, nearby voices and equipment
can raise agitation. AI and human controllers use the *same* ability costs,
cooldowns and line-of-sight target checks. The host does not supply concealed
hunter coordinates to the human ghost. Legacy room-only compatibility clients
cannot be hit by coordinate-only Frenzy attacks without entering 3D mode.

Human ghost controls: **6** asks to start Frenzy, **7** CLAW, **8** DREAD
during RAGING. The view reports phase and remaining time. Hunters receive
warning/raging HUD prompts and switched hunt ambience.

## Testing and scope

`GhostFrenzyTest` asserts cheaper Demon entry, attack energy expenditure,
phase access, recovery, blocked repeats, sanity-only entities and provocation.
Build scripts include the test. Full graphical/multiplayer runtime acceptance,
post-release balance telemetry and 1–6-player manual hunting tests remain
required; don't claim those from static review alone.
