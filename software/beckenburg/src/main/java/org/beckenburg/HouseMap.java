package org.beckenburg;

import java.util.HashSet;
import java.util.Set;

/** Nine authored zones in one navigable, deterministic test house. One floor for this slice. */
public final class HouseMap {
    public static final int WIDTH = 25, HEIGHT = 19;
    private static final String[] NAMES = {
        "CHAPEL", "LIBRARY", "NURSERY",
        "KITCHEN", "CENTRAL HALL", "BEDROOM",
        "CELLAR", "CONSERVATORY", "STUDY"
    };
    private final char[][] tiles = new char[HEIGHT][WIDTH];
    private final Set<Integer> openDoors = new HashSet<>();

    public HouseMap() {
        for (int z = 0; z < HEIGHT; z++) for (int x = 0; x < WIDTH; x++) {
            tiles[z][x] = (x == 0 || z == 0 || x == WIDTH-1 || z == HEIGHT-1 ||
                    x == 8 || x == 16 || z == 6 || z == 12) ? '#' : '.';
        }
        for (int z : new int[]{3, 9, 15}) for (int x : new int[]{8, 16}) tiles[z][x] = 'D';
        for (int z : new int[]{6, 12}) for (int x : new int[]{4, 12, 20}) tiles[z][x] = 'D';
    }
    public int width() { return WIDTH; }
    public int height() { return HEIGHT; }
    public char tile(int x, int z) {
        return x < 0 || z < 0 || x >= WIDTH || z >= HEIGHT ? '#' : tiles[z][x];
    }
    private static int doorId(int x, int z) { return z * WIDTH + x; }
    public boolean doorOpen(int x, int z) { return tile(x,z) == 'D' && openDoors.contains(doorId(x,z)); }
    public boolean solid(int x, int z) { char t = tile(x,z); return t == '#' || (t == 'D' && !doorOpen(x,z)); }
    public boolean traversable(double x, double z) {
        double r = .19;
        return !solid((int)Math.floor(x-r),(int)Math.floor(z-r)) &&
               !solid((int)Math.floor(x+r),(int)Math.floor(z-r)) &&
               !solid((int)Math.floor(x-r),(int)Math.floor(z+r)) &&
               !solid((int)Math.floor(x+r),(int)Math.floor(z+r));
    }
    public boolean toggleNearestDoor(double x, double z) {
        double best = 1.4;
        int candidate = -1;
        for (int zz=1; zz<HEIGHT-1; zz++) for(int xx=1; xx<WIDTH-1; xx++) {
            if (tile(xx, zz) != 'D') continue;
            double distance=Math.hypot(xx+.5-x, zz+.5-z);
            if (distance < best) { best=distance; candidate=doorId(xx,zz); }
        }
        if (candidate < 0) return false;
        if (!openDoors.add(candidate)) openDoors.remove(candidate);
        return true;
    }
    public int roomAt(double x, double z) {
        int cx=(int)Math.floor(x), cz=(int)Math.floor(z);
        if (cx <= 0 || cz <= 0 || cx >= WIDTH-1 || cz >= HEIGHT-1) return -1;
        int col = cx < 8 ? 0 : cx < 16 ? 1 : 2;
        int row = cz < 6 ? 0 : cz < 12 ? 1 : 2;
        return row * 3 + col;
    }
    public String roomName(int room) { return room < 0 || room >= NAMES.length ? "OUTSIDE" : NAMES[room]; }
    public String roomName(double x, double z) { return roomName(roomAt(x,z)); }
    public double centerX(int room) { return 4.5 + (room % 3) * 8; }
    public double centerZ(int room) { return 3.5 + (room / 3) * 6; }
    public boolean valid() {
        for(int z=0;z<HEIGHT;z++) for(int x=0;x<WIDTH;x++) if(tiles[z][x]=='D') {
            boolean ns = tile(x,z-1)!='#' && tile(x,z+1)!='#';
            boolean ew = tile(x-1,z)!='#' && tile(x+1,z)!='#';
            if(!ns && !ew) return false;
        }
        return true;
    }
}
