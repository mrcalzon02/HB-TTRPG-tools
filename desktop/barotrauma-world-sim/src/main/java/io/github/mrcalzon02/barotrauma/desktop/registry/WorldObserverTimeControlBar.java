package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.PassiveWorldSimulationService;

import javax.swing.BorderFactory;
import javax.swing.ButtonGroup;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JToggleButton;
import javax.swing.SwingUtilities;
import javax.swing.SwingWorker;
import javax.swing.Timer;
import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Container;
import java.awt.FlowLayout;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.time.Duration;
import java.util.EnumMap;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ExecutionException;

/**
 * Player-facing simulation transport controls for the Living World Observer.
 *
 * <p>One authoritative simulation tick is one simulation minute. The displayed ratios therefore mean
 * exactly the named number of simulation minutes per real-world minute: 1x, 2x, 4x, 8x, and 16x.</p>
 */
public final class WorldObserverTimeControlBar {
    private final DesktopWorldSession session = DesktopWorldSession.global();
    private final JPanel panel = new JPanel(new FlowLayout(FlowLayout.LEFT, 7, 2));
    private final JLabel status = new JLabel("SIMULATION PAUSED");
    private final Map<TimeScale, JToggleButton> buttons = new EnumMap<>(TimeScale.class);
    private final ButtonGroup group = new ButtonGroup();
    private final Timer stateTimer = new Timer(1000, event -> refreshState());

    private JFrame owner;
    private WorldPaths world;
    private AutoCloseable sessionSubscription;
    private JLabel legacyPassiveStatus;
    private boolean busy;

    private WorldObserverTimeControlBar() {
        panel.setBorder(BorderFactory.createTitledBorder("Simulation Time"));
        addButton(TimeScale.PAUSED);
        addButton(TimeScale.REAL_TIME);
        addButton(TimeScale.X2);
        addButton(TimeScale.X4);
        addButton(TimeScale.X8);
        addButton(TimeScale.X16);
        panel.add(status);
        buttons.get(TimeScale.PAUSED).setSelected(true);
    }

    public static WorldObserverTimeControlBar install(JFrame owner) {
        Objects.requireNonNull(owner, "owner");
        WorldObserverTimeControlBar controls = new WorldObserverTimeControlBar();
        controls.owner = owner;
        controls.replaceLegacySimulationControls();
        controls.legacyPassiveStatus = findPassiveStatus(owner.getContentPane());
        controls.sessionSubscription = controls.session.addListener(controls::activateWorld, true);
        controls.stateTimer.setRepeats(true);
        controls.stateTimer.start();
        owner.addWindowListener(new WindowAdapter() {
            @Override public void windowClosed(WindowEvent event) { controls.close(); }
        });
        controls.refreshState();
        return controls;
    }

    private void addButton(TimeScale scale) {
        JToggleButton button = new JToggleButton(scale.label());
        button.setToolTipText(scale.tooltip());
        button.addActionListener(event -> apply(scale));
        buttons.put(scale, button);
        group.add(button);
        panel.add(button);
    }

    private void replaceLegacySimulationControls() {
        Container content = owner.getContentPane();
        if (!(content.getLayout() instanceof BorderLayout outer)) {
            content.add(panel, BorderLayout.SOUTH);
            content.revalidate();
            return;
        }
        Component south = outer.getLayoutComponent(content, BorderLayout.SOUTH);
        if (south instanceof JPanel footer && footer.getLayout() instanceof BorderLayout footerLayout) {
            Component legacy = footerLayout.getLayoutComponent(footer, BorderLayout.NORTH);
            if (legacy != null) footer.remove(legacy);
            footer.add(panel, BorderLayout.NORTH);
            footer.revalidate();
            footer.repaint();
            return;
        }
        JPanel wrapper = new JPanel(new BorderLayout(6, 4));
        wrapper.add(panel, BorderLayout.NORTH);
        if (south != null) {
            content.remove(south);
            wrapper.add(south, BorderLayout.CENTER);
        }
        content.add(wrapper, BorderLayout.SOUTH);
        content.revalidate();
        content.repaint();
    }

    private void activateWorld(WorldPaths selectedWorld) {
        world = selectedWorld;
        refreshState();
    }

    private void apply(TimeScale scale) {
        WorldPaths selectedWorld = world;
        if (selectedWorld == null || busy) return;
        busy = true;
        status.setText(scale == TimeScale.PAUSED ? "PAUSING…" : "SETTING " + scale.multiplier() + "×…");
        updateEnabledState();

        new SwingWorker<PassiveWorldSimulationService, Void>() {
            @Override protected PassiveWorldSimulationService doInBackground() throws Exception {
                if (scale == TimeScale.PAUSED) {
                    PassiveWorldSimulationService.disable(selectedWorld);
                    return null;
                }
                PassiveWorldSimulationService active = PassiveWorldSimulationService.active(selectedWorld);
                if (active != null) {
                    PassiveWorldSimulationService.Status current = active.status();
                    if (current.fault() == null
                            && scale.cadence().equals(current.cadence())
                            && scale.ticksPerCycle() == current.ticksPerCycle()) {
                        return active;
                    }
                    PassiveWorldSimulationService.disable(selectedWorld);
                }
                return PassiveWorldSimulationService.enable(
                        selectedWorld, scale.cadence(), scale.ticksPerCycle());
            }

            @Override protected void done() {
                try {
                    get();
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    status.setText("TIME CONTROL INTERRUPTED");
                } catch (ExecutionException exception) {
                    Throwable cause = exception.getCause() == null ? exception : exception.getCause();
                    status.setText("TIME CONTROL FAULT · " + cause.getMessage());
                } finally {
                    busy = false;
                    if (Objects.equals(selectedWorld, world)) refreshState();
                    else updateEnabledState();
                }
            }
        }.execute();
    }

