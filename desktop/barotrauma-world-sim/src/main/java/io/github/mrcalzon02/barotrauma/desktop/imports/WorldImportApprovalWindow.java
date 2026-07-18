package io.github.mrcalzon02.barotrauma.desktop.imports;

import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector;
import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector.CampaignInspection;
import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector.Inspection;
import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector.StandaloneSubmarineInspection;
import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22Inspector;
import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22Inspector.InspectionReport;
import io.github.mrcalzon02.barotrauma.persistence.AcceptedImportTransaction;
import io.github.mrcalzon02.barotrauma.persistence.AcceptedImportTransaction.AcceptedImportRequest;
import io.github.mrcalzon02.barotrauma.persistence.AcceptedImportTransaction.AcceptedVesselCandidate;
import io.github.mrcalzon02.barotrauma.persistence.AcceptedImportTransaction.CommitResult;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ArtifactAction;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.DefinitionPlan;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ImportPlan;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ExecutionException;

/**
 * Inspection-first desktop workflow for opening a world, planning an import, and explicitly
 * accepting official Barotrauma vessel data.
 */
public final class WorldImportApprovalWindow extends JFrame {

    private final JButton createWorldButton = new JButton("Create World");
    private final JButton openWorldButton = new JButton("Open World");
    private final JButton inspectButton = new JButton("Inspect Source");
    private final JButton acceptButton = new JButton("Accept Vessel Import");
    private final JButton clearButton = new JButton("Clear");
    private final JLabel worldStatus = new JLabel("No desktop world open");
    private final JLabel operationStatus = new JLabel("Ready");
    private final JTextArea report = new JTextArea();

    private WorldPaths world;
    private PendingImport pendingImport;
    private Path lastDirectory;

    public WorldImportApprovalWindow() {
        super("Barotrauma World Import Approval");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(900, 650));
        setSize(1080, 760);
        setLocationByPlatform(true);
        setLayout(new BorderLayout(10, 10));

        JPanel header = new JPanel(new BorderLayout(12, 8));
        header.setBorder(BorderFactory.createEmptyBorder(12, 12, 0, 12));
        JLabel explanation = new JLabel(
                "<html><b>Inspection first.</b> Source files are recorded and compared before an accepted import can create vessel records.</html>"
        );
        header.add(explanation, BorderLayout.NORTH);
        header.add(worldStatus, BorderLayout.SOUTH);
        add(header, BorderLayout.NORTH);

