# Homebrew worker status

The existing **Homebrew local worker** job publishes its current stage to a
GitHub Check Run named **Homebrew worker status**. Each workflow run and attempt
has its own check, attached to the exact source commit. The work still runs on
`OLD-CORE30-homebrew` in `D:\Runner\actions-runner`.

The status reporter is a small background PowerShell process in the same job.
It uses that job's temporary GitHub token with `contents: read` and
`checks: write`. It adds no separate workflow, persistent credential, listening
service, or automatic task restart.

## Read the status

Open the workflow run in GitHub for its steps, logs, artifact link, and final
job summary. Open the **Homebrew worker status** check on the run's source
commit for the live stage and the three separate timestamps.

For one compact assessment combining Actions and the check:

```sh
python tools/local-worker/read_status.py \
  --repo mrcalzon02/HB-TTRPG-tools \
  --run-id RUN_ID --json
```

Use `--attempt N` to inspect a particular attempt. `GITHUB_TOKEN` is optional
for public repository reads. The reader uses Python's standard library, makes
a bounded set of requests, and exits; it does not poll, restart, or cancel work.
Exit code 0 means it assessed the state, including a known failure. Exit code 2
means it could not safely read the Actions identity or status.

An assistant with the GitHub connector can read the same records:

1. `GET /repos/{owner}/{repo}/actions/runs/{run_id}` for the exact commit,
   attempt, and Actions outcome.
2. `GET /repos/{owner}/{repo}/commits/{sha}/check-runs?check_name=Homebrew%20worker%20status&filter=all&per_page=100`
   for the check whose `external_id` is `{run_id}:{attempt}`.
3. Read the compact JSON in that check's `output.text`, preserving the
   difference between the reporter's observation and actual work progress.

This integration makes status available for inspection. It does **not** wake
or resume a dormant ChatGPT conversation. A future notification integration
would need a separately supported event receiver and conversation mechanism.

## Interpret the evidence

| Evidence | Meaning |
| --- | --- |
| Actions queued or waiting | The job has not begun; a heartbeat is not expected. |
| Recent `observed_utc` | The reporter sampled the worker snapshot and successfully sent that observation. |
| `updated_utc` | When the task last wrote its local status snapshot. |
| `last_progress_utc` | Last observed stage transition, log/output growth, or task result. It is not a completion percentage. |
| Process CPU, memory, and alive counters | Observations at the recorded snapshot time. CPU use alone does not advance the progress clock. |
| Artifact delivery `uploading` | The workflow has reached the upload step. Live transferred bytes, percentage, and ETA are unavailable. |
| Heartbeat older than 120 seconds | Contact is stale; the worker's current activity is unknown. This is not a dead-worker diagnosis. |
| Actions succeeded but final receipt missing | The workflow finished, but this integration cannot confirm its final delivery receipt. |
| `completed` | Actions succeeded, work passed, the check completed successfully, and a finalized artifact ID and canonical URL are present. |

The connection is shared household broadband. Neither the speed-test result
nor a presumed minimum throughput is used for a failure deadline or ETA.
Congestion can delay both artifact delivery and telemetry. Reporting normally
occurs every 30 seconds; stage changes may report sooner, no more often than
every 10 seconds. Failed requests use bounded exponential backoff with jitter
up to 120 seconds. Each HTTP request has a 10-second timeout. An individual
request timeout affects reporting, not the task's outcome.

Status payloads are limited to 8 KiB. They include selected counters and short,
sanitized errors; they do not transport generated images, raw process logs,
or encoded binary files. Native process output streams directly to local log
files instead of accumulating the entire log in memory.

The worker's existing process time limits and 30-minute workflow limit remain
in force. They are resource bounds, not estimates derived from network speed.
This integration does not diagnose or repair a slow connection automatically.

## Completion and failure handling

The task writes atomic `worker-status.json` snapshots to its per-run report
directory. The publisher independently writes `publisher-receipt.json` and
`publisher-process.json`. Keeping those files separate avoids concurrent
writers replacing each other's state.

After the task ends, the existing `actions/upload-artifact` step publishes the
report and output files, including evidence from failed work. The finalizer
stops and joins its own publisher before writing the terminal state. It checks
the actual work and upload step outcomes and the upload action's artifact ID
and URL before reporting successful completion. A missing receipt stays
blocked or unconfirmed. Status publication failures preserve local work.

The artifact is uploaded **before** finalization, so its status files contain
the earlier snapshot. The final Check Run, GitHub job summary, and local
`worker-completion.md` carry the final delivery receipt. The uploaded artifact
is not rewritten to insert its own receipt.

If cancellation or job timeout prevents finalization, the reader uses the
authoritative Actions conclusion instead of trusting an old running check.
The publisher also has a 35-minute maximum lifetime and never kills or restarts
the worker's task processes. The finalizer verifies its publisher's PID and
start time before stopping it.

## Run the short integration check

Manually run **Homebrew local worker** with mode `status`. This runs offline
PowerShell contract tests and a roughly 40-second child process that emits
incremental log output, then uploads the evidence and finalizes the check. It
does not invoke the rendering or inference stages.

A main-branch push touching this workflow or `tools/local-worker/**` also uses
status mode when the head commit message includes `[worker-status-check]`.
This permits testing telemetry changes through the existing workflow without
requesting a workbench render. Other mode defaults and pinned workbench source
settings remain as declared in the workflow.

Offline reader tests:

```sh
python -m unittest discover -s tools/local-worker -p test_read_status.py
```

Offline PowerShell tests (Windows PowerShell 5.1 or PowerShell 7):

```powershell
powershell -NoProfile -File tools/local-worker/test_worker_status.ps1 -Directory TEMP_TEST_DIRECTORY
```

The tests use isolated files and mocked publication; they do not require a
GitHub token or send status to GitHub. The Windows status-mode workflow is the
deployment check for the actual runner shell, process lifecycle, live check,
and artifact receipt.

## Files

- `run_worker.ps1`: the existing task stages and streamed native process runner,
  downloaded at the workflow's exact commit to keep inline steps within GitHub's
  script-size limit.
- `worker_status.ps1`: atomic snapshot helpers, sanitized check payloads,
  publication, publisher ownership, and final receipt handling.
- `publish_status.ps1`: background observation and bounded publication retry.
- `read_status.py`: one-shot reconciliation of Actions, check identity,
  telemetry freshness, and completion receipt.
- `test_worker_status.ps1` and `test_read_status.py`: deterministic contract and
  failure-case tests.

GitHub references: [Checks API](https://docs.github.com/en/rest/checks/runs),
[workflow token](https://docs.github.com/en/actions/concepts/security/github_token),
and [upload-artifact outputs](https://github.com/actions/upload-artifact#outputs).
