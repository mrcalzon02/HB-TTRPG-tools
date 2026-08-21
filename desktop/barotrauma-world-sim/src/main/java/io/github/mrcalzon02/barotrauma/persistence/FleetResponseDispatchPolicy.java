package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Canonical dispatch trigger for a vessel that has just become docked.
 *
 * <p>A fleet responder must be observably docked for at least the completion tick after returning home.
 * Recursive SQLite triggers previously allowed the older schema-011 dispatch trigger to immediately consume
 * the DOCKED transition produced by fleet_response_responder_returns_home, assigning another queued response
 * in the same trigger chain and leaving the vessel PREPARING instead of DOCKED. This policy preserves the
 * immediate-assignment behavior for ordinary docking while excluding a responder whose completed operation
 * records responder_returned_tick == NEW.last_tick.
 */
public final class FleetResponseDispatchPolicy {
    public static final String TRIGGER_NAME = "docked_vessel_accepts_response";
    private static final String POLICY_MARKER = "responder_returned_tick=NEW.last_tick";

    private FleetResponseDispatchPolicy() { }

    public static String dropStatement() {
        return "DROP TRIGGER IF EXISTS " + TRIGGER_NAME;
    }

    public static String createStatement() {
        return "CREATE TRIGGER " + TRIGGER_NAME + " AFTER UPDATE OF status ON npc_vessel "
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

    /** Repairs worlds that already contain the pre-cooldown trigger without changing their schema version. */
    public static void installIfSupported(Connection connection) throws SQLException {
        if (!hasTable(connection, "npc_vessel") || !hasTable(connection, "fleet_response_operation")
                || !hasColumn(connection, "fleet_response_operation", "responder_returned_tick")) {
            return;
        }
        String existing = triggerSql(connection);
        if (existing != null && existing.replaceAll("\\s+", "").contains(POLICY_MARKER)) return;
        try (Statement statement = connection.createStatement()) {
            statement.execute(dropStatement());
            statement.execute(createStatement());
        }
    }

    private static String triggerSql(Connection connection) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT sql FROM sqlite_master WHERE type='trigger' AND name=?")) {
            statement.setString(1, TRIGGER_NAME);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? result.getString(1) : null;
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
