package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldLock;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.NpcTransitScheduleEngine;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.EnumMap;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import static io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationEvidence.*;
import static io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationStore.*;

/**
 * Authoritative population-flow transaction introduced in schema 028.
 *
 * <p>People stay at the origin through planning and preparation. Departure removes exact cohorts only after the
 * assigned vessel enters {@code npc_transit_leg}. Arrival or return restores survivors at one station; failure must
 * account for every released person as a casualty or stranded survivor.</p>
 */
public final class NpcPopulationMigrationTransaction {
    private NpcPopulationMigrationTransaction() { }

    public static FlowResult plan(WorldPaths world, PlanRequest request) throws IOException, SQLException {
        Objects.requireNonNull(request, "request");
        return write(world, connection -> plan(connection, request));
    }

    public static FlowResult prepare(WorldPaths world, String flowId, long tick) throws IOException, SQLException {
        return write(world, connection -> prepare(connection, token(flowId, "flowId"), tick));
    }

    public static FlowResult depart(WorldPaths world, String flowId, long tick) throws IOException, SQLException {
        return write(world, connection -> depart(connection, token(flowId, "flowId"), tick));
    }

    public static FlowResult arrive(WorldPaths world, String flowId, long tick, long losses)
            throws IOException, SQLException {
        return write(world, connection -> arrive(connection, token(flowId, "flowId"), tick, losses));
    }

    public static FlowResult beginReturn(WorldPaths world, String flowId, long tick, String reason)
            throws IOException, SQLException {
        return write(world, connection -> beginReturn(connection, token(flowId, "flowId"), tick, reason));
    }

    public static FlowResult completeReturn(WorldPaths world, String flowId, long tick, long losses)
            throws IOException, SQLException {
        return write(world, connection -> completeReturn(connection, token(flowId, "flowId"), tick, losses));
    }

    public static FlowResult fail(WorldPaths world, String flowId, long tick, long losses,
                                  long stranded, String reason) throws IOException, SQLException {
        return write(world, connection -> fail(connection, token(flowId, "flowId"), tick, losses, stranded, reason));
    }

    public static FlowResult cancel(WorldPaths world, String flowId, long tick, String reason)
            throws IOException, SQLException {
        return write(world, connection -> cancel(connection, token(flowId, "flowId"), tick, reason));
    }

    static FlowResult plan(Connection connection, PlanRequest request) throws SQLException {
        requireTick(request.tick());
        Population origin = population(connection, request.originPopulationId());
        Population destination = population(connection, request.destinationPopulationId());
        if (!origin.worldId().equals(destination.worldId())) {
            throw new SQLException("Migration endpoints belong to different worlds.");
        }
        if (origin.populationId().equals(destination.populationId())) {
            throw new SQLException("Migration origin and destination must differ.");
        }
        if (request.quantity() < 1 || request.quantity() > origin.total()) {
            throw new SQLException("Migration quantity exceeds the available origin population.");
        }
        if (request.quantity() > destinationSpare(destination, request.kind())) {
            throw new SQLException("Destination capacity cannot accept the planned population flow.");
        }
        Vessel vessel = vessel(connection, request.assignedVesselId());
        requireIdleTransport(origin, vessel);

        String flowId = deterministicId(origin.worldId() + ":population-flow:" + origin.populationId() + ":"
                + destination.populationId() + ":" + request.kind() + ":" + request.tick());
        EnumMap<Cohort, Long> allocation = allocate(origin, request.kind(), request.quantity());
        insertFlow(connection, flowId, origin, destination, vessel, request.kind(), request.quantity(),
                request.tick(), request.summary());
        insertCohorts(connection, flowId, allocation);
        insertTransition(connection, flowId, origin.worldId(), "PLANNED", "PLANNED", request.tick(),
                request.quantity(), 0, 0, "migration-plan", request.summary());
        insertObservation(connection, flowId + ":planned", origin.worldId(), request.tick(), origin.populationId(),
                cause(request.kind(), false), request.quantity(), "Population movement was planned: " + request.summary());
        return result(connection, flowId);
    }

