package org.beckenburg;
import java.util.Objects;
/** Individual purchased consumables, bounded stock and credits; authoritative on the host. */
public final class FieldSupplies {
    public enum Kind { HEALTH, SANITY }
    public enum Tier {
        BASIC(50,20,18), IMPROVED(115,40,36), ADVANCED(230,70,65);
        public final int price,health,sanity;
        Tier(int price,int health,int sanity){this.price=price;this.health=health;this.sanity=sanity;}
        public int restore(Kind kind){return kind==Kind.HEALTH?health:sanity;}
        @Override public String toString(){return name()+" / $"+price+" / HP +"+health+" / SAN +"+sanity;}
    }
    private int credits=400;
    private final int[][] owned=new int[Kind.values().length][Tier.values().length];
    public int credits(){return credits;}
    public int stock(Kind kind,Tier tier){return owned[Objects.requireNonNull(kind).ordinal()][Objects.requireNonNull(tier).ordinal()];}
    public void reward(int amount){if(amount<0||amount>100000)throw new IllegalArgumentException("bad payout");credits=Math.min(100000,credits+amount);}
    public boolean purchase(Kind kind,Tier tier){
        Objects.requireNonNull(kind);Objects.requireNonNull(tier);
        int[] row=owned[kind.ordinal()];
        if(credits<tier.price||row[tier.ordinal()]>=4)return false;
        credits-=tier.price;row[tier.ordinal()]++;return true;
    }
    public Tier best(Kind kind){
        Objects.requireNonNull(kind);
        for(int i=Tier.values().length-1;i>=0;i--)if(owned[kind.ordinal()][i]>0)return Tier.values()[i];
        return null;
    }
    public boolean consume(Kind kind,Tier tier){
        int[] row=owned[Objects.requireNonNull(kind).ordinal()];
        int at=Objects.requireNonNull(tier).ordinal();
        if(row[at]==0)return false;
        row[at]--;return true;
    }
    public String frame(){
        StringBuilder b=new StringBuilder("SUPPLY|").append(credits);
        for(Kind kind:Kind.values())for(Tier tier:Tier.values())b.append('|').append(stock(kind,tier));
        return b.toString();
    }
}