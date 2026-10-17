package org.beckenburg;

/** Camera view alignment follows SceneRenderer's yaw convention (zero = positive Z). */
public final class CameraAim {
    private CameraAim(){}
    public static boolean onTarget(double x,double z,double yaw,double targetX,double targetZ){
        if(!Double.isFinite(x)||!Double.isFinite(z)||!Double.isFinite(yaw)
                ||!Double.isFinite(targetX)||!Double.isFinite(targetZ))return false;
        double dx=targetX-x,dz=targetZ-z,distance=Math.hypot(dx,dz);
        return distance>=.25 && distance<=4.5
            && (dx*Math.sin(yaw)+dz*Math.cos(yaw))/distance>=Math.cos(Math.toRadians(34));
    }
}