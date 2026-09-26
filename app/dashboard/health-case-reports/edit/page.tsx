import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";
import EditCaseForm from "./edit-case-form";

const BASE = "/dashboard/health-case-reports";

type Row = {
    case_id: number;
    case_number: string;
    patient_type: string;
    patient_number: string | null;
    last_name: string | null;
    first_name: string | null;
    complaint: string;
    report_date: Date;
    staff_name: string | null;
    status: string;
    notes: string | null;
};

type Props = {
    searchParams: Promise<{ case?: string }>;
};

export default async function EditCasePage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRecords(session.role)) redirect(BASE);

    const { case: caseParam = "" } = await searchParams;
    const caseId = Number(caseParam);
    if (!caseId) notFound();

    // LEFT JOIN on both sides: a case report belongs to a student OR an
    // employee, and the other column is NULL. An INNER JOIN on students
    // would make every employee case report unreachable here.
    const rows = await prisma.$queryRaw<Row[]>`
        SELECT c.case_id, c.case_number,
               CASE WHEN c.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END AS patient_type,
               COALESCE(s.student_number, e.employee_number) AS patient_number,
               COALESCE(s.last_name, e.last_name)            AS last_name,
               COALESCE(s.first_name, e.first_name)          AS first_name,
               c.complaint, c.report_date, c.staff_name, c.status, c.notes
        FROM health_case_reports c
        LEFT JOIN students  s ON s.student_id  = c.student_id
        LEFT JOIN employees e ON e.employee_id = c.employee_id
        WHERE c.case_id = ${caseId} AND c.archived_at IS NULL
        LIMIT 1
    `;

    const row = rows[0];
    if (!row) notFound();

    const isEmployee = row.patient_type === "employee";

    return (
        <main className="mx-auto max-w-4xl space-y-6 p-6 md:p-8">
            <Link
                href={BASE}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Health Case Reports
            </Link>

            <div>
                <h1 className="text-3xl font-semibold text-gray-900">Edit Case Report</h1>
                <p className="mt-1 text-gray-600">
                    {row.case_number} · {row.last_name}, {row.first_name} · {row.patient_number}
                    <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${isEmployee ? "bg-violet-100 text-violet-800" : "bg-gray-100 text-gray-700"
                            }`}
                    >
                        {isEmployee ? "Employee" : "Student"}
                    </span>
                </p>
            </div>

            <EditCaseForm
                caseId={row.case_id}
                caseNumber={row.case_number}
                patientType={isEmployee ? "employee" : "student"}
                patientNumber={row.patient_number ?? ""}
                complaint={row.complaint}
                reportDate={new Date(row.report_date).toISOString().slice(0, 10)}
                staffName={row.staff_name ?? ""}
                status={row.status}
                notes={row.notes ?? ""}
                cancelHref={BASE}
            />
        </main>
    );
}