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
import java.sql.Statement;
import java.sql.Types;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

/** Authoritative schema-029 settlement-project lifecycle transaction. */
public final class SettlementProjectTransaction {
    private SettlementProjectTransaction() { }

    public static ProjectResult plan(WorldPaths world, PlanRequest request) throws IOException, SQLException {
        Objects.requireNonNull(request, "request");
        return write(world, connection -> plan(connection, request));
    }

    /** Assigns non-consumable security support. Physical support uses the dedicated commit methods below. */
    public static ProjectResult contribute(WorldPaths world, ContributionRequest request)
            throws IOException, SQLException {
        Objects.requireNonNull(request, "request");
        requirePublicContributionKind(request.kind());
        return write(world, connection -> contribute(connection, request));
    }

    public static ProjectResult commitInventory(WorldPaths world, String projectId, ContributionKind kind,
                                                String stationId, String itemId, int quantity, long tick,
                                                String evidenceKey) throws IOException, SQLException {
        return write(world, connection -> SettlementProjectContributionAuthority.commitInventory(connection,
                token(projectId, "projectId"), Objects.requireNonNull(kind, "kind"),
                token(stationId, "stationId"), token(itemId, "itemId"), quantity, tick,
                text(evidenceKey, "evidenceKey", 300)));
    }

    public static ProjectResult commitTransport(WorldPaths world, String projectId, String vesselId,
                                                long tick, String evidenceKey) throws IOException, SQLException {
        return write(world, connection -> SettlementProjectContributionAuthority.commitTransport(connection,
                token(projectId, "projectId"), token(vesselId, "vesselId"), tick,
                text(evidenceKey, "evidenceKey", 300)));
    }

    public static ProjectResult commitArrivedPopulation(WorldPaths world, String projectId, String flowId,
                                                        int quantity, long tick, String evidenceKey)
            throws IOException, SQLException {
        return write(world, connection -> SettlementProjectContributionAuthority.commitArrivedPopulation(connection,
                token(projectId, "projectId"), token(flowId, "flowId"), quantity, tick,
                text(evidenceKey, "evidenceKey", 300)));
    }

    public static ProjectResult assignSecurity(WorldPaths world, String projectId, String sourceStationId,
                                               int security, long tick, String evidenceKey, String summary)
            throws IOException, SQLException {
        ContributionRequest request = new ContributionRequest(token(projectId, "projectId"),
                ContributionKind.SECURITY, security, sourceStationId, null, null, null, tick,
                text(evidenceKey, "evidenceKey", 300), text(summary, "summary", 1000));
        return write(world, connection -> contribute(connection, request));
    }

    public static ProjectResult prepare(WorldPaths world, String projectId, long tick)
            throws IOException, SQLException {
        return write(world, connection -> prepare(connection, token(projectId, "projectId"), tick));
    }

    public static ProjectResult activate(WorldPaths world, String projectId, long tick)
            throws IOException, SQLException {
        return write(world, connection -> activate(connection, token(projectId, "projectId"), tick));
    }

    public static ProjectResult advance(WorldPaths world, String projectId, long tick, int workUnits,
                                        String evidenceKey, String summary) throws IOException, SQLException {
        return write(world, connection -> advance(connection, token(projectId, "projectId"), tick,
                workUnits, evidenceKey, summary));
    }

    public static ProjectResult block(WorldPaths world, String projectId, long tick, String reason)
            throws IOException, SQLException {
        return write(world, connection -> transition(connection, token(projectId, "projectId"), tick,
                "BLOCKED", "project-blocked", reason));
    }

    public static ProjectResult resume(WorldPaths world, String projectId, long tick, String reason)
            throws IOException, SQLException {
        return write(world, connection -> transition(connection, token(projectId, "projectId"), tick,
                "ACTIVE", "project-resumed", reason));
    }

    public static ProjectResult fail(WorldPaths world, String projectId, long tick, String reason)
            throws IOException, SQLException {
        return write(world, connection -> transition(connection, token(projectId, "projectId"), tick,
                "FAILED", "project-failed", reason));
    }

    public static ProjectResult cancel(WorldPaths world, String projectId, long tick, String reason)
            throws IOException, SQLException {
        return write(world, connection -> transition(connection, token(projectId, "projectId"), tick,
                "CANCELLED", "project-cancelled", reason));
    }

