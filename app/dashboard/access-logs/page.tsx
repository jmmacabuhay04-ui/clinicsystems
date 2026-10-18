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
        <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
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
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            <div>
                <h1 className="text-2xl font-semibold text-[#15664f] md:text-3xl">Record Access Logs</h1>
                <p className="mt-1 text-sm text-gray-700">
                    A trail of every health record viewed or changed. Entries cannot be edited
                    or deleted from within the system.
                </p>
            </div>

            {/* 2 columns sa mobile, 4 sa sm pataas */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4">
                {summary.map((s) => (
                    <div
                        key={s.label}
                        className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5"
                    >
                        <p className="text-sm text-[#15664f] md:text-base">{s.label}</p>
                        <p className="mt-2 text-2xl font-semibold text-[#15664f]">{s.value}</p>
                    </div>
                ))}
            </section>

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {logs.length === 0 ? (
                    <div className="p-6 text-center md:p-8">
                        <p className="text-sm font-medium text-gray-900">No access recorded yet</p>
                        <p className="mt-1 text-sm text-gray-500">
                            Entries will appear here once someone opens a health record.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* MOBILE: card list (walang horizontal scroll) */}
                        <ul className="space-y-2 p-3 md:hidden">
                            {logs.map((log, i) => (
                                <li key={log.id} className="rounded-lg border border-gray-100 p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="min-w-0 break-words text-sm font-semibold text-gray-900">
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
                                                <dd className="min-w-0 flex-1 break-words text-gray-900">
                                                    {log.detail}
                                                </dd>
                                            </div>
                                        )}
                                    </dl>
                                </li>
                            ))}
                        </ul>

                        {/* DESKTOP: table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#EEEEEE] text-[#15664f]">
                                    <tr>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">No.</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Date &amp; Time</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">User</th>
                                        <th className="px-4 py-3 font-medium">Role</th>
                                        <th className="px-4 py-3 font-medium">Action</th>
                                        <th className="px-4 py-3 font-medium">Record</th>
                                        <th className="px-4 py-3 font-medium">Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log, i) => (
                                        <tr key={log.id} className="border-t border-gray-100">
                                            <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                                {formatWhen(log.created_at)}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
                                                {log.actor_name ?? `User #${log.actor_id ?? "?"}`}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Pill className={ROLE_STYLES[log.actor_role ?? ""] ?? "bg-gray-100 text-gray-700"}>
                                                    {log.actor_role ?? "unknown"}
                                                </Pill>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Pill className={ACTION_STYLES[log.action] ?? "bg-gray-100 text-gray-700"}>
                                                    {log.action}
                                                </Pill>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-900">
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
                                            <td className="px-4 py-3 text-gray-700">{log.detail ?? "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </section>

            <p className="text-xs text-gray-500">
                Showing the latest 300 entries. The IP address of every entry is also
                recorded in the
                <span className="font-mono"> record_access_logs </span>
                table for investigations.
            </p>
        </main>
    );
}