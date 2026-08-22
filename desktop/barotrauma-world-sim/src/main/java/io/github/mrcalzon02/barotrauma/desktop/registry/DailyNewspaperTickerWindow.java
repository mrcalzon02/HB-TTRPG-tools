package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.persistence.DailyNewspaperInstaller;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import javax.swing.BorderFactory;
import javax.swing.DefaultListCellRenderer;
import javax.swing.DefaultListModel;
import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSplitPane;
import javax.swing.JTabbedPane;
import javax.swing.JTextArea;
import javax.swing.ListSelectionModel;
import javax.swing.SwingUtilities;
import javax.swing.SwingWorker;
import javax.swing.Timer;
import javax.swing.WindowConstants;
import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ExecutionException;

/**
 * Compact current-events ticker that expands into immutable daily articles and a complete newspaper edition.
 * The ticker is locked to the most recently completed simulation day; the in-progress day is never published live.
 */
public final class DailyNewspaperTickerWindow extends JFrame {
    private static final Dimension COMPACT_SIZE = new Dimension(1180, 280);
    private static final Dimension EXPANDED_SIZE = new Dimension(1260, 820);

    private final DesktopWorldSession session = DesktopWorldSession.global();
    private final JLabel editionStatus = new JLabel("No world open · daily newspaper unavailable");
    private final JComboBox<String> editionSelector = new JComboBox<>();
    private final JButton refreshButton = new JButton("Refresh Paper");
    private final JButton collapseButton = new JButton("Collapse Ticker");
    private final DefaultListModel<DailyNewspaperRegistry.Article> tickerModel = new DefaultListModel<>();
    private final JList<DailyNewspaperRegistry.Article> ticker = new JList<>(tickerModel);
    private final JTextArea article = textArea();
    private final JTextArea fullEdition = textArea();
    private final JTabbedPane readerTabs = new JTabbedPane();
    private final JPanel readerPanel = new JPanel(new BorderLayout());
    private final Timer refreshTimer = new Timer(2500, event -> refresh());

    private AutoCloseable subscription;
    private WorldPaths world;
    private DailyNewspaperRegistry.Snapshot snapshot = DailyNewspaperRegistry.Snapshot.empty();
    private boolean busy;
    private boolean suppressEditionChange;

