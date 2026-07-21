package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

/** Focused deterministic contract for passive schema-029 project progression. */
public final class SettlementProjectEngineVerification {
    private SettlementProjectEngineVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite::memory:")) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("PRAGMA foreign_keys=ON");
                createPrerequisites(statement);
                for (String sql : SettlementLifecycleSchema.statements()) statement.execute(sql);
            }

            var project = SettlementProjectTransaction.plan(connection,
                    new SettlementProjectTransaction.PlanRequest(
                            "world-1", SettlementProjectTransaction.ProjectKind.EXPANSION, "Coalition",
                            "station-a", "station-a", "location-a", "population-a", "vessel-a",
                            new SettlementProjectTransaction.Requirements(20, 20, 20, 1, 60, 24),
                            10, "Expand Alpha Station through committed work."));
            SettlementProjectTransaction.prepare(connection, project.projectId(), 11);
            contribute(connection, project.projectId(), SettlementProjectTransaction.ContributionKind.MATERIALS, 20, "m");
            contribute(connection, project.projectId(), SettlementProjectTransaction.ContributionKind.SUPPLIES, 20, "s");
            contribute(connection, project.projectId(), SettlementProjectTransaction.ContributionKind.POPULATION, 20, "p");
            contribute(connection, project.projectId(), SettlementProjectTransaction.ContributionKind.TRANSPORT, 1, "t");
            contribute(connection, project.projectId(), SettlementProjectTransaction.ContributionKind.SECURITY, 60, "g");
            SettlementProjectTransaction.activate(connection, project.projectId(), 12);

            var first = SettlementProjectEngine.advance(connection, "world-1", 13);
            require(first.advancedProjects() == 1 && first.completedProjects() == 0,
                    "Supported settlement project did not advance exactly once.");
            require(progress(connection, project.projectId()) == 6,
                    "Deterministic settlement work quantity changed unexpectedly.");

            connection.createStatement().executeUpdate(
                    "UPDATE station_simulation_state SET security=40 WHERE station_id='station-a'");
            var blocked = SettlementProjectEngine.advance(connection, "world-1", 14);
            require(blocked.blockedProjects() == 1 && status(connection, project.projectId()).equals("BLOCKED"),
                    "Settlement project did not block when security support failed.");
            require(progress(connection, project.projectId()) == 6,
                    "Blocked settlement project incorrectly accumulated work.");

            connection.createStatement().executeUpdate(
                    "UPDATE station_simulation_state SET security=80 WHERE station_id='station-a'");
            var resumed = SettlementProjectEngine.advance(connection, "world-1", 15);
            require(resumed.resumedProjects() == 1 && resumed.advancedProjects() == 1,
                    "Settlement project did not resume and advance after security recovery.");
            require(status(connection, project.projectId()).equals("ACTIVE"),
                    "Resumed settlement project entered an unexpected status.");

            SettlementProjectEngine.advance(connection, "world-1", 16);
            var complete = SettlementProjectEngine.advance(connection, "world-1", 17);
            require(complete.completedProjects() == 1 && status(connection, project.projectId()).equals("COMPLETE"),
                    "Settlement project did not complete within its deterministic bounded work window.");
            require(progress(connection, project.projectId()) == 24,
                    "Completed settlement project did not stop at exact target progress.");
            require(scalar(connection, "SELECT industry FROM station_simulation_state WHERE station_id='station-a'") == 60,
                    "Expansion did not increase canonical station industry exactly once.");
            require(scalar(connection, "SELECT security FROM station_simulation_state WHERE station_id='station-a'") == 88,
                    "Expansion did not increase canonical station security exactly once.");
            require(scalar(connection, "SELECT integrity FROM station_simulation_state WHERE station_id='station-a'") == 82,
                    "Expansion did not increase canonical station integrity exactly once.");
            require(scalar(connection, "SELECT supplies FROM station_simulation_state WHERE station_id='station-a'") == 70,
                    "Expansion did not commit project supplies to the target station.");
            require(scalar(connection, "SELECT housing_capacity FROM npc_population_state WHERE station_id='station-a'") == 120,
                    "Expansion did not increase canonical population capacity.");
            require(scalar(connection, "SELECT frontier_position FROM station_civilization_state WHERE station_id='station-a'") == 58,
                    "Expansion did not advance the canonical settlement frontier.");
            require(count(connection, "settlement_project_contribution", "contribution_kind='WORK'") == 4,
                    "Passive settlement work evidence count is incorrect.");
            require(count(connection, "settlement_project_transition", "to_status='BLOCKED'") == 1
                            && count(connection, "settlement_project_transition", "to_status='ACTIVE'") == 2,
                    "Settlement security transition evidence is incomplete.");
        }
    }

    private static void contribute(Connection connection, String projectId,
                                   SettlementProjectTransaction.ContributionKind kind,
                                   int quantity, String evidence) throws Exception {
        SettlementProjectTransaction.contribute(connection,
                new SettlementProjectTransaction.ContributionRequest(projectId, kind, quantity,
                        "station-a", kind == SettlementProjectTransaction.ContributionKind.POPULATION
                                ? "population-a" : null,
                        kind == SettlementProjectTransaction.ContributionKind.TRANSPORT ? "vessel-a" : null,
                        null, 12, evidence, "Committed " + kind + "."));
    }

    private static void createPrerequisites(Statement statement) throws Exception {
        statement.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY)");
        statement.execute("CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,display_name TEXT NOT NULL,is_station INTEGER NOT NULL DEFAULT 0)");
        statement.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,location_id TEXT NOT NULL,display_name TEXT NOT NULL,has_economy INTEGER NOT NULL DEFAULT 1)");
        statement.execute("CREATE TABLE npc_population_state(population_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,station_id TEXT NOT NULL,civilians INTEGER NOT NULL,industrial_workers INTEGER NOT NULL,logistics_workers INTEGER NOT NULL,security_personnel INTEGER NOT NULL,medical_personnel INTEGER NOT NULL,scientific_personnel INTEGER NOT NULL,temporary_residents INTEGER NOT NULL,refugees INTEGER NOT NULL,housing_capacity INTEGER NOT NULL,life_support_capacity INTEGER NOT NULL,employment_capacity INTEGER NOT NULL,last_tick INTEGER NOT NULL)");
        statement.execute("CREATE TABLE npc_vessel(npc_vessel_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,display_name TEXT NOT NULL)");
        statement.execute("CREATE TABLE population_flow(flow_id TEXT PRIMARY KEY,world_id TEXT NOT NULL)");
        statement.execute("CREATE TABLE station_change_reason(reason_code TEXT PRIMARY KEY,display_name TEXT NOT NULL,reason_family TEXT NOT NULL)");
        statement.execute("CREATE TABLE station_simulation_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,security INTEGER NOT NULL,industry INTEGER NOT NULL,integrity INTEGER NOT NULL,supplies INTEGER NOT NULL,status TEXT NOT NULL,last_tick INTEGER NOT NULL)");
        statement.execute("CREATE TABLE station_civilization_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,civilization_strength INTEGER NOT NULL,frontier_position INTEGER NOT NULL,frontier_state TEXT NOT NULL,population_index INTEGER NOT NULL,last_tick INTEGER NOT NULL)");
        statement.execute("CREATE TABLE station_vendor_offer(offer_id TEXT PRIMARY KEY,station_id TEXT NOT NULL,active INTEGER NOT NULL,last_tick INTEGER NOT NULL)");
        statement.execute("INSERT INTO world_metadata VALUES('world-1')");
        statement.execute("INSERT INTO world_location VALUES('location-a','world-1','Alpha',1)");
        statement.execute("INSERT INTO world_station VALUES('station-a','world-1','location-a','Alpha Station',1)");
        statement.execute("INSERT INTO npc_population_state VALUES('population-a','world-1','station-a',50,20,10,10,5,5,0,0,100,100,100,10)");
        statement.execute("INSERT INTO npc_vessel VALUES('vessel-a','world-1','Builder One')");
        statement.execute("INSERT INTO station_simulation_state VALUES('station-a','world-1',80,50,70,50,'STABLE',10)");
        statement.execute("INSERT INTO station_civilization_state VALUES('station-a','world-1',50,50,'HOLDING',70,10)");
        statement.execute("INSERT INTO station_vendor_offer VALUES('offer-a','station-a',1,10)");
    }

    private static String status(Connection connection, String projectId) throws Exception {
        try (var statement = connection.prepareStatement("SELECT status FROM settlement_project WHERE project_id=?")) {
            statement.setString(1, projectId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Settlement project missing.");
                return result.getString(1);
            }
        }
    }

    private static int progress(Connection connection, String projectId) throws Exception {
        try (var statement = connection.prepareStatement(
                "SELECT progress_units FROM settlement_project WHERE project_id=?")) {
            statement.setString(1, projectId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Settlement project missing.");
                return result.getInt(1);
            }
        }
    }

    private static long scalar(Connection connection, String sql) throws Exception {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new IllegalStateException("No scalar settlement verification row.");
            return result.getLong(1);
        }
    }

    private static long count(Connection connection, String table, String where) throws Exception {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table + " WHERE " + where)) {
            return result.next() ? result.getLong(1) : 0;
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Deterministic settlement project progression, blocking, resumption, completion, and canonical expansion contracts passed.");
    }
}
