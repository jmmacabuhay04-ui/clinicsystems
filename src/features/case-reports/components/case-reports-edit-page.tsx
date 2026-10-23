import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FilePenLine } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";
import EditCaseForm, { type PersonOption } from "./edit-case-form";

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
    action_taken: string | null;
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
               c.complaint, c.report_date, c.staff_name, c.status, c.notes, c.action_taken
        FROM health_case_reports c
        LEFT JOIN students  s ON s.student_id  = c.student_id
        LEFT JOIN employees e ON e.employee_id = c.employee_id
        WHERE c.case_id = ${caseId} AND c.archived_at IS NULL
        LIMIT 1
    `;

    const row = rows[0];
    if (!row) notFound();

    const isEmployee = row.patient_type === "employee";

    // Para sa "Search by name or number" na dropdown.
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
                href={BASE}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Health Case Reports
            </Link>

            <div className="flex items-center gap-3">
                <FilePenLine className="h-10 w-10 shrink-0 text-[#15664f]" />
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Edit Case Report</h1>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
                        <span className="font-medium text-gray-800">{row.case_number}</span>
                        <span className="text-gray-300">|</span>
                        <span>
                            {row.first_name} {row.last_name}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span>{row.patient_number}</span>
                        <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${isEmployee ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
                                }`}
                        >
                            {isEmployee ? "Employee" : "Student"}
                        </span>
                    </p>
                </div>
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
                actionTaken={row.action_taken ?? ""}
                cancelHref={BASE}
                students={students}
                employees={employees}
            />
        </main>
    );
}