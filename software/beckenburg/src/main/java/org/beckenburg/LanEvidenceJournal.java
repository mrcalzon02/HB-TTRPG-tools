package org.beckenburg;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** Host-owned, bounded observation journal. Never transmitted to the ghost seat. */
public final class LanEvidenceJournal {
    public static final int CAPACITY=2048;
    public enum Finding { CONFIRMED, REPEAT, INCONCLUSIVE }
    public record Entry(int tick,int seat,int room,String tool,Finding finding,String reading) {
        public Entry {
            if(tick<0||seat<0||seat>=6||room<0||room>=HouseMap.ROOM_COUNT)
                throw new IllegalArgumentException("invalid evidence origin");
            if(tool==null||!tool.matches("[A-Z][A-Z0-9_]{1,31}"))
                throw new IllegalArgumentException("invalid equipment identifier");
            Objects.requireNonNull(finding);
            Objects.requireNonNull(reading);
            if(reading.isBlank()||reading.length()>160||reading.indexOf('|')>=0
                    ||reading.indexOf('\n')>=0||reading.indexOf('\r')>=0)
                throw new IllegalArgumentException("invalid evidence text");
        }
        public Entry(int tick,int seat,int room,LanCase.Tool tool,Finding finding,String reading){
            this(tick,seat,room,Objects.requireNonNull(tool).name(),finding,reading);
        }
        public String frame(){
            return "CASEFILE|"+tick+"|"+seat+"|"+room+"|"+tool+"|"+finding+"|"+reading;
        }
        public static Entry decode(String frame){
            var p=LanProtocol.parts(frame);
            if(p.size()!=7||!p.get(0).equals("CASEFILE"))
                throw new IllegalArgumentException("invalid casefile frame");
            return new Entry(LanProtocol.integer(p.get(1),0,99999999),
                    LanProtocol.integer(p.get(2),0,5),
                    LanProtocol.integer(p.get(3),0,HouseMap.ROOM_COUNT-1),
                    p.get(4),Finding.valueOf(p.get(5)),p.get(6));
        }
    }
    private final ArrayDeque<Entry> entries=new ArrayDeque<>();
    public String record(int tick,int seat,int room,LanCase.Tool tool,LanCase.Report report){
        Objects.requireNonNull(report);
        if(!report.accepted())throw new IllegalArgumentException("rejected scan cannot create evidence");
        String reading=report.message();
        Finding finding=reading.startsWith("CONFIRMED ")?Finding.CONFIRMED:
                reading.startsWith("REPEAT ")?Finding.REPEAT:
                reading.startsWith("INCONCLUSIVE ")?Finding.INCONCLUSIVE:null;
        if(finding==null)throw new IllegalArgumentException("unrecognized reading");
        return recordDevice(tick,seat,room,tool.name(),finding,reading);
    }
    /** Every accepted sample, including inconclusive and repeated measurements,
     * is logged. Non-legacy instruments share the same replay protocol.
     */
    public String recordDevice(int tick,int seat,int room,String tool,
            Finding finding,String reading){
        Entry next=new Entry(tick,seat,room,tool,finding,reading);
        if(entries.size()==CAPACITY)entries.removeFirst();
        entries.addLast(next);
        return next.frame();
    }
    public List<String> snapshot(){
        List<String> result=new ArrayList<>(entries.size());
        for(Entry e:entries)result.add(e.frame());
        return List.copyOf(result);
    }
}
