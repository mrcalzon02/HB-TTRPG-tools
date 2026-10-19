package org.beckenburg;

import java.util.ArrayList;
import java.util.List;

/** Real licensed medieval geometry follows the playable castle's existing collision map. */
public final class CastleHubArchitecture {
    private CastleHubArchitecture(){}
    public record Piece(String model,double x,double y,double z,
                        double scaleX,double scaleY,double scaleZ,double yaw){}
    public static boolean pillar(int x,int z){
        return (x==9||x==18)&&(z==15||z==19);
    }
    private static boolean window(int x,int z){
        if(z==0)return x==3||x==7||x==12||x==16||x==21||x==25;
        if((x==0||x==CastleHubMap.WIDTH-1)&&z<11)return z==3||z==8;
        if((x==9||x==18)&&z<=10)return z==3||z==9;
        return false;
    }
    public static List<Piece> create(CastleHubMap map){
        List<Piece> pieces=new ArrayList<>();
        for(int z=0;z<CastleHubMap.HEIGHT;z++)for(int x=0;x<CastleHubMap.WIDTH;x++){
            if(!map.solid(x,z))continue;
            // Use modular Kenney masonry only for visible wall perimeters.
            // Empty landscape outside the articulated wings must not create
            // thousands of invisible solid GLBs or crush the software renderer.
            if(map.solid(x-1,z)&&map.solid(x+1,z)
                    &&map.solid(x,z-1)&&map.solid(x,z+1))continue;
            if(pillar(x,z)){
                pieces.add(new Piece("kenney_medieval_column",x+.5,0,z+.5,4.6,3.4,4.6,0));
            }else{
                String model=window(x,z)?"kenney_medieval_wall_fortified_window":
                    "kenney_medieval_wall_fortified";
                pieces.add(new Piece(model,x+.5,0,z+.5,1.01,3.4,1.01,0));
            }
        }
        // Three physical wall passages stay open in the map's collision geometry.
        for(int xx:new int[]{5,13,22})
            pieces.add(new Piece("kenney_medieval_wall_fortified_gate",xx+.5,0,11.5,1,3.4,1,0));
        for(int xx=1;xx<CastleHubMap.WIDTH-1;xx++)if(map.solid(xx,11))
            pieces.add(new Piece("kenney_medieval_battlement",xx+.5,3.4,11.5,1,1,1,0));
        for(int xx=2;xx<CastleHubMap.WIDTH-2;xx+=2)
            pieces.add(new Piece("kenney_medieval_battlement",xx+.5,3.4,.5,1,1,1,Math.PI));
        // Towers sit beyond the traversable footprint, not on top of player paths.
        for(double tx:new double[]{-.40,CastleHubMap.WIDTH-.60})
            for(double tz:new double[]{11.5,CastleHubMap.HEIGHT-.60}){
                pieces.add(new Piece("kenney_medieval_tower_base",tx,0,tz,1.8,1.7,1.8,0));
                pieces.add(new Piece("kenney_medieval_tower",tx,1.7,tz,1.8,1.65,1.8,0));
                pieces.add(new Piece("kenney_medieval_tower_top",tx,3.25,tz,1.9,1,1.9,0));
            }
        return List.copyOf(pieces);
    }
}
