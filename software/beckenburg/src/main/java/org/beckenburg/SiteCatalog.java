package org.beckenburg;

import java.util.Objects;

/** A location is selectable only when its authored production geometry can be built. */
public final class SiteCatalog {
    private SiteCatalog(){}
    public enum Location {
        HOUSE("House",true), MANSION("Mansion",false), PRISON("Prison",false),
        ASYLUM("Asylum",false), SCHOOL("Ravenshade School",true), FARMHOUSE("Abandoned Farmhouse",true),
        ACADEMY("Academy",false), COLLEGE("College",false), CHURCH("Church",false);
        public final String label;
        private final boolean playable;
        Location(String label,boolean playable){this.label=label;this.playable=playable;}
        public boolean playable(){
            if(!playable)return false;
            try{return LevelPlans.build(HouseMap.Site.valueOf(name())).rooms().size()==15;}
            catch(IllegalArgumentException unavailable){return false;}
        }
        @Override public String toString(){return label+(playable()?" / PLAYABLE":" / IN PRODUCTION");}
    }
    public enum Conditions {
        STANDARD("Normal weather",1.0,1.0,true),
        BLACKOUT("Power outage",1.0,1.15,false),
        FOGBOUND("Heavy ground fog",.88,2.0,true);
        public final String label;
        private final double light,fog;
        private final boolean powered;
        Conditions(String label,double light,double fog,boolean powered){
            this.label=label;this.light=light;this.fog=fog;this.powered=powered;
        }
        public double lightMultiplier(){return light;}
        public double fogMultiplier(){return fog;}
        public boolean initiallyPowered(){return powered;}
        @Override public String toString(){return label;}
    }
    public static void requirePlayable(Location chosen){
        if(!Objects.requireNonNull(chosen).playable())
            throw new IllegalArgumentException(chosen.label+" has no shipped level geometry");
    }
    public static HouseMap.Site mapFor(Location chosen){
        requirePlayable(chosen);
        return HouseMap.Site.valueOf(chosen.name());
    }
}
