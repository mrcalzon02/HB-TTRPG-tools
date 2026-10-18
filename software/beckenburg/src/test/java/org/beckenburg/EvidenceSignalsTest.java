package org.beckenburg;

/** Contract tests for numeric EMF and climate-driven extreme temperatures. */
public final class EvidenceSignalsTest {
    private static void ok(boolean condition,String why){
        if(!condition)throw new AssertionError(why);
    }
    public static void main(String[] args){
        var winterOutside=new EvidenceSignals.Location(EvidenceSignals.Season.WINTER,
            EvidenceSignals.Weather.SNOW,2,4,false,false);
        var summerOutside=new EvidenceSignals.Location(EvidenceSignals.Season.SUMMER,
            EvidenceSignals.Weather.HEATWAVE,14,4,false,false);
        var winterInside=new EvidenceSignals.Location(EvidenceSignals.Season.WINTER,
            EvidenceSignals.Weather.SNOW,2,4,true,true);
        ok(EvidenceSignals.ambientC(winterOutside)<EvidenceSignals.ambientC(winterInside),
            "heated interior insulated against outdoor winter");
        ok(EvidenceSignals.ambientC(summerOutside)>EvidenceSignals.ambientC(winterOutside)+20,
            "outdoor weather/season affects temperature");
        var natural=EvidenceSignals.temperature(7,40,winterOutside,
            EvidenceSignals.Polarity.NONE,false,0);
        ok(natural.celsius()<0&&!natural.paranormalExtreme(),
            "naturally freezing outside cannot produce false ghost evidence");
        var cold=EvidenceSignals.temperature(7,40,winterInside,
            EvidenceSignals.Polarity.COLD,true,7);
        ok(cold.celsius()<0&&cold.paranormalExtreme(),
            "paranormal negative temperature recognized");
        var heat=EvidenceSignals.temperature(7,40,winterInside,
            EvidenceSignals.Polarity.HOT,true,7);
        ok(heat.display(EvidenceSignals.Unit.FAHRENHEIT)>=90&&heat.paranormalExtreme(),
            "paranormal 90F+ room recognized even in winter");
        ok(Math.abs(EvidenceSignals.fToC(90)-32.2222222)<.00001,
            "F/C conversion preserves thermal evidence threshold");
        for(int tick=0;tick<150;tick++){
            var passive=EvidenceSignals.emf(19,tick,4,4,0);
            var displaced=EvidenceSignals.emf(19,tick,4,8,10);
            ok(passive.level()>=1&&passive.level()<=10&&!passive.positiveEvidence(),
                "ordinary EMF 1-10 range, never self-confirms");
            ok(!displaced.positiveEvidence(),"remote event cannot be local positive");
            var active=EvidenceSignals.emf(19,tick,4,4,10);
            ok(active.level()>6&&active.positiveEvidence(),
                "strong local event should record >6 EMF");
        }
        ok(EvidenceSignals.emf(19,51,4,4,10).level()
           ==EvidenceSignals.emf(19,51,4,4,10).level(),
           "repeated same-tick polling cannot reroll a measurement");
        ok(!EvidenceSignals.temperature(17,12,winterInside,
                EvidenceSignals.Polarity.HOT,false,10).paranormalExtreme(),
                "ghost influence must really exist before awarding thermal evidence");
        System.out.println("PASS: EMF 1-10, event evidence >6, hot/cold, seasonal baselines and F/C");
    }
}