    static ProjectResult plan(Connection connection, PlanRequest request) throws SQLException {
        requireTick(request.tick());
        String worldId = requireWorld(connection, request.worldId());
        String targetLocationId = requireLocation(connection, worldId, request.targetLocationId());
        nullableStation(connection, worldId, request.originStationId());
        nullableStation(connection, worldId, request.targetStationId());
        nullablePopulation(connection, worldId, request.relatedPopulationId());
        nullableVessel(connection, worldId, request.assignedVesselId());

        ProjectKind kind = Objects.requireNonNull(request.kind(), "kind");
        Requirements requirements = Objects.requireNonNull(request.requirements(), "requirements");
        requirements.validate();
        String projectId = deterministicId(worldId + ":settlement-project:" + kind + ":"
                + targetLocationId + ":" + request.tick());
        String summary = text(request.summary(), "summary", 1000);

        try (PreparedStatement insert = connection.prepareStatement(
                "INSERT INTO settlement_project(project_id,world_id,project_kind,status,sponsor_faction,"
                        + "origin_station_id,target_station_id,target_location_id,related_population_id,"
                        + "assigned_npc_vessel_id,required_material_units,required_supply_units,required_population,"
                        + "required_transport_units,required_security,target_progress_units,created_tick,updated_tick,summary) "
                        + "VALUES (?,?,?,'PLANNED',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")) {
            insert.setString(1, projectId);
            insert.setString(2, worldId);
            insert.setString(3, kind.name());
            nullableText(insert, 4, request.sponsorFaction());
            nullableText(insert, 5, request.originStationId());
            nullableText(insert, 6, request.targetStationId());
            insert.setString(7, targetLocationId);
            nullableText(insert, 8, request.relatedPopulationId());
            nullableText(insert, 9, request.assignedVesselId());
            insert.setInt(10, requirements.materialUnits());
            insert.setInt(11, requirements.supplyUnits());
            insert.setInt(12, requirements.population());
            insert.setInt(13, requirements.transportUnits());
            insert.setInt(14, requirements.security());
            insert.setInt(15, requirements.progressUnits());
            insert.setLong(16, request.tick());
            insert.setLong(17, request.tick());
            insert.setString(18, summary);
            insert.executeUpdate();
        }
        insertTransition(connection, projectId, worldId, "PLANNED", "PLANNED", request.tick(), 0,
                "project-planned", summary);
        return result(connection, projectId);
    }

    static ProjectResult contribute(Connection connection, ContributionRequest request) throws SQLException {
        requireTick(request.tick());
        if (request.quantity() < 1) throw new SQLException("Settlement contribution quantity must be positive.");
        String projectId = token(request.projectId(), "projectId");
        Project project = project(connection, projectId);
        if (!project.status().equals("PLANNED") && !project.status().equals("PREPARING")
                && !project.status().equals("ACTIVE") && !project.status().equals("BLOCKED")) {
            throw new SQLException("Terminal settlement projects cannot accept contributions.");
        }
        ContributionKind kind = Objects.requireNonNull(request.kind(), "kind");
        if (kind == ContributionKind.WORK && !project.status().equals("ACTIVE")) {
            throw new SQLException("Settlement work may be committed only while the project is active.");
        }
        String evidenceKey = text(request.evidenceKey(), "evidenceKey", 300);
        String summary = text(request.summary(), "summary", 1000);
        validateContributionSource(connection, project.worldId(), request);

        String column = switch (kind) {
            case MATERIALS -> "committed_material_units";
            case SUPPLIES -> "committed_supply_units";
            case POPULATION -> "committed_population";
            case TRANSPORT -> "committed_transport_units";
            case SECURITY -> "current_security";
            case WORK -> "progress_units";
        };
        String limitColumn = switch (kind) {
            case MATERIALS -> "required_material_units";
            case SUPPLIES -> "required_supply_units";
            case POPULATION -> "required_population";
            case TRANSPORT -> "required_transport_units";
            case SECURITY -> "100";
            case WORK -> "target_progress_units";
        };
        try (PreparedStatement update = connection.prepareStatement(
                "UPDATE settlement_project SET " + column + "=" + column + "+?,updated_tick=? "
                        + "WHERE project_id=? AND " + column + "+? <= " + limitColumn)) {
            update.setInt(1, request.quantity());
            update.setLong(2, request.tick());
            update.setString(3, projectId);
            update.setInt(4, request.quantity());
            if (update.executeUpdate() != 1) {
                throw new SQLException("Settlement contribution exceeds the remaining project requirement.");
            }
        }
        try (PreparedStatement insert = connection.prepareStatement(
                "INSERT INTO settlement_project_contribution(contribution_id,project_id,world_id,contribution_kind,"
                        + "quantity,source_station_id,source_population_id,source_npc_vessel_id,related_flow_id,"
                        + "tick_sequence,evidence_key,summary) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")) {
            insert.setString(1, deterministicId(projectId + ":contribution:" + evidenceKey));
            insert.setString(2, projectId);
            insert.setString(3, project.worldId());
            insert.setString(4, kind.name());
            insert.setInt(5, request.quantity());
            nullableText(insert, 6, request.sourceStationId());
            nullableText(insert, 7, request.sourcePopulationId());
            nullableText(insert, 8, request.sourceVesselId());
            nullableText(insert, 9, request.relatedFlowId());
            insert.setLong(10, request.tick());
            insert.setString(11, evidenceKey);
            insert.setString(12, summary);
            insert.executeUpdate();
        }
        return result(connection, projectId);
    }