    static FlowResult prepare(Connection connection, String flowId, long tick) throws SQLException {
        requireTick(tick);
        Flow flow = flow(connection, flowId);
        requireStatus(flow, "PLANNED");
        Vessel vessel = vessel(connection, flow.vesselId());
        if (!vessel.status().equals("DOCKED") || vessel.missionId() != null
                || !vessel.currentLocationId().equals(flow.originLocationId())) {
            throw new SQLException("Migration transport is no longer available at the origin.");
        }
        int challenges = routeChallenges(connection, flow.originLocationId(), flow.destinationLocationId());
        int duration = NpcTransitScheduleEngine.elapsedDurationTicks(challenges);
        try (PreparedStatement updateFlow = connection.prepareStatement(
                     "UPDATE population_flow SET status='PREPARING',reserved_quantity=quantity,"
                             + "preparation_started_tick=?,duration_ticks=?,updated_tick=? "
                             + "WHERE flow_id=? AND status='PLANNED'");
             PreparedStatement updateVessel = connection.prepareStatement(
                     "UPDATE npc_vessel SET status='PREPARING',destination_location_id=?,route_progress=0,"
                             + "route_ticks_required=?,last_tick=? WHERE npc_vessel_id=? "
                             + "AND status='DOCKED' AND mission_id IS NULL")) {
            updateFlow.setLong(1, tick);
            updateFlow.setInt(2, duration);
            updateFlow.setLong(3, tick);
            updateFlow.setString(4, flowId);
            if (updateFlow.executeUpdate() != 1) throw new SQLException("Flow preparation was not applied once.");
            updateVessel.setString(1, flow.destinationLocationId());
            updateVessel.setInt(2, challenges);
            updateVessel.setLong(3, tick);
            updateVessel.setString(4, flow.vesselId());
            if (updateVessel.executeUpdate() != 1) throw new SQLException("Transport could not enter preparation.");
        }
        insertTransition(connection, flowId, flow.worldId(), "PLANNED", "PREPARING", tick, flow.quantity(),
                0, 0, "transport-preparation", "Transport preparation began for " + flow.quantity() + " residents.");
        return result(connection, flowId);
    }

    static FlowResult depart(Connection connection, String flowId, long tick) throws SQLException {
        requireTick(tick);
        Flow flow = flow(connection, flowId);
        requireStatus(flow, "PREPARING");
        Vessel vessel = vessel(connection, flow.vesselId());
        TransitLeg leg = activeLeg(connection, vessel.vesselId(), flow.destinationLocationId());
        if (!vessel.status().equals("IN_TRANSIT") || leg == null) {
            throw new SQLException("Population cannot depart before its vessel enters the transit layer.");
        }
        Population origin = population(connection, flow.populationId());
        EnumMap<Cohort, Long> planned = cohorts(connection, flowId, "planned_quantity");
        validateAvailable(origin, planned);
        long before = origin.total();
        applyCohortDelta(connection, origin.populationId(), planned, -1, tick);
        long after = Math.subtractExact(before, flow.quantity());
        updateCohorts(connection, flowId, "embarked_quantity", planned);
        try (PreparedStatement update = connection.prepareStatement(
                "UPDATE population_flow SET status='IN_TRANSIT',reserved_quantity=0,embarked_quantity=quantity,"
                        + "origin_released=1,transit_leg_id=?,departure_tick=?,duration_ticks=?,progress_ticks=?,"
                        + "updated_tick=? WHERE flow_id=? AND status='PREPARING'")) {
            update.setString(1, leg.legId());
            update.setLong(2, tick);
            update.setInt(3, leg.durationTicks());
            update.setInt(4, leg.elapsedTicks());
            update.setLong(5, tick);
            update.setString(6, flowId);
            if (update.executeUpdate() != 1) throw new SQLException("Population departure was not applied once.");
        }
        recordPopulationTerm(connection, origin, tick, before, after, 0, flow.quantity(),
                cause(flow.kind(), true), flowId + ":departure", "Residents physically departed aboard transport.");
        projectPopulation(connection, origin.populationId(), tick);
        insertPopulationEvidence(connection, flow, origin, tick, before, after, -flow.quantity(),
                "EMIGRATION", "Migration transport departed");
        insertTransition(connection, flowId, flow.worldId(), "PREPARING", "IN_TRANSIT", tick,
                flow.quantity(), 0, 0, "physical-departure", "Exact cohorts entered transit.");
        return result(connection, flowId);
    }

