# Architectural references and production decisions

Reviewed 2026-10-19. These are architectural research references, not claims that the game reproduces a historic building. The approved Beckenburg environment PNGs remain the visual direction. Plans, room functions and measured source meshes determine the actual geometry; generated drawing coordinates do not.

## Approved original boards

Repository root-relative originals: `assets/beckenburg/concept-art/v001/04-environments/house-environment-original.png`, `farmhouse-environment-original.png`, `school-environment-original.png`. All nine environment originals were visually inspected, including mansion, prison, asylum, academy, college and church. Only House, Farmhouse and School are currently selectable. The six other family definitions are development layouts and remain explicitly locked in `SiteCatalog`.

House: covered porch, weathered two-storey exterior, amber practical light against blue night, dark timber trim, ordinary domestic furnishing, cellar, private upper bedrooms and rear patio. Farmhouse: an exposed farmyard joining a house, barn and small service outbuilding. School: an institutional entrance, classroom circulation, library, service basement, a gym and assembly space with different proportions.

## House: room sequence, furnishing and stair construction

- [NPS Vassall–Craigie–Longfellow House tour](https://www.nps.gov/long/learn/historyculture/vassall-craigie-longfellow-house.htm). Read the first-floor, upper-floor and service-ell descriptions; opened the linked first-floor plan. Useful distinction: public rooms at entry level, private chambers upstairs and service functions grouped separately. Beckenburg's compact house is an original layout; its dimensions do not come from this historic mansion.
- [NPS parlor, with 1914 and 2014 photographs](https://www.nps.gov/long/learn/historyculture/parlor.htm). Read the documented arrangement and original/reproduction furnishing context. Applied principle: a fireplace, seating, small tables, portraits and a clock form a furnished room with circulation around them, rather than unrelated objects scattered across a floor.
- [Library of Congress HABS Salubria: center-hall stair surround and wall section](https://www.loc.gov/pictures/item/va2094.sheet.00004a/). Opened the drawing record. Used as a construction reference for the relationship of wall trim, stair enclosure and floor section, not as a traced game plan.

Current house footprint is 12m × 14m, X12–24/Z10–24. Surfaces are Y−3/0/3m. Two separate 1.5m-wide, 4.8m-run stair footprints avoid the ambiguous overlapping ascent/descent previously detected by movement QA. The basement stair centre is X19.8; the upper flight centre is X22.5. Their deck guards leave a .98m clear centre aisle, verified with the .44m player capsule. Ground-floor doors form a living → kitchen → dining → hall → foyer loop. The porch and garden form an exterior retreat route.

## Farm: separate functions, yard and hayloft

- [NPS Trump–Lilly Farm walking tour](https://www.nps.gov/neri/learn/historyculture/trump-lilly-farm-walking-tour.htm). Read the site map description and farmhouse, barn, granary, storage-shed and washhouse sections. The house is documented as two storeys with siding over logs; kitchen and yard structures developed as distinct functions. Applied principle: the mission crosses a genuine outdoor yard between different buildings.
- [NPS Weir Barn](https://home.nps.gov/places/weir-barn.htm). Read the barn's working uses: stalls, tool/equipment storage and haylofts. Applied principle: the barn has a tall ground volume and an actual upper storage deck, reached by a separate flight; a tool shed is a separate ground-level volume.
- [NPS Best Farm House](https://home.nps.gov/places/000/best-farm-house.htm). Read the phased-house and stair-passage/cellar description. Applied principle: household circulation and cellar service access coexist with additions, rather than copying the suburban house's room rectangles.

Current farmhouse main block is X12–26/Z12–27. Barn is X31–43/Z9–24, 6m high, with a Y3m hayloft occupying its rear half. Tool shed is X31–39/Z24–31. Its 1.5m-wide loft stair is physically separate from the house stairs. Barn/shed/cellar fixtures use utility styles; occupied household rooms use domestic styles. The upper house landing has a real washbasin rather than a duplicated overlapping bathroom volume.

## School: classroom wings and different assembly volumes

- [Library of Congress / NPS HABS NY-6298, Public School No. 4, Yonkers](https://tile.loc.gov/storage-services/master/pnp/habshaer/ny/ny1500/ny1598/data/ny1598data.pdf). Read the 19-page report, especially the additions described on report page 3 and the plans/section discussion. It documents classroom and corridor additions, nurse accommodation and separate gymnasium/assembly functions. Applied principle: specialized volumes and circulation have different footprints and heights.

Current school has a central entrance/corridor, western classroom/library wing, eastern cafeteria/nurse wing and an offset 12m × 16m gym at X34–46/Z8–24 with a 7.2m ceiling. An assembly hall occupies an upper wing rather than being another narrow classroom. Upper floor is Y3.6m; service basement is Y−3m. The gym's game dimensions and arrangement are authored; they are not represented as the Yonkers building's measured dimensions.

## Photographs visually inspected

The first text/reference pass could not retrieve the linked photographs through the web cache. A subsequent browser inspection successfully displayed these primary photographs:

- [NPS Spring Hill ranch-house kitchen](https://www.nps.gov/tapr/learn/photosmultimedia/virtual-tour-ranch-house-kitchen-area.htm): the historic 1935 kitchen photograph shows a steep utility stair against a wall, a real ceiling opening and attached overhead pipes. Used to review physical stair/ceiling relationships.
- [NPS Spring Hill ranch-house parlors](https://home.nps.gov/tapr/learn/photosmultimedia/virtual-tour-ranch-house-parlors.htm): inspected the exterior/foyer and 2024 North/South Parlor photographs. Seating stays around the perimeter, the central table/rug grouping leaves circulation, and wall fixtures, cornice and entry newel have physical supports.
- [NPS Toms Brook School](https://home.nps.gov/articles/toms-brook-school-va.htm): inspected the damaged classroom photograph showing a large framed blackboard/tray, timber flooring and tall window bays. Used for classroom furnishing and surface distinction.

The earlier LOC report screenshot requests still failed; those report pages are text-inspected only. Approved local concept boards and original local PSX texture/preview images were also visually inspected directly.

No external reference photo has been copied into game textures. Original purchased-pack UV textures remain associated with their actual source meshes; external historical references guide building logic and furnishing choices only.

## Investigation van scale reference

[Ford Transit manufacturer dimensions](https://www.ford.co.uk/content/dam/guxeu/uk/documents/brochures/cars/BRO-transit_van_25.5MY.pdf) were read for the L4/H3 load-space dimensional table: 4.256m cargo length and 1.784m maximum load width. They guide the original game van's real-metre envelope and human reach/clearance. No manufacturer artwork or photographs are included in the game. See `VAN_REFIT_WORKFLOW.md` for the measured layout and validation process.
