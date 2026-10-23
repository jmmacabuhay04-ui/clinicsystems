import { redirect } from "next/navigation";
import { Clock, History, KeyRound, Monitor, Settings } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageAccounts } from "@/lib/permissions";
import PasswordForm from "./password-form";
import SessionForm from "./session-form";
import PortalAvatarForm from "@/components/shared/portal-avatar-form";
import { saveAvatar, removeAvatar } from "@/features/settings/actions";

type LogRow = {
    log_id: number;
    username: string;
    status: string;
    device: string | null;
    created_at: Date;
};

// Mobile: bawat row ay card, at ang data-label ang nagsisilbing label ng bawat field.
// md pataas: normal na table.
const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

const tr =
    "mb-3 block rounded-lg border border-gray-200 py-2 md:mb-0 md:table-row md:rounded-none md:border-0 md:border-t md:border-gray-100 md:py-0 md:hover:bg-[#f6faf8]";
const td =
    "flex items-start justify-between gap-3 px-4 py-1.5 text-right text-sm before:shrink-0 before:text-left before:text-xs before:font-semibold before:uppercase before:text-gray-500 before:content-[attr(data-label)] md:table-cell md:py-3 md:text-left md:align-middle md:before:hidden";

function formatWhen(date: Date) {
    return new Date(date).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Manila",
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

    const failedCount = logs.filter((l) => l.status !== "success").length;

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Settings className="h-10 w-10 shrink-0 text-[#15664f]" />
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Settings</h1>
                    <p className="text-sm text-gray-600">Manage your profile, password, and login security.</p>
                </div>
            </div>

            {/* Profile picture (i-click ang bilog para lumabas ang camera) */}
            <PortalAvatarForm
                current={user?.avatar ?? null}
                initials={session.username.charAt(0).toUpperCase()}
                fullName={session.username}
                subtitle={session.role}
                saveAction={saveAvatar}
                removeAction={removeAvatar}
            />

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Change password */}
                <section className={`${card} min-w-0 p-5 md:p-6`}>
                    <div className="mb-5 flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef6f2] text-[#15664f]">
                            <KeyRound className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
                            <p className="text-sm text-gray-500">Update the password you use to sign in.</p>
                        </div>
                    </div>
                    <PasswordForm />
                </section>

                {/* Session & login */}
                <section className={`${card} min-w-0 self-start p-5 md:p-6`}>
                    <div className="mb-5 flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef6f2] text-[#15664f]">
                            <Clock className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Session &amp; Login</h2>
                            <p className="text-sm text-gray-500">Control auto-logout and two-factor authentication.</p>
                        </div>
                    </div>
                    <SessionForm minutes={user?.session_minutes ?? 60} twoFactor={user?.two_factor ?? false} />
                </section>
            </div>

            {/* Recent login activity */}
            <section className={`${card} min-w-0 overflow-hidden`}>
                <div className="flex flex-wrap items-center justify-between gap-3 p-5 md:px-6">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef6f2] text-[#15664f]">
                            <History className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Recent Login Activity</h2>
                            <p className="text-sm text-gray-500">
                                {isAdmin ? "Latest 15 sign-ins across all accounts." : "Your latest 15 sign-ins."}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#eef6f2] px-3 py-1 text-xs font-semibold text-[#15664f]">
                            {logs.length - failedCount} successful
                        </span>
                        {failedCount > 0 && (
                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                {failedCount} failed
                            </span>
                        )}
                    </div>
                </div>

                {logs.length === 0 ? (
                    <div className="flex flex-col items-center border-t border-gray-100 p-10 text-center">
                        <History className="h-12 w-12 text-[#15664f]/30" />
                        <p className="mt-3 text-sm text-gray-500">No login activity yet.</p>
                    </div>
                ) : (
                    <div className="border-t border-gray-100 p-3 md:overflow-x-auto md:p-0">
                        <table className="block w-full text-left md:table">
                            <thead className="hidden bg-[#f6faf8] text-xs uppercase tracking-wide text-gray-600 md:table-header-group">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Account</th>
                                    <th className="whitespace-nowrap px-4 py-3 font-semibold">Date &amp; Time</th>
                                    <th className="px-4 py-3 font-semibold">Device</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="block md:table-row-group">
                                {logs.map((l) => (
                                    <tr key={l.log_id} className={tr}>
                                        <td data-label="Account" className={`${td} break-all font-medium text-gray-900`}>
                                            {l.username}
                                        </td>
                                        <td data-label="Date & Time" className={`${td} text-gray-700 md:whitespace-nowrap`}>
                                            {formatWhen(l.created_at)}
                                        </td>
                                        <td data-label="Device" className={`${td} break-words text-gray-600`}>
                                            <span className="inline-flex items-center gap-1.5">
                                                <Monitor className="h-4 w-4 shrink-0 text-gray-400" />
                                                {l.device ?? "—"}
                                            </span>
                                        </td>
                                        <td data-label="Status" className={td}>
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${l.status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
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
            </section>
        </main>
    );
}