package org.beckenburg;

/** glTF geometry, screen projection and controls share a right-handed world. */
public final class WorldViewHandednessTest {
    static double projectedX(SceneRenderer camera,double x,double z)throws Exception{
        Class<?> point=Class.forName("org.beckenburg.SceneRenderer$Point");
        var ctor=point.getDeclaredConstructor(double.class,double.class,double.class);ctor.setAccessible(true);
        var projection=SceneRenderer.class.getDeclaredMethod("camera",point);projection.setAccessible(true);
        Object p=projection.invoke(camera,ctor.newInstance(x,camera.eyeHeight,z));
        var accessor=point.getDeclaredMethod("x");accessor.setAccessible(true);return (Double)accessor.invoke(p);
    }
    public static void main(String[] args)throws Exception{
        SceneRenderer view=new SceneRenderer();view.x=0;view.z=0;view.yaw=Math.PI;view.pitch=0;
        check(projectedX(view,1,-5)>0,"model's +X must appear on the right when viewed from +Z; lettering must not mirror");
        view.yaw=0;check(projectedX(view,-1,5)>0,"right strafe follows forward cross up");
        MouseLook.rotate(view,100,0);check(projectedX(view,0,5)<0,"turning right moves the previous forward target left");
        System.out.println("PASS original model handedness, readable front faces and consistent mouse direction");
    }
    private static void check(boolean value,String message){if(!value)throw new AssertionError(message);}
}
