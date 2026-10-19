# Beckenburg PSX UI source — verified ingestion

Source: **PSX Horror UI Free** by **heyheythere**  
Creator: https://heyheythere.itch.io/psx-horror-ui-free  
License: **CC BY 4.0** (included verbatim in original ZIP as `psx-horror-ui-free/LICENSE.txt`).  
Attribution: **PSX Horror UI Free by heyheythere - https://heyheythere.itch.io/psx-horror-ui-free - CC BY 4.0**

Original archive: `psx-horror-ui-free-assets.zip` — **unchanged** 135,407-byte file from Beckenburg's Google Drive intake:
https://drive.google.com/file/d/1iVeLYTV5qPbE09t5gxZpf5_L8DQhqaby/view

SHA-256: `47193ece2bcc9b5f8193dfee6ff064e291cbbc0ae1582104a1d1fa8132535350`.

## What is actually integrated

The source archive contains **106 entries**, including **85 PNGs**, theme data, fonts, source Godot example and license. The `fog` sprites, `themes/slices.json` specifications and `icons/flashlight.png` are the initial Java/Swing look. `PsxHorrorUi.java` renders original nine-slice sprites with nearest-neighbor tiling and paints panel, window, interactive button state, focus, text-field borders and multiplayer tabs. The game credits the source in its menu. No Godot or Unity runtime dependency is needed.

Both `build.cmd` and `build.sh` copy this *unchanged archive* into `org/beckenburg/psx-horror-ui-free-assets.zip` in the classpath before packaging. `PsxHorrorUiTest` checks decoding and actual Swing painting.

**Format note:** the source ZIP uses descriptor-flagged stored directory records. Python's `zipfile.ZipFile` can read it but Java `ZipInputStream` rejects that header combination. The Java skin instead uses `ZipFile` against a temporary on-disk copy of the ZIP resource, deletes it after reading, and caches decoded images. This is not extraction of the source library for end users.

## Future custom-art replacement

Keep the original licensed source, and replace provisional icons one by one with renders from verified Beckenburg equipment and characters. Do not map firearm icons to investigation equipment merely because they were bundled. Prefer scalable 9-slice chrome, responsive layouts and legible font over stretching the entire game to a fixed PS1 resolution.

## Verification boundary

Headless Java compilation with `javac --release 17` across **90 source classes** and the standalone PSX artwork/Swing check passed on Linux Java 21 targeting Java 17. A virtual-display graphical launch displayed the main menu with the actual theme. This is **not** a Windows installer smoke test, complete Beckenburg regression suite, or sign-off on all UI screens.
