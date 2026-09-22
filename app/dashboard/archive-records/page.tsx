import Link from "next/link";
import { redirect } from "next/navigation";
import { RotateCcw, Search, Trash2, X } from "lucide-react";
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

type ArchivedRecord = {
    record_id: number;
    student_number: string;
    last_name: string;
    first_name: string;
    visit_date: Date;
    complaint: string;
    archived_at: Date;
};

type ArchivedCase = {
    case_id: number;
    case_number: string;
    student_number: string;
    last_name: string;
    first_name: string;
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
    searchParams: Promise<{ q?: string }>;
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

export default async function ArchiveRecordsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const { q = "" } = await searchParams;
    const like = `%${q}%`;
    const canEdit = canManageRecords(session.role) || canManageDental(session.role);
    const canEditStaff = canManageStaff(session.role);

    const [students, records, cases, dental, slips, staff] = await Promise.all([
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
        prisma.$queryRaw<ArchivedCase[]>`
      SELECT c.case_id, c.case_number, s.student_number, s.last_name, s.first_name,
             c.complaint, c.report_date, c.status, c.archived_at
      FROM health_case_reports c
      JOIN students s ON s.student_id = c.student_id
      WHERE c.archived_at IS NOT NULL
        AND (${q}::text = '' OR s.student_number ILIKE ${like}
             OR s.last_name ILIKE ${like} OR s.first_name ILIKE ${like}
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
        students.length + records.length + cases.length + dental.length + slips.length + staff.length;

    return (
        <main className="space-y-8 p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900">Archive Records</h1>
                    <p className="mt-1 text-gray-600">Archived items are hidden from their main pages.</p>
                </div>
                {!canEdit && (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                        View only
                    </span>
                )}
            </div>

            <form method="get" className="flex flex-wrap items-center gap-3">
                <div className="relative max-w-md flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        name="q"
                        defaultValue={q}
                        placeholder="Search by student number, last name, or first name..."
                        suppressHydrationWarning
                        className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                    />
                </div>
                <button
                    type="submit"
                    suppressHydrationWarning
                    className="h-10 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white hover:bg-[#10523f]"
                >
                    Search
                </button>
                {q && (
                    <Link
                        href="/dashboard/archive-records"
                        className="inline-flex h-10 items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <X className="h-4 w-4" />
                        Clear
                    </Link>
                )}
            </form>

            {q && (
                <p className="text-sm text-gray-600">
                    {total} result{total === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
                </p>
            )}

            <section>
                <h2 className="mb-3 text-lg font-semibold text-gray-900">
                    Archived Students ({students.length})
                </h2>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    {students.length === 0 ? (
                        <p className="p-8 text-center text-sm text-gray-500">No archived students.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Student Number</th>
                                        <th className="px-4 py-3 font-medium">Name</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Grade/Level</th>
                                        <th className="px-4 py-3 font-medium">Program</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Archived On</th>
                                        {canEdit && <th className="px-4 py-3 font-medium">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((s) => (
                                        <tr key={s.student_id} className="border-t border-gray-100">
                                            <td className="px-4 py-3 font-medium text-gray-900">{s.student_number}</td>
                                            <td className="px-4 py-3 text-gray-900">
                                                {s.last_name}, {s.first_name}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{s.grade_level ?? "—"}</td>
                                            <td className="px-4 py-3 text-gray-600">{s.program ?? "—"}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                                                {formatDate(s.archived_at)}
                                            </td>
                                            {canEdit && (
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <form action={restoreStudent}>
                                                            <input type="hidden" name="studentId" value={s.student_id} />
                                                            <button
                                                                type="submit"
                                                                className="inline-flex items-center gap-1 font-medium text-[#15664f] hover:underline"
                                                            >
                                                                <RotateCcw className="h-3.5 w-3.5" />
                                                                Restore
                                                            </button>
                                                        </form>
                                                        <form action={deleteStudent}>
                                                            <input type="hidden" name="studentId" value={s.student_id} />
                                                            <ConfirmButton
                                                                title="Delete student"
                                                                confirmLabel="Delete permanently"
                                                                danger
                                                                message={`Permanently delete ${s.last_name}, ${s.first_name} (${s.student_number
                                                                    })? This also deletes ${Number(
                                                                        s.visit_count
                                                                    )} health record(s) and their student portal account. This cannot be undone.`}
                                                                className="inline-flex items-center gap-1 font-medium text-red-600 hover:underline"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                Delete
                                                            </ConfirmButton>
                                                        </form>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            <section>
                <h2 className="mb-3 text-lg font-semibold text-gray-900">
                    Archived Case Reports ({cases.length})
                </h2>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    {cases.length === 0 ? (
                        <p className="p-8 text-center text-sm text-gray-500">No archived case reports.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Case No.</th>
                                        <th className="px-4 py-3 font-medium">Student</th>
                                        <th className="px-4 py-3 font-medium">Complaint</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Date</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Archived On</th>
                                        {canEdit && <th className="px-4 py-3 font-medium">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {cases.map((c) => (
                                        <tr key={c.case_id} className="border-t border-gray-100">
                                            <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
                                                {c.case_number}
                                            </td>
                                            <td className="px-4 py-3 text-gray-900">
                                                {c.last_name}, {c.first_name}
                                            </td>
                                            <td className="px-4 py-3 text-gray-900">{c.complaint}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                {formatDate(c.report_date)}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                                                {formatDate(c.archived_at)}
                                            </td>
                                            {canEdit && (
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <form action={restoreCase}>
                                                            <input type="hidden" name="caseId" value={c.case_id} />
                                                            <button
                                                                type="submit"
                                                                className="inline-flex items-center gap-1 font-medium text-[#15664f] hover:underline"
                                                            >
                                                                <RotateCcw className="h-3.5 w-3.5" />
                                                                Restore
                                                            </button>
                                                        </form>
                                                        <form action={deleteCase}>
                                                            <input type="hidden" name="caseId" value={c.case_id} />
                                                            <ConfirmButton
                                                                title="Delete case report"
                                                                confirmLabel="Delete permanently"
                                                                danger
                                                                message={`Permanently delete case ${c.case_number} (${c.complaint})? This cannot be undone.`}
                                                                className="inline-flex items-center gap-1 font-medium text-red-600 hover:underline"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                Delete
                                                            </ConfirmButton>
                                                        </form>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            <section>
                <h2 className="mb-3 text-lg font-semibold text-gray-900">
                    Archived Visit Records ({records.length})
                </h2>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    {records.length === 0 ? (
                        <p className="p-8 text-center text-sm text-gray-500">No archived visit records.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Student Number</th>
                                        <th className="px-4 py-3 font-medium">Name</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Visit Date</th>
                                        <th className="px-4 py-3 font-medium">Complaint</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Archived On</th>
                                        {canEdit && <th className="px-4 py-3 font-medium">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map((r) => (
                                        <tr key={r.record_id} className="border-t border-gray-100">
                                            <td className="px-4 py-3 font-medium text-gray-900">{r.student_number}</td>
                                            <td className="px-4 py-3 text-gray-900">
                                                {r.last_name}, {r.first_name}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-900">
                                                {formatDate(r.visit_date)}
                                            </td>
                                            <td className="px-4 py-3 text-gray-900">{r.complaint}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                                                {formatDate(r.archived_at)}
                                            </td>
                                            {canEdit && (
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <form action={restoreRecord}>
                                                            <input type="hidden" name="recordId" value={r.record_id} />
                                                            <button
                                                                type="submit"
                                                                className="inline-flex items-center gap-1 font-medium text-[#15664f] hover:underline"
                                                            >
                                                                <RotateCcw className="h-3.5 w-3.5" />
                                                                Restore
                                                            </button>
                                                        </form>
                                                        <form action={deleteRecord}>
                                                            <input type="hidden" name="recordId" value={r.record_id} />
                                                            <ConfirmButton
                                                                title="Delete visit record"
                                                                confirmLabel="Delete permanently"
                                                                danger
                                                                message={`Permanently delete this visit? ${r.last_name}, ${r.first_name
                                                                    } · ${formatDate(r.visit_date)} · ${r.complaint}. This cannot be undone.`}
                                                                className="inline-flex items-center gap-1 font-medium text-red-600 hover:underline"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                Delete
                                                            </ConfirmButton>
                                                        </form>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            <section>
                <h2 className="mb-3 text-lg font-semibold text-gray-900">
                    Archived Dental Records ({dental.length})
                </h2>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    {dental.length === 0 ? (
                        <p className="p-8 text-center text-sm text-gray-500">No archived dental records.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Student Number</th>
                                        <th className="px-4 py-3 font-medium">Name</th>
                                        <th className="px-4 py-3 font-medium">Procedure</th>
                                        <th className="px-4 py-3 font-medium">Tooth</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Visit Date</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Archived On</th>
                                        {canEdit && <th className="px-4 py-3 font-medium">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {dental.map((d) => (
                                        <tr key={d.dental_id} className="border-t border-gray-100">
                                            <td className="px-4 py-3 font-medium text-gray-900">{d.student_number}</td>
                                            <td className="px-4 py-3 text-gray-900">
                                                {d.last_name}, {d.first_name}
                                            </td>
                                            <td className="px-4 py-3 text-gray-900">{d.procedure_name}</td>
                                            <td className="px-4 py-3 text-gray-700">{d.tooth ?? "—"}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                {formatDate(d.visit_date)}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                                                {formatDate(d.archived_at)}
                                            </td>
                                            {canEdit && (
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <form action={restoreDental}>
                                                            <input type="hidden" name="dentalId" value={d.dental_id} />
                                                            <button
                                                                type="submit"
                                                                className="inline-flex items-center gap-1 font-medium text-[#15664f] hover:underline"
                                                            >
                                                                <RotateCcw className="h-3.5 w-3.5" />
                                                                Restore
                                                            </button>
                                                        </form>
                                                        <form action={deleteDental}>
                                                            <input type="hidden" name="dentalId" value={d.dental_id} />
                                                            <ConfirmButton
                                                                title="Delete dental record"
                                                                confirmLabel="Delete permanently"
                                                                danger
                                                                message={`Permanently delete this dental record (${d.procedure_name})? This cannot be undone.`}
                                                                className="inline-flex items-center gap-1 font-medium text-red-600 hover:underline"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                Delete
                                                            </ConfirmButton>
                                                        </form>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            <section>
                <h2 className="mb-3 text-lg font-semibold text-gray-900">
                    Archived Referral Slips ({slips.length})
                </h2>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    {slips.length === 0 ? (
                        <p className="p-8 text-center text-sm text-gray-500">No archived referral slips.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Student Number</th>
                                        <th className="px-4 py-3 font-medium">Name</th>
                                        <th className="px-4 py-3 font-medium">Type</th>
                                        <th className="px-4 py-3 font-medium">Teacher</th>
                                        <th className="px-4 py-3 font-medium">Reason</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Slip Date</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Archived On</th>
                                        {canEdit && <th className="px-4 py-3 font-medium">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {slips.map((f) => (
                                        <tr key={f.slip_id} className="border-t border-gray-100">
                                            <td className="px-4 py-3 font-medium text-gray-900">{f.student_number}</td>
                                            <td className="px-4 py-3 text-gray-900">
                                                {f.last_name}, {f.first_name}
                                            </td>
                                            <td className="px-4 py-3 capitalize text-gray-700">{f.slip_type}</td>
                                            <td className="px-4 py-3 text-gray-700">{f.teacher_name ?? "—"}</td>
                                            <td className="px-4 py-3 text-gray-900">{f.reason}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                {formatDate(f.slip_date)}
                                            </td>
                                            <td className="px-4 py-3 capitalize text-gray-700">{f.status}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                                                {formatDate(f.archived_at)}
                                            </td>
                                            {canEdit && (
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <form action={restoreSlip}>
                                                            <input type="hidden" name="slipId" value={f.slip_id} />
                                                            <button
                                                                type="submit"
                                                                className="inline-flex items-center gap-1 font-medium text-[#15664f] hover:underline"
                                                            >
                                                                <RotateCcw className="h-3.5 w-3.5" />
                                                                Restore
                                                            </button>
                                                        </form>
                                                        <form action={deleteSlip}>
                                                            <input type="hidden" name="slipId" value={f.slip_id} />
                                                            <ConfirmButton
                                                                title="Delete referral slip"
                                                                confirmLabel="Delete permanently"
                                                                danger
                                                                message={`Permanently delete this referral slip for ${f.last_name}, ${f.first_name} (${f.reason})? This cannot be undone.`}
                                                                className="inline-flex items-center gap-1 font-medium text-red-600 hover:underline"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                Delete
                                                            </ConfirmButton>
                                                        </form>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            <section>
                <h2 className="mb-3 text-lg font-semibold text-gray-900">
                    Archived Clinic Staff ({staff.length})
                </h2>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    {staff.length === 0 ? (
                        <p className="p-8 text-center text-sm text-gray-500">No archived clinic staff.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Name</th>
                                        <th className="px-4 py-3 font-medium">Role</th>
                                        <th className="px-4 py-3 font-medium">Email</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">License / PRC No.</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Archived On</th>
                                        {canEditStaff && <th className="px-4 py-3 font-medium">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {staff.map((st) => (
                                        <tr key={st.staff_id} className="border-t border-gray-100">
                                            <td className="px-4 py-3 font-medium text-gray-900">{st.full_name}</td>
                                            <td className="px-4 py-3 text-gray-700">{st.position}</td>
                                            <td className="px-4 py-3 text-gray-700">{st.email ?? "—"}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                {st.license_no ?? "—"}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                                                {formatDate(st.archived_at)}
                                            </td>
                                            {canEditStaff && (
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <form action={restoreStaff}>
                                                            <input type="hidden" name="staffId" value={st.staff_id} />
                                                            <ConfirmButton
                                                                title="Restore staff record"
                                                                confirmLabel="Restore"
                                                                message={`Restore ${st.full_name} to the Clinic Staff list?`}
                                                                className="inline-flex items-center gap-1 font-medium text-[#15664f] hover:underline"
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
                                                                className="inline-flex items-center gap-1 font-medium text-red-600 hover:underline"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                Delete
                                                            </ConfirmButton>
                                                        </form>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}