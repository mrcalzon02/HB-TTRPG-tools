package org.beckenburg;

/** Regression harness: one common van can be instanced at different map sites. */
public final class VanStagingTest {
    private static void check(boolean value,String message) {
        if(!value)throw new AssertionError(message);
    }
    public static void main(String[] args) {
        HouseMap house=new HouseMap();VanStaging van=house.van();
        check(house.valid(),"house and van walk graph valid");
        check(house.roomAt(van.spawn().x(),van.spawn().z())==HouseMap.EXTRACTION_ROOM,"spawn in van staging zone");
        check(house.traversable(van.spawn().x(),van.spawn().z()),"open cargo bay spawn remains traversable");
        check(house.traversable(van.world(0,VanStaging.FRONT-.2).x(),van.world(0,VanStaging.FRONT-.2).z()),"front exit open");
        check(!house.traversable(van.world(VanStaging.HALF_WIDTH-.08,0).x(),van.world(VanStaging.HALF_WIDTH-.08,0).z()),"side wall collision");
        check(!house.traversable(van.world(0,VanStaging.REAR-.06).x(),van.world(0,VanStaging.REAR-.06).z()),"rear wall collision");
        for(var station:VanStaging.Station.values()) {
            var loc=van.location(station);
            check(house.traversable(loc.x(),loc.z()),"station reached: "+station);
            check(van.stationAt(loc.x(),loc.z())==station,"station dispatch: "+station);
            check(van.stationAt(loc.x()+30,loc.z())==null,"distance reject: "+station);
        }
        check(van.stationAt(Double.NaN,27)==null,"nonfinite interaction rejected");
        check(van.stationAt(van.world(-2.25,0).x(),van.world(-2.25,0).z())==null,"outside side panel cannot activate station");
        for(double angle:new double[]{0,Math.PI/2,Math.PI,-Math.PI/3}) {
            var placed=new VanStaging(new VanStaging.Placement(45.0,19.0,angle));
            var p=placed.world(1.37,-.45);var local=placed.local(p.x(),p.z());
            check(Math.abs(local.x()-1.37)<1e-8&&Math.abs(local.z()+.45)<1e-8,"reposition and rotate module");
            check(placed.solid(placed.world(VanStaging.HALF_WIDTH-.08,0).x(),placed.world(VanStaging.HALF_WIDTH-.08,0).z()),"van side rotates with placement");
            for(var station:VanStaging.Station.values()) {
                var loc=placed.location(station);
                check(placed.stationAt(loc.x(),loc.z())==station,"same stations in relocated van");
            }
        }
        InvestigationSession session=new InvestigationSession(house,InvestigationSession.Role.OBSERVER,28);
        var exit=van.location(VanStaging.Station.EXTRACTION);
        check(session.extract(exit.x(),exit.z()),"working extraction console position");
        check(session.outcome()==InvestigationSession.Outcome.RETREATED,"extraction resolves partial retreat");
        SceneRenderer renderer=new SceneRenderer();
        renderer.x=van.spawn().x();renderer.z=van.spawn().z();renderer.yaw=Math.PI;
        renderer.draw(house,session,0);
        long colored=java.util.Arrays.stream(renderer.pixels()).distinct().count();
        check(colored>30,"van cargo geometry renders with multiple materials: "+colored);
        System.out.println("PASS: one reusable van, site transforms, colliding cargo shell, stations, extraction and 3D geometry");
    }
}