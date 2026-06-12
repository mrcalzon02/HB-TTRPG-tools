# Stage 3 — Airship / Vessel Editor

The Airship / Vessel Editor is the third staged editor in the Kaysender derived-tools sequence.

It follows the Floating Island / Skyland Editor and the Settlement / Skyport Editor because airships should not be created in isolation. A vessel in Kaysender is shaped by the island route, the settlement port, the cargo pressure, the faction entanglement, the crew, the core, the hull, and the mission.

## Source-derived design anchors

The editor is based on several recurring Kaysender airship pressures:

- Airships are not just vehicles. They are trade infrastructure, mobile bases, rescue tools, warships, smuggling platforms, pirate assets, faction vessels, and survival machines.
- Core type matters. Dwarven cores emphasize reliability and heavy-duty operation; Elven cores require attunement and sacred operator bonds; Dragon Kin cores express draconic elemental identity; Gnomish cores are experimental hybrid machines; Human cores are practical blends.
- Vessel class matters. Scouts, cutters, sloops, frigates, cruisers, liners, destroyers, galleons, and dreadnought-like vessels should imply different crew size, combat risk, cargo value, and social meaning.
- Crew morale can ruin a mission as surely as broken machinery.
- Ships should inherit pressure from island and settlement profiles instead of existing as detached random encounters.

## Files added

- `data/kaysender/editors/airship-editor.json`
- `data/kaysender/schemas/airship-profile.schema.json`
- `kaysender-airship-editor.js`

## Runtime behavior

The editor attaches to the `airship-vessel-generator` registry card and adds:

- **Launch Detailed Airship Editor**

The editor provides:

- Manual controls.
- Randomized controls.
- Optional pasted Floating Island profile JSON.
- Optional pasted Settlement profile JSON.
- Inherited defaults from island and settlement context.
- Derived scores.
- Technical notes.
- Crew hooks.
- Cargo hooks.
- Route hooks.
- Faction hooks.
- Maintenance hooks.
- Encounter hooks.
- Draft wiki-entry JSON.
- Full airship profile JSON.
- Copy and download profile JSON actions.

## Airship controls

The current editor exposes:

- Vessel name.
- Vessel class.
- Hull culture.
- Core type.
- Purpose.
- Legal status.
- Crew quality.
- Crew scale.
- Captain style.
- Cargo profile.
- Armament.
- Defense system.
- Condition.
- Maintenance pressure.
- Route compatibility.
- Route mandate.
- Faction entanglement.
- Hidden problem.
- Current mission.
- Morale state.
- Fuel / power supply.
- Port of call.

## Optional inheritance

The editor can read pasted Floating Island profile JSON and use it to infer:

- Route compatibility.
- Faction entanglement.
- Cargo profile.
- Route mandate.
- Altitude capability.

The editor can read pasted Settlement profile JSON and use it to infer:

- Route compatibility.
- Cargo profile.
- Faction entanglement.
- Route mandate.
- Legal status hints.
- Port of call.

This creates the second real staged dependency chain:

```text
Floating Island / Skyland Profile
        ↓
Settlement / Skyport Profile
        ↓
Airship / Vessel Profile
```

## Derived scores

The editor currently derives:

- Airworthiness.
- Cargo value.
- Combat threat.
- Maintenance risk.
- Legal risk.
- Crew morale.
- Adventure density.
- Route compatibility.

## Outputs

The editor produces:

- Summary.
- Technical notes.
- Crew hooks.
- Cargo hooks.
- Route hooks.
- Faction hooks.
- Maintenance hooks.
- Encounter hooks.
- Draft wiki entry.
- Full airship profile JSON.

## Next improvements

- Add exact crew counts by role.
- Add cargo volume / passenger load estimates.
- Add route travel time and fuel consumption.
- Add core-specific failure tables.
- Add hull-culture-specific strengths and weaknesses.
- Add morale event tables.
- Add ship combat abstraction in open d20-compatible language.
- Add port inspection and forged paperwork mechanics.
- Add direct save-to-local-browser campaign notebook.