    static ProjectResult prepare(Connection connection, String projectId, long tick) throws SQLException {
        requireTick(tick);
        Project project = project(connection, projectId);
        requireStatus(project, "PLANNED");
        updateStatus(connection, projectId, "PREPARING", tick, "preparation_started_tick", tick, null);
        insertTransition(connection, projectId, project.worldId(), "PLANNED", "PREPARING", tick,
                project.progressUnits(), "project-preparation", "Settlement project preparation began.");
        return result(connection, projectId);
    }

    static ProjectResult activate(Connection connection, String projectId, long tick) throws SQLException {
        requireTick(tick);
        Project project = project(connection, projectId);
        if (!project.status().equals("PREPARING") && !project.status().equals("BLOCKED")) {
            throw new SQLException("Settlement project cannot activate from " + project.status() + ".");
        }
        String previous = project.status();
        updateStatus(connection, projectId, "ACTIVE", tick, "activated_tick", tick, null);
        insertTransition(connection, projectId, project.worldId(), previous, "ACTIVE", tick,
                project.progressUnits(), "project-activated", "All required settlement support was committed.");
        return result(connection, projectId);
    }

    static ProjectResult advance(Connection connection, String projectId, long tick, int workUnits,
                                 String evidenceKey, String summary) throws SQLException {
        requireTick(tick);
        if (workUnits < 1) throw new SQLException("Settlement work units must be positive.");
        Project project = project(connection, projectId);
        requireStatus(project, "ACTIVE");
        int remaining = project.targetProgressUnits() - project.progressUnits();
        if (remaining < 1) throw new SQLException("Active settlement project has no remaining work.");
        int acceptedWork = Math.min(workUnits, remaining);
        ContributionRequest contribution = new ContributionRequest(projectId, ContributionKind.WORK, acceptedWork,
                null, null, null, null, tick, evidenceKey, summary);
        contribute(connection, contribution);
        Project updated = project(connection, projectId);
        if (updated.progressUnits() >= updated.targetProgressUnits()) {
            updateStatus(connection, projectId, "COMPLETE", tick, "completed_tick", tick, null);
            insertTransition(connection, projectId, project.worldId(), "ACTIVE", "COMPLETE", tick,
                    updated.targetProgressUnits(), "project-complete", text(summary, "summary", 1000));
        }
        return result(connection, projectId);
    }

    static ProjectResult transition(Connection connection, String projectId, long tick,
                                    String status, String evidenceKey, String summary) throws SQLException {
        requireTick(tick);
        Project project = project(connection, projectId);
        String normalized = token(status, "status").toUpperCase(Locale.ROOT);
        String failure = normalized.equals("FAILED") ? text(summary, "reason", 1000) : null;
        updateStatus(connection, projectId, normalized, tick, null, null, failure);
        insertTransition(connection, projectId, project.worldId(), project.status(), normalized, tick,
                project.progressUnits(), evidenceKey, text(summary, "summary", 1000));
        return result(connection, projectId);
    }

    static void requirePublicContributionKind(ContributionKind kind) throws SQLException {
        if (Objects.requireNonNull(kind, "kind") != ContributionKind.SECURITY) {
            throw new SQLException("Public generic settlement contributions accept only SECURITY; "
                    + "materials, supplies, population, transport, and work require their canonical authorities.");
        }
    }

