# Stage 2 — Settlement / Skyport Editor

The Settlement / Skyport Editor is the second staged editor in the Kaysender derived-tools sequence.

It follows the Floating Island / Skyland Editor because settlements should not be created in isolation. A settlement in Kaysender is shaped by its island, its water source, its food source, its trade access, its defenses, its faction pressure, and its current crisis.

## Source-derived design anchors

The editor is based on several recurring Kaysender settlement pressures:

- Sky settlements exist in unstable geography and may be cut off by drift, storms, route collapse, or island fracture.
- Water and food are political resources, not background assumptions.
- Small island towns may serve as agricultural hubs, skyports, neutral-ground stops, guild camps, pilgrimage refuges, military watches, or dragon-tithed hamlets.
- Dunhallow Roost provides the working pattern for a small settlement: a remote sky island, recent draconic tithe, agricultural production, trade dependence, fragile defenses, and faction observation around a central tavern.
- Faction presence should alter trade, information, security, jobs, and settlement morale.

## Files added

- `data/kaysender/editors/settlement-editor.json`
- `data/kaysender/schemas/settlement-profile.schema.json`
- `kaysender-settlement-editor.js`

## Runtime behavior

The editor attaches to the `settlement-generator` registry card and adds:

- **Launch Detailed Settlement Editor**

The editor provides:

- Manual controls.
- Randomized controls.
- Optional pasted Floating Island profile JSON.
- Inherited defaults from a Floating Island / Skyland profile.
- Derived scores.
- GM-facing hooks.
- Draft wiki-entry JSON.
- Full settlement profile JSON.
- Copy and download profile JSON actions.

## Settlement controls

The current editor exposes:

- Settlement name.
- Settlement type.
- Population scale.
- Government / authority.
- Defense posture.
- Economic base.
- Water status.
- Food status.
- Trade access.
- Faction presence.
- Social stress.
- Civic asset.
- Local secret.
- Current crisis clock.

## Optional island inheritance

The editor can read a pasted Floating Island profile JSON and use it to infer settlement defaults.

Examples:

- Island water profile maps into settlement water status.
- Island food profile maps into settlement food status.
- Island route access maps into settlement trade access.
- Island faction pressure maps into settlement faction presence.
- Island threat clock maps into settlement crisis clock.
- Island habitability, route value, conflict pressure, and collapse risk influence settlement scoring.

This creates the first real staged dependency between editors.

## Derived scores

The editor currently derives:

- Survivability.
- Trade value.
- Defense readiness.
- Unrest risk.
- Adventure density.
- Island dependency.

## Outputs

The editor produces:

- Summary.
- GM notes.
- Leadership hooks.
- Market hooks.
- Faction hooks.
- Defense hooks.
- Job hooks.
- Draft wiki entry.
- Full settlement profile JSON.

## Next improvements

- Add population numbers and population breakdowns by ancestry / occupation.
- Add militia count, specialist count, and available crews.
- Add civic layout blocks such as tavern, cistern, dock, market, windmill, guild office, temple, and redoubt.
- Add settlement map-zone output.
- Add black-market pressure and neutral-ground logic.
- Add an option to import multiple island profiles for a chain of communities.
- Add direct save-to-local-browser campaign notebook.
- Add generated settlement profiles as temporary wiki entries inside the UI.
