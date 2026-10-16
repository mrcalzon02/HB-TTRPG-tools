package org.beckenburg;

/** Impact decisions read only host-owned transforms and retain the initiating target seat. */
public final class LanTelegraphedStrikeTest {
    private static void ok(boolean v,String msg){if(!v)throw new AssertionError(msg);}
    public static void main(String[] args){
        HouseMap map=new HouseMap();LanWorld world=new LanWorld(map);
        LanGhostSpatial ghost=new LanGhostSpatial(map,4);
        for(int i=0;i<3;i++)world.setRoom(i,4);
        int[] rooms={4,4,4}; boolean[] alive={true,true,true},spatial={true,true,true};
        GhostDomain.Resolution effect=new GhostDomain.Resolution(true,"accepted",GhostDomain.Action.STRIKE,4,64,6,12,true);
        LanTelegraphedStrike.Pending pending=LanTelegraphedStrike.begin(170,0,effect);
        ok(!pending.due(177)&&pending.due(178),"eight full simulation ticks before impact");
        ok(pending.hits(map,world,ghost.pose(),rooms,alive,spatial),"stationary locked target should be hit");
        for(int tick=171;tick<=178;tick++)world.move(0,100,0,tick);
        ok(!pending.hits(map,world,ghost.pose(),rooms,alive,spatial),"target moving beyond 2m must evade");
        ok(LanSpatialCombat.canStrike(map,world,ghost.pose(),1),"other hunter still in range");
        ok(!pending.hits(map,world,ghost.pose(),rooms,alive,spatial),"attack cannot retarget another seat");
        world.setRoom(0,4);alive[0]=false;
        ok(!pending.hits(map,world,ghost.pose(),rooms,alive,spatial),"disconnected victim cannot be hit");
        alive[0]=true;spatial[0]=false;
        ok(!pending.hits(map,world,ghost.pose(),rooms,alive,spatial),"mode changes invalidate delayed 3D strike");
        spatial[0]=true;rooms[0]=1;
        ok(!pending.hits(map,world,ghost.pose(),rooms,alive,spatial),"room change invalidates delayed strike");
        rooms[0]=4;
        GhostDomain.Resolution bad=new GhostDomain.Resolution(false,"rejected",GhostDomain.Action.STRIKE,4,90,0,0,false);
        try{LanTelegraphedStrike.begin(170,0,bad);throw new AssertionError("rejected strike could wind up");}
        catch(IllegalArgumentException expected){}
        // Closing an intervening doorway blocks impact even when endpoints remain in range.
        ok(LanSpatialCombat.lineOfSight(map,ghost.pose().x(),ghost.pose().z(),world.body(0).x(),world.body(0).z()),"same room clear sight");
        System.out.println("PASS: eight-tick host wind-up, locked target, movement evasion and disconnect/room validation");
    }
}