    public DailyNewspaperTickerWindow() {
        super("Europa Daily Observer — Previous-Day News Ticker");
        setDefaultCloseOperation(WindowConstants.HIDE_ON_CLOSE);
        setMinimumSize(new Dimension(900, 220));
        setSize(COMPACT_SIZE);
        setLayout(new BorderLayout(8, 8));

        JPanel header = new JPanel(new BorderLayout(8, 4));
        header.setBorder(BorderFactory.createEmptyBorder(8, 10, 0, 10));
        header.add(editionStatus, BorderLayout.CENTER);
        JPanel editionControls = new JPanel(new FlowLayout(FlowLayout.RIGHT, 6, 0));
        editionControls.add(new JLabel("Edition:"));
        editionSelector.setPreferredSize(new Dimension(190, editionSelector.getPreferredSize().height));
        editionControls.add(editionSelector);
        editionControls.add(refreshButton);
        editionControls.add(collapseButton);
        header.add(editionControls, BorderLayout.EAST);
        add(header, BorderLayout.NORTH);

        ticker.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        ticker.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 12));
        ticker.setCellRenderer(new DefaultListCellRenderer() {
            @Override public Component getListCellRendererComponent(JList<?> list, Object value, int index,
                                                                    boolean selected, boolean focused) {
                super.getListCellRendererComponent(list, value, index, selected, focused);
                if (value instanceof DailyNewspaperRegistry.Article row) {
                    setText("BREAKING / DAILY · [" + row.sourceCategory() + "] " + row.headline()
                            + " — " + row.stationName() + " · sev " + row.severity());
                    setToolTipText(row.dek() + " · frozen at tick " + row.sourceTick());
                }
                return this;
            }
        });
        ticker.setBorder(BorderFactory.createTitledBorder("Previous completed day · click a headline to open the frozen article"));
        ticker.addListSelectionListener(event -> {
            if (event.getValueIsAdjusting()) return;
            DailyNewspaperRegistry.Article selected = ticker.getSelectedValue();
            if (selected != null) expandArticle(selected);
        });
        ticker.addMouseListener(new MouseAdapter() {
            @Override public void mouseClicked(MouseEvent event) {
                if (event.getClickCount() >= 1 && ticker.getSelectedValue() != null) {
                    expandArticle(ticker.getSelectedValue());
                }
            }
        });

        readerTabs.addTab("Selected Article", new JScrollPane(article));
        readerTabs.addTab("Full Daily Newspaper", new JScrollPane(fullEdition));
        readerPanel.add(readerTabs, BorderLayout.CENTER);
        readerPanel.setVisible(false);

        JSplitPane split = new JSplitPane(JSplitPane.VERTICAL_SPLIT, new JScrollPane(ticker), readerPanel);
        split.setDividerLocation(165);
        split.setResizeWeight(0.20);
        split.setBorder(BorderFactory.createEmptyBorder(0, 10, 10, 10));
        add(split, BorderLayout.CENTER);

        refreshButton.addActionListener(event -> refresh());
        collapseButton.addActionListener(event -> collapseTicker());
        editionSelector.addActionListener(event -> {
            if (!suppressEditionChange) loadSelectedEdition();
        });

        subscription = session.addListener(this::activateWorld, true);
        refreshTimer.setRepeats(true);
        refreshTimer.start();
        collapseButton.setEnabled(false);
    }

    private static JTextArea textArea() {
        JTextArea area = new JTextArea();
        area.setEditable(false);
        area.setLineWrap(true);
        area.setWrapStyleWord(true);
        area.setFont(new Font(Font.SERIF, Font.PLAIN, 14));
        area.setBorder(BorderFactory.createEmptyBorder(12, 14, 12, 14));
        return area;
    }

    private void activateWorld(WorldPaths selectedWorld) {
        world = selectedWorld;
        snapshot = DailyNewspaperRegistry.Snapshot.empty();
        tickerModel.clear();
        article.setText("");
        fullEdition.setText("");
        if (selectedWorld == null) {
            editionStatus.setText("No world open · daily newspaper unavailable");
            editionSelector.removeAllItems();
            return;
        }
        // This listener is intentionally registered before the map window. Installation completes before
        // the map listener can resume Passive Mode, guaranteeing that the midnight trigger exists first.
        try {
            DailyNewspaperInstaller.install(selectedWorld);
            editionStatus.setText("Daily newspaper installed · waiting for latest sealed edition");
        } catch (Exception exception) {
            editionStatus.setText("Daily newspaper install failed: " + exception.getMessage());
            return;
        }
        refresh();
    }

    private void refresh() {
        WorldPaths selectedWorld = world;
        if (selectedWorld == null || busy) return;
        busy = true;
        refreshButton.setEnabled(false);
        new SwingWorker<DailyNewspaperRegistry.Snapshot, Void>() {
            @Override protected DailyNewspaperRegistry.Snapshot doInBackground() throws Exception {
                return DailyNewspaperRegistry.load(selectedWorld);
            }

            @Override protected void done() {
                try {
                    if (!Objects.equals(selectedWorld, world)) return;
                    applySnapshot(get());
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    editionStatus.setText("Newspaper refresh interrupted");
                } catch (ExecutionException exception) {
                    Throwable cause = exception.getCause() == null ? exception : exception.getCause();
                    editionStatus.setText("Newspaper refresh failed: " + cause.getMessage());
                } finally {
                    busy = false;
                    refreshButton.setEnabled(world != null);
                }
            }
        }.execute();
    }

    private void applySnapshot(DailyNewspaperRegistry.Snapshot loaded) {
        snapshot = loaded;
        String currentEditionId = selectedEdition() == null ? null : selectedEdition().editionId();
        suppressEditionChange = true;
        try {
            editionSelector.removeAllItems();
            int selectedIndex = -1;
            for (int index = 0; index < loaded.editions().size(); index++) {
                DailyNewspaperRegistry.Edition row = loaded.editions().get(index);
                editionSelector.addItem(row.editionDate() + " · " + row.articleCount() + " stories");
                if (currentEditionId != null && currentEditionId.equals(row.editionId())) selectedIndex = index;
            }
            if (selectedIndex >= 0) editionSelector.setSelectedIndex(selectedIndex);
            else if (!loaded.editions().isEmpty()) editionSelector.setSelectedIndex(0);
        } finally {
            suppressEditionChange = false;
        }

        if (loaded.selectedEdition() == null) {
            tickerModel.clear();
            editionStatus.setText("CURRENT DAY OPEN · ticker locked until simulation midnight · no completed edition yet");
            fullEdition.setText(DailyNewspaperRegistry.renderEdition(null, List.of()));
            return;
        }
        renderLoadedEdition(loaded);
    }

    private void loadSelectedEdition() {
        WorldPaths selectedWorld = world;
        int index = editionSelector.getSelectedIndex();
        if (selectedWorld == null || index < 0 || index >= snapshot.editions().size() || busy) return;
        String editionId = snapshot.editions().get(index).editionId();
        busy = true;
        new SwingWorker<DailyNewspaperRegistry.Snapshot, Void>() {
            @Override protected DailyNewspaperRegistry.Snapshot doInBackground() throws Exception {
                return DailyNewspaperRegistry.loadEdition(selectedWorld, editionId);
            }
            @Override protected void done() {
                try {
                    if (!Objects.equals(selectedWorld, world)) return;
                    snapshot = get();
                    renderLoadedEdition(snapshot);
                } catch (Exception exception) {
                    Throwable cause = exception instanceof ExecutionException && exception.getCause() != null
                            ? exception.getCause() : exception;
                    editionStatus.setText("Edition load failed: " + cause.getMessage());
                } finally { busy = false; }
            }
        }.execute();
    }

    private void renderLoadedEdition(DailyNewspaperRegistry.Snapshot loaded) {
        DailyNewspaperRegistry.Edition edition = loaded.selectedEdition();
        tickerModel.clear();
        for (DailyNewspaperRegistry.Article row : loaded.articles()) tickerModel.addElement(row);
        editionStatus.setText("SEALED EDITION " + edition.editionDate() + " · " + edition.articleCount()
                + " stories · lead: " + edition.leadHeadline() + " · current day remains unpublished");
        fullEdition.setText(DailyNewspaperRegistry.renderEdition(edition, loaded.articles()));
        fullEdition.setCaretPosition(0);
        if (!loaded.articles().isEmpty()) {
            DailyNewspaperRegistry.Article prior = ticker.getSelectedValue();
            int selection = 0;
            if (prior != null) {
                for (int index = 0; index < loaded.articles().size(); index++) {
                    if (prior.articleId().equals(loaded.articles().get(index).articleId())) selection = index;
                }
            }
            ticker.setSelectedIndex(selection);
        }
    }

    private DailyNewspaperRegistry.Edition selectedEdition() {
        return snapshot.selectedEdition();
    }

    private void expandArticle(DailyNewspaperRegistry.Article selected) {
        DailyNewspaperRegistry.Edition edition = snapshot.selectedEdition();
        if (edition == null) return;
        article.setText(DailyNewspaperRegistry.renderArticle(edition, selected));
        article.setCaretPosition(0);
        readerPanel.setVisible(true);
        readerTabs.setSelectedIndex(0);
        if (getHeight() < EXPANDED_SIZE.height) setSize(EXPANDED_SIZE);
        collapseButton.setEnabled(true);
        revalidate();
        repaint();
        toFront();
    }

    private void collapseTicker() {
        readerPanel.setVisible(false);
        setSize(COMPACT_SIZE);
        collapseButton.setEnabled(false);
        revalidate();
        repaint();
    }

    @Override public void dispose() {
        refreshTimer.stop();
        if (subscription != null) {
            try { subscription.close(); } catch (Exception ignored) { }
            subscription = null;
        }
        super.dispose();
    }
}
