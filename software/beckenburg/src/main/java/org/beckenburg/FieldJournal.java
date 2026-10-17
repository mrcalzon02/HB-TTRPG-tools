package org.beckenburg;

import java.util.EnumMap;
import java.util.List;
import java.util.ArrayList;
import java.util.Objects;

/** Shared investigator observations. Marked sightings are hypotheses, not host-granted evidence. */
public final class FieldJournal {
    public enum Status { UNKNOWN, SEEN, UNSURE }
    public record Note(GhostFieldGuide.Clue clue,Status status,int seat,int tick){
        public Note{
            Objects.requireNonNull(clue);Objects.requireNonNull(status);
            if(seat<0||seat>2||tick<0)throw new IllegalArgumentException("invalid note origin");
        }
        public String frame(){return "NOTE|"+clue+"|"+status+"|"+seat+"|"+tick;}
        public static Note decode(String frame){
            List<String> p=LanProtocol.parts(frame);
            if(p.size()!=5||!p.get(0).equals("NOTE"))throw new IllegalArgumentException("invalid note");
            return new Note(GhostFieldGuide.Clue.valueOf(p.get(1)),Status.valueOf(p.get(2)),
                LanProtocol.integer(p.get(3),0,2),LanProtocol.integer(p.get(4),0,99999999));
        }
    }
    private final EnumMap<GhostFieldGuide.Clue,Note> notes=new EnumMap<>(GhostFieldGuide.Clue.class);
    public Status status(GhostFieldGuide.Clue clue){
        Note note=notes.get(Objects.requireNonNull(clue));return note==null?Status.UNKNOWN:note.status();
    }
    public Note set(GhostFieldGuide.Clue clue,Status status,int seat,int tick){
        Note note=new Note(clue,status,seat,tick);
        if(status==Status.UNKNOWN)notes.remove(clue);else notes.put(clue,note);
        return note;
    }
    public void accept(Note note){Objects.requireNonNull(note);set(note.clue(),note.status(),note.seat(),note.tick());}
    public void clear(){notes.clear();}
    public List<String> snapshot(){
        List<String> result=new ArrayList<>();
        for(GhostFieldGuide.Clue c:GhostFieldGuide.Clue.values()){
            Note n=notes.get(c);if(n!=null)result.add(n.frame());
        }
        return List.copyOf(result);
    }
    public int seenCount(){return (int)notes.values().stream().filter(n->n.status()==Status.SEEN).count();}
}