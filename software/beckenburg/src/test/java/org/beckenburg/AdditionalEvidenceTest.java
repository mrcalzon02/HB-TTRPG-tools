package org.beckenburg;

import java.util.EnumSet;
import java.util.HashSet;
import java.util.Set;

/**
 * Regressions for player-observable instrument signals, not authoritative
 * identity verdicts. The host knows whether a source event exists, but the
 * casebook simply records the instrument text as OBSERVED.
 */
public final class AdditionalEvidenceTest {
    private static void ok(boolean yes,String reason){
        if(!yes)throw new AssertionError(reason);
    }
    private record Probe(String id,GhostIdentity.Type type,GhostDomain.Action cause){}
    public static void main(String[] args){
        Probe[] seven={
            new Probe("ECTOPLASM_SAMPLER",GhostIdentity.Type.POSSESSIVE,GhostDomain.Action.DISTURB),
            new Probe("RESONANCE_TUNER",GhostIdentity.Type.DEMON,GhostDomain.Action.WHISPER),
            new Probe("BAROMETRIC_PROBE",GhostIdentity.Type.DEMON,GhostDomain.Action.STRIKE),
            new Probe("SEISMIC_RECORDER",GhostIdentity.Type.POLTERGEIST,GhostDomain.Action.DISTURB),
            new Probe("SPECTRAL_PRISM",GhostIdentity.Type.SHADE,GhostDomain.Action.MANIFEST),
            new Probe("LASER_GRID",GhostIdentity.Type.WRAITH,GhostDomain.Action.MANIFEST),
            new Probe("OBJECT_IMPRINT_SCANNER",GhostIdentity.Type.POSSESSIVE,GhostDomain.Action.DISTURB)
        };
        Set<EquipmentRegistry.Evidence> observed=EnumSet.noneOf(EquipmentRegistry.Evidence.class);
        LanEvidenceJournal notebook=new LanEvidenceJournal();
        for(Probe item:seven){
            var q=new HardEvidenceQuota(item.type(),HardEvidenceQuota.Level.EASY,314159L);
            var stage=EquipmentTiers.stage(item.id(),EquipmentTiers.Tier.I);
            var positive=AdditionalEvidence.measure(item.id(),item.type(),q,400,395,
                10,item.cause(),true,.45,stage);
            ok(positive.detected(),"Expected direct visible reading from "+item.id());
            ok(observed.add(positive.evidence()),"One unique evidence family per detector");
            ok(!positive.reading().contains("CONFIRMED")
                    &&!positive.reading().contains("VERIFIED")
                    &&!positive.reading().contains("ghost type"),
                "Device shows a measurement, not a confirmation or identity verdict");
            var noEvent=AdditionalEvidence.measure(item.id(),item.type(),q,400,-200,
                0,item.cause(),true,.45,stage);
            ok(!noEvent.detected(),"Pressing a button without a real event cannot fabricate a hit");
            var tooFar=AdditionalEvidence.measure(item.id(),item.type(),q,400,395,
                10,item.cause(),true,25.0,stage);
            ok(!tooFar.detected(),"Out-of-range instruments do not collect evidence");
            var wrongRoom=AdditionalEvidence.measure(item.id(),item.type(),q,400,395,
                10,item.cause(),false,.45,stage);
            ok(!wrongRoom.detected(),"Different rooms do not manufacture a hit");
            String packet=notebook.recordDevice(400,0,4,item.id(),
                LanEvidenceJournal.Finding.OBSERVED,positive.reading());
            var saved=LanEvidenceJournal.Entry.decode(packet);
            ok(saved.finding()==LanEvidenceJournal.Finding.OBSERVED,
                "Casebook records only OBSERVED regardless of the underlying simulation");
            ok(saved.reading().equals(positive.reading()),
                "Casebook contains only what the player saw on the instrument");
            HardEvidenceQuota restricted=null;
            for(int seed=0;seed<100;seed++){
                var candidate=new HardEvidenceQuota(item.type(),
                    HardEvidenceQuota.Level.DEATH_WISH,seed);
                if(!candidate.permits(AdditionalEvidence.family(positive.evidence()))){
                    restricted=candidate;break;
                }
            }
            ok(restricted!=null,"Need a case that withholds this instrument family");
            var withheld=AdditionalEvidence.measure(item.id(),item.type(),restricted,
                400,395,10,item.cause(),true,.45,stage);
            ok(!withheld.detected(),"Withheld evidence remains silent even at the real event");
        }
        ok(observed.size()==7,"All seven newly modeled evidence detectors can show a hard clue");
        ok(FieldEquipment.functional("ECTOPLASM_SAMPLER"),
            "The instrument must be equippable, not only cataloged");
        ok(FieldEquipment.functional("CHALK_SIGIL_KIT"),
            "Supporting chalk equipment must enter the usable loadout");
        Set<Set<HardEvidenceQuota.Family>> unique=new HashSet<>();
        for(GhostIdentity.Type species:GhostIdentity.Type.values()){
            var medium=new HardEvidenceQuota(species,HardEvidenceQuota.Level.MEDIUM,66);
            var easy=new HardEvidenceQuota(species,HardEvidenceQuota.Level.EASY,66);
            var death=new HardEvidenceQuota(species,HardEvidenceQuota.Level.DEATH_WISH,66);
            ok(medium.allowance()==3&&easy.allowance()>=4&&death.allowance()==1,
                "Contract quotas remain exactly 3/at least 4/1");
            ok(unique.add(medium.families()),"Unique evidence triple for "+species);
            ok(easy.families().containsAll(medium.families()),
                "Signature must use existing playable detectors for "+species);
            boolean extra=false;
            for(var family:medium.families())
                if(family.ordinal()>=HardEvidenceQuota.Family.ECTOPLASM.ordinal())extra=true;
            ok(extra,"New modeled instruments need to matter on Medium: "+species);
        }
        System.out.println("PASS seven observable detectors, no automatic verdicts, all 13 unique 3-clue signatures");
    }
}
