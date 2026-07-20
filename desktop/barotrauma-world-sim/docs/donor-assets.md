# Donor Barotrauma Visual Assets

The Barotrauma World Simulation Toolbox can use graphical files from a Barotrauma installation already owned and installed by the local user. Donor files remain in the parent-game installation. The toolbox does not copy, cache, upload, commit, or redistribute them.

A donor installation is optional. Every semantic visual role has an independent fallback produced by toolbox code, and the four legacy station, vessel, fauna, and geology roles also retain their packaged fallback PNGs.

## Retained planning index

The repository includes a read-only Windows scanner and a retained metadata snapshot:

```text
data/barotrauma/tools/index-barotrauma-install.bat
data/barotrauma/tools/asset-index/all-files.csv
data/barotrauma/tools/asset-index/graphical-assets.csv
data/barotrauma/tools/asset-index/importable-assets.csv
data/barotrauma/tools/asset-index/index-summary.txt
```

The current snapshot describes 3,189 install files, including 823 graphical candidates and 2,003 categorized media candidates. It identifies music, ambience, creature audio, creature art, sound effects, backgrounds, UI assets, map assets, item art, fonts, video, particles, lighting, and other effects.

The snapshot is development metadata, not packaged donor content. `RelativePath` is the portable lookup key. Any recorded absolute source path is diagnostic evidence from the machine that ran the scan and must never be treated as an install-time path on another computer.

## Setup and graphical map

Run the asset catalogue and coverage preview with:

```text
toolbox.cmd asset-setup
```

Run the donor-backed graphical Europa map with:

```text
toolbox.cmd world-map
```

The setup window can:

- scan common Steam installation locations;
- read `steamapps/libraryfolders.vdf` and search custom Steam libraries;
- validate a manually selected Barotrauma directory, macOS app bundle, executable directory, or `Content` directory;
- save Automatic, Manual, or Fallback-only mode;
- index Barotrauma image files and XML UI/style definitions;
- preview every logical role with its actual donor or fallback source;
- report donor coverage, fallback coverage, atlas crop dimensions, and selected source files;
- open the graphical Europa map directly.

The local configuration is stored at:

```text
~/.barotrauma-world-sim/assets.properties
```

Only the donor folder pointer and selection mode are stored. No image bytes or atlas extracts are written to the configuration directory.

## Candidate asset families

The semantic catalogue identifies and can reuse the following parent-game families.

### Backgrounds

- Main-menu or application backgrounds.
- Campaign and location-map backgrounds.
- Radiation-map or environmental overlays when a compatible source is available.

Backgrounds use cover scaling. Missing backgrounds are replaced by a deterministic deep-ocean procedural field with subdued currents, rings, and particulate detail.

### Window and control chrome

- Outer frames and inner frames.
- Buttons and tab controls.
- Progress-bar tracks and fills.
- Inventory or item-panel framing.
- Notification and interaction-label treatment.

Barotrauma commonly stores these as sliced sprites in shared UI atlases. The catalogue can select the original source rectangle, but the Java desktop does not reproduce Barotrauma's proprietary runtime nine-slice implementation. It crops the resolved sprite and scales it for the requested Swing surface. Procedural framed panels, buttons, tabs, and progress elements remain available when no compatible donor sprite is found.

### World-map markers

- Generic locations.
- Outposts and stations.
- Caves.
- Ruins.
- Beacons.
- Wrecks.
- Submarines.
- Shuttles.
- Hostile creatures or enemy contacts.
- Radiation zones.
- Route arrows and selected-location glows.

The graphical world map currently uses these roles for normalized locations and active NPC routes. Location names and types choose the most specific marker available; unknown types use the generic location marker.

### Status and interaction symbols

- Broken or disabled state.
- Saving and loading indicators.
- Circular glows, pings, and selection pulses.
- Notifications and speech bubbles.
- Warnings and overflow indicators.

Animated Barotrauma sprite sheets are represented by one stable atlas frame in Swing. The application does not copy animation data or execute parent-game shaders.

### Operational symbols

- Missions and jobs.
- Research.
- Cargo and inventory.
- Currency and wallets.
- Crew.
- Fauna.
- Geology and minerals.
- Stations.
- Vessels.

These roles can be reused by the map, natural-world console, station economy, vessel registry, player transit, mission lists, research, and future campaign-journal surfaces.

## Atlas-aware resolution

Barotrauma defines many semantic sprites in XML rather than as one image per icon. The catalogue therefore indexes both image files and XML definitions under bounded portions of the local `Content` tree.

It recognizes parent-game identifiers including:

```text
SubmarineLocationIcon
SubLocationIcon
ShuttleIcon
WreckIcon
CaveIcon
OutpostIcon
RuinIcon
EnemyIcon
BeaconIcon
Radiation
BrokenIcon
Arrow
SpeechBubbleIcon
SavingIndicator
GenericThrobber
UIGlow
PingCircle
WalletPortraitBG
CrewWalletIconSmall
IconOverflowIndicator
```

It also searches component-style identifiers such as:

```text
GUIFrame
InnerFrame
GUIButton
TabButton
GUIProgressBar
GUINotificationButton
ItemUI
```

When an XML entry references a shared texture and declares a source rectangle, the catalogue records the texture and crop together. At render time it reads the local texture, crops only that rectangle in memory, and scales the result for Swing. No cropped derivative is saved.

