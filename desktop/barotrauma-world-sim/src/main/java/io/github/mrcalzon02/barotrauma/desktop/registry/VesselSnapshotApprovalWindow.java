package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector;
import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector.CampaignInspection;
import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector.Inspection;
import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector.StandaloneSubmarineInspection;
import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector.SubmarineInspection;
import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ArtifactAction;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ImportPlan;
import io.github.mrcalzon02.barotrauma.persistence.VesselSnapshotTransaction;
import io.github.mrcalzon02.barotrauma.persistence.VesselSnapshotTransaction.NonNewerPolicy;
import io.github.mrcalzon02.barotrauma.persistence.VesselSnapshotTransaction.SnapshotAttachment;
import io.github.mrcalzon02.barotrauma.persistence.VesselSnapshotTransaction.SnapshotCommitResult;
import io.github.mrcalzon02.barotrauma.persistence.VesselSnapshotTransaction.SnapshotImportRequest;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.persistence.WorldVesselRegistry;
import io.github.mrcalzon02.barotrauma.persistence.WorldVesselRegistry.RegistrySnapshot;
import io.github.mrcalzon02.barotrauma.persistence.WorldVesselRegistry.VesselRow;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JComboBox;
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
import java.time.Instant;
import java.util.concurrent.ExecutionException;

/** Explicit desktop workflow for appending a reviewed source snapshot to one existing vessel. */
public final class VesselSnapshotApprovalWindow extends JFrame {

    private final DesktopWorldSession session = DesktopWorldSession.global();
    private final JButton openWorldButton = new JButton("Open World");
    private final JButton inspectButton = new JButton("Inspect Snapshot Source");
    private final JButton attachButton = new JButton("Attach Snapshot");
    private final JButton refreshButton = new JButton("Refresh Vessels");
    private final JComboBox<VesselChoice> vesselChoice = new JComboBox<>();
    private final JLabel worldStatus = new JLabel("No desktop world open");
    private final JLabel operationStatus = new JLabel("Ready");
    private final JTextArea report = new JTextArea();

    private WorldPaths world;
    private Path lastDirectory;
    private PendingSnapshot pending;
    private AutoCloseable sessionSubscription;

    public VesselSnapshotApprovalWindow() {
        super("Barotrauma Vessel Snapshot Approval");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(900, 650));
        setSize(1080, 760);
        setLocationByPlatform(true);
        setLayout(new BorderLayout(10, 10));

        JPanel header = new JPanel(new BorderLayout(12, 8));
        header.setBorder(BorderFactory.createEmptyBorder(12, 12, 0, 12));
        JPanel identity = new JPanel(new BorderLayout(6, 6));
        identity.add(worldStatus, BorderLayout.NORTH);
        identity.add(vesselChoice, BorderLayout.SOUTH);
        header.add(identity, BorderLayout.CENTER);
        header.add(operationStatus, BorderLayout.EAST);
        add(header, BorderLayout.NORTH);

