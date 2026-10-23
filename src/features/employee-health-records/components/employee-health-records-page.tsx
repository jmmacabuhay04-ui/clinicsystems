import { redirect } from "next/navigation";
import { HeartPulse, Plus, Search } from "lucide-react";
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

const selectClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";
const viewBtn =
    "inline-flex h-8 items-center rounded-md bg-[#15664f] px-4 text-xs font-semibold text-white hover:bg-[#10523f]";

// Profile picture; initials kapag wala pang picture
function ProfileAvatar({ src, first, last }: { src?: string | null; first: string; last: string }) {
    if (src) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-amber-300" />
        );
    }
    return (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold bg-amber-300 text-gray-900">
            {`${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase()}
        </span>
    );
}

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
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        No active employee found with number {employeeNumber}. It may have been archived.
                    </div>
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

    const viewButton = (e: EmployeeRow) => (
        <ConfirmLink href={viewHref(e)} title="View health record" message={viewMessage(e)} className={viewBtn}>
            View Record
        </ConfirmLink>
    );

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <HeartPulse className="h-10 w-10 shrink-0 text-[#15664f]" />
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Employee Health Records</h1>
                        <p className="text-sm text-gray-600">Select an employee to view their visits, case reports, and health information.</p>
                    </div>
                </div>
                {canEditRecords ? (
                    <ConfirmLink
                        href={`${BASE}/new`}
                        icon={<Plus className="h-5 w-5" />}
                        title="Add a new visit record?"
                        message="You will be taken to the form to add a new employee health record."
                        confirmLabel="Continue"
                        className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f]"
                    >
                        <Plus className="h-4 w-4" />
                        Add Record
                    </ConfirmLink>
                ) : (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">View only</span>
                )}
            </div>

            <section className="overflow-hidden rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10">
                {/* Search + filters */}
                <form method="get" action={BASE} className="grid gap-3 p-4 md:grid-cols-[1fr_12rem_12rem] md:items-end md:p-5">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            name="q"
                            defaultValue={q}
                            autoComplete="off"
                            placeholder="Search by name or employee number..."
                            suppressHydrationWarning
                            className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-base text-gray-900 outline-none placeholder:text-sm focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20 md:text-sm"
                        />
                    </div>
                    <label className="block space-y-1">
                        <span className="text-xs font-medium text-gray-600">Department</span>
                        <AutoSubmitSelect
                            name="department"
                            defaultValue={department}
                            options={departments.map((r) => r.value)}
                            className={selectClass}
                        />
                    </label>
                    <label className="block space-y-1">
                        <span className="text-xs font-medium text-gray-600">Position</span>
                        <AutoSubmitSelect
                            name="position"
                            defaultValue={position}
                            options={positions.map((r) => r.value)}
                            className={selectClass}
                        />
                    </label>
                </form>

                {employees.length === 0 ? (
                    <p className="border-t border-gray-100 p-8 text-center text-sm text-gray-500">No employees found.</p>
                ) : (
                    <>
                        {/* MOBILE: card list */}
                        <ul className="space-y-2 border-t border-gray-100 p-3 md:hidden">
                            {employees.map((e) => (
                                <li key={e.employee_id} className="rounded-lg border border-gray-200 p-3">
                                    <div className="flex items-center gap-3">
                                        <ProfileAvatar src={e.avatar} first={e.first_name} last={e.last_name} />
                                        <div className="min-w-0">
                                            <p className="break-words text-sm font-semibold text-gray-900">{fullName(e)}</p>
                                            <p className="text-xs text-gray-500">{e.employee_number}</p>
                                        </div>
                                    </div>
                                    <p className="mt-1 text-sm text-gray-700">
                                        {[e.position, e.department].filter(Boolean).join(" · ") || "—"}
                                    </p>
                                    <div className="mt-3">{viewButton(e)}</div>
                                </li>
                            ))}
                        </ul>

                        {/* DESKTOP: table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="border-y border-gray-200 bg-[#f6faf8] text-gray-700">
                                    <tr>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">Employee Number</th>
                                        <th className="px-5 py-3 font-semibold">Full Name</th>
                                        <th className="px-5 py-3 font-semibold">Department</th>
                                        <th className="px-5 py-3 font-semibold">Position</th>
                                        <th className="px-5 py-3 font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map((e) => (
                                        <tr key={e.employee_id} className="border-t border-gray-100 hover:bg-[#f6faf8]">
                                            <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900">{e.employee_number}</td>
                                            <td className="px-5 py-4 text-gray-900">
                                                <div className="flex items-center gap-3">
                                                    <ProfileAvatar src={e.avatar} first={e.first_name} last={e.last_name} />
                                                    <span className="font-medium">{fullName(e)}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-gray-700">{e.department ?? "—"}</td>
                                            <td className="px-5 py-4 text-gray-700">{e.position ?? "—"}</td>
                                            <td className="whitespace-nowrap px-5 py-4">{viewButton(e)}</td>
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