package io.github.mrcalzon02.barotrauma.desktop;

import io.github.mrcalzon02.barotrauma.desktop.assets.BarotraumaDesktopTheme;
import io.github.mrcalzon02.barotrauma.desktop.registry.DonorBackedWorldMapWindow;
import io.github.mrcalzon02.barotrauma.desktop.registry.WorldObserverNewsTickerBar;
import io.github.mrcalzon02.barotrauma.desktop.registry.WorldObserverTimeControlBar;

import javax.swing.SwingUtilities;
import javax.swing.UIManager;
import java.util.Arrays;

/** Dedicated entry point for the living passive Barotrauma world observer. */
public final class BarotraumaWorldObserverApplication {
    private BarotraumaWorldObserverApplication() { }

    public static void main(String[] args) {
        if (args != null && Arrays.asList(args).contains("--verify-launch")) {
            WorldObserverTimeControlBar.verifyContract();
            System.out.println("Barotrauma World Observer launcher verification passed.");
            return;
        }
        SwingUtilities.invokeLater(() -> {
            try {
                UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
            } catch (Exception exception) {
                System.err.println("Could not activate system look and feel: " + exception.getMessage());
            }
            BarotraumaDesktopTheme.install();

            // Register the embedded news ticker with the shared world session before the map window is
            // constructed. Its world listener therefore installs the midnight newspaper archive before
            // the map listener can resume an already-enabled Passive Mode scheduler.
            WorldObserverNewsTickerBar newsTicker = new WorldObserverNewsTickerBar();
            DonorBackedWorldMapWindow window = new DonorBackedWorldMapWindow();
            newsTicker.installInto(window);
            WorldObserverTimeControlBar.install(window);
            window.setLocationRelativeTo(null);
            window.setVisible(true);
        });
    }
}
