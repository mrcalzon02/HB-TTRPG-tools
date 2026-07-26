# Current-Systems Default World Generator

The desktop generator creates a new Europa Operations world without copying an existing SQLite database and without preserving obsolete schema-era state.

## Authority path

The generator performs the same authoritative sequence used by reviewed imports and passive simulation:

1. Create an empty desktop-world directory and metadata record.
2. Inspect the built-in version-22 Europa Operations template.
3. Record the source artifact and import plan through `SqliteWorldStore`.
4. Commit the normalized locations and principal stations through `WebWorldV22ImportTransaction`.
5. Restore the deterministic clock from the world checkpoint.
6. Enable simulation through `SimulationCommandExecutor`.
7. Commit one tick through `PassiveWorldTickTransaction`.
8. Disable simulation and persist a paused checkpoint.
9. Validate schema, topology, station state, population state, ecology, geology, observation, and foreign keys.

No database template is copied. New schema systems are therefore initialized by their actual migration, trigger, transaction, and passive-cycle authorities.

## Initial template

Template ID:

```text
europa-operations-default-032
```

The first implementation contains:

- 24 normalized locations.
- 12 principal stations.
- Coalition, Separatist, and independent stations.
- Shipbuilding, agriculture, medicine, research, heavy industry, salvage, transit, refuge, defense, and deep-frontier roles.
- Ice, kelp, ruin, hydrothermal, wreck, abyssal, fauna, and deep-trench natural locations.

The template is deterministic in topology and source data. Each generated desktop world receives a fresh world UUID and directory identity.

## Generated-world guarantees

Creation succeeds only when the new world has:

- The current `WorldStorageContracts.DATABASE_SCHEMA_VERSION`.
- One station simulation state per principal station.
- One detailed NPC population and one aggregate station population per station.
- Ecology and geology state for every location.
- Current demographic, migration, settlement, founding, contribution-disposition, and observation tables.
- At least one initialization observation snapshot.
- Simulation disabled and scheduler paused after initialization.
- No foreign-key violations.

A failure removes the partially created world directory. The generator does not leave a half-imported or half-initialized world available for play.

## Desktop operation

The primary launcher exposes **Create Current-Systems Default World** from Overview, Import and World Creation, and Settings and Backups. A standalone entry point is also available through `DefaultWorldGeneratorWindow` for later toolbox integration.

The generated world is selected through `DesktopWorldSession` immediately after successful creation, allowing the World Map, Passive World Observation, logistics, frontier, natural-world, and simulation windows to open the same authoritative world.
