package org.beckenburg;

import java.util.Arrays;

/** Real cargo button position, collision, reopen and visual shutter in rotated vans. */
public final class VanCargoDoorTest {
    static void ok(boolean value,String message){if(!value)throw new AssertionError(message);}
    public static void main(String[] args){
        for(double yaw:new double[]{0,Math.PI/2,-Math.PI/2,Math.PI}){
            VanStaging van=new VanStaging(new VanStaging.Placement(50.0,50.0,yaw));
            VanStaging.Position button=van.doorButton();
            ok(van.nearDoorButton(button.x(),button.z()),"button reachable for all rotations");
            ok(!van.nearDoorButton(button.x()+20,button.z()),
                "remote interaction cannot toggle door");
            VanStaging.Position entrance=van.world(0,VanStaging.FRONT+.04);
            ok(!van.collides(entrance.x(),entrance.z(),.15),"van cargo entrance initially open");
            ok(van.toggleCargoDoor()&&van.cargoDoorClosed(),"button closes door");
            ok(van.collides(entrance.x(),entrance.z(),.15),
                "closed cargo door genuinely blocks physical movement");
            ok(!van.toggleCargoDoor()&&!van.cargoDoorClosed(),"button reopens door");
            ok(!van.collides(entrance.x(),entrance.z(),.15),"open cargo area traversable");
        }
        HouseMap house=new HouseMap();
        SceneRenderer r=new SceneRenderer();
        r.x=house.van().spawn().x();r.z=house.van().spawn().z();
        r.yaw=-Math.PI/2;
        r.drawNetwork(house,java.util.List.of(),-1,1);
        int[] open=r.pixels().clone();
        house.van().toggleCargoDoor();
        r.drawNetwork(house,java.util.List.of(),-1,2);
        ok(!Arrays.equals(open,r.pixels()),"door is rendered in its actual closed position");
        System.out.println("PASS: switchable server-driven van door changes collision and rendered scene");
    }
}
