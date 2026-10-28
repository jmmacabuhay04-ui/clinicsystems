import Link from "next/link";
import { redirect } from "next/navigation";
import {
    Archive,
    Briefcase,
    ClipboardList,
    FileText,
    GraduationCap,
    Layers,
    Lock,
    RotateCcw,
    Search,
    ShieldCheck,
    Stethoscope,
    Trash2,
    UserCog,
    X,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { InactiveBadge } from "@/components/shared/list-ui";
import { getSession } from "@/lib/auth/session";
import { canManageDental, canManageRecords, canManageStaff } from "@/lib/permissions";

import ConfirmButton from "@/components/shared/confirm-button";
import FlashMessage from "@/components/shared/flash-message";
import { deleteRecord, restoreRecord } from "@/features/student-health-records/record-actions";
import { deleteStudent, restoreStudent } from "@/features/students/actions";
import { deleteCase, restoreCase } from "@/features/case-reports/case-actions";
import { deleteDental, restoreDental } from "@/features/dental-records/actions";
import { deleteSlip, restoreSlip } from "@/features/referral-slips/actions";
import { deleteStaff, restoreStaff } from "@/features/clinic-staff/actions";
import { deleteEmployee, restoreEmployee } from "@/features/employee-health-records/employee-actions";
import {
    deleteEmployeeRecord,
    restoreEmployeeRecord,
} from "@/features/employee-health-records/record-actions";
import {
    canDeleteYet,
    formatDeletableOn,
    retentionText,
    RETENTION_YEARS,
    type RecordKind,
} from "@/lib/retention";
import SearchInput from "@/components/shared/search-input";

type ArchivedStudent = {
    student_id: number;
    student_number: string;
    last_name: string;
    first_name: string;
    grade_level: string | null;
    program: string | null;
    archived_at: Date;
    visit_count: bigint;
};

type ArchivedEmployee = {
    employee_id: number;
    employee_number: string;
    last_name: string;
    first_name: string;
    department: string | null;
    position: string | null;
    archived_at: Date;
    visit_count: bigint;
};

type ArchivedRecord = {
    record_id: number;
    student_number: string;
    last_name: string;
    first_name: string;
    visit_date: Date;
    complaint: string;
    archived_at: Date;
};

type ArchivedEmployeeRecord = {
    record_id: number;
    employee_number: string;
    last_name: string;
    first_name: string;
    visit_date: Date;
    complaint: string;
    archived_at: Date;
};

type ArchivedCase = {
    case_id: number;
    case_number: string;
    id_number: string | null;
    last_name: string | null;
    first_name: string | null;
    complaint: string;
    report_date: Date;
    status: string;
    archived_at: Date;
};

type ArchivedDental = {
    dental_id: number;
    student_number: string;
    last_name: string;
    first_name: string;
    procedure_name: string;
    tooth: string | null;
    visit_date: Date;
    archived_at: Date;
};

type ArchivedSlip = {
    slip_id: number;
    slip_type: string;
    student_number: string;
    last_name: string;
    first_name: string;
    section: string | null;
    teacher_name: string | null;
    subject: string | null;
    reason: string;
    slip_date: Date;
    status: string;
    archived_at: Date;
};

type ArchivedStaff = {
    staff_id: number;
    full_name: string;
    position: string;
    email: string | null;
    license_no: string | null;
    archived_at: Date;
};

type Props = {
    searchParams: Promise<{ q?: string; notice?: string; until?: string; type?: string }>;
};

const BASE = "/dashboard/archive-records";

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

type IconType = React.ComponentType<{ className?: string }>;

function ToothIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M7 3c-2.2 0-4 1.8-4 4.2 0 2 .8 3.3 1.5 4.6.6 1.2.9 2.6 1.1 4.2.3 2.4.8 5 2.4 5 1.3 0 1.6-1.8 2-3.6.3-1.4.8-2.4 2-2.4s1.7 1 2 2.4c.4 1.8.7 3.6 2 3.6 1.6 0 2.1-2.6 2.4-5 .2-1.6.5-3 1.1-4.2.7-1.3 1.5-2.6 1.5-4.6C21 4.8 19.2 3 17 3c-1.9 0-2.9 1-5 1S8.9 3 7 3z" />
        </svg>
    );
}

function formatDate(date: Date | null) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
    });
}

/**
 * Health records are kept for the full retention period. Until then the
 * Delete button is replaced by the date it becomes available.
 */
