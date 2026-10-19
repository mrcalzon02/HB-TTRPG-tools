package org.beckenburg;

/** Deterministic contract weather, evidence integrity and procedural sound regression. */
public final class MissionWeatherTest {
    private static void ok(boolean yes,String reason){if(!yes)throw new AssertionError(reason);}
    public static void main(String[] args){
        var winter=EvidenceSignals.Season.WINTER;
        var clear=new MissionWeather(winter,MissionWeather.Mode.FIXED,
            EvidenceSignals.Weather.CLEAR,1,41);
        var dynamic=new MissionWeather(winter,MissionWeather.Mode.DYNAMIC,
            EvidenceSignals.Weather.SNOW,3,41);
        var random=new MissionWeather(winter,MissionWeather.Mode.RANDOM,
            EvidenceSignals.Weather.HEATWAVE,2,13);
        ok(clear.state().weather()==EvidenceSignals.Weather.CLEAR,"fixed starts as selected");
        ok(!clear.advance(100000)&&clear.state().weather()==EvidenceSignals.Weather.CLEAR,
            "fixed never changes even over long games");
        ok(random.state().weather()!=EvidenceSignals.Weather.HEATWAVE,
            "random winter starts from seasonal weather table");
        ok(random.state().weather()==new MissionWeather(winter,MissionWeather.Mode.RANDOM,
            EvidenceSignals.Weather.CLEAR,2,13).state().weather(),"random seeded");
        int deadline=dynamic.nextChangeTick();
        ok(deadline>=750&&deadline<=1200,"dynamic changes after bounded interval");
        ok(!dynamic.advance(deadline-1),"no premature transition");
        dynamic.advance(deadline);
        ok(dynamic.nextChangeTick()>deadline&&dynamic.state().revision()==1,
            "host advances timeline exactly once per scheduled transition");
        ok(dynamic.state().equals(MissionWeather.State.parse(dynamic.state().packet())),
            "host weather wire format roundtrip");
        var snow=new EvidenceSignals.Location(winter,EvidenceSignals.Weather.SNOW,2,12,false,false);
        var clearLocation=new EvidenceSignals.Location(winter,EvidenceSignals.Weather.CLEAR,2,12,false,false);
        ok(EvidenceSignals.ambientC(snow,3)<EvidenceSignals.ambientC(clearLocation,1)-5,
            "snow actually lowers baseline thermometer readings");
        for(int tick=0;tick<70;tick++){
            var thunder=EvidenceSignals.emf(17,tick,4,-1,0,false,
                EvidenceSignals.Weather.THUNDERSTORM,3);
            var blizzard=EvidenceSignals.emf(17,tick,4,-1,0,false,
                EvidenceSignals.Weather.SNOW,3);
            ok(thunder.level()>=5&&thunder.level()<=7&&!thunder.highEvent(),
                "thunder alone cannot forge spectral high-EMF reading");
            ok(blizzard.level()>=2&&blizzard.level()<=7&&!blizzard.highEvent(),
                "snow suppresses ambient EMF but never reports supernatural proof");
            ok(thunder.level()>blizzard.level(),"severe storms noisier than snow");
            var ghost=EvidenceSignals.emf(17,tick,4,4,10,false,
                EvidenceSignals.Weather.THUNDERSTORM,3);
            ok(ghost.level()>=8&&ghost.highEvent(),
                "real strong local spectral event still produces high EMF in storm");
        }
        var noGhost=EvidenceSignals.temperature(61,42,snow,
            EvidenceSignals.Polarity.COLD,false,10,3);
        ok(noGhost.celsius()<0&&!noGhost.paranormalExtreme(),
            "winter's natural freezing is not evidence of a ghost");
        var ghostTemp=EvidenceSignals.temperature(61,42,snow,
            EvidenceSignals.Polarity.COLD,true,10,3);
        ok(ghostTemp.paranormalExtreme(),"actual paranormal thermal shift still detected");
        int rain=0,silent=0;
        for(int i=0;i<1400;i++){
            rain+=Math.abs(WeatherSoundscape.sample(EvidenceSignals.Weather.THUNDERSTORM,3,true,i));
            silent+=Math.abs(WeatherSoundscape.sample(EvidenceSignals.Weather.SNOW,1,true,i));
        }
        ok(rain>silent,"thunderstorm bed louder than snowfall");
        var storms=new MissionWeather.State(winter,EvidenceSignals.Weather.THUNDERSTORM,
            MissionWeather.Mode.FIXED,3,0);
        var sound=new LanSound.CueEvent(LanSound.Cue.STEP,0,60,1);
        ok(LanSound.weatherMask(sound,storms,true).volume()<60,
            "weather attenuates outdoor physical cues");
        System.out.println("PASS fixed dynamic random weather, thunder EMF, freezing temperature and soundscape");
    }
}
