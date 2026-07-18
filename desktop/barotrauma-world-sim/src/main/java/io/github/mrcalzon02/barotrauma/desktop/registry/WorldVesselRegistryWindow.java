package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.desktop.imports.WorldImportApprovalWindow;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.persistence.WorldVesselRegistry;
import io.github.mrcalzon02.barotrauma.persistence.WorldVesselRegistry.DefinitionRow;
import io.github.mrcalzon02.barotrauma.persistence.WorldVesselRegistry.RegistrySnapshot;
import io.github.mrcalzon02.barotrauma.persistence.WorldVesselRegistry.SnapshotRow;
import io.github.mrcalzon02.barotrauma.persistence.WorldVesselRegistry.VesselRow;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTabbedPane;
import javax.swing.JTable;
import javax.swing.SwingUtilities;
import javax.swing.SwingWorker;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import javax.swing.table.DefaultTableModel;
import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.nio.file.Path;
import java.time.Instant;
import java.util.concurrent.ExecutionException;

/** Read-only desktop view of submarine definitions, physical vessels, and snapshot chronology. */
public final class WorldVesselRegistryWindow extends JFrame {

    private final JButton openWorldButton = new JButton("Open World");
    private final JButton refreshButton = new JButton("Refresh");
    private final JButton importButton = new JButton("Open Import Approval");
    private final JLabel worldStatus = new JLabel("No desktop world open");
    private final JLabel summaryStatus = new JLabel("Definitions 0 · Vessels 0 · Snapshots 0");
    private final JLabel operationStatus = new JLabel("Ready");

    private final DefaultTableModel definitionModel = model(
            "Name", "Class", "Tier", "Vessels", "Check Value", "Definition ID", "Canonical SHA-256");
    private final DefaultTableModel vesselModel = model(
            "Name", "Class", "Tier", "Vessel ID", "Definition ID", "Current Snapshot", "Source Time", "Imported At");
    private final DefaultTableModel snapshotModel = model(
            "Current", "Vessel", "Vessel ID", "Snapshot ID", "Source Time", "Imported At", "Snapshot SHA-256", "Artifact ID");

    private final JTable definitionTable = table(definitionModel);
    private final JTable vesselTable = table(vesselModel);
    private final JTable snapshotTable = table(snapshotModel);

    private WorldPaths world;
    private Path lastDirectory;

    public WorldVesselRegistryWindow() {
        super("Barotrauma Vessel Registry");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(1000, 650));
        setSize(1280, 760);
        setLocationByPlatform(true);
        setLayout(new BorderLayout(10, 10));

        JPanel header = new JPanel(new BorderLayout(12, 8));
        header.setBorder(BorderFactory.createEmptyBorder(12, 12, 0, 12));
        JPanel worldBlock = new JPanel(new BorderLayout(4, 4));
        worldBlock.add(worldStatus, BorderLayout.NORTH);
        worldBlock.add(summaryStatus, BorderLayout.SOUTH);
        header.add(worldBlock, BorderLayout.WEST);
        header.add(operationStatus, BorderLayout.EAST);
        add(header, BorderLayout.NORTH);

        JTabbedPane tabs = new JTabbedPane();
        tabs.addTab("Definitions", new JScrollPane(definitionTable));
        tabs.addTab("Physical Vessels", new JScrollPane(vesselTable));
        tabs.addTab("Snapshot Chronology", new JScrollPane(snapshotTable));
        tabs.setBorder(BorderFactory.createEmptyBorder(0, 12, 0, 12));
        add(tabs, BorderLayout.CENTER);

        JPanel footer = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        footer.setBorder(BorderFactory.createEmptyBorder(0, 12, 12, 12));
        footer.add(openWorldButton);
        footer.add(refreshButton);
        footer.add(importButton);
        add(footer, BorderLayout.SOUTH);

        refreshButton.setEnabled(false);
        importButton.setEnabled(true);

