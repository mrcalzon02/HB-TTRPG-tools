package org.beckenburg;
import java.util.*;
import org.beckenburg.LevelDefinition.Vec;
/** Native mesh bounds, six real capsule pads and swept deck/ramp/station routes. */
public final class VanHumanScaleTest {
    static void check(boolean value,String why){if(!value)throw new AssertionError(why);}
    static Vec walk(HouseMap map,Vec from,double localX,double localZ){
        var target=map.van().world(localX,localZ);int steps=(int)Math.ceil(Math.hypot(target.x()-from.x(),target.z()-from.z())/.04);
        Vec origin=from,at=from;
        for(int n=1;n<=steps;n++){
            var next=map.resolveMove(at,origin.x()+(target.x()-origin.x())*n/steps,origin.z()+(target.z()-origin.z())*n/steps);
            check(next!=null,"blocked human route at "+at+" toward local "+localX+","+localZ);at=next;
        }return at;
    }
    public static void main(String[]args){
        check(VanStaging.HALF_WIDTH*2<2.1,"van cannot be truck-width");
        check(Math.abs((VanStaging.REAR+VanStaging.CAB_LENGTH)-(VanStaging.FRONT-.18)-6.704)<.001,"overall road-vehicle length");
        for(var fixture:VanInteriorLayout.FIXTURES)check(VanInteriorLayout.insideShell(fixture),"actual transformed mesh exceeds cabin: "+fixture.purpose());
        // All stocked tiers must fit their physical bay with less than 10% scale reduction.
        for(var socket:VanInteriorLayout.toolSockets())for(var tier:EquipmentTiers.Tier.values()){
            var b=VanInteriorLayout.bounds(EquipmentModelCatalog.model(socket.equipment(),tier));
            double fit=Math.min(1,Math.min(.49/(b.x1()-b.x0()),Math.min(.34/(b.y1()-b.y0()),.33/(b.z1()-b.z0()))));
            check(fit>=.90,"equipment miniaturized to fit: "+socket.equipment()+" "+tier+" scale "+fit);
            check(socket.y()-(b.y1()-b.y0())*fit/2>VanStaging.FLOOR_Y,"rack tool below floor");
            check(socket.y()+(b.y1()-b.y0())*fit/2<VanInteriorLayout.ROOF_Y,"rack tool above ceiling");
        }
        for(var site:AuthoredTestSupport.SITES){
            var map=new HouseMap(site);var van=map.van();var world=new LanWorld(map);
            for(int seat=0;seat<6;seat++){
                var body=world.body(seat);check(body.room()==14&&Math.abs(body.y()-VanStaging.FLOOR_Y)<.001,"pad must be on actual deck");
                for(int other=0;other<seat;other++){var b=world.body(other);check(Math.hypot(b.x()-body.x(),b.z()-body.z())>.44,"six spawn capsules overlap");}
                Vec at=walk(map,new Vec(body.x(),body.y(),body.z()),0,van.local(body.x(),body.z()).z());
                at=walk(map,at,0,VanStaging.FRONT+.10);
                at=walk(map,at,0,VanStaging.FRONT-VanStaging.RAMP_LENGTH-.30);
                check(Math.abs(at.y())<.01&&map.roomAt(at.x(),at.y(),at.z())==13,"ramp must descend into outdoor approach");
                at=walk(map,at,0,0);check(Math.abs(at.y()-VanStaging.FLOOR_Y)<.01,"return must ascend actual deck");
                for(var station:VanStaging.Station.values()){
                    var point=van.location(station);var local=van.local(point.x(),point.z());
                    Vec operating=walk(map,walk(map,at,0,local.z()),local.x(),local.z());
                    check(van.stationAt(operating.x(),operating.z())==station,"station not usable from clear aisle");
                }
            }
            var button=van.doorOperatingPoint();check(map.traversable(button.x(),VanStaging.FLOOR_Y,button.z())&&van.nearDoorButton(button.x(),button.z()),"mounted door control lacks clear operating point");
            van.setCargoDoorClosed(true);var p=van.world(0,VanStaging.FRONT+.12);
            check(!map.traversable(p.x(),VanStaging.FLOOR_Y,p.z()),"closed rear leaves must seal actual threshold");
            System.out.println("PASS "+site+": six distinct deck pads, all station routes, outdoor ramp descent/return and cargo seal");
        }
        System.out.println("PASS human-scale body, actual furniture bounds and native-sized full-tier tool bays");
    }
}
