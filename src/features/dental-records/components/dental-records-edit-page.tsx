import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageDental } from "@/lib/permissions";
import DentalForm, { type DentalValues, type PersonOption } from "./dental-form";

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
    searchParams: Promise<{ record?: string; back?: string }>;
};

export default async function EditDentalRecordPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageDental(session.role)) redirect(BASE);

    const { record: recordParam = "", back = "" } = await searchParams;
    // Galing sa Dental Records tab ng health record: doon babalik
    const backHref = back.startsWith("/dashboard/") ? back : BASE;
    const backLabel = backHref === BASE ? "Back to Dental Records" : "Back to Dental Record";
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

    // Para sa "Search by name or number" na dropdown
    const [students, employees] = await Promise.all([
        prisma.$queryRaw<PersonOption[]>`
            SELECT student_number AS number, last_name || ', ' || first_name AS name
            FROM students WHERE archived_at IS NULL
            ORDER BY last_name, first_name
        `,
        prisma.$queryRaw<PersonOption[]>`
            SELECT employee_number AS number, last_name || ', ' || first_name AS name
            FROM employees WHERE archived_at IS NULL
            ORDER BY last_name, first_name
        `,
    ]);

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            <Link
                href={backHref}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
            </Link>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Edit Dental Record</h1>
                    <p className="text-sm text-gray-600">Update the procedure, tooth, and status of this dental visit.</p>
                </div>
                {/* Kung kaninong record ito */}
                <div className="flex items-center gap-3 rounded-xl border-2 border-[#cfe5d9] bg-white px-3 py-2 shadow-sm">
                    <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${row.patient_type === "employee" ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
                            }`}
                    >
                        {`${row.first_name?.[0] ?? ""}${row.last_name?.[0] ?? ""}`.toUpperCase()}
                    </span>
                    <div className="min-w-0 leading-tight">
                        <p className="truncate text-sm font-semibold text-gray-900">
                            {row.last_name}, {row.first_name}
                        </p>
                        <p className="text-sm text-gray-600">{row.patient_number}</p>
                    </div>
                    <span
                        className={`rounded-full px-2 py-0.5 text-sm font-semibold ${row.patient_type === "employee" ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
                            }`}
                    >
                        {row.patient_type === "employee" ? "Employee" : "Student"}
                    </span>
                </div>
            </div>

            <DentalForm
                mode="edit"
                record={values}
                cancelHref={backHref}
                returnTo={backHref === BASE ? undefined : backHref}
                students={students}
                employees={employees}
            />
        </main>
    );
}