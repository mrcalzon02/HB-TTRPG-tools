# Foundry AI/API integration

This directory defines the machine-readable discovery contract for Calzon's TTRPG Foundry.

The authoritative rule is **mirrored calls, not mirrored logic**. `foundry-capabilities.json` describes existing engines and data. `/foundry-api.js` is a small same-origin browser facade that discovers and invokes them. It does not contain copied generator, laboratory, campaign, or rules algorithms.

## Browser use

```html
<script src="foundry-api.js"></script>
<script>
  const maps = await HBFoundryAPI.invoke('spatial.module-map.generate', {
    seed: 'estate-17',
    locationArchetype: 'mansion',
    rulesTarget: 'open_d20',
    dangerLevel: 5,
    adventurePurpose: 'investigation'
  });
</script>
```

Signals utility dispatch:

```js
const wavelength = await HBFoundryAPI.invoke('signals.utilities', {
  operation: 'wavelength',
  args: [145800000]
});
```

Lore/rules lookup:

```js
const factions = await HBFoundryAPI.getResource('blacklight.supernatural-factions');
const hits = await HBFoundryAPI.searchResources('Lunar Tribunal', {
  workspace: 'Blacklight Continuum',
  maxResults: 20
});
```

## External agent use

GitHub Pages does not run a server-side tool executor. External agents may retrieve static resources directly. For executable capabilities, an MCP/OpenAI-tool bridge should consume `foundry-capabilities.json`, expose selected capability ids as tools, and invoke the exact canonical scripts/global/method listed by each descriptor in an appropriate JavaScript/browser runtime.

`browser-page-context`, `browser-ui`, and `live-sensor` are deliberate status classes. They prevent an adapter from claiming a portable API where the current authoritative implementation still depends on a page DOM, UI state, or physical sensors.
