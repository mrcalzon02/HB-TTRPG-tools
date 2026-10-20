package org.beckenburg;

import java.util.Arrays;
import java.util.PriorityQueue;

/** Host-side acoustic propagation through authored thresholds and stair openings. */
public final class LanAcoustics {
    private LanAcoustics() { }

    /** Ghost-hearing route: extraction occupants never become ghost AI targets. */
    public static int edgeCost(HouseMap map, int from, int to) {
        if(from==HouseMap.EXTRACTION_ROOM||to==HouseMap.EXTRACTION_ROOM)return Integer.MAX_VALUE;
        return physicalEdgeCost(map,from,to);
    }
    /** Real propagation includes the van for speech, machinery and other mundane sounds.
     * Doors attenuate in their actual state; a stair opening never acts like a solid deck. */
    public static int physicalEdgeCost(HouseMap map,int from,int to){
        if(!valid(map,from)||!valid(map,to))return Integer.MAX_VALUE;
        int best=Integer.MAX_VALUE;
        for(LevelDefinition.Portal portal:map.level().portals()){
            if(!portal.joins(from,to))continue;
            int loss=Math.max(1,(int)Math.ceil(portal.loss()));
            if(portal.door()&&!map.doorOpen(portal.id()))loss+=2;
            if(portal.kind().equals("window")&&!map.windowOpen(portal.id()))loss+=2;
            loss+=Math.max(absorption(map.level().room(from).acoustic()),
                absorption(map.level().room(to).acoustic()));
            if(map.outside(from)!=map.outside(to))loss++;
            best=Math.min(best,loss);
        }
        return best;
    }
    private static int absorption(String material){
        if(material==null)return 0;
        String name=material.toLowerCase(java.util.Locale.ROOT);
        // Masonry rooms retain a longer audible tail; upholstered spaces absorb a threshold.
        return name.contains("carpet")||name.contains("soft")||name.contains("upholster")?1:0;
    }
    private static boolean valid(HouseMap map,int room){
        return map!=null&&room>=0&&room<map.roomCount();
    }
    /** Lowest-cost route for ghost hearing; excludes the safe expedition van. */
    public static int cost(HouseMap map,int from,int to){return route(map,from,to,false);}
    public static int physicalCost(HouseMap map,int from,int to){return route(map,from,to,true);}
    private static int route(HouseMap map,int from,int to,boolean includeVan){
        if(!valid(map,from)||!valid(map,to)||!includeVan&&
                (from==HouseMap.EXTRACTION_ROOM||to==HouseMap.EXTRACTION_ROOM))return Integer.MAX_VALUE;
        int[] best = new int[map.roomCount()];
        Arrays.fill(best, Integer.MAX_VALUE);
        best[from] = 0;
        PriorityQueue<int[]> queue = new PriorityQueue<>((a,b) -> Integer.compare(a[1], b[1]));
        queue.add(new int[]{from, 0});
        while (!queue.isEmpty()) {
            int[] state = queue.poll();
            if (state[1] != best[state[0]]) continue;
            if (state[0] == to) return state[1];
            for (LevelDefinition.Portal portal:map.level().portalsFrom(state[0])) {
                int next=portal.a()==state[0]?portal.b():portal.a();
                int edge = includeVan?physicalEdgeCost(map,state[0],next):edgeCost(map,state[0],next);
                if (edge == Integer.MAX_VALUE || state[1] > Integer.MAX_VALUE-edge) continue;
                int value = state[1] + edge;
                if (value < best[next]) { best[next] = value; queue.add(new int[]{next,value}); }
            }
        }
        return Integer.MAX_VALUE;
    }
    /** Outdoor storms mask footsteps, speech and equipment, including ghost AI hearing. */
    public static boolean audible(HouseMap map,int from,int to,LanGhostPursuit.Sound sound,
            MissionWeather.State weather){
        if(sound==null||weather==null||!valid(map,from)||!valid(map,to))return false;
        int masking=weather.noiseMask()/4;
        if(map.outside(from)||map.outside(to))masking*=2;
        return cost(map,from,to)<=Math.max(0,sound.budget-masking);
    }
    public static boolean audible(HouseMap map, int from, int to, LanGhostPursuit.Sound sound) {
        return sound != null && cost(map, from, to) <= sound.budget;
    }
}
