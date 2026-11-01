import { redirect } from "next/navigation";
import Link from "next/link";
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    BarChart3,
    CalendarDays,
    Briefcase,
    FileText,
    ClipboardList,
    Stethoscope,
    UserPlus,
    Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import ConfirmLink from "@/components/shared/confirm-link";
import UserMenu from "@/components/shared/user-menu";
import NotificationBell from "@/components/shared/notification-bell";
import StudentSearch from "./student-search";
import ReasonTabs from "./reason-tabs";
import AutoSubmitSelect from "@/components/shared/auto-submit-select";
import { staffDisplayName } from "@/lib/display-name";

type VisitRow = {
    record_id: number;
    patient_type: "student" | "employee";
    ref_number: string;
    last_name: string;
    first_name: string;
    complaint: string;
    visit_date: Date;
    avatar: string | null;
};

type DentalRow = {
    dental_id: number;
    ref_number: string;
    last_name: string | null;
    first_name: string | null;
    patient_type: string;
    procedure_name: string;
    visit_date: Date;
    avatar: string | null;
};



// One row per day for the last 7 days (used by the overview chart + distribution).
type WeeklyRow = { day: Date; clinic: bigint; dental: bigint; reports: bigint };

type WeeklyPoint = { label: string; clinic: number; dental: number; reports: number };

type ActivityRow = {
    name: string | null;
    event_date: Date;
    /** Kailan talaga na-save (para sa pagkakasunod) */
    event_time: Date;
    /** Oras sa Pilipinas, hal. "4:19 PM" (kinuwenta sa database) */
    event_clock: string | null;
    /** Complaint / procedure */
    detail: string | null;
    /** Nag-asikaso (attending staff / dentist) */
    staff: string | null;
};

// Mga dahilan ng pagbisita ngayong linggo (para sa "Visit Reasons" donut)
type ReasonRow = { label: string; clinic: bigint; dental: bigint; reports: bigint };
type Reason = { label: string; clinic: number; dental: number; reports: number; value: number };

type ActivityItem = {
    key: string;
    kind: "clinic" | "dental" | "report";
    name: string;
    detail: string;
    staff: string;
    date: Date;
    time: Date;
    clock: string;
};


function PatientAvatar({
    name,
    type,
    avatar,
}: {
    name: string;
    type: "student" | "employee";
    avatar?: string | null;
}) {
    // May picture: ipakita ang picture. Wala: initials.
    if (avatar) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={avatar}
                alt=""
                aria-hidden="true"
                className={`h-8 w-8 shrink-0 rounded-full bg-white object-cover ring-2 ${type === "employee" ? "ring-amber-300" : "ring-[#15664f]/40"}`}
            />
        );
    }

    const initials = name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();

    return (
        <span
            aria-hidden="true"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${type === "employee" ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
                }`}
        >
            {initials}
        </span>
    );
}


// Custom tooth icon (same props as the lucide icons used here).
function ToothIcon({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M7 3C5 3 3.5 4.7 3.5 7C3.5 9 4.3 10.4 4.9 12C5.5 13.7 5.5 15.5 6 17.2C6.4 18.7 7.2 21 8.5 21C10 21 10.1 18.4 10.6 16.7C10.8 16 11.2 15.5 12 15.5C12.8 15.5 13.2 16 13.4 16.7C13.9 18.4 14 21 15.5 21C16.8 21 17.6 18.7 18 17.2C18.5 15.5 18.5 13.7 19.1 12C19.7 10.4 20.5 9 20.5 7C20.5 4.7 19 3 17 3C15.3 3 14.4 4 12 4C9.6 4 8.7 3 7 3Z" />
        </svg>
    );
}

// Kulay ng stat cards: kapareho ng Clinic Visits Overview chart
//   Clinic Visits = dark green (#15664f), Dental = dilaw (#f2b705), Case Reports = light green (#3fae86)
type StatTone = "clinic" | "dental" | "report" | "pending";
const STAT_TONES: Record<StatTone, { bar: string; tile: string }> = {
    clinic: { bar: "bg-[#15664f]", tile: "bg-[#15664f]/10 text-[#15664f]" },
    dental: { bar: "bg-[#f2b705]", tile: "bg-[#f2b705]/15 text-[#a67c00]" },
    report: { bar: "bg-[#3fae86]", tile: "bg-[#3fae86]/15 text-[#2a8a67]" },
    // Lahat ng "Pending" sa system ay pula
    pending: { bar: "bg-red-500", tile: "bg-red-50 text-red-600" },
};

type QuickAction = {
    label: string;
    description: string;
    href: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    // Tailwind classes for the card background/border and the icon tile
    cardClass: string;
    iconClass: string;
};

function QuickActionsSection({
    actions,
    className,
}: {
    actions: QuickAction[];
    className?: string;
}) {
    return (
        <div className={`min-w-0 rounded-2xl border border-[#dcebe3] bg-white p-4 shadow-sm shadow-[#15664f]/5 md:p-5 ${className ?? ""}`}>
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 md:text-lg">
                Quick Actions
            </h2>
            {/* Mga tile na 2 bawat hanay, icon sa itaas at label sa ilalim */}
            <div className="grid grid-cols-2 gap-2.5">
                {actions.map((a) => {
                    const Icon = a.icon;
                    return (
                        <Link
                            key={a.label}
                            href={a.href}
                            title={a.description}
                            className="group flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-xl border border-[#dcebe3] bg-[#f3f9f5] p-2.5 text-center transition hover:-translate-y-0.5 hover:border-[#15664f]/40 hover:bg-[#e6f2eb] hover:shadow-md hover:shadow-[#15664f]/10"
                        >
                            <span
                                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${a.iconClass}`}
                            >
                                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                            </span>
                            <span className="text-sm font-medium leading-tight text-gray-900 group-hover:text-[#15664f]">
                                {a.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

// Listahan ng mga pumunta sa clinic ngayong araw (nasa kanang column, gaya ng "Upcoming" list)
type TodayItem = {
    key: string;
    name: string;
    detail: string;
    type: "student" | "employee";
    kind: "clinic" | "dental";
    avatar: string | null;
    href: string;
    message: string;
};

function TodayList({ items, viewAllHref }: { items: TodayItem[]; viewAllHref: string }) {
    return (
        <CardShell
            title="Today's Visits"
            action={
                <Link href={viewAllHref} className="shrink-0 text-sm font-semibold text-[#15664f] hover:underline">
                    View All
                </Link>
            }
        >
            {items.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                    <Stethoscope className="h-10 w-10 text-[#15664f]/30" />
                    <p className="mt-2 text-sm text-gray-600">No visits today yet.</p>
                </div>
            ) : (
                <ul className="-mx-1 divide-y divide-gray-100">
                    {items.map((item) => (
                        <li key={item.key}>
                            <ConfirmLink
                                href={item.href}
                                title={item.kind === "dental" ? "View dental record" : "View health record"}
                                message={item.message}
                                className="flex items-center gap-3 rounded-lg px-1 py-2.5 hover:bg-[#f6faf8]"
                            >
                                <PatientAvatar name={item.name} type={item.type} avatar={item.avatar} />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-gray-900">{item.name}</span>
                                    <span className="block truncate text-sm capitalize text-gray-600">{item.detail}</span>
                                </span>
                                <span
                                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-medium ${item.kind === "dental"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-[#e3f1e9] text-[#15664f]"
                                        }`}
                                >
                                    {item.kind === "dental" ? "Dental" : "Clinic"}
                                </span>
                            </ConfirmLink>
                        </li>
                    ))}
                </ul>
            )}
        </CardShell>
    );
}

