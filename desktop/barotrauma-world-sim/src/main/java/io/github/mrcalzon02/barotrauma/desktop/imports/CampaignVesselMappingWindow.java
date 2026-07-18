package io.github.mrcalzon02.barotrauma.desktop.imports;

import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector;
import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector.CampaignInspection;
import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector.Inspection;
import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector.SubmarineInspection;
import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.persistence.CampaignArchiveImportTransaction;
import io.github.mrcalzon02.barotrauma.persistence.CampaignArchiveImportTransaction.ArchiveCommitResult;
import io.github.mrcalzon02.barotrauma.persistence.CampaignArchiveImportTransaction.ArchiveImportRequest;
import io.github.mrcalzon02.barotrauma.persistence.CampaignArchiveImportTransaction.CampaignMapping;
import io.github.mrcalzon02.barotrauma.persistence.CampaignArchiveImportTransaction.MappingMode;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ArtifactAction;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ImportPlan;
import io.github.mrcalzon02.barotrauma.persistence.VesselSnapshotTransaction.NonNewerPolicy;
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
import javax.swing.JTable;
import javax.swing.JTextArea;
import javax.swing.SwingUtilities;
import javax.swing.SwingWorker;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import javax.swing.filechooser.FileNameExtensionFilter;
import javax.swing.table.DefaultTableModel;
import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.io.IOException;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutionException;

/** Explicit row-by-row mapping workflow for every submarine payload in one official campaign save. */
public final class CampaignVesselMappingWindow extends JFrame {

    private final DesktopWorldSession session = DesktopWorldSession.global();
    private final JButton openWorldButton = new JButton("Open World");
    private final JButton inspectButton = new JButton("Inspect Campaign Save");
    private final JButton applyButton = new JButton("Apply Row Mapping");
    private final JButton commitButton = new JButton("Commit Entire Campaign Mapping");
    private final JComboBox<MappingMode> modeChoice = new JComboBox<>(MappingMode.values());
    private final JComboBox<VesselChoice> vesselChoice = new JComboBox<>();
    private final JComboBox<NonNewerPolicy> policyChoice = new JComboBox<>(NonNewerPolicy.values());
    private final JLabel worldStatus = new JLabel("No desktop world open");
    private final JLabel operationStatus = new JLabel("Ready");
    private final JLabel mappingStatus = new JLabel("No campaign inspected");
    private final JTextArea detail = new JTextArea();
    private final DefaultTableModel tableModel = new DefaultTableModel(
            new String[]{"#", "Source submarine", "Class", "Tier", "Action", "Target vessel", "Policy", "Chronology", "Canonical SHA-256"}, 0) {
        @Override public boolean isCellEditable(int row, int column) { return false; }
    };
    private final JTable table = new JTable(tableModel);

    private WorldPaths world;
    private Path lastDirectory;
    private PendingCampaign pending;
    private AutoCloseable sessionSubscription;

    public CampaignVesselMappingWindow() {
        super("Barotrauma Campaign Vessel Mapping");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(1100, 700));
        setSize(1450, 850);
        setLocationByPlatform(true);
        setLayout(new BorderLayout(10, 10));

        JPanel header = new JPanel(new BorderLayout(12, 8));
        header.setBorder(BorderFactory.createEmptyBorder(12, 12, 0, 12));
        JPanel worldBlock = new JPanel(new BorderLayout(4, 4));
        worldBlock.add(worldStatus, BorderLayout.NORTH);
        worldBlock.add(mappingStatus, BorderLayout.SOUTH);
        header.add(worldBlock, BorderLayout.WEST);
        header.add(operationStatus, BorderLayout.EAST);
        add(header, BorderLayout.NORTH);

