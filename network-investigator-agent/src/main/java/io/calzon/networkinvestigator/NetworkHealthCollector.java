package io.calzon.networkinvestigator;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Low-impact connectivity diagnostics. This collector deliberately separates
 * local-route evidence, direct Internet-by-IP reachability and DNS-resolver
 * responsiveness so a DNS outage is not mislabeled as a total Internet loss.
 */
public final class NetworkHealthCollector implements AutoCloseable {
    private static final Duration SAMPLE_INTERVAL = Duration.ofSeconds(5);
    private static final Duration CONFIG_REFRESH_INTERVAL = Duration.ofSeconds(15);
    private static final int PROBE_TIMEOUT_MS = 1_500;
    private static final List<InetSocketAddress> INTERNET_TARGETS = List.of(
            new InetSocketAddress("1.1.1.1", 443),
            new InetSocketAddress("8.8.8.8", 443),
            new InetSocketAddress("9.9.9.9", 443)
    );
    private static final String POWERSHELL_NETWORK_CONFIG = """
        $ErrorActionPreference='SilentlyContinue';
        $route = Get-NetRoute -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' |
          Where-Object { $_.NextHop -and $_.NextHop -ne '0.0.0.0' } |
          Sort-Object RouteMetric,InterfaceIndex | Select-Object -First 1;
        if (-not $route) {
          $route = Get-NetRoute -AddressFamily IPv6 -DestinationPrefix '::/0' |
            Where-Object { $_.NextHop -and $_.NextHop -ne '::' } |
            Sort-Object RouteMetric,InterfaceIndex | Select-Object -First 1;
        }
        if ($route) {
          [Console]::Out.WriteLine(('GATEWAY`t{0}`t{1}' -f $route.NextHop,$route.InterfaceIndex));
          Get-DnsClientServerAddress -InterfaceIndex $route.InterfaceIndex | ForEach-Object {
            foreach($server in $_.ServerAddresses) {
              if ($server) { [Console]::Out.WriteLine(('DNS`t{0}`t{1}' -f $server,$route.InterfaceIndex)) }
            }
          }
        }
        """;

