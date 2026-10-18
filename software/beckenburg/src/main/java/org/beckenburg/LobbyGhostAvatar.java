package org.beckenburg;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.util.Objects;
import java.util.random.RandomGenerator;
import javax.swing.JPanel;

/**
 * Purely cosmetic lobby disguise. It uses only the approved Banshee turnaround artwork;
 * palette and facing are randomized independently of the host's secret archetype.
 * An avatar packet MUST NEVER encode GhostIdentity.Type, behavior, evidence or rite.
 */
public final class LobbyGhostAvatar {
    private LobbyGhostAvatar(){}
    private static final int[] FACINGS={0,2,6};
    private static final Color[] TINTS={
        new Color(115,187,224,105), new Color(169,116,218,105),
        new Color(119,218,175,105), new Color(216,170,118,105),
        new Color(211,122,147,105)
    };
    public record Look(int facing,int palette){
        public Look {
            if(facing!=0&&facing!=2&&facing!=6)
                throw new IllegalArgumentException("unsupported cosmetic facing");
            if(palette<0||palette>=TINTS.length)
                throw new IllegalArgumentException("unsupported cosmetic palette");
        }
        public String frame(){return "LOBBYAVATAR|"+facing+"|"+palette;}
        public static Look decode(String frame){
            var p=LanProtocol.parts(frame);
            if(p.size()!=3||!p.get(0).equals("LOBBYAVATAR"))
                throw new IllegalArgumentException("invalid lobby appearance packet");
            return new Look(LanProtocol.integer(p.get(1),0,7),
                LanProtocol.integer(p.get(2),0,TINTS.length-1));
        }
    }
    public static Look random(RandomGenerator rng){
        Objects.requireNonNull(rng);
        return new Look(FACINGS[rng.nextInt(FACINGS.length)],rng.nextInt(TINTS.length));
    }

    /** A small native Swing panel: source art is packaged inside the shipped game JAR. */
    public static final class Preview extends JPanel {
        private Look look=random(java.util.concurrent.ThreadLocalRandom.current());
        private boolean ghost,connected;
        public Preview(){
            setPreferredSize(new Dimension(186,280));
            setMinimumSize(new Dimension(158,230));
            setBackground(new Color(19,21,28));
        }
        public void showHunter(){ghost=false;connected=false;repaint();}
        public void showGhost(Look value,boolean isConnected){
            look=Objects.requireNonNull(value);ghost=true;connected=isConnected;repaint();
        }
        public boolean showingGhost(){return ghost;}
        public Look displayedLook(){return look;}
        @Override protected void paintComponent(Graphics graphics){
            super.paintComponent(graphics);
            Graphics2D g=(Graphics2D)graphics.create();
            try{
                int w=getWidth(),h=getHeight();
                g.setColor(new Color(24,29,39));
                g.fillRoundRect(8,8,w-16,h-16,8,8);
                g.setColor(new Color(101,110,128));
                g.drawRoundRect(8,8,w-16,h-16,8,8);
                g.setFont(new Font(Font.MONOSPACED,Font.BOLD,12));
                g.setColor(new Color(226,210,175));
                g.drawString(ghost?"GHOST PLAYER":"HUNTER PLAYER",18,29);

                BufferedImage sprite=DirectionalSprites.frame(ghost?"banshee":"observer",
                    ghost?look.facing():0);
                int availableW=Math.max(28,w-38),availableH=Math.max(45,h-99);
                double scale=Math.min(availableW/(double)sprite.getWidth(),
                    availableH/(double)sprite.getHeight());
                int sw=Math.max(1,(int)(sprite.getWidth()*scale)),
                    sh=Math.max(1,(int)(sprite.getHeight()*scale));
                int left=(w-sw)/2,top=43+(availableH-sh)/2;
                g.drawImage(sprite,left,top,sw,sh,null);
                if(ghost){
                    g.setComposite(AlphaComposite.SrcAtop);
                    g.setColor(TINTS[look.palette()]);
                    g.fillRect(left,top,sw,sh);
                    g.setComposite(AlphaComposite.SrcOver);
                }
                g.setColor(new Color(176,189,206));
                g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,10));
                g.drawString(ghost?"IDENTITY: UNKNOWN":"INVESTIGATOR",18,h-43);
                g.drawString(ghost?(connected?"LOBBY DISGUISE":"RANDOM PREVIEW"):"HUNTER ROLE",
                    18,h-25);
            }finally{g.dispose();}
        }
    }
}
