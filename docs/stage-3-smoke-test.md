# Stage 3 Airship Editor Smoke Test

Use this checklist after GitHub Pages deploys the Airship / Vessel Editor.

## Load path

1. Open the deployed site.
2. Open the **Kaysender** tab.
3. Search for `airship`.
4. Confirm the card title is **Airship and Vessel Generator and Editor**.
5. Confirm the card has **Launch Detailed Airship Editor**.

## Basic editor behavior

1. Launch the editor.
2. Confirm source-derived assumptions appear above the controls.
3. Confirm two optional context boxes appear:
   - Floating Island context.
   - Settlement context.
4. Confirm controls exist for vessel name, vessel class, hull culture, core type, purpose, legal status, crew quality, crew scale, captain style, cargo, armament, defenses, condition, maintenance, route, faction, hidden problem, mission, morale, fuel, and port.
5. Click **Build Airship Profile**.
6. Confirm the editor produces:
   - Summary.
   - Airworthiness.
   - Cargo value.
   - Combat threat.
   - Maintenance risk.
   - Legal risk.
   - Crew morale.
   - Adventure density.
   - Route compatibility.
   - Technical notes.
   - Crew hooks.
   - Cargo hooks.
   - Route hooks.
   - Faction hooks.
   - Maintenance hooks.
   - Encounter hooks.
   - Draft wiki-entry JSON.
   - Full airship profile JSON.

## Randomization

1. Click **Randomize Controls**.
2. Confirm controls change.
3. Confirm output rebuilds.

## Island inheritance

1. Open the Floating Island / Skyland Editor.
2. Generate or build a floating island profile.
3. Copy the full profile JSON.
4. Open the Airship / Vessel Editor.
5. Paste the island profile into the Optional Island Context box.
6. Click **Read Island Context**.
7. Confirm the editor reports the island context as loaded.
8. Confirm airship defaults update based on island route, faction, resource, threat, and altitude data.

## Settlement inheritance

1. Open the Settlement / Skyport Editor.
2. Generate or build a settlement profile.
3. Copy the full profile JSON.
4. Open the Airship / Vessel Editor.
5. Paste the settlement profile into the Optional Settlement Context box.
6. Click **Read Settlement Context**.
7. Confirm the editor reports the settlement context as loaded.
8. Confirm airship defaults update based on settlement trade access, economy, faction presence, crisis, defenses, and settlement type.

## Export behavior

1. Click **Copy Profile JSON**.
2. Confirm clipboard copy succeeds or fallback textareas remain available.
3. Click **Download Profile JSON**.
4. Confirm a JSON file downloads.

## Known alpha caveats

- Island and settlement context are pasted manually for now.
- Ship combat is not yet implemented as a rules framework.
- Cargo volume, exact crew count, travel time, fuel consumption, and core-specific failure tables are still future improvements.
