import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageDental } from "@/lib/permissions";
import DentalForm, { type DentalValues } from "../dental-form";

const BASE = "/dashboard/dental-records";

type Row = {
    dental_id: number;
    visit_date: Date;
    procedure_name: string;
    tooth: string | null;
    dentist_name: string | null;
    status: string;
    notes: string | null;
    patient_type: "student" | "employee";
    patient_number: string;
    last_name: string;
    first_name: string;
};

type Props = {
    searchParams: Promise<{ record?: string }>;
};

export default async function EditDentalRecordPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageDental(session.role)) redirect(BASE);

    const { record: recordParam = "" } = await searchParams;
    const dentalId = Number(recordParam);
    if (!dentalId) notFound();

    const rows = await prisma.$queryRaw<Row[]>`
    SELECT d.dental_id, d.visit_date, d.procedure_name, d.tooth, d.dentist_name,
           d.status, d.notes,
           CASE WHEN d.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END AS patient_type,
           COALESCE(s.student_number, e.employee_number) AS patient_number,
           COALESCE(s.last_name, e.last_name) AS last_name,
           COALESCE(s.first_name, e.first_name) AS first_name
    FROM dental_records d
    LEFT JOIN students s ON s.student_id = d.student_id
    LEFT JOIN employees e ON e.employee_id = d.employee_id
    WHERE d.dental_id = ${dentalId}
    LIMIT 1
  `;
    const row = rows[0];
    if (!row) notFound();

    const values: DentalValues = {
        dentalId: row.dental_id,
        patientType: row.patient_type,
        patientNumber: row.patient_number,
        visitDate: new Date(row.visit_date).toISOString().slice(0, 10),
        procedure: row.procedure_name,
        tooth: row.tooth ?? "",
        dentistName: row.dentist_name ?? "",
        status: row.status,
        notes: row.notes ?? "",
    };

    return (
        <main className="space-y-6 p-6 md:p-8">
            <Link
                href={BASE}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Dental Records
            </Link>

            <div>
                <h1 className="text-3xl font-semibold text-gray-900">Edit Dental Record</h1>
                <p className="mt-1 text-gray-600">
                    {row.last_name}, {row.first_name} · {row.patient_number} ·{" "}
                    {row.patient_type === "employee" ? "Employee" : "Student"}
                </p>
            </div>

            <DentalForm mode="edit" record={values} cancelHref={BASE} />
        </main>
    );
}