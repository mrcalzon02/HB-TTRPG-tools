package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.nio.file.Files;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** Read-only query model for passive station, mission, fleet, logistics, voyage, research, and encounter state. */
public final class PassiveWorldRegistry {
    private PassiveWorldRegistry() { }

    public static Snapshot load(WorldPaths paths) throws SQLException {
        Objects.requireNonNull(paths, "paths");
        if (!Files.isRegularFile(paths.database())) {
            throw new SQLException("The selected desktop world has not initialized its database.");
        }
        requireDriver();
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configureReadOnly(connection);
            verifySchema(connection);
            return new Snapshot(readConfiguration(connection), readStations(connection), readVessels(connection),
                    readMissions(connection), readLogs(connection), readEncounters(connection),
                    readResearch(connection), readFleetResponses(connection), readFleetResponseLogs(connection),
                    readFleetTransitLegs(connection), readFreight(connection), readTreasury(connection));
        }
    }

    private static Configuration readConfiguration(Connection connection) throws SQLException {
        String sql = "SELECT c.enabled,c.cadence_seconds,c.ticks_per_cycle,c.last_cycle_at,c.last_cycle_tick,"
                + "sm.canonical_time,COALESCE(sm.current_tick_sequence,sm.imported_tick_sequence) tick_sequence "
                + "FROM world_metadata wm LEFT JOIN passive_simulation_config c ON c.world_id=wm.world_id "
                + "LEFT JOIN world_simulation_metadata sm ON sm.world_id=wm.world_id LIMIT 1";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("Desktop world metadata is missing.");
            boolean configured = result.getObject("cadence_seconds") != null;
            return new Configuration(configured, configured && result.getInt("enabled") == 1,
                    configured ? result.getInt("cadence_seconds") : 5,
                    configured ? result.getInt("ticks_per_cycle") : 1,
                    instant(result.getString("last_cycle_at")), nullableLong(result, "last_cycle_tick"),
                    instant(result.getString("canonical_time")), nullableLong(result, "tick_sequence"));
        }
    }

    private static List<StationRow> readStations(Connection connection) throws SQLException {
        List<StationRow> rows = new ArrayList<>();
        String sql = "SELECT s.station_id,ws.display_name,ws.faction,wl.ring,wl.location_level,s.credits,"
                + "s.supplies,s.ore,s.industry,s.security,s.integrity,s.threat,s.research,s.status,s.last_tick "
                + "FROM station_simulation_state s JOIN world_station ws ON ws.station_id=s.station_id "
                + "JOIN world_location wl ON wl.location_id=ws.location_id "
                + "ORDER BY CASE s.status WHEN 'FALLEN' THEN 0 WHEN 'BESIEGED' THEN 1 WHEN 'STRAINED' THEN 2 "
                + "WHEN 'STABLE' THEN 3 ELSE 4 END,s.threat DESC,ws.display_name";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new StationRow(UUID.fromString(result.getString("station_id")),
                    result.getString("display_name"), result.getString("faction"), result.getInt("ring"),
                    result.getInt("location_level"), result.getInt("credits"), result.getInt("supplies"),
                    result.getInt("ore"), result.getInt("industry"), result.getInt("security"),
                    result.getInt("integrity"), result.getInt("threat"), result.getInt("research"),
                    result.getString("status"), result.getLong("last_tick")));
        }
        return List.copyOf(rows);
    }

    private static List<VesselRow> readVessels(Connection connection) throws SQLException {
        List<VesselRow> rows = new ArrayList<>();
        String sql = "SELECT v.npc_vessel_id,v.display_name,v.role,v.status,v.hull,v.supplies,v.cargo,"
                + "v.crew_quality,v.navigation,v.engineering,v.combat,v.mining,v.research,"
                + "COALESCE(t.route_progress,v.route_progress) route_progress,"
                + "COALESCE(t.route_ticks_required,v.route_ticks_required) route_ticks_required,"
                + "v.last_tick,cl.display_name current_name,dl.display_name destination_name,"
                + "m.mission_id,m.mission_type,m.status mission_status,m.progress mission_progress,"
                + "t.base_arrival_tick,t.scheduled_arrival_tick,t.player_equivalent_incident_count,"
                + "t.incidents_resolved,t.next_incident_tick,t.cumulative_delay_ticks "
                + "FROM npc_vessel v JOIN world_location cl ON cl.location_id=v.current_location_id "
                + "LEFT JOIN world_location dl ON dl.location_id=v.destination_location_id "
                + "LEFT JOIN world_mission m ON m.mission_id=v.mission_id "
                + "LEFT JOIN npc_observable_transit t ON t.npc_vessel_id=v.npc_vessel_id "
                + "ORDER BY CASE v.status WHEN 'LOST' THEN 0 WHEN 'DISABLED' THEN 1 WHEN 'IN_TRANSIT' THEN 2 "
                + "WHEN 'RETURNING' THEN 3 WHEN 'WORKING' THEN 4 ELSE 5 END,v.display_name";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new VesselRow(UUID.fromString(result.getString("npc_vessel_id")),
                    result.getString("display_name"), result.getString("role"), result.getString("status"),
                    result.getInt("hull"), result.getInt("supplies"), result.getInt("cargo"),
                    result.getInt("crew_quality"), result.getInt("navigation"), result.getInt("engineering"),
                    result.getInt("combat"), result.getInt("mining"), result.getInt("research"),
                    result.getInt("route_progress"), result.getInt("route_ticks_required"),
                    result.getLong("last_tick"), result.getString("current_name"),
                    result.getString("destination_name"), uuid(result.getString("mission_id")),
                    result.getString("mission_type"), result.getString("mission_status"),
                    nullableInteger(result, "mission_progress"), nullableLong(result, "base_arrival_tick"),
                    nullableLong(result, "scheduled_arrival_tick"),
                    nullableInteger(result, "player_equivalent_incident_count"),
                    nullableInteger(result, "incidents_resolved"), nullableLong(result, "next_incident_tick"),
                    nullableInteger(result, "cumulative_delay_ticks")));
        }
        return List.copyOf(rows);
    }

    private static List<MissionRow> readMissions(Connection connection) throws SQLException {
        List<MissionRow> rows = new ArrayList<>();
        String sql = "SELECT m.mission_id,m.mission_type,m.status,os.display_name origin_name,"
                + "tl.display_name target_name,v.display_name vessel_name,m.difficulty,m.reward_credits,"
                + "m.cargo_units,m.progress,m.created_tick,m.updated_tick,m.completed_tick "
                + "FROM world_mission m LEFT JOIN world_station os ON os.station_id=m.origin_station_id "
                + "JOIN world_location tl ON tl.location_id=m.target_location_id "
                + "LEFT JOIN npc_vessel v ON v.npc_vessel_id=m.assigned_npc_vessel_id "
                + "ORDER BY CASE m.status WHEN 'ACTIVE' THEN 0 WHEN 'ASSIGNED' THEN 1 WHEN 'AVAILABLE' THEN 2 "
                + "ELSE 3 END,m.updated_tick DESC";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new MissionRow(UUID.fromString(result.getString("mission_id")),
                    result.getString("mission_type"), result.getString("status"),
                    result.getString("origin_name"), result.getString("target_name"),
                    result.getString("vessel_name"), result.getInt("difficulty"),
                    result.getInt("reward_credits"), result.getInt("cargo_units"),
                    result.getInt("progress"), result.getLong("created_tick"),
                    result.getLong("updated_tick"), nullableLong(result, "completed_tick")));
        }
        return List.copyOf(rows);
    }

    private static List<VoyageLogRow> readLogs(Connection connection) throws SQLException {
        List<VoyageLogRow> rows = new ArrayList<>();
        String sql = "SELECT l.log_id,l.npc_vessel_id,v.display_name vessel_name,l.mission_id,l.tick_sequence,"
                + "l.canonical_time,l.event_type,l.severity,l.summary,l.details,l.resolution,l.hull_delta,"
                + "l.supplies_delta,l.station_delta FROM npc_voyage_log l "
                + "JOIN npc_vessel v ON v.npc_vessel_id=l.npc_vessel_id "
                + "ORDER BY l.tick_sequence DESC,l.canonical_time DESC LIMIT 1000";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new VoyageLogRow(UUID.fromString(result.getString("log_id")),
                    UUID.fromString(result.getString("npc_vessel_id")), result.getString("vessel_name"),
                    uuid(result.getString("mission_id")), result.getLong("tick_sequence"),
                    Instant.parse(result.getString("canonical_time")), result.getString("event_type"),
                    result.getInt("severity"), result.getString("summary"), result.getString("details"),
                    result.getString("resolution"), result.getInt("hull_delta"),
                    result.getInt("supplies_delta"), result.getInt("station_delta")));
        }
        return List.copyOf(rows);
    }

    private static List<EncounterRow> readEncounters(Connection connection) throws SQLException {
        List<EncounterRow> rows = new ArrayList<>();
        String sql = "SELECT e.encounter_id,e.npc_vessel_id,v.display_name,e.tick_sequence,e.canonical_time,"
                + "e.hazard_type,e.challenge,e.resolution_roll,e.margin,e.outcome,e.narrative "
                + "FROM world_encounter e JOIN npc_vessel v ON v.npc_vessel_id=e.npc_vessel_id "
                + "ORDER BY e.tick_sequence DESC LIMIT 500";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new EncounterRow(UUID.fromString(result.getString("encounter_id")),
                    UUID.fromString(result.getString("npc_vessel_id")), result.getString("display_name"),
                    result.getLong("tick_sequence"), Instant.parse(result.getString("canonical_time")),
                    result.getString("hazard_type"), result.getInt("challenge"),
                    result.getInt("resolution_roll"), result.getInt("margin"), result.getString("outcome"),
                    result.getString("narrative")));
        }
        return List.copyOf(rows);
    }

    private static List<ResearchRow> readResearch(Connection connection) throws SQLException {
        List<ResearchRow> rows = new ArrayList<>();
        String sql = "SELECT p.project_id,ws.display_name,p.topic,p.status,p.progress,p.target,p.created_tick,"
                + "p.updated_tick,p.completed_tick FROM station_research_project p "
                + "JOIN world_station ws ON ws.station_id=p.station_id ORDER BY p.status,p.updated_tick DESC";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new ResearchRow(result.getString("project_id"),
                    result.getString("display_name"), result.getString("topic"), result.getString("status"),
                    result.getInt("progress"), result.getInt("target"), result.getLong("created_tick"),
                    result.getLong("updated_tick"), nullableLong(result, "completed_tick")));
        }
        return List.copyOf(rows);
    }

    private static List<FleetResponseRow> readFleetResponses(Connection connection) throws SQLException {
        List<FleetResponseRow> rows = new ArrayList<>();
        String sql = "SELECT o.operation_id,o.operation_type,o.status,o.response_phase,o.progress,o.difficulty,"
                + "o.distressed_npc_vessel_id,dv.display_name distressed_name,o.assigned_npc_vessel_id,"
                + "rv.display_name responder_name,o.origin_station_id,os.display_name origin_name,"
                + "o.target_station_id,ts.display_name target_station_name,o.target_location_id,"
                + "tl.display_name target_location_name,o.responder_origin_location_id,rol.display_name responder_origin_name,"
                + "o.spare_parts_required,o.fuel_required,o.ammunition_required,o.medical_required,"
                + "o.attempt_number,o.materials_committed,o.created_tick,o.updated_tick,o.completed_tick,"
                + "o.outbound_started_tick,o.arrived_tick,o.return_started_tick,o.responder_returned_tick "
                + "FROM fleet_response_operation o "
                + "LEFT JOIN npc_vessel dv ON dv.npc_vessel_id=o.distressed_npc_vessel_id "
                + "LEFT JOIN npc_vessel rv ON rv.npc_vessel_id=o.assigned_npc_vessel_id "
                + "LEFT JOIN world_station os ON os.station_id=o.origin_station_id "
                + "LEFT JOIN world_station ts ON ts.station_id=o.target_station_id "
                + "LEFT JOIN world_location tl ON tl.location_id=o.target_location_id "
                + "LEFT JOIN world_location rol ON rol.location_id=o.responder_origin_location_id "
                + "ORDER BY CASE o.status WHEN 'ACTIVE' THEN 0 WHEN 'AVAILABLE' THEN 1 ELSE 2 END,o.updated_tick DESC LIMIT 500";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new FleetResponseRow(
                    result.getString("operation_id"), result.getString("operation_type"), result.getString("status"),
                    result.getString("response_phase"), result.getInt("progress"), result.getInt("difficulty"),
                    result.getString("distressed_npc_vessel_id"), result.getString("distressed_name"),
                    result.getString("assigned_npc_vessel_id"), result.getString("responder_name"),
                    result.getString("origin_station_id"), result.getString("origin_name"),
                    result.getString("target_station_id"), result.getString("target_station_name"),
                    result.getString("target_location_id"), result.getString("target_location_name"),
                    result.getString("responder_origin_location_id"), result.getString("responder_origin_name"),
                    result.getInt("spare_parts_required"), result.getInt("fuel_required"),
                    result.getInt("ammunition_required"), result.getInt("medical_required"),
                    result.getInt("attempt_number"), result.getInt("materials_committed") == 1,
                    result.getLong("created_tick"), result.getLong("updated_tick"),
                    nullableLong(result, "completed_tick"), nullableLong(result, "outbound_started_tick"),
                    nullableLong(result, "arrived_tick"), nullableLong(result, "return_started_tick"),
                    nullableLong(result, "responder_returned_tick")));
        }
        return List.copyOf(rows);
    }

    private static List<FleetResponseLogRow> readFleetResponseLogs(Connection connection) throws SQLException {
        List<FleetResponseLogRow> rows = new ArrayList<>();
        String sql = "SELECT log_id,operation_id,tick_sequence,event_type,summary FROM fleet_response_log "
                + "ORDER BY tick_sequence DESC LIMIT 1000";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new FleetResponseLogRow(result.getString("log_id"),
                    result.getString("operation_id"), result.getLong("tick_sequence"),
                    result.getString("event_type"), result.getString("summary")));
        }
        return List.copyOf(rows);
    }

    private static List<FleetTransitLegRow> readFleetTransitLegs(Connection connection) throws SQLException {
        List<FleetTransitLegRow> rows = new ArrayList<>();
        String sql = "SELECT l.leg_id,l.operation_id,l.responder_npc_vessel_id,v.display_name responder_name,"
                + "l.attempt_number,l.leg_type,l.status,sl.display_name start_name,el.display_name end_name,"
                + "l.route_ticks_required,l.started_tick,l.arrived_tick,l.completed_tick "
                + "FROM fleet_response_transit_leg l "
                + "JOIN npc_vessel v ON v.npc_vessel_id=l.responder_npc_vessel_id "
                + "JOIN world_location sl ON sl.location_id=l.start_location_id "
                + "JOIN world_location el ON el.location_id=l.end_location_id "
                + "ORDER BY l.started_tick DESC LIMIT 1000";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new FleetTransitLegRow(result.getString("leg_id"),
                    result.getString("operation_id"), result.getString("responder_npc_vessel_id"),
                    result.getString("responder_name"), result.getInt("attempt_number"),
                    result.getString("leg_type"), result.getString("status"), result.getString("start_name"),
                    result.getString("end_name"), result.getInt("route_ticks_required"),
                    result.getLong("started_tick"), nullableLong(result, "arrived_tick"),
                    nullableLong(result, "completed_tick")));
        }
        return List.copyOf(rows);
    }

    private static List<FreightRow> readFreight(Connection connection) throws SQLException {
        List<FreightRow> rows = new ArrayList<>();
        String sql = "SELECT f.lot_id,f.mission_id,ss.display_name source_name,ds.display_name destination_name,"
                + "i.display_name item_name,i.category item_category,f.quantity,f.status,f.assigned_npc_vessel_id,"
                + "v.display_name vessel_name,f.created_tick,f.updated_tick,f.delivered_tick "
                + "FROM freight_lot f JOIN item_catalogue i ON i.item_id=f.item_id "
                + "LEFT JOIN world_station ss ON ss.station_id=f.source_station_id "
                + "LEFT JOIN world_station ds ON ds.station_id=f.destination_station_id "
                + "LEFT JOIN npc_vessel v ON v.npc_vessel_id=f.assigned_npc_vessel_id "
                + "ORDER BY CASE f.status WHEN 'IN_TRANSIT' THEN 0 WHEN 'LOADED' THEN 1 WHEN 'READY' THEN 2 ELSE 3 END,"
                + "f.updated_tick DESC LIMIT 1000";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new FreightRow(result.getString("lot_id"),
                    result.getString("mission_id"), result.getString("source_name"),
                    result.getString("destination_name"), result.getString("item_name"),
                    result.getString("item_category"), result.getInt("quantity"), result.getString("status"),
                    result.getString("assigned_npc_vessel_id"), result.getString("vessel_name"),
                    result.getLong("created_tick"), result.getLong("updated_tick"),
                    nullableLong(result, "delivered_tick")));
        }
        return List.copyOf(rows);
    }

    private static List<TreasuryRow> readTreasury(Connection connection) throws SQLException {
        List<TreasuryRow> rows = new ArrayList<>();
        String sql = "SELECT t.transaction_id,ws.display_name station_name,t.tick_sequence,t.category,"
                + "t.credits_delta,t.counterparty_type,t.counterparty_id,t.memo "
                + "FROM treasury_transaction t LEFT JOIN world_station ws ON ws.station_id=t.station_id "
                + "ORDER BY t.tick_sequence DESC,t.transaction_id DESC LIMIT 1000";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new TreasuryRow(result.getString("transaction_id"),
                    result.getString("station_name"), result.getLong("tick_sequence"),
                    result.getString("category"), result.getInt("credits_delta"),
                    result.getString("counterparty_type"), result.getString("counterparty_id"),
                    result.getString("memo")));
        }
        return List.copyOf(rows);
    }

    private static void configureReadOnly(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("PRAGMA busy_timeout=5000");
            statement.execute("PRAGMA query_only=ON");
        }
    }

    private static void verifySchema(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COALESCE(MAX(version),0) FROM schema_migration")) {
            int version = result.next() ? result.getInt(1) : 0;
            if (version != WorldStorageContracts.DATABASE_SCHEMA_VERSION) {
                throw new SQLException("Passive registry requires schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "; found " + version + ".");
            }
        }
    }

    private static Integer nullableInteger(ResultSet result, String column) throws SQLException {
        return result.getObject(column) == null ? null : result.getInt(column);
    }

    private static Long nullableLong(ResultSet result, String column) throws SQLException {
        return result.getObject(column) == null ? null : result.getLong(column);
    }

    private static Instant instant(String value) {
        return value == null || value.isBlank() ? null : Instant.parse(value);
    }

    private static UUID uuid(String value) {
        return value == null || value.isBlank() ? null : UUID.fromString(value);
    }

    private static void requireDriver() throws SQLException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) { throw new SQLException("SQLite JDBC driver is unavailable.", exception); }
    }

    public record Snapshot(Configuration configuration, List<StationRow> stations, List<VesselRow> vessels,
                           List<MissionRow> missions, List<VoyageLogRow> voyageLogs,
                           List<EncounterRow> encounters, List<ResearchRow> research,
                           List<FleetResponseRow> fleetResponses, List<FleetResponseLogRow> fleetResponseLogs,
                           List<FleetTransitLegRow> fleetTransitLegs, List<FreightRow> freight,
                           List<TreasuryRow> treasury) {
        public Snapshot {
            Objects.requireNonNull(configuration, "configuration");
            stations = List.copyOf(stations);
            vessels = List.copyOf(vessels);
            missions = List.copyOf(missions);
            voyageLogs = List.copyOf(voyageLogs);
            encounters = List.copyOf(encounters);
            research = List.copyOf(research);
            fleetResponses = List.copyOf(fleetResponses);
            fleetResponseLogs = List.copyOf(fleetResponseLogs);
            fleetTransitLegs = List.copyOf(fleetTransitLegs);
            freight = List.copyOf(freight);
            treasury = List.copyOf(treasury);
        }
    }

    public record Configuration(boolean configured, boolean enabled, int cadenceSeconds, int ticksPerCycle,
                                Instant lastCycleAt, Long lastCycleTick, Instant canonicalTime,
                                Long currentTickSequence) { }
    public record StationRow(UUID stationId, String name, String faction, int ring, int level, int credits,
                             int supplies, int ore, int industry, int security, int integrity, int threat,
                             int research, String status, long lastTick) { }
    public record VesselRow(UUID vesselId, String name, String role, String status, int hull, int supplies,
                            int cargo, int crewQuality, int navigation, int engineering, int combat, int mining,
                            int research, int routeProgress, int routeTicksRequired, long lastTick,
                            String currentLocation, String destinationLocation, UUID missionId,
                            String missionType, String missionStatus, Integer missionProgress,
                            Long baseArrivalTick, Long scheduledArrivalTick, Integer plannedIncidents,
                            Integer incidentsResolved, Long nextIncidentTick, Integer cumulativeDelayTicks) { }
    public record MissionRow(UUID missionId, String type, String status, String origin, String target,
                             String vessel, int difficulty, int rewardCredits, int cargoUnits, int progress,
                             long createdTick, long updatedTick, Long completedTick) { }
    public record VoyageLogRow(UUID logId, UUID vesselId, String vesselName, UUID missionId, long tickSequence,
                               Instant canonicalTime, String eventType, int severity, String summary,
                               String details, String resolution, int hullDelta, int suppliesDelta,
                               int stationDelta) { }
    public record EncounterRow(UUID encounterId, UUID vesselId, String vesselName, long tickSequence,
                               Instant canonicalTime, String hazardType, int challenge, int roll, int margin,
                               String outcome, String narrative) { }
    public record ResearchRow(String projectId, String stationName, String topic, String status, int progress,
                              int target, long createdTick, long updatedTick, Long completedTick) { }
    public record FleetResponseRow(String operationId, String type, String status, String phase, int progress,
                                   int difficulty, String distressedVesselId, String distressedVesselName,
                                   String responderVesselId, String responderVesselName, String originStationId,
                                   String originStationName, String targetStationId, String targetStationName,
                                   String targetLocationId, String targetLocationName,
                                   String responderOriginLocationId, String responderOriginLocationName,
                                   int sparePartsRequired, int fuelRequired, int ammunitionRequired,
                                   int medicalRequired, int attemptNumber, boolean materialsCommitted,
                                   long createdTick, long updatedTick, Long completedTick,
                                   Long outboundStartedTick, Long arrivedTick, Long returnStartedTick,
                                   Long responderReturnedTick) { }
    public record FleetResponseLogRow(String logId, String operationId, long tickSequence,
                                      String eventType, String summary) { }
    public record FleetTransitLegRow(String legId, String operationId, String responderVesselId,
                                     String responderVesselName, int attemptNumber, String legType,
                                     String status, String startLocation, String endLocation,
                                     int routeTicksRequired, long startedTick, Long arrivedTick,
                                     Long completedTick) { }
    public record FreightRow(String lotId, String missionId, String sourceStation, String destinationStation,
                             String itemName, String itemCategory, int quantity, String status,
                             String npcVesselId, String npcVesselName, long createdTick, long updatedTick,
                             Long deliveredTick) { }
    public record TreasuryRow(String transactionId, String stationName, long tickSequence, String category,
                              int creditsDelta, String counterpartyType, String counterpartyId, String memo) { }
}