function RetentionGate({
    archivedAt,
    kind = "visit",
    children,
}: {
    archivedAt: Date;
    kind?: RecordKind;
    children: React.ReactNode;
}) {
    if (canDeleteYet(archivedAt, kind)) return <>{children}</>;

    return (
        <span
            title={retentionText(kind)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-gray-100 px-3 text-sm font-medium text-gray-600 sm:whitespace-nowrap"
        >
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Deletable on {formatDeletableOn(archivedAt, kind)}
        </span>
    );
}

/* ------------------------------------------------------------------ */
/* Reusable pieces (para hindi na paulit-ulit ang table sa bawat seksyon) */
/* ------------------------------------------------------------------ */

type FormAction = React.ComponentProps<"form">["action"];

const RESTORE_CLASS =
    "inline-flex h-8 items-center gap-1.5 rounded-md bg-[#15664f] px-3 text-sm font-semibold text-white hover:bg-[#10523f]";
const DELETE_CLASS =
    "inline-flex h-8 items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 text-sm font-semibold text-red-600 hover:bg-red-50";

function RestoreForm({
    action,
    name,
    value,
    title,
    message,
}: {
    action: FormAction;
    name: string;
    value: number;
    title: string;
    message: string;
}) {
    return (
        <form action={action}>
            <input type="hidden" name={name} value={value} />
            <ConfirmButton
                title={title}
                confirmLabel="Restore"
                message={message}
                className={RESTORE_CLASS}
            >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore
            </ConfirmButton>
        </form>
    );
}

function DeleteForm({
    action,
    name,
    value,
    title,
    message,
    archivedAt,
    kind,
}: {
    action: FormAction;
    name: string;
    value: number;
    title: string;
    message: string;
    archivedAt: Date;
    kind?: RecordKind;
}) {
    return (
        <RetentionGate archivedAt={archivedAt} kind={kind}>
            <form action={action}>
                <input type="hidden" name={name} value={value} />
                <ConfirmButton
                    title={title}
                    confirmLabel="Delete permanently"
                    danger
                    message={message}
                    className={DELETE_CLASS}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                </ConfirmButton>
            </form>
        </RetentionGate>
    );
}

type Column = {
    label: string;
    /** nowrap sa header */
    nowrap?: boolean;
    /** Tailwind classes para sa cell (kulay, bigat ng font, nowrap) */
    td?: string;
};

type Item = {
    key: string | number;
    /** Pangunahing linya sa mobile card */
    title: string;
    /** Maliit na linya sa ilalim ng title (hal. ID number) */
    sub?: string;
    /** Mga detalye sa mobile card */
    fields: { label: string; value: React.ReactNode }[];
    /** Laman ng desktop row, kapareho ng pagkakasunod ng columns */
    cells: React.ReactNode[];
    actions?: React.ReactNode;
};

function ArchiveSection({
    title,
    icon: Icon,
    empty,
    columns,
    items,
    showActions,
}: {
    title: string;
    icon: IconType;
    empty: string;
    columns: Column[];
    items: Item[];
    showActions: boolean;
}) {
    return (
        <section className={`${card} min-w-0 overflow-hidden`}>
            <div className="flex items-center justify-between gap-3 p-4 md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <h2 className="text-base font-semibold text-gray-900 md:text-lg">{title}</h2>
                </div>
                <span className="shrink-0 rounded-full bg-[#eef6f2] px-3 py-1 text-sm font-semibold text-[#15664f]">
                    {items.length} item{items.length === 1 ? "" : "s"}
                </span>
            </div>

            {items.length === 0 ? (
                <div className="flex flex-col items-center border-t border-gray-100 p-8 text-center">
                    <Archive className="h-10 w-10 text-[#15664f]/30" />
                    <p className="mt-2 text-sm text-gray-600">{empty}</p>
                </div>
            ) : (
                <>
                    {/* MOBILE: card list (walang horizontal scroll) */}
                    <ul className="space-y-2 border-t border-gray-100 p-3 md:hidden">
                        {items.map((item) => (
                            <li key={item.key} className="rounded-lg border border-gray-200 p-3">
                                <p className="break-words text-sm font-semibold text-gray-900">{item.title}</p>
                                {item.sub && <p className="break-words text-sm text-gray-600">{item.sub}</p>}
                                <dl className="mt-2 space-y-1">
                                    {item.fields.map((f) => (
                                        <div key={f.label} className="flex gap-2 text-sm">
                                            <dt className="w-24 shrink-0 text-gray-600">{f.label}</dt>
                                            <dd className="min-w-0 flex-1 break-words text-gray-900">{f.value}</dd>
                                        </div>
                                    ))}
                                </dl>
                                {item.actions && (
                                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                                        {item.actions}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>

                    {/* DESKTOP: table */}
                    <div className="hidden overflow-x-auto border-t border-gray-100 md:block">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#f6faf8] text-sm uppercase tracking-wide text-gray-600">
                                <tr>
                                    {columns.map((c) => (
                                        <th
                                            key={c.label}
                                            className={`px-4 py-3 font-semibold ${c.nowrap ? "whitespace-nowrap" : ""}`}
                                        >
                                            {c.label}
                                        </th>
                                    ))}
                                    {showActions && <th className="px-4 py-3 font-semibold">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.key} className="border-t border-gray-100 hover:bg-[#f6faf8]">
                                        {item.cells.map((cell, i) => (
                                            <td key={i} className={`px-4 py-3 align-middle ${columns[i]?.td ?? ""}`}>
                                                {cell}
                                            </td>
                                        ))}
                                        {showActions && (
                                            <td className="whitespace-nowrap px-4 py-3">
                                                <div className="flex items-center gap-2">{item.actions}</div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </section>
    );
}

export default async function ArchiveRecordsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const { q = "", notice, type = "all" } = await searchParams;
    const like = `%${q}%`;
    const canEdit = canManageRecords(session.role) || canManageDental(session.role);
    const canEditStaff = canManageStaff(session.role);

    const [students, employees, records, employeeRecords, cases, dental, slips, staff] =
        await Promise.all([
            prisma.$queryRaw<ArchivedStudent[]>`
      SELECT s.student_id, s.student_number, s.last_name, s.first_name,
             s.grade_level, s.program, s.archived_at,
             (SELECT COUNT(*) FROM health_records h WHERE h.student_id = s.student_id) AS visit_count
      FROM students s
      WHERE s.archived_at IS NOT NULL
        AND (${q}::text = '' OR s.student_number ILIKE ${like}
             OR s.last_name ILIKE ${like} OR s.first_name ILIKE ${like})
      ORDER BY s.archived_at DESC
    `,
            prisma.$queryRaw<ArchivedEmployee[]>`
      SELECT e.employee_id, e.employee_number, e.last_name, e.first_name,
             e.department, e.position, e.archived_at,
             (SELECT COUNT(*) FROM employee_health_records h
              WHERE h.employee_id = e.employee_id) AS visit_count
      FROM employees e
      WHERE e.archived_at IS NOT NULL
        AND (${q}::text = '' OR e.employee_number ILIKE ${like}
             OR e.last_name ILIKE ${like} OR e.first_name ILIKE ${like})
      ORDER BY e.archived_at DESC
    `,
            prisma.$queryRaw<ArchivedRecord[]>`
      SELECT r.record_id, s.student_number, s.last_name, s.first_name,
             r.visit_date, r.complaint, r.archived_at
      FROM health_records r
      JOIN students s ON s.student_id = r.student_id
      WHERE r.archived_at IS NOT NULL
        AND (${q}::text = '' OR s.student_number ILIKE ${like}
             OR s.last_name ILIKE ${like} OR s.first_name ILIKE ${like})
      ORDER BY r.archived_at DESC
    `,
            prisma.$queryRaw<ArchivedEmployeeRecord[]>`
      SELECT r.record_id, e.employee_number, e.last_name, e.first_name,
             r.visit_date, r.complaint, r.archived_at
      FROM employee_health_records r
      JOIN employees e ON e.employee_id = r.employee_id
      WHERE r.archived_at IS NOT NULL
        AND (${q}::text = '' OR e.employee_number ILIKE ${like}
             OR e.last_name ILIKE ${like} OR e.first_name ILIKE ${like})
      ORDER BY r.archived_at DESC
    `,
            // LEFT JOIN on both sides: a case report belongs to a student OR an
            // employee. The old INNER JOIN on students made every archived
            // employee case report invisible here, with no way to restore it.
            prisma.$queryRaw<ArchivedCase[]>`
      SELECT c.case_id, c.case_number,
             COALESCE(s.student_number, e.employee_number) AS id_number,
             COALESCE(s.last_name, e.last_name)            AS last_name,
             COALESCE(s.first_name, e.first_name)          AS first_name,
             c.complaint, c.report_date, c.status, c.archived_at
      FROM health_case_reports c
      LEFT JOIN students  s ON s.student_id  = c.student_id
      LEFT JOIN employees e ON e.employee_id = c.employee_id
      WHERE c.archived_at IS NOT NULL
        AND (${q}::text = ''
             OR COALESCE(s.student_number, e.employee_number) ILIKE ${like}
             OR COALESCE(s.last_name, e.last_name) ILIKE ${like}
             OR COALESCE(s.first_name, e.first_name) ILIKE ${like}
             OR c.case_number ILIKE ${like})
      ORDER BY c.archived_at DESC
    `,
            prisma.$queryRaw<ArchivedDental[]>`
      SELECT d.dental_id,
             COALESCE(s.student_number, e.employee_number) AS student_number,
             COALESCE(s.last_name, e.last_name) AS last_name,
             COALESCE(s.first_name, e.first_name) AS first_name,
             d.procedure_name, d.tooth, d.visit_date, d.archived_at
      FROM dental_records d
      LEFT JOIN students s ON s.student_id = d.student_id
      LEFT JOIN employees e ON e.employee_id = d.employee_id
      WHERE d.archived_at IS NOT NULL
        AND (${q}::text = ''
             OR COALESCE(s.student_number, e.employee_number) ILIKE ${like}
             OR COALESCE(s.last_name, e.last_name) ILIKE ${like}
             OR COALESCE(s.first_name, e.first_name) ILIKE ${like})
      ORDER BY d.archived_at DESC
    `,
            prisma.$queryRaw<ArchivedSlip[]>`
      SELECT f.slip_id, f.slip_type, s.student_number, s.last_name, s.first_name,
             f.section, f.teacher_name, f.subject, f.reason, f.slip_date,
             f.status, f.archived_at
      FROM referral_slips f
      JOIN students s ON s.student_id = f.student_id
      WHERE f.archived_at IS NOT NULL
        AND (${q}::text = '' OR s.student_number ILIKE ${like}
             OR s.last_name ILIKE ${like} OR s.first_name ILIKE ${like})
      ORDER BY f.archived_at DESC
    `,
            prisma.$queryRaw<ArchivedStaff[]>`
      SELECT staff_id, full_name, position, email, license_no, archived_at
      FROM clinic_staff
      WHERE archived_at IS NOT NULL
        AND (${q}::text = '' OR full_name ILIKE ${like}
             OR position ILIKE ${like} OR COALESCE(email, '') ILIKE ${like})
      ORDER BY archived_at DESC
    `,
        ]);

    const total =
        students.length +
        employees.length +
        records.length +
        employeeRecords.length +
        cases.length +
        dental.length +
        slips.length +
        staff.length;

    /* ---------------- Students ---------------- */
    const studentItems: Item[] = students.map((s) => {
        const name = `${s.last_name}, ${s.first_name}`;
        return {
            key: s.student_id,
            title: name,
            sub: s.student_number,
            fields: [
                { label: "Grade/Level", value: s.grade_level ?? "—" },
                { label: "Program", value: s.program ?? "—" },
                { label: "Status", value: <InactiveBadge /> },
                { label: "Archived On", value: formatDate(s.archived_at) },
            ],
            cells: [
                s.student_number,
                name,
                s.grade_level ?? "—",
                s.program ?? "—",
                <InactiveBadge key="status" />,
                formatDate(s.archived_at),
            ],
            actions: canEdit ? (
                <>
                    <RestoreForm
                        action={restoreStudent}
                        name="studentId"
                        value={s.student_id}
                        title="Restore student"
                        message={`Restore ${s.last_name}, ${s.first_name} (${s.student_number}) to the Students list?`}
                    />
                    <DeleteForm
                        action={deleteStudent}
                        name="studentId"
                        value={s.student_id}
                        kind="student"
                        archivedAt={s.archived_at}
                        title="Delete student"
                        message={`Permanently delete ${s.last_name}, ${s.first_name} (${s.student_number})? This also deletes ${Number(s.visit_count)} health record(s) and their student portal account. This cannot be undone.`}
                    />
                </>
            ) : undefined,
        };
    });

    /* ---------------- Employees ---------------- */
    const employeeItems: Item[] = employees.map((e) => {
        const name = `${e.last_name}, ${e.first_name}`;
        return {
            key: e.employee_id,
            title: name,
            sub: e.employee_number,
            fields: [
                { label: "Department", value: e.department ?? "—" },
                { label: "Position", value: e.position ?? "—" },
                { label: "Status", value: <InactiveBadge /> },
                { label: "Archived On", value: formatDate(e.archived_at) },
            ],
            cells: [
                e.employee_number,
                name,
                e.department ?? "—",
                e.position ?? "—",
                <InactiveBadge key="status" />,
                formatDate(e.archived_at),
            ],
            actions: canEdit ? (
                <>
                    <RestoreForm
                        action={restoreEmployee}
                        name="employeeId"
                        value={e.employee_id}
                        title="Restore employee"
                        message={`Restore ${e.last_name}, ${e.first_name} (${e.employee_number}) to the Employees list?`}
                    />
                    <DeleteForm
                        action={deleteEmployee}
                        name="employeeId"
                        value={e.employee_id}
                        kind="employee"
                        archivedAt={e.archived_at}
                        title="Delete employee"
                        message={`Permanently delete ${e.last_name}, ${e.first_name} (${e.employee_number})? This also deletes ${Number(e.visit_count)} health record(s) and their employee portal account. This cannot be undone.`}
                    />
                </>
            ) : undefined,
        };
    });

    /* ---------------- Case reports ---------------- */
    const caseItems: Item[] = cases.map((c) => {
        const name = [c.last_name, c.first_name].filter(Boolean).join(", ") || "Unknown";
        return {
            key: c.case_id,
            title: name,
            sub: `${c.case_number}${c.id_number ? ` · ${c.id_number}` : ""}`,
            fields: [
                { label: "Complaint", value: c.complaint },
                { label: "Date", value: formatDate(c.report_date) },
                { label: "Archived On", value: formatDate(c.archived_at) },
            ],
            cells: [
                c.case_number,
                <>
                    {name}
                    {c.id_number && <span className="block text-sm text-gray-600">{c.id_number}</span>}
                </>,
                c.complaint,
                formatDate(c.report_date),
                formatDate(c.archived_at),
            ],
            actions: canEdit ? (
                <>
                    <RestoreForm
                        action={restoreCase}
                        name="caseId"
                        value={c.case_id}
                        title="Restore case report"
                        message={`Restore case ${c.case_number} (${c.complaint})?`}
                    />
                    <DeleteForm
                        action={deleteCase}
                        name="caseId"
                        value={c.case_id}
                        archivedAt={c.archived_at}
                        title="Delete case report"
                        message={`Permanently delete case ${c.case_number} (${c.complaint})? This cannot be undone.`}
                    />
                </>
            ) : undefined,
        };
    });

    /* ---------------- Visit records: students ---------------- */
    const recordItems: Item[] = records.map((r) => {
        const name = `${r.last_name}, ${r.first_name}`;
        return {
            key: r.record_id,
            title: name,
            sub: r.student_number,
            fields: [
                { label: "Visit Date", value: formatDate(r.visit_date) },
                { label: "Complaint", value: r.complaint },
                { label: "Archived On", value: formatDate(r.archived_at) },
            ],
            cells: [
                r.student_number,
                name,
                formatDate(r.visit_date),
                r.complaint,
                formatDate(r.archived_at),
            ],
            actions: canEdit ? (
                <>
                    <RestoreForm
                        action={restoreRecord}
                        name="recordId"
                        value={r.record_id}
                        title="Restore visit record"
                        message={`Restore this visit? ${r.last_name}, ${r.first_name} · ${formatDate(r.visit_date)} · ${r.complaint}`}
                    />
                    <DeleteForm
                        action={deleteRecord}
                        name="recordId"
                        value={r.record_id}
                        archivedAt={r.archived_at}
                        title="Delete visit record"
                        message={`Permanently delete this visit? ${r.last_name}, ${r.first_name} · ${formatDate(r.visit_date)} · ${r.complaint}. This cannot be undone.`}
                    />
                </>
            ) : undefined,
        };
    });

    /* ---------------- Visit records: employees ---------------- */
    const employeeRecordItems: Item[] = employeeRecords.map((r) => {
        const name = `${r.last_name}, ${r.first_name}`;
        return {
            key: r.record_id,
            title: name,
            sub: r.employee_number,
            fields: [
                { label: "Visit Date", value: formatDate(r.visit_date) },
                { label: "Complaint", value: r.complaint },
                { label: "Archived On", value: formatDate(r.archived_at) },
            ],
            cells: [
                r.employee_number,
                name,
                formatDate(r.visit_date),
                r.complaint,
                formatDate(r.archived_at),
            ],
            actions: canEdit ? (
                <>
                    <RestoreForm
                        action={restoreEmployeeRecord}
                        name="recordId"
                        value={r.record_id}
                        title="Restore visit record"
                        message={`Restore this visit? ${r.last_name}, ${r.first_name} · ${formatDate(r.visit_date)} · ${r.complaint}`}
                    />
                    <DeleteForm
                        action={deleteEmployeeRecord}
                        name="recordId"
                        value={r.record_id}
                        archivedAt={r.archived_at}
                        title="Delete visit record"
                        message={`Permanently delete this visit? ${r.last_name}, ${r.first_name} · ${formatDate(r.visit_date)} · ${r.complaint}. This cannot be undone.`}
                    />
                </>
            ) : undefined,
        };
    });

    /* ---------------- Dental ---------------- */
    const dentalItems: Item[] = dental.map((d) => {
        const name = `${d.last_name}, ${d.first_name}`;
        return {
            key: d.dental_id,
            title: name,
            sub: d.student_number,
            fields: [
                { label: "Procedure", value: d.procedure_name },
                { label: "Tooth", value: d.tooth ?? "—" },
                { label: "Visit Date", value: formatDate(d.visit_date) },
                { label: "Archived On", value: formatDate(d.archived_at) },
            ],
            cells: [
                d.student_number,
                name,
                d.procedure_name,
                d.tooth ?? "—",
                formatDate(d.visit_date),
                formatDate(d.archived_at),
            ],
            actions: canEdit ? (
                <>
                    <RestoreForm
                        action={restoreDental}
                        name="dentalId"
                        value={d.dental_id}
                        title="Restore dental record"
                        message={`Restore this dental record (${d.procedure_name})?`}
                    />
                    <DeleteForm
                        action={deleteDental}
                        name="dentalId"
                        value={d.dental_id}
                        archivedAt={d.archived_at}
                        title="Delete dental record"
                        message={`Permanently delete this dental record (${d.procedure_name})? This cannot be undone.`}
                    />
                </>
            ) : undefined,
        };
    });

    /* ---------------- Referral slips ---------------- */
    const slipItems: Item[] = slips.map((f) => {
        const name = `${f.last_name}, ${f.first_name}`;
        return {
            key: f.slip_id,
            title: name,
            sub: f.student_number,
            fields: [
                { label: "Type", value: <span className="capitalize">{f.slip_type}</span> },
                { label: "Teacher", value: f.teacher_name ?? "—" },
                { label: "Reason", value: f.reason },
                { label: "Slip Date", value: formatDate(f.slip_date) },
                { label: "Status", value: <span className="capitalize">{f.status}</span> },
                { label: "Archived On", value: formatDate(f.archived_at) },
            ],
            cells: [
                f.student_number,
                name,
                f.slip_type,
                f.teacher_name ?? "—",
                f.reason,
                formatDate(f.slip_date),
                f.status,
                formatDate(f.archived_at),
            ],
            actions: canEdit ? (
                <>
                    <RestoreForm
                        action={restoreSlip}
                        name="slipId"
                        value={f.slip_id}
                        title="Restore referral slip"
                        message={`Restore this referral slip for ${f.last_name}, ${f.first_name} (${f.reason})?`}
                    />
                    <DeleteForm
                        action={deleteSlip}
                        name="slipId"
                        value={f.slip_id}
                        archivedAt={f.archived_at}
                        title="Delete referral slip"
                        message={`Permanently delete this referral slip for ${f.last_name}, ${f.first_name} (${f.reason})? This cannot be undone.`}
                    />
                </>
            ) : undefined,
        };
    });

    /* ---------------- Clinic staff ---------------- */
    const staffItems: Item[] = staff.map((st) => ({
        key: st.staff_id,
        title: st.full_name,
        sub: st.position,
        fields: [
            { label: "Email", value: st.email ?? "—" },
            { label: "License / PRC", value: st.license_no ?? "—" },
            { label: "Archived On", value: formatDate(st.archived_at) },
        ],
        cells: [
            st.full_name,
            st.position,
            st.email ?? "—",
            st.license_no ?? "—",
            formatDate(st.archived_at),
        ],
        actions: canEditStaff ? (
            <>
                <form action={restoreStaff}>
                    <input type="hidden" name="staffId" value={st.staff_id} />
                    <ConfirmButton
                        title="Restore staff record"
                        confirmLabel="Restore"
                        message={`Restore ${st.full_name} to the Clinic Staff list?`}
                        className={RESTORE_CLASS}
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                    </ConfirmButton>
                </form>
                <form action={deleteStaff}>
                    <input type="hidden" name="staffId" value={st.staff_id} />
                    <ConfirmButton
                        title="Delete staff record"
                        confirmLabel="Delete permanently"
                        danger
                        message={`Permanently delete ${st.full_name} from clinic staff? This cannot be undone.`}
                        className={DELETE_CLASS}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                    </ConfirmButton>
                </form>
            </>
        ) : undefined,
    }));

    const sections = [
        {
            key: "students",
            label: "Students",
            title: "Archived Students",
            icon: GraduationCap as IconType,
            empty: "No archived students.",
            showActions: canEdit,
            items: studentItems,
            columns: [
                { label: "Student Number", nowrap: true, td: "font-medium text-gray-900" },
                { label: "Name", td: "font-semibold text-gray-900" },
                { label: "Grade/Level", nowrap: true, td: "text-gray-600" },
                { label: "Program", td: "text-gray-600" },
                { label: "Status", nowrap: true },
                { label: "Archived On", nowrap: true, td: "whitespace-nowrap text-gray-600" },
            ],
        },
        {
            key: "employees",
            label: "Employees",
            title: "Archived Employees",
            icon: Briefcase as IconType,
            empty: "No archived employees.",
            showActions: canEdit,
            items: employeeItems,
            columns: [
                { label: "Employee Number", nowrap: true, td: "font-medium text-gray-900" },
                { label: "Name", td: "font-semibold text-gray-900" },
                { label: "Department", td: "text-gray-600" },
                { label: "Position", td: "text-gray-600" },
                { label: "Status", nowrap: true },
                { label: "Archived On", nowrap: true, td: "whitespace-nowrap text-gray-600" },
            ],
        },
        {
            key: "cases",
            label: "Case Reports",
            title: "Archived Case Reports",
            icon: ClipboardList as IconType,
            empty: "No archived case reports.",
            showActions: canEdit,
            items: caseItems,
            columns: [
                { label: "Case No.", nowrap: true, td: "whitespace-nowrap font-semibold text-gray-900" },
                { label: "Patient", td: "text-gray-900" },
                { label: "Complaint", td: "text-gray-900" },
                { label: "Date", nowrap: true, td: "whitespace-nowrap text-gray-600" },
                { label: "Archived On", nowrap: true, td: "whitespace-nowrap text-gray-600" },
            ],
        },
        {
            key: "student-visits",
            label: "Student Visits",
            title: "Archived Visit Records — Students",
            icon: Stethoscope as IconType,
            empty: "No archived visit records.",
            showActions: canEdit,
            items: recordItems,
            columns: [
                { label: "Student Number", nowrap: true, td: "font-medium text-gray-900" },
                { label: "Name", td: "font-semibold text-gray-900" },
                { label: "Visit Date", nowrap: true, td: "whitespace-nowrap text-gray-900" },
                { label: "Complaint", td: "text-gray-900" },
                { label: "Archived On", nowrap: true, td: "whitespace-nowrap text-gray-600" },
            ],
        },
        {
            key: "employee-visits",
            label: "Employee Visits",
            title: "Archived Visit Records — Employees",
            icon: Stethoscope as IconType,
            empty: "No archived employee visit records.",
            showActions: canEdit,
            items: employeeRecordItems,
            columns: [
                { label: "Employee Number", nowrap: true, td: "font-medium text-gray-900" },
                { label: "Name", td: "font-semibold text-gray-900" },
                { label: "Visit Date", nowrap: true, td: "whitespace-nowrap text-gray-900" },
                { label: "Complaint", td: "text-gray-900" },
                { label: "Archived On", nowrap: true, td: "whitespace-nowrap text-gray-600" },
            ],
        },
        {
            key: "dental",
            label: "Dental",
            title: "Archived Dental Records",
            icon: ToothIcon as IconType,
            empty: "No archived dental records.",
            showActions: canEdit,
            items: dentalItems,
            columns: [
                { label: "ID Number", nowrap: true, td: "font-medium text-gray-900" },
                { label: "Name", td: "font-semibold text-gray-900" },
                { label: "Procedure", td: "text-gray-900" },
                { label: "Tooth", td: "text-gray-600" },
                { label: "Visit Date", nowrap: true, td: "whitespace-nowrap text-gray-600" },
                { label: "Archived On", nowrap: true, td: "whitespace-nowrap text-gray-600" },
            ],
        },
        {
            key: "slips",
            label: "Referral Slips",
            title: "Archived Referral Slips",
            icon: FileText as IconType,
            empty: "No archived referral slips.",
            showActions: canEdit,
            items: slipItems,
            columns: [
                { label: "Student Number", nowrap: true, td: "font-medium text-gray-900" },
                { label: "Name", td: "font-semibold text-gray-900" },
                { label: "Type", td: "capitalize text-gray-600" },
                { label: "Teacher", td: "text-gray-600" },
                { label: "Reason", td: "text-gray-900" },
                { label: "Slip Date", nowrap: true, td: "whitespace-nowrap text-gray-600" },
                { label: "Status", td: "capitalize text-gray-600" },
                { label: "Archived On", nowrap: true, td: "whitespace-nowrap text-gray-600" },
            ],
        },
        {
            key: "staff",
            label: "Clinic Staff",
            title: "Archived Clinic Staff",
            icon: UserCog as IconType,
            empty: "No archived clinic staff.",
            showActions: canEditStaff,
            items: staffItems,
            columns: [
                { label: "Name", td: "font-semibold text-gray-900" },
                { label: "Role", td: "text-gray-600" },
                { label: "Email", td: "text-gray-600" },
                { label: "License / PRC No.", nowrap: true, td: "whitespace-nowrap text-gray-600" },
                { label: "Archived On", nowrap: true, td: "whitespace-nowrap text-gray-600" },
            ],
        },
    ];

    const activeType = type === "all" || sections.some((sec) => sec.key === type) ? type : "all";
    // Sa "All", ang may laman lang ang ipinapakita para hindi mahaba ang page.
    const visible =
        activeType === "all"
            ? sections.filter((sec) => sec.items.length > 0)
            : sections.filter((sec) => sec.key === activeType);

    function tabHref(key: string) {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (key !== "all") params.set("type", key);
        const qs = params.toString();
        return qs ? `${BASE}?${qs}` : BASE;
    }

    const tabs = [
        { key: "all", label: "All", icon: Layers as IconType, count: total },
        ...sections.map((sec) => ({ key: sec.key, label: sec.label, icon: sec.icon, count: sec.items.length })),
    ];

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Archive Records</h1>
                        <p className="text-sm text-gray-600">
                            Archived items are hidden from their main pages. Restore them or delete after the retention period.
                        </p>
                    </div>
                </div>
                {!canEdit && (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-600">View only</span>
                )}
            </div>

            {notice === "deleted" && (
                <FlashMessage clearParam="notice">Record permanently deleted and logged.</FlashMessage>
            )}

            {/* Retention + total */}
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className={`${card} flex items-center gap-4 p-5`}>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#eef6f2] text-[#15664f]">
                        <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                        <p className="font-semibold text-gray-900">Data retention policy: {RETENTION_YEARS} years</p>
                        <p className="text-sm text-gray-600">
                            Records can only be permanently deleted after the retention period. Until then, the Delete
                            button shows the date it becomes available.
                        </p>
                    </div>
                </div>
                <div className={`${card} flex items-center gap-4 p-5 md:min-w-[220px]`}>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                        <Archive className="h-5 w-5" />
                    </span>
                    <div>
                        <p className="text-sm text-gray-600">{q ? "Matching Items" : "Total Archived"}</p>
                        <p className="text-2xl font-bold text-gray-900">{total}</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <form method="get" className="flex flex-wrap items-center gap-2 md:gap-3">
                {activeType !== "all" && <input type="hidden" name="type" value={activeType} />}
                <div className="relative w-full md:max-w-md md:flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
                    <SearchInput
                        name="q"
                        defaultValue={q}
                        autoComplete="off"
                        placeholder="Search by ID number, last name, or first name..."
                        suppressHydrationWarning
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-base text-gray-900 outline-none placeholder:text-sm focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20 md:text-sm"
                    />
                </div>
                <button
                    type="submit"
                    suppressHydrationWarning
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f] md:flex-none"
                >
                    <Search className="h-4 w-4" />
                    Search
                </button>
                {q && (
                    <Link
                        href={activeType === "all" ? BASE : `${BASE}?type=${activeType}`}
                        className="inline-flex h-11 items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                        <X className="h-4 w-4" />
                        Clear
                    </Link>
                )}
            </form>

            {/* Category tabs */}
            <nav className="flex flex-wrap gap-2">
                {tabs.map((t) => {
                    const active = activeType === t.key;
                    const Icon = t.icon;
                    return (
                        <Link
                            key={t.key}
                            href={tabHref(t.key)}
                            className={`inline-flex h-10 items-center gap-2 rounded-lg border-2 px-3 text-sm font-semibold transition-colors ${active
                                ? "border-[#15664f] bg-[#15664f] text-white shadow-sm"
                                : "border-[#cfe5d9] bg-white text-gray-600 hover:bg-[#eef6f2] hover:text-[#15664f]"
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {t.label}
                            <span
                                className={`rounded-full px-2 py-0.5 text-sm font-semibold ${active ? "bg-white/20 text-white" : t.count > 0 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"
                                    }`}
                            >
                                {t.count}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {q && (
                <p className="break-words text-sm text-gray-600">
                    {total} result{total === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
                </p>
            )}

            {visible.length === 0 ? (
                <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-[#cfe5d9] bg-white p-10 text-center md:p-16">
                    <Archive className="h-12 w-12 text-[#15664f]/30" />
                    <p className="mt-3 text-base font-semibold text-gray-800">
                        {q ? "No archived items match your search" : "The archive is empty"}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                        {q ? "Try a different ID number or name." : "Archived records will appear here."}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {visible.map((sec) => (
                        <ArchiveSection
                            key={sec.key}
                            title={sec.title}
                            icon={sec.icon}
                            empty={sec.empty}
                            showActions={sec.showActions}
                            columns={sec.columns}
                            items={sec.items}
                        />
                    ))}
                </div>
            )}
        </main>
    );
}