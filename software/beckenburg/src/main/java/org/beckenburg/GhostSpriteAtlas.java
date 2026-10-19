package org.beckenburg;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import javax.imageio.ImageIO;

/**
 * Optional, user-authored v2 ghost atlas. Keep compressed sheets until needed,
 * and decode only a bounded LRU of angles; eagerly decoding 184 full atlases
 * would use hundreds of megabytes on a typical player's machine.
 *
 * No archive means the original approved 12-image runtime remains functional.
 * A present but incomplete/broken archive is an error, never a silent partial
 * replacement. The source boards are concept cutouts, not rigged animations.
 */
final class GhostSpriteAtlas {
    private static final int CELL_W=128, CELL_H=224, COLS=4, ROWS=8, MAX_CACHE=8;
    private static final String[] DIRECTIONS={
        "front","front_right","right","back_right","back","back_left","left","front_left"
    };
    private static final String[] STATES={
        "idle","walk","sprint","attack","signature","manifest","recover","dissipate"
    };
    private static final Set<String> ALLOWED=java.util.Arrays.stream(GhostIdentity.Type.values())
        .map(t->t.name().toLowerCase(java.util.Locale.ROOT))
        .collect(java.util.stream.Collectors.toUnmodifiableSet());
    private static final Map<String,byte[]> PNGS=load();
    private static final Map<String,BufferedImage> CACHE=new LinkedHashMap<>(16,.75f,true){
        @Override protected boolean removeEldestEntry(Map.Entry<String,BufferedImage> entry){
            return size()>MAX_CACHE;
        }
    };
    private GhostSpriteAtlas(){}

    static boolean installed(){ return !PNGS.isEmpty(); }
    static int atlasCount(){ return PNGS.size(); }
    static boolean supports(String character){
        return character!=null && ALLOWED.contains(character) && PNGS.containsKey(key(character,0));
    }
    static String state(LanGhostAnimation.Phase phase){
        return switch(phase){
            case MATERIALIZE -> "manifest";
            case WINDUP -> "attack";
            case RECOVER -> "recover";
            default -> "idle";
        };
    }
    static BufferedImage frame(String character,int facing,String state,int step){
        if(facing<0||facing>=8||step<0||step>=COLS)
            throw new IllegalArgumentException("invalid sprite frame/facing");
        if(!supports(character)) return null;
        int row=-1;
        for(int i=0;i<STATES.length;i++)if(STATES[i].equals(state)){row=i;break;}
        if(row<0)throw new IllegalArgumentException("unknown sprite state: "+state);
        String path=key(character,facing);
        synchronized(CACHE){
            BufferedImage sheet=CACHE.get(path);
            if(sheet==null){
                try{
                    sheet=ImageIO.read(new ByteArrayInputStream(PNGS.get(path)));
                }catch(IOException e){throw new IllegalStateException("Cannot decode sprite: "+path,e);}
                if(sheet==null||sheet.getWidth()!=CELL_W*COLS||sheet.getHeight()!=CELL_H*ROWS
                        ||!sheet.getColorModel().hasAlpha())
                    throw new IllegalStateException("Invalid atlas geometry/alpha: "+path);
                CACHE.put(path,sheet);
            }
            return sheet.getSubimage(step*CELL_W,row*CELL_H,CELL_W,CELL_H);
        }
    }
    private static String key(String character,int facing){
        return "frames/"+character+"/"+DIRECTIONS[facing]+".png";
    }
    private static Map<String,byte[]> load(){
        Map<String,byte[]> all=new HashMap<>();
        try(var resource=GhostSpriteAtlas.class.getResourceAsStream("ghost-sprite-expansion-v2.zip")){
            if(resource==null)return Map.of();
            try(var zip=new ZipInputStream(resource)){
                ZipEntry entry;
                while((entry=zip.getNextEntry())!=null){
                    String name=entry.getName();
                    if(!entry.isDirectory()&&name.startsWith("frames/")&&name.endsWith(".png")){
                        String[] parts=name.split("/");
                        if(parts.length!=3||!ALLOWED.contains(parts[1])||
                                !java.util.Arrays.asList(DIRECTIONS).contains(parts[2].substring(0,parts[2].length()-4)))
                            throw new IOException("Unexpected ghost sprite atlas: "+name);
                        ByteArrayOutputStream out=new ByteArrayOutputStream();
                        byte[] buf=new byte[8192];int n;
                        while((n=zip.read(buf))!=-1){
                            if(out.size()+n>3_000_000)
                                throw new IOException("Oversize ghost sprite atlas: "+name);
                            out.write(buf,0,n);
                        }
                        if(all.put(name,out.toByteArray())!=null)
                            throw new IOException("Duplicate ghost sprite atlas: "+name);
                    }
                    zip.closeEntry();
                }
            }
            if(all.size()!=ALLOWED.size()*DIRECTIONS.length)
                throw new IOException("Expected "+(ALLOWED.size()*8)+" ghost atlases, found "+all.size());
            for(String name:ALLOWED)
                for(int f=0;f<8;f++)if(!all.containsKey(key(name,f)))
                    throw new IOException("Missing ghost sprite atlas: "+key(name,f));
            return Map.copyOf(all);
        }catch(IOException ex){throw new IllegalStateException("Invalid packaged ghost sprite expansion",ex);}
    }
}
