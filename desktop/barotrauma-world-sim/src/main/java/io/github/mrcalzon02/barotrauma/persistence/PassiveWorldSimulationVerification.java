package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument;
import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument.WorldDocument;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ImportPlan;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock;
import io.github.mrcalzon02.barotrauma.simulation.NpcTransitScheduleEngine;
import io.github.mrcalzon02.barotrauma.simulation.PassiveWorldSimulationService;
import io.github.mrcalzon02.barotrauma.simulation.SimulationCommandExecutor;
import io.github.mrcalzon02.barotrauma.simulation.TransitResolutionEngine;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.util.Comparator;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/** End-to-end contract for passive station, mission, NPC-vessel, migration, research, and encounter workloads. */
public final class PassiveWorldSimulationVerification {
    private static final String MIGRATION_VESSEL = "98000000-0000-0000-0000-000000000099";
    private static final String ROLLBACK_VESSEL = "98000000-0000-0000-0000-000000000100";

    private PassiveWorldSimulationVerification() { }

    public static void verifyContract() throws Exception {
        TransitResolutionEngine.verifyContract();
        NpcTransitScheduleEngine.verifyContract();
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-passive-world-");
        try {
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Passive Europa",
                    UUID.fromString("98000000-0000-0000-0000-000000000001"));
            String fixture = """
                    {"version":22,"exportedAt":"2026-07-17T20:00:00Z","masterWorldId":"PASSIVE-WORLD",
                    "worldEconomyVersion":"1.0.0","worldStateSchemaVersion":"2.2.0","state":{
                    "world":{"canonicalTime":"2175-01-01T00:00:00Z","realEpoch":"2026-06-20T08:00:00Z",
                    "map":{"rings":48,"shellRadius":7008,"nodes":[
                    {"id":"station-a","name":"Alpha Station","ring":48,"level":1,"type":"station","x":10,"y":20},
                    {"id":"station-b","name":"Beta Station","ring":42,"level":3,"type":"station","x":80,"y":40},
                    {"id":"station-c","name":"Gamma Station","ring":34,"level":5,"type":"station","x":150,"y":90},
                    {"id":"station-d","name":"Delta Station","ring":26,"level":7,"type":"station","x":220,"y":120},
                    {"id":"route-a","name":"Abyssal Route","ring":18,"level":8,"type":"location","x":300,"y":180}]}},
                    "worldEconomy":{"vessels":{},"stationEconomies":{"station-a":{},"station-b":{},
                    "station-c":{},"station-d":{}},"simulation":{"tickSequence":12,
                    "lastSimulatedAt":"2175-01-01T00:00:00Z"}},
                    "submarine":{"name":"Observer","model":"Barsuk","crewRoster":[]}}}
                    """;
            importFixture(paths, fixture);

            SimulationCheckpointStore.RecoveryState recovery = SimulationCheckpointStore.load(
                    paths, Duration.ofMinutes(1));
            try (SimulationCommandExecutor executor = new SimulationCommandExecutor(
                    DeterministicSimulationClock.restore(recovery.snapshot()),
                    "passive-contract-writer", recovery.lastExecutionSequence())) {
                var enabled = executor.submit(new SimulationCommandExecutor.Enable(), "passive-test").join();
                SimulationCheckpointStore.persist(paths, enabled, "Enable passive contract world");
                var first = executor.submit(new SimulationCommandExecutor.Step(1), "passive-test").join();
                PassiveWorldTickTransaction.TickResult firstResult = PassiveWorldTickTransaction.commit(paths, first);
                require(firstResult.stationUpdates() == 4, "Passive station economy did not process every station.");
                require(firstResult.missionsCreated() > 0 && firstResult.missionsAssigned() > 0,
                        "Passive mission creation or assignment failed.");
                require(count(paths, "station_simulation_state") == 4,
                        "Passive station state initialization failed.");
                require(count(paths, "station_civilization_state") == 4,
                        "Passive civilization state initialization failed.");
                require(count(paths, "station_consumption_log") == 4,
                        "First passive tick did not consume station supplies.");
                require(count(paths, "npc_vessel") >= 4, "Passive NPC vessel initialization failed.");
                require(count(paths, "npc_voyage_log") > 0, "Passive voyage assignment/departure logs are missing.");
                require(count(paths, "npc_transit_leg") > 0
                                && count(paths, "npc_transit_incident_schedule") > count(paths, "npc_transit_leg"),
                        "Departed NPC vessels were not immediately given observable time-gated plans.");

                configureMigrationPressure(paths, MIGRATION_VESSEL);
                long originBeforeDeparture = pressuredOriginPopulation(paths);
                var second = executor.submit(new SimulationCommandExecutor.Step(1), "passive-test").join();
                PassiveWorldTickTransaction.TickResult secondResult = PassiveWorldTickTransaction.commit(paths, second);
                require(secondResult.encountersResolved() == 0 && count(paths, "world_encounter") == 0,
                        "A routine elapsed-time progress tick incorrectly manufactured a transit incident.");
                require(queryCount(paths, "SELECT COUNT(*) FROM npc_transit_leg WHERE elapsed_ticks=1") > 0,
                        "Routine NPC travel did not advance elapsed progress before the first incident.");
                require(flowCount(paths, MIGRATION_VESSEL, "PREPARING") == 1,
                        "A real passive tick did not plan and reserve the pressured population migration.");
                require(pressuredOriginPopulation(paths) == originBeforeDeparture,
                        "Passive migration preparation removed people before physical vessel departure.");
                verifySchedulePlanning(paths);
                require(count(paths, "world_mission") > 0 && count(paths, "station_research_project") == 4,
                        "Mission or research workload persistence failed.");
                require(count(paths, "station_inventory")
                                == count(paths, "station_simulation_state") * count(paths, "item_catalogue"),
                        "Current-schema station inventory did not follow the passive cycle.");
                require(count(paths, "station_consumption_log") == 8,
                        "Second passive tick did not append station consumption history.");

                long encountersBeforeDueTick = count(paths, "world_encounter");
                var third = executor.submit(new SimulationCommandExecutor.Step(1), "passive-test").join();
                PassiveWorldTickTransaction.TickResult thirdResult = PassiveWorldTickTransaction.commit(paths, third);
                require(thirdResult.encountersResolved() > 0,
                        "The first due player-equivalent incident slots were not auto-resolved.");
                require(count(paths, "world_encounter") - encountersBeforeDueTick == thirdResult.encountersResolved(),
                        "Due-slot encounter evidence does not match the passive tick result.");
                require(flowCount(paths, MIGRATION_VESSEL, "IN_TRANSIT") == 1,
                        "The next passive tick did not synchronize physical migration departure.");
                require(pressuredOriginPopulation(paths) < originBeforeDeparture,
                        "Physical migration departure did not release its exact cohort from the origin.");
                require(queryCount(paths, "SELECT COUNT(*) FROM npc_transit_leg WHERE npc_vessel_id='"
                                + MIGRATION_VESSEL + "' AND leg_type='OUTBOUND' AND status='IN_TRANSIT'") == 1,
                        "Passive migration departure did not use the authoritative NPC transit leg.");
                verifyResolvedIncidentEvidence(paths);
                require(queryCount(paths, "SELECT COUNT(*) FROM world_mission m JOIN npc_vessel v "
                                + "ON v.npc_vessel_id=m.assigned_npc_vessel_id WHERE "
                                + "m.status IN ('ASSIGNED','ACTIVE') AND v.status IN ('DISABLED','LOST')") == 0,
                        "A terminal NPC transit casualty left an assigned mission active.");
                require(count(paths, "station_consumption_log") == 12,
                        "Third passive tick did not append station consumption history.");
                require(schemaVersion(paths) == WorldStorageContracts.DATABASE_SCHEMA_VERSION,
                        "Passive fixture was not stored under the current database schema.");

                relieveMigrationOriginPressure(paths);
                advanceMigrationToArrival(paths, executor, MIGRATION_VESSEL);
                long arrivedQuantity = flowQuantity(paths, MIGRATION_VESSEL, "arrived_quantity");
                require(arrivedQuantity > 0, "Terminal passive migration recorded no arrived population.");
                String arrivalEvidence = "(SELECT flow_id||':arrival' FROM population_flow WHERE "
                        + "assigned_npc_vessel_id='" + MIGRATION_VESSEL + "')";
                require(queryCount(paths, "SELECT COUNT(*) FROM npc_population_ledger WHERE primary_cause='IMMIGRATION' "
                                + "AND evidence_key=" + arrivalEvidence) == 1,
                        "Terminal passive migration did not write one destination immigration ledger term.");
                require(queryCount(paths, "SELECT immigration FROM npc_population_ledger WHERE primary_cause='IMMIGRATION' "
                                + "AND evidence_key=" + arrivalEvidence) == arrivedQuantity,
                        "Terminal passive migration ledger did not credit the exact arrived cohort.");
                require(queryCount(paths, "SELECT after_total-(before_total+births-deaths+immigration-emigration-"
                                + "disaster_losses+other_gains-other_losses) FROM npc_population_ledger "
                                + "WHERE primary_cause='IMMIGRATION' AND evidence_key=" + arrivalEvidence) == 0,
                        "Terminal passive migration ledger does not conserve all same-tick population terms.");
                long destinationAfterArrival = queryCount(paths, "SELECT after_total FROM npc_population_ledger "
                        + "WHERE primary_cause='IMMIGRATION' AND evidence_key=" + arrivalEvidence);
                require(migrationDestinationPopulation(paths, MIGRATION_VESSEL) == destinationAfterArrival,
                        "Destination population does not match the terminal immigration ledger state.");
            }

            long tickBeforeScheduler = SimulationCheckpointStore.load(paths, Duration.ofMinutes(1))
                    .snapshot().tickSequence();
            CountDownLatch automaticCycle = new CountDownLatch(1);
            PassiveWorldSimulationService service = PassiveWorldSimulationService.enable(
                    paths, Duration.ofSeconds(1), 1);
            try (AutoCloseable ignored = service.addListener(status -> {
                if (status.lastResult() != null && status.lastResult().tickSequence() > tickBeforeScheduler) {
                    automaticCycle.countDown();
                }
            }, true)) {
                require(automaticCycle.await(10, TimeUnit.SECONDS),
                        "Automatic passive scheduler did not commit a timed world cycle.");
                require(service.status().fault() == null && service.status().lastResult() != null,
                        "Automatic passive scheduler faulted during its contract cycle.");
            } finally {
                PassiveWorldSimulationService.disable(paths);
            }
            require(!PassiveWorldSimulationService.configuration(paths).enabled(),
                    "Disabling Passive Mode did not persist the disabled configuration.");
            require(SimulationCheckpointStore.load(paths, Duration.ofMinutes(1)).snapshot().tickSequence()
                            > tickBeforeScheduler,
                    "Automatic passive cycle did not advance the durable world clock.");

            verifyMigrationRollback(root.resolve("rollback-world"), fixture);
        } finally {
            try (var stream = Files.walk(root)) {
                for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    private static void importFixture(WorldPaths paths, String fixture) throws Exception {
        WorldDocument document = WebSuiteV22WorldDocument.inspect(
                fixture.getBytes(StandardCharsets.UTF_8), "passive-world.json");
        ImportPlan plan;
        try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
            plan = store.inspectAndPlan(document.inspection());
        }
        WebWorldV22ImportTransaction.commit(paths, new WebWorldV22ImportTransaction.ImportRequest(
                plan.artifactId(), plan.artifact().artifactIdentity().digest(), "passive-test", document));
    }

    private static void verifyMigrationRollback(Path rollbackRoot, String fixture) throws Exception {
        WorldPaths paths = WorldStorageContracts.createWorld(rollbackRoot, "Passive Rollback Europa",
                UUID.fromString("98000000-0000-0000-0000-000000000002"));
        importFixture(paths, fixture);
        SimulationCheckpointStore.RecoveryState recovery = SimulationCheckpointStore.load(
                paths, Duration.ofMinutes(1));
        try (SimulationCommandExecutor executor = new SimulationCommandExecutor(
                DeterministicSimulationClock.restore(recovery.snapshot()),
                "passive-rollback-writer", recovery.lastExecutionSequence())) {
            var enabled = executor.submit(new SimulationCommandExecutor.Enable(), "passive-rollback-test").join();
            SimulationCheckpointStore.persist(paths, enabled, "Enable passive rollback contract world");
            var initialized = executor.submit(new SimulationCommandExecutor.Step(1), "passive-rollback-test").join();
            PassiveWorldTickTransaction.commit(paths, initialized);

            configureMigrationPressure(paths, ROLLBACK_VESSEL);
            long originPopulation = pressuredOriginPopulation(paths);
            var planned = executor.submit(new SimulationCommandExecutor.Step(1), "passive-rollback-test").join();
            PassiveWorldTickTransaction.commit(paths, planned);
            String rollbackVesselId = queryText(paths,
                    "SELECT assigned_npc_vessel_id FROM population_flow WHERE entity_type='NPC_POPULATION' "
                            + "AND status='PREPARING' AND population_id=(SELECT population_id "
                            + "FROM npc_population_state ORDER BY population_id LIMIT 1) "
                            + "ORDER BY created_tick DESC,flow_id DESC LIMIT 1");
            require(flowCount(paths, rollbackVesselId, "PREPARING") == 1,
                    "Rollback probe migration did not enter preparation in the isolated world.");
            require(pressuredOriginPopulation(paths) == originPopulation,
                    "Rollback probe preparation removed residents before physical departure.");

            long rollbackLegCount = queryCount(paths, "SELECT COUNT(*) FROM npc_transit_leg WHERE npc_vessel_id='"
                    + rollbackVesselId + "'");
            long rollbackLedgerCount = queryCount(paths, "SELECT COUNT(*) FROM npc_population_ledger");
            long rollbackClockTick = queryCount(paths,
                    "SELECT current_tick_sequence FROM world_simulation_metadata LIMIT 1");
            installRollbackProbe(paths);
            var rollbackReceipt = executor.submit(new SimulationCommandExecutor.Step(1), "passive-rollback-test").join();
            boolean rollbackBlocked = false;
            try {
                PassiveWorldTickTransaction.commit(paths, rollbackReceipt);
            } catch (SQLException expected) {
                rollbackBlocked = expected.getMessage() != null
                        && expected.getMessage().contains("Passive migration rollback probe");
            } finally {
                removeRollbackProbe(paths);
            }
            require(rollbackBlocked, "The deliberate post-migration passive transaction fault was not observed.");
            require(flowCount(paths, rollbackVesselId, "PREPARING") == 1,
                    "Failed passive transaction did not restore the migration flow to preparation.");
            require(vesselStatus(paths, rollbackVesselId).equals("PREPARING"),
                    "Failed passive transaction did not restore the migration vessel state.");
            require(pressuredOriginPopulation(paths) == originPopulation,
                    "Failed passive transaction did not restore the released origin population.");
            require(queryCount(paths, "SELECT COUNT(*) FROM npc_transit_leg WHERE npc_vessel_id='"
                            + rollbackVesselId + "'") == rollbackLegCount,
                    "Failed passive transaction retained a migration transit leg created before rollback.");
            require(queryCount(paths, "SELECT COUNT(*) FROM npc_population_ledger") == rollbackLedgerCount,
                    "Failed passive transaction retained migration ledger evidence.");
            require(queryCount(paths, "SELECT current_tick_sequence FROM world_simulation_metadata LIMIT 1")
                            == rollbackClockTick,
                    "Failed passive transaction advanced the durable world clock.");
        }
    }

    private static void configureMigrationPressure(WorldPaths paths, String vesselId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("UPDATE station_simulation_state SET integrity=20,threat=90,status='BESIEGED',"
                    + "supplies=20 WHERE station_id=(SELECT station_id FROM npc_population_state ORDER BY population_id LIMIT 1)");
            statement.executeUpdate("UPDATE npc_population_state SET morale=25 WHERE population_id="
                    + "(SELECT population_id FROM npc_population_state ORDER BY population_id LIMIT 1)");
            statement.executeUpdate("UPDATE npc_population_state SET housing_capacity=5000,life_support_capacity=5000,"
                    + "employment_capacity=5000 WHERE population_id<>(SELECT population_id FROM npc_population_state "
                    + "ORDER BY population_id LIMIT 1)");
            statement.executeUpdate("INSERT INTO npc_vessel(npc_vessel_id,world_id,display_name,role,home_station_id,"
                    + "current_location_id,status,hull,supplies,cargo,crew_quality,navigation,engineering,combat,mining,"
                    + "research,route_progress,route_ticks_required,deterministic_seed,last_tick) SELECT '"
                    + vesselId + "',p.world_id,'Migration Reserve','COURIER',p.station_id,ws.location_id,"
                    + "'DOCKED',100,100,0,100,100,100,100,100,100,0,1,980099,13 FROM npc_population_state p "
                    + "JOIN world_station ws ON ws.station_id=p.station_id ORDER BY p.population_id LIMIT 1");
        }
    }

