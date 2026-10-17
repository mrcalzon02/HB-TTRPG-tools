package org.beckenburg;

import java.util.Objects;

/** Exactly one authored navigable level is currently present; never substitute its geometry for locked sites. */
public final class SiteCatalog {
    private SiteCatalog(){}
    public enum Location {
        HOUSE("House",true), MANSION("Mansion",false), PRISON("Prison",false),
        ASYLUM("Asylum",false), SCHOOL("School",false), FARMHOUSE("Farmhouse",false),
        ACADEMY("Academy",false), COLLEGE("College",false), CHURCH("Church",false);
        public final String label;
        private final boolean playable;
        Location(String label,boolean playable){this.label=label;this.playable=playable;}
        public boolean playable(){return playable;}
        @Override public String toString(){return label+(playable?" / PLAYABLE":" / IN PRODUCTION");}
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
        if(!Objects.requireNonNull(chosen).playable())throw new IllegalArgumentException(chosen.label+" has no shipped level geometry");
    }
}