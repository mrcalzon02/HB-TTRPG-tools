package org.beckenburg;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;

/** All specifically selected owner-provided source meshes must really rasterize. */
public final class ImportedEquipmentModelsTest {
    static void ok(boolean value,String message){if(!value)throw new AssertionError(message);}
    public static void main(String[] args){
        String[] names={"vape_mp_1","dosimeter_1","dosimeter_2","dosimeter_4",
            "walkie_talkie_1","walkie_talkie_2","handheld_tablet_1",
            "monitoring_screen_mp_1","pc_mp_1","button_12",
            "book_mp_1","open_book_mp_1"};
        for(String name:names){
            GlbProps.Model mesh=GlbProps.model(name);
            ok(mesh.triangles().size()>5,"actual model contains usable geometry: "+name);
            int unique=0;
            for(var tri:mesh.triangles()){
                ok(tri.material()>=GlbProps.TEXTURE_BASE,
                    "licensed source texture is bound for "+name);
                if(unique++<3){
                    var pt=tri.a();
                    GlbProps.sample(tri.material(),pt.u(),pt.v());
                }
            }
        }
        for(EquipmentTiers.Tier tier:EquipmentTiers.Tier.values()){
            String source=HeldInstrumentMesh.source("EMF",tier);
            ok(source.equals(switch(tier){
                case I->"dosimeter_1";case II->"dosimeter_2";case III->"dosimeter_4";
            }),"all EMF tiers use actual separate dosimeter meshes");
            for(String kind:new String[]{"EMF","SPIRIT_BOX","THERMOMETER","GHOST_WRITING_BOOK"}){
                BufferedImage image=HeldInstrumentMesh.image(kind,tier);
                int opaque=0;
                for(int y=0;y<image.getHeight();y+=2)
                    for(int x=0;x<image.getWidth();x+=2)
                        if((image.getRGB(x,y)>>>24)!=0)opaque++;
                ok(opaque>20,"real model produces visible pixels: "+kind+"/"+tier);
                BufferedImage shot=new BufferedImage(850,555,BufferedImage.TYPE_INT_ARGB);
                Graphics2D g=shot.createGraphics();
                HeldToolView.draw(g,850,480,kind.equals("EMF")?"EMF":kind,
                    10,true,false,"EMF 8/10",tier);
                g.dispose();
            }
        }
        ok(HeldInstrumentMesh.source("DOTS_PROJECTOR",EquipmentTiers.Tier.I)
            .equals("vape_mp_1"),"Tier I projector uses requested vape GLB");
        System.out.println("PASS: 12 imported PSX meshes, original textures and tier-dependent held models");
    }
}
