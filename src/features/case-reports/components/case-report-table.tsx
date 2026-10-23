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
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

function StatusPill({ status }: { status: string }) {
    return (
        <span
            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"
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
};

export default async function CaseReportTable({ patientType, patientId, limit, viewAllHref }: Props) {
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
        <section className="min-w-0 overflow-hidden rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10">
            <div className="flex items-center justify-between gap-3 p-5 pb-4">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef6f2] text-[#15664f]">
                        <ClipboardList className="h-5 w-5" />
                    </span>
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
                        <span className="rounded-full bg-[#eef6f2] px-3 py-1 text-xs font-semibold text-[#15664f]">
                            {total} total
                        </span>
                    )
                )}
            </div>

            {total === 0 ? (
                <div className="flex flex-col items-center border-t border-gray-100 p-8 text-center">
                    <ClipboardList className="h-10 w-10 text-[#15664f]/30" />
                    <p className="mt-2 text-sm text-gray-500">No health case reports on file.</p>
                </div>
            ) : (
                <>
                    {/* MOBILE at TABLET: card bawat case (2 column sa tablet) */}
                    <ul className="grid gap-2 border-t border-gray-100 p-3 sm:grid-cols-2 lg:hidden">
                        {shown.map((c) => (
                            <li key={c.case_id} className="min-w-0 rounded-lg border border-gray-200 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="rounded-md bg-[#eef6f2] px-2 py-0.5 text-xs font-semibold text-[#15664f]">
                                        Case {c.case_number}
                                    </span>
                                    <StatusPill status={c.status} />
                                </div>
                                <p className="mt-2 break-words font-semibold capitalize text-gray-900">{c.complaint}</p>
                                <p className="text-xs text-gray-500">
                                    {formatDate(c.report_date)}
                                    {c.staff_name ? ` · Seen by ${c.staff_name}` : ""}
                                </p>
                                {c.notes && <p className="mt-2 rounded-lg bg-[#f6faf8] px-3 py-2 text-sm text-gray-700">{c.notes}</p>}
                            </li>
                        ))}
                    </ul>

                    {/* DESKTOP (lg pataas): table, kapareho ng health record */}
                    <div className="hidden overflow-x-auto border-t border-gray-100 lg:block">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#f6faf8] text-xs uppercase tracking-wide text-gray-600">
                                <tr>
                                    <th className="whitespace-nowrap px-5 py-3 font-semibold">Date</th>
                                    <th className="whitespace-nowrap px-5 py-3 font-semibold">Case No.</th>
                                    <th className="px-5 py-3 font-semibold">Complaint</th>
                                    <th className="hidden px-5 py-3 font-semibold xl:table-cell">Notes</th>
                                    <th className="px-5 py-3 font-semibold">Seen By</th>
                                    <th className="px-5 py-3 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shown.map((c) => (
                                    <tr key={c.case_id} className="border-t border-gray-100 hover:bg-[#f6faf8]">
                                        <td className="whitespace-nowrap px-5 py-3.5 text-gray-900">{formatDate(c.report_date)}</td>
                                        <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-[#15664f]">{c.case_number}</td>
                                        <td className="px-5 py-3.5 font-medium capitalize text-gray-900">{c.complaint}</td>
                                        <td className="hidden max-w-[18rem] px-5 py-3.5 text-gray-600 xl:table-cell">
                                            <span className="line-clamp-2" title={c.notes ?? undefined}>
                                                {c.notes || "—"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-700">{c.staff_name || "—"}</td>
                                        <td className="px-5 py-3.5">
                                            <StatusPill status={c.status} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </section>
    );
}