    static FlowResult arrive(Connection connection, String flowId, long tick, long losses) throws SQLException {
        requireTick(tick);
        Flow flow = flow(connection, flowId);
        requireStatus(flow, "IN_TRANSIT");
        validateLosses(flow, losses);
        Vessel vessel = vessel(connection, flow.vesselId());
        requireArrivedLeg(connection, vessel, flow.destinationLocationId(), "OUTBOUND");
        Population destination = population(connection, flow.destinationPopulationId());
        long survivors = Math.subtractExact(flow.embarkedQuantity(), losses);
        if (survivors > destinationSpare(destination, flow.kind())) {
            throw new SQLException("Destination capacity fell below the surviving migration cohort.");
        }
        OutcomeAllocation outcome = outcome(cohorts(connection, flowId, "embarked_quantity"), losses);
        long before = destination.total();
        applyCohortDelta(connection, destination.populationId(), outcome.survivors(), 1, tick);
        long after = Math.addExact(before, survivors);
        updateCohorts(connection, flowId, "arrived_quantity", outcome.survivors());
        updateCohorts(connection, flowId, "losses", outcome.losses());
        completeArrivalState(connection, flowId, tick, survivors, losses, false);
        recordPopulationTerm(connection, destination, tick, before, after, survivors, 0,
                "IMMIGRATION", flowId + ":arrival", "Surviving residents disembarked at the destination.");
        projectPopulation(connection, destination.populationId(), tick);
        dockVessel(connection, vessel.vesselId(), flow.destinationLocationId(), tick);
        insertPopulationEvidence(connection, flow, destination, tick, before, after, survivors,
                "IMMIGRATION", "Migration transport arrived");
        insertObservation(connection, flowId + ":arrival", flow.worldId(), tick, destination.populationId(),
                "IMMIGRATION", survivors, "Migration arrived with " + survivors + " survivors and " + losses + " casualties.");
        insertTransition(connection, flowId, flow.worldId(), "IN_TRANSIT", "ARRIVED", tick,
                survivors, losses, 0, "physical-arrival", "Survivors disembarked and casualties were recorded.");
        return result(connection, flowId);
    }

    static FlowResult beginReturn(Connection connection, String flowId, long tick, String reason) throws SQLException {
        requireTick(tick);
        Flow flow = flow(connection, flowId);
        requireStatus(flow, "IN_TRANSIT");
        Vessel vessel = vessel(connection, flow.vesselId());
        try (PreparedStatement updateFlow = connection.prepareStatement(
                     "UPDATE population_flow SET status='RETURNING',return_tick=?,updated_tick=?,"
                             + "summary=summary||' Return: '||? WHERE flow_id=? AND status='IN_TRANSIT'");
             PreparedStatement updateVessel = connection.prepareStatement(
                     "UPDATE npc_vessel SET status='RETURNING',destination_location_id=?,route_progress=0,last_tick=? "
                             + "WHERE npc_vessel_id=? AND status IN ('IN_TRANSIT','WORKING','DISABLED')")) {
            updateFlow.setLong(1, tick);
            updateFlow.setLong(2, tick);
            updateFlow.setString(3, text(reason, "reason", 500));
            updateFlow.setString(4, flowId);
            if (updateFlow.executeUpdate() != 1) throw new SQLException("Population return was not initiated.");
            updateVessel.setString(1, flow.originLocationId());
            updateVessel.setLong(2, tick);
            updateVessel.setString(3, vessel.vesselId());
            if (updateVessel.executeUpdate() != 1) throw new SQLException("Transport could not begin its return.");
        }
        insertTransition(connection, flowId, flow.worldId(), "IN_TRANSIT", "RETURNING", tick,
                flow.embarkedQuantity(), 0, 0, "return-ordered", reason);
        return result(connection, flowId);
    }

