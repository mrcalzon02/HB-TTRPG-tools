package org.beckenburg;

import java.util.List;

/**
 * Independently authored van furniture plan measured against the original
 * GGBot Car08 cargo-shell bounds: x +/-2.07m, z [-2.10,2.04], y 0..2.32m.
 * Source model units stay intact; this is NOT a tile/prop scatter loop.
 * Stations and equipment socket coordinates remain VanStaging-owned.
 */
public final class VanInteriorLayout {
    private VanInteriorLayout(){}
    public enum Mount { FLOOR, FURNITURE, BULKHEAD }
    public record Fixture(String mesh,double localX,double y,double localZ,
                          double scale,double yaw,Mount mount,String purpose){
        public Fixture{
            if(!Double.isFinite(localX+y+localZ+scale+yaw)||scale<=0)
                throw new IllegalArgumentException("invalid van fixture");
        }
    }
    public static final List<Fixture> FIXTURES=List.of(
        // Driver bulkhead: map/activity monitoring on the left shoulder.
        // Face towards the central standing aisle, not into the wall.
        new Fixture("monitoring_screen_mp_1",-1.73,1.55,.79,1.15,
                    Math.PI/2,Mount.BULKHEAD,"telemetry monitor"),
        // Proper terminal. Real furniture, tower, keyboard and monitor each
        // have specific support heights; no giant bare rectangular podium.
        new Fixture("tv_table_1_4",-1.22,0,-.95,.92,
                    Math.PI/2,Mount.FLOOR,"computer table"),
        new Fixture("pc_mp_1",-1.74,.33,-1.33,.93,
                    Math.PI/2,Mount.FURNITURE,"computer tower"),
        new Fixture("pc_keyboard_mp_1",-1.10,.80,-.94,.83,
                    0,Mount.FURNITURE,"input keyboard"),
        // Three shallow shelves follow the right-side shell. Every stock
        // socket in VanEquipmentRack is reachable from the central aisle.
        new Fixture("shelf_mp_6",1.77,.08,-1.34,1.12,
                    Math.PI/2,Mount.FLOOR,"front tool rack"),
        new Fixture("shelf_mp_6",1.77,.08,0,1.12,
                    Math.PI/2,Mount.FLOOR,"middle tool rack"),
        new Fixture("shelf_mp_6",1.77,.08,1.28,1.12,
                    Math.PI/2,Mount.FLOOR,"rear tool rack")
    );
    public static boolean insideShell(Fixture p){
        // Wall-mounted source fixtures may extend into the shell relief
        // but never project outside the licensed exterior skin.
        return Math.abs(p.localX())<VanStaging.HALF_WIDTH-.12
            &&p.localZ()>VanStaging.FRONT+.10&&p.localZ()<VanStaging.REAR-.10
            &&p.y()>=0&&p.y()<2.32;
    }
    public static double clearAisleHalfWidth(){return .68;}
    public static boolean openAisle(double x,double z){
        return Math.abs(x)<clearAisleHalfWidth()&&
            z>VanStaging.FRONT+.15&&z<VanStaging.REAR-.15;
    }
}
