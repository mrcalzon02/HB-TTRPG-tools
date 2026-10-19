package org.beckenburg;

/** Only maps with real navigation and render registries may be offered to solo players. */
public final class SiteSelectionTest {
    private static void ok(boolean b,String why){if(!b)throw new AssertionError(why);}
    public static void main(String[] args){
        ok(SiteCatalog.Location.values().length==9,"all planned location families remain indexed");
        int ready=0;
        for(SiteCatalog.Location location:SiteCatalog.Location.values()){
            if(location.playable()){
                ready++;SiteCatalog.requirePlayable(location);
                HouseMap map=new HouseMap(SiteCatalog.mapFor(location));
                ok(map.valid()&&RitualSites.valid(map),"playable authored site "+location);
                ok(map.van().placement()!=null,"authentic van staging "+location);
                var solo=new InvestigationSession(map,InvestigationSession.Role.OBSERVER,101);
                SceneRenderer renderer=new SceneRenderer();
                renderer.draw(map,solo,0);
                ok(java.util.Arrays.stream(renderer.pixels()).distinct().count()>20,
                    "shipped source models and walls render for "+location);
            }else{
                try{SiteCatalog.requirePlayable(location);
                    throw new AssertionError("unbuilt level claimed playable");}
                catch(IllegalArgumentException expected){}
            }
        }
        ok(ready==3,"house, farmhouse and Ravenshade school are now selectable");
        ok(!SiteCatalog.Conditions.BLACKOUT.initiallyPowered(),"blackout starts powerless");
        ok(SiteCatalog.Conditions.FOGBOUND.fogMultiplier()>SiteCatalog.Conditions.STANDARD.fogMultiplier(),
            "weather modifies 3D environment");
        System.out.println("PASS: three playable investigations with headless rendering");
    }
}
