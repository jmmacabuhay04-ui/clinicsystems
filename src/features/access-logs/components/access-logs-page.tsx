import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, FileClock, Lock, ScrollText, Search, Users, X } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getAccessLogs } from "@/lib/access-log";
import AutoSubmitSelect from "@/components/shared/auto-submit-select";
import ListPagination from "@/components/shared/list-pagination";

const BASE = "/dashboard/access-logs";
const PAGE_SIZE = 20;

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

type Props = {
    searchParams: Promise<{ q?: string; action?: string; page?: string }>;
};

const ROLE_STYLES: Record<string, string> = {
    admin: "bg-emerald-100 text-emerald-800",
    doctor: "bg-blue-100 text-blue-800",
    dentist: "bg-cyan-100 text-cyan-800",
    nurse: "bg-rose-100 text-rose-800",
    ittech: "bg-violet-100 text-violet-800",
};

const ACTION_STYLES: Record<string, string> = {
    view: "bg-gray-100 text-gray-700",
    create: "bg-emerald-100 text-emerald-800",
    update: "bg-amber-100 text-amber-800",
    delete: "bg-red-100 text-red-800",
    print: "bg-blue-100 text-blue-800",
    export: "bg-violet-100 text-violet-800",
};

const TYPE_LABELS: Record<string, string> = {
    student_health_record: "Student Health Record",
    employee_health_record: "Employee Health Record",
    dental_record: "Dental Record",
    visit: "Clinic Visit",
    vitals: "Vital Signs",
    health_declaration: "Health Declaration",
    referral_slip: "Referral Slip",
    clinic_staff: "Clinic Staff",
    health_case_report: "Health Case Report",
};

// Only these types point at a student or employee row, so only they can
// be reported as deleted when the join comes back empty. A case report
// stores its own case_id, which will never match a student id.
const PERSON_TYPES = new Set([
    "student_health_record",
    "employee_health_record",
    "visit",
    "vitals",
    "health_declaration",
    "referral_slip",
]);

const TIME_ZONE = "Asia/Manila";

