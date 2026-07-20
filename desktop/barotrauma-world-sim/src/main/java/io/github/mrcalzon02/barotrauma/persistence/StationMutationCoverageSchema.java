package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema 025: command-scoped mutation coverage and enforceable explanation policies. */
public final class StationMutationCoverageSchema {
    private StationMutationCoverageSchema() { }

    public static List<String> statements() {
        return List.of(
                """
                CREATE TABLE station_explanation_policy (
                    policy_version INTEGER NOT NULL CHECK(policy_version > 0),
                    statistic_key TEXT NOT NULL,
                    enforcement TEXT NOT NULL CHECK(enforcement IN ('ENFORCE','REPORT_ONLY')),
                    active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1)),
                    rationale TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    PRIMARY KEY(policy_version,statistic_key)
                )
                """,
                "CREATE UNIQUE INDEX active_station_explanation_policy ON station_explanation_policy(statistic_key) WHERE active=1",
                """
                INSERT INTO station_explanation_policy(
                    policy_version,statistic_key,enforcement,active,rationale,created_at)
                VALUES
                    (1,'population.residents','ENFORCE',1,
                     'Authoritative resident headcount changes require exact population evidence.',
                     '2026-07-19T00:00:00Z'),
                    (1,'population.workforce','ENFORCE',1,
                     'Authoritative workforce headcount changes require exact population evidence.',
                     '2026-07-19T00:00:00Z')
                """,

                """
                CREATE TABLE station_mutation_coverage (
                    command_id TEXT NOT NULL,
                    station_id TEXT NOT NULL,
                    tick_sequence INTEGER NOT NULL CHECK(tick_sequence >= 0),
                    statistic_key TEXT NOT NULL,
                    previous_value REAL NOT NULL,
                    delta_value REAL NOT NULL,
                    resulting_value REAL NOT NULL,
                    minimum_observed_state_tick INTEGER NOT NULL CHECK(minimum_observed_state_tick >= 0),
                    maximum_observed_state_tick INTEGER NOT NULL
                        CHECK(maximum_observed_state_tick >= minimum_observed_state_tick),
                    mutation_count INTEGER NOT NULL CHECK(mutation_count > 0),
                    PRIMARY KEY(command_id,station_id,tick_sequence,statistic_key),
                    CHECK(abs((previous_value+delta_value)-resulting_value)<0.000001),
                    FOREIGN KEY(command_id) REFERENCES simulation_command_receipt(command_id),
                    FOREIGN KEY(station_id) REFERENCES world_station(station_id)
                )
                """,
                "CREATE INDEX station_mutation_tick_index ON station_mutation_coverage(station_id,tick_sequence,statistic_key)",

                populationTrigger("residents", "resident_count", "population.residents"),
                populationTrigger("workforce", "workforce_count", "population.workforce"),

                """
                CREATE VIEW station_mutation_explanation AS
                SELECT m.command_id,m.station_id,m.tick_sequence,m.statistic_key,m.previous_value,
                       m.delta_value,m.resulting_value,m.mutation_count,p.policy_version,p.enforcement,
                       COUNT(c.change_id) explanation_count,COALESCE(SUM(c.delta_value),0) explained_delta,
                       CASE
                         WHEN COUNT(c.change_id)=0 THEN 'MISSING_EXPLANATION'
                         WHEN ABS(COALESCE(SUM(c.delta_value),0)-m.delta_value)>=0.000001 THEN 'DELTA_MISMATCH'
                         WHEN ABS((m.previous_value+COALESCE(SUM(c.delta_value),0))-m.resulting_value)>=0.000001
                           THEN 'RESULT_MISMATCH'
                         ELSE 'EXPLAINED' END coverage_status
                FROM station_mutation_coverage m
                JOIN station_explanation_policy p ON p.statistic_key=m.statistic_key AND p.active=1
                LEFT JOIN station_event_command_source src ON src.command_id=m.command_id
                    AND src.linked_tick=m.tick_sequence
                LEFT JOIN station_event e ON e.event_id=src.event_id AND e.station_id=m.station_id
                LEFT JOIN station_change c ON c.event_id=e.event_id AND c.statistic_key=m.statistic_key
                GROUP BY m.command_id,m.station_id,m.tick_sequence,m.statistic_key
                """,

                """
                CREATE VIEW unexplained_station_mutation AS
                SELECT * FROM station_mutation_explanation WHERE coverage_status<>'EXPLAINED'
                """,

                """
                CREATE VIEW misaligned_station_mutation AS
                SELECT m.command_id,m.station_id,m.tick_sequence,m.statistic_key,
                       m.minimum_observed_state_tick,m.maximum_observed_state_tick,m.mutation_count
                FROM station_mutation_coverage m
                JOIN station_explanation_policy p
                  ON p.statistic_key=m.statistic_key AND p.active=1 AND p.enforcement='ENFORCE'
                WHERE m.minimum_observed_state_tick<>m.tick_sequence
                   OR m.maximum_observed_state_tick<>m.tick_sequence
                """
        );
    }

    private static String populationTrigger(String suffix, String column, String statisticKey) {
        return "CREATE TRIGGER station_population_" + suffix + "_mutation_coverage "
                + "AFTER UPDATE OF " + column + " ON station_population_state "
                + "WHEN NEW." + column + "<>OLD." + column + " AND EXISTS ("
                + "SELECT 1 FROM simulation_transaction_context c WHERE c.world_id=NEW.world_id) BEGIN "
                + "INSERT INTO station_mutation_coverage(command_id,station_id,tick_sequence,statistic_key,"
                + "previous_value,delta_value,resulting_value,minimum_observed_state_tick,"
                + "maximum_observed_state_tick,mutation_count) "
                + "SELECT c.command_id,NEW.station_id,c.current_tick,'" + statisticKey + "',OLD." + column + ","
                + "NEW." + column + "-OLD." + column + ",NEW." + column + ",NEW.last_tick,NEW.last_tick,1 "
                + "FROM simulation_transaction_context c WHERE c.world_id=NEW.world_id "
                + "ON CONFLICT(command_id,station_id,tick_sequence,statistic_key) DO UPDATE SET "
                + "delta_value=station_mutation_coverage.delta_value+excluded.delta_value,"
                + "resulting_value=excluded.resulting_value,"
                + "minimum_observed_state_tick=MIN(station_mutation_coverage.minimum_observed_state_tick,"
                + "excluded.minimum_observed_state_tick),"
                + "maximum_observed_state_tick=MAX(station_mutation_coverage.maximum_observed_state_tick,"
                + "excluded.maximum_observed_state_tick),"
                + "mutation_count=station_mutation_coverage.mutation_count+1; END";
    }
}
