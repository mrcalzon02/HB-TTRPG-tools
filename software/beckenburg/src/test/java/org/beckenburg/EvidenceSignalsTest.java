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
            EvidenceSignals.Polarity.COLD,true,10);
        ok(cold.celsius()<0&&cold.paranormalExtreme(),
            "paranormal negative temperature recognized");
        var heat=EvidenceSignals.temperature(7,40,winterInside,
            EvidenceSignals.Polarity.HOT,true,10);
        ok(heat.display(EvidenceSignals.Unit.FAHRENHEIT)>=90&&heat.paranormalExtreme(),
            "paranormal 90F+ room recognized even in winter");
        ok(Math.abs(EvidenceSignals.fToC(90)-32.2222222)<.00001,
            "F/C conversion preserves thermal evidence threshold");
        for(int tick=0;tick<150;tick++){
            var passive=EvidenceSignals.emf(19,tick,4,4,0);
            var displaced=EvidenceSignals.emf(19,tick,4,8,10);
            ok(passive.level()>=2&&passive.level()<=7&&!passive.highEvent(),
                "ordinary EMF 2-7 is a measurement");
            ok(!displaced.highEvent(),"remote event cannot be local positive");
            var active=EvidenceSignals.emf(19,tick,4,4,10);
            ok(active.level()>=8&&active.highEvent(),
                "strong local event yields 8-10 EMF");
        }
        for(int strength=1;strength<=7;strength++){
            var normal=EvidenceSignals.emf(19,20,4,4,strength);
            ok(normal.level()>=2&&normal.level()<=7&&!normal.highEvent(),
                "weak/mid ghost events give ordinary 2-7 EMF");
        }
        for(int tick=0;tick<100;tick++){
            var high=EvidenceSignals.emf(19,tick,4,4,10,
                GhostEvidenceProfile.EmfBand.HIGH,EvidenceSignals.Weather.THUNDERSTORM,3);
            var low=EvidenceSignals.emf(19,tick,4,4,10,
                GhostEvidenceProfile.EmfBand.LOW_MID,EvidenceSignals.Weather.THUNDERSTORM,3);
            var none=EvidenceSignals.emf(19,tick,4,4,10,
                GhostEvidenceProfile.EmfBand.NONE,EvidenceSignals.Weather.THUNDERSTORM,3);
            ok(high.level()>=8&&high.level()<=10&&high.highEvent(),
                "HIGH ghosts yield 8-10 on strong local events");
            ok(low.level()>=2&&low.level()<=7&&!low.highEvent(),
                "LOW_MID ghosts never yield high EMF even in thunderstorms");
            ok(none.level()==0&&none.suppressed(),
                "NONE ghosts suppress a genuine local event to zero, even in thunder");
            var weakNone=EvidenceSignals.emf(19,tick,4,4,3,
                GhostEvidenceProfile.EmfBand.NONE,EvidenceSignals.Weather.RAIN,2);
            ok(weakNone.level()==0&&weakNone.suppressed(),
                "No-EMF species suppress weak paranormal events as well");
            var ambient=EvidenceSignals.emf(19,tick,4,-1,0,
                GhostEvidenceProfile.EmfBand.NONE,EvidenceSignals.Weather.THUNDERSTORM,3);
            ok(ambient.level()>=2&&ambient.level()<=7&&!ambient.highEvent(),
                "No-EMF ghost cannot eliminate external weather background");
        }
        var neutral=EvidenceSignals.temperature(7,40,winterInside,
            EvidenceSignals.Polarity.NONE,true,10);
        ok(!neutral.paranormalExtreme(),"neutral ghost cannot generate thermal extreme");
        var otherNeutral=EvidenceSignals.temperature(7,80,winterInside,
            EvidenceSignals.Polarity.NONE,true,2);
        ok(otherNeutral.celsius()!=neutral.celsius(),
            "normal temperature fluctuates with time and event strength");
        ok(EvidenceSignals.emf(19,51,4,4,10).level()
           ==EvidenceSignals.emf(19,51,4,4,10).level(),
           "repeated same-tick polling cannot reroll a measurement");
        ok(!EvidenceSignals.temperature(17,12,winterInside,
                EvidenceSignals.Polarity.HOT,false,10).paranormalExtreme(),
                "ghost influence must really exist before awarding thermal evidence");
        System.out.println("PASS: ordinary EMF 2-7, high 8-10, neutral thermal variation, extremes and F/C");
    }
}