    static FlowResult completeReturn(Connection connection, String flowId, long tick, long losses)
            throws SQLException {
        requireTick(tick);
        Flow flow = flow(connection, flowId);
        requireStatus(flow, "RETURNING");
        validateLosses(flow, losses);
        Vessel vessel = vessel(connection, flow.vesselId());
        requireArrivedLeg(connection, vessel, flow.originLocationId(), "RETURN");
        Population origin = population(connection, flow.populationId());
        long survivors = Math.subtractExact(flow.embarkedQuantity(), losses);
        OutcomeAllocation outcome = outcome(cohorts(connection, flowId, "embarked_quantity"), losses);
        long before = origin.total();
        applyCohortDelta(connection, origin.populationId(), outcome.survivors(), 1, tick);
        long after = Math.addExact(before, survivors);
        updateCohorts(connection, flowId, "returned_quantity", outcome.survivors());
        updateCohorts(connection, flowId, "losses", outcome.losses());
        completeArrivalState(connection, flowId, tick, survivors, losses, true);
        recordPopulationTerm(connection, origin, tick, before, after, survivors, 0,
                "RETURN", flowId + ":return", "Surviving residents returned to their origin station.");
        projectPopulation(connection, origin.populationId(), tick);
        dockVessel(connection, vessel.vesselId(), flow.originLocationId(), tick);
        insertPopulationEvidence(connection, flow, origin, tick, before, after, survivors,
                "IMMIGRATION", "Migration transport returned");
        insertTransition(connection, flowId, flow.worldId(), "RETURNING", "ARRIVED", tick,
                survivors, losses, 0, "return-complete", "The surviving population returned to its origin.");
        return result(connection, flowId);
    }

    static FlowResult fail(Connection connection, String flowId, long tick, long losses,
                           long stranded, String reason) throws SQLException {
        requireTick(tick);
        Flow flow = flow(connection, flowId);
        if (!List.of("PREPARING", "IN_TRANSIT", "RETURNING").contains(flow.status())) {
            throw new SQLException("Only an active prepared or travelling flow may fail.");
        }
        long accountable = flow.originReleased() ? flow.embarkedQuantity() : 0;
        if (losses < 0 || stranded < 0 || Math.addExact(losses, stranded) != accountable) {
            throw new SQLException("Failure must account for every person released from the origin.");
        }
        if (flow.originReleased()) {
            EnumMap<Cohort, Long> embarked = cohorts(connection, flowId, "embarked_quantity");
            OutcomeAllocation casualtyAllocation = outcome(embarked, losses);
            updateCohorts(connection, flowId, "losses", casualtyAllocation.losses());
            updateCohorts(connection, flowId, "stranded_quantity", subtract(embarked, casualtyAllocation.losses()));
        }
        try (PreparedStatement update = connection.prepareStatement(
                "UPDATE population_flow SET status='FAILED',reserved_quantity=0,losses=?,stranded_quantity=?,"
                        + "failure_reason=?,updated_tick=? WHERE flow_id=? "
                        + "AND status IN ('PREPARING','IN_TRANSIT','RETURNING')")) {
            update.setLong(1, losses);
            update.setLong(2, stranded);
            update.setString(3, text(reason, "reason", 500));
            update.setLong(4, tick);
            update.setString(5, flowId);
            if (update.executeUpdate() != 1) throw new SQLException("Population flow failure was not applied.");
        }
        if (flow.status().equals("PREPARING")) {
            dockVessel(connection, flow.vesselId(), flow.originLocationId(), tick);
        }
        insertObservation(connection, flowId + ":failed", flow.worldId(), tick, flow.populationId(),
                "DISASTER", losses, "Population transport failed: " + reason + "; casualties=" + losses
                        + "; stranded=" + stranded + ".");
        insertTransition(connection, flowId, flow.worldId(), flow.status(), "FAILED", tick,
                accountable, losses, stranded, "transport-failure", reason);
        return result(connection, flowId);
    }

