package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Canonical fleet-response dispatch policy.
 *
 * <p>A responder that has just completed a physical return must remain observably docked for that completion
 * tick. Recursive trigger chains previously exposed two ways to consume that DOCKED state immediately: an
 * already-queued response could be accepted by the dock transition, or a new response request created later
 * in the same tick could immediately select the just-returned vessel. Both dispatch paths now apply the same
 * one-tick completion cooldown while preserving immediate assignment for all other eligible docked vessels.
 */
public final class FleetResponseDispatchPolicy {
    public static final String DOCKED_TRIGGER = "docked_vessel_accepts_response";
    public static final String REQUEST_TRIGGER = "response_request_immediate_assignment";
    private static final String DOCKED_MARKER = "responder_returned_tick=NEW.last_tick";
    private static final String REQUEST_MARKER = "responder_returned_tick=NEW.created_tick";

    private FleetResponseDispatchPolicy() { }

    public static String dropDockedStatement() {
        return "DROP TRIGGER IF EXISTS " + DOCKED_TRIGGER;
    }

    public static String dropRequestStatement() {
        return "DROP TRIGGER IF EXISTS " + REQUEST_TRIGGER;
    }

    public static String createDockedStatement() {
        return "CREATE TRIGGER " + DOCKED_TRIGGER + " AFTER UPDATE OF status ON npc_vessel "
                + "WHEN NEW.status='DOCKED' AND OLD.status<>'DOCKED' AND NEW.mission_id IS NULL "
                + "AND NEW.role IN ('SALVAGE','PATROL','COURIER') "
                + "AND NOT EXISTS (SELECT 1 FROM fleet_response_operation recent "
                + "WHERE recent.assigned_npc_vessel_id=NEW.npc_vessel_id "
                + "AND recent.status='COMPLETE' AND recent.response_phase='COMPLETE' "
                + "AND recent.responder_returned_tick=NEW.last_tick) BEGIN "
                + "UPDATE fleet_response_operation SET assigned_npc_vessel_id=NEW.npc_vessel_id,"
                + "status='ACTIVE',updated_tick=NEW.last_tick "
                + "WHERE operation_id=(SELECT operation_id FROM fleet_response_operation "
                + "WHERE world_id=NEW.world_id AND status='AVAILABLE' "
                + "AND distressed_npc_vessel_id<>NEW.npc_vessel_id "
                + "ORDER BY difficulty,created_tick LIMIT 1) "
                + "AND NOT EXISTS (SELECT 1 FROM fleet_response_operation busy "
                + "WHERE busy.assigned_npc_vessel_id=NEW.npc_vessel_id AND busy.status='ACTIVE'); END";
    }

    public static String createRequestStatement() {
        String eligible = "SELECT 1 FROM npc_vessel v WHERE v.world_id=NEW.world_id AND v.status='DOCKED' "
                + "AND v.mission_id IS NULL AND v.role IN ('SALVAGE','PATROL','COURIER') "
                + "AND v.npc_vessel_id<>COALESCE(NEW.distressed_npc_vessel_id,'') "
                + "AND NOT EXISTS (SELECT 1 FROM fleet_response_operation busy "
                + "WHERE busy.assigned_npc_vessel_id=v.npc_vessel_id AND busy.status='ACTIVE') "
                + "AND NOT EXISTS (SELECT 1 FROM fleet_response_operation recent "
                + "WHERE recent.assigned_npc_vessel_id=v.npc_vessel_id "
                + "AND recent.status='COMPLETE' AND recent.response_phase='COMPLETE' "
                + "AND recent.responder_returned_tick=NEW.created_tick)";
        String candidate = "SELECT v.npc_vessel_id FROM npc_vessel v WHERE v.world_id=NEW.world_id "
                + "AND v.status='DOCKED' AND v.mission_id IS NULL "
                + "AND v.role IN ('SALVAGE','PATROL','COURIER') "
                + "AND v.npc_vessel_id<>COALESCE(NEW.distressed_npc_vessel_id,'') "
                + "AND NOT EXISTS (SELECT 1 FROM fleet_response_operation busy "
                + "WHERE busy.assigned_npc_vessel_id=v.npc_vessel_id AND busy.status='ACTIVE') "
                + "AND NOT EXISTS (SELECT 1 FROM fleet_response_operation recent "
                + "WHERE recent.assigned_npc_vessel_id=v.npc_vessel_id "
                + "AND recent.status='COMPLETE' AND recent.response_phase='COMPLETE' "
                + "AND recent.responder_returned_tick=NEW.created_tick) "
                + "ORDER BY CASE v.role WHEN 'SALVAGE' THEN 0 WHEN 'PATROL' THEN 1 ELSE 2 END,"
                + "v.engineering DESC,v.npc_vessel_id LIMIT 1";
        return "CREATE TRIGGER " + REQUEST_TRIGGER + " AFTER INSERT ON fleet_response_operation "
                + "WHEN NEW.status='AVAILABLE' BEGIN UPDATE fleet_response_operation SET assigned_npc_vessel_id=("
                + candidate + "),status=CASE WHEN EXISTS (" + eligible + ") THEN 'ACTIVE' ELSE 'AVAILABLE' END "
                + "WHERE operation_id=NEW.operation_id; END";
    }

    /** Repairs current worlds without a schema-number bump. */
    public static void installIfSupported(Connection connection) throws SQLException {
        if (!hasTable(connection, "npc_vessel") || !hasTable(connection, "fleet_response_operation")
                || !hasColumn(connection, "fleet_response_operation", "responder_returned_tick")) {
            return;
        }
        String docked = normalizedTriggerSql(connection, DOCKED_TRIGGER);
        String request = normalizedTriggerSql(connection, REQUEST_TRIGGER);
        if (docked != null && request != null
                && docked.contains(DOCKED_MARKER) && request.contains(REQUEST_MARKER)) {
            return;
        }
        try (Statement statement = connection.createStatement()) {
            statement.execute(dropDockedStatement());
            statement.execute(dropRequestStatement());
            statement.execute(createDockedStatement());
            statement.execute(createRequestStatement());
        }
    }

    private static String normalizedTriggerSql(Connection connection, String triggerName) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT sql FROM sqlite_master WHERE type='trigger' AND name=?")) {
            statement.setString(1, triggerName);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) return null;
                String sql = result.getString(1);
                return sql == null ? null : sql.replaceAll("\\s+", "");
            }
        }
    }

    private static boolean hasTable(Connection connection, String tableName) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")) {
            statement.setString(1, tableName);
            try (ResultSet result = statement.executeQuery()) {
                return result.next();
            }
        }
    }

    private static boolean hasColumn(Connection connection, String tableName, String columnName) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("PRAGMA table_info(" + tableName + ")")) {
            while (result.next()) if (columnName.equals(result.getString("name"))) return true;
            return false;
        }
    }
}
