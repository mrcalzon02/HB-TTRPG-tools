package org.beckenburg;

import java.util.HashSet;
import java.util.Set;

/** Exact source-geometry and lane safety test for every VAN site. */
public final class VanArrivalStreetTest {
    private static void ok(boolean yes,String label){
        if(!yes)throw new AssertionError(label);
    }
    public static void main(String[] args){
        var tiles=VanArrivalStreet.tiles();
        ok(tiles.size()==33,"four continuous road rows plus sidewalks and two damaged tile replacements");
        int straight=0,damaged=0,side=0;
        Set<String> centres=new HashSet<>();
        for(var tile:tiles){
            ok(centres.add(tile.x()+":"+tile.z()),"no duplicate asphalt tiles or depth flickering");
            var model=GlbProps.model(tile.mesh());
            ok(model.triangles().size()>8,"road is original textured Kenney mesh");
            ok(model.triangles().stream().anyMatch(t->t.material()>=GlbProps.TEXTURE_BASE),
                "road preserves embedded albedo rather than solid gray");
            if(tile.mesh().endsWith("straight"))straight++;
            else if(tile.mesh().endsWith("damaged"))damaged++;
            else if(tile.mesh().endsWith("side"))side++;
        }
        ok(straight==15&&damaged==2&&side==16,"road, repaired asphalt and shoulders accounted for");
        ok(Math.abs(VanArrivalStreet.ROAD_START-(VanStaging.FRONT-.35))<.001,
            "road is behind the VAN and does not pass through its cabin");
        ok(VanArrivalStreet.ROAD_END==-20.0,"16m continuous road approach");
        for(double z=VanArrivalStreet.ROAD_START-.1;
                z>VanArrivalStreet.ROAD_END;z-=.15){
            final double atZ=z;
            ok(VanArrivalStreet.onStreet(0,z),"street pavement has no missing central segments "+z);
            ok(VanArrivalStreet.inOpenApproach(0,z),"rear cargo access remains clear "+z);
            ok(tiles.stream().anyMatch(t->{
                if(Math.abs(t.x())>VanArrivalStreet.ROAD_HALF_WIDTH)return false;
                double halfLength=t.mesh().endsWith("straight")?t.scaleZ():t.scaleZ()*.5;
                return Math.abs(atZ-t.z())<halfLength+.01 && Math.abs(t.x())<t.scaleX()*.5+.01;
            }),"real Kenney texture tile under each approach sample "+z);
        }
        ok(VanArrivalStreet.parkedVehicles().size()==2,"intentional side parking only");
        for(var parked:VanArrivalStreet.parkedVehicles()){
            ok(!parked.blocksAccessLane(),"no car may obscure the rear-door corridor");
            var model=GlbProps.model(parked.mesh());
            ok(model.triangles().size()>100,"parked vehicle is actual original GGBot geometry");
            ok(model.triangles().stream().anyMatch(t->t.material()>=GlbProps.TEXTURE_BASE),
                "parked vehicle uses authored texture atlas");
        }
        for(HouseMap.Site site:HouseMap.Site.values()){
            var van=new HouseMap(site).van();
            // Rotate all traffic with the site's actual van orientation.
            for(var vehicle:VanArrivalStreet.parkedVehicles()){
                var point=van.world(vehicle.x(),vehicle.z());
                ok(VanArrivalStreet.collision(van,point.x(),point.z(),.15),
                    "parked car has real collision at "+site);
            }
            for(double z=VanStaging.FRONT-.02;z>VanArrivalStreet.ROAD_END+.1;z-=.33){
                var point=van.world(0,z);
                ok(!VanArrivalStreet.collision(van,point.x(),point.z(),.19),
                    "clear walking approach at "+site+" "+z);
            }
        }
        System.out.println("PASS actual Kenney street surfaces, unobstructed VAN access, original GGBot materials and site rotation");
    }
}
