package org.beckenburg;

import java.io.IOException;
import java.io.StringWriter;
import java.io.Writer;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/** A stalled recipient must never block the authoritative simulation or silently lose a transaction. */
public final class LanOutboundQueueTest {
    private static void check(boolean yes,String reason){
        if(!yes)throw new AssertionError(reason);
    }
    public static void main(String[] args)throws Exception {
        var pool=Executors.newCachedThreadPool();
        try{
            var delivered=new StringWriter();
            var stopped=new AtomicInteger();
            var ordered=new LanOutboundQueue(delivered,stopped::incrementAndGet,8);
            check(ordered.offer("INFO|one"),"first event queued");
            check(ordered.offer("PROGRESS|100|0|2|0|0|0|ACTIVE"),"reliable event queued");
            ordered.start(pool);
            long limit=System.nanoTime()+TimeUnit.SECONDS.toNanos(3);
            while(!delivered.toString().contains("PROGRESS|100|0|2|0|0|0|ACTIVE\n")
                    &&System.nanoTime()<limit)Thread.sleep(5);
            check(delivered.toString().equals("INFO|one\nPROGRESS|100|0|2|0|0|0|ACTIVE\n"),
                    "FIFO frames delivered exactly once");
            ordered.stop();
            check(stopped.get()==1,"one disconnect on normal shutdown");
            check(!ordered.offer("INFO|late"),"stopped outbound must reject further frames");

            var entered=new CountDownLatch(1);
            var release=new CountDownLatch(1);
            Writer stalled=new Writer(){
                @Override public void write(char[] chars,int off,int len)throws IOException {
                    entered.countDown();
                    try{if(!release.await(3,TimeUnit.SECONDS))throw new IOException("stalled writer");}
                    catch(InterruptedException e){Thread.currentThread().interrupt();throw new IOException(e);}
                }
                @Override public void flush(){}
                @Override public void close(){}
            };
            var disconnected=new AtomicInteger();
            var slow=new LanOutboundQueue(stalled,disconnected::incrementAndGet,2);
            slow.start(pool);
            check(slow.offer("INFO|one"),"first slow event queued");
            check(entered.await(3,TimeUnit.SECONDS),"test writer actually stalled");
            check(slow.offer("INFO|two"),"first pending frame buffered");
            check(slow.offer("INFO|three"),"second pending frame buffered");
            long begin=System.nanoTime();
            check(!slow.offer("INFO|overflow"),"overflow must refuse event and close recipient");
            long elapsed=System.nanoTime()-begin;
            check(elapsed<TimeUnit.MILLISECONDS.toNanos(300),
                    "host producer blocked waiting for slow socket");
            check(slow.stopped()&&disconnected.get()==1,
                    "bounded overflow disconnects stalled peer exactly once");
            release.countDown();
            slow.stop();
            check(disconnected.get()==1,"no duplicate cleanup after writer stops");
            System.out.println("PASS: ordered nonblocking TCP delivery, bounded backlog, slow-peer isolation");
        }finally{pool.shutdownNow();}
    }
}
