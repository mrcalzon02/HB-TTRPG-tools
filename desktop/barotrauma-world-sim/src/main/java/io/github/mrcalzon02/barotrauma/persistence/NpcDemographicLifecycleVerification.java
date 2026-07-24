package io.github.mrcalzon02.barotrauma.persistence;

import static io.github.mrcalzon02.barotrauma.persistence.NpcDemographicLifecycleVerificationFixture.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;

/** Milestone 2.2 contract for deterministic capacity-supported NPC demographics. */
public final class NpcDemographicLifecycleVerification {

    private NpcDemographicLifecycleVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-demographic-lifecycle-");
        try {
            String first = runScenario(root.resolve("first.db"));
            String second = runScenario(root.resolve("second.db"));
            require(first.equals(second), "Identical demographic inputs produced different committed results.");
        } finally {
            deleteTree(root);
        }
    }

    private static String runScenario(Path database) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + database)) {
            configure(connection);
            createSchema026Fixture(connection);
            for (String sql : NpcDemographicLifecycleSchema.statements()) execute(connection, sql);

            require(object(connection, "table", "npc_demographic_state"),
                    "Schema 027 is missing demographic hysteresis state.");
            require(object(connection, "table", "npc_demographic_tick_result"),
                    "Schema 027 is missing durable demographic results.");
            require(object(connection, "view", "npc_demographic_tick_plan"),
                    "Schema 027 is missing its single deterministic planner.");
            require(object(connection, "trigger", "npc_demographic_finalize_tick"),
                    "Schema 027 is missing transactional demographic finalization.");
            require(number(connection, "SELECT resident_count FROM station_population_state") == populationTotal(connection),
                    "The station headcount projection was not aligned to the detailed NPC population.");
            require(number(connection, "SELECT baseline_resident_count FROM station_population_state")
                            == populationTotal(connection),
                    "The consolidated projection baseline does not match the detailed population.");

            for (long tick = 43; tick <= 48; tick++) advance(connection, tick);
            require(term(connection, 47, "births") == 0,
                    "Births occurred before sustained support hysteresis was satisfied.");
            require(term(connection, 48, "births") > 0,
                    "Sustained surplus capacity did not produce bounded births.");
            require(term(connection, 48, "deaths") == 0,
                    "A supported birth tick also applied unexplained mortality.");
            require("sustained-capacity-births".equals(text(connection,
                            "SELECT evidence_key FROM npc_demographic_tick_result WHERE tick_sequence=48")),
                    "Birth evidence did not identify sustained capacity support.");
            require(number(connection, "SELECT COUNT(*) FROM station_event WHERE tick_sequence=48 "
                            + "AND event_type='POPULATION'") == 1,
                    "A material birth did not project into station causality.");

            execute(connection, "UPDATE npc_population_state SET housing_capacity=900,"
                    + "life_support_capacity=900,employment_capacity=900 WHERE population_id='" + POPULATION + "'");
            for (long tick = 49; tick <= 51; tick++) advance(connection, tick);
            require(term(connection, 49, "births") == 0 && term(connection, 49, "deaths") == 0,
                    "Initial overcrowding did not suppress births before causing losses.");
            require(term(connection, 50, "deaths") == 0,
                    "Overcrowding mortality ignored its hysteresis delay.");
            require(term(connection, 51, "deaths") > 0,
                    "Sustained overcrowding did not create explicit excess mortality.");
            require("overcrowding-excess-mortality".equals(text(connection,
                            "SELECT evidence_key FROM npc_demographic_tick_result WHERE tick_sequence=51")),
                    "Overcrowding mortality lacks committed causal evidence.");

            execute(connection,
                    "UPDATE npc_population_state SET housing_capacity=1200,life_support_capacity=1300,"
                            + "employment_capacity=1100 WHERE population_id='" + POPULATION + "'",
                    "UPDATE npc_demographic_state SET shortage_pressure_ticks=2,overcrowding_ticks=0 "
                            + "WHERE population_id='" + POPULATION + "'",
                    "UPDATE station_simulation_state SET supplies=12,security=20,integrity=48,threat=80 "
                            + "WHERE station_id='" + STATION + "'",
                    "UPDATE station_civilization_state SET civilization_strength=30,fauna_pressure=70,"
                            + "shortage_ticks=3,surplus_ticks=0,frontier_position=60,frontier_state='CONTESTED' "
                            + "WHERE station_id='" + STATION + "'");
            advance(connection, 52);
            require(term(connection, 52, "deaths") > 0,
                    "Sustained support failure did not create explicit mortality.");
            require("support-failure-excess-mortality".equals(text(connection,
                            "SELECT evidence_key FROM npc_demographic_tick_result WHERE tick_sequence=52")),
                    "Support-failure mortality lacks committed causal evidence.");

            execute(connection,
                    "UPDATE station_simulation_state SET supplies=80,security=10,integrity=90,threat=20 "
                            + "WHERE station_id='" + STATION + "'",
                    "UPDATE station_civilization_state SET civilization_strength=30,fauna_pressure=80,"
                            + "shortage_ticks=0,surplus_ticks=5,frontier_position=60,frontier_state='HOLDING' "
                            + "WHERE station_id='" + STATION + "'");
            advance(connection, 56);
            require(term(connection, 56, "disaster_losses") > 0,
                    "A measured fauna attack did not produce disaster casualties.");
            require(number(connection, "SELECT attack_damage_points FROM npc_demographic_tick_result "
                            + "WHERE tick_sequence=56") > 0,
                    "Fauna casualties were not backed by measured station damage.");
            require("measured-fauna-attack-casualties".equals(text(connection,
                            "SELECT evidence_key FROM npc_demographic_tick_result WHERE tick_sequence=56")),
                    "Attack casualties lack measured causal evidence.");

            require(number(connection, "SELECT COUNT(*) FROM npc_population_ledger WHERE after_total<>"
                    + "before_total+births+immigration+other_gains-deaths-emigration-disaster_losses-other_losses") == 0,
                    "A demographic ledger row violates conservation.");
            require(number(connection, "SELECT COUNT(*) FROM npc_demographic_tick_result WHERE after_total<>"
                    + "before_total+births+immigration-deaths-emigration-disaster_losses-other_losses") == 0,
                    "A demographic result violates conservation.");
            require(number(connection, "SELECT COUNT(*) FROM npc_demographic_tick_result WHERE after_total<>"
                    + "after_civilians+after_industrial_workers+after_logistics_workers+after_security_personnel+"
                    + "after_medical_personnel+after_scientific_personnel+after_temporary_residents+after_refugees") == 0,
                    "A demographic result disagrees with its detailed cohorts.");
            require(number(connection, "SELECT resident_count FROM station_population_state") == populationTotal(connection),
                    "The station headcount projection diverged from detailed cohorts.");
            require(number(connection, "SELECT unexplained_resident_delta FROM station_population_coverage") == 0
                            && number(connection, "SELECT unexplained_workforce_delta FROM station_population_coverage") == 0,
                    "The consolidated station projection contains unexplained population mutation.");

            long populationBeforeRollback = populationTotal(connection);
            long ledgersBeforeRollback = number(connection, "SELECT COUNT(*) FROM npc_population_ledger");
            connection.setAutoCommit(false);
            execute(connection, "INSERT OR REPLACE INTO simulation_transaction_context(world_id,current_canonical) "
                            + "VALUES('" + WORLD + "','2175-01-01T00:57:00Z')",
                    "UPDATE station_simulation_state SET last_tick=57 WHERE station_id='" + STATION + "'");
            connection.rollback();
            connection.setAutoCommit(true);
            require(populationTotal(connection) == populationBeforeRollback
                            && number(connection, "SELECT COUNT(*) FROM npc_population_ledger") == ledgersBeforeRollback,
                    "A rolled-back demographic tick survived transaction rollback.");
            require(number(connection, "SELECT COUNT(*) FROM pragma_foreign_key_check") == 0,
                    "Schema 027 created foreign-key violations.");

            return text(connection, "SELECT group_concat(tick_sequence||':'||births||':'||deaths||':'||"
                    + "immigration||':'||emigration||':'||disaster_losses||':'||other_losses||':'||after_total||':'||"
                    + "support_score||':'||pressure_score,'|') "
                    + "FROM (SELECT * FROM npc_demographic_tick_result ORDER BY tick_sequence)");
        }
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Schema 027 deterministic capacity-supported births, mortality, migration, morale, overcrowding hysteresis, station projection, evidence, conservation, and rollback passed.");
    }
}
