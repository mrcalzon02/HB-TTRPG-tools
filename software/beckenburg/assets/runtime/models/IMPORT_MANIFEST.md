# Licensed PSX mesh integration — incremental gameplay slice

Source authority: [BECKENBURG — MASTER ASSET INDEX](https://docs.google.com/document/d/18G144Qd0-L5rL7NdqxMykqkXaBHtu8-ytr_yYPol6rI/edit). These are an individually selected **in-game subset** of the owner's purchased PSX Mega Pack, not a standalone free redistribution of the source collection. The expanded folder contains previews marked v2.9; association with the separate v3.2.1 source archive is not yet technically proved. Do not mislabel the source version.

| Source GLB | Drive file ID | SHA-256 (original bytes) | Runtime role |
| --- | --- | --- | --- |
| flashlight_mp_1.glb | 1cyjpRAYZua8S9_4A0Q5Cw8WRtXgXLqqA | 104931f467a207d86c451e511adee68adccaec6cf3beb7e6d04325986fc2b75e | Real model in van; first-person left-hand textured mesh controlled by F power |
| cross_mp_2.glb | 1C_yD0OZuSGbxOKDtFqVpp8APiTrGdulE | 942dd459969257c99c7b64c482ff8b7a0cbcdb5981e97bdb0d8a2a510ed55e96 | Network ward/cross WorldMark rendered as real textured depth-tested geometry |
| ceiling_lamp_1_on.glb | 12jeJR7ygDWZEqXsH-Qem-bFy5Zih1R5Y | 1d5114ab78a9811420c0ac7b63fc7ddf360896b023337406e1fdfc235546228f | House fixture selection when room lighting is sufficiently strong |

The existing five scene models remain unchanged: light_switch_1, ceiling_lamp_1_off, door_1_loose, shelf_mp_6, and chair_mp_5. Source texture UVs go through GlbProps and the depth-tested SceneRenderer triangles; no internet thumbnails or old SVG study assets were substituted.

Integration: the room's authoritative RoomLighting.brightness determines on/off fixture GLBs during flicker and outages; the existing Lan and solo F-key lamp state controls the newly rendered flashlight foreground; the existing live WorldMark CROSS event positions the original 3D cross. Van stock selection and purchase logic are unchanged. The flashlight is a standard built-in lamp (F), not an additional purchasable inventory slot.

Validation: Java source targets --release 17 and both platform build scripts package all eight meshes and invoke GlbPropsTest and HeldMeshViewTest. An isolated Java 17-targeted mesh/render smoke test of the original files produced 284 flashlight triangles, 92 cross triangles, 1132 lit-lamp triangles and 5085 visible flashlight pixels with 63 colors. Full game compilation, full regression suite and Windows GUI acceptance are separate gates; do not infer them from the isolated test.
