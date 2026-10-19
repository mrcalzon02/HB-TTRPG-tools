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
        ok(map.width()==25&&map.height()==31&&map.valid(),"valid fifteen-zone map");
        for(int r=0;r<map.roomCount();r++)ok(map.roomAt(map.centerX(r),map.centerZ(r))==r,"zone "+r);
        ok(map.traversable(20.5,27.5),"valid spawn");
        ok(!map.traversable(.3,.3),"no wall clipping");
        ok(!map.traversable(16.5,21.5),"closed door blocks");
        ok(map.toggleNearestDoor(15.5,21.5),"open door");
        ok(map.traversable(16.5,21.5),"open door passable");
        ok(map.toggleNearestDoor(15.5,21.5),"close door");
        ok(!map.traversable(16.5,21.5),"door reclosed");
        ok(!map.toggleNearestDoor(20.5,27.5),"distant door rejected");
        InvestigationSession spirit=new InvestigationSession(map,InvestigationSession.Role.OBSERVER,734L);
        SceneRenderer renderer=new SceneRenderer();
        renderer.draw(map,spirit,0);
        ok(Arrays.stream(renderer.pixels()).distinct().count()>20,"triangulated renderer creates actual geometry");
        ok(Arrays.stream(renderer.depths()).anyMatch(Double::isFinite),"zbuffer populated");
        renderer.yaw=1.1;renderer.pitch=.3;renderer.lamp=false;renderer.draw(map,spirit,1);
        ok(Arrays.stream(renderer.pixels()).distinct().count()>20,"alternate orientation and lamp renders");
        int ar=spirit.anchorRoom();double ax=map.centerX(ar),az=map.centerZ(ar);
        ok(!spirit.cleanse(ax,az),"cannot cleanse without a prepared ward");
        int before=spirit.journal().size();
        ok(spirit.scan(InvestigationSession.Instrument.EMF,20.5,27.5),
            "the meter measures ordinary fields in the van without a ghost event");
        ok(spirit.message().matches(".*EMF [2-7]/10")&&spirit.journal().size()==before+1,
            "ordinary numeric measurement is recorded without fabricated paranormal strength");
        for(InvestigationSession.Instrument i:InvestigationSession.Instrument.values())
            ok(spirit.scan(i,ax,az),"actual environmental measurement from "+i);
        ok(spirit.evidenceCount()==3,"distinct instrument use is recorded once, without confirming evidence");
        ok(!spirit.cleanse(ax,az),"ward required");
        ok(spirit.placeWard(ax,az),"ward placed");
        ok(spirit.wards()==1&&spirit.wardPrepared(),"ward has material cost");
        ok(spirit.cleanse(ax,az),"cleansing succeeds at correct anchor");
        ok(spirit.outcome()==InvestigationSession.Outcome.CLEANSED,"complete state");
        ok(spirit.extract(20.5,27.5),"cleansed case can extract");
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
            for(int i=0;i<800;i++) game.tick(20.5,27.5);
            ok(game.health()>0,"spawn-zone not unfairly lethal for "+role);
            double gx=map.centerX(game.anchorRoom()), gz=map.centerZ(game.anchorRoom());
            for(var item:InvestigationSession.Instrument.values())ok(game.scan(item,gx,gz),"role can scan "+item);
            ok(!game.cleanse(gx,gz),"role must use ward");
            ok(game.placeWard(gx,gz)&&game.cleanse(gx,gz),"all roles can cleanse");
        }
        InvestigationSession encounter=new InvestigationSession(map,InvestigationSession.Role.OBSERVER,2026L);
        int hostile=encounter.anchorRoom();
        double hx=map.centerX(hostile),hz=map.centerZ(hostile);
        for(int t=0;t<160;t++)encounter.tick(hx,hz);
        ok(encounter.health()==100,"ghost cannot damage a fresh hunter during initial warning window");
        for(int t=160;t<440;t++)encounter.tick(hx,hz);
        ok(encounter.health()<100,"AI-ghost shared dispatcher can inflict real incremental wounds");
        ok(encounter.health()>0,"hunter survives multiple initial encounters and may retreat");
        System.out.println("PASS: fifteen zones, door/collision, 3D render/depth, instruments, wards, cleansing, extraction, economy save and all role baseline safety");
    }
}
