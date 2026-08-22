package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.persistence.DailyNewspaperInstaller;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import javax.swing.BorderFactory;
import javax.swing.DefaultListCellRenderer;
import javax.swing.DefaultListModel;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.ListSelectionModel;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;
import javax.swing.SwingWorker;
import javax.swing.Timer;
import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Container;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.util.Objects;
import java.util.concurrent.ExecutionException;

/**
 * Embedded previous-day news ticker for the Living World Observer viewport.
 *
 * <p>The bar registers with the shared world session before the map window is constructed, so installation of
 * the midnight archive remains ahead of Passive Mode resume. It never reads the open simulation day as news:
 * only the latest sealed daily edition is displayed. Clicking a headline opens the immutable article and full
 * newspaper in a dedicated reader window.</p>
 */
public final class WorldObserverNewsTickerBar extends JPanel implements AutoCloseable {
    private final DesktopWorldSession session = DesktopWorldSession.global();
    private final JLabel editionStatus = new JLabel("DAILY NEWS · no sealed edition", SwingConstants.LEFT);
    private final JButton openPaper = new JButton("Open Daily Paper");
    private final DefaultListModel<DailyNewspaperRegistry.Article> model = new DefaultListModel<>();
    private final JList<DailyNewspaperRegistry.Article> ticker = new JList<>(model);
    private final Timer refreshTimer = new Timer(2500, event -> refresh());

    private WorldPaths world;
    private DailyNewspaperRegistry.Snapshot snapshot = DailyNewspaperRegistry.Snapshot.empty();
    private AutoCloseable subscription;
    private boolean busy;
    private boolean closed;

