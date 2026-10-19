package org.beckenburg;

/** Validate contract-endurance inversion, authoritative stamina, and ghost bursts. */
public final class SprintStaminaTest {
    static void ok(boolean b,String why){if(!b)throw new AssertionError(why);}
    public static void main(String[] args){
        CustomContract easy=CustomContract.standard(1),hard=CustomContract.standard(6);
        ok(easy.hunterSprintSeconds()>hard.hunterSprintSeconds(),
            "easy contract grants longer hunter sprint");
        ok(easy.ghostSprintSeconds()<hard.ghostSprintSeconds(),
            "hard contract grants longer ghost burst");
        HouseMap map=new HouseMap();
        LanWorld hunter=new LanWorld(map);
        hunter.configure(hard);
        hunter.setRoom(0,4);
        int start=hunter.stamina(0);
        hunter.move(0,100,0,1,true);
        ok(hunter.stamina(0)==start-1,"successful sprint consumes energy");
        for(int tick=2;tick<80;tick++)hunter.advanceStamina(tick);
        ok(hunter.stamina(0)==hunter.staminaCapacity(),
            "stationary hunter recharges independently of input");
        LanGhostSpatial ghost=new LanGhostSpatial(map,4);
        ghost.configureBurst(GhostIdentity.Type.BANSHEE,hard.ghostSprintSeconds());
        int full=ghost.stamina();
        ghost.step(100,0,1,true);
        ok(ghost.stamina()==full-1,"ghost sprint consumes identical host-time stamina");
        for(int tick=2;tick<150;tick++)ghost.advanceStamina(tick);
        ok(ghost.stamina()==full,"ghost burst recharges to contract limit");
        ok(ghost.staminaFrame(150).startsWith("STAMINA|"),
            "ghost receives only its own stamina status");
        ok(hunter.staminaFrame(0,150).startsWith("STAMINA|"),
            "hunter receives personal stamina status");
        ok(GhostTraits.movementPercent(GhostIdentity.Type.BANSHEE)>
           GhostTraits.movementPercent(GhostIdentity.Type.SHADE),
            "fast and slow ghosts remain meaningfully different");
        System.out.println("PASS: inverse endurance, movement stamina and host snapshots");
    }
}
