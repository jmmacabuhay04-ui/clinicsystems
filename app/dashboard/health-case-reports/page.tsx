import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, Pencil, Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";
import ConfirmButton from "@/components/confirm-button";
import { archiveCase } from "./case-actions";
import ConfirmLink from "@/components/confirm-link";

type CaseRow = {
    case_id: number;
    case_number: string;
    patient_type: string;
    id_number: string | null;
    last_name: string | null;
    first_name: string | null;
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

function fullName(c: CaseRow) {
    if (!c.last_name && !c.first_name) return "—";
    return `${c.last_name ?? ""}, ${c.first_name ?? ""}`;
}

function CaseActions({ c, padded }: { c: CaseRow; padded?: boolean }) {
    const py = padded ? "py-1 " : "";
    return (
        <>
            <ConfirmLink
                href={`${BASE}/edit?case=${c.case_id}`}
                title="Edit case report"
                message={`Edit case ${c.case_number} (${c.complaint}) of ${fullName(c)}?`}
                confirmLabel="Edit"
                className={`inline-flex items-center gap-1 ${py}font-medium text-[#15664f] hover:underline`}
            >
                <Pencil className="h-3.5 w-3.5" />
                Edit
            </ConfirmLink>
            <form action={archiveCase}>
                <input type="hidden" name="caseId" value={c.case_id} />
                <ConfirmButton
                    title="Archive case report"
                    confirmLabel="Archive"
                    message={`Archive case ${c.case_number} (${c.complaint})? It will move to Archive Records.`}
                    className={`inline-flex items-center gap-1 ${py}font-medium text-amber-700 hover:underline`}
                >
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                </ConfirmButton>
            </form>
        </>
    );
}

export default async function HealthCaseReportsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const canEdit = canManageRecords(session.role);

    const params = await searchParams;
    const status = (params.status ?? "").trim().toLowerCase();
    const q = (params.q ?? "").trim();
    const like = `%${q}%`;

    // LEFT JOIN on both sides: a case report belongs to a student OR an
    // employee, and the other column is NULL. An INNER JOIN would silently
    // drop every employee case report from this list.
    // Newest date first, regardless of student or employee.
    const reports = await prisma.$queryRaw<CaseRow[]>`
        SELECT c.case_id, c.case_number,
               CASE WHEN c.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END AS patient_type,
               COALESCE(s.student_number, e.employee_number) AS id_number,
               COALESCE(s.last_name, e.last_name)            AS last_name,
               COALESCE(s.first_name, e.first_name)          AS first_name,
               c.complaint, c.report_date, c.staff_name, c.status
        FROM health_case_reports c
        LEFT JOIN students  s ON s.student_id  = c.student_id
        LEFT JOIN employees e ON e.employee_id = c.employee_id
        WHERE c.archived_at IS NULL
        AND (${status} = '' OR c.status = ${status})
        AND (${q} = ''
            OR COALESCE(s.last_name, e.last_name) ILIKE ${like}
            OR COALESCE(s.first_name, e.first_name) ILIKE ${like}
            OR COALESCE(s.student_number, e.employee_number) ILIKE ${like}
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
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
                <h1 className="text-2xl font-semibold text-[#15664f] md:text-3xl">Health Case Reports</h1>

                {canEdit ? (
                    <ConfirmLink
                        href={`${BASE}/new`}
                        title="New case report"
                        message="Create a new health case report? This will be counted in the Weekly Illness Alert Dashboard."
                        confirmLabel="Continue"
                        icon={<Plus className="h-5 w-5" />}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white hover:bg-[#10523f] sm:w-auto"
                    >
                        <Plus className="h-4 w-4" />
                        New Case Report
                    </ConfirmLink>
                ) : (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                        View only
                    </span>
                )}
            </div>

            {/* 2x2 sa mobile, isang hilera sa sm pataas */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {tabs.map((tab) => {
                    const active = status === tab.key;
                    return (
                        <Link
                            key={tab.label}
                            href={tabHref(tab.key)}
                            className={`rounded-full px-4 py-2 text-center text-sm font-medium transition-colors ${active
                                ? "bg-[#15664f] text-white"
                                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                                }`}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </div>

            <form method="get" action={BASE} className="relative w-full md:max-w-md">
                {status && <input type="hidden" name="status" value={status} />}
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    name="q"
                    defaultValue={q}
                    placeholder="Search by name, ID no., case no., or complaint..."
                    suppressHydrationWarning
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-base text-gray-900 outline-none placeholder:text-sm focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20 md:text-sm"
                />
            </form>

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {reports.length === 0 ? (
                    <p className="p-6 text-center text-sm text-gray-500 md:p-8">No case reports found.</p>
                ) : (
                    <>
                        {/* MOBILE: card list (walang horizontal scroll) */}
                        <ul className="space-y-2 p-3 md:hidden">
                            {reports.map((c) => {
                                const badge = statusStyles[c.status] ?? {
                                    label: c.status,
                                    className: "bg-gray-100 text-gray-700",
                                };
                                const isEmployee = c.patient_type === "employee";
                                return (
                                    <li key={c.case_id} className="rounded-lg border border-gray-100 p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-semibold text-gray-900">{c.case_number}</p>
                                            <span
                                                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                                            >
                                                {badge.label}
                                            </span>
                                        </div>

                                        <div className="mt-1 flex flex-wrap items-center gap-2">
                                            <p className="break-words text-sm text-gray-900">{fullName(c)}</p>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${isEmployee
                                                    ? "bg-amber-300 text-gray-900"
                                                    : "bg-[#15664f] text-white"
                                                    }`}
                                            >
                                                {isEmployee ? "Employee" : "Student"}
                                            </span>
                                        </div>

                                        <dl className="mt-2 space-y-1">
                                            <div className="flex gap-2 text-sm">
                                                <dt className="w-20 shrink-0 text-gray-500">ID No.</dt>
                                                <dd className="min-w-0 flex-1 break-words text-gray-900">
                                                    {c.id_number ?? "—"}
                                                </dd>
                                            </div>
                                            <div className="flex gap-2 text-sm">
                                                <dt className="w-20 shrink-0 text-gray-500">Complaint</dt>
                                                <dd className="min-w-0 flex-1 break-words text-gray-900">{c.complaint}</dd>
                                            </div>
                                            <div className="flex gap-2 text-sm">
                                                <dt className="w-20 shrink-0 text-gray-500">Date</dt>
                                                <dd className="min-w-0 flex-1 text-gray-900">{formatDate(c.report_date)}</dd>
                                            </div>
                                            <div className="flex gap-2 text-sm">
                                                <dt className="w-20 shrink-0 text-gray-500">Staff</dt>
                                                <dd className="min-w-0 flex-1 break-words text-gray-900">
                                                    {c.staff_name ?? "—"}
                                                </dd>
                                            </div>
                                        </dl>

                                        {canEdit && (
                                            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-gray-100 pt-2 text-sm">
                                                <CaseActions c={c} padded />
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>

                        {/* DESKTOP: table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Case No.</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">ID No.</th>
                                        <th className="px-4 py-3 font-medium">Patient</th>
                                        <th className="px-4 py-3 font-medium">Type</th>
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
                                        const isEmployee = c.patient_type === "employee";
                                        return (
                                            <tr key={c.case_id} className="border-t border-gray-100">
                                                <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
                                                    {c.case_number}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                                    {c.id_number ?? "—"}
                                                </td>
                                                <td className="px-4 py-3 text-gray-900">{fullName(c)}</td>
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <span
                                                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${isEmployee
                                                            ? "bg-amber-300 text-gray-900"
                                                            : "bg-[#15664f] text-white"
                                                            }`}
                                                    >
                                                        {isEmployee ? "Employee" : "Student"}
                                                    </span>
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
                                                            <CaseActions c={c} />
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </section>
        </main>
    );
} 