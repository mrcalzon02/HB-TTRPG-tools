# Validation

Current BYOND 516.1659 compilation including Tyson, Hamburg, and Ourang: **0 errors, 0 warnings**. Native StrongDMM launched against the current project. Linux sprite filename case repaired for airlock art.

Tyson initialized successfully after generic-seed, pipe-layer, duplicate-junction, and inline-pump repairs: no runtime or plumbing reports. Ourang initialized successfully: no runtime or plumbing reports. Hamburg’s duplicate table was removed and its legacy console updated to the current dropship-control subtype. Final reinitialization completed in 197.7 seconds with no runtime or plumbing reports. All restored maps and the unchanged Vapor baseline show the same 18 upstream blank-dock reservation warnings; these come from the existing shuttle code rather than the restored layouts.

The server binding library was confirmed loaded by the 32-bit BYOND executable. Socket inspection confirmed **127.0.0.1:14000**. The Windows game client launches in its dedicated Wine prefix with the required VC runtime and Gecko. BYOND account/login, GUI tile placement, and a full multiplayer mission have not been tested.

Original layouts and source archives are preserved separately. Vapor remains exactly as current upstream. Use START-HERE.md for editor, server, client, and backups.
