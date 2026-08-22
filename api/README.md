# Foundry AI/API integration

This directory defines the machine-readable discovery and invocation contract for Calzon's TTRPG Foundry.

The authoritative rule is **mirrored calls, not mirrored logic**. Existing generators, calculators, laboratory solvers, campaign records, rule JSON, and lore archives remain authoritative. The API layer discovers, documents, loads, invokes, and searches those authorities; it does not copy their algorithms.

## Contract layers

The public integration surface is split deliberately:

- `foundry-capabilities.json` answers **what capability exists, where its canonical runtime lives, and how it is invoked**.
- `operation-contracts.json` answers **exactly what arguments an invocation accepts and what it returns**.
- `resource-collections.json` answers **what indexed information collections exist and how they can be retrieved, expanded, or searched**.
- `/foundry-api.js` is the same-origin browser facade that joins those contracts together.
- `/llms.txt` is the lightweight agent-discovery entrypoint.

An agent should not normally need to inspect implementation source to learn how to make a valid call.

## Self-describing capability use

Inspect an entire capability:

```js
const descriptor = await HBFoundryAPI.describe('shadowrun.binary-cube');
console.log(descriptor.operationContract);
```

Inspect one operation only:

```js
const contract = await HBFoundryAPI.operationContract(
  'shadowrun.binary-cube',
  'createKey'
);
```

Enumerate all documented capability contracts:

```js
const contracts = await HBFoundryAPI.listOperationContracts();
```

The operation contract records positional order, parameter names, public types, required/optional status, units, defaults, ranges, enums, nested fields, return descriptions, context requirements, and examples where useful.

Executable dispatch is contract-gated. An operation must both be exposed by the capability manifest and have a corresponding operation contract before `HBFoundryAPI.invoke()` will dispatch it.

## Generator example

```html
<script src="foundry-api.js"></script>
<script>
  const map = await HBFoundryAPI.invoke('spatial.module-map.generate', {
    seed: 'estate-17',
    locationArchetype: 'mansion',
    rulesTarget: 'open_d20',
    dangerLevel: 5,
    adventurePurpose: 'investigation'
  });
</script>
```

## Binary Cube example

```js
const createKeyContract = await HBFoundryAPI.operationContract(
  'shadowrun.binary-cube',
  'createKey'
);

const key = await HBFoundryAPI.invoke('shadowrun.binary-cube', {
  operation: 'createKey',
  args: [{
    gridSize: 16,
    seed: 'run-echo',
    inputFace: 'top',
    outputFace: 'front',
    maskDensity: 0.75
  }]
});

const encrypted = await HBFoundryAPI.invoke('shadowrun.binary-cube', {
  operation: 'encryptBinary',
  args: ['0100100001101001', key]
});
```

The Binary Cube engine remains explicitly classified as experimental TTRPG permutation/obfuscation research rather than production cryptography.

## Signals Laboratory example

```js
const wavelengthContract = await HBFoundryAPI.operationContract(
  'signals.utilities',
  'wavelength'
);

const wavelength = await HBFoundryAPI.invoke('signals.utilities', {
  operation: 'wavelength',
  args: [145800000]
});
```

Every operation currently exposed through `signals.utilities` has its own argument and return contract rather than relying on a generic undocumented `args[]` convention.

## Resource/index use

List registered collections and inspect their declared supported operations:

```js
const resources = await HBFoundryAPI.listResources();
const kaysender = resources.find(item => item.id === 'kaysender.wiki-index');
console.log(kaysender.supports);
```

Expand a canonical index into child resources:

```js
const packs = await HBFoundryAPI.expandResourceIndex('kaysender.wiki-index');
```

Search the complete indexed collection:

```js
const hits = await HBFoundryAPI.searchCollection(
  'kaysender.wiki-index',
  'Dunhallow',
  { maxResults: 30 }
);
```

Search selected top-level resources:

```js
const hits = await HBFoundryAPI.searchResources('Lunar Tribunal', {
  workspace: 'Blacklight Continuum',
  maxResults: 20
});
```

`resource-collections.json` self-documents the supported facade calls `getResource`, `expandResourceIndex`, `searchCollection`, and `searchResources`, including their arguments, defaults, limits, and return semantics.

## External agent use

GitHub Pages does not run a server-side tool executor. Static JSON/HTML resources may be retrieved directly. For executable capabilities, an MCP/OpenAI-tool bridge should consume both `foundry-capabilities.json` and `operation-contracts.json`, construct tools from the documented contracts, and invoke the exact canonical global/method described by the capability descriptor in an appropriate JavaScript/browser runtime.

A bridge should preserve stable capability ids and operation names. For dispatcher capabilities, the documented positional argument order is authoritative. It should not guess arguments from prose or create a second implementation of the underlying generator/laboratory logic.

`browser-page-context`, `browser-ui`, and live-sensor classifications are intentional. They prevent an adapter from claiming portable headless access where the current canonical implementation still requires initialized DOM/UI/device state.

## Validation gate

`scripts/validate-foundry-api.mjs` verifies the discovery layer on `main`. Among other checks it requires:

- every capability to have an operation contract;
- every dispatcher operation in the manifest to have exactly one matching documented contract;
- no contract operation to exist outside the manifest allow-list;
- every documented argument to declare a name, type, and required/optional status;
- every operation to document its return value;
- every runtime/source/resource path and every expandable index child to exist;
- the operation-contract index to remain registered and advertised through `llms.txt`.

The corresponding GitHub Actions workflow runs the JavaScript syntax check and this contract validator when the API surface or its authoritative indexed sources change.
