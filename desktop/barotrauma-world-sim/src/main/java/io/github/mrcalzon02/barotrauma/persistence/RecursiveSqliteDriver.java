package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.Driver;
import java.sql.DriverManager;
import java.sql.DriverPropertyInfo;
import java.sql.SQLException;
import java.sql.SQLFeatureNotSupportedException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import java.util.Properties;
import java.util.logging.Logger;

/**
 * Wraps the Xerial SQLite driver so every desktop connection explicitly enables recursive triggers.
 * The simulation intentionally chains durable state triggers and must not depend on SQLite build defaults.
 */
public final class RecursiveSqliteDriver implements Driver {
    private static final String SQLITE_DRIVER = "org.sqlite.JDBC";
    private static final String RETURN_DOCKING_TRIGGER = """
            CREATE TRIGGER IF NOT EXISTS npc_completed_return_docks
            AFTER UPDATE OF status ON npc_vessel
            WHEN OLD.status='RETURNING' AND NEW.status='WORKING'
              AND NEW.mission_id IS NOT NULL
              AND EXISTS (SELECT 1 FROM world_mission m
                          WHERE m.mission_id=NEW.mission_id AND m.status='COMPLETE')
            BEGIN
              UPDATE npc_vessel
                 SET status='DOCKED',
                     mission_id=NULL,
                     destination_location_id=NULL,
                     route_progress=0,
                     route_ticks_required=1,
                     cargo=0
               WHERE npc_vessel_id=NEW.npc_vessel_id
                 AND status='WORKING'
                 AND mission_id=NEW.mission_id;
            END
            """;
    private static boolean installed;
    private final Driver delegate;

    private RecursiveSqliteDriver(Driver delegate) {
        this.delegate = delegate;
    }

    public static synchronized void install() {
        if (installed) return;
        try {
            Class.forName(SQLITE_DRIVER);
            Driver delegate = null;
            List<Driver> sqliteDrivers = new ArrayList<>();
            Enumeration<Driver> registered = DriverManager.getDrivers();
            while (registered.hasMoreElements()) {
                Driver driver = registered.nextElement();
                if (driver.getClass().getName().equals(SQLITE_DRIVER)) {
                    if (delegate == null) delegate = driver;
                    sqliteDrivers.add(driver);
                }
            }
            if (delegate == null) {
                delegate = (Driver) Class.forName(SQLITE_DRIVER).getDeclaredConstructor().newInstance();
            }
            for (Driver driver : sqliteDrivers) DriverManager.deregisterDriver(driver);
            DriverManager.registerDriver(new RecursiveSqliteDriver(delegate));
            installed = true;
        } catch (ClassNotFoundException exception) {
            // Filesystem-only contracts can still load without the optional runtime driver.
        } catch (ReflectiveOperationException | SQLException exception) {
            throw new ExceptionInInitializerError(exception);
        }
    }

