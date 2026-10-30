import { redirect } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords, canManageStudents, canManageDental } from "@/lib/permissions";
import ConfirmLink from "@/components/shared/confirm-link";
import AutoSubmitSelect from "@/components/shared/auto-submit-select";
import ListPagination from "@/components/shared/list-pagination";
import { logAccess } from "@/lib/access-log";
import { getStudentFilterOptions, listStudents, STUDENTS_PAGE_SIZE } from "@/features/students/service";
import type { StudentFilters, StudentListRow } from "@/features/students/types";
import StudentRecordView, {
    type ArchivedItem,
    type CaseRow,
    type DentalRow,
    type RecordRow,
    type RecordTab,
    type StudentExtras,
} from "./student-record-view";
import SearchInput from "@/components/shared/search-input";
import RedirectNotice from "@/components/shared/redirect-notice";
import RowActionMenu, { type RowAction } from "@/components/shared/row-action-menu";
import {
    ActiveBadge,
    PersonAvatar,
    addButtonClass,
    formatGender,
    listCardClass,
    listSearchClass,
    listSelectClass,
} from "@/components/shared/list-ui";

type StudentRow = {
    student_id: number;
    student_number: string;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    grade_level: string | null;
    program: string | null;
    date_of_birth: Date | null;
    gender: string | null;
    contact_number: string | null;
    email: string | null;
};

type Props = {
    searchParams: Promise<{
        q?: string;
        grade?: string;
        program?: string;
        student?: string;
        view?: string;
        record?: string;
        page?: string;
        tab?: string;
    }>;
};

const BASE = "/dashboard/student-health-records";



