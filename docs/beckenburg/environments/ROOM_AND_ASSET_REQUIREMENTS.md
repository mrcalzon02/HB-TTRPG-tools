# Beckenburg Environment Production — Original Image Sources and Level Authoring
Updated 2026-10-15. Scope: nine authored location families, **12 marked spaces per family (108 total draft spaces)**. These are *reference-only* room lists; no 3D location content completion is claimed. The approved early/mid-PlayStation hard style guide remains authoritative.

## Storage state
The nine **original generated** 1448×1086 PNG environment boards have been uploaded to Google Drive, one per location. Verified Drive upload acceptance is **not** a GitHub source blob commit, and Drive view URLs are **not** permanent anonymous site image hosts. The GitHub archival gate and proper webpage gallery remain unresolved; do not silently replace originals with reduced previews. See [source manifest](environment-sources.json) for exact external source IDs and intended GitHub paths.

## Buildable room plan, not model-supplied geometry
### Grid-independent zone authoring
Every authored space requires stable ID, localized readable name, interior/exterior classification, floor, architect-reviewed world-space bounds, door/portal references, stairs, ghost spectral links, acoustic zone, electrical/thermal links, named evidence sockets, legally accessible ritual sockets, physics props, occlusion/LOD group and spawn/exit labels. Every site must have at least **10 traversable meaningful rooms/spaces** plus **2 exterior zones**. A corridor counts as a space only if it supports navigational or evidence mechanics. The house/other maps here contain 12 purposeful spaces each.

Room diagrams on AI-generated boards contain visually approximated floor plans and some inconsistent numbering. They are *illustrations only*. Use the explicit lists below as planning identity; convert to tested geometry with architect-authored graph data, not extracted image coordinates.

