import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAccessLogs } from "@/lib/access-log";

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

function formatWhen(value: Date | string) {
    const date = new Date(value);
    return date.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
    });
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
    return (
        <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
            {children}
        </span>
    );
}

export default async function AccessLogsPage() {
    const session = await getSession();

    if (!session) redirect("/login");
    if (session.role !== "admin" && session.role !== "ittech") redirect("/dashboard");

    const logs = await getAccessLogs(300);

    const today = new Date().toDateString();
    const todayCount = logs.filter(
        (l) => new Date(l.created_at).toDateString() === today,
    ).length;
    const viewCount = logs.filter((l) => l.action === "view").length;
    const actors = new Set(logs.map((l) => l.actor_name ?? l.actor_id)).size;

    const summary = [
        { label: "Total Entries", value: logs.length },
        { label: "Today", value: todayCount },
        { label: "Views", value: viewCount },
        { label: "Users", value: actors },
    ];

    return (
        <div className="min-h-screen bg-[#EEEEEE]">
            <div className="mx-auto max-w-7xl min-w-0 space-y-4 p-4 pb-8 md:p-6">
                <div>
                    <h1 className="text-xl font-semibold text-[#15664f] sm:text-2xl">Record Access Logs</h1>
                    <p className="mt-1 text-sm text-gray-700">
                        A trail of every health record viewed or changed. Entries cannot be edited
                        or deleted from within the system.
                    </p>
                </div>

                {/* 2 columns sa mobile, 4 sa sm pataas */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {summary.map((s) => (
                        <div key={s.label} className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-[#15664f]">
                                {s.label}
                            </p>
                            <p className="mt-1 text-2xl font-semibold text-[#15664f]">{s.value}</p>
                        </div>
                    ))}
                </div>

                {logs.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 text-center sm:p-10">
                        <p className="text-sm font-medium text-gray-900">No access recorded yet</p>
                        <p className="mt-1 text-sm text-gray-500">
                            Entries will appear here once someone opens a health record.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* MOBILE: card list (walang horizontal scroll) */}
                        <ul className="space-y-2 md:hidden">
                            {logs.map((log, i) => (
                                <li key={log.id} className="rounded-lg border border-gray-200 bg-white p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="min-w-0 break-words text-sm font-medium text-gray-900">
                                            {log.actor_name ?? `User #${log.actor_id ?? "?"}`}
                                        </p>
                                        <span className="shrink-0 text-xs text-gray-500">#{i + 1}</span>
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

                                    <div className="mt-2 border-t border-gray-100 pt-2 text-sm text-gray-700">
                                        <p className="break-words">
                                            <span className="text-gray-500">Record: </span>
                                            {TYPE_LABELS[log.record_type] ?? log.record_type}
                                        </p>
                                        {log.subject_number ? (
                                            <p className="break-words text-xs text-gray-500">
                                                {log.subject_number}
                                                {log.subject_name ? ` · ${log.subject_name}` : ""}
                                            </p>
                                        ) : log.record_id ? (
                                            <p className="text-xs text-gray-400">
                                                #{log.record_id}
                                                {PERSON_TYPES.has(log.record_type) ? " (deleted)" : ""}
                                            </p>
                                        ) : null}
                                        {log.detail && (
                                            <p className="mt-1 break-words text-gray-600">
                                                <span className="text-gray-500">Details: </span>
                                                {log.detail}
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {/* DESKTOP: table */}
                        <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-gray-600">No.</th>
                                            <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-gray-600">Date &amp; Time</th>
                                            <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-gray-600">User</th>
                                            <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-gray-600">Role</th>
                                            <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-gray-600">Action</th>
                                            <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-gray-600">Record</th>
                                            <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-gray-600">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {logs.map((log, i) => (
                                            <tr key={log.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
                                                <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">
                                                    {formatWhen(log.created_at)}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2.5 font-medium text-gray-900">
                                                    {log.actor_name ?? `User #${log.actor_id ?? "?"}`}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <Pill className={ROLE_STYLES[log.actor_role ?? ""] ?? "bg-gray-100 text-gray-700"}>
                                                        {log.actor_role ?? "unknown"}
                                                    </Pill>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <Pill className={ACTION_STYLES[log.action] ?? "bg-gray-100 text-gray-700"}>
                                                        {log.action}
                                                    </Pill>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">
                                                    <span className="block">
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
                                                <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">
                                                    {log.detail ?? "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                <p className="text-xs text-gray-500">
                    Showing the latest 300 entries. The IP address of every entry is also
                    recorded in the
                    <span className="font-mono"> record_access_logs </span>
                    table for investigations.
                </p>
            </div>
        </div>
    );
}