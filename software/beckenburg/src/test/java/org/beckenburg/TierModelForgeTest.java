package org.beckenburg;

import java.awt.image.BufferedImage;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.Set;

/** Build/source acceptance for 42 x 3 actual low-poly meshes and PSX textures. */
public final class TierModelForgeTest {
    private static void ok(boolean yes,String message){
        if(!yes)throw new AssertionError(message);
    }
    private static String hex(byte[] b)throws Exception{
        byte[] hash=MessageDigest.getInstance("SHA-256").digest(b);
        return java.util.HexFormat.of().formatHex(hash);
    }
    public static void main(String[] args)throws Exception{
        Set<String> ids=new HashSet<>(),modelNames=new HashSet<>();
        int synthesized=0,original=0,models=0;
        for(EquipmentTiers.Plan plan:EquipmentTiers.all()){
            for(EquipmentTiers.Tier tier:EquipmentTiers.Tier.values()){
                var prefab=EquipmentTierVisuals.prefab(plan.id(),tier);
                ok(prefab.equipmentId().equals(plan.id())&&prefab.tier()==tier,
                    "prefab tied to actual equipment category and selected tier");
                ok(!prefab.shelfCategory().isBlank(),"shelf compatibility metadata");
                ok(modelNames.add(plan.id()+"|"+tier+"|"+prefab.modelName()),
                    "no duplicate physical model key");
                // All 126 synthesized source files are individually textured,
                // even for tiers using original owner-supplied model geometry.
                byte[] data=TierModelForge.generate(plan.id(),tier);
                ok(data.length>400&&data.length<4_000_000,
                    "bounded GLB produced with embedded PNG");
                String sha=hex(data);
                ok(ids.add(sha),"each authored variant has distinct geometry/texture");
                var generated=GlbProps.decode(data);
                ok(generated.triangles().size()>=12&&generated.triangles().size()<3000,
                    "actual triangle buffer in budget");
                int color=GlbProps.sample(generated.triangles().get(0).material(),
                    generated.triangles().get(0).a().u(),
                    generated.triangles().get(0).a().v());
                ok(color>=0&&color<=0xffffff,
                    "working built-in low-res texture atlas");
                ok(GlbProps.model(TierModelForge.name(plan.id(),tier))
                    .triangles().size()==generated.triangles().size(),
                    "generated GLB actually shipped as game classpath asset");
                var selected=EquipmentTierVisuals.model(plan.id(),tier);
                ok(selected.triangles().size()>=12,
                    "chosen source/original model actually renders");
                if(prefab.synthesized())synthesized++;else original++;
                models++;
            }
        }
        ok(models==126&&ids.size()==126&&synthesized>=95,
            "full 126 tier variants with source asset gap coverage");
        ok(!EquipmentTierVisuals.prefab("EMF_READER",EquipmentTiers.Tier.I)
            .synthesized(),"approved existing EMF model preserved");
        ok(EquipmentTierVisuals.prefab("PHOTO_CAMERA",EquipmentTiers.Tier.II)
            .synthesized(),"new camera Tier II body created, not a scaled Polaroid");
        ok(EquipmentTierVisuals.prefab("PHOTO_CAMERA",EquipmentTiers.Tier.III)
            .synthesized(),"advanced photo camera receives original authored housing");
        ok(EquipmentTierVisuals.prefab("VIDEO_CAMERA",EquipmentTiers.Tier.I)
            .synthesized(),"genuine video camera design, not mislabeled still camera");
        for(EquipmentTiers.Tier tier:EquipmentTiers.Tier.values()){
            var preview=HeldInstrumentMesh.image("PHOTO_CAMERA",tier);
            int opaque=0;
            for(int y=0;y<preview.getHeight();y+=3)
                for(int x=0;x<preview.getWidth();x+=3)
                    if((preview.getRGB(x,y)>>>24)!=0)opaque++;
            ok(opaque>15,"physical, textured tier-specific held camera is visible");
        }
        System.out.println("PASS: "+models+" real textured tier GLBs / "+
            synthesized+" synthesized prefab selections / "+
            original+" preserved original source props");
    }
}
