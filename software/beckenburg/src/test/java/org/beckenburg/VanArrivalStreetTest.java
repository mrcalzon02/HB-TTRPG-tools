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
        ok(tiles.size()==32,"sixteen continuous asphalt lanes and sixteen raised sidewalk sections");
        int straight=0,side=0;
        Set<String> centres=new HashSet<>();
        for(var tile:tiles){
            ok(centres.add(tile.x()+":"+tile.z()),"no duplicate asphalt tiles or depth flickering");
            var model=GlbProps.model(tile.mesh());
            ok(model.triangles().size()>8,"road is original textured Kenney mesh");
            ok(model.triangles().stream().anyMatch(t->t.material()>=GlbProps.TEXTURE_BASE),
                "road preserves embedded albedo rather than solid gray");
            if(tile.mesh().endsWith("straight")){
                straight++;
                ok(Math.abs(tile.scaleX()-2.10)<.001&&Math.abs(tile.scaleZ()-4.0)<.001,
                    "road tiles are dimensioned in actual metres");
            }else if(tile.mesh().endsWith("side")){
                side++;
                ok(Math.abs(tile.scaleZ()-2.0)<.001,"sidewalk panels remain separate");
            }
        }
        ok(straight==16&&side==16,
            "uninterrupted original asphalt surface and distinct pedestrian walkway");
        int asphalt=VanArrivalStreet.surfaceMaterial(false),
            concrete=VanArrivalStreet.surfaceMaterial(true);
        ok(asphalt>=GlbProps.TEXTURE_BASE&&concrete>=GlbProps.TEXTURE_BASE,
            "both surfaces use original packaged Kenney image material");
        ok(asphalt!=concrete,"separate road and sidewalk textures, no source-mesh striped endcaps");
        int roadSample=GlbProps.sample(asphalt,.35,.45);
        int walkSample=GlbProps.sample(concrete,.35,.45);
        int roadSum=((roadSample>>16)&255)+((roadSample>>8)&255)+(roadSample&255);
        int walkSum=((walkSample>>16)&255)+((walkSample>>8)&255)+(walkSample&255);
        ok(roadSum<walkSum,"asphalt must be darker than the concrete sidewalks");
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
                double halfLength=t.scaleZ()*.5;
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
        for(HouseMap.Site site:AuthoredTestSupport.SITES){
            var van=new HouseMap(site).van();
            // Rotate all traffic with the site's actual van orientation.
            for(var vehicle:VanArrivalStreet.parkedVehicles()){
                var point=van.world(vehicle.x(),vehicle.z());
                ok(VanArrivalStreet.collision(van,point.x(),point.z(),.15),
                    "parked car has real collision at "+site);
            }
            var map=new HouseMap(site);
            for(double z=VanStaging.FRONT-.40;z>VanArrivalStreet.ROAD_END+.55;z-=.33){
                var point=van.world(0,z);
                ok(!VanArrivalStreet.collision(van,point.x(),point.z(),.19),
                    "clear parked-car approach at "+site+" "+z);
                ok(map.traversable(point.x(),point.z()),
                    "road must be real traversable architecture, not painted behind solid walls at "+
                    site+" / "+z);
            }
        }
        System.out.println("PASS actual Kenney street surfaces, unobstructed VAN access, original GGBot materials and site rotation");
    }
}
