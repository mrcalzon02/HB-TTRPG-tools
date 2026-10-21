package org.beckenburg;

import java.awt.*;
import java.awt.image.BufferedImage;

/** Illustrated, flip-through Ghost Archive inside the existing casebook. */
public final class GhostArchiveScreen {
    private GhostArchiveScreen(){}
    private static final Color GOLD=new Color(238,212,159);
    private static final Color PAPER=new Color(208,212,207);
    private static final Color MUTED=new Color(157,182,190);

    public static void draw(Graphics2D g,int left,int top,int width,int height,int cursor){
        GhostIdentity.Type[] roster=GhostIdentity.Type.values();
        GhostArchive.Entry entry=GhostArchive.entry(roster[Math.floorMod(cursor,roster.length)]);
        int pictureX=left+13,pictureY=top+50;
        int pictureW=Math.min(176,Math.max(95,width/4)),pictureH=Math.max(85,height-103);
        g.setColor(new Color(22,24,32));g.fillRoundRect(pictureX,pictureY,pictureW,pictureH,5,5);
        BufferedImage portrait=entry.portrait();
        double scale=Math.min((pictureW-10.0)/portrait.getWidth(),(pictureH-10.0)/portrait.getHeight());
        int pw=(int)Math.round(portrait.getWidth()*scale),ph=(int)Math.round(portrait.getHeight()*scale);
        Object previous=g.getRenderingHint(RenderingHints.KEY_INTERPOLATION);
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
        g.drawImage(portrait,pictureX+(pictureW-pw)/2,pictureY+(pictureH-ph)/2,pw,ph,null);
        if(previous!=null)g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,previous);
        g.setColor(MUTED);g.drawRoundRect(pictureX,pictureY,pictureW,pictureH,5,5);
        int textX=pictureX+pictureW+13;
        int maxWidth=Math.max(90,left+width-textX-10);
        int y=top+57,limit=top+height-51;
        g.setColor(GOLD);g.setFont(new Font(Font.MONOSPACED,Font.BOLD,13));
        y=paragraph(g,entry.type().name().replace('_',' '),textX,y,maxWidth,15,limit);
        g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,11));g.setColor(MUTED);
        String category=entry.type().elder()?"ELDER":entry.type().ancient()?"ANCIENT":"ORIGINAL";
        y=paragraph(g,category+" / "+entry.rite(),textX,y+3,maxWidth,13,limit)+6;
        g.setColor(PAPER);
        y=paragraph(g,entry.description(),textX,y,maxWidth,14,Math.min(limit,top+height/2+14))+7;
        g.setColor(GOLD);
        y=paragraph(g,"EVIDENCE (MEDIUM):",textX,y,maxWidth,13,limit);
        g.setColor(PAPER);
        y=paragraph(g,entry.signature().toString(),textX,y,maxWidth,13,limit)+6;
        g.setColor(GOLD);
        y=paragraph(g,"BEHAVIOR:",textX,y,maxWidth,13,limit);
        g.setColor(PAPER);
        y=paragraph(g,entry.behavior(),textX,y,maxWidth,13,limit)+4;
        g.setColor(MUTED);
        paragraph(g,entry.movement(),textX,y,maxWidth,13,limit);
        g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,11));g.setColor(MUTED);
        g.drawString("POSSIBLE CLUES - NEVER VERIFIED BY THIS PAGE",left+13,top+height-40);
        g.setColor(GOLD);
        g.drawString("< PREV",left+13,top+height-19);
        String next="NEXT >";
        g.drawString(next,left+width-13-g.getFontMetrics().stringWidth(next),top+height-19);
        String pages=(Math.floorMod(cursor,roster.length)+1)+" / "+roster.length;
        g.drawString(pages,left+width/2-g.getFontMetrics().stringWidth(pages)/2,top+height-19);
    }
    private static int paragraph(Graphics2D g,String text,int x,int y,int width,int step,int limit){
        StringBuilder line=new StringBuilder();
        for(String word:text.split("\\s+")){
            String candidate=line.length()==0?word:line+" "+word;
            if(line.length()>0&&g.getFontMetrics().stringWidth(candidate)>width){
                if(y+step>limit)return y;
                g.drawString(line.toString(),x,y);y+=step;line.setLength(0);
            }
            if(line.length()>0)line.append(' ');
            line.append(word);
        }
        if(line.length()>0&&y+step<=limit){g.drawString(line.toString(),x,y);y+=step;}
        return y;
    }
    /** The same button rectangles drive clicking in both HUD and tests. */
    public static int pageDirection(int x,int y,int left,int top,int width,int height){
        if(y<top+height-36||y>=top+height)return 0;
        if(x>=left&&x<left+width/3)return -1;
        if(x>left+width*2/3&&x<=left+width)return 1;
        return 0;
    }
}
