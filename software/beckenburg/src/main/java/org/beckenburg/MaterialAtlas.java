package org.beckenburg;

import java.awt.image.BufferedImage;

/**
 * Deterministic, original, nearest-neighbor 16-tile PS-era diffuse atlas.
 * Tiles repeat once per meter in world geometry. There are no external asset
 * or texture-loading dependencies: the generated atlas is available at runtime.
 */
public final class MaterialAtlas {
    private MaterialAtlas() { }
    public static final int TILE = 32, GRID = 4, SIZE = TILE * GRID;
    public static final int STONE=0, PLASTER=1, PARQUET=2, CERAMIC=3,
        DOOR=4, CEILING=5, CARPET=6, BRICK=7, WALLPAPER=8,
        CONCRETE=9, SOIL=10, IRON=11, FOLIAGE=12, AGED_WOOD=13,
        WINDOW=14, RITUAL=15;
    public static final int COUNT=16;
    private static final int[] DATA = new int[SIZE*SIZE];
    static { build(); }

    private static int hash(int a,int b,int c) {
        int n = a*374761393 + b*668265263 + c*224682251;
        n = (n ^ (n >>> 13))*1274126177;
        return n ^ (n >>> 16);
    }
    private static int color(int r,int g,int b,int variance) {
        return (clamp(r+variance)<<16) | (clamp(g+variance)<<8) | clamp(b+variance);
    }
    private static int clamp(int x) { return Math.max(0,Math.min(255,x)); }
    private static void build() {
        for(int material=0;material<COUNT;material++) {
            int col=material%GRID,row=material/GRID;
            for(int y=0;y<TILE;y++)for(int x=0;x<TILE;x++) {
                int noise=(hash(x,y,material)&15)-8;
                int joint,grain;
                int rgb=switch(material) {
                    case STONE -> { joint=(y%16<2 || ((x+(y/16)*8)%24)<2)?-38:0;
                        yield color(105,101,109,noise*2+joint); }
                    case PLASTER -> color(139,124,111,noise);
                    case PARQUET -> { grain=(x%8==0 || y%24==0)?-35:0;
                        yield color(104,75,52,noise+grain+(x%8)*2); }
                    case CERAMIC -> { joint=(x%8==0||y%8==0)?-46:0;
                        yield color(119,115,106,noise+joint); }
                    case DOOR -> { grain=(x%12==0 || x%12==11)?-25:(x%4==0?-9:0);
                        yield color(120,72,45,noise+grain); }
                    case CEILING -> color(54,51,57,noise+(x%16==0 || y%16==0?-15:0));
                    case CARPET -> color(80,47,56,noise*2+((x+y)%7==0?9:0));
                    case BRICK -> { joint=(y%8==0||(x+(y/8%2)*8)%16==0)?-48:0;
                        yield color(109,71,63,noise*2+joint); }
                    case WALLPAPER -> { grain=(x%12==0)?-24:((x%12==6)?11:0);
                        yield color(89,91,93,noise+grain); }
                    case CONCRETE -> color(87,87,88,noise*2+((x+y*3)%17==0?-12:0));
                    case SOIL -> color(69,61,49,noise*3);
                    case IRON -> color(68,72,79,noise+(x%8==0?-17:0));
                    case FOLIAGE -> color(55,87,61,noise*2+((x*3+y)%9==0?10:0));
                    case AGED_WOOD -> color(80,66,57,noise+(x%8==0?-23:0));
                    case WINDOW -> color(56,78,93,noise+(x%16==0 || y%16==0?20:0));
                    case RITUAL -> color(118,89,141,noise+(x==y || x+y==TILE-1?30:0));
                    default -> throw new AssertionError(material);
                };
                DATA[(row*TILE+y)*SIZE + col*TILE+x]=rgb;
            }
        }
    }
    /** World-space UVs are repeatable, including for negative coordinates. */
    public static int sample(int material,double u,double v) {
        if(material<0||material>=COUNT||!Double.isFinite(u)||!Double.isFinite(v))
            throw new IllegalArgumentException("Invalid material or UV");
        int tx=Math.min(TILE-1,(int)((u-Math.floor(u))*TILE));
        int ty=Math.min(TILE-1,(int)((v-Math.floor(v))*TILE));
        return DATA[((material/GRID)*TILE+ty)*SIZE + (material%GRID)*TILE+tx];
    }
    public static BufferedImage image() {
        BufferedImage out=new BufferedImage(SIZE,SIZE,BufferedImage.TYPE_INT_RGB);
        out.setRGB(0,0,SIZE,SIZE,DATA,0,SIZE);
        return out;
    }
    public static int floor(int room) { return switch(room) {
        case 0,5 -> CERAMIC;
        case 1,2,7 -> CARPET;
        case 3,4,6,8,10 -> PARQUET;
        case 9,11 -> CONCRETE;
        case 12 -> FOLIAGE;
        case 13 -> AGED_WOOD;
        case 14 -> SOIL;
        default -> CONCRETE;
    }; }
    public static int wall(int room) { return switch(room) {
        case 0,5 -> CERAMIC;
        case 1,2,3,4,7,8 -> WALLPAPER;
        case 6,9 -> BRICK;
        case 10,11 -> PLASTER;
        case 12,13,14 -> AGED_WOOD;
        default -> PLASTER;
    }; }
}