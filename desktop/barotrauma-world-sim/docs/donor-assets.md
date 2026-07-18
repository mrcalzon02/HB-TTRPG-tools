# Donor Barotrauma Graphical Assets

The Barotrauma World Simulation Toolbox may use graphical files from a Barotrauma installation already owned and installed by the local user. The toolbox does not bundle, redistribute, upload, or commit those donor files.

The installation package includes neutral fallback PNG artwork. A donor installation is optional.

## Setup window

Run:

```text
gradle runAssetSetup
```

The setup window can:

- scan common Steam installation locations;
- read `steamapps/libraryfolders.vdf` and search custom Steam libraries;
- validate a manually selected Barotrauma game directory, macOS app bundle, executable directory, or `Content` directory;
- save Automatic, Manual, or Fallback-only mode;
- preview whether each logical role currently resolves to donor or fallback artwork.

The local configuration is stored at:

```text
~/.barotrauma-world-sim/assets.properties
```

On Windows, `~` means the current user profile directory.

Only the donor folder pointer and selection mode are stored. No game art is copied into the toolbox configuration directory.

## Common Steam locations

The automatic scanner checks these roots and any additional libraries declared by Steam.

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

For macOS, the graphical content normally resolves beneath:

```text
Barotrauma.app/Contents/MacOS/Content
```

## Custom Steam libraries

Steam may install games on another disk. The scanner reads each available Steam root's:

```text
steamapps/libraryfolders.vdf
```

and checks every declared library for:

```text
steamapps/common/Barotrauma
```

The user can always use Steam itself to locate the correct directory:

1. Open the Steam Library.
2. Right-click **Barotrauma**.
3. Choose **Manage**.
4. Choose **Browse local files**.
5. Select the opened Barotrauma directory in the toolbox setup window.

## Overrides

Automatic discovery also checks:

```text
BAROTRAUMA_HOME
```

and the Java system property:

```text
-Dbarotrauma.home=/path/to/Barotrauma
```

These are useful for portable installations, development machines, or unusual package layouts.

## Validation

A donor path is accepted only when a `Content` directory exists and at least two expected graphical/content families are present among:

```text
Content/UI
Content/Map
Content/Characters
Content/Items
```

The selector may point at:

- the Barotrauma installation directory;
- the `Content` directory itself;
- the macOS `Barotrauma.app` bundle;
- an executable inside the installation directory.

A missing, moved, unmounted, or incompatible donor installation does not prevent startup. Resolution falls back by logical asset role.

## Resolution policy

The runtime resolves each logical role in this order:

1. preferred known relative paths inside the validated donor `Content` tree;
2. a bounded keyword search within the relevant donor asset families;
3. the packaged binary PNG fallback for that role.

Initial logical roles are:

- station and outpost artwork;
- submarine and vessel artwork;
- fauna and monster artwork;
- geology, cave, mineral, and ore artwork.

The fallback files are real PNG resources in `src/main/resources`. They are independent neutral artwork and are safe to include in toolbox releases.

## Packaging and redistribution boundary

Release archives contain:

- the Java application;
- the neutral fallback PNGs;
- the donor discovery and validation code;
- these setup instructions.

Release archives do **not** contain:

- Barotrauma `Content` files;
- copied donor artwork;
- a donor asset cache;
- absolute donor paths from the build machine;
- Steam account or library metadata.

The installed application references the user's local donor files at runtime. Removing the parent game or moving its Steam library automatically causes affected roles to use fallback artwork until the pointer is corrected or automatic discovery finds the new location.
