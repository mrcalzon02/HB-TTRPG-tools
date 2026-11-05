# PSX Real-World Terrain — shared art source catalog

Ten user-approved PSX-realistic **source** sheets, 5 Blob-47-themed structural and 5 Wang-16-themed natural terrains, collected for possible use across original projects including Sitka, Breakwater, ReverieVR and Beckenburg.

**Canonical original images:** [Google Drive — PSX Real-World Terrain Autotiles](https://drive.google.com/drive/folders/1woJ7SFTwFOnbJ7QgpNUy1hN4rnSc06nC).

## Asset IDs
- B1: Urban asphalt & sidewalks
- B2: Harbor quay and concrete seawall
- B3: Roadside rock cut & shoulder
- B4: Urban service alley
- B5: Industrial dock platform
- W1: Grass / dirt
- W2: Grass / gravel
- W3: Coastal sand / scrub grass
- W4: Mud / shallow shoreline water
- W5: Cracked concrete / moss

The adjacent **manifest.json** has each source's exact Drive file ID, SHA-256, byte length and intended layout classification.

## Integrity and usage

**Source files are not production autotiles yet.** These are AI-generated artistic atlas *presentations*. Their numbered samples include inset labels/gutters and demonstration strips and must not be blindly cut into 47 or 16 seamless tiles. No seam-matching or bitmask mapping has been certified. A separate runtime derivative pack must crop/redraw/validate edge continuity and implement proper Blob-47 and Wang-16 bitmask ordering.

`python fetch_sources.py` obtains the ten originals from Google Drive when the caller supplies a valid `GOOGLE_DRIVE_ACCESS_TOKEN` with file read access, checks each SHA-256 before saving, and never alters the originals. This script needs no third-party Python modules. It is deliberately noninteractive, does not bypass Drive access permissions, and has no hardcoded secrets.

For GitHub reuse: this commit catalogs assets, hashes and a fetcher; **it does not contain the binary PNG sources**. Those remain in Drive until an authenticated asset transfer makes them available as repo blobs. Please do not mark the remote binary-ingest step complete until a commit contains ten PNGs and readback confirms their SHA-256.
