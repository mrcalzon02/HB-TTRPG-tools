"""Offline, deterministic contract tests for the one-shot status reader."""

from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location("read_status", Path(__file__).with_name("read_status.py"))
reader = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(reader)

NOW = datetime(2026, 11, 9, 7, 0, tzinfo=timezone.utc)
REPO = "mrcalzon02/HB-TTRPG-tools"
SHA = "a" * 40


def fixture():
    run = {"id": 123, "run_attempt": 2, "head_sha": SHA, "status": "in_progress", "conclusion": None}
    worker = {"schema_version": 1, "repository": REPO, "run_id": "123", "run_attempt": 2,
              "commit": SHA, "runner": "fixture-runner", "mode": "status", "stage": "rendering",
              "state": "running", "work_result": "pending", "started_utc": "2026-11-09T06:50:00Z",
              "updated_utc": "2026-11-09T06:59:50Z", "last_progress_utc": "2026-11-09T06:59:49Z",
              "progress": {"process_alive": True, "output_files": 12, "stdout_bytes": 1200,
                           "stderr_bytes": 0, "cpu_seconds": 41, "elapsed_seconds": 48,
                           "working_set_bytes": 100000}, "delivery": {"state": "pending"}, "errors": []}
    envelope = {"schema_version": 1, "observed_utc": "2026-11-09T06:59:55Z",
                "publication_failures": 0, "worker": worker}
    check = {"id": 50, "name": reader.CHECK_NAME, "external_id": "123:2", "head_sha": SHA,
             "status": "in_progress", "conclusion": None, "output": {"text": json.dumps(envelope)}}
    return run, check, envelope


def evaluate(run, check, envelope=None, **kwargs):
    if envelope is not None:
        check["output"]["text"] = json.dumps(envelope)
    return reader.evaluate_status(REPO, run, [check], NOW, **kwargs)


def complete(run, check, envelope):
    run.update(status="completed", conclusion="success")
    check.update(status="completed", conclusion="success")
    envelope["worker"].update(state="completed", work_result="passed")
    envelope["worker"]["delivery"] = {"state": "uploaded", "artifact_id": "456",
        "url": "https://github.com/%s/actions/runs/123/artifacts/456" % REPO, "digest": "b" * 64}


