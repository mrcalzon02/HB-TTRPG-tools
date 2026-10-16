package org.beckenburg;

import java.util.ArrayList;
import java.util.List;

/** Host-ready, location-based callouts. No remote transport exists in this alpha. */
public final class TeamCallout {
    private TeamCallout() { }
    public enum Phrase {
        HERE("Here!", "HERE"), THERE("Over there!", "THERE"),
        DANGER("Danger, watch out!", "DANGER"), HOLD("Hold here.", "HOLD"),
        DONT_GO("Don't go there!", "DON'T"), FOLLOW("Follow me.", "FOLLOW"),
        EVIDENCE("Evidence here.", "EVIDENCE"), HELP("I need help!", "HELP");
        public final String spoken, label;
        Phrase(String spoken, String label) { this.spoken=spoken; this.label=label; }
    }
    public record Ping(long id, int sender, Phrase phrase, double x, double z, int zone, int expiresTick) { }
    public record Request(int sender, Phrase phrase, double originX, double originZ, double targetX, double targetZ, int tick) { }

    /** Ordered, rate-limited local event queue; server must supply verified origin on LAN. */
    public static final class Board {
        private static final double RANGE=18.0;
        private static final int COOLDOWN_TICKS=12, TTL_TICKS=90;
        private final HouseMap map;
        private final ArrayList<Ping> live=new ArrayList<>();
        private final java.util.Map<Integer,Integer> lastTick=new java.util.HashMap<>();
        private long nextId=1;
        public Board(HouseMap map) { this.map=java.util.Objects.requireNonNull(map); }
        public List<Ping> visible(int tick) {
            live.removeIf(p->p.expiresTick()<=tick);
            return List.copyOf(live);
        }
        public Ping submit(Request request) {
            if(request==null || request.sender()<0 || request.phrase()==null || request.tick()<0) return null;
            if(!Double.isFinite(request.originX())||!Double.isFinite(request.originZ())||
               !Double.isFinite(request.targetX())||!Double.isFinite(request.targetZ()))return null;
            if(!map.traversable(request.originX(),request.originZ()) ||
               !map.traversable(request.targetX(),request.targetZ()))return null;
            if(Math.hypot(request.originX()-request.targetX(),request.originZ()-request.targetZ())>RANGE)return null;
            if(!lineClear(map,request.originX(),request.originZ(),request.targetX(),request.targetZ()))return null;
            int prev=lastTick.getOrDefault(request.sender(),-COOLDOWN_TICKS);
            if(request.tick()<prev || request.tick()-prev<COOLDOWN_TICKS)return null;
            lastTick.put(request.sender(),request.tick());
            visible(request.tick());
            Ping ping=new Ping(nextId++,request.sender(),request.phrase(),request.targetX(),request.targetZ(),
                map.roomAt(request.targetX(),request.targetZ()),request.tick()+TTL_TICKS);
            live.add(ping);
            if(live.size()>16)live.remove(0);
            return ping;
        }
    }
    public static boolean lineClear(HouseMap map,double ox,double oz,double tx,double tz) {
        double distance=Math.hypot(tx-ox,tz-oz);
        int steps=Math.max(1,(int)Math.ceil(distance/.12));
        for(int i=0;i<=steps;i++) {
            double a=(double)i/steps;
            if(!map.traversable(ox+(tx-ox)*a,oz+(tz-oz)*a))return false;
        }
        return true;
    }
    /** Ray stops before the first solid tile, so an investigator cannot tag a hidden room through walls. */
    public static double[] aim(HouseMap map,double x,double z,double yaw,double range) {
        if(!Double.isFinite(yaw)||!Double.isFinite(range)||range<0||!map.traversable(x,z))return new double[]{x,z};
        double dx=Math.sin(yaw),dz=Math.cos(yaw),bestX=x,bestZ=z;
        for(double d=.12;d<=Math.min(18,range);d+=.12) {
            double nextX=x+dx*d,nextZ=z+dz*d;
            if(!map.traversable(nextX,nextZ))break;
            bestX=nextX;bestZ=nextZ;
        }
        return new double[]{bestX,bestZ};
    }
    /** Slot selection from the held-mouse delta. Center cancels; diagonal slots are distinct. */
    public static Phrase choose(double deltaX,double deltaY) {
        if(!Double.isFinite(deltaX)||!Double.isFinite(deltaY)||Math.hypot(deltaX,deltaY)<22)return null;
        double angle=Math.atan2(-deltaY,deltaX);
        int sector=((int)Math.round(angle/(Math.PI/4))+8)%8;
        return switch(sector) {
            case 0 -> Phrase.THERE;
            case 1 -> Phrase.DANGER;
            case 2 -> Phrase.HOLD;
            case 3 -> Phrase.DONT_GO;
            case 4 -> Phrase.HERE;
            case 5 -> Phrase.FOLLOW;
            case 6 -> Phrase.EVIDENCE;
            default -> Phrase.HELP;
        };
    }
}
