package io.calzon.networkinvestigator;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.concurrent.Executors;

public final class Main {
    private static final String HOST = "127.0.0.1";
    private static final int DEFAULT_PORT = 8765;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final SessionRecorder recorder;
    private final WindowsTelemetryCollector telemetry;
    private final String mutationToken;
    private final Path webRoot;

    private Main(SessionRecorder recorder, WindowsTelemetryCollector telemetry, Path webRoot) {
        this.recorder = recorder;
        this.telemetry = telemetry;
        this.webRoot = webRoot.toAbsolutePath().normalize();
        byte[] token = new byte[32];
        RANDOM.nextBytes(token);
        this.mutationToken = Base64.getUrlEncoder().withoutPadding().encodeToString(token);
    }

    public static void main(String[] args) throws Exception {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : DEFAULT_PORT;
        Path dataRoot = Path.of(System.getProperty("user.home"), "Network Investigator");
        Path webRoot = Path.of("web");
        SessionRecorder recorder = new SessionRecorder(dataRoot);
        WindowsTelemetryCollector telemetry = new WindowsTelemetryCollector(recorder);
        telemetry.start();
        Main app = new Main(recorder, telemetry, webRoot);
        HttpServer server = HttpServer.create(new InetSocketAddress(InetAddress.getByName(HOST), port), 32);
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        app.register(server, port);
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            telemetry.close();
            try { recorder.close(); }
            catch (IOException ignored) {}
        }, "network-investigator-shutdown"));
        server.start();
        System.out.printf("Network Investigator is running at http://%s:%d/%n", HOST, port);
        System.out.printf("Diagnostic data root: %s%n", dataRoot.toAbsolutePath());
    }

    private void register(HttpServer server, int port) {
        server.createContext("/api/status", exchange -> {
            if (!permitLocalRequest(exchange, port)) return;
            if (!"GET".equals(exchange.getRequestMethod())) { methodNotAllowed(exchange); return; }
            SessionRecorder.Status status = recorder.status();
            WindowsTelemetryCollector.Snapshot telemetryStatus = telemetry.snapshot();
            String body = "{" +
                    "\"state\":" + JsonUtil.quote(status.state().name()) + "," +
                    "\"preRollSeconds\":" + status.preRollAvailable().toSeconds() + "," +
                    "\"activeSeconds\":" + status.activeDuration().toSeconds() + "," +
                    "\"observedEvents\":" + status.observedEvents() + "," +
                    "\"processCount\":" + telemetryStatus.processCount() + "," +
                    "\"tcpEndpointCount\":" + telemetryStatus.tcpEndpointCount() + "," +
                    "\"udpEndpointCount\":" + telemetryStatus.udpEndpointCount() + "," +
                    "\"windowsCollectorSupported\":" + telemetryStatus.windowsCollectorSupported() + "," +
                    "\"collectorLastPoll\":" + JsonUtil.quote(telemetryStatus.lastSuccessfulPoll() == null ? null : telemetryStatus.lastSuccessfulPoll().toString()) + "," +
                    "\"collectorLastError\":" + JsonUtil.quote(telemetryStatus.lastError()) + "," +
                    "\"session\":" + JsonUtil.quote(status.sessionDirectory() == null ? null : status.sessionDirectory().getFileName().toString()) + "," +
                    "\"manualTrigger\":" + JsonUtil.quote(status.manualTrigger() == null ? null : status.manualTrigger().toString()) + "," +
                    "\"mutationToken\":" + JsonUtil.quote(mutationToken) +
                    "}";
            json(exchange, 200, body);
        });

        server.createContext("/api/record/start", exchange -> mutate(exchange, port, () -> recorder.startRecording()));
        server.createContext("/api/record/stop", exchange -> mutate(exchange, port, () -> recorder.stopRecording()));
        server.createContext("/api/marker", exchange -> {
            if (!permitMutation(exchange, port)) return;
            String note = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            try {
                recorder.markEvent(note);
                json(exchange, 200, "{\"ok\":true}");
            } catch (IllegalStateException e) {
                json(exchange, 409, "{\"error\":" + JsonUtil.quote(e.getMessage()) + "}");
            } catch (Exception e) {
                json(exchange, 500, "{\"error\":" + JsonUtil.quote(e.getMessage()) + "}");
            }
        });

        server.createContext("/", exchange -> {
            if (!permitLocalRequest(exchange, port)) return;
            if (!"GET".equals(exchange.getRequestMethod())) { methodNotAllowed(exchange); return; }
            serveStatic(exchange);
        });
    }

    private void mutate(HttpExchange exchange, int port, RecorderOperation operation) throws IOException {
        if (!permitMutation(exchange, port)) return;
        try {
            operation.run();
            json(exchange, 200, "{\"ok\":true}");
        } catch (IllegalStateException e) {
            json(exchange, 409, "{\"error\":" + JsonUtil.quote(e.getMessage()) + "}");
        } catch (Exception e) {
            json(exchange, 500, "{\"error\":" + JsonUtil.quote(e.getMessage()) + "}");
        }
    }

    private boolean permitMutation(HttpExchange exchange, int port) throws IOException {
        if (!permitLocalRequest(exchange, port)) return false;
        if (!"POST".equals(exchange.getRequestMethod())) { methodNotAllowed(exchange); return false; }
        String supplied = exchange.getRequestHeaders().getFirst("X-Network-Investigator-Token");
        if (!mutationToken.equals(supplied)) {
            json(exchange, 403, "{\"error\":\"Missing or invalid local mutation token.\"}");
            return false;
        }
        return true;
    }

    private boolean permitLocalRequest(HttpExchange exchange, int port) throws IOException {
        String host = exchange.getRequestHeaders().getFirst("Host");
        if (host == null || !(host.equals(HOST + ":" + port) || host.equals("localhost:" + port))) {
            text(exchange, 403, "Local Host header required.", "text/plain; charset=utf-8");
            return false;
        }
        String origin = exchange.getRequestHeaders().getFirst("Origin");
        if (origin != null && !(origin.equals("http://" + HOST + ":" + port) || origin.equals("http://localhost:" + port))) {
            text(exchange, 403, "Cross-origin access denied.", "text/plain; charset=utf-8");
            return false;
        }
        return true;
    }

    private void serveStatic(HttpExchange exchange) throws IOException {
        URI uri = exchange.getRequestURI();
        String requestPath = uri.getPath();
        if (requestPath.equals("/")) requestPath = "/index.html";
        Path candidate = webRoot.resolve(requestPath.substring(1)).normalize();
        if (!candidate.startsWith(webRoot) || !Files.isRegularFile(candidate)) {
            text(exchange, 404, "Not found.", "text/plain; charset=utf-8");
            return;
        }
        String type = requestPath.endsWith(".css") ? "text/css; charset=utf-8"
                : requestPath.endsWith(".js") ? "text/javascript; charset=utf-8"
                : "text/html; charset=utf-8";
        byte[] body = Files.readAllBytes(candidate);
        Headers headers = exchange.getResponseHeaders();
        harden(headers);
        headers.set("Content-Type", type);
        headers.set("Cache-Control", "no-store");
        exchange.sendResponseHeaders(200, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }

    private static void json(HttpExchange exchange, int status, String body) throws IOException {
        text(exchange, status, body, "application/json; charset=utf-8");
    }

    private static void text(HttpExchange exchange, int status, String body, String contentType) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        Headers headers = exchange.getResponseHeaders();
        harden(headers);
        headers.set("Content-Type", contentType);
        headers.set("Cache-Control", "no-store");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    private static void harden(Headers headers) {
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("Referrer-Policy", "no-referrer");
        headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'");
    }

    private static void methodNotAllowed(HttpExchange exchange) throws IOException {
        text(exchange, 405, "Method not allowed.", "text/plain; charset=utf-8");
    }

    @FunctionalInterface
    private interface RecorderOperation {
        Object run() throws Exception;
    }
}
