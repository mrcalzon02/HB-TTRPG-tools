package org.beckenburg;
import java.util.*;
import org.beckenburg.LevelDefinition.*;

/** The same hollow cupboard, standing pocket and difficulty rule drive all players. */
public final class LevelClosets {
    private LevelClosets(){}
    public static boolean available(LevelDefinition level,int room,int density){
        if(density<0||density>100)throw new IllegalArgumentException("hiding density");
        Socket socket=level.socket("hide",room);
        return room>=0&&room<12&&Math.floorMod(room*37+17,100)<density&&socket!=null&&socket.style().equals("walk-in-cupboard");
    }
    public static Vec world(Socket s,double x,double y,double z){
        double c=Math.cos(s.yaw()),sn=Math.sin(s.yaw());return new Vec(s.x()+x*c-z*sn,s.y()+y,s.z()+x*sn+z*c);
    }
    public static boolean inside(Socket s,double x,double y,double z){
        if(s==null||Math.abs(y-s.y())>.15)return false;
        double dx=x-s.x(),dz=z-s.z(),c=Math.cos(s.yaw()),sn=Math.sin(s.yaw());
        double localX=dx*c+dz*sn,localZ=-dx*sn+dz*c;
        return Math.abs(localX)<.35&&localZ>-.31&&localZ<.31;
    }
    public static List<Collider> colliders(LevelDefinition level,int density){
        List<Collider> result=new ArrayList<>();
        for(Socket s:level.sockets())if(s.type().equals("hide")&&available(level,s.room(),density)){
            add(result,s,-.82,0,0,.03,.60,2.3);add(result,s,.82,0,0,.03,.60,2.3);
            add(result,s,0,0,-.57,.82,.03,2.3);
            add(result,s,-.62,0,.61,.19,.04,2.02);add(result,s,.62,0,.61,.19,.04,2.02);
        }
        return List.copyOf(result);
    }
    private static void add(List<Collider> result,Socket s,double x,double y,double z,double hx,double hz,double height){
        Vec p=world(s,x,y,z);result.add(new Collider(p.x(),p.y(),p.z(),hx,hz,height,s.yaw()));
    }
}
