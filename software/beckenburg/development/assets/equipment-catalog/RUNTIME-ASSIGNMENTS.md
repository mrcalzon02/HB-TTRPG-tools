# Runtime assignment reconciliation

The Java catalog now uses the delivered `equipment-assets.json` assignments, including the revised flashlight, spirit box, crucifix and open book. Removed fixed-fixture upgrade filenames are no longer approved by this catalog.

The seven fixed van families keep their existing three addressable tier slots, with every slot selecting the same physical fixture. Health supplies have three separate `HEALTH_SUPPLIES` entries mapped through `FieldSupplies.Kind.HEALTH`; they do not add an evidence-equipment progression or substitute sanity medicine.

Current totals are 129 stage lookup slots (126 equipment plus three health), 44 state lookup slots, 113 unique canonical models, 40 unique state models, and 153 approved GLB files. Shared deployed salt/chalk geometry accounts for state aliases; lookup-slot counts are not unique file counts. `EquipmentTiers` retains its 42 equipment families.

Verify explicit code assignments and original delivered file hashes:

```powershell
python development/assets/sync_equipment_model_catalog.py
```

After an intentional manifest change, `--write` refreshes only the two explicit Java mapping tables. It never adds a runtime directory wildcard or modifies a delivered model. Catalog coverage constants must also be reviewed if the manifest inventory changes.

`EquipmentAssetAssignmentsTest` compares actual Java lookup results and the entire allowlist against the JSON manifest. `EquipmentModelCatalogTest` decodes all 153 approved meshes, checks separate health/sanity assignments, checks fixed-fixture aliases, and rejects unreviewed/retired names. Both passed after reconciliation; all 153 referenced source GLBs also matched their manifest SHA-256 hashes.
