package org.beckenburg;

import java.util.HashSet;
import java.util.Set;

/** Acceptance for the single reusable VAN fit-out at every playable site. */
public final class VanModuleIntegrationTest {
    private VanModuleIntegrationTest(){}
    private static void ok(boolean yes,String label){
        if(!yes)throw new AssertionError(label);
    }
    public static void main(String[] args){
        ok(VanStaging.REAR-VanStaging.FRONT>=7.2,"a full length cargo bay");
        ok(VanStaging.HALF_WIDTH*2>=4.0,"interior has two mounted walls and central aisle");
        ok(VanStaging.INTERIOR_HEIGHT>=3.0,"full height workstation and overhead lights");
        ok(VanInteriorLayout.toolSockets().size()==FieldEquipment.workingTools().size()+1,
            "all functional LAN equipment and the solo salt kit have distinct physical hooks");
        ok(VanInteriorLayout.TOOL_CAPACITY>=EquipmentTiers.all().size(),
            "42 real rack spaces reserved without inventing missing or nonfunctional gear");
        ok(VanInteriorLayout.TOOL_CAPACITY>=VanInteriorLayout.toolSockets().size(),
            "rack cannot silently drop equipment when fully stocked");
        Set<String> slots=new HashSet<>();
        for(var entry:VanInteriorLayout.toolSockets()){
            ok(slots.add(entry.equipment()),"no duplicate bracket: "+entry.equipment());
            ok(entry.x()<-1.4 && entry.x()>-VanStaging.HALF_WIDTH,
                "equipment fixed to left wall, not floating in aisle");
            ok(entry.z()>VanStaging.FRONT+.25&&entry.z()<VanStaging.REAR-.25,
                "tool socket inside the rear opening and bulkhead");
            ok(entry.y()>.15&&entry.y()<VanStaging.INTERIOR_HEIGHT-.15,
                "hook at plausible standing reach height");
            ok(GlbProps.model(EquipmentModelCatalog.model(entry.equipment(),
                EquipmentTiers.Tier.I)).triangles().size()>1,
                "approved original mesh actually exists: "+entry.equipment());
        }
        for(var p:VanInteriorLayout.FIXTURES){
            ok(VanInteriorLayout.insideShell(p),"fitted fixture outside cargo: "+p.purpose());
            ok(GlbProps.model(p.mesh()).triangles().size()>1,
                "mounted console/board uses actual model: "+p.mesh());
        }
        Set<String> purposes=new HashSet<>();
        for(var p:VanInteriorLayout.FIXTURES)purposes.add(p.purpose());
        for(String critical:new String[]{"command workstation","computer tower",
                "desk keyboard","main command monitor","contract objective board",
                "daily assignment board","sanity telemetry","haunting activity",
                "sound telemetry","site map"})
            ok(purposes.contains(critical),"essential station missing: "+critical);
        ok(VanInteriorLayout.openAisle(0,0),"straight aisle is not obstructed");
        for(double z=VanStaging.FRONT+.34;z<=2.10;z+=.15)
            ok(VanInteriorLayout.openAisle(0,z),"centre walkway blocked at "+z);
        for(HouseMap.Site site:HouseMap.Site.values()){
            var map=new HouseMap(site);
            var van=map.van();
            var spawn=van.spawn();
            ok(map.traversable(spawn.x(),spawn.z()),"spawn clear "+site);
            for(var station:VanStaging.Station.values()){
                var p=van.location(station);
                ok(map.traversable(p.x(),p.z()),"station accessible "+site+" / "+station);
                ok(van.stationAt(p.x(),p.z())==station,
                    "authored station interaction socket "+station);
            }
            for(var item:EquipmentLoadout.Item.values()){
                var socket=VanEquipmentRack.socket(van,item);
                var local=van.local(socket.x(),socket.z());
                ok(local.x()<0 && local.z()>=VanStaging.FRONT,
                    "solo bought item mounted on physical left rack");
            }
        }
        ok(java.util.Arrays.asList(InGamePauseMenu.options()).contains("Exit Game"),
            "Exit Game available without extraction");
        System.out.println("PASS VAN interior sizes, complete tier catalog, purchased tool mounts, "+
            "four functional boards/screens, walkable stations at all locations and Exit Game menu");
    }
}
