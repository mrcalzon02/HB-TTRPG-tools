#!/usr/bin/env python3
"""Read one Homebrew worker snapshot; never poll, cancel, or restart work.

Uses the existing GitHub Check Run and Actions run. GITHUB_TOKEN is optional for
public repositories. A stale heartbeat means contact is unknown, not a dead job.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import math
import os
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


CHECK_NAME = "Homebrew worker status"
STALE_SECONDS = 120
MAX_CHECK_PAGES = 3
MAX_RESPONSE_BYTES = 8 * 1024 * 1024
QUEUED = {"queued", "requested", "waiting", "pending"}


class ReadError(Exception):
    """A safe, user-facing read failure without credentials or response bodies."""


def utc_now():
    return datetime.now(timezone.utc)


def iso_utc(value):
    return value.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def age_seconds(value, now):
    if not isinstance(value, str):
        return None
    try:
        stamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if stamp.tzinfo is None:
            return None
        return max(0, round((now - stamp).total_seconds()))
    except (ValueError, OverflowError):
        return None


def short_text(value, maximum=240):
    if not isinstance(value, str):
        return None
    text = re.sub(r"[\x00-\x1f\x7f]", " ", value).strip()
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        text = text.replace(token, "[redacted]")
    text = re.sub(r"\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b", "[redacted]", text)
    text = re.sub(r"(?i)\bBearer\s+\S+", "Bearer [redacted]", text)
    return text[:maximum]


def integer(value):
    if isinstance(value, bool):
        return None
    try:
        number = int(value)
        return number if str(number) == str(value) and number >= 0 else None
    except (ValueError, TypeError, OverflowError):
        return None


def number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return value if math.isfinite(value) and value >= 0 else None


def github_json(path, token=None):
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28",
               "User-Agent": "Homebrew-worker-status/1"}
    if token:
        headers["Authorization"] = "Bearer " + token
    request = Request("https://api.github.com" + path, headers=headers)
    try:
        with urlopen(request, timeout=10) as response:
            data = response.read(MAX_RESPONSE_BYTES + 1)
    except HTTPError as exc:
        raise ReadError("GitHub returned HTTP %s; this read does not establish worker health." % exc.code) from None
    except (URLError, TimeoutError, OSError):
        raise ReadError("GitHub could not be reached within this read; connectivity and worker health are unknown.") from None
    if len(data) > MAX_RESPONSE_BYTES:
        raise ReadError("GitHub response exceeded the bounded reader limit.")
    try:
        result = json.loads(data)
    except (ValueError, UnicodeError):
        raise ReadError("GitHub returned an unreadable JSON response.") from None
    if not isinstance(result, dict):
        raise ReadError("GitHub returned an unexpected response shape.")
    return result


def matching_check(checks, run_id, attempt, commit):
    matches = [c for c in checks if isinstance(c, dict)
               and c.get("name") == CHECK_NAME
               and c.get("external_id") == "%s:%s" % (run_id, attempt)
               and c.get("head_sha") == commit]
    return max(matches, key=lambda c: integer(c.get("id")) or 0) if matches else None


def read_envelope(check, repo, run_id, attempt, commit):
    if check is None:
        return None, None
    try:
        text = check.get("output", {}).get("text")
        if not isinstance(text, str) or len(text) > 65535:
            raise ValueError()
        envelope = json.loads(text)
        worker = envelope["worker"]
        if (envelope.get("schema_version") != 1 or not isinstance(worker, dict)
                or worker.get("schema_version") != 1
                or worker.get("repository") != repo
                or str(worker.get("run_id")) != str(run_id)
                or integer(worker.get("run_attempt")) != attempt
                or worker.get("commit") != commit):
            raise ValueError()
        return envelope, None
    except (TypeError, ValueError, KeyError, AttributeError):
        return None, "The matching check has missing, invalid, or mismatched worker telemetry."


def evaluate_status(repo, run, checks, now=None, telemetry_error=None, search_truncated=False):
    """Pure interpretation: preserve authoritative Actions outcomes and uncertainty."""
    now = now or utc_now()
    run_id, attempt, commit = str(run["id"]), int(run["run_attempt"]), run["head_sha"]
    run_url = "https://github.com/%s/actions/runs/%s" % (repo, run_id)
    result = {"reader_schema_version": 1, "checked_utc": iso_utc(now), "repository": repo,
              "run_id": run_id, "run_attempt": attempt, "commit": commit, "run_url": run_url,
              "actions": {"status": run.get("status"), "conclusion": run.get("conclusion")}}
    check = matching_check(checks, run_id, attempt, commit)
    envelope, invalid = read_envelope(check, repo, run_id, attempt, commit)
    error = telemetry_error or invalid
    result["telemetry"] = {"state": "unavailable" if telemetry_error else "invalid" if invalid else "missing"}
    complete_receipt = False
    worker = {}
    if envelope:
        worker = envelope["worker"]
        observed_age = age_seconds(envelope.get("observed_utc"), now)
        progress_age = age_seconds(worker.get("last_progress_utc"), now)
        result["telemetry"] = {
            "state": "fresh" if observed_age is not None and observed_age <= STALE_SECONDS else "stale",
            "observed_utc": short_text(envelope.get("observed_utc"), 64), "age_seconds": observed_age,
            "publication_failures": integer(envelope.get("publication_failures")),
        }
        result["worker"] = {k: short_text(worker.get(k)) for k in ("runner", "mode", "stage", "state", "work_result")}
        result["worker"].update({"updated_utc": short_text(worker.get("updated_utc"), 64),
                                 "snapshot_age_seconds": age_seconds(worker.get("updated_utc"), now),
                                 "last_progress_utc": short_text(worker.get("last_progress_utc"), 64),
                                 "progress_age_seconds": progress_age})
        progress = worker.get("progress")
        if isinstance(progress, dict):
            reported = {k: number(progress.get(k)) for k in ("elapsed_seconds", "cpu_seconds", "working_set_bytes",
                                                            "stdout_bytes", "stderr_bytes", "output_files")}
            reported["process_alive"] = progress.get("process_alive") if isinstance(progress.get("process_alive"), bool) else None
            result["worker"]["progress_at_last_snapshot"] = reported
        delivery = worker.get("delivery") if isinstance(worker.get("delivery"), dict) else {}
        artifact_id = integer(delivery.get("artifact_id"))
        artifact_url = delivery.get("url")
        expected_url = "%s/artifacts/%s" % (run_url, artifact_id)
        valid_artifact_url = artifact_url == expected_url and artifact_id is not None and artifact_id > 0
        result["delivery"] = {"state": short_text(delivery.get("state")), "artifact_id": artifact_id,
                              "url": artifact_url if valid_artifact_url else None,
                              "digest": short_text(delivery.get("digest"), 80)}
        complete_receipt = (worker.get("state") == "completed" and worker.get("work_result") == "passed"
                            and delivery.get("state") == "uploaded" and valid_artifact_url
                            and check.get("status") == "completed" and check.get("conclusion") == "success")
        errors = worker.get("errors")
        if isinstance(errors, list):
            safe_errors = [short_text(e) for e in errors if isinstance(e, str)][:3]
            if safe_errors:
                result["worker"]["errors"] = safe_errors
    if error:
        result["telemetry"]["error"] = short_text(error)
    if search_truncated and check is None:
        result["telemetry"]["search_truncated"] = True

    actions_state, conclusion = run.get("status"), run.get("conclusion")
    if actions_state in QUEUED:
        state, summary = "queued", "Actions is %s; a worker heartbeat is not expected yet." % actions_state
        result["telemetry"]["state"] = "not_expected"
    elif actions_state == "completed" and conclusion == "cancelled":
        state, summary = "cancelled", "GitHub Actions confirms that this run attempt was cancelled."
    elif actions_state == "completed" and conclusion == "timed_out":
        state, summary = "timed_out", "GitHub Actions confirms that this run attempt reached its workflow timeout."
    elif actions_state == "completed" and conclusion != "success":
        state, summary = "blocked", "GitHub Actions finished with conclusion %s; inspect its run log." % (conclusion or "unknown")
    elif actions_state == "completed" and complete_receipt:
        state, summary = "completed", "Work passed, artifact delivery has a final receipt, and Actions completed successfully."
        result["telemetry"]["state"] = "final_receipt"
    elif actions_state == "completed":
        state, summary = "finished_receipt_missing", "Actions finished successfully, but a matching final work-and-upload receipt is not available."
    elif error:
        state, summary = "telemetry_unavailable", "Actions is %s; a usable worker snapshot could not be read." % actions_state
    elif not envelope:
        state, summary = "telemetry_missing", "Actions is %s; no matching worker snapshot is available for this run attempt." % actions_state
    elif complete_receipt:
        state, summary = "finishing", "Work and artifact delivery are complete; GitHub Actions has not finished the run yet."
    elif result["telemetry"]["state"] == "stale":
        state, summary = "telemetry_stale", "Status is stale; connectivity and current worker activity are unknown. No cancellation is implied."
    elif worker.get("state") == "blocked" or worker.get("work_result") == "blocked" or result.get("delivery", {}).get("state") == "failed":
        state, summary = "blocked", "The worker reported a blocked stage; diagnostic delivery may still be in progress."
    elif worker.get("state") == "cancelled":
        state, summary = "cancelled", "The worker reported cancellation; Actions has not yet published its final result."
    else:
        state, summary = "running", "The publisher is reporting; the latest worker stage is %s." % (short_text(worker.get("stage"), 80) or "unknown")
    result["state"], result["summary"] = state, summary
    return result


def collect_status(repo, run_id, attempt=None, get=None, now=None):
    get = get or (lambda path: github_json(path, os.environ.get("GITHUB_TOKEN")))
    run = get("/repos/%s/actions/runs/%s" % (repo, run_id))
    if attempt is not None and attempt != integer(run.get("run_attempt")):
        run = get("/repos/%s/actions/runs/%s/attempts/%s" % (repo, run_id, attempt))
    selected_attempt = integer(run.get("run_attempt"))
    if (str(run.get("id")) != str(run_id) or selected_attempt is None or selected_attempt < 1
            or (attempt is not None and selected_attempt != attempt)
            or not isinstance(run.get("head_sha"), str)
            or not re.fullmatch(r"[0-9a-f]{40}", run["head_sha"])):
        raise ReadError("GitHub returned inconsistent run identity; no worker state was inferred.")
    checks, read_error, truncated = [], None, False
    if run.get("status") not in QUEUED:
        try:
            for page in range(1, MAX_CHECK_PAGES + 1):
                query = urlencode({"check_name": CHECK_NAME, "filter": "all", "per_page": 100, "page": page})
                response = get("/repos/%s/commits/%s/check-runs?%s" % (repo, run["head_sha"], query))
                batch = response.get("check_runs")
                if not isinstance(batch, list):
                    raise ReadError("GitHub returned an unexpected check-run list.")
                checks.extend(batch)
                if len(batch) < 100:
                    break
                if page == MAX_CHECK_PAGES:
                    truncated = True
        except ReadError as exc:
            read_error = str(exc)
    return evaluate_status(repo, run, checks, now, read_error, truncated)


def format_status(result):
    def age(value):
        return "unknown" if value is None else "%ss" % value

    lines = ["%s: %s" % (result["state"].upper(), result["summary"])]
    if result.get("run_id"):
        lines.append("Run %s / attempt %s | checked %s" % (result["run_id"], result["run_attempt"], result["checked_utc"]))
    telemetry, worker, delivery = (result.get(k, {}) for k in ("telemetry", "worker", "delivery"))
    if worker:
        lines.append("Stage: %s | publisher sample age: %s | task snapshot age: %s | observed progress age: %s" %
                     (worker.get("stage"), age(telemetry.get("age_seconds")), age(worker.get("snapshot_age_seconds")), age(worker.get("progress_age_seconds"))))
        progress = worker.get("progress_at_last_snapshot", {})
        if progress:
            lines.append("Last task sample: process_alive=%s, output_files=%s, log_bytes=%s+%s. These are observations, not a completion percentage." %
                         (progress.get("process_alive"), progress.get("output_files"), progress.get("stdout_bytes"), progress.get("stderr_bytes")))
    if delivery:
        lines.append("Delivery: %s. Transfer rate and ETA are unavailable." % delivery.get("state"))
        if delivery.get("url"):
            lines.append(delivery["url"])
    if telemetry.get("error"):
        lines.append(telemetry["error"])
    if result.get("run_url"):
        lines.append(result["run_url"])
    return "\n".join(lines)


def positive_int(value):
    parsed = int(value)
    if parsed < 1:
        raise argparse.ArgumentTypeError("must be a positive integer")
    return parsed


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default="mrcalzon02/HB-TTRPG-tools")
    parser.add_argument("--run-id", type=positive_int, required=True)
    parser.add_argument("--attempt", type=positive_int)
    parser.add_argument("--json", action="store_true", dest="as_json")
    args = parser.parse_args(argv)
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", args.repo):
        parser.error("--repo must be owner/repository")
    code = 0
    try:
        result = collect_status(args.repo, args.run_id, args.attempt)
    except ReadError as exc:
        code = 2
        result = {"reader_schema_version": 1, "checked_utc": iso_utc(utc_now()), "repository": args.repo,
                  "state": "status_unavailable", "summary": str(exc), "contact": "unknown"}
    print(json.dumps(result, ensure_ascii=True, indent=2) if args.as_json else format_status(result))
    return code


if __name__ == "__main__":
    sys.exit(main())
