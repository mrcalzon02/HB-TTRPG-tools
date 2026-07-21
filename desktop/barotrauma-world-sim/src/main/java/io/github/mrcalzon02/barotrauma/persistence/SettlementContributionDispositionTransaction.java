package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldLock;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Savepoint;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Atomically classifies every physical commitment before a settlement project becomes terminal. */
public final class SettlementContributionDispositionTransaction {
    private SettlementContributionDispositionTransaction() { }

    public static SettlementProjectTransaction.ProjectResult terminate(WorldPaths world, TerminationRequest request)
            throws IOException, SQLException {
        Objects.requireNonNull(world, "world");
        Objects.requireNonNull(request, "request");
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(world);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + world.database())) {
            configure(connection);
            verifySchema(connection);
            boolean originalAutoCommit = connection.getAutoCommit();
            connection.setAutoCommit(false);
            try {
                var result = terminate(connection, request);
                connection.commit();
                return result;
            } catch (SQLException | RuntimeException exception) {
                try { connection.rollback(); }
                catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
                throw exception;
            } finally {
                connection.setAutoCommit(originalAutoCommit);
            }
        }
    }

    static SettlementProjectTransaction.ProjectResult terminate(Connection connection, TerminationRequest request)
            throws SQLException {
        Objects.requireNonNull(connection, "connection");
        Objects.requireNonNull(request, "request");
        requireTransaction(connection);
        requireTick(request.tick());
        Project project = project(connection, request.projectId());
        validateTerminalStatus(project.status(), request.terminalStatus());
        List<Contribution> contributions = contributions(connection, project.projectId());
        Map<String, Disposition> plans = plans(request.plans(), contributions);

        Savepoint savepoint = connection.setSavepoint("settlement_contribution_disposition");
        try {
            for (Contribution contribution : contributions) {
                Disposition disposition = plans.get(contribution.contributionId());
                applyPhysicalDisposition(connection, project, contribution, disposition, request.tick());
                insertDisposition(connection, project, contribution, disposition, request.tick(), request.summary());
            }
            var result = SettlementProjectTransaction.transition(connection, project.projectId(), request.tick(),
                    request.terminalStatus().name(),
                    "project-" + request.terminalStatus().name().toLowerCase() + "-disposition",
                    request.summary());
            connection.releaseSavepoint(savepoint);
            return result;
        } catch (SQLException | RuntimeException exception) {
            try { connection.rollback(savepoint); }
            catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
            try { connection.releaseSavepoint(savepoint); }
            catch (SQLException releaseFailure) { exception.addSuppressed(releaseFailure); }
            throw exception;
        }
    }

    private static void applyPhysicalDisposition(Connection connection, Project project,
                                                 Contribution contribution, Disposition disposition,
                                                 long tick) throws SQLException {
        ContributionKind kind = ContributionKind.valueOf(contribution.kind());
        switch (kind) {
            case MATERIALS -> inventoryDisposition(connection, project, contribution, disposition,
                    "item-steel", tick);
            case SUPPLIES -> inventoryDisposition(connection, project, contribution, disposition,
                    "item-rations", tick);
            case POPULATION -> populationDisposition(connection, project, contribution, disposition);
            case TRANSPORT -> transportDisposition(connection, project, contribution, disposition);
            case SECURITY -> {
                if (disposition != Disposition.RETURNED) {
                    throw new SQLException("Committed settlement security may only be released as RETURNED.");
                }
            }
            case WORK -> {
                if (disposition != Disposition.CONSUMED) {
                    throw new SQLException("Completed settlement work may only be classified as CONSUMED.");
                }
            }
        }
    }

    private static void inventoryDisposition(Connection connection, Project project, Contribution contribution,
                                             Disposition disposition, String itemId, long tick) throws SQLException {
        if (disposition != Disposition.RETURNED) return;
        if (contribution.sourceStationId() == null) {
            throw new SQLException("Returned settlement inventory requires its source station.");
        }
        try (PreparedStatement update = connection.prepareStatement(
                "UPDATE station_inventory SET quantity=quantity+?,last_tick=? WHERE station_id=? AND item_id=? "
                        + "AND station_id IN (SELECT station_id FROM world_station WHERE world_id=?)")) {
            update.setLong(1, contribution.quantity());
            update.setLong(2, tick);
            update.setString(3, contribution.sourceStationId());
            update.setString(4, itemId);
            update.setString(5, project.worldId());
            if (update.executeUpdate() != 1) {
                throw new SQLException("Returned settlement inventory source is unavailable.");
            }
        }
    }

    private static void populationDisposition(Connection connection, Project project, Contribution contribution,
                                              Disposition disposition) throws SQLException {
        if (disposition == Disposition.CONSUMED) {
            throw new SQLException("Committed settlement population cannot be classified as CONSUMED.");
        }
        if (contribution.relatedFlowId() == null) {
            throw new SQLException("Population disposition requires its physical population flow.");
        }
        String column = switch (disposition) {
            case RETURNED -> "returned_quantity";
            case STRANDED -> "stranded_quantity";
            case LOST -> "losses";
            case CONSUMED -> throw new SQLException("Population disposition cannot be consumed.");
        };
        long available;
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT " + column + " FROM population_flow WHERE flow_id=? AND world_id=? "
                        + "AND entity_type='NPC_POPULATION'")) {
            statement.setString(1, contribution.relatedFlowId());
            statement.setString(2, project.worldId());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Population disposition flow is unavailable.");
                available = result.getLong(1);
            }
        }
        long alreadyClassified = classifiedFlowQuantity(connection, contribution.relatedFlowId(), disposition);
        if (Math.addExact(alreadyClassified, contribution.quantity()) > available) {
            throw new SQLException("Population disposition exceeds the recorded physical flow outcome.");
        }
    }

    private static long classifiedFlowQuantity(Connection connection, String flowId, Disposition disposition)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COALESCE(SUM(d.quantity),0) FROM settlement_project_contribution_disposition d "
                        + "JOIN settlement_project_contribution c ON c.contribution_id=d.contribution_id "
                        + "WHERE c.related_flow_id=? AND d.disposition=?")) {
            statement.setString(1, flowId);
            statement.setString(2, disposition.name());
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? result.getLong(1) : 0;
            }
        }
    }

    private static void transportDisposition(Connection connection, Project project, Contribution contribution,
                                             Disposition disposition) throws SQLException {
        if (disposition == Disposition.CONSUMED) {
            throw new SQLException("Committed settlement transport cannot be classified as CONSUMED.");
        }
        if (contribution.sourceVesselId() == null) {
            throw new SQLException("Transport disposition requires its assigned NPC vessel.");
        }
        String predicate = switch (disposition) {
            case RETURNED -> "v.status='DOCKED' AND v.current_location_id=(SELECT location_id FROM world_station "
                    + "WHERE station_id=? AND world_id=?)";
            case STRANDED -> "v.status='DISABLED'";
            case LOST -> "v.status='LOST'";
            case CONSUMED -> throw new SQLException("Transport disposition cannot be consumed.");
        };
        String sql = "SELECT 1 FROM npc_vessel v WHERE v.npc_vessel_id=? AND v.world_id=? AND " + predicate;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, contribution.sourceVesselId());
            statement.setString(2, project.worldId());
            if (disposition == Disposition.RETURNED) {
                if (contribution.sourceStationId() == null) {
                    throw new SQLException("Returned settlement transport requires its source station.");
                }
                statement.setString(3, contribution.sourceStationId());
                statement.setString(4, project.worldId());
            }
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) {
                    throw new SQLException("Transport disposition does not match canonical vessel state.");
                }
            }
        }
    }

    private static void insertDisposition(Connection connection, Project project, Contribution contribution,
                                          Disposition disposition, long tick, String terminationSummary)
            throws SQLException {
        String evidenceKey = contribution.contributionId() + ":" + disposition.name().toLowerCase();
        String summary = "Contribution " + contribution.contributionId() + " was "
                + disposition.name().toLowerCase() + ". " + text(terminationSummary, "summary", 1_000);
        try (PreparedStatement insert = connection.prepareStatement(
                "INSERT INTO settlement_project_contribution_disposition(disposition_id,contribution_id,project_id,"
                        + "world_id,contribution_kind,disposition,quantity,tick_sequence,evidence_key,summary) "
                        + "VALUES(?,?,?,?,?,?,?,?,?,?)")) {
            insert.setString(1, deterministicId(evidenceKey + ":" + tick));
            insert.setString(2, contribution.contributionId());
            insert.setString(3, project.projectId());
            insert.setString(4, project.worldId());
            insert.setString(5, contribution.kind());
            insert.setString(6, disposition.name());
            insert.setLong(7, contribution.quantity());
            insert.setLong(8, tick);
            insert.setString(9, evidenceKey);
            insert.setString(10, summary);
            insert.executeUpdate();
        }
    }

    private static Project project(Connection connection, String projectId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT project_id,world_id,status FROM settlement_project WHERE project_id=?")) {
            statement.setString(1, token(projectId, "projectId"));
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Unknown settlement project: " + projectId);
                return new Project(result.getString(1), result.getString(2), result.getString(3));
            }
        }
    }

    private static List<Contribution> contributions(Connection connection, String projectId) throws SQLException {
        List<Contribution> result = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT contribution_id,contribution_kind,quantity,source_station_id,source_population_id,"
                        + "source_npc_vessel_id,related_flow_id FROM settlement_project_contribution "
                        + "WHERE project_id=? ORDER BY contribution_id")) {
            statement.setString(1, projectId);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) result.add(new Contribution(rows.getString(1), rows.getString(2),
                        rows.getLong(3), rows.getString(4), rows.getString(5), rows.getString(6),
                        rows.getString(7)));
            }
        }
        return List.copyOf(result);
    }

    private static Map<String, Disposition> plans(List<DispositionPlan> requested,
                                                  List<Contribution> contributions) throws SQLException {
        Objects.requireNonNull(requested, "plans");
        Set<String> expected = new HashSet<>();
        for (Contribution contribution : contributions) expected.add(contribution.contributionId());
        Map<String, Disposition> result = new HashMap<>();
        for (DispositionPlan plan : requested) {
            Objects.requireNonNull(plan, "plan");
            String contributionId = token(plan.contributionId(), "contributionId");
            if (!expected.contains(contributionId)) {
                throw new SQLException("Disposition plan references an unrelated contribution: " + contributionId);
            }
            if (result.put(contributionId, Objects.requireNonNull(plan.disposition(), "disposition")) != null) {
                throw new SQLException("Disposition plan repeats contribution: " + contributionId);
            }
        }
        if (result.size() != expected.size()) {
            throw new SQLException("Every settlement contribution requires exactly one disposition.");
        }
        return Map.copyOf(result);
    }

    private static void validateTerminalStatus(String current, TerminalStatus terminal) throws SQLException {
        Objects.requireNonNull(terminal, "terminalStatus");
        if (terminal == TerminalStatus.FAILED && !List.of("PREPARING", "ACTIVE", "BLOCKED").contains(current)) {
            throw new SQLException("Settlement project cannot fail from " + current + ".");
        }
        if (terminal == TerminalStatus.CANCELLED
                && !List.of("PLANNED", "PREPARING", "ACTIVE", "BLOCKED").contains(current)) {
            throw new SQLException("Settlement project cannot cancel from " + current + ".");
        }
    }

    private static void requireTransaction(Connection connection) throws SQLException {
        if (connection.getAutoCommit()) {
            throw new SQLException("Settlement contribution disposition requires an active transaction.");
        }
    }

    private static void configure(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("PRAGMA recursive_triggers=ON");
            statement.execute("PRAGMA busy_timeout=5000");
            statement.execute("PRAGMA journal_mode=WAL");
            statement.execute("PRAGMA synchronous=FULL");
        }
    }

    private static void verifySchema(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COALESCE(MAX(version),0) FROM schema_migration")) {
            int version = result.next() ? result.getInt(1) : 0;
            if (version < 31 || version > WorldStorageContracts.DATABASE_SCHEMA_VERSION) {
                throw new SQLException("Settlement contribution disposition requires schema 031 through "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "; found " + version + ".");
            }
        }
    }

    private static String deterministicId(String seed) {
        return UUID.nameUUIDFromBytes(seed.getBytes(StandardCharsets.UTF_8)).toString();
    }

    private static void requireTick(long tick) {
        if (tick < 0) throw new IllegalArgumentException("tick must not be negative.");
    }

    private static String token(String value, String name) { return text(value, name, 240); }

    private static String text(String value, String name, int maximum) {
        Objects.requireNonNull(value, name);
        String result = value.trim();
        if (result.isEmpty() || result.length() > maximum) {
            throw new IllegalArgumentException(name + " is blank or too long.");
        }
        return result;
    }

    public enum TerminalStatus { FAILED, CANCELLED }
    public enum Disposition { RETURNED, STRANDED, CONSUMED, LOST }
    private enum ContributionKind { MATERIALS, SUPPLIES, POPULATION, TRANSPORT, SECURITY, WORK }

    public record DispositionPlan(String contributionId, Disposition disposition) {
        public DispositionPlan {
            contributionId = token(contributionId, "contributionId");
            Objects.requireNonNull(disposition, "disposition");
        }
    }

    public record TerminationRequest(String projectId, TerminalStatus terminalStatus, long tick,
                                     String summary, List<DispositionPlan> plans) {
        public TerminationRequest {
            projectId = token(projectId, "projectId");
            Objects.requireNonNull(terminalStatus, "terminalStatus");
            requireTick(tick);
            summary = text(summary, "summary", 1_000);
            plans = List.copyOf(Objects.requireNonNull(plans, "plans"));
        }
    }

    private record Project(String projectId, String worldId, String status) { }
    private record Contribution(String contributionId, String kind, long quantity, String sourceStationId,
                                String sourcePopulationId, String sourceVesselId, String relatedFlowId) { }
}
