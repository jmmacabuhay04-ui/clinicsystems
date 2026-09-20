import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, Pencil, Plus, Search, UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords, canManageStudents } from "@/lib/permissions";
import ConfirmButton from "@/components/confirm-button";
import { archiveEmployee } from "./employee-actions";
import { archiveEmployeeRecord } from "./record-actions";

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

type Props = {
    searchParams: Promise<{ q?: string; employee?: string }>;
};

function fmt(date: Date | null) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

function show(value: number | string | null, unit = "") {
    return value === null || value === "" ? "—" : `${value}${unit}`;
}

export default async function EmployeeHealthRecordsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const { q = "", employee: employeeNumber = "" } = await searchParams;
    const canEditRecords = canManageRecords(session.role);
    const canEditEmployees = canManageStudents(session.role);
    const like = `%${q}%`;

    const employees = await prisma.$queryRaw<EmployeeRow[]>`
    SELECT employee_id, employee_number, last_name, first_name, middle_name,
           department, position, date_of_birth, gender
    FROM employees
    WHERE archived_at IS NULL
      AND (
        ${q}::text = ''
        OR employee_number ILIKE ${like}
        OR last_name ILIKE ${like}
        OR first_name ILIKE ${like}
      )
    ORDER BY employee_number
    LIMIT 50
  `;

    const selected = employeeNumber
        ? employees.find((e) => e.employee_number === employeeNumber)
        : undefined;

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

    const latest = records[0];

    return (
        <main className="space-y-6 p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900">Employee Health Records</h1>
                    <p className="mt-1 text-gray-600">
                        Clinic records for teachers and staff, plus their portal accounts.
                    </p>
                </div>
                {canEditEmployees && (
                    <Link
                        href={`${BASE}/employees/new`}
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#f5b800] px-4 text-sm font-semibold text-gray-900 hover:bg-[#e0a800]"
                    >
                        <UserPlus className="h-4 w-4" />
                        Add Employee
                    </Link>
                )}
            </div>

            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <aside className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <form method="get" className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            name="q"
                            defaultValue={q}
                            placeholder="Search employee..."
                            suppressHydrationWarning
                            className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                        />
                    </form>

                    <div className="mt-4 max-h-[560px] space-y-1 overflow-y-auto">
                        {employees.length === 0 && (
                            <p className="p-3 text-sm text-gray-500">No employees found.</p>
                        )}
                        {employees.map((e) => {
                            const active = e.employee_number === employeeNumber;
                            return (
                                <Link
                                    key={e.employee_id}
                                    href={`${BASE}?q=${encodeURIComponent(q)}&employee=${encodeURIComponent(
                                        e.employee_number
                                    )}`}
                                    className={`block rounded-lg px-3 py-2 text-sm ${active ? "bg-[#15664f] text-white" : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    <span className="block font-medium">
                                        {e.last_name}, {e.first_name}
                                    </span>
                                    <span
                                        className={`block text-xs ${active ? "text-white/80" : "text-gray-500"}`}
                                    >
                                        {e.employee_number}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </aside>

                <section className="space-y-6">
                    {!selected && (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
                            <p className="text-gray-500">Select an employee on the left to view records.</p>
                        </div>
                    )}

                    {selected && (
                        <>
                            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            {selected.first_name}
                                            {selected.middle_name ? ` ${selected.middle_name}` : ""}{" "}
                                            {selected.last_name}
                                        </h2>
                                        <p className="mt-1 text-sm text-gray-600">
                                            {selected.employee_number}
                                            {selected.position ? ` · ${selected.position}` : ""}
                                            {selected.department ? ` · ${selected.department}` : ""}
                                        </p>
                                        <p className="mt-1 text-sm text-gray-500">
                                            {fmt(selected.date_of_birth)} · {selected.gender || "—"}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {canEditRecords && (
                                            <Link
                                                href={`${BASE}/records/new?employee=${encodeURIComponent(
                                                    selected.employee_number
                                                )}`}
                                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#15664f] px-3 text-sm font-semibold text-white hover:bg-[#10523f]"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Add Record
                                            </Link>
                                        )}
                                        {canEditEmployees && (
                                            <>
                                                <Link
                                                    href={`${BASE}/employees/edit?employee=${encodeURIComponent(
                                                        selected.employee_number
                                                    )}`}
                                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                    Edit
                                                </Link>
                                                <form action={archiveEmployee}>
                                                    <input type="hidden" name="employeeId" value={selected.employee_id} />
                                                    <ConfirmButton
                                                        title="Archive employee"
                                                        confirmLabel="Archive"
                                                        message={`Archive ${selected.last_name}, ${selected.first_name}? Their portal login will stop working until restored.`}
                                                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                                    >
                                                        <Archive className="h-4 w-4" />
                                                        Archive
                                                    </ConfirmButton>
                                                </form>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-900">Latest Vital Signs</h3>
                                {!latest ? (
                                    <p className="mt-3 text-sm text-gray-500">No records yet.</p>
                                ) : (
                                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                                        {[
                                            { label: "Height", value: show(latest.height_cm, " cm") },
                                            { label: "Weight", value: show(latest.weight_kg, " kg") },
                                            { label: "Heart Rate", value: show(latest.heart_rate, " bpm") },
                                            { label: "Blood Pressure", value: show(latest.blood_pressure) },
                                            { label: "Temperature", value: show(latest.temperature, " °C") },
                                        ].map((item) => (
                                            <div key={item.label} className="rounded-lg bg-gray-50 p-4">
                                                <p className="text-xs text-gray-600">{item.label}</p>
                                                <p className="mt-1 text-lg font-semibold text-gray-900">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                                <h3 className="border-b border-gray-100 p-5 text-lg font-semibold text-gray-900">
                                    Visit History ({records.length})
                                </h3>
                                {records.length === 0 ? (
                                    <p className="p-8 text-center text-sm text-gray-500">No visit records yet.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 text-gray-700">
                                                <tr>
                                                    <th className="whitespace-nowrap px-4 py-3 font-medium">Date</th>
                                                    <th className="px-4 py-3 font-medium">Complaint</th>
                                                    <th className="px-4 py-3 font-medium">Action Taken</th>
                                                    <th className="px-4 py-3 font-medium">Staff</th>
                                                    {canEditRecords && <th className="px-4 py-3 font-medium">Actions</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {records.map((r) => (
                                                    <tr key={r.record_id} className="border-t border-gray-100">
                                                        <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                                                            {fmt(r.visit_date)}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-900">{r.complaint}</td>
                                                        <td className="px-4 py-3 text-gray-700">{r.action_taken || "—"}</td>
                                                        <td className="px-4 py-3 text-gray-700">
                                                            {r.attending_staff || "—"}
                                                        </td>
                                                        {canEditRecords && (
                                                            <td className="whitespace-nowrap px-4 py-3">
                                                                <div className="flex items-center gap-3">
                                                                    <Link
                                                                        href={`${BASE}/records/edit?record=${r.record_id}&employee=${encodeURIComponent(
                                                                            selected.employee_number
                                                                        )}`}
                                                                        className="inline-flex items-center gap-1 font-medium text-[#15664f] hover:underline"
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                        Edit
                                                                    </Link>
                                                                    <form action={archiveEmployeeRecord}>
                                                                        <input type="hidden" name="recordId" value={r.record_id} />
                                                                        <ConfirmButton
                                                                            title="Archive record"
                                                                            confirmLabel="Archive"
                                                                            message={`Archive this visit? ${fmt(r.visit_date)} · ${r.complaint
                                                                                }`}
                                                                            className="inline-flex items-center gap-1 font-medium text-gray-600 hover:underline"
                                                                        >
                                                                            <Archive className="h-3.5 w-3.5" />
                                                                            Archive
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
                        </>
                    )}
                </section>
            </div>
        </main>
    );
}