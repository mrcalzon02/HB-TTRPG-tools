#!/usr/bin/env python3
"""Portable evidence-record validation. Does not execute engine adapters."""
import argparse
import datetime
import hashlib
import html
import json
from pathlib import Path, PurePosixPath
import re
import sys

PACKAGE = Path(__file__).resolve().parents[1]
SHA = re.compile(r"^[0-9a-f]{40}$")
HASH = re.compile(r"^[0-9a-f]{64}$")


def read_json(path):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError("duplicate JSON key: " + key)
            result[key] = value
        return result
    return json.loads(Path(path).read_text(encoding="utf-8-sig"), object_pairs_hook=unique,
                      parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))


def digest(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def text_value(value):
    return isinstance(value, str) and bool(value.strip())


def local_file(root, value):
    if not text_value(value) or "\\" in value or ":" in value:
        raise ValueError("expected relative POSIX file path")
    part = PurePosixPath(value)
    if part.is_absolute() or ".." in part.parts or not part.parts:
        raise ValueError("path escapes packet directory")
    result = (root / value).resolve()
    if not result.is_relative_to(root.resolve()):
        raise ValueError("resolved path escapes packet directory")
    if not result.is_file() or result.stat().st_size == 0:
        raise ValueError("missing or empty file: " + value)
    return result


def validate(path, require_complete=False):
    path = Path(path)
    errors = []
    try:
        packet = read_json(path)
        if not isinstance(packet, dict):
            raise ValueError("packet must be an object")
        manifest = read_json(PACKAGE / "manifest.json")
        if type(packet.get("schema_version")) is not int or packet["schema_version"] != 1:
            errors.append("schema_version must be integer 1")
        for field in ("map_id", "lore_name"):
            if not text_value(packet.get(field)):
                errors.append(field + " must be a nonempty string")
        revision = packet.get("input_revision")
        if not isinstance(revision, str) or not SHA.fullmatch(revision):
            errors.append("input_revision must be an exact lowercase 40-character Git SHA")
        root = path.resolve().parent
        try:
            local_file(root, packet.get("handoff"))
        except ValueError as exc:
            errors.append("handoff: " + str(exc))

        def indexed(field):
            values = packet.get(field)
            if not isinstance(values, list):
                errors.append(field + " must be an array")
                return {}
            result = {}
            for entry in values:
                if not isinstance(entry, dict) or not text_value(entry.get("id")):
                    errors.append(field + " entries need nonempty string IDs")
                    continue
                key = entry["id"]
                if key in result:
                    errors.append(field + " duplicate ID: " + key)
                result[key] = entry
            return result

        artifacts = indexed("artifacts")
        for key, artifact in artifacts.items():
            if artifact.get("kind") not in manifest["evidence_kinds"]:
                errors.append(key + ": unknown evidence kind")
            if not isinstance(artifact.get("input_revision"), str) or not SHA.fullmatch(artifact["input_revision"]):
                errors.append(key + ": missing input revision")
            expected = artifact.get("sha256")
            if not isinstance(expected, str) or not HASH.fullmatch(expected):
                errors.append(key + ": invalid SHA-256")
            try:
                actual = digest(local_file(root, artifact.get("path")))
                if actual != expected:
                    errors.append(key + ": SHA-256 mismatch")
            except ValueError as exc:
                errors.append(key + ": " + str(exc))

        def evidence_ids(record, label):
            values = record.get("evidence")
            if not isinstance(values, list) or any(not isinstance(v, str) for v in values):
                errors.append(label + ": evidence must be an array of artifact IDs")
                return []
            for value in values:
                if value not in artifacts:
                    errors.append(label + ": missing artifact " + value)
            return [v for v in values if v in artifacts]

        gates = indexed("gates")
        required = {g["id"]: g for g in manifest["gates"]}
        if set(gates) != set(required):
            errors.append("gates must match manifest exactly; missing=" + str(sorted(set(required)-set(gates)))
                          + "; unknown=" + str(sorted(set(gates)-set(required))))
        for key, gate in gates.items():
            if gate.get("status") not in ("open", "blocked", "passed"):
                errors.append(key + ": invalid gate status")
            ids = evidence_ids(gate, key)
            if gate.get("status") == "passed":
                review = gate.get("review")
                if not isinstance(review, dict):
                    errors.append(key + ": passed gate requires review")
                    review = {}
                for field in ("reviewer", "scope"):
                    if not text_value(review.get(field)):
                        errors.append(key + ": review needs " + field)
                if review.get("outcome") != "pass" or review.get("input_revision") != revision:
                    errors.append(key + ": review must pass current input revision")
                if review.get("reviewer_type") not in ("human", "agent", "automated"):
                    errors.append(key + ": invalid reviewer_type")
                try:
                    datetime.date.fromisoformat(review.get("date", ""))
                except (ValueError, TypeError):
                    errors.append(key + ": invalid review date")
                spec = required.get(key, {})
                for dependency in spec.get("depends_on", []):
                    if gates.get(dependency, {}).get("status") != "passed":
                        errors.append(key + ": prerequisite is not passed: " + dependency)
                if spec.get("human_required") and review.get("reviewer_type") != "human":
                    errors.append(key + ": requires an actual human review")
                kinds = {artifacts[i].get("kind") for i in ids}
                for kind in spec.get("requires", []):
                    if kind not in kinds:
                        errors.append(key + ": missing evidence kind " + kind)
                if any(artifacts[i].get("input_revision") != revision for i in ids):
                    errors.append(key + ": stale evidence revision")
            elif require_complete:
                errors.append(key + ": gate is not passed")

        defects = indexed("defects")
        for key, defect in defects.items():
            for field in ("summary", "affected_scope", "reproduction", "regression"):
                if not text_value(defect.get(field)):
                    errors.append(key + ": needs " + field)
            if defect.get("severity") not in ("critical", "major", "minor"):
                errors.append(key + ": invalid severity")
            status = defect.get("status")
            if status not in ("open", "fixed", "accepted"):
                errors.append(key + ": invalid defect status")
            if status == "fixed":
                ids = evidence_ids(defect, key)
                if not ids or defect.get("fix_revision") != revision:
                    errors.append(key + ": fixed defect requires current fix revision and evidence")
                if any(artifacts[i].get("input_revision") != revision for i in ids):
                    errors.append(key + ": stale fix evidence")
            if status == "accepted" and not text_value(defect.get("acceptance_reason")):
                errors.append(key + ": accepted defect needs acceptance_reason")
            if require_complete and status == "open":
                errors.append(key + ": unresolved defect")
        states = {key: gate.get("status") for key, gate in gates.items()}
        return {"record_valid": not errors, "completion_required": require_complete,
                "map_id": packet.get("map_id"), "input_revision": revision,
                "gates": states, "errors": errors,
                "boundary": "Record integrity only; supplied observations and attestations require independent review."}
    except (OSError, ValueError, TypeError) as exc:
        return {"record_valid": False, "completion_required": require_complete,
                "gates": {}, "errors": [str(exc)]}


def initialize(directory, map_id):
    root = Path(directory)
    root.mkdir(parents=True, exist_ok=False)
    manifest = read_json(PACKAGE / "manifest.json")
    packet = {"schema_version": 1, "map_id": map_id, "lore_name": map_id,
              "input_revision": "REPLACE_WITH_EXACT_INPUT_COMMIT",
              "gates": [{"id": g["id"], "status": "open", "evidence": [], "review": None}
                        for g in manifest["gates"]], "artifacts": [], "defects": [], "handoff": "HANDOFF.md"}
    (root / "packet.json").write_text(json.dumps(packet, indent=2) + "\n", encoding="utf-8")
    (root / "HANDOFF.md").write_bytes((PACKAGE / "examples/HANDOFF.md").read_bytes())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    init = sub.add_parser("init")
    init.add_argument("directory")
    init.add_argument("--map-id", required=True)
    sha = sub.add_parser("hash")
    sha.add_argument("file")
    for name in ("validate", "report"):
        p = sub.add_parser(name)
        p.add_argument("packet")
        p.add_argument("--require-complete", action="store_true")
        if name == "report":
            p.add_argument("--output", required=True)
    args = parser.parse_args()
    try:
        if args.command == "init":
            initialize(args.directory, args.map_id)
            print("Initialized open gates. Set exact input_revision before validation.")
            return 0
        if args.command == "hash":
            print(digest(args.file))
            return 0
        result = validate(args.packet, args.require_complete)
        rendered = json.dumps(result, indent=2, ensure_ascii=False)
        if args.command == "report":
            Path(args.output).write_text('<!doctype html><meta charset="utf-8"><title>Environment evidence report</title>'
                '<h1>Evidence record report</h1><p>This checks records, not independent map acceptance.</p><pre>'
                + html.escape(rendered) + '</pre>', encoding="utf-8")
        print(rendered)
        return 0 if result["record_valid"] else 1
    except (OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
