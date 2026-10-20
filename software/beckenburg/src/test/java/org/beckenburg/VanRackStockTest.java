package org.beckenburg;
import java.util.*;
/** Exact physical quantities, no hidden stock, native dimensions and bounded atomic replay. */
public final class VanRackStockTest {
    static void check(boolean value,String why){if(!value)throw new AssertionError(why);}
    static int count(List<VanRackStock.Entry> stock,String id){return stock.stream().filter(e->e.id().equals(id)).mapToInt(VanRackStock.Entry::count).sum();}
    static List<VanRackStock.Entry> fullStock(EquipmentTiers.Tier requested){
        FieldEquipment[] gear=new FieldEquipment[6];FieldSupplies[] medicine=new FieldSupplies[6];boolean[] present=new boolean[6];
        for(int i=0;i<6;i++){
            gear[i]=new FieldEquipment();medicine[i]=new FieldSupplies();present[i]=true;medicine[i].reward(20000);
            for(var kind:FieldSupplies.Kind.values())for(var tier:FieldSupplies.Tier.values())for(int n=0;n<4;n++)check(medicine[i].purchase(kind,tier),"maximum legal medicine stock");
            for(String id:FieldEquipment.workingTools())for(int n=1;n<=requested.ordinal();n++)gear[i].upgrade(id,EquipmentTiers.Tier.values()[n]);
        }return VanRackStock.aggregate(gear,medicine,new HunterCounters(),present);
    }
    static void packing(List<VanRackStock.Entry> stock){
        var placed=VanRackStock.place(stock);check(placed.size()==stock.stream().mapToInt(VanRackStock.Entry::count).sum(),"one physical mesh for every actual stock unit");
        List<double[]> volumes=new ArrayList<>();
        for(var p:placed){
            var b=p.bounds();double[] lo={1e9,1e9,1e9},hi={-1e9,-1e9,-1e9};
            for(double x:new double[]{b.x0(),b.x1()})for(double y:new double[]{b.y0(),b.y1()})for(double z:new double[]{b.z0(),b.z1()}){
                var v=p.vertex(new GlbProps.Vertex(x,y,z,0,0));double[] q={v.x(),v.y(),v.z()};for(int n=0;n<3;n++){lo[n]=Math.min(lo[n],q[n]);hi[n]=Math.max(hi[n],q[n]);}
            }
            check(lo[0]>-VanStaging.INTERIOR_HALF_WIDTH&&hi[0]<=-.51+.001&&lo[1]>VanStaging.FLOOR_Y&&hi[1]<VanInteriorLayout.ROOF_Y&&lo[2]>=-1.941&&hi[2]<=1.541,"stored model must fit actual shelves and leave aisle clear");
            double[] nativeSize={b.x1()-b.x0(),b.y1()-b.y0(),b.z1()-b.z0()},placedSize={hi[0]-lo[0],hi[1]-lo[1],hi[2]-lo[2]};Arrays.sort(nativeSize);Arrays.sort(placedSize);
            for(int n=0;n<3;n++)check(Math.abs(nativeSize[n]-placedSize[n])<1e-7,"stock must retain native metres, without shrinking");
            for(double[] other:volumes)check(!(lo[0]<other[3]-.001&&hi[0]>other[0]+.001&&lo[1]<other[4]-.001&&hi[1]>other[1]+.001&&lo[2]<other[5]-.001&&hi[2]>other[2]+.001),"physical stock meshes overlap");
            volumes.add(new double[]{lo[0],lo[1],lo[2],hi[0],hi[1],hi[2]});
        }System.out.println("PASS native-sized shelf packing: "+placed.size()+" independently visible inventory units");
    }
    public static void main(String[] args){
        var gear=new FieldEquipment[]{new FieldEquipment(),new FieldEquipment()};var medicine=new FieldSupplies[]{new FieldSupplies(),new FieldSupplies()};var counters=new HunterCounters();boolean[] present={true,true};
        var initial=VanRackStock.aggregate(gear,medicine,counters,present);
        check(count(initial,"EMF_READER")==0,"carried instruments must leave the rack");check(count(initial,"FLASHLIGHT")==2,"two owned uncarried torches require two models");
        gear[0].equip(0,"FLASHLIGHT");medicine[0].purchase(FieldSupplies.Kind.HEALTH,FieldSupplies.Tier.BASIC);medicine[0].purchase(FieldSupplies.Kind.HEALTH,FieldSupplies.Tier.BASIC);
        var changed=VanRackStock.aggregate(gear,medicine,counters,present);check(count(changed,"EMF_READER")==1&&count(changed,"FLASHLIGHT")==1,"equip must return old hardware and remove new hardware");check(count(changed,"HEALTH_SUPPLIES")==2,"purchased medicine quantities");
        medicine[0].consume(FieldSupplies.Kind.HEALTH,FieldSupplies.Tier.BASIC);check(count(VanRackStock.aggregate(gear,medicine,counters,present),"HEALTH_SUPPLIES")==1,"consumed supplies must disappear individually");
        packing(initial);packing(changed);for(var tier:EquipmentTiers.Tier.values())packing(fullStock(tier));
        var receiver=new VanRackStock.Receiver();var frames=VanRackStock.frames(changed,50);
        for(int n=0;n<frames.size()-1;n++){receiver.accept(LanProtocol.parts(frames.get(n)));check(receiver.stock().isEmpty(),"partial update must not replace shelf stock");}
        receiver.accept(LanProtocol.parts(frames.get(frames.size()-1)));check(receiver.stock().equals(changed),"late-join snapshot must reproduce exact quantities");
        // The actual source screen's baked yaw/tilt must be removed, without UV edits.
        var model=GlbProps.model("monitoring_screen_mp_1");int material=model.triangles().stream().mapToInt(GlbProps.Triangle::material).max().orElseThrow();
        var t=model.triangles().stream().filter(q->q.material()==material).findFirst().orElseThrow();
        var a=VanInteriorLayout.vertex("monitoring_screen_mp_1",t.a());var b=VanInteriorLayout.vertex("monitoring_screen_mp_1",t.b());var c=VanInteriorLayout.vertex("monitoring_screen_mp_1",t.c());
        check(Math.abs(a.z()-b.z())<.00002&&Math.abs(a.z()-c.z())<.00002,"screen must face straight outward");check(a.y()>b.y()&&c.x()>b.x(),"screen must remain upright and readable");
        check(a.u()==t.a().u()&&a.v()==t.a().v(),"screen UVs must remain unchanged");
        System.out.println("PASS real stock arithmetic, equip/return, medicine consumption, atomic quantities and upright front-facing CRT geometry");
    }
}
