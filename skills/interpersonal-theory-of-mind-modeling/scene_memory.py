"""Reviewable, source-annotated fiction dialogue -> character memory.

No network, model execution, spreadsheet writes, or automatic truth inference.
A writer/model must extract and review speakers, listeners and propositions.
"""
import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import re

SCENE = "fiction.scene-memory-scene.v1"
LEDGER = "fiction.scene-memory-ledger.v1"
IDENT = re.compile(r"^[A-Za-z][A-Za-z0-9_.:-]{0,79}$")
STANCES = {"asserted", "self_report", "assumed", "denied", "corrected", "speculated", "asked", "quoted"}
BELIEFS = {"accepts", "doubts", "rejects", "suspects", "uncertain"}
CONFIDENCE = {"unknown", "low", "medium", "high"}


class SceneError(ValueError):
    pass


def _check(cond, message):
    if not cond:
        raise SceneError(message)


def _id(value):
    _check(isinstance(value, str) and IDENT.fullmatch(value), "invalid actor/event ID")
    return value


def _string(value, limit=2048):
    _check(isinstance(value, str) and 0 < len(value.strip()) <= limit, "invalid bounded text")
    return value


def _object(obj, required, optional=()):
    _check(isinstance(obj, dict) and set(required).issubset(obj) and
           set(obj).issubset(set(required) | set(optional)), "invalid record fields")
    return obj


def _actors(values, allowed, limit=50):
    _check(isinstance(values, list) and len(values) <= limit and
           all(isinstance(x, str) and x in allowed for x in values) and
           len(values) == len(set(values)), "unknown or duplicate actor")
    return values


def _digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False,
                                     separators=(",", ":")).encode("utf8")).hexdigest()


def blank():
    return {"schema": LEDGER, "scenes": {}, "characters": {}, "belief_history": []}


