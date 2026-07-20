package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.io.IOException;
import java.nio.file.Files;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** Read-only causal history used by station timelines and “Why did this change?” views. */
public final class StationHistoryRegistry {
    private StationHistoryRegistry() { }

    public static Snapshot load(WorldPaths paths, UUID stationId, int limit) throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        Objects.requireNonNull(stationId, "stationId");
        if (limit < 1 || limit > 5_000) throw new IllegalArgumentException("History limit must be between 1 and 5000.");
        if (!Files.isRegularFile(paths.database())) throw new IOException("Desktop world database is missing.");
        requireDriver();
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            verifySchema(connection);
            String stationName = stationName(connection, stationId);
            return new Snapshot(stationId, stationName, events(connection, stationId, limit),
                    changes(connection, stationId, limit * 8), population(connection, stationId, limit),
                    factionPlans(connection, stationId, limit));
        }
    }

    private static String stationName(Connection connection, UUID stationId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT display_name FROM world_station WHERE station_id=?")) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Station was not found: " + stationId);
                return result.getString(1);
            }
        }
    }

    private static List<EventRow> events(Connection connection, UUID stationId, int limit) throws SQLException {
        List<EventRow> rows = new ArrayList<>();
        String sql = "SELECT e.event_id,e.tick_sequence,e.canonical_time,e.event_type,e.severity,e.headline,e.narrative,"
                + "e.actor_type,e.actor_id,e.cause_type,e.cause_id,e.visibility,e.correlation_id,"
                + "s.command_id,r.execution_sequence command_sequence,r.command command_label,r.actor command_actor "
                + "FROM station_event e LEFT JOIN station_event_command_source s ON s.event_id=e.event_id "
                + "LEFT JOIN simulation_command_receipt r ON r.command_id=s.command_id "
                + "WHERE e.station_id=? ORDER BY e.tick_sequence DESC,e.severity DESC,e.event_id LIMIT ?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            statement.setInt(2, limit);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) rows.add(new EventRow(result.getString("event_id"),
                        result.getLong("tick_sequence"), result.getString("canonical_time"),
                        result.getString("event_type"), result.getInt("severity"),
                        result.getString("headline"), result.getString("narrative"),
                        result.getString("actor_type"), result.getString("actor_id"),
                        result.getString("cause_type"), result.getString("cause_id"),
                        result.getString("visibility"), result.getString("correlation_id"),
                        result.getString("command_id"), nullableLong(result, "command_sequence"),
                        result.getString("command_label"), result.getString("command_actor")));
            }
        }
        return List.copyOf(rows);
    }

    private static List<ChangeRow> changes(Connection connection, UUID stationId, int limit) throws SQLException {
        List<ChangeRow> rows = new ArrayList<>();
        String sql = "SELECT c.change_id,c.event_id,e.tick_sequence,c.statistic_key,c.value_type,c.previous_value,"
                + "c.delta_value,c.resulting_value,c.unit,c.reason_code,c.affected_type,c.affected_id "
                + "FROM station_change c JOIN station_event e ON e.event_id=c.event_id "
                + "WHERE e.station_id=? ORDER BY e.tick_sequence DESC,c.change_id LIMIT ?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            statement.setInt(2, limit);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) rows.add(new ChangeRow(result.getString("change_id"),
                        result.getString("event_id"), result.getLong("tick_sequence"),
                        result.getString("statistic_key"), result.getString("value_type"),
                        result.getDouble("previous_value"), result.getDouble("delta_value"),
                        result.getDouble("resulting_value"), result.getString("unit"),
                        result.getString("reason_code"), result.getString("affected_type"),
                        result.getString("affected_id")));
            }
        }
        return List.copyOf(rows);
    }

    private static List<PopulationRow> population(Connection connection, UUID stationId, int limit) throws SQLException {
        List<PopulationRow> rows = new ArrayList<>();
        String sql = "SELECT p.population_event_id,p.event_id,e.tick_sequence,p.population_category,"
                + "p.people_before,p.people_delta,p.people_after,p.workforce_delta "
                + "FROM station_population_event p JOIN station_event e ON e.event_id=p.event_id "
                + "WHERE e.station_id=? ORDER BY e.tick_sequence DESC,p.population_event_id LIMIT ?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            statement.setInt(2, limit);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) rows.add(new PopulationRow(result.getString("population_event_id"),
                        result.getString("event_id"), result.getLong("tick_sequence"),
                        result.getString("population_category"), result.getInt("people_before"),
                        result.getInt("people_delta"), result.getInt("people_after"),
                        result.getInt("workforce_delta")));
            }
        }
        return List.copyOf(rows);
    }

    private static List<FactionPlanRow> factionPlans(Connection connection, UUID stationId, int limit) throws SQLException {
        List<FactionPlanRow> rows = new ArrayList<>();
        String sql = "SELECT plan_id,sponsor_faction,target_faction,objective,phase,status,created_tick,updated_tick,"
                + "due_tick,credits_required,credits_reserved,credits_spent,personnel_required,personnel_reserved,"
                + "equipment_required,equipment_reserved,backing_status,outstanding_credits,outstanding_personnel,"
                + "outstanding_equipment FROM faction_plan_resource_balance WHERE target_station_id=? "
                + "ORDER BY updated_tick DESC,plan_id LIMIT ?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            statement.setInt(2, limit);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) rows.add(new FactionPlanRow(result.getString("plan_id"),
                        result.getString("sponsor_faction"), result.getString("target_faction"),
                        result.getString("objective"), result.getString("phase"), result.getString("status"),
                        result.getLong("created_tick"), result.getLong("updated_tick"),
                        nullableLong(result, "due_tick"), result.getInt("credits_required"),
                        result.getInt("credits_reserved"), result.getInt("credits_spent"),
                        result.getInt("personnel_required"), result.getInt("personnel_reserved"),
                        result.getInt("equipment_required"), result.getInt("equipment_reserved"),
                        result.getString("backing_status"), result.getInt("outstanding_credits"),
                        result.getInt("outstanding_personnel"), result.getInt("outstanding_equipment")));
            }
        }
        return List.copyOf(rows);
    }

    private static Long nullableLong(ResultSet result, String column) throws SQLException {
        long value = result.getLong(column);
        return result.wasNull() ? null : value;
    }

    private static void configure(Connection connection) throws SQLException {
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
                throw new SQLException("Station history requires database schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "; found " + version + ".");
            }
        }
    }

    private static void requireDriver() throws SQLException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) { throw new SQLException("SQLite JDBC driver is unavailable.", exception); }
    }

    public record Snapshot(UUID stationId, String stationName, List<EventRow> events,
                           List<ChangeRow> changes, List<PopulationRow> populationEvents,
                           List<FactionPlanRow> factionPlans) {
        public Snapshot {
            Objects.requireNonNull(stationId, "stationId");
            Objects.requireNonNull(stationName, "stationName");
            events = List.copyOf(events);
            changes = List.copyOf(changes);
            populationEvents = List.copyOf(populationEvents);
            factionPlans = List.copyOf(factionPlans);
        }
    }

    public record EventRow(String eventId, long tickSequence, String canonicalTime, String eventType,
                           int severity, String headline, String narrative, String actorType,
                           String actorId, String causeType, String causeId, String visibility,
                           String correlationId, String commandId, Long commandSequence,
                           String commandLabel, String commandActor) { }

    public record ChangeRow(String changeId, String eventId, long tickSequence, String statisticKey,
                            String valueType, double previousValue, double deltaValue,
                            double resultingValue, String unit, String reasonCode,
                            String affectedType, String affectedId) { }

    public record PopulationRow(String populationEventId, String eventId, long tickSequence,
                                String category, int peopleBefore, int peopleDelta,
                                int peopleAfter, int workforceDelta) { }

    public record FactionPlanRow(String planId, String sponsorFaction, String targetFaction,
                                 String objective, String phase, String status, long createdTick,
                                 long updatedTick, Long dueTick, int creditsRequired,
                                 int creditsReserved, int creditsSpent, int personnelRequired,
                                 int personnelReserved, int equipmentRequired, int equipmentReserved,
                                 String backingStatus, int outstandingCredits,
                                 int outstandingPersonnel, int outstandingEquipment) { }

}
