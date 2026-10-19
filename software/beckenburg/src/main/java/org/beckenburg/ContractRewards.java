package org.beckenburg;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

/** One-shot, host-authored case settlement. Retreat is NEVER a ritual victory. */
public final class ContractRewards {
    public enum Task {
        EMF_SAMPLE("Measure an EMF field"),
        THERMAL_SAMPLE("Document a temperature reading"),
        SPIRIT_SAMPLE("Test the spirit-box response"),
        WARD_SITE("Place a protective ward"),
        PHOTO_EVENT("Photograph a supernatural manifestation"),
        SURVIVE_FRENZY("Survive a Ghost Frenzy"),
        WRITING_EVENT("Inspect genuine ghost writing");
        public final String label;
        Task(String label){this.label=label;}
    }
    /** Daily tasks rotate by UTC day and apply consistently to every host's cases. */
    private final EnumSet<Task> daily=EnumSet.noneOf(Task.class);
    private final EnumSet<Task> completed=EnumSet.noneOf(Task.class);
    private final UUID id;
    private final LocalDate day;
    private boolean settled;
    public ContractRewards(UUID id,LocalDate utcDay){
        this.id=java.util.Objects.requireNonNull(id);
        day=java.util.Objects.requireNonNull(utcDay);
        // Rotating dailies must not reveal which hidden evidence families this
        // ghost can produce, and must remain feasible on Death Wish.
        Task[] kinds={Task.EMF_SAMPLE,Task.THERMAL_SAMPLE,Task.SPIRIT_SAMPLE,
            Task.WARD_SITE,Task.SURVIVE_FRENZY};
        int first=Math.floorMod(day.toEpochDay(),kinds.length);
        for(int i=0;i<3;i++)daily.add(kinds[(first+i*2)%kinds.length]);
    }
    public UUID id(){return id;}
    public void mark(Task task){
        if(settled)throw new IllegalStateException("case already settled");
        completed.add(java.util.Objects.requireNonNull(task));
    }
    public EnumSet<Task> daily(){return daily.clone();}
    public EnumSet<Task> completed(){return completed.clone();}
    public String objectivesPacket(){
        return "OBJECTIVES|"+day+"|"+daily.stream().map(Task::name)
            .collect(java.util.stream.Collectors.joining(","));
    }
    public record Settlement(UUID id,LanCase.Outcome outcome,int credits,int xp,
            boolean identified,boolean victory,int optionalDone,int dailyDone) {
        public Settlement {
            java.util.Objects.requireNonNull(id);java.util.Objects.requireNonNull(outcome);
            if(outcome==LanCase.Outcome.ACTIVE||credits<0||credits>100000
                    ||xp<0||xp>10000||optionalDone<0||dailyDone<0||dailyDone>3)
                throw new IllegalArgumentException("invalid outcome ledger");
        }
        public String packet(){
            return "PAYOUT|"+id+"|"+outcome+"|"+credits+"|"+xp+"|"+
                (identified?1:0)+"|"+(victory?1:0)+"|"+optionalDone+"|"+dailyDone;
        }
        public static Settlement decode(String wire){
            var p=LanProtocol.parts(wire);
            if(p.size()!=9||!p.get(0).equals("PAYOUT"))
                throw new IllegalArgumentException("invalid payout frame");
            try{return new Settlement(UUID.fromString(p.get(1)),
                LanCase.Outcome.valueOf(p.get(2)),
                LanProtocol.integer(p.get(3),0,100000),
                LanProtocol.integer(p.get(4),0,10000),
                LanProtocol.integer(p.get(5),0,1)==1,
                LanProtocol.integer(p.get(6),0,1)==1,
                LanProtocol.integer(p.get(7),0,Task.values().length),
                LanProtocol.integer(p.get(8),0,3));}
            catch(IllegalArgumentException ex){throw new IllegalArgumentException("invalid payout",ex);}
        }
    }
    public Settlement settle(LanCase.Outcome outcome,boolean identityCorrect,
            HardEvidenceQuota.Level level,int weatherChallenge){
        if(settled)throw new IllegalStateException("duplicate case settlement");
        if(weatherChallenge<0||weatherChallenge>3)throw new IllegalArgumentException("weather challenge");
        java.util.Objects.requireNonNull(outcome);
        if(outcome==LanCase.Outcome.ACTIVE)throw new IllegalStateException("cannot settle active case");
        settled=true;
        boolean victory=outcome==LanCase.Outcome.CLEANSED||outcome==LanCase.Outcome.BANISHED
            ||outcome==LanCase.Outcome.ABSOLVED;
        if(victory&&!identityCorrect)throw new IllegalStateException("ritual victory without identification");
        int dailyCount=0;
        for(Task task:daily)if(completed.contains(task))dailyCount++;
        int optional=completed.size();
        // A failed case or unverified extraction never receives a victory reward.
        int base=victory?340:outcome==LanCase.Outcome.RETREATED&&identityCorrect?110:0;
        int credits=base==0?0:(int)Math.round((base+optional*28+dailyCount*55)
            *level.rewardMultiplier()*(1+.12*weatherChallenge));
        int xp=base==0?0:(victory?120:32)+optional*6+dailyCount*8;
        return new Settlement(id,outcome,Math.min(100000,credits),xp,
            identityCorrect,victory,optional,dailyCount);
    }
}
