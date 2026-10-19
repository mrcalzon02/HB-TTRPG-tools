package org.beckenburg;

import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;

/** Compact HUD meter, showing authoritative stamina and whether it is draining. */
public final class SprintHud {
    private SprintHud(){}
    public static void draw(Graphics2D g,int x,int y,int width,String name,
                            int remaining,int maximum,boolean spending){
        if(g==null||width<80||maximum<0||remaining<0||remaining>maximum)
            throw new IllegalArgumentException("invalid stamina hud");
        float share=maximum==0?0:remaining/(float)maximum;
        String status=maximum==0?"OFF":spending?"DRAINING":
            remaining>=maximum?"READY":"RECHARGING";
        g.setFont(new Font(Font.MONOSPACED,Font.BOLD,11));
        g.setColor(new Color(10,17,24,221));
        g.fillRoundRect(x,y,width,39,6,6);
        g.setColor(new Color(226,225,212));
        g.drawString(name+"  "+(remaining/10.0)+"s / "+(maximum/10.0)+"s  "+status,
            x+8,y+15);
        g.setColor(new Color(51,62,72));
        g.fillRoundRect(x+8,y+23,width-16,8,3,3);
        if(share>0){
            g.setColor(spending?new Color(232,168,94):new Color(111,194,172));
            g.fillRoundRect(x+8,y+23,Math.max(2,Math.round((width-16)*share)),8,3,3);
        }
    }
}
