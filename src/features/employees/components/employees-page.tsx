import { redirect } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageStudents } from "@/lib/permissions";
import ConfirmLink from "@/components/shared/confirm-link";
import FlashMessage from "@/components/shared/flash-message";
import AutoSubmitSelect from "@/components/shared/auto-submit-select";
import ListPagination from "@/components/shared/list-pagination";
import SearchInput from "@/components/shared/search-input";
import RowActionMenu, { type RowAction } from "@/components/shared/row-action-menu";

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
    gender: string | null;
    avatar: string | null;
};

type Props = {
    searchParams: Promise<{ q?: string; department?: string; position?: string; saved?: string; page?: string }>;
};

const selectClass =
    "h-11 w-full rounded-xl border border-[#dcebe3] bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-4 focus:ring-[#15664f]/10";

// Profile picture; initials kapag wala pang picture (dilaw para sa employee)
function Avatar({ src, first, last }: { src?: string | null; first: string; last: string }) {
    if (src) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={src} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-amber-300" />;
    }
    return (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-300 text-sm font-semibold text-gray-900">
            {`${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase()}
        </span>
    );
}

// Lahat ng nasa listahan ay hindi naka-archive, kaya "Active"
function ActiveBadge() {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e3f1e9] px-2.5 py-0.5 text-sm font-medium text-[#15664f]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#15664f]" />
            Active
        </span>
    );
}

function formatGender(g?: string | null) {
    if (!g) return "—";
    return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
}

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

    const [employees, count, departments, positions] = await Promise.all([
        prisma.$queryRaw<EmployeeRow[]>`
      SELECT employee_id, employee_number, last_name, first_name, middle_name,
             department, position, contact_number, email, gender, avatar
      FROM employees
      WHERE archived_at IS NULL
        AND (${department}::text = '' OR department = ${department})
        AND (${position}::text = '' OR position = ${position})
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
        AND (${department}::text = '' OR department = ${department})
        AND (${position}::text = '' OR position = ${position})
        AND (
          ${q}::text = ''
          OR employee_number ILIKE ${like}
          OR last_name ILIKE ${like}
          OR first_name ILIKE ${like}
          OR department ILIKE ${like}
        )
    `,
        prisma.$queryRaw<{ value: string }[]>`
      SELECT DISTINCT department AS value FROM employees
      WHERE archived_at IS NULL AND department IS NOT NULL AND department <> ''
      ORDER BY value
    `,
        prisma.$queryRaw<{ value: string }[]>`
      SELECT DISTINCT position AS value FROM employees
      WHERE archived_at IS NULL AND position IS NOT NULL AND position <> ''
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

    // Mga pagpipilian sa "⋮" menu ng bawat row
    const actions = (e: EmployeeRow): RowAction[] => [
        {
            label: "View Health Record",
            href: viewHref(e),
            title: "View health record",
            message: `Open the health record of ${e.first_name} ${e.last_name} (${e.employee_number})? This contains confidential medical information and your access will be recorded.`,
            confirmLabel: "View",
            icon: "view",
        },
        ...(canEdit
            ? [
                {
                    label: "Edit Details",
                    href: editHref(e),
                    title: "Edit employee details",
                    message: `Edit the details of ${e.first_name} ${e.last_name} (${e.employee_number})?`,
                    confirmLabel: "Edit",
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
                    <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Employees</h1>
                    <p className="mt-1 text-sm text-gray-600">Manage and view employee information.</p>
                </div>
                {canEdit ? (
                    <ConfirmLink
                        href={`${BASE}/new`}
                        title="Add a new employee?"
                        message="You will be taken to the form to create a new employee account."
                        confirmLabel="Continue"
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#15664f] px-5 text-sm font-semibold text-white shadow-md shadow-[#15664f]/20 hover:bg-[#10523f]"
                    >
                        <Plus className="h-4 w-4" />
                        Add Employee
                    </ConfirmLink>
                ) : (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-600">View only</span>
                )}
            </div>

            {saved && (
                <FlashMessage key={saved} clearParam="saved">
                    Employee {saved} was saved.
                </FlashMessage>
            )}

            <section className="overflow-hidden rounded-2xl border border-[#dcebe3] bg-white shadow-sm shadow-[#15664f]/5">
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
                        className={selectClass}
                    />
                    <AutoSubmitSelect
                        name="position"
                        defaultValue={position}
                        options={positions.map((r) => r.value)}
                        allLabel="All Positions"
                        className={selectClass}
                    />
                    <div className="relative sm:col-span-2 lg:col-span-1 lg:ml-auto lg:w-full lg:max-w-sm">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
                        <SearchInput
                            name="q"
                            defaultValue={q}
                            autoComplete="off"
                            placeholder="Search by name or employee no..."
                            suppressHydrationWarning
                            className="h-11 w-full rounded-xl border border-[#dcebe3] bg-white pl-10 pr-3 text-base text-gray-900 outline-none focus:border-[#15664f] focus:ring-4 focus:ring-[#15664f]/10 md:text-sm"
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
                                    <Avatar src={e.avatar} first={e.first_name} last={e.last_name} />
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
                                                    <Avatar src={e.avatar} first={e.first_name} last={e.last_name} />
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