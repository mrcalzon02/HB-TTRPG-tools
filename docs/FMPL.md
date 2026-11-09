# FMPL v0.1.0 — pinned consumer

This repository consumes the canonical **Factorio Modeling Production Library** from Tech-Priests at exact commit `7a5804d00e1886f3ea44bbdc9633fa20c4818e10`. Its `fmpl-consumer.json` selects 5 relevant model/tool/pipeline records. This does not copy large source models or introduce GitHub workflows.

A local runner or developer checks out the pinned library with Git sparse checkout (see [FMPL README](https://github.com/mrcalzon02/Tech-Priests/blob/7a5804d00e1886f3ea44bbdc9633fa20c4818e10/tools/fmpl/README.md)) and validates:

```sh
python fmpl-source/tools/fmpl/fmpl_consumer.py --config fmpl-consumer.json --library-root fmpl-source
```

This fails closed if the checkout SHA differs or the declared components are absent. Geometry and PBR materials must still be imported or appended in real Blender, verified by saved native file and reimported GLB. Native Factorio sprite alignment and attachments require separate evidence. All art sources remain in their originating repository. No auto-run or release change is made by this integration.

Browse the canonical [FMPL asset tabulation](https://github.com/mrcalzon02/Tech-Priests/blob/7a5804d00e1886f3ea44bbdc9633fa20c4818e10/tools/fmpl/ASSET_CATALOG.md) for all registered models, PBR materials, candidate components and production programs.
