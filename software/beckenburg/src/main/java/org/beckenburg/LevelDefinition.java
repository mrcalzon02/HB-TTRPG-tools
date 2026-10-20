package org.beckenburg;

import java.util.List;

/** Metre-based architectural source of truth. Y is the standing surface, not eye height.
 * Twelve investigation zones keep the existing evidence protocol stable; wings and
 * galleries can contain multiple architectural bays without inventing room-grid edges.
 */
public record LevelDefinition(String id, String revision, String title,
        List<Room> rooms, List<Portal> portals, List<Stair> stairs,
        List<Void> voids, List<Prop> props, List<Socket> sockets,
        List<Collider> colliders, Dock dock, String ambience) {
    public LevelDefinition {
        rooms=List.copyOf(rooms);portals=List.copyOf(portals);stairs=List.copyOf(stairs);
        voids=List.copyOf(voids);props=List.copyOf(props);sockets=List.copyOf(sockets);
        colliders=List.copyOf(colliders);
        if(rooms.size()!=15)throw new IllegalArgumentException("15 stable investigation zones required");
        for(int i=0;i<15;i++)if(rooms.get(i).id()!=i)throw new IllegalArgumentException("ordered room ids required");
        // The handshake follows actual authored data, so two binaries with
        // different stair/prop/socket coordinates cannot silently share a map.
        try{
            String data=id+rooms+portals+stairs+voids+props+sockets+colliders+dock+ambience;
            byte[] hash=java.security.MessageDigest.getInstance("SHA-256").digest(data.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            revision=revision+"-"+java.util.HexFormat.of().formatHex(hash,0,8);
        }catch(java.security.NoSuchAlgorithmException impossible){throw new AssertionError(impossible);}
    }
    public record Vec(double x,double y,double z) { }
    public record Room(int id,String name,double x0,double z0,double x1,double z1,
            double y,double height,String finish,String acoustic,Vec spawn) {
        public boolean outside(){return id>=12;}
        public boolean contains(double x,double y,double z){return x>=x0&&x<=x1&&z>=z0&&z<=z1&&y>=this.y-.22&&y<this.y+height-.15;}
        public double cx(){return spawn.x();}
        public double cz(){return spawn.z();}
    }
    /** Opening tangent is X when alongX, otherwise Z. Width is clear opening.
     * Stair portals are graph edges only; physical ramps own their walk surface. */
    public record Portal(int id,int a,int b,double x,double y,double z,double width,
            boolean alongX,String kind,double loss) {
        public boolean joins(int from,int to){return a==from&&b==to||b==from&&a==to;}
        public boolean door(){return kind.equals("door")||kind.equals("gate");}
    }
    /** Linear centreline ramp; t=0 at bottom, t=1 at top. Rendered as measured treads. */
    public record Stair(int id,int a,int b,double x0,double z0,double x1,double z1,
            double width,double y0,double y1,int steps) {
        public double t(double x,double z){double dx=x1-x0,dz=z1-z0;return ((x-x0)*dx+(z-z0)*dz)/(dx*dx+dz*dz);}
        public boolean contains(double x,double z,double radius){double t=t(x,z);if(t<-.035||t>1.035)return false;double px=x0+(x1-x0)*t,pz=z0+(z1-z0)*t;return Math.hypot(x-px,z-pz)<=width/2-radius;}
        public double yAt(double x,double z){return y0+Math.max(0,Math.min(1,t(x,z)))*(y1-y0);}
    }
    /** Deck opening at a particular standing surface; never removes another storey. */
    public record Void(double y,double x0,double z0,double x1,double z1) {
        public boolean contains(double x,double z){return x>x0&&x<x1&&z>z0&&z<z1;}
    }
    /** Native GLB origin and uniform scale, never normalized to an arbitrary centre. */
    public record Prop(String mesh,int room,double x,double y,double z,double scale,double yaw,
            double halfX,double halfZ,double height,String support) { }
    /** Types: switch, breaker, light, evidence, ritual, hide, spawn, ambient. */
    public record Socket(String id,String type,int room,double x,double y,double z,
            double yaw,String style) { }
    public record Collider(double x,double y,double z,double halfX,double halfZ,double height,double yaw) { }
    public record Dock(double x,double y,double z,double yaw) { }
    public Room room(int id){return rooms.get(id);}
    public double floorY(int room){return room(room).y();}
    public List<Portal> portalsFrom(int room){return portals.stream().filter(p->p.a()==room||p.b()==room).toList();}
    public Socket socket(String type,int room){return sockets.stream().filter(s->s.type().equals(type)&&s.room()==room).findFirst().orElse(null);}
    public boolean floorVoid(double x,double y,double z){return voids.stream().anyMatch(v->Math.abs(v.y()-y)<.05&&v.contains(x,z));}
}
