from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data/blacklight-continuum/wiki/veteran-reintroduction.json"
INDEX_PATH = ROOT / "data/blacklight-continuum/wiki/wiki-index.json"
HTML_PATH = ROOT / "blacklight-veteran-reintroduction.html"
JS_PATH = ROOT / "blacklight-veteran-reintroduction.js"
ENTRY_PATH = ROOT / "blacklight-veteran-reintroduction-entry.js"
HANDOFF_PATH = ROOT / "blacklight-character-sheet-handoff.js"

EXPECTED_ENTRY_IDS = [
    "returning-operative",
    "accelerating-missions",
    "warehouse-convergence",
    "charles-embodied",
    "containment-cube",
    "leaving-earth",
    "lunar-convocation",
    "look-repentant",
    "five-blocs",
    "charges-against-charles",
    "return-and-silence",
    "interim-days",
    "company-introduction",
    "company-status",
    "chain-of-command",
    "mission-consent",
    "information-rights",
    "personhood-property",
    "support-obligations",
    "confidentiality-accountability",
    "watcher-oversight",
    "continuity-conversion",
    "charles-reckoning",
    "new-arrangement",
]

ALLOWED_PROMPT_TYPES = {"text", "textarea", "radio", "checkboxes", "acknowledge"}
REQUIRED_FINAL_PROMPTS = {"reasonToContinue", "arrangementToDefend", "finalAcknowledgement"}
REQUIRED_CONTINUITY_PROMPTS = {
    "serviceOrigin", "firstMissionMemory", "missionPatterns", "soloMissionEffect",
    "networkRealization", "embodiedCharlesReaction", "earpieceRemovalJudgment",
    "cubeBehavior", "cubeTrustQuestion", "questionDuringTransit", "convocationImpression",
    "convocationFear", "repentanceResponse", "charlesPowerLimit", "blocAlignment",
    "deservedCharge", "warehouseDecision", "silenceEffect", "interimContribution",
    "companyFirstReaction", "companyStatus", "companyFunction", "trustedAuthority",
    "authorityBoundary", "minimumInformation", "renewedConsentTrigger",
    "unacceptableOmission", "continuityClaim", "companySupportNeed", "reportingRoute",
    "confidentialityLimit", "watcherTrust", "legacyCapability", "legacyCost",
    "charlesSavedMe", "charlesNeverAnswered", "charlesAuthorityNow", "reasonToContinue",
    "arrangementToDefend", "finalAcknowledgement",
}


