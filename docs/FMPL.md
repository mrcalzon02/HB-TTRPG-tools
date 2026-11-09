# FMPL v0.1.0 — pinned consumer

This repository consumes the canonical **Factorio Modeling Production Library** from Tech-Priests at exact commit `a00a24fedb119123c594b93d7934c8cddfafccd7`. Its `fmpl-consumer.json` selects 5 relevant model/tool/pipeline records. This does not copy large source models or introduce GitHub workflows.

A local runner or developer checks out the pinned library with Git sparse checkout (see [FMPL README](https://github.com/mrcalzon02/Tech-Priests/blob/a00a24fedb119123c594b93d7934c8cddfafccd7/tools/fmpl/README.md)) and validates:

```sh
python fmpl-source/tools/fmpl/fmpl_consumer.py --config fmpl-consumer.json --library-root fmpl-source
```

This fails closed if the checkout SHA differs or the declared components are absent. Geometry and PBR materials must still be imported or appended in real Blender, verified by saved native file and reimported GLB. Native Factorio sprite alignment and attachments require separate evidence. All art sources remain in their originating repository. No auto-run or release change is made by this integration.

Browse the canonical [FMPL asset tabulation](https://github.com/mrcalzon02/Tech-Priests/blob/a00a24fedb119123c594b93d7934c8cddfafccd7/tools/fmpl/ASSET_CATALOG.md) for all registered models, PBR materials, candidate components and production programs.
