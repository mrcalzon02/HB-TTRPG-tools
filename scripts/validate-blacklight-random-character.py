from __future__ import annotations

import json
import random
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PATHS = {
    "rules": ROOT / "data/blacklight-continuum/rules/basic-character-options.json",
    "creation": ROOT / "data/blacklight-continuum/rules/character-creation-foundation.json",
    "content": ROOT / "data/blacklight-continuum/generators/random-character-content.json",
    "historical": ROOT / "data/blacklight-continuum/rules/modern-historical-equipment.json",
    "future": ROOT / "data/blacklight-continuum/rules/future-scavenged-survival-equipment.json",
    "relics": ROOT / "data/blacklight-continuum/rules/supernatural-artifacts-relics.json",
    "alien": ROOT / "data/blacklight-continuum/rules/alien-technology-templates.json",
    "wiki": ROOT / "data/blacklight-continuum/wiki/random-character-generator.json",
    "index": ROOT / "data/blacklight-continuum/wiki/wiki-index.json",
}

ATTRIBUTE_NAMES = {
    "Force", "Finesse", "Resilience",
    "Presence", "Guile", "Composure",
    "Reason", "Awareness", "Resolve",
}

REQUIRED_SHEET_FIELDS = {
    "characterName", "playerName", "pronouns", "campaign", "concept", "archetype",
    "archetypeRating", "operationalFrame", "lineageVariant", "currentFunction", "affiliation",
    "advancement", "force", "finesse", "resilience", "presence", "guile", "composure",
    "reason", "awareness", "resolve", "vitalityCurrent", "cohesionCurrent", "exposureCurrent",
    "armorRating", "resourceCurrent", "pressureCurrent", "specializations", "customAbilities",
    "conviction", "touchstone", "groupBond", "professionalObligation", "personalBoundary",
    "debtPromise", "charlesSavedMe", "charlesNeverAnswered", "signatureCapability",
    "capabilityExpression", "capabilityLimitation", "currentForm", "adaptations", "conditions",
    "armorAndProtection", "equipment", "contacts", "safeSite", "characterNotes", "secrets",
    "advancementPurchases", "missionRecord", "weapon1", "weapon1Pool", "weapon1Damage",
    "weapon1Range", "weapon1Notes",
}


