package org.beckenburg;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.util.Objects;
import java.util.prefs.Preferences;
import javax.swing.*;

/** Persisted local graphics preferences; no server or save-file dependencies. */
public record GraphicsOptions(Mode mode, DisplaySize display, Detail detail,
    Aspect aspect, Upscale upscale, Antialias antialias, int fieldOfView,
    int brightness,int contrast, boolean scanlines,boolean vignette,boolean grain,
    boolean chromatic) {
    private static final Preferences PREF=Preferences.userNodeForPackage(GraphicsOptions.class);
    private static volatile GraphicsOptions active=read();
    public enum Mode {
        WINDOWED("Windowed"), BORDERLESS_WINDOW("Borderless window"),
        BORDERLESS_FULLSCREEN("Borderless fullscreen"),
        EXCLUSIVE_FULLSCREEN("Exclusive fullscreen (native resolution)");
        private final String label;Mode(String s){label=s;}
        @Override public String toString(){return label;}
    }
    public enum DisplaySize {
        NATIVE(0,0,"Native / automatic"), HD(1280,720,"1280 × 720"),
        HD_PLUS(1600,900,"1600 × 900"), FULL_HD(1920,1080,"1920 × 1080"),
        ULTRAWIDE(2560,1080,"2560 × 1080"), QHD(2560,1440,"2560 × 1440"),
        ULTRAWIDE_QHD(3440,1440,"3440 × 1440"), UHD(3840,2160,"3840 × 2160");
        public final int width,height;private final String label;
        DisplaySize(int w,int h,String label){width=w;height=h;this.label=label;}
        @Override public String toString(){return label;}
    }
    public enum Detail {
        RETRO(200,"Retro 200p"), LOW(270,"Low 270p"), BALANCED(360,"Balanced 360p"),
        SHARP(480,"Sharp 480p"), HIGH(540,"High 540p"),
        ULTRA(720,"Ultra 720p (CPU intensive)");
        public final int height;private final String label;
        Detail(int h,String s){height=h;label=s;}
        @Override public String toString(){return label;}
    }
    public enum Aspect {
        AUTO(0,"Auto"), CLASSIC(4.0/3,"4:3"), WIDE(16.0/9,"16:9"),
        TALL(16.0/10,"16:10"), ULTRAWIDE(21.0/9,"21:9");
        public final double ratio;private final String label;
        Aspect(double r,String s){ratio=r;label=s;}
        @Override public String toString(){return label;}
    }
    public enum Upscale {
        CRISP("Nearest-neighbor",RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR),
        SMOOTH("Bilinear",RenderingHints.VALUE_INTERPOLATION_BILINEAR),
        CUBIC("Bicubic",RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        public final Object hint;private final String label;
        Upscale(String s,Object h){label=s;hint=h;}
        @Override public String toString(){return label;}
    }
    public enum Antialias {
        OFF("Off"), EDGE("Edge-aware / fast"), STRONG("Edge-aware / strong");
        private final String label;Antialias(String s){label=s;}
        @Override public String toString(){return label;}
    }
    public GraphicsOptions {
        Objects.requireNonNull(mode);Objects.requireNonNull(display);
        Objects.requireNonNull(detail);Objects.requireNonNull(aspect);
        Objects.requireNonNull(upscale);Objects.requireNonNull(antialias);
        if(fieldOfView<50||fieldOfView>120||brightness<-40||brightness>40
                ||contrast<-40||contrast>40)throw new IllegalArgumentException("invalid video settings");
    }
    private static <T extends Enum<T>> T get(String key,Class<T> type,T defaultValue){
        try{return Enum.valueOf(type,PREF.get(key,defaultValue.name()));}
        catch(IllegalArgumentException e){return defaultValue;}
    }
    private static GraphicsOptions read(){
        return new GraphicsOptions(get("mode",Mode.class,Mode.WINDOWED),
            get("display",DisplaySize.class,DisplaySize.NATIVE),
            get("detail",Detail.class,Detail.RETRO),
            get("aspect",Aspect.class,Aspect.AUTO),
            get("upscale",Upscale.class,Upscale.CRISP),
            get("aa",Antialias.class,Antialias.OFF),
            Math.max(50,Math.min(120,PREF.getInt("fov",93))),
            Math.max(-40,Math.min(40,PREF.getInt("brightness",0))),
            Math.max(-40,Math.min(40,PREF.getInt("contrast",0))),
            PREF.getBoolean("scanlines",false),PREF.getBoolean("vignette",false),
            PREF.getBoolean("grain",false),PREF.getBoolean("chromatic",false));
    }
    public static GraphicsOptions current(){return active;}
    public void save(){
        PREF.put("mode",mode.name());PREF.put("display",display.name());
        PREF.put("detail",detail.name());PREF.put("aspect",aspect.name());
        PREF.put("upscale",upscale.name());PREF.put("aa",antialias.name());
        PREF.putInt("fov",fieldOfView);PREF.putInt("brightness",brightness);
        PREF.putInt("contrast",contrast);PREF.putBoolean("scanlines",scanlines);
        PREF.putBoolean("vignette",vignette);PREF.putBoolean("grain",grain);
        PREF.putBoolean("chromatic",chromatic);active=this;
    }
    public record Viewport(int x,int y,int width,int height){
        public int renderWidth(Detail detail){
            int w=(int)Math.round(detail.height*width/(double)height);
            return Math.max(160,Math.min(1920,(w+1)&~1));
        }
    }
    public Viewport viewport(int displayWidth,int displayHeight){
        int w=Math.max(1,displayWidth),h=Math.max(1,displayHeight);
        if(aspect==Aspect.AUTO)return new Viewport(0,0,w,h);
        if(w/(double)h>aspect.ratio){
            int narrow=Math.max(1,(int)Math.round(h*aspect.ratio));
            return new Viewport((w-narrow)/2,0,narrow,h);
        }
        int shortHeight=Math.max(1,(int)Math.round(w/aspect.ratio));
        return new Viewport(0,(h-shortHeight)/2,w,shortHeight);
    }
    public Viewport configure(SceneRenderer scene,int w,int h,boolean playerCamera){
        Viewport view=viewport(w,h);
        scene.setRenderSize(view.renderWidth(detail),detail.height);
        scene.setPsxPreset(PsxPipeline.selected());
        if(playerCamera)scene.setFieldOfView(fieldOfView);
        return view;
    }
    public void draw(Graphics2D g,BufferedImage image,int width,int height){
        Viewport area=viewport(width,height);
        g.setColor(Color.BLACK);g.fillRect(0,0,width,height);
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,upscale.hint);
        g.drawImage(image,area.x(),area.y(),area.width(),area.height(),null);
    }
    public void applyWindow(JFrame frame){
        if(GraphicsEnvironment.isHeadless())return;
        GraphicsConfiguration gc=frame.getGraphicsConfiguration();
        GraphicsDevice device=gc.getDevice();
        if(device.getFullScreenWindow()==frame)device.setFullScreenWindow(null);
        Mode target=mode==Mode.EXCLUSIVE_FULLSCREEN&&!device.isFullScreenSupported()
            ?Mode.BORDERLESS_FULLSCREEN:mode;
        boolean noBorder=target!=Mode.WINDOWED;
        if(frame.isUndecorated()!=noBorder){
            frame.dispose();frame.setUndecorated(noBorder);frame.setVisible(true);
        }
        frame.setExtendedState(JFrame.NORMAL);
        Rectangle screen=gc.getBounds();
        if(target==Mode.EXCLUSIVE_FULLSCREEN){device.setFullScreenWindow(frame);return;}
        if(target==Mode.BORDERLESS_FULLSCREEN){frame.setBounds(screen);return;}
        Insets insets=Toolkit.getDefaultToolkit().getScreenInsets(gc);
        int freeW=Math.max(640,screen.width-insets.left-insets.right);
        int freeH=Math.max(480,screen.height-insets.top-insets.bottom);
        int wantW=display==DisplaySize.NATIVE?Math.min(freeW,1600):display.width;
        int wantH=display==DisplaySize.NATIVE?Math.min(freeH,900):display.height;
        int width=Math.min(freeW,wantW),height=Math.min(freeH,wantH);
        frame.setBounds(screen.x+(screen.width-width)/2,
            screen.y+(screen.height-height)/2,width,height);
    }
}
