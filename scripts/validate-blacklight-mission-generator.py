from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT_PATH = ROOT / "data/blacklight-continuum/generators/mission-generator-content.json"
WIKI_PATH = ROOT / "data/blacklight-continuum/wiki/mission-generator.json"
INDEX_PATH = ROOT / "data/blacklight-continuum/wiki/wiki-index.json"
HTML_PATH = ROOT / "blacklight-mission-generator.html"
CSS_PATH = ROOT / "blacklight-mission-generator.css"
JS_PATH = ROOT / "blacklight-mission-generator.js"
ENTRY_PATH = ROOT / "blacklight-mission-generator-entry.js"
HANDOFF_PATH = ROOT / "blacklight-character-sheet-handoff.js"

EXPECTED_COUNTS = {
    "legacyPatterns": 12,
    "operationTypes": 8,
    "clients": 12,
    "targetProfiles": 12,
    "locations": 20,
    "opposition": 10,
    "challenges": 32,
    "twists": 34,
    "deadlines": 24,
    "insertions": 10,
    "extractions": 10,
    "supportPackages": 10,
}

LAYERS = {"mundane", "adjacent", "mixed", "supernatural"}
REQUIRED_PATTERN_IDS = {
    "relocating-archive", "reinforced-relay", "missing-component", "compromised-cover",
    "biometric-laboratory", "industrial-front", "air-gapped-weapon", "decoy-artifact",
    "palace-mercenaries", "underground-vault", "counterfeit-masterpiece", "puzzle-server",
}
REQUIRED_OPERATION_IDS = {
    "acquisition", "surveillance", "sabotage", "interdiction",
    "investigation", "containment", "protection", "negotiation",
}


