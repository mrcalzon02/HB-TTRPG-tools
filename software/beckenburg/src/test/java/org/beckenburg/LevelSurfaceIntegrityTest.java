package org.beckenburg;

import java.lang.reflect.Method;
import java.util.*;
import org.beckenburg.LevelDefinition.*;

/** Checks actual generated surfaces, rather than trusting a material assignment list. */
public final class LevelSurfaceIntegrityTest {
    private static final double EPS=1e-7;
    private static void check(boolean ok,String why){if(!ok)throw new AssertionError(why);}
    private static double coordinate(Object p,String axis)throws Exception{return ((Number)LevelSceneSource.read(p,axis)).doubleValue();}
    private static List<Object> generated(String name,Class<?>[] types,Object... args)throws Exception{
        Method method=SceneRenderer.class.getDeclaredMethod(name,types);method.setAccessible(true);
        List<Object> faces=new ArrayList<>();Object[] values=new Object[args.length+1];values[0]=faces;
        System.arraycopy(args,0,values,1,args.length);method.invoke(null,values);return faces;
    }
    private record Rect(String axis,double plane,double a0,double a1,double y0,double y1,int material){}
    private static Rect rectangle(Object f)throws Exception{
        Object a=LevelSceneSource.read(f,"a"),b=LevelSceneSource.read(f,"b"),c=LevelSceneSource.read(f,"c");
        String axis=Math.abs(coordinate(a,"x")-coordinate(b,"x"))<EPS&&Math.abs(coordinate(a,"x")-coordinate(c,"x"))<EPS?"x":"z";
        if(Math.abs(coordinate(a,axis)-coordinate(b,axis))>EPS||Math.abs(coordinate(a,axis)-coordinate(c,axis))>EPS)return null;
        String tangent=axis.equals("x")?"z":"x";
        double a0=Math.min(coordinate(a,tangent),Math.min(coordinate(b,tangent),coordinate(c,tangent)));
        double a1=Math.max(coordinate(a,tangent),Math.max(coordinate(b,tangent),coordinate(c,tangent)));
        double y0=Math.min(coordinate(a,"y"),Math.min(coordinate(b,"y"),coordinate(c,"y")));
        double y1=Math.max(coordinate(a,"y"),Math.max(coordinate(b,"y"),coordinate(c,"y")));
        if(a1-a0<EPS||y1-y0<EPS)return null;
        return new Rect(axis,coordinate(a,axis),a0,a1,y0,y1,(Integer)LevelSceneSource.read(f,"material"));
    }
    private static double floorArea(List<Object> faces,LevelDefinition level,Room r)throws Exception{
        double area=0;
        for(Object f:faces){
            Object a=LevelSceneSource.read(f,"a"),b=LevelSceneSource.read(f,"b"),c=LevelSceneSource.read(f,"c");
            double ax=coordinate(a,"x"),az=coordinate(a,"z"),bx=coordinate(b,"x"),bz=coordinate(b,"z"),cx=coordinate(c,"x"),cz=coordinate(c,"z");
            for(var hole:level.voids())if(Math.abs(hole.y()-r.y())<.01){
                double overlapX=Math.min(Math.max(ax,Math.max(bx,cx)),hole.x1())-Math.max(Math.min(ax,Math.min(bx,cx)),hole.x0());
                double overlapZ=Math.min(Math.max(az,Math.max(bz,cz)),hole.z1())-Math.max(Math.min(az,Math.min(bz,cz)),hole.z0());
                check(overlapX<EPS||overlapZ<EPS,level.id()+" floor triangle covers stair aperture "+r.id());
            }
            area+=Math.abs((bx-ax)*(cz-az)-(bz-az)*(cx-ax))/2;
        }
        return area;
    }
    public static void main(String[] args)throws Exception{
        for(var site:List.of(HouseMap.Site.HOUSE,HouseMap.Site.FARMHOUSE,HouseMap.Site.SCHOOL)){
            HouseMap map=new HouseMap(site);var level=map.level();List<Rect> walls=new ArrayList<>();
            for(Room r:level.rooms())if(!r.outside()){
                check(LevelMaterials.floor(r)!=LevelMaterials.wall(r),site+" wall and floor share finish "+r.id());
                List<Object> deck=generated("levelDeck",new Class<?>[]{List.class,LevelDefinition.class,Room.class,boolean.class},level,r,false);
                double expected=(r.x1()-r.x0())*(r.z1()-r.z0());
                for(var v:level.voids())if(Math.abs(v.y()-r.y())<.01)
                    expected-=Math.max(0,Math.min(v.x1(),r.x1())-Math.max(v.x0(),r.x0()))*Math.max(0,Math.min(v.z1(),r.z1())-Math.max(v.z0(),r.z0()));
                check(Math.abs(floorArea(deck,level,r)-expected)<EPS,site+" floor area lost outside apertures "+r.id());
                for(boolean alongX:new boolean[]{true,false})for(double plane:alongX?new double[]{r.z0(),r.z1()}:new double[]{r.x0(),r.x1()}){
                    var faces=generated("levelWall",new Class<?>[]{List.class,LevelDefinition.class,Room.class,boolean.class,double.class,double.class,double.class},
                        level,r,alongX,plane,alongX?r.x0():r.z0(),alongX?r.x1():r.z1());
                    for(Object face:faces){Rect rect=rectangle(face);if(rect!=null)walls.add(rect);}
                }
            }
            // Coplanar trim of one material is harmless; conflicting finishes are not.
            for(int i=0;i<walls.size();i++)for(int j=i+1;j<walls.size();j++){
                Rect a=walls.get(i),b=walls.get(j);
                if(a.material()==b.material()||!a.axis().equals(b.axis())||Math.abs(a.plane()-b.plane())>EPS)continue;
                check(Math.min(a.a1(),b.a1())-Math.max(a.a0(),b.a0())<EPS||Math.min(a.y1(),b.y1())-Math.max(a.y0(),b.y0())<EPS,
                    site+" conflicting coplanar wall finishes "+a+" / "+b);
            }
            check(level.guards().size()==level.voids().size()*3,site+" deck opening lacks three-sided guard");
            for(var guard:level.guards()){
                check(!map.traversable((guard.x0()+guard.x1())/2,guard.y(),(guard.z0()+guard.z1())/2),site+" guard has no physical barrier");
                var rail=generated("levelRail",new Class<?>[]{List.class,double.class,double.class,double.class,double.class,double.class,double.class},
                    guard.x0(),guard.y(),guard.z0(),guard.x1(),guard.y(),guard.z1());
                double highest=Double.NEGATIVE_INFINITY;
                for(Object f:rail)for(String p:List.of("a","b","c"))highest=Math.max(highest,coordinate(LevelSceneSource.read(f,p),"y"));
                check(highest>=guard.y()+.95,site+" guard is not rendered to handrail height");
            }
            System.out.println("PASS "+site+": disjoint wall finishes, exact deck apertures, distinct floor materials and physical/rendered guards");
        }
    }
}
