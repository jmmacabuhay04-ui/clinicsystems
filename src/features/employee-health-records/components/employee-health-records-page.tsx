import { redirect } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords, canManageStudents, canManageDental } from "@/lib/permissions";
import ConfirmLink from "@/components/shared/confirm-link";
import AutoSubmitSelect from "@/components/shared/auto-submit-select";
import ListPagination from "@/components/shared/list-pagination";
import { logAccess } from "@/lib/access-log";
import EmployeeRecordView, {
    type ArchivedItem,
    type CaseRow,
    type DentalRow,
    type EmployeeExtras,
    type RecordRow,
    type RecordTab,
} from "./employee-record-view";
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

const BASE = "/dashboard/employee-health-records";
const PAGE_SIZE = 10;

type EmployeeRow = {
    employee_id: number;
    employee_number: string;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    department: string | null;
    position: string | null;
    date_of_birth: Date | null;
    gender: string | null;
    contact_number: string | null;
    email: string | null;
    avatar?: string | null;
};

type Props = {
    searchParams: Promise<{
        q?: string;
        department?: string;
        position?: string;
        employee?: string;
        page?: string;
        view?: string;
        record?: string;
        tab?: string;
    }>;
};

export default async function EmployeeHealthRecordsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const params = await searchParams;
    const q = (params.q ?? "").trim();
    const department = (params.department ?? "").trim();
    const position = (params.position ?? "").trim();
    const employeeNumber = (params.employee ?? "").trim();
    const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
    // ?view=history (from the dashboard View button) shows only the Visit History table.
    const historyOnly = (params.view ?? "") === "history";
    // ?record=123 (galing sa dashboard): iyon lang na record ang ipapakita
    const recordId = Number(params.record) || 0;
    const tab: RecordTab =
        params.tab === "cases" || params.tab === "dental" || params.tab === "archive" ? params.tab : "history";

    const canEditRecords = canManageRecords(session.role);
    const canEditEmployees = canManageStudents(session.role);
    const like = `%${q}%`;

    // Link pabalik sa listahan na may parehong search/filters/page.
    const listHref = (p: number) => {
        const sp = new URLSearchParams();
        if (q) sp.set("q", q);
        if (department) sp.set("department", department);
        if (position) sp.set("position", position);
        if (p > 1) sp.set("page", String(p));
        const qs = sp.toString();
        return qs ? `${BASE}?${qs}` : BASE;
    };

    // ------------------------------------------------------------ one employee
    if (employeeNumber) {
        const rows = await prisma.$queryRaw<EmployeeRow[]>`
      SELECT employee_id, employee_number, last_name, first_name, middle_name,
             department, position, date_of_birth, gender, contact_number, email
      FROM employees
      WHERE employee_number = ${employeeNumber} AND archived_at IS NULL
      LIMIT 1
    `;
        const selected = rows[0];

        if (!selected) {
            return (
                <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
                    <RedirectNotice
                        message={`No active employee found with number ${employeeNumber}. It may have been archived.`}
                        href={listHref(page)}
                    />
                </main>
            );
        }

        const [records, cases, extrasRows, archivedVisits, archivedCases, dental, archivedDental] = await Promise.all([
            prisma.$queryRaw<RecordRow[]>`
        SELECT record_id, visit_date, complaint, action_taken, attending_staff,
               height_cm, weight_kg, heart_rate, blood_pressure, temperature
        FROM employee_health_records
        WHERE employee_id = ${selected.employee_id} AND archived_at IS NULL
        ORDER BY visit_date DESC, record_id DESC
      `,
            prisma.$queryRaw<CaseRow[]>`
        SELECT case_id, case_number, complaint, report_date, staff_name, status, notes
        FROM health_case_reports
        WHERE employee_id = ${selected.employee_id} AND archived_at IS NULL
        ORDER BY report_date DESC, case_id DESC
      `,
            prisma.$queryRaw<EmployeeExtras[]>`
        SELECT e.avatar, f.address, f.past_history
        FROM employees e
        LEFT JOIN employee_health_forms f ON f.employee_id = e.employee_id
        WHERE e.employee_id = ${selected.employee_id}
        LIMIT 1
      `,
            prisma.$queryRaw<{ record_id: number; visit_date: Date; complaint: string; archived_at: Date }[]>`
        SELECT record_id, visit_date, complaint, archived_at
        FROM employee_health_records
        WHERE employee_id = ${selected.employee_id} AND archived_at IS NOT NULL
      `,
            prisma.$queryRaw<{ case_id: number; case_number: string; report_date: Date; complaint: string; archived_at: Date }[]>`
        SELECT case_id, case_number, report_date, complaint, archived_at
        FROM health_case_reports
        WHERE employee_id = ${selected.employee_id} AND archived_at IS NOT NULL
      `,
            // Dental Records tab
            prisma.$queryRaw<DentalRow[]>`
        SELECT dental_id, visit_date, procedure_name, tooth, dentist_name, status
        FROM dental_records
        WHERE employee_id = ${selected.employee_id} AND archived_at IS NULL
        ORDER BY visit_date DESC, dental_id DESC
      `,
            // Mga na-archive na dental record (para sa Archive Logs tab)
            prisma.$queryRaw<{ dental_id: number; visit_date: Date; procedure_name: string; archived_at: Date }[]>`
        SELECT dental_id, visit_date, procedure_name, archived_at
        FROM dental_records
        WHERE employee_id = ${selected.employee_id} AND archived_at IS NOT NULL
      `,
        ]);

        // --- Audit log (RA 10173) ---
        await logAccess(
            { userId: Number(session.userId), role: session.role, name: String(session.username ?? "") },
            "employee_health_record",
            selected.employee_id,
            "view",
            `${selected.last_name}, ${selected.first_name} (${selected.employee_number})`,
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
            <EmployeeRecordView
                employee={selected}
                extras={extrasRows[0] ?? { avatar: null, address: null, past_history: null }}
                records={records}
                cases={cases}
                archived={archived}
                dental={dental}
                canEditDental={canManageDental(session.role)}
                tab={tab}
                historyOnly={historyOnly}
                recordId={recordId}
                backHref={historyOnly ? "/dashboard" : listHref(page)}
                canEdit={canEditRecords}
                canEditEmployee={canEditEmployees}
                hidePersonal={session.role === "admin"}
            />
        );
    }

    // ------------------------------------------------------------ list
    // Hindi case-sensitive ang Department/Position filter: "GUARD" = "Guard".
    const [employees, count, departments, positions] = await Promise.all([
        prisma.$queryRaw<EmployeeRow[]>`
      SELECT employee_id, employee_number, last_name, first_name, middle_name,
             department, position, date_of_birth, gender, contact_number, email, avatar
      FROM employees
      WHERE archived_at IS NULL
        AND (${department}::text = '' OR LOWER(TRIM(department)) = LOWER(${department}))
        AND (${position}::text = '' OR LOWER(TRIM(position)) = LOWER(${position}))
        AND (
          ${q}::text = ''
          OR employee_number ILIKE ${like}
          OR last_name ILIKE ${like}
          OR first_name ILIKE ${like}
        )
      ORDER BY employee_number ASC
      LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}
    `,
        prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM employees
      WHERE archived_at IS NULL
        AND (${department}::text = '' OR LOWER(TRIM(department)) = LOWER(${department}))
        AND (${position}::text = '' OR LOWER(TRIM(position)) = LOWER(${position}))
        AND (
          ${q}::text = ''
          OR employee_number ILIKE ${like}
          OR last_name ILIKE ${like}
          OR first_name ILIKE ${like}
        )
    `,
        prisma.$queryRaw<{ value: string }[]>`
      SELECT MIN(TRIM(department)) AS value FROM employees
      WHERE archived_at IS NULL AND department IS NOT NULL AND TRIM(department) <> ''
      GROUP BY LOWER(TRIM(department))
      ORDER BY value
    `,
        prisma.$queryRaw<{ value: string }[]>`
      SELECT MIN(TRIM(position)) AS value FROM employees
      WHERE archived_at IS NULL AND position IS NOT NULL AND TRIM(position) <> ''
      GROUP BY LOWER(TRIM(position))
      ORDER BY value
    `,
    ]);

    const total = count[0]?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > totalPages) redirect(listHref(totalPages));

    const viewHref = (e: EmployeeRow) => {
        const back = new URL(listHref(page), "http://x").searchParams;
        back.set("employee", e.employee_number);
        return `${BASE}?${back.toString()}`;
    };
    const fullName = (e: EmployeeRow) =>
        `${e.first_name}${e.middle_name ? ` ${e.middle_name}` : ""} ${e.last_name}`;
    const viewMessage = (e: EmployeeRow) =>
        `Open the health record of ${e.first_name} ${e.last_name} (${e.employee_number})? This contains confidential medical information and your access will be recorded.`;

    // Mga pagpipilian sa "⋮" menu ng bawat row
    const actions = (e: EmployeeRow): RowAction[] => [
        { label: "View Health Record", href: viewHref(e), title: "View health record", message: viewMessage(e), confirmLabel: "View", icon: "view" },
        ...(canEditRecords
            ? [
                {
                    label: "Add Visit Record",
                    href: `${BASE}/new?employee=${encodeURIComponent(e.employee_number)}`,
                    title: "Add visit record",
                    message: `Add a new clinic visit record for ${e.first_name} ${e.last_name} (${e.employee_number})?`,
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
                    <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Employee Health Records</h1>
                    <p className="mt-1 text-sm text-gray-600">Select an employee to view their visits, case reports, and health information.</p>
                </div>
                {canEditRecords ? (
                    <ConfirmLink
                        href={`${BASE}/new`}
                        icon={<Plus className="h-5 w-5" />}
                        title="Add a new visit record?"
                        message="You will be taken to the form to add a new employee health record."
                        confirmLabel="Continue"
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
                        name="department"
                        defaultValue={department}
                        options={departments.map((r) => r.value)}
                        allLabel="All Departments"
                        className={listSelectClass}
                    />
                    <AutoSubmitSelect
                        name="position"
                        defaultValue={position}
                        options={positions.map((r) => r.value)}
                        allLabel="All Positions"
                        className={listSelectClass}
                    />
                    <div className="relative sm:col-span-2 lg:col-span-1 lg:ml-auto lg:w-full lg:max-w-sm">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
                        <SearchInput
                            name="q"
                            defaultValue={q}
                            autoComplete="off"
                            placeholder="Search by name or employee no..."
                            suppressHydrationWarning
                            className={listSearchClass}
                        />
                    </div>
                </form>

                {employees.length === 0 ? (
                    <p className="border-t border-gray-100 p-8 text-center text-sm text-gray-600">No employees found.</p>
                ) : (
                    <>
                        {/* MOBILE: card list */}
                        <ul className="space-y-2 border-t border-gray-100 p-3 md:hidden">
                            {employees.map((e) => (
                                <li key={e.employee_id} className="flex items-start gap-3 rounded-xl border border-[#e4ede8] p-3">
                                    <PersonAvatar src={e.avatar} first={e.first_name} last={e.last_name} type="employee" />
                                    <div className="min-w-0 flex-1">
                                        <p className="break-words text-sm font-semibold text-gray-900">{fullName(e)}</p>
                                        <p className="text-sm text-gray-600">{e.employee_number}</p>
                                        <p className="mt-1 text-sm text-gray-600">
                                            {[e.position, e.department, e.gender ? formatGender(e.gender) : null]
                                                .filter(Boolean)
                                                .join(" · ") || "—"}
                                        </p>
                                        <div className="mt-2">
                                            <ActiveBadge />
                                        </div>
                                    </div>
                                    <RowActionMenu actions={actions(e)} />
                                </li>
                            ))}
                        </ul>

                        {/* DESKTOP: table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="border-y border-[#e4ede8] bg-[#f6faf8] text-gray-600">
                                    <tr>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">Employee Number</th>
                                        <th className="px-5 py-3 font-semibold">Name</th>
                                        <th className="px-5 py-3 font-semibold">Department</th>
                                        <th className="px-5 py-3 font-semibold">Position</th>
                                        <th className="px-5 py-3 font-semibold">Gender</th>
                                        <th className="px-5 py-3 font-semibold">Status</th>
                                        <th className="px-5 py-3 text-center font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map((e) => (
                                        <tr key={e.employee_id} className="border-t border-gray-100 hover:bg-[#f6faf8]">
                                            <td className="whitespace-nowrap px-5 py-3 text-gray-600">{e.employee_number}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <PersonAvatar src={e.avatar} first={e.first_name} last={e.last_name} type="employee" />
                                                    <span className="font-medium text-gray-900">{fullName(e)}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-gray-600">{e.department ?? "—"}</td>
                                            <td className="px-5 py-3 text-gray-600">{e.position ?? "—"}</td>
                                            <td className="px-5 py-3 text-gray-600">{formatGender(e.gender)}</td>
                                            <td className="px-5 py-3">
                                                <ActiveBadge />
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <RowActionMenu actions={actions(e)} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                <ListPagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} hrefFor={listHref} />
            </section>
        </main>
    );
}