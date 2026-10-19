package org.beckenburg;

import javax.imageio.ImageIO;
import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.plaf.basic.BasicButtonUI;
import javax.swing.plaf.basic.BasicTabbedPaneUI;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Enumeration;

/** PSX Horror UI Free (heyheythere, CC BY 4.0) adapted to Java Swing.
 * Source: https://heyheythere.itch.io/psx-horror-ui-free
 * The original archive and its LICENSE.txt are bundled unchanged.
 * Theme uses original PNGs and nearest-neighbour nine-slice tiling, never Godot resources.
 */
public final class PsxHorrorUi {
    private static final String ARCHIVE="/org/beckenburg/psx-horror-ui-free-assets.zip";
    private static final String ROOT="psx-horror-ui-free/addons/psx_horror_ui/";
    private static final Map<String, BufferedImage> images=new HashMap<>();
    private static boolean loaded;
    private PsxHorrorUi(){}

    private static synchronized void load(){
        if(loaded)return;
        // The source ZIP uses stored directory records with data-descriptor flags.
        // java.util.zip.ZipInputStream rejects those legal central-directory records;
        // ZipFile reads the authoritative directory safely. The temporary *archive*
        // (never its loose files) is deleted immediately after decoding.
        Path temp=null;
        try(InputStream resource=PsxHorrorUi.class.getResourceAsStream(ARCHIVE)){
            if(resource==null)throw new IllegalStateException("Required PSX UI archive absent from game package");
            temp=Files.createTempFile("beckenburg-ui-", ".zip");
            Files.copy(resource,temp,java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            try(ZipFile zip=new ZipFile(temp.toFile())){
                Enumeration<? extends ZipEntry> entries=zip.entries();
                while(entries.hasMoreElements()){
                    ZipEntry entry=entries.nextElement();
                    String name=entry.getName();
                    if(name.startsWith(ROOT)&&name.endsWith(".png")){
                        try(InputStream input=zip.getInputStream(entry)){
                            BufferedImage image=ImageIO.read(input);
                            if(image==null)throw new IOException("Unreadable PNG: "+name);
                            images.put(name.substring(ROOT.length()),image);
                        }
                    }
                }
            }
        }catch(IOException ex){throw new IllegalStateException("Failed loading PSX Horror UI archive",ex);}
        finally{
            if(temp!=null)try{Files.deleteIfExists(temp);}catch(IOException ignored){temp.toFile().deleteOnExit();}
        }
        for(String required:new String[]{"themes/fog/button_normal.png","themes/fog/button_hover.png",
                "themes/fog/button_pressed.png","themes/fog/button_disabled.png", "themes/fog/panel.png",
                "themes/fog/window.png","themes/fog/tab_selected.png","themes/fog/line_edit.png",
                "icons/flashlight.png","status/ecg_steady.png"}){
            if(!images.containsKey(required))throw new IllegalStateException("PSX UI asset missing: "+required);
        }
        loaded=true;
    }
    public static BufferedImage image(String path){load();return images.get(path);}
    public static int imageCount(){load();return images.size();}
    public static JPanel surface(LayoutManager layout){return panel(layout,"window");}
    public static JPanel panel(LayoutManager layout){return panel(layout,"panel");}
    private static JPanel panel(LayoutManager layout,String part){
        return new JPanel(layout){
            @Override protected void paintComponent(Graphics g){
                super.paintComponent(g);
                if(getWidth()>0&&getHeight()>0)paintPatch((Graphics2D)g,part,
                    0,0,getWidth(),getHeight(),2);
            }
        };
    }
    public static JButton button(String label){JButton b=new JButton(label);styleButton(b);return b;}
    public static void styleButton(AbstractButton b){
        GameSfx.button(b);
        b.setUI(new BasicButtonUI(){
            @Override public void paint(Graphics g,JComponent c){
                AbstractButton button=(AbstractButton)c;
                String part=!button.isEnabled()?"button_disabled":button.getModel().isPressed()?"button_pressed":
                    button.getModel().isRollover()?"button_hover":"button_normal";
                paintPatch((Graphics2D)g,part,0,0,c.getWidth(),c.getHeight(),2);
                super.paint(g,c);
                if(button.isFocusOwner())paintPatch((Graphics2D)g,"focus",1,1,
                    Math.max(0,c.getWidth()-2),Math.max(0,c.getHeight()-2),2);
            }
        });
        b.setOpaque(false);b.setContentAreaFilled(false);b.setRolloverEnabled(true);
        b.setBorder(new EmptyBorder(7,12,7,12));b.setFocusPainted(false);
        b.setForeground(new Color(231,225,208));b.setDisabledIcon(null);
        b.setFont(new Font(Font.SANS_SERIF,Font.BOLD,Math.max(12,b.getFont().getSize())));
    }
    public static void styleTextField(JTextField input){
        input.setBackground(new Color(26,29,34));input.setForeground(new Color(237,233,221));
        input.setCaretColor(new Color(237,233,221));
        input.setBorder(BorderFactory.createCompoundBorder(new TextFieldBorder(),new EmptyBorder(4,7,4,7)));
    }
    private static final class TextFieldBorder implements javax.swing.border.Border {
        @Override public void paintBorder(Component c,Graphics g,int x,int y,int w,int h){
            paintPatch((Graphics2D)g,"line_edit",x,y,w,h,2);
        }
        @Override public Insets getBorderInsets(Component c){return new Insets(7,7,7,7);}
        @Override public boolean isBorderOpaque(){return false;}
    }
    public static void styleTabs(JTabbedPane tabs){
        GameSfx.tabs(tabs);
        tabs.setForeground(new Color(227,221,209));tabs.setBackground(new Color(31,35,43));
        tabs.setUI(new BasicTabbedPaneUI(){
            @Override protected void paintTabBackground(Graphics g,int placement,int index,int x,int y,int w,int h,boolean selected){
                paintPatch((Graphics2D)g,selected?"tab_selected":"tab_unselected",x,y,w,h,2);
            }
            @Override protected void paintTabBorder(Graphics g,int placement,int index,int x,int y,int w,int h,boolean selected){}
            @Override protected void paintFocusIndicator(Graphics g,int placement,Rectangle[] rects,int index,
                    Rectangle iconRect,Rectangle textRect,boolean selected){
                if(tabs.getSelectedIndex()==index&&tabs.isFocusOwner()){
                    paintPatch((Graphics2D)g,"focus",rects[index].x,rects[index].y,
                        rects[index].width,rects[index].height,2);
                }
            }
        });
    }

    /** Draw actual fog-theme PNG with the supplied pixel borders, tiling rather than blurring its dither.
     * The border dimensions are the original pack's themes/slices.json values.
     */
    public static void paintPatch(Graphics2D graphics,String part,int x,int y,int width,int height,int requestedScale){
        if(width<=0||height<=0)return;
        BufferedImage im=image("themes/fog/"+part+".png");
        if(im==null)throw new IllegalArgumentException("Unknown fog UI part: "+part);
        int[] border=switch(part){
            case "button_normal","button_hover","button_pressed","button_disabled"->new int[]{4,7,4,8};
            case "window"->new int[]{5,18,5,5};
            case "panel"->new int[]{5,5,5,5};
            case "focus"->new int[]{3,3,3,3};
            case "line_edit","tooltip"->new int[]{4,4,4,4};
            case "tab_selected"->new int[]{4,4,4,1};
            case "tab_unselected","tab_hover"->new int[]{4,5,4,2};
            case "slot","slot_selected","slot_equipped"->new int[]{5,18,5,19};
            case "monitor"->new int[]{4,4,4,4};
            default->throw new IllegalArgumentException("Nine-slice borders not declared for "+part);
        };
        // Keep every region positive even for tightly packed button grids.
        int scale=Math.max(1,Math.min(requestedScale,Math.min(
            width/Math.max(1,border[0]+border[2]),height/Math.max(1,border[1]+border[3]))));
        int[] sx={0,border[0],im.getWidth()-border[2],im.getWidth()};
        int[] sy={0,border[1],im.getHeight()-border[3],im.getHeight()};
        int[] dx={x,x+border[0]*scale,x+width-border[2]*scale,x+width};
        int[] dy={y,y+border[1]*scale,y+height-border[3]*scale,y+height};
        Graphics2D g=(Graphics2D)graphics.create();
        try{
            g.clipRect(x,y,width,height);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
            for(int row=0;row<3;row++)for(int col=0;col<3;col++){
                int sw=sx[col+1]-sx[col],sh=sy[row+1]-sy[row];
                int dw=dx[col+1]-dx[col],dh=dy[row+1]-dy[row];
                if(sw<=0||sh<=0||dw<=0||dh<=0)continue;
                // Source pixel texture repeats exactly; never stretch a dithered centre pixel.
                Graphics2D tile=(Graphics2D)g.create();
                try{
                    tile.clipRect(dx[col],dy[row],dw,dh);
                    for(int yy=dy[row];yy<dy[row+1];yy+=sh*scale)
                        for(int xx=dx[col];xx<dx[col+1];xx+=sw*scale)
                            tile.drawImage(im,xx,yy,xx+sw*scale,yy+sh*scale,
                                sx[col],sy[row],sx[col+1],sy[row+1],null);
                }finally{tile.dispose();}
            }
        }finally{g.dispose();}
    }
}
