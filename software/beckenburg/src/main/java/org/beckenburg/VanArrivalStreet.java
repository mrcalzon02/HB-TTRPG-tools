package org.beckenburg;

import java.util.ArrayList;
import java.util.List;

/**
 * Physically authored road approach for the reusable VAN. All positions are
 * measured relative to the van's local coordinate system; site yaw is applied
 * exactly once by VanStaging.world(). This is outdoor infrastructure, not
 * equipment, evidence or a random prop scatter.
 *
 * The open rear cargo doors face -Z. The road begins 0.35m behind the sill;
 * the 2.1m-wide central access lane remains free of parked vehicles.
 */
public final class VanArrivalStreet {
    private VanArrivalStreet(){}

    public record RoadTile(String mesh,double x,double z,
                           double scaleX,double scaleZ){
        public RoadTile{
            if(!Double.isFinite(x+z+scaleX+scaleZ)||scaleX<=0||scaleZ<=0)
                throw new IllegalArgumentException("Invalid asphalt tile");
        }
    }
    public record RoadObject(String mesh,double x,double z,double scale,
                             double yaw,double halfWidth,double halfLength,
                             String purpose){
        public RoadObject{
            if(!Double.isFinite(x+z+scale+yaw+halfWidth+halfLength)
                ||scale<=0||halfWidth<=0||halfLength<=0)
                throw new IllegalArgumentException("Invalid roadside object");
        }
        /** None of the traffic is permitted to obstruct the van's walk-out
         * route from the open rear doors onto the street.
         */
        public boolean blocksAccessLane(){
            return x-halfWidth<ACCESS_HALF_WIDTH
                && x+halfWidth>-ACCESS_HALF_WIDTH
                && z+halfLength>=ROAD_END
                && z-halfLength<=ROAD_START;
        }
    }
    public static final double ROAD_START=VanStaging.FRONT-.35;
    public static final double ROAD_END=-20.0;
    public static final double ROAD_HALF_WIDTH=4.20;
    public static final double ACCESS_HALF_WIDTH=1.10;

    private static final List<RoadTile> TILES=createTiles();
    private static final List<RoadObject> PARKED=List.of(
        // Both cars are in roadside bays; neither occupies the rear-door
        // line of sight. Source car bounds are ~0.8 x 1.9 metres.
        new RoadObject("ggbot_car01",-3.10,-11.0,1.0,0,.80,1.90,
            "left curbside parking"),
        new RoadObject("ggbot_car07",3.12,-16.0,1.0,Math.PI,.81,1.90,
            "right curbside parking")
    );
    private static List<RoadTile> createTiles(){
        ArrayList<RoadTile> tiles=new ArrayList<>();
        // Kenney straight asphalt: source footprint 1 x 2m. A 2.1 x 4m
        // fitted tile makes a true 8.4m road with no gaps or overlap.
        for(int row=0;row<4;row++){
            double centreZ=ROAD_START-2.0-row*4.0;
            for(int col=0;col<4;col++){
                double centreX=-ROAD_HALF_WIDTH+1.05+col*2.10;
                if(row==2&&col==1){
                    // The damaged 1 x 1m Kenney source is two 2.1 x 2m
                    // tiles, replacing—not z-fighting—the intact section.
                    tiles.add(new RoadTile("kenney_road_asphalt_damaged",
                        centreX,centreZ-1.0,2.10,2.0));
                    tiles.add(new RoadTile("kenney_road_asphalt_damaged",
                        centreX,centreZ+1.0,2.10,2.0));
                }else tiles.add(new RoadTile("kenney_road_asphalt_straight",
                    centreX,centreZ,2.10,2.0));
            }
        }
        // Separate continuous sidewalk shoulder on both sides of the
        // carriageway. Side tile is originally 1 x 1m.
        for(int side:new int[]{-1,1})
            for(int section=0;section<8;section++)
                tiles.add(new RoadTile("kenney_road_asphalt_side",
                    side*(ROAD_HALF_WIDTH+1.05),
                    ROAD_START-1.0-section*2.0,2.10,2.0));
        return List.copyOf(tiles);
    }
    public static List<RoadTile> tiles(){return TILES;}
    public static List<RoadObject> parkedVehicles(){return PARKED;}
    public static boolean onStreet(double localX,double localZ){
        return Math.abs(localX)<=ROAD_HALF_WIDTH
            && localZ<=ROAD_START&&localZ>=ROAD_END;
    }
    public static boolean inOpenApproach(double localX,double localZ){
        return Math.abs(localX)<ACCESS_HALF_WIDTH
            && localZ>=ROAD_END&&localZ<=VanStaging.FRONT;
    }
    public static boolean collision(VanStaging van,double worldX,double worldZ,
                                    double radius){
        VanStaging.Position pos=van.local(worldX,worldZ);
        for(RoadObject object:PARKED){
            double nearestX=Math.max(object.x()-object.halfWidth(),
                                     Math.min(pos.x(),object.x()+object.halfWidth()));
            double nearestZ=Math.max(object.z()-object.halfLength(),
                                     Math.min(pos.z(),object.z()+object.halfLength()));
            if(Math.hypot(pos.x()-nearestX,pos.z()-nearestZ)<=radius)return true;
        }
        return false;
    }
    static{
        for(RoadObject car:PARKED)
            if(car.blocksAccessLane())
                throw new ExceptionInInitializerError("Vehicle blocks VAN rear entrance: "+car.mesh());
    }
}
