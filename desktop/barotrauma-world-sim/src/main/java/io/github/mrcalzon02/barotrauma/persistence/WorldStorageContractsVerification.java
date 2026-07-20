package io.github.mrcalzon02.barotrauma.persistence;

import static io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.UUID;

/** Executable filesystem, locking, and schema-registration checks. */
final class WorldStorageContractsVerification {
    private WorldStorageContractsVerification() { }

    static void verifyContract() throws Exception {
        Path temporaryRoot = Files.createTempDirectory("barotrauma-world-storage-");
        try {
            UUID worldId = UUID.fromString("11111111-2222-3333-4444-555555555555");
            WorldPaths paths = createWorld(temporaryRoot, "Europa Test World", worldId);
            require(paths.root().getFileName().toString().equals("europa-test-world-" + worldId), "World directory identity failed.");
            require(Files.isRegularFile(paths.metadata()), "World metadata was not created.");
            require(slug("../A Dangerous World").equals("a-dangerous-world"), "World slug safety failed.");
            require(initialSchemaStatements().stream().anyMatch(sql -> sql.contains("UNIQUE(vessel_id, snapshot_sha256)")), "Snapshot duplicate constraint is missing.");
            require(schema002Statements().stream().anyMatch(sql -> sql.contains("CREATE TABLE world_location")), "World-location migration schema is missing.");
            require(schema003Statements().stream().anyMatch(sql -> sql.contains("simulation_command_receipt")), "Command-receipt schema is missing.");
            require(schema004Statements().stream().anyMatch(sql -> sql.contains("station_simulation_state")), "Station workload schema is missing.");
            require(schema005Statements().stream().anyMatch(sql -> sql.contains("npc_return_arrival")), "NPC return hardening is missing.");
            require(schema006Statements().stream().anyMatch(sql -> sql.contains("station_inventory")), "Station inventory schema is missing.");
            require(schema006Statements().stream().anyMatch(sql -> sql.contains("player_vessel_state")), "Player route schema is missing.");
            require(schema007Statements().stream().anyMatch(sql -> sql.contains("passive_freight_offers")), "Passive freight-offer hardening is missing.");
            require(schema008Statements().stream().anyMatch(sql -> sql.contains("station_consumption_log")), "Station consumption history is missing.");
            require(schema008Statements().stream().anyMatch(sql -> sql.contains("station_passive_consumption")), "Passive station consumption trigger is missing.");
            require(schema008Statements().stream().anyMatch(sql -> sql.contains("civilization_frontier_event")), "Civilization frontier evidence is missing.");
            require(schema009Statements().stream().anyMatch(sql -> sql.contains("printf('%012x'")), "UUID-safe frontier mission generation is missing.");
            require(schema009Statements().stream().anyMatch(sql -> sql.contains("frontier_recovery_event")), "Frontier recovery evidence is missing.");
            require(schema009Statements().stream().anyMatch(sql -> sql.contains("frontier_expansion_mission")), "Frontier expansion missions are missing.");
            require(schema010Statements().stream().anyMatch(sql -> sql.contains("fleet_response_operation")), "Fleet recovery operations are missing.");
            require(schema010Statements().stream().anyMatch(sql -> sql.contains("location_ecology_state")), "Natural ecology state is missing.");
            require(schema010Statements().stream().anyMatch(sql -> sql.contains("location_geology_state")), "Natural geology state is missing.");
            require(schema010Statements().stream().anyMatch(sql -> sql.contains("natural_resource_site")), "Natural resource exposure is missing.");
            require(schema011Statements().stream().anyMatch(sql -> sql.contains("response_request_immediate_assignment")), "Immediate fleet response assignment is missing.");
            require(schema011Statements().stream().anyMatch(sql -> sql.contains("fleet_response_requires_supplies")), "Fleet response material gating is missing.");
            require(schema012Statements().stream().anyMatch(sql -> sql.contains("active_response_blocks_world_mission")), "Fleet response mission priority is missing.");
            require(schema012Statements().stream().anyMatch(sql -> sql.contains("natural_resource_creates_mission")), "Natural resource mission generation is missing.");
            require(schema012Statements().stream().anyMatch(sql -> sql.contains("predator_expansion_creates_mission")), "Predator-response mission generation is missing.");
            require(schema013Statements().stream().anyMatch(sql -> sql.contains("resource_extraction_batch")), "Natural resource extraction evidence is missing.");
            require(schema013Statements().stream().anyMatch(sql -> sql.contains("passive_resource_recovery")), "Renewable resource recovery is missing.");
            require(schema013Statements().stream().anyMatch(sql -> sql.contains("DROP TRIGGER IF EXISTS passive_station_logistics_cycle")), "Unbounded free ore production was not replaced.");
            require(schema014Statements().stream().anyMatch(sql -> sql.contains("fleet_response_transit_leg")), "Fleet response transit legs are missing.");
            require(schema014Statements().stream().anyMatch(sql -> sql.contains("fleet_response_requires_scene")), "Fleet response arrival gating is missing.");
            require(schema014Statements().stream().anyMatch(sql -> sql.contains("fleet_response_responder_returns_home")), "Fleet response return completion is missing.");
            require(schema015Statements().stream().anyMatch(sql -> sql.contains("npc_population_state")), "Observation NPC populations are missing.");
            require(schema015Statements().stream().anyMatch(sql -> sql.contains("creature_population_state")), "Observation creature populations are missing.");
            require(schema015Statements().stream().anyMatch(sql -> sql.contains("world_observation_event")), "Observation event evidence is missing.");
            require(schema015Statements().stream().anyMatch(sql -> sql.contains("observation_snapshot")), "Observation snapshots are missing.");
            require(schema016Statements().stream().anyMatch(sql -> sql.contains("npc_population_ledger")), "Conserved NPC population accounting is missing.");
            require(schema016Statements().stream().anyMatch(sql -> sql.contains("npc_population_tick_accounting")), "Passive NPC population reconciliation is missing.");
            require(schema016Statements().stream().anyMatch(sql -> sql.contains("after_total=before_total")), "Population conservation constraint is missing.");
            require(schema017Statements().stream().anyMatch(sql -> sql.contains("CREATE TABLE station_event ")), "Station causal events are missing.");
            require(schema017Statements().stream().anyMatch(sql -> sql.contains("CREATE TABLE station_change ")), "Typed station changes are missing.");
            require(schema017Statements().stream().anyMatch(sql -> sql.contains("CREATE TABLE station_population_event ")), "Population event evidence is missing.");
            require(schema017Statements().stream().anyMatch(sql -> sql.contains("CREATE TABLE faction_plan ")), "Faction planning state is missing.");
            require(schema018Statements().stream().anyMatch(sql -> sql.contains("station_causal_capture_before_tick")), "Consumption baseline capture is missing.");
            require(schema018Statements().stream().anyMatch(sql -> sql.contains("station_consumption_causal_event")), "Consumption causal collection is missing.");
            require(schema019Statements().stream().anyMatch(sql -> sql.contains("station_production_outcome")), "Production outcome evidence is missing.");
            require(schema019Statements().stream().anyMatch(sql -> sql.contains("station_production_outcome_gate")), "Production failure gating is missing.");
            require(schema019Statements().stream().anyMatch(sql -> sql.contains("station_production_story")), "Production story view is missing.");
            require(schema020Statements().stream().anyMatch(sql -> sql.contains("station_delivery_capture")), "Delivery baseline capture is missing.");
            require(schema020Statements().stream().anyMatch(sql -> sql.contains("station_delivery_causal_event")), "Delivery causal collection is missing.");
            require(schema020Statements().stream().anyMatch(sql -> sql.contains("station_delivery_story")), "Delivery story view is missing.");
            require(schema021Statements().stream().anyMatch(sql -> sql.contains("station_frontier_finalize_tick")), "Frontier causal collection is missing.");
            require(schema021Statements().stream().anyMatch(sql -> sql.contains("station_frontier_story")), "Frontier story view is missing.");
            require(schema022Statements().stream().anyMatch(sql -> sql.contains("station_population_finalize_tick")), "Population causal collection is missing.");
            require(schema022Statements().stream().anyMatch(sql -> sql.contains("station_population_coverage")), "Population mutation coverage is missing.");
            require(schema023Statements().stream().anyMatch(sql -> sql.contains("faction_plan_resource_allocation")), "Faction allocation backing is missing.");
            require(schema023Statements().stream().anyMatch(sql -> sql.contains("station_faction_resource_availability")), "Faction resource availability is missing.");
            require(schema024Statements().stream().anyMatch(sql -> sql.contains("station_event_links_active_command")), "Station command provenance is missing.");
            require(schema024Statements().stream().anyMatch(sql -> sql.contains("station_event_command_history")), "Station command history is missing.");
            require(schema025Statements().stream().anyMatch(sql -> sql.contains("station_mutation_explanation")), "Mutation explanation coverage is missing.");
            require(schema025Statements().stream().anyMatch(sql -> sql.contains("ENFORCE")), "Enforced station explanation policy is missing.");
            require(schema026Statements().stream().anyMatch(sql -> sql.contains("npc_transit_incident_schedule")), "NPC transit incident scheduling is missing.");
            require(schema026Statements().stream().anyMatch(sql -> sql.contains("npc_observable_transit")), "NPC observer transit projection is missing.");
            require(schema027Statements().stream().anyMatch(sql -> sql.contains("npc_demographic_state")), "Demographic hysteresis state is missing.");
            require(schema027Statements().stream().anyMatch(sql -> sql.contains("npc_demographic_tick_plan")), "The authoritative demographic planner is missing.");
            require(schema027Statements().stream().anyMatch(sql -> sql.contains("npc_demographic_finalize_tick")), "Demographic finalization is missing.");
            require(schema027Statements().stream().anyMatch(sql -> sql.contains("DROP TRIGGER IF EXISTS station_population_finalize_tick")), "Competing station demographic finalization was not removed.");

            try (WorldLock ignored = acquireExclusiveLock(paths)) {
                try {
                    acquireExclusiveLock(paths);
                    throw new IllegalStateException("A second world writer lock was unexpectedly acquired.");
                } catch (IOException expected) {
                    require(expected.getMessage().contains("already"), "Unexpected lock failure message.");
                }
                writeAtomic(paths.logs().resolve("contract.log"), "verified\n");
                require(Files.readString(paths.logs().resolve("contract.log")).equals("verified\n"), "Atomic write failed.");
            }
            require(!Files.exists(paths.lockFile()), "World lock file was not removed after close.");
            openWorld(paths.root());
        } finally {
            deleteTree(temporaryRoot);
        }
    }

    private static void deleteTree(Path root) throws IOException {
        if (!Files.exists(root)) return;
        try (var stream = Files.walk(root)) {
            for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }
}