def apply_scene(prior, scene):
    """Pure reducer: no mutation until every provenance/epistemic check passes."""
    _object(prior, ("schema", "scenes", "characters", "belief_history"))
    _check(prior["schema"] == LEDGER and isinstance(prior["scenes"], dict) and
           isinstance(prior["characters"], dict) and isinstance(prior["belief_history"], list),
           "invalid prior ledger")
    _object(scene, ("schema", "id", "series", "segment", "source_ref",
                    "canon_status", "characters", "presence_observations", "turns"),
            ("belief_updates", "reactivations"))
    _check(scene["schema"] == SCENE and scene["canon_status"] in
           ("canon", "draft", "provisional"), "scene schema or canon status invalid")
    sid = _id(scene["id"])
    for field in ("series", "segment", "source_ref"):
        _string(scene[field], 512)
    ids = scene["characters"]
    _check(isinstance(ids, list) and 1 <= len(ids) <= 50 and
           all(isinstance(x, str) and IDENT.fullmatch(x) for x in ids) and
           len(set(ids)) == len(ids), "invalid scene actor roster")
    _check(isinstance(scene["turns"], list) and 1 <= len(scene["turns"]) <= 120,
           "scene requires 1..120 dialogue turns")
    sha = _digest(scene)
    existing = prior["scenes"].get(sid)
    if existing:
        _check(existing.get("sha256") == sha, "scene ID already used for different content")
        return copy.deepcopy(prior)
    output = copy.deepcopy(prior)
    for actor in ids:
        state = output["characters"].setdefault(
            actor, {"memories": [], "claims_heard": [], "presence": [], "beliefs": [], "reactivations": []})
        _check(all(isinstance(state.get(x), list) for x in
                   ("memories", "claims_heard", "presence", "beliefs", "reactivations")),
               "invalid stored character ledger")
    observations = scene["presence_observations"]
    _check(isinstance(observations, list) and len(observations) <= len(ids),
           "invalid presence list")
    visible = {}
    for entry in observations:
        _object(entry, ("observer", "recognized"))
        holder = _id(entry["observer"])
        _check(holder in ids and holder not in visible, "duplicate or unknown observer")
        visible[holder] = _actors(entry["recognized"], set(ids))
        output["characters"][holder]["presence"].append(
            {"scene_id": sid, "recognized": list(visible[holder]),
             "basis": "explicitly-observed", "source_ref": scene["source_ref"]})
    previous_claims = {f"{s}/{t['id']}/{c['id']}"
                       for s, record in output["scenes"].items()
                       for t in record.get("turns", [])
                       for c in t.get("claims", [])}
    heard_claims = {}
    turns, seen_turns = [], set()
    for turn in scene["turns"]:
        _object(turn, ("id", "speaker", "addressed_to", "heard_by", "text", "claims"),
                ("salience",))
        turn_id = _id(turn["id"])
        _check(turn_id not in seen_turns, "duplicate turn")
        seen_turns.add(turn_id)
        speaker = _id(turn["speaker"])
        _check(speaker in ids, "speaker not in scene")
        heard = _actors(turn["heard_by"], set(ids))
        addressed = _actors(turn["addressed_to"], set(heard))
        _check(speaker in heard and speaker not in addressed, "speaker must hear own speech")
        text = _string(turn["text"], 8000)
        salience = turn.get("salience", {})
        _object(salience, (), ("importance", "emotion", "relationship", "recall_hooks"))
        levels = {}
        for key in ("importance", "emotion", "relationship"):
            level = salience.get(key, 1)
            _check(type(level) is int and 1 <= level <= 5,
                   "author-supplied salience must be an integer from 1 to 5")
            levels[key] = level
        hooks = salience.get("recall_hooks", [])
        _check(isinstance(hooks, list) and len(hooks) <= 12 and
               all(isinstance(h, str) and 1 <= len(h.strip()) <= 100 for h in hooks),
               "invalid recall hooks")
        claims = turn["claims"]
        _check(isinstance(claims, list) and len(claims) <= 12, "invalid claim count")
        saved_claims, claim_ids = [], set()
        for claim in claims:
            _object(claim, ("id", "about", "proposition", "stance"), ("corrects",))
            cid = _id(claim["id"])
            _check(cid not in claim_ids, "duplicate claim")
            claim_ids.add(cid)
            subject, proposition = _id(claim["about"]), _string(claim["proposition"], 500)
            stance = claim["stance"]
            _check(stance in STANCES, "invalid speech stance")
            corrects = claim.get("corrects", [])
            _check(isinstance(corrects, list) and len(corrects) <= 8 and
                   len(set(corrects)) == len(corrects) and
                   all(ref in previous_claims for ref in corrects),
                   "correction requires earlier claim")
            ref = f"{sid}/{turn_id}/{cid}"
            saved_claims.append({"id": cid, "about": subject, "proposition": proposition,
                                 "stance": stance, "corrects": list(corrects)})
            previous_claims.add(ref)
            heard_claims[ref] = set(heard)
            for listener in heard:
                output["characters"][listener]["claims_heard"].append({
                    "claim_ref": ref, "source_speaker": speaker, "about": subject,
                    "proposition": proposition, "stance": stance, "corrects": list(corrects),
                    "scene_id": sid, "source_ref": scene["source_ref"],
                    "epistemic_status": "heard-attributed-statement",
                    "objective_truth": "not-established"})
        turns.append({"id": turn_id, "speaker": speaker,
                      "addressed_to": list(addressed), "heard_by": list(heard),
                      "claims": saved_claims})
        for listener in heard:
            output["characters"][listener]["memories"].append({
                "memory_id": f"{sid}/{turn_id}", "scene_id": sid, "segment": scene["segment"],
                "source_ref": scene["source_ref"], "speaker": speaker, "addressed_to": list(addressed),
                "utterance": text, "recognized_attendees": list(visible.get(listener, [])),
                "salience": levels, "recall_hooks": list(hooks),
                "recall_state": "unspecified", "source_canon_status": scene["canon_status"]})
    updates = scene.get("belief_updates", [])
    _check(isinstance(updates, list) and len(updates) <= 100, "invalid belief updates")
    update_ids = set()
    for item in updates:
        _object(item, ("id", "holder", "about", "claim_ref", "belief", "confidence", "reason"))
        uid, holder, about = _id(item["id"]), _id(item["holder"]), _id(item["about"])
        _check(uid not in update_ids and holder in ids, "invalid or duplicate belief holder/update")
        update_ids.add(uid)
        ref = item["claim_ref"]
        _check(ref in previous_claims and (holder in heard_claims.get(ref, ()) or
               any(x["claim_ref"] == ref for x in output["characters"][holder]["claims_heard"])),
               "belief holder lacks access to the supporting claim")
        _check(item["belief"] in BELIEFS and item["confidence"] in CONFIDENCE,
               "invalid belief assessment")
        reason = _string(item["reason"], 500)
        updated = {"update_id": f"{sid}/{uid}", "holder": holder, "about": about,
                   "claim_ref": ref, "belief": item["belief"], "confidence": item["confidence"],
                   "reason": reason, "source_ref": scene["source_ref"],
                   "epistemic_status": "interpreted-belief-not-objective-fact"}
        output["characters"][holder]["beliefs"].append(updated)
        output["belief_history"].append(updated)
    reactivations = scene.get("reactivations", [])
    _check(isinstance(reactivations, list) and len(reactivations) <= 50,
           "invalid reactivations")
    for item in reactivations:
        _object(item, ("holder", "memory_id", "hook"))
        holder = _id(item["holder"])
        mid, hook = _string(item["memory_id"], 240), _string(item["hook"], 240)
        _check(holder in ids and any(m["memory_id"] == mid
                                    for m in output["characters"][holder]["memories"]),
               "cannot recall a memory the character did not observe")
        output["characters"][holder]["reactivations"].append({
            "scene_id": sid, "memory_id": mid, "hook": hook,
            "source_ref": scene["source_ref"], "effect": "explicit-cued-recall"})
    output["scenes"][sid] = {"sha256": sha, "series": scene["series"],
                             "segment": scene["segment"], "source_ref": scene["source_ref"],
                             "canon_status": scene["canon_status"], "turns": turns}
    return output


