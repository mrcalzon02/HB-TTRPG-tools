# Codex work order — Factorio Render Pipeline

**Scope:** First produce genuine high-fidelity, correctly mounted Tech Priests thruster art using reproducible 3D models. This is an execution plan, not test evidence.

1. Check out the latest Foundry and Tech Priests main revisions and record their SHAs; read current mod testing and release governance.
2. Run setup-codex-linux.sh --check and --setup as required; record Blender version and dependencies. Use only a vetted installation.
3. Trace actual hydrogen, thetazine, void-fusion and wide-thruster sprite references through Lua and relevant Factorio 2.0.77 prototypes. Extract entity footprint, pivot, shift, scale, animation metadata, platform socket edge, exhaust clearance and states from source and a live reference.
4. Copy spec-template.json into the game's art/specs folder. Fill unknown fields only with verified measurements and source evidence. Run validate_spec.py --strict before production.
5. Implement Blender Python parametric model construction for nozzle, mount, chamber, rings, plating, conduits and glow; save editable .blend models and generation sources. Calibrate a fixed camera, platform tile jig and shadows.
6. Implement headless RGBA rendering for idle/run states, shadow/emission, deterministic frame numbering, fixed canvas and stable anchor. Save manifest of source SHA, Blender version, options and hashes.
7. Implement sprite packer and quality checks: sheet dimensions, frame count, atlas shape, alpha fringe, direction variants, shadow/emission registration, no crop jitter.
8. Complete the hydrogen-thruster end-to-end and examine contact sheets and alignment overlays. Then expand to thetazine and void-fusion/wide families using the verified prototypes.
9. Insert sprites into a disposable Tech Priests mod copy; load in Factorio 2.0.77, confirm space-platform alignment, idle/run, exhaust, zoom, surrounding entities and shadows; record unedited logs/screenshots.
10. Commit approved source, output, prototype changes and evidence into **Tech Priests**, preserving the rollback graphics. Do not conflate this Foundry setup code with a finished renderer or accepted in-game asset.

Future families: cogitator stations, assemblers, pipes, micro-machinery, other structures, components and icons. Keep gameplay logic untouched during initial art modernization.