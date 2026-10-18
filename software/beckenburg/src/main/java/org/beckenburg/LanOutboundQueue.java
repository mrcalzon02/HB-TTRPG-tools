package org.beckenburg;

import java.io.IOException;
import java.io.Writer;
import java.util.Objects;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Bounded FIFO TCP output for a single authenticated peer. The simulation
 * enqueues frames without performing any socket writes. If a client cannot
 * drain its backlog, close that connection and let normal seat reservation
 * handle a possible authenticated reconnect; never drop a transaction frame.
 *
 * JOIN/WELCOME is completed before this writer is started.
 */
final class LanOutboundQueue {
    static final int DEFAULT_CAPACITY=256;
    private final ArrayBlockingQueue<String> pending;
    private final Writer output;
    private final Runnable disconnect;
    private final AtomicBoolean stopped=new AtomicBoolean();
    private final AtomicBoolean started=new AtomicBoolean();

    LanOutboundQueue(Writer output,Runnable disconnect){
        this(output,disconnect,DEFAULT_CAPACITY);
    }
    LanOutboundQueue(Writer output,Runnable disconnect,int capacity){
        if(capacity<1||capacity>4096)throw new IllegalArgumentException("invalid outgoing capacity");
        this.output=Objects.requireNonNull(output);
        this.disconnect=Objects.requireNonNull(disconnect);
        this.pending=new ArrayBlockingQueue<>(capacity);
    }
    void start(ExecutorService executor){
        Objects.requireNonNull(executor);
        if(!started.compareAndSet(false,true))throw new IllegalStateException("writer already started");
        try{executor.execute(this::drain);}
        catch(RuntimeException failure){stop();throw failure;}
    }
    boolean offer(String frame){
        // Reject malformed server output before it reaches the asynchronous writer.
        LanProtocol.parts(frame);
        if(stopped.get())return false;
        if(pending.offer(frame))return true;
        stop(); // A slow peer cannot delay the authoritative host.
        return false;
    }
    void stop(){
        if(stopped.compareAndSet(false,true)){
            pending.clear();
            disconnect.run();
        }
    }
    boolean stopped(){return stopped.get();}
    private void drain(){
        try{
            while(!stopped.get()){
                String frame=pending.poll(200,TimeUnit.MILLISECONDS);
                if(frame!=null&&!stopped.get())LanProtocol.write(output,frame);
            }
        }catch(InterruptedException interrupted){
            Thread.currentThread().interrupt();
        }catch(IOException | RuntimeException failed){
            // The socket may have been closed by a game disconnect.
        }finally{stop();}
    }
}