    @Override
    public Connection connect(String url, Properties info) throws SQLException {
        if (!acceptsURL(url)) return null;
        Connection connection = delegate.connect(url, info);
        if (connection == null) return null;
        boolean success = false;
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA recursive_triggers=ON");
            try (var result = statement.executeQuery("PRAGMA recursive_triggers")) {
                if (!result.next() || result.getInt(1) != 1) {
                    throw new SQLException("SQLite recursive triggers could not be enabled for the desktop world connection.");
                }
            }
            installReturnLifecycleTrigger(connection);
            success = true;
            return connection;
        } finally {
            if (!success) connection.close();
        }
    }

    private static void installReturnLifecycleTrigger(Connection connection) throws SQLException {
        if (!hasTable(connection, "npc_vessel")
                || !hasTable(connection, "world_mission")
                || !hasTable(connection, "freight_lot")) {
            return;
        }
        try (Statement statement = connection.createStatement()) {
            statement.execute(RETURN_DOCKING_TRIGGER);
        }
    }

    private static boolean hasTable(Connection connection, String tableName) throws SQLException {
        try (var statement = connection.prepareStatement(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")) {
            statement.setString(1, tableName);
            try (var result = statement.executeQuery()) {
                return result.next();
            }
        }
    }

    @Override
    public boolean acceptsURL(String url) throws SQLException {
        return delegate.acceptsURL(url);
    }

    @Override
    public DriverPropertyInfo[] getPropertyInfo(String url, Properties info) throws SQLException {
        return delegate.getPropertyInfo(url, info);
    }

    @Override
    public int getMajorVersion() {
        return delegate.getMajorVersion();
    }

    @Override
    public int getMinorVersion() {
        return delegate.getMinorVersion();
    }

    @Override
    public boolean jdbcCompliant() {
        return delegate.jdbcCompliant();
    }

    @Override
    public Logger getParentLogger() throws SQLFeatureNotSupportedException {
        return delegate.getParentLogger();
    }

    public static void verifyContract() throws Exception {
        install();
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite::memory:");
             Statement statement = connection.createStatement()) {
            try (var result = statement.executeQuery("PRAGMA recursive_triggers")) {
                if (!result.next() || result.getInt(1) != 1) {
                    throw new IllegalStateException("Desktop SQLite connections did not enable recursive triggers.");
                }
            }
            statement.execute("CREATE TABLE trigger_a(value INTEGER)");
            statement.execute("CREATE TABLE trigger_b(value INTEGER)");
            statement.execute("CREATE TABLE trigger_c(value INTEGER)");
            statement.execute("CREATE TRIGGER a_to_b AFTER INSERT ON trigger_a BEGIN "
                    + "INSERT INTO trigger_b(value) VALUES (NEW.value+1); END");
            statement.execute("CREATE TRIGGER b_to_c AFTER INSERT ON trigger_b BEGIN "
                    + "INSERT INTO trigger_c(value) VALUES (NEW.value+1); END");
            statement.execute("INSERT INTO trigger_a(value) VALUES (1)");
            try (var result = statement.executeQuery("SELECT value FROM trigger_c")) {
                if (!result.next() || result.getInt(1) != 3) {
                    throw new IllegalStateException("Desktop SQLite recursive trigger chain did not execute.");
                }
            }

            statement.execute("CREATE TABLE world_mission(mission_id TEXT PRIMARY KEY,status TEXT NOT NULL)");
            statement.execute("CREATE TABLE npc_vessel(npc_vessel_id TEXT PRIMARY KEY,mission_id TEXT,status TEXT NOT NULL,"
                    + "home_station_id TEXT,destination_location_id TEXT,cargo INTEGER NOT NULL,route_progress INTEGER NOT NULL,"
                    + "route_ticks_required INTEGER NOT NULL,last_tick INTEGER NOT NULL)");
            statement.execute("CREATE TABLE freight_lot(lot_id TEXT PRIMARY KEY,assigned_npc_vessel_id TEXT,status TEXT NOT NULL,"
                    + "updated_tick INTEGER,delivered_tick INTEGER,destination_station_id TEXT)");
            statement.execute("CREATE TABLE treasury_transaction(transaction_id TEXT PRIMARY KEY)");
            statement.execute("CREATE TRIGGER freight_delivered_by_npc AFTER UPDATE OF status ON npc_vessel "
                    + "WHEN NEW.status='DOCKED' AND OLD.status IN ('RETURNING','WORKING') BEGIN "
                    + "UPDATE freight_lot SET status='DELIVERED',updated_tick=NEW.last_tick,delivered_tick=NEW.last_tick,"
                    + "destination_station_id=NEW.home_station_id WHERE assigned_npc_vessel_id=NEW.npc_vessel_id "
                    + "AND status='IN_TRANSIT'; "
                    + "INSERT OR IGNORE INTO treasury_transaction(transaction_id) SELECT lot_id||':delivery' "
                    + "FROM freight_lot WHERE assigned_npc_vessel_id=NEW.npc_vessel_id AND status='DELIVERED' "
                    + "AND delivered_tick=NEW.last_tick; END");
            installReturnLifecycleTrigger(connection);
            statement.execute("INSERT INTO world_mission VALUES ('mission-1','COMPLETE')");
            statement.execute("INSERT INTO npc_vessel VALUES "
                    + "('vessel-1','mission-1','RETURNING','station-1','location-1',5,3,3,41)");
            statement.execute("INSERT INTO freight_lot VALUES "
                    + "('mission-1:freight','vessel-1','IN_TRANSIT',41,NULL,NULL)");
            statement.execute("UPDATE npc_vessel SET status='WORKING',last_tick=42 WHERE npc_vessel_id='vessel-1'");
            try (var result = statement.executeQuery(
                    "SELECT status,mission_id,destination_location_id,cargo,route_progress,route_ticks_required "
                            + "FROM npc_vessel WHERE npc_vessel_id='vessel-1'")) {
                if (!result.next()
                        || !"DOCKED".equals(result.getString("status"))
                        || result.getString("mission_id") != null
                        || result.getString("destination_location_id") != null
                        || result.getInt("cargo") != 0
                        || result.getInt("route_progress") != 0
                        || result.getInt("route_ticks_required") != 1) {
                    throw new IllegalStateException("Completed NPC return did not dock and clear voyage state atomically.");
                }
            }
            try (var result = statement.executeQuery(
                    "SELECT status,delivered_tick FROM freight_lot WHERE lot_id='mission-1:freight'")) {
                if (!result.next() || !"DELIVERED".equals(result.getString(1)) || result.getLong(2) != 42L) {
                    throw new IllegalStateException("NPC return docking did not settle freight at the arrival tick.");
                }
            }
            statement.execute("UPDATE npc_vessel SET status='WORKING' WHERE npc_vessel_id='vessel-1'");
            statement.execute("UPDATE npc_vessel SET status='DOCKED',last_tick=43 WHERE npc_vessel_id='vessel-1'");
            try (var result = statement.executeQuery("SELECT COUNT(*) FROM treasury_transaction")) {
                if (!result.next() || result.getInt(1) != 1) {
                    throw new IllegalStateException("NPC return docking replayed freight settlement.");
                }
            }
        }
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Recursive SQLite trigger and NPC return lifecycle policy passed.");
    }
}
