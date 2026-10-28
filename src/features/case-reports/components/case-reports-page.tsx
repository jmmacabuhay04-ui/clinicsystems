import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Plus, Search, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";
import ConfirmLink from "@/components/shared/confirm-link";
import AutoSubmitSelect from "@/components/shared/auto-submit-select";
import AutoSubmitInput from "@/components/shared/auto-submit-input";
import ListPagination from "@/components/shared/list-pagination";
import SearchInput from "@/components/shared/search-input";

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
    searchParams: Promise<{ status?: string; type?: string; diagnosis?: string; q?: string; from?: string; to?: string; page?: string }>;
};

const BASE = "/dashboard/health-case-reports";
const PAGE_SIZE = 10;
const STATUSES = ["pending", "referred", "resolved"];
// Mga diagnosis na pagpipilian sa New/Edit Case Report form. Lagi itong nasa Diagnosis filter,
// kahit wala pang case report na may ganitong diagnosis.
const COMMON_DIAGNOSES = [
    "Fever",
    "Headache",
    "Stomachache",
    "Cough and colds",
    "Dizziness",
    "Toothache",
    "Menstrual cramps",
    "Allergy",
    "Wound / Injury",
    "Asthma attack",
];
// Uri ng case: kung kanino ang case report
const TYPES: Record<string, string> = { student: "Student", employee: "Employee" };

const statusStyles: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
    referred: { label: "Referred", className: "bg-red-100 text-red-700" },
    resolved: { label: "Resolved", className: "bg-green-100 text-green-700" },
};

const fieldClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";
const viewBtn =
    "inline-flex h-8 items-center rounded-md bg-[#15664f] px-4 text-sm font-semibold text-white hover:bg-[#10523f]";

function formatDate(date: Date) {
    // YYYY-MM-DD, gaya ng nasa design
    return new Date(date).toISOString().slice(0, 10);
}

function fullName(c: CaseRow) {
    if (!c.last_name && !c.first_name) return "—";
    return `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
}

/** Tinatanggap lang ang YYYY-MM-DD; iba pa ay itinuturing na walang filter. */
function cleanDate(value?: string) {
    const v = (value ?? "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
}

function StatusBadge({ status }: { status: string }) {
    const badge = statusStyles[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
    return (
        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${badge.className}`}>
            {badge.label}
        </span>
    );
}

function TypeBadge({ type }: { type: string }) {
    const isEmployee = type === "employee";
    return (
        <span
            className={`rounded-full px-2 py-0.5 text-sm font-medium ${isEmployee ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
                }`}
        >
            {isEmployee ? "Employee" : "Student"}
        </span>
    );
}