def recall(ledger, actor, cue, limit=8):
    _id(actor)
    _string(cue, 120)
    _check(type(limit) is int and 1 <= limit <= 30, "invalid recall page size")
    state = ledger.get("characters", {}).get(actor)
    if not state:
        return {"actor": actor, "matches": [], "total": 0}
    words = set(re.findall(r"[\w-]{3,}", cue.casefold()))
    matches = []
    for mem in state["memories"]:
        haystack = (mem["utterance"] + " " + " ".join(mem["recall_hooks"])).casefold()
        common = sum(w in haystack for w in words)
        if common:
            repeated = sum(x["memory_id"] == mem["memory_id"] for x in state["reactivations"])
            score = common * 3 + mem["salience"]["importance"] + mem["salience"]["emotion"] + repeated
            matches.append((score, mem))
    matches.sort(key=lambda x: (-x[0], x[1]["memory_id"]))
    return {"actor": actor, "cue": cue, "total": len(matches),
            "matches": [{"memory_id": m["memory_id"], "speaker": m["speaker"],
                         "utterance": m["utterance"], "segment": m["segment"],
                         "score": sc, "status": "recall-candidate-not-guaranteed"}
                        for sc, m in matches[:limit]]}


def read_json(path):
    _check(path.is_file() and path.stat().st_size <= 4_000_000,
           "input JSON missing or oversized")
    obj = json.loads(path.read_text(encoding="utf8"))
    _check(isinstance(obj, dict), "JSON root must be object")
    return obj


def main(argv=None):
    p = argparse.ArgumentParser(description="Fiction scene memory; reviewed annotations")
    sub = p.add_subparsers(dest="command", required=True)
    a = sub.add_parser("apply")
    a.add_argument("--scene", type=Path, required=True)
    a.add_argument("--ledger", type=Path)
    a.add_argument("--output", type=Path, required=True)
    q = sub.add_parser("recall")
    q.add_argument("--ledger", type=Path, required=True)
    q.add_argument("--actor", required=True)
    q.add_argument("--cue", required=True)
    opts = p.parse_args(argv)
    try:
        if opts.command == "apply":
            paths = [opts.scene, opts.output] + ([opts.ledger] if opts.ledger else [])
            _check(len({x.resolve() for x in paths}) == len(paths),
                   "output must not overwrite input or prior ledger")
            next_ledger = apply_scene(read_json(opts.ledger) if opts.ledger else blank(),
                                      read_json(opts.scene))
            data = (json.dumps(next_ledger, ensure_ascii=False, indent=2) + "\n").encode("utf8")
            _check(len(data) <= 8_000_000, "ledger too large")
            opts.output.parent.mkdir(parents=True, exist_ok=True)
            with opts.output.open("xb") as f:
                f.write(data)
                f.flush()
                os.fsync(f.fileno())
            report = {"status": "saved-new-ledger", "scenes": len(next_ledger["scenes"]),
                      "characters": len(next_ledger["characters"]), "output": str(opts.output)}
        else:
            report = recall(read_json(opts.ledger), opts.actor, opts.cue)
    except (SceneError, OSError, UnicodeError, json.JSONDecodeError) as ex:
        p.exit(2, f"blocked: {ex}\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
