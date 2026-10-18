package org.beckenburg;
/** Validated, host-selected difficulty for playable controls; unsupported modifiers are not exposed. */
public record CustomContract(int hunters,int playerSpeed,int sprintSpeed,int ghostSpeed,
        int energyRecovery,int sanityDrain,int startingSanity,int eventFrequency,
        Sprint sprint,int hidingSpots,boolean sanityMonitor,boolean activityMonitor){
    public enum Sprint { DISABLED, LIMITED, UNLIMITED }
    public CustomContract{
        if(hunters<1||hunters>6||playerSpeed<50||playerSpeed>150||
            sprintSpeed<100||sprintSpeed>200||ghostSpeed<50||ghostSpeed>150||
            energyRecovery<50||energyRecovery>200||sanityDrain<0||sanityDrain>200||
            startingSanity<0||startingSanity>100||eventFrequency<50||eventFrequency>200||
            sprint==null||hidingSpots<0||hidingSpots>100)
            throw new IllegalArgumentException("custom setting out of range");
    }
    public static CustomContract standard(int hunters){
        return new CustomContract(hunters,100,150,100,100,100,100,100,Sprint.LIMITED,70,true,true);
    }
    /** Non-negotiable +1 per player, therefore +6 for a full six-hunter team. */
    public int partyDifficulty(){return hunters;}
    public double walkingSpeed(double base){return base*playerSpeed/100.0;}
    public double runningSpeed(double base){return base*playerSpeed/100.0*sprintSpeed/100.0;}
}