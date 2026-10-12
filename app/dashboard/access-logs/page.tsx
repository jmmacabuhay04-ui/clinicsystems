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

    return (
        <div className="min-h-screen bg-[#EEEEEE]">
            <div className="mx-auto max-w-7xl space-y-4 p-6">
                <div>
                    <h1 className="text-2xl font-semibold text-[#15664f]">Record Access Logs</h1>
                    <p className="mt-1 text-sm text-gray-700">
                        A trail of every health record viewed or changed. Entries cannot be edited
                        or deleted from within the system.
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-[#15664f]">
                            Total Entries
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-[#15664f]">{logs.length}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-[#15664f]">
                            Today
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-[#15664f]">{todayCount}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-[#15664f]">
                            Views
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-[#15664f]">{viewCount}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-[#15664f]">
                            Users
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-[#15664f]">{actors}</p>
                    </div>
                </div>

                {logs.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-10 text-center">
                        <p className="text-sm font-medium text-gray-900">No access recorded yet</p>
                        <p className="mt-1 text-sm text-gray-500">
                            Entries will appear here once someone opens a health record.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
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
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLES[log.actor_role ?? ""] ??
                                                        "bg-gray-100 text-gray-700"
                                                        }`}
                                                >
                                                    {log.actor_role ?? "unknown"}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_STYLES[log.action] ??
                                                        "bg-gray-100 text-gray-700"
                                                        }`}
                                                >
                                                    {log.action}
                                                </span>
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