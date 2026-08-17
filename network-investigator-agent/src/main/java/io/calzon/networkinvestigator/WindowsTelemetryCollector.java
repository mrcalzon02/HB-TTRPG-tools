package io.calzon.networkinvestigator;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/**
 * First Windows telemetry layer. ProcessHandle provides process lifecycle and
 * ancestry. Windows PowerShell networking cmdlets provide a conservative
 * owned-endpoint baseline until native IP Helper / ETW collectors replace the
 * polling path for higher-fidelity connection and throughput events.
 */
public final class WindowsTelemetryCollector implements AutoCloseable {
    private static final Duration POLL_INTERVAL = Duration.ofSeconds(2);
    private static final String POWERSHELL_NETWORK_SNAPSHOT = """
        $ErrorActionPreference='SilentlyContinue';
        Get-NetTCPConnection | ForEach-Object {
          [Console]::Out.WriteLine(('TCP`t{0}`t{1}`t{2}`t{3}`t{4}`t{5}' -f $_.OwningProcess,$_.State,$_.LocalAddress,$_.LocalPort,$_.RemoteAddress,$_.RemotePort))
        };
        Get-NetUDPEndpoint | ForEach-Object {
          [Console]::Out.WriteLine(('UDP`t{0}`t`t{1}`t{2}`t`t' -f $_.OwningProcess,$_.LocalAddress,$_.LocalPort))
        }
        """;

