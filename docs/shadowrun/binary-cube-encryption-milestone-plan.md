# Shadowrun Binary Cube Encryption Laboratory
## Step-by-Step Implementation and Validation Milestone Plan

**Repository:** `mrcalzon02/HB-TTRPG-tools`  
**Workspace:** Shadowrun  
**Branch policy:** `main` only  
**Initial implementation status:** Milestones 0 through 4 have a browser-based prototype foundation in `shadowrun-binary-cube-encryption.js`.  
**Security classification:** Experimental permutation/obfuscation research and tabletop-game utility. It is **not approved cryptography** and must not be represented as protection for real secrets.

---

## 1. Purpose and intended role

The Binary Cube Encryption Laboratory is a Shadowrun-facing research tool for developing, visualizing, testing, and eventually gamifying Christopher Vardeman's three-dimensional data-field concept. The source concept begins with a square face of binary data, assigns each face position to a unique point inside a cube, and then reads the same point field from another face so that the output appears rearranged. The key records the cube dimensions, point arrangement, chosen entry face, chosen exit face, orientation, padding behavior, and any data-entry mask required to reverse the transformation.

The first implementation deliberately treats the method as a **reversible keyed permutation** rather than claiming that geometric rearrangement alone provides modern cryptographic security. That distinction protects the project from accidentally promising more than has been demonstrated while still allowing the original idea to be implemented faithfully, measured, extended, and used as a Matrix puzzle, cipher prop, data-vault minigame, or fictional encryption-development system inside the Shadowrun workspace.

The tool must remain useful at three levels:

1. **Tabletop utility:** A game master can generate a key, encode binary, hand the package to players, and later decode it.
2. **Algorithm laboratory:** The project can inspect coordinate fields, face projections, block capacity, masks, and reversible transformations.
3. **Research scaffold:** Later milestones can evaluate nested cubes, split-key “Crossword” masks, integrity protection, and whether any version offers security beyond a permutation cipher.

---

## 2. Source-derived requirements

The uploaded design text defines the following core sequence:

1. Select a grid size.
2. Select a starting point or corner.
3. Generate a key by assigning non-overlapping column, row, and depth coordinates.
4. enter the data through a selected face.
5. Rotate or reorient the data field once.
6. export the transformed data.
7. reverse the process for decryption.

The source also introduces these required extensions:

- Recommended face sizes of 4, 12, 20, 28, 36, 44, 52, and 60.
- Random filler for incomplete blocks.
- Processing long inputs as multiple cube blocks.
- Data-entry masks that leave selected positions unused or filled with junk.
- Nested cubes in which local clusters are transformed and then relocated by a larger pattern.
- A “Crossword” method in which some essential data remains in the key or mask, making the transmitted payload incomplete by itself.

The spreadsheet provides a 4 × 4 face demonstration using the 16-bit input `0100100001101001`, with example projections labeled Top, Bottom, Front, Back, Left, and Right. Because the spreadsheet does not preserve an explicit coordinate-key table that proves how every face output was derived, those face strings are retained as a **legacy visual reference fixture**, not yet as a normative automated test vector.

---

## 3. Mathematical foundation selected for the prototype

### 3.1 Point-field interpretation

For a face size `N`, the cube contains `N²` active data points inside an `N × N × N` coordinate volume. Each input-face cell identifies one point. A point has coordinates `(x, y, z)`.

To ensure that no two active points overlap when viewed from the three principal axes, the implementation requires uniqueness for these coordinate pairs:

- `(x, y)` for top/bottom projection;
- `(x, z)` for front/back projection;
- `(y, z)` for left/right projection.

The prototype satisfies this by using a keyed Latin-square construction:

```text
z = depthPermutation[(rowPermutation[x] + columnPermutation[y]) mod N]
```

Every `(x, y)` pair exists exactly once. Within any fixed row or column, the resulting `z` values are a permutation of `0` through `N - 1`. Therefore each active point receives a unique cell on every principal face.

### 3.2 Encryption interpretation

A block contains `N²` face cells. Binary values are assigned to points according to the ordered input-face projection. The same point values are then read in the ordered output-face projection. This produces a reversible bit permutation.

The opposite face is not considered a valid encrypted exit in the prototype because it preserves the same projection with mirroring. The output must be one of the four faces perpendicular to the selected input face, reflecting the source warning that excessive or inappropriate rotation can restore a readable view.

### 3.3 Key material

The current key records:

- schema and algorithm identifiers;
- grid size;
- deterministic seed;
- input and output faces;
- input starting-corner orientation;
- output quarter-turn orientation;
- row, column, and depth permutations;
- data-entry mask;
- padding mode;
- key fingerprint.

