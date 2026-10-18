package org.beckenburg;

import java.util.HashSet;
import java.util.Set;

/** Source-to-runtime acceptance: five exact purchased models load as textures + triangles. */
public final class GlbPropsTest {
    private GlbPropsTest() { }
    public static void main(String[] args) {
        String[] names={"light_switch_1","ceiling_lamp_1_off","door_1_loose",
                        "shelf_mp_6","chair_mp_5","ceiling_lamp_1_on","cross_mp_2","flashlight_mp_1"};
        int[] counts={38,1132,712,46,576,1132,92,284};
        for(int i=0;i<names.length;i++){
            GlbProps.Model model=GlbProps.model(names[i]);
            assert model==GlbProps.model(names[i]):"Cache should not reparses models";
            assert model.triangles().size()==counts[i]:
                "Unexpected source triangle count for "+names[i];
            Set<Integer> colors=new HashSet<>();
            for(GlbProps.Triangle tri:model.triangles()){
                assert tri.material()>=GlbProps.TEXTURE_BASE;
                for(GlbProps.Vertex v:new GlbProps.Vertex[]{tri.a(),tri.b(),tri.c()}){
                    assert Double.isFinite(v.x())&&Double.isFinite(v.y())&&
                           Double.isFinite(v.z())&&Double.isFinite(v.u())&&
                           Double.isFinite(v.v());
                    colors.add(GlbProps.sample(tri.material(),v.u(),v.v()));
                }
            }
            assert colors.size()>3:"Source albedo not decoded for "+names[i];
        }
        try {
            GlbProps.model("not_in_the_owner_library");
            throw new AssertionError("Unapproved model must be rejected");
        }catch(IllegalArgumentException expected){/* strict allowlist */}
        try {
            GlbProps.decode(new byte[]{0,0,0});
            throw new AssertionError("Invalid GLB must not render");
        }catch(java.io.IOException expected){/* rejects invalid binary */}
        System.out.println("Eight real Beckenburg GLB meshes, UVs and PNG materials validated");
    }
}
