package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import javax.swing.BorderFactory;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JScrollPane;
import javax.swing.JTabbedPane;
import javax.swing.JTextArea;
import javax.swing.SwingWorker;
import javax.swing.WindowConstants;
import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.Font;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ExecutionException;

/** Full immutable article/newspaper reader opened from the embedded World Observer news ticker. */
public final class DailyNewspaperReaderWindow extends JFrame {
    private final JLabel status = new JLabel("Loading sealed newspaper…");
    private final JTextArea article = textArea();
    private final JTextArea fullEdition = textArea();
    private final JTabbedPane tabs = new JTabbedPane();

    public DailyNewspaperReaderWindow(WorldPaths world, String editionId, String articleId) {
        super("Europa Daily Observer — Sealed Newspaper");
        Objects.requireNonNull(world, "world");
        Objects.requireNonNull(editionId, "editionId");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(900, 620));
        setSize(1180, 780);
        setLayout(new BorderLayout(8, 8));

        status.setBorder(BorderFactory.createEmptyBorder(9, 12, 0, 12));
        add(status, BorderLayout.NORTH);
        tabs.addTab("Selected Article", new JScrollPane(article));
        tabs.addTab("Full Daily Newspaper", new JScrollPane(fullEdition));
        tabs.setBorder(BorderFactory.createEmptyBorder(0, 10, 10, 10));
        add(tabs, BorderLayout.CENTER);

        load(world, editionId, articleId);
    }

    private static JTextArea textArea() {
        JTextArea area = new JTextArea();
        area.setEditable(false);
        area.setLineWrap(true);
        area.setWrapStyleWord(true);
        area.setFont(new Font(Font.SERIF, Font.PLAIN, 15));
        area.setBorder(BorderFactory.createEmptyBorder(16, 18, 16, 18));
        return area;
    }

    private void load(WorldPaths world, String editionId, String articleId) {
        new SwingWorker<DailyNewspaperRegistry.Snapshot, Void>() {
            @Override protected DailyNewspaperRegistry.Snapshot doInBackground() throws Exception {
                return DailyNewspaperRegistry.loadEdition(world, editionId);
            }

            @Override protected void done() {
                try {
                    DailyNewspaperRegistry.Snapshot snapshot = get();
                    DailyNewspaperRegistry.Edition edition = snapshot.selectedEdition();
                    if (edition == null) {
                        status.setText("The requested sealed edition is unavailable.");
                        return;
                    }
                    List<DailyNewspaperRegistry.Article> rows = snapshot.articles();
                    DailyNewspaperRegistry.Article selected = rows.stream()
                            .filter(row -> Objects.equals(articleId, row.articleId()))
                            .findFirst().orElse(rows.isEmpty() ? null : rows.get(0));
                    status.setText(edition.masthead() + " · SEALED " + edition.editionDate()
                            + " · " + edition.articleCount() + " stories · frozen at tick " + edition.sealedTick());
                    article.setText(DailyNewspaperRegistry.renderArticle(edition, selected));
                    article.setCaretPosition(0);
                    fullEdition.setText(DailyNewspaperRegistry.renderEdition(edition, rows));
                    fullEdition.setCaretPosition(0);
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    status.setText("Newspaper load interrupted.");
                } catch (ExecutionException exception) {
                    Throwable cause = exception.getCause() == null ? exception : exception.getCause();
                    status.setText("Newspaper load failed: " + cause.getMessage());
                }
            }
        }.execute();
    }
}
