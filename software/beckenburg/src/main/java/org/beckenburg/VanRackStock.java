package org.beckenburg;
import java.util.*;

/** Physical remaining stock, not a catalog display. One placed mesh per actual unit. */
public final class VanRackStock {
    private VanRackStock(){}
    public record Entry(String id,EquipmentTiers.Tier tier,int count){
        public Entry{
            Objects.requireNonNull(tier);
            if(!(FieldEquipment.functional(id)||Set.of("SALT","CRUCIFIX","WARD","HEALTH_SUPPLIES","SANITY_MEDICATION").contains(id))||count<1||count>48)
                throw new IllegalArgumentException("invalid physical rack stock");
        }
        public String model(){return EquipmentModelCatalog.model(id.equals("WARD")?"CHALK_SIGIL_KIT":id,tier);}
    }
    private static void add(Map<String,Entry> result,String id,EquipmentTiers.Tier tier,int count){
        if(count<=0)return;String key=id+":"+tier;Entry old=result.get(key);result.put(key,new Entry(id,tier,count+(old==null?0:old.count)));
    }
    public static List<Entry> aggregate(FieldEquipment[] gear,FieldSupplies[] medicine,HunterCounters counters,boolean[] present){
        Map<String,Entry> result=new TreeMap<>();
        for(int seat=0;seat<present.length;seat++)if(present[seat]){
            var g=gear[seat];Set<String> carried=new HashSet<>();for(int slot=0;slot<FieldEquipment.SLOTS;slot++)carried.add(g.at(slot));
            for(String id:FieldEquipment.workingTools())if(!carried.contains(id)&&g.owned(id)!=null
                    &&!(Set.of("INCENSE","CHALK_SIGIL_KIT").contains(id)&&g.remaining(id)==0))add(result,id,g.owned(id),1);
            for(var kind:FieldSupplies.Kind.values())for(var tier:FieldSupplies.Tier.values())
                add(result,kind==FieldSupplies.Kind.HEALTH?"HEALTH_SUPPLIES":"SANITY_MEDICATION",EquipmentTiers.Tier.values()[tier.ordinal()],medicine[seat].stock(kind,tier));
            add(result,"CRUCIFIX",EquipmentTiers.Tier.I,counters.charges(seat,HunterCounters.Kind.CROSS));
            add(result,"WARD",EquipmentTiers.Tier.I,counters.charges(seat,HunterCounters.Kind.WARD));
            add(result,"SALT",EquipmentTiers.Tier.I,counters.charges(seat,HunterCounters.Kind.SALT));
        }return List.copyOf(result.values());
    }
    public static List<Entry> solo(ProfileStore profile,EquipmentLoadout loadout){
        Map<String,Entry> result=new TreeMap<>();Set<EquipmentLoadout.Item> carried=EnumSet.noneOf(EquipmentLoadout.Item.class);
        for(int slot=0;slot<EquipmentLoadout.SLOTS;slot++)carried.add(loadout.at(slot));
        for(var item:profile.equipment()){
            String id=switch(item){case EMF->"EMF_READER";case THERMOMETER->"THERMOMETER";case SPIRIT_BOX->"SPIRIT_BOX";case UV_LAMP->"UV_LIGHT";case PHOTO_CAMERA->"PHOTO_CAMERA";case SALT->"SALT";};
            add(result,id,EquipmentTiers.Tier.I,item==EquipmentLoadout.Item.SALT?Math.max(0,loadout.usesLeft(item)-(carried.contains(item)?1:0)):carried.contains(item)?0:1);
        }
        for(var kind:FieldSupplies.Kind.values())for(var tier:FieldSupplies.Tier.values())add(result,kind==FieldSupplies.Kind.HEALTH?"HEALTH_SUPPLIES":"SANITY_MEDICATION",EquipmentTiers.Tier.values()[tier.ordinal()],profile.supplyCount(kind,tier));
        return List.copyOf(result.values());
    }
    public record Placed(Entry entry,int unit,double x,double y,double z,int axisX,int axisY,int axisZ,int signX,VanInteriorLayout.Bounds bounds){
        public GlbProps.Vertex vertex(GlbProps.Vertex v){
            double[] p={v.x()-(bounds.x0()+bounds.x1())/2,v.y()-(bounds.y0()+bounds.y1())/2,v.z()-(bounds.z0()+bounds.z1())/2};
            return new GlbProps.Vertex(x+signX*p[axisX],y+p[axisY],z+p[axisZ],v.u(),v.v());
        }
    }
    private record Box(double x,double y,double z,double depth,double height,double length,int shelf){}
    private record Unit(Entry entry,int number,VanInteriorLayout.Bounds bounds,int ax,int ay,int az,int sign,double d,double h,double w){}
    /** Native rigid rotations lay each item on a broad face; no miniaturizing to inflate capacity. */
    public static List<Placed> place(List<Entry> stock){
        List<Unit> units=new ArrayList<>();
        for(Entry e:stock){
            var b=VanInteriorLayout.bounds(e.model());double[] size={b.x1()-b.x0(),b.y1()-b.y0(),b.z1()-b.z0()};
            Integer[] axes={0,1,2};Arrays.sort(axes,Comparator.comparingDouble(i->size[i]));int ay=axes[0],ax=axes[1],az=axes[2];
            int inversions=(ax>ay?1:0)+(ax>az?1:0)+(ay>az?1:0),sign=inversions%2==0?1:-1;
            for(int n=0;n<e.count;n++)units.add(new Unit(e,n,b,ax,ay,az,sign,size[ax],size[ay],size[az]));
        }
        units.sort(Comparator.<Unit>comparingDouble(u->-u.d*u.h*u.w).thenComparing(u->u.entry.id).thenComparing(u->u.entry.tier).thenComparingInt(u->u.number));
        List<Box> free=new ArrayList<>();
        for(int row=0;row<6;row++){
            double y=VanStaging.FLOOR_Y+.14+row*.33,top=y+.315;
            double t=Math.max(0,(top-VanStaging.ROOF_SHOULDER_Y)/(VanInteriorLayout.ROOF_Y-VanStaging.ROOF_SHOULDER_Y));
            double back=-VanStaging.INTERIOR_HALF_WIDTH+t*(VanStaging.INTERIOR_HALF_WIDTH-VanStaging.INTERIOR_ROOF_HALF_WIDTH)+.025;
            free.add(new Box(back,y,-1.94,-.51-back,.315,3.48,row));
        }
        List<Placed> placed=new ArrayList<>();final double gap=.008;
        for(Unit u:units){
            Box best=null;double waste=Double.POSITIVE_INFINITY;
            for(Box b:free)if(u.d<=b.depth&&u.h<=b.height&&u.w<=b.length){int priority=switch(b.shelf){case 2->0;case 1->1;case 3->2;case 0->3;case 4->4;default->5;};double unused=100*priority+b.depth*b.height*b.length-u.d*u.h*u.w;if(unused<waste){best=b;waste=unused;}}
            if(best==null)throw new IllegalStateException("Physical van storage full: "+u.entry.id+" unit "+u.number);
            free.remove(best);placed.add(new Placed(u.entry,u.number,best.x+u.d/2,best.y+u.h/2,best.z+u.w/2,u.ax,u.ay,u.az,u.sign,u.bounds));
            if(best.length-u.w>gap)free.add(new Box(best.x,best.y,best.z+u.w+gap,best.depth,best.height,best.length-u.w-gap,best.shelf));
            if(best.depth-u.d>gap)free.add(new Box(best.x+u.d+gap,best.y,best.z,best.depth-u.d-gap,best.height,u.w,best.shelf));
            if(best.height-u.h>gap)free.add(new Box(best.x,best.y+u.h+gap,best.z,u.d,best.height-u.h-gap,u.w,best.shelf));
        }return List.copyOf(placed);
    }
    public static List<String> frames(List<Entry> stock,int revision){
        List<String> out=new ArrayList<>();out.add("RACKBEGIN|"+revision);
        for(Entry e:stock)out.add("RACKUNIT|"+e.id+"|"+e.tier+"|"+e.count);
        out.add("RACKEND|"+revision);return out;
    }
    public static final class Receiver{
        private int version=-1,pending=-1,ignored=-1;private List<Entry> stock=List.of();private final Map<String,Entry> next=new TreeMap<>();
        public List<Entry> stock(){return stock;}
        public void reset(){version=pending=ignored=-1;stock=List.of();next.clear();}
        public boolean accept(List<String> p){
            if(p.get(0).equals("RACKBEGIN")&&p.size()==2){int v=LanProtocol.integer(p.get(1),0,99999999);if(v<version){ignored=v;pending=-1;next.clear();return true;}ignored=-1;pending=v;next.clear();return true;}
            if(p.get(0).equals("RACKUNIT")&&p.size()==4){if(ignored>=0)return true;if(pending<0)throw new IllegalArgumentException("rack without snapshot");Entry e=new Entry(p.get(1),EquipmentTiers.Tier.valueOf(p.get(2)),LanProtocol.integer(p.get(3),1,48));if(next.size()>=128||next.putIfAbsent(e.id+":"+e.tier,e)!=null)throw new IllegalArgumentException("duplicate/excess rack stock");return true;}
            if(p.get(0).equals("RACKEND")&&p.size()==2){if(ignored==LanProtocol.integer(p.get(1),0,99999999)){ignored=-1;return true;}if(pending!=LanProtocol.integer(p.get(1),0,99999999))throw new IllegalArgumentException("incomplete rack snapshot");stock=List.copyOf(next.values());version=pending;pending=-1;return true;}
            return false;
        }
    }
}
