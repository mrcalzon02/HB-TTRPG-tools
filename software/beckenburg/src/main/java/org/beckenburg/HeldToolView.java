package org.beckenburg;

import java.awt.*;
import java.awt.geom.AffineTransform;

/** First-person illustrated 3D-camera foreground prop: handheld silhouette, controls and live screen.
 * No painted HUD/menu substitute: this is the foreground held device drawn over the world.
 */
public final class HeldToolView {
    private HeldToolView(){}
    public static void draw(Graphics2D graphics,int width,int height,String kind,long tick,boolean operating){
        draw(graphics,width,height,kind,tick,operating,false);
    }
    public static void draw(Graphics2D graphics,int width,int height,String kind,long tick,
            boolean operating,boolean flashlightOn){
        draw(graphics,width,height,kind,tick,operating,flashlightOn,null);
    }
    /** The screen/LED display reads server-reported measurements; no fake animated readouts. */
    public static void draw(Graphics2D graphics,int width,int height,String kind,long tick,
            boolean operating,boolean flashlightOn,String measurement){
        draw(graphics,width,height,kind,tick,operating,flashlightOn,
            measurement,EquipmentTiers.Tier.I);
    }
    /** Upgraded hardware has a physically larger, more legible diegetic face. */
    public static void draw(Graphics2D graphics,int width,int height,String kind,long tick,
            boolean operating,boolean flashlightOn,String measurement,EquipmentTiers.Tier tier){
        if(graphics==null||kind==null||width<180||height<140)return;
        if(tier==null)tier=EquipmentTiers.Tier.I;
        // Prefer original licensed geometry. Its live display belongs to the
        // physical instrument face, not a ghost-confirmation HUD.
        if(HeldInstrumentMesh.source(kind,tier)!=null){
            HeldInstrumentMesh.draw(graphics,width,height,kind,tier,measurement);
            return;
        }
        // The authored GLB flashlight cannot masquerade as every other instrument.
        // Correct licensed tool meshes are attached per item as they are integrated.
        if(kind.equals("FLASHLIGHT"))
            HeldMeshView.draw(graphics,width,height,tick,flashlightOn);
        Graphics2D g=(Graphics2D)graphics.create();
        try{
            double scale=Math.min(width/850.0,height/480.0);
            // Fixed pixel-space weapon placement at the lower-right, gentle walking/using motion.
            scale=Math.max(.48,Math.min(1.65,scale));
            scale*=switch(tier){
                case I->1.0;case II->1.10;case III->1.20;
            };
            double bob=3*Math.sin(tick*.15),kick=operating?-13:0;
            g.translate(width-126*scale,height-41*scale+bob+kick);
            g.scale(scale,scale);
            g.setStroke(new BasicStroke(2f));
            // Shadow, gloved palm and sleeve. Geometry deliberately sits in front of all room depth.
            g.setColor(new Color(4,8,12,125));g.fillOval(-95,-9,183,54);
            g.setColor(new Color(44,47,53));g.fillPolygon(new int[]{-32,47,112,34},new int[]{9,52,62,0},4);
            g.setColor(new Color(123,96,83));g.fillRoundRect(-46,-29,62,53,15,15);
            g.setColor(new Color(177,134,109));g.fillRoundRect(-37,-28,45,15,7,7);
            g.setColor(new Color(51,53,63));g.fillPolygon(new int[]{8,42,106,47},new int[]{19,57,62,10},4);
            g.setColor(new Color(140,148,153));g.drawLine(38,45,96,57);
            switch(kind){
                case "EMF" ->{
                    body(g, -41,-144,85,142,0x242d34);
                    body(g,-35,-135,72,79,0x3d5355);
                    int level=-1;
                    if(measurement!=null){
                        java.util.regex.Matcher reading=java.util.regex.Pattern
                            .compile("EMF (\\d{1,2})/10").matcher(measurement);
                        if(reading.find())level=Integer.parseInt(reading.group(1));
                    }
                    int lit=level<0?-1:(level+1)/2-1;
                    for(int i=0;i<5;i++){
                        g.setColor(new Color(i<=lit?0x73eaa0:0x2c5146));
                        g.fillRoundRect(-26+i*13,-119,10,16,3,3);
                    }
                    g.setColor(new Color(209,216,193));g.setFont(new Font(Font.MONOSPACED,Font.BOLD,13));
                    g.drawString(level<0?"-- / 10":level+" / 10",-25,-78);
                    g.setColor(new Color(81,93,105));g.fillRoundRect(-20,-43,44,24,6,6);
                    g.setColor(new Color(202,205,197));g.fillRect(-7,-34,18,6);
                }
                case "THERMOMETER" ->{
                    body(g,-31,-161,69,162,0xb6b8ad);
                    body(g,-24,-139,55,65,0x222f37);
                    g.setColor(new Color(103,204,200));g.setFont(new Font(Font.MONOSPACED,Font.BOLD,20));
                    String degrees="--";
                    if(measurement!=null){
                        java.util.regex.Matcher reading=java.util.regex.Pattern
                            .compile("Air (-?\\d+(?:\\.\\d+)?)°C").matcher(measurement);
                        if(reading.find())degrees=reading.group(1)+"C";
                    }
                    g.drawString(degrees,-19,-95);
                    g.setColor(new Color(68,71,72));g.fillOval(-7,-61,22,22);
                    g.setColor(new Color(240,200,102));g.fillOval(1,-53,6,6);
                }
                case "SPIRIT_BOX" ->{
                    body(g,-63,-117,125,116,0x292d32);
                    body(g,-51,-102,102,55,0x384e53);
                    g.setColor(new Color(112,201,153));
                    boolean replied=measurement!=null&&measurement.contains("response / spectral");
                    for(int i=0;i<9;i++){
                        int h=replied?9+(i*7%14):2;
                        g.drawLine(-40+i*10,-75,-40+i*10,-75-h);
                    }
                    g.setColor(new Color(183,178,155));g.setFont(new Font(Font.MONOSPACED,Font.BOLD,10));
                    g.drawString("SPIRIT FM",-32,-53);
                    g.setColor(new Color(15,20,22));g.fillOval(-40,-36,31,30);g.fillOval(18,-36,31,30);
                    g.setColor(new Color(142,153,159));g.drawOval(-40,-36,31,30);g.drawOval(18,-36,31,30);
                }
                case "GHOST_WRITING_BOOK" ->{
                    body(g,-78,-123,153,117,0x564736);
                    g.setColor(new Color(219,202,162));
                    g.fillPolygon(new int[]{-73,-5,-5,-73},new int[]{-116,-106,-10,-22},4);
                    g.fillPolygon(new int[]{1,69,70,1},new int[]{-107,-116,-22,-10},4);
                    g.setColor(new Color(113,61,53));
                    if(measurement!=null&&measurement.contains("Childlike"))
                        for(int i=0;i<4;i++)g.drawOval(-50+i*19,-82,12,12);
                    else if(measurement!=null&&measurement.contains("frantic"))
                        for(int i=0;i<7;i++)g.drawLine(-63+i*15,-93,-55+i*13,-29);
                    else if(measurement!=null&&measurement.contains("ritual"))
                        for(int i=0;i<3;i++)g.drawOval(13+i*2,-95+i*2,46-i*4,46-i*4);
                    g.setColor(new Color(84,62,39));g.drawLine(0,-112,0,-9);
                }
                case "UV_LAMP" ->{
                    body(g,-30,-151,58,153,0x383947);
                    body(g,-45,-168,88,42,0x4b4965);
                    g.setColor(new Color(180,135,231));g.fillRoundRect(-35,-164,68,28,6,6);
                    g.setColor(new Color(225,201,248,operating?195:100));g.fillRoundRect(-32,-161,63,22,5,5);
                }
                case "PHOTO_CAMERA" ->{
                    body(g,-80,-121,160,113,0x343537);
                    body(g,-42,-147,86,37,0x49474c);
                    g.setColor(new Color(15,19,24));g.fillOval(-36,-110,81,81);
                    g.setColor(new Color(114,139,157));g.drawOval(-33,-107,75,75);
                    g.setColor(new Color(48,62,75));g.fillOval(-18,-92,45,45);
                    g.setColor(new Color(154,192,221));g.fillOval(-6,-80,19,19);
                    if(operating){g.setColor(new Color(255,246,201,120));g.fillOval(-43,-118,92,92);}
                }
                case "SALT" ->{
                    body(g,-43,-115,89,115,0xb5aa89);
                    g.setColor(new Color(216,207,184));g.fillRoundRect(-40,-146,83,39,6,6);
                    g.setColor(new Color(64,73,85));g.fillRoundRect(-30,-101,65,49,5,5);
                    g.setColor(new Color(235,221,178));g.setFont(new Font(Font.MONOSPACED,Font.BOLD,15));
                    g.drawString("SALT",-26,-68);
                }
                default -> {return;}
            }
            g.setColor(new Color(10,14,17,190));g.setFont(new Font(Font.MONOSPACED,Font.BOLD,11));
            g.drawString(kind.replace('_',' '),-65,37);
            g.drawString("TIER "+tier,-65,52);
        }finally{g.dispose();}
    }
    private static void body(Graphics2D g,int x,int y,int w,int h,int color){
        g.setColor(new Color(0x0e1116));g.fillRoundRect(x-4,y-4,w+8,h+9,14,14);
        g.setColor(new Color(color));g.fillRoundRect(x,y,w,h,9,9);
        g.setColor(new Color(166,170,159));g.drawLine(x+8,y+6,x+w-13,y+6);
    }
}
