package org.beckenburg;

/** Boundary and replay prerequisites for a spectral viewpoint with the same DRIFT gates as AI. */
public final class LanGhostSpatialTest {
    private static void ok(boolean v,String s){if(!v)throw new AssertionError(s);}
    private static void fails(Runnable f,String message){try{f.run();throw new AssertionError("allowed "+message);}catch(IllegalArgumentException expected){}}
    public static void main(String[] args){
        HouseMap map=new HouseMap();LanGhostSpatial view=new LanGhostSpatial(map,4);
        ok(view.pose().room()==4&&map.roomAt(view.pose().x(),view.pose().z())==4,"initial pose");
        fails(()->new LanGhostSpatial(map,HouseMap.EXTRACTION_ROOM),"van ghost spawn");
        fails(()->view.step(0,0,1),"zero movement");
        fails(()->view.step(999,0,1),"oversized movement");
        double before=view.pose().x();
        ok(view.step(100,0,2)&&view.pose().x()>before,"local spectral position updated");
        fails(()->view.step(100,0,2),"same-tick speed bypass");
        fails(()->view.turn(-1),"invalid orientation");
        for(int i=3;i<45;i++){try{view.step(100,0,i);}catch(IllegalArgumentException ignored){}}
        ok(view.pose().room()==4,"spectral stepping may not change rooms");
        fails(()->view.syncRoom(HouseMap.EXTRACTION_ROOM),"safe van ingress");
        view.syncRoom(1);
        ok(view.pose().room()==1&&Math.abs(view.pose().x()-map.centerX(1))<.001,"legitimate drift resets camera");
        ok(view.frame(45).startsWith("GPOSE|1|"),"bounded spectral packet");
        System.out.println("PASS: spectral pose bounded to room, fixed tick, safe van denied, drift resets pose");
    }
}
