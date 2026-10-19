package org.beckenburg;

/** Frame-local CPU antialiasing and PSX atmospheric presentation, after depth rendering. */
public final class GraphicsEffects {
    private GraphicsEffects(){}
    private static int clamp(int c){return Math.max(0,Math.min(255,c));}
    private static int lum(int c){return (((c>>>16)&255)*54+((c>>>8)&255)*183+(c&255)*19)>>8;}
    private static int blend(int a,int b,int weight){
        return (a*(256-weight)+b*weight)>>8;
    }
    public static void apply(int[] rgb,int width,int height,GraphicsOptions s,double time){
        if(width<1||height<1||rgb.length!=(long)width*height)
            throw new IllegalArgumentException("invalid framebuffer");
        if(s==null)return;
        boolean aa=s.antialias()!=GraphicsOptions.Antialias.OFF;
        if(!aa&&!s.chromatic()&&!s.vignette()&&!s.scanlines()&&!s.grain()
                &&s.brightness()==0&&s.contrast()==0)return;
        int[] src=aa||s.chromatic()?rgb.clone():rgb;
        double contrast=1+s.contrast()/80.0;
        int[] tone=new int[256];
        for(int i=0;i<256;i++)tone[i]=clamp((int)Math.round(
            (i-127.5)*contrast+127.5+s.brightness()*2));
        int tick=(int)Math.floor(time*7);
        for(int y=0;y<height;y++)for(int x=0;x<width;x++){
            int k=y*width+x,c=src[k];
            if(aa&&x>0&&x<width-1&&y>0&&y<height-1){
                int a=src[k-1],b=src[k+1],u=src[k-width],d=src[k+width];
                int v=lum(c),min=Math.min(v,Math.min(lum(a),Math.min(lum(b),Math.min(lum(u),lum(d)))));
                int max=Math.max(v,Math.max(lum(a),Math.max(lum(b),Math.max(lum(u),lum(d)))));
                if(max-min>28){
                    int weight=s.antialias()==GraphicsOptions.Antialias.STRONG?112:64;
                    int r=(((a>>16)&255)+((b>>16)&255)+((u>>16)&255)+((d>>16)&255))/4;
                    int g=(((a>>8)&255)+((b>>8)&255)+((u>>8)&255)+((d>>8)&255))/4;
                    int bl=((a&255)+(b&255)+(u&255)+(d&255))/4;
                    c=(blend((c>>16)&255,r,weight)<<16)
                        |(blend((c>>8)&255,g,weight)<<8)
                        |blend(c&255,bl,weight);
                }
            }
            int red=(c>>>16)&255,green=(c>>>8)&255,blue=c&255;
            if(s.chromatic()&&width>3){
                int drift=(int)Math.round(Math.abs(x-width*.5)/(width*.5)*2);
                red=(src[y*width+Math.max(0,x-drift)]>>>16)&255;
                blue=src[y*width+Math.min(width-1,x+drift)]&255;
            }
            double mul=1;
            if(s.vignette()){
                double dx=(x-width*.5)/(width*.5),dy=(y-height*.5)/(height*.5);
                mul*=1-Math.min(.36,(dx*dx+dy*dy)*.18);
            }
            if(s.scanlines()&&(y&1)==1)mul*=.88;
            int noise=s.grain()?(((x*1973+y*9277+tick*26699)^
                ((x+tick)*131071))>>>12&7)-3:0;
            rgb[k]=(clamp((int)(tone[red]*mul)+noise)<<16)
                |(clamp((int)(tone[green]*mul)+noise)<<8)
                |clamp((int)(tone[blue]*mul)+noise);
        }
    }
}
