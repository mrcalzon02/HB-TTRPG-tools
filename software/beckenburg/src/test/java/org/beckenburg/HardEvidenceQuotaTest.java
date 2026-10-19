package org.beckenburg;

/** Host-only difficulty quotas: no supernatural proof leaks from disabled producers. */
public final class HardEvidenceQuotaTest {
    static void ok(boolean value,String message){if(!value)throw new AssertionError(message);}
    public static void main(String[] args){
        for(GhostIdentity.Type type:GhostIdentity.Type.values()){
            HardEvidenceQuota easy=new HardEvidenceQuota(type,HardEvidenceQuota.Level.EASY,17);
            HardEvidenceQuota medium=new HardEvidenceQuota(type,HardEvidenceQuota.Level.MEDIUM,17);
            HardEvidenceQuota death=new HardEvidenceQuota(type,HardEvidenceQuota.Level.DEATH_WISH,17);
            ok(easy.allowance()>=3,"Easy guarantees at least three actual producers "+type);
            ok(medium.allowance()==2,"medium exactly two permitted families "+type);
            ok(easy.families().containsAll(medium.families()),"medium subset "+type);
            ok(death.allowance()==1,"Death Wish guarantees exactly one hard evidence family "+type);
            ok(easy.families().containsAll(death.families()),"Death Wish is species-compatible "+type);
            ok(easy.permits(HardEvidenceQuota.Family.EMF)
                ==!GhostEvidenceProfile.emfSuppressed(type),
                "EMF suppression is diagnostic but cannot occupy a guaranteed hard-evidence slot "+type);
            ok(easy.permits(HardEvidenceQuota.Family.UV)==GhostTraits.of(type).leavesUv(),
                "UV must have a real producing trait "+type);
            ok(easy.permits(HardEvidenceQuota.Family.ORBS)
                ==(GhostTraits.of(type).sight()==GhostTraits.Sight.ORBS),
                "Orb evidence must have a real visual producer "+type);
            ok(medium.families().equals(new HardEvidenceQuota(type,
                HardEvidenceQuota.Level.MEDIUM,17).families()),"contract seed deterministic "+type);
        }
        LanCase casefile=new LanCase(4);
        casefile.configure(GhostIdentity.Type.DEMON,true);
        casefile.configureHardEvidence(HardEvidenceQuota.Level.DEATH_WISH,122);
        casefile.configureEvidenceClimate(EvidenceSignals.Season.WINTER,
            EvidenceSignals.Weather.THUNDERSTORM,2,false,
            EvidenceSignals.Polarity.HOT);
        casefile.updateEvidenceWeather(EvidenceSignals.Weather.THUNDERSTORM,3);
        for(int tick=0;tick<90;tick++){
            var emf=casefile.scanMeasured(0,LanCase.Tool.EMF,4,4,tick,4,10);
            ok(emf.accepted()&&emf.message().contains("EMF "), "weather measurements remain accessible");
            String reading=emf.message();
            int marker=reading.lastIndexOf("EMF ");
            int value=Integer.parseInt(reading.substring(marker+4,
                reading.indexOf("/10",marker)));
            if(!casefile.allowsEvidence(HardEvidenceQuota.Family.EMF))
                ok(value>=2&&value<=7,"unsanctioned ghost EMF cannot appear");
            else ok(value>=2&&value<=10,"permitted actual EMF remains measurable");
            var temp=casefile.scanMeasured(0,LanCase.Tool.THERMOMETER,4,4,tick,4,10);
            ok(temp.accepted()&&temp.message().contains("Air "),"natural air still measured");
            var spirit=casefile.scanMeasured(0,LanCase.Tool.SPIRIT_BOX,4,4,tick,4,10);
            if(!casefile.allowsEvidence(HardEvidenceQuota.Family.SPIRIT_BOX))
                ok(!spirit.message().contains("Voice response detected"),
                    "non-selected voice producer cannot produce hard proof");
        }
        var wrong=casefile.identify(0,GhostIdentity.Type.SHADE,100);
        ok(wrong.accepted()&&wrong.message().contains("HYPOTHESIS"),"Death Wish guess is unverified");
        ok(!casefile.correctlyIdentified(),"wrong hypothesis never becomes authoritative proof");
        ok(!casefile.performRite(0,GhostIdentity.Rite.CLEANSING,4,true).accepted(),
            "incorrect ritual cannot resolve case");
        ok(casefile.identify(0,GhostIdentity.Type.DEMON,140).accepted(),
            "hunter can correct hypothesis after host cooldown");
        ok(casefile.correctlyIdentified(),"host compares private archetype only for settlement/rite");
        ok(CustomContract.standard(3).evidenceLevel()==HardEvidenceQuota.Level.EASY,
            "older clients retain all-compatible evidence by default");
        System.out.println("PASS Easy>=3 Medium=2 DeathWish=1 species evidence, weather integrity and hypothesis");
    }
}