export default async function StudentHealthRecordsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const canEdit = canManageRecords(session.role);
    const canAddStudent = canManageStudents(session.role);

    const params = await searchParams;
    const filters: StudentFilters = {
        q: (params.q ?? "").trim(),
        grade: (params.grade ?? "").trim(),
        program: (params.program ?? "").trim(),
    };
    const selectedNumber = (params.student ?? "").trim();
    // ?view=history (from the dashboard View button) shows only the Visit History table.
    const historyOnly = (params.view ?? "") === "history";
    // ?record=123 (galing sa dashboard): iyon lang na record ang ipapakita
    const recordId = Number(params.record) || 0;
    const tab: RecordTab =
        params.tab === "cases" || params.tab === "dental" || params.tab === "archive" ? params.tab : "history";
    const requestedPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

    // Link pabalik sa listahan na may parehong search/filters/page.
    const listHref = (p: number) => {
        const sp = new URLSearchParams();
        if (filters.q) sp.set("q", filters.q);
        if (filters.grade) sp.set("grade", filters.grade);
        if (filters.program) sp.set("program", filters.program);
        if (p > 1) sp.set("page", String(p));
        const qs = sp.toString();
        return qs ? `${BASE}?${qs}` : BASE;
    };

    // ------------------------------------------------------------ one student
    if (selectedNumber) {
        const rows = await prisma.$queryRaw<StudentRow[]>`
      SELECT student_id, student_number, last_name, first_name, middle_name,
             grade_level, program, date_of_birth, gender, contact_number, email
      FROM students
      WHERE student_number = ${selectedNumber} AND archived_at IS NULL
      LIMIT 1
    `;
        const selected = rows[0];

        if (!selected) {
            return (
                <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
                    <RedirectNotice
                        message={`No active student found with number ${selectedNumber}. It may have been archived.`}
                        href={listHref(requestedPage)}
                    />
                </main>
            );
        }

        const [records, cases, extrasRows, archivedVisits, archivedCases, dental, archivedDental] = await Promise.all([
            prisma.$queryRaw<RecordRow[]>`
        SELECT record_id, visit_date, complaint, action_taken, attending_staff,
               height_cm, weight_kg, heart_rate, blood_pressure, temperature
        FROM health_records
        WHERE student_id = ${selected.student_id} AND archived_at IS NULL
        ORDER BY visit_date DESC, record_id DESC
      `,
            prisma.$queryRaw<CaseRow[]>`
        SELECT case_id, case_number, complaint, report_date, staff_name, status, notes
        FROM health_case_reports
        WHERE student_id = ${selected.student_id} AND archived_at IS NULL
        ORDER BY report_date DESC, case_id DESC
      `,
            prisma.$queryRaw<StudentExtras[]>`
        SELECT s.avatar, f.address, f.past_history
        FROM students s
        LEFT JOIN student_health_forms f ON f.student_id = s.student_id
        WHERE s.student_id = ${selected.student_id}
        LIMIT 1
      `,
            prisma.$queryRaw<{ record_id: number; visit_date: Date; complaint: string; archived_at: Date }[]>`
        SELECT record_id, visit_date, complaint, archived_at
        FROM health_records
        WHERE student_id = ${selected.student_id} AND archived_at IS NOT NULL
      `,
            prisma.$queryRaw<{ case_id: number; case_number: string; report_date: Date; complaint: string; archived_at: Date }[]>`
        SELECT case_id, case_number, report_date, complaint, archived_at
        FROM health_case_reports
        WHERE student_id = ${selected.student_id} AND archived_at IS NOT NULL
      `,
            // Dental Records tab
            prisma.$queryRaw<DentalRow[]>`
        SELECT dental_id, visit_date, procedure_name, tooth, dentist_name, status
        FROM dental_records
        WHERE student_id = ${selected.student_id} AND archived_at IS NULL
        ORDER BY visit_date DESC, dental_id DESC
      `,
            // Mga na-archive na dental record (para sa Archive Logs tab)
            prisma.$queryRaw<{ dental_id: number; visit_date: Date; procedure_name: string; archived_at: Date }[]>`
        SELECT dental_id, visit_date, procedure_name, archived_at
        FROM dental_records
        WHERE student_id = ${selected.student_id} AND archived_at IS NOT NULL
      `,
        ]);

        // --- Audit log (RA 10173) ---
        // Naitatala kung sino ang nagbukas ng partikular na health record.
        await logAccess(
            { userId: Number(session.userId), role: session.role, name: String(session.username ?? "") },
            "student_health_record",
            selected.student_id,
            "view",
            `${selected.last_name}, ${selected.first_name} (${selected.student_number})`,
        );

        const archived: ArchivedItem[] = [
            ...archivedVisits.map((r) => ({
                key: `visit-${r.record_id}`,
                kind: "visit" as const,
                date: r.visit_date,
                complaint: r.complaint,
                archived_at: r.archived_at,
                caseNumber: null,
            })),
            ...archivedCases.map((c) => ({
                key: `case-${c.case_id}`,
                kind: "case" as const,
                date: c.report_date,
                complaint: c.complaint,
                archived_at: c.archived_at,
                caseNumber: c.case_number,
            })),
            ...archivedDental.map((d) => ({
                key: `dental-${d.dental_id}`,
                kind: "dental" as const,
                date: d.visit_date,
                complaint: d.procedure_name,
                archived_at: d.archived_at,
                caseNumber: null,
            })),
        ].sort((a, b) => new Date(b.archived_at).getTime() - new Date(a.archived_at).getTime());

        return (
            <StudentRecordView
                student={selected}
                extras={extrasRows[0] ?? { avatar: null, address: null, past_history: null }}
                records={records}
                cases={cases}
                archived={archived}
                dental={dental}
                canEditDental={canManageDental(session.role)}
                tab={tab}
                historyOnly={historyOnly}
                recordId={recordId}
                backHref={historyOnly ? "/dashboard" : listHref(requestedPage)}
                canEdit={canEdit}
                canEditStudent={canAddStudent}
                hidePersonal={session.role === "admin"}
            />
        );
    }

    // ------------------------------------------------------------ list
    const [{ students, total, totalPages }, options] = await Promise.all([
        listStudents(filters, requestedPage),
        getStudentFilterOptions(),
    ]);
    if (requestedPage > totalPages) redirect(listHref(totalPages));

    const viewHref = (s: StudentListRow) => {
        const back = new URL(listHref(requestedPage), "http://x").searchParams;
        back.set("student", s.student_number);
        return `${BASE}?${back.toString()}`;
    };
    const fullName = (s: StudentListRow) =>
        `${s.first_name}${s.middle_name ? ` ${s.middle_name}` : ""} ${s.last_name}`;
    const viewMessage = (s: StudentListRow) =>
        `Open the health record of ${s.first_name} ${s.last_name} (${s.student_number})? This contains confidential medical information and your access will be recorded.`;

    // Mga pagpipilian sa "⋮" menu ng bawat row
    const actions = (s: StudentListRow): RowAction[] => [
        { label: "View Health Record", href: viewHref(s), title: "View health record", message: viewMessage(s), confirmLabel: "View", icon: "view" },
        ...(canEdit
            ? [
                {
                    label: "Add Visit Record",
                    href: `${BASE}/new?student=${encodeURIComponent(s.student_number)}`,
                    title: "Add visit record",
                    message: `Add a new clinic visit record for ${s.first_name} ${s.last_name} (${s.student_number})?`,
                    confirmLabel: "Continue",
                    icon: "edit" as const,
                },
            ]
            : []),
    ];

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Student Health Records</h1>
                    <p className="mt-1 text-sm text-gray-600">Select a student to view their visits, case reports, and health information.</p>
                </div>
                {canEdit ? (
                    <ConfirmLink
                        href={`${BASE}/new`}
                        title="Add visit record"
                        message="Add a new clinic visit record?"
                        confirmLabel="Continue"
                        icon={<Plus className="h-5 w-5" />}
                        className={addButtonClass}
                    >
                        <Plus className="h-4 w-4" />
                        Add Record
                    </ConfirmLink>
                ) : (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-600">View only</span>
                )}
            </div>

            <section className={listCardClass}>
                {/* Filters sa kaliwa, search sa kanan */}
                <form
                    method="get"
                    action={BASE}
                    className="grid gap-3 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-[12rem_12rem_minmax(0,1fr)]"
                >
                    <AutoSubmitSelect
                        name="grade"
                        defaultValue={filters.grade}
                        options={options.grades}
                        allLabel="All Grade Levels"
                        className={listSelectClass}
                    />
                    <AutoSubmitSelect
                        name="program"
                        defaultValue={filters.program}
                        options={options.programs}
                        allLabel="All Programs"
                        className={listSelectClass}
                    />
                    <div className="relative sm:col-span-2 lg:col-span-1 lg:ml-auto lg:w-full lg:max-w-sm">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
                        <SearchInput
                            name="q"
                            defaultValue={filters.q}
                            autoComplete="off"
                            placeholder="Search by name or student no..."
                            suppressHydrationWarning
                            className={listSearchClass}
                        />
                    </div>
                </form>

                {students.length === 0 ? (
                    <p className="border-t border-gray-100 p-8 text-center text-sm text-gray-600">No students found.</p>
                ) : (
                    <>
                        {/* MOBILE: card list */}
                        <ul className="space-y-2 border-t border-gray-100 p-3 md:hidden">
                            {students.map((s) => (
                                <li key={s.student_id} className="flex items-start gap-3 rounded-xl border border-[#e4ede8] p-3">
                                    <PersonAvatar src={s.avatar} first={s.first_name} last={s.last_name} />
                                    <div className="min-w-0 flex-1">
                                        <p className="break-words text-sm font-semibold text-gray-900">{fullName(s)}</p>
                                        <p className="text-sm text-gray-600">{s.student_number}</p>
                                        <p className="mt-1 text-sm text-gray-600">
                                            {[s.grade_level, s.program, s.gender ? formatGender(s.gender) : null]
                                                .filter(Boolean)
                                                .join(" · ") || "—"}
                                        </p>
                                        <div className="mt-2">
                                            <ActiveBadge />
                                        </div>
                                    </div>
                                    <RowActionMenu actions={actions(s)} />
                                </li>
                            ))}
                        </ul>

                        {/* DESKTOP: table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="border-y border-[#e4ede8] bg-[#f6faf8] text-gray-600">
                                    <tr>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">Student Number</th>
                                        <th className="px-5 py-3 font-semibold">Name</th>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">Grade Level</th>
                                        <th className="px-5 py-3 font-semibold">Program</th>
                                        <th className="px-5 py-3 font-semibold">Gender</th>
                                        <th className="px-5 py-3 font-semibold">Status</th>
                                        <th className="px-5 py-3 text-center font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((s) => (
                                        <tr key={s.student_id} className="border-t border-gray-100 hover:bg-[#f6faf8]">
                                            <td className="whitespace-nowrap px-5 py-3 text-gray-600">{s.student_number}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <PersonAvatar src={s.avatar} first={s.first_name} last={s.last_name} />
                                                    <span className="font-medium text-gray-900">{fullName(s)}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-gray-600">{s.grade_level ?? "—"}</td>
                                            <td className="px-5 py-3 text-gray-600">{s.program ?? "—"}</td>
                                            <td className="px-5 py-3 text-gray-600">{formatGender(s.gender)}</td>
                                            <td className="px-5 py-3">
                                                <ActiveBadge />
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <RowActionMenu actions={actions(s)} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                <ListPagination
                    page={requestedPage}
                    totalPages={totalPages}
                    total={total}
                    pageSize={STUDENTS_PAGE_SIZE}
                    hrefFor={listHref}
                />
            </section>
        </main>
    );
}