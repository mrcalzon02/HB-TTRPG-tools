package org.beckenburg;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/** H1 is a participant, not a host administrator, when the verified owner is GHOST. */
public final class LanHostAuthorizationRegressionTest {
    private static void check(boolean yes,String why){if(!yes)throw new AssertionError(why);}
    private static String await(BlockingQueue<String> q,String prefix)throws Exception{
        long until=System.nanoTime()+TimeUnit.SECONDS.toNanos(7);
        while(System.nanoTime()<until){
            String v=q.poll(75,TimeUnit.MILLISECONDS);
            if(v!=null&&v.startsWith(prefix))return v;
        }
        throw new AssertionError("no packet matching "+prefix);
    }
    public static void main(String[] args)throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0,
                GhostIdentity.Type.SPIRIT,CustomContract.standard(1),true,true)){
            BlockingQueue<String> guestPackets=new LinkedBlockingQueue<>();
            BlockingQueue<String> ownerPackets=new LinkedBlockingQueue<>();
            // A guest wins the connection race and gets the hunter H1 seat.
            try(LanClient guest=new LanClient("127.0.0.1",host.port(),false,"FastGuest",guestPackets::offer);
                LanClient owner=new LanClient("127.0.0.1",host.port(),true,
                    "ActualOwner","",host.localOwnerCredential(),ownerPackets::offer)){
                check("H1".equals(guest.seat())&&"GHOST".equals(owner.seat()),
                    "ghost owner never gives guest H1 host privileges");
                guest.ready();owner.ready();
                await(ownerPackets,"LOBBY|1|HUMAN|2|WAITING");
                guest.start();
                String rejection=await(guestPackets,"REJECT|");
                check(rejection.contains("verified hosting player"),
                    "guest H1 start attempt denied by host, not just by disabled UI");
                check(!host.running(),"rejected guest cannot start match");
                owner.start();
                await(ownerPackets,"INFO|mission started");
                check(host.running(),"verified ghost owner can begin same private match");
            }
        }
        System.out.println("PASS: ghost-host room rejects guest H1 administrative START while owner may start");
    }
}