def load(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        value = json.load(handle)
    assert isinstance(value, dict), f"{path} must contain a JSON object"
    return value


def main() -> None:
    data = load(DATA_PATH)
    index = load(INDEX_PATH)

    assert data.get("schemaVersion") == "1.0.0"
    assert data.get("title") == "BlackLight Reorientation: The New Arrangement"
    usage = data.get("usage", {})
    assert "BlackLight Company is the voluntary field company" in usage.get("companyDefinition", "")
    assert "Charles is neither the Company nor its owner" in usage.get("companyDefinition", "")
    assert "Established experiences" in usage.get("continuityRule", "")

    entries = data.get("entries", [])
    assert len(entries) == 24, f"Expected 24 reorientation stages, found {len(entries)}"
    entry_ids = [entry.get("id") for entry in entries]
    assert entry_ids == EXPECTED_ENTRY_IDS, "Veteran reorientation stage order or identifiers changed"
    assert len(entry_ids) == len(set(entry_ids)), "Duplicate reorientation stage id"

    prompt_ids: list[str] = []
    required_prompt_ids: set[str] = set()
    total_body_paragraphs = 0
    total_table_rows = 0
    for entry in entries:
        assert isinstance(entry.get("title"), str) and entry["title"].startswith("Reorientation ")
        assert isinstance(entry.get("summary"), str) and len(entry["summary"]) >= 60
        body = entry.get("body", [])
        assert isinstance(body, list) and len(body) >= 3, f"{entry['id']} needs at least three body paragraphs"
        total_body_paragraphs += len(body)
        assert isinstance(entry.get("charlesPrompt"), str) and len(entry["charlesPrompt"]) >= 30
        for table in entry.get("tables", []):
            columns = table.get("columns", [])
            rows = table.get("rows", [])
            assert columns and rows, f"{entry['id']} contains an empty table"
            assert all(len(row) == len(columns) for row in rows), f"{entry['id']} table row width mismatch"
            total_table_rows += len(rows)
        prompts = entry.get("prompts", [])
        assert prompts, f"{entry['id']} needs at least one guided prompt"
        for prompt in prompts:
            prompt_id = prompt.get("id")
            assert isinstance(prompt_id, str) and prompt_id, f"{entry['id']} prompt missing id"
            prompt_ids.append(prompt_id)
            prompt_type = prompt.get("type")
            assert prompt_type in ALLOWED_PROMPT_TYPES, f"{prompt_id} has invalid type {prompt_type}"
            assert isinstance(prompt.get("label"), str) and len(prompt["label"]) >= 12
            if prompt.get("required"):
                required_prompt_ids.add(prompt_id)
            if prompt_type in {"radio", "checkboxes"}:
                options = prompt.get("options", [])
                assert isinstance(options, list) and len(options) >= 2, f"{prompt_id} lacks options"
                response_values = set((prompt.get("responsesByValue") or {}).keys())
                assert response_values <= set(options), f"{prompt_id} response key not present in options"
            if prompt_type == "acknowledge":
                assert prompt.get("required") is True
                assert "true" in (prompt.get("responsesByValue") or {})

    assert len(prompt_ids) == len(set(prompt_ids)), "Duplicate guided prompt id"
    assert len(prompt_ids) >= 45, f"Expected at least 45 prompts, found {len(prompt_ids)}"
    assert REQUIRED_CONTINUITY_PROMPTS <= set(prompt_ids), "A required continuity topic is missing"
    assert REQUIRED_FINAL_PROMPTS == {prompt["id"] for prompt in entries[-1]["prompts"]}
    assert REQUIRED_CONTINUITY_PROMPTS <= required_prompt_ids | {"recognizedWarehouseFace", "transitRole", "charlesDefense", "newConnection", "acceptableRedaction", "identityDisputeRule", "recoveryPromise", "legacyEvent"}

    company_status = next(prompt for entry in entries for prompt in entry["prompts"] if prompt["id"] == "companyStatus")
    assert len(company_status["options"]) == 6
    assert company_status["options"] == [
        "Full Company Operative", "Attached Specialist", "Independent Affiliate",
        "Reserve or On-Call Member", "Protected Former Participant", "External Witness or Advisor"
    ]

    complete_text = json.dumps(data, ensure_ascii=False)
    for required_text in (
        "Seattle", "Bangladesh", "warehouse", "earpieces", "silver", "containment cube",
        "Moon", "Eternals", "Solars", "Eldritch", "dragons", "Cain", "Seelie", "Unseelie",
        "look sad", "five moving blocs", "voluntary", "Eva Frost", "Blacklight Intelligence",
        "The BlackLight Company would be the people", "no-return possibility", "does not own",
        "capability-first", "previous life failed validation"
    ):
        assert required_text.lower() in complete_text.lower(), f"Missing continuity concept: {required_text}"

    assert total_body_paragraphs >= 105
    assert total_table_rows >= 55

    html = HTML_PATH.read_text(encoding="utf-8")
    assert "blacklight-veteran-reintroduction.js" in html
    assert "Restart Reorientation" in html
    assert "New Operative Induction" in html
    assert "Random Character Generator" in html

    js = JS_PATH.read_text(encoding="utf-8")
    for required in (
        "hb-ttrpg-tools-blacklight-veteran-reorientation-v1",
        "hb-ttrpg-tools-blacklight-veteran-reorientation-record-v1",
        "state.draft.responses[prompt.id] =",
        "delete state.draft.responses[prompt.id]",
        "One current response per field",
        "blacklight-character-sheet.html?from=veteran",
        "veteranContinuityRecord",
        "companyStatus",
        "legacyCapability",
        "legacyCost",
        "finalAcknowledgement",
    ):
        assert required in js, f"Reorientation JavaScript missing {required}"
    assert "responses.push" not in js, "Responses must replace by prompt id rather than append duplicates"

    entry_js = ENTRY_PATH.read_text(encoding="utf-8")
    assert "24 guided stages" in entry_js
    assert "blacklight-veteran-reintroduction.html" in entry_js

    handoff = HANDOFF_PATH.read_text(encoding="utf-8")
    for required in (
        "fromVeteran", "veteranContinuityRecord", "BlackLight Veteran Continuity Record",
        "restoreStoredField", "hb-ttrpg-tools-blacklight-veteran-reorientation-record-v1"
    ):
        assert required in handoff, f"Character-sheet handoff missing {required}"

    main_index = (ROOT / "index.html").read_text(encoding="utf-8")
    assert "blacklight-veteran-reintroduction-entry.js" in main_index
    assert "blacklight-veteran-reintroduction.html" in (ROOT / "blacklight-character-creation.html").read_text(encoding="utf-8")
    assert "blacklight-veteran-reintroduction.html" in (ROOT / "blacklight-random-character.html").read_text(encoding="utf-8")

    assert index.get("schemaVersion") == "0.25.0"
    assert index.get("veteranReintroductionModule") == "blacklight-veteran-reintroduction.html"
    assert index.get("veteranReintroductionData") == "data/blacklight-continuum/wiki/veteran-reintroduction.json"
    assert "data/blacklight-continuum/wiki/veteran-reintroduction.json" in index.get("packs", [])
    scope = index.get("completedScope", {})
    assert scope.get("wikiEntries") == 81
    assert scope.get("nativePacks") == 11
    assert scope.get("veteranReintroductionStages") == 24
    assert scope.get("blackLightCompanyStatusOptions") == 6
    assert scope.get("veteranContinuitySheetTransfers") == 1

    print(
        f"Validated {len(entries)} veteran stages, {len(prompt_ids)} guided prompts, "
        f"{total_body_paragraphs} narrative paragraphs, and {total_table_rows} reference rows."
    )


if __name__ == "__main__":
    main()
