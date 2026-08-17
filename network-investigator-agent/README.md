# Network Investigator local companion

Network Investigator is the privileged/local half of the Scientific Tools network diagnostic system. The hosted site must not pretend that a browser can inspect Windows TCP ownership, services, Task Scheduler, WFP or ETW directly. This companion owns those responsibilities and serves its control UI only on loopback.

## Deployment-candidate capabilities

- Java 21 localhost service bound only to `127.0.0.1:8765`.
- Same-origin dashboard with a dominant `RECORD / STOP RECORDING` control.
- `PASSIVE -> RECORDING -> FINALIZING -> PASSIVE` recorder lifecycle.
- Disk-backed segmented passive pre-roll with a ten-minute target retention window.
- Pressing RECORD seals the current segment, preserves the stable pre-roll segments, opens a fresh passive segment immediately, and continues appending active evidence.
- `USER_PRESSED_RECORD`, `USER_EVENT_MARKER`, and `USER_STOPPED_RECORDING` evidence events.
- Wall-clock plus monotonic event timing.
- Session metadata and append-only JSONL raw evidence.
- Every event is flushed to disk in this implementation so a process or machine failure leaves useful evidence rather than an all-or-nothing in-memory capture.
- Process lifecycle/ancestry observation using Java `ProcessHandle`, with PID, process start time, executable, command line where exposed, user, parent PID and parent executable where available.
- Windows TCP ownership/state snapshots using `Get-NetTCPConnection`, correlated to the process baseline. Already-existing endpoints are explicitly recorded as baseline observations; later appearances/disappearances/state changes are separate events.
- Windows UDP endpoint ownership snapshots using `Get-NetUDPEndpoint`. The endpoint table does not expose the remote peer, so this baseline does not invent one; ETW is required for high-fidelity UDP traffic destinations.
- Five-second network-health evidence samples that keep local-route/gateway evidence, direct Internet-by-IP TCP reachability, and configured DNS-resolver responsiveness separate.
- DNS diagnosis probes the configured resolver addresses directly with a minimal `example.com` A query. `NOERROR` is treated as healthy; timeout, SERVFAIL, REFUSED and other non-zero response codes are not silently relabeled as success.
- Evidence-based diagnoses including `LIKELY DNS FAILURE` only when direct Internet-by-IP remains reachable while configured DNS resolvers fail.
- Dashboard counters for visible processes and current TCP/UDP endpoints, current LAN/DNS/Internet status, diagnosis evidence, and the local evidence path.
- Dashboard actions to open the evidence folder and cleanly stop the local agent.
- Local mutation token, Host validation, Origin validation, no CORS, and a restrictive CSP. The public GitHub Pages site should launch/direct the user to this local dashboard rather than receiving privileged telemetry itself.
- No application payload capture.

Data defaults to `%USERPROFILE%\Network Investigator`.

## Build a self-contained Windows bundle

A Windows JDK 21 is required **only on the build machine**. From PowerShell in `network-investigator-agent`:

```powershell
./build-windows.ps1
```

The build creates:

```text
dist/NetworkInvestigator-Windows-x64.zip
```

The ZIP contains a trimmed Java runtime, the agent JAR, the local dashboard, and a launcher. A target Windows machine does not need Java installed separately. Extract the ZIP and double-click `NetworkInvestigator.cmd`.

For source/development execution without packaging:

```powershell
New-Item -ItemType Directory -Force out | Out-Null
$Sources = Get-ChildItem src/main/java -Recurse -Filter *.java | ForEach-Object FullName
javac --release 21 --add-modules jdk.httpserver -d out $Sources
java --add-modules jdk.httpserver -cp out io.calzon.networkinvestigator.Main
```

Then open `http://127.0.0.1:8765/`.

## Windows CI gate

`.github/workflows/network-investigator-windows.yml` builds the self-contained bundle on `windows-latest`, launches the built artifact on an isolated test port, verifies `/api/status`, exercises `RECORD -> MARK EVENT -> STOP`, confirms the recorder returns to `PASSIVE`, tests clean agent shutdown, and uploads the ZIP as a workflow artifact.

A commit should not be called deployment-ready until that Windows job passes for the exact commit being deployed.

## Current evidence limitations

The PowerShell TCP/UDP path is a deliberately conservative baseline, not the final capture engine. A two-second snapshot can miss very short connections and does not provide per-flow byte counts, packet events or retransmission timing. Those belong in native IP Helper/ETW/WFP collectors rather than being approximated and mislabeled as facts.

Gateway reachability is supporting evidence only. A default route may be healthy even if a router ignores ICMP, so `ROUTE PRESENT` is intentionally distinct from a claimed gateway failure. Direct-IP probes currently use TCP/443 against several well-known public resolver addresses; restrictive enterprise/VPN/proxy environments can block those probes and therefore produce an inconclusive rather than definitive upstream diagnosis.

## Remaining fidelity upgrades

1. Native IP Helper endpoint collector, retaining the PowerShell collector as a diagnostic fallback.
2. ETW TCP/IP event ingestion for send/receive/connect/disconnect/retransmit events and per-flow throughput accounting.
3. Windows Service Control Manager attribution for shared hosts such as `svchost.exe`.
4. Task Scheduler inventory/run-event correlation so launch causes can be shown as evidence.
5. Route, adapter, neighbor, VPN/proxy and suspend/resume change events beyond the current default-route health snapshot.
6. Windows Firewall/WFP event and rule correlation.
7. Session index (SQLite), CSV projections, `SUMMARY.html`, replay/timeline and “What Changed?” analysis.

Attribution must always separate **observed fact** from **inferred purpose**. For example, a process/task/endpoint correlation may be confirmed while “software update check” remains probable. The tool must not claim that encrypted HTTPS payload semantics were observed when they were not.