def load(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        value = json.load(handle)
    assert isinstance(value, dict), f"{path} must contain a JSON object"
    return value


def unique_ids(records: list[dict], label: str) -> set[str]:
    identifiers = [record.get("id") for record in records]
    assert all(isinstance(identifier, str) and identifier for identifier in identifiers), f"{label} has a missing id"
    assert len(identifiers) == len(set(identifiers)), f"{label} contains duplicate ids"
    return set(identifiers)


def main() -> None:
    content = load(CONTENT_PATH)
    wiki = load(WIKI_PATH)
    index = load(INDEX_PATH)

    assert content.get("schemaVersion") == "1.0.0"
    assert len(content.get("generationPrinciples", [])) >= 6
    assert "Unknown information must be labeled unknown" in " ".join(content["generationPrinciples"])
    assert "fictional scenario material" in " ".join(content["generationPrinciples"])

    for key, expected in EXPECTED_COUNTS.items():
        actual = len(content.get(key, []))
        assert actual == expected, f"Expected {expected} {key}, found {actual}"

    pattern_ids = unique_ids(content["legacyPatterns"], "legacyPatterns")
    operation_ids = unique_ids(content["operationTypes"], "operationTypes")
    client_ids = unique_ids(content["clients"], "clients")
    target_ids = unique_ids(content["targetProfiles"], "targetProfiles")
    location_ids = unique_ids(content["locations"], "locations")
    opposition_ids = unique_ids(content["opposition"], "opposition")
    challenge_ids = unique_ids(content["challenges"], "challenges")
    twist_ids = unique_ids(content["twists"], "twists")
    deadline_ids = unique_ids(content["deadlines"], "deadlines")

    assert pattern_ids == REQUIRED_PATTERN_IDS
    assert operation_ids == REQUIRED_OPERATION_IDS
    assert client_ids and target_ids and location_ids and opposition_ids

    source_missions = {pattern.get("sourceMission") for pattern in content["legacyPatterns"]}
    assert source_missions == set(range(1, 13)), "Legacy patterns must map once each to source missions 1–12"

    for pattern in content["legacyPatterns"]:
        assert set(pattern.get("operationTypes", [])) <= operation_ids
        assert len(pattern.get("signature", "")) >= 60
        assert set(pattern.get("preferredTwists", [])) <= twist_ids
        assert set(pattern.get("preferredDeadlines", [])) <= deadline_ids
        assert set(pattern.get("preferredChallenges", [])) <= challenge_ids

    for operation in content["operationTypes"]:
        assert operation.get("verbs") and len(operation["verbs"]) >= 5
        assert len(operation.get("success", "")) >= 50

    for client in content["clients"]:
        assert set(client.get("layers", [])) <= LAYERS
        for key in ("name", "type", "publicFace", "actualNeed", "pressure", "ethicalConcern"):
            assert len(str(client.get(key, ""))) >= 4, f"Client {client['id']} missing {key}"

    for target in content["targetProfiles"]:
        assert set(target.get("operationTypes", [])) <= operation_ids
        assert set(target.get("layers", [])) <= LAYERS
        assert len(target.get("sites", [])) >= 4
        assert len(target.get("assets", [])) >= 4
        assert len(target.get("security", [])) >= 4
        assert len(target.get("civilians", "")) >= 30

    for location in content["locations"]:
        assert location.get("regions")
        assert len(location.get("siteBias", [])) >= 2
        assert len(location.get("environment", "")) >= 30
        assert len(location.get("publicRisk", "")) >= 12

    for opponent in content["opposition"]:
        assert set(opponent.get("layers", [])) <= LAYERS
        for key in ("capability", "behavior", "reinforcement"):
            assert len(opponent.get(key, "")) >= 30

    for challenge in content["challenges"]:
        assert len(challenge.get("detail", "")) >= 30
        assert len(challenge.get("approaches", [])) >= 4

    for twist in content["twists"]:
        for key in ("label", "reveal", "change", "warning"):
            assert len(twist.get(key, "")) >= 12, f"Twist {twist['id']} missing {key}"

    for deadline in content["deadlines"]:
        for key in ("label", "clock", "event", "miss"):
            assert str(deadline.get(key, "")).strip(), f"Deadline {deadline['id']} missing {key}"

    for collection in ("insertions", "extractions"):
        for item in content[collection]:
            assert len(item.get("label", "")) >= 8
            assert len(item.get("detail", "")) >= 30

    for package in content["supportPackages"]:
        assert len(package.get("items", [])) >= 1
        assert len(package.get("limit", "")) >= 25

    assert len(content.get("publicExposure", [])) >= 12
    assert len(content.get("hiddenAgendas", [])) >= 12
    assert len(content.get("complications", [])) >= 16
    assert len(content.get("rewards", [])) >= 12
    assert len(content.get("aftermath", [])) >= 16
    assert len(content.get("codewords", {}).get("adjectives", [])) >= 20
    assert len(content.get("codewords", {}).get("nouns", [])) >= 20
    assert len(content.get("names", {}).get("first", [])) >= 30
    assert len(content.get("names", {}).get("last", [])) >= 30

    # Every selectable operation and Continuum layer must have compatible mission components,
    # regardless of which legacy pattern is selected.
    simulated_contracts = 0
    for pattern in content["legacyPatterns"]:
        for operation_id in sorted(operation_ids):
            for layer in sorted(LAYERS):
                clients = [client for client in content["clients"] if layer in client["layers"]]
                targets = [
                    target for target in content["targetProfiles"]
                    if layer in target["layers"] and operation_id in target["operationTypes"]
                ]
                opponents = [opponent for opponent in content["opposition"] if layer in opponent["layers"]]
                challenges = [
                    challenge for challenge in content["challenges"]
                    if layer != "mundane" or challenge["id"] != "supernatural-wards"
                ]
                assert clients, f"No client for {pattern['id']} / {operation_id} / {layer}"
                assert targets, f"No target for {pattern['id']} / {operation_id} / {layer}"
                assert opponents, f"No opposition for {pattern['id']} / {operation_id} / {layer}"
                assert len(challenges) >= 3
                assert content["deadlines"]
                assert content["insertions"] and content["extractions"] and content["supportPackages"]
                simulated_contracts += 1

    html = HTML_PATH.read_text(encoding="utf-8")
    for required in (
        "mission-pattern", "mission-operation", "mission-layer", "mission-threat", "mission-team",
        "mission-visibility", "mission-force-compromised", "mission-force-public", "mission-force-charles",
        "mission-reroll-contract", "mission-reroll-site", "mission-reroll-truth", "mission-reroll-cast",
        "mission-copy", "mission-export", "mission-print-player", "mission-print-full",
        "blacklight-mission-generator.js",
    ):
        assert required in html, f"Mission page missing {required}"

    css = CSS_PATH.read_text(encoding="utf-8")
    assert ".gm-only" in css
    assert ".print-player .gm-only" in css
    assert "@media print" in css

    js = JS_PATH.read_text(encoding="utf-8")
    for required in (
        "hb-ttrpg-tools-blacklight-mission-generator-v1",
        "hashSeed", "mulberry32", "rngFor", "controlsSignature",
        "buildContract", "buildSite", "buildTruth", "buildCast",
        "deriveDisclosure", "buildClues", "buildScenes", "buildClocks", "buildResolution",
        "buildPlayerConstraints", "renewed consent", "Principled Refusal",
        "Player Briefing and Mission Disclosure", "Truth Behind the Contract",
        "copyBriefing", "exportMission", "printMission", "print-player",
        "reroll('contract')", "reroll('site')", "reroll('truth')", "reroll('cast')",
    ):
        assert required in js, f"Mission generator JavaScript missing {required}"
    assert "Math.random()" not in js.replace("Math.random().toString", ""), "Mission content must use seeded RNG"
    assert js.count("number:") >= 7
    assert js.count("level:") >= 5

    entry_js = ENTRY_PATH.read_text(encoding="utf-8")
    assert "data-blacklight-mission-generator-card" in entry_js
    assert "12 legacy patterns" in entry_js
    assert "blacklight-mission-generator.html" in entry_js

    assert len(wiki.get("entries", [])) == 1
    wiki_entry = wiki["entries"][0]
    assert wiki_entry.get("id") == "blacklight-mission-generator"
    assert len(wiki_entry.get("body", [])) >= 6
    assert len(wiki_entry.get("tables", [])) >= 2

    main_index = (ROOT / "index.html").read_text(encoding="utf-8")
    assert "blacklight-mission-generator-entry.js" in main_index
    for page in ("blacklight-character-creation.html", "blacklight-random-character.html", "blacklight-veteran-reintroduction.html"):
        assert "blacklight-mission-generator.html" in (ROOT / page).read_text(encoding="utf-8")
    handoff = HANDOFF_PATH.read_text(encoding="utf-8")
    assert "data-blacklight-mission-link" in handoff
    assert "blacklight-mission-generator.html" in handoff

    assert index.get("schemaVersion") == "0.26.0"
    assert index.get("missionGeneratorModule") == "blacklight-mission-generator.html"
    assert index.get("missionGeneratorContent") == "data/blacklight-continuum/generators/mission-generator-content.json"
    assert "data/blacklight-continuum/wiki/mission-generator.json" in index.get("packs", [])
    scope = index.get("completedScope", {})
    assert scope.get("wikiEntries") == 82
    assert scope.get("nativePacks") == 12
    assert scope.get("missionGenerators") == 1
    assert scope.get("legacyMissionPatterns") == 12
    assert scope.get("generatedOperationTypes") == 8
    assert scope.get("generatedOperationalChallenges") == 32
    assert scope.get("generatedMissionTwists") == 34
    assert scope.get("generatedMissionDeadlines") == 24
    assert scope.get("generatedMissionScenes") == 7
    assert scope.get("generatedMissionResolutionLevels") == 5

    print(
        f"Validated {simulated_contracts} selectable pattern/operation/layer contracts, "
        f"{len(content['twists'])} twists, {len(content['challenges'])} challenges, "
        f"and {len(content['locations'])} locations."
    )


if __name__ == "__main__":
    main()
