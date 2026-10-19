package org.beckenburg;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Executes the entire release regression manifest as isolated Java processes.
 * Per-test deadlines reveal hangs; failures are reported and NEVER waived.
 */
public final class BeckenburgRegressionSuite {
    private BeckenburgRegressionSuite(){}
    private static final long TEST_TIMEOUT_SECONDS=90;
    private static final int MAX_FAILURES=12;
    public static void main(String[] args)throws Exception{
        Path manifest=Path.of("regression-tests.txt");
        if(!Files.isRegularFile(manifest))throw new IOException("Regression manifest absent");
        List<String> tests=Files.readAllLines(manifest,StandardCharsets.UTF_8).stream()
            .map(String::trim).filter(s->!s.isEmpty()&&!s.startsWith("#")).toList();
        if(tests.size()<145 || !tests.containsAll(List.of("BeckenburgDiagnosticsTest",
            "CastleHubIntegrationTest","BeckenburgUpdatesTest","GameplaySmokeTest",
            "LanWorldIntegrationTest")))throw new IllegalStateException("Regression manifest incomplete");
        String java=Path.of(System.getProperty("java.home"),"bin",
            System.getProperty("os.name","").toLowerCase().contains("win")?"java.exe":"java").toString();
        String classpath=String.join(File.pathSeparator,"build/classes","build/test");
        int failed=0,passed=0,skipped=0;
        for(String test:tests){
            if(!test.matches("[A-Za-z][A-Za-z0-9_]*Test"))
                throw new IllegalArgumentException("Invalid regression entry: "+test);
            if("SmokeTest".equals(test)&&!Files.exists(Path.of("build/test/org/beckenburg/SmokeTest.class"))){
                System.out.println("SKIP optional SmokeTest source absent");
                skipped++;continue;
            }
            System.out.println("TEST START org.beckenburg."+test);
            Instant started=Instant.now();
            Process p=new ProcessBuilder(java,"-Djava.awt.headless=true","-ea",
                "-cp",classpath,"org.beckenburg."+test).inheritIO().start();
            boolean exited=p.waitFor(TEST_TIMEOUT_SECONDS,TimeUnit.SECONDS);
            if(!exited){
                p.destroyForcibly();
                p.waitFor(10,TimeUnit.SECONDS);
                failed++;
                System.err.println("FAIL TIMEOUT "+test+" after "+TEST_TIMEOUT_SECONDS+" s");
            }else if(p.exitValue()!=0){
                failed++;
                System.err.println("FAIL "+test+" processExit="+p.exitValue());
            }else{
                passed++;
                System.out.println("TEST PASS "+test+" elapsed="+Duration.between(started,Instant.now()).toMillis()+"ms");
            }
            if(failed>=MAX_FAILURES){
                System.err.println("FAIL STOP: "+MAX_FAILURES+" broken tests; no game artifact permitted");
                break;
            }
        }
        System.out.println("REGRESSION SUMMARY passed="+passed+" failed="+failed+" skipped="+skipped+
            " manifest="+tests.size());
        if(failed>0 || passed+skipped!=tests.size())
            throw new IllegalStateException("Release regression gate failed: "+failed+
                " test failures; "+(tests.size()-passed-failed-skipped)+" not executed");
    }
}
