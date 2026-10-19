import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, ArrowLeft, Pencil, Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords, canManageStudents } from "@/lib/permissions";
import ConfirmButton from "@/components/confirm-button";
import { archiveEmployee } from "./employee-actions";
import { archiveEmployeeRecord } from "./record-actions";
import ConfirmLink from "@/components/confirm-link";
import { logAccess } from "@/lib/access-log";

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
};

type RecordRow = {
    record_id: number;
    visit_date: Date;
    complaint: string;
    action_taken: string | null;
    attending_staff: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    heart_rate: number | null;
    blood_pressure: string | null;
    temperature: number | null;
};

type CaseRow = {
    case_id: number;
    case_number: string;
    complaint: string;
    report_date: Date;
    staff_name: string | null;
    status: string;
    notes: string | null;
};

// One row of the merged Visit History table. A clinic visit and a health
// case report are stored in different tables, so they are normalised here
// into a single shape before being sorted together by date.
type VisitItem = {
    key: string;
    kind: "visit" | "case";
    id: number;
    date: Date;
    complaint: string;
    detail: string | null;
    staff: string | null;
    caseNumber: string | null;
    status: string | null;
};

type Props = {
    searchParams: Promise<{ q?: string; employee?: string; page?: string; view?: string }>;
};

const CASES = "/dashboard/health-case-reports";

const STATUS_STYLES: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    referred: "bg-red-100 text-red-700",
    resolved: "bg-green-100 text-green-700",
};

function fmt(date: Date | null, month: "short" | "long" = "short") {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
        month,
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
    });
}

function show(value: number | string | null | undefined, unit = "") {
    return value === null || value === undefined || value === "" ? "—" : `${value}${unit}`;
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
            <p className="mt-1 break-words font-medium text-gray-900">{value}</p>
        </div>
    );
}

// Hal. [1] ... [4] [5] [6] ... [20]
function pageList(current: number, last: number): (number | "...")[] {
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
    const pages = new Set([1, last, current - 1, current, current + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
    const out: (number | "...")[] = [];
    sorted.forEach((p, i) => {
        if (i > 0 && p - sorted[i - 1] > 1) out.push("...");
        out.push(p);
    });
    return out;
}

function TypeBadges({ v }: { v: VisitItem }) {
    if (v.kind === "visit") {
        return (
            <span className="whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                Clinic Visit
            </span>
        );
    }
    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="whitespace-nowrap rounded-full bg-[#eef6f2] px-2.5 py-0.5 text-xs font-medium text-[#15664f]">
                Case {v.caseNumber}
            </span>
            <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[v.status ?? ""] ?? "bg-gray-100 text-gray-700"
                    }`}
            >
                {v.status}
            </span>
        </div>
    );
}

function VisitActions({ v, padded }: { v: VisitItem; padded?: boolean }) {
    const py = padded ? "py-1 " : "";
    if (v.kind === "visit") {
        return (
            <>
                <ConfirmLink
                    href={`${BASE}/edit?record=${v.id}`}
                    title="Edit visit record"
                    message={`Edit this visit (${fmt(v.date)} - ${v.complaint})?`}
                    confirmLabel="Edit"
                    className={`inline-flex items-center gap-1 ${py}font-medium text-[#15664f] hover:underline`}
                >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                </ConfirmLink>
                <form action={archiveEmployeeRecord}>
                    <input type="hidden" name="recordId" value={v.id} />
                    <ConfirmButton
                        title="Archive record"
                        confirmLabel="Archive"
                        message={`Archive this visit? ${fmt(v.date)} · ${v.complaint}`}
                        className={`inline-flex items-center gap-1 ${py}font-medium text-amber-700 hover:underline`}
                    >
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                    </ConfirmButton>
                </form>
            </>
        );
    }
    return (
        <ConfirmLink
            href={`${CASES}/edit?case=${v.id}`}
            title="Open case report"
            message={`Open case ${v.caseNumber} (${v.complaint})? You will be taken to Health Case Reports.`}
            confirmLabel="Open"
            className={`inline-flex items-center gap-1 ${py}font-medium text-[#15664f] hover:underline`}
        >
            <Pencil className="h-3.5 w-3.5" />
            Open case
        </ConfirmLink>
    );
}

