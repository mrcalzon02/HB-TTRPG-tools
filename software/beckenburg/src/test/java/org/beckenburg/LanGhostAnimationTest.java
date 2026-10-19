package org.beckenburg;

/** Phase visibility, authoritative time windows, and hostile frame validation. */
public final class LanGhostAnimationTest {
    static void check(boolean ok, String message) { if (!ok) throw new AssertionError(message); }
    static void reject(String input) {
        try { LanGhostAnimation.decode(input); throw new AssertionError("accepted malformed: " + input); }
        catch (IllegalArgumentException expected) { }
    }
    public static void main(String[] args) {
        LanGhostAnimation animation = new LanGhostAnimation();
        check(animation.project(false, false, 100, 0) == null, "hidden is undisclosed");
        check(animation.project(true, false, 100, 0).phase() == LanGhostAnimation.Phase.LURK, "no false manifestation");
        animation.manifested(20);
        for (int t = 20; t < 26; t++) {
            LanGhostAnimation.Motion p = animation.project(true, false, 90, t);
            check(p.phase() == LanGhostAnimation.Phase.MATERIALIZE && p.progress() == t-20, "materialization timeline");
            check(LanGhostAnimation.decode(p.frame()).equals(p), "bounded roundtrip");
            check(animation.project(false, false, 90, t) == null, "no hidden phase leakage");
        }
        check(animation.project(true, false, 90, 26).phase() == LanGhostAnimation.Phase.LURK, "form ends");
        animation.windup(35);
        for(int t=35;t<43;t++) {
            LanGhostAnimation.Motion p=animation.project(true, true, 90, t);
            check(p.phase() == LanGhostAnimation.Phase.WINDUP && p.progress()==t-35, "host pending strike timeline");
        }
        animation.impact(43);
        for (int t=43;t<50;t++)check(animation.project(true, false, 270, t).phase() == LanGhostAnimation.Phase.RECOVER, "recovery");
        check(animation.project(true, false, 270, 50).phase() == LanGhostAnimation.Phase.LURK, "recovery ends");
        animation.moved(51,false);
        check(animation.project(true,false,270,51).phase()==LanGhostAnimation.Phase.WALK,
                "accepted ghost movement displays walk atlas");
        check(animation.project(true,false,270,54).phase()==LanGhostAnimation.Phase.WALK,
                "walk window persists between authoritative movement ticks");
        check(animation.project(true,false,270,55).phase()==LanGhostAnimation.Phase.LURK,
                "walk window expires; no indefinite sprint animation");
        animation.moved(60,true);
        check(animation.project(true,false,270,60).phase()==LanGhostAnimation.Phase.SPRINT,
                "authoritative burst is a sprint");
        check(animation.project(false,false,270,60)==null,
                "hidden sprint never discloses a motion packet");
        animation.signature(65);
        check(animation.project(true,false,270,65).phase()==LanGhostAnimation.Phase.SIGNATURE,
                "real accepted species action displays signature animation");
        check(animation.project(true,false,270,75).phase()==LanGhostAnimation.Phase.LURK,
                "signature animation expires");
        for (String invalid : new String[]{"MOTION|WINDUP|360|0|2", "MOTION|WINDUP|40|-1|2",
            "MOTION|GHOST|0|0|2", "MOTION|LURK|0|0|0|private", "MOTION|LURK|0|0|-1",
            "MOTION|LURK|0|0|1\nBODY|0|1"}) reject(invalid);
        System.out.println("PASS: bounded phase timing, hidden-source privacy, phase codec and malformed frame rejection");
    }
}