    private final SessionRecorder recorder;
    private final boolean windows = System.getProperty("os.name", "").toLowerCase().contains("windows");
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread thread = new Thread(r, "network-investigator-health");
        thread.setDaemon(true);
        return thread;
    });
    private final ExecutorService probes = Executors.newVirtualThreadPerTaskExecutor();
    private final AtomicReference<String> lastError = new AtomicReference<>();
    private volatile NetworkConfig config = NetworkConfig.empty();
    private volatile Instant configRefreshedAt = Instant.EPOCH;
    private volatile Snapshot snapshot = Snapshot.initial();
    private HealthSignature previousSignature;

    public NetworkHealthCollector(SessionRecorder recorder) {
        this.recorder = recorder;
    }

    public void start() {
        scheduler.scheduleWithFixedDelay(this::sampleSafely, 0, SAMPLE_INTERVAL.toMillis(), TimeUnit.MILLISECONDS);
    }

    public Snapshot snapshot() {
        return snapshot;
    }

    private void sampleSafely() {
        if (!windows) {
            snapshot = Snapshot.unsupported("Windows network-health collector is not available on this operating system.");
            return;
        }
        try {
            Instant started = Instant.now();
            refreshConfigIfNeeded(started);
            NetworkConfig currentConfig = config;

            GatewayProbe gatewayProbe = probeGateway(currentConfig);
            List<TcpProbe> internetProbes = probeInternet();
            List<DnsProbe> dnsProbes = probeDns(currentConfig);

            int internetReachable = (int) internetProbes.stream().filter(TcpProbe::reachable).count();
            int dnsResponsive = (int) dnsProbes.stream().filter(DnsProbe::responsive).count();
            int dnsHealthy = (int) dnsProbes.stream().filter(DnsProbe::healthy).count();
            long bestInternetLatency = internetProbes.stream().filter(TcpProbe::reachable).mapToLong(TcpProbe::latencyMs).min().orElse(-1L);
            long bestDnsLatency = dnsProbes.stream().filter(DnsProbe::responsive).mapToLong(DnsProbe::latencyMs).min().orElse(-1L);

            String lanStatus = currentConfig.gateway().isBlank()
                    ? "NO DEFAULT ROUTE"
                    : gatewayProbe.reachable() ? "GOOD" : "ROUTE PRESENT";
            String internetStatus = internetReachable > 0 ? "GOOD" : "UNREACHABLE";
            String dnsStatus;
            if (currentConfig.dnsServers().isEmpty()) dnsStatus = "NO RESOLVER CONFIG";
            else if (!dnsProbes.isEmpty() && dnsHealthy == dnsProbes.size()) dnsStatus = "GOOD";
            else if (dnsHealthy > 0) dnsStatus = "DEGRADED";
            else if (dnsResponsive > 0) dnsStatus = "FAILING";
            else dnsStatus = internetReachable > 0 ? "FAILING" : "UNKNOWN";

            String diagnosis = diagnose(lanStatus, dnsStatus, internetStatus);
            Instant sampledAt = Instant.now();
            Snapshot next = new Snapshot(
                    true,
                    lanStatus,
                    dnsStatus,
                    internetStatus,
                    diagnosis,
                    currentConfig.gateway(),
                    gatewayProbe.reachable(),
                    List.copyOf(currentConfig.dnsServers()),
                    internetReachable,
                    internetProbes.size(),
                    bestInternetLatency,
                    dnsResponsive,
                    dnsHealthy,
                    dnsProbes.size(),
                    bestDnsLatency,
                    sampledAt,
                    Duration.between(started, sampledAt).toMillis(),
                    null
            );
            snapshot = next;
            lastError.set(null);
            recordSample(next, internetProbes, dnsProbes);
        } catch (Exception error) {
            String message = error.getClass().getSimpleName() + ": " + Optional.ofNullable(error.getMessage()).orElse("health collector failure");
            String prior = lastError.getAndSet(message);
            Snapshot priorSnapshot = snapshot;
            snapshot = new Snapshot(
                    windows,
                    priorSnapshot.lanStatus(),
                    priorSnapshot.dnsStatus(),
                    priorSnapshot.internetStatus(),
                    "COLLECTOR ERROR",
                    priorSnapshot.gateway(),
                    priorSnapshot.gatewayReachable(),
                    priorSnapshot.dnsServers(),
                    priorSnapshot.internetTargetsReachable(),
                    priorSnapshot.internetTargetsTested(),
                    priorSnapshot.bestInternetLatencyMs(),
                    priorSnapshot.dnsResolversResponsive(),
                    priorSnapshot.dnsResolversHealthy(),
                    priorSnapshot.dnsResolversTested(),
                    priorSnapshot.bestDnsLatencyMs(),
                    priorSnapshot.sampledAt(),
                    priorSnapshot.sampleDurationMs(),
                    message
            );
            if (!message.equals(prior)) observeQuietly("NETWORK_HEALTH_COLLECTOR_ERROR", Map.of("message", message));
        }
    }

    private void refreshConfigIfNeeded(Instant now) throws IOException, InterruptedException {
        if (Duration.between(configRefreshedAt, now).compareTo(CONFIG_REFRESH_INTERVAL) < 0) return;
        config = readWindowsNetworkConfig();
        configRefreshedAt = now;
    }

    private NetworkConfig readWindowsNetworkConfig() throws IOException, InterruptedException {
        Process process = new ProcessBuilder(
                "powershell.exe", "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", POWERSHELL_NETWORK_CONFIG
        ).redirectErrorStream(true).start();
        String gateway = "";
        int interfaceIndex = -1;
        List<String> dnsServers = new ArrayList<>();
        if (!process.waitFor(4, TimeUnit.SECONDS)) {
            process.destroyForcibly();
            throw new IOException("PowerShell network configuration snapshot timed out.");
        }
        if (process.exitValue() != 0) throw new IOException("PowerShell network configuration snapshot exited " + process.exitValue());
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String[] parts = line.split("\\t", -1);
                if (parts.length >= 3 && parts[0].equals("GATEWAY")) {
                    gateway = parts[1].trim();
                    interfaceIndex = parseInt(parts[2], -1);
                } else if (parts.length >= 3 && parts[0].equals("DNS")) {
                    String server = scopeLinkLocal(parts[1].trim(), parseInt(parts[2], interfaceIndex));
                    if (!server.isBlank() && !dnsServers.contains(server)) dnsServers.add(server);
                }
            }
        }
        return new NetworkConfig(scopeLinkLocal(gateway, interfaceIndex), interfaceIndex, List.copyOf(dnsServers));
    }

    private GatewayProbe probeGateway(NetworkConfig currentConfig) {
        if (currentConfig.gateway().isBlank()) return new GatewayProbe(false, -1L);
        long started = System.nanoTime();
        try {
            boolean reachable = InetAddress.getByName(currentConfig.gateway()).isReachable(PROBE_TIMEOUT_MS);
            return new GatewayProbe(reachable, elapsedMillis(started));
        } catch (IOException ignored) {
            return new GatewayProbe(false, elapsedMillis(started));
        }
    }

    private List<TcpProbe> probeInternet() throws InterruptedException {
        List<Future<TcpProbe>> futures = INTERNET_TARGETS.stream()
                .map(target -> probes.submit(() -> probeTcp(target)))
                .toList();
        List<TcpProbe> results = new ArrayList<>(futures.size());
        for (int i = 0; i < futures.size(); i++) {
            InetSocketAddress target = INTERNET_TARGETS.get(i);
            try {
                results.add(futures.get(i).get(PROBE_TIMEOUT_MS + 500L, TimeUnit.MILLISECONDS));
            } catch (ExecutionException | TimeoutException error) {
                futures.get(i).cancel(true);
                results.add(new TcpProbe(target.getHostString(), target.getPort(), false, -1L));
            }
        }
        return results;
    }

    private TcpProbe probeTcp(InetSocketAddress target) {
        long started = System.nanoTime();
        try (Socket socket = new Socket()) {
            socket.connect(target, PROBE_TIMEOUT_MS);
            return new TcpProbe(target.getHostString(), target.getPort(), true, elapsedMillis(started));
        } catch (IOException ignored) {
            return new TcpProbe(target.getHostString(), target.getPort(), false, elapsedMillis(started));
        }
    }

    private List<DnsProbe> probeDns(NetworkConfig currentConfig) throws InterruptedException {
        List<String> servers = currentConfig.dnsServers().stream().limit(4).toList();
        List<Future<DnsProbe>> futures = servers.stream()
                .map(server -> probes.submit(() -> probeDnsServer(server)))
                .toList();
        List<DnsProbe> results = new ArrayList<>(futures.size());
        for (int i = 0; i < futures.size(); i++) {
            String server = servers.get(i);
            try {
                results.add(futures.get(i).get(PROBE_TIMEOUT_MS + 500L, TimeUnit.MILLISECONDS));
            } catch (ExecutionException | TimeoutException error) {
                futures.get(i).cancel(true);
                results.add(new DnsProbe(server, false, -1, -1L));
            }
        }
        return results;
    }

    private DnsProbe probeDnsServer(String server) {
        int transactionId = (int) (System.nanoTime() & 0xffff);
        byte[] query = buildDnsQuery(transactionId, "example.com");
        long started = System.nanoTime();
        try (DatagramSocket socket = new DatagramSocket()) {
            socket.setSoTimeout(PROBE_TIMEOUT_MS);
            InetAddress resolver = InetAddress.getByName(server);
            socket.send(new DatagramPacket(query, query.length, resolver, 53));
            byte[] responseBytes = new byte[2048];
            DatagramPacket response = new DatagramPacket(responseBytes, responseBytes.length);
            socket.receive(response);
            if (response.getLength() < 12) return new DnsProbe(server, false, -1, elapsedMillis(started));
            int responseId = ((responseBytes[0] & 0xff) << 8) | (responseBytes[1] & 0xff);
            boolean isResponse = (responseBytes[2] & 0x80) != 0;
            int rcode = responseBytes[3] & 0x0f;
            return new DnsProbe(server, isResponse && responseId == transactionId, rcode, elapsedMillis(started));
        } catch (IOException ignored) {
            return new DnsProbe(server, false, -1, elapsedMillis(started));
        }
    }

    private void recordSample(Snapshot sample, List<TcpProbe> internetProbes, List<DnsProbe> dnsProbes) {
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("lanStatus", sample.lanStatus());
        fields.put("dnsStatus", sample.dnsStatus());
        fields.put("internetStatus", sample.internetStatus());
        fields.put("diagnosis", sample.diagnosis());
        fields.put("gateway", sample.gateway());
        fields.put("gatewayReachable", Boolean.toString(sample.gatewayReachable()));
        fields.put("dnsServers", String.join(",", sample.dnsServers()));
        fields.put("dnsResponsive", sample.dnsResolversResponsive() + "/" + sample.dnsResolversTested());
        fields.put("dnsHealthy", sample.dnsResolversHealthy() + "/" + sample.dnsResolversTested());
        fields.put("bestDnsLatencyMs", Long.toString(sample.bestDnsLatencyMs()));
        fields.put("directInternetReachable", sample.internetTargetsReachable() + "/" + sample.internetTargetsTested());
        fields.put("bestInternetLatencyMs", Long.toString(sample.bestInternetLatencyMs()));
        fields.put("directInternetEvidence", internetEvidence(internetProbes));
        fields.put("dnsEvidence", dnsEvidence(dnsProbes));
        fields.put("sampleDurationMs", Long.toString(sample.sampleDurationMs()));
        observeQuietly("NETWORK_HEALTH_SAMPLE", fields);

        HealthSignature signature = new HealthSignature(sample.lanStatus(), sample.dnsStatus(), sample.internetStatus(), sample.diagnosis());
        if (previousSignature == null) {
            observeQuietly("NETWORK_HEALTH_BASELINE", fields);
        } else if (!previousSignature.equals(signature)) {
            Map<String, String> change = new LinkedHashMap<>(fields);
            change.put("previousLanStatus", previousSignature.lanStatus());
            change.put("previousDnsStatus", previousSignature.dnsStatus());
            change.put("previousInternetStatus", previousSignature.internetStatus());
            change.put("previousDiagnosis", previousSignature.diagnosis());
            observeQuietly("NETWORK_HEALTH_CHANGED", change);
        }
        previousSignature = signature;
    }

    private static String diagnose(String lanStatus, String dnsStatus, String internetStatus) {
        if (internetStatus.equals("GOOD") && dnsStatus.equals("FAILING")) return "LIKELY DNS FAILURE";
        if (internetStatus.equals("GOOD") && dnsStatus.equals("DEGRADED")) return "DNS DEGRADED; INTERNET ROUTING HEALTHY";
        if (internetStatus.equals("GOOD") && dnsStatus.equals("GOOD")) return "HEALTHY";
        if (lanStatus.equals("NO DEFAULT ROUTE")) return "LIKELY LOCAL NETWORK / ROUTE FAILURE";
        if (internetStatus.equals("UNREACHABLE") && (dnsStatus.equals("UNKNOWN") || dnsStatus.equals("FAILING"))) {
            return "LIKELY UPSTREAM INTERNET OR ROUTING FAILURE";
        }
        if (dnsStatus.equals("NO RESOLVER CONFIG")) return "DNS CONFIGURATION MISSING";
        return "DEGRADED / INCONCLUSIVE";
    }

    private static byte[] buildDnsQuery(int transactionId, String hostname) {
        byte[] name = encodeDnsName(hostname);
        ByteBuffer buffer = ByteBuffer.allocate(12 + name.length + 4);
        buffer.putShort((short) transactionId);
        buffer.putShort((short) 0x0100); // recursion desired
        buffer.putShort((short) 1); // one question
        buffer.putShort((short) 0);
        buffer.putShort((short) 0);
        buffer.putShort((short) 0);
        buffer.put(name);
        buffer.putShort((short) 1); // A
        buffer.putShort((short) 1); // IN
        return buffer.array();
    }

    private static byte[] encodeDnsName(String hostname) {
        byte[] output = new byte[hostname.length() + 2];
        int out = 0;
        for (String label : hostname.split("\\.")) {
            byte[] bytes = label.getBytes(StandardCharsets.US_ASCII);
            output[out++] = (byte) bytes.length;
            System.arraycopy(bytes, 0, output, out, bytes.length);
            out += bytes.length;
        }
        output[out++] = 0;
        byte[] exact = new byte[out];
        System.arraycopy(output, 0, exact, 0, out);
        return exact;
    }

    private static String internetEvidence(List<TcpProbe> probes) {
        return probes.stream()
                .map(p -> p.host() + ":" + p.port() + "=" + (p.reachable() ? p.latencyMs() + "ms" : "timeout"))
                .reduce((a, b) -> a + ";" + b)
                .orElse("");
    }

    private static String dnsEvidence(List<DnsProbe> probes) {
        return probes.stream()
                .map(p -> p.server() + "=" + (p.responsive() ? "rcode" + p.rcode() + "/" + p.latencyMs() + "ms" : "timeout"))
                .reduce((a, b) -> a + ";" + b)
                .orElse("");
    }

    private static String scopeLinkLocal(String address, int interfaceIndex) {
        if (address == null || address.isBlank()) return "";
        String normalized = address.trim();
        if (normalized.contains(":")) {
            String lower = normalized.toLowerCase();
            if (lower.startsWith("fe80:") && !normalized.contains("%") && interfaceIndex > 0) return normalized + "%" + interfaceIndex;
        }
        return normalized;
    }

    private static int parseInt(String value, int fallback) {
        try { return Integer.parseInt(value.trim()); }
        catch (Exception ignored) { return fallback; }
    }

    private static long elapsedMillis(long startedNanos) {
        return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedNanos);
    }

    private void observeQuietly(String type, Map<String, String> fields) {
        try { recorder.observe(type, fields); }
        catch (IOException error) { lastError.set("Recorder write failed: " + error.getMessage()); }
    }

    @Override
    public void close() {
        scheduler.shutdownNow();
        probes.shutdownNow();
    }

    public record Snapshot(
            boolean supported,
            String lanStatus,
            String dnsStatus,
            String internetStatus,
            String diagnosis,
            String gateway,
            boolean gatewayReachable,
            List<String> dnsServers,
            int internetTargetsReachable,
            int internetTargetsTested,
            long bestInternetLatencyMs,
            int dnsResolversResponsive,
            int dnsResolversHealthy,
            int dnsResolversTested,
            long bestDnsLatencyMs,
            Instant sampledAt,
            long sampleDurationMs,
            String lastError
    ) {
        static Snapshot initial() {
            return new Snapshot(false, "COLLECTING", "COLLECTING", "COLLECTING", "COLLECTING BASELINE", "", false,
                    List.of(), 0, 0, -1L, 0, 0, 0, -1L, null, 0L, null);
        }

        static Snapshot unsupported(String message) {
            return new Snapshot(false, "UNSUPPORTED", "UNSUPPORTED", "UNSUPPORTED", "UNSUPPORTED", "", false,
                    List.of(), 0, 0, -1L, 0, 0, 0, -1L, Instant.now(), 0L, message);
        }
    }

    private record NetworkConfig(String gateway, int interfaceIndex, List<String> dnsServers) {
        static NetworkConfig empty() { return new NetworkConfig("", -1, List.of()); }
    }
    private record GatewayProbe(boolean reachable, long latencyMs) {}
    private record TcpProbe(String host, int port, boolean reachable, long latencyMs) {}
    private record DnsProbe(String server, boolean responsive, int rcode, long latencyMs) {
        boolean healthy() { return responsive && rcode == 0; }
    }
    private record HealthSignature(String lanStatus, String dnsStatus, String internetStatus, String diagnosis) {}
}
