import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";
import RecordForm, { type RecordValues } from "../../record-form";

const BASE = "/dashboard/employee-health-records";

type Row = {
    employee_number: string;
    last_name: string;
    first_name: string;
};

type Props = {
    searchParams: Promise<{ employee?: string }>;
};

export default async function NewEmployeeRecordPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRecords(session.role)) redirect(BASE);

    const { employee: employeeNumber = "" } = await searchParams;
    if (!employeeNumber) notFound();

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