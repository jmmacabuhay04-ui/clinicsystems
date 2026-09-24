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
};

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
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-6xl space-y-4 p-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Record Access Logs</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        A trail of every health record viewed or changed. Entries cannot be edited
                        or deleted from within the system.
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Total Entries
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-gray-900">{logs.length}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Today
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-gray-900">{todayCount}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Views
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-gray-900">{viewCount}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Users
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-gray-900">{actors}</p>
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
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">No.</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">Date & Time</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">User</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">Record</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">Details</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">IP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {logs.map((log, i) => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                                {formatWhen(log.created_at)}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                {log.actor_name ?? `User #${log.actor_id ?? "?"}`}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLES[log.actor_role ?? ""] ??
                                                        "bg-gray-100 text-gray-700"
                                                        }`}
                                                >
                                                    {log.actor_role ?? "unknown"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_STYLES[log.action] ??
                                                        "bg-gray-100 text-gray-700"
                                                        }`}
                                                >
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                {TYPE_LABELS[log.record_type] ?? log.record_type}
                                                {log.record_id ? (
                                                    <span className="text-gray-400"> #{log.record_id}</span>
                                                ) : null}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{log.detail ?? "—"}</td>
                                            <td className="px-4 py-3 text-gray-500">{log.ip ?? "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <p className="text-xs text-gray-500">
                    Showing the latest 300 entries. The full trail lives in the
                    <span className="font-mono"> record_access_logs </span>
                    table.
                </p>
            </div>
        </div>
    );
}