class StatusContractTests(unittest.TestCase):
    def test_queued_needs_no_heartbeat_or_check_api_call(self):
        run, _, _ = fixture()
        run["status"] = "queued"
        calls = []
        def get(path):
            calls.append(path)
            return run
        result = reader.collect_status(REPO, 123, get=get, now=NOW)
        self.assertEqual(result["state"], "queued")
        self.assertEqual(result["telemetry"]["state"], "not_expected")
        self.assertEqual(len(calls), 1)

    def test_fresh_reporter_does_not_invent_useful_progress(self):
        run, check, envelope = fixture()
        envelope["worker"]["last_progress_utc"] = "2026-11-09T06:50:00Z"
        result = evaluate(run, check, envelope)
        self.assertEqual(result["state"], "running")
        self.assertEqual(result["worker"]["progress_age_seconds"], 600)
        self.assertEqual(result["telemetry"]["age_seconds"], 5)
        self.assertNotIn("percent", json.dumps(result))

    def test_stale_contact_never_means_worker_dead(self):
        run, check, envelope = fixture()
        envelope["observed_utc"] = "2026-11-09T06:50:00Z"
        result = evaluate(run, check, envelope)
        self.assertEqual(result["state"], "telemetry_stale")
        self.assertIn("unknown", result["summary"])
        self.assertTrue(result["worker"]["progress_at_last_snapshot"]["process_alive"])
        self.assertNotIn("worker_dead", json.dumps(result))

    def test_actions_failure_cancellation_timeout_override_running_telemetry(self):
        for conclusion, state in (("failure", "blocked"), ("cancelled", "cancelled"), ("timed_out", "timed_out")):
            with self.subTest(conclusion=conclusion):
                run, check, envelope = fixture()
                run.update(status="completed", conclusion=conclusion)
                envelope["observed_utc"] = "2026-11-09T06:00:00Z"
                self.assertEqual(evaluate(run, check, envelope)["state"], state)

    def test_wrong_run_attempt_or_commit_not_reused(self):
        for key, value in (("external_id", "124:2"), ("external_id", "123:1"), ("head_sha", "c" * 40)):
            with self.subTest(key=key, value=value):
                run, check, _ = fixture()
                check[key] = value
                self.assertEqual(evaluate(run, check)["state"], "telemetry_missing")

    def test_mismatched_envelope_is_invalid(self):
        run, check, envelope = fixture()
        envelope["worker"]["run_attempt"] = 1
        result = evaluate(run, check, envelope)
        self.assertEqual(result["state"], "telemetry_unavailable")
        self.assertEqual(result["telemetry"]["state"], "invalid")

    def test_success_without_final_upload_receipt_is_not_complete(self):
        run, check, envelope = fixture()
        run.update(status="completed", conclusion="success")
        envelope["worker"].update(work_result="passed", state="completed")
        self.assertEqual(evaluate(run, check, envelope)["state"], "finished_receipt_missing")

    def test_uploaded_label_without_artifact_id_is_not_a_receipt(self):
        run, check, envelope = fixture()
        complete(run, check, envelope)
        del envelope["worker"]["delivery"]["artifact_id"]
        self.assertEqual(evaluate(run, check, envelope)["state"], "finished_receipt_missing")

    def test_artifact_url_must_match_actual_run_and_id(self):
        run, check, envelope = fixture()
        complete(run, check, envelope)
        envelope["worker"]["delivery"]["url"] = "https://github.com/%s/actions/runs/122/artifacts/456" % REPO
        result = evaluate(run, check, envelope)
        self.assertEqual(result["state"], "finished_receipt_missing")
        self.assertIsNone(result["delivery"]["url"])

    def test_complete_final_receipt_remains_valid_when_old(self):
        run, check, envelope = fixture()
        complete(run, check, envelope)
        envelope["observed_utc"] = "2026-11-08T06:00:00Z"
        result = evaluate(run, check, envelope)
        self.assertEqual(result["state"], "completed")
        self.assertEqual(result["telemetry"]["state"], "final_receipt")

    def test_final_receipt_before_actions_cleanup_is_finishing(self):
        run, check, envelope = fixture()
        complete(run, check, envelope)
        run.update(status="in_progress", conclusion=None)
        self.assertEqual(evaluate(run, check, envelope)["state"], "finishing")

    def test_malformed_json_never_raises_or_implies_health(self):
        run, check, _ = fixture()
        for text in ("not json", "null", "[]", '{"schema_version":1}'):
            with self.subTest(text=text):
                check["output"]["text"] = text
                result = evaluate(run, check)
                self.assertEqual(result["state"], "telemetry_unavailable")

    def test_check_api_failure_preserves_known_actions_outcome(self):
        run, _, _ = fixture()
        run.update(status="completed", conclusion="failure")
        def get(path):
            if "/check-runs?" in path:
                raise reader.ReadError("GitHub could not be reached.")
            return run
        result = reader.collect_status(REPO, 123, get=get, now=NOW)
        self.assertEqual(result["state"], "blocked")
        self.assertEqual(result["telemetry"]["state"], "unavailable")

    def test_old_attempt_fetches_its_own_actions_outcome(self):
        current, _, _ = fixture()
        old = dict(current, run_attempt=1, status="completed", conclusion="cancelled")
        calls = []
        def get(path):
            calls.append(path)
            if "/check-runs?" in path:
                return {"check_runs": []}
            return old if path.endswith("/attempts/1") else current
        result = reader.collect_status(REPO, 123, attempt=1, get=get, now=NOW)
        self.assertEqual(result["state"], "cancelled")
        self.assertEqual(result["run_attempt"], 1)
        self.assertEqual(len(calls), 3)

    def test_reader_does_one_snapshot_and_no_repeated_poll(self):
        run, check, _ = fixture()
        calls = []
        def get(path):
            calls.append(path)
            return {"check_runs": [check]} if "/check-runs?" in path else run
        self.assertEqual(reader.collect_status(REPO, 123, get=get, now=NOW)["state"], "running")
        self.assertEqual(len(calls), 2)

    def test_pagination_is_bounded_and_reports_missing_scope(self):
        run, check, _ = fixture()
        check["external_id"] = "999:1"
        calls = []
        def get(path):
            calls.append(path)
            return {"check_runs": [check] * 100} if "/check-runs?" in path else run
        result = reader.collect_status(REPO, 123, get=get, now=NOW)
        self.assertEqual(len(calls), 1 + reader.MAX_CHECK_PAGES)
        self.assertTrue(result["telemetry"]["search_truncated"])

    def test_schema_mismatch_is_read_error(self):
        run, _, _ = fixture()
        run["id"] = 999
        with self.assertRaises(reader.ReadError):
            reader.collect_status(REPO, 123, get=lambda path: run, now=NOW)

    def test_secrets_and_terminal_control_sequences_are_not_printed(self):
        with patch.dict(reader.os.environ, {"GITHUB_TOKEN": "fixture-secret"}):
            text = reader.short_text("\x1b[31m fixture-secret Bearer hidden ghp_exampleVALUE")
        self.assertNotIn("fixture-secret", text)
        self.assertNotIn("Bearer hidden", text)
        self.assertNotIn("ghp_exampleVALUE", text)
        self.assertNotIn("\x1b", text)


if __name__ == "__main__":
    unittest.main()