def load(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        value = json.load(handle)
    assert isinstance(value, dict), f"{path} must contain a JSON object"
    return value


def allocate_attributes(preferred: set[str], key_attribute: str, rng: random.Random) -> dict[str, int]:
    attributes = {name: 1 for name in ATTRIBUTE_NAMES}
    remaining = 9
    while remaining:
        candidates = [name for name, value in attributes.items() if value < 4]
        weights = []
        for name in candidates:
            weight = 1.0
            if name in preferred:
                weight += 5
            if name == key_attribute:
                weight += 3
            if attributes[name] >= 3:
                weight *= 0.55
            weights.append(weight)
        selected = rng.choices(candidates, weights=weights, k=1)[0]
        attributes[selected] += 1
        remaining -= 1
    return attributes


def allocate_skills(skill_names: list[str], preferred: set[str], rng: random.Random) -> tuple[dict[str, int], str]:
    skills = {name: 0 for name in skill_names}
    preferred_options = [name for name in skill_names if name in preferred]
    signature = rng.choice(preferred_options or skill_names)
    skills[signature] = 4
    remaining = 20
    while remaining:
        candidates = [name for name in skill_names if name != signature and skills[name] < 3]
        weights = []
        for name in candidates:
            weight = 6.0 if name in preferred else 1.0
            if skills[name] == 0 and name in preferred:
                weight += 2
            if skills[name] >= 2:
                weight *= 0.55
            weights.append(weight)
        selected = rng.choices(candidates, weights=weights, k=1)[0]
        skills[selected] += 1
        remaining -= 1
    return skills, signature


def flatten_equipment(*sources: dict) -> list[dict]:
    records: list[dict] = []
    for source in sources:
        for catalog in source.get("catalogs", []):
            for item in catalog.get("items", []):
                records.append({**item, "catalogId": catalog.get("id")})
    return records


def is_weapon(item: dict) -> bool:
    return bool(re.search(r"weapon|firearm|explosive|projectile", str(item.get("category", "")), re.I)) and int(item.get("damageDice", 0) or 0) > 0


def is_protection(item: dict) -> bool:
    return bool(re.search(r"armor|protective suit|shield|defensive field|defense|powered support", str(item.get("category", "")), re.I))


def equipment_allowed(item: dict, era: str) -> bool:
    catalog = str(item.get("catalogId", ""))
    if era == "mixed":
        return True
    if era == "modern":
        return catalog.startswith("modern-")
    if era == "historical":
        return catalog in {"world-war-one", "world-war-two", "medieval-arms-and-armor"}
    if era == "future":
        return catalog.startswith("human-compatible-future-")
    if era == "scavenged":
        return catalog in {"scavenged-and-improvised-gear", "survival-and-field-equipment"}
    return True


def main() -> None:
    data = {name: load(path) for name, path in PATHS.items()}
    rules = data["rules"]
    creation = data["creation"]
    content = data["content"]

    assert content.get("schemaVersion") == "1.0.0"
    assert len(content.get("firstNames", [])) >= 60
    assert len(content.get("lastNames", [])) >= 60
    assert len(content.get("callsigns", [])) >= 20
    assert len(content.get("pronouns", [])) >= 3
    for key in (
        "affiliations", "safeSites", "personalObjects", "convictions", "touchstones", "groupBonds",
        "obligations", "boundaries", "debts", "charlesSaved", "charlesNeverAnswered", "secrets"
    ):
        assert len(content.get(key, [])) >= 10, f"Narrative library {key} is too small"

    skill_names = [skill for group in rules.get("skills", {}).values() for skill in group]
    assert len(skill_names) == 24
    assert set(content.get("specializations", {})) == set(skill_names)
    assert all(len(options) >= 3 for options in content["specializations"].values())

    standard_frames = set(creation["standardPackage"]["operationalFrame"]["options"])
    profiles = content.get("frameProfiles", {})
    assert set(profiles) == standard_frames
    assert len(profiles) == 12

    for frame, profile in profiles.items():
        assert len(profile.get("attributes", [])) >= 3, f"{frame} lacks Attribute priorities"
        assert set(profile["attributes"]) <= ATTRIBUTE_NAMES, f"{frame} has unknown Attribute"
        assert len(profile.get("skills", [])) >= 6, f"{frame} lacks Skill priorities"
        assert set(profile["skills"]) <= set(skill_names), f"{frame} has unknown Skill"
        assert len(profile.get("functions", [])) >= 4
        assert profile.get("weaponKinds")
        assert profile.get("armorKinds")
        assert profile.get("kits")

    archetypes = rules.get("archetypes", [])
    assert len(archetypes) == 6
    for archetype in archetypes:
        rank_one = [
            ability
            for family in archetype.get("powerFamilies", [])
            for ability in family.get("abilities", [])
            if int(ability.get("rank", 0)) == 1
        ]
        assert len(rank_one) >= 3, f"{archetype['name']} lacks three Rank 1 choices"
        assert archetype.get("startingAbility") in {ability.get("name") for ability in rank_one}
        assert archetype.get("keyAttribute") in ATTRIBUTE_NAMES

    # Simulate 3,600 standard allocations across every Frame and Archetype.
    simulations = 0
    for archetype in archetypes:
        for frame, profile in profiles.items():
            for iteration in range(50):
                rng = random.Random(f"{archetype['id']}:{frame}:{iteration}")
                attributes = allocate_attributes(set(profile["attributes"]), archetype["keyAttribute"], rng)
                assert sum(attributes.values()) == 18
                assert min(attributes.values()) >= 1
                assert max(attributes.values()) <= 4

                skills, signature = allocate_skills(skill_names, set(profile["skills"]), rng)
                assert sum(skills.values()) == 24
                assert skills[signature] == 4
                assert max(value for name, value in skills.items() if name != signature) <= 3
                assert len([name for name, value in skills.items() if value >= 2]) >= 2
                simulations += 1

    equipment = flatten_equipment(data["historical"], data["future"])
    universal_support = [item for item in equipment if item.get("catalogId") == "survival-and-field-equipment"]
    assert universal_support
    for era in ("mixed", "modern", "historical", "future", "scavenged"):
        era_items = [item for item in equipment if equipment_allowed(item, era)]
        weapons = [item for item in era_items if is_weapon(item)]
        protection = [item for item in era_items if is_protection(item)]
        tools = [item for item in [*era_items, *universal_support] if not is_weapon(item) and not is_protection(item)]
        assert weapons, f"{era} generation has no weapon candidates"
        assert protection, f"{era} generation has no protection candidates"
        assert tools, f"{era} generation has no field-kit candidates"

    assert len(data["relics"].get("relics", [])) >= 20
    assert len(data["alien"].get("templates", [])) >= 16

    sheet_html = (ROOT / "blacklight-character-sheet.html").read_text(encoding="utf-8")
    static_fields = set(re.findall(r'name="([^"]+)"', sheet_html))
    transition_js = (ROOT / "blacklight-archetype-transition.js").read_text(encoding="utf-8")
    dynamic_fields = set(re.findall(r"name: '([^']+)'", transition_js))
    missing_fields = REQUIRED_SHEET_FIELDS - static_fields - dynamic_fields
    assert not missing_fields, f"Generator targets unknown sheet fields: {sorted(missing_fields)}"

    generator_js = (ROOT / "blacklight-random-character.js").read_text(encoding="utf-8")
    for required in (
        "hb-ttrpg-tools-blacklight-basic-character-v1",
        "blacklight-continuum-basic-character",
        "selectedPowers",
        "generationSeed",
        "survival-and-field-equipment",
        "attributeTotal === 18",
        "skillTotal === 24",
        "location.href = 'blacklight-character-sheet.html?from=random'",
    ):
        assert required in generator_js, f"Generator JavaScript missing {required}"

    index = data["index"]
    assert index.get("randomCharacterGenerator") == "blacklight-random-character.html"
    assert index.get("randomCharacterContent") == "data/blacklight-continuum/generators/random-character-content.json"
    assert "data/blacklight-continuum/wiki/random-character-generator.json" in index.get("packs", [])
    assert index.get("completedScope", {}).get("randomCharacterGenerators") == 1
    assert len(data["wiki"].get("entries", [])) == 1

    print(
        f"Validated {simulations} legal Attribute/Skill allocations across "
        f"{len(archetypes)} Archetypes and {len(profiles)} Operational Frames."
    )


if __name__ == "__main__":
    main()