The seed is retained in the prototype for reproducibility. A later security milestone must determine whether production-like modes should omit the seed, derive keys through a standard key-derivation function, or treat the full exported permutation set as the only key material.

---

# Milestone sequence

## Milestone 0 — Source intake, preservation, and project placement

### Objective
Preserve what was supplied, record its provenance, and ensure all implementation work lives under the existing Shadowrun workspace on `main`.

### Work items

1. Calculate file sizes and SHA-256 digests for the text and spreadsheet sources.
2. Record the original filenames exactly as supplied.
3. Extract the design stages, recommended sizes, advanced methods, and spreadsheet sample strings into a normalized source receipt.
4. Create `docs/shadowrun/` as the documentation home for the laboratory.
5. Register the new tool in the live Shadowrun module list.
6. Keep the original binary spreadsheet outside Git history unless a later repository policy explicitly approves binary source archival.

### Deliverables

- `source-page-references/shadowrun-binary-cube-encryption.source.json`
- `docs/shadowrun/binary-cube-encryption-milestone-plan.md`
- Shadowrun module registration in `shadowrun-entry.js`

### Acceptance gate

- Both source hashes are recorded.
- The implementation path is unambiguously identified.
- No new branch is created.
- The tool is visible from the Shadowrun workspace.

### Status
**Foundation completed in the initial pass.**

---

## Milestone 1 — Terminology and algorithm contract

### Objective
Turn the conceptual description into stable definitions that code, tests, documentation, and future contributors use consistently.

### Work items

1. Define `gridSize` as the side length `N` of every cube dimension.
2. Define `cellCount` as `N²`, representing active points and face cells per block.
3. Define `point field` as the keyed set of `N²` unique `(x, y, z)` points.
4. Define `input face` as the projection order used to assign plaintext bits to points.
5. Define `output face` as the perpendicular projection order used to read ciphertext bits.
6. Define `start corner` as the input-face quarter-turn orientation.
7. Define `output orientation` as a second face-local quarter-turn.
8. Define `mask` as a key-controlled boolean array over input-face positions.
9. Define `payload capacity` as the count of active mask cells.
10. Define `filler` as non-payload bits inserted into inactive mask cells and unused active cells in the final block.
11. Define `package` as ciphertext plus non-secret framing metadata.
12. Define `key` as the coordinate permutations, orientations, mask, and other material required to reverse the package.

### Deliverables

- A versioned JSON key schema.
- A versioned encrypted-package schema.
- Inline runtime validation for all required fields.
- A compatibility rule for future schema versions.

### Acceptance gate

A key and package can be serialized to JSON, reloaded, validated, and used without relying on transient in-memory state.

### Status
**Prototype contract completed as schema version `0.1.0`.**

---

## Milestone 2 — Deterministic point-field key generation

### Objective
Generate a complete non-overlapping point field from repeatable key material.

### Work items

1. Convert the user seed into a stable 32-bit initialization value.
2. initialize a deterministic pseudorandom generator.
3. shuffle the row labels.
4. shuffle the column labels.
5. shuffle the depth labels.
6. generate one point for every `(x, y)` input position.
7. calculate `z` through the keyed Latin-square expression.
8. verify top, front, and left projection uniqueness.
9. infer opposite-face uniqueness from the mirrored principal projections.
10. compute a fingerprint over all structural key fields.
11. reject malformed or altered imported keys.

### Diagnostics

The laboratory must be able to report:

- number of generated points;
- number of unique cells seen on each principal face;
- whether any projection overlap exists;
- key fingerprint;
- active mask count;
- block payload capacity.

### Acceptance gate

For every supported grid size, the generator produces exactly `N²` points and exactly `N²` unique projected cells on top, front, and left faces.

### Status
**Core implementation completed. Broader automated size coverage remains in Milestone 9.**

---

## Milestone 3 — Face orientation and reversible block permutation

### Objective
Implement the source document’s entry-face, starting-corner, and single-rotation behavior as a reversible mapping.

### Work items

1. Define canonical 2D row and column coordinates for all six faces.
2. Mirror opposite faces consistently.
3. Apply zero, one, two, or three face-local quarter turns.
4. sort points by input-face row-major order.
5. assign each block bit to the corresponding point.
6. sort the same points by output-face order.
7. emit the values in that order.
8. decrypt by swapping the output and input projection orders.
9. reject same-face and opposite-face transformations.
10. verify that every permitted input/output pair round-trips.

### Acceptance gate

For every permitted face pair and every orientation pair:

