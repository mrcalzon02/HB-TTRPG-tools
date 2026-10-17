package org.beckenburg;

public final class SiteSelectionTest {
    private static void ok(boolean b,String reason){if(!b)throw new AssertionError(reason);}
    public static void main(String[] args){
        ok(SiteCatalog.Location.values().length==9,"nine planned location families");
        int ready=0;
        for(var loc:SiteCatalog.Location.values()){
            if(loc.playable()){ready++;SiteCatalog.requirePlayable(loc);}else{
                try{SiteCatalog.requirePlayable(loc);throw new AssertionError("unbuilt map treated as playable");}
                catch(IllegalArgumentException expected){}
            }
        }
        ok(ready==1,"only actual built house is selectable");
        ok(!SiteCatalog.Conditions.BLACKOUT.initiallyPowered(),"power outage actually begins unpowered");
        ok(SiteCatalog.Conditions.FOGBOUND.fogMultiplier()>SiteCatalog.Conditions.STANDARD.fogMultiplier(),"fog changes rendering parameters");
        System.out.println("PASS: location readiness and playable environmental variations");
    }
}