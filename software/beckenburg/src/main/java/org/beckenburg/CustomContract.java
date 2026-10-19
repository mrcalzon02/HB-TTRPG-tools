package org.beckenburg;
/** Validated, host-selected difficulty for playable controls; unsupported modifiers are not exposed. */
public record CustomContract(int hunters,int playerSpeed,int sprintSpeed,int ghostSpeed,
        int energyRecovery,int sanityDrain,int startingSanity,int eventFrequency,
        Sprint sprint,int hidingSpots,boolean sanityMonitor,boolean activityMonitor,
        MissionWeather.Mode weatherMode,EvidenceSignals.Weather fixedWeather,int weatherIntensity){
    public enum Sprint { DISABLED, LIMITED, UNLIMITED }
    public CustomContract{
        if(hunters<1||hunters>6||playerSpeed<50||playerSpeed>150||
            sprintSpeed<100||sprintSpeed>200||ghostSpeed<50||ghostSpeed>150||
            energyRecovery<50||energyRecovery>200||sanityDrain<0||sanityDrain>200||
            startingSanity<0||startingSanity>100||eventFrequency<50||eventFrequency>200||
            sprint==null||hidingSpots<0||hidingSpots>100||weatherMode==null||
            fixedWeather==null||weatherIntensity<1||weatherIntensity>3)
            throw new IllegalArgumentException("custom setting out of range");
    }
    /** Existing constructor remains source-compatible for older tests and LAN hosts. */
    public CustomContract(int hunters,int playerSpeed,int sprintSpeed,int ghostSpeed,
            int energyRecovery,int sanityDrain,int startingSanity,int eventFrequency,
            Sprint sprint,int hidingSpots,boolean sanityMonitor,boolean activityMonitor){
        this(hunters,playerSpeed,sprintSpeed,ghostSpeed,energyRecovery,sanityDrain,
            startingSanity,eventFrequency,sprint,hidingSpots,sanityMonitor,activityMonitor,
            MissionWeather.Mode.FIXED,EvidenceSignals.Weather.CLEAR,1);
    }
    public static CustomContract standard(int hunters){
        return new CustomContract(hunters,100,150,100,100,100,100,100,Sprint.LIMITED,70,true,true);
    }
    /** Non-negotiable +1 per player, therefore +6 for a full six-hunter team. */
    public int partyDifficulty(){return hunters;}
    public double walkingSpeed(double base){return base*playerSpeed/100.0;}
    public double runningSpeed(double base){return base*playerSpeed/100.0*sprintSpeed/100.0;}
}