function formatWhen(value: Date | string) {
    const date = new Date(value);
    return date.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: TIME_ZONE,
    });
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
    return (
        <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${className}`}>
            {children}
        </span>
    );
}

export default async function AccessLogsPage({ searchParams }: Props) {
    const session = await getSession();

    if (!session) redirect("/login");
    if (session.role !== "admin" && session.role !== "ittech") redirect("/dashboard");

    const params = await searchParams;
    const q = (params.q ?? "").trim();
    const actionFilter = params.action ?? "";

    const logs = await getAccessLogs(300);

    const viewCount = logs.filter((l) => l.action === "view").length;
    const actors = new Set(logs.map((l) => l.actor_name ?? l.actor_id)).size;

    const summary = [
        { label: "Total Entries", value: logs.length, icon: ScrollText, tint: "bg-[#eef6f2] text-[#15664f]" },
        { label: "Views", value: viewCount, icon: Eye, tint: "bg-blue-50 text-blue-700" },
        { label: "Users", value: actors, icon: Users, tint: "bg-violet-50 text-violet-700" },
    ];

    // Filter (sa loob ng 300 na pinakabagong entry)
    const actionOptions = [...new Set(logs.map((l) => l.action))].sort();
    const needle = q.toLowerCase();
    const filtered = logs.filter((l) => {
        if (actionFilter && l.action !== actionFilter) return false;
        if (!needle) return true;
        return [
            l.actor_name,
            l.actor_role,
            TYPE_LABELS[l.record_type] ?? l.record_type,
            l.subject_number,
            l.subject_name,
            l.detail,
        ]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(needle));
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const page = Math.min(Math.max(1, Number(params.page) || 1), totalPages);
    const offset = (page - 1) * PAGE_SIZE;
    const rows = filtered.slice(offset, offset + PAGE_SIZE);
    const hasFilters = Boolean(q || actionFilter);

    function hrefFor(p: number) {
        const sp = new URLSearchParams();
        if (q) sp.set("q", q);
        if (actionFilter) sp.set("action", actionFilter);
        if (p > 1) sp.set("page", String(p));
        const qs = sp.toString();
        return qs ? `${BASE}?${qs}` : BASE;
    }

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <FileClock className="h-10 w-10 shrink-0 text-[#15664f]" />
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Record Access Logs</h1>
                    <p className="text-sm text-gray-600">A trail of every health record viewed or changed.</p>
                </div>
            </div>

            {/* Read-only notice */}
            <div className="flex items-start gap-3 rounded-xl border-2 border-[#cfe5d9] bg-[#eef6f2] p-4 text-sm">
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[#15664f]" />
                <p className="text-gray-700">
                    <span className="font-semibold text-gray-900">Read-only audit trail.</span> Entries cannot be edited
                    or deleted from within the system.
                </p>
            </div>

            {/* Stats: 2 columns sa mobile, 4 sa lg pataas */}
            <section className="grid grid-cols-3 gap-3 md:gap-4">
                {summary.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div
                            key={s.label}
                            className={`${card} flex min-w-0 flex-col items-start gap-2 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-5`}
                        >
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-11 sm:w-11 ${s.tint}`}>
                                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-xs text-gray-600 sm:text-sm">{s.label}</p>
                                <p className="text-xl font-bold text-gray-900 sm:text-2xl">{s.value}</p>
                            </div>
                        </div>
                    );
                })}
            </section>

            <section className={`${card} min-w-0 overflow-hidden`}>
                {/* Filters */}
                <form method="get" className="flex flex-wrap items-center gap-2 p-4 md:gap-3 md:px-6">
                    <div className="relative min-w-0 flex-1 basis-64">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            name="q"
                            defaultValue={q}
                            autoComplete="off"
                            placeholder="Search user, record, ID number, or details..."
                            suppressHydrationWarning
                            className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-base text-gray-900 outline-none placeholder:text-sm focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20 md:text-sm"
                        />
                    </div>
                    <AutoSubmitSelect
                        name="action"
                        defaultValue={actionFilter}
                        options={actionOptions}
                        allLabel="All actions"
                        className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm capitalize text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                    />
                    <button
                        type="submit"
                        suppressHydrationWarning
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f]"
                    >
                        <Search className="h-4 w-4" />
                        Search
                    </button>
                    {hasFilters && (
                        <Link
                            href={BASE}
                            className="inline-flex h-11 items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            <X className="h-4 w-4" />
                            Clear
                        </Link>
                    )}
                </form>

                {rows.length === 0 ? (
                    <div className="flex flex-col items-center border-t border-gray-100 p-10 text-center">
                        <ScrollText className="h-12 w-12 text-[#15664f]/30" />
                        <p className="mt-3 text-base font-semibold text-gray-800">
                            {hasFilters ? "No entries match your filters" : "No access recorded yet"}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                            {hasFilters
                                ? "Try a different search or action."
                                : "Entries will appear here once someone opens a health record."}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* MOBILE: card list (walang horizontal scroll) */}
                        <ul className="space-y-2 border-t border-gray-100 p-3 md:hidden">
                            {rows.map((log, i) => (
                                <li key={log.id} className="rounded-lg border border-gray-200 p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="min-w-0 break-words text-sm font-semibold text-gray-900">
                                            {log.actor_name ?? `User #${log.actor_id ?? "?"}`}
                                        </p>
                                        <span className="shrink-0 text-xs text-gray-400">#{offset + i + 1}</span>
                                    </div>

                                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                        <Pill className={ROLE_STYLES[log.actor_role ?? ""] ?? "bg-gray-100 text-gray-700"}>
                                            {log.actor_role ?? "unknown"}
                                        </Pill>
                                        <Pill className={ACTION_STYLES[log.action] ?? "bg-gray-100 text-gray-700"}>
                                            {log.action}
                                        </Pill>
                                    </div>

                                    <p className="mt-2 text-xs text-gray-600">{formatWhen(log.created_at)}</p>

                                    <dl className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                                        <div className="flex gap-2 text-sm">
                                            <dt className="w-16 shrink-0 text-gray-500">Record</dt>
                                            <dd className="min-w-0 flex-1 break-words text-gray-900">
                                                {TYPE_LABELS[log.record_type] ?? log.record_type}
                                                {log.subject_number ? (
                                                    <span className="block text-xs text-gray-500">
                                                        {log.subject_number}
                                                        {log.subject_name ? ` · ${log.subject_name}` : ""}
                                                    </span>
                                                ) : log.record_id ? (
                                                    <span className="block text-xs text-gray-400">
                                                        #{log.record_id}
                                                        {PERSON_TYPES.has(log.record_type) ? " (deleted)" : ""}
                                                    </span>
                                                ) : null}
                                            </dd>
                                        </div>
                                        {log.detail && (
                                            <div className="flex gap-2 text-sm">
                                                <dt className="w-16 shrink-0 text-gray-500">Details</dt>
                                                <dd className="min-w-0 flex-1 break-words text-gray-900">{log.detail}</dd>
                                            </div>
                                        )}
                                    </dl>
                                </li>
                            ))}
                        </ul>

                        {/* DESKTOP: table */}
                        <div className="hidden border-t border-gray-100 md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#f6faf8] text-xs uppercase tracking-wide text-gray-600">
                                    <tr>
                                        <th className="whitespace-nowrap px-4 py-3 font-semibold">No.</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-semibold">Date &amp; Time</th>
                                        <th className="px-4 py-3 font-semibold">User</th>
                                        <th className="px-4 py-3 font-semibold">Action</th>
                                        <th className="px-4 py-3 font-semibold">Record</th>
                                        <th className="px-4 py-3 font-semibold">Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((log, i) => (
                                        <tr key={log.id} className="border-t border-gray-100 hover:bg-[#f6faf8]">
                                            <td className="px-4 py-3 align-middle text-gray-400">{offset + i + 1}</td>
                                            <td className="whitespace-nowrap px-4 py-3 align-middle text-gray-700">
                                                {formatWhen(log.created_at)}
                                            </td>
                                            <td className="px-4 py-3 align-middle">
                                                <p className="font-semibold text-gray-900 [overflow-wrap:anywhere]">
                                                    {log.actor_name ?? `User #${log.actor_id ?? "?"}`}
                                                </p>
                                                <div className="mt-1">
                                                    <Pill className={ROLE_STYLES[log.actor_role ?? ""] ?? "bg-gray-100 text-gray-700"}>
                                                        {log.actor_role ?? "unknown"}
                                                    </Pill>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-middle">
                                                <Pill className={ACTION_STYLES[log.action] ?? "bg-gray-100 text-gray-700"}>
                                                    {log.action}
                                                </Pill>
                                            </td>
                                            <td className="px-4 py-3 align-middle text-gray-900">
                                                <span className="block font-medium">
                                                    {TYPE_LABELS[log.record_type] ?? log.record_type}
                                                </span>
                                                {log.subject_number ? (
                                                    <span className="block text-xs text-gray-500">
                                                        {log.subject_number}
                                                        {log.subject_name ? ` · ${log.subject_name}` : ""}
                                                    </span>
                                                ) : log.record_id ? (
                                                    <span className="block text-xs text-gray-400">
                                                        #{log.record_id}
                                                        {PERSON_TYPES.has(log.record_type) ? " (deleted)" : ""}
                                                    </span>
                                                ) : null}
                                            </td>
                                            <td className="px-4 py-3 align-middle text-gray-700">{log.detail ?? "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="border-t border-gray-100 p-4 md:px-6">
                            <ListPagination
                                page={page}
                                totalPages={totalPages}
                                total={filtered.length}
                                pageSize={PAGE_SIZE}
                                hrefFor={hrefFor}
                            />
                        </div>
                    </>
                )}
            </section>

            <p className="text-xs text-gray-500">
                Showing the latest 300 entries. The IP address of every entry is also recorded in the
                <span className="font-mono"> record_access_logs </span>
                table for investigations.
            </p>
        </main>
    );
}