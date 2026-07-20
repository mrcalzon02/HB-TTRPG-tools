package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldLock;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.util.Comparator;
import java.util.UUID;
import java.util.stream.Stream;

/** Executable schema-017 integrity, rollback, and read-model verification. */
public final class StationCausalityVerification {
    private StationCausalityVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-station-causality-");
        UUID worldId = UUID.fromString("a5000000-0000-0000-0000-000000000001");
        UUID locationId = UUID.fromString("a5000000-0000-0000-0000-000000000002");
        UUID stationId = UUID.fromString("a5000000-0000-0000-0000-000000000003");
        try {
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Causal Europa", worldId);
            try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths)) {
                try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
                     Statement statement = connection.createStatement()) {
                    statement.execute("PRAGMA foreign_keys=ON");
                    statement.executeUpdate("INSERT INTO world_metadata(world_id,display_name,created_at) VALUES ('"
                            + worldId + "','Causal Europa','" + Instant.parse("2026-07-19T00:00:00Z") + "')");
                    statement.executeUpdate("INSERT INTO world_location(location_id,world_id,source_location_id,source_ordinal,display_name,is_station) VALUES ('"
                            + locationId + "','" + worldId + "','causal-location',1,'Ledger Station',1)");
                    statement.executeUpdate("INSERT INTO world_station(station_id,world_id,location_id,source_station_id,display_name,has_economy) VALUES ('"
                            + stationId + "','" + worldId + "','" + locationId + "','causal-station','Ledger Station',1)");

                    statement.executeUpdate("INSERT INTO station_event(event_id,world_id,station_id,tick_sequence,canonical_time,event_type,severity,headline,narrative,actor_type,actor_id,cause_type,cause_id,deterministic_key,visibility,correlation_id,policy_version,created_at) VALUES ('event-consumption','"
                            + worldId + "','" + stationId + "',12,'2175-01-01T12:00:00Z','CONSUMPTION',1,'Residents consumed rations','Routine resident demand consumed twelve ration units.','SYSTEM','passive-cycle','SIMULATION_TICK','12','consumption:12','OBSERVED','tick:12',1,'2026-07-19T00:00:00Z')");
                    statement.executeUpdate("INSERT INTO station_change(change_id,event_id,statistic_key,value_type,previous_value,delta_value,resulting_value,unit,reason_code,affected_type,affected_id) VALUES ('change-rations','event-consumption','inventory.rations','INTEGER',100,-12,88,'units','RESIDENT_CONSUMPTION','ITEM','item-rations')");

                    statement.executeUpdate("INSERT INTO station_event(event_id,world_id,station_id,tick_sequence,event_type,severity,headline,narrative,cause_type,deterministic_key,visibility,correlation_id,policy_version,created_at) VALUES ('event-population','"
                            + worldId + "','" + stationId + "',13,'POPULATION',2,'Refugees arrived','A relief convoy delivered twenty refugees to the station.','FREIGHT_DELIVERY','population:13','OBSERVED','tick:13',1,'2026-07-19T00:00:00Z')");
                    statement.executeUpdate("INSERT INTO station_population_event(population_event_id,event_id,population_category,people_before,people_delta,people_after,workforce_delta) VALUES ('population-13','event-population','REFUGEES',800,20,820,8)");

                    statement.executeUpdate("INSERT INTO faction_plan(plan_id,world_id,sponsor_faction,target_station_id,objective,phase,status,created_tick,updated_tick,due_tick,credits_required,credits_reserved,credits_spent,personnel_required,personnel_reserved,equipment_required,equipment_reserved) VALUES ('plan-relief','"
                            + worldId + "','Europa Coalition','" + stationId + "','Stabilize ration supply','PREPARATION','ACTIVE',13,13,20,5000,3000,0,10,4,20,8)");

                    boolean legacyPlanAdvanceRejected = false;
                    try {
                        statement.executeUpdate("UPDATE faction_plan SET phase='EXECUTION',updated_tick=14 "
                                + "WHERE plan_id='plan-relief'");
                    } catch (SQLException expected) { legacyPlanAdvanceRejected = true; }
                    require(legacyPlanAdvanceRejected,
                            "A legacy plan advanced without allocation-backed credits, personnel, and equipment.");

                    boolean arithmeticRejected = false;
                    try {
                        statement.executeUpdate("INSERT INTO station_change(change_id,event_id,statistic_key,value_type,previous_value,delta_value,resulting_value,unit,reason_code) VALUES ('bad-change','event-consumption','supplies','INTEGER',10,-2,9,'units','RESIDENT_CONSUMPTION')");
                    } catch (SQLException expected) { arithmeticRejected = true; }
                    require(arithmeticRejected, "Inconsistent before/delta/after arithmetic was accepted.");

                    long beforeRollback = count(statement, "station_event");
                    connection.setAutoCommit(false);
                    statement.executeUpdate("INSERT INTO station_event(event_id,world_id,station_id,tick_sequence,event_type,severity,headline,narrative,cause_type,deterministic_key,visibility,correlation_id,policy_version,created_at) VALUES ('rolled-back','"
                            + worldId + "','" + stationId + "',14,'ACCIDENT',3,'Rolled back accident','This event must not survive rollback.','TEST','rollback:14','OBSERVED','tick:14',1,'2026-07-19T00:00:00Z')");
                    connection.rollback();
                    connection.setAutoCommit(true);
                    require(count(statement, "station_event") == beforeRollback, "Rolled-back station event survived.");
                }

                StationHistoryRegistry.Snapshot snapshot = StationHistoryRegistry.load(paths, stationId, 100);
                require(snapshot.events().size() == 2, "Station history did not return causal events.");
                require(snapshot.changes().size() == 1, "Station history did not return typed changes.");
                require(snapshot.populationEvents().size() == 1, "Station history did not return population events.");
                require(snapshot.factionPlans().size() == 1, "Station history did not return faction plans.");
                require(snapshot.factionPlans().get(0).backingStatus().equals("LEGACY_UNBACKED"),
                        "Station history did not expose an unbacked legacy faction plan honestly.");
            }
        } finally {
            try (Stream<Path> stream = Files.walk(root)) {
                for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    private static long count(Statement statement, String table) throws SQLException {
        if (!table.equals("station_event")) throw new IllegalArgumentException("Unsupported verification table.");
        try (ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            return result.next() ? result.getLong(1) : 0;
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }
}
