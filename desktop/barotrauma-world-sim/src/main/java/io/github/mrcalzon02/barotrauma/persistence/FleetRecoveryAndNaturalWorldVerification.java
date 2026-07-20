package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument;
import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument.WorldDocument;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ImportPlan;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock;
import io.github.mrcalzon02.barotrauma.simulation.NpcTransitScheduleEngine;
import io.github.mrcalzon02.barotrauma.simulation.SimulationCommandExecutor;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Duration;
import java.util.Comparator;
import java.util.UUID;

/** End-to-end schema-014 contract for fleet response transit and natural world activity. */
public final class FleetRecoveryAndNaturalWorldVerification {
    private FleetRecoveryAndNaturalWorldVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-natural-world-");
        try {
            UUID worldId = UUID.fromString("9a000000-0000-0000-0000-000000000001");
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Natural Europa", worldId);
            WorldDocument document = WebSuiteV22WorldDocument.inspect(
                    fixture().getBytes(StandardCharsets.UTF_8), "natural-world.json");
            ImportPlan plan;
            try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
                plan = store.inspectAndPlan(document.inspection());
            }
            WebWorldV22ImportTransaction.commit(paths, new WebWorldV22ImportTransaction.ImportRequest(
                    plan.artifactId(), plan.artifact().artifactIdentity().digest(), "natural-world-test", document));

