package org.beckenburg;

import java.awt.AWTEvent;
import java.awt.Desktop;
import java.awt.EventQueue;
import java.awt.GraphicsEnvironment;
import java.awt.Toolkit;
import java.awt.datatransfer.StringSelection;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import javax.swing.*;

/**
 * Local-first startup and crash diagnostics. Initialized before game window or
 * texture loading. Never uploads data and never mutates profiles or game saves.
 * Also catches Swing dispatch exceptions that the standard uncaught handler misses.
 */
public final class BeckenburgDiagnostics {
    private static final Object LOCK=new Object();
    private static final DateTimeFormatter NAME=DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss-SSS")
        .withZone(ZoneOffset.UTC);
    private static final Path DIR=Path.of(System.getProperty("user.home","."),".beckenburg","diagnostics");
    private static final AtomicBoolean INSTALLED=new AtomicBoolean();
    private static final AtomicBoolean UI_FAILURE_SHOWN=new AtomicBoolean();
    private static volatile String stage="entry";
    private static volatile Path log;
    private static volatile String lastReport="";
    private static volatile boolean startup=true;
    private static volatile long lastEdtProgress=System.nanoTime();
    private static volatile long lastFreezeReport;
    private static final Path INCOMPLETE=DIR.resolve("startup.incomplete");
    private BeckenburgDiagnostics() {}

    public static Path directory(){return DIR;}
    public static Path currentLog(){return log;}
    public static String stageName(){return stage;}

