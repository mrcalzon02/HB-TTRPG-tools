package org.beckenburg;

public final class CameraAimTest {
    private static void ok(boolean b,String reason){if(!b)throw new AssertionError(reason);}
    public static void main(String[] args){
        ok(CameraAim.onTarget(0,0,0,0,3),"target ahead in frame");
        ok(!CameraAim.onTarget(0,0,0,3,0),"target to side not photographed");
        ok(!CameraAim.onTarget(0,0,0,0,-3),"target behind photographer not captured");
        ok(CameraAim.onTarget(0,0,Math.PI/2,3,0),"camera yaw rotates the capture cone");
        ok(!CameraAim.onTarget(0,0,0,0,5),"distant target cannot be captured");
        ok(!CameraAim.onTarget(0,0,Double.NaN,0,3),"malformed camera yaw rejected");
        System.out.println("PASS: actual photograph requires camera facing and range");
    }
}