The XML parser disables document types, external entities, external schemas, and XInclude. Files above the bounded XML size limit are ignored. Image and XML scans are limited to relevant content families and a fixed maximum number of files.

## Resolution order

Each semantic role resolves independently in this order:

1. A preferred known relative path inside the validated donor `Content` tree.
2. A semantically matching XML style or sprite definition, including atlas source rectangles.
3. A semantically matching standalone image under the relevant content families.
4. An independent procedural Java2D fallback.

The older four-role resolver remains available for compatibility and continues to resolve:

- station and outpost artwork;
- submarine and vessel artwork;
- fauna and monster artwork;
- geology, cave, mineral, and ore artwork.

A valid installation may supply only some roles. For example, a local version may provide an outpost atlas marker while the current mission icon remains a fallback. A corrupt or unreadable donor image also falls back for that role without disabling the remaining catalogue.

## Procedural fallback contract

The expanded catalogue does not require dozens of bundled binary substitutes. It creates neutral Java2D visuals at runtime for every role:

- oceanic backgrounds with deterministic texture;
- framed panels, controls, tabs, and progress bars;
- distinct geometric map markers;
- route arrows and selection glows;
- warning, damaged, saving, mission, research, cargo, currency, crew, fauna, geology, station, and vessel symbols.

Fallback rendering is deterministic for a given role and requested size. It uses no Barotrauma pixels, trademarks, fonts, shaders, or copied atlas geometry. This keeps the application operational and distributable when the parent game is absent.

## Common Steam locations

### Windows

```text
C:\Program Files (x86)\Steam\steamapps\common\Barotrauma
C:\Program Files\Steam\steamapps\common\Barotrauma
```

### Linux

```text
~/.local/share/Steam/steamapps/common/Barotrauma
~/.steam/steam/steamapps/common/Barotrauma
```

### Linux Steam Flatpak

```text
~/.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps/common/Barotrauma
```

### macOS

```text
~/Library/Application Support/Steam/steamapps/common/Barotrauma
```

On macOS, graphical content normally resolves under:

```text
Barotrauma.app/Contents/MacOS/Content
```

Steam may install games on another disk. The scanner reads `steamapps/libraryfolders.vdf` from each available Steam root and checks every declared library.

Automatic discovery also checks:

```text
BAROTRAUMA_HOME
```

and the Java system property:

```text
-Dbarotrauma.home=/path/to/Barotrauma
```

## Validation

A donor path is accepted only when a `Content` directory exists and at least two expected families are present among:

```text
Content/UI
Content/Map
Content/Characters
Content/Items
```

The selector may point at the installation directory, the `Content` directory, the macOS app bundle, or an executable inside the installation directory.

A missing, moved, unmounted, corrupt, or incompatible donor installation does not prevent startup. Automatic mode can rediscover a moved Steam library. Manual and automatic modes fall back role by role when a texture or XML definition cannot be used. Fallback-only mode never reads donor artwork.

## Current integration

The Natural World and Fleet Response console continues to use legacy donor-backed icons for station, vessel, fauna, and geology surfaces.

The current graphical resolution policy keeps those roles compatible while the broader retained catalog is integrated surface by surface.

The new graphical Europa map uses the semantic catalogue for:

- the map background;
- location, outpost, cave, ruin, beacon, wreck, radiation, and hostile-contact markers;
- active submarine and damaged-vessel markers;
- route presentation and source-state reporting.

The setup window previews backgrounds, UI chrome, map markers, statuses, and operation symbols. The remaining desktop surfaces can adopt the same roles without changing installation discovery or packaging rules.

## Verification

The complete verification task includes donor discovery, legacy fallback PNG decoding, semantic XML/atlas lookup, source-rectangle cropping, scaling, and procedural fallback rendering:

The categorized scan is broader than these initial runtime roles. Sound, music, backgrounds, UI elements, map elements, creature elements, item art, fonts, and videos remain indexed candidates until a desktop subsystem explicitly maps, validates, and presents them.

The desktop now builds an immutable local media catalog in a background worker. It scans only the validated official `Content` tree, fingerprints portable path/size/time metadata, ignores `LocalMods` and other user-created install-root content, and reports available, changed, or missing files. The retained CSV reader ignores its machine-specific `FullPath` field and resolves only validated relative paths against the current user's installation.

The fallback files are real PNG resources in `src/main/resources`. They are independent neutral artwork and are safe to include in toolbox releases.

```text
toolbox.cmd verify
```

The semantic catalogue fixture creates a local two-cell atlas and XML style entries for submarine and outpost markers. Verification requires the correct source rectangle to resolve and crop. It then switches to Fallback-only mode and renders every role without a donor installation.

After those graphical bindings, a separate opt-in audio service will own music, ambience, UI sounds, creature sounds, volume, mute state, playback lifecycle, and missing-donor fallback behavior. UI code must not open donor audio files directly.

## Packaging and redistribution boundary

Release archives contain:

- the Java application;
- the four original neutral fallback PNGs;
- procedural fallback rendering code;
- donor discovery, validation, XML indexing, and atlas-crop code;
- setup and usage documentation.

Release archives do **not** contain:

- Barotrauma `Content` files;
- copied donor artwork;
- extracted atlas cells;
- a donor asset cache;
- absolute donor paths from the build machine;
- Steam account or library metadata.

The application references the user's local files at runtime. Removing Barotrauma or moving its Steam library automatically returns affected roles to independent fallbacks until the pointer is corrected or automatic discovery finds the installation again.
