package org.beckenburg;

import java.util.List;

/** Lighting switches operate at authored physical wall points, and spectral effects are deterministic. */
public final class RoomLightingTest {
    private static void check(boolean yes,String description){if(!yes)throw new AssertionError(description);}
    private static void rejected(Runnable runnable){
        try{runnable.run();throw new AssertionError("invalid lighting packet accepted");}
        catch(IllegalArgumentException expected){}
    }
    private static int luminosity(SceneRenderer renderer){
        var image=renderer.image();long sum=0;
        for(int y=40;y<SceneRenderer.H-25;y++)for(int x=40;x<SceneRenderer.W-40;x++){
            int rgb=image.getRGB(x,y);sum+=((rgb>>16)&255)+((rgb>>8)&255)+(rgb&255);
        }
        return (int)(sum/((SceneRenderer.H-65)*(SceneRenderer.W-80)));
    }
    public static void main(String[] args){
        HouseMap map=new HouseMap();RoomLighting master=new RoomLighting();
        check(map.valid(),"all house thresholds still traversable");
        check(master.snapshot().equals("111111111111"),"all room circuits start in a known state");
        for(int room=0;room<HouseMap.INDOOR_ROOMS;room++){
            var plate=RoomLighting.location(room);
            check(map.roomAt(plate.x(),plate.z())==room,"switch positioned in its own room "+room);
            double playerX=plate.x()+.73, playerZ=plate.z();
            check(map.traversable(playerX,playerZ),"player can stand near switch "+room);
            check(master.aimed(map,playerX,playerZ,-Math.PI/2)==room,"face switch and use E "+room);
            check(master.aimed(map,playerX,playerZ,Math.PI/2)==-1,"turn away to avoid accidental use");
            check(master.aimed(map,map.centerX(room),map.centerZ(room),0)==-1,"no remote activation");
        }
        master.toggle(4);
        check(!master.on(4)&&master.on(5),"switch affects just its own circuit");
        check(master.brightness(4,100)<master.brightness(5,100)*.2,"off switch darkens room");
        RoomLighting remote=new RoomLighting();remote.acceptSnapshot(master.snapshot());
        check(!remote.on(4)&&remote.on(5),"multiplayer circuit state roundtrips");
        master.setBreaker(false);
        check(master.brightness(5,100)<.1,"breaker removes all powered lights");
        master.setBreaker(true);master.toggle(4);
        double normal=master.brightness(4,12);
        master.pulse(4,RoomLighting.Interference.MINOR,20);
        int low=0;
        for(int tick=20;tick<42;tick++){
            double value=master.brightness(4,tick);
            check(value<=normal,"minor flicker cannot brighten above normal");
            if(value<normal*.6)low++;
            check(master.brightness(5,tick)==master.brightness(5,12),"adjacent room not affected");
        }
        check(low>0&&low<22,"minor ghosts produce intermittent visible flicker");
        master.pulse(4,RoomLighting.Interference.SIGNATURE,60);
        RoomLighting subscriber=new RoomLighting();
        subscriber.acceptSnapshot(master.snapshot());
        subscriber.pulseUntil(4,RoomLighting.Interference.SIGNATURE,60,160);
        for(int tick=60;tick<160;tick++)
            check(master.brightness(4,tick)==subscriber.brightness(4,tick),"host/client flicker identical");
        check(master.interference(4,160)==null,"signature blackout expires");
        rejected(()->master.acceptSnapshot("111|010"));
        rejected(()->master.pulse(14,RoomLighting.Interference.MINOR,8));
        SceneRenderer scene=new SceneRenderer();
        scene.roomLights=master;scene.lamp=false;
        scene.x=map.centerX(4);scene.z=map.centerZ(4);scene.yaw=.4;
        scene.roomLightTick=170;
        scene.drawNetwork(map,List.of(),-1,0);
        int lit=luminosity(scene);
        master.toggle(4);
        scene.drawNetwork(map,List.of(),-1,0);
        int unlit=luminosity(scene);
        check(lit>unlit+3,"renderer draws switched-off room noticeably darker: "+lit+" vs "+unlit);
        System.out.println("PASS 12 physical switches, breaker, ghost flicker, host snapshot and rendered dimming");
    }
}