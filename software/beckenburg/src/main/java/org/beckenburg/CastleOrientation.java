package org.beckenburg;

/** Nonviolent, in-castle first-contact training. No synthetic evidence or rewards. */
public final class CastleOrientation {
    private static final String[] OBJECTIVES={
        "Inspect the expedition van station: look at it and press E.",
        "Find the contract board in the north great hall and press E.",
        "Find the wardrobe to the east and press E to change discipline.",
        "Inspect either equipment armory station in the west wing.",
        "Press L to operate the castle lighting controls."
    };
    private int step=-1;
    public void start(){step=0;}
    public boolean active(){return step>=0&&step<OBJECTIVES.length;}
    public boolean complete(){return step==OBJECTIVES.length;}
    public int progress(){return Math.max(0,step);}
    public String objective(){return active()?OBJECTIVES[step]:
        complete()?"Orientation complete. Campaign contracts are available at the board.":"Orientation inactive.";}
    public boolean visit(CastleHubMap.Station station){
        if(!active()||station==null)return false;
        boolean matches=switch(step){
            case 0->station==CastleHubMap.Station.EXPEDITION;
            case 1->station==CastleHubMap.Station.CONTRACT;
            case 2->station==CastleHubMap.Station.ROLE;
            case 3->station==CastleHubMap.Station.ARMORY_UV
                ||station==CastleHubMap.Station.ARMORY_SALT;
            default->false;
        };
        if(matches)step++;
        return matches;
    }
    public boolean lights(){
        if(!active()||step!=4)return false;
        step++;
        return true;
    }
}
