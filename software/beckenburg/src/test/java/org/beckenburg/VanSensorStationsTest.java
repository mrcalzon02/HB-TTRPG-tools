package org.beckenburg;

import java.util.List;

/** Deterministic host station lifecycle, capacity, and privacy protocol checks. */
public final class VanSensorStationsTest {
    private static void ok(boolean value,String detail){
        if(!value)throw new AssertionError(detail);
    }
    private static void fails(Runnable run,String label){
        try{run.run();throw new AssertionError(label);}catch(IllegalArgumentException expected){}
    }
    public static void main(String[] args){
        VanSensorStations stations=new VanSensorStations();
        ok(VanSensorStations.capacity("EMF_ARRAY",EquipmentTiers.Tier.I)==2,"two EMF probes");
        ok(VanSensorStations.capacity("EMF_ARRAY",EquipmentTiers.Tier.III)==5,"five EMF probes");
        ok(VanSensorStations.capacity("THERMAL_BEACON",EquipmentTiers.Tier.II)==4,"four thermal probes");
        ok(VanSensorStations.capacity("THERMAL_BEACON",EquipmentTiers.Tier.III)==6,"six thermal probes");
        var a=stations.placeOrRetrieve(0,"THERMAL_BEACON",1,4,4,EquipmentTiers.Tier.I);
        ok(a.removed()==null&&a.placed().room()==1,"physical placement");
        ok(a.placed().frame().split("\\|").length==9,"bounded, spatial network packet");
        ok(a.placed().model().equals("blender_thermal_beacon_1_node"),"authored node housing");
        var b=stations.placeOrRetrieve(0,"THERMAL_BEACON",2,8,6,EquipmentTiers.Tier.I);
        fails(()->stations.placeOrRetrieve(0,"THERMAL_BEACON",3,10,7,EquipmentTiers.Tier.I),
            "Tier I cannot create a third free node");
        ok(stations.count(0,"THERMAL_BEACON")==2,"full array retains both");
        var other=stations.placeOrRetrieve(1,"THERMAL_BEACON",2,8,6,EquipmentTiers.Tier.I);
        ok(other.placed()!=null,"other hunter gets independent sensor allocation");
        var removed=stations.placeOrRetrieve(0,"THERMAL_BEACON",1,4.2,4.1,EquipmentTiers.Tier.I);
        ok(removed.removed().id()==a.placed().id(),"pickup retrieves same physical node");
        ok(stations.at(a.placed().id())==null,"removed station absent from world");
        stations.placeOrRetrieve(0,"THERMAL_BEACON",3,10,7,EquipmentTiers.Tier.I);
        ok(stations.count(0,"THERMAL_BEACON")==2,"freed slot deploys again");
        stations.placeOrRetrieve(0,"EMF_ARRAY",3,10,7,EquipmentTiers.Tier.I);
        ok(stations.count(0,"EMF_ARRAY")==1,"separate arrays can coexist");
        fails(()->stations.placeOrRetrieve(0,"EMF_ARRAY",HouseMap.INDOOR_ROOMS,1,1,EquipmentTiers.Tier.I),
            "outdoors station rejected");
        List<String> frames=stations.snapshot();
        ok(frames.get(0).equals("SENSOR|RESET")&&frames.size()==5,"snapshot replays all nodes");
        ok(frames.stream().allMatch(s->!s.contains("GTYPE")&&!s.contains("POSSESSIVE")),
            "telemetry never embeds hidden ghost identity");
        LanCase caseFile=new LanCase(0);
        caseFile.configure(GhostIdentity.Type.SPIRIT,true);
        var emf=caseFile.stationMeasured(LanCase.Tool.EMF,1,2,30,-1,0);
        var thermal=caseFile.stationMeasured(LanCase.Tool.THERMOMETER,1,2,30,-1,0);
        ok(emf.accepted()&&emf.message().contains("EMF "),"unattended EMF station measures its room");
        ok(thermal.accepted()&&thermal.message().contains("Air "),"unattended thermal station measures its room");
        ok(!caseFile.stationMeasured(LanCase.Tool.SPIRIT_BOX,1,2,30,-1,0).accepted(),
            "ordinary sensor network cannot invent spirit replies");
        System.out.println("PASS: sensor placement, pickup, tier limits, coexisting nodes and bounded frames");
    }
}