    private static void updateStatus(Connection connection, String projectId, String status, long tick,
                                     String tickColumn, Long tickValue, String failureReason) throws SQLException {
        String sql = "UPDATE settlement_project SET status=?,updated_tick=?,failure_reason=?"
                + (tickColumn == null ? "" : "," + tickColumn + "=?") + " WHERE project_id=?";
        try (PreparedStatement update = connection.prepareStatement(sql)) {
            int parameter = 1;
            update.setString(parameter++, status);
            update.setLong(parameter++, tick);
            if (failureReason == null) update.setNull(parameter++, Types.VARCHAR);
            else update.setString(parameter++, failureReason);
            if (tickColumn != null) update.setLong(parameter++, tickValue == null ? tick : tickValue);
            update.setString(parameter, projectId);
            if (update.executeUpdate() != 1) throw new SQLException("Settlement project transition was not applied once.");
        }
    }

    private static void insertTransition(Connection connection, String projectId, String worldId,
                                         String fromStatus, String toStatus, long tick, int progress,
                                         String evidenceKey, String summary) throws SQLException {
        try (PreparedStatement insert = connection.prepareStatement(
                "INSERT INTO settlement_project_transition(transition_id,project_id,world_id,from_status,to_status,"
                        + "tick_sequence,progress_units,evidence_key,summary) VALUES (?,?,?,?,?,?,?,?,?)")) {
            insert.setString(1, deterministicId(projectId + ":transition:" + toStatus + ":" + tick));
            insert.setString(2, projectId);
            insert.setString(3, worldId);
            insert.setString(4, fromStatus);
            insert.setString(5, toStatus);
            insert.setLong(6, tick);
            insert.setInt(7, progress);
            insert.setString(8, text(evidenceKey, "evidenceKey", 300));
            insert.setString(9, text(summary, "summary", 1000));
            insert.executeUpdate();
        }
    }

    private static void validateContributionSource(Connection connection, String worldId,
                                                   ContributionRequest request) throws SQLException {
        nullableStation(connection, worldId, request.sourceStationId());
        nullablePopulation(connection, worldId, request.sourcePopulationId());
        nullableVessel(connection, worldId, request.sourceVesselId());
        if (request.relatedFlowId() != null && !request.relatedFlowId().isBlank()) {
            requireOwnedRow(connection, "population_flow", "flow_id", request.relatedFlowId(), worldId);
        }
    }

