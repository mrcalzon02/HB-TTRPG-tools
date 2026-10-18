package org.beckenburg;

import java.util.Locale;
import java.util.Objects;

/**
 * Host-side environmental measurement model for the expanded evidence system.
 * Deterministic within an observation window; sampling must never roll a new
 * supernatural event, authorize evidence, or reveal the hidden ghost identity.
 * This class is a source foundation, not yet wired into the legacy three-tool scans.
 */
public final class EvidenceSignals {
    private EvidenceSignals() { }
    public enum Season { WINTER, SPRING, SUMMER, AUTUMN }
    public enum Weather { CLEAR, RAIN, SNOW, HEATWAVE }
    public enum Polarity { NONE, COLD, HOT }
    public enum Unit { CELSIUS, FAHRENHEIT }
    public record Location(Season season, Weather weather, int hour, int room,
                           boolean indoors, boolean heatingOn) {
        public Location {
            Objects.requireNonNull(season); Objects.requireNonNull(weather);
            if(hour<0||hour>23||room<0)throw new IllegalArgumentException("invalid climate context");
        }
    }
    public record Temperature(double celsius, double ambientCelsius,
                              boolean paranormalExtreme) {
        public Temperature {
            if(!Double.isFinite(celsius)||!Double.isFinite(ambientCelsius))
                throw new IllegalArgumentException("non-finite temperature");
        }
        public double display(Unit unit){
            Objects.requireNonNull(unit);
            return unit==Unit.CELSIUS?celsius:cToF(celsius);
        }
        public String displayText(Unit unit){
            return String.format(Locale.ROOT,"%.1f%s",display(unit),
                unit==Unit.CELSIUS?"°C":"°F");
        }
    }
    public record Electromagnetic(int level, boolean positiveEvidence, boolean suppressed) {
        public Electromagnetic {
            if(level<0||level>10||(level==0)!=suppressed
                    ||positiveEvidence&&(level<=6||suppressed))
                throw new IllegalArgumentException("invalid EMF");
        }
        public Electromagnetic(int level,boolean positiveEvidence){
            this(level,positiveEvidence,false);
        }
    }
    /** A zero reading is abnormal only if a live, powered meter observes a genuine
     * suppression event. Absence of high EMF is NOT evidence of spectral silence.
     */
    public static final class QuietFieldTracker {
        private int lastTick=-1,firstTick=-1,room=-1,count;
        public int observe(int tick,int observedRoom,Electromagnetic sample){
            if(tick<0||observedRoom<0||sample==null)
                throw new IllegalArgumentException("invalid quiet-field observation");
            if(!sample.suppressed()){
                room=-1;count=0;lastTick=-1;firstTick=-1;return 0;
            }
            if(room!=observedRoom||tick-lastTick>40){
                room=observedRoom;firstTick=tick;lastTick=tick;count=1;return 1;
            }
            if(tick-lastTick>=5){lastTick=tick;count=Math.min(3,count+1);}
            return count>=3&&tick-firstTick>=10?3:count;
        }
    }
    public static double cToF(double c){return c*9.0/5.0+32.0;}
    public static double fToC(double f){return (f-32.0)*5.0/9.0;}
    private static int hash(long seed,int room,int window){
        long x=seed+0x9e3779b97f4a7c15L*(room+1L)
            +0xc2b2ae3d27d4eb4fL*(window+1L);
        x^=x>>>30;x*=0xbf58476d1ce4e5b9L;
        x^=x>>>27;x*=0x94d049bb133111ebL;x^=x>>>31;
        return (int)(x&0x7fffffff);
    }
    /** 1..10 activity; >6 is positive ONLY for a genuine local ghost event. */
    public static Electromagnetic emf(long seed,int tick,int room,
                                    int eventRoom,int eventStrength){
        return emf(seed,tick,room,eventRoom,eventStrength,false);
    }
    public static Electromagnetic emf(long seed,int tick,int room,
                                    int eventRoom,int eventStrength,boolean suppression){
        if(tick<0||room<0||eventStrength<0||eventStrength>10)
            throw new IllegalArgumentException("invalid EMF context");
        int ambient=1+hash(seed,room,tick/5)%4;
        boolean local=room==eventRoom&&eventStrength>0;
        // Cancellation is a real entity action, not failure to detect an ordinary event.
        if(local&&suppression)return new Electromagnetic(0,false,true);
        int level=Math.min(10,ambient+(local?(eventStrength*7+5)/10:0));
        return new Electromagnetic(level,local&&level>6,false);
    }
    /** Seasonal/weather/time baseline, applied to both outside and indoor air. */
    public static double ambientC(Location place){
        Objects.requireNonNull(place);
        double outside=switch(place.season()){
            case WINTER->-8.0;case SPRING->10.0;case SUMMER->24.0;case AUTUMN->11.0;
        };
        outside+=switch(place.weather()){
            case CLEAR->0.0;case RAIN->-3.0;case SNOW->-5.0;case HEATWAVE->9.0;
        };
        outside+=place.hour()>=11&&place.hour()<=17?3.0:
                 place.hour()<=5||place.hour()>=21?-4.0:0.0;
        if(!place.indoors())return outside;
        double interior=place.heatingOn()?outside+(20.0-outside)*0.8:
                          outside+(19.0-outside)*0.22;
        // Room-level offsets: insulation, draft and adjoining heat sources.
        return interior+(hash(0x5eeDL,place.room(),0)%7-3)*0.55;
    }
    /**
     * Temperature changes over time rather than being a static room-type code.
     * Cold/hot supernatural rooms hold an extreme relative to their baseline.
     * Ordinary winter freezing by itself is not paranormal evidence.
     */
    public static Temperature temperature(long seed,int tick,Location place,
            Polarity polarity,boolean hauntedRoom,int eventStrength){
        if(tick<0||eventStrength<0||eventStrength>10)
            throw new IllegalArgumentException("invalid thermal context");
        Objects.requireNonNull(polarity);
        double ambient=ambientC(place);
        double drift=(hash(seed,place.room(),tick/30)%21-10)*0.09;
        double actual=ambient+drift;
        if(hauntedRoom&&polarity==Polarity.COLD)
            actual=Math.min(actual-10.0-(eventStrength*0.35),-3.5+drift);
        else if(hauntedRoom&&polarity==Polarity.HOT)
            actual=Math.max(actual+14.0+(eventStrength*0.4),35.5+drift);
        boolean extreme=(polarity==Polarity.COLD&&actual<0.0
                        ||polarity==Polarity.HOT&&cToF(actual)>=90.0)
                        &&hauntedRoom&&Math.abs(actual-ambient)>=8.0;
        return new Temperature(actual,ambient,extreme);
    }
}
