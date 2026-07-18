package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldLock;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock.ClockSnapshot;
import io.github.mrcalzon02.barotrauma.simulation.TransitResolutionEngine;
import io.github.mrcalzon02.barotrauma.simulation.TransitResolutionEngine.MissionType;
import io.github.mrcalzon02.barotrauma.simulation.TransitResolutionEngine.Resolution;
import io.github.mrcalzon02.barotrauma.simulation.TransitResolutionEngine.TransitContext;
import io.github.mrcalzon02.barotrauma.simulation.TransitResolutionEngine.Transitant;
import io.github.mrcalzon02.barotrauma.simulation.SimulationCommandExecutor.CommandReceipt;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** Atomically advances the durable clock and all passive station/NPC workloads. */
public final class PassiveWorldTickTransaction {
    private static final int MAX_PASSIVE_TICKS = 1_000;

    private PassiveWorldTickTransaction() { }

    public static TickResult commit(WorldPaths paths, CommandReceipt receipt)
            throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        Objects.requireNonNull(receipt, "receipt");
        long ticks = receipt.after().tickSequence() - receipt.before().tickSequence();
        if (ticks < 1 || ticks > MAX_PASSIVE_TICKS) {
            throw new SQLException("A passive cycle must advance between 1 and " + MAX_PASSIVE_TICKS + " ticks.");
        }
        if (!receipt.after().simulationEnabled()) {
            throw new SQLException("Passive simulation requires an enabled deterministic clock.");
        }
        requireDriver();
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            verifySchema(connection);
            return commit(connection, receipt, (int) ticks);
        }
    }

    private static TickResult commit(Connection connection, CommandReceipt receipt, int ticks)
            throws SQLException {
        boolean originalAutoCommit = connection.getAutoCommit();
        connection.setAutoCommit(false);
        try {
            DurableState durable = readDurableState(connection, receipt.before().tickSize());
            validate(durable, receipt);
            insertReceipt(connection, durable.worldId(), receipt);
            ensurePassiveConfig(connection, durable.worldId());
            initializeStations(connection, durable.worldId(), receipt.before().tickSequence());
            initializeResearch(connection, durable.worldId(), receipt.before().tickSequence());
            initializeVessels(connection, durable.worldId(), receipt.before().tickSequence());

            Counters counters = new Counters();
            for (int offset = 1; offset <= ticks; offset++) {
                long tick = receipt.before().tickSequence() + offset;
                Instant canonical = addTicks(receipt.before().canonicalTime(), receipt.before().tickSize(), offset);
                processStationEconomy(connection, durable.worldId(), tick, counters);
                createMissions(connection, durable.worldId(), tick, counters);
                assignMissions(connection, durable.worldId(), tick, counters);
                processVessels(connection, durable.worldId(), tick, canonical, counters);
                processResearch(connection, durable.worldId(), tick, counters);
            }

            UUID checkpointId = UUID.randomUUID();
            insertCheckpoint(connection, checkpointId, durable.worldId(), receipt,
                    "Passive world cycle: station economy, routes, missions, NPC voyages, research, and encounters");
            updateClock(connection, durable.worldId(), receipt.after(), receipt.commandId(), checkpointId);
            updatePassiveConfig(connection, durable.worldId(), receipt.after().tickSequence());
            insertAudit(connection, durable.worldId(), receipt, checkpointId, counters);
            connection.commit();
            return counters.result(durable.worldId(), receipt.commandId(), checkpointId,
                    receipt.after().tickSequence(), receipt.after().canonicalTime());
        } catch (SQLException | RuntimeException exception) {
            try { connection.rollback(); } catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
            throw exception;
        } finally {
            connection.setAutoCommit(originalAutoCommit);
        }
    }

    private static void initializeStations(Connection connection, UUID worldId, long tick) throws SQLException {
        String query = "SELECT ws.station_id, wl.ring, wl.location_level FROM world_station ws "
                + "JOIN world_location wl ON wl.location_id = ws.location_id WHERE ws.world_id = ?";
        try (PreparedStatement select = connection.prepareStatement(query);
             PreparedStatement insert = connection.prepareStatement(
                     "INSERT OR IGNORE INTO station_simulation_state(station_id, world_id, credits, supplies, ore, "
                             + "industry, security, integrity, threat, research, status, last_tick) "
                             + "VALUES (?, ?, ?, ?, ?, ?, ?, 100, ?, 0, 'STABLE', ?)")) {
            select.setString(1, worldId.toString());
            try (ResultSet result = select.executeQuery()) {
                while (result.next()) {
                    UUID stationId = UUID.fromString(result.getString("station_id"));
                    int variance = deterministic(stationId + ":station", 31);
                    int level = result.getInt("location_level");
                    insert.setString(1, stationId.toString());
                    insert.setString(2, worldId.toString());
                    insert.setInt(3, 8_000 + variance * 250);
                    insert.setInt(4, 70 + deterministic(stationId + ":supplies", 61));
                    insert.setInt(5, 15 + deterministic(stationId + ":ore", 41));
                    insert.setInt(6, 35 + deterministic(stationId + ":industry", 51));
                    insert.setInt(7, 35 + deterministic(stationId + ":security", 51));
                    insert.setInt(8, clamp(8 + level * 4 + deterministic(stationId + ":threat", 21), 0, 100));
                    insert.setLong(9, tick);
                    insert.addBatch();
                }
            }
            insert.executeBatch();
        }
    }

    private static void initializeResearch(Connection connection, UUID worldId, long tick) throws SQLException {
        String sql = "INSERT OR IGNORE INTO station_research_project(project_id, world_id, station_id, topic, "
                + "status, progress, target, created_tick, updated_tick) "
                + "SELECT lower(hex(randomblob(16))), ?, s.station_id, 'Europan fauna countermeasures', "
                + "'ACTIVE', 0, 100, ?, ? FROM station_simulation_state s WHERE s.world_id = ? AND s.research = 0";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, worldId.toString());
            statement.setLong(2, tick);
            statement.setLong(3, tick);
            statement.setString(4, worldId.toString());
            statement.executeUpdate();
        }
    }

    private static void initializeVessels(Connection connection, UUID worldId, long tick) throws SQLException {
        if (count(connection, "npc_vessel", worldId) > 0) return;
        List<StationSeed> stations = new ArrayList<>();
        String query = "SELECT ws.station_id, ws.location_id, ws.display_name FROM world_station ws "
                + "WHERE ws.world_id = ? ORDER BY ws.source_station_id LIMIT 24";
        try (PreparedStatement statement = connection.prepareStatement(query)) {
            statement.setString(1, worldId.toString());
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) stations.add(new StationSeed(
                        UUID.fromString(result.getString("station_id")),
                        UUID.fromString(result.getString("location_id")), result.getString("display_name")));
            }
        }
        if (stations.isEmpty()) return;
        int target = Math.min(24, Math.max(4, stations.size() / 5));
        String insertSql = "INSERT INTO npc_vessel(npc_vessel_id, world_id, display_name, role, home_station_id, "
                + "current_location_id, status, hull, supplies, cargo, crew_quality, navigation, engineering, "
                + "combat, mining, research, route_progress, route_ticks_required, deterministic_seed, last_tick) "
                + "VALUES (?, ?, ?, ?, ?, ?, 'DOCKED', 100, 100, 0, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)";
        try (PreparedStatement insert = connection.prepareStatement(insertSql)) {
            for (int index = 0; index < target; index++) {
                StationSeed station = stations.get(index % stations.size());
                UUID vesselId = deterministicId(worldId + ":npc:" + index);
                Role role = Role.values()[index % Role.values().length];
                insert.setString(1, vesselId.toString());
                insert.setString(2, worldId.toString());
                insert.setString(3, role.prefix + " " + station.name() + " " + (index + 1));
                insert.setString(4, role.databaseValue);
                insert.setString(5, station.stationId().toString());
                insert.setString(6, station.locationId().toString());
                insert.setInt(7, 45 + deterministic(vesselId + ":crew", 36));
                insert.setInt(8, 45 + deterministic(vesselId + ":nav", 41));
                insert.setInt(9, 45 + deterministic(vesselId + ":eng", 41));
                insert.setInt(10, 45 + deterministic(vesselId + ":combat", 41));
                insert.setInt(11, 45 + deterministic(vesselId + ":mining", 41));
                insert.setInt(12, 45 + deterministic(vesselId + ":research", 41));
                insert.setLong(13, vesselId.getMostSignificantBits());
                insert.setLong(14, tick);
                insert.addBatch();
            }
            insert.executeBatch();
        }
    }

    private static void processStationEconomy(Connection connection, UUID worldId, long tick, Counters counters)
            throws SQLException {
        String selectSql = "SELECT station_id, credits, supplies, ore, industry, security, integrity, threat, research "
                + "FROM station_simulation_state WHERE world_id = ? ORDER BY station_id";
        String updateSql = "UPDATE station_simulation_state SET credits=?, supplies=?, ore=?, industry=?, security=?, "
                + "integrity=?, threat=?, research=?, status=?, last_tick=? WHERE station_id=?";
        try (PreparedStatement select = connection.prepareStatement(selectSql);
             PreparedStatement update = connection.prepareStatement(updateSql)) {
            select.setString(1, worldId.toString());
            try (ResultSet result = select.executeQuery()) {
                while (result.next()) {
                    UUID stationId = UUID.fromString(result.getString("station_id"));
                    int industry = result.getInt("industry");
                    int security = result.getInt("security");
                    int integrity = result.getInt("integrity");
                    int threat = result.getInt("threat");
                    int supplies = Math.max(0, result.getInt("supplies") + industry / 25 - 2);
                    int ore = Math.max(0, result.getInt("ore") - Math.max(1, industry / 30));
                    int credits = result.getInt("credits") + industry * 3 - threat * 2;
                    int drift = deterministic(stationId + ":threat:" + tick, 7) - 3;
                    threat = clamp(threat + drift - security / 45, 0, 100);
                    if (threat >= 75) integrity = clamp(integrity - Math.max(1, (threat - security) / 20), 0, 100);
                    else if (supplies > 60 && integrity < 100) integrity++;
                    String status = stationStatus(credits, supplies, integrity, threat);
                    update.setInt(1, credits);
                    update.setInt(2, supplies);
                    update.setInt(3, ore);
                    update.setInt(4, industry);
                    update.setInt(5, security);
                    update.setInt(6, integrity);
                    update.setInt(7, threat);
                    update.setInt(8, result.getInt("research"));
                    update.setString(9, status);
                    update.setLong(10, tick);
                    update.setString(11, stationId.toString());
                    update.addBatch();
                    counters.stationUpdates++;
                }
            }
            update.executeBatch();
        }
    }

    private static void createMissions(Connection connection, UUID worldId, long tick, Counters counters)
            throws SQLException {
        long open = countWhere(connection, "SELECT COUNT(*) FROM world_mission WHERE world_id=? "
                + "AND status IN ('AVAILABLE','ASSIGNED','ACTIVE')", worldId);
        long stations = count(connection, "station_simulation_state", worldId);
        int desired = (int) Math.min(30, Math.max(4, stations / 4));
        if (open >= desired) return;
        String selectSql = "SELECT s.station_id, ws.location_id, s.supplies, s.ore, s.threat, s.research "
                + "FROM station_simulation_state s JOIN world_station ws ON ws.station_id=s.station_id "
                + "WHERE s.world_id=? ORDER BY s.threat DESC, s.supplies ASC";
        try (PreparedStatement select = connection.prepareStatement(selectSql)) {
            select.setString(1, worldId.toString());
            try (ResultSet result = select.executeQuery()) {
                while (result.next() && open < desired) {
                    UUID stationId = UUID.fromString(result.getString("station_id"));
                    UUID originLocation = UUID.fromString(result.getString("location_id"));
                    MissionType type = chooseMission(result.getInt("supplies"), result.getInt("ore"),
                            result.getInt("threat"), result.getInt("research"), stationId, tick);
                    UUID target = chooseTargetLocation(connection, worldId, originLocation, type, tick);
                    if (target == null) continue;
                    UUID missionId = deterministicId(worldId + ":mission:" + stationId + ":" + tick + ":" + type);
                    try (PreparedStatement insert = connection.prepareStatement(
                            "INSERT OR IGNORE INTO world_mission(mission_id, world_id, mission_type, status, "
                                    + "origin_station_id, target_location_id, deterministic_seed, difficulty, "
                                    + "reward_credits, cargo_units, progress, created_tick, updated_tick) "
                                    + "VALUES (?, ?, ?, 'AVAILABLE', ?, ?, ?, ?, ?, ?, 0, ?, ?)")) {
                        insert.setString(1, missionId.toString());
                        insert.setString(2, worldId.toString());
                        insert.setString(3, type.name());
                        insert.setString(4, stationId.toString());
                        insert.setString(5, target.toString());
                        insert.setLong(6, missionId.getMostSignificantBits());
                        int difficulty = clamp(25 + deterministic(missionId + ":difficulty", 51), 1, 100);
                        insert.setInt(7, difficulty);
                        insert.setInt(8, 1_000 + difficulty * 80);
                        insert.setInt(9, type == MissionType.TRADE ? 20 : type == MissionType.MINING ? 10 : 0);
                        insert.setLong(10, tick);
                        insert.setLong(11, tick);
                        if (insert.executeUpdate() == 1) {
                            open++;
                            counters.missionsCreated++;
                        }
                    }
                }
            }
        }
    }

    private static void assignMissions(Connection connection, UUID worldId, long tick, Counters counters)
            throws SQLException {
        String vesselsSql = "SELECT npc_vessel_id, role, current_location_id FROM npc_vessel "
                + "WHERE world_id=? AND status='DOCKED' AND mission_id IS NULL ORDER BY last_tick, npc_vessel_id";
        try (PreparedStatement vessels = connection.prepareStatement(vesselsSql)) {
            vessels.setString(1, worldId.toString());
            try (ResultSet vessel = vessels.executeQuery()) {
                while (vessel.next()) {
                    UUID vesselId = UUID.fromString(vessel.getString("npc_vessel_id"));
                    MissionAssignment mission = findMission(connection, worldId, vessel.getString("role"));
                    if (mission == null) break;
                    int routeTicks = routeTicks(connection, UUID.fromString(vessel.getString("current_location_id")),
                            mission.targetLocationId());
                    try (PreparedStatement updateVessel = connection.prepareStatement(
                            "UPDATE npc_vessel SET mission_id=?, destination_location_id=?, status='PREPARING', "
                                    + "route_progress=0, route_ticks_required=?, last_tick=? WHERE npc_vessel_id=?");
                         PreparedStatement updateMission = connection.prepareStatement(
                                 "UPDATE world_mission SET assigned_npc_vessel_id=?, status='ASSIGNED', updated_tick=? "
                                         + "WHERE mission_id=? AND status='AVAILABLE'")) {
                        updateMission.setString(1, vesselId.toString());
                        updateMission.setLong(2, tick);
                        updateMission.setString(3, mission.missionId().toString());
                        if (updateMission.executeUpdate() != 1) continue;
                        updateVessel.setString(1, mission.missionId().toString());
                        updateVessel.setString(2, mission.targetLocationId().toString());
                        updateVessel.setInt(3, routeTicks);
                        updateVessel.setLong(4, tick);
                        updateVessel.setString(5, vesselId.toString());
                        updateVessel.executeUpdate();
                        counters.missionsAssigned++;
                        insertLog(connection, worldId, vesselId, mission.missionId(), tick, null,
                                "MISSION_ASSIGNED", 0, "Mission assigned",
                                "The vessel accepted a " + mission.type() + " mission and began departure checks.",
                                "PREPARING", 0, 0, 0);
                    }
                }
            }
        }
    }

    private static void processVessels(Connection connection, UUID worldId, long tick, Instant canonical,
                                       Counters counters) throws SQLException {
        List<VesselState> vessels = readVessels(connection, worldId);
        for (VesselState vessel : vessels) {
            switch (vessel.status()) {
                case "PREPARING" -> depart(connection, vessel, tick, canonical, counters);
                case "IN_TRANSIT", "RETURNING" -> transit(connection, worldId, vessel, tick, canonical, counters);
                case "WORKING" -> workMission(connection, worldId, vessel, tick, canonical, counters);
                case "DISABLED" -> disabledDrift(connection, worldId, vessel, tick, canonical, counters);
                default -> { }
            }
        }
    }

    private static void depart(Connection connection, VesselState vessel, long tick, Instant canonical,
                               Counters counters) throws SQLException {
        try (PreparedStatement update = connection.prepareStatement(
                "UPDATE npc_vessel SET status='IN_TRANSIT', supplies=MAX(0,supplies-1), last_tick=? "
                        + "WHERE npc_vessel_id=?")) {
            update.setLong(1, tick);
            update.setString(2, vessel.id().toString());
            update.executeUpdate();
        }
        updateMissionStatus(connection, vessel.missionId(), "ACTIVE", tick, null);
        insertLog(connection, vessel.worldId(), vessel.id(), vessel.missionId(), tick, canonical,
                "DEPARTURE", 0, "Vessel departed",
                vessel.name() + " cleared its berth and entered the transit corridor.",
                "IN_TRANSIT", 0, -1, 0);
        counters.vesselsAdvanced++;
    }

    private static void transit(Connection connection, UUID worldId, VesselState vessel, long tick,
                                Instant canonical, Counters counters) throws SQLException {
        MissionType missionType = missionType(connection, vessel.missionId());
        int level = locationLevel(connection, vessel.destinationId());
        int threat = destinationThreat(connection, vessel.destinationId());
        Transitant transitant = new Transitant(vessel.id(), vessel.name(), vessel.navigation(),
                vessel.engineering(), vessel.combat(), vessel.crewQuality(), vessel.hull(), vessel.supplies());
        TransitContext context = new TransitContext(worldId,
                vessel.currentId() + "->" + vessel.destinationId(), tick, level, threat, missionType);
        Resolution resolution = TransitResolutionEngine.resolve(transitant, context);
        int hull = clamp(vessel.hull() + resolution.hullDelta(), 0, 100);
        int supplies = Math.max(0, vessel.supplies() + resolution.suppliesDelta());
        int progress = vessel.routeProgress() + 1;
        String status = hull == 0 ? "LOST" : hull < 20 ? "DISABLED" : vessel.status();
        boolean arrived = !status.equals("LOST") && !status.equals("DISABLED")
                && progress >= vessel.routeTicksRequired() + resolution.delayTicks();
        if (arrived) status = "WORKING";
        try (PreparedStatement update = connection.prepareStatement(
                "UPDATE npc_vessel SET hull=?, supplies=?, route_progress=?, status=?, "
                        + "current_location_id=CASE WHEN ?=1 THEN destination_location_id ELSE current_location_id END, "
                        + "last_tick=? WHERE npc_vessel_id=?")) {
            update.setInt(1, hull);
            update.setInt(2, supplies);
            update.setInt(3, progress);
            update.setString(4, status);
            update.setInt(5, arrived ? 1 : 0);
            update.setLong(6, tick);
            update.setString(7, vessel.id().toString());
            update.executeUpdate();
        }
        UUID encounterId = deterministicId(worldId + ":encounter:" + vessel.id() + ":" + tick);
        try (PreparedStatement insert = connection.prepareStatement(
                "INSERT OR IGNORE INTO world_encounter(encounter_id, world_id, npc_vessel_id, mission_id, "
                        + "tick_sequence, canonical_time, hazard_type, challenge, resolution_roll, margin, "
                        + "outcome, narrative) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
            insert.setString(1, encounterId.toString());
            insert.setString(2, worldId.toString());
            insert.setString(3, vessel.id().toString());
            nullableUuid(insert, 4, vessel.missionId());
            insert.setLong(5, tick);
            insert.setString(6, canonical.toString());
            insert.setString(7, resolution.hazard().name());
            insert.setInt(8, resolution.challenge());
            insert.setInt(9, resolution.roll());
            insert.setInt(10, resolution.margin());
            insert.setString(11, resolution.outcome().name());
            insert.setString(12, resolution.narrative());
            insert.executeUpdate();
        }
        insertLog(connection, worldId, vessel.id(), vessel.missionId(), tick, canonical,
                resolution.hazard().name(), severity(resolution), resolution.narrative(),
                "Challenge " + resolution.challenge() + ", roll " + resolution.roll()
                        + ", effective capability " + resolution.effectiveCapability()
                        + ", margin " + resolution.margin() + ".",
                resolution.outcome().name(), resolution.hullDelta(), resolution.suppliesDelta(), 0);
        counters.encountersResolved++;
        counters.logsWritten++;
        counters.vesselsAdvanced++;
        if (status.equals("LOST")) {
            updateMissionStatus(connection, vessel.missionId(), "FAILED", tick, tick);
            applyStationImpact(connection, vessel.homeStationId(), -10, 10, -5);
            counters.missionsFailed++;
        }
    }

    private static void workMission(Connection connection, UUID worldId, VesselState vessel, long tick,
                                    Instant canonical, Counters counters) throws SQLException {
        MissionRow mission = readMission(connection, vessel.missionId());
        if (mission == null) {
            clearMissionAndDock(connection, vessel, tick);
            return;
        }
        int skill = switch (mission.type()) {
            case TRADE -> vessel.crewQuality();
            case MINING -> vessel.mining();
            case FAUNA_CLEARING, DEFENSE -> vessel.combat();
            case RESEARCH -> vessel.research();
            case SALVAGE -> vessel.engineering();
            case TRANSIT -> vessel.navigation();
        };
        int gain = clamp(8 + skill / 8 - mission.difficulty() / 12, 3, 25);
        int progress = Math.min(100, mission.progress() + gain);
        try (PreparedStatement update = connection.prepareStatement(
                "UPDATE world_mission SET progress=?, updated_tick=?, status=CASE WHEN ?=100 THEN 'COMPLETE' "
                        + "ELSE 'ACTIVE' END, completed_tick=CASE WHEN ?=100 THEN ? ELSE completed_tick END "
                        + "WHERE mission_id=?")) {
            update.setInt(1, progress);
            update.setLong(2, tick);
            update.setInt(3, progress);
            update.setInt(4, progress);
            update.setLong(5, tick);
            update.setString(6, mission.id().toString());
            update.executeUpdate();
        }
        if (progress < 100) {
            insertLog(connection, worldId, vessel.id(), mission.id(), tick, canonical,
                    "MISSION_PROGRESS", 10, "Mission work continued",
                    vessel.name() + " advanced " + mission.type().name().toLowerCase().replace('_', '-')
                            + " operations to " + progress + "%.", "ACTIVE", 0, -1, 0);
            counters.logsWritten++;
            return;
        }
        completeMissionEffects(connection, mission, vessel, tick);
        try (PreparedStatement update = connection.prepareStatement(
                "UPDATE npc_vessel SET status='RETURNING', destination_location_id=(SELECT location_id FROM world_station "
                        + "WHERE station_id=?), route_progress=0, route_ticks_required=MAX(1,route_ticks_required), "
                        + "cargo=cargo+?, last_tick=? WHERE npc_vessel_id=?")) {
            nullableUuid(update, 1, vessel.homeStationId());
            update.setInt(2, mission.type() == MissionType.MINING ? 20 : mission.type() == MissionType.TRADE ? 5 : 0);
            update.setLong(3, tick);
            update.setString(4, vessel.id().toString());
            update.executeUpdate();
        }
        insertLog(connection, worldId, vessel.id(), mission.id(), tick, canonical,
                "MISSION_COMPLETE", 0, "Mission completed",
                vessel.name() + " completed its " + mission.type().name().toLowerCase().replace('_', '-')
                        + " mission and began the return voyage.", "COMPLETE", 0, 0, 8);
        counters.logsWritten++;
        counters.missionsCompleted++;
    }

    private static void disabledDrift(Connection connection, UUID worldId, VesselState vessel, long tick,
                                      Instant canonical, Counters counters) throws SQLException {
        int hull = Math.max(0, vessel.hull() - 1);
        String status = hull == 0 ? "LOST" : "DISABLED";
        try (PreparedStatement update = connection.prepareStatement(
                "UPDATE npc_vessel SET hull=?, status=?, last_tick=? WHERE npc_vessel_id=?")) {
            update.setInt(1, hull);
            update.setString(2, status);
            update.setLong(3, tick);
            update.setString(4, vessel.id().toString());
            update.executeUpdate();
        }
        insertLog(connection, worldId, vessel.id(), vessel.missionId(), tick, canonical,
                "DISTRESS", 90, "Disabled vessel remains adrift",
                vessel.name() + " transmitted a distress update while damage control attempted to stabilize the hull.",
                status, -1, -1, -2);
        counters.logsWritten++;
    }

    private static void processResearch(Connection connection, UUID worldId, long tick, Counters counters)
            throws SQLException {
        String sql = "SELECT p.project_id, p.station_id, p.progress, p.target, s.research, s.supplies, s.status "
                + "FROM station_research_project p JOIN station_simulation_state s ON s.station_id=p.station_id "
                + "WHERE p.world_id=? AND p.status='ACTIVE'";
        try (PreparedStatement select = connection.prepareStatement(sql)) {
            select.setString(1, worldId.toString());
            try (ResultSet result = select.executeQuery()) {
                while (result.next()) {
                    int gain = result.getString("status").equals("BESIEGED") ? 0
                            : Math.max(1, 1 + result.getInt("research") / 25 + result.getInt("supplies") / 100);
                    int progress = Math.min(result.getInt("target"), result.getInt("progress") + gain);
                    try (PreparedStatement update = connection.prepareStatement(
                            "UPDATE station_research_project SET progress=?, updated_tick=?, status=CASE WHEN ? >= target "
                                    + "THEN 'COMPLETE' ELSE 'ACTIVE' END, completed_tick=CASE WHEN ? >= target THEN ? "
                                    + "ELSE completed_tick END WHERE project_id=?")) {
                        update.setInt(1, progress);
                        update.setLong(2, tick);
                        update.setInt(3, progress);
                        update.setInt(4, progress);
                        update.setLong(5, tick);
                        update.setString(6, result.getString("project_id"));
                        update.executeUpdate();
                    }
                    if (progress >= result.getInt("target")) {
                        applyStationImpact(connection, UUID.fromString(result.getString("station_id")), 0, -12, 12);
                        counters.researchCompleted++;
                    }
                }
            }
        }
    }

    private static void completeMissionEffects(Connection connection, MissionRow mission,
                                               VesselState vessel, long tick) throws SQLException {
        UUID station = mission.originStationId();
        switch (mission.type()) {
            case TRADE -> applyStationEconomy(connection, station, mission.reward(), 30, 0, 0, 0, 0);
            case MINING -> applyStationEconomy(connection, station, mission.reward(), 0, 35, 2, 0, 0);
            case FAUNA_CLEARING -> applyStationEconomy(connection, station, mission.reward(), 5, 0, 0, 5, -28);
            case DEFENSE -> applyStationEconomy(connection, station, mission.reward(), 0, 0, 0, 8, -20);
            case RESEARCH -> applyStationEconomy(connection, station, mission.reward(), 0, 0, 0, 0, -8);
            case SALVAGE -> applyStationEconomy(connection, station, mission.reward(), 15, 15, 1, 0, -5);
            case TRANSIT -> applyStationEconomy(connection, station, mission.reward(), 5, 0, 0, 0, 0);
        }
        if (mission.type() == MissionType.RESEARCH) {
            try (PreparedStatement update = connection.prepareStatement(
                    "UPDATE station_simulation_state SET research=research+15 WHERE station_id=?")) {
                update.setString(1, station.toString());
                update.executeUpdate();
            }
        }
    }

    private static void applyStationEconomy(Connection connection, UUID station, int credits, int supplies,
                                            int ore, int industry, int security, int threat) throws SQLException {
        if (station == null) return;
        try (PreparedStatement update = connection.prepareStatement(
                "UPDATE station_simulation_state SET credits=credits+?, supplies=MAX(0,supplies+?), "
                        + "ore=MAX(0,ore+?), industry=MIN(100,MAX(0,industry+?)), "
                        + "security=MIN(100,MAX(0,security+?)), threat=MIN(100,MAX(0,threat+?)) "
                        + "WHERE station_id=?")) {
            update.setInt(1, credits);
            update.setInt(2, supplies);
            update.setInt(3, ore);
            update.setInt(4, industry);
            update.setInt(5, security);
            update.setInt(6, threat);
            update.setString(7, station.toString());
            update.executeUpdate();
        }
    }

    private static void applyStationImpact(Connection connection, UUID station, int integrity,
                                           int threat, int security) throws SQLException {
        if (station == null) return;
        try (PreparedStatement update = connection.prepareStatement(
                "UPDATE station_simulation_state SET integrity=MIN(100,MAX(0,integrity+?)), "
                        + "threat=MIN(100,MAX(0,threat+?)), security=MIN(100,MAX(0,security+?)) "
                        + "WHERE station_id=?")) {
            update.setInt(1, integrity);
            update.setInt(2, threat);
            update.setInt(3, security);
            update.setString(4, station.toString());
            update.executeUpdate();
        }
    }

    private static MissionType chooseMission(int supplies, int ore, int threat, int research,
                                             UUID station, long tick) {
        if (threat >= 70) return deterministic(station + ":mission:" + tick, 2) == 0
                ? MissionType.FAUNA_CLEARING : MissionType.DEFENSE;
        if (supplies < 55) return MissionType.TRADE;
        if (ore < 25) return MissionType.MINING;
        if (research < 40 && tick % 5 == 0) return MissionType.RESEARCH;
        MissionType[] rotation = {MissionType.TRADE, MissionType.MINING, MissionType.SALVAGE,
                MissionType.FAUNA_CLEARING, MissionType.RESEARCH};
        return rotation[deterministic(station + ":rotation:" + tick, rotation.length)];
    }

    private static UUID chooseTargetLocation(Connection connection, UUID worldId, UUID origin,
                                             MissionType type, long tick) throws SQLException {
        String order = type == MissionType.FAUNA_CLEARING || type == MissionType.MINING
                ? "location_level DESC, source_ordinal" : "ABS(source_ordinal - ?) ASC, source_ordinal";
        String sql = "SELECT location_id FROM world_location WHERE world_id=? AND location_id<>? ORDER BY "
                + order + " LIMIT 1 OFFSET ?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            int parameter = 1;
            statement.setString(parameter++, worldId.toString());
            statement.setString(parameter++, origin.toString());
            if (!order.startsWith("location_level")) statement.setInt(parameter++, deterministic(origin + ":ordinal", 960));
            statement.setInt(parameter, deterministic(origin + ":target:" + tick + ":" + type, 3));
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? UUID.fromString(result.getString(1)) : null;
            }
        }
    }

    private static MissionAssignment findMission(Connection connection, UUID worldId, String role)
            throws SQLException {
        String preferred = switch (role) {
            case "TRADER", "COURIER" -> "TRADE";
            case "MINER" -> "MINING";
            case "HUNTER", "PATROL" -> "FAUNA_CLEARING";
            case "RESEARCH" -> "RESEARCH";
            case "SALVAGE" -> "SALVAGE";
            default -> "TRANSIT";
        };
        String sql = "SELECT mission_id, mission_type, target_location_id FROM world_mission WHERE world_id=? "
                + "AND status='AVAILABLE' ORDER BY CASE WHEN mission_type=? THEN 0 ELSE 1 END, difficulty, created_tick LIMIT 1";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, worldId.toString());
            statement.setString(2, preferred);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? new MissionAssignment(UUID.fromString(result.getString(1)),
                        result.getString(2), UUID.fromString(result.getString(3))) : null;
            }
        }
    }

    private static List<VesselState> readVessels(Connection connection, UUID worldId) throws SQLException {
        List<VesselState> rows = new ArrayList<>();
        String sql = "SELECT npc_vessel_id, world_id, display_name, role, home_station_id, current_location_id, "
                + "destination_location_id, mission_id, status, hull, supplies, cargo, crew_quality, navigation, "
                + "engineering, combat, mining, research, route_progress, route_ticks_required FROM npc_vessel "
                + "WHERE world_id=? AND status NOT IN ('DOCKED','LOST') ORDER BY npc_vessel_id";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, worldId.toString());
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) rows.add(new VesselState(
                        UUID.fromString(result.getString("npc_vessel_id")), worldId,
                        result.getString("display_name"), result.getString("role"),
                        uuid(result.getString("home_station_id")),
                        UUID.fromString(result.getString("current_location_id")),
                        uuid(result.getString("destination_location_id")), uuid(result.getString("mission_id")),
                        result.getString("status"), result.getInt("hull"), result.getInt("supplies"),
                        result.getInt("cargo"), result.getInt("crew_quality"), result.getInt("navigation"),
                        result.getInt("engineering"), result.getInt("combat"), result.getInt("mining"),
                        result.getInt("research"), result.getInt("route_progress"),
                        result.getInt("route_ticks_required")));
            }
        }
        return rows;
    }

    private static MissionRow readMission(Connection connection, UUID missionId) throws SQLException {
        if (missionId == null) return null;
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT mission_id, mission_type, origin_station_id, target_location_id, difficulty, "
                        + "reward_credits, progress FROM world_mission WHERE mission_id=?")) {
            statement.setString(1, missionId.toString());
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? new MissionRow(missionId, MissionType.valueOf(result.getString("mission_type")),
                        uuid(result.getString("origin_station_id")),
                        UUID.fromString(result.getString("target_location_id")), result.getInt("difficulty"),
                        result.getInt("reward_credits"), result.getInt("progress")) : null;
            }
        }
    }

    private static MissionType missionType(Connection connection, UUID missionId) throws SQLException {
        MissionRow mission = readMission(connection, missionId);
        return mission == null ? MissionType.TRANSIT : mission.type();
    }

    private static int routeTicks(Connection connection, UUID from, UUID to) throws SQLException {
        int[] a = locationCoordinates(connection, from);
        int[] b = locationCoordinates(connection, to);
        return clamp(2 + Math.abs(a[0] - b[0]) / 8 + Math.abs(a[1] - b[1]), 2, 24);
    }

    private static int[] locationCoordinates(Connection connection, UUID location) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT ring, location_level FROM world_location WHERE location_id=?")) {
            statement.setString(1, location.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("NPC route references an unknown location.");
                return new int[]{result.getInt(1), result.getInt(2)};
            }
        }
    }

    private static int locationLevel(Connection connection, UUID location) throws SQLException {
        if (location == null) return 1;
        return locationCoordinates(connection, location)[1];
    }

    private static int destinationThreat(Connection connection, UUID location) throws SQLException {
        if (location == null) return 15;
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COALESCE(s.threat,15) FROM world_location l LEFT JOIN world_station ws ON ws.location_id=l.location_id "
                        + "LEFT JOIN station_simulation_state s ON s.station_id=ws.station_id WHERE l.location_id=?")) {
            statement.setString(1, location.toString());
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? result.getInt(1) : 15;
            }
        }
    }

    private static void clearMissionAndDock(Connection connection, VesselState vessel, long tick) throws SQLException {
        try (PreparedStatement update = connection.prepareStatement(
                "UPDATE npc_vessel SET mission_id=NULL, destination_location_id=NULL, status='DOCKED', "
                        + "route_progress=0, last_tick=? WHERE npc_vessel_id=?")) {
            update.setLong(1, tick);
            update.setString(2, vessel.id().toString());
            update.executeUpdate();
        }
    }

    private static void updateMissionStatus(Connection connection, UUID missionId, String status,
                                            long tick, Long completedTick) throws SQLException {
        if (missionId == null) return;
        try (PreparedStatement update = connection.prepareStatement(
                "UPDATE world_mission SET status=?, updated_tick=?, completed_tick=? WHERE mission_id=?")) {
            update.setString(1, status);
            update.setLong(2, tick);
            if (completedTick == null) update.setNull(3, Types.BIGINT); else update.setLong(3, completedTick);
            update.setString(4, missionId.toString());
            update.executeUpdate();
        }
    }

    private static void insertLog(Connection connection, UUID worldId, UUID vesselId, UUID missionId,
                                  long tick, Instant canonical, String eventType, int severity,
                                  String summary, String details, String resolution,
                                  int hullDelta, int suppliesDelta, int stationDelta) throws SQLException {
        UUID logId = deterministicId(worldId + ":log:" + vesselId + ":" + tick + ":" + eventType + ":" + summary);
        try (PreparedStatement insert = connection.prepareStatement(
                "INSERT OR IGNORE INTO npc_voyage_log(log_id, world_id, npc_vessel_id, mission_id, tick_sequence, "
                        + "canonical_time, event_type, severity, summary, details, resolution, hull_delta, "
                        + "supplies_delta, station_delta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
            insert.setString(1, logId.toString());
            insert.setString(2, worldId.toString());
            insert.setString(3, vesselId.toString());
            nullableUuid(insert, 4, missionId);
            insert.setLong(5, tick);
            insert.setString(6, (canonical == null ? Instant.EPOCH : canonical).toString());
            insert.setString(7, eventType);
            insert.setInt(8, clamp(severity, 0, 100));
            insert.setString(9, summary);
            insert.setString(10, details);
            insert.setString(11, resolution);
            insert.setInt(12, hullDelta);
            insert.setInt(13, suppliesDelta);
            insert.setInt(14, stationDelta);
            insert.executeUpdate();
        }
    }

    private static DurableState readDurableState(Connection connection, Duration defaultTick) throws SQLException {
        String sql = "SELECT wm.world_id, sm.canonical_time, sm.real_epoch, "
                + "COALESCE(sm.current_tick_sequence,sm.imported_tick_sequence) tick_sequence, "
                + "sm.tick_size_seconds, sm.tick_size_nanos, sm.simulation_enabled, sm.scheduler_state, "
                + "COALESCE((SELECT MAX(execution_sequence) FROM simulation_command_receipt r "
                + "WHERE r.world_id=wm.world_id),0) last_sequence FROM world_metadata wm "
                + "JOIN world_simulation_metadata sm ON sm.world_id=wm.world_id LIMIT 1";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("Passive simulation requires an imported master world.");
            Duration tick = result.getObject("tick_size_seconds") == null ? defaultTick
                    : Duration.ofSeconds(result.getLong("tick_size_seconds"), result.getInt("tick_size_nanos"));
            ClockSnapshot snapshot = new ClockSnapshot(Instant.parse(result.getString("canonical_time")),
                    Instant.parse(result.getString("real_epoch")), result.getLong("tick_sequence"), tick,
                    result.getInt("simulation_enabled") == 1,
                    io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock.SchedulerState
                            .valueOf(result.getString("scheduler_state")));
            return new DurableState(UUID.fromString(result.getString("world_id")), snapshot,
                    result.getLong("last_sequence"));
        }
    }

    private static void validate(DurableState durable, CommandReceipt receipt) throws SQLException {
        if (receipt.acceptedSequence() != durable.lastSequence() + 1) {
            throw new SQLException("Passive command sequence is stale.");
        }
        if (!durable.snapshot().equals(receipt.before())) {
            throw new SQLException("Passive command before-state is stale.");
        }
        if (!receipt.before().tickSize().equals(receipt.after().tickSize())
                || !receipt.before().realEpoch().equals(receipt.after().realEpoch())) {
            throw new SQLException("Passive simulation cannot change tick size or real epoch.");
        }
    }

    private static void insertReceipt(Connection connection, UUID worldId, CommandReceipt receipt)
            throws SQLException {
        String sql = "INSERT INTO simulation_command_receipt(command_id, world_id, execution_sequence, actor, "
                + "command, submitted_at, completed_at, writer_thread_id, before_canonical_time, before_tick_sequence, "
                + "before_simulation_enabled, before_scheduler_state, after_canonical_time, after_tick_sequence, "
                + "after_simulation_enabled, after_scheduler_state, catch_up_applied_ticks, catch_up_remaining_ticks, "
                + "catch_up_complete) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, receipt.commandId().toString());
            statement.setString(2, worldId.toString());
            statement.setLong(3, receipt.acceptedSequence());
            statement.setString(4, receipt.actor());
            statement.setString(5, "PASSIVE_" + receipt.command());
            statement.setString(6, receipt.submittedAt().toString());
            statement.setString(7, receipt.completedAt().toString());
            statement.setLong(8, receipt.writerThreadId());
            statement.setString(9, receipt.before().canonicalTime().toString());
            statement.setLong(10, receipt.before().tickSequence());
            statement.setInt(11, receipt.before().simulationEnabled() ? 1 : 0);
            statement.setString(12, receipt.before().schedulerState().name());
            statement.setString(13, receipt.after().canonicalTime().toString());
            statement.setLong(14, receipt.after().tickSequence());
            statement.setInt(15, receipt.after().simulationEnabled() ? 1 : 0);
            statement.setString(16, receipt.after().schedulerState().name());
            statement.setNull(17, Types.BIGINT);
            statement.setNull(18, Types.BIGINT);
            statement.setNull(19, Types.INTEGER);
            statement.executeUpdate();
        }
    }

    private static void insertCheckpoint(Connection connection, UUID checkpointId, UUID worldId,
                                         CommandReceipt receipt, String reason) throws SQLException {
        ClockSnapshot snapshot = receipt.after();
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO simulation_checkpoint(checkpoint_id,world_id,created_at,reason,source_command_id,"
                        + "canonical_time,real_epoch,tick_sequence,tick_size_seconds,tick_size_nanos,"
                        + "simulation_enabled,scheduler_state) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")) {
            statement.setString(1, checkpointId.toString());
            statement.setString(2, worldId.toString());
            statement.setString(3, receipt.completedAt().toString());
            statement.setString(4, reason);
            statement.setString(5, receipt.commandId().toString());
            statement.setString(6, snapshot.canonicalTime().toString());
            statement.setString(7, snapshot.realEpoch().toString());
            statement.setLong(8, snapshot.tickSequence());
            statement.setLong(9, snapshot.tickSize().getSeconds());
            statement.setInt(10, snapshot.tickSize().getNano());
            statement.setInt(11, snapshot.simulationEnabled() ? 1 : 0);
            statement.setString(12, snapshot.schedulerState().name());
            statement.executeUpdate();
        }
    }

    private static void updateClock(Connection connection, UUID worldId, ClockSnapshot snapshot,
                                    UUID commandId, UUID checkpointId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "UPDATE world_simulation_metadata SET canonical_time=?, current_tick_sequence=?, "
                        + "tick_size_seconds=?, tick_size_nanos=?, simulation_enabled=?, scheduler_state=?, "
                        + "last_command_id=?, last_checkpoint_id=?, last_simulated_at=? WHERE world_id=?")) {
            statement.setString(1, snapshot.canonicalTime().toString());
            statement.setLong(2, snapshot.tickSequence());
            statement.setLong(3, snapshot.tickSize().getSeconds());
            statement.setInt(4, snapshot.tickSize().getNano());
            statement.setInt(5, snapshot.simulationEnabled() ? 1 : 0);
            statement.setString(6, snapshot.schedulerState().name());
            statement.setString(7, commandId.toString());
            statement.setString(8, checkpointId.toString());
            statement.setString(9, snapshot.canonicalTime().toString());
            statement.setString(10, worldId.toString());
            if (statement.executeUpdate() != 1) throw new SQLException("Passive clock row disappeared.");
        }
    }

    private static void ensurePassiveConfig(Connection connection, UUID worldId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT OR IGNORE INTO passive_simulation_config(world_id,enabled,cadence_seconds,ticks_per_cycle,updated_at) "
                        + "VALUES (?,0,5,1,?)")) {
            statement.setString(1, worldId.toString());
            statement.setString(2, Instant.now().toString());
            statement.executeUpdate();
        }
    }

    private static void updatePassiveConfig(Connection connection, UUID worldId, long tick) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "UPDATE passive_simulation_config SET last_cycle_at=?, last_cycle_tick=?, updated_at=? WHERE world_id=?")) {
            String now = Instant.now().toString();
            statement.setString(1, now);
            statement.setLong(2, tick);
            statement.setString(3, now);
            statement.setString(4, worldId.toString());
            statement.executeUpdate();
        }
    }

    private static void insertAudit(Connection connection, UUID worldId, CommandReceipt receipt,
                                    UUID checkpointId, Counters counters) throws SQLException {
        String details = "{\"tickSequence\":" + receipt.after().tickSequence()
                + ",\"stationUpdates\":" + counters.stationUpdates
                + ",\"missionsCreated\":" + counters.missionsCreated
                + ",\"missionsAssigned\":" + counters.missionsAssigned
                + ",\"missionsCompleted\":" + counters.missionsCompleted
                + ",\"encountersResolved\":" + counters.encountersResolved
                + ",\"logsWritten\":" + counters.logsWritten
                + ",\"checkpointId\":\"" + checkpointId + "\"}";
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO audit_entry(occurred_at,actor,action,entity_type,entity_id,details_json) "
                        + "VALUES (?,?,'passive_world_cycle','world',?,?)")) {
            statement.setString(1, receipt.completedAt().toString());
            statement.setString(2, receipt.actor());
            statement.setString(3, worldId.toString());
            statement.setString(4, details);
            statement.executeUpdate();
        }
    }

    private static long count(Connection connection, String table, UUID worldId) throws SQLException {
        if (!List.of("npc_vessel", "station_simulation_state").contains(table)) {
            throw new IllegalArgumentException("Unsupported passive count table.");
        }
        return countWhere(connection, "SELECT COUNT(*) FROM " + table + " WHERE world_id=?", worldId);
    }

    private static long countWhere(Connection connection, String sql, UUID worldId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, worldId.toString());
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? result.getLong(1) : 0;
            }
        }
    }

    private static String stationStatus(int credits, int supplies, int integrity, int threat) {
        if (integrity == 0) return "FALLEN";
        if (threat >= 80 || integrity < 35) return "BESIEGED";
        if (supplies < 25 || credits < 0 || integrity < 65) return "STRAINED";
        if (supplies > 120 && credits > 15_000 && threat < 25) return "RISING";
        return "STABLE";
    }

    private static int severity(Resolution resolution) {
        return switch (resolution.outcome()) {
            case TRIUMPH -> 5;
            case SUCCESS -> 20;
            case COSTLY_SUCCESS -> 45;
            case SETBACK -> 70;
            case DISASTER -> 100;
        };
    }

    private static int deterministic(String key, int bound) {
        return Math.floorMod(key.hashCode() * 31 + key.length() * 17, bound);
    }

    private static UUID deterministicId(String key) {
        return UUID.nameUUIDFromBytes(key.getBytes(StandardCharsets.UTF_8));
    }

    private static UUID uuid(String value) {
        return value == null || value.isBlank() ? null : UUID.fromString(value);
    }

    private static void nullableUuid(PreparedStatement statement, int index, UUID value) throws SQLException {
        if (value == null) statement.setNull(index, Types.VARCHAR); else statement.setString(index, value.toString());
    }

    private static int clamp(int value, int minimum, int maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    private static Instant addTicks(Instant base, Duration tickSize, long ticks) {
        return base.plus(tickSize.multipliedBy(ticks));
    }

    private static void configure(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("PRAGMA busy_timeout=5000");
            statement.execute("PRAGMA journal_mode=WAL");
            statement.execute("PRAGMA synchronous=FULL");
        }
    }

    private static void verifySchema(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COALESCE(MAX(version),0) FROM schema_migration")) {
            int version = result.next() ? result.getInt(1) : 0;
            if (version != WorldStorageContracts.DATABASE_SCHEMA_VERSION) {
                throw new SQLException("Passive simulation requires database schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "; found " + version + ".");
            }
        }
    }

    private static void requireDriver() throws SQLException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) { throw new SQLException("SQLite JDBC driver is unavailable.", exception); }
    }

    private enum Role {
        TRADER("TRADER", "Merchant"), MINER("MINER", "Prospector"), HUNTER("HUNTER", "Hunter"),
        PATROL("PATROL", "Patrol"), RESEARCH("RESEARCH", "Survey"), SALVAGE("SALVAGE", "Recovery"),
        COURIER("COURIER", "Courier");
        private final String databaseValue;
        private final String prefix;
        Role(String databaseValue, String prefix) { this.databaseValue = databaseValue; this.prefix = prefix; }
    }

    private record DurableState(UUID worldId, ClockSnapshot snapshot, long lastSequence) { }
    private record StationSeed(UUID stationId, UUID locationId, String name) { }
    private record MissionAssignment(UUID missionId, String type, UUID targetLocationId) { }
    private record MissionRow(UUID id, MissionType type, UUID originStationId, UUID targetLocationId,
                              int difficulty, int reward, int progress) { }
    private record VesselState(UUID id, UUID worldId, String name, String role, UUID homeStationId,
                               UUID currentId, UUID destinationId, UUID missionId, String status, int hull,
                               int supplies, int cargo, int crewQuality, int navigation, int engineering,
                               int combat, int mining, int research, int routeProgress, int routeTicksRequired) { }

    private static final class Counters {
        int stationUpdates;
        int missionsCreated;
        int missionsAssigned;
        int missionsCompleted;
        int missionsFailed;
        int vesselsAdvanced;
        int encountersResolved;
        int logsWritten;
        int researchCompleted;

        TickResult result(UUID worldId, UUID commandId, UUID checkpointId, long tick, Instant canonical) {
            return new TickResult(worldId, commandId, checkpointId, tick, canonical, stationUpdates,
                    missionsCreated, missionsAssigned, missionsCompleted, missionsFailed, vesselsAdvanced,
                    encountersResolved, logsWritten, researchCompleted);
        }
    }

    public record TickResult(UUID worldId, UUID commandId, UUID checkpointId, long tickSequence,
                             Instant canonicalTime, int stationUpdates, int missionsCreated,
                             int missionsAssigned, int missionsCompleted, int missionsFailed,
                             int vesselsAdvanced, int encountersResolved, int logsWritten,
                             int researchCompleted) { }
}
