import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock, RotateCcw, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageDental, canManageRecords, canManageStaff } from "@/lib/permissions";

import ConfirmButton from "@/components/confirm-button";
import { deleteRecord, restoreRecord } from "../student-health-records/record-actions";
import { deleteStudent, restoreStudent } from "../student-health-records/student-actions";
import { deleteCase, restoreCase } from "../health-case-reports/case-actions";
import { deleteDental, restoreDental } from "../dental-records/actions";
import { deleteSlip, restoreSlip } from "../referral-slips/actions";
import { deleteStaff, restoreStaff } from "../clinic-staff/actions";
import { deleteEmployee, restoreEmployee } from "../employee-health-records/employee-actions";
import {
    deleteEmployeeRecord,
    restoreEmployeeRecord,
} from "../employee-health-records/record-actions";
import {
    canDeleteYet,
    formatDeletableOn,
    retentionText,
    RETENTION_YEARS,
    type RecordKind,
} from "@/lib/retention";

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
    searchParams: Promise<{ q?: string; notice?: string; until?: string }>;
};

function formatDate(date: Date | null) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
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
            className="inline-flex items-center gap-1 py-1 text-xs font-medium text-gray-400 sm:whitespace-nowrap"
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
    "inline-flex items-center gap-1 py-1 font-medium text-[#15664f] hover:underline";
const DELETE_CLASS =
    "inline-flex items-center gap-1 py-1 font-medium text-red-600 hover:underline";

