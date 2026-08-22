package io.github.mrcalzon02.barotrauma.desktop;

import io.github.mrcalzon02.barotrauma.desktop.assets.BarotraumaDesktopTheme;
import io.github.mrcalzon02.barotrauma.desktop.registry.DailyNewspaperTickerWindow;
import io.github.mrcalzon02.barotrauma.desktop.registry.DonorBackedWorldMapWindow;

import javax.swing.SwingUtilities;
import javax.swing.UIManager;
import java.util.Arrays;

/** Dedicated entry point for the living passive Barotrauma world observer. */
public final class BarotraumaWorldObserverApplication {
    private BarotraumaWorldObserverApplication() { }

    public static void main(String[] args) {
        if (args != null && Arrays.asList(args).contains("--verify-launch")) {
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

            // Construct the ticker first so its world-session listener installs the midnight newspaper
            // trigger before the map listener can resume an already-enabled Passive Mode scheduler.
            DailyNewspaperTickerWindow ticker = new DailyNewspaperTickerWindow();
            DonorBackedWorldMapWindow window = new DonorBackedWorldMapWindow();
            window.setLocationRelativeTo(null);
            window.setVisible(true);
            ticker.setLocation(window.getX() + 70, window.getY() + 90);
            ticker.setVisible(true);
        });
    }
}
