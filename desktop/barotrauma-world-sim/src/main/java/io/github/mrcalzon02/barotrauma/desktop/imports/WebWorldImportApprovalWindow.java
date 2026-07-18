package io.github.mrcalzon02.barotrauma.desktop.imports;

import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument;
import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument.WorldDocument;
import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ImportPlan;
import io.github.mrcalzon02.barotrauma.persistence.WebWorldV22ImportTransaction;
import io.github.mrcalzon02.barotrauma.persistence.WebWorldV22ImportTransaction.ImportRequest;
import io.github.mrcalzon02.barotrauma.persistence.WebWorldV22ImportTransaction.ImportedWorldSummary;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.SwingUtilities;
import javax.swing.SwingWorker;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import javax.swing.filechooser.FileNameExtensionFilter;
import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.io.IOException;
import java.nio.file.Path;
import java.util.UUID;
import java.util.concurrent.ExecutionException;

/** Explicit inspection and acceptance workflow for one normalized version-22 master world. */
public final class WebWorldImportApprovalWindow extends JFrame {
    private final DesktopWorldSession session = DesktopWorldSession.global();
    private final JButton createWorldButton = new JButton("Create World");
    private final JButton openWorldButton = new JButton("Open World");
    private final JButton inspectButton = new JButton("Inspect Version-22 Export");
    private final JButton acceptButton = new JButton("Accept Master World");
    private final JLabel worldStatus = new JLabel("No desktop world open");
    private final JLabel operationStatus = new JLabel("Ready");
    private final JTextArea report = new JTextArea();

    private WorldPaths world;
    private Path lastDirectory;
    private PendingWorld pending;
    private AutoCloseable sessionSubscription;

    public WebWorldImportApprovalWindow() {
        super("Barotrauma Version-22 Master-World Import");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(920, 680));
        setSize(1120, 780);
        setLocationByPlatform(true);
        setLayout(new BorderLayout(10, 10));

        JPanel header = new JPanel(new BorderLayout(12, 8));
        header.setBorder(BorderFactory.createEmptyBorder(12, 12, 0, 12));
        header.add(new JLabel("<html><b>Normalized import only.</b> Simulation remains paused after acceptance.</html>"),
                BorderLayout.NORTH);
        header.add(worldStatus, BorderLayout.SOUTH);
        header.add(operationStatus, BorderLayout.EAST);
        add(header, BorderLayout.NORTH);

