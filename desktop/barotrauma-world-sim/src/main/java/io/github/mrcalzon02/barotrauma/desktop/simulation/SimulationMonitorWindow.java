package io.github.mrcalzon02.barotrauma.desktop.simulation;

import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock.ClockSnapshot;
import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock.SchedulerState;
import io.github.mrcalzon02.barotrauma.simulation.PersistentSimulationSession;
import io.github.mrcalzon02.barotrauma.simulation.PersistentSimulationSession.DurableCommandResult;
import io.github.mrcalzon02.barotrauma.simulation.SimulationCommandExecutor;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSpinner;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SpinnerNumberModel;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.CompletionException;

/** Manual durable control surface for the deterministic simulation clock. */
public final class SimulationMonitorWindow extends JFrame {
    private static final Duration DEFAULT_TICK_SIZE = Duration.ofMinutes(1);

    private final DesktopWorldSession worldSession = DesktopWorldSession.global();
    private final JButton openWorldButton = new JButton("Open World");
    private final JButton reloadButton = new JButton("Reload Durable Clock");
    private final JButton enableButton = new JButton("Enable");
    private final JButton disableButton = new JButton("Disable");
    private final JButton stepButton = new JButton("Step");
    private final JButton catchUpButton = new JButton("Bounded Catch Up");
    private final JButton checkpointButton = new JButton("Checkpoint");
    private final JSpinner stepTicks = new JSpinner(new SpinnerNumberModel(1L, 1L, 1_000_000L, 1L));
    private final JSpinner maxCatchUpTicks = new JSpinner(new SpinnerNumberModel(60L, 0L, 1_000_000L, 1L));
    private final JTextField catchUpTarget = new JTextField(24);
    private final JLabel worldStatus = new JLabel("No desktop world open");
    private final JLabel operationStatus = new JLabel("Ready");
    private final JLabel clockStatus = new JLabel("Simulation clock unavailable");
    private final JTextArea log = new JTextArea();

    private WorldPaths world;
    private Path lastDirectory;
    private PersistentSimulationSession simulation;
    private ClockSnapshot snapshot;
    private AutoCloseable worldSubscription;
    private boolean busy;

    public SimulationMonitorWindow() {
        super("Barotrauma Durable Simulation Monitor");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(950, 650));
        setSize(1150, 760);
        setLocationByPlatform(true);
        setLayout(new BorderLayout(10, 10));

        JPanel header = new JPanel(new BorderLayout(12, 8));
        header.setBorder(BorderFactory.createEmptyBorder(12, 12, 0, 12));
        JPanel worldBlock = new JPanel(new BorderLayout(4, 4));
        worldBlock.add(worldStatus, BorderLayout.NORTH);
        worldBlock.add(clockStatus, BorderLayout.SOUTH);
        header.add(worldBlock, BorderLayout.WEST);
        header.add(operationStatus, BorderLayout.EAST);
        add(header, BorderLayout.NORTH);

