package org.beckenburg;
/** Recorded NOX ambient beds must ship and respect shelter, while winter snow stays procedural. */
public final class RecordedWeatherTest {
    public static void main(String[] args) {
        if(!WeatherSoundscape.hasRecordedLoop(EvidenceSignals.Weather.RAIN)
                ||!WeatherSoundscape.hasRecordedLoop(EvidenceSignals.Weather.WIND)
                ||!WeatherSoundscape.hasRecordedLoop(EvidenceSignals.Weather.THUNDERSTORM))
            throw new AssertionError("NOX rain and wind loops missing from compiled resources");
        if(WeatherSoundscape.hasRecordedLoop(EvidenceSignals.Weather.SNOW))
            throw new AssertionError("Snow has no recorded loop in the selected library");
        long sumRain=0,sumWind=0,sumSheltered=0;
        for(int i=0;i<16000;i++){
            sumRain+=Math.abs(WeatherSoundscape.playbackSample(
                EvidenceSignals.Weather.RAIN,2,true,i));
            sumWind+=Math.abs(WeatherSoundscape.playbackSample(
                EvidenceSignals.Weather.WIND,2,true,i));
            sumSheltered+=Math.abs(WeatherSoundscape.playbackSample(
                EvidenceSignals.Weather.RAIN,2,false,i));
        }
        if(sumRain==0||sumWind==0||sumRain<=sumSheltered)
            throw new AssertionError("Weather WAVs silent or indoor attenuation missing");
        if(WeatherSoundscape.playbackSample(EvidenceSignals.Weather.CLEAR,1,true,30)
                !=WeatherSoundscape.sample(EvidenceSignals.Weather.CLEAR,1,true,30))
            throw new AssertionError("Procedural non-recorded climates lost fallback");
        System.out.println("PASS RecordedWeatherTest / NOX rain and wind loops, thunder preservation, indoor shelter");
    }
}