    static FlowResult cancel(Connection connection, String flowId, long tick, String reason) throws SQLException {
        requireTick(tick);
        Flow flow = flow(connection, flowId);
        if (!List.of("PLANNED", "PREPARING").contains(flow.status()) || flow.originReleased()) {
            throw new SQLException("Only a pre-departure flow may be cancelled.");
        }
        try (PreparedStatement update = connection.prepareStatement(
                "UPDATE population_flow SET status='CANCELLED',reserved_quantity=0,failure_reason=?,updated_tick=? "
                        + "WHERE flow_id=? AND status IN ('PLANNED','PREPARING')")) {
            update.setString(1, text(reason, "reason", 500));
            update.setLong(2, tick);
            update.setString(3, flowId);
            if (update.executeUpdate() != 1) throw new SQLException("Population flow cancellation was not applied.");
        }
        if (flow.status().equals("PREPARING")) dockVessel(connection, flow.vesselId(), flow.originLocationId(), tick);
        insertTransition(connection, flowId, flow.worldId(), flow.status(), "CANCELLED", tick,
                flow.quantity(), 0, 0, "movement-cancelled", reason);
        return result(connection, flowId);
    }

    private static void completeArrivalState(Connection connection, String flowId, long tick,
                                             long survivors, long losses, boolean returned) throws SQLException {
        String quantityColumn = returned ? "returned_quantity" : "arrived_quantity";
        String sql = "UPDATE population_flow SET status='ARRIVED'," + quantityColumn + "=?,losses=?,arrival_tick=?,"
                + "progress_ticks=COALESCE(duration_ticks,progress_ticks),updated_tick=? WHERE flow_id=? "
                + "AND status='" + (returned ? "RETURNING" : "IN_TRANSIT") + "'";
        try (PreparedStatement update = connection.prepareStatement(sql)) {
            update.setLong(1, survivors);
            update.setLong(2, losses);
            update.setLong(3, tick);
            update.setLong(4, tick);
            update.setString(5, flowId);
            if (update.executeUpdate() != 1) throw new SQLException("Population arrival was not applied once.");
        }
    }

    private static <T> T write(WorldPaths world, SqlWork<T> work) throws IOException, SQLException {
        Objects.requireNonNull(world, "world");
        requireDriver();
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

    private static void verifySchema(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COALESCE(MAX(version),0) FROM schema_migration")) {
            int version = result.next() ? result.getInt(1) : 0;
            if (version < 28 || version > WorldStorageContracts.DATABASE_SCHEMA_VERSION) {
                throw new SQLException("Population migration requires schema 028 through "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "; found " + version + ".");
            }
        }
    }

    private static void requireIdleTransport(Population origin, Vessel vessel) throws SQLException {
        if (!vessel.worldId().equals(origin.worldId())
                || !vessel.currentLocationId().equals(origin.locationId())
                || !vessel.status().equals("DOCKED") || vessel.missionId() != null) {
            throw new SQLException("Assigned migration transport is not idle at the origin station.");
        }
    }

    private static void validateLosses(Flow flow, long losses) throws SQLException {
        if (losses < 0 || losses > flow.embarkedQuantity()) {
            throw new SQLException("Migration casualties exceed the embarked population.");
        }
    }

    private static void requireStatus(Flow flow, String expected) throws SQLException {
        if (!flow.status().equals(expected)) {
            throw new SQLException("Population flow " + flow.flowId() + " is " + flow.status()
                    + ", not " + expected + ".");
        }
    }

