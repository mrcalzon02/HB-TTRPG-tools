package org.beckenburg;

import java.awt.*;
import java.awt.image.BufferedImage;

/** Game-facing contracts caught by the first external Windows test build. */
public final class VanNavigationVisualTest {
    static void yes(boolean ok,String label){if(!ok)throw new AssertionError(label);}
    public static void main(String[] args){
        HouseMap map=new HouseMap();VanStaging van=map.van();
        var spawn=van.spawn();var front=van.world(0,VanStaging.FRONT-.56);
        yes(map.traversable(spawn.x(),spawn.z()),"van center accessible");
        yes(map.traversable(front.x(),front.z()),"van open entrance not pointing into a solid wall");
        yes(front.x()<spawn.x()-1.9,"exit faces unobstructed west staging area");
        for(int i=1;i<=8;i++){
            var step=van.world(0,VanStaging.FRONT-.56-i*.19);
            yes(map.traversable(step.x(),step.z()),"clear exit lane step "+i);
        }
        LanWorld team=new LanWorld(map);
        for(int i=0;i<6;i++)yes(map.traversable(team.body(i).x(),team.body(i).z()),
            "team spawn accessible "+i);
        double midX=spawn.x(),midZ=spawn.z();
        var targeted=VanEquipmentRack.socket(van,EquipmentLoadout.Item.EMF);
        double yaw=Math.atan2(targeted.x()-midX,targeted.z()-midZ);
        yes(VanEquipmentRack.aimed(van,midX,midZ,yaw)==EquipmentLoadout.Item.EMF,
            "rack item selected by line of sight");
        yes(VanEquipmentRack.aimed(van,midX,midZ,yaw+Math.PI)==null,
            "rack cannot be operated while facing away");
        EquipmentLoadout kit=new EquipmentLoadout();kit.select(2);
        kit.pickup(EquipmentLoadout.Item.UV_LAMP);
        yes(kit.equipped()==EquipmentLoadout.Item.UV_LAMP,"pickup replaces held hotbar slot");
        kit.pickup(EquipmentLoadout.Item.EMF);
        yes(kit.activeSlot()==0,"existing item becomes selected rather than duplicated");
        BufferedImage canvas=new BufferedImage(860,520,BufferedImage.TYPE_INT_RGB);
        Graphics2D g=canvas.createGraphics();
        g.setColor(Color.BLACK);g.fillRect(0,0,860,520);
        HeldToolView.draw(g,860,440,"EMF",12,false);g.dispose();
        int changed=0;for(int y=240;y<440;y++)for(int x=610;x<855;x++)
            if((canvas.getRGB(x,y)&0xffffff)!=0)changed++;
        yes(changed>1500,"hand and EMF are actually drawn on the camera foreground");
        yes(map.valid(),"gameplay door topology preserved");
        System.out.println("PASS van exit lane, 6 seats, physical aim/pickup and visible held tool");
    }
}