```text
decrypt(encrypt(binary, key), key) == binary
```

for empty-padding boundaries, exact block boundaries, and multiple blocks.

### Status
**Core implementation completed. Exhaustive face/orientation matrix testing remains.**

---

## Milestone 4 — Binary framing, padding, and multi-block processing

### Objective
Allow arbitrary-length binary inputs rather than requiring exactly one full face.

### Work items

1. remove whitespace from binary input.
2. reject every character except `0` and `1`.
3. calculate payload capacity from the active mask.
4. split input into payload-capacity chunks.
5. allocate `N²` cells for each cube block.
6. fill inactive mask cells with deterministic junk bits.
7. fill unused active cells in the last block with deterministic junk bits.
8. transform every full face block independently.
9. concatenate ciphertext blocks.
10. store original bit length and block count in the package.
11. reverse all blocks during decryption.
12. trim recovered payload to the recorded original bit length.

### Acceptance gate

Inputs with lengths `1`, `capacity - 1`, `capacity`, `capacity + 1`, and several complete blocks all round-trip exactly.

### Status
**Prototype completed. Integrity checks and corruption detection remain.**

---

## Milestone 5 — Data-entry masks

### Objective
Implement the source concept in which only selected entry cells contain payload and the remaining face positions contain key-defined junk.

### Work items

1. represent the mask as `N²` booleans in input-face order.
2. support full-face, 75-percent, and 50-percent generated masks in the first interface.
3. guarantee at least one active payload cell.
4. store the exact mask in key JSON.
5. exclude the mask from the encrypted package.
6. fill every inactive location deterministically.
7. extract only active mask locations after reverse transformation.
8. add a custom visual mask editor in a later sub-milestone.
9. add mask import/export independent of the rest of the key.
10. measure capacity loss and output expansion caused by sparse masks.

### Acceptance gate

Changing one mask bit changes payload placement, package output, or both. A package cannot be correctly decoded with a key whose mask differs.

### Status
**Generated masks are implemented. Interactive mask editing is pending.**

---

## Milestone 6 — Shadowrun workspace interface

### Objective
Make the laboratory usable without developer tools while preserving the lightweight lazy-loading architecture of the site.

### Work items

1. add “Binary Cube Encryption Laboratory” to the Shadowrun Tools category.
2. mark it as a prototype rather than a planned module.
3. add an “Open Laboratory” action to its module card.
4. lazy-load the laboratory script only when the user opens it.
5. mount the panel inside the Shadowrun workspace.
6. provide binary input, grid size, seed, faces, orientations, and mask controls.
7. provide Generate Key, Encrypt, Decrypt, and Reset actions.
8. display key JSON, package JSON, and decrypted binary.
9. display first-block input and output face grids for manageable sizes.
10. omit extremely large cell previews while retaining numerical diagnostics.
11. provide accessible labels, status messages, and keyboard-operable controls.
12. add a prominent warning that the prototype is not production cryptography.

### Acceptance gate

A user can open Shadowrun, locate the module, generate a key, encrypt a binary string, decrypt it, and recover the original bits without reloading or leaving the page.

### Status
**Initial interface completed. Browser smoke testing remains.**

---

## Milestone 7 — Persistence, interchange, and recovery

### Objective
Prevent accidental loss and make sessions transferable.

### Work items

1. autosave laboratory fields to browser local storage.
2. restore saved fields when the panel is reopened.
3. clear local state through a confirmed reset action.
4. add dedicated download buttons for key JSON and package JSON.
5. add upload controls for key and package files.
6. add clipboard-copy actions with visible success or failure status.
7. add a compact share package that excludes the key.
8. add a combined archive option clearly labeled unsafe for secret separation.
9. include schema version, tool version, and key fingerprint in exported records.
10. reject files that exceed reasonable browser limits.

### Acceptance gate

A package exported in one browser session can be imported and decoded in a fresh session using the separately exported matching key.

### Status
**Local autosave exists. Dedicated file interchange controls are pending.**

---

## Milestone 8 — Error handling and diagnostics

### Objective
Make failures explainable instead of silently producing incorrect data.

### Work items

1. report invalid binary characters.
2. report missing key or package JSON.
3. report malformed JSON with parser details.
4. report invalid permutations and mask dimensions.
5. report unsupported face combinations.
6. report key fingerprint mismatch.
7. report key/package ID mismatch.
8. report ciphertext block-alignment failure.
9. report invalid original-length metadata.
10. report projection overlap during key generation.
11. add a diagnostics drawer containing block and capacity calculations.
12. add a “validate only” operation for imported key/package pairs.
13. add corruption simulations that flip one ciphertext bit and show the effect.