    static String cause(FlowKind kind, boolean departure) {
        return switch (kind) {
            case REFUGEE_EVACUATION, EMERGENCY_RELOCATION -> "EVACUATION";
            case WORKER_TRANSFER, ORDINARY_MIGRATION -> departure ? "EMIGRATION" : "MIGRATION";
        };
    }

    static void requireTick(long tick) {
        if (tick < 0) throw new IllegalArgumentException("tick must not be negative.");
    }

    static String token(String value, String name) { return text(value, name, 240); }

    static String text(String value, String name, int maximum) {
        Objects.requireNonNull(value, name);
        String result = value.trim();
        if (result.isEmpty() || result.length() > maximum) {
            throw new IllegalArgumentException(name + " is blank or too long.");
        }
        return result;
    }

    static String deterministicId(String seed) {
        return UUID.nameUUIDFromBytes(seed.getBytes(StandardCharsets.UTF_8)).toString();
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

    private static void requireDriver() throws SQLException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) {
            throw new SQLException("SQLite JDBC driver is unavailable.", exception);
        }
    }

    public enum FlowKind { ORDINARY_MIGRATION, WORKER_TRANSFER, REFUGEE_EVACUATION, EMERGENCY_RELOCATION }

    enum Cohort {
        CIVILIANS("civilians"), INDUSTRIAL_WORKERS("industrial_workers"),
        LOGISTICS_WORKERS("logistics_workers"), SECURITY_PERSONNEL("security_personnel"),
        MEDICAL_PERSONNEL("medical_personnel"), SCIENTIFIC_PERSONNEL("scientific_personnel"),
        TEMPORARY_RESIDENTS("temporary_residents"), REFUGEES("refugees");

        private final String column;
        Cohort(String column) { this.column = column; }
        String column() { return column; }
    }

    public record PlanRequest(FlowKind kind, String originPopulationId, String destinationPopulationId,
                              String assignedVesselId, long quantity, long tick, String summary) {
        public PlanRequest {
            Objects.requireNonNull(kind, "kind");
            originPopulationId = token(originPopulationId, "originPopulationId");
            destinationPopulationId = token(destinationPopulationId, "destinationPopulationId");
            assignedVesselId = token(assignedVesselId, "assignedVesselId");
            requireTick(tick);
            summary = text(summary, "summary", 1_000);
        }
    }

    public record FlowResult(String flowId, String status, long quantity, long reserved, long embarked,
                             long arrived, long returned, long losses, long stranded,
                             String transitLegId, long updatedTick) { }

    record Flow(String flowId, String worldId, String populationId, String destinationPopulationId,
                FlowKind kind, String status, long quantity, long embarkedQuantity, boolean originReleased,
                String originLocationId, String destinationLocationId, String originStationId,
                String destinationStationId, String vesselId) { }

    record Vessel(String vesselId, String worldId, String currentLocationId,
                  String destinationLocationId, String missionId, String status) { }

    record TransitLeg(String legId, int durationTicks, int elapsedTicks) { }

    record Population(String populationId, String worldId, String stationId, String locationId,
                      EnumMap<Cohort, Long> cohorts, long housing, long lifeSupport, long employment,
                      int morale, double baselinePerIndex, int populationIndex) {
        long total() {
            long total = 0;
            for (long value : cohorts.values()) total = Math.addExact(total, value);
            return total;
        }

        long workforce() {
            return cohorts.get(Cohort.INDUSTRIAL_WORKERS) + cohorts.get(Cohort.LOGISTICS_WORKERS)
                    + cohorts.get(Cohort.SECURITY_PERSONNEL) + cohorts.get(Cohort.MEDICAL_PERSONNEL)
                    + cohorts.get(Cohort.SCIENTIFIC_PERSONNEL);
        }
    }

    record OutcomeAllocation(EnumMap<Cohort, Long> survivors, EnumMap<Cohort, Long> losses) { }

    @FunctionalInterface
    private interface SqlWork<T> { T run(Connection connection) throws SQLException; }
}