function RestoreForm({
    action,
    name,
    value,
}: {
    action: FormAction;
    name: string;
    value: number;
}) {
    return (
        <form action={action}>
            <input type="hidden" name={name} value={value} />
            <button type="submit" className={RESTORE_CLASS}>
                <RotateCcw className="h-3.5 w-3.5" />
                Restore
            </button>
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
    empty,
    columns,
    items,
    showActions,
}: {
    title: string;
    empty: string;
    columns: Column[];
    items: Item[];
    showActions: boolean;
}) {
    return (
        <section className="min-w-0">
            <h2 className="mb-3 text-base font-semibold text-[#15664f] md:text-lg">
                {title} ({items.length})
            </h2>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {items.length === 0 ? (
                    <p className="p-6 text-center text-sm text-gray-700 md:p-8">{empty}</p>
                ) : (
                    <>
                        {/* MOBILE: card list (walang horizontal scroll) */}
                        <ul className="space-y-2 p-3 md:hidden">
                            {items.map((item) => (
                                <li key={item.key} className="rounded-lg border border-gray-100 p-3">
                                    <p className="break-words text-sm font-semibold text-gray-900">{item.title}</p>
                                    {item.sub && (
                                        <p className="break-words text-xs text-gray-500">{item.sub}</p>
                                    )}
                                    <dl className="mt-2 space-y-1">
                                        {item.fields.map((f) => (
                                            <div key={f.label} className="flex gap-2 text-sm">
                                                <dt className="w-24 shrink-0 text-gray-500">{f.label}</dt>
                                                <dd className="min-w-0 flex-1 break-words text-gray-900">{f.value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                    {item.actions && (
                                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-gray-100 pt-2 text-sm">
                                            {item.actions}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>

                        {/* DESKTOP: table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#EEEEEE] text-[#15664f]">
                                    <tr>
                                        {columns.map((c) => (
                                            <th
                                                key={c.label}
                                                className={`px-4 py-3 font-medium ${c.nowrap ? "whitespace-nowrap" : ""}`}
                                            >
                                                {c.label}
                                            </th>
                                        ))}
                                        {showActions && <th className="px-4 py-3 font-medium">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => (
                                        <tr key={item.key} className="border-t border-gray-100">
                                            {item.cells.map((cell, i) => (
                                                <td key={i} className={`px-4 py-3 ${columns[i]?.td ?? ""}`}>
                                                    {cell}
                                                </td>
                                            ))}
                                            {showActions && (
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <div className="flex items-center gap-3">{item.actions}</div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}

export default async function ArchiveRecordsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const { q = "", notice } = await searchParams;
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
                { label: "Archived On", value: formatDate(s.archived_at) },
            ],
            cells: [
                s.student_number,
                name,
                s.grade_level ?? "—",
                s.program ?? "—",
                formatDate(s.archived_at),
            ],
            actions: canEdit ? (
                <>
                    <RestoreForm action={restoreStudent} name="studentId" value={s.student_id} />
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
                { label: "Archived On", value: formatDate(e.archived_at) },
            ],
            cells: [
                e.employee_number,
                name,
                e.department ?? "—",
                e.position ?? "—",
                formatDate(e.archived_at),
            ],
            actions: canEdit ? (
                <>
                    <RestoreForm action={restoreEmployee} name="employeeId" value={e.employee_id} />
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
                    {c.id_number && <span className="block text-xs text-gray-500">{c.id_number}</span>}
                </>,
                c.complaint,
                formatDate(c.report_date),
                formatDate(c.archived_at),
            ],
            actions: canEdit ? (
                <>
                    <RestoreForm action={restoreCase} name="caseId" value={c.case_id} />
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
                    <RestoreForm action={restoreRecord} name="recordId" value={r.record_id} />
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
                    <RestoreForm action={restoreEmployeeRecord} name="recordId" value={r.record_id} />
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
                    <RestoreForm action={restoreDental} name="dentalId" value={d.dental_id} />
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
                    <RestoreForm action={restoreSlip} name="slipId" value={f.slip_id} />
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

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:space-y-8 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold text-[#15664f] md:text-3xl">Archive Records</h1>
                    <p className="mt-1 text-sm text-gray-700 md:text-base">
                        Archived items are hidden from their main pages.
                    </p>
                </div>
                {!canEdit && (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                        View only
                    </span>
                )}
            </div>

            {notice === "deleted" && (
                <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                    <p className="font-semibold">Record permanently deleted and logged.</p>
                </div>
            )}

            <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#15664f]" />
                <div>
                    <p className="font-semibold text-[#15664f]">
                        Data retention policy: {RETENTION_YEARS} years
                    </p>
                </div>
            </div>

            {/* Search: full width sa mobile */}
            <form method="get" className="flex flex-wrap items-center gap-2 md:gap-3">
                <div className="relative w-full md:max-w-md md:flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        name="q"
                        defaultValue={q}
                        autoComplete="off"
                        placeholder="Search by ID number, last name, or first name..."
                        suppressHydrationWarning
                        className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-base text-gray-900 outline-none placeholder:text-sm focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20 md:text-sm"
                    />
                </div>
                <button
                    type="submit"
                    suppressHydrationWarning
                    className="h-10 flex-1 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white hover:bg-[#10523f] md:flex-none"
                >
                    Search
                </button>
                {q && (
                    <Link
                        href="/dashboard/archive-records"
                        className="inline-flex h-10 items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <X className="h-4 w-4" />
                        Clear
                    </Link>
                )}
            </form>

            {q && (
                <p className="break-words text-sm text-gray-600">
                    {total} result{total === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
                </p>
            )}

            <ArchiveSection
                title="Archived Students"
                empty="No archived students."
                showActions={canEdit}
                columns={[
                    { label: "Student Number", nowrap: true, td: "font-medium text-gray-900" },
                    { label: "Name", td: "text-gray-900" },
                    { label: "Grade/Level", nowrap: true, td: "text-gray-600" },
                    { label: "Program", td: "text-gray-600" },
                    { label: "Archived On", nowrap: true, td: "whitespace-nowrap text-gray-500" },
                ]}
                items={studentItems}
            />

            <ArchiveSection
                title="Archived Employees"
                empty="No archived employees."
                showActions={canEdit}
                columns={[
                    { label: "Employee Number", nowrap: true, td: "font-medium text-gray-900" },
                    { label: "Name", td: "text-gray-900" },
                    { label: "Department", td: "text-gray-600" },
                    { label: "Position", td: "text-gray-600" },
                    { label: "Archived On", nowrap: true, td: "whitespace-nowrap text-gray-500" },
                ]}
                items={employeeItems}
            />

            <ArchiveSection
                title="Archived Case Reports"
                empty="No archived case reports."
                showActions={canEdit}
                columns={[
                    { label: "Case No.", nowrap: true, td: "whitespace-nowrap font-semibold text-gray-900" },
                    { label: "Patient", td: "text-gray-900" },
                    { label: "Complaint", td: "text-gray-900" },
                    { label: "Date", nowrap: true, td: "whitespace-nowrap text-gray-600" },
                    { label: "Archived On", nowrap: true, td: "whitespace-nowrap text-gray-500" },
                ]}
                items={caseItems}
            />

            <ArchiveSection
                title="Archived Visit Records — Students"
                empty="No archived visit records."
                showActions={canEdit}
                columns={[
                    { label: "Student Number", nowrap: true, td: "font-medium text-gray-900" },
                    { label: "Name", td: "text-gray-900" },
                    { label: "Visit Date", nowrap: true, td: "whitespace-nowrap text-gray-900" },
                    { label: "Complaint", td: "text-gray-900" },
                    { label: "Archived On", nowrap: true, td: "whitespace-nowrap text-gray-500" },
                ]}
                items={recordItems}
            />

            <ArchiveSection
                title="Archived Visit Records — Employees"
                empty="No archived employee visit records."
                showActions={canEdit}
                columns={[
                    { label: "Employee Number", nowrap: true, td: "font-medium text-gray-900" },
                    { label: "Name", td: "text-gray-900" },
                    { label: "Visit Date", nowrap: true, td: "whitespace-nowrap text-gray-900" },
                    { label: "Complaint", td: "text-gray-900" },
                    { label: "Archived On", nowrap: true, td: "whitespace-nowrap text-gray-500" },
                ]}
                items={employeeRecordItems}
            />

            <ArchiveSection
                title="Archived Dental Records"
                empty="No archived dental records."
                showActions={canEdit}
                columns={[
                    { label: "ID Number", nowrap: true, td: "font-medium text-gray-900" },
                    { label: "Name", td: "text-gray-900" },
                    { label: "Procedure", td: "text-gray-900" },
                    { label: "Tooth", td: "text-gray-700" },
                    { label: "Visit Date", nowrap: true, td: "whitespace-nowrap text-gray-600" },
                    { label: "Archived On", nowrap: true, td: "whitespace-nowrap text-gray-500" },
                ]}
                items={dentalItems}
            />

            <ArchiveSection
                title="Archived Referral Slips"
                empty="No archived referral slips."
                showActions={canEdit}
                columns={[
                    { label: "Student Number", nowrap: true, td: "font-medium text-gray-900" },
                    { label: "Name", td: "text-gray-900" },
                    { label: "Type", td: "capitalize text-gray-700" },
                    { label: "Teacher", td: "text-gray-700" },
                    { label: "Reason", td: "text-gray-900" },
                    { label: "Slip Date", nowrap: true, td: "whitespace-nowrap text-gray-600" },
                    { label: "Status", td: "capitalize text-gray-700" },
                    { label: "Archived On", nowrap: true, td: "whitespace-nowrap text-gray-500" },
                ]}
                items={slipItems}
            />

            <ArchiveSection
                title="Archived Clinic Staff"
                empty="No archived clinic staff."
                showActions={canEditStaff}
                columns={[
                    { label: "Name", td: "font-medium text-gray-900" },
                    { label: "Role", td: "text-gray-700" },
                    { label: "Email", td: "text-gray-700" },
                    { label: "License / PRC No.", nowrap: true, td: "whitespace-nowrap text-gray-600" },
                    { label: "Archived On", nowrap: true, td: "whitespace-nowrap text-gray-500" },
                ]}
                items={staffItems}
            />
        </main>
    );
}