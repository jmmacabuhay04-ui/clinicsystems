import TabSelect from "@/components/shared/tab-select";
import { redirect } from "next/navigation";
import { CalendarDays, DoorOpen, Files, LogIn, LogOut, UserCheck, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageVisitors } from "@/lib/permissions";
import VisitorForm from "./visitor-form";
import SlipDatePicker from "@/features/referral-slips/components/slip-date-picker";
import { setTimeOut } from "@/features/visitor-logs/actions";

type VisitorRow = {
    visitor_id: number;
    visitor_name: string;
    purpose: string;
    relation: string | null;
    time_in: string;
    time_out: string | null;
    visit_date: Date;
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

const BASE = "/dashboard/visitor-recording";

type Props = {
    searchParams: Promise<{ tab?: string; from?: string; to?: string }>;
};

export default async function VisitorRecordingPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const canEdit = canManageVisitors(session.role);
    const isAdmin = session.role.toLowerCase() === "admin";
    const params = await searchParams;
    // Tab: "today" = Today's Visitors (default), "all" = All Visitors (lahat ng petsa)
    // Admin: All Visitors lang (gaya ng Referral Slips na All Slips lang sa admin)
    const tab = isAdmin || params.tab === "all" ? "all" : "today";

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

    // Petsa: Admin = ngayong araw lang. Ibang role: date picker (default ngayong araw).
    const isDay = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && v <= today;
    const hasRange = !isAdmin && isDay(params.from) && isDay(params.to);
    let from = hasRange ? params.from! : today;
    let to = hasRange ? params.to! : today;
    if (from > to) [from, to] = [to, from];
    // All Visitors na walang napiling petsa: lahat ng petsa
    const filterDates = tab === "today" || hasRange;
    const isToday = filterDates && from === today && to === today;
    const fmt = (v: string, withYear: boolean) =>
        new Date(`${v}T00:00:00Z`).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            ...(withYear ? { year: "numeric" } : {}),
            timeZone: "UTC",
        });
    const rangeLabel = !filterDates ? "All dates" : from === to ? fmt(from, true) : `${fmt(from, from.slice(0, 4) !== to.slice(0, 4))} – ${fmt(to, true)}`;
    const dayOf = (d: Date) =>
        new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

    const visitors = await prisma.$queryRaw<VisitorRow[]>`
    SELECT visitor_id, visitor_name, purpose, relation, time_in, time_out, visit_date
    FROM visitor_logs
    WHERE archived_at IS NULL
      AND (${!filterDates} OR visit_date BETWEEN CAST(${from} AS DATE) AND CAST(${to} AS DATE))
    ORDER BY visit_date DESC, time_in DESC, visitor_id DESC
  `;

    // Bilang sa mga tab
    const countRows = await prisma.$queryRaw<{ today: number; all: number }[]>`
    SELECT COUNT(*) FILTER (WHERE visit_date = CAST(${today} AS DATE))::int AS today,
           COUNT(*)::int AS "all"
    FROM visitor_logs
    WHERE archived_at IS NULL
  `;
    const todayCount = countRows[0]?.today ?? 0;
    const allCount = countRows[0]?.all ?? 0;

    const inside = visitors.filter((v) => !v.time_out).length;
    const checkedOut = visitors.length - inside;

    const stats = [
        { label: isToday ? "Visitors Today" : tab === "all" && !hasRange ? "Total Visitors" : "Visitors", value: visitors.length, icon: Users, bar: "bg-[#15664f]", tile: "bg-[#15664f]/10 text-[#15664f]" },
        { label: "Still Inside", value: inside, icon: DoorOpen, bar: "bg-[#f2b705]", tile: "bg-[#f2b705]/15 text-[#a67c00]" },
        { label: "Checked Out", value: checkedOut, icon: UserCheck, bar: "bg-[#3fae86]", tile: "bg-[#3fae86]/15 text-[#2a8a67]" },
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
                    {/* Admin: petsa ngayong araw. Ibang role: date picker na kapareho ng Illness Alerts. */}
                    {isAdmin ? (
                        <span className="inline-flex items-center gap-2 rounded-lg border-2 border-[#cfe5d9] bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm">
                            <CalendarDays className="h-4 w-4 text-[#15664f]" />
                            {longDate}
                        </span>
                    ) : (
                        <SlipDatePicker from={from} to={to} today={today} label={rangeLabel} basePath={BASE} query={`tab=${tab}`} />
                    )}
                </div>
            </div>

            {/* Tabs: Today's Visitors / All Visitors (kapareho ng Referral Slips) */}
            {/* Dropdown (kapareho ng Reports): Today's Visitors / All Visitors, may bilang. Admin: All Visitors lang. */}
            <TabSelect
                label="Visitor list"
                value={tab}
                options={[
                    { key: "today", label: "Today's Visitors", href: `${BASE}?tab=today`, count: todayCount, icon: <Users /> },
                    { key: "all", label: "All Visitors", href: `${BASE}?tab=all`, count: allCount, icon: <Files /> },
                ].filter((o) => !isAdmin || o.key === "all")}
            />

            {/* Stats */}
            {/* Phone: 3 maliliit na card sa iisang hilera. Mas malaking screen: icon sa kaliwa. (Kapareho ng Clinic Staff) */}
            <section className="grid grid-cols-3 gap-2.5 sm:gap-4">
                {stats.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div
                            key={s.label}
                            className="relative flex min-w-0 flex-col items-start gap-2 overflow-hidden rounded-2xl border border-[#dcebe3] bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:gap-3 sm:p-4"
                        >
                            <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${s.bar}`} />
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${s.tile}`}>
                                <Icon className="h-5 w-5" strokeWidth={1.9} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-2xl font-bold leading-tight text-gray-900 sm:text-[1.75rem]">{s.value}</p>
                                <p className="truncate text-sm font-medium text-gray-600">{s.label}</p>
                            </div>
                        </div>
                    );
                })}
            </section>

            {/* Check-in form: sa Today's Visitors lang (gaya ng Referral Slips) */}
            <div className={`grid gap-6 ${canEdit && tab === "today" ? "xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" : ""}`}>
                {canEdit && tab === "today" && (
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
                        <h2 className="text-lg font-semibold text-gray-900">{tab === "all" ? "All Visitors" : isToday ? "Today\u2019s Visitors" : "Visitors"}</h2>
                        <span className="rounded-full bg-[#eef6f2] px-3 py-1 text-sm font-semibold text-[#15664f]">
                            {visitors.length} visitor{visitors.length === 1 ? "" : "s"}
                        </span>
                    </div>

                    {visitors.length === 0 ? (
                        <div className="flex flex-col items-center border-t border-gray-100 p-10 text-center">
                            <Users className="h-12 w-12 text-[#15664f]/30" />
                            <p className="mt-3 text-base font-semibold text-gray-800">{isToday ? "No visitors logged today" : "No visitors in this period"}</p>
                            <p className="mt-1 text-sm text-gray-600">
                                {canEdit ? "Use the check-in form to log a visitor." : "Visitors will appear here once logged."}
                            </p>
                        </div>
                    ) : (
                        /* Bawat visitor ay card (phone at desktop), kapareho ng Referral Slips:
                           pangalan at status sa itaas, purpose sa gitna, oras at Time Out sa ibaba */
                        <ul className="space-y-3 border-t border-gray-100 p-3 sm:p-4">
                            {visitors.map((v) => {
                                const isInside = !v.time_out;
                                return (
                                    <li key={v.visitor_id} className="rounded-xl border border-[#dcebe3] bg-white p-4 shadow-sm">
                                        {/* Itaas: avatar + pangalan (at relasyon), status sa kanan */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef6f2] text-sm font-semibold uppercase text-[#15664f]">
                                                    {initialsOf(v.visitor_name)}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="break-words font-semibold capitalize text-gray-900">{v.visitor_name}</p>
                                                    {v.relation && <p className="text-sm text-gray-600">{v.relation}</p>}
                                                </div>
                                            </div>
                                            <span
                                                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-0.5 text-sm font-semibold ${isInside ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-700"
                                                    }`}
                                            >
                                                <span className={`h-1.5 w-1.5 rounded-full ${isInside ? "bg-amber-500" : "bg-green-500"}`} />
                                                {isInside ? "Inside" : "Checked out"}
                                            </span>
                                        </div>

                                        {/* Gitna: purpose */}
                                        <div className="mt-3 rounded-lg bg-[#f6faf8] px-3 py-2">
                                            <p className="text-sm text-gray-600">Purpose</p>
                                            <p className="break-words text-sm text-gray-900">{v.purpose || "—"}</p>
                                        </div>

                                        {/* Ibaba: Time In → Time Out (at petsa kapag hindi ngayong araw), Time Out button */}
                                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                            <p className="flex flex-wrap items-center gap-x-2 text-sm text-gray-600">
                                                {!isToday && <span>{dayOf(v.visit_date)} ·</span>}
                                                <span className="inline-flex items-center gap-1">
                                                    <LogIn className="h-4 w-4" />
                                                    {to12Hour(v.time_in)}
                                                </span>
                                                <span aria-hidden>→</span>
                                                <span className="inline-flex items-center gap-1">
                                                    <LogOut className="h-4 w-4" />
                                                    {v.time_out ? to12Hour(v.time_out) : "—"}
                                                </span>
                                            </p>
                                            {isInside && canEdit && (
                                                <form action={setTimeOut}>
                                                    <input type="hidden" name="visitorId" value={v.visitor_id} />
                                                    <input type="hidden" name="timeOut" value={timeNow} />
                                                    <button
                                                        type="submit"
                                                        className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md bg-[#15664f] px-3 text-sm font-semibold text-white hover:bg-[#10523f]"
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