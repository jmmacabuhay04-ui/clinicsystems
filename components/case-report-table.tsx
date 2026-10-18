// components/case-report-table.tsx
// Read-only list of health case reports for one patient.
// Used by the student portal and the employee portal.
//
// A student or employee may only VIEW their own case reports here.
// Editing stays in the staff dashboard, so the portal cannot be used
// to change a clinical record.

import { prisma } from "@/lib/prisma";

type CaseRow = {
    case_id: number;
    case_number: string;
    complaint: string;
    report_date: Date;
    staff_name: string | null;
    status: string;
    notes: string | null;
};

const STATUS_STYLES: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    referred: "bg-red-100 text-red-700",
    resolved: "bg-green-100 text-green-700",
};

function formatDate(date: Date | null) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

type Props = {
    patientType: "student" | "employee";
    patientId: number;
};

export default async function CaseReportTable({ patientType, patientId }: Props) {
    const rows =
        patientType === "student"
            ? await prisma.$queryRaw<CaseRow[]>`
                SELECT case_id, case_number, complaint, report_date,
                       staff_name, status, notes
                FROM health_case_reports
                WHERE student_id = ${patientId} AND archived_at IS NULL
                ORDER BY report_date DESC, case_id DESC
              `
            : await prisma.$queryRaw<CaseRow[]>`
                SELECT case_id, case_number, complaint, report_date,
                       staff_name, status, notes
                FROM health_case_reports
                WHERE employee_id = ${patientId} AND archived_at IS NULL
                ORDER BY report_date DESC, case_id DESC
              `;

    return (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#15664f]">Health Case Reports</h2>
                {rows.length > 0 && (
                    <span className="text-sm text-gray-700">{rows.length} total</span>
                )}
            </div>

            {rows.length === 0 ? (
                <p className="text-sm text-gray-700">No health case reports on file.</p>
            ) : (
                <div className="space-y-3">
                    {rows.map((c) => (
                        <div key={c.case_id} className="rounded-lg border border-gray-200 p-4 shadow-sm">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-gray-700">
                                    {formatDate(c.report_date)}
                                </p>
                                <span className="rounded-full bg-[#eef6f2] px-2.5 py-0.5 text-xs font-medium text-[#15664f]">
                                    Case {c.case_number}
                                </span>
                                <span
                                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status] ?? "bg-gray-100 text-gray-700"
                                        }`}
                                >
                                    {c.status}
                                </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-700">
                                {c.complaint}
                                {c.staff_name && ` · Seen by ${c.staff_name}`}
                            </p>
                            {c.notes && (
                                <p className="mt-1 text-sm text-gray-600">{c.notes}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}