    private void refreshState() {
        if (!SwingUtilities.isEventDispatchThread()) {
            SwingUtilities.invokeLater(this::refreshState);
            return;
        }
        if (world == null) {
            buttons.get(TimeScale.PAUSED).setSelected(true);
            status.setText("NO WORLD");
            updateEnabledState();
            return;
        }
        PassiveWorldSimulationService service = PassiveWorldSimulationService.active(world);
        if (service == null) {
            buttons.get(TimeScale.PAUSED).setSelected(true);
            status.setText("SIMULATION PAUSED");
            mirrorLegacyStatus("Passive mode paused · simulation time stopped");
            updateEnabledState();
            return;
        }
        PassiveWorldSimulationService.Status current = service.status();
        if (current.fault() != null) {
            group.clearSelection();
            status.setText("SIMULATION FAULT · " + current.fault().getMessage());
            mirrorLegacyStatus("Passive mode fault: " + current.fault().getMessage());
            updateEnabledState();
            return;
        }
        TimeScale scale = TimeScale.match(current.cadence(), current.ticksPerCycle());
        if (scale == null) {
            group.clearSelection();
            status.setText("CUSTOM RATE · " + current.ticksPerCycle() + " min / "
                    + current.cadence().toSeconds() + " real sec");
            mirrorLegacyStatus(status.getText());
        } else {
            buttons.get(scale).setSelected(true);
            status.setText(scale == TimeScale.REAL_TIME
                    ? "REAL TIME · 1 simulation minute / real minute"
                    : scale.multiplier() + "× · " + scale.multiplier() + " simulation minutes / real minute");
            mirrorLegacyStatus("Passive mode running · " + status.getText());
        }
        updateEnabledState();
    }

    private void updateEnabledState() {
        boolean enabled = world != null && !busy;
        for (JToggleButton button : buttons.values()) button.setEnabled(enabled);
    }

    private void mirrorLegacyStatus(String text) {
        if (legacyPassiveStatus != null) legacyPassiveStatus.setText(text);
    }

    private void close() {
        stateTimer.stop();
        if (sessionSubscription != null) {
            try { sessionSubscription.close(); }
            catch (Exception ignored) { }
            sessionSubscription = null;
        }
    }

    private static JLabel findPassiveStatus(Container root) {
        for (Component component : root.getComponents()) {
            if (component instanceof JLabel label
                    && label.getText() != null
                    && label.getText().toLowerCase().startsWith("passive mode")) {
                return label;
            }
            if (component instanceof Container child) {
                JLabel found = findPassiveStatus(child);
                if (found != null) return found;
            }
        }
        return null;
    }

    public static void verifyContract() {
        int[] expected = {1, 2, 4, 8, 16};
        TimeScale[] scales = {TimeScale.REAL_TIME, TimeScale.X2, TimeScale.X4, TimeScale.X8, TimeScale.X16};
        for (int index = 0; index < scales.length; index++) {
            TimeScale scale = scales[index];
            if (scale.multiplier() != expected[index]) {
                throw new IllegalStateException("Observer time-scale sequence is not flat minute doubling.");
            }
            long cadenceSeconds = scale.cadence().toSeconds();
            if (scale.ticksPerCycle() * 60L != scale.multiplier() * cadenceSeconds) {
                throw new IllegalStateException(scale.multiplier() + "x does not advance the exact requested simulation minutes per real minute.");
            }
        }
        if (!TimeScale.REAL_TIME.cadence().equals(Duration.ofSeconds(60))
                || TimeScale.REAL_TIME.ticksPerCycle() != 1) {
            throw new IllegalStateException("Real-time mode must be exactly one simulation minute per real minute.");
        }
    }

    enum TimeScale {
        PAUSED(0, Duration.ZERO, 0, "⏸ Pause", "Stop canonical simulation time."),
        REAL_TIME(1, Duration.ofSeconds(60), 1, "▶ 1×", "Real time: 1 simulation minute per real minute."),
        X2(2, Duration.ofSeconds(30), 1, "≫ 2×", "2 simulation minutes per real minute."),
        X4(4, Duration.ofSeconds(15), 1, "≫ 4×", "4 simulation minutes per real minute."),
        X8(8, Duration.ofSeconds(15), 2, "≫ 8×", "8 simulation minutes per real minute."),
        X16(16, Duration.ofSeconds(15), 4, "≫ 16×", "16 simulation minutes per real minute.");

        private final int multiplier;
        private final Duration cadence;
        private final long ticksPerCycle;
        private final String label;
        private final String tooltip;

        TimeScale(int multiplier, Duration cadence, long ticksPerCycle, String label, String tooltip) {
            this.multiplier = multiplier;
            this.cadence = cadence;
            this.ticksPerCycle = ticksPerCycle;
            this.label = label;
            this.tooltip = tooltip;
        }

        int multiplier() { return multiplier; }
        Duration cadence() { return cadence; }
        long ticksPerCycle() { return ticksPerCycle; }
        String label() { return label; }
        String tooltip() { return tooltip; }

        static TimeScale match(Duration cadence, long ticksPerCycle) {
            for (TimeScale scale : values()) {
                if (scale == PAUSED) continue;
                if (scale.cadence.equals(cadence) && scale.ticksPerCycle == ticksPerCycle) return scale;
            }
            return null;
        }
    }
}
