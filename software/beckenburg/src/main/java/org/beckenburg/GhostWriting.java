package org.beckenburg;

import java.util.Objects;

/**
 * Server-authoritative authored writing after a real ghost interaction with a placed book.
 * Mark style is descriptive evidence; it must not reveal the species on its own.
 */
public final class GhostWriting {
    public enum Style { CHILD_DRAWINGS, FRANTIC_SCRAWLS, RITUAL_CIRCLES }
    public record Page(int room,int eventTick,Style style,String description) {
        public Page {
            if(room<0||eventTick<0||style==null||description==null||description.isBlank())
                throw new IllegalArgumentException("invalid writing");
        }
    }
    private int room=-1,placedBy=-1,placedTick=-1;
    private Page page;
    public boolean placed(){return room>=0;}
    public int room(){return room;}
    public Page page(){return page;}
    public void place(int seat,int room,int tick){
        if(seat<0||seat>5||room<0||tick<0)
            throw new IllegalArgumentException("invalid placement");
        this.room=room;placedBy=seat;placedTick=tick;page=null;
    }
    public boolean remove(int seat,int room){
        if(seat<0||seat>5||this.room!=room)return false;
        this.room=-1;this.placedBy=-1;this.placedTick=-1;page=null;
        return true;
    }
    /**
     * Only an actual disturbance/manifestation/signature in the same room, after
     * placement, can mark a page. The caller must submit an already-authorized
     * GhostDomain.Resolution; no player chooses the writing content.
     */
    public boolean witness(long caseSeed,int tick,GhostDomain.Resolution event){
        Objects.requireNonNull(event);
        if(page!=null||room<0||tick<=placedTick||!event.applied()
           ||event.room()!=room)return false;
        if(event.action()!=GhostDomain.Action.DISTURB
           &&event.action()!=GhostDomain.Action.MANIFEST
           &&event.action()!=GhostDomain.Action.SIGNATURE)return false;
        long mixed=caseSeed ^ ((long)tick*0x9e3779b97f4a7c15L)
                 ^ ((long)room*0xbf58476d1ce4e5b9L);
        mixed^=mixed>>>30;mixed*=0xbf58476d1ce4e5b9L;
        mixed^=mixed>>>27;mixed*=0x94d049bb133111ebL;
        mixed^=mixed>>>31;
        Style style=Style.values()[(int)Math.floorMod(mixed,Style.values().length)];
        String detail=switch(style){
            case CHILD_DRAWINGS->"Childlike figures, uneven houses and repeated eyes";
            case FRANTIC_SCRAWLS->"Layered frantic strokes, broken lines and crossed-out words";
            case RITUAL_CIRCLES->"Concentric rings and hand-drawn ritual geometry";
        };
        page=new Page(room,tick,style,detail);
        return true;
    }
    public String inspect(int observedRoom){
        if(observedRoom!=room||room<0)return "No writing book at this location";
        return page==null?"Blank page - no ghost-authored writing":page.description();
    }
}
