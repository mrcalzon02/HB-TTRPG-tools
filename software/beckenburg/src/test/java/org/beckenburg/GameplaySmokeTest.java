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
        ok(map.authoredArchitecture()&&map.width()>24&&map.height()>24&&map.valid(),
            "Victorian domestic building has connected real geometry");
        for(int r=0;r<map.roomCount();r++){var p=map.spawn(r);ok(map.roomAt(p.x(),p.y(),p.z())==r,"zone "+r);}
        var vanSpawn=map.van().spawn();
        ok(map.traversable(vanSpawn.x(),vanSpawn.z()),"valid expedition van spawn");
        ok(!map.traversable(.3,.3),"no wall clipping");
        var door=AuthoredTestSupport.door(map,2,3);var approach=AuthoredTestSupport.side(map,door,2,.7);
        ok(!map.traversable(door.x(),door.y(),door.z()),"closed kitchen threshold blocks");
        ok(map.toggleNearestDoor(approach.x(),approach.y(),approach.z()),"open physically nearby door");
        ok(map.traversable(door.x(),door.y(),door.z()),"open doorway passable");
        ok(map.toggleNearestDoor(approach.x(),approach.y(),approach.z()),"close door");
        ok(!map.traversable(door.x(),door.y(),door.z()),"door reclosed");
        ok(!map.toggleNearestDoor(vanSpawn.x(),vanSpawn.z()),
            "distant door rejected from expedition van");
        InvestigationSession spirit=new InvestigationSession(map,InvestigationSession.Role.OBSERVER,734L);
        SceneRenderer renderer=new SceneRenderer();
        renderer.draw(map,spirit,0);
        ok(Arrays.stream(renderer.pixels()).distinct().count()>20,"triangulated renderer creates actual geometry");
        ok(Arrays.stream(renderer.depths()).anyMatch(Double::isFinite),"zbuffer populated");
        renderer.yaw=1.1;renderer.pitch=.3;renderer.lamp=false;renderer.draw(map,spirit,1);
        ok(Arrays.stream(renderer.pixels()).distinct().count()>20,"alternate orientation and lamp renders");
        int ar=spirit.anchorRoom();var anchor=map.spawn(ar);double ax=anchor.x(),ay=anchor.y(),az=anchor.z();
        ok(!spirit.cleanse(ax,ay,az),"cannot cleanse without a prepared ward");
        int before=spirit.journal().size();
        ok(spirit.scan(InvestigationSession.Instrument.EMF,vanSpawn.x(),vanSpawn.z()),
            "the meter measures ordinary fields in the van without a ghost event");
        ok(spirit.message().matches(".*EMF [2-7]/10")&&spirit.journal().size()==before+1,
            "ordinary numeric measurement is recorded without fabricated paranormal strength");
        for(InvestigationSession.Instrument i:InvestigationSession.Instrument.values())
            ok(spirit.scan(i,ax,ay,az),"actual environmental measurement from "+i);
        ok(spirit.evidenceCount()==3,"distinct instrument use is recorded once, without confirming evidence");
        ok(!spirit.cleanse(ax,ay,az),"ward required");
        ok(spirit.placeWard(ax,ay,az),"ward placed");
        ok(spirit.wards()==1&&spirit.wardPrepared(),"ward has material cost");
        ok(spirit.cleanse(ax,ay,az),"cleansing succeeds at correct anchor");
        ok(spirit.outcome()==InvestigationSession.Outcome.CLEANSED,"complete state");
        var console=map.van().location(VanStaging.Station.EXTRACTION);
        ok(spirit.extract(console.x(),0,console.z()),"cleansed case can extract at physical console");
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
            for(int i=0;i<800;i++) game.tick(vanSpawn.x(),vanSpawn.z());
            ok(game.health()>0,"spawn-zone not unfairly lethal for "+role);
            var target=map.spawn(game.anchorRoom());double gx=target.x(),gy=target.y(),gz=target.z();
            for(var item:InvestigationSession.Instrument.values())ok(game.scan(item,gx,gy,gz),"role can scan "+item);
            ok(!game.cleanse(gx,gy,gz),"role must use ward");
            ok(game.placeWard(gx,gy,gz)&&game.cleanse(gx,gy,gz),"all roles can cleanse");
        }
        InvestigationSession encounter=new InvestigationSession(map,InvestigationSession.Role.OBSERVER,2026L);
        int hostile=encounter.anchorRoom();
        var target=map.spawn(hostile);double hx=target.x(),hy=target.y(),hz=target.z();
        for(int t=0;t<160;t++)encounter.tick(hx,hy,hz,true);
        ok(encounter.health()==100,"ghost cannot damage a fresh hunter during initial warning window");
        for(int t=160;t<440;t++)encounter.tick(hx,hy,hz,true);
        ok(encounter.health()<100,"AI-ghost shared dispatcher can inflict real incremental wounds");
        ok(encounter.health()>0,"hunter survives multiple initial encounters and may retreat");
        System.out.println("PASS: fifteen zones, door/collision, 3D render/depth, instruments, wards, cleansing, extraction, economy save and all role baseline safety");
    }
}
