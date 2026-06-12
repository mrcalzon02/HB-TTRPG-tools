# Standardized Module Extraction Tool

The Module Viewer is the general-purpose adventure-module extraction layer for HB TTRPG Tools.

## Added viewer

- `module-viewer.js`
- `data/modules/module-index.json`
- `data/modules/schemas/module.schema.json`

The viewer loads a module registry, then loads a selected module JSON file. Each module can provide:

- source metadata
- general dungeon/module information
- rendered map image
- clickable map hotspots
- room records
- door/entry records
- wandering monster tables
- extraction status notes

## First extracted module

- `data/modules/northern-watchtower-09.json`
- `data/modules/northern-watchtower-09-map.svg`

The first extraction is based on the uploaded PDF `The Northern Watchtower 09.pdf`.

## Hotspot model

Hotspots are percentage boxes over the map image:

```json
{
  "id": "room-1",
  "type": "room",
  "targetId": "room-1",
  "label": "1",
  "box": { "x": 13.64, "y": 11.36, "w": 3.41, "h": 2.73 }
}
```

Door hotspots point to door records:

```json
{
  "id": "door-r1-south",
  "type": "door",
  "targetId": "door-r1-south",
  "label": "D",
  "box": { "x": 15.91, "y": 17.95, "w": 2.5, "h": 2.5 }
}
```

## Room record standard

Room records should preserve:

- room number
- title
- summary
- features
- monsters
- treasure
- trap references
- connected doors

## Door record standard

Door records should preserve:

- stable door ID
- label
- source room
- destination room, if known
- door kind
- tags such as `locked`, `secret`, `trapped`, `stuck`, or `unlocked`
- DCs, hardness, hit points, trap notes, concealment notes, and lead-to text in `notes`

## Current limitation

Map hotspot coordinates are first-pass manual percentage overlays against the rendered source map. They are usable for navigation and can be refined in future calibration passes.
