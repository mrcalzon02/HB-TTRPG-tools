package org.cubechat.android;

import java.util.Objects;

/**
 * UI-thread-only bookkeeping for asynchronous local draft saves.
 *
 * A queued write is not yet durable. An acknowledgement for an older edit,
 * including the same text typed again, must never overwrite the current
 * editor's dirty state. This model stores only transient in-memory data.
 */
final class DraftSaveState {
    static final class Ticket {
        final long contactId;
        final long revision;
        final String text;

        private Ticket(long contactId, long revision, String text) {
            this.contactId = contactId;
            this.revision = revision;
            this.text = text;
        }
    }

    private long revision;
    private boolean dirty;

    void edited() {
        revision++;
        dirty = true;
    }

    /** Called on contact change, profile lock, or destruction of the editor. */
    void reset() {
        revision++;
        dirty = false;
    }

    boolean isDirty() { return dirty; }

    /**
     * Start a save only if the current editor needs one. This clears the
     * pending flag optimistically, but a failure acknowledgement can restore
     * it for an unchanged live editor so the user can retry.
     */
    Ticket begin(long contactId, String text) {
        if (!dirty || contactId <= 0 || text == null) return null;
        dirty = false;
        return new Ticket(contactId, revision, text);
    }

    /**
     * True only when a failed write belongs to this exact edit instance.
     * The caller must still be showing the same contact and text.
     */
    boolean failed(Ticket ticket, long currentContactId,
                   String currentText, String error) {
        if (ticket == null || error == null || ticket.contactId != currentContactId
                || ticket.revision != revision || !Objects.equals(ticket.text, currentText))
            return false;
        dirty = true;
        return true;
    }

    /** The result still belongs to the current displayed edit. */
    boolean isCurrent(Ticket ticket, long currentContactId, String currentText) {
        return ticket != null && ticket.contactId == currentContactId
                && ticket.revision == revision && Objects.equals(ticket.text, currentText);
    }

    /** Explicit user-requested retry, including when no pending write exists. */
    void retry() {
        revision++;
        dirty = true;
    }
}
