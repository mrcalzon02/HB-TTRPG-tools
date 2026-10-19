package org.beckenburg;

import java.util.Objects;

/** Contract weather, chosen and evolved only by the host's authoritative 100ms tick. */
public final class MissionWeather {
    public enum Mode { FIXED, DYNAMIC, RANDOM }
    public record State(EvidenceSignals.Season season,EvidenceSignals.Weather weather,
            Mode mode,int intensity,int revision) {
        public State {
            Objects.requireNonNull(season);Objects.requireNonNull(weather);Objects.requireNonNull(mode);
            if(intensity<1||intensity>3||revision<0)throw new IllegalArgumentException("weather state");
        }
        public int noiseMask(){
            int base=switch(weather){
                case CLEAR->0;case FOG->1;case SNOW->2;case WIND->3;
                case RAIN->3;case HEATWAVE->1;case THUNDERSTORM->5;
            };
            return base*intensity;
        }
        /** Extra mission challenge rating, separate from the mandatory party-size modifier. */
        public int challenge(){
            return Math.min(3,(noiseMask()+3)/6);
        }
        public String packet(){return "WEATHER|"+season+"|"+weather+"|"+mode+"|"+intensity+"|"+revision;}
        public String caption(){return weather+" / INTENSITY "+intensity+"/3";}
        public static State parse(String packet){
            String[] p=packet.split("\\|",-1);
            if(p.length!=6||!p[0].equals("WEATHER"))
                throw new IllegalArgumentException("weather frame");
            try{
                return new State(EvidenceSignals.Season.valueOf(p[1]),EvidenceSignals.Weather.valueOf(p[2]),
                    Mode.valueOf(p[3]),Integer.parseInt(p[4]),Integer.parseInt(p[5]));
            }catch(NumberFormatException ex){throw new IllegalArgumentException("weather numbers",ex);}
        }
    }
    private final long seed;
    private final EvidenceSignals.Season season;
    private final Mode mode;
    private final int intensity;
    private EvidenceSignals.Weather weather;
    private int revision;
    private int nextChange;
    public MissionWeather(EvidenceSignals.Season season,Mode mode,
            EvidenceSignals.Weather selected,int intensity,long seed){
        this.season=Objects.requireNonNull(season);
        this.mode=Objects.requireNonNull(mode);
        this.intensity=intensity;
        if(intensity<1||intensity>3)throw new IllegalArgumentException("weather intensity 1..3");
        this.seed=seed;
        this.weather=mode==Mode.RANDOM?pick(seed,season):Objects.requireNonNull(selected);
        this.nextChange=750+Math.floorMod(mix(seed),451); // 75-120 s between weather changes
    }
    public State state(){return new State(season,weather,mode,intensity,revision);}
    public int nextChangeTick(){return nextChange;}
    public boolean advance(int tick){
        if(tick<0)throw new IllegalArgumentException("negative weather tick");
        if(mode!=Mode.DYNAMIC||tick<nextChange)return false;
        EvidenceSignals.Weather prior=weather;
        weather=transition(weather,season,seed+revision*947L);
        revision++;
        nextChange=tick+750+Math.floorMod(mix(seed+revision*1019L),451);
        return weather!=prior;
    }
    private static int mix(long seed){
        long x=seed^0x9e3779b97f4a7c15L;
        x^=x>>>30;x*=0xbf58476d1ce4e5b9L;
        x^=x>>>27;x*=0x94d049bb133111ebL;
        return (int)(x^(x>>>31));
    }
    private static EvidenceSignals.Weather pick(long seed,EvidenceSignals.Season season){
        EvidenceSignals.Weather[] available=switch(season){
            case WINTER->new EvidenceSignals.Weather[]{EvidenceSignals.Weather.CLEAR,
                EvidenceSignals.Weather.SNOW,EvidenceSignals.Weather.SNOW,
                EvidenceSignals.Weather.WIND,EvidenceSignals.Weather.FOG};
            case SUMMER->new EvidenceSignals.Weather[]{EvidenceSignals.Weather.CLEAR,
                EvidenceSignals.Weather.HEATWAVE,EvidenceSignals.Weather.RAIN,
                EvidenceSignals.Weather.THUNDERSTORM,EvidenceSignals.Weather.FOG};
            case SPRING,AUTUMN->new EvidenceSignals.Weather[]{EvidenceSignals.Weather.CLEAR,
                EvidenceSignals.Weather.RAIN,EvidenceSignals.Weather.THUNDERSTORM,
                EvidenceSignals.Weather.WIND,EvidenceSignals.Weather.FOG};
        };
        return available[Math.floorMod(mix(seed),available.length)];
    }
    private static EvidenceSignals.Weather transition(EvidenceSignals.Weather prior,
            EvidenceSignals.Season season,long seed){
        EvidenceSignals.Weather[] possibilities=switch(prior){
            case CLEAR->new EvidenceSignals.Weather[]{EvidenceSignals.Weather.CLEAR,
                EvidenceSignals.Weather.WIND,EvidenceSignals.Weather.FOG,pick(seed,season)};
            case RAIN->new EvidenceSignals.Weather[]{EvidenceSignals.Weather.RAIN,
                EvidenceSignals.Weather.THUNDERSTORM,EvidenceSignals.Weather.FOG,
                EvidenceSignals.Weather.CLEAR};
            case THUNDERSTORM->new EvidenceSignals.Weather[]{EvidenceSignals.Weather.THUNDERSTORM,
                EvidenceSignals.Weather.RAIN,EvidenceSignals.Weather.WIND};
            case SNOW->new EvidenceSignals.Weather[]{EvidenceSignals.Weather.SNOW,
                EvidenceSignals.Weather.WIND,EvidenceSignals.Weather.FOG,
                EvidenceSignals.Weather.CLEAR};
            case HEATWAVE->new EvidenceSignals.Weather[]{EvidenceSignals.Weather.HEATWAVE,
                EvidenceSignals.Weather.CLEAR,EvidenceSignals.Weather.WIND};
            case WIND,FOG->new EvidenceSignals.Weather[]{prior,EvidenceSignals.Weather.CLEAR,
                pick(seed,season)};
        };
        return possibilities[Math.floorMod(mix(seed^0xB3CC3BL),possibilities.length)];
    }
}
