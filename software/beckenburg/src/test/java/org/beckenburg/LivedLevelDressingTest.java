package org.beckenburg;
import java.util.*;
import org.beckenburg.LevelDefinition.*;
/** Supports, staged machinery and actual cupboard entry/absence, with real collision. */
public final class LivedLevelDressingTest {
    private static void check(boolean yes,String why){if(!yes)throw new AssertionError(why);}
    private static int triangles(HouseMap map)throws Exception{
        var scene=new SceneRenderer();var full=SceneRenderer.class.getDeclaredField("exportFullLevel");full.setAccessible(true);full.setBoolean(scene,true);
        var method=SceneRenderer.class.getDeclaredMethod("levelArchitecture",List.class,HouseMap.class);method.setAccessible(true);
        List<Object> faces=new ArrayList<>();method.invoke(scene,faces,map);return faces.size();
    }
    public static void main(String[] args)throws Exception{
        for(var site:AuthoredTestSupport.SITES){
            HouseMap map=new HouseMap(site);var level=map.level();
            for(var door:level.portals())if(door.door())map.openDoorBetweenRooms(door.a(),door.b());
            long kits=level.props().stream().filter(p->LivedAssets.ORIGINAL.contains(LivedAssets.base(p.mesh()))).count();
            check(level.props().stream().noneMatch(p->LivedAssets.ORIGINAL.contains(p.mesh())),"game must use the worn texture variants");
            check(kits>=25,site+" insufficient authored furnishing groups: "+kits);
            List<Socket> closets=level.sockets().stream().filter(s->s.type().equals("hide")).toList();
            check(closets.size()>=5,site+" cupboards must be scattered across the site");
            map.configureHiding(0);int absent=triangles(map);map.configureHiding(100);int present=triangles(map);
            check(present-absent==closets.size()*GlbProps.model("level_hiding_cupboard").triangles().size(),site+" difficulty must change actual closet geometry");
            for(Socket s:closets){
                check(map.hidingSpot(s.room(),0)==null&&map.hidingSpot(s.room(),100)!=null,"0/100 presence contract");
                int previous=0;
                for(int density=0;density<=100;density++){
                    int now=LevelClosets.available(level,s.room(),density)?1:0;check(now>=previous,"density must be monotonic");previous=now;
                }
                check(map.traversable(s.x(),s.y(),s.z()),site+" closet interior blocked "+s.room());
                var from=LevelClosets.world(s,0,0,1.10);Vec at=from;
                check(map.traversable(from.x(),from.y(),from.z()),site+" closet approach blocked "+s.room());
                for(int i=1;i<=24;i++){
                    var next=LevelClosets.world(s,0,0,1.10*(1-i/24.0));at=map.resolveMove(at,next.x(),next.z());
                    check(at!=null,site+" cannot physically enter closet "+s.room()+" step "+i);
                }
                map.configureHiding(0);
                var side=LevelClosets.world(s,.82,0,0);
                if(!map.traversable(side.x(),side.y(),side.z()))side=LevelClosets.world(s,-.82,0,0);
                check(map.traversable(side.x(),side.y(),side.z()),site+" no free test point beside absent cupboard "+s.room());
                map.configureHiding(100);
                check(!map.traversable(side.x(),side.y(),side.z()),site+" cupboard side has no collision");
                map.configureHiding(0);check(map.traversable(side.x(),side.y(),side.z()),site+" absent cupboard leaves invisible collision "+s.room());map.configureHiding(100);
                LanWorld world=new LanWorld(map);world.configure(new CustomContract(1,100,150,100,100,100,100,100,CustomContract.Sprint.LIMITED,100,true,true));
                AuthoredTestSupport.place(map,world,0,from);
                try{world.toggleHide(0);throw new AssertionError("hiding accepted outside cupboard");}catch(IllegalArgumentException expected){}
                AuthoredTestSupport.place(map,world,0,new Vec(s.x(),s.y(),s.z()));check(world.toggleHide(0),"real interior must support concealment");
                check(!world.toggleHide(0),"emerge from cupboard");
                InvestigationSession solo=new InvestigationSession(map,InvestigationSession.Role.OBSERVER,1);
                check(solo.toggleHide(s.x(),s.y(),s.z())&&solo.hidden(),"solo cupboard concealment");
                solo.tick(s.x(),s.y(),s.z(),false);check(solo.hidden(),"stationary hiding preserved");
                solo.tick(from.x(),from.y(),from.z(),false);check(!solo.hidden(),"movement exposes solo hunter");
            }
            for(Prop p:level.props())if(LivedAssets.base(p.mesh()).equals("level_lived_desk_clutter")||LivedAssets.base(p.mesh()).equals("level_lived_kitchenware")){
                check(level.props().stream().anyMatch(parent->parent.room()==p.room()&&parent.mesh().equals(p.support())
                    &&Math.hypot(parent.x()-p.x(),parent.z()-p.z())<.01&&Math.abs(p.y()-parent.y()-.864)<.005),"tabletop clutter needs actual support");
            }
            if(site==HouseMap.Site.SCHOOL){
                var coals=level.props().stream().filter(p->LivedAssets.base(p.mesh()).equals("level_boiler_coal")).toList();
                var oils=level.props().stream().filter(p->LivedAssets.base(p.mesh()).equals("level_boiler_oil")).toList();
                var modern=level.props().stream().filter(p->LivedAssets.base(p.mesh()).equals("level_boiler_modern")).toList();
                check(coals.size()==3&&oils.size()==2&&modern.size()==3,"school plant requires all three installation eras");
                check(coals.stream().allMatch(p->p.z()<20)&&modern.stream().allMatch(p->p.z()>30),"retired boilers at back, current plant at front");
            }
            System.out.println("PASS "+site+": "+kits+" furnishing groups; "+closets.size()+" physically enterable difficulty-controlled cupboards; supported small objects");
        }
        for(String name:LivedAssets.ORIGINAL)check(!GlbProps.model(name).triangles().isEmpty(),"original library resource missing: "+name);
    }
}
