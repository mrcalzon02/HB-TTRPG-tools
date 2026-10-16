# Alpha 0.8 LAN Case Authority — Implementation Slice

Version: Alpha 0.8; status: implemented source-level proof, tested on Linux loopback and Swing/Xvfb; no Windows production claim.

## Implemented contracts

- `LanCase` owns three hunter health, stress, remaining wards, three confirmed tool families, true-anchor ward state, timed ritual, and terminal mission outcome. It accepts role/room/tool *intent*, never remote damage, evidence truth, ghost positions, or rewards.
- `LanHost` admits `SCAN|EMF|sequence`, `SCAN|THERMOMETER|sequence`, `SCAN|SPIRIT_BOX|sequence`, `WARD|sequence`, `CLEANSE|sequence`, `EXTRACT|sequence` only for hunter seats during an active match. These actions share the same monotonic per-hunter sequence as `MOVE`.
- A room-only anchor measurement can confirm a tool family. A ghost EMF spike away from the anchor can be perceived but is not auto-confirmed as a site anchor. Confirmations are broadcast only to investigators.
- A valid anchor ward protects against strike damage and permits a 45-tick cleansing process when three independent clues are present. One legal `DISTURB` at the anchor subtracts 12 ticks of ritual progress. Extraction from the van ends the room-level mission with a retreat result.
- Host-applied effects alter only hunters in the haunted room, individually, with no client-trusted damage. Health/fear/remaining wards and circle progress are `PROGRESS` sent to a hunter only. `TEAMMAP` with friendly room IDs is hunter-only; ghost receives only its previous seven-field legal `STATE` snapshot.
- On terminal outcome, host broadcasts `RESULT` to all connected seats, cancels running case actions, and requires a new LAN host for a subsequent case.
- The compact Swing LAN window has role-gated controls and visible case/team progress.

## Verified behaviors

`sh build.sh` runs `LanCaseTest`, `LanCaseIntegrationTest`, previous `LanProtocolTest`, `LanLobbyTest`, and all existing solo/ghost/texture/van tests. The four-client integration test uses actual sockets for H1/H2/H3/Ghost, checks strong/inconclusive reading provenance, shared evidence, a replay attempt across command categories, forbidden actions by ghost/hunters, ward and timed ritual, hidden `PROGRESS`/`EVIDENCE`/`RITUAL`/`TEAMMAP` from ghost, terminal results, and post-result rejection. `LanWindowSmokeTest` passed with Xvfb.

## Next dependency

Network real 3D player transforms, collision/door interactions, authoritative evidence sockets and in-scene equipment states; LAN retransmission/rejoin testing; host/campaign save boundary and payout idempotency; clean-machine Windows packaging. Source-level room-graph proof is intentionally not considered full P07/P08/P18 completion.
