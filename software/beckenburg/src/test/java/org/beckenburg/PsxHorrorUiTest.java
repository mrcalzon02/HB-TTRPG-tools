package org.beckenburg;
import javax.swing.*;
import java.awt.*;
import java.awt.image.BufferedImage;
/** Headless proof that original archive artwork decodes and paints inside Java Swing. */
public final class PsxHorrorUiTest{
 public static void main(String[] args){
  if(PsxHorrorUi.imageCount()<60)throw new AssertionError("Image catalog incomplete: "+PsxHorrorUi.imageCount());
  BufferedImage canvas=new BufferedImage(900,600,BufferedImage.TYPE_INT_ARGB);
  Graphics2D g=canvas.createGraphics();
  for(int scale:new int[]{1,2,3}){
   PsxHorrorUi.paintPatch(g,"window",30,30,600,400,scale);
   PsxHorrorUi.paintPatch(g,"button_normal",20,450,340,48,scale);
   PsxHorrorUi.paintPatch(g,"panel",380,440,300,130,scale);
   PsxHorrorUi.paintPatch(g,"tab_selected",20,510,160,38,scale);
  }
  g.dispose();
  if((canvas.getRGB(35,35)>>>24)==0)throw new AssertionError("Window not painted");
  JButton b=PsxHorrorUi.button("READY");b.setSize(200,44);b.doLayout();
  BufferedImage surface=new BufferedImage(200,44,BufferedImage.TYPE_INT_ARGB);
  b.paint(surface.getGraphics());
  if((surface.getRGB(5,5)>>>24)==0)throw new AssertionError("Button not painted");
  JTextField field=new JTextField("demo");PsxHorrorUi.styleTextField(field);
  JTabbedPane tabs=new JTabbedPane();tabs.addTab("Lobby",new JPanel());PsxHorrorUi.styleTabs(tabs);
  System.out.println("PASS PSX Horror UI / "+PsxHorrorUi.imageCount()+" images / 3 scales / Swing controls");
 }
}
