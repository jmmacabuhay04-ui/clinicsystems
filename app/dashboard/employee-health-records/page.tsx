import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, ArrowLeft, Pencil, Plus, Search, UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords, canManageStudents } from "@/lib/permissions";
import ConfirmButton from "@/components/confirm-button";
import { archiveEmployee } from "./employee-actions";
import { archiveEmployeeRecord } from "./record-actions";
import ConfirmLink from "@/components/confirm-link";
import { logAccess } from "@/lib/access-log";

const BASE = "/dashboard/employee-health-records";

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
    searchParams: Promise<{ q?: string; employee?: string }>;
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
        timeZone: "UTC",
    });
}

function show(value: number | string | null | undefined, unit = "") {
    return value === null || value === undefined || value === "" ? "—" : `${value}${unit}`;
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
            <p className="mt-1 font-medium text-gray-900">{value}</p>
        </div>
    );
}

export default async function EmployeeHealthRecordsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const { q = "", employee: employeeNumber = "" } = await searchParams;
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

    const employees = selected
        ? []
        : await prisma.$queryRaw<EmployeeRow[]>`
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
      LIMIT 50
    `;

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
        <main className="space-y-6 p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-3xl font-semibold text-gray-900">Employee Health Records</h1>

                <div className="flex flex-wrap gap-3">
                    {canEditEmployees && !selected && (
                        <ConfirmLink
                            href="/dashboard/employee-health-records/employees/new"
                            title="Add a new employee?"
                            message="You will be taken to the form to register a new employee."
                            confirmLabel="Continue"
                            className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-500"
                        >
                            <UserPlus className="h-4 w-4" />
                            Add Employee
                        </ConfirmLink>
                    )}
                    {canEditRecords ? (
                        <ConfirmLink
                            href={
                                selected
                                    ? `${BASE}/records/new?employee=${encodeURIComponent(selected.employee_number)}`
                                    : `${BASE}/records/new`
                            }
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
                    ) : (
                        <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                            View only
                        </span>
                    )}
                </div>
            </div>

            {!selected && (
                <form method="get" action={BASE} className="relative max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        name="q"
                        defaultValue={q}
                        placeholder="Search by employee number or name..."
                        suppressHydrationWarning
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                    />
                </form>
            )}
            {!selected && (
                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <p className="border-b border-gray-100 px-4 py-3 text-sm text-gray-600">
                        {q ? `Search results for “${q}”` : "Recently registered employees"}
                    </p>

                    {employees.length === 0 ? (
                        <p className="p-8 text-center text-sm text-gray-500">No employees found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-700">
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
                                                    href={`${BASE}?employee=${encodeURIComponent(e.employee_number)}`}
                                                    title="View health record"
                                                    message={`Open the health record of ${e.first_name} ${e.last_name} (${e.employee_number})? This contains confidential medical information.`}
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
                    )}
                </section>
            )}

            {selected && (
                <>
                    <Link
                        href={BASE}
                        className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to employee list
                    </Link>

                    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
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
                            <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-100 pt-5">
                                <ConfirmLink
                                    href={`${BASE}/employees/edit?employee=${encodeURIComponent(selected.employee_number)}`}
                                    title="Edit employee details"
                                    message={`Edit the details of ${selected.first_name} ${selected.last_name} (${selected.employee_number})? Changes will replace the current information.`}
                                    confirmLabel="Edit"
                                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#15664f] px-4 text-sm font-medium text-[#15664f] hover:bg-[#15664f]/5"
                                >
                                    <Pencil className="h-4 w-4" />
                                    Edit employee details
                                </ConfirmLink>
                                <form action={archiveEmployee}>
                                    <input type="hidden" name="employeeId" value={selected.employee_id} />
                                    <ConfirmButton
                                        title="Archive employee"
                                        confirmLabel="Archive"
                                        message={`Archive ${selected.last_name}, ${selected.first_name}? Their portal login will stop working until restored.`}
                                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 text-sm font-medium text-amber-800 hover:bg-amber-100"
                                    >
                                        <Archive className="h-4 w-4" />
                                        Archive this employee
                                    </ConfirmButton>
                                </form>
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="mb-3 text-lg font-semibold text-gray-900">Vital Signs</h2>
                        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
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
                                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                                >
                                    <p className="text-sm text-gray-600">{item.label}</p>
                                    <p className="mt-2 text-xl font-semibold text-gray-900">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-lg font-semibold text-gray-900">Visit History</h2>
                            <p className="text-sm text-gray-500">
                                Clinic visits and health case reports combined, newest first.
                            </p>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            {visits.length === 0 ? (
                                <p className="p-8 text-center text-sm text-gray-500">
                                    No clinic visits or case reports recorded yet.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-gray-700">
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
                                                        {v.kind === "visit" ? (
                                                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                                                                Clinic Visit
                                                            </span>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <span className="rounded-full bg-[#eef6f2] px-2.5 py-0.5 text-xs font-medium text-[#15664f]">
                                                                    Case {v.caseNumber}
                                                                </span>
                                                                <span
                                                                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[v.status ?? ""] ??
                                                                        "bg-gray-100 text-gray-700"
                                                                        }`}
                                                                >
                                                                    {v.status}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-900">{v.complaint}</td>
                                                    <td className="px-4 py-3 text-gray-900">{v.detail || "—"}</td>
                                                    <td className="px-4 py-3 text-gray-900">{v.staff || "—"}</td>
                                                    {canEditRecords && (
                                                        <td className="whitespace-nowrap px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                {v.kind === "visit" ? (
                                                                    <>
                                                                        <ConfirmLink
                                                                            href={`${BASE}/records/edit?record=${v.id}`}
                                                                            title="Edit visit record"
                                                                            message={`Edit this visit (${fmt(v.date)} - ${v.complaint})?`}
                                                                            confirmLabel="Edit"
                                                                            className="inline-flex items-center gap-1 font-medium text-[#15664f] hover:underline"
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
                                                                                className="inline-flex items-center gap-1 font-medium text-amber-700 hover:underline"
                                                                            >
                                                                                <Archive className="h-3.5 w-3.5" />
                                                                                Archive
                                                                            </ConfirmButton>
                                                                        </form>
                                                                    </>
                                                                ) : (
                                                                    <ConfirmLink
                                                                        href={`${CASES}/edit?case=${v.id}`}
                                                                        title="Open case report"
                                                                        message={`Open case ${v.caseNumber} (${v.complaint})? You will be taken to Health Case Reports.`}
                                                                        confirmLabel="Open"
                                                                        className="inline-flex items-center gap-1 font-medium text-[#15664f] hover:underline"
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                        Open case
                                                                    </ConfirmLink>
                                                                )}
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
                </>
            )}
        </main>
    );
}