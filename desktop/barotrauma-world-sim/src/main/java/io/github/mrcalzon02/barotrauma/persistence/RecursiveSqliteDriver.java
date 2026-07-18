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
            success = true;
            return connection;
        } finally {
            if (!success) connection.close();
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
        }
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Recursive SQLite trigger policy passed.");
    }
}
