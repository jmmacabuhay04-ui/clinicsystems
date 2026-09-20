import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";
import EditCaseForm, { type CaseValues } from "./edit-case-form";

const BASE = "/dashboard/health-case-reports";

type Row = {
    case_id: number;
    case_number: string;
    student_number: string;
    last_name: string;
    first_name: string;
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

    const rows = await prisma.$queryRaw<Row[]>`
    SELECT c.case_id, c.case_number, s.student_number, s.last_name, s.first_name,
           c.complaint, c.report_date, c.staff_name, c.status, c.notes
    FROM health_case_reports c
    JOIN students s ON s.student_id = c.student_id
    WHERE c.case_id = ${caseId}
    LIMIT 1
  `;
    const row = rows[0];
    if (!row) notFound();

    const values: CaseValues = {
        caseId: row.case_id,
        complaint: row.complaint,
        reportDate: new Date(row.report_date).toISOString().slice(0, 10),
        staffName: row.staff_name ?? "",
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
                Back to Health Case Reports
            </Link>

            <div>
                <h1 className="text-3xl font-semibold text-gray-900">Edit Case Report</h1>
                <p className="mt-1 text-gray-600">
                    {row.case_number} · {row.last_name}, {row.first_name} · {row.student_number}
                </p>
            </div>

            <EditCaseForm caseReport={values} cancelHref={BASE} />
        </main>
    );
}