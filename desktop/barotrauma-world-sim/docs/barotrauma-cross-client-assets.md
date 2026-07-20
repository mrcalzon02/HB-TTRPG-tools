# Barotrauma Cross-Client Visual Assets

The browser and desktop applications use the same reviewed fallback artwork, but they do not use the same source-resolution policy.

## Browser policy

The public browser application uses the generated and reviewed packaged atlases as its standard visual set.

It does not:

- search a visitor's computer for a Barotrauma installation;
- reference a local Steam or game-content directory;
- upload, copy, or publish third-party game textures;
- depend on donor discovery to remain visually complete.

The browser runtime reads the committed review maps directly:

```text
desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets/scene-atlas-exterior.tsv
desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets/scene-atlas-interior.tsv
desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets/ui-atlas-reviewed/*.tsv
```

It then draws exact source rectangles from the corresponding packaged PNG atlases into responsive canvases. No replacement crop files are exported or maintained.

The live Barotrauma workspace loads this browser visual runtime only when the Barotrauma view is opened. The dedicated `barotrauma.html` landing page loads it directly.

## Desktop policy

The desktop application retains the local donor option because those files stay on the user's own machine. Its authoritative resolution order is:

```text
user-owned local installation → approved packaged atlas → Java2D emergency fallback
```

`BarotraumaAssetCatalogue` owns that sequence directly. The browser does not import or call that desktop donor resolver.

## Shared semantics

Both clients select assets by the same reviewed semantic names, including examples such as:

- `interior-command-observation-room`;
- `exterior-floodlit-megastructure-basin`;
- `medical-large-panel`;
- `medical-teal-pill-button`;
- `hud-elements-submarine`;
- `hud-elements-warning-icon`;
- `retro-ui-document-button`.

The exact crop rectangles remain authoritative in the existing scene and UI review maps. Client code selects meanings and display roles; it does not redefine the underlying slices.

## Browser implementation

```text
barotrauma-packaged-assets.js
barotrauma-packaged-assets.css
barotrauma.html
app-lite-view-mounts.js
scripts/validate-barotrauma-packaged-assets.mjs
```

The browser renderer supports responsive cover backgrounds and contained UI icons, automatically decorates the live Barotrauma registry cards, and degrades to the existing CSS presentation if a packaged resource cannot load.