    public static void install(){
        if(!INSTALLED.compareAndSet(false,true))return;
        Thread.setDefaultUncaughtExceptionHandler((thread,failure)->fail("uncaught/"+thread.getName(),failure));
        try{
            Files.createDirectories(DIR);
            rotate();
            boolean oldCrash=Files.exists(INCOMPLETE);
            log=DIR.resolve("session-"+NAME.format(Instant.now())+".log");
            Files.writeString(log,"Beckenburg session initialized "+Instant.now()+"\n",
                StandardCharsets.UTF_8,StandardOpenOption.CREATE_NEW);
            if(oldCrash)record("WARNING: previous launch did not complete startup; previous marker: "+
                Files.readString(INCOMPLETE,StandardCharsets.UTF_8));
            Files.writeString(INCOMPLETE,"version="+version()+"\nstage="+stage+"\ntime="+Instant.now()+"\n",
                StandardCharsets.UTF_8,StandardOpenOption.CREATE,StandardOpenOption.TRUNCATE_EXISTING);
        }catch(IOException failure){
            System.err.println("Beckenburg diagnostic logging unavailable: "+failure);
        }
        PrintStream originalErr=System.err;
        try{System.setErr(new PrintStream(new Tee(originalErr),true,StandardCharsets.UTF_8));}
        catch(Exception ignored){ }
        record("BOOT version="+version()+" java="+System.getProperty("java.version")+
            " os="+System.getProperty("os.name")+" "+System.getProperty("os.arch")+
            " memoryMax="+Runtime.getRuntime().maxMemory());
        Runtime.getRuntime().addShutdownHook(new Thread(()->record("PROCESS exit stage="+stage),
            "Beckenburg-diagnostic-shutdown"));
        if(!GraphicsEnvironment.isHeadless()){
            try{Toolkit.getDefaultToolkit().getSystemEventQueue().push(new EventQueue(){
                @Override protected void dispatchEvent(AWTEvent event){
                    try{super.dispatchEvent(event);}
                    catch(Throwable failure){
                        fail("Swing event dispatch at "+stage,failure);
                        if(UI_FAILURE_SHOWN.compareAndSet(false,true))
                            failureScreen(null,"UI event failed",failure);
                    }
                }
            });}
            catch(Throwable failure){fail("Cannot install Swing exception hook",failure);}
            Thread watcher=new Thread(BeckenburgDiagnostics::watchEdt,"Beckenburg-EDT-watchdog");
            watcher.setDaemon(true);watcher.start();
        }
    }
    private static final class Tee extends OutputStream {
        private final PrintStream original;
        private Tee(PrintStream original){this.original=original;}
        @Override public void write(int b){original.write(b);append(new byte[]{(byte)b},0,1);}
        @Override public void write(byte[] data,int off,int len){
            original.write(data,off,len);append(data,off,len);
        }
        private void append(byte[] data,int off,int len){
            synchronized(LOCK){
                if(log==null)return;
                try{Files.write(log,java.util.Arrays.copyOfRange(data,off,off+len),
                    StandardOpenOption.CREATE,StandardOpenOption.APPEND);}
                catch(IOException ignored){ }
            }
        }
    }
    private static void rotate()throws IOException{
        try(var files=Files.list(DIR)){
            var old=files.filter(p->p.getFileName().toString().startsWith("session-"))
                .sorted(Comparator.comparing(Path::getFileName).reversed()).toList();
            for(int i=9;i<old.size();i++)Files.deleteIfExists(old.get(i));
        }
    }
    public static void record(String message){
        String line=Instant.now()+" ["+Thread.currentThread().getName()+"] "+message+"\n";
        synchronized(LOCK){
            if(log!=null)try{Files.writeString(log,line,StandardCharsets.UTF_8,
                StandardOpenOption.CREATE,StandardOpenOption.APPEND);}
            catch(IOException problem){System.err.println("Diagnostic log write: "+problem);}
            else if(!INSTALLED.get())System.err.print(line);
        }
    }
    public static void phase(String name){
        stage=name;
        record("PHASE "+name);
        if(startup)try{Files.writeString(INCOMPLETE,
            "version="+version()+"\nstage="+name+"\ntime="+Instant.now()+"\n",
            StandardCharsets.UTF_8,StandardOpenOption.CREATE,StandardOpenOption.TRUNCATE_EXISTING);}
        catch(IOException ignored){ }
    }
    public static void ready(){
        phase("ready");
        startup=false;
        try{Files.deleteIfExists(INCOMPLETE);}catch(IOException error){record("Marker cleanup: "+error);}
    }
    private static String version(){
        try{return BeckenburgUpdates.installedVersion();}
        catch(Throwable bad){return "unavailable";}
    }
    public static String redact(String message){
        if(message==null)return "";
        String home=System.getProperty("user.home","");
        return home.isEmpty()?message:message.replace(home,"<USER_HOME>");
    }
    private static String trace(Throwable cause){
        StringWriter sw=new StringWriter();
        PrintWriter out=new PrintWriter(sw);
        cause.printStackTrace(out);out.flush();
        return sw.toString();
    }
    private static String threads(){
        StringBuilder b=new StringBuilder("THREAD SNAPSHOT\n");
        try{
            for(Map.Entry<Thread,StackTraceElement[]> t:Thread.getAllStackTraces().entrySet()){
                b.append("\n").append(t.getKey().getName()).append(" state=")
                    .append(t.getKey().getState()).append("\n");
                for(StackTraceElement frame:t.getValue())b.append("  ").append(frame).append("\n");
            }
        }catch(Throwable unavailable){b.append("Cannot enumerate threads: ").append(unavailable);}
        return b.toString();
    }
    public static String report(String where,Throwable failure){
        Runtime runtime=Runtime.getRuntime();
        StringBuilder b=new StringBuilder("BECKENBURG LOCAL DIAGNOSTIC REPORT\n");
        b.append("Time: ").append(Instant.now()).append("\n");
        b.append("Version: ").append(version()).append("\n");
        b.append("Source revision: ").append(sourceRevision()).append("\n");
        b.append("Phase: ").append(stage).append("\n");
        b.append("Event: ").append(where).append("\n");
        b.append("Java: ").append(System.getProperty("java.version")).append("\n");
        b.append("OS: ").append(System.getProperty("os.name")).append(" / ")
            .append(System.getProperty("os.arch")).append("\n");
        b.append("Memory: free=").append(runtime.freeMemory())
            .append(" total=").append(runtime.totalMemory())
            .append(" max=").append(runtime.maxMemory()).append("\n");
        if(failure!=null)b.append("\nFAILURE\n").append(trace(failure));
        b.append("\n").append(threads());
        return redact(b.toString());
    }
    private static String sourceRevision(){
        try(var input=BeckenburgDiagnostics.class.getResourceAsStream("/org/beckenburg/release.properties")){
            if(input==null)return "developer build";
            java.util.Properties p=new java.util.Properties();p.load(input);
            return p.getProperty("source_sha","not stamped");
        }catch(Exception ignored){return "unavailable";}
    }
    public static Path fail(String where,Throwable cause){
        String body=report(where,cause);
        lastReport=body;
        record("FAILURE at "+where+": "+redact(String.valueOf(cause)));
        synchronized(LOCK){
            try{
                Files.createDirectories(DIR);
                Path dest=DIR.resolve("crash-"+NAME.format(Instant.now())+".txt");
                Files.writeString(dest,body,StandardCharsets.UTF_8,StandardOpenOption.CREATE_NEW);
                record("Report: "+dest);
                return dest;
            }catch(IOException error){
                System.err.println("Could not save Beckenburg failure report: "+error);
                return null;
            }
        }
    }
    private static void watchEdt(){
        while(true){
            try{Thread.sleep(3000);}catch(InterruptedException stop){return;}
            SwingUtilities.invokeLater(()->lastEdtProgress=System.nanoTime());
            long stalled=System.nanoTime()-lastEdtProgress;
            if(stalled>20_000_000_000L && System.nanoTime()-lastFreezeReport>60_000_000_000L){
                lastFreezeReport=System.nanoTime();
                fail("EDT unresponsive >20 seconds; possible loading-screen freeze",null);
            }
        }
    }
    public static void failureScreen(java.awt.Component parent,String title,Throwable failure){
        if(failure!=null&&lastReport.isBlank())fail(title,failure);
        if(GraphicsEnvironment.isHeadless())return;
        try{
            JPanel root=new JPanel(new java.awt.BorderLayout(10,10));
            root.setBorder(BorderFactory.createEmptyBorder(12,12,12,12));
            root.add(new JLabel(title+" — phase: "+stage),java.awt.BorderLayout.NORTH);
            JTextArea detail=new JTextArea(redact(failure==null?"See saved diagnostic report.":
                failure.toString())+"\n\nDiagnostics: "+DIR);
            detail.setEditable(false);detail.setLineWrap(true);detail.setWrapStyleWord(true);
            root.add(new JScrollPane(detail),java.awt.BorderLayout.CENTER);
            JButton open=new JButton("Open diagnostics folder");
            open.addActionListener(e->openFolder());
            JButton copy=new JButton("Copy report");
            copy.addActionListener(e->copyReport());
            JPanel actions=new JPanel(new java.awt.FlowLayout(java.awt.FlowLayout.RIGHT,6,0));
            JButton export=new JButton("Export support ZIP");
            export.addActionListener(e->exportUI());
            actions.add(open);actions.add(copy);actions.add(export);root.add(actions,java.awt.BorderLayout.SOUTH);
            root.setPreferredSize(new java.awt.Dimension(580,230));
            JOptionPane.showMessageDialog(parent,root,"Beckenburg diagnostics",JOptionPane.ERROR_MESSAGE);
        }catch(Throwable impossible){
            System.err.println("Failed to show diagnostic UI: "+impossible);
        }
    }
    /**
     * Self-contained support archive. Includes diagnostic text only, never
     * profiles, save files, installer binaries or private source packs.
     */
    public static Path exportBundle()throws IOException{
        Files.createDirectories(DIR);
        Path bundle=DIR.resolve("beckenburg-support-"+NAME.format(Instant.now())+".zip");
        try(var output=new java.util.zip.ZipOutputStream(Files.newOutputStream(bundle,
                StandardOpenOption.CREATE_NEW));var files=Files.list(DIR)){
            output.putNextEntry(new java.util.zip.ZipEntry("README.txt"));
            output.write(("Local Beckenburg diagnostic evidence only. No upload occurred.\\n"+
                "Version: "+version()+"\\nSource: "+sourceRevision()+"\\nPhase: "+stage+"\\n")
                .replace("\\n","\n").getBytes(StandardCharsets.UTF_8));
            output.closeEntry();
            var snapshots=files.filter(p->{
                String name=p.getFileName().toString();
                return name.startsWith("session-")&&name.endsWith(".log") ||
                    name.startsWith("crash-")&&name.endsWith(".txt");
            }).sorted(Comparator.comparing(Path::getFileName).reversed()).limit(6).toList();
            for(Path file:snapshots){
                output.putNextEntry(new java.util.zip.ZipEntry(file.getFileName().toString()));
                // Text redaction before export. Diagnostic files remain local.
                output.write(redact(Files.readString(file,StandardCharsets.UTF_8))
                    .getBytes(StandardCharsets.UTF_8));
                output.closeEntry();
            }
        }
        record("DIAGNOSTICS exported support archive: "+bundle.getFileName());
        return bundle;
    }
    private static void exportUI(){
        try{
            Path path=exportBundle();
            JOptionPane.showMessageDialog(null,"Support bundle saved to:\n"+path,
                "Beckenburg diagnostics",JOptionPane.INFORMATION_MESSAGE);
        }catch(Exception error){fail("Support ZIP export",error);}
    }
    public static void show(java.awt.Component parent){
        if(GraphicsEnvironment.isHeadless())return;
        try{
            JTextArea data=new JTextArea(19,75);
            data.setEditable(false);data.setFont(new java.awt.Font(java.awt.Font.MONOSPACED,0,12));
            String summary="Version: "+version()+"  Revision: "+sourceRevision()+
                "\nCurrent phase: "+stage+"\nLogs: "+DIR+
                "\n\nRecent session events:\n";
            String tail="";
            if(log!=null&&Files.isRegularFile(log)){
                String all=Files.readString(log,StandardCharsets.UTF_8);
                tail=all.substring(Math.max(0,all.length()-14000));
            }
            data.setText(redact(summary+tail));
            data.setCaretPosition(0);
            JPanel root=new JPanel(new java.awt.BorderLayout(6,6));
            root.add(new JScrollPane(data),java.awt.BorderLayout.CENTER);
            JPanel actions=new JPanel(new java.awt.FlowLayout(java.awt.FlowLayout.RIGHT,6,0));
            JButton open=new JButton("Open log folder");open.addActionListener(e->openFolder());
            JButton copy=new JButton("Copy report");copy.addActionListener(e->copyReport());
            JButton capture=new JButton("Capture thread report");
            capture.addActionListener(e->{fail("Manual diagnostic capture",null);show(parent);});
            JButton export=new JButton("Export support ZIP");
            export.addActionListener(e->exportUI());
            actions.add(open);actions.add(copy);actions.add(capture);actions.add(export);
            root.add(actions,java.awt.BorderLayout.SOUTH);
            JOptionPane.showMessageDialog(parent,root,"Beckenburg diagnostics",JOptionPane.PLAIN_MESSAGE);
        }catch(Throwable failure){fail("Diagnostics window",failure);}
    }
    private static void copyReport(){
        try{
            String value=lastReport.isBlank()?report("User-requested diagnostic",null):lastReport;
            Toolkit.getDefaultToolkit().getSystemClipboard().setContents(new StringSelection(value),null);
        }catch(Throwable error){record("Copy diagnostic report failed: "+error);}
    }
    private static void openFolder(){
        try{
            Files.createDirectories(DIR);
            if(Desktop.isDesktopSupported())Desktop.getDesktop().open(DIR.toFile());
        }catch(Exception error){record("Open diagnostics directory failed: "+error);}
    }
}
