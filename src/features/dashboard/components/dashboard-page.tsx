import { redirect } from "next/navigation";
import Link from "next/link";
import {
    Activity,
    BarChart3,
    Bell,
    CalendarDays,
    Briefcase,
    FileText,
    ClipboardList,
    Heart,
    PieChart,
    Search,
    Stethoscope,
    UserCheck,
    UserPlus,
    Users,
    Zap,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import ConfirmLink from "@/components/shared/confirm-link";
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


type CountRow = { total: bigint };

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
};

// Mga dahilan ng pagbisita ngayong linggo (para sa "Visit Reasons" donut)
type ReasonRow = { label: string; total: bigint };

type ActivityItem = {
    key: string;
    kind: "clinic" | "dental" | "report";
    name: string;
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
                <Zap className="h-[18px] w-[18px] text-amber-500" strokeWidth={2} />
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

// Maliit na card na may paalala (sa ibaba ng kanang column)
function HealthyCard() {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-[#dcebe3] bg-gradient-to-br from-[#eef6f2] to-[#e2f0e7] p-4 md:p-5">
            <svg aria-hidden="true" viewBox="0 0 120 120" className="absolute -bottom-6 -right-4 h-24 w-24 text-[#15664f]/15">
                <path d="M20 110 C 20 50, 60 15, 115 10 C 112 70, 75 108, 20 110 Z" fill="currentColor" />
            </svg>
            <div className="relative flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#15664f] text-white">
                    <Heart className="h-[18px] w-[18px]" strokeWidth={2} fill="currentColor" />
                </span>
                <p className="text-sm leading-relaxed text-gray-600">
                    Healthy students build a stronger tomorrow. Let&apos;s keep them safe and well!
                </p>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Overview chart, Visit Distribution, Recent Activity                 */
/* ------------------------------------------------------------------ */

const CLINIC_COLOR = "#15664f";
const DENTAL_COLOR = "#f59e0b";
const REPORT_COLOR = "#3b82f6";

// Kapal ng linya at laki ng tuldok: pababa ang laki para kita lahat kapag nagpatong
const LINE_WIDTH = { clinic: 6, dental: 3.5, reports: 1.5 } as const;
const DOT_SIZE = { clinic: 6.5, dental: 4.5, reports: 2.5 } as const;

function CardShell({
    title,
    badge,
    action,
    children,
    className,
}: {
    title: string;
    /** Maliit na label sa kanan ng title (hal. "This Week") */
    badge?: string;
    /** Link o button sa kanan ng title (hal. "View All") */
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`min-w-0 rounded-2xl border border-[#dcebe3] bg-white p-4 shadow-sm shadow-[#15664f]/5 md:p-5 ${className ?? ""}`}>
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

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            {label}
        </span>
    );
}

function VisitsOverviewChart({
    data,
    showClinic,
    showDental,
    showReports,
}: {
    data: WeeklyPoint[];
    showClinic: boolean;
    showDental: boolean;
    showReports: boolean;
}) {
    const W = 440;
    const H = 210;
    const L = 32;
    const R = 12;
    const T = 12;
    const B = 30;
    const plotW = W - L - R;
    const plotH = H - T - B;
    const baseY = T + plotH;

    const peak = Math.max(
        0,
        ...data.flatMap((d) => [showClinic ? d.clinic : 0, showDental ? d.dental : 0, showReports ? d.reports : 0]),
    );
    const yMax = Math.max(4, Math.ceil(peak / 4) * 4);

    const x = (i: number) => L + (data.length > 1 ? (plotW * i) / (data.length - 1) : plotW / 2);
    const y = (v: number) => T + plotH - (v / yMax) * plotH;

    const ticks = [0, 1, 2, 3, 4].map((t) => (yMax * t) / 4);

    const series: { key: "clinic" | "dental" | "reports"; color: string; show: boolean }[] = [
        { key: "clinic", color: CLINIC_COLOR, show: showClinic },
        { key: "dental", color: DENTAL_COLOR, show: showDental },
        { key: "reports", color: REPORT_COLOR, show: showReports },
    ];

    return (
        <CardShell title="Clinic Visits Overview" badge="This Week">
            <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 sm:justify-end">
                {showClinic && <LegendDot color={CLINIC_COLOR} label="Clinic Visits" />}
                {showDental && <LegendDot color={DENTAL_COLOR} label="Dental Visits" />}
                {showReports && <LegendDot color={REPORT_COLOR} label="Case Reports" />}
            </div>

            {data.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-600">No visit data yet.</p>
            ) : (
                <>
                    <svg
                        viewBox={`0 0 ${W} ${H}`}
                        className="mx-auto h-auto max-h-[220px] w-full"
                        role="img"
                        aria-label="Clinic visits, dental visits, and case reports for this week, Monday to Saturday"
                    >
                        <defs>
                            {/* Malambot na green na kulay sa ilalim ng linya */}
                            <linearGradient id="clinic-area" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={CLINIC_COLOR} stopOpacity={0.28} />
                                <stop offset="100%" stopColor={CLINIC_COLOR} stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        {/* grid + y labels */}
                        {ticks.map((t) => (
                            <g key={t}>
                                <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#eef2f0" strokeWidth={1} />
                                <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize={12} fill="#6b7280">
                                    {t}
                                </text>
                            </g>
                        ))}

                        {/* area + line + dots.
                            Kapag pareho ang bilang, nagpapatong ang mga linya. Kaya magkakaiba ang kapal:
                            pinakamakapal sa ilalim ang Clinic, gitna ang Dental, pinakamanipis sa ibabaw ang
                            Case Reports — kita pa rin ang lahat ng kulay na parang guhit-guhit. */}
                        {series
                            .filter((s) => s.show)
                            .map((s) => {
                                const pts = data.map((d, i) => `${x(i)},${y(d[s.key])}`).join(" ");
                                const area = `${x(0)},${baseY} ${pts} ${x(data.length - 1)},${baseY}`;
                                return (
                                    <g key={s.key}>
                                        <polygon
                                            points={area}
                                            fill={s.key === "clinic" ? "url(#clinic-area)" : s.color}
                                            opacity={s.key === "clinic" ? 1 : 0.08}
                                        />
                                        <polyline
                                            points={pts}
                                            fill="none"
                                            stroke={s.color}
                                            strokeWidth={LINE_WIDTH[s.key]}
                                            strokeLinejoin="round"
                                            strokeLinecap="round"
                                        />
                                        {data.map((d, i) => (
                                            <circle
                                                key={i}
                                                cx={x(i)}
                                                cy={y(d[s.key])}
                                                r={DOT_SIZE[s.key]}
                                                fill={s.color}
                                                stroke="#fff"
                                                strokeWidth={1}
                                            >
                                                <title>{`${d.label}: ${d[s.key]}`}</title>
                                            </circle>
                                        ))}
                                    </g>
                                );
                            })}

                        {/* x labels */}
                        {data.map((d, i) => (
                            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={12} fill="#6b7280">
                                {d.label}
                            </text>
                        ))}
                    </svg>

                    {/* MOBILE: walang hover/tooltip sa touch, kaya ipakita ang bilang kada araw */}
                    <div
                        className="mt-2 grid gap-1 text-center sm:hidden"
                        style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
                    >
                        {data.map((d) => (
                            <div key={d.label} className="rounded-md bg-[#f6faf8] px-1 py-1">
                                <p className="text-sm text-gray-600">{d.label}</p>
                                {showClinic && (
                                    <p className="text-sm font-semibold" style={{ color: CLINIC_COLOR }}>
                                        {d.clinic}
                                    </p>
                                )}
                                {showDental && (
                                    <p className="text-sm font-semibold" style={{ color: DENTAL_COLOR }}>
                                        {d.dental}
                                    </p>
                                )}
                                {showReports && (
                                    <p className="text-sm font-semibold" style={{ color: REPORT_COLOR }}>
                                        {d.reports}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </CardShell>
    );
}

// Kulay ng bawat dahilan sa donut (green at dilaw, kapareho ng dashboard)
const REASON_COLORS = ["#15664f", "#3f9a76", "#8fcaa9", "#f2c94c", "#d7e9df"];

function VisitReasons({ reasons, unit }: { reasons: { label: string; value: number }[]; unit: string }) {
    // Top 4 + "Others"
    const top = reasons.slice(0, 4);
    const othersValue = reasons.slice(4).reduce((sum, r) => sum + r.value, 0);
    const segments = [
        ...top.map((r, i) => ({ ...r, color: REASON_COLORS[i] })),
        ...(othersValue > 0 ? [{ label: "Others", value: othersValue, color: REASON_COLORS[4] }] : []),
    ];
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    const R = 42;
    const C = 2 * Math.PI * R;

    let offset = 0;
    const arcs = segments.map((s) => {
        const len = total ? (s.value / total) * C : 0;
        const arc = { ...s, len, offset };
        offset += len;
        return arc;
    });

    return (
        <CardShell title="Visit Reasons" badge="This Week">
            {total === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                    <PieChart className="h-10 w-10 text-[#15664f]/30" />
                    <p className="mt-2 text-sm text-gray-600">No visits this week yet.</p>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col 2xl:flex-row">
                    <div className="relative h-36 w-36 shrink-0 select-none">
                        <svg viewBox="0 0 120 120" className="h-full w-full" role="img" aria-label="Visit reasons this week">
                            <circle cx={60} cy={60} r={R} fill="none" stroke="#f1f5f3" strokeWidth={18} />
                            <g transform="rotate(-90 60 60)">
                                {arcs.map((a) => (
                                    <circle
                                        key={a.label}
                                        cx={60}
                                        cy={60}
                                        r={R}
                                        fill="none"
                                        stroke={a.color}
                                        strokeWidth={18}
                                        strokeDasharray={`${a.len} ${C - a.len}`}
                                        strokeDashoffset={-a.offset}
                                    >
                                        <title>{`${a.label}: ${a.value}`}</title>
                                    </circle>
                                ))}
                            </g>
                        </svg>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-sm text-gray-600">Total</span>
                            <span className="text-2xl font-bold leading-tight text-[#15664f]">{total.toLocaleString("en-US")}</span>
                            <span className="text-sm text-gray-600">{unit}</span>
                        </div>
                    </div>

                    <ul className="w-full min-w-0 space-y-2.5 text-sm">
                        {segments.map((s) => (
                            <li key={s.label} className="flex items-center justify-between gap-3">
                                <span className="flex min-w-0 items-center gap-2 text-gray-600">
                                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                                    <span className="truncate capitalize" title={s.label}>
                                        {s.label}
                                    </span>
                                </span>
                                <span className="shrink-0 font-semibold text-gray-900">
                                    {Math.round((s.value / total) * 100)}%
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
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
                                    <th className="px-2 py-2.5 font-semibold">Patient</th>
                                    <th className="whitespace-nowrap px-2 py-2.5 font-semibold">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => {
                                    const m = meta[item.kind];
                                    const Icon = m.icon;
                                    return (
                                        <tr key={item.key} className="border-b border-gray-50 last:border-0 hover:bg-[#f6faf8]">
                                            <td className="whitespace-nowrap px-2 py-3 text-gray-600">{item.clock || "—"}</td>
                                            <td className="px-2 py-3">
                                                <span className="flex items-center gap-2 text-gray-900">
                                                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${m.tile}`}>
                                                        <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                                                    </span>
                                                    {m.label}
                                                </span>
                                            </td>
                                            <td className="px-2 py-3 text-gray-600">{item.name}</td>
                                            <td className="whitespace-nowrap px-2 py-3 text-gray-600">{relativeDay(item.date, today)}</td>
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

async function loadDashboard(isDentist: boolean, isDoctor: boolean, showEmployees: boolean) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

    try {
        // Hinati sa dalawang batch para hindi sabay-sabay ang 13 queries
        // (iwas sa sobrang daming connection at sa "excessively deep" na type error).
        const [
            students,
            employees,
            visitsToday,
            recentVisits,
            caseSummary,
            visitors,
            dentalToday,
            recentDental,
        ]: [
                CountRow[],
                CountRow[],
                CountRow[],
                VisitRow[],
                CountRow[],
                CountRow[],
                CountRow[],
                DentalRow[],
            ] = await Promise.all([
                prisma.$queryRaw<CountRow[]>`
          SELECT COUNT(*) AS total FROM students WHERE archived_at IS NULL
        `,
                showEmployees
                    ? prisma.$queryRaw<CountRow[]>`
          SELECT COUNT(*) AS total FROM employees
        `
                    : Promise.resolve([] as CountRow[]),
                isDentist
                    ? Promise.resolve([] as CountRow[])
                    : prisma.$queryRaw<CountRow[]>`
          SELECT (
            (SELECT COUNT(*) FROM health_records
              WHERE archived_at IS NULL AND visit_date = CAST(${today} AS DATE))
            +
            (SELECT COUNT(*) FROM employee_health_records
              WHERE archived_at IS NULL AND visit_date = CAST(${today} AS DATE))
          ) AS total
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
                // Pending Reports = case reports na "pending" ang status lang
                // (tugma sa Health Case Reports > Status: Pending)
                prisma.$queryRaw<CountRow[]>`
          SELECT COUNT(*) AS total FROM health_case_reports
          WHERE archived_at IS NULL AND LOWER(TRIM(status::text)) = 'pending'
        `,
                prisma.$queryRaw<CountRow[]>`
          SELECT COUNT(*) AS total FROM visitor_logs
          WHERE archived_at IS NULL AND visit_date = CAST(${today} AS DATE)
        `,
                prisma.$queryRaw<CountRow[]>`
          SELECT COUNT(*) AS total FROM dental_records
          WHERE archived_at IS NULL AND CAST(visit_date AS DATE) = CAST(${today} AS DATE)
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
            ]);

        const [
            weekly,
            activityClinicStudent,
            activityClinicEmployee,
            activityDental,
            activityReports,
            reasonRows,
        ]: [WeeklyRow[], ActivityRow[], ActivityRow[], ActivityRow[], ActivityRow[], ReasonRow[]] = await Promise.all([
            // ---- visits per day for this week (Mon -> Sat) ----
            prisma.$queryRaw<WeeklyRow[]>`
          SELECT (CAST(date_trunc('week', CAST(${today} AS DATE)) AS DATE) + n) AS day,
                 CAST(
                   (SELECT COUNT(*) FROM health_records
                     WHERE archived_at IS NULL
                       AND CAST(visit_date AS DATE) = (CAST(date_trunc('week', CAST(${today} AS DATE)) AS DATE) + n))
                   +
                   (SELECT COUNT(*) FROM employee_health_records
                     WHERE archived_at IS NULL
                       AND CAST(visit_date AS DATE) = (CAST(date_trunc('week', CAST(${today} AS DATE)) AS DATE) + n))
                 AS BIGINT) AS clinic,
                 CAST(
                   (SELECT COUNT(*) FROM dental_records
                     WHERE archived_at IS NULL
                       AND CAST(visit_date AS DATE) = (CAST(date_trunc('week', CAST(${today} AS DATE)) AS DATE) + n))
                 AS BIGINT) AS dental,
                 CAST(
                   (SELECT COUNT(*) FROM health_case_reports
                     WHERE archived_at IS NULL
                       AND CAST(report_date AS DATE) = (CAST(date_trunc('week', CAST(${today} AS DATE)) AS DATE) + n))
                 AS BIGINT) AS reports
          FROM generate_series(0, 5) AS n
          ORDER BY day ASC
        `,
            // ---- recent activity feed (role-aware, newest first) ----
            isDentist
                ? Promise.resolve([] as ActivityRow[])
                : prisma.$queryRaw<ActivityRow[]>`
          SELECT TRIM(s.first_name || ' ' || s.last_name) AS name,
                 CAST(r.visit_date AS DATE) AS event_date,
                 r.created_at AS event_time,
                 to_char((r.created_at AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE 'Asia/Manila',
                         'FMHH12:MI AM') AS event_clock
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
                         'FMHH12:MI AM') AS event_clock
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
                         'FMHH12:MI AM') AS event_clock
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
                         'FMHH12:MI AM') AS event_clock
          FROM health_case_reports h
          LEFT JOIN students s  ON s.student_id  = h.student_id
          LEFT JOIN employees e ON e.employee_id = h.employee_id
          WHERE h.archived_at IS NULL
          ORDER BY h.created_at DESC
          LIMIT 5
        `,
            // ---- Visit Reasons ngayong linggo (Mon -> Sat) ----
            // Dentist: mga procedure sa dental visits. Iba pa: mga complaint sa clinic visits.
            isDentist
                ? prisma.$queryRaw<ReasonRow[]>`
          SELECT MIN(TRIM(procedure_name)) AS label, COUNT(*) AS total
          FROM dental_records
          WHERE archived_at IS NULL AND TRIM(procedure_name) <> ''
            AND CAST(visit_date AS DATE) BETWEEN CAST(date_trunc('week', CAST(${today} AS DATE)) AS DATE)
                                             AND CAST(date_trunc('week', CAST(${today} AS DATE)) AS DATE) + 5
          GROUP BY LOWER(TRIM(procedure_name))
          ORDER BY total DESC, label ASC
        `
                : prisma.$queryRaw<ReasonRow[]>`
          SELECT MIN(TRIM(v.complaint)) AS label, COUNT(*) AS total
          FROM (
            SELECT complaint, visit_date FROM health_records WHERE archived_at IS NULL
            UNION ALL
            SELECT complaint, visit_date FROM employee_health_records WHERE archived_at IS NULL
          ) v
          WHERE TRIM(v.complaint) <> ''
            AND CAST(v.visit_date AS DATE) BETWEEN CAST(date_trunc('week', CAST(${today} AS DATE)) AS DATE)
                                               AND CAST(date_trunc('week', CAST(${today} AS DATE)) AS DATE) + 5
          GROUP BY LOWER(TRIM(v.complaint))
          ORDER BY total DESC, label ASC
        `,
        ]);

        const weeklyPoints: WeeklyPoint[] = weekly.map((w) => ({
            label: new Date(w.day).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
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

        return {
            today,
            totalStudents: Number(students[0]?.total ?? 0),
            totalEmployees: Number(employees[0]?.total ?? 0),
            visitsToday: Number(visitsToday[0]?.total ?? 0),
            pendingReports: Number(caseSummary[0]?.total ?? 0),
            visitorsToday: Number(visitors[0]?.total ?? 0),
            dentalToday: Number(dentalToday[0]?.total ?? 0),
            recentVisits,
            recentDental,
            weeklyPoints,
            activity,
            reasons: reasonRows.map((r) => ({ label: r.label, value: Number(r.total) })),
        };
    } catch (err) {
        console.error("Dashboard error:", err);
        return {
            today,
            totalStudents: 0,
            totalEmployees: 0,
            visitsToday: 0,
            pendingReports: 0,
            visitorsToday: 0,
            dentalToday: 0,
            recentVisits: [] as VisitRow[],
            recentDental: [] as DentalRow[],
            weeklyPoints: [] as WeeklyPoint[],
            activity: [] as ActivityItem[],
            reasons: [] as { label: string; value: number }[],
        };
    }
}

export default async function DashboardPage() {
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
    const greetingText = `${greeting}${displayName ? `, ${displayName}` : ""}!`;
    const dateToday = new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
    }).format(new Date());
    const weekdayToday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Manila" }).format(new Date());

    const isItTech = role === "ittech";

    // Pagbati sa itaas: pangalan at petsa (makikita ng lahat ng role)
    const banner = (
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
                <div className="min-w-0">
                    <h1 className="break-words text-2xl font-bold text-[#10523f] md:text-[1.75rem]">{greetingText}</h1>
                    <p className="mt-0.5 text-sm text-gray-600">Here&apos;s an overview of your school clinic today.</p>
                </div>
            </div>
            <div className="flex w-fit shrink-0 items-center gap-2.5 rounded-xl border border-[#dcebe3] bg-white px-3.5 py-2 shadow-sm shadow-[#15664f]/5">
                <CalendarDays className="h-5 w-5 text-[#15664f]" strokeWidth={1.8} />
                <div className="leading-tight">
                    <p className="text-sm font-semibold text-gray-900">{dateToday}</p>
                    <p className="text-sm text-gray-600">{weekdayToday}</p>
                </div>
            </div>
        </section>
    );

    // IT Technician: welcome banner lang ang makikita (walang clinic data)
    if (isItTech) {
        return <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">{banner}</main>;
    }

    const data = await loadDashboard(isDentist, isDoctor, showEmployees);

    const stats: {
        label: string;
        value: number;
        icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
        hint: string;
        tone: "green" | "amber";
    }[] = [
            { label: "Total Students", value: data.totalStudents, icon: Users, hint: "Active students", tone: "green" },
            ...(showEmployees
                ? [{ label: "Total Employees", value: data.totalEmployees, icon: Briefcase, hint: "Registered staff", tone: "amber" as const }]
                : []),
            ...(isDentist
                ? []
                : [{ label: "Clinic Visits Today", value: data.visitsToday, icon: Activity, hint: "Recorded today", tone: "green" as const }]),
            ...(isDoctor
                ? []
                : [{ label: "Dental Visits Today", value: data.dentalToday, icon: ToothIcon, hint: "Recorded today", tone: "amber" as const }]),
            ...(isDentist
                ? []
                : [{ label: "Pending Reports", value: data.pendingReports, icon: FileText, hint: "Awaiting review", tone: "green" as const }]),
            { label: "Visitors Today", value: data.visitorsToday, icon: UserCheck, hint: "Logged today", tone: "amber" },
        ];


    // Iisang kulay ang icon ng lahat ng Quick Action tile (green, nagiging solid kapag hover)
    const TILE_ICON = "bg-white text-[#15664f] shadow-sm ring-1 ring-[#dcebe3] group-hover:bg-[#15664f] group-hover:text-white group-hover:ring-[#15664f]";

    // NOTE: adjust the href values below to match your actual routes.
    const quickActions: QuickAction[] = [
        {
            label: "Add Student",
            description: "Register a new student",
            href: "/dashboard/students/new",
            icon: UserPlus,
            cardClass: "border-gray-100 bg-white hover:border-[#15664f]/30 hover:bg-[#eef6f2] hover:shadow-md hover:shadow-[#15664f]/10",
            iconClass: TILE_ICON,
        },
        ...(showEmployees
            ? [
                {
                    label: "Add Employee",
                    description: "Register a new employee",
                    // TODO: i-check kung tama ang route na ito
                    href: "/dashboard/employees/new",
                    icon: Briefcase,
                    cardClass: "border-gray-100 bg-white hover:border-[#15664f]/30 hover:bg-[#eef6f2] hover:shadow-md hover:shadow-[#15664f]/10",
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
        {
            label: "View Reports",
            description: "Generate and view reports",
            href: "/dashboard/illness-alerts",
            icon: BarChart3,
            cardClass: "border-gray-100 bg-white hover:border-[#15664f]/30 hover:bg-[#eef6f2] hover:shadow-md hover:shadow-[#15664f]/10",
            iconClass: TILE_ICON,
        },
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

    // Search sa itaas: dentist -> dental records, iba -> student health records
    const searchAction = isDentist ? "/dashboard/dental-records" : "/dashboard/student-health-records";
    const initials = (baseName || "U").charAt(0).toUpperCase();

    // Top bar (desktop/tablet): search, notification bell (pending reports) at user
    const topBar = (
        <header className="hidden items-center gap-3 md:flex">
            <form method="get" action={searchAction} className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
                <input
                    name="q"
                    type="search"
                    autoComplete="off"
                    placeholder={isDentist ? "Search dental records..." : "Search students or records..."}
                    suppressHydrationWarning
                    className="h-11 w-full max-w-xl rounded-full border border-[#dcebe3] bg-white pl-11 pr-4 text-sm text-gray-900 shadow-sm shadow-[#15664f]/5 outline-none transition focus:border-[#15664f] focus:ring-4 focus:ring-[#15664f]/10"
                />
            </form>

            {!isDentist && (
                <Link
                    href="/dashboard/health-case-reports?status=pending"
                    title={`${data.pendingReports} pending case report${data.pendingReports === 1 ? "" : "s"}`}
                    className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#dcebe3] bg-white text-[#15664f] shadow-sm shadow-[#15664f]/5 hover:bg-[#eef6f2]"
                >
                    <Bell className="h-5 w-5" strokeWidth={1.8} />
                    {data.pendingReports > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-sm font-semibold leading-none text-[#10523f] ring-2 ring-[#e7f3e2]">
                            {data.pendingReports > 99 ? "99+" : data.pendingReports}
                        </span>
                    )}
                </Link>
            )}

            <Link
                href="/dashboard/settings"
                className="flex shrink-0 items-center gap-2.5 rounded-full border border-[#dcebe3] bg-white py-1 pl-1 pr-4 shadow-sm shadow-[#15664f]/5 hover:bg-[#eef6f2]"
            >
                {me?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={me.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#15664f] text-sm font-semibold text-white">
                        {initials}
                    </span>
                )}
                <span className="leading-tight">
                    <span className="block text-sm font-semibold text-gray-900">{displayName}</span>
                    <span className="block text-sm text-gray-600">{roleName}</span>
                </span>
            </Link>
        </header>
    );

    return (
        <main className="min-w-0 space-y-5 p-4 pb-8 md:p-6">
            {topBar}

            {/* Kaliwa: pagbati, stats, chart, Recent Activities. Kanan (malaking screen): Quick Actions, Today's Visits */}
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="min-w-0 space-y-5">
                    {banner}

                    {/* Stat cards (siksik): icon sa kaliwa, bilang at label sa kanan */}
                    <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                        {stats.map((stat) => {
                            const Icon = stat.icon;
                            const amber = stat.tone === "amber";
                            return (
                                <div
                                    key={stat.label}
                                    title={stat.hint}
                                    className={`flex min-w-0 items-center gap-4 rounded-2xl border p-4 shadow-sm sm:p-5 ${amber ? "border-[#f3e4b3] bg-[#fdf7e6]" : "border-[#d3e8dc] bg-[#eaf5ef]"
                                        }`}
                                >
                                    <span
                                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14 ${amber ? "bg-amber-300/70 text-[#7a5a00]" : "bg-[#15664f]/15 text-[#15664f]"
                                            }`}
                                    >
                                        <Icon className="h-6 w-6" strokeWidth={1.8} />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-[1.75rem] font-bold leading-tight text-gray-900 sm:text-[2rem]">{stat.value.toLocaleString("en-US")}</p>
                                        <p className="break-words text-sm font-medium text-gray-600">{stat.label}</p>
                                        <p className="hidden text-sm text-gray-600 sm:block">{stat.hint}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </section>

                    {/* Chart + Visit Reasons */}
                    <section className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                        <VisitsOverviewChart
                            data={data.weeklyPoints}
                            showClinic={!isDentist}
                            showDental={!isDoctor}
                            showReports={!isDentist}
                        />
                        <VisitReasons reasons={data.reasons} unit={isDentist ? "Dental Visits" : "Visits"} />
                    </section>

                    {/* Recent Activities: sa ilalim ng Visits Overview at Visit Reasons */}
                    <RecentActivity
                        items={data.activity}
                        today={data.today}
                        viewAllHref={isDentist ? "/dashboard/dental-visits" : "/dashboard/clinic-visits"}
                        compact
                    />

                </div>

                {/* KANAN */}
                <aside className="grid min-w-0 content-start gap-5 md:grid-cols-2 xl:grid-cols-1">
                    <QuickActionsSection actions={quickActions} />
                    <TodayList items={todayItems} viewAllHref={isDentist ? "/dashboard/dental-visits" : "/dashboard/clinic-visits"} />
                    <HealthyCard />
                </aside>
            </div>
        </main>
    );
}