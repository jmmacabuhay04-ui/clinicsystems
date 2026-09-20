import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";
import RecordForm, { type RecordValues } from "../../record-form";

const BASE = "/dashboard/employee-health-records";

type Row = {
    record_id: number;
    employee_number: string;
    last_name: string;
    first_name: string;
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
    searchParams: Promise<{ record?: string }>;
};

function str(value: number | null) {
    return value === null ? "" : String(value);
}

export default async function EditEmployeeRecordPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRecords(session.role)) redirect(BASE);

    const { record: recordParam = "" } = await searchParams;
    const recordId = Number(recordParam);
    if (!recordId) notFound();

    const rows = await prisma.$queryRaw<Row[]>`
    SELECT r.record_id, e.employee_number, e.last_name, e.first_name,
           r.visit_date, r.complaint, r.action_taken, r.attending_staff,
           r.height_cm, r.weight_kg, r.heart_rate, r.blood_pressure, r.temperature
    FROM employee_health_records r
    JOIN employees e ON e.employee_id = r.employee_id
    WHERE r.record_id = ${recordId}
    LIMIT 1
  `;
    const row = rows[0];
    if (!row) notFound();

    const values: RecordValues = {
        recordId: row.record_id,
        employeeNumber: row.employee_number,
        employeeName: `${row.first_name} ${row.last_name}`,
        visitDate: new Date(row.visit_date).toISOString().slice(0, 10),
        complaint: row.complaint,
        actionTaken: row.action_taken ?? "",
        attendingStaff: row.attending_staff ?? "",
        heightCm: str(row.height_cm),
        weightKg: str(row.weight_kg),
        heartRate: str(row.heart_rate),
        bloodPressure: row.blood_pressure ?? "",
        temperature: str(row.temperature),
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

            <h1 className="text-3xl font-semibold text-gray-900">Edit Visit Record</h1>

            <RecordForm mode="edit" record={values} cancelHref={backHref} />
        </main>
    );
}   