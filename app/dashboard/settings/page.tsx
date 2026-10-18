import { redirect } from "next/navigation";
import { Clock, LogOut, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageAccounts } from "@/lib/permissions";
import PasswordForm from "./password-form";
import SessionForm from "./session-form";
import PortalAvatarForm from "@/components/portal-avatar-form";
import { saveAvatar, removeAvatar } from "./actions";

type LogRow = {
    log_id: number;
    username: string;
    status: string;
    device: string | null;
    created_at: Date;
};

// Mobile: bawat row ay card, at ang data-label ang nagsisilbing label ng bawat field.
// md pataas: normal na table.
const tr =
    "mb-3 block rounded-lg border border-gray-200 py-2 md:mb-0 md:table-row md:rounded-none md:border-0 md:border-t md:border-gray-100 md:py-0";
const td =
    "flex items-start justify-between gap-3 px-4 py-1.5 text-right text-sm before:shrink-0 before:text-left before:text-xs before:font-semibold before:uppercase before:text-gray-500 before:content-[attr(data-label)] md:table-cell md:py-3 md:text-left md:text-base md:before:hidden";

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
        <main className="min-w-0 space-y-6 p-4 md:p-8">
            <div>
                <h1 className="text-2xl font-semibold text-[#15664f] md:text-3xl">Settings</h1>
                <p className="mt-1 text-sm text-gray-700 md:text-base">
                    Manage clinic system settings and configurations
                </p>
            </div>

            {/* Header + profile picture (i-click ang bilog para lumabas ang camera) */}
            <PortalAvatarForm
                current={user?.avatar ?? null}
                initials={session.username.charAt(0).toUpperCase()}
                fullName={session.username}
                subtitle={session.role}
                saveAction={saveAvatar}
                removeAction={removeAvatar}
            />

            <section className="space-y-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
                <div>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-6 w-6 text-[#15664f]" />
                        <h2 className="text-xl font-semibold text-[#15664f]">Security &amp; Access</h2>
                    </div>

                    <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-700">
                        Change Password
                    </p>
                    <div className="mt-4">
                        <PasswordForm />
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                    <div className="flex items-center gap-2">
                        <Clock className="h-6 w-6 text-[#15664f]" />
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#15664f]">
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
                        <LogOut className="h-6 w-6 text-[#15664f]" />
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#15664f]">
                            Recent Login Activity
                        </p>
                    </div>

                    <div className="mt-4 md:overflow-hidden md:rounded-xl md:border md:border-gray-200">
                        {logs.length === 0 ? (
                            <p className="rounded-xl border border-gray-200 p-8 text-center text-base text-gray-500 md:rounded-none md:border-0">
                                No login activity yet.
                            </p>
                        ) : (
                            <div className="md:overflow-x-auto">
                                <table className="block w-full text-left md:table">
                                    <thead className="hidden bg-[#EEEEEE] text-[#15664f] md:table-header-group">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Account</th>
                                            <th className="whitespace-nowrap px-4 py-3 font-medium">Date &amp; Time</th>
                                            <th className="px-4 py-3 font-medium">Device</th>
                                            <th className="px-4 py-3 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="block md:table-row-group">
                                        {logs.map((l) => (
                                            <tr key={l.log_id} className={tr}>
                                                <td data-label="Account" className={`${td} break-all text-gray-900`}>
                                                    {l.username}
                                                </td>
                                                <td data-label="Date & Time" className={`${td} text-gray-700 md:whitespace-nowrap`}>
                                                    {formatWhen(l.created_at)}
                                                </td>
                                                <td data-label="Device" className={`${td} break-words text-gray-600`}>
                                                    {l.device ?? "—"}
                                                </td>
                                                <td data-label="Status" className={td}>
                                                    <span
                                                        className={`rounded-full px-3 py-1 text-sm font-medium ${l.status === "success"
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