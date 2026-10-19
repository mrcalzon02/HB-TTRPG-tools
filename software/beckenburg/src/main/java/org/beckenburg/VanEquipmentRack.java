package org.beckenburg;

/** Physical van shelf sockets. Pickup selection is based on actual camera aim, never a modal list. */
public final class VanEquipmentRack {
    private VanEquipmentRack(){}
    public record Socket(EquipmentLoadout.Item item,double x,double z){ }
    public static Socket socket(VanStaging van,EquipmentLoadout.Item item){
        if(van==null||item==null)throw new IllegalArgumentException("rack socket");
        int index=item.ordinal();
        // Six real instrument hooks along the enlarged left equipment wall.
        // This is the solo-game subset; LAN racks use the complete tier catalog.
        VanStaging.Position pos=van.world(-1.60,-2.72+index*1.05);
        return new Socket(item,pos.x(),pos.z());
    }
    public static EquipmentLoadout.Item aimed(VanStaging van,double playerX,double playerZ,double yaw){
        return aimed(van,playerX,playerZ,yaw,java.util.EnumSet.allOf(EquipmentLoadout.Item.class));
    }
    public static EquipmentLoadout.Item aimed(VanStaging van,double playerX,double playerZ,double yaw,
            java.util.Set<EquipmentLoadout.Item> available){
        if(van==null||!Double.isFinite(yaw))return null;
        var local=van.local(playerX,playerZ);
        if(Math.abs(local.x())>=VanStaging.HALF_WIDTH-.17||local.z()<VanStaging.FRONT-.2||local.z()>VanStaging.REAR-.17)return null;
        double best=.80;EquipmentLoadout.Item found=null;
        for(EquipmentLoadout.Item item:EquipmentLoadout.Item.values()){
            if(!available.contains(item))continue;
            Socket socket=socket(van,item);
            double dx=socket.x-playerX,dz=socket.z-playerZ;
            double distance=Math.hypot(dx,dz);
            if(distance>.60&&distance<=2.45){
                double forward=(dx*Math.sin(yaw)+dz*Math.cos(yaw))/distance;
                if(forward>Math.cos(Math.toRadians(14)) && forward>best){
                    best=forward;found=item;
                }
            }
        }
        return found;
    }
}