    private static Project project(Connection connection, String projectId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT project_id,world_id,project_kind,status,progress_units,target_progress_units "
                        + "FROM settlement_project WHERE project_id=?")) {
            statement.setString(1, projectId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Unknown settlement project: " + projectId);
                return new Project(result.getString(1), result.getString(2), result.getString(3),
                        result.getString(4), result.getInt(5), result.getInt(6));
            }
        }
    }

    private static ProjectResult result(Connection connection, String projectId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT project_id,world_id,project_kind,status,target_location_id,required_material_units,"
                        + "committed_material_units,required_supply_units,committed_supply_units,required_population,"
                        + "committed_population,required_transport_units,committed_transport_units,required_security,"
                        + "current_security,progress_units,target_progress_units,created_tick,updated_tick "
                        + "FROM settlement_project WHERE project_id=?")) {
            statement.setString(1, projectId);
            try (ResultSet row = statement.executeQuery()) {
                if (!row.next()) throw new SQLException("Settlement project result disappeared.");
                return new ProjectResult(row.getString(1), row.getString(2), ProjectKind.valueOf(row.getString(3)),
                        row.getString(4), row.getString(5), row.getInt(6), row.getInt(7), row.getInt(8),
                        row.getInt(9), row.getInt(10), row.getInt(11), row.getInt(12), row.getInt(13),
                        row.getInt(14), row.getInt(15), row.getInt(16), row.getInt(17), row.getLong(18),
                        row.getLong(19));
            }
        }
    }

    private static String requireWorld(Connection connection, String worldId) throws SQLException {
        String value = token(worldId, "worldId");
        requireRow(connection, "world_metadata", "world_id", value);
        return value;
    }

    private static String requireLocation(Connection connection, String worldId, String locationId) throws SQLException {
        String value = token(locationId, "targetLocationId");
        requireOwnedRow(connection, "world_location", "location_id", value, worldId);
        return value;
    }

    private static void nullableStation(Connection connection, String worldId, String stationId) throws SQLException {
        if (stationId != null && !stationId.isBlank()) requireOwnedRow(connection, "world_station", "station_id", stationId, worldId);
    }

    private static void nullablePopulation(Connection connection, String worldId, String populationId) throws SQLException {
        if (populationId != null && !populationId.isBlank()) requireOwnedRow(connection, "npc_population_state", "population_id", populationId, worldId);
    }

    private static void nullableVessel(Connection connection, String worldId, String vesselId) throws SQLException {
        if (vesselId != null && !vesselId.isBlank()) requireOwnedRow(connection, "npc_vessel", "npc_vessel_id", vesselId, worldId);
    }

    private static void requireRow(Connection connection, String table, String key, String value) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT 1 FROM " + table + " WHERE " + key + "=?")) {
            statement.setString(1, value);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Unknown " + table + " row: " + value);
            }
        }
    }

    private static void requireOwnedRow(Connection connection, String table, String key,
                                        String value, String worldId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT 1 FROM " + table + " WHERE " + key + "=? AND world_id=?")) {
            statement.setString(1, value);
            statement.setString(2, worldId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Referenced " + table + " row is missing or belongs to another world.");
            }
        }
    }

    private static void requireStatus(Project project, String status) throws SQLException {
        if (!project.status().equals(status)) {
            throw new SQLException("Settlement project must be " + status + "; found " + project.status() + ".");
        }
    }

    private static void requireTick(long tick) throws SQLException {
        if (tick < 0) throw new SQLException("Settlement project tick must be nonnegative.");
    }

    private static String token(String value, String name) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(name + " is required.");
        return value.trim();
    }

    private static String text(String value, String name, int maximum) {
        String normalized = token(value, name);
        if (normalized.length() > maximum) throw new IllegalArgumentException(name + " exceeds " + maximum + " characters.");
        return normalized;
    }

    private static String deterministicId(String key) {
        return UUID.nameUUIDFromBytes(key.getBytes(StandardCharsets.UTF_8)).toString();
    }

    private static void nullableText(PreparedStatement statement, int index, String value) throws SQLException {
        if (value == null || value.isBlank()) statement.setNull(index, Types.VARCHAR);
        else statement.setString(index, value.trim());
    }

    private static <T> T write(WorldPaths world, SqlWork<T> work) throws IOException, SQLException {
        Objects.requireNonNull(world, "world");
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(world);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + world.database())) {
            configure(connection);
            verifySchema(connection);
            boolean originalAutoCommit = connection.getAutoCommit();
            connection.setAutoCommit(false);
            try {
                T result = work.run(connection);
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
                throw new SQLException("Settlement projects require database schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "; found " + version + ".");
            }
        }
    }

    public enum ProjectKind { FOUNDING, EXPANSION, ABANDONMENT, RECLAMATION }
    public enum ContributionKind { MATERIALS, SUPPLIES, POPULATION, TRANSPORT, SECURITY, WORK }

    public record Requirements(int materialUnits, int supplyUnits, int population,
                               int transportUnits, int security, int progressUnits) {
        void validate() {
            if (materialUnits < 0 || supplyUnits < 0 || population < 0 || transportUnits < 0
                    || security < 0 || security > 100 || progressUnits < 1) {
                throw new IllegalArgumentException("Settlement project requirements are invalid.");
            }
        }
    }

    public record PlanRequest(String worldId, ProjectKind kind, String sponsorFaction,
                              String originStationId, String targetStationId, String targetLocationId,
                              String relatedPopulationId, String assignedVesselId, Requirements requirements,
                              long tick, String summary) { }

    public record ContributionRequest(String projectId, ContributionKind kind, int quantity,
                                      String sourceStationId, String sourcePopulationId, String sourceVesselId,
                                      String relatedFlowId, long tick, String evidenceKey, String summary) { }

    public record ProjectResult(String projectId, String worldId, ProjectKind kind, String status,
                                String targetLocationId, int requiredMaterials, int committedMaterials,
                                int requiredSupplies, int committedSupplies, int requiredPopulation,
                                int committedPopulation, int requiredTransport, int committedTransport,
                                int requiredSecurity, int currentSecurity, int progressUnits,
                                int targetProgressUnits, long createdTick, long updatedTick) { }

    private record Project(String projectId, String worldId, String kind, String status,
                           int progressUnits, int targetProgressUnits) { }

    @FunctionalInterface
    private interface SqlWork<T> { T run(Connection connection) throws SQLException; }
}
