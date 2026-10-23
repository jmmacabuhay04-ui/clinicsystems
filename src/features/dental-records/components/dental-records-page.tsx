import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageDental } from "@/lib/permissions";
import ConfirmLink from "@/components/shared/confirm-link";
import AutoSubmitSelect from "@/components/shared/auto-submit-select";
import ListPagination from "@/components/shared/list-pagination";
import DentalRecordDetail from "@/features/dental-records/components/dental-record-detail";

const BASE = "/dashboard/dental-records";
const PAGE_SIZE = 10;

type DentalRow = {
    dental_id: number;
    visit_date: Date;
    procedure_name: string;
    tooth: string | null;
    dentist_name: string | null;
    status: string;
    patient_type: "student" | "employee";
    patient_number: string;
    last_name: string;
    first_name: string;
    avatar: string | null;
};

type Props = {
    searchParams: Promise<{
        q?: string;
        type?: string;
        status?: string;
        page?: string;
        student?: string;
        employee?: string;
        view?: string;
        record?: string;
        from?: string;
    }>;
};

// Mga status sa database at ang label na ipinapakita.
const STATUS_LABELS: Record<string, string> = { completed: "Completed", "follow-up": "Follow-up" };
const LABEL_TO_STATUS: Record<string, string> = { Completed: "completed", "Follow-up": "follow-up" };

const fieldClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

// Custom tooth icon (walang tooth icon ang lucide)
function ToothIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M7 3C5 3 3.5 4.7 3.5 7C3.5 9 4.3 10.4 4.9 12C5.5 13.7 5.5 15.5 6 17.2C6.4 18.7 7.2 21 8.5 21C10 21 10.1 18.4 10.6 16.7C10.8 16 11.2 15.5 12 15.5C12.8 15.5 13.2 16 13.4 16.7C13.9 18.4 14 21 15.5 21C16.8 21 17.6 18.7 18 17.2C18.5 15.5 18.5 13.7 19.1 12C19.7 10.4 20.5 9 20.5 7C20.5 4.7 19 3 17 3C15.3 3 14.4 4 12 4C9.6 4 8.7 3 7 3Z" />
        </svg>
    );
}

function fmt(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
    });
}

