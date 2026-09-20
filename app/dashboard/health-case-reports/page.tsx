import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, Pencil, Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";
import ConfirmButton from "@/components/confirm-button";
import { archiveCase } from "./case-actions";

type CaseRow = {
    case_id: number;
    case_number: string;
    student_number: string;
    last_name: string;
    first_name: string;
    complaint: string;
    report_date: Date;
    staff_name: string | null;
    status: string;
};

type Props = {
    searchParams: Promise<{ status?: string; q?: string }>;
};

const BASE = "/dashboard/health-case-reports";

const tabs = [
    { key: "", label: "All Reports" },
    { key: "pending", label: "Pending" },
    { key: "referred", label: "Referred" },
    { key: "resolved", label: "Resolved" },
];

const statusStyles: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
    referred: { label: "Referred", className: "bg-red-100 text-red-700" },
    resolved: { label: "Resolved", className: "bg-green-100 text-green-700" },
};

function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

export default async function HealthCaseReportsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const canEdit = canManageRecords(session.role);

    const params = await searchParams;
    const status = (params.status ?? "").trim().toLowerCase();
    const q = (params.q ?? "").trim();
    const like = `%${q}%`;

    const reports = await prisma.$queryRaw<CaseRow[]>`
    SELECT c.case_id, c.case_number, s.student_number, s.last_name, s.first_name,
           c.complaint, c.report_date, c.staff_name, c.status
    FROM health_case_reports c
    JOIN students s ON s.student_id = c.student_id
    WHERE c.archived_at IS NULL
      AND (${status} = '' OR c.status = ${status})
      AND (${q} = ''
        OR s.last_name ILIKE ${like}
        OR s.first_name ILIKE ${like}
        OR s.student_number ILIKE ${like}
        OR c.case_number ILIKE ${like}
        OR c.complaint ILIKE ${like})
    ORDER BY c.report_date DESC, c.case_id DESC
  `;

    const tabHref = (key: string) => {
        const parts: string[] = [];
        if (key) parts.push(`status=${key}`);
        if (q) parts.push(`q=${encodeURIComponent(q)}`);
        return parts.length ? `${BASE}?${parts.join("&")}` : BASE;
    };

    return (
        <main className="space-y-6 p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-3xl font-semibold text-gray-900">Health Case Reports</h1>

                {canEdit ? (
                    <Link
                        href={`${BASE}/new`}
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white hover:bg-[#10523f]"
                    >
                        <Plus className="h-4 w-4" />
                        New Case Report
                    </Link>
                ) : (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                        View only
                    </span>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => {
                    const active = status === tab.key;
                    return (
                        <Link
                            key={tab.label}
                            href={tabHref(tab.key)}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${active
                                ? "bg-[#15664f] text-white"
                                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                                }`}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </div>

            <form method="get" action={BASE} className="relative max-w-md">
                {status && <input type="hidden" name="status" value={status} />}
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    name="q"
                    defaultValue={q}
                    placeholder="Search by name, student no., case no., or complaint..."
                    suppressHydrationWarning
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                />
            </form>

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {reports.length === 0 ? (
                    <p className="p-8 text-center text-sm text-gray-500">No case reports found.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-700">
                                <tr>
                                    <th className="whitespace-nowrap px-4 py-3 font-medium">Case No.</th>
                                    <th className="whitespace-nowrap px-4 py-3 font-medium">Student No.</th>
                                    <th className="px-4 py-3 font-medium">Student</th>
                                    <th className="px-4 py-3 font-medium">Complaint</th>
                                    <th className="whitespace-nowrap px-4 py-3 font-medium">Date</th>
                                    <th className="px-4 py-3 font-medium">Staff</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    {canEdit && <th className="px-4 py-3 font-medium">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map((c) => {
                                    const badge = statusStyles[c.status] ?? {
                                        label: c.status,
                                        className: "bg-gray-100 text-gray-700",
                                    };
                                    return (
                                        <tr key={c.case_id} className="border-t border-gray-100">
                                            <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
                                                {c.case_number}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                                {c.student_number}
                                            </td>
                                            <td className="px-4 py-3 text-gray-900">
                                                {c.last_name}, {c.first_name}
                                            </td>
                                            <td className="px-4 py-3 text-gray-900">{c.complaint}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                {formatDate(c.report_date)}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{c.staff_name ?? "—"}</td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                                                >
                                                    {badge.label}
                                                </span>
                                            </td>
                                            {canEdit && (
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <Link
                                                            href={`${BASE}/edit?case=${c.case_id}`}
                                                            className="inline-flex items-center gap-1 font-medium text-[#15664f] hover:underline"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                            Edit
                                                        </Link>
                                                        <form action={archiveCase}>
                                                            <input type="hidden" name="caseId" value={c.case_id} />
                                                            <ConfirmButton
                                                                title="Archive case report"
                                                                confirmLabel="Archive"
                                                                message={`Archive case ${c.case_number} (${c.complaint})? It will move to Archive Records.`}
                                                                className="inline-flex items-center gap-1 font-medium text-amber-700 hover:underline"
                                                            >
                                                                <Archive className="h-3.5 w-3.5" />
                                                                Archive
                                                            </ConfirmButton>
                                                        </form>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
}