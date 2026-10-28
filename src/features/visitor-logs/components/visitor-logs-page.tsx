import { redirect } from "next/navigation";
import { CalendarDays, Clock, DoorOpen, LogOut, UserCheck, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";
import VisitorForm from "./visitor-form";
import { setTimeOut } from "@/features/visitor-logs/actions";

type VisitorRow = {
    visitor_id: number;
    visitor_name: string;
    purpose: string;
    relation: string | null;
    time_in: string;
    time_out: string | null;
};

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

function to12Hour(value: string | null) {
    if (!value) return "—";
    const [h, m] = value.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function initialsOf(name: string) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return `${first}${last}`.toUpperCase() || "?";
}

export default async function VisitorRecordingPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const canEdit = canManageRecords(session.role);

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

    const longDate = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
    }).format(new Date());

    const timeNow = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Manila",
    }).format(new Date());

    const visitors = await prisma.$queryRaw<VisitorRow[]>`
    SELECT visitor_id, visitor_name, purpose, relation, time_in, time_out
    FROM visitor_logs
    WHERE archived_at IS NULL AND visit_date = CAST(${today} AS DATE)
    ORDER BY time_in DESC, visitor_id DESC
  `;

    const inside = visitors.filter((v) => !v.time_out).length;
    const checkedOut = visitors.length - inside;

    const stats = [
        { label: "Visitors Today", value: visitors.length, icon: Users, tint: "bg-[#eef6f2] text-[#15664f]" },
        { label: "Still Inside", value: inside, icon: DoorOpen, tint: "bg-amber-100 text-amber-700" },
        { label: "Checked Out", value: checkedOut, icon: UserCheck, tint: "bg-green-100 text-green-700" },
    ];

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Visitor Recording</h1>
                        <p className="text-sm text-gray-600">Log clinic visitors and record their time in and time out.</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-lg border-2 border-[#cfe5d9] bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm">
                        <CalendarDays className="h-4 w-4 text-[#15664f]" />
                        {longDate}
                    </span>
                    {!canEdit && (
                        <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-600">View only</span>
                    )}
                </div>
            </div>

            {/* Stats */}
            <section className="grid gap-4 sm:grid-cols-3">
                {stats.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className={`${card} flex items-center gap-4 p-5`}>
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${s.tint}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">{s.label}</p>
                                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                            </div>
                        </div>
                    );
                })}
            </section>

            <div className={`grid gap-6 ${canEdit ? "xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" : ""}`}>
                {/* Check-in form */}
                {canEdit && (
                    <section className={`${card} min-w-0 self-start p-5 md:p-6`}>
                        <div className="mb-5 flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-gray-900">Visitor Check-In</h2>
                        </div>
                        <VisitorForm today={today} timeNow={timeNow} />
                    </section>
                )}

                {/* Today's visitors */}
                <section className={`${card} min-w-0 self-start overflow-hidden`}>
                    <div className="flex items-center justify-between gap-3 p-5 md:px-6">
                        <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Visitors</h2>
                        <span className="rounded-full bg-[#eef6f2] px-3 py-1 text-sm font-semibold text-[#15664f]">
                            {visitors.length} visitor{visitors.length === 1 ? "" : "s"}
                        </span>
                    </div>

                    {visitors.length === 0 ? (
                        <div className="flex flex-col items-center border-t border-gray-100 p-10 text-center">
                            <Users className="h-12 w-12 text-[#15664f]/30" />
                            <p className="mt-3 text-base font-semibold text-gray-800">No visitors logged today</p>
                            <p className="mt-1 text-sm text-gray-600">
                                {canEdit ? "Use the check-in form to log a visitor." : "Visitors will appear here once logged."}
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100 border-t border-gray-100">
                            {visitors.map((v) => {
                                const isInside = !v.time_out;
                                return (
                                    <li key={v.visitor_id} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-[#f6faf8] md:px-6">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef6f2] text-sm font-semibold text-[#15664f]">
                                            {initialsOf(v.visitor_name)}
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="break-words font-semibold text-gray-900">{v.visitor_name}</p>
                                                {v.relation && (
                                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-sm font-medium text-gray-600">
                                                        {v.relation}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="break-words text-sm text-gray-600">{v.purpose}</p>
                                            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-gray-600">
                                                <Clock className="h-3.5 w-3.5" />
                                                {to12Hour(v.time_in)}
                                                <span className="text-gray-300">→</span>
                                                {to12Hour(v.time_out)}
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-2">
                                            <span
                                                className={`rounded-full px-3 py-1 text-sm font-semibold ${isInside ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-700"
                                                    }`}
                                            >
                                                {isInside ? "Inside" : "Checked out"}
                                            </span>
                                            {isInside && canEdit && (
                                                <form action={setTimeOut}>
                                                    <input type="hidden" name="visitorId" value={v.visitor_id} />
                                                    <input type="hidden" name="timeOut" value={timeNow} />
                                                    <button
                                                        type="submit"
                                                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#15664f] bg-white px-3 text-sm font-semibold text-[#15664f] hover:bg-[#eef6f2]"
                                                    >
                                                        <LogOut className="h-3.5 w-3.5" />
                                                        Time Out
                                                    </button>
                                                </form>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </main>
    );
}