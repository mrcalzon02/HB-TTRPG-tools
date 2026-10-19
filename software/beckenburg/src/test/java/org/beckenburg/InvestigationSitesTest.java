package org.beckenburg;

import java.util.HashSet;
import java.util.Set;

/** New contracts have authored topology and real source-model geometry. */
public final class InvestigationSitesTest {
    private static void ok(boolean condition,String why){if(!condition)throw new AssertionError(why);}
    public static void main(String[] args){
        // No purchasable instrument, however visually attractive, belongs in authored scenery.
        String[] forbidden={
            "exploration_emf_detector","exploration_flashlight","exploration_thermometer",
            "exploration_photo_camera","exploration_spirit_box","vape_mp_1",
            "flashlight_mp_1","book_mp_1","open_book_mp_1","cross_mp_2",
            "blender_dots_projector_1","blender_incense_1","blender_laser_grid_1",
            "blender_sanity_medication_1","blender_video_camera_1"
        };
        for(String tool:forbidden){
            ok(!InvestigationSites.permittedScenery(tool),
                "purchasable equipment cannot decorate any investigation map: "+tool);
            boolean rejected=false;
            try{new InvestigationSites.Prop(3,tool,0,0,0,1,0);}
            catch(IllegalArgumentException expected){rejected=true;}
            ok(rejected,"equipment placement must fail at authoring time");
        }
        ok(new SceneRenderer().rackStock.isEmpty(),
            "a fresh renderer must not display nonexistent van inventory");
        HouseMap house=new HouseMap();
        ok(house.site()==HouseMap.Site.HOUSE&&house.roomName(4).equals("STAIR HALL")
                &&house.width()==48&&house.height()==84,
            "residential house now has an actual Victorian circulation plan");
        for(HouseMap.Site site:HouseMap.Site.values()){
            HouseMap layout=new HouseMap(site);
            ok(layout.valid(),"all rooms and exterior staging reachable on "+site);
            ok(RitualSites.valid(layout),"three reachable ritual anchors on "+site);
            ok(layout.width()==(site==HouseMap.Site.HOUSE?48:
                            site==HouseMap.Site.FARMHOUSE?56:70)
                    &&layout.height()==(site==HouseMap.Site.FARMHOUSE?74:84),
                "real authored building footprints replace 3x5 cubes");
            ok(layout.ceilingHeight()>=house.ceilingHeight(),
                "authored rooms have at least the residential reception ceiling height");
            ok(layout.van().placement().x()>=house.van().placement().x(),
                "van staging is located outside the real footprint");
            ok(layout.roomAt(layout.van().placement().x(),
                layout.van().placement().z())==HouseMap.EXTRACTION_ROOM,
                "larger map retains functional extraction staging");
            if(site!=HouseMap.Site.HOUSE)
                ok(!layout.roomName(4).equals(house.roomName(4)),
                    "new locations provide different room purposes");
            Set<String> meshes=new HashSet<>();
            int placed=0;
            for(int room=0;room<HouseMap.ROOM_COUNT;room++){
                ok(layout.roomAt(layout.centerX(room),layout.centerZ(room))==room,
                    "site room centers remain valid");
                for(InvestigationSites.Prop prop:InvestigationSites.props(site,room)){
                    ok(InvestigationSites.permittedScenery(prop.mesh())
                            &&!EquipmentModelCatalog.approved(prop.mesh()),
                        "map meshes are building furnishings, not any registered equipment tier");
                    meshes.add(prop.mesh());placed++;
                    // Reuse already imported GLB geometry, not fabricated IDs.
                    ok(!GlbProps.model(prop.mesh()).triangles().isEmpty(),
                        "mesh exists with triangles: "+prop.mesh());
                }
            }
            ok(placed>=20&&meshes.size()>=6,"map uses substantial diverse 3D prop assets");
            for(int room=0;room<HouseMap.ROOM_COUNT;room++)
                ok(layout.traversable(layout.centerX(room),layout.centerZ(room)),
                    "authored furnishing never blocks room center / ritual socket");
            int furnished=site==HouseMap.Site.SCHOOL?1:
                site==HouseMap.Site.HOUSE?1:3;
            InvestigationSites.Prop first=InvestigationSites.props(site,furnished).get(0);
            ok(!layout.traversable(layout.centerX(furnished)+first.dx(),
                    layout.centerZ(furnished)+first.dz()),
                "real furniture has matching host collision, not a visual-only prop");
            ok(!layout.doorSnapshot().equals("0"),"door snapshots valid");
            for(int room=0;room<HouseMap.INDOOR_ROOMS;room++)
                for(int adjacent:layout.ghostExits(room))
                    if(adjacent<HouseMap.INDOOR_ROOMS)
                        layout.openDoorBetweenRooms(room,adjacent);
            ok(layout.doorSnapshot().split(",").length>=12,
                "all necessary authored room thresholds can be physically opened");
        }
        ok(new HouseMap(HouseMap.Site.FARMHOUSE).tile(20,9)=='D'
            &&new HouseMap(HouseMap.Site.SCHOOL).tile(20,9)!='D',
            "farm doors are not reused as school doors");
        System.out.println("PASS: authored farm and school maps, source GLBs, doors, rituals");
    }
}
