package org.beckenburg;

import java.util.Locale;

/**
 * Reusable room sound identities. Room names choose an appropriate environment;
 * existing authored finish/acoustic materials set the fallback. Never reads ghost
 * type, evidence, or the random mission assignment.
 */
public final class RoomAcousticPresets {
    private RoomAcousticPresets(){}
    public enum Type {
        SOFT_BEDROOM(.50,.010,39,.28,0,0),
        TIMBER_LIVING(.84,.014,33,.52,64,0),
        KITCHEN(.95,.045,22,.54,120,.25),
        WET_TILE(1.10,.020,29,.62,94,.75),
        CORRIDOR(1.10,.025,31,.75,72,0),
        STONE_HALL(1.22,.014,35,.85,58,.16),
        CLASSROOM(.92,.027,27,.48,105,0),
        LIBRARY(.58,.012,42,.28,44,0),
        MEDICAL_WARD(.92,.050,24,.54,173,.12),
        MECHANICAL(.98,.100,17,.95,70,.40),
        CELLAR(.92,.022,38,.78,52,.65),
        GENERIC(.83,.017,36,.50,65,.12),
        OUTDOOR(0,0,45,0,0,0);
        public final double gain,powerGain,period,transientGain,frequency,drip;
        Type(double gain,double powerGain,double period,double transientGain,
             double frequency,double drip){
            this.gain=gain;this.powerGain=powerGain;this.period=period;
            this.transientGain=transientGain;this.frequency=frequency;this.drip=drip;
        }
    }
    /** Explicit authoring overrides; all other rooms reuse name/material profiles.
     * New site writers can add an entry without building another audio engine. */
    private static final java.util.Map<String,Type> AUTHORED=java.util.Map.ofEntries(
        java.util.Map.entry("house:2",Type.KITCHEN),
        java.util.Map.entry("house:4",Type.CORRIDOR),
        java.util.Map.entry("house:6",Type.SOFT_BEDROOM),
        java.util.Map.entry("house:8",Type.WET_TILE),
        java.util.Map.entry("house:10",Type.MECHANICAL),
        java.util.Map.entry("house:11",Type.CELLAR),
        java.util.Map.entry("mansion:4",Type.STONE_HALL),
        java.util.Map.entry("mansion:11",Type.CELLAR),
        java.util.Map.entry("prison:0",Type.STONE_HALL),
        java.util.Map.entry("prison:11",Type.MECHANICAL),
        java.util.Map.entry("asylum:6",Type.WET_TILE),
        java.util.Map.entry("asylum:11",Type.MECHANICAL),
        java.util.Map.entry("academy:0",Type.STONE_HALL),
        java.util.Map.entry("academy:11",Type.CELLAR),
        java.util.Map.entry("college:0",Type.CORRIDOR),
        java.util.Map.entry("college:11",Type.MECHANICAL)
    );
    public static Type forRoom(LevelDefinition level,int room){
        if(level==null||room<0||room>=level.rooms().size())
            throw new IllegalArgumentException("invalid authored room");
        LevelDefinition.Room entry=level.room(room);
        if(entry.outside())return Type.OUTDOOR;
        Type authored=AUTHORED.get(level.id().toLowerCase(Locale.ROOT)+":"+room);
        if(authored!=null)return authored;
        String name=entry.name().toLowerCase(Locale.ROOT);
        String acoustic=entry.acoustic().toLowerCase(Locale.ROOT);
        if(name.matches(".*(boiler|generator|maintenance|power|machine|breaker).*"))
            return Type.MECHANICAL;
        if(name.matches(".*(cellar|basement|wine|tunnel|storage|attic).*"))
            return Type.CELLAR;
        if(name.matches(".*(bath|wash|hydrotherapy|shower|toilet|scullery).*"))
            return Type.WET_TILE;
        if(name.matches(".*(kitchen|cafe|canteen|mess|dining).*"))
            return Type.KITCHEN;
        if(name.matches(".*(library|archive|reading|records|stacks).*"))
            return Type.LIBRARY;
        if(name.matches(".*(bedroom|dormitory|suite|seclusion|isolation).*"))
            return Type.SOFT_BEDROOM;
        if(name.matches(".*(ward|infirmary|treatment|theatre|patient|clinic).*"))
            return Type.MEDICAL_WARD;
        if(name.matches(".*(classroom|lecture|study|seminar|tutorial).*"))
            return Type.CLASSROOM;
        if(name.matches(".*(corridor|hall|gallery|passage|stair|landing|concourse|cloister).*"))
            return acoustic.contains("stone")||acoustic.contains("brick")
                ?Type.STONE_HALL:Type.CORRIDOR;
        if(name.matches(".*(chapel|church|sanctuary|ballroom|nave).*"))
            return Type.STONE_HALL;
        if(name.matches(".*(living|drawing|parlor|lounge|day room|morning).*"))
            return Type.TIMBER_LIVING;
        if(acoustic.contains("carpet")||acoustic.contains("soft"))return Type.SOFT_BEDROOM;
        if(acoustic.contains("tile"))return Type.WET_TILE;
        if(acoustic.contains("stone")||acoustic.contains("brick"))return Type.STONE_HALL;
        if(acoustic.contains("timber")||acoustic.contains("parquet")
                ||acoustic.contains("wood"))return Type.TIMBER_LIVING;
        if(level.id().matches(".*(prison|asylum|hospital).*"))return Type.MEDICAL_WARD;
        return Type.GENERIC;
    }
    /** Reusable continuous environmental room-noise floor, not a detection event. */
    public static int noiseFloor(LevelDefinition level,int room,boolean powered){
        Type type=forRoom(level,room);
        if(type==Type.OUTDOOR)return 0;
        return Math.max(0,Math.min(5,(int)Math.round(
            type.transientGain*1.6+(powered?type.powerGain*18:0))));
    }
    /** Source-level gain, never a supernatural signature. */
    public static int microphoneLevel(LevelDefinition level,int room,int raw){
        if(raw<1||raw>10)throw new IllegalArgumentException("invalid source gain");
        Type type=forRoom(level,room);
        return Math.max(1,Math.min(10,(int)Math.round(raw*type.gain)));
    }
}
