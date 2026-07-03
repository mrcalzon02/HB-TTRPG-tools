from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FILES = {
    "foundation": ROOT / "data/blacklight-continuum/rules/equipment-foundation.json",
    "historical": ROOT / "data/blacklight-continuum/rules/modern-historical-equipment.json",
    "relics": ROOT / "data/blacklight-continuum/rules/supernatural-artifacts-relics.json",
    "future": ROOT / "data/blacklight-continuum/rules/future-scavenged-survival-equipment.json",
    "alien": ROOT / "data/blacklight-continuum/rules/alien-technology-templates.json",
    "wiki": ROOT / "data/blacklight-continuum/wiki/equipment-catalogs.json",
    "index": ROOT / "data/blacklight-continuum/wiki/wiki-index.json",
}

EXPECTED_CATALOG_COUNTS = {
    "modern-weapons": 34,
    "modern-armor": 12,
    "world-war-one": 8,
    "world-war-two": 10,
    "medieval-arms-and-armor": 23,
    "human-compatible-future-weapons": 16,
    "human-compatible-future-armor-tools": 18,
    "scavenged-and-improvised-gear": 20,
    "survival-and-field-equipment": 34,
}

EXPECTED_RELICS = 22
EXPECTED_ALIEN_TEMPLATES = 16
EXPECTED_TOTAL_EQUIPMENT = 213
EXPECTED_WIKI_ENTRIES = 8


def load(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain a JSON object")
    return value


def assert_unique_ids(records: list[dict], label: str, global_ids: set[str]) -> None:
    local: set[str] = set()
    for record in records:
        record_id = record.get("id")
        assert isinstance(record_id, str) and record_id.strip(), f"{label} record missing id"
        assert record_id not in local, f"Duplicate {label} id: {record_id}"
        assert record_id not in global_ids, f"Duplicate equipment id across catalogs: {record_id}"
        local.add(record_id)
        global_ids.add(record_id)
        assert isinstance(record.get("name"), str) and record["name"].strip(), f"{record_id} missing name"


def validate_weapon_or_armor(record: dict) -> None:
    category = str(record.get("category", "")).lower()
    if any(word in category for word in ("weapon", "firearm", "explosive", "projectile")):
        assert "attackPool" in record or "activation" in record, f"{record['id']} missing attackPool or activation"
        if record.get("damageDice", 0):
            assert "damageType" in record, f"{record['id']} missing damageType"
    if any(word in category for word in ("armor", "shield", "protective suit")):
        assert "armorRating" in record or "effect" in record, f"{record['id']} missing armorRating or effect"
    if "load" in record:
        assert isinstance(record["load"], int) and 0 <= record["load"] <= 4, f"{record['id']} invalid Load"


def main() -> None:
    data = {name: load(path) for name, path in FILES.items()}

    foundation = data["foundation"]
    assert foundation["schemaVersion"] == "1.0.0"
    assert len(foundation.get("weaponTags", [])) == 24
    assert len(foundation.get("armorTags", [])) == 9
    assert len(foundation.get("conditionStates", [])) == 5

    global_ids: set[str] = set()
    total = 0

    catalog_lookup: dict[str, list[dict]] = {}
    for source_name in ("historical", "future"):
        for catalog in data[source_name].get("catalogs", []):
            catalog_id = catalog.get("id")
            assert catalog_id not in catalog_lookup, f"Duplicate catalog id: {catalog_id}"
            items = catalog.get("items", [])
            assert isinstance(items, list), f"{catalog_id} items must be a list"
            catalog_lookup[catalog_id] = items

    assert set(catalog_lookup) == set(EXPECTED_CATALOG_COUNTS), (
        f"Catalog ids differ. Expected {sorted(EXPECTED_CATALOG_COUNTS)}, got {sorted(catalog_lookup)}"
    )

    for catalog_id, expected in EXPECTED_CATALOG_COUNTS.items():
        records = catalog_lookup[catalog_id]
        assert len(records) == expected, f"{catalog_id}: expected {expected}, found {len(records)}"
        assert_unique_ids(records, catalog_id, global_ids)
        for record in records:
            validate_weapon_or_armor(record)
        total += len(records)

    relics = data["relics"].get("relics", [])
    assert len(relics) == EXPECTED_RELICS, f"Expected {EXPECTED_RELICS} relics, found {len(relics)}"
    assert_unique_ids(relics, "relic", global_ids)
    for relic in relics:
        for field in ("origin", "wielderRequirement", "skillRequirement", "attunement", "activation", "effect", "limit", "failure"):
            assert field in relic, f"{relic['id']} missing relic field {field}"
    total += len(relics)

    templates = data["alien"].get("templates", [])
    assert len(templates) == EXPECTED_ALIEN_TEMPLATES, (
        f"Expected {EXPECTED_ALIEN_TEMPLATES} alien templates, found {len(templates)}"
    )
    assert_unique_ids(templates, "alien template", global_ids)
    for template in templates:
        for field in (
            "originPattern", "suitableBases", "interface", "translationRequirement", "modification",
            "benefit", "instability", "failure", "reverseEngineering"
        ):
            assert field in template, f"{template['id']} missing alien-template field {field}"
    total += len(templates)

    assert total == EXPECTED_TOTAL_EQUIPMENT, f"Expected {EXPECTED_TOTAL_EQUIPMENT} records, found {total}"

    wiki_entries = data["wiki"].get("entries", [])
    assert len(wiki_entries) == EXPECTED_WIKI_ENTRIES, (
        f"Expected {EXPECTED_WIKI_ENTRIES} equipment wiki entries, found {len(wiki_entries)}"
    )
    wiki_ids = [entry.get("id") for entry in wiki_entries]
    assert len(wiki_ids) == len(set(wiki_ids)), "Duplicate equipment wiki entry id"

    index = data["index"]
    scope = index.get("completedScope", {})
    assert scope.get("totalEquipmentRecords") == EXPECTED_TOTAL_EQUIPMENT
    assert scope.get("supernaturalArtifactsAndRelics") == EXPECTED_RELICS
    assert scope.get("alienTechnologyTemplates") == EXPECTED_ALIEN_TEMPLATES
    assert "data/blacklight-continuum/wiki/equipment-catalogs.json" in index.get("packs", [])
    for key in (
        "equipmentFoundation", "modernHistoricalEquipment", "supernaturalRelics",
        "futureScavengedSurvivalEquipment", "alienTechnologyTemplates"
    ):
        assert key in index, f"wiki-index missing {key}"

    print(
        f"Validated {total} Blacklight equipment records, {len(foundation['weaponTags'])} weapon tags, "
        f"{len(foundation['armorTags'])} armor tags, and {len(wiki_entries)} wiki entries."
    )


if __name__ == "__main__":
    main()