export default async function EmployeeHealthRecordsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const params = await searchParams;
    const q = (params.q ?? "").trim();
    const employeeNumber = (params.employee ?? "").trim();
    const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
    // ?view=history (from the dashboard View button) shows only the Visit History table.
    const historyOnly = (params.view ?? "") === "history";

    const canEditRecords = canManageRecords(session.role);
    const canEditEmployees = canManageStudents(session.role);
    const like = `%${q}%`;

    let selected: EmployeeRow | undefined;
    if (employeeNumber) {
        const rows = await prisma.$queryRaw<EmployeeRow[]>`
          SELECT employee_id, employee_number, last_name, first_name, middle_name,
             department, position, date_of_birth, gender, contact_number, email
      FROM employees
      WHERE employee_number = ${employeeNumber} AND archived_at IS NULL
      LIMIT 1
    `;
        selected = rows[0];
    }

    if (selected) {
        await logAccess(
            {
                userId: Number(session.userId),
                role: session.role,
                name: String(session.username ?? ""),
            },
            "employee_health_record",
            selected.employee_id,
            "view",
            `${selected.last_name}, ${selected.first_name} (${selected.employee_number})`
        );
    }

    let employees: EmployeeRow[] = [];
    let total = 0;

    // Same as Student Health Records: the list is only loaded when no
    // employee number is in the URL. If a number is given but isn't an
    // active employee, an error is shown instead of the list.
    if (!employeeNumber) {
        const offset = (page - 1) * PAGE_SIZE;

        const [rows, count] = await Promise.all([
            prisma.$queryRaw<EmployeeRow[]>`
      SELECT employee_id, employee_number, last_name, first_name, middle_name,
             department, position, date_of_birth, gender, contact_number, email
      FROM employees
      WHERE archived_at IS NULL
        AND (
          ${q}::text = ''
          OR employee_number ILIKE ${like}
          OR last_name ILIKE ${like}
          OR first_name ILIKE ${like}
        )
      ORDER BY employee_number ASC
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `,
            prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM employees
      WHERE archived_at IS NULL
        AND (
          ${q}::text = ''
          OR employee_number ILIKE ${like}
          OR last_name ILIKE ${like}
          OR first_name ILIKE ${like}
        )
    `,
        ]);

        employees = rows;
        total = count[0]?.count ?? 0;

        const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
        if (page > lastPage) {
            redirect(`${BASE}?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${lastPage}`);
        }
    }

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const pageHref = (p: number) =>
        `${BASE}?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${p}`;

    const backHref = historyOnly ? "/dashboard" : pageHref(page);

    const viewHref = (e: EmployeeRow) =>
        `${BASE}?employee=${encodeURIComponent(e.employee_number)}${q ? `&q=${encodeURIComponent(q)}` : ""}&page=${page}`;
    const viewMessage = (e: EmployeeRow) =>
        `Open the health record of ${e.first_name} ${e.last_name} (${e.employee_number})? This contains confidential medical information.`;

    let records: RecordRow[] = [];
    if (selected) {
        records = await prisma.$queryRaw<RecordRow[]>`
      SELECT record_id, visit_date, complaint, action_taken, attending_staff,
             height_cm, weight_kg, heart_rate, blood_pressure, temperature
      FROM employee_health_records
      WHERE employee_id = ${selected.employee_id} AND archived_at IS NULL
      ORDER BY visit_date DESC, record_id DESC
    `;
    }

    let cases: CaseRow[] = [];
    if (selected) {
        cases = await prisma.$queryRaw<CaseRow[]>`
      SELECT case_id, case_number, complaint, report_date, staff_name, status, notes
      FROM health_case_reports
      WHERE employee_id = ${selected.employee_id} AND archived_at IS NULL
      ORDER BY report_date DESC, case_id DESC
    `;
    }

    // Clinic visits and case reports shown as one timeline, newest first.
    const visits: VisitItem[] = [
        ...records.map((r) => ({
            key: `visit-${r.record_id}`,
            kind: "visit" as const,
            id: r.record_id,
            date: r.visit_date,
            complaint: r.complaint,
            detail: r.action_taken,
            staff: r.attending_staff,
            caseNumber: null,
            status: null,
        })),
        ...cases.map((c) => ({
            key: `case-${c.case_id}`,
            kind: "case" as const,
            id: c.case_id,
            date: c.report_date,
            complaint: c.complaint,
            detail: c.notes,
            staff: c.staff_name,
            caseNumber: c.case_number,
            status: c.status,
        })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const latest = records.find(
        (r) =>
            r.height_cm !== null ||
            r.weight_kg !== null ||
            r.heart_rate !== null ||
            r.blood_pressure !== null ||
            r.temperature !== null
    );

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            <div className="flex items-center justify-between gap-3 md:gap-4">
                <h1 className="text-2xl font-semibold text-[#15664f] md:text-3xl">Employee Health Records</h1>

                {canEditEmployees || canEditRecords ? (
                    <div className="flex shrink-0 gap-3">

                        {canEditRecords && (
                            <ConfirmLink
                                href={
                                    selected
                                        ? `${BASE}/new?employee=${encodeURIComponent(selected.employee_number)}`
                                        : `${BASE}/new`
                                }
                                icon={<Plus className="h-5 w-5" />}
                                title="Add a new visit record?"
                                message={
                                    selected
                                        ? `Add a health record for ${selected.first_name} ${selected.last_name} (${selected.employee_number})?`
                                        : "You will be taken to the form to add a new employee health record."
                                }
                                confirmLabel="Continue"
                                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white hover:bg-[#10523f]"
                            >
                                <Plus className="h-4 w-4" />
                                Add Record
                            </ConfirmLink>
                        )}
                    </div>
                ) : (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                        View only
                    </span>
                )}
            </div>

            {!selected && (
                <form method="get" action={BASE} className="relative w-full md:max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        name="q"
                        defaultValue={q}
                        autoComplete="off"
                        placeholder="Search by employee number or name..."
                        suppressHydrationWarning
                        className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 text-base text-gray-900 outline-none placeholder:text-sm focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20 md:text-sm"
                    />
                </form>
            )}

            {employeeNumber && !selected && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-base text-red-700">
                    No active employee found with number {employeeNumber}. It may have been archived.
                </div>
            )}

            {!selected && !employeeNumber && (
                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">


                    {employees.length === 0 ? (
                        <p className="p-6 text-center text-sm text-gray-500 md:p-8">No employees found.</p>
                    ) : (
                        <>
                            {/* MOBILE: card list (walang horizontal scroll) */}
                            <ul className="space-y-2 p-3 md:hidden">
                                {employees.map((e) => {
                                    const name = `${e.last_name}, ${e.first_name}${e.middle_name ? ` ${e.middle_name}` : ""}`;
                                    return (
                                        <li key={e.employee_id} className="rounded-lg border border-gray-300 p-3">
                                            <p className="break-words text-sm font-semibold text-gray-900">{name}</p>
                                            <p className="text-xs text-gray-500">{e.employee_number}</p>
                                            <dl className="mt-2 space-y-1">
                                                <div className="flex gap-2 text-sm">
                                                    <dt className="w-24 shrink-0 text-gray-500">Department</dt>
                                                    <dd className="min-w-0 flex-1 break-words text-gray-900">
                                                        {e.department ?? "—"}
                                                    </dd>
                                                </div>
                                                <div className="flex gap-2 text-sm">
                                                    <dt className="w-24 shrink-0 text-gray-500">Position</dt>
                                                    <dd className="min-w-0 flex-1 break-words text-gray-900">
                                                        {e.position ?? "—"}
                                                    </dd>
                                                </div>
                                                <div className="flex gap-2 text-sm">
                                                    <dt className="w-24 shrink-0 text-gray-500">Contact</dt>
                                                    <dd className="min-w-0 flex-1 break-words text-gray-900">
                                                        {e.contact_number ?? "—"}
                                                    </dd>
                                                </div>
                                                <div className="flex gap-2 text-sm">
                                                    <dt className="w-24 shrink-0 text-gray-500">Email</dt>
                                                    <dd className="min-w-0 flex-1 break-all text-gray-900">
                                                        {e.email ?? "—"}
                                                    </dd>
                                                </div>
                                                <div className="flex gap-2 text-sm">
                                                    <dt className="w-24 shrink-0 text-gray-500">Actions</dt>
                                                    <dd className="min-w-0 flex-1">
                                                        <ConfirmLink
                                                            href={viewHref(e)}
                                                            title="View health record"
                                                            message={viewMessage(e)}
                                                            className="font-medium text-[#15664f] hover:underline"
                                                        >
                                                            View record
                                                        </ConfirmLink>
                                                    </dd>
                                                </div>
                                            </dl>
                                        </li>
                                    );
                                })}
                            </ul>

                            {/* DESKTOP: table */}
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#EEEEEE] text-[#15664f]">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Department</th>
                                            <th className="px-4 py-3 font-medium">Position</th>
                                            <th className="whitespace-nowrap px-4 py-3 font-medium">Employee Number</th>
                                            <th className="whitespace-nowrap px-4 py-3 font-medium">Last Name</th>
                                            <th className="whitespace-nowrap px-4 py-3 font-medium">First Name</th>
                                            <th className="whitespace-nowrap px-4 py-3 font-medium">Middle Name</th>
                                            <th className="whitespace-nowrap px-4 py-3 font-medium">Contact Number</th>
                                            <th className="px-4 py-3 font-medium">Email</th>
                                            <th className="px-4 py-3 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.map((e) => (
                                            <tr key={e.employee_id} className="border-t border-gray-100">
                                                <td className="px-4 py-3 text-gray-600">{e.department ?? "—"}</td>
                                                <td className="px-4 py-3 text-gray-600">{e.position ?? "—"}</td>
                                                <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
                                                    {e.employee_number}
                                                </td>
                                                <td className="px-4 py-3 text-gray-900">{e.last_name}</td>
                                                <td className="px-4 py-3 text-gray-900">{e.first_name}</td>
                                                <td className="px-4 py-3 text-gray-900">{e.middle_name ?? "—"}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                                    {e.contact_number ?? "—"}
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">{e.email ?? "—"}</td>
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <ConfirmLink
                                                        href={viewHref(e)}
                                                        title="View health record"
                                                        message={viewMessage(e)}
                                                        className="font-medium text-[#15664f] hover:underline"
                                                    >
                                                        View record
                                                    </ConfirmLink>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {employees.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-gray-100 px-4 py-3 empty:hidden sm:justify-end">
                            {totalPages > 1 && (
                                <nav className="flex flex-wrap items-center justify-center gap-1 sm:justify-end" aria-label="Pagination">
                                    {page > 1 ? (
                                        <Link
                                            href={pageHref(page - 1)}
                                            className="rounded-lg border border-gray-300 px-3 py-2 font-medium text-[#15664f] hover:bg-[#eef6f2] sm:py-1.5"
                                        >
                                            Previous
                                        </Link>
                                    ) : (
                                        <span className="rounded-lg border border-gray-200 px-3 py-2 text-gray-400 sm:py-1.5">
                                            Previous
                                        </span>
                                    )}

                                    {pageList(page, totalPages).map((p, i) =>
                                        p === "..." ? (
                                            <span key={`gap-${i}`} className="px-2 text-gray-400">
                                                …
                                            </span>
                                        ) : p === page ? (
                                            <span
                                                key={p}
                                                aria-current="page"
                                                className="rounded-lg bg-[#15664f] px-3 py-1.5 font-semibold text-white"
                                            >
                                                {p}
                                            </span>
                                        ) : (
                                            <Link
                                                key={p}
                                                href={pageHref(p)}
                                                className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-[#eef6f2]"
                                            >
                                                {p}
                                            </Link>
                                        )
                                    )}

                                    {page < totalPages ? (
                                        <Link
                                            href={pageHref(page + 1)}
                                            className="rounded-lg border border-gray-300 px-3 py-2 font-medium text-[#15664f] hover:bg-[#eef6f2] sm:py-1.5"
                                        >
                                            Next
                                        </Link>
                                    ) : (
                                        <span className="rounded-lg border border-gray-200 px-3 py-2 text-gray-400 sm:py-1.5">
                                            Next
                                        </span>
                                    )}
                                </nav>
                            )}

                        </div>
                    )}
                </section>
            )}

            {selected && (
                <>
                    <Link
                        href={backHref}
                        className="inline-flex items-center gap-1 py-1 text-sm font-medium text-[#15664f] hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {historyOnly ? "Back to dashboard" : "Back to employee list"}
                    </Link>

                    {!historyOnly && (
                        <>
                            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-5 lg:grid-cols-6">
                                    <Info label="Department" value={show(selected.department)} />
                                    <Info label="Position" value={show(selected.position)} />
                                    <Info label="Employee Number" value={selected.employee_number} />
                                    <Info label="Last Name" value={selected.last_name} />
                                    <Info label="First Name" value={selected.first_name} />
                                    <Info label="Middle Name" value={show(selected.middle_name)} />
                                    <Info label="Date of Birth" value={fmt(selected.date_of_birth, "long")} />
                                    <Info label="Gender" value={show(selected.gender)} />
                                    <Info label="Contact Number" value={show(selected.contact_number)} />
                                    <Info label="Email Address" value={show(selected.email)} />
                                </div>

                                {canEditEmployees && (
                                    <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:flex-wrap">
                                        <ConfirmLink
                                            href={`/dashboard/employees/edit?employee=${encodeURIComponent(selected.employee_number)}`}
                                            title="Edit employee details"
                                            message={`Edit the details of ${selected.first_name} ${selected.last_name} (${selected.employee_number})? Changes will replace the current information.`}
                                            confirmLabel="Edit"
                                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#15664f] px-4 text-sm font-medium text-[#15664f] hover:bg-[#15664f]/5"
                                        >
                                            <Pencil className="h-4 w-4" />
                                            Edit employee details
                                        </ConfirmLink>
                                        <form action={archiveEmployee} className="flex">
                                            <input type="hidden" name="employeeId" value={selected.employee_id} />
                                            <ConfirmButton
                                                title="Archive employee"
                                                confirmLabel="Archive"
                                                message={`Archive ${selected.last_name}, ${selected.first_name}? Their portal login will stop working until restored.`}
                                                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 text-sm font-medium text-amber-800 hover:bg-amber-100"
                                            >
                                                <Archive className="h-4 w-4" />
                                                Archive this employee
                                            </ConfirmButton>
                                        </form>
                                    </div>
                                )}
                            </section>

                            <section>
                                <h2 className="mb-3 text-base font-semibold text-gray-900 md:text-lg">Vital Signs</h2>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
                                    {[
                                        { label: "Height", value: show(latest?.height_cm, " cm") },
                                        { label: "Weight", value: show(latest?.weight_kg, " kg") },
                                        { label: "Heart Rate", value: show(latest?.heart_rate, " bpm") },
                                        { label: "Blood Pressure", value: show(latest?.blood_pressure) },
                                        { label: "Temperature", value: show(latest?.temperature, " °C") },
                                        {
                                            label: "Last Updated",
                                            value: records[0] ? fmt(records[0].visit_date) : "—",
                                        },
                                    ].map((item) => (
                                        <div
                                            key={item.label}
                                            className="min-w-0 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4"
                                        >
                                            <p className="text-sm text-gray-600">{item.label}</p>
                                            <p className="mt-1 break-words text-lg font-semibold text-gray-900 sm:mt-2 sm:text-xl">
                                                {item.value}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </>
                    )}

                    <section>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-base font-semibold text-gray-900 md:text-lg">Visit History</h2>
                            <p className="break-words text-sm text-gray-500">
                                {historyOnly
                                    ? `${selected.last_name}, ${selected.first_name} (${selected.employee_number})`
                                    : "Clinic visits and health case reports combined, newest first."}
                            </p>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            {visits.length === 0 ? (
                                <p className="p-6 text-center text-sm text-gray-500 md:p-8">
                                    No clinic visits or case reports recorded yet.
                                </p>
                            ) : (
                                <>
                                    {/* MOBILE: card list (walang horizontal scroll) */}
                                    <ul className="space-y-2 p-3 md:hidden">
                                        {visits.map((v) => (
                                            <li key={v.key} className="rounded-lg border border-gray-300 p-3">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <TypeBadges v={v} />
                                                    <span className="text-xs text-gray-600">{fmt(v.date)}</span>
                                                </div>
                                                <p className="mt-2 break-words text-sm font-semibold text-gray-900">
                                                    {v.complaint}
                                                </p>
                                                <dl className="mt-1 space-y-1">
                                                    <div className="flex gap-2 text-sm">
                                                        <dt className="w-20 shrink-0 text-gray-500">Action</dt>
                                                        <dd className="min-w-0 flex-1 break-words text-gray-900">
                                                            {v.detail || "—"}
                                                        </dd>
                                                    </div>
                                                    <div className="flex gap-2 text-sm">
                                                        <dt className="w-20 shrink-0 text-gray-500">Staff</dt>
                                                        <dd className="min-w-0 flex-1 break-words text-gray-900">
                                                            {v.staff || "—"}
                                                        </dd>
                                                    </div>
                                                </dl>
                                                {canEditRecords && (
                                                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-gray-100 pt-2 text-sm">
                                                        <VisitActions v={v} padded />
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
                                                    <th className="whitespace-nowrap px-4 py-3 font-medium">Date</th>
                                                    <th className="whitespace-nowrap px-4 py-3 font-medium">Type</th>
                                                    <th className="px-4 py-3 font-medium">Complaint</th>
                                                    <th className="px-4 py-3 font-medium">Action Taken / Notes</th>
                                                    <th className="px-4 py-3 font-medium">Attending Staff</th>
                                                    {canEditRecords && <th className="px-4 py-3 font-medium">Actions</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {visits.map((v) => (
                                                    <tr key={v.key} className="border-t border-gray-100">
                                                        <td className="whitespace-nowrap px-4 py-3 text-gray-900">
                                                            {fmt(v.date)}
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-3">
                                                            <TypeBadges v={v} />
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-900">{v.complaint}</td>
                                                        <td className="px-4 py-3 text-gray-900">{v.detail || "—"}</td>
                                                        <td className="px-4 py-3 text-gray-900">{v.staff || "—"}</td>
                                                        {canEditRecords && (
                                                            <td className="whitespace-nowrap px-4 py-3">
                                                                <div className="flex items-center gap-3">
                                                                    <VisitActions v={v} />
                                                                </div>
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
                </>
            )}
        </main>
    );
}