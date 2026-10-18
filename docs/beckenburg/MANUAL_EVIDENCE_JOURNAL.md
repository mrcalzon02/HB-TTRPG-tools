# Beckenburg — investigator-marked evidence journal

**Interaction acceptance (2026-10-18).** Inspired by the successful broad mechanic of classic ghost-hunting deduction journals: the investigator manually marks evidence and a *published, species-compatible* ghost roster visually greys out incompatible entries. This is an original Beckenburg implementation, not a reproduction of another game's artwork, notebook textures or code.

## Live integration

- **TAB** opens the investigator's evidence page from the hunter first-person window. **J** opens the separate raw instrument measurements log. TAB rotates evidence, ghost reference and raw measurement pages.
- Checkboxes on the left are **player-selected conclusions**, sent through the existing hunter-only `NOTE` protocol; they **do not** inspect the private host species or verify any instrument reading. Click/SPACE toggles checked or clear. Right click marks ?/uncertain without excluding a ghost. UP/DOWN navigates the longer checklist.
- The **full 13-species roster remains displayed in two columns**. Every incompatible species name is dimmed and struck through; a contradictory checklist can leave zero species highlighted. The journal never deletes guesses, silently revises a player's selections or automatically identifies the creature.
- Clicking **any** ghost name (including greyed entries) selects the investigator's guess. Submission remains a separate existing command (`P`). The manual tick itself has no game-authorization or identification consequence.
- **Measurements are independent:** the shared `CASEFILE` journal logs timestamp/room/investigator/device/value even for ordinary/zero/non-response readings. Only manual `FieldJournal` marks alter the visible candidate list. Team hunter notes sync using the existing authenticated LAN server and are never delivered to the ghost-controlled seat. The current system is a **team-shared** checklist, not yet six independent personal checklists.
- Pointer capture is disabled while the journal is open, so mouse clicks can interact with actual evidence squares rather than moving the camera.

## Consistent ghost/evidence rules

Source is `GhostEvidenceProfile.java`, consulted by `GhostFieldGuide.possible()`. Temperature profile is also read by the host climate setup; writing producer reads the *same* subtype allowance. Live zero-EMF behavior belongs to Shade only, so its high-EMF row remains incompatible. Ghost writing is **not universal**: the current profile has child drawings, frantic scrawls and ritual circles spread across compatible types; all three share multiple ghosts. YOKAI, BANSHEE, HANTU and TWINS currently use other evidence families instead of book writing.

The manual checkboxes include ordinary EMF 2–7 and ordinary variable temperature (**neither greys out any ghost**), high EMF 8–10, real suppression 0, paranormal freezing and extreme heat, spirit-box replies, UV traces, ghost writing plus its three visual styles, orbs, witnessed movement and behavior. A **D.O.T.S. planned** item is shown as a future device and must not be mistaken for a finished projection tool. Its hypothetical compatibility is design data only until the world sensor exists. Similarly camera/orb visualization is unfinished. Never claim equipment is fully implemented merely because the journal can tick its evidence type.

The available state of any equipment *does not auto-tick anything*. Subtypes are manually selected when actually observed on a book. The app does not force hunters to collect three samples, does not treat three marked checkboxes as a ritual prerequisite, does not award evidence points for checking a square and does not derive the real identity from marks.

## Test contract and open gates

`ManualEvidenceJournalTest` tests 13 initial candidates, high-EMF grey-out, Shade suppression, conflicting checkmarks, unticking, heat and writing profiles, and hidden retired subtype keys. `ManualEvidenceHudTest` exercises opening and painting the 3D hunter overlay, host-note replay, full-roster grey-out and selecting an otherwise excluded ghost. `GhostWritingTest` asserts the real author respects the published profile for 13 species. Both `build.sh` and `build.cmd` now register these tests.

The GitHub changes have been committed; **fresh clean Java compilation, 1–6 player network tests, Windows runtime and visual acceptance remain unverified**. UI still uses the project's current compact dark notebook overlay rather than a licensed parchment recreation; world props, page art and full equipment acquisition are separate tasks. The species/evidence profile is the initial playable design slice and should undergo balance testing as the wider device catalog is implemented.
