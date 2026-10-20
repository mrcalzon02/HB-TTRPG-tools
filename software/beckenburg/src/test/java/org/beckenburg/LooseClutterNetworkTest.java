package org.beckenburg;
import org.beckenburg.LevelDefinition.*;
/** Real sockets: authoritative ownership, forged intent rejection and ghost redaction. */
public final class LooseClutterNetworkTest {
    static Object field(Object o,String name)throws Exception{var f=o.getClass().getDeclaredField(name);f.setAccessible(true);return f.get(o);}
    public static void main(String[] args)throws Exception{
        try(var host=new LanHost("127.0.0.1",0,GhostIdentity.Type.SPIRIT);
            var a=new AuthoredLevelNetworkTest.Peer(host.port(),false,"Cleric");
            var b=new AuthoredLevelNetworkTest.Peer(host.port(),false,"Observer");
            var c=new AuthoredLevelNetworkTest.Peer(host.port(),false,"Demonologist");
            var g=new AuthoredLevelNetworkTest.Peer(host.port(),true,"Spirit")){
            a.client.ready();b.client.ready();c.client.ready();g.client.ready();a.await("LOBBY|3|HUMAN|4|WAITING");a.client.start();a.await("INFO|mission started");
            a.client.view3D();a.await("ACCEPT|VIEW3D");b.client.view3D();b.await("ACCEPT|VIEW3D");g.client.viewGhost3D();g.await("ACCEPT|GVIEW3D");
            var map=(HouseMap)field(host,"map");var world=(LanWorld)field(host,"world");Vec at=null;
            var room=map.level().room(3);
            outer:for(double x=room.x0()+1;x<room.x1()-1;x+=.3)for(double z=room.z0()+1;z<room.z1()-1;z+=.3)
                if(map.traversable(x,room.y(),z)&&map.clearObjectPath(x,room.y()+1.1,z,x+.8,room.y()+1.1,z,.1,.06)){at=new Vec(x,room.y(),z);break outer;}
            LooseClutterTest.check(at!=null,"reachable wire fixture");
            synchronized(field(host,"mutex")){
                AuthoredTestSupport.place(map,world,0,at);AuthoredTestSupport.place(map,world,1,at);world.turn(0,270);world.turn(1,270);
                ((int[])field(host,"hunterRooms"))[0]=3;((int[])field(host,"hunterRooms"))[1]=3;
                map.clutter().accept(LooseClutterTest.row(1,LooseClutter.Kind.MUG,at.x()+.7,at.y()+1.1,at.z()));
            }
            var view=LooseClutterTest.aim(0,at,map.clutter().states().get(0));
            a.client.clutter("TAKE",1,view.pitch());a.await("ACCEPT|OBJECT");
            LooseClutterTest.check(map.clutter().held(0)==1,"host owns pickup");
            b.client.clutter("TAKE",1,view.pitch());b.await("REJECT|");
            String concealed=null;long end=System.nanoTime()+2_000_000_000L;
            while(System.nanoTime()<end){String f=g.inbox.poll(50,java.util.concurrent.TimeUnit.MILLISECONDS);if(f!=null&&f.startsWith("CLUTTER|1,MUG,0,0,0,")&&f.endsWith(",-2")){concealed=f;break;}}
            LooseClutterTest.check(concealed!=null,"held item coordinates and owner must be redacted on actual ghost socket");
            g.client.send("OBJECT|TAKE|1|0|999");g.await("REJECT|");
            Thread.sleep(140);a.client.clutter("THROW",1,0);a.await("ACCEPT|OBJECT");
            LooseClutterTest.check(map.clutter().held(0)==-1,"host releases physical projectile");
            a.client.clutter("TAKE",999,0);a.await("REJECT|");
            LooseClutterTest.check(host.running(),"malformed intent must not terminate host");
            System.out.println("PASS real sockets: authoritative pickup/throw, exclusive ownership, invalid IDs, ghost command rejection and held-position privacy");
        }
    }
}
