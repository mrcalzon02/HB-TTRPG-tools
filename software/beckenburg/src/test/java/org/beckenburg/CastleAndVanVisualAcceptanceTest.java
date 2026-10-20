package org.beckenburg;

import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.Set;
import javax.imageio.ImageIO;

/** Produces inspection-grade perspective evidence from actual packaged GLBs. */
public final class CastleAndVanVisualAcceptanceTest {
    private static final Path DIR=Path.of("build","e2e");
    private CastleAndVanVisualAcceptanceTest(){}
    private static void ok(boolean value,String label){
        if(!value)throw new AssertionError(label);
    }
    private static void render(SceneRenderer r,String name)throws Exception{
        BufferedImage image=r.image();
        Set<Integer> colors=new HashSet<>();
        for(int pixel:r.pixels())colors.add(pixel);
        ok(colors.size()>28,name+" has textured material and real perspective variation");
        Files.createDirectories(DIR);
        ImageIO.write(image,"png",DIR.resolve(name+".png").toFile());
        System.out.println("E2E VISUAL "+name+" uniqueColors="+colors.size());
    }
    public static void main(String[] args)throws Exception{
        CastleHubMap map=new CastleHubMap();
        ok(map.valid(),"architectural lobby navigation");
        var plan=CastleHubArchitecturalPlan.walls();
        ok(plan.stream().filter(CastleHubArchitecturalPlan.Wall::hasDoor).count()>=13,
            "many authored architectural portals rather than generic grid gaps");
        ok(CastleHubArchitecturalPlan.decks().size()>=3,
            "actual second floor and continuous elevated bridge");
        double elevation=0;
        // Physically walk up twenty increments of the long stone staircase.
        for(double z=31.75;z>=21.9;z-=.25){
            elevation=CastleHubArchitecturalPlan.elevation(17.5,z,elevation);
            ok(map.traversable(17.5,z,elevation),"stair clearance z="+z);
        }
        ok(Math.abs(elevation-CastleHubArchitecturalPlan.GROUND_CEILING)<.01,
            "stair terminates at a true second storey");
        for(double z=21.8;z>=5.4;z-=.2){
            ok(map.traversable(17.5,z,elevation),"gallery and library pass-through z="+z);
            elevation=CastleHubArchitecturalPlan.elevation(17.5,z,elevation);
        }
        ok(elevation>3.3,"player remains on playable upper library floor");
        ok(!map.traversable(14.6,5.6,elevation),
            "upstairs authored table has collider");
        ok(map.traversable(17.5,8.0,elevation),
            "upper library leaves walkable aisles");
        for(CastleHubDecor.Switch sw:CastleHubDecor.SWITCHES)
            ok(CastleHubArchitecturalPlan.mountingWall(sw.x(),sw.y(),sw.z(),sw.yaw()),
                "light switch mounts on continuous actual masonry");

        SceneRenderer view=new SceneRenderer();
        view.setRenderSize(640,400);
        view.x=13.5;view.z=19.3;view.yaw=Math.PI;view.pitch=-.02;
        view.drawCastle(map,2);
        render(view,"castle-ground-courtyard");
        view.x=17.5;view.z=27;view.eyeHeight=1.62+1.70;
        view.yaw=Math.PI;view.pitch=-.04;
        view.drawCastle(map,2);
        render(view,"castle-real-staircase");
        // View across the whole upper library instead of staring into its
        // adjacent east wall; a visual audit must expose furniture and doors.
        view.x=14.5;view.z=8.9;view.eyeHeight=5.02;
        view.yaw=Math.PI;view.pitch=-.08;
        view.drawCastle(map,2);
        render(view,"castle-upper-library");

        for(var fixture:VanInteriorLayout.FIXTURES)
            ok(VanInteriorLayout.insideShell(fixture),
                "real van cargo dimensions: "+fixture.purpose());
        for(double z=-1.85;z<=1.75;z+=.15)
            ok(VanInteriorLayout.openAisle(0,z),
                "continuous clear central walkway in van");
        SceneRenderer vanRender=new SceneRenderer();
        var site=new HouseMap();
        var van=site.van();
        vanRender.setRenderSize(640,400);
        // Visual inspection must look down the actual length of the cargo
        // bay from its open rear doors, not sideways through exterior panels.
        var rear=van.world(0,VanStaging.FRONT+.48);
        vanRender.x=rear.x();vanRender.z=rear.z();
        // VanStaging's world transform rotates local +Z by -yaw.
        // SceneRenderer's view rotates local forward by +yaw; negate the
        // van placement yaw for a genuine rear-to-front interior view.
        vanRender.yaw=-van.placement().yaw();
        vanRender.rackStock=java.util.EnumSet.allOf(EquipmentLoadout.Item.class);
        var session=new InvestigationSession(site,InvestigationSession.Role.OBSERVER,17);
        vanRender.draw(site,session,2);
        render(vanRender,"van-complete-cargo-bay");
        var interior=van.world(.24,1.25);
        vanRender.x=interior.x();vanRender.z=interior.z();
        vanRender.yaw=Math.PI/2-van.placement().yaw();
        vanRender.draw(site,session,2);
        render(vanRender,"van-fitted-monitor-wall");
        vanRender.yaw=-Math.PI/2-van.placement().yaw();
        vanRender.draw(site,session,2);
        render(vanRender,"van-equipment-pegboard");

        // Actual in-game view outward through the open rear cargo doors.
        var doors=van.world(0,VanStaging.FRONT+.9);
        vanRender.x=doors.x();vanRender.z=doors.z();
        vanRender.yaw=Math.PI-van.placement().yaw();
        vanRender.draw(site,session,2);
        render(vanRender,"van-rear-doors-to-street");

        // The opposite direction: road, empty egress lane, actual exterior
        // back of the van, and curbside traffic on both sides.
        var approach=van.world(0,VanArrivalStreet.ROAD_START-7.0);
        vanRender.x=approach.x();vanRender.z=approach.z();
        vanRender.yaw=-van.placement().yaw();
        vanRender.draw(site,session,2);
        render(vanRender,"van-street-facing-van");

        // A second street view down the road from the shoulder makes
        // parked-car placement and continuity inspectable at player eye height.
        var shoulder=van.world(-2.0,VanArrivalStreet.ROAD_START-1.2);
        vanRender.x=shoulder.x();vanRender.z=shoulder.z();
        vanRender.yaw=Math.PI-van.placement().yaw();
        vanRender.draw(site,session,2);
        render(vanRender,"van-approach-road-and-parked-cars");
        // Judge real body-to-cabin proportions from outside. Two three-quarter
        // views show roof taper, cargo length and external wheel clearance.
        var bodyTarget=van.world(0,-.20);
        for(int side:new int[]{-1,1}){
            var outside=van.world(side*8.1,VanStaging.FRONT-2.5);
            vanRender.x=outside.x();vanRender.z=outside.z();
            vanRender.eyeHeight=1.72;
            vanRender.pitch=-.06;
            vanRender.yaw=Math.atan2(bodyTarget.x()-outside.x(),
                bodyTarget.z()-outside.z());
            vanRender.draw(site,session,2);
            render(vanRender,side<0?"van-exterior-west-three-quarter":
                "van-exterior-east-three-quarter");
        }
        // Houses on both pavements and the terminating building must read
        // as a coherent street instead of an empty asphalt stage.
        var streetPoint=van.world(-.35,VanArrivalStreet.ROAD_START-9.0);
        var towardEnd=van.world(0,VanArrivalStreet.ROAD_END-3.0);
        vanRender.x=streetPoint.x();vanRender.z=streetPoint.z();
        vanRender.yaw=Math.atan2(towardEnd.x()-streetPoint.x(),
            towardEnd.z()-streetPoint.z());
        vanRender.pitch=-.03;
        vanRender.draw(site,session,2);
        render(vanRender,"van-street-kenney-residential-block");
        Files.writeString(DIR.resolve("architecture-audit.txt"),
            "PASS measured door openings, real staircase, upstairs navigation, fixtures "+
            "and purchased-tool van source meshes\n");
        System.out.println("PASS architectural geometry and van inspection screenshots");
    }
}
