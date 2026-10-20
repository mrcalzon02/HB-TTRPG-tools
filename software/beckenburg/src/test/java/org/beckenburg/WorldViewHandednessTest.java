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
        HouseMap map=new HouseMap();var p=map.spawn(2);view.x=p.x();view.z=p.z();
        for(int heading:new int[]{0,90,180,270}){
            view.yaw=Math.toRadians(heading);
            var listener=new LanWorld.Body(p.x(),p.y(),p.z(),heading,2);
            var ghost=new LanGhostSpatial.Pose(2,p.x(),p.y(),p.z(),heading);
            double px=projectedX(view,p.x()+1,p.z()+1);
            var sound=LanSound.project(map,listener,2,p.x()+1,p.y(),p.z()+1,LanSound.Cue.DOOR,1);
            check(sound!=null&&Math.signum(sound.pan())==Math.signum(px),"audio pan disagrees with visible source at heading "+heading);
            var hearing=LanGhostHearing.project(map,ghost,2,p.x()+1,p.z()+1,LanGhostPursuit.Sound.DOOR,1);
            check(hearing!=null,"coarse hearing source must be valid");
            if(hearing.direction()==LanGhostHearing.Direction.LEFT||hearing.direction()==LanGhostHearing.Direction.RIGHT)
                check((hearing.direction()==LanGhostHearing.Direction.RIGHT)==(px>0),"ghost hearing disagrees with screen direction");
        }
        System.out.println("PASS original model handedness, readable front faces, mouse direction and matching spatial audio");
    }
    private static void check(boolean value,String message){if(!value)throw new AssertionError(message);}
}
