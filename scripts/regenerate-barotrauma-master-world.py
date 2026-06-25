#!/usr/bin/env python3
"""Regenerate the checked-in Barotrauma verified Masterworld save."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORLD_SCHEMA_PATH = ROOT / "data" / "barotrauma" / "tools" / "world" / "world-state-schema.json"
LOCATION_REGISTRY_PATH = ROOT / "data" / "barotrauma" / "tools" / "locations" / "location-level-registry.json"
DEFAULT_OUTPUT_PATH = ROOT / "data" / "barotrauma" / "tools" / "world" / "master-world-save.json"

MAP_PREFIX = [
    "Abyssal",
    "Benthos",
    "Blackwater",
    "Caligo",
    "Crown",
    "Deep",
    "Erebus",
    "Frost",
    "Grave",
    "Hadopelagic",
    "Icefall",
    "Jovian",
    "Kelp",
    "Luminous",
    "Morrow",
    "Nadir",
    "Orpheus",
    "Pressure",
    "Quiet",
    "Rift",
    "Stygian",
    "Thalassa",
    "Umbral",
    "Vesper",
]

MAP_SUFFIX = [
    "Gate",
    "Reach",
    "Station",
    "Shaft",
    "Trench",
    "Crossing",
    "Hollow",
    "Basin",
    "Spine",
    "Vault",
    "Passage",
    "Scar",
    "Deep",
    "Refuge",
    "Array",
    "Relay",
]

FACTIONS = [
    "The Alliance",
    "The Syndicate",
    "The Confederacy",
    "Independent",
    "Europa Coalition",
    "Separatist Administration",
    "Research Compact",
    "Free Captains",
]

SPECIALTIES = [
    "Weapons and security",
    "Medical and biotechnology",
    "Salvage and engineering",
    "Trade and fabrication",
    "Diving and survival equipment",
    "Research and alien technology",
    "Mining and heavy industry",
    "Submarine systems and power",
    "Agriculture and life support",
    "Neutral markets and transport",
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def stable_int(text: str) -> int:
    return int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:16], 16)


def level_for_ring(ring: int, rings: int) -> int:
    if ring == 0:
        return 10
    return max(1, min(9, 1 + math.floor((rings - ring) * 9 / rings)))


def weighted_ring_counts(rings: int, requested_nodes: int, minimum_per_ring: int) -> list[int]:
    baseline_total = rings * minimum_per_ring
    available = max(0, requested_nodes - 1 - baseline_total)
    total_weight = rings * (rings + 1) / 2
    raw_extras = [available * (index + 1) / total_weight for index in range(rings)]
    extras = [math.floor(value) for value in raw_extras]
    remainder = available - sum(extras)
    order = sorted(
        range(rings),
        key=lambda index: (raw_extras[index] - extras[index], index),
        reverse=True,
    )
    for index in order[:remainder]:
        extras[index] += 1
    return [minimum_per_ring + extra for extra in extras]


def unique_name(rng: random.Random, used: set[str]) -> str:
    for _ in range(200):
        name = f"{rng.choice(MAP_PREFIX)} {rng.choice(MAP_SUFFIX)}"
        if name not in used:
            used.add(name)
            return name
    name = f"Europa Site {len(used) + 1:03d}"
    used.add(name)
    return name


def profile_for_node(node: dict, profiles_by_level: dict[int, list[dict]], rng: random.Random) -> dict:
    level = level_for_ring(int(node["ring"]), 48)
    pool = profiles_by_level[level]
    if level == 10:
        unique = [item for item in pool if item.get("unique")]
        return unique[0] if unique else pool[0]
    if node["type"] == "station":
        station_pool = [item for item in pool if item.get("stationEligible")]
        return rng.choice(station_pool or pool)
    non_station_pool = [item for item in pool if not item.get("stationEligible")]
    return rng.choice(non_station_pool or pool)


def apply_location_profile(node: dict, profile: dict, level_profiles: dict[int, dict], used_names: set[str]) -> None:
    level = int(profile["level"])
    level_profile = level_profiles[level]
    original_type = node["type"]
    node.update(
        {
            "locationLevel": level,
            "locationLevelName": level_profile.get("name", f"Level {level}"),
            "locationLevelSubtitle": level_profile.get("subtitle", ""),
            "locationTypeId": profile["id"],
            "locationTypeName": profile["name"],
            "locationLore": profile.get("lore", ""),
            "locationAvailability": profile.get("availability", ""),
            "locationShops": profile.get("shops", []),
            "locationServices": profile.get("services", []),
            "locationHazards": profile.get("hazards", []),
            "locationFactions": profile.get("factions", []),
            "locationDanger": level_profile.get("danger", level),
            "encounterLocation": bool(profile.get("encounterEligible")),
            "stationLocation": bool(profile.get("stationEligible")),
            "availabilityTier": level,
        }
    )
    if profile.get("unique"):
        node["name"] = profile["name"]
        node["type"] = "anomaly"
    elif original_type != "station":
        node["name"] = f"{MAP_PREFIX[stable_int(node['id']) % len(MAP_PREFIX)]} {profile['name']}"
    node["details"] = (
        f"Level {level}: {level_profile.get('name', '')} - {profile['name']}. "
        f"{profile.get('lore', '')} Availability: {profile.get('availability', '')}"
    )
    used_names.add(node["name"])


def build_world(seed: str, world_id: str, schema: dict, location_registry: dict) -> dict:
    defaults = schema["mapDefaults"]
    rings = int(defaults["rings"])
    total_locations = int(defaults["totalLocations"])
    station_target = int(defaults["stationTarget"])
    branching = int(defaults.get("branching", 48))
    shell_radius = int(defaults["shellRadius"])
    minimum_per_ring = int(defaults.get("minimumNodesPerRing", 8))
    generated_at = utc_now()
    rng = random.Random(stable_int(f"{seed}|{rings}|{total_locations}|{station_target}|{branching}|{shell_radius}|python-masterworld"))

    margin = 520
    width = math.ceil(shell_radius * 2 + margin * 2)
    height = width
    center = {"x": width / 2, "y": height / 2}
    nodes = [
        {
            "id": "anomaly",
            "name": "The Central Anomaly",
            "type": "anomaly",
            "ring": 0,
            "x": center["x"],
            "y": center["y"],
            "details": f"The campaign's ultimate destination, {rings} mandatory inward voyages from the outer shell.",
            "pressure": rings + 1,
            "outerBias": 0,
        }
    ]

    ring_counts = weighted_ring_counts(rings, total_locations, minimum_per_ring)
    for ring, count in enumerate(ring_counts, start=1):
        radius = shell_radius * ring / rings
        phase = rng.random() * math.tau
        for index in range(count):
            angle = phase + math.tau * index / count + (rng.random() - 0.5) * min(0.1, 1.5 / count)
            jitter = (rng.random() - 0.5) * min(90, radius * 0.025)
            nodes.append(
                {
                    "id": f"node-{ring}-{index}",
                    "name": "",
                    "type": "hazard",
                    "ring": ring,
                    "x": center["x"] + math.cos(angle) * (radius + jitter),
                    "y": center["y"] + math.sin(angle) * (radius + jitter),
                    "details": "",
                    "pressure": max(1, rings - ring + 1),
                    "outerBias": ring / rings,
                }
            )

    used_names = {"The Central Anomaly"}
    candidates = [node for node in nodes if node["id"] != "anomaly"]
    outer = [node for node in candidates if node["ring"] == rings]
    rng.shuffle(outer)
    selected = {node["id"] for node in outer[: min(len(outer), math.ceil(station_target * 0.6))]}
    remaining = sorted(
        (node for node in candidates if node["id"] not in selected),
        key=lambda node: (node["ring"] / rings) * 2 + rng.random(),
        reverse=True,
    )
    for node in remaining:
        if len(selected) >= station_target:
            break
        selected.add(node["id"])

    for node in candidates:
        if node["id"] in selected:
            node["type"] = "station"
            node["name"] = unique_name(rng, used_names)
            node["faction"] = rng.choice(FACTIONS)
            node["specialty"] = rng.choice(SPECIALTIES)
            node["locals"] = f"{node['name']} Administrator; {node['name']} Quartermaster"
            node["details"] = f"{node['faction']}. {node['specialty']}. Important locals: {node['locals']}."
            node["surface"] = node["ring"] == rings
        else:
            roll = rng.random()
            node["type"] = "outpost" if roll < 0.25 else "wreck" if roll < 0.5 else "ruins" if roll < 0.7 else "hazard"
            node["name"] = unique_name(rng, used_names)
            node["details"] = "A saved Masterworld location."

    nodes_by_ring: dict[int, list[dict]] = {}
    for node in nodes:
        nodes_by_ring.setdefault(int(node["ring"]), []).append(node)

    target_angle = rng.random() * math.tau
    current = min(
        nodes_by_ring[rings],
        key=lambda node: (0 if node["type"] == "station" else 1, abs(math.atan2(node["y"] - center["y"], node["x"] - center["x"]) - target_angle)),
    )
    path_node_ids: list[str] = []
    for ring in range(rings, 0, -1):
        current["type"] = "station"
        current["worldDepthSpine"] = True
        current["mandatoryInwardStation"] = True
        current["depthRing"] = ring
        current["depthMissionIndex"] = rings - ring
        path_node_ids.append(current["id"])
        if ring == 1:
            current = nodes[0]
        else:
            current_angle = math.atan2(current["y"] - center["y"], current["x"] - center["x"])
            current = min(
                nodes_by_ring[ring - 1],
                key=lambda node: (abs(math.atan2(node["y"] - center["y"], node["x"] - center["x"]) - current_angle), node["id"]),
            )
    nodes[0]["worldDepthSpine"] = True
    nodes[0]["depthMissionIndex"] = rings
    path_node_ids.append("anomaly")

    edges: list[dict] = []
    edge_keys: set[tuple[str, str]] = set()

    def add_edge(left: dict, right: dict, force_danger: bool = False, relation: str = "local") -> dict | None:
        if left["id"] == right["id"] or abs(int(left["ring"]) - int(right["ring"])) > 1:
            return None
        key = tuple(sorted((left["id"], right["id"])))
        if key in edge_keys:
            for edge in edges:
                if tuple(sorted((edge["a"], edge["b"]))) == key:
                    return edge
            return None
        edge_keys.add(key)
        geometric = math.hypot(left["x"] - right["x"], left["y"] - right["y"])
        nominal_leg = max(1, shell_radius / rings)
        edge = {
            "id": f"edge-{len(edges) + 1}",
            "a": left["id"],
            "b": right["id"],
            "distance": max(1, round(geometric / nominal_leg)),
            "voyages": 1,
            "danger": force_danger or left["type"] == "hazard" or right["type"] == "hazard" or rng.random() < 0.18,
            "relation": relation,
        }
        edges.append(edge)
        return edge

    edge_ids: list[str] = []
    node_by_id = {node["id"]: node for node in nodes}
    for index in range(len(path_node_ids) - 1):
        left = node_by_id[path_node_ids[index]]
        right = node_by_id[path_node_ids[index + 1]]
        edge = add_edge(left, right, relation="central-anomaly" if right["id"] == "anomaly" else "one-ring-inward")
        if edge is None:
            raise RuntimeError(f"Could not add depth edge {left['id']} -> {right['id']}")
        edge["worldDepthSpine"] = True
        edge["mandatoryInward"] = True
        edge["depthMissionIndex"] = index
        edge_ids.append(edge["id"])

    for ring in range(1, rings + 1):
        current_ring = nodes_by_ring[ring]
        inward_ring = nodes_by_ring[ring - 1]
        for node in current_ring:
            nearest = sorted(inward_ring, key=lambda other: math.hypot(node["x"] - other["x"], node["y"] - other["y"]))
            add_edge(node, nearest[0], relation="one-ring-inward")
            if len(nearest) > 1 and rng.random() < branching / 100:
                add_edge(node, nearest[1], relation="one-ring-inward")
        for index, node in enumerate(current_ring):
            add_edge(node, current_ring[(index + 1) % len(current_ring)], rng.random() < 0.12, "same-ring")
            if index + 2 < len(current_ring) and rng.random() < branching / 180:
                add_edge(node, current_ring[index + 2], relation="same-ring")

    for node in nodes:
        node["start"] = False
    node_by_id[path_node_ids[0]]["start"] = True

    level_profiles = {int(item["level"]): item for item in location_registry["levels"]}
    profiles_by_level: dict[int, list[dict]] = {}
    for profile in location_registry["locations"]:
        profiles_by_level.setdefault(int(profile["level"]), []).append(profile)
    for node in nodes:
        profile_rng = random.Random(stable_int(f"{seed}|{node['id']}|location-profile"))
        apply_location_profile(node, profile_for_node(node, profiles_by_level, profile_rng), level_profiles, used_names)

    map_data = {
        "schemaVersion": schema["schemaVersion"],
        "worldScaleVersion": "2.0.0",
        "worldId": world_id,
        "masterWorldId": world_id,
        "seed": seed,
        "width": width,
        "height": height,
        "rings": rings,
        "minimumCenterVoyages": rings,
        "stationTarget": station_target,
        "stationCount": sum(1 for node in nodes if node["type"] == "station"),
        "shellRadius": shell_radius,
        "nodes": nodes,
        "edges": edges,
        "startId": path_node_ids[0],
        "generatedAt": generated_at,
        "locationLevelVersion": location_registry["schemaVersion"],
        "locationLevelSeedSalt": 0,
        "depthGuarantee": {
            "version": "1.0.0",
            "requiredRings": rings,
            "requiredMissions": rings,
            "verifiedMissionDepth": len(edge_ids),
            "stationMissionDepth": len(path_node_ids) - 2,
            "finalAnomalyMission": True,
            "pathNodeIds": path_node_ids,
            "edgeIds": edge_ids,
            "outerStartId": path_node_ids[0],
            "anomalyId": "anomaly",
            "verifiedAt": generated_at,
        },
    }
    validate_map(map_data)
    return map_data


def shortest_journey_count(map_data: dict, start_id: str, end_id: str = "anomaly") -> int | float:
    node_by_id = {node["id"]: node for node in map_data["nodes"]}
    adjacency = {node["id"]: [] for node in map_data["nodes"]}
    for edge in map_data["edges"]:
        left = node_by_id.get(edge["a"])
        right = node_by_id.get(edge["b"])
        if not left or not right or abs(int(left["ring"]) - int(right["ring"])) > 1:
            continue
        adjacency[edge["a"]].append(edge["b"])
        adjacency[edge["b"]].append(edge["a"])
    queue = [(start_id, 0)]
    seen = {start_id}
    while queue:
        current, distance = queue.pop(0)
        if current == end_id:
            return distance
        for next_id in adjacency[current]:
            if next_id not in seen:
                seen.add(next_id)
                queue.append((next_id, distance + 1))
    return math.inf


def validate_map(map_data: dict) -> None:
    issues: list[str] = []
    rings = int(map_data.get("rings", 0))
    nodes = map_data.get("nodes", [])
    if rings < 48:
        issues.append(f"World has {rings} rings; 48 are required.")
    if len(nodes) < 960:
        issues.append(f"World has {len(nodes)} locations; 960 are required.")
    station_rings = {int(node["ring"]) for node in nodes if node.get("type") == "station"}
    for ring in range(1, rings + 1):
        if ring not in station_rings:
            issues.append(f"Ring {ring} has no station.")
    guarantee = map_data.get("depthGuarantee", {})
    path = guarantee.get("pathNodeIds", [])
    if len(path) != rings + 1:
        issues.append(f"Mandatory route contains {len(path)} nodes; expected {rings + 1}.")
    node_by_id = {node["id"]: node for node in nodes}
    for index in range(len(path) - 1):
        left = node_by_id.get(path[index])
        right = node_by_id.get(path[index + 1])
        if not left or not right or abs(int(left["ring"]) - int(right["ring"])) != 1:
            issues.append(f"Mandatory route step {index + 1} does not move exactly one ring inward.")
    shortest = shortest_journey_count(map_data, map_data.get("startId", ""))
    if shortest < 48:
        issues.append(f"Shortest outer-to-center route is only {shortest} journeys.")
    if not math.isfinite(shortest):
        issues.append("Central anomaly is unreachable from the outer starting station.")
    if issues:
        raise RuntimeError("Generated Masterworld failed validation: " + " ".join(issues))


def default_custom_content_draft(content_type: str = "equipment") -> dict:
    return {
        "id": "",
        "type": content_type,
        "name": "",
        "anchorId": "",
        "tier": 1,
        "quality": 3,
        "scale": 3,
        "complexity": 3,
        "effect": 3,
        "power": 2,
        "reliability": 3,
        "capacity": 6,
        "volatility": 1,
        "primaryStat": "Intelligence",
        "targetStat": "None",
        "secondaryStat": "None",
        "drawbackStat": "None",
        "rangeBand": "Short",
        "mount": "Turret",
        "compatibility": "",
        "functionName": "",
        "faction": "",
        "specialty": "",
        "locals": "",
        "description": "",
        "drawback": "",
        "tags": "",
        "notes": "",
    }


def default_custom_submarine_draft() -> dict:
    return {
        "id": "",
        "name": "",
        "class": "Scout",
        "tier": 1,
        "crewMin": 3,
        "crewMax": 5,
        "cargo": 8,
        "horizontal": 22,
        "descent": 14,
        "smallFixed": 1,
        "smallHardpoints": 1,
        "largeFixed": 0,
        "largeHardpoints": 0,
        "utilitySystems": 1,
        "notes": "",
    }


def default_shared_modules() -> dict:
    return {
        "stationCommerce": {
            "activeStationId": "",
            "wallet": "submarine",
            "destination": "cargo",
            "factionReputation": {},
            "stations": {},
            "transactionLog": [],
        },
        "customContent": {
            "entries": [],
            "draft": default_custom_content_draft(),
            "query": "",
            "filterType": "All",
        },
        "submarineLibrary": {
            "custom": [],
            "draft": default_custom_submarine_draft(),
        },
        "customResearch": {
            "projects": [],
            "stationId": "",
            "wallet": "submarine",
            "markContribution": 25000,
            "supplyContribution": 50,
            "notes": "",
        },
    }


def build_save(seed: str) -> dict:
    schema = json.loads(WORLD_SCHEMA_PATH.read_text(encoding="utf-8"))
    location_registry = json.loads(LOCATION_REGISTRY_PATH.read_text(encoding="utf-8"))
    exported_at = utc_now()
    world_id = "WLD-MASTER-48RING"
    map_data = build_world(seed, world_id, schema, location_registry)
    start_id = map_data["startId"]
    group_id = "group-master-expedition"
    world = {
        "seed": seed,
        "rings": map_data["rings"],
        "nodes": len(map_data["nodes"]),
        "stationTarget": int(schema["mapDefaults"]["stationTarget"]),
        "branching": int(schema["mapDefaults"].get("branching", 48)),
        "shellRadius": int(schema["mapDefaults"]["shellRadius"]),
        "minimumCenterVoyages": map_data["minimumCenterVoyages"],
        "map": map_data,
        "selected": [start_id, "anomaly"],
        "worldScaleVersion": "2.0.0",
        "expandedWorldVersion": schema["schemaVersion"],
        "locationLevelVersion": location_registry["schemaVersion"],
        "locationLevelSeedSalt": 0,
        "masterWorldId": world_id,
        "worldId": world_id,
        "depthGuarantee": map_data["depthGuarantee"],
        "masterWorldSource": "scripts/regenerate-barotrauma-master-world.py",
    }
    hub = {
        "schemaVersion": schema["schemaVersion"],
        "worldId": world_id,
        "masterWorldId": world_id,
        "worldName": "Europa Public Masterworld",
        "revision": 1,
        "createdAt": exported_at,
        "updatedAt": exported_at,
        "canonicalStart": schema["canonicalStart"],
        "realEpoch": schema["realEpoch"],
        "timeScale": schema.get("timeScale", 1),
        "activeGroupId": group_id,
        "activeSubmarineId": "",
        "pendingSubmissions": [],
        "publicState": {
            "groups": {
                group_id: {
                    "groupId": group_id,
                    "name": "Expedition Group 1",
                    "createdAt": exported_at,
                    "startingNodeId": start_id,
                    "currentNodeId": start_id,
                    "crewIds": [],
                    "submarineIds": [],
                    "routeId": "",
                    "notes": "",
                }
            },
            "crews": {},
            "submarines": {},
            "locations": {group_id: {"groupId": group_id, "nodeId": start_id, "updatedAt": exported_at}},
            "routes": {},
            "trades": [],
            "researchProjects": {},
            "gameStates": {},
            "submissionJournal": [
                {
                    "submissionId": "world-depth-regeneration-master",
                    "kind": "game-state",
                    "status": "accepted",
                    "createdAt": exported_at,
                    "summary": "Checked-in verified 48-ring Masterworld generated locally by Python.",
                }
            ],
        },
        "savedStates": [],
        "checkpointLabel": "",
        "groupDraftName": "Expedition Group",
        "notes": "Canonical checked-in Masterworld save. Regenerate locally with scripts/regenerate-barotrauma-master-world.py.",
    }
    return {
        "schema": schema["worldSaveSchema"],
        "version": 1,
        "exportedAt": exported_at,
        "canonicalAt": schema["canonicalStart"],
        "worldId": world_id,
        "world": world,
        "hub": hub,
        "sharedModules": default_shared_modules(),
        "generator": {
            "script": "scripts/regenerate-barotrauma-master-world.py",
            "seed": seed,
            "validated": True,
            "rings": map_data["rings"],
            "locations": len(map_data["nodes"]),
            "stations": map_data["stationCount"],
            "shortestOuterToCenterJourneys": shortest_journey_count(map_data, start_id),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", default="EUROPA-MASTER-48RING", help="deterministic world seed")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH, help="output JSON save path")
    args = parser.parse_args()

    save_payload = build_save(args.seed)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(save_payload, indent=2) + "\n", encoding="utf-8")
    generator = save_payload["generator"]
    print(
        "Generated {locations} locations across {rings} rings, {stations} stations, "
        "{shortestOuterToCenterJourneys} verified outer-to-center journeys -> {path}".format(
            path=args.output,
            **generator,
        )
    )


if __name__ == "__main__":
    main()
