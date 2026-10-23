// lib/retention.ts
// Data retention policy for archived records.
//
// An archived record is hidden from the main pages but is NOT deleted.
// Only a PERSON's record is held for a retention period: the student or
// employee row carries their identity and their whole clinic history, so
// deleting it is the one action that cannot be recovered from anywhere.
//
// Individual entries — visits, dental records, case reports, referral
// slips — have no retention period. A wrong entry should be removable
// right away, and removing one does not erase the person.

export type RecordKind =
    | "student"
    | "employee"
    | "visit"
    | "employee_visit"
    | "dental"
    | "case_report"
    | "referral_slip";

/** Years a person's record is held before it can be deleted for good. */
export const RETENTION_YEARS = 5;

/** 0 means no retention period: deletable as soon as it is archived. */
export const RETENTION_BY_KIND: Record<RecordKind, number> = {
    student: RETENTION_YEARS,
    employee: RETENTION_YEARS,
    visit: 0,
    employee_visit: 0,
    dental: 0,
    case_report: 0,
    referral_slip: 0,
};

/** Years kept for one kind of record. Defaults to the person period. */
export function retentionYears(kind: RecordKind = "student"): number {
    return RETENTION_BY_KIND[kind] ?? RETENTION_YEARS;
}

export function retentionText(kind: RecordKind = "student"): string {
    const years = retentionYears(kind);
    if (years === 0) return "This record can be deleted at any time once archived.";
    return `Archived records of this type can only be permanently deleted after ${years} years.`;
}

export const RETENTION_TEXT = `Archived students and employees can only be permanently deleted after ${RETENTION_YEARS} years.`;

/** The date a record becomes eligible for permanent deletion. */
export function deletableOn(
    archivedAt: Date | string | null,
    kind: RecordKind = "student"
): Date | null {
    if (!archivedAt) return null;
    const years = retentionYears(kind);
    if (years === 0) return new Date(archivedAt);
    const date = new Date(archivedAt);
    date.setFullYear(date.getFullYear() + years);
    return date;
}

/** True when the retention period has already passed. */
export function canDeleteYet(
    archivedAt: Date | string | null,
    kind: RecordKind = "student"
): boolean {
    // No retention period at all — archiving is enough.
    if (retentionYears(kind) === 0) return Boolean(archivedAt);

    const due = deletableOn(archivedAt, kind);
    if (!due) return false;
    return Date.now() >= due.getTime();
}

/** How many whole years are left, for a short label. */
export function yearsLeft(
    archivedAt: Date | string | null,
    kind: RecordKind = "student"
): number {
    const due = deletableOn(archivedAt, kind);
    if (!due) return retentionYears(kind);
    const ms = due.getTime() - Date.now();
    if (ms <= 0) return 0;
    return Math.ceil(ms / (365.25 * 24 * 60 * 60 * 1000));
}

/** "Sep 25, 2031" - for the label that replaces the Delete button. */
export function formatDeletableOn(
    archivedAt: Date | string | null,
    kind: RecordKind = "student"
): string {
    const due = deletableOn(archivedAt, kind);
    if (!due) return "—";
    return due.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}