### Acceptance gate

Every rejected operation leaves existing data intact and produces a specific, actionable status message.

### Status
**Core validation exists. Dedicated diagnostic UI is pending.**

---

## Milestone 9 — Automated verification suite

### Objective
Prove reversibility and prevent regressions as advanced modes are introduced.

### Required test groups

#### A. Key-generation properties

- correct point count;
- valid row, column, and depth permutations;
- no top/front/left overlaps;
- stable key generation for identical seed and settings;
- changed fingerprint when any key field changes.

#### B. Round-trip properties

- all recommended grid sizes;
- all six input faces;
- all four legal perpendicular output faces per input face;
- all input start corners;
- all output quarter-turns;
- each mask density;
- one-bit through multi-block payloads;
- leading and trailing zeros.

#### C. Failure behavior

- invalid binary;
- wrong key;
- altered mask;
- altered permutation;
- damaged package length;
- invalid face pair;
- truncated ciphertext;
- unsupported schema version.

#### D. Legacy spreadsheet fixture

- preserve the supplied 4 × 4 input and six labeled face strings;
- display them in documentation and test data;
- do not declare them normative until the original point-to-coordinate key is reconstructed or supplied;
- once reconstructed, add an exact compatibility mode and a locked regression vector.

### Suggested implementation

- Extract the pure algorithm functions into a module that runs in both browser and Node-based validation.
- Keep DOM code in a thin interface layer.
- Add a repository script that performs deterministic property checks without paid services.
- Run the validation script in the existing GitHub Pages workflow or a separate lightweight validation job.

### Acceptance gate

All deterministic and property tests pass for every supported configuration, and a failed assertion stops deployment.

### Status
**Manual Node round-trip checks were performed during the initial implementation. Repository automation is pending.**

---

## Milestone 10 — Integrity and authenticity framing

### Objective
Detect accidental corruption and clearly separate confidentiality claims from integrity guarantees.

### Work items

1. add a checksum field for game-use corruption detection.
2. define what package fields are covered by the checksum.
3. reject modified package metadata when checksum validation fails.
4. evaluate standard authenticated-encryption wrapping as an optional outer layer.
5. never invent a custom message-authentication code and label it secure.
6. distinguish these modes in the interface:
   - cube permutation only;
   - cube permutation plus checksum;
   - standard authenticated encryption wrapping, should a vetted implementation be adopted.
7. document that permutation without authentication is malleable.

### Acceptance gate

A one-bit package alteration is either detected or the interface explicitly states that the selected mode provides no integrity detection.

---

## Milestone 11 — Custom coordinate and mask editor

### Objective
Allow deliberate cube designs rather than seed-only generation.

### Work items

1. render the full input face as an editable mask.
2. display point coordinates for every face cell.
3. permit coordinate import from CSV or JSON.
4. validate all pairwise projection uniqueness before accepting a custom field.
5. highlight collisions by face and cell.
6. provide automatic repair suggestions.
7. permit manual start-corner and orientation testing.
8. show all six face projections simultaneously for small grids.
9. export the custom field as a versioned key.
10. provide a read-only legacy spreadsheet reconstruction workspace.

### Acceptance gate

A user can create or import a custom point field, resolve all collisions, save it as a key, and round-trip a binary payload.

---

## Milestone 12 — Nested Cubes advanced mode

### Objective
Implement the source proposal in which local point clusters are encoded and then relocated by a larger pattern.

### Design questions to settle first

1. Is the inner cube size fixed or variable per cluster?
2. Does every outer cell contain one inner cube?
3. Are inner keys shared or independent?
4. Is the outer transformation applied to whole ciphertext blocks or individual points?
5. How are incomplete cluster groups padded?
6. How are nested dimensions and key references serialized?

### Proposed staged implementation

1. define a two-level key schema;
2. encrypt payload chunks through inner keys;
3. treat each resulting inner block as one outer payload unit;
4. permute those units through an outer face mapping;
5. store level counts and block dimensions in package metadata;
6. reverse outer order before reversing inner blocks;
7. measure key size, output expansion, and runtime;
8. add visualization showing local clusters and outer relocation.

### Acceptance gate

Two-level nested encryption round-trips across multiple inner and outer blocks, and the package cannot be decoded when either level’s key is absent or mismatched.

---

## Milestone 13 — “Crossword” split-key mode

### Objective
Implement the source proposal in which some information required to reconstruct the message remains in the key rather than in the transmitted ciphertext.

### Proposed model

