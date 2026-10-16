# Beckenburg Alpha 1.5 — Acoustic Ghost Search and Pursuit

Scope: tested local LAN AI improvement; not final 13-ghost intelligence, a finished ghost sensory system, or completed multiplayer production acceptance.

## Gameplay now implemented

The host produces noise evidence from **accepted hunter movement, physical doors, equipment scans and ward/cleansing actions**. The AI receives no raw live hunter coordinates, player health, equipment ownership, character identity, team journal or hunter socket traffic. Direct client-supplied SOUND commands do not exist. Extraction is quiet; the van remains explicitly outside the ghost's trackable rooms.

`LanGhostPursuit` retains at most one filtered sound record (source kind, approximate two-metre tile center, perceived room, source tick, expiry tick). It hears quiet footsteps only nearby, louder doors/equipment across more rooms, and rituals farther away. Sound information expires; silence does not grant exact target acquisition. The AI follows valid room-graph paths toward the sound and uses only approved adjacent `DRIFT` commands through `GhostDomain.dispatch()`. Once in the audible room, its physical spectral movement uses exactly the same `LanGhostSpatial.step` with the same 0.31m/tick limit, room boundaries and solid blockers as a human ghost's `GSTEP`. A collision rejection does not teleport it or bypass a wall.

When the hunter is locally audible and a spatial strike is legitimately in reach, the AI may submit STRIKE through the same host range and wind-up pipeline as a human ghost. The finite sound record is required to initiate AI attacks and manifestations; a co-room Boolean alone cannot supply a hidden hunter's position. Occasional low-threat ambient whispers, disturbances, and random patrol continue without memory. Rejected actions never award free energy or ignore host cooldowns.

## Gate checks and known limitations

`LanGhostPursuitTest` verifies remote quiet footsteps are ignored, the staging van never becomes an AI target, approximate position quantization, route legality, actual physical step validation, finite expiry, zero-sound no-omniscience behavior and lack of illegal strikes. Existing full LAN tests retain AI fallback, controlled ghost action parity, authority, doors, spatial attack reach, impact wind-up and privacy. GUI hunter/ghost smoke tests are run separately on Linux Xvfb.

The current chase does not predict hunter plans, navigate complex furniture using a full navmesh, avoid wards tactically, or maintain advanced behavioral personalities. Room sound attenuation does not yet physically model materials or every intervening door; audible range is currently a bounded ghost-exit hop count and per-category lifetime. The 13 ghost archetypes will need calibrated differences. Physical Windows-to-Windows LAN and clean packaged Java runtime remain unverified. The approved original PNG concept art still lacks a verified GitHub binary gallery; no completion claim is made for P00/P08/P11/P15.

## Incremental follow-on

Integrate 3D positional sound emitters and caption equivalents, replace scalar hop-distance attenuation with door/material-aware acoustic portals, add last-heard search sectors and AI search timeout tests, then confirm fair human-vs-AI perception and pursuit behavior in four-client Windows playtests. Preserve existing GhostDomain action/cost authority and never send AI sound memory or hunter coordinates to a remote ghost player.