function PatientAvatar({ d }: { d: DentalRow }) {
    if (d.avatar) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={d.avatar}
                alt=""
                className={`h-10 w-10 shrink-0 rounded-full object-cover ring-2 ${d.patient_type === "employee" ? "ring-amber-300" : "ring-[#15664f]/40"
                    }`}
            />
        );
    }
    const initials = `${d.first_name?.[0] ?? ""}${d.last_name?.[0] ?? ""}`.toUpperCase();
    return (
        <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${d.patient_type === "employee" ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
                }`}
        >
            {initials}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const followUp = status === "follow-up";
    return (
        <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${followUp ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-700"
                }`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${followUp ? "bg-amber-500" : "bg-green-500"}`} />
            {followUp ? "Follow-up" : "Completed"}
        </span>
    );
}

export default async function DentalRecordsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const canEdit = canManageDental(session.role);
    const isDentist = String(session.role ?? "").toLowerCase() === "dentist";

    const params = await searchParams;

    // Galing sa dashboard "View": ang isang dental record lang ang ipapakita.
    const recordId = parseInt(params.record ?? "", 10);
    // Saan babalik ang "Back": listahan, health record ng pasyente (Dental Records tab), o dashboard
    const fromKind = params.student ? "student" : params.employee ? "employee" : "";
    const fromNumber = (params.student || params.employee || "").trim();
    const recordBackHref =
        params.from === "list"
            ? BASE
            : params.from === "patient" && fromKind && fromNumber
                ? `/dashboard/${fromKind}-health-records?${fromKind}=${encodeURIComponent(fromNumber)}&tab=dental`
                : "/dashboard";

    if (recordId > 0) {
        // Galing sa listahang ito: babalik sa Dental Records, hindi sa dashboard.
        return (
            <DentalRecordDetail
                dentalId={recordId}
                canEdit={canEdit}
                backHref={recordBackHref}
            />
        );
    }

    const q = (params.q ?? "").trim();
    const like = `%${q}%`;
    const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

    // ?student=<no> or ?employee=<no> with ?view=history (from the dashboard
    // View button) shows only that one person's dental records.
    const historyKind = params.student ? "student" : params.employee ? "employee" : "";
    const patientNumber = (params.student || params.employee || "").trim();
    const historyOnly = (params.view ?? "") === "history" && patientNumber !== "";

    // Filters ng listahan
    const type = patientNumber ? historyKind : params.type === "student" || params.type === "employee" ? params.type : "";
    const status = LABEL_TO_STATUS[params.status ?? ""] ?? (STATUS_LABELS[params.status ?? ""] ? params.status! : "");

    const hrefWith = (changes: Record<string, string>) => {
        const current: Record<string, string> = { q, type, status: status ? STATUS_LABELS[status] : "", ...changes };
        const sp = new URLSearchParams();
        for (const [k, v] of Object.entries(current)) if (v) sp.set(k, v);
        const qs = sp.toString();
        return qs ? `${BASE}?${qs}` : BASE;
    };
    const hrefFor = (p: number) =>
        historyOnly
            ? `${BASE}?${historyKind}=${encodeURIComponent(patientNumber)}&view=history${p > 1 ? `&page=${p}` : ""}`
            : hrefWith({ page: p > 1 ? String(p) : "" });

    const [records, counts] = await Promise.all([
        prisma.$queryRaw<DentalRow[]>`
    SELECT d.dental_id, d.visit_date, d.procedure_name, d.tooth, d.dentist_name, d.status,
           CASE WHEN d.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END AS patient_type,
           COALESCE(s.student_number, e.employee_number) AS patient_number,
           COALESCE(s.last_name, e.last_name) AS last_name,
           COALESCE(s.first_name, e.first_name) AS first_name,
           COALESCE(s.avatar, e.avatar) AS avatar
    FROM dental_records d
    LEFT JOIN students s ON s.student_id = d.student_id
    LEFT JOIN employees e ON e.employee_id = d.employee_id
    WHERE d.archived_at IS NULL
      AND (${q}::text = ''
        OR COALESCE(s.student_number, e.employee_number) ILIKE ${like}
        OR COALESCE(s.last_name, e.last_name) ILIKE ${like}
        OR COALESCE(s.first_name, e.first_name) ILIKE ${like}
        OR d.procedure_name ILIKE ${like})
      AND (${patientNumber}::text = ''
        OR COALESCE(s.student_number, e.employee_number) = ${patientNumber})
      AND (${type}::text = ''
        OR CASE WHEN d.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END = ${type})
      AND (${status}::text = '' OR d.status = ${status})
    ORDER BY d.visit_date DESC, d.dental_id DESC
    LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}
  `,
        // Bilang bawat uri (para sa tabs), ayon sa search at status.
        prisma.$queryRaw<{ patient_type: string; count: number }[]>`
    SELECT CASE WHEN d.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END AS patient_type,
           COUNT(*)::int AS count
    FROM dental_records d
    LEFT JOIN students s ON s.student_id = d.student_id
    LEFT JOIN employees e ON e.employee_id = d.employee_id
    WHERE d.archived_at IS NULL
      AND (${q}::text = ''
        OR COALESCE(s.student_number, e.employee_number) ILIKE ${like}
        OR COALESCE(s.last_name, e.last_name) ILIKE ${like}
        OR COALESCE(s.first_name, e.first_name) ILIKE ${like}
        OR d.procedure_name ILIKE ${like})
      AND (${patientNumber}::text = ''
        OR COALESCE(s.student_number, e.employee_number) = ${patientNumber})
      AND (${status}::text = '' OR d.status = ${status})
    GROUP BY 1
  `,
    ]);

    const countOf = (t: string) => counts.find((c) => c.patient_type === t)?.count ?? 0;
    const allCount = countOf("student") + countOf("employee");
    const total = type ? countOf(type) : allCount;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > totalPages) redirect(hrefFor(totalPages));

    const tabs = [
        { key: "", label: "All", count: allCount, active: "bg-gray-900 text-white" },
        { key: "student", label: "Students", count: countOf("student"), active: "bg-[#15664f] text-white" },
        { key: "employee", label: "Employees", count: countOf("employee"), active: "bg-amber-300 text-gray-900" },
    ];

    const patientName = records[0]
        ? `${records[0].first_name} ${records[0].last_name} (${records[0].patient_number})`
        : patientNumber;

    // Isang button lang: View Record. Nasa loob ng record ang Edit at Archive.
    const actions = (d: DentalRow) => (
        <ConfirmLink
            href={
                // Walang access ang Dentist sa clinic health records, kaya ang dental record mismo ang bubuksan
                isDentist
                    ? `${BASE}?record=${d.dental_id}&from=list`
                    : `/dashboard/${d.patient_type}-health-records?${d.patient_type}=${encodeURIComponent(d.patient_number)}&tab=dental`
            }
            title="View dental record"
            message={`Open the dental record of ${d.first_name} ${d.last_name}? This contains confidential medical information and your access will be recorded.`}
            className="inline-flex h-8 items-center rounded-md bg-[#15664f] px-4 text-xs font-semibold text-white hover:bg-[#10523f]"
        >
            View Record
        </ConfirmLink>
    );

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <ToothIcon className="h-10 w-10 shrink-0 text-[#15664f]" />
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Dental Records</h1>
                        <p className="text-sm text-gray-600">
                            {historyOnly ? `Dental history of ${patientName}.` : "Manage and view dental procedures of students and employees."}
                        </p>
                    </div>
                </div>

                {canEdit ? (
                    <ConfirmLink
                        href={`${BASE}/new`}
                        title="Add dental record"
                        message="Add a new dental record for a student or employee?"
                        confirmLabel="Continue"
                        icon={<Plus className="h-5 w-5" />}
                        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f]"
                    >
                        <Plus className="h-4 w-4" />
                        Add Record
                    </ConfirmLink>
                ) : (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">View only</span>
                )}
            </div>

            {historyOnly && (
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to dashboard
                </Link>
            )}

            <section className="overflow-hidden rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10">
                {!historyOnly && (
                    <div className="space-y-4 p-4 md:p-5">
                        {/* Patient type tabs */}
                        <nav className="flex flex-wrap gap-2" aria-label="Patient type">
                            {tabs.map((t) => {
                                const active = type === t.key;
                                return (
                                    <Link
                                        key={t.label}
                                        href={hrefWith({ type: t.key, page: "" })}
                                        aria-current={active ? "page" : undefined}
                                        className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${active ? t.active : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                                            }`}
                                    >
                                        {t.label}
                                        <span
                                            className={`rounded-full px-1.5 text-xs ${active ? "bg-white/25" : "bg-gray-100 text-gray-600"}`}
                                        >
                                            {t.count}
                                        </span>
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Search + status */}
                        <form method="get" action={BASE} className="grid gap-3 md:grid-cols-[1fr_12rem]">
                            {type && <input type="hidden" name="type" value={type} />}
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    name="q"
                                    defaultValue={q}
                                    autoComplete="off"
                                    placeholder="Search by name, ID number, or procedure..."
                                    suppressHydrationWarning
                                    className={`${fieldClass} pl-10 pr-3`}
                                />
                            </div>
                            <AutoSubmitSelect
                                name="status"
                                defaultValue={status ? STATUS_LABELS[status] : ""}
                                options={Object.values(STATUS_LABELS)}
                                allLabel="All statuses"
                                className={`${fieldClass} px-3`}
                            />
                        </form>
                    </div>
                )}

                {records.length === 0 ? (
                    <p className="border-t border-gray-100 p-8 text-center text-sm text-gray-500">No dental records found.</p>
                ) : (
                    <>
                        {/* MOBILE: card list */}
                        <ul className="space-y-2 border-t border-gray-100 p-3 md:hidden">
                            {records.map((d) => (
                                <li key={d.dental_id} className="rounded-lg border border-gray-200 p-3">
                                    {/* Kapareho ng card sa Student Health Records */}
                                    <div className="flex items-center gap-3">
                                        <PatientAvatar d={d} />
                                        <div className="min-w-0">
                                            <p className="break-words text-sm font-semibold text-gray-900">
                                                {d.first_name} {d.last_name}
                                            </p>
                                            <p className="text-xs text-gray-500">{d.patient_number}</p>
                                        </div>
                                    </div>
                                    <p className="mt-1 text-sm text-gray-700">
                                        {d.procedure_name} · {fmt(d.visit_date)}
                                    </p>
                                    <div className="mt-3">{actions(d)}</div>
                                </li>
                            ))}
                        </ul>

                        {/* DESKTOP: table */}
                        <div className="hidden overflow-x-auto md:block">
                            {/* Kapareho ng table sa Student Health Records */}
                            <table className="w-full text-left text-sm">
                                <thead className="border-y border-gray-200 bg-[#f6faf8] text-gray-700">
                                    <tr>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">ID Number</th>
                                        <th className="px-5 py-3 font-semibold">Full Name</th>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">Visit Date</th>
                                        <th className="px-5 py-3 font-semibold">Procedure</th>
                                        <th className="px-5 py-3 font-semibold">Status</th>
                                        <th className="px-5 py-3 font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map((d) => (
                                        <tr key={d.dental_id} className="border-t border-gray-100 hover:bg-[#f6faf8]">
                                            <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900">{d.patient_number}</td>
                                            <td className="px-5 py-4 text-gray-900">
                                                <div className="flex items-center gap-3">
                                                    <PatientAvatar d={d} />
                                                    <span className="font-medium">
                                                        {d.first_name} {d.last_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-4 text-gray-700">{fmt(d.visit_date)}</td>
                                            <td className="px-5 py-4 text-gray-700">{d.procedure_name}</td>
                                            <td className="px-5 py-4">
                                                <StatusBadge status={d.status} />
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-4">{actions(d)}</td>
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