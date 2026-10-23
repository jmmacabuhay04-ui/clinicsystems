import { redirect } from "next/navigation";
import { Plus, Search, User2 } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageStudents } from "@/lib/permissions";
import ConfirmLink from "@/components/shared/confirm-link";
import FlashMessage from "@/components/shared/flash-message";
import AutoSubmitSelect from "@/components/shared/auto-submit-select";
import ListPagination from "@/components/shared/list-pagination";

const BASE = "/dashboard/employees";
const RECORDS = "/dashboard/employee-health-records";
const PAGE_SIZE = 10;

type EmployeeRow = {
    employee_id: number;
    employee_number: string;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    department: string | null;
    position: string | null;
    contact_number: string | null;
    email: string | null;
};

type Props = {
    searchParams: Promise<{ q?: string; department?: string; position?: string; saved?: string; page?: string }>;
};

const selectClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";
const viewBtn =
    "inline-flex h-8 items-center rounded-md bg-[#15664f] px-4 text-xs font-semibold text-white hover:bg-[#10523f]";
const editBtn =
    "inline-flex h-8 items-center rounded-md bg-[#f6d860] px-4 text-xs font-semibold text-gray-900 hover:bg-[#efcc3f]";

export default async function EmployeesPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const params = await searchParams;
    const q = (params.q ?? "").trim();
    const department = (params.department ?? "").trim();
    const position = (params.position ?? "").trim();
    const saved = params.saved ?? "";
    const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
    const canEdit = canManageStudents(session.role);
    const like = `%${q}%`;
    const offset = (page - 1) * PAGE_SIZE;

    // Link na may parehong search/filters, iba lang ang page.
    const hrefFor = (p: number) => {
        const sp = new URLSearchParams();
        if (q) sp.set("q", q);
        if (department) sp.set("department", department);
        if (position) sp.set("position", position);
        if (p > 1) sp.set("page", String(p));
        const qs = sp.toString();
        return qs ? `${BASE}?${qs}` : BASE;
    };

    // Hindi case-sensitive ang Department/Position filter: "GUARD" = "Guard".
    const [employees, count, departments, positions] = await Promise.all([
        prisma.$queryRaw<EmployeeRow[]>`
      SELECT employee_id, employee_number, last_name, first_name, middle_name,
             department, position, contact_number, email
      FROM employees
      WHERE archived_at IS NULL
        AND (${department}::text = '' OR LOWER(TRIM(department)) = LOWER(${department}))
        AND (${position}::text = '' OR LOWER(TRIM(position)) = LOWER(${position}))
        AND (
          ${q}::text = ''
          OR employee_number ILIKE ${like}
          OR last_name ILIKE ${like}
          OR first_name ILIKE ${like}
          OR department ILIKE ${like}
        )
      ORDER BY employee_number ASC
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
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
          OR department ILIKE ${like}
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
    if (page > totalPages) redirect(hrefFor(totalPages));

    const editHref = (e: EmployeeRow) => `${BASE}/edit?employee=${encodeURIComponent(e.employee_number)}`;
    const viewHref = (e: EmployeeRow) => `${RECORDS}?employee=${encodeURIComponent(e.employee_number)}`;
    const fullName = (e: EmployeeRow) =>
        `${e.first_name}${e.middle_name ? ` ${e.middle_name}` : ""} ${e.last_name}`;

    const actions = (e: EmployeeRow) => (
        <>
            <ConfirmLink
                href={viewHref(e)}
                title="View health record"
                message={`Open the health record of ${e.first_name} ${e.last_name} (${e.employee_number})? This contains confidential medical information and your access will be recorded.`}
                className={viewBtn}
            >
                View
            </ConfirmLink>
            {canEdit && (
                <ConfirmLink
                    href={editHref(e)}
                    title="Edit employee details"
                    message={`Edit the details of ${e.first_name} ${e.last_name} (${e.employee_number})?`}
                    confirmLabel="Edit"
                    className={editBtn}
                >
                    Edit
                </ConfirmLink>
            )}
        </>
    );

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center text-[#15664f]">
                        <User2 className="h-10 w-10" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Employees</h1>
                        <p className="text-sm text-gray-600">Manage and view all registered employees.</p>
                    </div>
                </div>
                {canEdit ? (
                    <ConfirmLink
                        href={`${BASE}/new`}
                        title="Add a new employee?"
                        message="You will be taken to the form to create a new employee account."
                        confirmLabel="Continue"
                        className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f]"
                    >
                        <Plus className="h-4 w-4" />
                        Add Employee
                    </ConfirmLink>
                ) : (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">View only</span>
                )}
            </div>

            {saved && (
                <FlashMessage key={saved} clearParam="saved">
                    Employee {saved} was saved.
                </FlashMessage>
            )}

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
                                    <p className="break-words text-sm font-semibold text-gray-900">{fullName(e)}</p>
                                    <p className="text-xs text-gray-500">{e.employee_number}</p>
                                    <p className="mt-1 text-sm text-gray-700">
                                        {[e.position, e.department].filter(Boolean).join(" · ") || "—"}
                                    </p>
                                    <div className="mt-3 flex items-center gap-2">{actions(e)}</div>
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
                                        <th className="px-5 py-3 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map((e) => (
                                        <tr key={e.employee_id} className="border-t border-gray-100 hover:bg-[#f6faf8]">
                                            <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900">{e.employee_number}</td>
                                            <td className="px-5 py-4 text-gray-900">{fullName(e)}</td>
                                            <td className="px-5 py-4 text-gray-700">{e.department ?? "—"}</td>
                                            <td className="px-5 py-4 text-gray-700">{e.position ?? "—"}</td>
                                            <td className="whitespace-nowrap px-5 py-4">
                                                <div className="flex items-center gap-2">{actions(e)}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                <ListPagination
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    pageSize={PAGE_SIZE}
                    hrefFor={hrefFor}
                />
            </section>
        </main>
    );
}