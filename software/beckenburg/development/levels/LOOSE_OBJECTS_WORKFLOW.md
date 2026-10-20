# Independent environmental objects — production recipe

## Audit and scope

Earlier shelf, pantry, desk and kitchenware kits are fixed decorative groups. They give rooms identity, but their contents are not independent rigid bodies. Do not describe those grouped decorations as pickup objects. The previous poltergeist disturbance applied abstract room damage. The new physical path uses separate objects and projectile contact; missing or dodged objects cause no poltergeist disturbance damage.

Eight original CC0 families now have standalone meshes: hollow mug, corked stoneware bottle, clothbound ledger, lidded tea tin, hollow pottery bowl, four-wheel wooden engine, easel frame and unlit brass candlestick. They use metre dimensions and floor pivots. Each has a separate clean and worn source; clean/worn geometry and UVs must stay identical.

## Repeat on the next map

1. Read the furniture mesh and collider dimensions before authoring scatter. Record real tabletops and exposed floor pockets. Avoid burners, sinks, existing decorative groups, door approaches, stairs, spawn pads and every potential cupboard entrance.
2. Build individual objects with `build_loose_assets.py`. It merges the new families into `lived-assets.json`; it does not regenerate the existing clean furniture. Keep openings hollow and attach handles, feet, wheels and stands to their objects. Inspect the actual mesh renders.
3. Run `build_worn_assets.py -- <explicit new family IDs>` in Blender. Selecting new families preserves previous clean and worn files. Run `validate_worn_assets.py`: clean hashes and exact clean/worn vertices, normals, UVs, indices and pivots must match; all aged diffuse images must differ.
4. Add a `LooseClutter.Kind` with measured horizontal radius, half-height, mass and a plain examination description. The radius/half-height are a bounded collision approximation, not an exact concave triangle collider. Rendering always uses the actual GLB mesh.
5. Add supported, deterministic seed placements in `LooseClutter.seed()`. Transform offsets with the supporting furniture's yaw. Table corners leave existing centre arrangements intact; source crate lids use their measured top; displaced books and toys sit beside bookcases and beds, off required routes. The house/farm/school seed lists must remain stable across host/client map construction.
6. Keep state on the host. Clients send only object ID, action, bounded view pitch and monotonic intent sequence; host-owned position, heading, reach, aim, sightline, ownership and action timing determine acceptance. Never accept client velocities, transforms, ghost attribution or damage.
7. Use one 10 Hz simulation with twenty 5ms swept substeps. Gravity, damping, inelastic bounce, furnishing/wall/ceiling/guard contact and loose-body impulses operate at authored XYZ coordinates. Floor support respects stairs and deck openings. Stable bodies rest on floors or support surfaces. Missing world support does not teleport objects into another room.
8. F5 picks up/drops, `]` rotates the held object, and F12 throws along the view. Show its description and hide the equipment overlay while examining. Held objects remain actual world meshes. Drop carried objects when the carrier disappears, hides or becomes incapacitated.
9. Accepted AI and human poltergeist DISTURB actions share the same barrage path: choose at most three existing, unheld objects and exposed targets in the same room with a real sightline. Damage requires swept projectile/avatar contact, is capped, and occurs once per launch. Hunter throws bounce off bodies without ghost damage. Other ghost attacks retain their existing authority and defenses.
10. Replicate changed states using individual bounded `CLUTTER` frames; keep the existing protocol's 512-byte frame and 96-character field limits. Replay state after view entry/reconnection. Ghost snapshots replace held coordinates with zero and holder with −2, avoiding a private hunter-position feed.
11. Run `LooseClutterTest` for supported scatter, ownership, pickup/examination, throwing/dropping, gravity, impact sounds, walls/ceilings, upper-floor support, poltergeist contact/misses, privacy and replication. Run `LooseClutterNetworkTest` over actual sockets. Keep both in the packaged and online gates, alongside the existing architectural/network checks.
12. Capture initial scatter and an examined object through the actual renderer. Rebuild native CC0 Asset Browser libraries and public individual downloads. Validate local files and live downloaded hashes. Save outputs and remaining limitations, commit each completed gate, reconcile concurrent changes, push and verify the remote.

## Gate checkpoint

The initial implementation passed the 16 focused checks, including `LooseClutterTest`, and the separate real-socket `LooseClutterNetworkTest`. Remaining closeout work is final visual inspection, compatibility checks, public-library refresh and recorded live read-back. This note is updated at the next completed milestone.

## Practical limits

This is a bounded small-object simulation with approximate body shapes, not a general fracture or stacking engine. Ceramic items do not shatter and the tea-can lid is not a separately operable part. Native interactive Windows playthrough and target-resolution performance remain distinct from automated gates and renderer captures. The pre-existing full installer regression gate remains tracked separately.
