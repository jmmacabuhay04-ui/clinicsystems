// components/case-report-table.tsx
// Read-only list of health case reports for one patient.
// Used by the student portal and the employee portal.
//
// A student or employee may only VIEW their own case reports here.
// Editing stays in the staff dashboard, so the portal cannot be used
// to change a clinical record.

import { ChevronRight, ClipboardList } from "lucide-react";
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
    pending: "bg-amber-100 text-amber-800",
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

// Maliit na kahon ng petsa: "OCT" sa itaas, "30" sa ilalim (blue = case)
function DateBlock({ date }: { date: Date }) {
    const d = new Date(date);
    const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
    const day = d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
    return (
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <span className="text-sm font-semibold tracking-wide">{month}</span>
            <span className="text-xl font-bold leading-none">{day}</span>
        </div>
    );
}

function StatusPill({ status }: { status: string }) {
    return (
        <span
            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold capitalize ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"
                }`}
        >
            {status}
        </span>
    );
}

type Props = {
    patientType: "student" | "employee";
    patientId: number;
    /** Ilan lang ang ipapakita (hal. 3 sa dashboard). Wala = lahat. */
    limit?: number;
    /** Link ng "View all" sa header (dashboard lang) */
    viewAllHref?: string;
    /** Dagdag na class (hal. lapad sa grid ng dashboard) */
    className?: string;
};

export default async function CaseReportTable({ patientType, patientId, limit, viewAllHref, className = "" }: Props) {
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

    const total = rows.length;
    const shown = limit ? rows.slice(0, limit) : rows;

    return (
        <section className={`min-w-0 overflow-hidden rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10 ${className}`}>
            <div className="flex items-center justify-between gap-3 p-5 pb-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">{viewAllHref ? "Recent Case Reports" : "Health Case Reports"}</h2>
                </div>
                {viewAllHref ? (
                    <a
                        href={viewAllHref}
                        className="inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold text-[#15664f] hover:underline"
                    >
                        View all
                        <ChevronRight className="h-4 w-4" />
                    </a>
                ) : (
                    total > 0 && (
                        <span className="rounded-full bg-[#eef6f2] px-3 py-1 text-sm font-semibold text-[#15664f]">
                            {total} total
                        </span>
                    )
                )}
            </div>

            {total === 0 ? (
                <div className="flex flex-col items-center border-t border-gray-100 p-8 text-center">
                    <ClipboardList className="h-10 w-10 text-[#15664f]/30" />
                    <p className="mt-2 text-sm text-gray-600">No health case reports on file.</p>
                </div>
            ) : (
                // Kapareho ng Recent Visits at Recent Dental Visits: kahon ng petsa (blue para sa case)
                <ul className="divide-y divide-gray-100 border-t border-gray-100">
                    {shown.map((c) => (
                        <li key={c.case_id} className="flex items-center gap-4 px-5 py-3">
                            <DateBlock date={c.report_date} />
                            {/* Pahalang: complaint + status | petsa | staff */}
                            <div className="grid min-w-0 flex-1 gap-0.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="break-words font-semibold capitalize text-gray-900">{c.complaint}</p>
                                    <StatusPill status={c.status} />
                                </div>
                                <p className="text-sm text-gray-600">{formatDate(c.report_date)}</p>
                                <p className="break-words text-sm text-gray-600">{c.staff_name ? `Seen by ${c.staff_name}` : "—"}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}