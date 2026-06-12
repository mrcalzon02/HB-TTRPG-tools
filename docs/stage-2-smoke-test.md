# Stage 2 Settlement Editor Smoke Test

Use this checklist after GitHub Pages deploys the Settlement / Skyport Editor.

## Load path

1. Open the deployed site.
2. Open the **Kaysender** tab.
3. Search for `settlement`.
4. Confirm the card title is **Settlement Generator and Skyport Editor**.
5. Confirm the card has **Launch Detailed Settlement Editor**.

## Basic editor behavior

1. Launch the editor.
2. Confirm source-derived assumptions appear above the controls.
3. Confirm controls exist for settlement name, type, population, government, defense, economy, water, food, trade access, faction, social stress, civic asset, local secret, and crisis clock.
4. Click **Build Settlement Profile**.
5. Confirm the editor produces:
   - Summary.
   - Survivability.
   - Trade value.
   - Defense readiness.
   - Unrest risk.
   - Adventure density.
   - Island dependency.
   - GM notes.
   - Leadership hooks.
   - Market hooks.
   - Faction hooks.
   - Defense hooks.
   - Job hooks.
   - Draft wiki-entry JSON.
   - Full settlement profile JSON.

## Randomization

1. Click **Randomize Controls**.
2. Confirm controls change.
3. Confirm output rebuilds.

## Island inheritance

1. Open the Floating Island / Skyland Editor.
2. Generate or build a floating island profile.
3. Copy the full profile JSON.
4. Open the Settlement / Skyport Editor.
5. Paste the island profile into the Optional Island Context box.
6. Click **Read Island Context**.
7. Confirm the editor reports the island context as loaded.
8. Confirm settlement defaults update based on island water, food, route, faction, and threat information.
9. Build the settlement profile again.
10. Confirm the output notes mention inherited island context.

## Export behavior

1. Click **Copy Profile JSON**.
2. Confirm clipboard copy succeeds or fallback textareas remain available.
3. Click **Download Profile JSON**.
4. Confirm a JSON file downloads.

## Known alpha caveats

- Island context is pasted manually for now.
- Generated settlement outputs are not yet saved to a campaign notebook.
- Population breakdown, militia count, map zones, and local NPC lists are not yet expanded.