    private final SessionRecorder recorder;
    private final boolean windows = System.getProperty("os.name", "").toLowerCase().contains("windows");
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread thread = new Thread(r, "network-investigator-telemetry");
        thread.setDaemon(true);
        return thread;
    });
    private final Map<ProcessKey, ProcessInfo> processes = new HashMap<>();
    private final Map<EndpointKey, EndpointInfo> endpoints = new HashMap<>();
    private final AtomicReference<String> lastError = new AtomicReference<>();
    private volatile int currentProcessCount;
    private volatile int currentTcpCount;
    private volatile int currentUdpCount;
    private volatile Instant lastSuccessfulPoll;
    private boolean processBaselineEstablished;
    private boolean endpointBaselineEstablished;

    public WindowsTelemetryCollector(SessionRecorder recorder) {
        this.recorder = recorder;
    }

    public void start() {
        scheduler.scheduleWithFixedDelay(this::pollSafely, 0, POLL_INTERVAL.toMillis(), TimeUnit.MILLISECONDS);
    }

    public Snapshot snapshot() {
        return new Snapshot(windows, currentProcessCount, currentTcpCount, currentUdpCount, lastSuccessfulPoll, lastError.get());
    }

    private void pollSafely() {
        try {
            Map<Long, ProcessInfo> byPid = pollProcesses();
            if (windows) pollNetwork(byPid);
            lastSuccessfulPoll = Instant.now();
            lastError.set(null);
        } catch (Exception error) {
            String message = error.getClass().getSimpleName() + ": " + Optional.ofNullable(error.getMessage()).orElse("collector failure");
            String previous = lastError.getAndSet(message);
            if (!message.equals(previous)) {
                observeQuietly("COLLECTOR_ERROR", Map.of("collector", "windows-baseline", "message", message));
            }
        }
    }

    private Map<Long, ProcessInfo> pollProcesses() {
        Map<ProcessKey, ProcessInfo> now = new HashMap<>();
        Map<Long, ProcessInfo> byPid = new HashMap<>();
        ProcessHandle.allProcesses().forEach(handle -> {
            ProcessHandle.Info info = handle.info();
            Instant started = info.startInstant().orElse(Instant.EPOCH);
            long parentPid = handle.parent().map(ProcessHandle::pid).orElse(-1L);
            ProcessInfo process = new ProcessInfo(
                    handle.pid(),
                    started,
                    parentPid,
                    info.command().orElse(""),
                    info.commandLine().orElse(""),
                    info.user().orElse("")
            );
            now.put(new ProcessKey(handle.pid(), started), process);
            byPid.put(handle.pid(), process);
        });

        for (Map.Entry<ProcessKey, ProcessInfo> entry : now.entrySet()) {
            if (!processes.containsKey(entry.getKey())) {
                ProcessInfo p = entry.getValue();
                Map<String, String> fields = new LinkedHashMap<>();
                fields.put("pid", Long.toString(p.pid()));
                fields.put("startedAt", p.startedAt().equals(Instant.EPOCH) ? "unknown" : p.startedAt().toString());
                fields.put("parentPid", p.parentPid() < 0 ? "unknown" : Long.toString(p.parentPid()));
                ProcessInfo parent = byPid.get(p.parentPid());
                fields.put("parentExecutable", parent == null ? "" : parent.command());
                fields.put("executable", p.command());
                fields.put("commandLine", p.commandLine());
                fields.put("user", p.user());
                observeQuietly(processBaselineEstablished ? "PROCESS_STARTED" : "PROCESS_OBSERVED_BASELINE", fields);
            }
        }
        for (Map.Entry<ProcessKey, ProcessInfo> entry : processes.entrySet()) {
            if (!now.containsKey(entry.getKey())) {
                ProcessInfo p = entry.getValue();
                observeQuietly("PROCESS_STOPPED", Map.of(
                        "pid", Long.toString(p.pid()),
                        "startedAt", p.startedAt().equals(Instant.EPOCH) ? "unknown" : p.startedAt().toString(),
                        "executable", p.command()
                ));
            }
        }
        processes.clear();
        processes.putAll(now);
        processBaselineEstablished = true;
        currentProcessCount = now.size();
        return byPid;
    }

    private void pollNetwork(Map<Long, ProcessInfo> byPid) throws IOException, InterruptedException {
        Process process = new ProcessBuilder(
                "powershell.exe", "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", POWERSHELL_NETWORK_SNAPSHOT
        ).redirectErrorStream(true).start();

        Map<EndpointKey, EndpointInfo> now = new HashMap<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String[] parts = line.split("\\t", -1);
                if (parts.length < 7 || !(parts[0].equals("TCP") || parts[0].equals("UDP"))) continue;
                long pid;
                int localPort;
                int remotePort;
                try {
                    pid = Long.parseLong(parts[1].trim());
                    localPort = parsePort(parts[4]);
                    remotePort = parsePort(parts[6]);
                } catch (NumberFormatException ignored) {
                    continue;
                }
                EndpointKey key = new EndpointKey(parts[0], pid, parts[3], localPort, parts[5], remotePort);
                EndpointInfo endpoint = new EndpointInfo(key, parts[2], byPid.get(pid));
                now.put(key, endpoint);
            }
        }
        if (!process.waitFor(4, TimeUnit.SECONDS)) {
            process.destroyForcibly();
            throw new IOException("PowerShell network snapshot timed out.");
        }
        if (process.exitValue() != 0) throw new IOException("PowerShell network snapshot exited " + process.exitValue());

        for (Map.Entry<EndpointKey, EndpointInfo> entry : now.entrySet()) {
            EndpointInfo previous = endpoints.get(entry.getKey());
            if (previous == null) {
                observeQuietly(endpointBaselineEstablished
                        ? (entry.getKey().protocol().equals("TCP") ? "TCP_ENDPOINT_OPEN" : "UDP_ENDPOINT_OPEN")
                        : (entry.getKey().protocol().equals("TCP") ? "TCP_ENDPOINT_BASELINE" : "UDP_ENDPOINT_BASELINE"),
                        endpointFields(entry.getValue(), byPid));
            } else if (!previous.state().equals(entry.getValue().state())) {
                Map<String, String> fields = endpointFields(entry.getValue(), byPid);
                fields.put("previousState", previous.state());
                observeQuietly("TCP_STATE_CHANGED", fields);
            }
        }
        for (Map.Entry<EndpointKey, EndpointInfo> entry : endpoints.entrySet()) {
            if (!now.containsKey(entry.getKey())) {
                Map<String, String> fields = endpointFields(entry.getValue(), byPid);
                fields.put("lastObservedState", entry.getValue().state());
                observeQuietly(entry.getKey().protocol().equals("TCP") ? "TCP_ENDPOINT_CLOSED" : "UDP_ENDPOINT_CLOSED", fields);
            }
        }

        endpoints.clear();
        endpoints.putAll(now);
        endpointBaselineEstablished = true;
        currentTcpCount = (int) now.keySet().stream().filter(key -> key.protocol().equals("TCP")).count();
        currentUdpCount = now.size() - currentTcpCount;
    }

    private static int parsePort(String value) {
        if (value == null || value.isBlank()) return 0;
        return Integer.parseInt(value.trim());
    }

    private static Map<String, String> endpointFields(EndpointInfo endpoint, Map<Long, ProcessInfo> byPid) {
        EndpointKey key = endpoint.key();
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("protocol", key.protocol());
        fields.put("pid", Long.toString(key.pid()));
        fields.put("state", endpoint.state());
        fields.put("localAddress", key.localAddress());
        fields.put("localPort", Integer.toString(key.localPort()));
        fields.put("remoteAddress", key.remoteAddress());
        fields.put("remotePort", Integer.toString(key.remotePort()));
        if (endpoint.process() != null) {
            fields.put("processExecutable", endpoint.process().command());
            fields.put("processStartedAt", endpoint.process().startedAt().equals(Instant.EPOCH) ? "unknown" : endpoint.process().startedAt().toString());
            fields.put("parentPid", endpoint.process().parentPid() < 0 ? "unknown" : Long.toString(endpoint.process().parentPid()));
            ProcessInfo parent = byPid.get(endpoint.process().parentPid());
            fields.put("parentExecutable", parent == null ? "" : parent.command());
        }
        return fields;
    }

    private void observeQuietly(String type, Map<String, String> fields) {
        try {
            recorder.observe(type, fields);
        } catch (IOException error) {
            lastError.set("Recorder write failed: " + error.getMessage());
        }
    }

    @Override
    public void close() {
        scheduler.shutdownNow();
    }

    public record Snapshot(
            boolean windowsCollectorSupported,
            int processCount,
            int tcpEndpointCount,
            int udpEndpointCount,
            Instant lastSuccessfulPoll,
            String lastError
    ) {}

    private record ProcessKey(long pid, Instant startedAt) {}
    private record ProcessInfo(long pid, Instant startedAt, long parentPid, String command, String commandLine, String user) {}
    private record EndpointKey(String protocol, long pid, String localAddress, int localPort, String remoteAddress, int remotePort) {}
    private record EndpointInfo(EndpointKey key, String state, ProcessInfo process) {}
}
