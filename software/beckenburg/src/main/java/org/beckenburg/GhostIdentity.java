package org.beckenburg;

import java.util.EnumSet;

/** First three gameplay-identifiable archetypes; no client owns their clue truth. */
public final class GhostIdentity {
    private GhostIdentity(){}
    public enum Type {
        SPIRIT(EnumSet.allOf(LanCase.Tool.class)),
        POLTERGEIST(EnumSet.of(LanCase.Tool.EMF,LanCase.Tool.THERMOMETER)),
        WRAITH(EnumSet.of(LanCase.Tool.THERMOMETER,LanCase.Tool.SPIRIT_BOX));
        private final EnumSet<LanCase.Tool> signatures;
        Type(EnumSet<LanCase.Tool> signatures){this.signatures=signatures;}
        public boolean signature(LanCase.Tool instrument){return signatures.contains(instrument);}
        public int signatureCount(){return signatures.size();}
    }
    /** Stable observable tool responses. Inconclusive at the anchor is meaningful negative evidence. */
    public static String reading(Type type,LanCase.Tool tool,boolean strong,int roomDistance,boolean ghostPresent){
        if(strong)return switch(tool){
            case EMF -> type==Type.POLTERGEIST?"EMF 5 - clustered object vibration":"EMF level 5";
            case THERMOMETER -> type==Type.WRAITH?"Cold seam along wall - 1C":
                    type==Type.POLTERGEIST?"Thermal shear - 4C":"Unnatural cold 2C";
            case SPIRIT_BOX -> type==Type.WRAITH?"Voice arrives through solid wall":"Response detected";
        };
        return switch(tool){
            case EMF -> ghostPresent?"Transient EMF 3 - not anchor evidence":"EMF baseline";
            case THERMOMETER -> roomDistance==1?"Cool air 11C":"Ambient 19C";
            case SPIRIT_BOX -> "No conclusive response";
        };
    }
}