            SimulationCheckpointStore.RecoveryState recovery = SimulationCheckpointStore.load(paths, Duration.ofMinutes(1));
            try (SimulationCommandExecutor executor = new SimulationCommandExecutor(
                    DeterministicSimulationClock.restore(recovery.snapshot()),
                    "natural-world-contract-writer", recovery.lastExecutionSequence())) {
                var enabled = executor.submit(new SimulationCommandExecutor.Enable(), "natural-world-test").join();
                SimulationCheckpointStore.persist(paths, enabled, "Enable natural-world contract");
                step(paths, executor);

                require(count(paths, "location_ecology_state") == 6,
                        "Natural ecology state did not initialize for every location.");
                require(count(paths, "location_geology_state") == 6,
                        "Natural geology state did not initialize for every location.");

                UUID locationId = location(paths, "wild-bloom");
                primeNaturalActivity(paths, locationId);
                prepareResponder(paths);
                UUID distressed = disableVessel(paths);
                require(count(paths, "fleet_response_operation") == 1,
                        "A disabled NPC vessel did not create a fleet response operation.");
                String responder = operationResponder(paths);
                require("ACTIVE".equals(operationStatus(paths)) && responder != null,
                        "A qualified docked patrol was not immediately assigned to the distress request.");
                require("OUTBOUND".equals(operationPhase(paths)),
                        "Immediate response assignment did not begin an outbound transit phase.");
                require("PREPARING".equals(vesselStatus(paths, UUID.fromString(responder))),
                        "The assigned responder did not enter departure preparation.");
                require(vesselMission(paths, responder) == null,
                        "The response vessel began with an ordinary mission assignment.");
                require(transitLegCount(paths, "OUTBOUND", null) == 1,
                        "Response assignment did not create one outbound transit leg.");
                long preparationTick = responseLegStartedTick(paths, responder);
                step(paths, executor);
                long departureTick = vesselLastTick(paths, responder);
                require(departureTick > preparationTick,
                        "Fleet-response timing fixture did not span preparation and departure ticks.");
                require(responseLegStartedTick(paths, responder) == departureTick
                                && npcLegStartedTick(paths, responder) == departureTick,
                        "Fleet-response and observable NPC schedules did not rebase to actual departure.");
                require(npcLegArrivalTick(paths, responder)
                                == departureTick + npcLegDuration(paths, responder),
                        "Fleet-response observer ETA was not based on the actual departure tick.");

                raiseMaterialRequirementAndStarve(paths);
                for (int cycle = 0; cycle < 50 && !"ON_SCENE".equals(operationPhase(paths)); cycle++) {
                    step(paths, executor);
                }
                require("ON_SCENE".equals(operationPhase(paths)),
                        "The responder did not survive shared transit and arrive on scene.");
                require(transitLegCount(paths, "OUTBOUND", "ARRIVED") >= 1,
                        "The outbound response leg did not record arrival.");
                require("DISABLED".equals(vesselStatus(paths, distressed)),
                        "The casualty was restored before on-scene work and return transit.");
                require(activeMissionForTerminalVesselCount(paths) == 0,
                        "A disabled transit casualty left a ghost mission in the active mission cap.");

                int stalledProgress = operationProgress(paths);
                step(paths, executor);
                require(operationProgress(paths) == stalledProgress,
                        "Fleet recovery advanced on scene without the required station materials.");
                require(vesselMission(paths, responder) == null,
                        "An active fleet responder was stolen by the ordinary mission dispatcher.");

                replenishRecoveryMaterials(paths);
                boolean sawReturning = false;
                for (int cycle = 0; cycle < 140 && !"COMPLETE".equals(operationStatus(paths)); cycle++) {
                    step(paths, executor);
                    sawReturning |= "RETURNING".equals(operationPhase(paths));
                    if (!"COMPLETE".equals(operationStatus(paths))) {
                        require("DISABLED".equals(vesselStatus(paths, distressed)),
                                "The casualty was restored before the towing or return leg reached home.");
                    }
                }
                require(sawReturning, "Fleet recovery never entered a physical return or towing phase.");
                require("COMPLETE".equals(operationStatus(paths)) && "COMPLETE".equals(operationPhase(paths)),
                        "The passive fleet response did not complete after return transit.");
                require(operationMaterialsCommitted(paths) == 1,
                        "Fleet response materials were not committed exactly once before return transit.");
                require(transitLegCount(paths, "RETURN", "ARRIVED") >= 1,
                        "The return or towing transit leg did not reach home.");
                require(count(paths, "fleet_response_transit_encounter") > 0,
                        "Shared transit hazards were not linked to fleet response legs.");
                require("DOCKED".equals(vesselStatus(paths, distressed)) && vesselHull(paths, distressed) >= 35,
                        "The disabled vessel was not recovered to a docked, serviceable state after return transit.");
                String responderStatus = vesselStatus(paths, UUID.fromString(responder));
                require("DOCKED".equals(responderStatus) || "PREPARING".equals(responderStatus),
                        "The response vessel neither returned to dock nor accepted a new response; found "
                                + responderStatus + ".");
                require(count(paths, "fleet_response_log") >= 4,
                        "Fleet response request, assignment, arrival, return, or completion evidence is incomplete.");

                ReturnRegression returnRegression = prepareCompletedMissionReturn(paths);
                String completedMission = returnRegression.missionId();
                String returnVessel = returnRegression.vesselId();
                long completionLogs = missionCompletionLogCount(paths, completedMission);
                step(paths, executor);
                require("DOCKED".equals(vesselStatus(paths, UUID.fromString(returnVessel)))
                                && vesselMission(paths, returnVessel) == null
                                && vesselDestination(paths, returnVessel) == null,
                        "An ordinary completed return did not dock and clear its voyage linkage.");
                require(vesselCargo(paths, returnVessel) == 0
                                && "DELIVERED".equals(returnFreightStatus(paths, completedMission))
                                && returnTreasuryCount(paths, completedMission) == 1,
                        "Ordinary return docking bypassed cargo, freight, or treasury settlement.");
                relinkCompletedMissionAsWorking(paths, returnVessel, completedMission);
                step(paths, executor);
                require(missionCompletionLogCount(paths, completedMission) == completionLogs,
                        "A returned vessel replayed an already-complete mission and its rewards.");

                primeNaturalActivity(paths, locationId);
                int ecologyBefore = ecologyValue(paths, locationId, "primary_producers");
                int geologyBefore = geologyValue(paths, locationId, "mineral_exposure");
                for (int cycle = 0; cycle < 35; cycle++) step(paths, executor);

                require(ecologyValue(paths, locationId, "primary_producers") != ecologyBefore
                                || count(paths, "natural_world_event") > 0,
                        "Natural ecology did not advance with Passive Mode.");
                require(geologyValue(paths, locationId, "mineral_exposure") != geologyBefore
                                || eventTypeCount(paths, "VENT_ERUPTION") + eventTypeCount(paths, "ROCKFALL") > 0,
                        "Natural geology neither changed nor produced geological event evidence.");
                require(count(paths, "natural_resource_site") > 0,
                        "Geological or biological activity did not expose any resource sites.");
                require(eventTypeCount(paths, "ALGAL_BLOOM") > 0,
                        "A primed algal bloom did not produce ecological evidence.");
                require(eventTypeCount(paths, "PREDATOR_EXPANSION") > 0,
                        "Predators did not expand their feeding grounds behind biological growth.");
                require(eventTypeCount(paths, "VENT_ERUPTION") + eventTypeCount(paths, "ROCKFALL") > 0,
                        "Primed geological activity did not produce an environmental event.");
                require(resourceTypeCount(paths, "BIOACTIVE_ACCUMULATOR") > 0,
                        "Natural bioactivity did not produce a renewable accumulator site.");
                require(naturalResourceMissionCount(paths, locationId) > 0,
                        "Exposed natural resources did not enter the mining, research, or salvage mission queue.");
                require(missionTypeCount(paths, locationId, "FAUNA_CLEARING") > 0,
                        "Predator feeding-ground expansion did not create fauna-clearing work.");
                require(schemaVersion(paths) == WorldStorageContracts.DATABASE_SCHEMA_VERSION,
                        "Natural-world fixture did not use the current schema.");
            }
        } finally {
            try (var stream = Files.walk(root)) {
                for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    private static void step(WorldPaths paths, SimulationCommandExecutor executor) throws Exception {
        var receipt = executor.submit(new SimulationCommandExecutor.Step(1), "natural-world-test").join();
        PassiveWorldTickTransaction.commit(paths, receipt);
    }

    private static void prepareResponder(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("UPDATE world_mission SET status='CANCELLED',assigned_npc_vessel_id=NULL "
                    + "WHERE assigned_npc_vessel_id=(SELECT npc_vessel_id FROM npc_vessel WHERE role='PATROL' LIMIT 1) "
                    + "AND status IN ('ASSIGNED','ACTIVE')");
            statement.executeUpdate("UPDATE npc_vessel SET status='DOCKED',mission_id=NULL,destination_location_id=NULL,"
                    + "route_progress=0,route_ticks_required=1,hull=100,supplies=100,crew_quality=100,navigation=100,"
                    + "engineering=100,combat=100 WHERE role='PATROL'");
        }
    }

    private static UUID disableVessel(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            String vesselId;
            try (Statement statement = connection.createStatement();
                 ResultSet result = statement.executeQuery(
                         "SELECT npc_vessel_id FROM npc_vessel WHERE role<>'PATROL' ORDER BY npc_vessel_id LIMIT 1")) {
                if (!result.next()) throw new IllegalStateException("Fixture has no NPC vessel available to disable.");
                vesselId = result.getString(1);
            }
            try (PreparedStatement update = connection.prepareStatement(
                    "UPDATE npc_vessel SET hull=75,supplies=10,status='DISABLED' WHERE npc_vessel_id=?")) {
                update.setString(1, vesselId);
                update.executeUpdate();
            }
            return UUID.fromString(vesselId);
        }
    }

    private static ReturnRegression prepareCompletedMissionReturn(WorldPaths paths) throws Exception {
        String missionId = "9a000000-0000-0000-0000-00000000f001";
        String legId = "9a000000-0000-0000-0000-00000000f002";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            connection.setAutoCommit(false);
            String vesselId;
            String worldId;
            String homeStationId;
            String homeLocationId;
            long tick;
            try (PreparedStatement select = connection.prepareStatement(
                    "SELECT v.world_id,v.home_station_id,ws.location_id,"
                            + "COALESCE(sm.current_tick_sequence,sm.imported_tick_sequence) "
                            + "FROM npc_vessel v JOIN world_station ws ON ws.station_id=v.home_station_id "
                            + "JOIN world_simulation_metadata sm ON sm.world_id=v.world_id "
                            + "WHERE v.role='MINER' ORDER BY v.npc_vessel_id LIMIT 1")) {
                try (ResultSet result = select.executeQuery()) {
                    if (!result.next()) throw new IllegalStateException("Return regression vessel is missing.");
                    vesselId = result.getString(1);
                    worldId = result.getString(2);
                    homeStationId = result.getString(3);
                    homeLocationId = result.getString(4);
                    tick = result.getLong(5);
                }
            }
            try (PreparedStatement cancelResponses = connection.prepareStatement(
                    "UPDATE fleet_response_operation SET status='CANCELLED',updated_tick=? "
                            + "WHERE status IN ('AVAILABLE','ACTIVE')")) {
                cancelResponses.setLong(1, tick);
                cancelResponses.executeUpdate();
            }
            try (PreparedStatement cancelMissions = connection.prepareStatement(
                    "UPDATE world_mission SET status='CANCELLED',assigned_npc_vessel_id=NULL,updated_tick=? "
                            + "WHERE assigned_npc_vessel_id=? AND status IN ('ASSIGNED','ACTIVE')")) {
                cancelMissions.setLong(1, tick);
                cancelMissions.setString(2, vesselId);
                cancelMissions.executeUpdate();
            }
            try (PreparedStatement cancelSchedules = connection.prepareStatement(
                    "UPDATE npc_transit_incident_schedule SET status='CANCELLED' WHERE status='PENDING' "
                            + "AND leg_id IN (SELECT leg_id FROM npc_transit_leg WHERE npc_vessel_id=? "
                            + "AND status='IN_TRANSIT')")) {
                cancelSchedules.setString(1, vesselId);
                cancelSchedules.executeUpdate();
            }
            try (PreparedStatement cancelLegs = connection.prepareStatement(
                    "UPDATE npc_transit_leg SET status='CANCELLED',last_progress_tick=? "
                            + "WHERE npc_vessel_id=? AND status='IN_TRANSIT'")) {
                cancelLegs.setLong(1, tick);
                cancelLegs.setString(2, vesselId);
                cancelLegs.executeUpdate();
            }
            try (PreparedStatement mission = connection.prepareStatement(
                    "INSERT INTO world_mission(mission_id,world_id,mission_type,status,origin_station_id,"
                            + "target_location_id,assigned_npc_vessel_id,deterministic_seed,difficulty,"
                            + "reward_credits,cargo_units,progress,created_tick,updated_tick,completed_tick) "
                            + "VALUES (?,?,'TRANSIT','COMPLETE',?,?,?,1,1,777,0,100,?,?,?)")) {
                mission.setString(1, missionId);
                mission.setString(2, worldId);
                mission.setString(3, homeStationId);
                mission.setString(4, homeLocationId);
                mission.setString(5, vesselId);
                mission.setLong(6, Math.max(0L, tick - 10L));
                mission.setLong(7, tick);
                mission.setLong(8, tick);
                mission.executeUpdate();
            }
            try (PreparedStatement vessel = connection.prepareStatement(
                    "UPDATE npc_vessel SET current_location_id=?,destination_location_id=?,mission_id=?,"
                            + "status='RETURNING',hull=100,supplies=100,route_progress=2,"
                            + "route_ticks_required=3,last_tick=? WHERE npc_vessel_id=?")) {
                vessel.setString(1, homeLocationId);
                vessel.setString(2, homeLocationId);
                vessel.setString(3, missionId);
                vessel.setLong(4, tick);
                vessel.setString(5, vesselId);
                vessel.executeUpdate();
            }
            long startedTick = tick - 2L;
            try (PreparedStatement leg = connection.prepareStatement(
                    "INSERT INTO npc_transit_leg(leg_id,world_id,npc_vessel_id,mission_id,leg_type,"
                            + "origin_location_id,destination_location_id,route_id,status,started_tick,"
                            + "elapsed_ticks,base_duration_ticks,scheduled_arrival_tick,"
                            + "player_equivalent_incident_count,incidents_resolved,cumulative_delay_ticks,"
                            + "last_report_band,schedule_policy_version,last_progress_tick) "
                            + "VALUES (?,?,?,?, 'RETURN',?,?,?,'IN_TRANSIT',?,2,3,?,1,1,0,3,?,?)")) {
                leg.setString(1, legId);
                leg.setString(2, worldId);
                leg.setString(3, vesselId);
                leg.setString(4, missionId);
                leg.setString(5, homeLocationId);
                leg.setString(6, homeLocationId);
                leg.setString(7, homeLocationId + "->" + homeLocationId);
                leg.setLong(8, startedTick);
                leg.setLong(9, tick + 1L);
                leg.setString(10, NpcTransitScheduleEngine.POLICY_VERSION);
                leg.setLong(11, tick);
                leg.executeUpdate();
            }
            try (PreparedStatement schedule = connection.prepareStatement(
                    "INSERT INTO npc_transit_incident_schedule(leg_id,incident_ordinal,"
                            + "scheduled_offset_ticks,due_tick,deterministic_sequence,status,resolved_tick) "
                            + "VALUES (?,1,2,?,?,'RESOLVED',?)")) {
                schedule.setString(1, legId);
                schedule.setLong(2, tick);
                schedule.setLong(3, NpcTransitScheduleEngine.deterministicIncidentSequence(startedTick, 1));
                schedule.setLong(4, tick);
                schedule.executeUpdate();
            }
            connection.commit();
        }
        return missionId;
    }

    private static void raiseMaterialRequirementAndStarve(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("UPDATE fleet_response_operation SET spare_parts_required=50,fuel_required=50,"
                    + "ammunition_required=50,medical_required=50");
            statement.executeUpdate("UPDATE station_inventory SET quantity=0 WHERE station_id="
                    + "(SELECT origin_station_id FROM fleet_response_operation LIMIT 1) "
                    + "AND item_id IN ('item-steel','item-fuel','item-ammunition','item-medical')");
        }
    }

    private static void replenishRecoveryMaterials(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("UPDATE station_inventory SET quantity=200 WHERE station_id="
                    + "(SELECT origin_station_id FROM fleet_response_operation LIMIT 1) "
                    + "AND item_id IN ('item-steel','item-fuel','item-ammunition','item-medical')");
        }
    }

    private static long activeMissionForTerminalVesselCount(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery(
                     "SELECT COUNT(*) FROM world_mission m JOIN npc_vessel v "
                             + "ON v.npc_vessel_id=m.assigned_npc_vessel_id "
                             + "WHERE m.status IN ('ASSIGNED','ACTIVE') AND v.status IN ('DISABLED','LOST')")) {
            return result.next() ? result.getLong(1) : 0;
        }
    }

    private static void primeNaturalActivity(WorldPaths paths, UUID locationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            try (PreparedStatement ecology = connection.prepareStatement(
                    "UPDATE location_ecology_state SET primary_producers=85,algal_bloom=70,herbivore_biomass=70,"
                            + "predator_biomass=60,scavenger_biomass=50,bioaccumulator_mass=70,nutrient_load=85,"
                            + "habitat_integrity=80,migration_pressure=55 WHERE location_id=?")) {
                ecology.setString(1, locationId.toString());
                ecology.executeUpdate();
            }
            try (PreparedStatement geology = connection.prepareStatement(
                    "UPDATE location_geology_state SET tectonic_stress=85,hydrothermal_activity=75,"
                            + "mineral_exposure=65,cave_instability=75,sediment_flux=70 WHERE location_id=?")) {
                geology.setString(1, locationId.toString());
                geology.executeUpdate();
            }
        }
    }

    private static UUID location(WorldPaths paths, String sourceId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT location_id FROM world_location WHERE source_location_id=?")) {
            statement.setString(1, sourceId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Fixture location is missing: " + sourceId);
                return UUID.fromString(result.getString(1));
            }
        }
    }

    private static String operationStatus(WorldPaths paths) throws Exception {
        return text(paths, "SELECT status FROM fleet_response_operation ORDER BY created_tick LIMIT 1");
    }

    private static String operationPhase(WorldPaths paths) throws Exception {
        return text(paths, "SELECT response_phase FROM fleet_response_operation ORDER BY created_tick LIMIT 1");
    }

    private static int operationProgress(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery(
                     "SELECT progress FROM fleet_response_operation ORDER BY created_tick LIMIT 1")) {
            if (!result.next()) throw new IllegalStateException("Fleet response operation disappeared.");
            return result.getInt(1);
        }
    }

    private static int operationMaterialsCommitted(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery(
                     "SELECT materials_committed FROM fleet_response_operation ORDER BY created_tick LIMIT 1")) {
            if (!result.next()) throw new IllegalStateException("Fleet response operation disappeared.");
            return result.getInt(1);
        }
    }

    private static String operationResponder(WorldPaths paths) throws Exception {
        return text(paths, "SELECT assigned_npc_vessel_id FROM fleet_response_operation ORDER BY created_tick LIMIT 1");
    }

    private static long responseLegStartedTick(WorldPaths paths, String responder) throws Exception {
        return keyedLong(paths, "SELECT started_tick FROM fleet_response_transit_leg "
                + "WHERE responder_npc_vessel_id=? AND leg_type='OUTBOUND' "
                + "ORDER BY attempt_number DESC LIMIT 1", responder);
    }

    private static long npcLegStartedTick(WorldPaths paths, String responder) throws Exception {
        return keyedLong(paths, "SELECT started_tick FROM npc_transit_leg WHERE npc_vessel_id=? "
                + "AND fleet_response_leg_id IS NOT NULL ORDER BY started_tick DESC LIMIT 1", responder);
    }

    private static long npcLegArrivalTick(WorldPaths paths, String responder) throws Exception {
        return keyedLong(paths, "SELECT scheduled_arrival_tick FROM npc_transit_leg WHERE npc_vessel_id=? "
                + "AND fleet_response_leg_id IS NOT NULL ORDER BY started_tick DESC LIMIT 1", responder);
    }

    private static long npcLegDuration(WorldPaths paths, String responder) throws Exception {
        return keyedLong(paths, "SELECT base_duration_ticks FROM npc_transit_leg WHERE npc_vessel_id=? "
                + "AND fleet_response_leg_id IS NOT NULL ORDER BY started_tick DESC LIMIT 1", responder);
    }

    private static long vesselLastTick(WorldPaths paths, String responder) throws Exception {
        return keyedLong(paths, "SELECT last_tick FROM npc_vessel WHERE npc_vessel_id=?", responder);
    }

    private static long transitLegCount(WorldPaths paths, String legType, String status) throws Exception {
        String sql = "SELECT COUNT(*) FROM fleet_response_transit_leg WHERE leg_type=?"
                + (status == null ? "" : " AND status=?");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, legType);
            if (status != null) statement.setString(2, status);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static String vesselMission(WorldPaths paths, String vesselId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT mission_id FROM npc_vessel WHERE npc_vessel_id=?")) {
            statement.setString(1, vesselId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Response vessel disappeared.");
                return result.getString(1);
            }
        }
    }

    private static String vesselDestination(WorldPaths paths, String vesselId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT destination_location_id FROM npc_vessel WHERE npc_vessel_id=?")) {
            statement.setString(1, vesselId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Return regression vessel disappeared.");
                return result.getString(1);
            }
        }
    }

    private static long missionCompletionLogCount(WorldPaths paths, String missionId) throws Exception {
        return keyedLong(paths, "SELECT COUNT(*) FROM npc_voyage_log "
                + "WHERE mission_id=? AND event_type='MISSION_COMPLETE'", missionId);
    }

    private static String vesselStatus(WorldPaths paths, UUID vesselId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT status FROM npc_vessel WHERE npc_vessel_id=?")) {
            statement.setString(1, vesselId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Recovered vessel disappeared.");
                return result.getString(1);
            }
        }
    }

    private static int vesselHull(WorldPaths paths, UUID vesselId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT hull FROM npc_vessel WHERE npc_vessel_id=?")) {
            statement.setString(1, vesselId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Recovered vessel disappeared.");
                return result.getInt(1);
            }
        }
    }

    private static int ecologyValue(WorldPaths paths, UUID locationId, String column) throws Exception {
        if (!java.util.Set.of("primary_producers", "algal_bloom", "herbivore_biomass", "predator_biomass",
                "bioaccumulator_mass").contains(column)) throw new IllegalArgumentException("Unsupported ecology column.");
        return keyedInt(paths, "SELECT " + column + " FROM location_ecology_state WHERE location_id=?", locationId);
    }

    private static int geologyValue(WorldPaths paths, UUID locationId, String column) throws Exception {
        if (!java.util.Set.of("tectonic_stress", "hydrothermal_activity", "mineral_exposure",
                "cave_instability").contains(column)) throw new IllegalArgumentException("Unsupported geology column.");
        return keyedInt(paths, "SELECT " + column + " FROM location_geology_state WHERE location_id=?", locationId);
    }

    private static int keyedInt(WorldPaths paths, String sql, UUID key) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, key.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Natural-world state row is missing.");
                return result.getInt(1);
            }
        }
    }

    private static long eventTypeCount(WorldPaths paths, String type) throws Exception {
        return keyedCount(paths, "SELECT COUNT(*) FROM natural_world_event WHERE event_type=?", type);
    }

    private static long resourceTypeCount(WorldPaths paths, String type) throws Exception {
        return keyedCount(paths, "SELECT COUNT(*) FROM natural_resource_site WHERE resource_type=?", type);
    }

    private static long naturalResourceMissionCount(WorldPaths paths, UUID locationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT COUNT(*) FROM world_mission WHERE target_location_id=? "
                             + "AND mission_type IN ('MINING','RESEARCH','SALVAGE')")) {
            statement.setString(1, locationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long missionTypeCount(WorldPaths paths, UUID locationId, String missionType) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT COUNT(*) FROM world_mission WHERE target_location_id=? AND mission_type=?")) {
            statement.setString(1, locationId.toString());
            statement.setString(2, missionType);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long keyedCount(WorldPaths paths, String sql, String key) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, key);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long keyedLong(WorldPaths paths, String sql, String key) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, key);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Expected keyed verification row is missing.");
                return result.getLong(1);
            }
        }
    }

    private static long count(WorldPaths paths, String table) throws Exception {
        if (!java.util.Set.of("location_ecology_state", "location_geology_state", "natural_resource_site",
                "natural_world_event", "fleet_response_operation", "fleet_response_log",
                "fleet_response_transit_leg", "fleet_response_transit_encounter").contains(table)) {
            throw new IllegalArgumentException("Unsupported natural-world verification table.");
        }
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            return result.next() ? result.getLong(1) : 0;
        }
    }

    private static String text(WorldPaths paths, String sql) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            return result.next() ? result.getString(1) : null;
        }
    }

    private static int schemaVersion(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT MAX(version) FROM schema_migration")) {
            return result.next() ? result.getInt(1) : 0;
        }
    }

    private static String fixture() {
        return """
                {"version":22,"exportedAt":"2026-07-18T12:00:00Z","masterWorldId":"NATURAL-WORLD",
                "worldEconomyVersion":"1.0.0","worldStateSchemaVersion":"2.2.0","state":{
                "world":{"canonicalTime":"2175-01-01T00:00:00Z","realEpoch":"2026-06-20T08:00:00Z",
                "map":{"rings":48,"shellRadius":7008,"nodes":[
                {"id":"station-a","name":"Alpha Station","ring":48,"level":1,"type":"station","x":10,"y":20},
                {"id":"station-b","name":"Beta Station","ring":42,"level":3,"type":"station","x":80,"y":40},
                {"id":"station-c","name":"Gamma Station","ring":34,"level":5,"type":"station","x":150,"y":90},
                {"id":"station-d","name":"Delta Station","ring":26,"level":7,"type":"station","x":220,"y":120},
                {"id":"wild-bloom","name":"Blooming Chasm","ring":20,"level":8,"type":"location","x":280,"y":170},
                {"id":"vent-field","name":"Fractured Vent Field","ring":12,"level":9,"type":"location","x":340,"y":230}]}},
                "worldEconomy":{"vessels":{},"stationEconomies":{"station-a":{},"station-b":{},
                "station-c":{},"station-d":{}},"simulation":{"tickSequence":30,
                "lastSimulatedAt":"2175-01-01T00:00:00Z"}},
                "submarine":{"name":"Observer","model":"Barsuk","crewRoster":[]}}}
                """;
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Barotrauma fleet response transit and natural-world contracts passed.");
    }
}