        openWorldButton.addActionListener(event -> openWorld());
        refreshButton.addActionListener(event -> refreshRegistry());
        importButton.addActionListener(event -> {
            WorldImportApprovalWindow window = new WorldImportApprovalWindow();
            window.setVisible(true);
        });
    }

    private void openWorld() {
        JFileChooser chooser = lastDirectory == null ? new JFileChooser() : new JFileChooser(lastDirectory.toFile());
        chooser.setDialogTitle("Open an existing Barotrauma desktop world");
        chooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
        chooser.setAcceptAllFileFilterUsed(false);
        if (chooser.showOpenDialog(this) != JFileChooser.APPROVE_OPTION) return;

        try {
            world = WorldStorageContracts.openWorld(chooser.getSelectedFile().toPath());
            lastDirectory = world.root().getParent();
            worldStatus.setText("World: " + world.root());
            refreshButton.setEnabled(true);
            refreshRegistry();
        } catch (Exception exception) {
            showFailure("World open failed", exception);
        }
    }

    private void refreshRegistry() {
        if (world == null) return;
        setBusy(true, "Loading vessel registry…");

        new SwingWorker<RegistrySnapshot, Void>() {
            @Override
            protected RegistrySnapshot doInBackground() throws Exception {
                return WorldVesselRegistry.load(world);
            }

            @Override
            protected void done() {
                try {
                    RegistrySnapshot registry = get();
                    populate(registry);
                    operationStatus.setText("Registry loaded");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Registry refresh interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Registry refresh failed", cause(exception));
                } finally {
                    setBusy(false, operationStatus.getText());
                }
            }
        }.execute();
    }

    private void populate(RegistrySnapshot registry) {
        clear(definitionModel);
        clear(vesselModel);
        clear(snapshotModel);

        for (DefinitionRow definition : registry.definitions()) {
            definitionModel.addRow(new Object[]{
                    blank(definition.displayName()),
                    blank(definition.submarineClass()),
                    nullable(definition.tier()),
                    definition.vesselCount(),
                    nullable(definition.officialCheckValue()),
                    definition.definitionId(),
                    definition.canonicalXmlDigest().value()
            });
        }

        for (VesselRow vessel : registry.vessels()) {
            vesselModel.addRow(new Object[]{
                    blank(vessel.displayName()),
                    blank(vessel.submarineClass()),
                    nullable(vessel.tier()),
                    vessel.vesselId(),
                    vessel.definitionId(),
                    nullable(vessel.currentSnapshotId()),
                    instant(vessel.currentSnapshotSourceTimestamp()),
                    instant(vessel.currentSnapshotImportedAt())
            });
        }

        for (SnapshotRow snapshot : registry.snapshots()) {
            snapshotModel.addRow(new Object[]{
                    snapshot.current() ? "Current" : "Historical",
                    blank(snapshot.vesselDisplayName()),
                    snapshot.vesselId(),
                    snapshot.snapshotId(),
                    instant(snapshot.sourceTimestamp()),
                    instant(snapshot.importedAt()),
                    snapshot.snapshotDigest().value(),
                    snapshot.sourceArtifactId()
            });
        }

        summaryStatus.setText("Definitions " + registry.summary().definitions()
                + " · Vessels " + registry.summary().vessels()
                + " · Snapshots " + registry.summary().snapshots()
                + " · Current " + registry.summary().currentSnapshots()
                + " · Imported sources " + registry.summary().importedArtifacts()
                + "/" + registry.summary().inspectedArtifacts());
    }

    private void setBusy(boolean busy, String message) {
        openWorldButton.setEnabled(!busy);
        refreshButton.setEnabled(!busy && world != null);
        importButton.setEnabled(!busy);
        operationStatus.setText(message);
    }

    private void showFailure(String title, Throwable throwable) {
        operationStatus.setText(title);
        JOptionPane.showMessageDialog(this, throwable.getMessage(), title, JOptionPane.ERROR_MESSAGE);
    }

    private static DefaultTableModel model(String... columns) {
        return new DefaultTableModel(columns, 0) {
            @Override
            public boolean isCellEditable(int row, int column) {
                return false;
            }
        };
    }

    private static JTable table(DefaultTableModel model) {
        JTable table = new JTable(model);
        table.setAutoCreateRowSorter(true);
        table.setFillsViewportHeight(true);
        table.setAutoResizeMode(JTable.AUTO_RESIZE_OFF);
        return table;
    }

    private static void clear(DefaultTableModel model) {
        model.setRowCount(0);
    }

    private static Object nullable(Object value) {
        return value == null ? "" : value;
    }

    private static String blank(String value) {
        return value == null || value.isBlank() ? "Unnamed" : value;
    }

    private static String instant(Instant value) {
        return value == null ? "" : value.toString();
    }

    private static Throwable cause(ExecutionException exception) {
        return exception.getCause() == null ? exception : exception.getCause();
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try {
                UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
            } catch (Exception exception) {
                System.err.println("Could not activate the system look and feel: " + exception.getMessage());
            }
            WorldVesselRegistryWindow window = new WorldVesselRegistryWindow();
            window.setVisible(true);
        });
    }
}