    private static void relieveMigrationOriginPressure(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("UPDATE station_simulation_state SET integrity=100,threat=0,status='STABLE',"
                    + "supplies=150 WHERE station_id=(SELECT station_id FROM npc_population_state ORDER BY population_id LIMIT 1)");
            statement.executeUpdate("UPDATE npc_population_state SET morale=90 WHERE population_id="
                    + "(SELECT population_id FROM npc_population_state ORDER BY population_id LIMIT 1)");
        }
    }

    private static void advanceMigrationToArrival(WorldPaths paths, SimulationCommandExecutor executor,
                                                   String vesselId) throws Exception {
        for (int tick = 0; tick < 250 && !"ARRIVED".equals(migrationStatus(paths, vesselId)); tick++) {
            String status = migrationStatus(paths, vesselId);
            require(!status.equals("FAILED") && !status.equals("CANCELLED"),
                    "Passive migration terminated before destination settlement: " + status);
            var step = executor.submit(new SimulationCommandExecutor.Step(1), "passive-test").join();
            PassiveWorldTickTransaction.commit(paths, step);
        }
        require("ARRIVED".equals(migrationStatus(paths, vesselId)),
                "Passive migration did not reach terminal arrival within the bounded transit window.");
    }

    private static void installRollbackProbe(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement()) {
            statement.execute("CREATE TRIGGER passive_migration_rollback_probe BEFORE UPDATE ON "
                    + "station_research_project BEGIN SELECT RAISE(ABORT,'Passive migration rollback probe'); END");
        }
    }

    private static void removeRollbackProbe(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement()) {
            statement.execute("DROP TRIGGER IF EXISTS passive_migration_rollback_probe");
        }
    }

    private static long flowCount(WorldPaths paths, String vesselId, String status) throws Exception {
        return queryCount(paths, "SELECT COUNT(*) FROM population_flow WHERE entity_type='NPC_POPULATION' "
                + "AND status='" + status + "' AND assigned_npc_vessel_id='" + vesselId + "'");
    }

    private static long flowQuantity(WorldPaths paths, String vesselId, String column) throws Exception {
        if (!java.util.Set.of("arrived_quantity", "returned_quantity", "losses").contains(column)) {
            throw new IllegalArgumentException("Unsupported migration quantity column.");
        }
        return queryCount(paths, "SELECT " + column + " FROM population_flow WHERE entity_type='NPC_POPULATION' "
                + "AND assigned_npc_vessel_id='" + vesselId + "'");
    }

    private static String migrationStatus(WorldPaths paths, String vesselId) throws Exception {
        return queryText(paths, "SELECT status FROM population_flow WHERE entity_type='NPC_POPULATION' "
                + "AND assigned_npc_vessel_id='" + vesselId + "'");
    }

    private static String vesselStatus(WorldPaths paths, String vesselId) throws Exception {
        return queryText(paths, "SELECT status FROM npc_vessel WHERE npc_vessel_id='" + vesselId + "'");
    }

    private static long pressuredOriginPopulation(WorldPaths paths) throws Exception {
        return queryCount(paths, "SELECT civilians+industrial_workers+logistics_workers+security_personnel+"
                + "medical_personnel+scientific_personnel+temporary_residents+refugees FROM npc_population_state "
                + "ORDER BY population_id LIMIT 1");
    }

    private static long migrationDestinationPopulation(WorldPaths paths, String vesselId) throws Exception {
        return queryCount(paths, "SELECT civilians+industrial_workers+logistics_workers+security_personnel+"
                + "medical_personnel+scientific_personnel+temporary_residents+refugees FROM npc_population_state "
                + "WHERE population_id=(SELECT destination_population_id FROM population_flow WHERE "
                + "entity_type='NPC_POPULATION' AND assigned_npc_vessel_id='" + vesselId + "')");
    }

    private static long count(WorldPaths paths, String table) throws Exception {
        if (!java.util.Set.of("station_simulation_state", "station_civilization_state",
                "station_consumption_log", "npc_vessel", "npc_voyage_log", "population_flow",
                "world_encounter", "world_mission", "station_research_project", "station_inventory",
                "item_catalogue", "npc_transit_leg", "npc_transit_incident_schedule").contains(table)) {
            throw new IllegalArgumentException("Unsupported passive verification table.");
        }
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            return result.next() ? result.getLong(1) : 0;
        }
    }

    private static long queryCount(WorldPaths paths, String sql) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery(sql)) {
            return result.next() ? result.getLong(1) : 0;
        }
    }

    private static String queryText(WorldPaths paths, String sql) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new IllegalStateException("No row returned: " + sql);
            return result.getString(1);
        }
    }

    private static void verifySchedulePlanning(WorldPaths paths) throws Exception {
        require(queryCount(paths, "SELECT COUNT(*) FROM npc_transit_leg l WHERE "
                        + "base_duration_ticks<>player_equivalent_incident_count*"
                        + NpcTransitScheduleEngine.ELAPSED_TICKS_PER_PLAYER_CHALLENGE) == 0,
                "NPC elapsed duration is not separate from the player-equivalent incident budget.");
        require(queryCount(paths, "SELECT COUNT(*) FROM npc_transit_leg l WHERE "
                        + "player_equivalent_incident_count<>(SELECT COUNT(*) "
                        + "FROM npc_transit_incident_schedule s WHERE s.leg_id=l.leg_id)") == 0,
                "NPC transit incident schedule rows do not equal the persisted player-equivalent budget.");
        require(queryCount(paths, "SELECT COUNT(*) FROM npc_transit_incident_schedule "
                        + "WHERE status<>'PENDING' OR encounter_id IS NOT NULL") == 0,
                "An NPC incident slot resolved before its persisted due time.");
    }

    private static void verifyResolvedIncidentEvidence(WorldPaths paths) throws Exception {
        long resolved = queryCount(paths, "SELECT COUNT(*) FROM npc_transit_incident_schedule "
                + "WHERE status='RESOLVED'");
        require(resolved == count(paths, "world_encounter"),
                "Resolved NPC incident slots do not reconcile with world encounters.");
        require(resolved == queryCount(paths, "SELECT COUNT(*) FROM npc_voyage_log "
                        + "WHERE event_type='TRANSIT_INCIDENT'"),
                "Resolved NPC incident slots do not reconcile with voyage incident logs.");
        require(queryCount(paths, "SELECT COUNT(*) FROM npc_transit_incident_schedule "
                        + "WHERE status='RESOLVED' AND (encounter_id IS NULL OR voyage_log_id IS NULL)") == 0,
                "A resolved NPC incident slot is missing its encounter or voyage-log link.");
        require(queryCount(paths, "SELECT COUNT(*) FROM npc_transit_leg l WHERE "
                        + "incidents_resolved<>(SELECT COUNT(*) FROM npc_transit_incident_schedule s "
                        + "WHERE s.leg_id=l.leg_id AND s.status='RESOLVED') OR "
                        + "cumulative_delay_ticks<>COALESCE((SELECT SUM(s.added_delay_ticks) "
                        + "FROM npc_transit_incident_schedule s WHERE s.leg_id=l.leg_id AND s.status='RESOLVED'),0) "
                        + "OR scheduled_arrival_tick<>started_tick+base_duration_ticks+cumulative_delay_ticks") == 0,
                "NPC incident consequences do not reconcile with resolved counts or the revised arrival tick.");
    }

    private static int schemaVersion(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT MAX(version) FROM schema_migration")) {
            return result.next() ? result.getInt(1) : 0;
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Barotrauma passive world simulation, migration settlement and rollback, station consumption, and automatic scheduler contracts passed.");
    }
}
