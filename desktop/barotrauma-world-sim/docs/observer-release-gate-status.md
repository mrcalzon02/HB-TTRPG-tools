# Living World Observer Release Gate Status

The active release candidate path is now the Living World Observer, not the legacy desktop toolbox shell.

Current gate additions:

- `toolbox.ps1 verify` includes the merged observer projection, inspector, natural/civil layer, LOD, timeline, navigation, history, manual-step, restart/catch-up, scheduler-ownership, and unattended-soak contracts.
- `WorldObserverUnattendedSoakVerification` runs the real Passive Mode scheduler while repeatedly reading map, passive, natural, civilization, and timeline evidence, requiring continued authoritative tick advancement without runtime faults.
- Windows packaging points `jpackage` at `BarotraumaWorldObserverApplication` and names the installed application **Barotrauma World Observer**.
- Packaging first creates a bundled-runtime Windows app image, requires `Barotrauma World Observer.exe`, and executes that launcher with `--verify-launch` before an MSI is accepted.
- The existing immutable `0.1.672` release identity is intentionally unchanged during this validation slice. A new public World Observer release requires the accepted large-world/end-to-end gate and a deliberate release-manifest bump.

Next boundary: CI confirmation of this gate, followed by large-master-world accelerated soak and packaged end-to-end observer acceptance.
