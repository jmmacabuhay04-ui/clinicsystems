import { redirect } from "next/navigation";
import Link from "next/link";
import {
    Activity,
    ArrowRight,
    BarChart3,
    CalendarDays,
    Briefcase,
    ChevronRight,
    FileText,
    ClipboardList,
    PieChart,
    Stethoscope,
    Sun,
    UserCheck,
    UserPlus,
    Users,
    Moon,
    Sunset,
    Zap,
    type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import ConfirmLink from "@/components/shared/confirm-link";

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

type ActivityItem = {
    key: string;
    kind: "clinic" | "dental" | "report";
    name: string;
    date: Date;
    time: Date;
    clock: string;
};

function formatVisitDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

type RecentRow = {
    key: string;
    name: string;
    type: "student" | "employee";
    detail: string;
    date: Date;
    href: string;
    message: string;
    avatar: string | null;
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
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${type === "employee" ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
                }`}
        >
            {initials}
        </span>
    );
}

function TypeBadge({ type }: { type: "student" | "employee" }) {
    return (
        <span
            className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${type === "employee" ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
                }`}
        >
            {type === "employee" ? "Employee" : "Student"}
        </span>
    );
}

function RecentTable({
    title,
    detailLabel,
    rows,
    empty,
    viewTitle,
    viewAllHref,
    icon: Icon,
    iconClass,
}: {
    title: string;
    detailLabel: string;
    rows: RecentRow[];
    empty: string;
    viewTitle: string;
    viewAllHref: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    iconClass: string;
}) {
    return (
        <div className="min-w-0 overflow-hidden rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10">
            <div className="flex items-center justify-between gap-2 p-4 md:px-5">
                <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
                        <Icon className="h-5 w-5" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-gray-900 md:text-lg">{title}</h2>
                        <p className="text-xs text-gray-500">
                            {rows.length} record{rows.length === 1 ? "" : "s"} today
                        </p>
                    </div>
                </div>
                <Link
                    href={viewAllHref}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-[#cfe5d9] px-3 text-xs font-semibold text-[#15664f] hover:bg-[#eef6f2]"
                >
                    View All <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            <div className="border-t border-gray-100">
                {rows.length === 0 ? (
                    <div className="flex flex-col items-center p-8 text-center">
                        <Icon className="h-10 w-10 text-[#15664f]/30" />
                        <p className="mt-2 text-sm text-gray-500">{empty}</p>
                    </div>
                ) : (
                    <>
                        {/* MOBILE: card list (walang horizontal scroll) */}
                        <ul className="space-y-2 p-3 md:hidden">
                            {rows.map((r) => (
                                <li key={r.key} className="rounded-lg border border-gray-200 p-3">
                                    <div className="flex items-start gap-3">
                                        <PatientAvatar name={r.name} type={r.type} avatar={r.avatar} />
                                        <div className="min-w-0 flex-1">
                                            <p className="break-words text-sm font-medium text-gray-900">{r.name}</p>
                                            <p className="break-words text-sm text-gray-700">
                                                <span className="text-gray-500">{detailLabel}: </span>
                                                {r.detail}
                                            </p>
                                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                                <TypeBadge type={r.type} />
                                                <span className="text-xs text-gray-600">{formatVisitDate(r.date)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ConfirmLink
                                        href={r.href}
                                        title={viewTitle}
                                        message={r.message}
                                        className="mt-3 block w-full rounded-md bg-[#15664f] px-3 py-2 text-center text-sm font-semibold text-white hover:bg-[#10523f]"
                                    >
                                        View
                                    </ConfirmLink>
                                </li>
                            ))}
                        </ul>

                        {/* DESKTOP: table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#f6faf8] text-xs uppercase tracking-wide text-gray-600">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Name</th>
                                        <th className="px-4 py-3 font-semibold">{detailLabel}</th>
                                        <th className="px-4 py-3 font-semibold">Type</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-semibold">Date</th>
                                        <th className="px-4 py-3 text-center font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => (
                                        <tr key={r.key} className="border-t border-gray-100 hover:bg-[#f6faf8]">
                                            <td className="px-4 py-3 font-semibold text-gray-900">
                                                <div className="flex items-center gap-2">
                                                    <PatientAvatar name={r.name} type={r.type} avatar={r.avatar} />
                                                    <span>{r.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 capitalize text-gray-700">{r.detail}</td>
                                            <td className="px-4 py-3">
                                                <TypeBadge type={r.type} />
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                {formatVisitDate(r.date)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <ConfirmLink
                                                    href={r.href}
                                                    title={viewTitle}
                                                    message={r.message}
                                                    className="inline-flex h-8 items-center rounded-md bg-[#15664f] px-3 text-xs font-semibold text-white hover:bg-[#10523f]"
                                                >
                                                    View
                                                </ConfirmLink>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function DentalList({
    title,
    rows,
    empty,
    viewHref,
}: {
    title: string;
    rows: DentalRow[];
    empty: string;
    viewHref: (row: DentalRow) => string;
}) {
    return (
        <RecentTable
            title={title}
            detailLabel="Procedure"
            empty={empty}
            viewTitle="View dental record"
            viewAllHref="/dashboard/dental-visits"
            icon={ToothIcon}
            iconClass="bg-cyan-50 text-cyan-700"
            rows={rows.map((d) => {
                const name = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "Unknown";
                return {
                    key: `${d.patient_type}-${d.dental_id}`,
                    name,
                    type: d.patient_type === "employee" ? "employee" : "student",
                    detail: d.procedure_name,
                    date: d.visit_date,
                    avatar: d.avatar,
                    href: viewHref(d),
                    message: `Open the dental record of ${name}? This contains confidential medical information and your access will be recorded.`,
                };
            })}
        />
    );
}

function VisitList({
    title,
    rows,
    empty,
    viewHref,
}: {
    title: string;
    rows: VisitRow[];
    empty: string;
    viewHref: (visit: VisitRow) => string;
}) {
    return (
        <RecentTable
            title={title}
            detailLabel="Complaint"
            empty={empty}
            viewTitle="View health record"
            viewAllHref="/dashboard/clinic-visits"
            icon={Stethoscope}
            iconClass="bg-[#eef6f2] text-[#15664f]"
            rows={rows.map((v) => {
                const name = `${v.first_name} ${v.last_name}`;
                return {
                    key: `${v.patient_type}-${v.record_id}`,
                    name,
                    type: v.patient_type,
                    detail: v.complaint,
                    date: v.visit_date,
                    avatar: v.avatar,
                    href: viewHref(v),
                    message: `Open the health record of ${name}? This contains confidential medical information and your access will be recorded.`,
                };
            })}
        />
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
        <div className={`min-w-0 overflow-hidden rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10 ${className ?? ""}`}>
            <div className="flex items-center gap-3 p-4 md:px-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef6f2] text-[#15664f]">
                    <Zap className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-gray-900 md:text-lg">Quick Actions</h2>
                    <p className="text-xs text-gray-500">Shortcuts to common tasks</p>
                </div>
            </div>
            <div className="grid gap-2 border-t border-gray-100 p-3 sm:grid-cols-2 xl:grid-cols-1">
                {actions.map((a) => {
                    const Icon = a.icon;
                    return (
                        <Link
                            key={a.label}
                            href={a.href}
                            className={`group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${a.cardClass}`}
                        >
                            <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${a.iconClass}`}
                            >
                                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold leading-tight text-gray-900 group-hover:text-[#15664f]">{a.label}</p>
                                <p className="text-xs leading-tight text-gray-500">{a.description}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-[#15664f]" />
                        </Link>
                    );
                })}
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

function CardShell({
    title,
    subtitle,
    icon: Icon,
    children,
    className,
}: {
    title: string;
    subtitle?: string;
    icon: LucideIcon;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`min-w-0 rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10 p-4 md:p-5 ${className ?? ""}`}>
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef6f2] text-[#15664f]">
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                    <h2 className="break-words text-base font-semibold leading-tight text-gray-900 md:text-lg">{title}</h2>
                    {subtitle && <p className="text-xs text-gray-600">{subtitle}</p>}
                </div>
            </div>
            {children}
        </div>
    );
}

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-700">
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
        <CardShell title="Visits & Case Reports Overview" subtitle="This week (Mon–Sat)" icon={BarChart3}>
            <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 sm:justify-end">
                {showClinic && <LegendDot color={CLINIC_COLOR} label="Clinic Visits" />}
                {showDental && <LegendDot color={DENTAL_COLOR} label="Dental Visits" />}
                {showReports && <LegendDot color={REPORT_COLOR} label="Case Reports" />}
            </div>

            {data.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">No visit data yet.</p>
            ) : (
                <>
                    <svg
                        viewBox={`0 0 ${W} ${H}`}
                        className="mx-auto h-auto max-h-[200px] w-full"
                        role="img"
                        aria-label="Clinic visits, dental visits, and case reports for this week, Monday to Saturday"
                    >
                        {/* grid + y labels */}
                        {ticks.map((t) => (
                            <g key={t}>
                                <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeWidth={1} />
                                <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize={12} fill="#6b7280">
                                    {t}
                                </text>
                            </g>
                        ))}

                        {/* area + line + dots. Huling iginuguhit ang Clinic Visits para nasa ibabaw ito. */}
                        {[...series]
                            .reverse()
                            .filter((s) => s.show)
                            .map((s) => {
                                const pts = data.map((d, i) => `${x(i)},${y(d[s.key])}`).join(" ");
                                const area = `${x(0)},${baseY} ${pts} ${x(data.length - 1)},${baseY}`;
                                return (
                                    <g key={s.key}>
                                        <polygon points={area} fill={s.color} opacity={0.12} />
                                        <polyline
                                            points={pts}
                                            fill="none"
                                            stroke={s.color}
                                            strokeWidth={2.5}
                                            strokeLinejoin="round"
                                            strokeLinecap="round"
                                        />
                                        {data.map((d, i) => (
                                            <circle
                                                key={i}
                                                cx={x(i)}
                                                cy={y(d[s.key])}
                                                r={3.5}
                                                fill={s.color}
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
                                <p className="text-[10px] text-gray-500">{d.label}</p>
                                {showClinic && (
                                    <p className="text-xs font-semibold" style={{ color: CLINIC_COLOR }}>
                                        {d.clinic}
                                    </p>
                                )}
                                {showDental && (
                                    <p className="text-xs font-semibold" style={{ color: DENTAL_COLOR }}>
                                        {d.dental}
                                    </p>
                                )}
                                {showReports && (
                                    <p className="text-xs font-semibold" style={{ color: REPORT_COLOR }}>
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

function VisitDistribution({
    segments,
}: {
    segments: { label: string; value: number; color: string }[];
}) {
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    const R = 40;
    const C = 2 * Math.PI * R;

    let offset = 0;
    const arcs = segments
        .filter((s) => s.value > 0)
        .map((s) => {
            const len = (s.value / total) * C;
            const arc = { ...s, len, offset };
            offset += len;
            return arc;
        });

    return (
        <CardShell title="Visit Distribution" subtitle="This week (Mon–Sat)" icon={PieChart}>
            <div className="flex flex-col items-center gap-4 sm:flex-row xl:flex-col 2xl:flex-row">
                <div className="relative h-32 w-32 shrink-0 select-none sm:h-28 sm:w-28">
                    <svg viewBox="0 0 120 120" className="h-full w-full" role="img" aria-label="Visit distribution">
                        <circle cx={60} cy={60} r={R} fill="none" stroke="#f3f4f6" strokeWidth={16} />
                        <g transform="rotate(-90 60 60)">
                            {arcs.map((a) => (
                                <circle
                                    key={a.label}
                                    cx={60}
                                    cy={60}
                                    r={R}
                                    fill="none"
                                    stroke={a.color}
                                    strokeWidth={16}
                                    strokeDasharray={`${a.len} ${C - a.len}`}
                                    strokeDashoffset={-a.offset}
                                />
                            ))}
                        </g>
                    </svg>
                    {/* Gitna ng donut: HTML para malinaw ang text */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Total</span>
                        <span className="text-xl font-bold leading-none text-[#15664f]">{total.toLocaleString("en-US")}</span>
                    </div>
                </div>

                <ul className="w-full min-w-0 space-y-2 text-sm">
                    {segments.map((s) => (
                        <li key={s.label} className="flex items-center justify-between gap-3 rounded-lg bg-[#f6faf8] px-3 py-2">
                            <LegendDot color={s.color} label={s.label} />
                            <span className="shrink-0 font-bold text-gray-900">{s.value.toLocaleString("en-US")}</span>
                        </li>
                    ))}
                </ul>
            </div>
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

function RecentActivity({ items, today }: { items: ActivityItem[]; today: string }) {
    const meta = {
        clinic: { icon: Stethoscope, tile: "bg-[#eef6f2] text-[#15664f]", label: "Clinic visit", tag: "text-[#15664f]" },
        dental: { icon: ToothIcon, tile: "bg-cyan-50 text-cyan-700", label: "Dental visit", tag: "text-cyan-700" },
        report: { icon: ClipboardList, tile: "bg-amber-100 text-amber-700", label: "Case report", tag: "text-amber-700" },
    } as const;

    return (
        <CardShell title="Recent Activity" subtitle="Latest records" icon={Activity}>
            {items.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                    <Activity className="h-10 w-10 text-[#15664f]/30" />
                    <p className="mt-2 text-sm text-gray-500">No recent activity.</p>
                </div>
            ) : (
                <ul className="-mx-1 divide-y divide-gray-100">
                    {items.map((item) => {
                        const m = meta[item.kind];
                        const Icon = m.icon;
                        return (
                            <li key={item.key} className="flex items-center gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-[#f6faf8]">
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${m.tile}`}>
                                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                                </div>
                                {/* Pangalan sa itaas, uri ng record sa ilalim */}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-gray-900" title={item.name}>
                                        {item.name}
                                    </p>
                                    <p className={`text-xs font-medium ${m.tag}`}>{m.label}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-xs font-semibold text-gray-700">{item.clock}</p>
                                    <p className="text-[11px] text-gray-500">{relativeDay(item.date, today)}</p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
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
        ]: [WeeklyRow[], ActivityRow[], ActivityRow[], ActivityRow[], ActivityRow[]] = await Promise.all([
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
    const greetingText = `${greeting}${roleName ? `, ${roleName}` : ""}!`;
    const GreetingIcon = hour < 12 ? Sun : hour < 18 ? Sunset : Moon;
    const longToday = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
    }).format(new Date());

    const isItTech = role === "ittech";

    // Welcome banner (makikita ng lahat ng role)
    const banner = (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#15664f] to-[#0f4d3b] p-5 text-white shadow-lg shadow-[#15664f]/20 md:p-6">
            <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-16 right-24 h-32 w-32 rounded-full bg-white/5" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-amber-300 ring-4 ring-white/10">
                        <GreetingIcon className="h-6 w-6" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="break-words text-xl font-bold sm:text-2xl md:text-3xl">{greetingText}</h1>
                        <p className="text-sm text-white/80">Here&apos;s what&apos;s happening at the clinic today.</p>
                    </div>
                </div>
                <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-xs font-medium sm:text-sm">
                    <CalendarDays className="h-4 w-4" />
                    {longToday}
                </span>
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

    const gridCols = isDentist
        ? "xl:grid-cols-4"
        : isDoctor
            ? "xl:grid-cols-5"
            : "xl:grid-cols-3 2xl:grid-cols-6";

    // Visit Distribution = totals for the same week window as the overview chart.
    const weekClinic = data.weeklyPoints.reduce((sum, p) => sum + p.clinic, 0);
    const weekDental = data.weeklyPoints.reduce((sum, p) => sum + p.dental, 0);
    const weekReports = data.weeklyPoints.reduce((sum, p) => sum + p.reports, 0);
    const distributionSegments = [
        ...(isDentist ? [] : [{ label: "Clinic Visits", value: weekClinic, color: CLINIC_COLOR }]),
        ...(isDoctor ? [] : [{ label: "Dental Visits", value: weekDental, color: DENTAL_COLOR }]),
        // Case reports na ginawa ngayong linggo (tugma sa "This week")
        ...(isDentist ? [] : [{ label: "Case Reports", value: weekReports, color: REPORT_COLOR }]),
    ];

    // NOTE: adjust the href values below to match your actual routes.
    const quickActions: QuickAction[] = [
        {
            label: "Add Student",
            description: "Register a new student",
            href: "/dashboard/students/new",
            icon: UserPlus,
            cardClass: "border-gray-100 bg-white hover:border-[#15664f]/30 hover:bg-[#eef6f2] hover:shadow-md hover:shadow-[#15664f]/10",
            iconClass: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 group-hover:bg-emerald-600 group-hover:text-white group-hover:ring-emerald-600",
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
                    iconClass: "bg-teal-50 text-teal-700 ring-1 ring-teal-100 group-hover:bg-teal-600 group-hover:text-white group-hover:ring-teal-600",
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
                    iconClass: "bg-sky-50 text-sky-700 ring-1 ring-sky-100 group-hover:bg-sky-600 group-hover:text-white group-hover:ring-sky-600",
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
                            iconClass: "bg-violet-50 text-violet-700 ring-1 ring-violet-100 group-hover:bg-violet-600 group-hover:text-white group-hover:ring-violet-600",
                        },
                    ]),

                {
                    label: "New Case Report",
                    description: "Create a case report",
                    href: "/dashboard/health-case-reports/new",
                    icon: ClipboardList,
                    cardClass: "border-gray-100 bg-white hover:border-[#15664f]/30 hover:bg-[#eef6f2] hover:shadow-md hover:shadow-[#15664f]/10",
                    iconClass: "bg-amber-50 text-amber-700 ring-1 ring-amber-100 group-hover:bg-amber-600 group-hover:text-white group-hover:ring-amber-600",
                },
            ]),
        {
            label: "View Reports",
            description: "Generate and view reports",
            href: "/dashboard/illness-alerts",
            icon: BarChart3,
            cardClass: "border-gray-100 bg-white hover:border-[#15664f]/30 hover:bg-[#eef6f2] hover:shadow-md hover:shadow-[#15664f]/10",
            iconClass: "bg-rose-50 text-rose-700 ring-1 ring-rose-100 group-hover:bg-rose-600 group-hover:text-white group-hover:ring-rose-600",
        },
    ];

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {banner}
            <section className={`grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3 ${gridCols}`}>
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className={`relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border-2 border-[#cfe5d9] bg-white p-3 shadow-md shadow-[#15664f]/10 sm:p-4`}
                        >
                            {/* manipis na kulay sa itaas ng card */}
                            <span
                                className={`absolute inset-x-0 top-0 h-1 ${stat.tone === "amber" ? "bg-amber-400" : "bg-[#15664f]"}`}
                            />
                            {/* Mobile: 2 card bawat hilera, compact. sm pataas: mas maluwag */}
                            <div className="flex items-start justify-between gap-2">
                                <p className="min-h-[2rem] break-words text-xs font-medium leading-4 text-gray-600 sm:text-sm">
                                    {stat.label}
                                </p>
                                <div
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${stat.tone === "amber" ? "bg-amber-100 text-amber-700" : "bg-[#eef6f2] text-[#15664f]"
                                        }`}
                                >
                                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.8} />
                                </div>
                            </div>
                            <p className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
                                {stat.value.toLocaleString("en-US")}
                            </p>
                            <p className="mt-auto pt-0.5 text-[11px] text-gray-500 sm:text-xs">{stat.hint}</p>
                        </div>
                    );
                })}
            </section>

            <section className="grid gap-6 xl:grid-cols-5">
                {/* Lists on the left, Quick Actions on the right (same layout for every role) */}
                <div className="min-w-0 space-y-6 xl:col-span-3">
                    {!isDentist && (
                        <VisitList
                            title="Today's Clinic Visits"
                            rows={data.recentVisits}
                            empty="No clinic visits today."
                            viewHref={(v) =>
                                v.patient_type === "employee"
                                    ? `/dashboard/employee-health-records?employee=${encodeURIComponent(v.ref_number)}&view=history&record=${v.record_id}`
                                    : `/dashboard/student-health-records?student=${encodeURIComponent(v.ref_number)}&view=history&record=${v.record_id}`
                            }
                        />
                    )}
                    {!isDoctor && (
                        <DentalList
                            title="Today's Dental Visits"
                            rows={data.recentDental}
                            empty="No dental visits today."
                            viewHref={(d) =>
                                d.patient_type === "employee"
                                    ? `/dashboard/dental-records?employee=${encodeURIComponent(d.ref_number)}&view=history&record=${d.dental_id}`
                                    : `/dashboard/dental-records?student=${encodeURIComponent(d.ref_number)}&view=history&record=${d.dental_id}`
                            }
                        />
                    )}
                </div>

                <QuickActionsSection
                    actions={quickActions}
                    className="xl:col-span-2 xl:self-start"
                />
            </section>

            {/* Overview chart + Visit Distribution + Recent Activity */}
            <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1.2fr]">
                <VisitsOverviewChart
                    data={data.weeklyPoints}
                    showClinic={!isDentist}
                    showDental={!isDoctor}
                    showReports={!isDentist}
                />
                <VisitDistribution segments={distributionSegments} />
                {/* Sa lg, full width para hindi mag-isa sa kalahating row */}
                <div className="min-w-0 lg:col-span-2 xl:col-span-1">
                    <RecentActivity items={data.activity} today={data.today} />
                </div>
            </section>
        </main>
    );
}