        table.setAutoCreateRowSorter(true);
        table.setFillsViewportHeight(true);
        table.setAutoResizeMode(JTable.AUTO_RESIZE_OFF);
        table.getSelectionModel().addListSelectionListener(event -> {
            if (!event.getValueIsAdjusting()) loadSelectedRowControls();
        });
        JScrollPane tableScroll = new JScrollPane(table);
        tableScroll.setPreferredSize(new Dimension(1200, 440));

        detail.setEditable(false);
        detail.setRows(8);
        detail.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 12));
        detail.setText("Open a desktop world, then inspect an official campaign .save archive.\n"
                + "Every submarine payload defaults to CREATE_NEW_VESSEL until explicitly changed.\n");

        JPanel center = new JPanel(new BorderLayout(8, 8));
        center.setBorder(BorderFactory.createEmptyBorder(0, 12, 0, 12));
        center.add(tableScroll, BorderLayout.CENTER);
        center.add(new JScrollPane(detail), BorderLayout.SOUTH);
        add(center, BorderLayout.CENTER);

        JPanel mappingControls = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        mappingControls.add(new JLabel("Selected row action:"));
        mappingControls.add(modeChoice);
        mappingControls.add(new JLabel("Existing vessel:"));
        mappingControls.add(vesselChoice);
        mappingControls.add(new JLabel("Non-newer policy:"));
        mappingControls.add(policyChoice);
        mappingControls.add(applyButton);

        JPanel commandControls = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        commandControls.add(openWorldButton);
        commandControls.add(inspectButton);
        commandControls.add(commitButton);

        JPanel footer = new JPanel(new BorderLayout(8, 8));
        footer.setBorder(BorderFactory.createEmptyBorder(0, 12, 12, 12));
        footer.add(mappingControls, BorderLayout.NORTH);
        footer.add(commandControls, BorderLayout.SOUTH);
        add(footer, BorderLayout.SOUTH);

        inspectButton.setEnabled(false);
        applyButton.setEnabled(false);
        commitButton.setEnabled(false);
        modeChoice.setEnabled(false);
        vesselChoice.setEnabled(false);
        policyChoice.setEnabled(false);

        openWorldButton.addActionListener(event -> openWorld());
        inspectButton.addActionListener(event -> chooseAndInspect());
        applyButton.addActionListener(event -> applySelectedMapping());
        commitButton.addActionListener(event -> commitMapping());
        modeChoice.addActionListener(event -> refreshMatchingVessels());
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
        tableModel.setRowCount(0);
        commitButton.setEnabled(false);
        applyButton.setEnabled(false);
        if (sharedWorld == null) {
            worldStatus.setText("No desktop world open");
            mappingStatus.setText("No campaign inspected");
            inspectButton.setEnabled(false);
            detail.setText("Open a desktop world before inspecting a campaign save.\n");
            return;
        }
        lastDirectory = sharedWorld.root().getParent();
        worldStatus.setText("World: " + sharedWorld.root());
        mappingStatus.setText("World ready for campaign mapping");
        inspectButton.setEnabled(true);
        detail.setText("Shared desktop world active:\n" + sharedWorld.root()
                + "\n\nInspect a campaign save to begin explicit payload mapping.\n");
    }

    private void chooseAndInspect() {
        if (world == null) return;
        JFileChooser chooser = lastDirectory == null ? new JFileChooser() : new JFileChooser(lastDirectory.toFile());
        chooser.setDialogTitle("Inspect official Barotrauma campaign save");
        chooser.setFileFilter(new FileNameExtensionFilter("Barotrauma campaign saves (*.save)", "save"));
        if (chooser.showOpenDialog(this) != JFileChooser.APPROVE_OPTION) return;
        Path source = chooser.getSelectedFile().toPath();
        lastDirectory = source.getParent();
        inspect(source);
    }

    private void inspect(Path source) {
        WorldPaths selectedWorld = world;
        if (selectedWorld == null) return;
        setBusy(true, "Inspecting campaign archive…");
        pending = null;
        tableModel.setRowCount(0);
        detail.setText("Inspecting " + source + "\nNo vessel state will change during this step.\n");

        new SwingWorker<PendingCampaign, Void>() {
            @Override
            protected PendingCampaign doInBackground() throws Exception {
                Inspection inspection = BarotraumaSaveInspector.inspect(source);
                if (!(inspection instanceof CampaignInspection campaign)) {
                    throw new IOException("Campaign mapping requires an official .save archive.");
                }
                ImportPlan plan;
                try (SqliteWorldStore store = SqliteWorldStore.open(selectedWorld)) {
                    plan = store.inspectAndPlan(campaign);
                }
                if (plan.artifactAction() == ArtifactAction.SKIP_EXACT_ARTIFACT || plan.artifact().importedAt() != null) {
                    throw new IOException("This exact campaign source has already been inspected or imported.");
                }
                RegistrySnapshot registry = WorldVesselRegistry.load(selectedWorld);
                List<RowMapping> rows = new ArrayList<>();
                for (int index = 0; index < campaign.submarines().size(); index++) {
                    rows.add(new RowMapping(index, campaign.submarines().get(index)));
                }
                if (rows.isEmpty()) throw new IOException("The campaign archive contains no submarine payloads.");
                return new PendingCampaign(source, campaign, plan, registry, rows);
            }

            @Override
            protected void done() {
                try {
                    PendingCampaign loaded = get();
                    if (!selectedWorld.equals(world)) return;
                    pending = loaded;
                    populateRows();
                    table.setRowSelectionInterval(0, 0);
                    mappingStatus.setText("Mapped 0/" + pending.rows().size() + " rows explicitly; defaults create new vessels");
                    operationStatus.setText("Campaign mapping ready");
                    validateCommit();
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Campaign inspection interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Campaign inspection failed", cause(exception));
                } finally {
                    setBusy(false, operationStatus.getText());
                }
            }
        }.execute();
    }

    private void populateRows() {
        tableModel.setRowCount(0);
        if (pending == null) return;
        for (RowMapping row : pending.rows()) {
            tableModel.addRow(new Object[]{
                    row.ordinal() + 1,
                    blank(row.submarine().name(), "Unnamed submarine"),
                    blank(row.submarine().submarineClass(), ""),
                    nullable(row.submarine().tier()),
                    row.mode(),
                    row.targetVesselId() == null ? "" : targetLabel(row.targetVesselId()),
                    row.policy(),
                    chronology(row),
                    row.submarine().definitionIdentity().canonicalXmlDigest().value()
            });
        }
    }

    private void loadSelectedRowControls() {
        RowMapping row = selectedRow();
        boolean selected = row != null;
        modeChoice.setEnabled(selected);
        policyChoice.setEnabled(selected);
        applyButton.setEnabled(selected);
        if (!selected) {
            vesselChoice.removeAllItems();
            vesselChoice.setEnabled(false);
            return;
        }
        modeChoice.setSelectedItem(row.mode());
        policyChoice.setSelectedItem(row.policy());
        refreshMatchingVessels();
        if (row.targetVesselId() != null) selectVessel(row.targetVesselId());
        renderSelectedDetail(row);
    }

    private void refreshMatchingVessels() {
        RowMapping row = selectedRow();
        MappingMode mode = (MappingMode) modeChoice.getSelectedItem();
        vesselChoice.removeAllItems();
        if (pending == null || row == null || mode != MappingMode.ATTACH_EXISTING_VESSEL) {
            vesselChoice.setEnabled(false);
            return;
        }
        for (VesselRow vessel : pending.registry().vessels()) {
            if (vessel.canonicalDefinitionDigest().equals(
                    row.submarine().definitionIdentity().canonicalXmlDigest())) {
                vesselChoice.addItem(new VesselChoice(vessel));
            }
        }
        vesselChoice.setEnabled(vesselChoice.getItemCount() > 0);
    }

    private void applySelectedMapping() {
        RowMapping row = selectedRow();
        if (row == null) return;
        MappingMode mode = (MappingMode) modeChoice.getSelectedItem();
        if (mode == null) return;
        UUID target = null;
        if (mode == MappingMode.ATTACH_EXISTING_VESSEL) {
            VesselChoice selected = (VesselChoice) vesselChoice.getSelectedItem();
            if (selected == null) {
                JOptionPane.showMessageDialog(this,
                        "No structurally matching physical vessel is selected for this row.",
                        "Mapping incomplete", JOptionPane.WARNING_MESSAGE);
                return;
            }
            target = selected.vessel().vesselId();
        }
        NonNewerPolicy policy = (NonNewerPolicy) policyChoice.getSelectedItem();
        row.apply(mode, target, policy == null ? NonNewerPolicy.REJECT : policy);
        populateRows();
        table.setRowSelectionInterval(row.ordinal(), row.ordinal());
        long explicit = pending.rows().stream().filter(RowMapping::explicitlyReviewed).count();
        mappingStatus.setText("Mapped " + explicit + "/" + pending.rows().size()
                + " rows explicitly; unreviewed rows still create new vessels");
        validateCommit();
    }

    private void validateCommit() {
        boolean valid = pending != null;
        String problem = null;
        Set<UUID> usedTargets = new java.util.HashSet<>();
        if (pending != null) {
            for (RowMapping row : pending.rows()) {
                if (row.mode() == MappingMode.ATTACH_EXISTING_VESSEL) {
                    VesselRow target = findVessel(row.targetVesselId());
                    if (target == null) { valid = false; problem = "An existing-vessel row has no target."; break; }
                    if (!usedTargets.add(target.vesselId())) {
                        valid = false; problem = "The same existing vessel is targeted more than once."; break;
                    }
                    if (!target.canonicalDefinitionDigest().equals(
                            row.submarine().definitionIdentity().canonicalXmlDigest())) {
                        valid = false; problem = "A target vessel no longer matches the source definition."; break;
                    }
                    if (!isDemonstrablyNewer(row, target) && row.policy() != NonNewerPolicy.RETAIN_HISTORICAL) {
                        valid = false; problem = "A non-newer existing-vessel row requires RETAIN_HISTORICAL."; break;
                    }
                }
            }
        }
        commitButton.setEnabled(valid);
        if (problem != null) operationStatus.setText(problem);
    }

    private void commitMapping() {
        if (pending == null || !commitButton.isEnabled()) return;
        int createCount = (int) pending.rows().stream()
                .filter(row -> row.mode() == MappingMode.CREATE_NEW_VESSEL).count();
        int attachCount = pending.rows().size() - createCount;
        int answer = JOptionPane.showConfirmDialog(this,
                "Commit the complete campaign archive as one transaction?\n\n"
                        + "Create new physical vessels: " + createCount + "\n"
                        + "Attach to existing physical vessels: " + attachCount + "\n\n"
                        + "Any invalid row will roll back the entire archive.",
                "Commit campaign vessel mapping", JOptionPane.OK_CANCEL_OPTION,
                JOptionPane.WARNING_MESSAGE);
        if (answer != JOptionPane.OK_OPTION) return;

        List<CampaignMapping> mappings = pending.rows().stream().map(this::toRequest).toList();
        ArchiveImportRequest request = new ArchiveImportRequest(pending.plan().artifactId(),
                pending.plan().artifact().artifactIdentity().digest(), "desktop-user", mappings);
        WorldPaths selectedWorld = world;
        setBusy(true, "Committing complete campaign mapping…");

        new SwingWorker<ArchiveCommitResult, Void>() {
            @Override protected ArchiveCommitResult doInBackground() throws Exception {
                return CampaignArchiveImportTransaction.commit(selectedWorld, request);
            }
            @Override protected void done() {
                try {
                    ArchiveCommitResult result = get();
                    detail.setText(renderCommit(result));
                    pending = null;
                    tableModel.setRowCount(0);
                    commitButton.setEnabled(false);
                    applyButton.setEnabled(false);
                    mappingStatus.setText("Campaign mapping committed");
                    operationStatus.setText("Archive transaction complete");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Campaign mapping interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Campaign mapping failed and was rolled back", cause(exception));
                } finally {
                    setBusy(false, operationStatus.getText());
                }
            }
        }.execute();
    }

    private CampaignMapping toRequest(RowMapping row) {
        SubmarineInspection submarine = row.submarine();
        return new CampaignMapping(row.ordinal(), row.mode(), row.targetVesselId(), null, null, null,
                submarine.definitionIdentity().canonicalXmlDigest(), submarine.payloadIdentity().digest(),
                submarine.equalityCheckValue(), submarine.name(), submarine.gameVersion(), submarine.type(),
                submarine.submarineClass(), submarine.tier(), pending.campaign().saveTime(), row.policy());
    }

    private String chronology(RowMapping row) {
        if (row.mode() == MappingMode.CREATE_NEW_VESSEL) return "First current snapshot";
        VesselRow target = findVessel(row.targetVesselId());
        if (target == null) return "Target required";
        if (target.currentSnapshotId() == null) return "First current snapshot";
        Instant incoming = pending.campaign().saveTime();
        Instant current = target.currentSnapshotSourceTimestamp();
        if (incoming != null && current != null && incoming.isAfter(current)) return "Newer; promote current";
        if (incoming == null || current == null) return "Timestamp unknown; historical approval required";
        if (incoming.equals(current)) return "Equal time; historical approval required";
        return "Older; historical approval required";
    }

    private boolean isDemonstrablyNewer(RowMapping row, VesselRow target) {
        if (target.currentSnapshotId() == null) return true;
        Instant incoming = pending.campaign().saveTime();
        Instant current = target.currentSnapshotSourceTimestamp();
        return incoming != null && current != null && incoming.isAfter(current);
    }

    private void renderSelectedDetail(RowMapping row) {
        SubmarineInspection submarine = row.submarine();
        detail.setText("Campaign source: " + pending.source() + "\n"
                + "Save time: " + nullable(pending.campaign().saveTime()) + "\n"
                + "Payload ordinal: " + (row.ordinal() + 1) + "\n"
                + "Submarine: " + blank(submarine.name(), "Unnamed") + "\n"
                + "Class / tier: " + blank(submarine.submarineClass(), "not declared") + " / "
                + nullable(submarine.tier()) + "\n"
                + "Canonical definition: " + submarine.definitionIdentity().canonicalXmlDigest().value() + "\n"
                + "Snapshot identity: " + submarine.payloadIdentity().digest().value() + "\n"
                + "Current mapping: " + row.mode() + "\n"
                + "Chronology: " + chronology(row) + "\n");
    }

    private String targetLabel(UUID vesselId) {
        VesselRow vessel = findVessel(vesselId);
        return vessel == null ? vesselId.toString() : blank(vessel.displayName(), "Unnamed") + " · " + vesselId;
    }

    private VesselRow findVessel(UUID vesselId) {
        if (pending == null || vesselId == null) return null;
        return pending.registry().vessels().stream().filter(vessel -> vessel.vesselId().equals(vesselId))
                .findFirst().orElse(null);
    }

    private void selectVessel(UUID vesselId) {
        for (int index = 0; index < vesselChoice.getItemCount(); index++) {
            if (vesselChoice.getItemAt(index).vessel().vesselId().equals(vesselId)) {
                vesselChoice.setSelectedIndex(index);
                return;
            }
        }
    }

    private RowMapping selectedRow() {
        if (pending == null) return null;
        int viewRow = table.getSelectedRow();
        if (viewRow < 0) return null;
        int modelRow = table.convertRowIndexToModel(viewRow);
        return pending.rows().get(modelRow);
    }

    private void setBusy(boolean busy, String message) {
        openWorldButton.setEnabled(!busy);
        inspectButton.setEnabled(!busy && world != null);
        table.setEnabled(!busy);
        if (busy) {
            applyButton.setEnabled(false);
            commitButton.setEnabled(false);
        } else if (pending != null) {
            loadSelectedRowControls();
            validateCommit();
        }
        operationStatus.setText(message);
    }

    private void showFailure(String title, Throwable throwable) {
        pending = null;
        tableModel.setRowCount(0);
        commitButton.setEnabled(false);
        applyButton.setEnabled(false);
        operationStatus.setText(title);
        detail.append("\n\n" + title + "\n" + throwable.getClass().getSimpleName() + ": "
                + throwable.getMessage() + "\n");
        JOptionPane.showMessageDialog(this, throwable.getMessage(), title, JOptionPane.ERROR_MESSAGE);
    }

    @Override public void dispose() {
        if (sessionSubscription != null) {
            try { sessionSubscription.close(); } catch (Exception ignored) { }
            sessionSubscription = null;
        }
        super.dispose();
    }

    private static String renderCommit(ArchiveCommitResult result) {
        StringBuilder text = new StringBuilder("Campaign archive committed atomically\n")
                .append("Committed at: ").append(result.committedAt()).append('\n')
                .append("Definitions created / reused: ").append(result.definitionsCreated()).append(" / ")
                .append(result.definitionsReused()).append('\n')
                .append("New physical vessels: ").append(result.vesselsCreated()).append('\n')
                .append("Snapshots promoted / historical / skipped: ").append(result.snapshotsPromoted())
                .append(" / ").append(result.snapshotsHistorical()).append(" / ")
                .append(result.snapshotsSkipped()).append('\n');
        result.mappings().forEach(row -> text.append("  #").append(row.sourceOrdinal() + 1)
                .append(" ").append(row.action()).append(" · ").append(row.displayName())
                .append(" · vessel ").append(row.vesselId()).append(" · snapshot ").append(row.snapshotId())
                .append('\n'));
        return text.toString();
    }

    private static String blank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
    private static Object nullable(Object value) { return value == null ? "" : value; }
    private static Throwable cause(ExecutionException exception) {
        return exception.getCause() == null ? exception : exception.getCause();
    }

    private record PendingCampaign(Path source, CampaignInspection campaign, ImportPlan plan,
                                   RegistrySnapshot registry, List<RowMapping> rows) {
        private PendingCampaign { rows = List.copyOf(rows); }
    }

    private static final class RowMapping {
        private final int ordinal;
        private final SubmarineInspection submarine;
        private MappingMode mode = MappingMode.CREATE_NEW_VESSEL;
        private UUID targetVesselId;
        private NonNewerPolicy policy = NonNewerPolicy.REJECT;
        private boolean explicitlyReviewed;

        private RowMapping(int ordinal, SubmarineInspection submarine) {
            this.ordinal = ordinal;
            this.submarine = submarine;
        }
        int ordinal() { return ordinal; }
        SubmarineInspection submarine() { return submarine; }
        MappingMode mode() { return mode; }
        UUID targetVesselId() { return targetVesselId; }
        NonNewerPolicy policy() { return policy; }
        boolean explicitlyReviewed() { return explicitlyReviewed; }
        void apply(MappingMode nextMode, UUID nextTarget, NonNewerPolicy nextPolicy) {
            mode = nextMode;
            targetVesselId = nextTarget;
            policy = nextPolicy;
            explicitlyReviewed = true;
        }
    }

    private record VesselChoice(VesselRow vessel) {
        @Override public String toString() {
            return blank(vessel.displayName(), "Unnamed") + " · " + vessel.vesselId();
        }
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try { UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName()); }
            catch (Exception exception) {
                System.err.println("Could not activate the system look and feel: " + exception.getMessage());
            }
            new CampaignVesselMappingWindow().setVisible(true);
        });
    }
}