/* ------------------------------------------------------------------ */
/* Overview chart, Visit Distribution, Recent Activity                 */
/* ------------------------------------------------------------------ */

const CLINIC_COLOR = "#15664f";
const DENTAL_COLOR = "#f2b705";
const REPORT_COLOR = "#3fae86";


function CardShell({
    title,
    badge,
    action,
    children,
    className,
    id,
}: {
    id?: string;
    title: string;
    /** Maliit na label sa kanan ng title (hal. "This Week") */
    badge?: string;
    /** Link o button sa kanan ng title (hal. "View All") */
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div id={id} className={`min-w-0 rounded-2xl border border-[#dcebe3] bg-white p-4 shadow-sm shadow-[#15664f]/5 md:p-5 ${className ?? ""}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="min-w-0 truncate text-base font-semibold text-gray-900 md:text-lg">{title}</h2>
                {badge && (
                    <span className="shrink-0 rounded-lg border border-[#dcebe3] bg-[#f6faf8] px-2.5 py-1 text-sm font-medium text-gray-600">
                        {badge}
                    </span>
                )}
                {action}
            </div>
            {children}
        </div>
    );
}

// Makinis na kurba mula sa mga punto (para hindi matulis ang linya)
function smoothPath(pts: [number, number][]) {
    if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : "";
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] ?? pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] ?? p2;
        const t = 0.18;
        const c1x = p1[0] + (p2[0] - p0[0]) * t;
        // Hindi lalampas ang kurba sa pagitan ng dalawang punto (para hindi bumaba sa ilalim ng 0)
        const lo = Math.min(p1[1], p2[1]);
        const hi = Math.max(p1[1], p2[1]);
        const c1y = Math.min(hi, Math.max(lo, p1[1] + (p2[1] - p0[1]) * t));
        const c2x = p2[0] - (p3[0] - p1[0]) * t;
        const c2y = Math.min(hi, Math.max(lo, p2[1] - (p3[1] - p1[1]) * t));
        d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
    }
    return d;
}

function VisitsOverviewChart({
    data,
    showClinic,
    showDental,
    showReports,
    range,
    reasonRange,
}: {
    data: WeeklyPoint[];
    showClinic: boolean;
    showDental: boolean;
    showReports: boolean;
    range: ChartRange;
    reasonRange: ReasonRange;
}) {
    const series = [
        { key: "clinic" as const, label: "Clinic Visits", color: CLINIC_COLOR, show: showClinic },
        { key: "dental" as const, label: "Dental Visits", color: DENTAL_COLOR, show: showDental },
        { key: "reports" as const, label: "Case Reports", color: REPORT_COLOR, show: showReports },
    ].filter((s) => s.show);

    const W = 520;
    const H = 240;
    const L = 34;
    const R = 16;
    const T = 14;
    const B = 30;
    const plotW = W - L - R;
    const plotH = H - T - B;
    const baseY = T + plotH;

    // Laging 5 hati ang gilid (hal. 0, 5, 10, 15, 20, 25), may konting espasyo sa itaas
    const peak = Math.max(0, ...data.flatMap((d) => series.map((s) => d[s.key])));
    const step = Math.max(1, Math.ceil((peak + 1) / 5));
    const yMax = step * 5;
    const ticks = [0, 1, 2, 3, 4, 5].map((i) => i * step);

    const many = data.length > 12; // buwan: maraming araw
    const x = (i: number) => L + (data.length > 1 ? (plotW * i) / (data.length - 1) : plotW / 2);
    const y = (v: number) => T + plotH - (v / yMax) * plotH;

    return (
        <CardShell
            id="clinic-overview"
            title="Clinic Visits Overview"
            className="scroll-mt-6"
            action={
                <form method="get" action="/dashboard#clinic-overview" className="shrink-0">
                    {/* Panatilihin ang napili sa Visit Reasons */}
                    {reasonRange !== "week" && <input type="hidden" name="range" value={reasonRange} />}
                    <AutoSubmitSelect
                        name="chart"
                        defaultValue={range === "week" ? "" : range}
                        options={["month"]}
                        allLabel="This Week"
                        labels={{ month: "This Month" }}
                        className={rangeSelectClass}
                    />
                </form>
            }
        >
            {data.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-600">No visit data yet.</p>
            ) : (
                <>
                    <svg
                        viewBox={`0 0 ${W} ${H}`}
                        className="mx-auto h-auto max-h-[260px] w-full"
                        role="img"
                        aria-label={`Clinic visits, dental visits, and case reports, ${CHART_LABEL[range].toLowerCase()}`}
                    >
                        <defs>
                            <linearGradient id="overview-area" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={series[0]?.color ?? CLINIC_COLOR} stopOpacity={0.32} />
                                <stop offset="100%" stopColor={series[0]?.color ?? CLINIC_COLOR} stopOpacity={0.02} />
                            </linearGradient>
                        </defs>

                        {/* grid + y labels */}
                        {ticks.map((t) => (
                            <g key={t}>
                                <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#edf1ef" strokeWidth={1} />
                                <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize={12} fill="#6b7280">
                                    {t}
                                </text>
                            </g>
                        ))}

                        {/* Malambot na kulay sa ilalim ng unang linya */}
                        {series[0] && (
                            <path
                                d={`${smoothPath(data.map((d, i) => [x(i), y(d[series[0].key])]))} L${x(data.length - 1)},${baseY} L${x(0)},${baseY} Z`}
                                fill="url(#overview-area)"
                            />
                        )}

                        {/* mga linya + tuldok */}
                        {/* Iginuguhit na huli ang pangunahing linya para nasa ibabaw ito */}
                        {[...series].reverse().map((s) => {
                            const si = s.key === series[0]?.key ? 0 : 1;
                            return (
                                <g key={s.key}>
                                    <path
                                        d={smoothPath(data.map((d, i) => [x(i), y(d[s.key])]))}
                                        fill="none"
                                        stroke={s.color}
                                        strokeWidth={si === 0 ? 3 : 2.25}
                                        strokeLinecap="round"
                                    />
                                    {data.map((d, i) => (
                                        <circle
                                            key={i}
                                            cx={x(i)}
                                            cy={y(d[s.key])}
                                            r={many ? 2.5 : si === 0 ? 5 : 4}
                                            fill={s.color}
                                            stroke="#fff"
                                            strokeWidth={1.5}
                                        >
                                            <title>{`${d.label} · ${s.label}: ${d[s.key]}`}</title>
                                        </circle>
                                    ))}
                                </g>
                            );
                        })}

                        {/* x labels (buong petsa, hal. "Oct 27"); buwan = 1, 5, 10, ... lang */}
                        {data.map((d, i) =>
                            many && i !== 0 && (i + 1) % 5 !== 0 ? null : (
                                <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={12} fill="#6b7280">
                                    {d.label}
                                </text>
                            ),
                        )}
                    </svg>

                    {/* Legend sa ibaba */}
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-gray-600">
                        {series.map((s) => (
                            <span key={s.key} className="inline-flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                                {s.label}
                            </span>
                        ))}
                    </div>
                </>
            )}
        </CardShell>
    );
}

// Saklaw ng "Visit Reasons": ngayong linggo (default), ngayong buwan, o ngayong taon
type ReasonRange = "week" | "month" | "year";
const RANGE_LABEL: Record<ReasonRange, string> = { week: "This Week", month: "This Month", year: "This Year" };

function parseRange(v: string | undefined): ReasonRange {
    return v === "month" ? v : "week";
}

// Saklaw ng "Clinic Overview" chart: araw-araw (linggo/buwan) o buwan-buwan (taon)
type ChartRange = "week" | "month" | "year";
const CHART_LABEL: Record<ChartRange, string> = { week: "This Week", month: "This Month", year: "This Year" };

function parseChartRange(v: string | undefined): ChartRange {
    return v === "month" ? v : "week";
}

// Simula, dulo at hakbang ng bawat punto sa chart
function chartBuckets(range: ChartRange, today: string): { from: string; to: string; step: string } {
    const [y] = today.split("-").map(Number);
    if (range === "year") return { from: `${y}-01-01`, to: `${y}-12-01`, step: "1 month" };
    const [from, to] = rangeDates(range, today);
    return { from, to, step: "1 day" };
}

// [from, to] na petsa (YYYY-MM-DD, oras sa Manila)
function rangeDates(range: ReasonRange, today: string): [string, string] {
    const [y, m, d] = today.split("-").map(Number);
    if (range === "year") return [`${y}-01-01`, `${y}-12-31`];
    const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
    if (range === "month") {
        return [fmt(new Date(Date.UTC(y, m - 1, 1))), fmt(new Date(Date.UTC(y, m, 0)))];
    }
    // Lunes hanggang Sabado ng linggong ito
    const base = new Date(Date.UTC(y, m - 1, d));
    const monday = new Date(base);
    monday.setUTCDate(base.getUTCDate() - ((base.getUTCDay() + 6) % 7));
    const saturday = new Date(monday);
    saturday.setUTCDate(monday.getUTCDate() + 5);
    return [fmt(monday), fmt(saturday)];
}

const rangeSelectClass =
    "h-8 cursor-pointer rounded-lg border border-[#dcebe3] bg-[#f6faf8] px-2 text-sm font-medium text-gray-600 outline-none hover:bg-[#eef6f2] focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

function VisitReasons({
    reasons,
    range,
    chartRange,
    showClinic,
    showDental,
    showReports,
}: {
    reasons: Reason[];
    range: ReasonRange;
    chartRange: ChartRange;
    showClinic: boolean;
    showDental: boolean;
    showReports: boolean;
}) {
    const kinds = [
        ...(showClinic ? (["clinic"] as const) : []),
        ...(showDental ? (["dental"] as const) : []),
        ...(showReports ? (["reports"] as const) : []),
    ];

    return (
        <CardShell
            id="visit-reasons"
            title="Visit Reasons"
            className="scroll-mt-6"
            action={
                // Pagpili ng saklaw: kusang nagre-reload ang dashboard pagkapili
                <form method="get" action="/dashboard#visit-reasons" className="shrink-0">
                    {/* Panatilihin ang napili sa Clinic Overview */}
                    {chartRange !== "week" && <input type="hidden" name="chart" value={chartRange} />}
                    <AutoSubmitSelect
                        name="range"
                        defaultValue={range === "week" ? "" : range}
                        options={["month"]}
                        allLabel="This Week"
                        labels={{ month: "This Month" }}
                        className={rangeSelectClass}
                    />
                </form>
            }
        >
            {/* Tabs: All | Clinic | Dental | Case Reports */}
            <ReasonTabs
                reasons={reasons.map(({ label, clinic, dental, reports }) => ({ label, clinic, dental, reports }))}
                kinds={[...kinds]}
                emptyText={`No visits ${RANGE_LABEL[range].toLowerCase()} yet.`}
            />
        </CardShell>
    );
}

function relativeDay(date: Date, today: string) {
    const d = new Date(date).toISOString().slice(0, 10);
    const diff = Math.round((Date.parse(today) - Date.parse(d)) / 86_400_000);
    if (diff <= 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff}d ago`;
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function RecentActivity({
    items,
    today,
    viewAllHref,
    compact = false,
}: {
    items: ActivityItem[];
    today: string;
    viewAllHref: string;
    /** Makitid na bersyon (listahan lang, walang table) para sa kanang column */
    compact?: boolean;
}) {
    const meta = {
        clinic: { icon: Stethoscope, tile: "bg-[#eef6f2] text-[#15664f]", label: "New Clinic Visit" },
        dental: { icon: ToothIcon, tile: "bg-cyan-50 text-cyan-700", label: "New Dental Visit" },
        report: { icon: ClipboardList, tile: "bg-amber-100 text-amber-700", label: "Case Report Created" },
    } as const;

    return (
        <CardShell
            title="Recent Activities"
            action={
                <Link href={viewAllHref} className="shrink-0 text-sm font-semibold text-[#15664f] hover:underline">
                    View All
                </Link>
            }
        >
            {items.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                    <Activity className="h-10 w-10 text-[#15664f]/30" />
                    <p className="mt-2 text-sm text-gray-600">No recent activity.</p>
                </div>
            ) : (
                <>
                    {/* MOBILE (at kanang column): listahan */}
                    <ul className={`-mx-1 divide-y divide-gray-100 ${compact ? "" : "md:hidden"}`}>
                        {items.map((item) => {
                            const m = meta[item.kind];
                            const Icon = m.icon;
                            return (
                                <li key={item.key} className="flex items-center gap-3 px-1 py-2.5">
                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${m.tile}`}>
                                        <Icon className="h-4 w-4" strokeWidth={1.8} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-gray-900">{item.name}</p>
                                        <p className="text-sm text-gray-600">{m.label}</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-sm font-semibold text-gray-600">{item.clock}</p>
                                        <p className="text-sm text-gray-600">{relativeDay(item.date, today)}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    {/* DESKTOP: table */}
                    <div className={`-mx-1 hidden overflow-x-auto ${compact ? "" : "md:block"}`}>
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-100 text-gray-600">
                                <tr>
                                    <th className="whitespace-nowrap px-2 py-2.5 font-semibold">Time</th>
                                    <th className="px-2 py-2.5 font-semibold">Activity</th>
                                    <th className="px-2 py-2.5 font-semibold">Details</th>
                                    <th className="px-2 py-2.5 font-semibold">Staff</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => {
                                    const m = meta[item.kind];
                                    const Icon = m.icon;
                                    return (
                                        <tr key={item.key} className="border-b border-gray-50 last:border-0 hover:bg-[#f6faf8]">
                                            <td className="whitespace-nowrap px-2 py-3 text-gray-600">
                                                {item.clock || "—"}
                                                {relativeDay(item.date, today) !== "Today" && (
                                                    <span className="block text-gray-500">{relativeDay(item.date, today)}</span>
                                                )}
                                            </td>
                                            <td className="px-2 py-3">
                                                <span className="flex items-center gap-2 text-gray-900">
                                                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${m.tile}`}>
                                                        <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                                                    </span>
                                                    {m.label}
                                                </span>
                                            </td>
                                            <td className="px-2 py-3 text-gray-600">
                                                <span className="text-gray-900">{item.name}</span>
                                                {item.detail && <span className="capitalize"> – {item.detail}</span>}
                                            </td>
                                            <td className="px-2 py-3 text-gray-600">{item.staff || "—"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </CardShell>
    );
}

// Sabay-sabay na patakbuhin ang mga query nang walang mabigat na type-checking.
// (Iwas sa "Type instantiation is excessively deep" na error ng Promise.all + Prisma.)
function parallel<T extends readonly unknown[]>(items: { [K in keyof T]: PromiseLike<T[K]> }): Promise<T> {
    return Promise.all(items as unknown as readonly PromiseLike<unknown>[]) as unknown as Promise<T>;
}

async function loadDashboard(
    isDentist: boolean,
    isDoctor: boolean,
    showEmployees: boolean,
    range: ReasonRange = "week",
    chartRange: ChartRange = "week",
) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
    const [reasonFrom, reasonTo] = rangeDates(range, today);
    const chart = chartBuckets(chartRange, today);

    try {
        // Lahat ng bilang sa mga card ay kinukuha sa ISANG query lang (isang biyahe sa database),
        // kaya mas mabilis, lalo na't nasa Singapore ang Supabase.
        type SummaryRow = {
            students: bigint;
            employees: bigint;
            visits_today: bigint;
            pending_reports: bigint;
            dental_today: bigint;
            dental_follow: bigint;
            cases_today: bigint;
        };

        // Lahat ng query ay sabay-sabay sa iisang batch (dati: 4 na magkasunod na batch, 18 queries)
        const [
            summaryRows,
            recentVisits,
            recentDental,
            weekly,
            activityClinicStudent,
            activityClinicEmployee,
            activityDental,
            activityReports,
            reasonRows,
        ] = await parallel<
            [SummaryRow[], VisitRow[], DentalRow[], WeeklyRow[], ActivityRow[], ActivityRow[], ActivityRow[], ActivityRow[], ReasonRow[]]
        >([
            prisma.$queryRaw<SummaryRow[]>`
          SELECT
            (SELECT COUNT(*) FROM students WHERE archived_at IS NULL) AS students,
            (SELECT COUNT(*) FROM employees) AS employees,
            (SELECT COUNT(*) FROM health_records
              WHERE archived_at IS NULL AND visit_date = CAST(${today} AS DATE))
            + (SELECT COUNT(*) FROM employee_health_records
              WHERE archived_at IS NULL AND visit_date = CAST(${today} AS DATE)) AS visits_today,
            (SELECT COUNT(*) FROM health_case_reports
              WHERE archived_at IS NULL AND LOWER(TRIM(status::text)) = 'pending') AS pending_reports,
            (SELECT COUNT(*) FROM dental_records
              WHERE archived_at IS NULL AND CAST(visit_date AS DATE) = CAST(${today} AS DATE)) AS dental_today,
            (SELECT COUNT(*) FROM dental_records
              WHERE archived_at IS NULL AND status = 'follow-up') AS dental_follow,
            (SELECT COUNT(*) FROM health_case_reports
              WHERE archived_at IS NULL AND CAST(report_date AS DATE) = CAST(${today} AS DATE)) AS cases_today
        `,
            isDentist
                ? Promise.resolve([] as VisitRow[])
                : prisma.$queryRaw<VisitRow[]>`
          SELECT v.record_id, v.patient_type, v.ref_number, v.last_name, v.first_name,
                 v.complaint, v.visit_date, v.avatar
          FROM (
            SELECT r.record_id, 'student'::text AS patient_type,
                   s.student_number AS ref_number, s.last_name, s.first_name,
                   r.complaint, r.visit_date, s.avatar
            FROM health_records r
            JOIN students s ON s.student_id = r.student_id
            WHERE r.archived_at IS NULL
              AND r.visit_date = CAST(${today} AS DATE)
            UNION ALL
            SELECT r.record_id, 'employee'::text AS patient_type,
                   e.employee_number AS ref_number, e.last_name, e.first_name,
                   r.complaint, r.visit_date, e.avatar
            FROM employee_health_records r
            JOIN employees e ON e.employee_id = r.employee_id
            WHERE r.archived_at IS NULL
              AND r.visit_date = CAST(${today} AS DATE)
          ) v
          ORDER BY v.visit_date DESC, v.record_id DESC
          LIMIT 8
        `,
            prisma.$queryRaw<DentalRow[]>`
          SELECT d.dental_id,
                 COALESCE(s.student_number, e.employee_number) AS ref_number,
                 COALESCE(s.last_name, e.last_name)            AS last_name,
                 COALESCE(s.first_name, e.first_name)          AS first_name,
                 CASE WHEN d.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END AS patient_type,
                 d.procedure_name,
                 d.visit_date,
                 COALESCE(s.avatar, e.avatar) AS avatar
          FROM dental_records d
          LEFT JOIN students s  ON s.student_id  = d.student_id
          LEFT JOIN employees e ON e.employee_id = d.employee_id
          WHERE d.archived_at IS NULL
            AND CAST(d.visit_date AS DATE) = CAST(${today} AS DATE)
          ORDER BY d.visit_date DESC, d.dental_id DESC
          LIMIT 8
        `,

            // ---- Clinic Overview: bilang kada araw (linggo/buwan) o kada buwan (taon) ----
            prisma.$queryRaw<WeeklyRow[]>`
          WITH b AS (
            SELECT CAST(gs AS DATE) AS s,
                   CAST(gs + CAST(${chart.step} AS INTERVAL) - INTERVAL '1 day' AS DATE) AS e
            FROM generate_series(CAST(${chart.from} AS TIMESTAMP), CAST(${chart.to} AS TIMESTAMP), CAST(${chart.step} AS INTERVAL)) AS gs
          )
          SELECT b.s AS day,
                 CAST(
                   (SELECT COUNT(*) FROM health_records
                     WHERE archived_at IS NULL AND CAST(visit_date AS DATE) BETWEEN b.s AND b.e)
                   +
                   (SELECT COUNT(*) FROM employee_health_records
                     WHERE archived_at IS NULL AND CAST(visit_date AS DATE) BETWEEN b.s AND b.e)
                 AS BIGINT) AS clinic,
                 CAST(
                   (SELECT COUNT(*) FROM dental_records
                     WHERE archived_at IS NULL AND CAST(visit_date AS DATE) BETWEEN b.s AND b.e)
                 AS BIGINT) AS dental,
                 CAST(
                   (SELECT COUNT(*) FROM health_case_reports
                     WHERE archived_at IS NULL AND CAST(report_date AS DATE) BETWEEN b.s AND b.e)
                 AS BIGINT) AS reports
          FROM b
          ORDER BY b.s ASC
        `,
            // ---- recent activity feed (role-aware, newest first) ----
            isDentist
                ? Promise.resolve([] as ActivityRow[])
                : prisma.$queryRaw<ActivityRow[]>`
          SELECT TRIM(s.first_name || ' ' || s.last_name) AS name,
                 CAST(r.visit_date AS DATE) AS event_date,
                 r.created_at AS event_time,
                 to_char((r.created_at AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE 'Asia/Manila',
                         'FMHH12:MI AM') AS event_clock,
                 r.complaint AS detail, r.attending_staff AS staff
          FROM health_records r
          JOIN students s ON s.student_id = r.student_id
          WHERE r.archived_at IS NULL
          ORDER BY r.created_at DESC
          LIMIT 5
        `,
            isDentist
                ? Promise.resolve([] as ActivityRow[])
                : prisma.$queryRaw<ActivityRow[]>`
          SELECT TRIM(e.first_name || ' ' || e.last_name) AS name,
                 CAST(r.visit_date AS DATE) AS event_date,
                 r.created_at AS event_time,
                 to_char((r.created_at AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE 'Asia/Manila',
                         'FMHH12:MI AM') AS event_clock,
                 r.complaint AS detail, r.attending_staff AS staff
          FROM employee_health_records r
          JOIN employees e ON e.employee_id = r.employee_id
          WHERE r.archived_at IS NULL
          ORDER BY r.created_at DESC
          LIMIT 5
        `,
            isDoctor
                ? Promise.resolve([] as ActivityRow[])
                : prisma.$queryRaw<ActivityRow[]>`
          SELECT TRIM(COALESCE(s.first_name, e.first_name) || ' ' || COALESCE(s.last_name, e.last_name)) AS name,
                 CAST(d.visit_date AS DATE) AS event_date,
                 d.created_at AS event_time,
                 to_char((d.created_at AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE 'Asia/Manila',
                         'FMHH12:MI AM') AS event_clock,
                 d.procedure_name AS detail, d.dentist_name AS staff
          FROM dental_records d
          LEFT JOIN students s  ON s.student_id  = d.student_id
          LEFT JOIN employees e ON e.employee_id = d.employee_id
          WHERE d.archived_at IS NULL
          ORDER BY d.created_at DESC
          LIMIT 5
        `,
            isDentist
                ? Promise.resolve([] as ActivityRow[])
                : prisma.$queryRaw<ActivityRow[]>`
          SELECT TRIM(COALESCE(s.first_name, e.first_name) || ' ' || COALESCE(s.last_name, e.last_name)) AS name,
                 CAST(h.report_date AS DATE) AS event_date,
                 h.created_at AS event_time,
                 to_char((h.created_at AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE 'Asia/Manila',
                         'FMHH12:MI AM') AS event_clock,
                 h.complaint AS detail, h.staff_name AS staff
          FROM health_case_reports h
          LEFT JOIN students s  ON s.student_id  = h.student_id
          LEFT JOIN employees e ON e.employee_id = h.employee_id
          WHERE h.archived_at IS NULL
          ORDER BY h.created_at DESC
          LIMIT 5
        `,
            // ---- Visit Reasons (This Week = Mon -> Sat o This Month) ----
            // Kapareho ng Clinic Overview: clinic visits + dental visits + case reports,
            // pero naka-grupo ayon sa dahilan (complaint / dental procedure).
            // Doctor: walang dental. Dentist: dental lang.
            prisma.$queryRaw<ReasonRow[]>`
          SELECT MIN(TRIM(u.reason)) AS label,
                 CAST(COUNT(*) FILTER (WHERE u.src = 'clinic') AS BIGINT) AS clinic,
                 CAST(COUNT(*) FILTER (WHERE u.src = 'dental') AS BIGINT) AS dental,
                 CAST(COUNT(*) FILTER (WHERE u.src = 'reports') AS BIGINT) AS reports
          FROM (
            SELECT 'clinic' AS src, complaint AS reason, visit_date AS day
            FROM health_records WHERE archived_at IS NULL AND ${!isDentist}
            UNION ALL
            SELECT 'clinic', complaint, visit_date
            FROM employee_health_records WHERE archived_at IS NULL AND ${!isDentist}
            UNION ALL
            SELECT 'dental', procedure_name, visit_date
            FROM dental_records WHERE archived_at IS NULL AND ${!isDoctor}
            UNION ALL
            SELECT 'reports', complaint, report_date
            FROM health_case_reports WHERE archived_at IS NULL AND ${!isDentist}
          ) u
          WHERE TRIM(COALESCE(u.reason, '')) <> ''
            AND CAST(u.day AS DATE) BETWEEN CAST(${reasonFrom} AS DATE) AND CAST(${reasonTo} AS DATE)
          GROUP BY LOWER(TRIM(u.reason))
          ORDER BY COUNT(*) DESC, label ASC
        `,
        ]);

        const weeklyPoints: WeeklyPoint[] = weekly.map((w) => ({
            // Buong petsa: Oct 26, Oct 27, ...
            label: new Date(w.day).toLocaleDateString(
                "en-US",
                chartRange === "year" ? { month: "short", timeZone: "UTC" } : { month: "short", day: "numeric", timeZone: "UTC" },
            ),
            clinic: Number(w.clinic),
            dental: Number(w.dental),
            reports: Number(w.reports),
        }));

        // `source` keeps keys unique even when two lists share the same kind
        // (e.g. student + employee clinic visits).
        const toItems = (
            rows: ActivityRow[],
            kind: ActivityItem["kind"],
            source: string,
        ): ActivityItem[] =>
            rows.map((r, i) => ({
                key: `${source}-${i}-${new Date(r.event_date).toISOString()}`,
                kind,
                name: r.name?.trim() || "Unknown",
                date: r.event_date,
                time: r.event_time,
                clock: r.event_clock ?? "",
                detail: r.detail?.trim() ?? "",
                staff: r.staff?.trim() ?? "",
            }));

        const clinicItems = [
            ...toItems(activityClinicStudent, "clinic", "clinic-student"),
            ...toItems(activityClinicEmployee, "clinic", "clinic-employee"),
        ];
        // Bawat clinic visit ay awtomatikong gumagawa ng case report (sabay na sine-save).
        // Huwag nang ipakita ang case report na iyon para hindi doble sa Recent Activity.
        const autoReport = (r: ActivityItem) =>
            clinicItems.some(
                (c) =>
                    c.name === r.name &&
                    Math.abs(new Date(c.time).getTime() - new Date(r.time).getTime()) < 60_000,
            );

        const activity = [
            ...clinicItems,
            ...toItems(activityDental, "dental", "dental"),
            ...toItems(activityReports, "report", "report").filter((r) => !autoReport(r)),
        ]
            // Pinakabagong na-save muna (may oras)
            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
            .slice(0, 5);

        const sum = summaryRows[0];
        const n = (v: bigint | undefined) => Number(v ?? 0);

        return {
            today,
            dentalFollowUps: n(sum?.dental_follow),
            casesToday: n(sum?.cases_today),
            totalStudents: n(sum?.students),
            totalEmployees: showEmployees ? n(sum?.employees) : 0,
            visitsToday: isDentist ? 0 : n(sum?.visits_today),
            pendingReports: n(sum?.pending_reports),
            dentalToday: n(sum?.dental_today),
            recentVisits,
            recentDental,
            weeklyPoints,
            activity,
            reasons: reasonRows.map((r): Reason => {
                const clinic = Number(r.clinic);
                const dental = Number(r.dental);
                const reports = Number(r.reports);
                return { label: r.label, clinic, dental, reports, value: clinic + dental + reports };
            }),
        };
    } catch (err) {
        console.error("Dashboard error:", err);
        return {
            today,
            dentalFollowUps: 0,
            casesToday: 0,
            totalStudents: 0,
            totalEmployees: 0,
            visitsToday: 0,
            pendingReports: 0,
            dentalToday: 0,
            recentVisits: [] as VisitRow[],
            recentDental: [] as DentalRow[],
            weeklyPoints: [] as WeeklyPoint[],
            activity: [] as ActivityItem[],
            reasons: [] as Reason[],
        };
    }
}

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ range?: string; chart?: string }>;
}) {
    const { range: rangeParam, chart: chartParam } = await searchParams;
    const reasonRange = parseRange(rangeParam);
    const chartRange = parseChartRange(chartParam);
    const session = await getSession();
    if (!session) redirect("/login");

    // Doctors do not handle dental records; dentists do not see clinic records.
    const role = String(session.role ?? "").toLowerCase();

    const isDoctor = role === "doctor";
    const isDentist = role === "dentist";

    // Total Employees: admin, nurse, doctor, dentist
    const showEmployees =
        role === "admin" ||
        role === "administrator" ||
        role === "nurse" ||
        role === "doctor" ||
        role === "dentist";

    // Greeting based on the current hour in Manila.
    const hour =
        Number(
            new Intl.DateTimeFormat("en-US", {
                hour: "numeric",
                hour12: false,
                timeZone: "Asia/Manila",
            }).format(new Date()),
        ) % 24;
    const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
    const ROLE_NAMES: Record<string, string> = {
        admin: "Admin",
        administrator: "Admin",
        ittech: "IT Technician",
        nurse: "Nurse",
        doctor: "Doctor",
        dentist: "Dentist",
    };
    const roleName = ROLE_NAMES[role] ?? (role ? role.charAt(0).toUpperCase() + role.slice(1) : "");
    // Pangalan mula sa username (hal. "santos@bcas.edu.ph" -> "Santos"); "Dr." para sa doctor/dentist
    // Display Name mula sa Settings; kung wala pa, galing sa email
    const me = await prisma.user
        .findUnique({ where: { user_id: session.userId }, select: { avatar: true, full_name: true } })
        .catch(() => null);
    const displayName = staffDisplayName(me?.full_name, String(session.username ?? ""), role) || roleName;
    const baseName = displayName.replace(/^Dr\.?\s*/i, "");
    const dateToday = new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
    }).format(new Date());
    const weekdayToday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Manila" }).format(new Date());

    const isItTech = role === "ittech";

    // Pagbati sa itaas: pangalan at petsa (makikita ng lahat ng role)
    // Pagbati sa itaas: pangalan at petsa (makikita ng lahat ng role)
    const banner = (
        // Kaliwa: madilim na green na may puting text. Kanan: litrato ng BCAS (public/banner.jpg)
        // na unti-unting lumilitaw, BCAS logo at mga dahon.
        <section
            className="relative overflow-hidden rounded-2xl bg-[#10523f] px-5 py-3.5 text-white shadow-lg shadow-[#15664f]/20 sm:px-6 sm:py-4"
            style={{
                backgroundImage:
                    "linear-gradient(90deg, rgba(16,82,63,1) 0%, rgba(16,82,63,0.97) 40%, rgba(21,102,79,0.35) 70%, rgba(21,102,79,0.05) 100%), url('/banner.jpg')",
                backgroundSize: "100% 100%, 62% auto",
                backgroundPosition: "center, right 50%",
                backgroundRepeat: "no-repeat",
            }}
        >
            {/* Kanan: BCAS logo at mga dahon (malaking screen lang) */}
            <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-36 items-center justify-center lg:flex">
                {/* Malinis na bilog na logo (clip-path); anino nasa lalagyan */}
                <span className="relative drop-shadow-[0_10px_14px_rgba(0,0,0,0.45)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/bcas.jpg"
                        alt=""
                        className="block h-20 w-20 rounded-full bg-white object-cover [clip-path:circle(49%)]"
                    />
                </span>
                <svg viewBox="0 0 120 120" className="absolute -bottom-4 -right-2 h-24 w-24 text-[#3fae86]/60">
                    <path d="M20 118 C 14 80, 30 46, 70 30 C 74 68, 58 100, 20 118 Z" fill="currentColor" />
                    <path d="M58 120 C 60 88, 84 64, 118 58 C 116 92, 96 114, 58 120 Z" fill="currentColor" opacity="0.8" />
                </svg>
            </div>

            <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:gap-10 lg:pr-40">
                {/* Kaliwa: pagbati, pangalan at petsa */}
                <div className="min-w-0 md:w-80 md:shrink-0">
                    {/* Pagbati sa itaas, pangalan sa ibaba */}
                    <p className="text-lg font-semibold text-white md:text-xl">{greeting},</p>
                    <h1 className="break-words text-2xl font-bold leading-tight text-amber-300 md:text-3xl">
                        {displayName ? `${displayName}!` : "Welcome!"}
                    </h1>
                    <p className="mt-2 flex items-center gap-2 text-base text-white/90">
                        <CalendarDays className="h-5 w-5" strokeWidth={1.8} />
                        <span className="font-semibold text-white">{dateToday}</span>
                        <span className="text-white/85">· {weekdayToday}</span>
                    </p>
                </div>

                {/* Gitna: quote na may dilaw na guhit sa ilalim */}
                <div className="hidden text-lg italic leading-snug text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.45)] md:block">
                    <p>
                        <span className="text-amber-300">&ldquo;</span>A healthy student
                        <br />
                        <span className="pl-4">is a successful learner.</span>
                        <span className="text-amber-300">&rdquo;</span>
                    </p>
                    <svg aria-hidden viewBox="0 0 200 14" className="ml-8 mt-1 h-3 w-48">
                        <path d="M2 10 C 60 2, 140 2, 198 7" fill="none" stroke="#f2c94c" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                </div>
            </div>
        </section>
    );

    // IT Technician: welcome banner lang ang makikita (walang clinic data)
    if (isItTech) {
        return <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">{banner}</main>;
    }

    const data = await loadDashboard(isDentist, isDoctor, showEmployees, reasonRange, chartRange);

    // Mga card sa itaas. "hint" = maliit na paliwanag sa ibaba.
    // "alert" = may babala kapag may laman (hal. Pending: Needs attention).
    const stats: {
        label: string;
        value: number;
        icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
        tone: StatTone;
        /** Maliit na paliwanag sa ilalim ng numero */
        hint?: string;
        alert?: boolean;
    }[] = [
            {
                label: "Total Students",
                value: data.totalStudents,
                icon: Users,
                tone: "clinic",
                hint: "Active students",
            },
            ...(showEmployees
                ? [
                    {
                        label: "Total Employees",
                        value: data.totalEmployees,
                        icon: Briefcase,
                        tone: "dental" as const,
                        hint: "Registered staff",
                    },
                ]
                : []),
            ...(isDentist
                ? []
                : [
                    {
                        label: "Clinic Visits Today",
                        value: data.visitsToday,
                        icon: Stethoscope,
                        tone: "clinic" as const,
                        hint: "Recorded today",
                    },
                ]),
            ...(isDoctor
                ? []
                : [
                    {
                        label: "Dental Visits Today",
                        value: data.dentalToday,
                        icon: ToothIcon,
                        tone: "dental" as const,
                        hint: "Recorded today",
                    },
                ]),
            ...(isDentist
                ? []
                : [
                    {
                        label: "Case Reports",
                        value: data.casesToday,
                        icon: ClipboardList,
                        tone: "clinic" as const,
                        hint: "Reported today",
                    },
                ]),
            // Pending: Doctor = case reports | Dentist = dental follow-ups | Nurse/Admin = pareho
            {
                label: isDoctor ? "Pending Reports" : isDentist ? "Pending Follow-ups" : "Pending",
                value: isDoctor
                    ? data.pendingReports
                    : isDentist
                        ? data.dentalFollowUps
                        : data.pendingReports + data.dentalFollowUps,
                icon: FileText,
                tone: "pending",
                alert: true,
            },
        ];


    // Iisang kulay ang icon ng lahat ng Quick Action tile (green, nagiging solid kapag hover)
    const TILE_ICON = "bg-white text-[#15664f] shadow-sm ring-1 ring-[#dcebe3] group-hover:bg-[#15664f] group-hover:text-white group-hover:ring-[#15664f]";

    // NOTE: adjust the href values below to match your actual routes.
    // Add Student / Add Employee: nurse lang (wala sa doctor at dentist)
    const canAddPeople = role === "nurse";
    const quickActions: QuickAction[] = [
        ...(canAddPeople
            ? [
                {
                    label: "Add Student",
                    description: "Register a new student",
                    href: "/dashboard/students/new",
                    icon: UserPlus,
                    cardClass:
                        "border-gray-100 bg-white hover:border-[#15664f]/30 hover:bg-[#eef6f2] hover:shadow-md hover:shadow-[#15664f]/10",
                    iconClass: TILE_ICON,
                },
            ]
            : []),
        ...(canAddPeople && showEmployees
            ? [
                {
                    label: "Add Employee",
                    description: "Register a new employee",
                    href: "/dashboard/employees/new",
                    icon: Briefcase,
                    cardClass:
                        "border-gray-100 bg-white hover:border-[#15664f]/30 hover:bg-[#eef6f2] hover:shadow-md hover:shadow-[#15664f]/10",
                    iconClass: TILE_ICON,
                },
            ]
            : []),
        ...(isDentist
            ? []
            : [
                {
                    label: "Log Clinic Visit",
                    description: "Record a new visit",
                    href: "/dashboard/student-health-records/new",
                    icon: Stethoscope,
                    cardClass: "border-gray-100 bg-white hover:border-[#15664f]/30 hover:bg-[#eef6f2] hover:shadow-md hover:shadow-[#15664f]/10",
                    iconClass: TILE_ICON,
                },
                // Doctors do not handle dental records.
                ...(isDoctor
                    ? []
                    : [
                        {
                            label: "Add Dental",
                            description: "Record a new dental visit",
                            // TODO: i-check kung tama ang route na ito
                            href: "/dashboard/dental-records/new",
                            icon: ToothIcon,
                            cardClass: "border-gray-100 bg-white hover:border-[#15664f]/30 hover:bg-[#eef6f2] hover:shadow-md hover:shadow-[#15664f]/10",
                            iconClass: TILE_ICON,
                        },
                    ]),

                {
                    label: "New Case Report",
                    description: "Create a case report",
                    href: "/dashboard/health-case-reports/new",
                    icon: ClipboardList,
                    cardClass: "border-gray-100 bg-white hover:border-[#15664f]/30 hover:bg-[#eef6f2] hover:shadow-md hover:shadow-[#15664f]/10",
                    iconClass: TILE_ICON,
                },
            ]),
        // Dentist: dental lang
        ...(isDentist
            ? [
                {
                    label: "Add Dental",
                    description: "Record a new dental visit",
                    href: "/dashboard/dental-records/new",
                    icon: ToothIcon,
                    cardClass:
                        "border-gray-100 bg-white hover:border-[#15664f]/30 hover:bg-[#eef6f2] hover:shadow-md hover:shadow-[#15664f]/10",
                    iconClass: TILE_ICON,
                },
                {
                    // Dentist: listahan ng mga dental visit (hindi maa-access ng dentist ang Illness Alerts)
                    label: "View Reports",
                    description: "View dental visit reports",
                    href: "/dashboard/dental-visits",
                    icon: BarChart3,
                    cardClass:
                        "border-gray-100 bg-white hover:border-[#15664f]/30 hover:bg-[#eef6f2] hover:shadow-md hover:shadow-[#15664f]/10",
                    iconClass: TILE_ICON,
                },
            ]
            : [
                // Illness Alerts: hindi para sa dentist
                {
                    label: "View Reports",
                    description: "Generate and view reports",
                    href: "/dashboard/illness-alerts",
                    icon: BarChart3,
                    cardClass:
                        "border-gray-100 bg-white hover:border-[#15664f]/30 hover:bg-[#eef6f2] hover:shadow-md hover:shadow-[#15664f]/10",
                    iconClass: TILE_ICON,
                },
            ]),
    ];

    // Mga pumunta ngayong araw (clinic + dental), para sa "Today's Visits" sa kanan
    const todayItems: TodayItem[] = [
        ...(isDentist
            ? []
            : data.recentVisits.map((v) => {
                const name = `${v.first_name} ${v.last_name}`;
                return {
                    key: `clinic-${v.patient_type}-${v.record_id}`,
                    name,
                    detail: v.complaint,
                    type: v.patient_type,
                    kind: "clinic" as const,
                    avatar: v.avatar,
                    href:
                        v.patient_type === "employee"
                            ? `/dashboard/employee-health-records?employee=${encodeURIComponent(v.ref_number)}&view=history&record=${v.record_id}`
                            : `/dashboard/student-health-records?student=${encodeURIComponent(v.ref_number)}&view=history&record=${v.record_id}`,
                    message: `Open the health record of ${name}? This contains confidential medical information and your access will be recorded.`,
                };
            })),
        ...(isDoctor
            ? []
            : data.recentDental.map((d) => {
                const name = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "Unknown";
                const type: "student" | "employee" = d.patient_type === "employee" ? "employee" : "student";
                return {
                    key: `dental-${d.patient_type}-${d.dental_id}`,
                    name,
                    detail: d.procedure_name,
                    type,
                    kind: "dental" as const,
                    avatar: d.avatar,
                    href:
                        type === "employee"
                            ? `/dashboard/dental-records?employee=${encodeURIComponent(d.ref_number)}&view=history&record=${d.dental_id}`
                            : `/dashboard/dental-records?student=${encodeURIComponent(d.ref_number)}&view=history&record=${d.dental_id}`,
                    message: `Open the dental record of ${name}? This contains confidential medical information and your access will be recorded.`,
                };
            })),
    ].slice(0, 6);

    // Search sa itaas (student at employee): dentist -> dental records, iba -> health record
    const studentHrefBase = isDentist ? "/dashboard/dental-records?student=" : "/dashboard/student-health-records?student=";
    const employeeHrefBase = isDentist ? "/dashboard/dental-records?employee=" : "/dashboard/employee-health-records?employee=";
    const initials = (baseName || "U").charAt(0).toUpperCase();

    // Top bar (desktop/tablet): search, notification bell (pending reports) at user
    const topBar = (
        // Phone: search + bell + larawan lang (walang pangalan) para kasya
        <header className="flex items-center gap-2 md:gap-3">
            {/* Student at employee: kusang lumalabas ang resulta habang nagta-type; Enter = buksan */}
            <div className="min-w-0 flex-1">
                <StudentSearch
                    studentHref={studentHrefBase}
                    employeeHref={employeeHrefBase}
                    archiveHref={role === "admin" || role === "nurse" ? "/dashboard/archive-records" : null}
                />
            </div>

            {/* Bell (walang bell ang admin):
                - Doctor: pending case reports
                - Nurse: pending case reports + dental follow-ups
                - Dentist: dental follow-ups */}
            {role !== "admin" && (
                <NotificationBell
                    items={[
                        ...(!isDentist
                            ? [
                                {
                                    label: "Pending Case Reports",
                                    hint: "Awaiting review",
                                    count: data.pendingReports,
                                    href: "/dashboard/health-case-reports?status=pending",
                                    tone: "green" as const,
                                },
                            ]
                            : []),
                        ...(isDentist || role === "nurse"
                            ? [
                                {
                                    label: "Dental Follow-ups",
                                    hint: "Patients to see again",
                                    count: data.dentalFollowUps,
                                    href: "/dashboard/dental-records?status=Follow-up",
                                    tone: "amber" as const,
                                },
                            ]
                            : []),
                    ]}
                />
            )}

            <UserMenu displayName={displayName} roleName={roleName} avatar={me?.avatar} initials={initials} />
        </header>
    );

    return (
        <main className="min-w-0 space-y-5 p-4 pb-8 md:p-6">
            {topBar}

            {banner}

            {/* Stat cards: icon sa itaas, label, malaking bilang, at paghahambing sa ibaba */}
            {/* Malaking screen: lahat ng card sa iisang hanay */}
            <section
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 xl:grid-cols-[repeat(var(--cards),minmax(0,1fr))]"
                style={{ "--cards": stats.length } as React.CSSProperties}
            >
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    const tone = STAT_TONES[stat.tone];
                    let footer: React.ReactNode = null;
                    if (stat.alert) {
                        footer =
                            stat.value > 0 ? (
                                <span className="inline-flex items-center gap-1 font-medium text-red-600">
                                    <AlertTriangle className="h-4 w-4" />
                                    Needs attention
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 font-medium text-[#15664f]">
                                    <CheckCircle2 className="h-4 w-4" />
                                    All clear
                                </span>
                            );
                    } else if (stat.hint) {
                        footer = <span className="text-gray-600">{stat.hint}</span>;
                    }
                    return (
                        // Puting card, may kulay na guhit sa itaas; icon sa kaliwa, label at bilang sa kanan
                        <div
                            key={stat.label}
                            className="relative flex min-w-0 items-start gap-3 overflow-hidden rounded-2xl border border-[#dcebe3] bg-white p-4 shadow-sm shadow-[#15664f]/5 transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                            <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${tone.bar}`} />
                            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone.tile}`}>
                                <Icon className="h-5 w-5" strokeWidth={1.9} />
                            </span>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-600">{stat.label}</p>
                                <p className="text-[1.75rem] font-bold leading-tight text-gray-900">
                                    {stat.value.toLocaleString("en-US")}
                                </p>
                                <div className="text-sm">{footer}</div>
                            </div>
                        </div>
                    );
                })}
            </section>

            {/* Chart | Visit Reasons | Quick Actions (gaya ng reference) */}
            <section
                className={`grid gap-5 lg:grid-cols-2 ${role !== "admin" && quickActions.length > 0
                    ? "xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.85fr)]"
                    : "xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
                    }`}
            >
                <VisitsOverviewChart
                    data={data.weeklyPoints}
                    showClinic={!isDentist}
                    showDental={!isDoctor}
                    showReports={!isDentist}
                    range={chartRange}
                    reasonRange={reasonRange}
                />
                <VisitReasons
                    reasons={data.reasons}
                    range={reasonRange}
                    chartRange={chartRange}
                    showClinic={!isDentist}
                    showDental={!isDoctor}
                    showReports={!isDentist}
                />
                {/* Walang Quick Actions ang admin (view-only) */}
                {role !== "admin" && quickActions.length > 0 && (
                    <QuickActionsSection actions={quickActions} className="lg:col-span-2 xl:col-span-1" />
                )}
            </section>

            {/* Recent Activities | Today's Visits */}
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <RecentActivity
                    items={data.activity}
                    today={data.today}
                    viewAllHref={isDentist ? "/dashboard/dental-visits" : "/dashboard/clinic-visits"}
                />
                <TodayList items={todayItems} viewAllHref={isDentist ? "/dashboard/dental-visits" : "/dashboard/clinic-visits"} />
            </section>
        </main>
    );
}