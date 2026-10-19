package org.beckenburg;

import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/** Real socket proof of host-authored map selection, including 3D-view replays. */
public final class LanSiteSelectionIntegrationTest {
    private static void ok(boolean done,String why){if(!done)throw new AssertionError(why);}
    private static String waitFor(LinkedBlockingQueue<String> queue,String prefix)throws Exception{
        long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(6);
        while(System.nanoTime()<end){
            String line=queue.poll(150,TimeUnit.MILLISECONDS);
            if(line!=null&&line.startsWith(prefix))return line;
        }
        throw new AssertionError("missing host packet "+prefix);
    }
    public static void main(String[] args)throws Exception{
        for(HouseMap.Site site:new HouseMap.Site[]{
                HouseMap.Site.FARMHOUSE,HouseMap.Site.SCHOOL}){
            try(LanHost host=new LanHost("127.0.0.1",0,GhostIdentity.Type.SPIRIT,
                    CustomContract.standard(1),false,false,site)){
                var frames=new LinkedBlockingQueue<String>();
                try(LanClient client=new LanClient("127.0.0.1",host.port(),
                        false,"Map tester",frames::offer)){
                    ok(waitFor(frames,"SITE|").equals("SITE|"+site.name()),
                        "remote hunter receives selected layout during admission");
                    client.ready();
                    client.start();
                    waitFor(frames,"INFO|mission started");
                    client.view3D();
                    ok(waitFor(frames,"SITE|").equals("SITE|"+site.name()),
                        "view activation replays the site for renderer and reconnect");
                    ok(new HouseMap(site).valid(),"host runs connected traversable site");
                }
            }
        }
        System.out.println("PASS: two authored locations transmitted over genuine LAN sockets");
    }
}
