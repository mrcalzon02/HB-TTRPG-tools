package org.beckenburg;

import java.io.Reader;
import java.io.Writer;
import java.net.Socket;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/**
 * Socket-level application-delay injection for heartbeats (0, 50, 150 ms)
 * and one intentionally lost PONG. This is NOT OS-level packet-loss or
 * WAN-impairment emulation; TCP retransmission is not simulated here.
 */
public final class LanNetworkLatencyTest {
    private static void check(boolean good,String detail){
        if(!good)throw new AssertionError(detail);
    }
    private static String until(Reader in,String prefix)throws Exception {
        while(true){
            String frame=LanProtocol.read(in);
            if(frame==null)throw new AssertionError("peer closed before "+prefix);
            if(frame.startsWith(prefix))return frame;
        }
    }
    private static void awaiting(LinkedBlockingQueue<String> events,String exact)throws Exception {
        long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(6);
        while(System.nanoTime()<deadline){
            String msg=events.poll(100,TimeUnit.MILLISECONDS);
            if(msg!=null&&msg.startsWith(exact))return;
        }
        throw new AssertionError("missing "+exact);
    }
    public static void main(String[] args)throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0);
            Socket delayed=new Socket("127.0.0.1",host.port())){
            delayed.setTcpNoDelay(true);
            delayed.setSoTimeout(12000);
            Reader input=LanProtocol.reader(delayed.getInputStream());
            Writer output=LanProtocol.writer(delayed.getOutputStream());
            // Reserve H1/H2 before the raw lag-probe connection, independent of
            // operating-system task scheduling and socket arrival order.
            // A raw peer is deliberately used to control when PONG is sent.
            // The raw connection is opened first; it is H1 by construction.
            LanProtocol.write(output,"JOIN|1|HUNTER|LagProbe");
            check(until(input,"WELCOME|").startsWith("WELCOME|H1|"),"raw probe owns H1");
            var secondEvents=new LinkedBlockingQueue<String>();
            try(LanClient b=new LanClient("127.0.0.1",host.port(),false,"Cleric",secondEvents::offer);
                LanClient c=new LanClient("127.0.0.1",host.port(),false,"Observer",s->{})){
                check("H2".equals(b.seat())&&"H3".equals(c.seat()),"three hunter seats assigned");
                LanProtocol.write(output,"READY");b.ready();c.ready();
                awaiting(secondEvents,"LOBBY|3|AI|3|WAITING");
                // Legacy LAN host admits H1 as Start Match owner.
                LanProtocol.write(output,"START");
                until(input,"INFO|mission started");
                for(int delay:new int[]{0,50,150}){
                    String ping=until(input,"PING|");
                    int challenge=LanProtocol.integer(ping.substring(5),0,99999999);
                    Thread.sleep(delay);
                    LanProtocol.write(output,"PONG|"+challenge);
                    String stats=until(input,"NETSTATS|");
                    int millis=LanProtocol.integer(stats.substring(9),0,60000);
                    check(millis>=Math.max(0,delay-5)&&millis<delay+1500,
                        "host RTT reflects injected "+delay+"ms PONG delay: "+millis+"ms");
                    check(host.running(),"normal latency must not end simulation");
                }
                // Drop a complete application-level heartbeat. The next valid
                // reply must recover link health without a false seat eviction.
                until(input,"PING|"); // Deliberately no PONG.
                String recovery=until(input,"PING|");
                LanProtocol.write(output,"PONG|"+recovery.substring(5));
                until(input,"NETSTATS|");
                check(host.connected()==3&&host.reservedSeats()==0,
                    "one dropped heartbeat must not eject a responsive hunter");
                check(b.latencyMillis()>=0,"ordinary Java client answers host heartbeat");
                check(host.running(),"host still simulates after delay and lost reply");
                System.out.println("PASS: TCP heartbeat RTT 0/50/150ms, one lost PONG, recovery and host continuity");
            }
        }
    }
}