export default async function HealthCaseReportsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const canEdit = canManageRecords(session.role);

    const params = await searchParams;
    const rawStatus = (params.status ?? "").trim().toLowerCase();
    const status = STATUSES.includes(rawStatus) ? rawStatus : "";
    const rawType = (params.type ?? "").trim().toLowerCase();
    const type = rawType in TYPES ? rawType : "";
    // Diagnosis (hal. Fever, Headache). Hindi case-sensitive ang paghahambing.
    const diagnosis = (params.diagnosis ?? "").trim().slice(0, 255);
    const q = (params.q ?? "").trim();
    const from = cleanDate(params.from);
    const to = cleanDate(params.to);
    const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
    const like = `%${q}%`;
    const offset = (page - 1) * PAGE_SIZE;

    // Link na may parehong filters, iba lang ang ilang value.
    const hrefWith = (changes: Record<string, string>) => {
        const current: Record<string, string> = { status, type, diagnosis, q, from, to, ...changes };
        const sp = new URLSearchParams();
        for (const [k, v] of Object.entries(current)) if (v) sp.set(k, v);
        const qs = sp.toString();
        return qs ? `${BASE}?${qs}` : BASE;
    };
    const hrefFor = (p: number) => hrefWith({ page: p > 1 ? String(p) : "" });

    // LEFT JOIN on both sides: a case report belongs to a student OR an
    // employee, and the other column is NULL. Newest date first.
    const [reports, count, diagnosisRows] = await Promise.all([
        prisma.$queryRaw<CaseRow[]>`
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
        AND (${type} = ''
            OR (${type} = 'employee' AND c.employee_id IS NOT NULL)
            OR (${type} = 'student' AND c.employee_id IS NULL))
        AND (${diagnosis} = '' OR LOWER(TRIM(c.complaint)) = LOWER(${diagnosis}))
        AND (${from} = '' OR c.report_date >= CAST(NULLIF(${from}, '') AS DATE))
        AND (${to} = '' OR c.report_date <= CAST(NULLIF(${to}, '') AS DATE))
        AND (${q} = ''
            OR COALESCE(s.last_name, e.last_name) ILIKE ${like}
            OR COALESCE(s.first_name, e.first_name) ILIKE ${like}
            OR COALESCE(s.student_number, e.employee_number) ILIKE ${like}
            OR c.case_number ILIKE ${like}
            OR c.complaint ILIKE ${like})
        ORDER BY c.report_date DESC, c.case_id DESC
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `,
        prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS count
        FROM health_case_reports c
        LEFT JOIN students  s ON s.student_id  = c.student_id
        LEFT JOIN employees e ON e.employee_id = c.employee_id
        WHERE c.archived_at IS NULL
        AND (${status} = '' OR c.status = ${status})
        AND (${type} = ''
            OR (${type} = 'employee' AND c.employee_id IS NOT NULL)
            OR (${type} = 'student' AND c.employee_id IS NULL))
        AND (${diagnosis} = '' OR LOWER(TRIM(c.complaint)) = LOWER(${diagnosis}))
        AND (${from} = '' OR c.report_date >= CAST(NULLIF(${from}, '') AS DATE))
        AND (${to} = '' OR c.report_date <= CAST(NULLIF(${to}, '') AS DATE))
        AND (${q} = ''
            OR COALESCE(s.last_name, e.last_name) ILIKE ${like}
            OR COALESCE(s.first_name, e.first_name) ILIKE ${like}
            OR COALESCE(s.student_number, e.employee_number) ILIKE ${like}
            OR c.case_number ILIKE ${like}
            OR c.complaint ILIKE ${like})
    `,
        // Mga pagpipilian sa Diagnosis filter: lahat ng diagnosis na nasa case reports,
        // pinakamadalas muna (Fever, Headache, atbp.)
        prisma.$queryRaw<{ label: string }[]>`
        SELECT MIN(TRIM(complaint)) AS label
        FROM health_case_reports
        WHERE archived_at IS NULL AND TRIM(complaint) <> ''
        GROUP BY LOWER(TRIM(complaint))
        ORDER BY COUNT(*) DESC, 1
        LIMIT 50
    `,
    ]);
    // Una ang mga diagnosis ng form (Fever, Headache, atbp.), tapos ang iba pang
    // diagnosis na tinype sa mga case report. Walang doble kahit iba ang malaki/maliit na titik.
    const diagnosisOptions: string[] = [];
    for (const d of [...COMMON_DIAGNOSES, ...diagnosisRows.map((r) => r.label)]) {
        if (!diagnosisOptions.some((o) => o.toLowerCase() === d.toLowerCase())) diagnosisOptions.push(d);
    }

    const total = count[0]?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > totalPages) redirect(hrefFor(totalPages));

    const actions = (c: CaseRow) =>
        canEdit ? (
            <div className="flex items-center gap-2">
                <ConfirmLink
                    href={`${BASE}/edit?case=${c.case_id}`}
                    title="Open case report"
                    message={`Open case ${c.case_number} (${c.complaint}) of ${fullName(c)}?`}
                    confirmLabel="Open"
                    className={viewBtn}
                >
                    View
                </ConfirmLink>
            </div>
        ) : (
            <span className="text-sm text-gray-600">—</span>
        );

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Case Reports</h1>
                        <p className="text-sm text-gray-600">Manage and view all case reports.</p>
                    </div>
                </div>

                {canEdit ? (
                    <ConfirmLink
                        href={`${BASE}/new`}
                        title="New case report"
                        message="Create a new health case report? This will be counted in the Weekly Illness Alert Dashboard."
                        confirmLabel="Continue"
                        icon={<Plus className="h-5 w-5" />}
                        className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f]"
                    >
                        <Plus className="h-4 w-4" />
                        New Case Report
                    </ConfirmLink>
                ) : (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-600">View only</span>
                )}
            </div>

            <section className="overflow-hidden rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10">
                {/* Filters */}
                <form
                    method="get"
                    action={BASE}
                    className="grid gap-3 p-4 sm:grid-cols-2 md:items-end md:p-5 xl:grid-cols-[minmax(0,1fr)_auto_10rem_11rem_9rem]"
                >
                    <label className="block space-y-1">
                        <span className="text-sm font-medium text-gray-600">Search</span>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
                            <SearchInput
                                name="q"
                                defaultValue={q}
                                autoComplete="off"
                                placeholder="Name, ID no., case no., or diagnosis..."
                                suppressHydrationWarning
                                className={`${fieldClass} pl-10 pr-3`}
                            />
                        </div>
                    </label>

                    <div className="space-y-1">
                        <span className="block text-sm font-medium text-gray-600">Date Range</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {(["from", "to"] as const).map((key) => {
                                const value = key === "from" ? from : to;
                                return (
                                    <div key={key} className="relative">
                                        <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
                                        <AutoSubmitInput
                                            type="date"
                                            name={key}
                                            defaultValue={value}
                                            aria-label={key === "from" ? "From date" : "To date"}
                                            className={`${fieldClass} relative w-36 cursor-pointer pl-8 pr-6 text-sm [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`}
                                        />
                                        {value && (
                                            <Link
                                                href={hrefWith({ [key]: "", page: "" })}
                                                aria-label="Clear date"
                                                className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2 rounded p-0.5 text-gray-600 hover:bg-gray-100 hover:text-gray-700"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </Link>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <label className="block space-y-1">
                        <span className="text-sm font-medium text-gray-600">Type of Case</span>
                        <AutoSubmitSelect
                            name="type"
                            defaultValue={TYPES[type] ?? ""}
                            options={Object.values(TYPES)}
                            className={`${fieldClass} px-3`}
                        />
                    </label>

                    <label className="block space-y-1">
                        <span className="text-sm font-medium text-gray-600">Diagnosis</span>
                        <AutoSubmitSelect
                            name="diagnosis"
                            defaultValue={diagnosisOptions.find((d) => d.toLowerCase() === diagnosis.toLowerCase()) ?? ""}
                            options={diagnosisOptions}
                            className={`${fieldClass} px-3`}
                        />
                    </label>

                    <label className="block space-y-1">
                        <span className="text-sm font-medium text-gray-600">Status</span>
                        <AutoSubmitSelect
                            name="status"
                            defaultValue={statusStyles[status]?.label ?? ""}
                            options={STATUSES.map((s) => statusStyles[s].label)}
                            className={`${fieldClass} px-3`}
                        />
                    </label>
                </form>

                {reports.length === 0 ? (
                    <p className="border-t border-gray-100 p-8 text-center text-sm text-gray-600">No case reports found.</p>
                ) : (
                    <>
                        {/* MOBILE: card list */}
                        <ul className="space-y-2 border-t border-gray-100 p-3 md:hidden">
                            {reports.map((c) => (
                                <li key={c.case_id} className="rounded-lg border border-gray-200 p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-semibold text-gray-900">{c.case_number}</p>
                                        <StatusBadge status={c.status} />
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <p className="break-words text-sm text-gray-900">{fullName(c)}</p>
                                        <TypeBadge type={c.patient_type} />
                                    </div>
                                    <p className="mt-1 text-sm text-gray-600">{c.complaint}</p>
                                    <p className="text-sm text-gray-600">{formatDate(c.report_date)}</p>
                                    <div className="mt-3">{actions(c)}</div>
                                </li>
                            ))}
                        </ul>

                        {/* DESKTOP: table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="border-y border-gray-200 bg-[#f6faf8] text-gray-600">
                                    <tr>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">Report ID</th>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">Date</th>
                                        <th className="px-5 py-3 font-semibold">Patient Name</th>
                                        <th className="px-5 py-3 font-semibold">Type</th>
                                        <th className="px-5 py-3 font-semibold">Diagnosis</th>
                                        <th className="px-5 py-3 font-semibold">Status</th>
                                        <th className="px-5 py-3 font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.map((c) => (
                                        <tr key={c.case_id} className="border-t border-gray-100 hover:bg-[#f6faf8]">
                                            <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900">{c.case_number}</td>
                                            <td className="whitespace-nowrap px-5 py-4 text-gray-600">{formatDate(c.report_date)}</td>
                                            <td className="px-5 py-4">
                                                <p className="text-gray-900">{fullName(c)}</p>
                                                {c.id_number && <p className="text-sm text-gray-600">{c.id_number}</p>}
                                            </td>
                                            {/* Sariling column ang Type para pantay-pantay ang badge */}
                                            <td className="px-5 py-4">
                                                <TypeBadge type={c.patient_type} />
                                            </td>
                                            <td className="px-5 py-4 text-gray-600">{c.complaint}</td>
                                            <td className="px-5 py-4">
                                                <StatusBadge status={c.status} />
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-4">{actions(c)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                <ListPagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} hrefFor={hrefFor} />
            </section>
        </main>
    );
}