package org.beckenburg;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;

/** Deterministic headless tests of world, 3D graphics, roles, evidence, rites and persistence. */
public final class GameplaySmokeTest {
    private static void ok(boolean condition,String reason){if(!condition)throw new AssertionError(reason);}
    public static void main(String[] args) throws Exception {
        HouseMap map=new HouseMap();
        ok(map.width()==25&&map.height()==19&&map.valid(),"valid nine-room map");
        for(int r=0;r<9;r++)ok(map.roomAt(map.centerX(r),map.centerZ(r))==r,"zone "+r);
        ok(map.traversable(4.5,15.5),"valid spawn");
        ok(!map.traversable(.3,.3),"no wall clipping");
        ok(!map.traversable(8.5,15.5),"closed door blocks");
        ok(map.toggleNearestDoor(7.5,15.5),"open door");
        ok(map.traversable(8.5,15.5),"open door passable");
        ok(map.toggleNearestDoor(7.5,15.5),"close door");
        ok(!map.traversable(8.5,15.5),"door reclosed");
        ok(!map.toggleNearestDoor(4.5,15.5),"distant door rejected");
        InvestigationSession spirit=new InvestigationSession(map,InvestigationSession.Role.OBSERVER,734L);
        SceneRenderer renderer=new SceneRenderer();
        renderer.draw(map,spirit,0);
        ok(Arrays.stream(renderer.pixels()).distinct().count()>20,"triangulated renderer creates actual geometry");
        ok(Arrays.stream(renderer.depths()).anyMatch(Double::isFinite),"zbuffer populated");
        renderer.yaw=1.1;renderer.pitch=.3;renderer.lamp=false;renderer.draw(map,spirit,1);
        ok(Arrays.stream(renderer.pixels()).distinct().count()>20,"alternate orientation and lamp renders");
        int ar=spirit.anchorRoom();double ax=map.centerX(ar),az=map.centerZ(ar);
        ok(!spirit.cleanse(ax,az),"cannot cleanse without evidence");
        ok(!spirit.scan(InvestigationSession.Instrument.EMF,4.5,15.5)||ar==6,"remote baseline not guaranteed positive");
        for(InvestigationSession.Instrument i:InvestigationSession.Instrument.values())
            ok(spirit.scan(i,ax,az),"signature evidence for "+i);
        ok(spirit.evidenceCount()==3,"all evidence families recorded once");
        ok(!spirit.cleanse(ax,az),"ward required");
        ok(spirit.placeWard(ax,az),"ward placed");
        ok(spirit.wards()==1&&spirit.wardPrepared(),"ward has material cost");
        ok(spirit.cleanse(ax,az),"cleansing succeeds at correct anchor");
        ok(spirit.outcome()==InvestigationSession.Outcome.CLEANSED,"complete state");
        ok(spirit.extract(4.5,15.5),"cleansed case can extract");
        ok(spirit.payout()>200,"cleanse compensation");
        Path temp=Files.createTempDirectory("beckenburg-profile-");
        try{
            Path path=temp.resolve("profile.properties");ProfileStore profile=new ProfileStore(path);
            ok(profile.addPayout(spirit),"first payout applied");
            ok(!profile.addPayout(spirit),"duplicate same-session payout rejected");
            ProfileStore verify=new ProfileStore(path);verify.load();
            ok(!verify.addPayout(spirit),"duplicate payout rejected after reload");
            ok(verify.currency()==spirit.payout()&&verify.experience()==100,"profile persists monetary reward and xp");
            ok(Files.size(path)>0,"atomic save created");
            Files.writeString(path,"schema=1\ncurrency=-200\nexperience=3\n");
            try{verify.load();throw new AssertionError("negative wallet accepted");}catch(IOException expected){}
            try{verify.addPayout(spirit);throw new AssertionError("profile load error overwritten");}catch(IOException expected){}
        }finally{try(var files=Files.list(temp)){files.forEach(p->{try{Files.delete(p);}catch(IOException e){throw new RuntimeException(e);}});}Files.delete(temp);}
        for(var role:InvestigationSession.Role.values()){
            InvestigationSession game=new InvestigationSession(map,role,11);
            for(int i=0;i<800;i++) game.tick(4.5,15.5);
            ok(game.health()>0,"spawn-zone not unfairly lethal for "+role);
            double gx=map.centerX(game.anchorRoom()), gz=map.centerZ(game.anchorRoom());
            for(var item:InvestigationSession.Instrument.values())ok(game.scan(item,gx,gz),"role can scan "+item);
            ok(!game.cleanse(gx,gz),"role must use ward");
            ok(game.placeWard(gx,gz)&&game.cleanse(gx,gz),"all roles can cleanse");
        }
        System.out.println("PASS: nine zones, door/collision, 3D render/depth, instruments, wards, cleansing, extraction, economy save and all role baseline safety");
    }
}