1. divide input-face locations into transmitted and withheld sets.
2. place selected genuine payload bits in withheld positions.
3. store those withheld bits, their positions, or a derivation rule inside a separate key component.
4. transform and transmit only the remaining face data.
5. reconstruct the complete input block from ciphertext plus withheld key material before extracting payload.

### Required safeguards

- Name the mode **split-payload experimental mode**, not proven secret sharing.
- Quantify exactly how many payload bits are withheld.
- Prevent key reuse from accidentally revealing stable withheld positions.
- add explicit package failure when the withheld component is absent.
- compare the approach with established secret-sharing and all-or-nothing transforms before making security claims.

### Acceptance gate

The transmitted package alone is structurally incomplete, the matching split-key component restores it, and the exact role of every withheld bit is documented and tested.

---

## Milestone 14 — Security analysis and release classification

### Objective
Determine what the system actually protects and how it should be described publicly.

### Analysis areas

1. permutation-cipher vulnerability to known plaintext;
2. repeated-key pattern leakage;
3. mask leakage across multiple messages;
4. deterministic padding leakage;
5. seed-space and key-derivation weakness;
6. ciphertext malleability;
7. metadata leakage from original length and block count;
8. brute-force complexity for each grid size;
9. whether nested or split-key modes materially improve resistance;
10. whether a standard cipher should wrap the geometric transformation.

### Release labels

- **Prototype:** reversible concept demonstration.
- **Game utility:** suitable for puzzles, props, and fictional Matrix operations.
- **Research build:** suitable for controlled experiments and analysis.
- **Security-capable:** prohibited until independent cryptographic review and a documented threat model justify the label.

### Acceptance gate

The README, interface, and export metadata all use the same honest release classification.

---

## Milestone 15 — Shadowrun gameplay integration

### Objective
Connect the laboratory to campaign mechanics without tying the core algorithm to one Shadowrun edition.

### Possible integrations

1. Generate a Matrix file or paydata package as binary ciphertext.
2. Associate a key fragment with a host, deck, contact, datajack, or physical token.
3. convert algorithm difficulty into an edition-specific extended test through the Edition and House-Rule Profile.
4. use mask density as an in-world obfuscation rating.
5. use missing split-key fragments as legwork objectives.
6. use corrupted packages as complications or false-data traps.
7. archive decoded results in the Run Archive and After-Action Report.
8. attach encrypted evidence to the Legwork, Lead, and Evidence Board.
9. generate data-vault puzzles that require identifying the correct face and start corner.
10. preserve the algorithm engine as edition-neutral while adapters translate results into dice mechanics.

### Acceptance gate

The tool can create an exportable game record containing narrative label, algorithm configuration, package, key-separation instructions, and optional edition-adapter notes.

---

## 4. Immediate implementation backlog

The next development pass should proceed in this order:

1. Add repository-side automated round-trip tests for all face and orientation combinations at grid size 4.
2. Expand tests to every recommended size while keeping runtime bounded.
3. Split pure algorithm functions from DOM code so tests import the engine directly.
4. Add key/package download and upload controls.
5. Add clipboard actions and a validate-only command.
6. Add a custom mask editor for 4 × 4 and 12 × 12 faces.
7. Add a diagnostics panel showing all six projections for the first block.
8. Reconstruct or obtain the spreadsheet’s original coordinate map before treating its face outputs as a locked test vector.
9. Add checksum-based corruption detection.
10. Begin a written threat model before nested cubes or split-key work is described as security enhancement.

---

## 5. Definition of done for the first usable release

Version `0.2.0` can be called the first usable game/research release when all of the following are true:

- the tool opens from the Shadowrun workspace;
- all recommended grid sizes generate collision-free point fields;
- all legal face and orientation combinations pass automated round-trip tests;
- arbitrary binary lengths are framed, padded, transformed, decoded, and trimmed correctly;
- generated and custom masks work;
- key and package files can be separately downloaded and imported;
- wrong keys and damaged packages fail visibly;
- local autosave and reset work;
- the first block can be inspected from all six faces;
- source provenance and schema versions are preserved;
- the interface and documentation state that the system is experimental and not production cryptography.

---

## 6. Current and next contextual checkpoint

The current pass converts the uploaded concept into a mathematically explicit reversible point-field model, stores its source provenance, registers it in the Shadowrun workspace, and provides a functional browser prototype so future work begins from running code rather than another isolated concept document.

The next pass needs to separate the algorithm engine from the interface and add exhaustive automated round-trip testing, because that validation layer is the foundation required before custom masks, Nested Cubes, or Crossword split-key behavior can safely expand the design.
