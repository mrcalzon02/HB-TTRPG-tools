# Network Investigator local companion

Network Investigator is the privileged/local half of the Scientific Tools network diagnostic system. The hosted site must not pretend that a browser can inspect Windows TCP ownership, services, Task Scheduler, WFP or ETW directly. This companion owns those responsibilities and serves its control UI only on loopback.

## Implemented in this slice

- Java 21, dependency-free localhost service bound to `127.0.0.1:8765`.
- Same-origin dashboard with a dominant `RECORD / STOP RECORDING` control.
- `PASSIVE -> RECORDING -> FINALIZING -> PASSIVE` recorder lifecycle.
- Disk-backed segmented passive pre-roll with a ten-minute target retention window.
- Pressing RECORD seals the current segment, preserves the stable pre-roll segments, opens a fresh passive segment immediately, and continues appending active evidence.
- `USER_PRESSED_RECORD`, `USER_EVENT_MARKER`, and `USER_STOPPED_RECORDING` evidence events.
- Wall-clock plus monotonic event timing.
- Session metadata and append-only JSONL raw evidence.
- Every event is flushed to disk in this first implementation so a process or machine failure leaves useful evidence rather than an all-or-nothing in-memory capture.
- Local mutation token, Host validation, Origin validation, no CORS, and a restrictive CSP. The public GitHub Pages site should launch/direct the user to this local dashboard rather than receiving privileged telemetry itself.
- No application payload capture.

Data defaults to `%USERPROFILE%\\Network Investigator`.

## Build / run on Windows

From PowerShell in `network-investigator-agent`:

```powershell
New-Item -ItemType Directory -Force out | Out-Null
$Sources = Get-ChildItem src/main/java -Recurse -Filter *.java | ForEach-Object FullName
javac --release 21 --add-modules jdk.httpserver -d out $Sources
java --add-modules jdk.httpserver -cp out io.calzon.networkinvestigator.Main
```

Then open `http://127.0.0.1:8765/`.

## Collector roadmap attached to this evidence pipeline

The recorder is intentionally implemented before the Windows-specific collectors so every later collector writes through one durable event contract instead of inventing its own log format. Next collectors should be added in this order:

1. Process lifecycle + ancestry snapshots, including executable path, command line where permitted, parent PID/start time, signer/product metadata where available.
2. TCP/UDP endpoint ownership and connection lifecycle using IP Helper first, then ETW for event/throughput fidelity.
3. DNS configuration, resolver tests and DNS-event correlation.
4. Windows Service Control Manager attribution for shared hosts such as `svchost.exe`.
5. Task Scheduler inventory/run-event correlation so launch causes can be shown as evidence.
6. Route, adapter, neighbor, VPN/proxy and suspend/resume state changes.
7. Windows Firewall/WFP event and rule correlation.
8. Session index (SQLite), CSV projections, `SUMMARY.html`, replay/timeline and “What Changed?” analysis.

Attribution must always separate **observed fact** from **inferred purpose**. For example, a process/task/endpoint correlation may be confirmed while “software update check” remains probable. The tool must not claim that encrypted HTTPS payload semantics were observed when they were not.