    public WorldObserverNewsTickerBar() {
        super(new BorderLayout(8, 4));
        setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createTitledBorder("Europa Daily Observer · previous completed simulation day"),
                BorderFactory.createEmptyBorder(1, 6, 3, 6)));

        editionStatus.setFont(editionStatus.getFont().deriveFont(Font.BOLD, 11f));
        editionStatus.setPreferredSize(new Dimension(275, editionStatus.getPreferredSize().height));
        add(editionStatus, BorderLayout.WEST);

        ticker.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        ticker.setVisibleRowCount(1);
        ticker.setLayoutOrientation(JList.HORIZONTAL_WRAP);
        ticker.setFixedCellHeight(28);
        ticker.setFixedCellWidth(430);
        ticker.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 11));
        ticker.setCellRenderer(new DefaultListCellRenderer() {
            @Override public Component getListCellRendererComponent(JList<?> list, Object value, int index,
                                                                    boolean selected, boolean focused) {
                super.getListCellRendererComponent(list, value, index, selected, focused);
                if (value instanceof DailyNewspaperRegistry.Article row) {
                    setText("[" + row.sourceCategory() + "] " + row.headline() + " — " + row.stationName());
                    setToolTipText(row.dek() + " · sealed source tick " + row.sourceTick());
                }
                return this;
            }
        });
        ticker.addMouseListener(new MouseAdapter() {
            @Override public void mouseClicked(MouseEvent event) {
                if (!SwingUtilities.isLeftMouseButton(event)) return;
                int index = ticker.locationToIndex(event.getPoint());
                if (index < 0 || index >= model.size()) return;
                ticker.setSelectedIndex(index);
                openArticle(model.get(index));
            }
        });
        ticker.addKeyListener(new KeyAdapter() {
            @Override public void keyPressed(KeyEvent event) {
                if (event.getKeyCode() == KeyEvent.VK_ENTER && ticker.getSelectedValue() != null) {
                    openArticle(ticker.getSelectedValue());
                    event.consume();
                }
            }
        });
        JScrollPane tickerScroll = new JScrollPane(ticker,
                JScrollPane.VERTICAL_SCROLLBAR_NEVER, JScrollPane.HORIZONTAL_SCROLLBAR_AS_NEEDED);
        tickerScroll.setPreferredSize(new Dimension(620, 48));
        add(tickerScroll, BorderLayout.CENTER);

        openPaper.addActionListener(event -> openWholePaper());
        openPaper.setEnabled(false);
        add(openPaper, BorderLayout.EAST);

        // Register before the map window so newspaper persistence is installed before an enabled scheduler resumes.
        subscription = session.addListener(this::activateWorld, true);
        refreshTimer.setRepeats(true);
        refreshTimer.start();
    }

    /** Inserts this ticker directly beneath the Observer's existing header. */
    public void installInto(JFrame observerWindow) {
        Objects.requireNonNull(observerWindow, "observerWindow");
        Container content = observerWindow.getContentPane();
        if (!(content.getLayout() instanceof BorderLayout layout)) {
            throw new IllegalStateException("Living World Observer content pane is no longer BorderLayout-based.");
        }
        Component existingNorth = layout.getLayoutComponent(BorderLayout.NORTH);
        JPanel stackedHeader = new JPanel(new BorderLayout(0, 4));
        if (existingNorth != null) {
            content.remove(existingNorth);
            stackedHeader.add(existingNorth, BorderLayout.NORTH);
        }
        stackedHeader.add(this, BorderLayout.SOUTH);
        content.add(stackedHeader, BorderLayout.NORTH);
        observerWindow.addWindowListener(new WindowAdapter() {
            @Override public void windowClosed(WindowEvent event) { close(); }
        });
        content.revalidate();
        content.repaint();
    }

    private void activateWorld(WorldPaths selectedWorld) {
        world = selectedWorld;
        snapshot = DailyNewspaperRegistry.Snapshot.empty();
        model.clear();
        openPaper.setEnabled(false);
        if (selectedWorld == null) {
            editionStatus.setText("DAILY NEWS · no world open");
            return;
        }
        try {
            DailyNewspaperInstaller.install(selectedWorld);
            editionStatus.setText("DAILY NEWS · waiting for sealed edition");
        } catch (Exception exception) {
            editionStatus.setText("DAILY NEWS · archive unavailable: " + exception.getMessage());
            return;
        }
        refresh();
    }

    private void refresh() {
        WorldPaths selectedWorld = world;
        if (selectedWorld == null || busy || closed) return;
        busy = true;
        new SwingWorker<DailyNewspaperRegistry.Snapshot, Void>() {
            @Override protected DailyNewspaperRegistry.Snapshot doInBackground() throws Exception {
                return DailyNewspaperRegistry.load(selectedWorld);
            }

            @Override protected void done() {
                try {
                    if (!Objects.equals(selectedWorld, world) || closed) return;
                    applySnapshot(get());
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    editionStatus.setText("DAILY NEWS · refresh interrupted");
                } catch (ExecutionException exception) {
                    Throwable cause = exception.getCause() == null ? exception : exception.getCause();
                    editionStatus.setText("DAILY NEWS · refresh failed: " + cause.getMessage());
                } finally {
                    busy = false;
                }
            }
        }.execute();
    }

    private void applySnapshot(DailyNewspaperRegistry.Snapshot loaded) {
        snapshot = loaded;
        model.clear();
        DailyNewspaperRegistry.Edition edition = loaded.selectedEdition();
        if (edition == null) {
            editionStatus.setText("DAILY NEWS · current day open · first paper seals at midnight");
            openPaper.setEnabled(false);
            return;
        }
        for (DailyNewspaperRegistry.Article row : loaded.articles()) model.addElement(row);
        editionStatus.setText("SEALED " + edition.editionDate() + " · " + edition.articleCount()
                + " stories · current day unpublished");
        openPaper.setEnabled(true);
        if (!loaded.articles().isEmpty()) ticker.setSelectedIndex(0);
    }

    private void openArticle(DailyNewspaperRegistry.Article selected) {
        DailyNewspaperRegistry.Edition edition = snapshot.selectedEdition();
        WorldPaths selectedWorld = world;
        if (edition == null || selected == null || selectedWorld == null) return;
        DailyNewspaperReaderWindow reader = new DailyNewspaperReaderWindow(
                selectedWorld, edition.editionId(), selected.articleId());
        reader.setLocationRelativeTo(SwingUtilities.getWindowAncestor(this));
        reader.setVisible(true);
    }

    private void openWholePaper() {
        DailyNewspaperRegistry.Edition edition = snapshot.selectedEdition();
        WorldPaths selectedWorld = world;
        if (edition == null || selectedWorld == null) return;
        String articleId = snapshot.articles().isEmpty() ? null : snapshot.articles().get(0).articleId();
        DailyNewspaperReaderWindow reader = new DailyNewspaperReaderWindow(selectedWorld, edition.editionId(), articleId);
        reader.setLocationRelativeTo(SwingUtilities.getWindowAncestor(this));
        reader.setVisible(true);
    }

    @Override public void close() {
        if (closed) return;
        closed = true;
        refreshTimer.stop();
        if (subscription != null) {
            try { subscription.close(); } catch (Exception ignored) { }
            subscription = null;
        }
    }
}
