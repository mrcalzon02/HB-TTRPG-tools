package org.beckenburg;
import java.util.Arrays;

/** Headless, deterministic checks; run with Java assertions enabled. */
public final class SmokeTest {
    public static void main(String[] args) {
        BeckenburgPrototype.World world = new BeckenburgPrototype.World();
        for(String row:BeckenburgPrototype.PLAN)check(row.length()==16,"rectangular map");
        check(world.traversable(2.5,13.5),"spawn walkable");
        check(!world.traversable(-.1,3),"out-of-bounds blocked");
        check(world.tile(6,6)=='#',"middle wall present");
        check(!world.traversable(5.5,6.5),"door begins closed");
        check(world.toggleNearestDoor(5.5,7.5),"nearby door opens");
        check(world.traversable(5.5,6.5),"door tile walkable after opening");
        check(world.toggleNearestDoor(5.5,7.5),"nearby door closes");
        check(!world.traversable(5.5,6.5),"door tile blocked after closing");
        check(!world.toggleNearestDoor(2.5,13.5),"distant door cannot be operated");
        BeckenburgPrototype.Renderer renderer = new BeckenburgPrototype.Renderer();
        renderer.draw(world,0);
        check(Arrays.stream(renderer.pixels).distinct().count()>20,"render has actual visible geometry");
        check(Arrays.stream(renderer.zbuffer).anyMatch(Double::isFinite),"3D depth populated");
        renderer.yaw=1.2; renderer.pitch=.4; renderer.lamp=false;
        renderer.draw(world,1.0);
        check(Arrays.stream(renderer.pixels).distinct().count()>15,"alternate view draws geometry");
        System.out.println("PASS: map geometry, collision, door interaction, 3D raster, look pitch, alternate lighting");
    }
    private static void check(boolean ok,String name){if(!ok)throw new AssertionError(name);}
}
