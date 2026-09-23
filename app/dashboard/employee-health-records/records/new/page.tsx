import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";
import RecordForm, { type RecordValues } from "../../record-form";

const BASE = "/dashboard/employee-health-records";

type Row = {
    employee_number: string;
    last_name: string;
    first_name: string;
    department?: string | null;
    position?: string | null;
};

type Props = {
    searchParams: Promise<{ employee?: string; q?: string }>;
};

export default async function NewEmployeeRecordPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRecords(session.role)) redirect(BASE);

    const { employee: employeeNumber = "", q = "" } = await searchParams;

    // No employee chosen yet — show a picker
    if (!employeeNumber) {
        const like = `%${q}%`;
        const employees = await prisma.$queryRaw<Row[]>`
      SELECT employee_number, last_name, first_name, department, position
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

        return (
            <main className="space-y-6 p-6 md:p-8">
                <Link
                    href={BASE}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to employee list
                </Link>

                <div>
                    <h1 className="text-3xl font-semibold text-gray-900">Add Visit Record</h1>
                    <p className="mt-1 text-gray-600">Select the employee for this visit.</p>
                </div>

                <form method="get" className="relative max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        name="q"
                        defaultValue={q}
                        placeholder="Search by employee number or name..."
                        suppressHydrationWarning
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                    />
                </form>

                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    {employees.length === 0 ? (
                        <p className="p-8 text-center text-sm text-gray-500">No employees found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Employee Number</th>
                                        <th className="px-4 py-3 font-medium">Name</th>
                                        <th className="px-4 py-3 font-medium">Department</th>
                                        <th className="px-4 py-3 font-medium">Position</th>
                                        <th className="px-4 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map((e) => (
                                        <tr key={e.employee_number} className="border-t border-gray-100">
                                            <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
                                                {e.employee_number}
                                            </td>
                                            <td className="px-4 py-3 text-gray-900">
                                                {e.last_name}, {e.first_name}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{e.department ?? "—"}</td>
                                            <td className="px-4 py-3 text-gray-600">{e.position ?? "—"}</td>
                                            <td className="whitespace-nowrap px-4 py-3">
                                                <Link
                                                    href={`${BASE}/records/new?employee=${encodeURIComponent(e.employee_number)}`}
                                                    className="font-medium text-[#15664f] hover:underline"
                                                >
                                                    Select
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>
        );
    }

    const rows = await prisma.$queryRaw<Row[]>`
    SELECT employee_number, last_name, first_name
    FROM employees
    WHERE employee_number = ${employeeNumber} AND archived_at IS NULL
    LIMIT 1
  `;
    const row = rows[0];
    if (!row) notFound();

    const values: RecordValues = {
        employeeNumber: row.employee_number,
        employeeName: `${row.first_name} ${row.last_name}`,
        visitDate: new Date().toISOString().slice(0, 10),
        complaint: "",
        actionTaken: "",
        attendingStaff: session.username,
        heightCm: "",
        weightKg: "",
        heartRate: "",
        bloodPressure: "",
        temperature: "",
    };

    const backHref = `${BASE}?employee=${encodeURIComponent(row.employee_number)}`;

    return (
        <main className="space-y-6 p-6 md:p-8">
            <Link
                href={backHref}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to employee record
            </Link>

            <h1 className="text-3xl font-semibold text-gray-900">Add Visit Record</h1>

            <RecordForm mode="create" record={values} cancelHref={backHref} />
        </main>
    );
}