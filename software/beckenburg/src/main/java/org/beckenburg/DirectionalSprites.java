package org.beckenburg;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import javax.imageio.ImageIO;

/** Camera-facing, depth-tested character art in the first-person software scene.
 * Images are individual approved PNG turnarounds, never geometric cube avatars.
 * The resource ZIP is packed into the actual shipped Beckenburg game JAR.
 */
public final class DirectionalSprites {
    private static final int W=SceneRenderer.W,H=SceneRenderer.H;
    private static final double FOCAL=153.0,NEAR=.065; // exactly match SceneRenderer
    private static final String[] FACINGS={"front","front","side", "back_three_quarter",
            "back","back_three_quarter_mirrored","side_mirrored","front"};
    private static final Map<String,BufferedImage> IMAGES=load();
    private DirectionalSprites() { }

    private static Map<String,BufferedImage> load(){
        Map<String,BufferedImage> frames=new HashMap<>();
        try(var source=DirectionalSprites.class.getResourceAsStream("directional-sprites.zip")){
            if(source==null)throw new IllegalStateException("Missing packaged Beckenburg directional-sprites.zip");
            try(var zip=new ZipInputStream(source)){
                ZipEntry entry;
                while((entry=zip.getNextEntry())!=null){
                    String name=entry.getName();
                    if(!entry.isDirectory() && name.matches("assets/(observer|banshee)/[a-z_]+[.]png")){
                        ByteArrayOutputStream bytes=new ByteArrayOutputStream();
                        zip.transferTo(bytes);
                        BufferedImage image=ImageIO.read(new ByteArrayInputStream(bytes.toByteArray()));
                        if(image==null||!image.getColorModel().hasAlpha())
                            throw new IOException("Invalid transparent character frame: "+name);
                        frames.put(name.substring(7,name.length()-4),image);
                    }
                    zip.closeEntry();
                }
            }
        }catch(IOException ex){throw new IllegalStateException("Cannot load Beckenburg sprite frames",ex);}
        for(String person:new String[]{"observer","banshee"}){
            for(String facing:new String[]{"front","side","side_mirrored","back_three_quarter",
                    "back_three_quarter_mirrored","back"}){
                if(!frames.containsKey(person+"/"+facing))
                    throw new IllegalStateException("Missing character frame: "+person+"/"+facing);
            }
        }
        return Map.copyOf(frames);
    }
    public static int frameCount(){return IMAGES.size();}
    public static BufferedImage frame(String character,int facing){
        if(facing<0||facing>=8)throw new IllegalArgumentException("facing must be 0..7");
        BufferedImage image=IMAGES.get(character+"/"+FACINGS[facing]);
        if(image==null)throw new IllegalArgumentException("Unknown character sprite: "+character);
        return image;
    }
    /** Expansion v2 supplies a different appearance for each original/Ancient ghost.
     * Legacy observer/banshee facings remain the graceful fallback when not packaged.
     */
    public static BufferedImage frame(String character,int facing,LanGhostAnimation.Phase phase,int animationFrame){
        if(facing<0||facing>=8||phase==null)throw new IllegalArgumentException("invalid facing/phase");
        BufferedImage expanded=GhostSpriteAtlas.frame(character,facing,GhostSpriteAtlas.state(phase),animationFrame);
        if(expanded!=null)return expanded;
        return frame(IMAGES.containsKey(character+"/front")?character:"banshee",facing);
    }
    /** Entity heading zero looks +Z; facing zero when camera looks at its face. */
    public static int facing(int heading,double entityX,double entityZ,double camX,double camZ){
        if(heading<0||heading>=360||!Double.isFinite(entityX)||!Double.isFinite(entityZ)
                ||!Double.isFinite(camX)||!Double.isFinite(camZ))throw new IllegalArgumentException("Bad sprite pose");
        double cameraAngle=Math.toDegrees(Math.atan2(camX-entityX,camZ-entityZ));
        return Math.floorMod((int)Math.floor((cameraAngle-heading+22.5)/45.0),8);
    }
    /** Billboard is drawn after static geometry and tests against the same perspective depth buffer.
     * Rendering changes no collision, coordinates, authority, or ghost visibility decisions.
     */
    public static void draw(int[] pixels,double[] depth,double cameraX,double cameraZ,
            double yaw,double pitch,double entityX,double entityZ,int heading,
            String character,double height,double width,double elevation,int opacity,boolean lamp){
        draw(pixels,depth,cameraX,cameraZ,yaw,pitch,entityX,entityZ,heading,
            character,height,width,elevation,opacity,lamp,W,H,FOCAL);
    }
    public static void draw(int[] pixels,double[] depth,double cameraX,double cameraZ,
            double yaw,double pitch,double entityX,double entityZ,int heading,
            String character,double height,double width,double elevation,int opacity,boolean lamp,
            int renderWidth,int renderHeight,double focal){
        draw(pixels,depth,cameraX,cameraZ,yaw,pitch,entityX,entityZ,heading,
            character,height,width,elevation,opacity,lamp,renderWidth,renderHeight,focal,false);
    }
    /** Ancient forms reuse their parent's alpha-masked directional artwork.
     * Green tint is applied per rendered pixel, without copying sprite assets.
     */
    public static void draw(int[] pixels,double[] depth,double cameraX,double cameraZ,
            double yaw,double pitch,double entityX,double entityZ,int heading,
            String character,double height,double width,double elevation,int opacity,boolean lamp,
            int renderWidth,int renderHeight,double focal,boolean ancientTint){
        draw(pixels,depth,cameraX,cameraZ,yaw,pitch,entityX,entityZ,heading,
            character,height,width,elevation,opacity,lamp,renderWidth,renderHeight,focal,
            ancientTint,LanGhostAnimation.Phase.LURK,0);
    }
    /** Pose is selected only from a host-authorized visible apparition.
     * A v2 Ancient atlas is already green, so never apply the legacy tint twice.
     */
    public static void draw(int[] pixels,double[] depth,double cameraX,double cameraZ,
            double yaw,double pitch,double entityX,double entityZ,int heading,
            String character,double height,double width,double elevation,int opacity,boolean lamp,
            int renderWidth,int renderHeight,double focal,boolean ancientTint,
            LanGhostAnimation.Phase phase,int animationFrame){
        if(pixels.length!=renderWidth*renderHeight||depth.length!=renderWidth*renderHeight
                ||opacity<=0||height<=0)return;
        if(!Double.isFinite(entityX)||!Double.isFinite(entityZ))return;
        double dx=entityX-cameraX,dz=entityZ-cameraZ;
        double right=dx*Math.cos(yaw)-dz*Math.sin(yaw);
        double ahead=dx*Math.sin(yaw)+dz*Math.cos(yaw);
        if(ahead<NEAR||ahead>24)return;
        double cy=Math.cos(pitch),sy=Math.sin(pitch);
        double baseY=elevation-1.62,topY=elevation+height-1.62;
        double nearBottom=baseY*sy+ahead*cy,nearTop=topY*sy+ahead*cy;
        if(nearBottom<NEAR||nearTop<NEAR)return;
        double foot=renderHeight/2.0-(baseY*cy-ahead*sy)/nearBottom*focal;
        double head=renderHeight/2.0-(topY*cy-ahead*sy)/nearTop*focal;
        if(head>=foot)return;
        double anchorDepth=(nearBottom+nearTop)/2;
        double cx=renderWidth/2.0+right/anchorDepth*focal;
        double halfW=focal*width/(2*anchorDepth);
        int x0=Math.max(0,(int)Math.floor(cx-halfW)),x1=Math.min(renderWidth-1,(int)Math.ceil(cx+halfW));
        int y0=Math.max(0,(int)Math.floor(head)),y1=Math.min(renderHeight-1,(int)Math.ceil(foot));
        if(x0>x1||y0>y1)return;
        BufferedImage sprite=frame(character,facing(heading,entityX,entityZ,cameraX,cameraZ),phase,animationFrame);
        int sw=sprite.getWidth(),sh=sprite.getHeight();
        double screenWidth=halfW*2,screenHeight=foot-head;
        double fog=Math.min(.75,Math.max(0,(anchorDepth-5)/15));
        double illumination=(lamp?1.22:.55)*Math.max(.22,1-anchorDepth/26.0);
        for(int py=y0;py<=y1;py++){
            int v=(int)((py+.5-head)/screenHeight*sh);
            if(v<0||v>=sh)continue;
            for(int px=x0;px<=x1;px++){
                int u=(int)((px+.5-(cx-halfW))/screenWidth*sw);
                if(u<0||u>=sw)continue;
                int argb=sprite.getRGB(u,v),alpha=(argb>>>24)*Math.min(255,opacity)/255;
                if(alpha<24)continue;
                int k=py*renderWidth+px;
                if(anchorDepth>=depth[k])continue;
                int red=(int)(((argb>>>16)&255)*illumination),
                    green=(int)(((argb>>>8)&255)*illumination),
                    blue=(int)((argb&255)*illumination);
                red=(int)(Math.min(255,red)*(1-fog)+18*fog);
                green=(int)(Math.min(255,green)*(1-fog)+21*fog);
                blue=(int)(Math.min(255,blue)*(1-fog)+30*fog);
                if(ancientTint&&!(character.startsWith("ancient_")&&GhostSpriteAtlas.supports(character))){
                    red=(int)(red*.33);
                    green=Math.min(255,(int)(green*.80+53));
                    blue=(int)(blue*.35);
                }
                int bg=pixels[k];
                if(alpha<255){
                    red=(red*alpha+((bg>>>16)&255)*(255-alpha))/255;
                    green=(green*alpha+((bg>>>8)&255)*(255-alpha))/255;
                    blue=(blue*alpha+(bg&255)*(255-alpha))/255;
                }
                pixels[k]=(red<<16)|(green<<8)|blue;
                if(alpha>=220)depth[k]=anchorDepth;
            }
        }
    }
}