        log.setEditable(false);
        log.setLineWrap(false);
        log.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 13));
        log.setText("Open a normalized desktop world. Automatic Run is intentionally unavailable.\n"
                + "Every manual command is serialized, written to SQLite, and rejected if its durable before-state is stale.\n");
        add(new JScrollPane(log), BorderLayout.CENTER);

        JPanel commandRow = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        commandRow.add(enableButton);
        commandRow.add(disableButton);
        commandRow.add(new JLabel("Step ticks:"));
        commandRow.add(stepTicks);
        commandRow.add(stepButton);
        commandRow.add(new JLabel("Catch-up target:"));
        commandRow.add(catchUpTarget);
        commandRow.add(new JLabel("Max ticks:"));
        commandRow.add(maxCatchUpTicks);
        commandRow.add(catchUpButton);
        commandRow.add(checkpointButton);

        JPanel worldRow = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        worldRow.add(openWorldButton);
        worldRow.add(reloadButton);
        JPanel footer = new JPanel(new BorderLayout(8, 8));
        footer.setBorder(BorderFactory.createEmptyBorder(0, 12, 12, 12));
        footer.add(commandRow, BorderLayout.NORTH);
        footer.add(worldRow, BorderLayout.SOUTH);
        add(footer, BorderLayout.SOUTH);

        openWorldButton.addActionListener(event -> chooseWorld());
        reloadButton.addActionListener(event -> openSimulation(world));
        enableButton.addActionListener(event -> submit(new SimulationCommandExecutor.Enable(), null));
        disableButton.addActionListener(event -> submit(new SimulationCommandExecutor.Disable(), null));
        stepButton.addActionListener(event -> submit(
                new SimulationCommandExecutor.Step(number(stepTicks)), null));
        catchUpButton.addActionListener(event -> boundedCatchUp());
        checkpointButton.addActionListener(event -> submit(
                new SimulationCommandExecutor.Checkpoint(), "Manual monitor checkpoint"));

        worldSubscription = worldSession.addListener(this::activateWorld, true);
        refreshControls();
    }

    private void chooseWorld() {
        JFileChooser chooser = lastDirectory == null ? new JFileChooser() : new JFileChooser(lastDirectory.toFile());
        chooser.setDialogTitle("Open an existing Barotrauma desktop world");
        chooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
        chooser.setAcceptAllFileFilterUsed(false);
        if (chooser.showOpenDialog(this) != JFileChooser.APPROVE_OPTION) return;
        try {
            worldSession.activate(WorldStorageContracts.openWorld(chooser.getSelectedFile().toPath()));
        } catch (Exception exception) {
            showFailure("World open failed", exception);
        }
    }

    private void activateWorld(WorldPaths selectedWorld) {
        closeSimulation();
        world = selectedWorld;
        snapshot = null;
        if (selectedWorld == null) {
            worldStatus.setText("No desktop world open");
            clockStatus.setText("Simulation clock unavailable");
            operationStatus.setText("Open a normalized world");
            refreshControls();
            return;
        }
        lastDirectory = selectedWorld.root().getParent();
        worldStatus.setText("Shared world: " + selectedWorld.root());
        openSimulation(selectedWorld);
    }

    private void openSimulation(WorldPaths selectedWorld) {
        if (selectedWorld == null || busy) return;
        closeSimulation();
        setBusy(true, "Loading durable simulation clock…");
        java.util.concurrent.CompletableFuture.supplyAsync(() -> {
            try {
                return PersistentSimulationSession.open(selectedWorld, DEFAULT_TICK_SIZE);
            } catch (Exception exception) {
                throw new CompletionException(exception);
            }
        }).thenCompose(session -> session.snapshot().thenApply(state -> new OpenedSession(session, state)))
                .whenComplete((opened, failure) -> SwingUtilities.invokeLater(() -> {
                    if (!selectedWorld.equals(world)) {
                        if (opened != null) opened.session().close();
                        setBusy(false, "World changed while loading");
                        return;
                    }
                    if (failure != null) {
                        closeSimulation();
                        showFailure("Simulation clock unavailable", cause(failure));
                        setBusy(false, "Import a normalized version-22 world first");
                        return;
                    }
                    simulation = opened.session();
                    snapshot = opened.snapshot();
                    catchUpTarget.setText(snapshot.canonicalTime().plus(Duration.ofHours(1)).toString());
                    append("Durable clock loaded", snapshot, null);
                    setBusy(false, "Durable clock ready");
                }));
    }

    private void boundedCatchUp() {
        Instant target;
        try {
            target = Instant.parse(catchUpTarget.getText().trim());
        } catch (RuntimeException exception) {
            JOptionPane.showMessageDialog(this, "Catch-up target must be an ISO-8601 instant.",
                    "Invalid catch-up target", JOptionPane.WARNING_MESSAGE);
            return;
        }
        submit(new SimulationCommandExecutor.CatchUp(target, number(maxCatchUpTicks)),
                "Manual bounded catch-up checkpoint");
    }

    private void submit(SimulationCommandExecutor.SimulationCommand command, String checkpointReason) {
        PersistentSimulationSession active = simulation;
        if (active == null || busy) return;
        setBusy(true, "Executing and persisting " + command.label() + "…");
        active.submit(command, "desktop-user", checkpointReason)
                .whenComplete((result, failure) -> SwingUtilities.invokeLater(() -> {
                    if (failure != null) {
                        showFailure("Simulation command failed", cause(failure));
                        setBusy(false, active.persistenceFaulted()
                                ? "Persistence fault; reload required" : "Command rejected");
                        return;
                    }
                    snapshot = result.receipt().after();
                    append("Command committed", snapshot, result);
                    setBusy(false, "Durable command " + result.receipt().acceptedSequence() + " committed");
                }));
    }

    private void append(String heading, ClockSnapshot state, DurableCommandResult result) {
        log.append("\n" + heading + "\n");
        if (result != null) {
            log.append("Execution sequence: " + result.receipt().acceptedSequence() + "\n");
            log.append("Command ID: " + result.receipt().commandId() + "\n");
            log.append("Command: " + result.receipt().command() + "\n");
            log.append("Checkpoint ID: " + (result.persistence().checkpointId() == null
                    ? "none" : result.persistence().checkpointId()) + "\n");
            if (result.receipt().catchUpAppliedTicks() != null) {
                log.append("Catch-up applied / remaining: " + result.receipt().catchUpAppliedTicks()
                        + " / " + result.receipt().catchUpRemainingTicks() + "\n");
            }
        }
        log.append("Canonical time: " + state.canonicalTime() + "\n");
        log.append("Tick sequence: " + state.tickSequence() + "\n");
        log.append("Tick size: " + state.tickSize() + "\n");
        log.append("Simulation enabled: " + state.simulationEnabled() + "\n");
        log.append("Scheduler state: " + state.schedulerState() + "\n");
        log.setCaretPosition(log.getDocument().getLength());
        clockStatus.setText("Canonical " + state.canonicalTime() + " · tick " + state.tickSequence()
                + " · " + (state.simulationEnabled() ? "enabled" : "disabled")
                + " · " + state.schedulerState());
        refreshControls();
    }

    private void setBusy(boolean value, String message) {
        busy = value;
        operationStatus.setText(message);
        refreshControls();
    }

    private void refreshControls() {
        boolean ready = !busy && simulation != null && snapshot != null && !simulation.persistenceFaulted();
        boolean enabled = ready && snapshot.simulationEnabled();
        boolean paused = ready && snapshot.schedulerState() == SchedulerState.PAUSED;
        openWorldButton.setEnabled(!busy);
        reloadButton.setEnabled(!busy && world != null);
        enableButton.setEnabled(ready && !snapshot.simulationEnabled());
        disableButton.setEnabled(enabled);
        stepTicks.setEnabled(enabled && paused);
        stepButton.setEnabled(enabled && paused);
        catchUpTarget.setEnabled(enabled && paused);
        maxCatchUpTicks.setEnabled(enabled && paused);
        catchUpButton.setEnabled(enabled && paused);
        checkpointButton.setEnabled(ready);
    }

    private void showFailure(String title, Throwable throwable) {
        operationStatus.setText(title);
        log.append("\n" + title + "\n" + throwable.getClass().getSimpleName() + ": "
                + throwable.getMessage() + "\n");
        log.setCaretPosition(log.getDocument().getLength());
        JOptionPane.showMessageDialog(this, throwable.getMessage(), title, JOptionPane.ERROR_MESSAGE);
    }

    private void closeSimulation() {
        PersistentSimulationSession active = simulation;
        simulation = null;
        snapshot = null;
        if (active != null) active.close();
        refreshControls();
    }

    private static long number(JSpinner spinner) {
        return ((Number) spinner.getValue()).longValue();
    }

    private static Throwable cause(Throwable throwable) {
        Throwable current = throwable;
        while ((current instanceof CompletionException
                || current instanceof java.util.concurrent.ExecutionException)
                && current.getCause() != null) current = current.getCause();
        return current;
    }

    @Override
    public void dispose() {
        closeSimulation();
        if (worldSubscription != null) {
            try { worldSubscription.close(); } catch (Exception ignored) { }
            worldSubscription = null;
        }
        super.dispose();
    }

    private record OpenedSession(PersistentSimulationSession session, ClockSnapshot snapshot) { }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try { UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName()); }
            catch (Exception exception) {
                System.err.println("Could not activate system look and feel: " + exception.getMessage());
            }
            SimulationMonitorWindow window = new SimulationMonitorWindow();
            window.setLocationRelativeTo(null);
            window.setVisible(true);
        });
    }
}
