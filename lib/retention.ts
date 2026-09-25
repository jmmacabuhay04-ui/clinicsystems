// lib/retention.ts
// Data retention policy for archived records.
//
// An archived record is hidden from the main pages but is NOT deleted.
// It can only be permanently deleted once this many years have passed,
// so a record is still available if a health issue surfaces years later.
//
// Change the number here and the whole system follows.

export const RETENTION_YEARS = 10;

export const RETENTION_TEXT = `Archived records can only be permanently deleted after ${RETENTION_YEARS} years.`;

/** The date a record becomes eligible for permanent deletion. */
export function deletableOn(archivedAt: Date | string | null): Date | null {
    if (!archivedAt) return null;
    const date = new Date(archivedAt);
    date.setFullYear(date.getFullYear() + RETENTION_YEARS);
    return date;
}

/** True when the retention period has already passed. */
export function canDeleteYet(archivedAt: Date | string | null): boolean {
    const due = deletableOn(archivedAt);
    if (!due) return false;
    return Date.now() >= due.getTime();
}

/** How many whole years are left, for a short label. */
export function yearsLeft(archivedAt: Date | string | null): number {
    const due = deletableOn(archivedAt);
    if (!due) return RETENTION_YEARS;
    const ms = due.getTime() - Date.now();
    if (ms <= 0) return 0;
    return Math.ceil(ms / (365.25 * 24 * 60 * 60 * 1000));
}

/** "Sep 25, 2036" - for the label that replaces the Delete button. */
export function formatDeletableOn(archivedAt: Date | string | null): string {
    const due = deletableOn(archivedAt);
    if (!due) return "—";
    return due.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}