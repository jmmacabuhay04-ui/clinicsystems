import { redirect } from "next/navigation";
import { Clock, LogOut, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageAccounts } from "@/lib/permissions";
import PasswordForm from "./password-form";
import SessionForm from "./session-form";

type LogRow = {
    log_id: number;
    username: string;
    status: string;
    device: string | null;
    created_at: Date;
};

function formatWhen(date: Date) {
    return new Date(date).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
    });
}

export default async function SettingsPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const isAdmin = canManageAccounts(session.role);

    const user = await prisma.user.findUnique({ where: { user_id: session.userId } });

    const logs = isAdmin
        ? await prisma.$queryRaw<LogRow[]>`
        SELECT log_id, username, status, device, created_at
        FROM login_logs
        ORDER BY created_at DESC
        LIMIT 15
      `
        : await prisma.$queryRaw<LogRow[]>`
        SELECT log_id, username, status, device, created_at
        FROM login_logs
        WHERE username = ${session.username}
        ORDER BY created_at DESC
        LIMIT 15
      `;

    return (
        <main className="space-y-6 p-6 md:p-8">
            <div>
                <h1 className="text-3xl font-semibold text-gray-900">Settings</h1>
                <p className="mt-1 text-gray-600">Manage clinic system settings and configurations</p>
            </div>

            <section className="space-y-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-[#15664f]" />
                        <h2 className="text-lg font-semibold text-gray-900">Security &amp; Access</h2>
                    </div>

                    <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Change Password
                    </p>
                    <div className="mt-4">
                        <PasswordForm />
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-[#15664f]" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Session &amp; Login
                        </p>
                    </div>
                    <div className="mt-4">
                        <SessionForm
                            minutes={user?.session_minutes ?? 60}
                            twoFactor={user?.two_factor ?? false}
                        />
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                    <div className="flex items-center gap-2">
                        <LogOut className="h-5 w-5 text-[#15664f]" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Recent Login Activity
                        </p>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                        {logs.length === 0 ? (
                            <p className="p-8 text-center text-sm text-gray-500">No login activity yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#f2efe9] text-gray-700">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Account</th>
                                            <th className="whitespace-nowrap px-4 py-3 font-medium">Date &amp; Time</th>
                                            <th className="px-4 py-3 font-medium">Device</th>
                                            <th className="px-4 py-3 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((l) => (
                                            <tr key={l.log_id} className="border-t border-gray-100">
                                                <td className="px-4 py-3 text-gray-900">{l.username}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                                    {formatWhen(l.created_at)}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{l.device ?? "—"}</td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${l.status === "success"
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-red-100 text-red-700"
                                                            }`}
                                                    >
                                                        {l.status === "success" ? "Success" : "Failed"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}