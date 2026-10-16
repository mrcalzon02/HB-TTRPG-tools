package org.beckenburg;

public final class TeamCalloutTest {
    private static void ok(boolean condition,String message){if(!condition)throw new AssertionError(message);}
    public static void main(String[] args){
        HouseMap house=new HouseMap(); TeamCallout.Board board=new TeamCallout.Board(house);
        double x=house.centerX(HouseMap.EXTRACTION_ROOM),z=house.centerZ(HouseMap.EXTRACTION_ROOM);
        ok(house.valid(),"full house layout and connectivity");
        ok(TeamCallout.choose(0,0)==null,"neutral cancels");
        ok(TeamCallout.choose(55,0)==TeamCallout.Phrase.THERE,"right sector");
        ok(TeamCallout.choose(0,-55)==TeamCallout.Phrase.HOLD,"top sector");
        ok(TeamCallout.choose(-55,0)==TeamCallout.Phrase.HERE,"left sector");
        ok(TeamCallout.choose(0,55)==TeamCallout.Phrase.EVIDENCE,"bottom sector");
        var here=new TeamCallout.Request(0,TeamCallout.Phrase.HERE,x,z,x,z,0);
        var ping=board.submit(here);
        ok(ping!=null&&ping.zone()==HouseMap.EXTRACTION_ROOM,"first safe staging callout");
        ok(board.submit(here)==null,"spam reject");
        ok(board.submit(new TeamCallout.Request(0,TeamCallout.Phrase.DANGER,x,z,x,z,12))!=null,"cooldown finished");
        ok(board.submit(new TeamCallout.Request(1,TeamCallout.Phrase.THERE,x,z,100,100,12))==null,"out of bounds reject");
        ok(board.submit(new TeamCallout.Request(1,TeamCallout.Phrase.THERE,x,z,x+50,z,12))==null,"range reject");
        ok(board.submit(new TeamCallout.Request(1,TeamCallout.Phrase.THERE,x,z,Double.NaN,z,12))==null,"nonfinite reject");
        ok(board.submit(new TeamCallout.Request(1,TeamCallout.Phrase.THERE,0,0,x,z,12))==null,"invalid origin reject");
        double[] hit=TeamCallout.aim(house,x,z,Math.PI,18);
        ok(house.traversable(hit[0],hit[1]),"aim result valid");
        ok(TeamCallout.lineClear(house,x,z,hit[0],hit[1]),"aim target visible");
        ok(board.submit(new TeamCallout.Request(1,TeamCallout.Phrase.THERE,x,z,hit[0],hit[1],13))!=null,"aimed ping accepted");
        ok(board.visible(101).stream().noneMatch(p->p.id()==ping.id()),"expiry");
        ok(board.submit(new TeamCallout.Request(0,TeamCallout.Phrase.HERE,x,z,x,z,2))==null,"backdated request reject");
        ok(board.visible(120).isEmpty(),"expired event queue cleared");
        System.out.println("PASS: callout sectors, world-space ray, LOS, finite/range/cooldown checks, expiry");
    }
}