### House
Original source: [Drive PNG](https://drive.google.com/file/d/1XqxB1jdgJmYsFsM_6aRwqlr6TBM72i_P/view)

| ID | Zone | Type | Play affordance |
| --- | --- | --- | --- |
| HOUSE-01 | Van staging / curbside | outside | spawn, loadout |
| HOUSE-02 | Front porch / entry | outside | entry threshold |
| HOUSE-03 | Foyer | inside | intro clues |
| HOUSE-04 | Main hall / stair | inside | portal network |
| HOUSE-05 | Living room | inside | evidence props |
| HOUSE-06 | Kitchen | inside | utilities |
| HOUSE-07 | Dining nook | inside | provocation |
| HOUSE-08 | Bathroom | inside | water anomalies |
| HOUSE-09 | Master bedroom | inside | personal anchor |
| HOUSE-10 | Second bedroom | inside | personal anchor |
| HOUSE-11 | Basement / boiler | inside | breaker and thermal |
| HOUSE-12 | Back yard / patio | outside | escape and rite |

### Mansion
Original source: [Drive PNG](https://drive.google.com/file/d/1hY6YT9ssyjbVBSmsuttM-ZJUlCssep3R/view)

| ID | Zone | Type | Play affordance |
| --- | --- | --- | --- |
| MANSION-01 | Front gate / carriage drive | outside | spawn |
| MANSION-02 | Grand entrance / terrace | outside | threshold |
| MANSION-03 | Foyer | inside | documents |
| MANSION-04 | Grand stair hall | inside | vertical connector |
| MANSION-05 | Library | inside | lore and relics |
| MANSION-06 | Dining hall | inside | table interactions |
| MANSION-07 | Scullery / kitchen | inside | utilities |
| MANSION-08 | Ballroom | inside | ritual space |
| MANSION-09 | Master suite | inside | personal anchor |
| MANSION-10 | Servants corridor | inside | alternate path |
| MANSION-11 | Attic | inside | hidden anchor |
| MANSION-12 | Rear garden / greenhouse | outside | secondary ritual |

### Prison
Original source: [Drive PNG](https://drive.google.com/file/d/1-Su7BxaF23T_IK65hbl8AfXxkLoKyuzc/view)

| ID | Zone | Type | Play affordance |
| --- | --- | --- | --- |
| PRISON-01 | Perimeter gate | outside | spawn |
| PRISON-02 | Vehicle sally port | inside | secure entry |
| PRISON-03 | Intake lobby | inside | clues and records |
| PRISON-04 | Main cell block | inside | stairs and gates |
| PRISON-05 | Secondary cell block | inside | alternate route |
| PRISON-06 | Guard station | inside | security power |
| PRISON-07 | Mess hall | inside | props |
| PRISON-08 | Infirmary | inside | rescue |
| PRISON-09 | Chapel / visitation | inside | ritual |
| PRISON-10 | Isolation wing | inside | strong haunting |
| PRISON-11 | Boiler and maintenance | inside | breaker |
| PRISON-12 | Exercise yard | outside | escape routes |

### Asylum
Original source: [Drive PNG](https://drive.google.com/file/d/1gU0SWlcEl99sRCrOEBEni2wCuqiBYPj2/view)

| ID | Zone | Type | Play affordance |
| --- | --- | --- | --- |
| ASYLUM-01 | Front drive | outside | spawn |
| ASYLUM-02 | Admission / reception | inside | records |
| ASYLUM-03 | Central corridor | inside | route junction |
| ASYLUM-04 | Patient ward | inside | personal artifacts |
| ASYLUM-05 | Day room | inside | props |
| ASYLUM-06 | Treatment theatre | inside | environmental hazards |
| ASYLUM-07 | Hydrotherapy room | inside | water clues |
| ASYLUM-08 | Records office | inside | lore |
| ASYLUM-09 | Dining ward | inside | utilities |
| ASYLUM-10 | Chapel | inside | ritual |
| ASYLUM-11 | Basement boiler | inside | power |
| ASYLUM-12 | Walled courtyard | outside | retreat |

### School
Original source: [Drive PNG](https://drive.google.com/file/d/1EInLKEdTZ3cJUNEve_a_SqH5LUms5ZPk/view)

| ID | Zone | Type | Play affordance |
| --- | --- | --- | --- |
| SCHOOL-01 | Bus loop / drop-off | outside | spawn |
| SCHOOL-02 | Front exterior | outside | entry |
| SCHOOL-03 | Front office / foyer | inside | records |
| SCHOOL-04 | Main hallway | inside | central corridor |
| SCHOOL-05 | Classroom A | inside | personal clue |
| SCHOOL-06 | Science classroom | inside | apparatus |
| SCHOOL-07 | Library | inside | lore |
| SCHOOL-08 | Cafeteria | inside | open haunt |
| SCHOOL-09 | Gymnasium | inside | large ritual |
| SCHOOL-10 | Locker corridor | inside | movement |
| SCHOOL-11 | Nurse / utilities | inside | stabilization |
| SCHOOL-12 | Playground | outside | escape |

### Farmhouse
Original source: [Drive PNG](https://drive.google.com/file/d/1qQ6QqW4ptMyBPFF8J8iu7CXaoWSvAmlS/view)

| ID | Zone | Type | Play affordance |
| --- | --- | --- | --- |
| FARMHOUSE-01 | Dirt lane gate | outside | spawn |
| FARMHOUSE-02 | Farmhouse exterior / porch | outside | entry |
| FARMHOUSE-03 | Mudroom | inside | transition |
| FARMHOUSE-04 | Kitchen | inside | heat, utensils |
| FARMHOUSE-05 | Living room | inside | family objects |
| FARMHOUSE-06 | Dining room | inside | provocation |
| FARMHOUSE-07 | Master bedroom | inside | personal anchor |
| FARMHOUSE-08 | Child room | inside | personal clue |
| FARMHOUSE-09 | Cellar | inside | breaker |
| FARMHOUSE-10 | Barn | inside | throwable clutter |
| FARMHOUSE-11 | Tool shed | inside | equipment |
| FARMHOUSE-12 | Cornfield / ritual plot | outside | outdoor anchor |

### Academy
Original source: [Drive PNG](https://drive.google.com/file/d/1_V1QLq_hy8SRB8kIpdLPj2AoF2pB5AmQ/view)

| ID | Zone | Type | Play affordance |
| --- | --- | --- | --- |
| ACADEMY-01 | Front gate / courtyard | outside | spawn |
| ACADEMY-02 | Academy exterior / stairs | outside | entry |
| ACADEMY-03 | Reception hall | inside | documents |
| ACADEMY-04 | Cloister | inside | route |
| ACADEMY-05 | Lecture room | inside | lore |
| ACADEMY-06 | Library | inside | research |
| ACADEMY-07 | Headmaster office | inside | personal anchor |
| ACADEMY-08 | Dormitory | inside | personal anchor |
| ACADEMY-09 | Dining hall | inside | open ritual |
| ACADEMY-10 | Laboratory / study | inside | instrument interactions |
| ACADEMY-11 | Basement archive | inside | sealed anchor |
| ACADEMY-12 | Rear quadrangle | outside | ritual |

### College
Original source: [Drive PNG](https://drive.google.com/file/d/1pUrYz95-m-41sMP7vUMWW-lpyyxqTBjw/view)

| ID | Zone | Type | Play affordance |
| --- | --- | --- | --- |
| COLLEGE-01 | Campus green | outside | spawn |
| COLLEGE-02 | Main façade / plaza | outside | entry |
| COLLEGE-03 | Lobby | inside | records |
| COLLEGE-04 | Lecture theatre | inside | large room |
| COLLEGE-05 | Seminar classroom | inside | writing clues |
| COLLEGE-06 | Library stacks | inside | obscured paths |
| COLLEGE-07 | Dormitory corridor | inside | personal objects |
| COLLEGE-08 | Union café | inside | audio |
| COLLEGE-09 | Laboratory | inside | research |
| COLLEGE-10 | Administration office | inside | keys |
| COLLEGE-11 | Maintenance tunnels | inside | alternative path |
| COLLEGE-12 | Parking and rear quad | outside | retreat |

### Church
Original source: [Drive PNG](https://drive.google.com/file/d/17rRI8lYsPox77s5EUl62JvgR0_JpBpkI/view)

| ID | Zone | Type | Play affordance |
| --- | --- | --- | --- |
| CHURCH-01 | Churchyard gate | outside | spawn |
| CHURCH-02 | Front grounds / entry steps | outside | threshold |
| CHURCH-03 | Vestibule | inside | start clues |
| CHURCH-04 | Nave | inside | central hall |
| CHURCH-05 | Altar / chancel | inside | major ritual |
| CHURCH-06 | Confessional | inside | personal clue |
| CHURCH-07 | Side chapel | inside | secondary ritual |
| CHURCH-08 | Choir loft | inside | upper portal |
| CHURCH-09 | Parish office | inside | documents |
| CHURCH-10 | Crypt | inside | strong anchor |
| CHURCH-11 | Bell tower | inside | vertical/audio |
| CHURCH-12 | Graveyard / rectory garden | outside | outdoor anchor |

## Low-poly material and kit contract
**Texture production:** initial atlas sizes 128×128 and 256×256 pixels, PNG lossless RGBA or RGB. Nearest filtering; no blurred textures or physically based layers required. Material families: masonry, wood, paint/plaster, carpet/fabric, rough metal, glass/window, tiled ceramic, earth/grass and occult accent. Individual atlas cells named and UV gutters padded 2–4 pixels to prevent bleed; any pixel-look upscaling must preserve hard edges. Preserve editable source project and palette sheet. Concept-art images are **never** sampled as a replacement for a properly authored texture atlas.

**First geometry budgets (design targets, validate experimentally):** wall/floor/ceiling modular tile 2–12 triangles; door leaf 12–36; basic furniture 40–180; worktable/altar 150–450; large fixture 200–600; common clutter 8–100. Ghost figures 450–1,200 triangles, or tested billboard/sprite representations when useful; hunter figures 600–1,500 triangles before LOD. These are candidate budgets, subject to runtime tests, not delivered models. Light and geometry performance are measured on target Windows hardware; use dark fog and small diffuse textures intentionally.

**Module dimensions (candidate only):** grid cell 2 meters, standard wall height 2.6–3.2m, doors ≥0.9m clear width, hall ≥1.5m where three hunters share space; stairs and ramps require continuous collision and ghost passable equivalents. Verify dimensions in the actual renderer before approval.

## Incremental build batches and hard gates
1. **B1 / kit proof:** one house foyer, hall, bedroom, kitchen, porch and yard; 6 unique functional spaces with collision, doors, atlas textures, equipment interactions and evidence.
2. **B2 / full house:** complete 12/12 zones with floor map, stateful circuits, legal ghost passages, investigation clues, ritual anchors and a win/retreat path.
3. **B3 / adjacent reuse:** farmhouse and mansion, using validated house materials and unique structures for barns, galleries and vertical passages.
4. **B4 / institutional:** school, academy, college: independent room networks, common classroom/office kits, acoustics and occupancy cues.
5. **B5 / specialized:** church, prison, asylum: bespoke rites, gates, crypts, wards, cell blocks and deliberate respectful historical storytelling.
6. **B6 / all-site QA:** every shipping location passes the 3v1 ghost×site movement matrix; original PNGs uploaded/read back on GitHub, model files and atlases remotely verified, and gallery images served correctly.

For each batch: original image file + hash archived → geometry graybox → doors and zone graph → prop physics → evidence and ritual sockets → material UV atlas → fog/lighting/audio → 3v1 path and reaction test → performance benchmark → verified nonforced commit. Do not claim that 108 concept spaces are 108 implemented rooms.