        report.setEditable(false);
        report.setLineWrap(false);
        report.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 13));
        report.setText("Open a desktop world and select an existing physical vessel.\n"
                + "Standalone .sub files and one-payload campaign saves are accepted here.\n");
        JScrollPane scroll = new JScrollPane(report);
        scroll.setBorder(BorderFactory.createEmptyBorder(0, 12, 0, 12));
        add(scroll, BorderLayout.CENTER);

        JPanel footer = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        footer.setBorder(BorderFactory.createEmptyBorder(0, 12, 12, 12));
        footer.add(openWorldButton);
        footer.add(refreshButton);
        footer.add(inspectButton);
        footer.add(attachButton);
        add(footer, BorderLayout.SOUTH);

        refreshButton.setEnabled(false);
        inspectButton.setEnabled(false);
        attachButton.setEnabled(false);
        vesselChoice.setEnabled(false);
        openWorldButton.addActionListener(event -> openWorld());
        refreshButton.addActionListener(event -> refreshVessels(null));
        inspectButton.addActionListener(event -> chooseAndInspect());
        attachButton.addActionListener(event -> attachSnapshot());
        vesselChoice.addActionListener(event -> {
            pending = null;
            attachButton.setEnabled(false);
        });
        sessionSubscription = session.addListener(this::activateSharedWorld, true);
    }

    private void openWorld() {
        JFileChooser chooser = lastDirectory == null ? new JFileChooser() : new JFileChooser(lastDirectory.toFile());
        chooser.setDialogTitle("Open an existing Barotrauma desktop world");
        chooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
        chooser.setAcceptAllFileFilterUsed(false);
        if (chooser.showOpenDialog(this) != JFileChooser.APPROVE_OPTION) return;
        try {
            session.activate(WorldStorageContracts.openWorld(chooser.getSelectedFile().toPath()));
        } catch (Exception exception) {
            showFailure("World open failed", exception);
        }
    }

    private void activateSharedWorld(WorldPaths sharedWorld) {
        world = sharedWorld;
        pending = null;
        vesselChoice.removeAllItems();
        attachButton.setEnabled(false);
        if (sharedWorld == null) {
            worldStatus.setText("No desktop world open");
            refreshButton.setEnabled(false);
            inspectButton.setEnabled(false);
            vesselChoice.setEnabled(false);
            report.setText("Open a desktop world before attaching a vessel snapshot.\n");
            return;
        }
        lastDirectory = sharedWorld.root().getParent();
        worldStatus.setText("Shared world: " + sharedWorld.root());
        refreshButton.setEnabled(true);
        refreshVessels(null);
    }

    private void refreshVessels(java.util.UUID preferredVesselId) {
        WorldPaths selectedWorld = world;
        if (selectedWorld == null) return;
        setBusy(true, "Loading physical vessels…");
        pending = null;
        attachButton.setEnabled(false);
        new SwingWorker<RegistrySnapshot, Void>() {
            @Override protected RegistrySnapshot doInBackground() throws Exception {
                return WorldVesselRegistry.load(selectedWorld);
            }
            @Override protected void done() {
                try {
                    RegistrySnapshot registry = get();
                    if (!selectedWorld.equals(world)) return;
                    vesselChoice.removeAllItems();
                    int preferredIndex = -1;
                    for (VesselRow vessel : registry.vessels()) {
                        int index = vesselChoice.getItemCount();
                        vesselChoice.addItem(new VesselChoice(vessel));
                        if (preferredVesselId != null && preferredVesselId.equals(vessel.vesselId())) preferredIndex = index;
                    }
                    vesselChoice.setEnabled(vesselChoice.getItemCount() > 0);
                    inspectButton.setEnabled(vesselChoice.getItemCount() > 0);
                    if (preferredIndex >= 0) vesselChoice.setSelectedIndex(preferredIndex);
                    operationStatus.setText(vesselChoice.getItemCount() == 0
                            ? "World contains no physical vessels"
                            : "Loaded " + vesselChoice.getItemCount() + " physical vessel(s)");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Vessel refresh interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Vessel refresh failed", cause(exception));
                } finally {
                    setBusy(false, operationStatus.getText());
                }
            }
        }.execute();
    }

    private void chooseAndInspect() {
        VesselChoice selected = (VesselChoice) vesselChoice.getSelectedItem();
        if (world == null || selected == null) return;
        JFileChooser chooser = lastDirectory == null ? new JFileChooser() : new JFileChooser(lastDirectory.toFile());
        chooser.setDialogTitle("Inspect a source state for the selected physical vessel");
        chooser.setFileFilter(new FileNameExtensionFilter("Official Barotrauma sources (*.save, *.sub)", "save", "sub"));
        if (chooser.showOpenDialog(this) != JFileChooser.APPROVE_OPTION) return;
        Path source = chooser.getSelectedFile().toPath();
        lastDirectory = source.getParent();
        inspect(source, selected.vessel());
    }

    private void inspect(Path source, VesselRow vessel) {
        WorldPaths selectedWorld = world;
        setBusy(true, "Inspecting snapshot source…");
        pending = null;
        attachButton.setEnabled(false);
        report.setText("Inspecting " + source + "\nNo vessel state will change during inspection.\n\n");
        new SwingWorker<PendingSnapshot, Void>() {
            @Override protected PendingSnapshot doInBackground() throws Exception {
                Inspection inspection = BarotraumaSaveInspector.inspect(source);
                SourceSelection selection = selectSingleSource(inspection);
                ImportPlan plan;
                try (SqliteWorldStore store = SqliteWorldStore.open(selectedWorld)) {
                    plan = store.inspectAndPlan(inspection);
                }
                if (plan.artifact().importedAt() != null) throw new IOException("This exact source artifact has already been imported.");
                boolean definitionMatches = vessel.canonicalDefinitionDigest()
                        .equals(selection.submarine().definitionIdentity().canonicalXmlDigest());
                Chronology chronology = chronology(vessel, selection.sourceTimestamp());
                return new PendingSnapshot(source, vessel, selection, plan, definitionMatches, chronology);
            }
            @Override protected void done() {
                try {
                    PendingSnapshot loaded = get();
                    if (!selectedWorld.equals(world)) return;
                    pending = loaded;
                    report.setText(render(loaded));
                    report.setCaretPosition(0);
                    attachButton.setEnabled(loaded.definitionMatches());
                    operationStatus.setText(loaded.definitionMatches() ? "Snapshot awaiting approval" : "Structural definition mismatch");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Snapshot inspection interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Snapshot inspection failed", cause(exception));
                } finally {
                    setBusy(false, operationStatus.getText());
                }
            }
        }.execute();
    }

    private static SourceSelection selectSingleSource(Inspection inspection) throws IOException {
        if (inspection instanceof StandaloneSubmarineInspection standalone) return new SourceSelection(standalone.submarine(), null);
        CampaignInspection campaign = (CampaignInspection) inspection;
        if (campaign.submarines().size() != 1) {
            throw new IOException("Use the campaign archive mapper for saves containing more than one submarine payload.");
        }
        return new SourceSelection(campaign.submarines().get(0), campaign.saveTime());
    }

    private void attachSnapshot() {
        if (world == null || pending == null || !pending.definitionMatches()) return;
        NonNewerPolicy policy = NonNewerPolicy.REJECT;
        if (pending.chronology() != Chronology.NEWER && pending.chronology() != Chronology.FIRST_SNAPSHOT) {
            int historical = JOptionPane.showConfirmDialog(this,
                    "This source is not demonstrably newer than the vessel's current snapshot.\n\n"
                            + "Retain it as a historical snapshot without changing current vessel state?",
                    "Retain historical snapshot", JOptionPane.OK_CANCEL_OPTION, JOptionPane.WARNING_MESSAGE);
            if (historical != JOptionPane.OK_OPTION) return;
            policy = NonNewerPolicy.RETAIN_HISTORICAL;
        }
        int confirmation = JOptionPane.showConfirmDialog(this,
                "Attach the inspected source to physical vessel:\n" + pending.vessel().displayName() + "\n"
                        + pending.vessel().vesselId() + "\n\nChronology decision: " + pending.chronology().description,
                "Approve vessel snapshot attachment", JOptionPane.OK_CANCEL_OPTION, JOptionPane.WARNING_MESSAGE);
        if (confirmation != JOptionPane.OK_OPTION) return;

        NonNewerPolicy finalPolicy = policy;
        SnapshotImportRequest request = new SnapshotImportRequest(pending.plan().artifactId(),
                pending.plan().artifact().artifactIdentity().digest(), "desktop-user",
                java.util.List.of(new SnapshotAttachment(pending.vessel().vesselId(), null,
                        pending.selection().submarine().definitionIdentity().canonicalXmlDigest(),
                        pending.selection().submarine().payloadIdentity().digest(),
                        pending.selection().sourceTimestamp(), finalPolicy)));
        WorldPaths selectedWorld = world;
        java.util.UUID selectedVesselId = pending.vessel().vesselId();
        setBusy(true, "Committing snapshot attachment…");
        new SwingWorker<SnapshotCommitResult, Void>() {
            @Override protected SnapshotCommitResult doInBackground() throws Exception {
                return VesselSnapshotTransaction.commit(selectedWorld, request);
            }
            @Override protected void done() {
                try {
                    SnapshotCommitResult result = get();
                    report.append(renderCommit(result));
                    report.setCaretPosition(report.getDocument().getLength());
                    pending = null;
                    attachButton.setEnabled(false);
                    operationStatus.setText("Snapshot attachment committed");
                    refreshVessels(selectedVesselId);
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Snapshot attachment interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Snapshot attachment failed and was rolled back", cause(exception));
                } finally {
                    setBusy(false, operationStatus.getText());
                }
            }
        }.execute();
    }

    private static Chronology chronology(VesselRow vessel, Instant incoming) {
        if (vessel.currentSnapshotId() == null) return Chronology.FIRST_SNAPSHOT;
        Instant current = vessel.currentSnapshotSourceTimestamp();
        if (incoming != null && current != null && incoming.isAfter(current)) return Chronology.NEWER;
        if (incoming == null) return Chronology.SOURCE_TIME_UNKNOWN;
        if (current == null) return Chronology.CURRENT_TIME_UNKNOWN;
        if (incoming.equals(current)) return Chronology.EQUAL_TIME;
        return Chronology.OLDER;
    }

    private static String render(PendingSnapshot pending) {
        SubmarineInspection submarine = pending.selection().submarine();
        StringBuilder output = new StringBuilder("Vessel snapshot inspection\n")
                .append("Source: ").append(pending.source()).append('\n')
                .append("Artifact action: ").append(pending.plan().artifactAction()).append('\n')
                .append("Artifact ID: ").append(pending.plan().artifactId()).append('\n')
                .append("Target vessel: ").append(pending.vessel().displayName()).append('\n')
                .append("Target vessel ID: ").append(pending.vessel().vesselId()).append('\n')
                .append("Target definition: ").append(pending.vessel().canonicalDefinitionDigest().value()).append('\n')
                .append("Source submarine: ").append(blank(submarine.name())).append('\n')
                .append("Source definition: ").append(submarine.definitionIdentity().canonicalXmlDigest().value()).append('\n')
                .append("Source snapshot: ").append(submarine.payloadIdentity().digest().value()).append('\n')
                .append("Current source time: ").append(instant(pending.vessel().currentSnapshotSourceTimestamp())).append('\n')
                .append("Incoming source time: ").append(instant(pending.selection().sourceTimestamp())).append('\n')
                .append("Chronology: ").append(pending.chronology().description).append("\n\n")
                .append("Structural match: ").append(pending.definitionMatches() ? "YES" : "NO").append('\n');
        if (!pending.definitionMatches()) output.append("Canonical submarine structure differs; attachment is blocked.\n");
        else if (pending.chronology() == Chronology.NEWER) output.append("Approval promotes this source as current.\n");
        else if (pending.chronology() == Chronology.FIRST_SNAPSHOT) output.append("Approval establishes the first current snapshot.\n");
        else output.append("Approval requires separate historical-retention confirmation.\n");
        if (pending.plan().artifactAction() == ArtifactAction.SKIP_EXACT_ARTIFACT) {
            output.append("The source was inspected previously but remains unimported; this approval may resume it.\n");
        }
        return output.toString();
    }

    private static String renderCommit(SnapshotCommitResult result) {
        StringBuilder output = new StringBuilder("\nSnapshot transaction committed\nCommitted at: ")
                .append(result.committedAt()).append("\nPromoted current: ").append(result.promotedCurrent())
                .append("\nRetained historical: ").append(result.retainedHistorical())
                .append("\nSkipped exact: ").append(result.skippedExact()).append('\n');
        result.attachments().forEach(attachment -> output.append("  - ").append(attachment.vesselDisplayName())
                .append(" · ").append(attachment.action()).append(" · ").append(attachment.snapshotId()).append('\n'));
        return output.toString();
    }

    private void setBusy(boolean busy, String message) {
        openWorldButton.setEnabled(!busy);
        refreshButton.setEnabled(!busy && world != null);
        inspectButton.setEnabled(!busy && world != null && vesselChoice.getItemCount() > 0);
        vesselChoice.setEnabled(!busy && vesselChoice.getItemCount() > 0);
        if (busy) attachButton.setEnabled(false);
        operationStatus.setText(message);
    }

    private void showFailure(String title, Throwable throwable) {
        pending = null;
        attachButton.setEnabled(false);
        operationStatus.setText(title);
        report.append("\n" + title + "\n" + throwable.getClass().getSimpleName() + ": " + throwable.getMessage() + "\n");
        JOptionPane.showMessageDialog(this, throwable.getMessage(), title, JOptionPane.ERROR_MESSAGE);
    }

    @Override public void dispose() {
        if (sessionSubscription != null) {
            try { sessionSubscription.close(); } catch (Exception ignored) { }
            sessionSubscription = null;
        }
        super.dispose();
    }

    private static Throwable cause(ExecutionException exception) { return exception.getCause() == null ? exception : exception.getCause(); }
    private static String blank(String value) { return value == null || value.isBlank() ? "Unnamed submarine" : value; }
    private static String instant(Instant value) { return value == null ? "not declared" : value.toString(); }

    private enum Chronology {
        FIRST_SNAPSHOT("first known snapshot; establish current state"),
        NEWER("newer than current; promote after approval"),
        OLDER("older than current; historical retention required"),
        EQUAL_TIME("same source timestamp but different payload; historical retention required"),
        SOURCE_TIME_UNKNOWN("incoming source time is unknown; historical retention required"),
        CURRENT_TIME_UNKNOWN("current source time is unknown; historical retention required");
        private final String description;
        Chronology(String description) { this.description = description; }
    }

    private record SourceSelection(SubmarineInspection submarine, Instant sourceTimestamp) { }
    private record PendingSnapshot(Path source, VesselRow vessel, SourceSelection selection,
                                   ImportPlan plan, boolean definitionMatches, Chronology chronology) { }
    private record VesselChoice(VesselRow vessel) {
        @Override public String toString() {
            return blank(vessel.displayName()) + " · " + vessel.vesselId() + " · " + blank(vessel.submarineClass());
        }
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try { UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName()); }
            catch (Exception exception) {
                System.err.println("Could not activate system look and feel: " + exception.getMessage());
            }
            new VesselSnapshotApprovalWindow().setVisible(true);
        });
    }
}
