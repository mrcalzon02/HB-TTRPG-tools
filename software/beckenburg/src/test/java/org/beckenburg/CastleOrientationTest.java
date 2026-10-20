package org.beckenburg;

/** Step order, no free purchases, and completion are independent of rendering. */
public final class CastleOrientationTest {
    private static void ok(boolean v,String label){if(!v)throw new AssertionError(label);}
    public static void main(String[] args){
        CastleOrientation training=new CastleOrientation();
        ok(!training.active(),"starts inactive");
        training.start();ok(training.active()&&training.progress()==0,"starts at expedition");
        ok(!training.visit(CastleHubMap.Station.ROLE)&&training.progress()==0,"cannot skip steps");
        ok(!training.lights(),"cannot complete without visits");
        ok(training.visit(CastleHubMap.Station.EXPEDITION),"van");
        ok(training.visit(CastleHubMap.Station.CONTRACT),"contract board");
        ok(training.visit(CastleHubMap.Station.ROLE),"role");
        ok(training.visit(CastleHubMap.Station.ARMORY_SALT),"either armory socket");
        ok(training.lights()&&training.complete()&&!training.active(),"lights complete orientation");
        ok(!training.visit(CastleHubMap.Station.EXPEDITION),"completed tutorial stays complete");
        training.start();ok(training.progress()==0,"replay restarts explicitly");
        System.out.println("PASS castle orientation step progression");
    }
}
