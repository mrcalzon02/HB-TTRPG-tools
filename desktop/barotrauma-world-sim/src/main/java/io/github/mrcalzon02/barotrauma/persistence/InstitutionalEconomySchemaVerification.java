package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/** Contract verification for schema-035/036 institutional density, finance and partnerships. */
public final class InstitutionalEconomySchemaVerification {
    private InstitutionalEconomySchemaVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite::memory:")) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("PRAGMA foreign_keys=ON");
                statement.execute("PRAGMA recursive_triggers=ON");
                createPrerequisites(statement);
                seedStation(statement, "location-1", "station-1", 0, "Coalition", "Coalition Alpha");
                seedStation(statement, "location-2", "station-2", 1, "Coalition", "Coalition Beta");
                seedStation(statement, "location-3", "station-3", 2, "Separatists", "Separatist Alpha");
                seedStation(statement, "location-4", "station-4", 3, "Independent", "Independent Alpha");
                for (String sql : OrganizationFactionSchema.statements()) statement.execute(sql);
                for (String sql : OrganizationOperationsSchema.statements()) statement.execute(sql);
                seedStationSimulation(statement);
                for (String sql : InstitutionalEconomySchema.statements()) statement.execute(sql);
                for (String sql : InstitutionalEconomyHardeningSchema.statements()) statement.execute(sql);
            }

            require(scalar(connection,
                            "SELECT COUNT(*) FROM world_organization WHERE organization_key LIKE 'local-institution:%'") == 32,
                    "Schema 035 did not create eight local institutions per station.");
            require(scalar(connection, "SELECT COUNT(*) FROM organization_finance_state")
                            == scalar(connection, "SELECT COUNT(*) FROM world_organization"),
                    "Every organization must have an independent balance sheet.");
            require(scalar(connection, "SELECT COUNT(*) FROM organization_membership_state")
                            == scalar(connection, "SELECT COUNT(*) FROM world_organization"),
                    "Every organization must have workforce or membership accounting.");
            require(scalar(connection, "SELECT COUNT(*) FROM organization_finance_ledger WHERE entry_type='OPENING_BALANCE'")
                            == scalar(connection, "SELECT COUNT(*) FROM world_organization"),
                    "Opening balances were not recorded for every organization.");

            String engineer = text(connection,
                    "SELECT organization_id FROM world_organization WHERE home_station_id='station-2' "
                            + "AND organization_key LIKE 'local-institution:%:engineering' LIMIT 1");
            String expectedLender = text(connection,
                    "SELECT p.organization_id FROM organization_station_presence p "
                            + "JOIN world_organization o ON o.organization_id=p.organization_id "
                            + "WHERE p.station_id='station-2' AND o.organization_type IN ('BANK','CREDIT_UNION') "
                            + "AND p.organization_id<>'" + engineer + "' "
                            + "ORDER BY p.economic_influence DESC,p.organization_id LIMIT 1");
            long lenderBefore = scalar(connection,
                    "SELECT treasury FROM organization_finance_state WHERE organization_id='" + expectedLender + "'");

            try (Statement statement = connection.createStatement()) {
                statement.executeUpdate("UPDATE organization_finance_state SET treasury=1000 WHERE organization_id='" + engineer + "'");
                statement.execute("INSERT INTO organization_operation(operation_id,world_id,operation_type,sponsor_organization_id,"
                        + "target_station_id,status,influence_axis,influence_delta,aligned_major_influence,credits_delta,supplies_delta,"
                        + "ore_delta,industry_delta,security_delta,research_delta,threat_delta,asset_type,started_tick,due_tick,summary) "
                        + "VALUES('institutional-build','world-1','CONSTRUCTION_CONTRACT','" + engineer + "','station-2','ACTIVE',"
                        + "'ECONOMIC',9,3,400,5,0,3,0,0,0,'DOCKYARD',5,8,'Local dockyard expansion contract.')");
            }

            require(scalar(connection,
                            "SELECT COUNT(*) FROM organization_operation_partner WHERE operation_id='institutional-build' "
                                    + "AND partner_role IN ('FINANCE','LABOR','LOGISTICS')") == 3,
                    "Construction did not recruit finance, labor and logistics partners.");
            String selectedLender = text(connection,
                    "SELECT partner_organization_id FROM organization_operation_partner "
                            + "WHERE operation_id='institutional-build' AND partner_role='FINANCE'");
            require(expectedLender.equals(selectedLender),
                    "Construction did not select the strongest eligible finance presence.");
            require(selectedLender.equals(text(connection,
                            "SELECT financing_organization_id FROM organization_operation_finance "
                                    + "WHERE operation_id='institutional-build'")),
                    "Financing partner was not synchronized independently of trigger execution order.");
            long borrowed = scalar(connection,
                    "SELECT borrowed_amount FROM organization_operation_finance WHERE operation_id='institutional-build'");
            require(borrowed == 11000,
                    "Low-cash construction sponsor did not explicitly finance its funding gap.");
            require(scalar(connection,
                            "SELECT debt FROM organization_finance_state WHERE organization_id='" + engineer + "'") == borrowed,
                    "Sponsor debt does not equal the financed construction gap.");
            require(scalar(connection,
                            "SELECT treasury FROM organization_finance_state WHERE organization_id='" + selectedLender + "'")
                            == lenderBefore - borrowed,
                    "Lender treasury did not fund the recorded loan draw.");
            require(scalar(connection,
                            "SELECT COUNT(*) FROM organization_relationship WHERE organization_a_id='" + engineer + "' ") >= 3,
                    "Operation partnerships did not become durable organization relationships.");

            try (Statement statement = connection.createStatement()) {
                statement.executeUpdate("UPDATE organization_operation SET status='COMPLETE',completed_tick=8,outcome='SUCCESS' "
                        + "WHERE operation_id='institutional-build'");
            }
            require(scalar(connection,
                            "SELECT settled FROM organization_operation_finance WHERE operation_id='institutional-build'") == 1,
                    "Completed institutional operation did not settle its finance record.");
            require(scalar(connection,
                            "SELECT debt FROM organization_finance_state WHERE organization_id='" + engineer + "'") == 0,
                    "Successful financed project did not repay principal.");
            require(scalar(connection,
                            "SELECT revenue_total FROM organization_finance_state WHERE organization_id='" + selectedLender + "'") > 0,
                    "Financing organization did not receive a lending return.");
            require(scalar(connection,
                            "SELECT COUNT(*) FROM organization_station_asset WHERE source_operation_id='institutional-build'") == 1,
                    "Financed construction did not create its durable station asset.");

            long payrollBefore = scalar(connection,
                    "SELECT treasury FROM organization_finance_state WHERE organization_id='" + engineer + "'");
            try (Statement statement = connection.createStatement()) {
                statement.executeUpdate("UPDATE station_simulation_state SET status='RISING',industry=80,last_tick=9 "
                        + "WHERE station_id='station-2'");
            }
            require(scalar(connection,
                            "SELECT treasury FROM organization_finance_state WHERE organization_id='" + engineer + "'") < payrollBefore,
                    "Passive station progression did not charge recurring organization payroll.");
            require(scalar(connection,
                            "SELECT last_tick FROM organization_membership_state WHERE organization_id='" + engineer + "'") == 9,
                    "Organization workforce state did not advance with its home station.");
            require(scalar(connection, "SELECT COUNT(*) FROM institutional_economy_observation")
                            == scalar(connection, "SELECT COUNT(*) FROM world_organization"),
                    "Institutional economy observer does not expose every organization.");
            require(scalar(connection, "SELECT COUNT(*) FROM pragma_foreign_key_check") == 0,
                    "Institutional economy created foreign-key violations.");
        }
    }

    private static void createPrerequisites(Statement statement) throws SQLException {
        statement.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY,display_name TEXT NOT NULL)");
        statement.execute("CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,source_ordinal INTEGER NOT NULL,"
                + "display_name TEXT NOT NULL,faction TEXT,is_station INTEGER NOT NULL DEFAULT 0,ring INTEGER NOT NULL DEFAULT 0,"
                + "FOREIGN KEY(world_id) REFERENCES world_metadata(world_id))");
        statement.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,location_id TEXT NOT NULL UNIQUE,"
                + "source_station_id TEXT NOT NULL,display_name TEXT NOT NULL,faction TEXT,has_economy INTEGER NOT NULL DEFAULT 1,"
                + "FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),FOREIGN KEY(location_id) REFERENCES world_location(location_id))");
        statement.execute("CREATE TABLE world_mission(mission_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,mission_type TEXT NOT NULL,status TEXT NOT NULL,"
                + "origin_station_id TEXT,target_location_id TEXT NOT NULL,difficulty INTEGER NOT NULL DEFAULT 30,created_tick INTEGER NOT NULL DEFAULT 0,"
                + "updated_tick INTEGER NOT NULL DEFAULT 0,completed_tick INTEGER,FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),"
                + "FOREIGN KEY(origin_station_id) REFERENCES world_station(station_id),FOREIGN KEY(target_location_id) REFERENCES world_location(location_id))");
        statement.execute("CREATE TABLE station_simulation_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,credits INTEGER NOT NULL DEFAULT 10000,"
                + "supplies INTEGER NOT NULL DEFAULT 100,ore INTEGER NOT NULL DEFAULT 25,industry INTEGER NOT NULL DEFAULT 50,"
                + "security INTEGER NOT NULL DEFAULT 50,integrity INTEGER NOT NULL DEFAULT 100,threat INTEGER NOT NULL DEFAULT 10,"
                + "research INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'STABLE',last_tick INTEGER NOT NULL DEFAULT 0,"
                + "FOREIGN KEY(station_id) REFERENCES world_station(station_id),FOREIGN KEY(world_id) REFERENCES world_metadata(world_id))");
        statement.execute("INSERT INTO world_metadata(world_id,display_name) VALUES('world-1','Institutional Economy Europa')");
    }

    private static void seedStation(Statement statement, String locationId, String stationId,
                                    int ordinal, String faction, String name) throws SQLException {
        statement.execute("INSERT INTO world_location(location_id,world_id,source_ordinal,display_name,faction,is_station,ring) "
                + "VALUES('" + locationId + "','world-1'," + ordinal + ",'" + name + "','" + faction + "',1," + ordinal + ")");
        statement.execute("INSERT INTO world_station(station_id,world_id,location_id,source_station_id,display_name,faction,has_economy) "
                + "VALUES('" + stationId + "','world-1','" + locationId + "','source-" + stationId + "','"
                + name + "','" + faction + "',1)");
    }

    private static void seedStationSimulation(Statement statement) throws SQLException {
        for (int index = 1; index <= 4; index++) {
            statement.execute("INSERT INTO station_simulation_state(station_id,world_id,credits,supplies,ore,industry,security,integrity,threat,research,status,last_tick) "
                    + "VALUES('station-" + index + "','world-1',10000,100,40,55,60,100,25,20,'STABLE',0)");
        }
    }

    private static long scalar(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("Verification scalar returned no row.");
            return result.getLong(1);
        }
    }

    private static String text(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("Verification text query returned no row.");
            return result.getString(1);
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Barotrauma institutional economy contracts passed.");
    }
}