        report.setEditable(false);
        report.setLineWrap(false);
        report.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 13));
        report.setText("Create or open a desktop world, then inspect a version-22 browser-suite JSON export.\n");
        JScrollPane scroll = new JScrollPane(report);
        scroll.setBorder(BorderFactory.createEmptyBorder(0, 12, 0, 12));
        add(scroll, BorderLayout.CENTER);

        JPanel footer = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        footer.setBorder(BorderFactory.createEmptyBorder(0, 12, 12, 12));
        footer.add(createWorldButton);
        footer.add(openWorldButton);
        footer.add(inspectButton);
        footer.add(acceptButton);
        add(footer, BorderLayout.SOUTH);

        inspectButton.setEnabled(false);
        acceptButton.setEnabled(false);
        createWorldButton.addActionListener(event -> createWorld());
        openWorldButton.addActionListener(event -> openWorld());
        inspectButton.addActionListener(event -> chooseAndInspect());
        acceptButton.addActionListener(event -> acceptPending());
        sessionSubscription = session.addListener(this::activateSharedWorld, true);
    }

    private void createWorld() {
        JFileChooser chooser = directoryChooser("Choose the parent directory for the new desktop world");
        if (chooser.showOpenDialog(this) != JFileChooser.APPROVE_OPTION) return;
        String displayName = JOptionPane.showInputDialog(this, "Desktop world name:",
                "Create World", JOptionPane.QUESTION_MESSAGE);
        if (displayName == null || displayName.isBlank()) return;
        try {
            session.activate(WorldStorageContracts.createWorld(chooser.getSelectedFile().toPath(),
                    displayName.trim(), UUID.randomUUID()));
        } catch (Exception exception) {
            showFailure("World creation failed", exception);
        }
    }

    private void openWorld() {
        JFileChooser chooser = directoryChooser("Open an existing Barotrauma desktop world");
        if (chooser.showOpenDialog(this) != JFileChooser.APPROVE_OPTION) return;
        try {
            session.activate(WorldStorageContracts.openWorld(chooser.getSelectedFile().toPath()));
        } catch (Exception exception) {
            showFailure("World open failed", exception);
        }
    }

    private JFileChooser directoryChooser(String title) {
        JFileChooser chooser = lastDirectory == null ? new JFileChooser() : new JFileChooser(lastDirectory.toFile());
        chooser.setDialogTitle(title);
        chooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
        chooser.setAcceptAllFileFilterUsed(false);
        return chooser;
    }

    private void activateSharedWorld(WorldPaths sharedWorld) {
        world = sharedWorld;
        pending = null;
        acceptButton.setEnabled(false);
        if (sharedWorld == null) {
            worldStatus.setText("No desktop world open");
            inspectButton.setEnabled(false);
            report.setText("Create or open a desktop world before inspecting a version-22 export.\n");
            return;
        }
        lastDirectory = sharedWorld.root().getParent();
        worldStatus.setText("Shared world: " + sharedWorld.root());
        inspectButton.setEnabled(true);
        report.setText("Desktop world ready for normalized master-world import.\n\nRoot: "
                + sharedWorld.root() + "\nDatabase: " + sharedWorld.database()
                + "\n\nNo simulation process is active.\n");
    }

    private void chooseAndInspect() {
        WorldPaths selectedWorld = world;
        if (selectedWorld == null) return;
        JFileChooser chooser = lastDirectory == null ? new JFileChooser() : new JFileChooser(lastDirectory.toFile());
        chooser.setDialogTitle("Inspect version-22 Barotrauma suite export");
        chooser.setFileFilter(new FileNameExtensionFilter("Version-22 suite exports (*.json)", "json"));
        if (chooser.showOpenDialog(this) != JFileChooser.APPROVE_OPTION) return;
        Path source = chooser.getSelectedFile().toPath();
        lastDirectory = source.getParent();
        inspect(selectedWorld, source);
    }

    private void inspect(WorldPaths selectedWorld, Path source) {
        setBusy(true, "Inspecting and normalizing world…");
        pending = null;
        report.setText("Inspecting " + source + "\nNo world or simulation state will change during this step.\n\n");
        new SwingWorker<PendingWorld, Void>() {
            @Override
            protected PendingWorld doInBackground() throws Exception {
                WorldDocument document = WebSuiteV22WorldDocument.inspect(source);
                ImportPlan plan;
                try (SqliteWorldStore store = SqliteWorldStore.open(selectedWorld)) {
                    plan = store.inspectAndPlan(document.inspection());
                }
                return new PendingWorld(source, document, plan);
            }

            @Override
            protected void done() {
                try {
                    PendingWorld loaded = get();
                    if (!selectedWorld.equals(world)) return;
                    pending = loaded;
                    report.setText(render(loaded));
                    report.setCaretPosition(0);
                    boolean canAccept = loaded.plan().artifact().importedAt() == null;
                    acceptButton.setEnabled(canAccept);
                    operationStatus.setText(canAccept ? "Normalized world awaiting approval" : "Source already imported");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("World inspection interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("World inspection failed", cause(exception));
                } finally {
                    setBusy(false, operationStatus.getText());
                }
            }
        }.execute();
    }

    private void acceptPending() {
        if (world == null || pending == null || !acceptButton.isEnabled()) return;
        WorldDocument document = pending.document();
        int answer = JOptionPane.showConfirmDialog(this,
                "Accept this normalized master world?\n\n"
                        + "Master world ID: " + document.inspection().masterWorldId() + "\n"
                        + "Rings: " + document.inspection().world().rings() + "\n"
                        + "Locations: " + document.locations().size() + "\n"
                        + "Stations: " + document.stations().size() + "\n\n"
                        + "The imported scheduler will remain PAUSED. This desktop world cannot accept a second master world.",
                "Accept normalized master world", JOptionPane.OK_CANCEL_OPTION, JOptionPane.WARNING_MESSAGE);
        if (answer != JOptionPane.OK_OPTION) return;

        PendingWorld accepted = pending;
        WorldPaths selectedWorld = world;
        ImportRequest request = new ImportRequest(accepted.plan().artifactId(),
                accepted.plan().artifact().artifactIdentity().digest(), "desktop-user", accepted.document());
        setBusy(true, "Committing normalized master world…");
        new SwingWorker<ImportedWorldSummary, Void>() {
            @Override
            protected ImportedWorldSummary doInBackground() throws Exception {
                return WebWorldV22ImportTransaction.commit(selectedWorld, request);
            }

            @Override
            protected void done() {
                try {
                    ImportedWorldSummary result = get();
                    report.setText(renderCommit(result));
                    pending = null;
                    acceptButton.setEnabled(false);
                    operationStatus.setText("Master world imported; simulation paused");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("World import interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("World import failed and was rolled back", cause(exception));
                } finally {
                    setBusy(false, operationStatus.getText());
                }
            }
        }.execute();
    }

    private static String render(PendingWorld pending) {
        StringBuilder text = new StringBuilder(pending.document().toHumanReadableText())
                .append("\nDesktop import plan\nArtifact ID: ").append(pending.plan().artifactId())
                .append("\nArtifact action: ").append(pending.plan().artifactAction())
                .append("\nChanges simulation state during inspection: ").append(pending.plan().changesSimulationState())
                .append("\n\nApproval boundary\nAcceptance writes normalized world records and imported scheduler metadata.\n")
                .append("The simulation writer remains disabled and PAUSED.\n");
        for (String warning : pending.document().warnings()) text.append("WARNING: ").append(warning).append('\n');
        return text.toString();
    }

    private static String renderCommit(ImportedWorldSummary result) {
        return "Normalized master world committed\n"
                + "Imported at: " + result.importedAt() + "\n"
                + "Master world ID: " + result.masterWorldId() + "\n"
                + "Rings: " + result.rings() + "\n"
                + "Locations: " + result.locations() + "\n"
                + "Stations: " + result.stations() + "\n"
                + "Canonical time: " + value(result.canonicalTime()) + "\n"
                + "Source last simulated at: " + value(result.sourceLastSimulatedAt()) + "\n"
                + "Imported tick sequence: " + result.importedTickSequence() + "\n"
                + "Simulation enabled: " + result.simulationEnabled() + "\n"
                + "Scheduler state: " + result.schedulerState() + "\n";
    }

    private void setBusy(boolean busy, String message) {
        createWorldButton.setEnabled(!busy);
        openWorldButton.setEnabled(!busy);
        inspectButton.setEnabled(!busy && world != null);
        if (busy) acceptButton.setEnabled(false);
        else if (pending != null) acceptButton.setEnabled(pending.plan().artifact().importedAt() == null);
        operationStatus.setText(message);
    }

    private void showFailure(String title, Throwable throwable) {
        pending = null;
        acceptButton.setEnabled(false);
        operationStatus.setText(title);
        report.append("\n\n" + title + "\n" + throwable.getClass().getSimpleName()
                + ": " + throwable.getMessage() + "\n");
        JOptionPane.showMessageDialog(this, throwable.getMessage(), title, JOptionPane.ERROR_MESSAGE);
    }

    @Override
    public void dispose() {
        if (sessionSubscription != null) {
            try { sessionSubscription.close(); } catch (Exception ignored) { }
            sessionSubscription = null;
        }
        super.dispose();
    }

    private static String value(Object value) {
        return value == null ? "not declared" : value.toString();
    }

    private static Throwable cause(ExecutionException exception) {
        return exception.getCause() == null ? exception : exception.getCause();
    }

    private record PendingWorld(Path source, WorldDocument document, ImportPlan plan) { }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try {
                UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
            } catch (Exception exception) {
                System.err.println("Could not activate system look and feel: " + exception.getMessage());
            }
            WebWorldImportApprovalWindow window = new WebWorldImportApprovalWindow();
            window.setLocationRelativeTo(null);
            window.setVisible(true);
        });
    }
}
