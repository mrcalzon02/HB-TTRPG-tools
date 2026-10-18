package org.beckenburg;

public final class EmfSilenceTest {
    static void ok(boolean state,String why){if(!state)throw new AssertionError(why);}
    public static void main(String[] args){
        var meter=EvidenceSignals.emf(5,20,4,4,10,true);
        ok(meter.level()==0&&meter.suppressed()&&!meter.positiveEvidence(),
            "suppression is not high EMF evidence");
        ok(EvidenceSignals.emf(5,20,4,7,10,true).level()>0,
            "no zero report from remote ghost action");
        LanCase shade=new LanCase(4);
        shade.configure(GhostIdentity.Type.SHADE,true);
        ok(shade.scanMeasured(0,LanCase.Tool.EMF,4,4,20,-1,0,true)
                .message().startsWith("INCONCLUSIVE"),"quiet room without event is not proof");
        ok(shade.scanMeasured(0,LanCase.Tool.EMF,4,4,25,4,10,true)
                .message().startsWith("INCONCLUSIVE"),"one zero read not proof");
        ok(shade.scanMeasured(0,LanCase.Tool.EMF,4,4,30,4,10,true)
                .message().startsWith("INCONCLUSIVE"),"two zeros insufficient");
        ok(shade.scanMeasured(0,LanCase.Tool.EMF,4,4,35,4,10,true)
                .message().startsWith("CONFIRMED"),"three separated zero events confirm");
        ok(shade.evidenceCount()==1,"zero EMF adds only one measurement family");
        var other=new LanCase(4);
        other.configure(GhostIdentity.Type.SPIRIT,true);
        ok(other.scanMeasured(0,LanCase.Tool.EMF,4,4,25,4,10,false)
                .message().contains("EMF 10/10"),"ordinary strong event remains high EMF");
        System.out.println("PASS: Shade-authorized zero EMF versus ordinary high signal");
    }
}
