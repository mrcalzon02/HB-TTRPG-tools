package org.beckenburg;

/** Crash reports must work without starting Swing or the game assets. */
public final class BeckenburgDiagnosticsTest {
    private static void ok(boolean condition,String label){
        if(!condition)throw new AssertionError(label);
    }
    public static void main(String[] args){
        String home=System.getProperty("user.home","");
        String masked=BeckenburgDiagnostics.redact("source: "+home+"/.beckenburg/profile.properties");
        if(!home.isEmpty())ok(!masked.contains(home),"report masks local home directory");
        ok(masked.contains("<USER_HOME>"),"redaction preserves useful directory clue");
        String diagnostic=BeckenburgDiagnostics.report("startup-test",
            new IllegalStateException("simulated loading failure"));
        ok(diagnostic.contains("startup-test"),"report records failing operation");
        ok(diagnostic.contains("simulated loading failure"),"report contains exception");
        ok(diagnostic.contains("THREAD SNAPSHOT"),"report includes other threads on deadlock");
        ok(diagnostic.contains("Version:"),"report identifies installed build");
        ok(diagnostic.contains("Source revision:"),"report identifies packaged revision");
        ok(diagnostic.contains("Memory:"),"report contains runtime footprint");
        System.out.println("PASS Beckenburg startup diagnostics, local redaction and thread snapshot");
    }
}