        report.setEditable(false);
        report.setLineWrap(false);
        report.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 13));
        report.setText("Create or open a desktop world, then inspect a version-22 JSON export, .save, or .sub file.\n");
        JScrollPane scroll = new JScrollPane(report);
        scroll.setBorder(BorderFactory.createEmptyBorder(0, 12, 0, 12));
        add(scroll, BorderLayout.CENTER);

        JPanel footer = new JPanel(new BorderLayout());
        footer.setBorder(BorderFactory.createEmptyBorder(0, 12, 12, 12));
        JPanel buttons = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        buttons.add(createWorldButton);
        buttons.add(openWorldButton);
        buttons.add(inspectButton);
        buttons.add(acceptButton);
        buttons.add(clearButton);
        footer.add(buttons, BorderLayout.WEST);
        footer.add(operationStatus, BorderLayout.EAST);
        add(footer, BorderLayout.SOUTH);

        inspectButton.setEnabled(false);
        acceptButton.setEnabled(false);

        createWorldButton.addActionListener(event -> createWorld());
        openWorldButton.addActionListener(event -> openWorld());
        inspectButton.addActionListener(event -> chooseAndInspect());
        acceptButton.addActionListener(event -> acceptPendingImport());
        clearButton.addActionListener(event -> clearReport());
    }

    private void createWorld() {
        JFileChooser chooser = directoryChooser("Choose the parent directory for the new desktop world");
        if (chooser.showOpenDialog(this) != JFileChooser.APPROVE_OPTION) return;
        String displayName = JOptionPane.showInputDialog(this, "Desktop world name:", "Create World",
                JOptionPane.QUESTION_MESSAGE);
        if (displayName == null || displayName.isBlank()) return;

        try {
            WorldPaths created = WorldStorageContracts.createWorld(
                    chooser.getSelectedFile().toPath(),
                    displayName.trim(),
                    UUID.randomUUID()
            );
            activateWorld(created, "Created");
        } catch (IOException | RuntimeException exception) {
            showFailure("World creation failed", exception);
        }
    }

    private void openWorld() {
        JFileChooser chooser = directoryChooser("Open an existing Barotrauma desktop world");
        if (chooser.showOpenDialog(this) != JFileChooser.APPROVE_OPTION) return;
        try {
            activateWorld(WorldStorageContracts.openWorld(chooser.getSelectedFile().toPath()), "Opened");
        } catch (IOException | RuntimeException exception) {
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

    private void activateWorld(WorldPaths paths, String verb) {
        world = paths;
        pendingImport = null;
        lastDirectory = paths.root().getParent();
        worldStatus.setText(verb + " world: " + paths.root());
        operationStatus.setText("World ready");
        inspectButton.setEnabled(true);
        acceptButton.setEnabled(false);
        report.setText("Desktop world ready\n\nRoot: " + paths.root()
                + "\nDatabase: " + paths.database()
                + "\n\nInspect a source file to create a duplicate-safe import plan.\n");
    }

    private void chooseAndInspect() {
        if (world == null) return;
        JFileChooser chooser = lastDirectory == null ? new JFileChooser() : new JFileChooser(lastDirectory.toFile());
        chooser.setDialogTitle("Inspect Barotrauma compatibility source");
        chooser.setFileFilter(new FileNameExtensionFilter(
                "Barotrauma sources (*.json, *.save, *.sub)", "json", "save", "sub"));
        if (chooser.showOpenDialog(this) != JFileChooser.APPROVE_OPTION) return;
        Path source = chooser.getSelectedFile().toPath();
        lastDirectory = source.getParent();
        inspect(source);
    }

    private void inspect(Path source) {
        setBusy(true, "Inspecting " + source.getFileName() + "…");
        pendingImport = null;
        report.setText("Inspecting " + source + "\nNo vessel or simulation state will change during this step.\n\n");

        new SwingWorker<PendingImport, Void>() {
            @Override
            protected PendingImport doInBackground() throws Exception {
                return inspectAndPlan(source);
            }

            @Override
            protected void done() {
                try {
                    pendingImport = get();
                    report.setText(render(pendingImport));
                    report.setCaretPosition(0);
                    boolean canAccept = pendingImport.officialInspection() != null
                            && pendingImport.plan().artifactAction() == ArtifactAction.RECORDED_INSPECTION_ONLY
                            && !pendingImport.acceptedVessels().isEmpty();
                    acceptButton.setEnabled(canAccept);
                    acceptButton.setText(canAccept
                            ? "Accept " + pendingImport.acceptedVessels().size() + " Vessel"
                                    + (pendingImport.acceptedVessels().size() == 1 ? "" : "s")
                            : "Accept Vessel Import");
                    operationStatus.setText(canAccept ? "Plan awaiting approval" : "Inspection complete");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Inspection interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Inspection failed", cause(exception));
                } finally {
                    setBusy(false, operationStatus.getText());
                }
            }
        }.execute();
    }

    private PendingImport inspectAndPlan(Path source) throws Exception {
        String lower = source.getFileName().toString().toLowerCase(Locale.ROOT);
        if (lower.endsWith(".json")) {
            InspectionReport inspection = WebSuiteV22Inspector.inspect(source);
            ImportPlan plan;
            try (SqliteWorldStore store = SqliteWorldStore.open(world)) {
                plan = store.inspectAndPlan(inspection);
            }
            return new PendingImport(source, inspection, null, plan, List.of());
        }
        if (lower.endsWith(".save") || lower.endsWith(".sub")) {
            Inspection inspection = BarotraumaSaveInspector.inspect(source);
            ImportPlan plan;
            try (SqliteWorldStore store = SqliteWorldStore.open(world)) {
                plan = store.inspectAndPlan(inspection);
            }
            List<AcceptedVesselCandidate> vessels = acceptedVessels(inspection);
            return new PendingImport(source, null, inspection, plan, vessels);
        }
        throw new IOException("Unsupported source extension; expected .json, .save, or .sub.");
    }

    private static List<AcceptedVesselCandidate> acceptedVessels(Inspection inspection) {
        if (inspection instanceof CampaignInspection campaign) {
            return campaign.submarines().stream()
                    .map(submarine -> AcceptedImportTransaction.from(submarine, campaign.saveTime()))
                    .toList();
        }
        StandaloneSubmarineInspection standalone = (StandaloneSubmarineInspection) inspection;
        return List.of(AcceptedImportTransaction.from(standalone.submarine(), null));
    }

    private void acceptPendingImport() {
        if (world == null || pendingImport == null || pendingImport.acceptedVessels().isEmpty()) return;
        int count = pendingImport.acceptedVessels().size();
        int choice = JOptionPane.showConfirmDialog(
                this,
                "Commit " + count + " vessel" + (count == 1 ? "" : "s")
                        + " to this desktop world?\n\n"
                        + "Submarine definitions will be reused by canonical structure. "
                        + "Each accepted vessel will receive a separate world identity and source snapshot.",
                "Accept inspected vessel import",
                JOptionPane.OK_CANCEL_OPTION,
                JOptionPane.WARNING_MESSAGE
        );
        if (choice != JOptionPane.OK_OPTION) return;

        setBusy(true, "Committing accepted import…");
        ImportPlan plan = pendingImport.plan();
        AcceptedImportRequest request = new AcceptedImportRequest(
                plan.artifactId(),
                plan.artifact().artifactIdentity().digest(),
                "desktop-user",
                pendingImport.acceptedVessels()
        );

        new SwingWorker<CommitResult, Void>() {
            @Override
            protected CommitResult doInBackground() throws Exception {
                return AcceptedImportTransaction.commit(world, request);
            }

            @Override
            protected void done() {
                try {
                    CommitResult result = get();
                    report.append(renderCommit(result));
                    report.setCaretPosition(report.getDocument().getLength());
                    pendingImport = null;
                    acceptButton.setEnabled(false);
                    acceptButton.setText("Accept Vessel Import");
                    operationStatus.setText("Accepted import committed");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Import interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Accepted import failed and was rolled back", cause(exception));
                } finally {
                    setBusy(false, operationStatus.getText());
                }
            }
        }.execute();
    }

    private static String render(PendingImport pending) {
        StringBuilder output = new StringBuilder();
        if (pending.webInspection() != null) {
            output.append(pending.webInspection().toHumanReadableText()).append('\n');
        } else {
            output.append(officialSummary(pending.officialInspection()));
        }

        ImportPlan plan = pending.plan();
        output.append("\nDesktop import plan\n")
                .append("Artifact ID: ").append(plan.artifactId()).append('\n')
                .append("Artifact action: ").append(plan.artifactAction()).append('\n')
                .append("Changes simulation state: ").append(plan.changesSimulationState()).append('\n')
                .append("Definition candidates: ").append(plan.definitions().size()).append('\n');

        for (DefinitionPlan definition : plan.definitions()) {
            output.append("  - ")
                    .append(blank(definition.candidate().displayName(), "Unnamed submarine"))
                    .append("\n    Canonical SHA-256: ")
                    .append(definition.candidate().canonicalXmlDigest().value())
                    .append("\n    Planned action: ")
                    .append(definition.action())
                    .append("\n    Reason: ")
                    .append(definition.explanation())
                    .append('\n');
        }
        for (String warning : plan.warnings()) output.append("WARNING: ").append(warning).append('\n');

        if (plan.artifactAction() == ArtifactAction.SKIP_EXACT_ARTIFACT) {
            output.append("\nThis exact source was already inspected. No accepted import is available from this plan.\n");
        } else if (pending.officialInspection() == null) {
            output.append("\nVersion-22 world import remains inspection-only in this phase.\n");
        } else {
            output.append("\nApproval boundary\n")
                    .append("Accepting will create ")
                    .append(pending.acceptedVessels().size())
                    .append(" physical vessel instance(s) and the same number of immutable source snapshots.\n")
                    .append("No crew, economy, route, or simulation event state is created by this transaction.\n");
        }
        return output.toString();
    }

    private static String officialSummary(Inspection inspection) {
        StringBuilder output = new StringBuilder("Official Barotrauma source inspection\n")
                .append("Source: ").append(inspection.sourceName()).append('\n')
                .append("SHA-256: ").append(inspection.artifactIdentity().digest().value()).append('\n')
                .append("Bytes: ").append(inspection.artifactIdentity().byteLength()).append('\n');
        if (inspection instanceof CampaignInspection campaign) {
            output.append("Type: campaign save\n")
                    .append("Game version: ").append(campaign.gameVersion()).append('\n')
                    .append("Save time: ").append(campaign.saveTime() == null ? "not declared" : campaign.saveTime()).append('\n')
                    .append("Selected submarine: ").append(blank(campaign.selectedSubmarineName(), "not declared")).append('\n')
                    .append("Submarine payloads: ").append(campaign.submarines().size()).append('\n');
            for (String warning : campaign.warnings()) output.append("WARNING: ").append(warning).append('\n');
        } else {
            StandaloneSubmarineInspection standalone = (StandaloneSubmarineInspection) inspection;
            output.append("Type: standalone submarine\n")
                    .append("Submarine: ").append(blank(standalone.submarine().name(), "unnamed")).append('\n')
                    .append("Class: ").append(blank(standalone.submarine().submarineClass(), "not declared")).append('\n');
        }
        return output.toString();
    }

    private static String renderCommit(CommitResult result) {
        StringBuilder output = new StringBuilder("\n\nAccepted import committed\n")
                .append("Imported at: ").append(result.importedAt()).append('\n')
                .append("Definitions created: ").append(result.definitionsCreated()).append('\n')
                .append("Definitions reused: ").append(result.definitionsReused()).append('\n')
                .append("Vessels created: ").append(result.vessels().size()).append('\n');
        result.vessels().forEach(vessel -> output.append("  - ")
                .append(vessel.displayName())
                .append("\n    Vessel ID: ").append(vessel.vesselId())
                .append("\n    Definition ID: ").append(vessel.definitionId())
                .append("\n    Snapshot ID: ").append(vessel.snapshotId())
                .append("\n    Definition created: ").append(vessel.definitionCreated())
                .append('\n'));
        return output.toString();
    }

    private void setBusy(boolean busy, String message) {
        createWorldButton.setEnabled(!busy);
        openWorldButton.setEnabled(!busy);
        inspectButton.setEnabled(!busy && world != null);
        clearButton.setEnabled(!busy);
        if (busy) acceptButton.setEnabled(false);
        operationStatus.setText(message);
    }

    private void clearReport() {
        pendingImport = null;
        acceptButton.setEnabled(false);
        acceptButton.setText("Accept Vessel Import");
        operationStatus.setText("Cleared");
        report.setText(world == null
                ? "Create or open a desktop world before inspecting a source.\n"
                : "World remains open: " + world.root() + "\n");
    }

    private void showFailure(String title, Throwable throwable) {
        pendingImport = null;
        acceptButton.setEnabled(false);
        acceptButton.setText("Accept Vessel Import");
        operationStatus.setText(title);
        report.append("\n\n" + title + "\n" + throwable.getClass().getSimpleName()
                + ": " + throwable.getMessage() + "\n");
        JOptionPane.showMessageDialog(this, throwable.getMessage(), title, JOptionPane.ERROR_MESSAGE);
    }

    private static Throwable cause(ExecutionException exception) {
        return exception.getCause() == null ? exception : exception.getCause();
    }

    private static String blank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private record PendingImport(
            Path source,
            InspectionReport webInspection,
            Inspection officialInspection,
            ImportPlan plan,
            List<AcceptedVesselCandidate> acceptedVessels
    ) {
        private PendingImport {
            acceptedVessels = List.copyOf(new ArrayList<>(acceptedVessels));
        }
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try {
                UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
            } catch (Exception exception) {
                System.err.println("Could not activate the system look and feel: " + exception.getMessage());
            }
            WorldImportApprovalWindow window = new WorldImportApprovalWindow();
            window.setVisible(true);
        });
    }
}
