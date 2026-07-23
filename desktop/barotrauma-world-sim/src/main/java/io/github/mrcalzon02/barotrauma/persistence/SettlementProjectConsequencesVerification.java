package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/** Focused contract for canonical schema-030 settlement completion consequences. */
public final class SettlementProjectConsequencesVerification {
    private SettlementProjectConsequencesVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite::memory:")) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("PRAGMA foreign_keys=ON");
                createPrerequisites(statement);
                for (String sql : SettlementLifecycleSchema.statements()) statement.execute(sql);
            }

            insertCompleteProject(connection, "abandon", "ABANDONMENT", "station-empty", "location-empty", 0, 0);
            SettlementProjectConsequences.apply(connection, "abandon", 20);
            require(text(connection, "SELECT status FROM station_simulation_state WHERE station_id='station-empty'")
                            .equals("FALLEN"),
                    "Abandonment did not mark the canonical station fallen.");
            require(text(connection, "SELECT frontier_state FROM station_civilization_state WHERE station_id='station-empty'")
                            .equals("ABANDONED"),
                    "Abandonment did not mark the canonical frontier abandoned.");
            require(scalar(connection, "SELECT has_economy FROM world_station WHERE station_id='station-empty'") == 0,
                    "Abandonment did not disable the canonical station economy.");
            require(scalar(connection, "SELECT active FROM station_vendor_offer WHERE station_id='station-empty'") == 0,
                    "Abandonment did not disable station vendors.");

            insertCompleteProject(connection, "reclaim", "RECLAMATION", "station-fallen", "location-fallen", 15, 10);
            SettlementProjectConsequences.apply(connection, "reclaim", 30);
            require(text(connection, "SELECT status FROM station_simulation_state WHERE station_id='station-fallen'")
                            .equals("STRAINED"),
                    "Reclamation did not restore the canonical station to strained operation.");
            require(text(connection, "SELECT frontier_state FROM station_civilization_state WHERE station_id='station-fallen'")
                            .equals("HOLDING"),
                    "Reclamation did not restore the canonical frontier.");
            require(scalar(connection, "SELECT has_economy FROM world_station WHERE station_id='station-fallen'") == 1,
                    "Reclamation did not restore the canonical station economy.");
            require(scalar(connection, "SELECT active FROM station_vendor_offer WHERE station_id='station-fallen'") == 1,
                    "Reclamation did not restore station vendors.");
            require(scalar(connection, "SELECT supplies FROM station_simulation_state WHERE station_id='station-fallen'") == 15,
                    "Reclamation did not apply committed project supplies.");

            insertCompleteProject(connection, "occupied-abandon", "ABANDONMENT", "station-fallen",
                    "location-fallen", 0, 0);
            reject(() -> SettlementProjectConsequences.apply(connection, "occupied-abandon", 31),
                    "fully evacuated");

            insertCompleteProject(connection, "founding", "FOUNDING", null, "location-frontier", 20, 20);
            connection.setAutoCommit(false);
            long stationCount = scalar(connection, "SELECT COUNT(*) FROM world_station");
            try {
                reject(() -> SettlementProjectConsequences.apply(connection, "founding", 40),
                        "lacks an unconsumed staged arrival");
                connection.rollback();
            } finally {
                connection.setAutoCommit(true);
            }
            require(scalar(connection, "SELECT COUNT(*) FROM world_station") == stationCount,
                    "Rejected founding created a partially initialized station.");
            require(scalar(connection, "SELECT is_station FROM world_location WHERE location_id='location-frontier'") == 0,
                    "Rejected founding changed the target location into a station.");
            require(foreignKeyViolations(connection) == 0,
                    "Settlement completion consequence verification left foreign-key violations.");
        }
    }

    private static void insertCompleteProject(Connection connection, String projectId, String kind,
                                              String stationId, String locationId,
                                              int committedSupplies, int committedPopulation) throws Exception {
        try (var statement = connection.prepareStatement(
                "INSERT INTO settlement_project(project_id,world_id,project_kind,status,target_station_id,"
                        + "target_location_id,required_material_units,committed_material_units,required_supply_units,"
                        + "committed_supply_units,required_population,committed_population,required_transport_units,"
                        + "committed_transport_units,required_security,current_security,progress_units,"
                        + "target_progress_units,created_tick,completed_tick,updated_tick,summary) "
                        + "VALUES (?,'world-1',?,'COMPLETE',?,?,0,0,?,?,?, ?,0,0,0,0,10,10,10,10,10,'Verified completion')")) {
            statement.setString(1, projectId);
            statement.setString(2, kind);
            if (stationId == null) statement.setNull(3, java.sql.Types.VARCHAR);
            else statement.setString(3, stationId);
            statement.setString(4, locationId);
            statement.setInt(5, committedSupplies);
            statement.setInt(6, committedSupplies);
            statement.setInt(7, committedPopulation);
            statement.setInt(8, committedPopulation);
            statement.executeUpdate();
        }
    }

    private static void createPrerequisites(Statement statement) throws Exception {
        statement.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY)");
        statement.execute("CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,display_name TEXT NOT NULL,is_station INTEGER NOT NULL DEFAULT 0)");
        statement.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,location_id TEXT NOT NULL,display_name TEXT NOT NULL,has_economy INTEGER NOT NULL DEFAULT 1)");
        statement.execute("CREATE TABLE npc_population_state(population_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,station_id TEXT NOT NULL,civilians INTEGER NOT NULL,industrial_workers INTEGER NOT NULL,logistics_workers INTEGER NOT NULL,security_personnel INTEGER NOT NULL,medical_personnel INTEGER NOT NULL,scientific_personnel INTEGER NOT NULL,temporary_residents INTEGER NOT NULL,refugees INTEGER NOT NULL,housing_capacity INTEGER NOT NULL,life_support_capacity INTEGER NOT NULL,employment_capacity INTEGER NOT NULL,last_tick INTEGER NOT NULL)");
        statement.execute("CREATE TABLE npc_vessel(npc_vessel_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,display_name TEXT NOT NULL)");
        statement.execute("CREATE TABLE population_flow(flow_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,settlement_project_id TEXT,destination_mode TEXT,status TEXT,arrived_quantity INTEGER NOT NULL DEFAULT 0,losses INTEGER NOT NULL DEFAULT 0)");
        statement.execute("CREATE TABLE settlement_founding_handoff(flow_id TEXT PRIMARY KEY)");
        statement.execute("CREATE TABLE station_change_reason(reason_code TEXT PRIMARY KEY,display_name TEXT NOT NULL,reason_family TEXT NOT NULL)");
        statement.execute("CREATE TABLE station_simulation_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,security INTEGER NOT NULL,industry INTEGER NOT NULL,integrity INTEGER NOT NULL,supplies INTEGER NOT NULL,status TEXT NOT NULL,last_tick INTEGER NOT NULL)");
        statement.execute("CREATE TABLE station_civilization_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,civilization_strength INTEGER NOT NULL,frontier_position INTEGER NOT NULL,frontier_state TEXT NOT NULL,population_index INTEGER NOT NULL,last_tick INTEGER NOT NULL)");
        statement.execute("CREATE TABLE station_vendor_offer(offer_id TEXT PRIMARY KEY,station_id TEXT NOT NULL,active INTEGER NOT NULL,last_tick INTEGER NOT NULL)");
        statement.execute("INSERT INTO world_metadata VALUES('world-1')");
        statement.execute("INSERT INTO world_location VALUES('location-empty','world-1','Empty Station',1)");
        statement.execute("INSERT INTO world_location VALUES('location-fallen','world-1','Fallen Station',1)");
        statement.execute("INSERT INTO world_location VALUES('location-frontier','world-1','Frontier Site',0)");
        statement.execute("INSERT INTO world_station VALUES('station-empty','world-1','location-empty','Empty Station',1)");
        statement.execute("INSERT INTO world_station VALUES('station-fallen','world-1','location-fallen','Fallen Station',0)");
        statement.execute("INSERT INTO npc_population_state VALUES('population-empty','world-1','station-empty',0,0,0,0,0,0,0,0,100,100,100,10)");
        statement.execute("INSERT INTO npc_population_state VALUES('population-fallen','world-1','station-fallen',10,5,0,0,0,0,0,0,100,100,100,10)");
        statement.execute("INSERT INTO station_simulation_state VALUES('station-empty','world-1',50,40,60,20,'STABLE',10)");
        statement.execute("INSERT INTO station_simulation_state VALUES('station-fallen','world-1',0,0,0,0,'FALLEN',10)");
        statement.execute("INSERT INTO station_civilization_state VALUES('station-empty','world-1',50,50,'HOLDING',0,10)");
        statement.execute("INSERT INTO station_civilization_state VALUES('station-fallen','world-1',0,0,'ABANDONED',15,10)");
        statement.execute("INSERT INTO station_vendor_offer VALUES('offer-empty','station-empty',1,10)");
        statement.execute("INSERT INTO station_vendor_offer VALUES('offer-fallen','station-fallen',0,10)");
    }

    private static long scalar(Connection connection, String sql) throws Exception {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new IllegalStateException("No scalar settlement consequence row.");
            return result.getLong(1);
        }
    }

    private static String text(Connection connection, String sql) throws Exception {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new IllegalStateException("No settlement consequence text row.");
            return result.getString(1);
        }
    }

    private static long foreignKeyViolations(Connection connection) throws Exception {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("PRAGMA foreign_key_check")) {
            long count = 0;
            while (result.next()) count++;
            return count;
        }
    }

    private static void reject(SqlWork work, String expected) throws Exception {
        try {
            work.run();
            throw new IllegalStateException("Expected settlement consequence rejection containing: " + expected);
        } catch (SQLException exception) {
            require(exception.getMessage() != null && exception.getMessage().contains(expected),
                    "Unexpected settlement consequence rejection: " + exception.getMessage());
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    @FunctionalInterface
    private interface SqlWork { void run() throws Exception; }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Settlement expansion, abandonment, reclamation, and founding failure-containment contracts passed.");
    }
}
