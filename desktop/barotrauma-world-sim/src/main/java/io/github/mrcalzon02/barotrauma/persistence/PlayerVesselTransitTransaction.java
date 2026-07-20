package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldLock;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.NpcTransitScheduleEngine;
import io.github.mrcalzon02.barotrauma.simulation.TransitResolutionEngine;
import io.github.mrcalzon02.barotrauma.simulation.TransitResolutionEngine.MissionType;
import io.github.mrcalzon02.barotrauma.simulation.TransitResolutionEngine.Resolution;
import io.github.mrcalzon02.barotrauma.simulation.TransitResolutionEngine.TransitContext;
import io.github.mrcalzon02.barotrauma.simulation.TransitResolutionEngine.Transitant;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Explicit player-vessel route operations using the shared deterministic transit resolver. */
public final class PlayerVesselTransitTransaction {
    private PlayerVesselTransitTransaction() { }

    public static PlayerState enroll(WorldPaths paths, UUID vesselId, UUID locationId, String actor)
            throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        Objects.requireNonNull(vesselId, "vesselId");
        Objects.requireNonNull(locationId, "locationId");
        requireDriver();
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            verifySchema(connection);
            boolean original = connection.getAutoCommit();
            connection.setAutoCommit(false);
            try {
                WorldClock world = readWorldClock(connection);
                VesselDefinition vessel = requireVessel(connection, world.worldId(), vesselId);
                requireLocation(connection, world.worldId(), locationId);
                int tier = vessel.tier() == null ? 1 : Math.max(1, vessel.tier());
                int base = clamp(42 + tier * 6, 1, 100);
                int navigation = clamp(base + classBonus(vessel.submarineClass(), "scout"), 1, 100);
                int engineering = clamp(base + classBonus(vessel.submarineClass(), "transport"), 1, 100);
                int combat = clamp(base + classBonus(vessel.submarineClass(), "attack"), 1, 100);
                int crew = clamp(45 + tier * 5, 1, 100);
                try (PreparedStatement statement = connection.prepareStatement(
                        "INSERT INTO player_vessel_state(vessel_id,world_id,current_location_id,status,hull,supplies,"
                                + "cargo,crew_quality,navigation,engineering,combat,route_progress,route_ticks_required,"
                                + "route_action_sequence,mission_type,last_tick) "
                                + "VALUES (?,?,?,'DOCKED',100,100,0,?,?,?,?,0,1,0,'TRANSIT',?) "
                                + "ON CONFLICT(vessel_id) DO NOTHING")) {
                    statement.setString(1, vesselId.toString());
                    statement.setString(2, world.worldId().toString());
                    statement.setString(3, locationId.toString());
                    statement.setInt(4, crew);
                    statement.setInt(5, navigation);
                    statement.setInt(6, engineering);
                    statement.setInt(7, combat);
                    statement.setLong(8, world.tickSequence());
                    statement.executeUpdate();
                }
                PlayerState state = requireState(connection, vesselId);
                if (!state.worldId().equals(world.worldId())) {
                    throw new SQLException("Player vessel is already enrolled in another desktop world.");
                }
                insertLog(connection, state, world, 0, "ENROLLED", 0,
                        "Vessel enrolled for live routes",
                        state.displayName() + " entered the player transit registry at " + state.currentLocationName() + ".",
                        "DOCKED", 0, 0);
                insertAudit(connection, actor, "player_vessel_enrolled", vesselId,
                        "{\"locationId\":\"" + locationId + "\"}");
                connection.commit();
                return requireState(connection, vesselId);
            } catch (SQLException | RuntimeException exception) {
                try { connection.rollback(); } catch (SQLException rollback) { exception.addSuppressed(rollback); }
                throw exception;
            } finally { connection.setAutoCommit(original); }
        }
    }

    public static PlayerState planRoute(WorldPaths paths, UUID vesselId, UUID destinationId,
                                        MissionType missionType, String actor)
            throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        Objects.requireNonNull(vesselId, "vesselId");
        Objects.requireNonNull(destinationId, "destinationId");
        Objects.requireNonNull(missionType, "missionType");
        requireDriver();
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            verifySchema(connection);
            boolean original = connection.getAutoCommit();
            connection.setAutoCommit(false);
            try {
                WorldClock world = readWorldClock(connection);
                PlayerState state = requireState(connection, vesselId);
                if (!state.worldId().equals(world.worldId())) throw new SQLException("Player vessel belongs to another world.");
                if (!state.status().equals("DOCKED") && !state.status().equals("ARRIVED")) {
                    throw new SQLException("A player route can only be planned while docked or arrived.");
                }
                if (state.currentLocationId().equals(destinationId)) {
                    throw new SQLException("Player route destination must differ from the current location.");
                }
                requireLocation(connection, world.worldId(), destinationId);
                int routeTicks = routeTicks(connection, state.currentLocationId(), destinationId);
                try (PreparedStatement statement = connection.prepareStatement(
                        "UPDATE player_vessel_state SET destination_location_id=?,status='IN_TRANSIT',"
                                + "route_progress=0,route_ticks_required=?,route_action_sequence=0,mission_type=?,"
                                + "last_tick=? WHERE vessel_id=?")) {
                    statement.setString(1, destinationId.toString());
                    statement.setInt(2, routeTicks);
                    statement.setString(3, missionType.name());
                    statement.setLong(4, world.tickSequence());
                    statement.setString(5, vesselId.toString());
                    if (statement.executeUpdate() != 1) throw new SQLException("Player vessel disappeared during route planning.");
                }
                PlayerState planned = requireState(connection, vesselId);
                insertLog(connection, planned, world, 0, "ROUTE_PLANNED", 0,
                        "Route planned",
                        planned.displayName() + " plotted a " + missionType.displayName() + " route from "
                                + planned.currentLocationName() + " to " + planned.destinationLocationName() + ".",
                        "IN_TRANSIT", 0, 0);
                insertAudit(connection, actor, "player_route_planned", vesselId,
                        "{\"destinationId\":\"" + destinationId + "\",\"missionType\":\""
                                + missionType.name() + "\",\"routeTicks\":" + routeTicks + "}");
                connection.commit();
                return planned;
            } catch (SQLException | RuntimeException exception) {
                try { connection.rollback(); } catch (SQLException rollback) { exception.addSuppressed(rollback); }
                throw exception;
            } finally { connection.setAutoCommit(original); }
        }
    }

    public static TransitResult resolveNextChallenge(WorldPaths paths, UUID vesselId, String actor)
            throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        Objects.requireNonNull(vesselId, "vesselId");
        requireDriver();
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            verifySchema(connection);
            boolean original = connection.getAutoCommit();
            connection.setAutoCommit(false);
            try {
                WorldClock world = readWorldClock(connection);
                PlayerState state = requireState(connection, vesselId);
                if (!state.status().equals("IN_TRANSIT")) {
                    throw new SQLException("Player vessel is not currently in transit.");
                }
                if (state.destinationLocationId() == null) throw new SQLException("Player route has no destination.");
                long actionSequence = state.routeActionSequence() + 1L;
                int level = locationLevel(connection, state.destinationLocationId());
                int threat = destinationThreat(connection, state.destinationLocationId());
                String routeId = state.currentLocationId() + "->" + state.destinationLocationId();
                long deterministicTick = Math.addExact(Math.multiplyExact(world.tickSequence(), 1_000_000L), actionSequence);
                Resolution resolution = TransitResolutionEngine.resolve(
                        new Transitant(vesselId, state.displayName(), state.navigation(), state.engineering(),
                                state.combat(), state.crewQuality(), state.hull(), state.supplies()),
                        new TransitContext(world.worldId(), routeId, deterministicTick, level, threat,
                                MissionType.valueOf(state.missionType())));
                int hull = clamp(state.hull() + resolution.hullDelta(), 0, 100);
                int supplies = Math.max(0, state.supplies() + resolution.suppliesDelta());
                int progress = state.routeProgress() + 1;
                int addedDelay = Math.max(0, resolution.delayTicks() - 1);
                int requiredTicks = Math.addExact(state.routeTicksRequired(), addedDelay);
                String status = hull == 0 ? "LOST" : hull < 20 ? "DISABLED" : "IN_TRANSIT";
                boolean arrived = status.equals("IN_TRANSIT") && progress >= requiredTicks;
                if (arrived) status = "ARRIVED";
                try (PreparedStatement statement = connection.prepareStatement(
                        "UPDATE player_vessel_state SET hull=?,supplies=?,route_progress=?,route_ticks_required=?,"
                                + "route_action_sequence=?,status=?,"
                                + "current_location_id=CASE WHEN ?=1 THEN destination_location_id ELSE current_location_id END,"
                                + "destination_location_id=CASE WHEN ?=1 THEN NULL ELSE destination_location_id END,last_tick=? "
                                + "WHERE vessel_id=?")) {
                    statement.setInt(1, hull);
                    statement.setInt(2, supplies);
                    statement.setInt(3, progress);
                    statement.setInt(4, requiredTicks);
                    statement.setLong(5, actionSequence);
                    statement.setString(6, status);
                    statement.setInt(7, arrived ? 1 : 0);
                    statement.setInt(8, arrived ? 1 : 0);
                    statement.setLong(9, world.tickSequence());
                    statement.setString(10, vesselId.toString());
                    statement.executeUpdate();
                }
                UUID encounterId = deterministicId(world.worldId() + ":player-encounter:" + vesselId + ":"
                        + world.tickSequence() + ":" + actionSequence);
                try (PreparedStatement statement = connection.prepareStatement(
                        "INSERT INTO player_transit_encounter(encounter_id,world_id,vessel_id,tick_sequence,"
                                + "action_sequence,canonical_time,route_id,hazard_type,challenge,resolution_roll,"
                                + "effective_capability,margin,outcome,narrative) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")) {
                    statement.setString(1, encounterId.toString());
                    statement.setString(2, world.worldId().toString());
                    statement.setString(3, vesselId.toString());
                    statement.setLong(4, world.tickSequence());
                    statement.setLong(5, actionSequence);
                    statement.setString(6, world.canonicalTime().toString());
                    statement.setString(7, routeId);
                    statement.setString(8, resolution.hazard().name());
                    statement.setInt(9, resolution.challenge());
                    statement.setInt(10, resolution.roll());
                    statement.setInt(11, resolution.effectiveCapability());
                    statement.setInt(12, resolution.margin());
                    statement.setString(13, resolution.outcome().name());
                    statement.setString(14, resolution.narrative());
                    statement.executeUpdate();
                }
                PlayerState updated = requireState(connection, vesselId);
                insertLog(connection, updated, world, actionSequence, resolution.hazard().name(), severity(resolution),
                        resolution.narrative(),
                        "Challenge " + resolution.challenge() + ", roll " + resolution.roll()
                                + ", effective capability " + resolution.effectiveCapability()
                                + ", margin " + resolution.margin() + ", added route delay " + addedDelay + ".",
                        updated.status(), resolution.hullDelta(), resolution.suppliesDelta());
                insertAudit(connection, actor, "player_transit_resolved", vesselId,
                        "{\"encounterId\":\"" + encounterId + "\",\"outcome\":\""
                                + resolution.outcome().name() + "\",\"addedDelay\":" + addedDelay
                                + ",\"arrived\":" + arrived + "}");
                connection.commit();
                return new TransitResult(encounterId, updated, resolution, arrived);
            } catch (SQLException | RuntimeException exception) {
                try { connection.rollback(); } catch (SQLException rollback) { exception.addSuppressed(rollback); }
                throw exception;
            } finally { connection.setAutoCommit(original); }
        }
    }

    public static PlayerState dock(WorldPaths paths, UUID vesselId, String actor)
            throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        Objects.requireNonNull(vesselId, "vesselId");
        requireDriver();
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            verifySchema(connection);
            boolean original = connection.getAutoCommit();
            connection.setAutoCommit(false);
            try {
                WorldClock world = readWorldClock(connection);
                PlayerState state = requireState(connection, vesselId);
                if (!state.status().equals("ARRIVED")) throw new SQLException("Only an arrived player vessel can dock.");
                try (PreparedStatement statement = connection.prepareStatement(
                        "UPDATE player_vessel_state SET status='DOCKED',route_progress=0,route_ticks_required=1,"
                                + "route_action_sequence=0,last_tick=? WHERE vessel_id=?")) {
                    statement.setLong(1, world.tickSequence());
                    statement.setString(2, vesselId.toString());
                    statement.executeUpdate();
                }
                PlayerState docked = requireState(connection, vesselId);
                insertLog(connection, docked, world, 0, "DOCKED", 0, "Vessel docked",
                        docked.displayName() + " completed docking procedures at " + docked.currentLocationName() + ".",
                        "DOCKED", 0, 0);
                insertAudit(connection, actor, "player_vessel_docked", vesselId, "{}");
                connection.commit();
                return docked;
            } catch (SQLException | RuntimeException exception) {
                try { connection.rollback(); } catch (SQLException rollback) { exception.addSuppressed(rollback); }
                throw exception;
            } finally { connection.setAutoCommit(original); }
        }
    }

    public static PlayerState load(WorldPaths paths, UUID vesselId) throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        Objects.requireNonNull(vesselId, "vesselId");
        requireDriver();
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configureReadOnly(connection);
            verifySchema(connection);
            return requireState(connection, vesselId);
        }
    }

    private static PlayerState requireState(Connection connection, UUID vesselId) throws SQLException {
        String sql = "SELECT p.vessel_id,p.world_id,v.display_name,p.current_location_id,cl.display_name current_name,"
                + "p.destination_location_id,dl.display_name destination_name,p.status,p.hull,p.supplies,p.cargo,"
                + "p.crew_quality,p.navigation,p.engineering,p.combat,p.route_progress,p.route_ticks_required,"
                + "p.route_action_sequence,p.mission_type,p.last_tick FROM player_vessel_state p "
                + "JOIN vessel_instance v ON v.vessel_id=p.vessel_id "
                + "JOIN world_location cl ON cl.location_id=p.current_location_id "
                + "LEFT JOIN world_location dl ON dl.location_id=p.destination_location_id WHERE p.vessel_id=?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, vesselId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Imported vessel is not enrolled for player transit.");
                return new PlayerState(UUID.fromString(result.getString("vessel_id")),
                        UUID.fromString(result.getString("world_id")), result.getString("display_name"),
                        UUID.fromString(result.getString("current_location_id")), result.getString("current_name"),
                        uuid(result.getString("destination_location_id")), result.getString("destination_name"),
                        result.getString("status"), result.getInt("hull"), result.getInt("supplies"),
                        result.getInt("cargo"), result.getInt("crew_quality"), result.getInt("navigation"),
                        result.getInt("engineering"), result.getInt("combat"), result.getInt("route_progress"),
                        result.getInt("route_ticks_required"), result.getLong("route_action_sequence"),
                        result.getString("mission_type"), result.getLong("last_tick"));
            }
        }
    }

    private static VesselDefinition requireVessel(Connection connection, UUID worldId, UUID vesselId)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT d.submarine_class,d.tier FROM vessel_instance v JOIN submarine_definition d "
                        + "ON d.definition_id=v.definition_id WHERE v.vessel_id=? AND v.world_id=? AND v.retired_at IS NULL")) {
            statement.setString(1, vesselId.toString());
            statement.setString(2, worldId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Player transit requires an active imported physical vessel.");
                Object tier = result.getObject("tier");
                return new VesselDefinition(result.getString("submarine_class"), tier == null ? null : result.getInt("tier"));
            }
        }
    }

    private static void requireLocation(Connection connection, UUID worldId, UUID locationId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT 1 FROM world_location WHERE world_id=? AND location_id=?")) {
            statement.setString(1, worldId.toString());
            statement.setString(2, locationId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Player route references a location outside this world.");
            }
        }
    }

    private static WorldClock readWorldClock(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(
                "SELECT wm.world_id,sm.canonical_time,COALESCE(sm.current_tick_sequence,sm.imported_tick_sequence) tick "
                        + "FROM world_metadata wm JOIN world_simulation_metadata sm ON sm.world_id=wm.world_id LIMIT 1")) {
            if (!result.next()) throw new SQLException("Player transit requires an imported normalized master world.");
            return new WorldClock(UUID.fromString(result.getString("world_id")),
                    Instant.parse(result.getString("canonical_time")), result.getLong("tick"));
        }
    }

    private static int routeTicks(Connection connection, UUID from, UUID to) throws SQLException {
        int[] a = coordinates(connection, from);
        int[] b = coordinates(connection, to);
        return NpcTransitScheduleEngine.playerEquivalentChallengeCount(a[0], a[1], b[0], b[1]);
    }

    private static int locationLevel(Connection connection, UUID location) throws SQLException {
        return coordinates(connection, location)[1];
    }

    private static int[] coordinates(Connection connection, UUID location) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT ring,location_level FROM world_location WHERE location_id=?")) {
            statement.setString(1, location.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Player route references an unknown location.");
                return new int[]{result.getInt(1), result.getInt(2)};
            }
        }
    }

    private static int destinationThreat(Connection connection, UUID location) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COALESCE(s.threat,15) FROM world_location l LEFT JOIN world_station ws ON ws.location_id=l.location_id "
                        + "LEFT JOIN station_simulation_state s ON s.station_id=ws.station_id WHERE l.location_id=?")) {
            statement.setString(1, location.toString());
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? result.getInt(1) : 15;
            }
        }
    }

    private static void insertLog(Connection connection, PlayerState state, WorldClock world, long actionSequence,
                                  String eventType, int severity, String summary, String details, String resolution,
                                  int hullDelta, int suppliesDelta) throws SQLException {
        UUID id = deterministicId(world.worldId() + ":player-log:" + state.vesselId() + ":"
                + world.tickSequence() + ":" + actionSequence + ":" + eventType);
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT OR IGNORE INTO player_voyage_log(log_id,world_id,vessel_id,tick_sequence,action_sequence,"
                        + "canonical_time,event_type,severity,summary,details,resolution,hull_delta,supplies_delta) "
                        + "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")) {
            statement.setString(1, id.toString());
            statement.setString(2, world.worldId().toString());
            statement.setString(3, state.vesselId().toString());
            statement.setLong(4, world.tickSequence());
            statement.setLong(5, actionSequence);
            statement.setString(6, world.canonicalTime().toString());
            statement.setString(7, eventType);
            statement.setInt(8, clamp(severity, 0, 100));
            statement.setString(9, summary);
            statement.setString(10, details);
            statement.setString(11, resolution);
            statement.setInt(12, hullDelta);
            statement.setInt(13, suppliesDelta);
            statement.executeUpdate();
        }
    }

    private static void insertAudit(Connection connection, String actor, String action, UUID vesselId,
                                    String details) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO audit_entry(occurred_at,actor,action,entity_type,entity_id,details_json) "
                        + "VALUES (?,?,?,?,?,?)")) {
            statement.setString(1, Instant.now().toString());
            statement.setString(2, actor == null || actor.isBlank() ? "desktop-user" : actor.trim());
            statement.setString(3, action);
            statement.setString(4, "vessel_instance");
            statement.setString(5, vesselId.toString());
            statement.setString(6, details);
            statement.executeUpdate();
        }
    }

    private static int classBonus(String submarineClass, String expected) {
        return submarineClass != null && submarineClass.toLowerCase().contains(expected) ? 12 : 0;
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

    private static UUID deterministicId(String key) {
        return UUID.nameUUIDFromBytes(key.getBytes(StandardCharsets.UTF_8));
    }

    private static UUID uuid(String value) {
        return value == null || value.isBlank() ? null : UUID.fromString(value);
    }

    private static int clamp(int value, int minimum, int maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    private static void configure(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("PRAGMA busy_timeout=5000");
            statement.execute("PRAGMA journal_mode=WAL");
            statement.execute("PRAGMA synchronous=FULL");
        }
    }

    private static void configureReadOnly(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA query_only=ON");
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("PRAGMA busy_timeout=5000");
        }
    }

    private static void verifySchema(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COALESCE(MAX(version),0) FROM schema_migration")) {
            int version = result.next() ? result.getInt(1) : 0;
            if (version != WorldStorageContracts.DATABASE_SCHEMA_VERSION) {
                throw new SQLException("Player transit requires database schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "; found " + version + ".");
            }
        }
    }

    private static void requireDriver() throws SQLException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) { throw new SQLException("SQLite JDBC driver is unavailable.", exception); }
    }

    private record WorldClock(UUID worldId, Instant canonicalTime, long tickSequence) { }
    private record VesselDefinition(String submarineClass, Integer tier) { }

    public record PlayerState(UUID vesselId, UUID worldId, String displayName,
                              UUID currentLocationId, String currentLocationName,
                              UUID destinationLocationId, String destinationLocationName,
                              String status, int hull, int supplies, int cargo,
                              int crewQuality, int navigation, int engineering, int combat,
                              int routeProgress, int routeTicksRequired, long routeActionSequence,
                              String missionType, long lastTick) { }

    public record TransitResult(UUID encounterId, PlayerState state, Resolution resolution, boolean arrived) { }
}
